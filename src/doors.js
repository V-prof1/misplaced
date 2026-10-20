'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
const OPEN_SURVIVOR=.48,OPEN_MONSTER=.56,CLOSE_SURVIVOR=.20,CLOSE_MONSTER=.24,LOCKOUT=.34;
const proxyCache=new WeakMap();

function center(d){return{x:d.x+d.w/2,y:d.y+d.h/2};}
function actorDistance(a,d){const c=center(d);return Math.hypot(a.x-c.x,a.y-c.y);}
function clearDoor(d){
  if(d._actor&&d._actor.doorAction?.doorId===d.id)d._actor.doorAction=null;
  d._actor=null;d._desired=null;d._startedAt=0;d._endsAt=0;
}
function finishDoor(d,now=performance.now()){
  if(!d._actor||!d._endsAt||now<d._endsAt)return false;
  const actor=d._actor,desired=d._desired;
  d._open=desired;
  d.cooldownUntil=now+LOCKOUT*1000;
  clearDoor(d);
  if(actor===G.player){
    actor.noise=Math.max(actor.noise||0,1);
    S.shake=Math.max(S.shake,1.15);
    G.showToast(desired?'PORTA ABERTA':'PORTA FECHADA');
  }
  return true;
}
function flushDoor(d){finishDoor(d);return d._open;}

for(const d of G.doors){
  d._open=!!d.open;d._actor=null;d._desired=null;d._startedAt=0;d._endsAt=0;d.cooldownUntil=0;
  delete d.open;
  Object.defineProperty(d,'open',{
    enumerable:true,configurable:true,
    get(){return flushDoor(d);},
    set(v){if(!S.running){d._open=!!v;clearDoor(d);d.cooldownUntil=0;}}
  });
}

G.requestDoor=(actor,d,wantOpen)=>{
  if(!actor||!d)return false;
  flushDoor(d);wantOpen=!!wantOpen;
  if(d._open===wantOpen)return false;
  const now=performance.now();
  if(now<(d.cooldownUntil||0))return false;
  if(d._actor&&d._actor!==actor)return false;
  if(actor.doorAction)return actor.doorAction.doorId===d.id&&actor.doorAction.wantOpen===wantOpen;
  if(actorDistance(actor,d)>56)return false;
  const monster=actor.role==='monster';
  const duration=wantOpen?(monster?OPEN_MONSTER:OPEN_SURVIVOR):(monster?CLOSE_MONSTER:CLOSE_SURVIVOR);
  d._actor=actor;d._desired=wantOpen;d._startedAt=now;d._endsAt=now+duration*1000;
  actor.doorAction={doorId:d.id,wantOpen,duration,startedAt:now,endsAt:d._endsAt};
  if(actor===G.player)G.showToast(wantOpen?'ABRINDO PORTA...':'FECHANDO PORTA...');
  return true;
};

G.cancelDoorAction=actor=>{
  if(!actor?.doorAction)return;
  const d=G.doors.find(x=>x.id===actor.doorAction.doorId);
  if(d&&d._actor===actor)clearDoor(d);else actor.doorAction=null;
};
G.updateDoorActor=actor=>{
  if(!actor?.doorAction)return false;
  const d=G.doors.find(x=>x.id===actor.doorAction.doorId);
  if(!d){actor.doorAction=null;return false;}
  if(actorDistance(actor,d)>64){G.cancelDoorAction(actor);return false;}
  flushDoor(d);return !!actor.doorAction;
};
G.doorActionProgress=actor=>{
  if(!actor?.doorAction)return 0;
  const a=actor.doorAction,now=performance.now();
  return Math.max(0,Math.min(1,(now-a.startedAt)/(a.endsAt-a.startedAt)));
};
G.doorActionLabel=actor=>actor?.doorAction?(actor.doorAction.wantOpen?'ABRINDO PORTA':'FECHANDO PORTA'):'';

