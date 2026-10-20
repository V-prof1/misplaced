'use strict';
(() => {
const G=window.MISPLACED,S=G.state;

// Survivor-only emergency routes. They are deliberately narrow and slow to cross:
// useful for making distance, but not strong enough to replace normal looping.
G.survivorGaps=[
  {id:'g_store',x:506,y:456,w:16,h:40,zones:['storage','corridor'],label:'CRAWL'},
  {id:'g_lab',x:688,y:286,w:16,h:40,zones:['lab','corridor'],label:'CRAWL'}
];

// The storage opening already existed. Carve one additional maintenance opening
// in the lab/corridor wall by splitting that wall segment around the slot.
function carveVerticalWall(x,y,w,h,gapY,gapH){
  const i=G.walls.findIndex(v=>v.x===x&&v.y===y&&v.w===w&&v.h===h);
  if(i<0)return;
  G.walls.splice(i,1);
  const top=gapY-y,bottom=(y+h)-(gapY+gapH);
  if(top>0)G.walls.push({x,y,w,h:top});
  if(bottom>0)G.walls.push({x,y:gapY+gapH,w,h:bottom});
}
carveVerticalWall(688,240,16,128,286,40);

function expanded(g,pad=0){return{x:g.x-pad,y:g.y-pad,w:g.w+pad*2,h:g.h+pad*2};}
function nearGap(e,g,pad=15){return G.rectCircle(expanded(g,pad),e.x,e.y,e.r||10);}

// Keep normal bot pathfinding away from these special routes. This prevents the
// killer AI from repeatedly pathing into an opening it physically cannot use.
// Human survivors can still choose them manually as a tactical escape route.
const baseNavBlocked=G.isNavBlocked;
G.isNavBlocked=(x,y,r=10)=>{
  if(baseNavBlocked(x,y,r))return true;
  for(const g of G.survivorGaps)if(G.rectCircle(g,x,y,r))return true;
  return false;
};

const baseMove=G.move;
const gapSide=new WeakMap();
G.move=(e,dx,dy)=>{
  if(!e)return baseMove(e,dx,dy);
  let mx=dx,my=dy;
  if(e.role==='monster'){
    // Monsters cannot fit through the maintenance slots. Only block the movement
    // component that enters the opening so they can still slide along the wall.
    for(const g of G.survivorGaps){
      if(G.rectCircle(g,e.x+mx,e.y,e.r||10))mx=0;
      if(G.rectCircle(g,e.x,e.y+my,e.r||10))my=0;
    }
  }else{
    // Survivors must squeeze through: about 45% slower while inside the opening.
    let squeezing=false;
    for(const g of G.survivorGaps){
      if(nearGap(e,g,4)||G.rectCircle(expanded(g,3),e.x+mx,e.y+my,e.r||10)){squeezing=true;break;}
    }
    if(squeezing){mx*=.56;my*=.56;e.noise=Math.max(e.noise||0,.28);}
  }
  const ox=e.x,oy=e.y,moved=baseMove(e,mx,my);

  if(e.role!=='monster'){
    for(const g of G.survivorGaps){
      const cx=g.x+g.w/2;
      if(e.y>=g.y-8&&e.y<=g.y+g.h+8){
        const oldSide=ox<cx?-1:1,newSide=e.x<cx?-1:1,last=gapSide.get(e)?.[g.id];
        if(oldSide!==newSide&&last!==newSide){
          const state=gapSide.get(e)||{};state[g.id]=newSide;gapSide.set(e,state);
          e.stamina=Math.max(0,(e.stamina||0)-7);
          if(e===G.player){G.state.shake=Math.max(G.state.shake,.4);G.audio?.vault?.();}
        }
      }
    }
  }
  return moved;
};

function drawGap(g){
  const z=G.zoneAt(G.player.x,G.player.y);if(!z||!g.zones.includes(z.id))return;
  const d=Math.hypot(G.player.x-(g.x+g.w/2),G.player.y-(g.y+g.h/2));if(d>235)return;
  const ctx=G.ctx,x=Math.round(g.x-S.camera.x),y=Math.round(g.y-S.camera.y);
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(x-5,y-5,g.w+10,g.h+10);
  ctx.strokeStyle='#747c76';ctx.lineWidth=2;ctx.strokeRect(x-3,y-3,g.w+6,g.h+6);
  ctx.fillStyle='#171c1a';ctx.fillRect(x+1,y+2,g.w-2,g.h-4);
  ctx.fillStyle='#a48447';ctx.fillRect(x-6,y-8,g.w+12,4);
  ctx.fillStyle='#2c322f';for(let yy=6;yy<g.h-4;yy+=9)ctx.fillRect(x+2,y+yy,g.w-4,2);
  ctx.fillStyle='#d2bd78';ctx.font='5px monospace';ctx.textAlign='center';ctx.fillText('CRAWL',x+g.w/2,y-10);
  ctx.restore();
}

const baseRender=G.render;
G.render=()=>{baseRender();for(const g of G.survivorGaps)drawGap(g);};
})();
