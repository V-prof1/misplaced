'use strict';
(() => {
const G=window.MISPLACED;

const connectors=[
  {a:'medical',b:'corridor',x:512,y:208,doorId:'d_med'},
  {a:'lab',b:'corridor',x:704,y:208,doorId:'d_lab'},
  {a:'storage',b:'corridor',x:512,y:576,doorId:'d_store'},
  {a:'containment',b:'corridor',x:704,y:576,doorId:'d_cont'},
  {a:'storage',b:'corridor',x:512,y:476,gap:true}
];

const profiles={
  Mara:{loop:0.95,rotate:0.42,juke:0.62,greed:0.72},
  Eli:{loop:0.55,rotate:0.88,juke:0.35,greed:0.32},
  Nox:{loop:0.78,rotate:0.58,juke:0.92,greed:0.58},
  Iris:{loop:0.72,rotate:0.68,juke:0.64,greed:0.48}
};

function profileFor(name){return profiles[name]||{loop:.65,rotate:.65,juke:.55,greed:.5};}
function makeBot(role,x,y,name){
  return{
    role,x,y,r:10,dirX:0,dirY:1,anim:Math.random()*4,name,
    profile:profileFor(name),targetX:x,targetY:y,targetZone:G.zoneAt(x,y)?.id||'corridor',
    think:0,zone:G.zoneAt(x,y)?.id||'corridor',health:2,alive:true,injured:false,
    attackCooldown:0,memory:null,memoryTime:0,hitBoost:0,hitBoostMax:1.35,
    path:[],pathIndex:0,pathTimer:0,pathGoalX:x,pathGoalY:y,
    stuckTimer:0,lastMoveX:x,lastMoveY:y,
    threatMemory:0,lastThreatX:x,lastThreatY:y,chaseTime:0,
    loopAnchor:null,loopIndex:0,loopDir:1,loopThink:0,loopSwitch:0,
    jukeTimer:0,jukeX:0,jukeY:0,rotationTimer:0,doorTrick:0,
    stamina:100,maxStamina:100,lastX:x,lastY:y,velX:0,velY:0,
    antiLoopTimer:0,antiLoopSide:1
  };
}

G.spawnBots=()=>{
  G.bots.length=0;
  if(G.state.role==='survivor'){
    G.bots.push(
      makeBot('monster',1040,560,'The Misplaced'),
      makeBot('survivor',190,160,'Mara'),
      makeBot('survivor',260,650,'Eli'),
      makeBot('survivor',1060,170,'Nox')
    );
  }else{
    G.bots.push(
      makeBot('survivor',170,140,'Mara'),
      makeBot('survivor',260,640,'Eli'),
      makeBot('survivor',1040,150,'Nox'),
      makeBot('survivor',1050,640,'Iris')
    );
  }
};

G.applyHitBoost=(victim,attacker)=>{
  victim.hitBoost=victim.hitBoostMax||1.35;
  if(victim===G.player)G.player.invuln=1.35;
  const dx=victim.x-attacker.x,dy=victim.y-attacker.y,l=Math.hypot(dx,dy)||1;
  G.move(victim,dx/l*8,dy/l*8);
  if(victim!==G.player){
    victim.jukeTimer=.38;
    const sign=Math.random()<.5?-1:1;
    victim.jukeX=-dy/l*sign;
    victim.jukeY=dx/l*sign;
    victim.pathTimer=0;
  }
};

G.monsterAttack=(attacker,isPlayer)=>{
  if(attacker.attackCooldown>0)return;
  attacker.attackCooldown=.68;
  G.state.shake=isPlayer?2.2:1.4;
  const targets=isPlayer?G.bots.filter(b=>b.role==='survivor'&&b.alive):[G.player];
  let victim=null,bd=999;
  for(const t of targets){
    if(t.health<=0)continue;
    const d=G.distance(attacker,t);
    if(d<42&&d<bd&&G.zoneAt(attacker.x,attacker.y)?.id===G.zoneAt(t.x,t.y)?.id){victim=t;bd=d;}
  }
  if(!victim||victim===G.player&&G.player.invuln>0)return;
  attacker.attackCooldown=1.02;
  G.applyHitBoost(victim,attacker);
  if(victim===G.player){
    G.player.health--;
    G.flashDamage();
    G.showToast(G.player.health>0?'FERIDO — ADRENALINA!':'VOCÊ CAIU');
    G.updateStatusHud();
    if(G.player.health<=0)G.finishRound(false,'VOCÊ NÃO SAIU','The Misplaced alcançou você antes que Blackridge pudesse ser reativada.');
  }else{
    victim.health--;
    victim.injured=victim.health===1;
    victim.pathTimer=0;
    victim.loopThink=0;
    if(victim.health<=0){
      victim.alive=false;
      attacker.kills++;
      G.showToast(`${victim.name.toUpperCase()} ELIMINADO`);
      G.updateObjectiveHud();
      if(!G.bots.some(b=>b.role==='survivor'&&b.alive))G.finishRound(true,'NENHUMA TESTEMUNHA','Blackridge voltou ao silêncio. Nenhum sobrevivente deixou a instalação.');
    }else G.showToast(`${victim.name.toUpperCase()} FERIDO — CORRENDO!`);
  }
};

function canTraverse(x1,y1,x2,y2){
  const steps=Math.max(4,Math.ceil(Math.hypot(x2-x1,y2-y1)/10));
  for(let i=1;i<steps;i++){
    const t=i/steps;
    if(G.isNavBlocked(x1+(x2-x1)*t,y1+(y2-y1)*t,10))return false;
  }
  return true;
}
function node(x,y){return{gx:Math.max(0,Math.round(x/G.NAV)),gy:Math.max(0,Math.round(y/G.NAV))};}
function world(gx,gy){return{x:gx*G.NAV,y:gy*G.NAV};}
function key(gx,gy){return gx+','+gy;}
function nearest(x,y){
  const b=node(x,y);
  for(let ring=0;ring<=6;ring++)for(let dx=-ring;dx<=ring;dx++)for(let dy=-ring;dy<=ring;dy++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
    const gx=b.gx+dx,gy=b.gy+dy,p=world(gx,gy);
    if(gx<1||gy<1||p.x>G.WORLD_W-24||p.y>G.WORLD_H-24)continue;
    if(!G.isNavBlocked(p.x,p.y,10))return{gx,gy};
  }
  return b;
}
function pathfind(sx,sy,tx,ty){
  const s=nearest(sx,sy),goal=nearest(tx,ty),sk=key(s.gx,s.gy),gk=key(goal.gx,goal.gy);
  if(sk===gk)return[{x:tx,y:ty}];
  const open=[{...s,f:0}],openSet=new Set([sk]),came=new Map(),score=new Map([[sk,0]]),nodes=new Map([[sk,s]]);
  const dirs=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[-1,1,1.414],[1,-1,1.414],[-1,-1,1.414]];
  let loops=0;
  while(open.length&&loops++<2600){
    let bi=0;for(let i=1;i<open.length;i++)if(open[i].f<open[bi].f)bi=i;
    const cur=open.splice(bi,1)[0],ck=key(cur.gx,cur.gy);openSet.delete(ck);
    if(ck===gk){
      const out=[];let k=ck;
      while(k){const n=nodes.get(k);if(n)out.push(world(n.gx,n.gy));k=came.get(k);}out.reverse();out.push({x:tx,y:ty});return out;
    }
    const cw=world(cur.gx,cur.gy);
    for(const [dx,dy,cost] of dirs){
      const gx=cur.gx+dx,gy=cur.gy+dy,p=world(gx,gy);
      if(gx<1||gy<1||p.x>G.WORLD_W-24||p.y>G.WORLD_H-24||G.isNavBlocked(p.x,p.y,10)||!canTraverse(cw.x,cw.y,p.x,p.y))continue;
      if(dx&&dy){const p1=world(cur.gx+dx,cur.gy),p2=world(cur.gx,cur.gy+dy);if(G.isNavBlocked(p1.x,p1.y,10)||G.isNavBlocked(p2.x,p2.y,10))continue;}
      const nk=key(gx,gy),tent=(score.get(ck)??1e9)+cost;
      if(tent<(score.get(nk)??1e9)){
        came.set(nk,ck);score.set(nk,tent);nodes.set(nk,{gx,gy});
        const f=tent+Math.hypot(goal.gx-gx,goal.gy-gy);
        if(!openSet.has(nk)){open.push({gx,gy,f});openSet.add(nk);}else{const q=open.find(v=>v.gx===gx&&v.gy===gy);if(q)q.f=f;}
      }
    }
  }
  return[{x:tx,y:ty}];
}
function setPath(b,gx,gy,force=false){
  if(force||b.pathTimer<=0||Math.hypot(gx-b.pathGoalX,gy-b.pathGoalY)>32||!b.path.length){
    b.path=pathfind(b.x,b.y,gx,gy);b.pathIndex=Math.min(1,Math.max(0,b.path.length-1));
    b.pathGoalX=gx;b.pathGoalY=gy;b.pathTimer=b.role==='monster'?.28:.5;
  }
}
function waypoint(b,goal){
  setPath(b,goal.x,goal.y);
  while(b.pathIndex<b.path.length-1&&Math.hypot(b.x-b.path[b.pathIndex].x,b.y-b.path[b.pathIndex].y)<15)b.pathIndex++;
  return b.path[b.pathIndex]||goal;
}
function randomPoint(zoneId){
  const z=G.zoneById(zoneId)||G.zones[2];
  for(let i=0;i<24;i++){
    const p={x:z.x+30+Math.random()*(z.w-60),y:z.y+30+Math.random()*(z.h-60)};
    if(!G.isNavBlocked(p.x,p.y,11))return p;
  }
  return{x:z.x+z.w/2,y:z.y+z.h/2};
}
function wander(b){
  const z=G.zones[Math.floor(Math.random()*G.zones.length)],p=randomPoint(z.id);
  b.targetX=p.x;b.targetY=p.y;b.targetZone=z.id;b.pathTimer=0;b.loopAnchor=null;
}

function visionClear(a,b){
  const dist=G.distance(a,b),steps=Math.max(3,Math.ceil(dist/12));
  for(let i=1;i<steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(G.isBlocked(x,y,2))return false;
  }
  return true;
}
function canSee(a,b){
  const za=G.zoneAt(a.x,a.y),zb=G.zoneAt(b.x,b.y);
  return!!za&&!!zb&&za.id===zb.id&&G.distance(a,b)<275&&visionClear(a,b);
}
function canHear(m,t){return t===G.player&&G.player.noise>0&&G.distance(m,t)<340;}

function pointRectDistance(x,y,r){
  const nx=Math.max(r.x,Math.min(x,r.x+r.w)),ny=Math.max(r.y,Math.min(y,r.y+r.h));
  return Math.hypot(x-nx,y-ny);
}
function segmentHitsRect(a,b,r){
  const steps=Math.max(5,Math.ceil(G.distance(a,b)/12));
  for(let i=1;i<steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return true;
  }
  return false;
}
function obstaclePoints(r,pad=24){
  const raw=[
    {x:r.x-pad,y:r.y-pad},{x:r.x+r.w+pad,y:r.y-pad},
    {x:r.x+r.w+pad,y:r.y+r.h+pad},{x:r.x-pad,y:r.y+r.h+pad}
  ];
  return raw.filter(p=>!G.isNavBlocked(p.x,p.y,11)&&G.zoneAt(p.x,p.y));
}
function loopObstaclesFor(zoneId){
  const usable=new Set(['bed','crate','locker','desk','tank','cell','chair']);
  return G.props.filter(p=>usable.has(p.type)&&G.zoneAt(p.x+p.w/2,p.y+p.h/2)?.id===zoneId&&p.w>=34&&p.h>=30);
}
function chooseLoopAnchor(b,killer){
  const zone=G.zoneAt(b.x,b.y);if(!zone)return null;
  let best=null,bestScore=-1e9;
  for(const r of loopObstaclesFor(zone.id)){
    const db=pointRectDistance(b.x,b.y,r),dk=pointRectDistance(killer.x,killer.y,r);
    if(db>155||dk>220)continue;
    const points=obstaclePoints(r,25);if(points.length<3)continue;
    let score=(170-db)*1.5+Math.min(200,r.w+r.h)*.25+Math.min(90,dk)*.2;
    if(segmentHitsRect(b,killer,{x:r.x-5,y:r.y-5,w:r.w+10,h:r.h+10}))score+=95;
    if(dk<34)score-=60;
    if(score>bestScore){bestScore=score;best={rect:r,points};}
  }
  if(!best)return null;
  let nearest=0,nd=1e9;
  best.points.forEach((p,i)=>{const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<nd){nd=d;nearest=i;}});
  const n=best.points.length,cw=best.points[(nearest+1)%n],ccw=best.points[(nearest-1+n)%n];
  const scoreP=p=>G.distance(killer,p)-.25*Math.hypot(b.x-p.x,b.y-p.y);
  best.index=nearest;best.dir=scoreP(cw)>=scoreP(ccw)?1:-1;
  return best;
}
function refreshLoopDecision(b,killer){
  b.loopThink=.5+Math.random()*.35;
  const chosen=chooseLoopAnchor(b,killer);
  if(!chosen){b.loopAnchor=null;return;}
  b.loopAnchor=chosen;b.loopIndex=chosen.index;b.loopDir=chosen.dir;b.pathTimer=0;
}
function loopGoal(b,killer){
  if(!b.loopAnchor||!b.loopAnchor.points?.length)return null;
  const pts=b.loopAnchor.points,n=pts.length;
  if(Math.hypot(b.x-pts[b.loopIndex].x,b.y-pts[b.loopIndex].y)<20)b.loopIndex=(b.loopIndex+b.loopDir+n)%n;
  const forward=pts[(b.loopIndex+b.loopDir+n)%n],backward=pts[(b.loopIndex-b.loopDir+n)%n];
  const sf=G.distance(killer,forward)-.2*Math.hypot(b.x-forward.x,b.y-forward.y);
  const sb=G.distance(killer,backward)-.2*Math.hypot(b.x-backward.x,b.y-backward.y);
  if(b.loopSwitch<=0&&sb>sf+28){b.loopDir*=-1;b.loopSwitch=.75;b.pathTimer=0;}
  const target=pts[(b.loopIndex+b.loopDir+n)%n];
  return{x:target.x,y:target.y,zone:G.zoneAt(target.x,target.y)?.id||b.zone};
}
function adjacentConnectors(zoneId){return connectors.filter(c=>c.a===zoneId||c.b===zoneId);}
function rotationGoal(b,killer){
  const zone=G.zoneAt(b.x,b.y);if(!zone)return null;
  const options=[];
  for(const c of adjacentConnectors(zone.id)){
    const next=c.a===zone.id?c.b:c.a;
    const nz=G.zoneById(next);if(!nz)continue;
    const beyond={x:c.x+(next==='corridor'?0:(nz.x<c.x?-42:42)),y:c.y};
    let score=G.distance(killer,{x:c.x,y:c.y})-.38*Math.hypot(b.x-c.x,b.y-c.y);
    if(c.gap)score+=12;
    options.push({score,x:beyond.x,y:beyond.y,zone:next,doorId:c.doorId});
  }
  options.sort((a,c)=>c.score-a.score);
  const pick=options[0];
  if(!pick)return null;
  const door=pick.doorId?G.doors.find(d=>d.id===pick.doorId):null;if(door&&!door.open)door.open=true;
  return{x:pick.x,y:pick.y,zone:pick.zone};
}
function safeFleePoint(b,killer){
  const zone=G.zoneAt(b.x,b.y)||G.zoneById(b.zone)||G.zones[2];
  let best=null,bestScore=-1e9;
  for(let i=0;i<14;i++){
    const p=randomPoint(zone.id),score=G.distance(killer,p)-.28*Math.hypot(b.x-p.x,b.y-p.y);
    if(score>bestScore){bestScore=score;best=p;}
  }
  return{...(best||randomPoint(zone.id)),zone:zone.id};
}
function emergencyJuke(b,killer){
  const dx=b.x-killer.x,dy=b.y-killer.y,l=Math.hypot(dx,dy)||1;
  const sign=Math.random()<.5?-1:1;
  b.jukeX=(-dy/l)*sign;b.jukeY=(dx/l)*sign;b.jukeTimer=.3+.18*b.profile.juke;b.pathTimer=0;
}
function updateSurvivorStrategy(b,killer,dt){
  const sees=killer&&canSee(b,killer);
  if(sees){b.threatMemory=1.25;b.lastThreatX=killer.x;b.lastThreatY=killer.y;}else b.threatMemory=Math.max(0,b.threatMemory-dt);
  const chased=!!killer&&(sees||b.threatMemory>0)&&G.distance(b,killer)<330;
  if(!chased){b.chaseTime=Math.max(0,b.chaseTime-dt*2);b.loopAnchor=null;b.loopThink=0;b.jukeTimer=Math.max(0,b.jukeTimer-dt);return null;}
  b.chaseTime+=dt;b.loopThink-=dt;b.loopSwitch=Math.max(0,b.loopSwitch-dt);b.rotationTimer=Math.max(0,b.rotationTimer-dt);b.jukeTimer=Math.max(0,b.jukeTimer-dt);
  const dist=G.distance(b,killer);

  if(b.jukeTimer>0){
    const x=b.x+b.jukeX*90,y=b.y+b.jukeY*90;
    if(!G.isNavBlocked(x,y,11))return{x,y,zone:b.zone,juke:true};
  }
  if(dist<52&&Math.random()<b.profile.juke*dt*7){emergencyJuke(b,killer);return{x:b.x+b.jukeX*92,y:b.y+b.jukeY*92,zone:b.zone,juke:true};}

  const shouldRotate=dist<60||(b.chaseTime>4.5&&Math.random()<b.profile.rotate*dt*.85);
  if(shouldRotate&&b.rotationTimer<=0){
    const r=rotationGoal(b,killer);if(r){b.rotationTimer=1.2;b.loopAnchor=null;b.pathTimer=0;return r;}
  }

  const loopWindow=dist>52&&dist<205&&Math.random()<Math.max(.18,b.profile.loop);
  if(loopWindow){
    if(!b.loopAnchor||b.loopThink<=0)refreshLoopDecision(b,killer);
    const lg=loopGoal(b,killer);if(lg)return lg;
  }

  b.loopAnchor=null;
  if(dist<120){const r=rotationGoal(b,killer);if(r)return r;}
  return safeFleePoint(b,killer);
}

