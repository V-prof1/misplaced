'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function killer(){return S.role==='monster'?G.player:G.bots.find(b=>b.alive&&b.role==='monster');}
function initSurvivor(b){
  if(!b||b.role!=='survivor')return;
  b.maxStamina=Math.max(b.maxStamina||100,130);
  b.stamina=Math.min(b.maxStamina,Math.max(b.stamina||100,118));
  b.hitBoostMax=Math.max(b.hitBoostMax||1.35,1.75);
  b._dodgeCooldown=.25+Math.random()*.55;
  b._panicTime=0;b._panicX=0;b._panicY=0;b._survivalBurst=0;
  if(b.profile){
    b.profile.loop=clamp((b.profile.loop||.6)+.10,0,1);
    b.profile.rotate=clamp((b.profile.rotate||.6)+.08,0,1);
    b.profile.juke=clamp((b.profile.juke||.55)+.12,0,1);
    b.profile.greed=clamp((b.profile.greed||.5)-.05,0,1);
  }
}

const baseSpawn=G.spawnBots;
G.spawnBots=()=>{
  baseSpawn();
  for(const b of G.bots)initSurvivor(b);
};

// Survivor bots receive a modest chase acceleration. It is strongest while the
// killer is genuinely close and capped so hit-speed boosts do not become absurd.
const baseBoost=G.boostMultiplier;
G.boostMultiplier=e=>{
  let m=baseBoost(e);
  if(e!==G.player&&e?.role==='survivor'&&e.alive!==false){
    const k=killer();
    const d=k?G.distance(e,k):999;
    const threat=clamp(e.brain?.threat||e.threatMemory||0,0,1);
    const proximity=clamp((175-d)/125,0,1);
    const burst=(e._survivalBurst||0)>0?1:0;
    m*=1+.16*threat+.11*proximity+.06*burst;
    m=Math.min(m,1.88);
  }
  return m;
};

const baseHit=G.applyHitBoost;
G.applyHitBoost=(victim,attacker)=>{
  if(victim!==G.player&&victim?.role==='survivor'){
    victim.hitBoostMax=Math.max(victim.hitBoostMax||1.35,1.75);
    victim._survivalBurst=1.15;
    victim._dodgeCooldown=Math.max(victim._dodgeCooldown||0,.45);
  }
  return baseHit(victim,attacker);
};

function choosePanicDirection(b,k){
  const dx=b.x-k.x,dy=b.y-k.y,l=Math.hypot(dx,dy)||1;
  const ax=dx/l,ay=dy/l;
  const p1={x:-ay,y:ax},p2={x:ay,y:-ax};
  const test=(p)=>{
    const x=b.x+(ax*.45+p.x*.9)*24,y=b.y+(ay*.45+p.y*.9)*24;
    return G.isBlocked(x,y,b.r||10)?-999:G.distance({x,y},k);
  };
  const p=test(p1)>=test(p2)?p1:p2;
  const vx=ax*.42+p.x*.91,vy=ay*.42+p.y*.91,vl=Math.hypot(vx,vy)||1;
  return{x:vx/vl,y:vy/vl};
}

function facingThreat(k,b){
  const dx=b.x-k.x,dy=b.y-k.y,l=Math.hypot(dx,dy)||1;
  const fx=k.dirX||0,fy=k.dirY||1,fl=Math.hypot(fx,fy)||1;
  return (fx/fl)*(dx/l)+(fy/fl)*(dy/l)>.35;
}

const baseUpdate=G.updateBots;
G.updateBots=dt=>{
  // The human killer was dramatically faster than the AI survivors. Keep a
  // clear speed advantage, but not enough to erase looping and route choice.
  if(S.role==='monster')G.player.runSpeed=142;

  const k=killer();
  for(const b of G.bots){
    if(!b.alive||b.role!=='survivor')continue;
    b._dodgeCooldown=Math.max(0,(b._dodgeCooldown||0)-dt);
    b._panicTime=Math.max(0,(b._panicTime||0)-dt);
    b._survivalBurst=Math.max(0,(b._survivalBurst||0)-dt);
    if(!k||k===b)continue;
    const d=G.distance(b,k);
    if(d<82&&b._dodgeCooldown<=0&&!b.doorAction&&(b.stun||0)<=0&&(facingThreat(k,b)||d<54)){
      const p=choosePanicDirection(b,k);
      b._panicX=p.x;b._panicY=p.y;b._panicTime=.18+.08*Math.random();
      b._dodgeCooldown=.70+Math.random()*.55;
      if(b.brain){b.brain.action='juke';b.brain.actionLock=.18;b.brain.pathTimer=0;}
    }
  }

  baseUpdate(dt);

  // Short reactive sidestep after the regular brain movement. It reacts only
  // to proximity/facing, never to the attack button itself, so it does not cheat.
  for(const b of G.bots){
    if(!b.alive||b.role!=='survivor'||b._panicTime<=0||b.doorAction||(b.stun||0)>0)continue;
    const force=b.injured?42:50;
    G.move(b,b._panicX*force*dt,b._panicY*force*dt);
  }

  // Slightly faster recovery out of chase so bots can actually reuse stamina
  // after successfully breaking line of sight.
  for(const b of G.bots){
    if(!b.alive||b.role!=='survivor')continue;
    const threatened=(b.brain?.threat||0)>.18;
    if(!threatened)b.stamina=Math.min(b.maxStamina||130,b.stamina+7*dt);
  }
};
})();
