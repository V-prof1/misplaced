'use strict';
(() => {
const G=window.MISPLACED;

// Door art is intentionally wider than its gameplay collider. This keeps the
// doorway readable without making shoulders catch on the frame while passing.
G.doorCollisionRect=d=>({
  x:d.x+2,
  y:d.y+5,
  w:Math.max(5,d.w-4),
  h:Math.max(18,d.h-10)
});

function dynamicSolidRects(){
  const out=[];
  for(const p of G.pallets||[])if(p.state==='down')out.push(p);
  for(const v of G.vaults||[])out.push(v);
  return out;
}

// Replace the old full-size door collider, while preserving every other solid
// object added by interactables.js.
G.isBlocked=(x,y,r)=>{
  for(const w of G.walls)if(G.rectCircle(w,x,y,r))return true;
  for(const d of G.doors)if(!d.open&&G.rectCircle(G.doorCollisionRect(d),x,y,r))return true;
  for(const c of G.colliders)if(G.rectCircle(c,x,y,r))return true;
  for(const c of dynamicSolidRects())if(G.rectCircle(c,x,y,r))return true;
  return x<20||y<20||x>G.WORLD_W-20||y>G.WORLD_H-20;
};

// Navigation still ignores door state (bots know how to interact with doors),
// but it keeps furniture, vaults and dropped barriers as real obstacles.
G.isNavBlocked=(x,y,r=10)=>{
  for(const w of G.walls)if(G.rectCircle(w,x,y,r))return true;
  for(const c of G.colliders)if(G.rectCircle(c,x,y,r))return true;
  for(const c of dynamicSolidRects())if(G.rectCircle(c,x,y,r))return true;
  return x<24||y<24||x>G.WORLD_W-24||y>G.WORLD_H-24;
};

function liveActors(){
  const a=[G.player];
  for(const b of G.bots)if(b.alive!==false)a.push(b);
  return a;
}
function pushOutOfDoor(a,d){
  if(!a)return;
  const hit=G.doorCollisionRect(d),r=(a.r||10)+1;
  if(!G.rectCircle(hit,a.x,a.y,r))return;
  const cx=hit.x+hit.w/2,cy=hit.y+hit.h/2;
  // All current Blackridge doors are vertical, but support horizontal doors too.
  if(hit.h>=hit.w){
    const preferred=a.x<cx?-1:1;
    const tries=[preferred,-preferred];
    for(const side of tries){
      const tx=side<0?hit.x-r-2:hit.x+hit.w+r+2;
      if(!G.isBlocked(tx,a.y,a.r||10)){a.x=tx;return;}
    }
    // Last resort: move along the doorway instead of leaving the actor trapped.
    const ty=a.y<cy?hit.y-r-2:hit.y+hit.h+r+2;
    if(!G.isBlocked(a.x,ty,a.r||10))a.y=ty;
  }else{
    const preferred=a.y<cy?-1:1;
    const tries=[preferred,-preferred];
    for(const side of tries){
      const ty=side<0?hit.y-r-2:hit.y+hit.h+r+2;
      if(!G.isBlocked(a.x,ty,a.r||10)){a.y=ty;return;}
    }
  }
}
function rescueThreshold(d){for(const a of liveActors())pushOutOfDoor(a,d);}

// When a close animation finishes, anyone still standing on the threshold is
// gently resolved to the nearest safe side instead of becoming collision-locked.
const baseUpdateDoorActor=G.updateDoorActor;
G.updateDoorActor=actor=>{
  const before=actor?.doorAction?{doorId:actor.doorAction.doorId,wantOpen:actor.doorAction.wantOpen}:null;
  const result=baseUpdateDoorActor?.(actor)||false;
  if(before&&!before.wantOpen&&!actor?.doorAction){
    const d=G.doors.find(x=>x.id===before.doorId);
    if(d&&!d.open)rescueThreshold(d);
  }
  return result;
};

// AI can also finish a door action from its update wrapper without the human
// calling updateDoorActor on the exact same frame, so run a lightweight edge
// check on state changes as a second safety net.
const doorStates=new Map(G.doors.map(d=>[d.id,!!d.open]));
const baseUpdateBots=G.updateBots;
G.updateBots=dt=>{
  baseUpdateBots(dt);
  for(const d of G.doors){
    const now=!!d.open,was=doorStates.get(d.id);
    if(was===true&&now===false)rescueThreshold(d);
    doorStates.set(d.id,now);
  }
};
})();