function antiLoopGoal(monster,target){
  if(!target||target===G.player||!target.loopAnchor?.points?.length)return null;
  const pts=target.loopAnchor.points,n=pts.length;
  const lead=pts[(target.loopIndex+target.loopDir*2+n*3)%n];
  if(!lead)return null;
  const direct=G.distance(monster,target),cut=Math.hypot(monster.x-lead.x,monster.y-lead.y);
  if(cut<direct*1.35)return{x:lead.x,y:lead.y,zone:G.zoneAt(lead.x,lead.y)?.id||target.zone};
  return null;
}
function predictedTarget(t,lead=34){
  const vx=t===G.player?G.player.dirX:(t.velX||t.dirX||0),vy=t===G.player?G.player.dirY:(t.velY||t.dirY||0);
  const l=Math.hypot(vx,vy)||1;return{x:t.x+vx/l*lead,y:t.y+vy/l*lead,zone:G.zoneAt(t.x,t.y)?.id||t.zone};
}

function stuck(b,dt,intended){
  const moved=Math.hypot(b.x-b.lastMoveX,b.y-b.lastMoveY);
  if(intended&&moved<1.0)b.stuckTimer+=dt;else b.stuckTimer=Math.max(0,b.stuckTimer-dt*2.4);
  if(b.stuckTimer>.34){
    b.pathTimer=0;b.think=0;b.stuckTimer=0;b.loopThink=0;
    const a=Math.random()*Math.PI*2;G.move(b,Math.cos(a)*7,Math.sin(a)*7);
  }
  b.lastMoveX=b.x;b.lastMoveY=b.y;
}