const rawNearDoor=(e,range=50)=>{
  let best=null,bd=999;
  for(const d of G.doors){flushDoor(d);const dist=actorDistance(e,d);if(dist<range&&dist<bd){best=d;bd=dist;}}
  return best;
};
G.nearDoorRaw=rawNearDoor;
G.nearDoor=(actor,range=50)=>{
  const d=rawNearDoor(actor,range);if(!d)return null;
  let byActor=proxyCache.get(actor);if(!byActor){byActor=new Map();proxyCache.set(actor,byActor);}
  if(byActor.has(d.id))return byActor.get(d.id);
  const p=new Proxy(d,{
    get(target,prop){if(prop==='open')return flushDoor(target);return target[prop];},
    set(target,prop,value){if(prop==='open'){G.requestDoor(actor,target,!!value);return true;}target[prop]=value;return true;}
  });
  byActor.set(d.id,p);return p;
};

const baseMove=G.move;
G.move=(e,dx,dy)=>{if(e?.doorAction){G.updateDoorActor(e);if(e.doorAction)return 0;}return baseMove(e,dx,dy);};

// Taking a hit cancels an unfinished door interaction, so survivors cannot tank a hit
// while magically finishing the opening animation.
const baseHitBoost=G.applyHitBoost;
G.applyHitBoost=(victim,attacker)=>{G.cancelDoorAction(victim);return baseHitBoost(victim,attacker);};

function zonesMatchDoor(d,a,b){return a&&b&&a.id!==b.id&&d.zones.includes(a.id)&&d.zones.includes(b.id);}
function clearSight(a,b){
  const dist=G.distance(a,b),steps=Math.max(3,Math.ceil(dist/12));
  for(let i=1;i<steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(G.isBlocked(x,y,2))return false;
  }
  return true;
}
function survivorDoorPlay(b,killer){
  if(!killer||b.doorAction||b.doorTrick>0)return false;
  const bz=G.zoneAt(b.x,b.y),kz=G.zoneAt(killer.x,killer.y);if(!bz||!kz)return false;
  for(const d of G.doors){
    if(!d.open||actorDistance(b,d)>42||!zonesMatchDoor(d,bz,kz))continue;
    const kd=actorDistance(killer,d),dist=G.distance(b,killer);
    if(dist<185&&kd<150){
      if(G.requestDoor(b,d,false)){b.doorTrick=.9;b.pathTimer=0;b.loopThink=0;return true;}
    }
  }
  return false;
}
function targetVelocity(t){if(t===G.player)return{x:G.player.dirX||0,y:G.player.dirY||0};return{x:t.velX||t.dirX||0,y:t.velY||t.dirY||0};}
function monsterDoorPlay(m,target){
  if(!target||m.doorAction||m.doorTrick>0)return false;
  const mz=G.zoneAt(m.x,m.y),tz=G.zoneAt(target.x,target.y);if(!mz||!tz||mz.id!==tz.id||mz.id==='corridor')return false;
  if(!(m.memoryTime>0||clearSight(m,target)))return false;
  for(const d of G.doors){
    if(!d.open||!d.zones.includes(mz.id)||actorDistance(m,d)>44)continue;
    const c=center(d),md=actorDistance(m,d),td=actorDistance(target,d);
    if(td<md+20||G.distance(m,target)>235)continue;
    const v=targetVelocity(target),vl=Math.hypot(v.x,v.y)||1,dx=c.x-target.x,dy=c.y-target.y,dl=Math.hypot(dx,dy)||1;
    const movingTowardDoor=(v.x/vl)*(dx/dl)+(v.y/vl)*(dy/dl)>.15;
    if(movingTowardDoor||td<150||G.distance(m,target)<105){
      if(G.requestDoor(m,d,false)){m.doorTrick=1.05;m.pathTimer=0;return true;}
    }
  }
  return false;
}

const baseUpdateBots=G.updateBots;
G.updateBots=dt=>{
  const monsterBot=G.bots.find(b=>b.alive&&b.role==='monster');
  for(const b of G.bots){
    if(!b.alive)continue;
    b.doorTrick=Math.max(0,(b.doorTrick||0)-dt);G.updateDoorActor(b);
    if(b.role==='survivor'){
      const killer=S.role==='monster'?G.player:monsterBot;if(killer)survivorDoorPlay(b,killer);
    }else if(b.role==='monster'){
      const target=S.role==='survivor'&&G.player.health>0?G.player:null;if(target)monsterDoorPlay(b,target);
    }
  }
  baseUpdateBots(dt);
};
})();
