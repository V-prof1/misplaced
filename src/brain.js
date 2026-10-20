'use strict';
(() => {
const G=window.MISPLACED;
const NAV=G.NAV||24;

// Advanced tactical layer. It replaces ai.js' frame brain while reusing its
// combat helpers and bot factory, then doors.js wraps this update afterwards.
const board=G.aiBlackboard={
  killerIntel:null,
  killerIntelAge:99,
  chasedName:null,
  chasedAge:99,
  lastNoise:null,
  tick:0
};

const baseSpawn=G.spawnBots;
G.spawnBots=()=>{
  baseSpawn();
  board.killerIntel=null;board.killerIntelAge=99;board.chasedName=null;board.chasedAge=99;board.lastNoise=null;board.tick=0;
  for(const b of G.bots)ensureBrain(b,true);
};

function ensureBrain(b,reset=false){
  if(reset||!b.brain){
    b.brain={action:'wander',actionLock:0,decision:0,target:null,targetLock:0,searchPoint:null,searchTimer:0,
      lastSeen:null,lastSeenAge:99,lastSeenVel:{x:0,y:0},confidence:0,routeMood:Math.random(),
      path:[],pathIndex:0,pathTimer:0,pathGoalX:b.x,pathGoalY:b.y,stuck:0,lastX:b.x,lastY:b.y,
      loop:null,loopIndex:0,loopDir:1,loopSwitch:0,loopAge:0,jukeTimer:0,jukeDir:{x:0,y:0},
      threat:0,noise:0,roleBias:Math.random(),doorIntent:0};
  }
  b.noise=b.noise||0;
  b.stamina=Number.isFinite(b.stamina)?b.stamina:100;
  b.maxStamina=b.maxStamina||100;
  return b.brain;
}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function distXY(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function zoneOf(e){return G.zoneAt(e.x,e.y);}
function rayClear(a,b){
  const d=distXY(a,b),steps=Math.max(3,Math.ceil(d/10));
  for(let i=1;i<steps;i++){
    const t=i/steps,x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);
    if(G.isBlocked(x,y,2))return false;
  }
  return true;
}
function canSee(a,b,max=285){
  if(!a||!b)return false;
  const za=zoneOf(a),zb=zoneOf(b);
  return !!za&&!!zb&&za.id===zb.id&&distXY(a,b)<=max&&rayClear(a,b);
}
function canHear(a,b){
  if(!a||!b)return false;
  const noise=b===G.player?(G.player.noise||0):(b.noise||0);
  if(noise<=0)return false;
  return distXY(a,b)<180+noise*190;
}
function actorVelocity(e){
  if(e===G.player){const mag=(G.state.input?.x||0)||(G.state.input?.y||0)?1:0;return{x:(G.state.input?.x||e.dirX||0)*mag,y:(G.state.input?.y||e.dirY||0)*mag};}
  return{x:e.velX||e.dirX||0,y:e.velY||e.dirY||0};
}
function predicted(e,seconds=.42){
  const v=actorVelocity(e),l=Math.hypot(v.x,v.y)||1;
  const speed=e===G.player?(e.runSpeed||140):(e.role==='monster'?80:84);
  const lead=clamp(seconds*speed,14,62);
  return{x:e.x+v.x/l*lead,y:e.y+v.y/l*lead,zone:zoneOf(e)?.id||e.zone};
}

const connectors=[
  {a:'medical',b:'corridor',x:512,y:208,doorId:'d_med'},
  {a:'lab',b:'corridor',x:704,y:208,doorId:'d_lab'},
  {a:'storage',b:'corridor',x:512,y:576,doorId:'d_store'},
  {a:'containment',b:'corridor',x:704,y:576,doorId:'d_cont'},
  {a:'storage',b:'corridor',x:512,y:476,gap:true}
];
function adjacent(zoneId){return connectors.filter(c=>c.a===zoneId||c.b===zoneId);}
function nextZone(c,from){return c.a===from?c.b:c.a;}
function doorById(id){return G.doors.find(d=>d.id===id);}

function isNavFree(x,y,r=10){return !G.isNavBlocked(x,y,r);}
function node(x,y){return{gx:Math.round(x/NAV),gy:Math.round(y/NAV)};}
function world(gx,gy){return{x:gx*NAV,y:gy*NAV};}
function key(gx,gy){return gx+','+gy;}
function nearestNode(x,y){
  const n=node(x,y);
  for(let ring=0;ring<=6;ring++){
    for(let dx=-ring;dx<=ring;dx++)for(let dy=-ring;dy<=ring;dy++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
      const gx=n.gx+dx,gy=n.gy+dy,p=world(gx,gy);
      if(gx<1||gy<1||p.x>G.WORLD_W-24||p.y>G.WORLD_H-24)continue;
      if(isNavFree(p.x,p.y,10))return{gx,gy};
    }
  }
  return n;
}
function segmentNavClear(a,b){
  const d=distXY(a,b),steps=Math.max(3,Math.ceil(d/10));
  for(let i=1;i<steps;i++){
    const t=i/steps;
    if(G.isNavBlocked(lerp(a.x,b.x,t),lerp(a.y,b.y,t),10))return false;
  }
  return true;
}

function threatCostAt(x,y,actor,killer){
  if(actor.role==='monster'||!killer)return 0;
  const kp=predicted(killer,.34),d=Math.hypot(x-kp.x,y-kp.y);
  let cost=clamp((175-d)/175,0,1)*2.6;
  const z=G.zoneAt(x,y),kz=zoneOf(killer);
  if(z&&kz&&z.id===kz.id&&d<220)cost+=.55;
  // Shared intel is deliberately fuzzy and decays instead of giving wall-hacks.
  if(board.killerIntel&&board.killerIntelAge<3.2){
    const c=clamp(1-board.killerIntelAge/3.2,0,1),id=Math.hypot(x-board.killerIntel.x,y-board.killerIntel.y);
    cost+=clamp((145-id)/145,0,1)*1.35*c;
  }
  // Separation discourages survivors from forming an easy cluster.
  for(const mate of G.bots){
    if(mate===actor||mate.role!=='survivor'||!mate.alive)continue;
    const md=Math.hypot(x-mate.x,y-mate.y);if(md<58)cost+=(58-md)/58*.65;
  }
  return cost;
}

function pathfind(actor,tx,ty,killer=null){
  const s=nearestNode(actor.x,actor.y),g=nearestNode(tx,ty),sk=key(s.gx,s.gy),gk=key(g.gx,g.gy);
  if(sk===gk)return[{x:tx,y:ty}];
  const open=[{...s,f:0}],openSet=new Set([sk]),came=new Map(),score=new Map([[sk,0]]),nodes=new Map([[sk,s]]);
  const dirs=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[-1,1,1.414],[1,-1,1.414],[-1,-1,1.414]];
  let loops=0;
  while(open.length&&loops++<2800){
    let bi=0;for(let i=1;i<open.length;i++)if(open[i].f<open[bi].f)bi=i;
    const cur=open.splice(bi,1)[0],ck=key(cur.gx,cur.gy);openSet.delete(ck);
    if(ck===gk){
      const out=[];let k=ck;
      while(k){const n=nodes.get(k);if(n)out.push(world(n.gx,n.gy));k=came.get(k);}out.reverse();out.push({x:tx,y:ty});return out;
    }
    const cw=world(cur.gx,cur.gy);
    for(const [dx,dy,c] of dirs){
      const gx=cur.gx+dx,gy=cur.gy+dy,p=world(gx,gy);
      if(gx<1||gy<1||p.x>G.WORLD_W-24||p.y>G.WORLD_H-24||!isNavFree(p.x,p.y,10)||!segmentNavClear(cw,p))continue;
      if(dx&&dy){const p1=world(cur.gx+dx,cur.gy),p2=world(cur.gx,cur.gy+dy);if(!isNavFree(p1.x,p1.y,10)||!isNavFree(p2.x,p2.y,10))continue;}
      const nk=key(gx,gy),risk=threatCostAt(p.x,p.y,actor,killer),tent=(score.get(ck)??1e9)+c+risk;
      if(tent<(score.get(nk)??1e9)){
        came.set(nk,ck);score.set(nk,tent);nodes.set(nk,{gx,gy});
        const f=tent+Math.hypot(g.gx-gx,g.gy-gy);
        if(!openSet.has(nk)){open.push({gx,gy,f});openSet.add(nk);}else{const q=open.find(v=>v.gx===gx&&v.gy===gy);if(q)q.f=f;}
      }
    }
  }
  return[{x:tx,y:ty}];
}
function waypoint(actor,goal,killer){
  const br=ensureBrain(actor);
  br.pathTimer-=1/60;
  if(br.pathTimer<=0||!br.path.length||Math.hypot(goal.x-br.pathGoalX,goal.y-br.pathGoalY)>30){
    br.path=pathfind(actor,goal.x,goal.y,killer);br.pathIndex=Math.min(1,Math.max(0,br.path.length-1));
    br.pathGoalX=goal.x;br.pathGoalY=goal.y;br.pathTimer=actor.role==='monster'?.28:.46;
  }
  while(br.pathIndex<br.path.length-1&&Math.hypot(actor.x-br.path[br.pathIndex].x,actor.y-br.path[br.pathIndex].y)<15)br.pathIndex++;
  return br.path[br.pathIndex]||goal;
}

function randomPoint(zoneId){
  const z=G.zoneById(zoneId)||G.zones[2];
  for(let i=0;i<26;i++){
    const p={x:z.x+28+Math.random()*(z.w-56),y:z.y+28+Math.random()*(z.h-56)};
    if(isNavFree(p.x,p.y,11))return p;
  }
  return{x:z.x+z.w/2,y:z.y+z.h/2};
}
function obstacleRects(zoneId){
  const usable=new Set(['bed','crate','locker','desk','tank','cell','chair','cabinet']);
  return G.props.filter(p=>usable.has(p.type)&&G.zoneAt(p.x+p.w/2,p.y+p.h/2)?.id===zoneId&&p.w>=34&&p.h>=28);
}
function pointRectDistance(x,y,r){
  const nx=Math.max(r.x,Math.min(x,r.x+r.w)),ny=Math.max(r.y,Math.min(y,r.y+r.h));return Math.hypot(x-nx,y-ny);
}
function obstaclePoints(r,pad=25){
  return[
    {x:r.x-pad,y:r.y-pad},{x:r.x+r.w+pad,y:r.y-pad},
    {x:r.x+r.w+pad,y:r.y+r.h+pad},{x:r.x-pad,y:r.y+r.h+pad}
  ].filter(p=>isNavFree(p.x,p.y,11)&&G.zoneAt(p.x,p.y));
}
function chooseLoop(bot,killer){
  const z=zoneOf(bot);if(!z)return null;
  let best=null,bestScore=-1e9;
  for(const r of obstacleRects(z.id)){
    const db=pointRectDistance(bot.x,bot.y,r),dk=pointRectDistance(killer.x,killer.y,r);if(db>165||dk>235)continue;
    const pts=obstaclePoints(r);if(pts.length<3)continue;
    const blocks=!rayClear(bot,killer);
    let s=(170-db)*1.2+(r.w+r.h)*.18+Math.min(110,dk)*.18+(blocks?80:0);
    if(dk<30)s-=70;
    if(s>bestScore){bestScore=s;best={rect:r,points:pts};}
  }
  if(!best)return null;
  let idx=0,nd=1e9;best.points.forEach((p,i)=>{const d=distXY(bot,p);if(d<nd){nd=d;idx=i;}});
  const n=best.points.length,cw=best.points[(idx+1)%n],ccw=best.points[(idx-1+n)%n];
  best.index=idx;best.dir=distXY(killer,cw)>=distXY(killer,ccw)?1:-1;return best;
}
function loopGoal(bot,killer){
  const br=ensureBrain(bot);if(!br.loop?.points?.length)return null;
  const pts=br.loop.points,n=pts.length;
  if(distXY(bot,pts[br.loopIndex])<20)br.loopIndex=(br.loopIndex+br.loopDir+n)%n;
  const f=pts[(br.loopIndex+br.loopDir+n)%n],back=pts[(br.loopIndex-br.loopDir+n)%n];
  const sf=distXY(killer,f)-.18*distXY(bot,f),sb=distXY(killer,back)-.18*distXY(bot,back);
  if(br.loopSwitch<=0&&sb>sf+24){br.loopDir*=-1;br.loopSwitch=.72;br.pathTimer=0;}
  const t=pts[(br.loopIndex+br.loopDir+n)%n];return{x:t.x,y:t.y,zone:G.zoneAt(t.x,t.y)?.id||bot.zone};
}
function coverGoal(bot,killer){
  const z=zoneOf(bot);if(!z)return null;
  let best=null,bestScore=-1e9;
  for(const r of obstacleRects(z.id)){
    const pts=obstaclePoints(r,30);
    for(const p of pts){
      if(distXY(bot,p)>190)continue;
      const fake={x:p.x,y:p.y};
      const occluded=!rayClear(fake,killer);
      const score=(occluded?140:0)+distXY(killer,p)*.65-distXY(bot,p)*.28-threatCostAt(p.x,p.y,bot,killer)*35;
      if(score>bestScore){bestScore=score;best=p;}
    }
  }
  return best?{...best,zone:z.id}:null;
}
function safeInfluenceGoal(bot,killer,allowRotate=true){
  const z=zoneOf(bot)||G.zoneById(bot.zone)||G.zones[2];
  const candidates=[];
  for(let i=0;i<18;i++){const p=randomPoint(z.id);candidates.push({...p,zone:z.id});}
  if(allowRotate){
    for(const c of adjacent(z.id)){
      const nz=G.zoneById(nextZone(c,z.id));if(!nz)continue;
      const side=nz.x<c.x?-52:nz.x>c.x?52:0;
      const p={x:c.x+side,y:c.y,zone:nz.id,connector:c};
      if(isNavFree(p.x,p.y,11))candidates.push(p);
    }
  }
  let best=null,bestScore=-1e9;
  for(const p of candidates){
    let score=distXY(killer,p)*.72-distXY(bot,p)*.18-threatCostAt(p.x,p.y,bot,killer)*58;
    const fake={x:p.x,y:p.y};if(!rayClear(fake,killer))score+=54;
    if(p.connector){const d=p.connector.doorId?doorById(p.connector.doorId):null;if(d&&!d.open)score-=18;else score+=10;}
    if(score>bestScore){bestScore=score;best=p;}
  }
  return best||{...randomPoint(z.id),zone:z.id};
}
function rotationGoal(bot,killer){
  const z=zoneOf(bot);if(!z)return null;
  let best=null,bestScore=-1e9;
  for(const c of adjacent(z.id)){
    const nz=G.zoneById(nextZone(c,z.id));if(!nz)continue;
    const side=nz.x<c.x?-52:nz.x>c.x?52:0;
    const p={x:c.x+side,y:c.y,zone:nz.id,connector:c};
    const door=c.doorId?doorById(c.doorId):null;
    let score=distXY(killer,{x:c.x,y:c.y})*.72-distXY(bot,{x:c.x,y:c.y})*.35-threatCostAt(p.x,p.y,bot,killer)*40;
    if(c.gap)score+=14;if(door&&!door.open)score-=12;
    if(score>bestScore){bestScore=score;best=p;}
  }
  return best;
}

function chooseAction(br,scores,minLock=.28){
  const entries=Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  const [best,bestScore]=entries[0]||['wander',0];
  const currentScore=scores[br.action]??-1e9;
  // Hysteresis/inertia: don't flip actions when two options are nearly equal.
  if(br.actionLock>0&&currentScore>=bestScore-.15)return br.action;
  if(br.action!==best&&currentScore>=bestScore-.08)return br.action;
  if(br.action!==best){br.action=best;br.actionLock=minLock+.18*Math.random();br.pathTimer=0;}
  return br.action;
}

function survivorStrategy(bot,killer,dt){
  const br=ensureBrain(bot),sees=canSee(bot,killer),d=distXY(bot,killer);
  if(sees){
    br.lastSeen={x:killer.x,y:killer.y,zone:zoneOf(killer)?.id||killer.zone};br.lastSeenAge=0;br.confidence=1;
    board.killerIntel={...br.lastSeen};board.killerIntelAge=0;
  }else{br.lastSeenAge+=dt;br.confidence=Math.max(0,br.confidence-dt*.32);}
  const boardUseful=board.killerIntel&&board.killerIntelAge<2.8&&G.zoneAt(bot.x,bot.y)?.id===board.killerIntel.zone;
  const chased=sees||d<78||(br.lastSeenAge<1.4&&d<330)||boardUseful;
  if(!chased){br.threat=Math.max(0,br.threat-dt*1.8);br.loop=null;br.loopAge=0;br.jukeTimer=Math.max(0,br.jukeTimer-dt);return null;}
  br.threat=clamp(br.threat+dt*2.2,0,1);br.loopSwitch=Math.max(0,br.loopSwitch-dt);br.jukeTimer=Math.max(0,br.jukeTimer-dt);br.loopAge+=dt;

  const p=bot.profile||{loop:.65,rotate:.65,juke:.55,greed:.5};
  const los=sees?1:0,lowStamina=clamp((28-bot.stamina)/28,0,1);
  if(!br.loop||br.loopAge>1.1){const choice=chooseLoop(bot,killer);if(choice){br.loop=choice;br.loopIndex=choice.index;br.loopDir=choice.dir;br.loopAge=0;}}
  const hasLoop=br.loop?.points?.length?1:0;
  const scores={
    juke:(d<62?1.12:0)*p.juke+(d<42?.35:0),
    loop:hasLoop*(d>48&&d<210?(.62+.55*p.loop):.12)-lowStamina*.18,
    rotate:(d<82?.82:.22)+p.rotate*.44+(br.loopAge>3?.25:0)+lowStamina*.24,
    breaklos:los*(d>70?.68:.34)+(.35*(1-p.greed)),
    evade:.52+(d<120?.28:0)+lowStamina*.12
  };
  const action=chooseAction(br,scores,.32);
  if(action==='juke'){
    if(br.jukeTimer<=0){const dx=bot.x-killer.x,dy=bot.y-killer.y,l=Math.hypot(dx,dy)||1,sgn=Math.random()<.5?-1:1;br.jukeDir={x:-dy/l*sgn,y:dx/l*sgn};br.jukeTimer=.28+.22*p.juke;}
    return{x:bot.x+br.jukeDir.x*96,y:bot.y+br.jukeDir.y*96,zone:bot.zone,juke:true};
  }
  if(action==='loop'){
    const g=loopGoal(bot,killer);if(g)return g;
  }
  if(action==='rotate'){
    const g=rotationGoal(bot,killer);if(g){br.loop=null;return g;}
  }
  if(action==='breaklos'){
    const g=coverGoal(bot,killer);if(g)return g;
  }
  return safeInfluenceGoal(bot,killer,true);
}

function teammateWanderGoal(bot){
  // Blackboard coordination: spread survivors into low-pressure, low-crowding zones.
  let bestZone=null,bestScore=-1e9;
  for(const z of G.zones){
    const mates=G.bots.filter(x=>x!==bot&&x.alive&&x.role==='survivor'&&x.zone===z.id).length;
    let score=-mates*45+Math.random()*18;
    if(board.killerIntel&&board.killerIntelAge<3.5){const iz=board.killerIntel.zone;if(z.id===iz)score-=85*(1-board.killerIntelAge/3.5);}
    if(z.id==='corridor')score-=8;
    if(score>bestScore){bestScore=score;bestZone=z;}
  }
  const p=randomPoint((bestZone||G.zones[2]).id);return{x:p.x,y:p.y,zone:(bestZone||G.zones[2]).id};
}

function survivorCandidates(){
  const out=[];
  if(G.state.role==='survivor'&&G.player.health>0)out.push(G.player);
  for(const b of G.bots)if(b.role==='survivor'&&b.alive)out.push(b);
  return out;
}
function survivorNoise(t){return t===G.player?(G.player.noise||0):(t.noise||0);}
function isolationScore(t){
  let nearest=999;for(const o of survivorCandidates()){if(o===t)continue;nearest=Math.min(nearest,distXY(t,o));}
  return clamp((nearest-70)/220,0,1);
}
function targetUtility(monster,t,visible,heard){
  const br=ensureBrain(monster),d=distXY(monster,t);
  let s=(visible?1.0:heard?.48:0)+clamp((310-d)/310,0,1)*.78+isolationScore(t)*.18;
  if(t.health===1||t.injured)s+=.22;
  if(br.target===t)s+=.28; // commitment / hysteresis
  if(t.hitBoost>0)s-=.08;
  return s;
}
function pickMonsterTarget(monster,dt){
  const br=ensureBrain(monster);br.targetLock=Math.max(0,br.targetLock-dt);
  let best=null,bestScore=-1;
  for(const t of survivorCandidates()){
    const vis=canSee(monster,t,300),heard=canHear(monster,t);
    if(!vis&&!heard&&br.target!==t)continue;
    const s=targetUtility(monster,t,vis,heard);
    if(s>bestScore){bestScore=s;best={t,vis,heard,score:s};}
  }
  if(br.target&&br.target.health>0&&br.target.alive!==false&&br.targetLock>0){
    const cv=canSee(monster,br.target,300)||canHear(monster,br.target);
    if(cv)return{t:br.target,vis:canSee(monster,br.target,300),heard:canHear(monster,br.target),score:bestScore};
  }
  if(best){if(br.target!==best.t){br.target=best.t;br.targetLock=1.0+.45*Math.random();br.pathTimer=0;}return best;}
  return null;
}
function antiLoopGoal(monster,target){
  if(target===G.player)return null;
  const tb=ensureBrain(target),loop=tb.loop;if(!loop?.points?.length)return null;
  const pts=loop.points,n=pts.length,lead=pts[(tb.loopIndex+tb.loopDir*2+n*3)%n];if(!lead)return null;
  const direct=distXY(monster,target),cut=distXY(monster,lead);
  return cut<direct*1.4?{x:lead.x,y:lead.y,zone:G.zoneAt(lead.x,lead.y)?.id||target.zone}:null;
}
function exitCutGoal(monster,target){
  const z=zoneOf(target),mz=zoneOf(monster);if(!z||!mz||z.id!==mz.id||z.id==='corridor')return null;
  const v=actorVelocity(target),vl=Math.hypot(v.x,v.y)||1;
  let best=null,bestScore=-1e9;
  for(const c of adjacent(z.id)){
    const td=Math.hypot(target.x-c.x,target.y-c.y),md=Math.hypot(monster.x-c.x,monster.y-c.y);
    const dx=c.x-target.x,dy=c.y-target.y,dl=Math.hypot(dx,dy)||1,toward=(v.x/vl)*(dx/dl)+(v.y/vl)*(dy/dl);
    const monsterETA=md/80,survETA=td/84;
    if(monsterETA+.16>=survETA)continue;
    let s=(survETA-monsterETA)*80+toward*55-(c.gap?18:0);
    if(s>bestScore){bestScore=s;best={x:c.x,y:c.y,zone:z.id,connector:c};}
  }
  return best;
}
function monsterSearchGoal(monster,dt){
  const br=ensureBrain(monster);br.searchTimer-=dt;
  if(br.lastSeen&&distXY(monster,br.lastSeen)>38)return{...br.lastSeen};
  if(br.searchTimer<=0){
    const z=G.zoneById(br.lastSeen?.zone||monster.zone)||zoneOf(monster)||G.zones[2];
    let best=null,bestScore=-1e9;
    for(let i=0;i<12;i++){
      const p=randomPoint(z.id),dLast=br.lastSeen?distXY(p,br.lastSeen):0,dSelf=distXY(monster,p);
      const s=dLast*.38-dSelf*.16+Math.random()*32;
      if(s>bestScore){bestScore=s;best=p;}
    }
    br.searchPoint={...(best||randomPoint(z.id)),zone:z.id};br.searchTimer=.65+.45*Math.random();
  }
  return br.searchPoint;
}
function monsterStrategy(monster,dt){
  const br=ensureBrain(monster),pick=pickMonsterTarget(monster,dt);
  if(pick){
    const t=pick.t,d=distXY(monster,t);br.lastSeen={x:t.x,y:t.y,zone:zoneOf(t)?.id||t.zone};br.lastSeenAge=0;
    const pv=predicted(t,clamp(d/260,.22,.58));br.lastSeenVel=actorVelocity(t);
    if(pick.vis)br.confidence=1;else br.confidence=Math.max(br.confidence,.55);
    const cut=antiLoopGoal(monster,t),exit=exitCutGoal(monster,t);
    const scores={
      attack:d<44&&pick.vis?1.5:0,
      antiloop:cut?.x?1.02:0,
      cutoff:exit?.x?0.9:0,
      intercept:.72+(d>85?.18:0)+(Math.hypot(br.lastSeenVel.x,br.lastSeenVel.y)>.2?.12:0),
      pursue:.66+(d<90?.18:0)
    };
    if(exit)scores.cutoff=.9;
    const action=chooseAction(br,scores,.3);
    if(action==='attack'){attackTarget(monster,t);return{x:t.x,y:t.y,zone:zoneOf(t)?.id||monster.zone};}
    if(action==='antiloop'&&cut)return cut;
    if(action==='cutoff'&&exit)return exit;
    if(action==='intercept')return pv;
    return{x:t.x,y:t.y,zone:zoneOf(t)?.id||monster.zone};
  }
  br.lastSeenAge+=dt;br.confidence=Math.max(0,br.confidence-dt*.22);
  if(br.lastSeen&&br.lastSeenAge<4.6){chooseAction(br,{search:.82,wander:.25},.45);return monsterSearchGoal(monster,dt);}
  chooseAction(br,{wander:.7,search:.1},.5);return null;
}

function attackTarget(monster,target){
  if(monster.attackCooldown>0||distXY(monster,target)>=43)return;
  if(target===G.player){G.monsterAttack(monster,false);return;}
  if(target.role!=='survivor'||!target.alive||target.health<=0)return;
  monster.attackCooldown=1.02;G.state.shake=Math.max(G.state.shake,1.3);G.applyHitBoost(target,monster);
  target.health--;target.injured=target.health===1;ensureBrain(target).pathTimer=0;
  if(target.health<=0){target.alive=false;if(zoneOf(G.player)?.id===zoneOf(target)?.id)G.showToast(`${target.name.toUpperCase()} FOI ELIMINADO`);}
  else if(zoneOf(G.player)?.id===zoneOf(target)?.id)G.showToast(`${target.name.toUpperCase()} FOI FERIDO`);
}

function steerSeparation(bot,dx,dy){
  if(bot.role!=='survivor')return{x:dx,y:dy};
  let sx=0,sy=0;
  for(const o of G.bots){
    if(o===bot||o.role!=='survivor'||!o.alive)continue;
    const ox=bot.x-o.x,oy=bot.y-o.y,d=Math.hypot(ox,oy)||1;
    if(d<44){const w=(44-d)/44;sx+=ox/d*w;sy+=oy/d*w;}
  }
  const nx=dx+sx*.42,ny=dy+sy*.42,l=Math.hypot(nx,ny)||1;return{x:nx/l,y:ny/l};
}
function updateStuck(bot,dt,intended){
  const br=ensureBrain(bot),moved=Math.hypot(bot.x-br.lastX,bot.y-br.lastY);
  if(intended&&moved<.9&&!bot.doorAction)br.stuck+=dt;else br.stuck=Math.max(0,br.stuck-dt*2.4);
  if(br.stuck>.38){br.stuck=0;br.pathTimer=0;br.actionLock=0;const a=Math.random()*Math.PI*2;G.move(bot,Math.cos(a)*7,Math.sin(a)*7);}
  br.lastX=bot.x;br.lastY=bot.y;
}
function openBlockingDoor(bot){
  const d=G.nearDoor(bot,35);if(d&&!d.open&&!bot.doorAction){d.open=true;bot.noise=Math.max(bot.noise,.55);ensureBrain(bot).pathTimer=.04;return true;}return false;
}

function updateBlackboard(dt){
  board.tick+=dt;board.killerIntelAge+=dt;board.chasedAge+=dt;
  const killer=G.state.role==='monster'?G.player:G.bots.find(b=>b.role==='monster'&&b.alive);
  if(!killer)return;
  let chased=null,best=999;
  for(const b of G.bots){
    if(b.role!=='survivor'||!b.alive)continue;
    if(canSee(b,killer,285)){
      // Simulated team communication has a decaying last-known position, not exact wall vision.
      board.killerIntel={x:killer.x,y:killer.y,zone:zoneOf(killer)?.id||killer.zone};board.killerIntelAge=0;
    }
    const d=distXY(b,killer);if((canSee(b,killer)||ensureBrain(b).threat>.45)&&d<best){best=d;chased=b;}
  }
  if(chased){board.chasedName=chased.name;board.chasedAge=0;}
}

G.updateBots=dt=>{
  updateBlackboard(dt);
  const killer=G.state.role==='monster'?G.player:G.bots.find(b=>b.role==='monster'&&b.alive);
  for(const b of G.bots){
    if(!b.alive)continue;
    const br=ensureBrain(b);
    const oldX=b.x,oldY=b.y;
    b.attackCooldown=Math.max(0,(b.attackCooldown||0)-dt);b.hitBoost=Math.max(0,(b.hitBoost||0)-dt);b.noise=Math.max(0,(b.noise||0)-dt*.85);
    br.actionLock=Math.max(0,br.actionLock-dt);br.decision=Math.max(0,br.decision-dt);br.loopSwitch=Math.max(0,br.loopSwitch-dt);
    b.zone=zoneOf(b)?.id||b.zone;
    let goal=null,inChase=false;

    if(b.role==='monster'){
      goal=monsterStrategy(b,dt);
      if(!goal&&br.decision<=0){const z=G.zones[Math.floor(Math.random()*G.zones.length)],p=randomPoint(z.id);goal={...p,zone:z.id};br.searchPoint=goal;br.decision=.8+Math.random()*1.2;}
      if(!goal)goal=br.searchPoint||{x:b.x,y:b.y,zone:b.zone};
    }else{
      if(killer){goal=survivorStrategy(b,killer,dt);inChase=!!goal;}
      if(!goal){
        if(br.decision<=0||!br.searchPoint){br.searchPoint=teammateWanderGoal(b);br.decision=.8+Math.random()*1.4;br.pathTimer=0;}
        goal=br.searchPoint;
      }
    }

    openBlockingDoor(b);
    const wp=waypoint(b,goal,b.role==='survivor'?killer:null);
    let dx=wp.x-b.x,dy=wp.y-b.y,l=Math.hypot(dx,dy),intended=false;
    if(l>4&&!b.doorAction){
      intended=true;dx/=l;dy/=l;const s=steerSeparation(b,dx,dy);dx=s.x;dy=s.y;b.dirX=dx;b.dirY=dy;
      let speed;
      if(b.role==='monster')speed=80;
      else if(inChase&&b.stamina>0){speed=b.injured?76:86;b.stamina=Math.max(0,b.stamina-24*dt);b.noise=Math.max(b.noise,.72);}
      else{speed=b.injured?58:68;b.stamina=Math.min(b.maxStamina,b.stamina+17*dt);}
      if(goal.juke)speed*=1.07;
      speed*=G.boostMultiplier(b);G.move(b,dx*speed*dt,dy*speed*dt);
    }
    b.velX=(b.x-oldX)/Math.max(dt,.001);b.velY=(b.y-oldY)/Math.max(dt,.001);
    b.anim+=dt*(b.injured?3.8:4.9)*Math.min(1.35,G.boostMultiplier(b));
    updateStuck(b,dt,intended);
  }
};
})();
