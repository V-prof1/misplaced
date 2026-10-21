'use strict';
(() => {
const G=window.MISPLACED,S=G.state,ctx=G.ctx;
const A=()=>G.spriteAssets,M=()=>G.spriteAssetMeta;
const named={Mara:0,Eli:1,Nox:2,Iris:3};
const hairBase={pony:0,bun:0,short:1,undercut:1,braids:2,messy:3};
const outfitBase={jacket:0,vest:1,hoodie:2,coverall:2,parka:3};
const PHASES=6;
const sourceCell=document.createElement('canvas');sourceCell.width=24;sourceCell.height=32;
const sc=sourceCell.getContext('2d',{alpha:true});sc.imageSmoothingEnabled=false;
const frameCache=new Map(),monsterCache=new Map();
const SURV_STATE=['idle','walk','run','injured','item','interact','death'];
const MON_STATE=['idle','walk','run','rush','attack','stun','blackout','death'];
const WALK=[
  {ux:0,uy:0,lx:0,ly:0},{ux:0,uy:-1,lx:1,ly:0},{ux:0,uy:-1,lx:1,ly:-1},
  {ux:0,uy:0,lx:0,ly:-1},{ux:0,uy:0,lx:-1,ly:0},{ux:0,uy:-1,lx:-1,ly:0}
];
const RUN=[
  {ux:0,uy:0,lx:0,ly:0},{ux:-1,uy:-1,lx:1,ly:-1},{ux:-1,uy:-2,lx:2,ly:-1},
  {ux:0,uy:-1,lx:0,ly:-2},{ux:1,uy:0,lx:-2,ly:-1},{ux:1,uy:-1,lx:-1,ly:-1}
];
const LIMP=[
  {ux:0,uy:0,lx:0,ly:1},{ux:0,uy:-1,lx:1,ly:1},{ux:0,uy:-1,lx:1,ly:0},
  {ux:0,uy:0,lx:0,ly:1},{ux:0,uy:1,lx:-1,ly:1},{ux:0,uy:0,lx:-1,ly:0}
];
const IDLE_Y=[0,-1,-1,0,0,0];
const DIR_VEC=[[0,1],[-.707,.707],[-1,0],[-.707,-.707],[0,-1],[.707,-.707],[1,0],[.707,.707]];
G.customSprites=true;

function px(x){return x-S.camera.x}
function py(y){return y-S.camera.y}
function lineClear(a,b){
  const d=G.distance(a,b),n=Math.max(3,Math.ceil(d/11));
  for(let i=1;i<n-1;i++){const t=i/n;if(G.isBlocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,2))return false;}
  return true;
}
function visible(e){
  if(e===G.player)return true;
  const pz=G.zoneAt(G.player.x,G.player.y),ez=G.zoneAt(e.x,e.y);
  if(!pz||!ez||pz.id!==ez.id)return false;
  return G.distance(G.player,e)<=(pz.id==='corridor'?205:288)&&lineClear(G.player,e);
}
// Atlas order: ↓ ↙ ← ↖ ↑ ↗ → ↘
function dirIndex(e){
  const x=e.dirX||0,y=e.dirY||1,a=Math.atan2(y,x),oct=((Math.round(a/(Math.PI/4))%8)+8)%8;
  return[6,7,0,1,2,3,4,5][oct];
}
function movement(e){
  let moving=false;
  if(e===G.player)moving=Math.hypot(S.input?.x||0,S.input?.y||0)>.08;
  else{
    const dx=e.x-(e._atlasX??e.x),dy=e.y-(e._atlasY??e.y),raw=Math.hypot(dx,dy);
    e._atlasX=e.x;e._atlasY=e.y;e._atlasMotion=(e._atlasMotion||0)*.62+raw*.38;
    moving=e._atlasMotion>.025;
  }
  const sprint=moving&&(e===G.player?!!S.input?.sprint:((e.hitBoost||0)>0||(e.rushTime||0)>0||['flee','loop','chase'].includes(e.brain?.action)));
  return{moving,sprint,injured:e.health===1||e.injured};
}
function baseFor(e,appearance){
  if(Number.isInteger(e?.spriteBase))return Math.max(0,Math.min(3,e.spriteBase));
  if(e!==G.player&&named[e?.name]!=null)return named[e.name];
  const ap=appearance||e?.appearance||{},h=hairBase[ap.hair],o=outfitBase[ap.outfit];
  if(Number.isInteger(h)&&Number.isInteger(o))return(h+o)%4;
  if(Number.isInteger(h))return h;
  if(Number.isInteger(o))return o;
  return 0;
}
function survivorRow(e,m,preview=false){
  const r=M().survivor.rows;
  if(m.injured)return r.injured;
  if(e.doorAction||(e.mobilityCooldown||0)>.12)return r.interact;
  if(e.inventory&&!m.moving)return r.item;
  if(preview)return r.walk;
  if(m.sprint)return r.run;
  if(m.moving)return r.walk;
  return r.idle;
}
function appearanceKey(a){
  if(!a)return'-';
  return`${a.hair||''}|${a.hairColor||''}|${a.eyes||''}|${a.outfit||''}|${a.outfitColor||''}`;
}
function paintSource(base,dir,row,appearance){
  const meta=M().survivor,img=A().survivors,sx=(base*8+dir)*meta.cellW,sy=row*meta.cellH;
  sc.clearRect(0,0,24,32);sc.globalCompositeOperation='source-over';sc.globalAlpha=1;
  sc.drawImage(img,sx,sy,24,32,0,0,24,32);
  if(appearance){
    sc.globalCompositeOperation='source-atop';
    if(appearance.hairColor){sc.globalAlpha=.20;sc.fillStyle=appearance.hairColor;sc.fillRect(4,0,16,10);}
    if(appearance.outfitColor){sc.globalAlpha=.18;sc.fillStyle=appearance.outfitColor;sc.fillRect(2,10,20,18);}
    sc.globalCompositeOperation='source-over';sc.globalAlpha=1;
    if(appearance.eyes&&[0,1,7].includes(dir)){
      sc.fillStyle=appearance.eyes;sc.fillRect(10,8,1,1);sc.fillRect(13,8,1,1);
    }
  }
}
function buildSurvivorFrame(base,dir,row,frame,appearance){
  const key=`s:${base}:${dir}:${row}:${frame}:${appearanceKey(appearance)}`;
  if(frameCache.has(key))return frameCache.get(key);
  paintSource(base,dir,row,appearance);
  const out=document.createElement('canvas');out.width=24;out.height=32;
  const c=out.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  const state=SURV_STATE[row]||'idle',side=dir>=1&&dir<=3?-1:dir>=5&&dir<=7?1:0;
  if(state==='idle'||state==='item'){
    const y=IDLE_Y[frame]-(state==='item'&&frame===2?1:0);
    c.drawImage(sourceCell,0,y);
  }else if(state==='walk'||state==='run'||state==='injured'){
    const step=(state==='walk'?WALK:state==='run'?RUN:LIMP)[frame],split=21;
    c.drawImage(sourceCell,0,0,24,split,step.ux+(state==='run'?side*(frame===2||frame===3?1:0):0),step.uy,24,split);
    c.drawImage(sourceCell,0,split,24,11,step.lx,split+step.ly,24,11);
  }else if(state==='interact'){
    const reach=[0,1,2,2,1,0][frame]*side,y=[0,-1,-1,0,0,0][frame],split=19;
    c.drawImage(sourceCell,0,0,24,split,reach,y,24,split);
    c.drawImage(sourceCell,0,split,24,13,0,split,24,13);
  }else if(state==='death'){
    const y=[-2,-1,0,1,1,1][frame],x=[0,side,side*2,side*2,side,0][frame];
    c.drawImage(sourceCell,x,y);
  }else c.drawImage(sourceCell,0,0);
  frameCache.set(key,out);
  return out;
}
function survivorFrameIndex(e,m,row,preview=false){
  const state=SURV_STATE[row]||'idle',seed=e.skinSeed||0;
  if(preview)return Math.floor((S.time*7.5)+seed)%PHASES;
  if(state==='idle'||state==='item'||state==='interact')return Math.abs(Math.floor((S.time*5.5)+seed))%PHASES;
  if(state==='death')return Math.min(PHASES-1,Math.floor((e.deathAnim||0)*PHASES));
  const mul=m.sprint?1.32:m.injured?1.10:1.16;
  return Math.abs(Math.floor((e.anim||0)*mul))%PHASES;
}
function shadow(c,x,y,w,a=.48){
  c.fillStyle=`rgba(0,0,0,${a})`;c.beginPath();c.ellipse(Math.round(x),Math.round(y),w/2,3,0,0,Math.PI*2);c.fill();
}
function status(c,e,x,y,w,h,me){
  if((e.stun||0)>0)c.strokeStyle='rgba(232,199,91,.78)';
  else if((e.hitBoost||0)>0)c.strokeStyle='rgba(185,216,194,.4)';
  else if(me)c.strokeStyle='rgba(182,210,190,.20)';
  else return;
  c.lineWidth=1;c.strokeRect(Math.round(x)+.5,Math.round(y)+.5,w-1,h-1);
}
function drawSurvivor(e,me=false,force=false,target=ctx,appearance=null,preview=false){
  if(!A()?.ready||(!force&&(!visible(e)||e.health<=0||e.alive===false)))return false;
  const m=movement(e),dir=preview?0:dirIndex(e),row=survivorRow(e,m,preview),base=baseFor(e,appearance),ap=appearance||e.appearance||null;
  const fi=survivorFrameIndex(e,m,row,preview),src=buildSurvivorFrame(base,dir,row,fi,ap);
  const x=Math.round(force?e.x:px(e.x)),y=Math.round(force?e.y:py(e.y)),dw=48,dh=64;
  shadow(target,x,y+18,m.sprint?31:28,m.sprint?.56:.46);
  target.save();target.imageSmoothingEnabled=false;
  target.drawImage(src,x-dw/2,y+20-dh,dw,dh);
  target.restore();
  status(target,e,x-dw/2-2,y+20-dh-1,dw+4,dh+3,me);
  return true;
}
function monsterRow(e,m){
  const r=M().monster.rows;
  if((e.stun||0)>0)return r.stun;
  if((e.attackAnim||0)>0)return r.attack;
  if(G.blackoutState?.time>0)return r.blackout;
  if((e.rushTime||0)>0)return r.rush;
  if(m.sprint)return r.run;
  if(m.moving)return r.walk;
  return r.idle;
}
function monsterFrameIndex(e,m,row){
  const state=MON_STATE[row]||'idle';
  if(state==='attack'){
    const p=1-Math.max(0,Math.min(1,(e.attackAnim||0)/.34));
    return Math.max(0,Math.min(PHASES-1,Math.floor(p*PHASES)));
  }
  if(state==='stun'||state==='blackout'||state==='idle')return Math.abs(Math.floor(S.time*(state==='idle'?4.5:7)+(e.skinSeed||0)))%PHASES;
  const mul=state==='rush'?1.55:m.sprint?1.35:1.15;
  return Math.abs(Math.floor((e.anim||0)*mul))%PHASES;
}
function buildMonsterFrame(dir,row,frame){
  const key=`m:${dir}:${row}:${frame}`;if(monsterCache.has(key))return monsterCache.get(key);
  const meta=M().monster,img=A().monster,sx=dir*meta.cellW,sy=row*meta.cellH;
  const src=document.createElement('canvas');src.width=36;src.height=48;
  const q=src.getContext('2d',{alpha:true});q.imageSmoothingEnabled=false;q.drawImage(img,sx,sy,36,48,0,0,36,48);
  const out=document.createElement('canvas');out.width=36;out.height=48;
  const c=out.getContext('2d',{alpha:true});c.imageSmoothingEnabled=false;
  const state=MON_STATE[row]||'idle',v=DIR_VEC[dir]||[0,1],side=v[0]<-.2?-1:v[0]>.2?1:0;
  if(state==='idle'){
    c.drawImage(src,0,IDLE_Y[frame]);
  }else if(state==='walk'||state==='run'||state==='rush'){
    const step=(state==='walk'?WALK:RUN)[frame],split=31,boost=state==='rush'?2:state==='run'?1:0;
    c.drawImage(src,0,0,36,split,step.ux+side*boost,step.uy-(boost&&frame===2?1:0),36,split);
    c.drawImage(src,0,split,36,17,step.lx*(state==='rush'?2:1),split+step.ly,36,17);
  }else if(state==='attack'){
    const ext=[0,1,3,5,3,1][frame],dx=Math.round(v[0]*ext),dy=Math.round(v[1]*ext);
    c.drawImage(src,dx,dy);
  }else if(state==='stun'){
    const x=[0,-2,2,-1,1,0][frame],y=[0,0,-1,1,0,0][frame];c.drawImage(src,x,y);
  }else if(state==='blackout'){
    const x=[0,-1,1,-1,1,0][frame];c.drawImage(src,x,0);
  }else if(state==='death'){
    c.drawImage(src,0,[0,0,1,1,2,2][frame]);
  }else c.drawImage(src,0,0);
  monsterCache.set(key,out);return out;
}
function drawMonster(e,me=false,force=false,target=ctx){
  if(!A()?.ready||(!force&&(!visible(e)||e.alive===false)))return false;
  const m=movement(e),dir=force?0:dirIndex(e),row=monsterRow(e,m);
  if((e.attackAnim||0)>0)e.attackAnim=Math.max(0,e.attackAnim-1/60);
  const fi=monsterFrameIndex(e,m,row),src=buildMonsterFrame(dir,row,fi),state=MON_STATE[row]||'idle';
  const p=state==='attack'?1-Math.max(0,Math.min(1,(e.attackAnim||0)/.34)):0,slash=Math.sin(p*Math.PI),v=DIR_VEC[dir]||[0,1];
  const lunge=state==='attack'?Math.round(slash*7):state==='rush'?3:0;
  const x0=Math.round(force?e.x:px(e.x)),y0=Math.round(force?e.y:py(e.y)),x=x0+Math.round(v[0]*lunge),y=y0+Math.round(v[1]*lunge),dw=72,dh=96;
  shadow(target,x0,y0+27,43,state==='rush'?.62:.50);
  target.save();target.imageSmoothingEnabled=false;
  target.drawImage(src,x-dw/2,y+29-dh,dw,dh);
  target.restore();
  status(target,e,x0-dw/2-2,y0+29-dh-1,dw+4,dh+5,me);
  return true;
}
function drawWorld(){
  if(!A()?.ready)return;
  for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?drawMonster(b):drawSurvivor(b);}
  if(G.player.role==='monster')drawMonster(G.player,true);else if(G.player.health>0)drawSurvivor(G.player,true);
}
G.renderCustomEntities=drawWorld;
G.renderCustomMenuMonster=()=>{
  const e={x:628-S.camera.x,y:270-S.camera.y,role:'monster',dirX:0,dirY:1,anim:S.time*4,alive:true,health:2,stun:0,skinSeed:5};
  drawMonster(e,false,true,ctx);
};
G.drawSurvivorPreview=(c,appearance,x,y,scale=3)=>{
  if(!A()?.ready)return false;
  const fake={x:0,y:0,role:'survivor',dirX:0,dirY:1,anim:S.time*5.5,alive:true,health:2,inventory:null,appearance,skinSeed:17};
  c.save();c.translate(x,y);c.scale(scale,scale);drawSurvivor(fake,false,true,c,appearance,true);c.restore();return true;
};
const baseAttack=G.monsterAttack;
G.monsterAttack=(attacker,isPlayer)=>{if((attacker.attackCooldown||0)<=0)attacker.attackAnim=.34;return baseAttack(attacker,isPlayer);};
const baseSpawn=G.spawnBots;
G.spawnBots=()=>{baseSpawn();for(const b of G.bots){if(b.role!=='survivor')continue;b.spriteBase=Math.floor(Math.random()*4);b.skinSeed=Math.random()*1000;}};
function ready(){G.customSprites=true;frameCache.clear();monsterCache.clear();dispatchEvent(new Event('misplaced-sprites-ready'));}
if(A()?.ready)setTimeout(ready,0);else addEventListener('misplaced-sprite-assets-ready',ready,{once:true});
})();
