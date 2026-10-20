'use strict';
(() => {
const G=window.MISPLACED;
const baseSpawn=G.spawnBots;

const preferred={
  'The Misplaced':{x:1142,y:648,zone:'containment'},
  'Mara':{x:250,y:260,zone:'medical'},
  'Eli':{x:438,y:650,zone:'storage'},
  'Nox':{x:1138,y:224,zone:'lab'},
  'Iris':{x:1144,y:656,zone:'containment'}
};

function freeAt(x,y,r=11){
  if(G.isBlocked(x,y,r))return false;
  const z=G.zoneAt(x,y);if(!z)return false;
  if(Math.hypot(x-G.player.x,y-G.player.y)<52)return false;
  for(const b of G.bots){
    if(!b.alive)continue;
    if(Math.hypot(x-b.x,y-b.y)<38)return false;
  }
  return true;
}

function safePoint(pref,r=11){
  if(pref&&freeAt(pref.x,pref.y,r))return{x:pref.x,y:pref.y};
  const z=G.zoneById(pref?.zone)||G.zones[2];
  const cx=pref?.x??(z.x+z.w/2),cy=pref?.y??(z.y+z.h/2);
  for(let ring=24;ring<=220;ring+=18){
    for(let a=0;a<Math.PI*2;a+=Math.PI/8){
      const x=Math.max(z.x+24,Math.min(z.x+z.w-24,cx+Math.cos(a)*ring));
      const y=Math.max(z.y+24,Math.min(z.y+z.h-24,cy+Math.sin(a)*ring));
      if(freeAt(x,y,r))return{x,y};
    }
  }
  for(let i=0;i<80;i++){
    const x=z.x+28+Math.random()*(z.w-56),y=z.y+28+Math.random()*(z.h-56);
    if(freeAt(x,y,r))return{x,y};
  }
  return{x:z.x+z.w/2,y:z.y+z.h/2};
}

function resetMotion(b,p){
  b.x=p.x;b.y=p.y;b.targetX=p.x;b.targetY=p.y;
  b.targetZone=G.zoneAt(p.x,p.y)?.id||b.targetZone;
  b.zone=b.targetZone;
  b.lastX=p.x;b.lastY=p.y;b.lastMoveX=p.x;b.lastMoveY=p.y;
  b.path=[];b.pathIndex=0;b.pathTimer=0;
  if(b.brain){b.brain.path=[];b.brain.pathIndex=0;b.brain.pathTimer=0;b.brain.lastX=p.x;b.brain.lastY=p.y;}
}

G.spawnBots=()=>{
  baseSpawn();
  const placed=[];
  for(const b of G.bots){
    const pref=preferred[b.name]||{x:b.x,y:b.y,zone:G.zoneAt(b.x,b.y)?.id||'corridor'};
    // Temporarily move previously placed actors out of the collision check list logic.
    const p=safePoint(pref,b.r||10);
    resetMotion(b,p);
    placed.push(p);
  }
  // Final safety pass: if a later bot ended up too close, relocate it again.
  for(let i=0;i<G.bots.length;i++){
    const b=G.bots[i];let bad=G.isBlocked(b.x,b.y,b.r||10);
    for(let j=0;j<i&&!bad;j++)if(Math.hypot(b.x-G.bots[j].x,b.y-G.bots[j].y)<30)bad=true;
    if(bad)resetMotion(b,safePoint(preferred[b.name],b.r||10));
  }
};
})();