G.updateBots=dt=>{
  for(const b of G.bots){
    if(!b.alive)continue;
    b.velX=(b.x-b.lastX)/Math.max(dt,.001);b.velY=(b.y-b.lastY)/Math.max(dt,.001);b.lastX=b.x;b.lastY=b.y;
    b.think-=dt;b.attackCooldown=Math.max(0,b.attackCooldown-dt);b.hitBoost=Math.max(0,b.hitBoost-dt);b.pathTimer=Math.max(0,b.pathTimer-dt);
    b.anim+=dt*(b.injured?3.7:4.8)*Math.min(1.35,G.boostMultiplier(b));b.zone=G.zoneAt(b.x,b.y)?.id||b.zone;b.memoryTime=Math.max(0,b.memoryTime-dt);
    let goal={x:b.targetX,y:b.targetY,zone:b.targetZone};

    if(b.role==='monster'){
      const candidates=G.state.role==='survivor'?[G.player]:G.bots.filter(x=>x.role==='survivor'&&x.alive);
      let target=null,bd=1e9;
      for(const t of candidates){const d=G.distance(b,t);if(d<bd&&(canSee(b,t)||canHear(b,t))){target=t;bd=d;}}
      if(target){
        const z=G.zoneAt(target.x,target.y);b.memory={x:target.x,y:target.y,zone:z?.id||b.zone};b.memoryTime=3.2;
        const cut=antiLoopGoal(b,target);
        goal=cut||predictedTarget(target,bd<90?18:36);
        if(G.distance(b,target)<43)G.monsterAttack(b,false);
      }else if(b.memory&&b.memoryTime>0)goal={...b.memory};
      else if(b.think<=0){wander(b);goal={x:b.targetX,y:b.targetY,zone:b.targetZone};b.think=.85+Math.random()*1.25;}
    }else{
      const monster=G.state.role==='monster'?G.player:G.bots.find(x=>x.role==='monster'&&x.alive);
      const strategy=updateSurvivorStrategy(b,monster,dt);
      if(strategy){goal=strategy;b.think=.22;b.pathTimer=Math.min(b.pathTimer,.12);}
      else if(b.think<=0){
        let z=G.zones[Math.floor(Math.random()*G.zones.length)];
        const mates=G.bots.filter(x=>x!==b&&x.role==='survivor'&&x.alive&&x.zone===z.id).length;
        if(mates>=2)z=G.zones.find(x=>x.id!==z.id&&G.bots.filter(y=>y!==b&&y.role==='survivor'&&y.alive&&y.zone===x.id).length===0)||z;
        const p=randomPoint(z.id);b.targetX=p.x;b.targetY=p.y;b.targetZone=z.id;goal={x:p.x,y:p.y,zone:z.id};b.think=.7+Math.random()*1.3;
      }
    }

    const d=G.nearDoor(b,34);if(d&&!d.open){d.open=true;b.pathTimer=.05;}
    const wp=waypoint(b,goal);let dx=wp.x-b.x,dy=wp.y-b.y,l=Math.hypot(dx,dy),intended=false;
    if(l>4){
      intended=true;dx/=l;dy/=l;b.dirX=dx;b.dirY=dy;
      let sp;
      if(b.role==='monster')sp=80;
      else{
        const monster=G.state.role==='monster'?G.player:G.bots.find(x=>x.role==='monster'&&x.alive);
        const inChase=monster&&(b.threatMemory>0||canSee(b,monster));
        if(inChase&&b.stamina>0){sp=b.injured?76:86;b.stamina=Math.max(0,b.stamina-24*dt);}else{sp=b.injured?58:68;b.stamina=Math.min(b.maxStamina,b.stamina+17*dt);}
        if(goal.juke)sp*=1.07;
      }
      sp*=G.boostMultiplier(b);G.move(b,dx*sp*dt,dy*sp*dt);
    }else{b.pathTimer=0;b.think=0;}
    stuck(b,dt,intended);
  }
};
})();
