'use strict';
(() => {
const G=window.MISPLACED,S=G.state,ctx=G.ctx;
const A=()=>G.spriteAssets,M=()=>G.spriteAssetMeta;
const named={Mara:0,Eli:1,Nox:2,Iris:3};
const hairBase={pony:0,bun:0,short:1,undercut:1,braids:2,messy:3};
const outfitBase={jacket:0,vest:1,hoodie:2,coverall:2,parka:3};
const cell=document.createElement('canvas');cell.width=24;cell.height=32;
const cc=cell.getContext('2d',{alpha:true});cc.imageSmoothingEnabled=false;
const WALK=[
  {y:0,r:-.008,sx:.995,sy:1.012},{y:-1,r:-.004,sx:1.002,sy:.998},{y:-2,r:.002,sx:1.008,sy:.986},
  {y:-1,r:.008,sx:1.002,sy:.998},{y:0,r:.004,sx:.995,sy:1.012},{y:-1,r:-.002,sx:1.002,sy:.998}
];
const RUN=[
  {y:0,r:-.018,sx:.985,sy:1.025},{y:-2,r:-.010,sx:1.012,sy:.982},{y:-3,r:.004,sx:1.026,sy:.966},
  {y:-2,r:.018,sx:1.012,sy:.982},{y:0,r:.010,sx:.985,sy:1.025},{y:-2,r:-.004,sx:1.012,sy:.982}
];
const LIMP=[
  {y:0,r:-.018,sx:1,sy:1.018},{y:-1,r:-.012,sx:1.006,sy:.992},{y:-2,r:.004,sx:1.01,sy:.982},
  {y:0,r:.018,sx:.994,sy:1.024},{y:1,r:.012,sx:.985,sy:1.035},{y:-1,r:-.004,sx:1.004,sy:.994}
];
G.customSprites=!!A()?.ready;
function px(x){return x-S.camera.x}function py(y){return y-S.camera.y}
function lineClear(a,b){const d=G.distance(a,b),n=Math.max(3,Math.ceil(d/11));for(let i=1;i<n-1;i++){const t=i/n;if(G.isBlocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,2))return false;}return true;}
function visible(e){if(e===G.player)return true;const pz=G.zoneAt(G.player.x,G.player.y),ez=G.zoneAt(e.x,e.y);if(!pz||!ez||pz.id!==ez.id)return false;return G.distance(G.player,e)<=(pz.id==='corridor'?205:288)&&lineClear(G.player,e);}
function dirIndex(e){const x=e.dirX||0,y=e.dirY||1,a=Math.atan2(y,x),oct=((Math.round(a/(Math.PI/4))%8)+8)%8;return[2,1,0,7,6,5,4,3][oct];}
function movement(e){let moving=false;if(e===G.player)moving=Math.hypot(S.input?.x||0,S.input?.y||0)>.08;else{const dx=e.x-(e._atlasX??e.x),dy=e.y-(e._atlasY??e.y),raw=Math.hypot(dx,dy);e._atlasX=e.x;e._atlasY=e.y;e._atlasMotion=(e._atlasMotion||0)*.62+raw*.38;moving=e._atlasMotion>.025;}const sprint=moving&&(e===G.player?!!S.input?.sprint:((e.hitBoost||0)>0||(e.rushTime||0)>0||['flee','loop','chase'].includes(e.brain?.action)));return{moving,sprint,injured:e.health===1||e.injured};}
function baseFor(e,appearance){if(Number.isInteger(e?.spriteBase))return Math.max(0,Math.min(3,e.spriteBase));if(e!==G.player&&named[e?.name]!=null)return named[e.name];const ap=appearance||e?.appearance||{},h=hairBase[ap.hair],o=outfitBase[ap.outfit];if(Number.isInteger(h)&&Number.isInteger(o))return(h+o)%4;if(Number.isInteger(h))return h;if(Number.isInteger(o))return o;return 0;}
function survivorRow(e,m,preview=false){const r=M().survivor.rows;if(m.injured)return r.injured;if(e.doorAction||(e.mobilityCooldown||0)>.12)return r.interact;if(e.inventory&&!m.moving)return r.item;if(preview)return r.walk;if(m.sprint)return r.run;if(m.moving)return r.walk;return r.idle;}
function tinted(base,dir,row,appearance){const meta=M().survivor,img=A().survivors,sx=(base*8+dir)*meta.cellW,sy=row*meta.cellH;cc.clearRect(0,0,24,32);cc.globalCompositeOperation='source-over';cc.globalAlpha=1;cc.drawImage(img,sx,sy,24,32,0,0,24,32);if(appearance){cc.globalCompositeOperation='source-atop';if(appearance.hairColor){cc.globalAlpha=.20;cc.fillStyle=appearance.hairColor;cc.fillRect(4,0,16,10);}if(appearance.outfitColor){cc.globalAlpha=.18;cc.fillStyle=appearance.outfitColor;cc.fillRect(2,10,20,18);}cc.globalCompositeOperation='source-over';cc.globalAlpha=1;if(appearance.eyes&&[0,1,7].includes(dir)){cc.fillStyle=appearance.eyes;cc.fillRect(10,8,1,1);cc.fillRect(13,8,1,1);}}return cell;}
function shadow(c,x,y,w,a=.48){c.fillStyle=`rgba(0,0,0,${a})`;c.beginPath();c.ellipse(Math.round(x),Math.round(y),w/2,3,0,0,Math.PI*2);c.fill();}
function status(c,e,x,y,w,h,me){if((e.stun||0)>0)c.strokeStyle='rgba(232,199,91,.78)';else if((e.hitBoost||0)>0)c.strokeStyle='rgba(185,216,194,.4)';else if(me)c.strokeStyle='rgba(182,210,190,.20)';else return;c.lineWidth=1;c.strokeRect(Math.round(x)+.5,Math.round(y)+.5,w-1,h-1);}
function gait(e,m){if(!m.moving){const t=S.time*2.15+(e.skinSeed||0);return{y:Math.sin(t)*.35,r:Math.sin(t*.55)*.0025,sx:1,sy:1+Math.sin(t)*.006};}const frames=m.injured?LIMP:m.sprint?RUN:WALK,idx=Math.abs(Math.floor((e.anim||0)*1.5))%frames.length;return frames[idx];}
function drawSurvivor(e,me=false,force=false,target=ctx,appearance=null,preview=false){if(!A()?.ready||(!force&&(!visible(e)||e.health<=0||e.alive===false)))return false;const meta=M().survivor,m=movement(e),dir=preview?0:dirIndex(e),row=survivorRow(e,m,preview),base=baseFor(e,appearance),ap=appearance||e.appearance||null,g=gait(e,m),src=tinted(base,dir,row,ap),x=force?e.x:px(e.x),y=force?e.y:py(e.y);const dw=42,dh=56;shadow(target,x,y+17,m.sprint?29:27,m.sprint?.56:.46);target.save();target.imageSmoothingEnabled=false;target.translate(x,y+18+g.y);let rot=g.r+(e.dirX||0)*(m.sprint?.014:m.moving?.006:0);if(m.injured)rot+=Math.sin((e.anim||0)*Math.PI)*.006;if((e.stun||0)>0)rot+=Math.sin(S.time*14)*.025;if(e.doorAction)rot+=(e.dirX||0)*.012;target.rotate(rot);target.scale(g.sx,g.sy);target.drawImage(src,-dw/2,-dh,dw,dh);target.restore();status(target,e,x-dw/2-2,y-dh+16+g.y,dw+4,dh+3,me);return true;}
function monsterRow(e,m){const r=M().monster.rows;if((e.stun||0)>0)return r.stun;if((e.attackAnim||0)>0)return r.attack;if(G.blackoutState?.time>0)return r.blackout;if((e.rushTime||0)>0)return r.rush;if(m.sprint)return r.run;if(m.moving)return r.walk;return r.idle;}
function drawMonster(e,me=false,force=false,target=ctx){if(!A()?.ready||(!force&&(!visible(e)||e.alive===false)))return false;const meta=M().monster,m=movement(e),dir=force?0:dirIndex(e),row=monsterRow(e,m),img=A().monster;if((e.attackAnim||0)>0)e.attackAnim=Math.max(0,e.attackAnim-1/60);const walk=Math.sin((e.anim||0)*Math.PI*2),fi=Math.abs(Math.floor((e.anim||0)*1.32))%6,frame=(e.rushTime||0)>0?RUN[fi]:m.moving?(m.sprint?RUN[fi]:WALK[fi]):{y:Math.sin(S.time*1.5)*.45,r:Math.sin(S.time*.75)*.004,sx:1,sy:1};const attack=(e.attackAnim||0)>0?1-e.attackAnim/.34:0,slash=Math.sin(Math.max(0,Math.min(1,attack))*Math.PI),lunge=slash*7.5,x0=force?e.x:px(e.x),y0=force?e.y:py(e.y),x=x0+(e.dirX||0)*lunge,y=y0+(e.dirY||0)*lunge,sx0=dir*meta.cellW,sy0=row*meta.cellH,dw=60,dh=80;shadow(target,x0,y0+25,41,(e.rushTime||0)>0?.62:.50);target.save();target.imageSmoothingEnabled=false;target.translate(x,y+27+frame.y);let rot=frame.r+(e.dirX||0)*(m.sprint?.02:m.moving?.009:0);if((e.rushTime||0)>0)rot+=(e.dirX||0)*.02;if((e.stun||0)>0)rot+=Math.sin(S.time*11)*.018;if(slash)rot+=(e.dirX||0||1)*slash*.045;target.rotate(rot);target.scale(frame.sx*(1+slash*.025),frame.sy);target.drawImage(img,sx0,sy0,meta.cellW,meta.cellH,-dw/2,-dh,dw,dh);target.restore();status(target,e,x0-dw/2-2,y0-dh+23+frame.y,dw+4,dh+5,me);return true;}
function drawWorld(){if(!A()?.ready)return;for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?drawMonster(b):drawSurvivor(b);}if(G.player.role==='monster')drawMonster(G.player,true);else if(G.player.health>0)drawSurvivor(G.player,true);}
G.renderCustomEntities=drawWorld;
G.renderCustomMenuMonster=()=>{const e={x:628-S.camera.x,y:270-S.camera.y,role:'monster',dirX:0,dirY:1,anim:S.time*.42,alive:true,health:2,stun:0};drawMonster(e,false,true,ctx);};
G.drawSurvivorPreview=(c,appearance,x,y,scale=3)=>{if(!A()?.ready)return false;const fake={x:0,y:0,role:'survivor',dirX:0,dirY:1,anim:S.time*4.4,alive:true,health:2,inventory:null,appearance,skinSeed:17};c.save();c.translate(x,y);c.scale(scale,scale);drawSurvivor(fake,false,true,c,appearance,true);c.restore();return true;};
const baseAttack=G.monsterAttack;G.monsterAttack=(attacker,isPlayer)=>{if((attacker.attackCooldown||0)<=0)attacker.attackAnim=.34;return baseAttack(attacker,isPlayer);};
const baseSpawn=G.spawnBots;G.spawnBots=()=>{baseSpawn();for(const b of G.bots){if(b.role!=='survivor')continue;b.spriteBase=Math.floor(Math.random()*4);b.skinSeed=Math.random()*1000;}};
function ready(){G.customSprites=true;dispatchEvent(new Event('misplaced-sprites-ready'));}
if(A()?.ready)setTimeout(ready,0);else addEventListener('misplaced-sprite-assets-ready',ready,{once:true});
})();
