'use strict';
(() => {
const G=window.MISPLACED,S=G.state,ctx=G.ctx;
const A=()=>G.spriteAssets,M=()=>G.spriteAssetMeta;
const named={Mara:0,Eli:1,Nox:2,Iris:3};
const hairBase={pony:0,bun:0,short:1,undercut:1,braids:2,messy:3};
const outfitBase={jacket:0,vest:1,hoodie:2,coverall:2,parka:3};
const survivorCell=document.createElement('canvas');survivorCell.width=48;survivorCell.height=56;
const sc=survivorCell.getContext('2d',{alpha:true});sc.imageSmoothingEnabled=false;
G.customSprites=!!A()?.ready;

function px(x){return Math.round(x-S.camera.x)}function py(y){return Math.round(y-S.camera.y)}
function lineClear(a,b){const d=G.distance(a,b),n=Math.max(3,Math.ceil(d/11));for(let i=1;i<n-1;i++){const t=i/n;if(G.isBlocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,2))return false;}return true;}
function visible(e){if(e===G.player)return true;const pz=G.zoneAt(G.player.x,G.player.y),ez=G.zoneAt(e.x,e.y);if(!pz||!ez||pz.id!==ez.id)return false;const max=pz.id==='corridor'?205:288;return G.distance(G.player,e)<=max&&lineClear(G.player,e);}
function dirIndex(e){const x=e.dirX||0,y=e.dirY||1,a=Math.atan2(y,x),oct=((Math.round(a/(Math.PI/4))%8)+8)%8;return [2,1,0,7,6,5,4,3][oct];}
function movement(e){let moving=false;if(e===G.player)moving=Math.hypot(S.input?.x||0,S.input?.y||0)>.08;else{const dx=e.x-(e._atlasX??e.x),dy=e.y-(e._atlasY??e.y);const raw=Math.hypot(dx,dy);e._atlasX=e.x;e._atlasY=e.y;e._atlasMotion=(e._atlasMotion||0)*.64+raw*.36;moving=e._atlasMotion>.03;}const sprint=moving&&(e===G.player?!!S.input?.sprint:((e.hitBoost||0)>0||(e.rushTime||0)>0||['flee','loop','chase'].includes(e.brain?.action)));return{moving,sprint,injured:e.health===1||e.injured};}
function baseFor(e,appearance){if(Number.isInteger(e?.spriteBase))return Math.max(0,Math.min(3,e.spriteBase));if(e!==G.player&&named[e?.name]!=null)return named[e.name];const ap=appearance||e?.appearance||{};const h=hairBase[ap.hair],o=outfitBase[ap.outfit];if(Number.isInteger(h)&&Number.isInteger(o))return(h+o)%4;if(Number.isInteger(h))return h;if(Number.isInteger(o))return o;return 0;}
function survivorRow(e,m,preview=false){const rows=M().survivor.rows;if(m.injured)return rows.injured;if(e.inventory)return rows.item;if(preview)return (Math.floor(S.time*4)&1)?rows.walk:rows.idle;if(m.sprint)return (Math.floor((e.anim||0)*2.8)&1)?rows.run:rows.walk;if(m.moving)return (Math.floor((e.anim||0)*2.2)&1)?rows.walk:rows.idle;return rows.idle;}
function tintSurvivor(base,dir,row,appearance){const img=A().survivors,meta=M().survivor,sx=(base*8+dir)*meta.cellW,sy=row*meta.cellH;sc.clearRect(0,0,48,56);sc.globalCompositeOperation='source-over';sc.globalAlpha=1;sc.drawImage(img,sx,sy,48,56,0,0,48,56);if(appearance){sc.globalCompositeOperation='source-atop';if(appearance.hairColor){sc.globalAlpha=.24;sc.fillStyle=appearance.hairColor;sc.fillRect(8,0,32,19);}if(appearance.outfitColor){sc.globalAlpha=.18;sc.fillStyle=appearance.outfitColor;sc.fillRect(4,19,40,31);}sc.globalCompositeOperation='source-over';sc.globalAlpha=1;if(appearance.eyes&&[0,1,7].includes(dir)){sc.fillStyle=appearance.eyes;sc.fillRect(21,15,1,1);sc.fillRect(27,15,1,1);}}return survivorCell;}
function status(c,e,x,y,w,h,me){if((e.stun||0)>0)c.strokeStyle='rgba(232,199,91,.78)';else if((e.hitBoost||0)>0)c.strokeStyle='rgba(185,216,194,.4)';else if(me)c.strokeStyle='rgba(182,210,190,.22)';else return;c.lineWidth=1;c.strokeRect(Math.round(x)+.5,Math.round(y)+.5,w-1,h-1);}
function shadow(c,x,y,w){c.fillStyle='rgba(0,0,0,.48)';c.beginPath();c.ellipse(Math.round(x),Math.round(y),w/2,3,0,0,Math.PI*2);c.fill();}
function drawSurvivor(e,me=false,force=false,target=ctx,appearance=null,preview=false){if(!A()?.ready||(!force&&(!visible(e)||e.health<=0||e.alive===false)))return;const meta=M().survivor,m=movement(e),dir=preview?0:dirIndex(e),row=survivorRow(e,m,preview),base=baseFor(e,appearance),ap=appearance||e.appearance||null;const phase=Math.sin((e.anim||S.time*.7)*Math.PI*2),bob=(m.moving?Math.abs(phase)*(m.sprint?2:1):Math.sin(S.time*2+(e.skinSeed||0))*.25);const x=force?e.x:px(e.x),y=force?e.y:py(e.y);shadow(target,x,y+17,27);const cell=tintSurvivor(base,dir,row,ap);target.imageSmoothingEnabled=false;target.drawImage(cell,Math.round(x-24),Math.round(y-38-bob),48,56);status(target,e,x-25,y-40-bob,50,59,me);}
function monsterRow(e,m){const rows=M().monster.rows;if((e.stun||0)>0)return rows.stun;if((e.attackAnim||0)>0)return rows.attack;if(m.sprint)return (Math.floor((e.anim||0)*2.3)&1)?rows.run:rows.walk;if(m.moving)return rows.walk;return rows.idle;}
function drawMonster(e,me=false,force=false,target=ctx){if(!A()?.ready||(!force&&(!visible(e)||e.alive===false)))return;const meta=M().monster,m=movement(e),dir=force?0:dirIndex(e),row=monsterRow(e,m),img=A().monster;if((e.attackAnim||0)>0)e.attackAnim=Math.max(0,e.attackAnim-1/60);const sx=dir*meta.cellW,sy=row*meta.cellH,phase=Math.sin((e.anim||0)*Math.PI*2),bob=m.moving?Math.abs(phase)*(m.sprint?2:1):Math.sin(S.time*1.7)*.35;const x=force?e.x:px(e.x),y=force?e.y:py(e.y);shadow(target,x,y+25,39);target.imageSmoothingEnabled=false;target.drawImage(img,sx,sy,72,84,Math.round(x-36),Math.round(y-56-bob),72,84);status(target,e,x-37,y-58-bob,74,87,me);}
function drawWorld(){if(!A()?.ready)return;for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?drawMonster(b):drawSurvivor(b);}if(G.player.role==='monster')drawMonster(G.player,true);else if(G.player.health>0)drawSurvivor(G.player,true);}
G.renderCustomEntities=drawWorld;
G.renderCustomMenuMonster=()=>{const e={x:628-S.camera.x,y:270-S.camera.y,role:'monster',dirX:0,dirY:1,anim:S.time*.35,alive:true,health:2,stun:0};drawMonster(e,false,true,ctx);};
G.drawSurvivorPreview=(c,appearance,x,y,scale=3)=>{if(!A()?.ready)return false;const fake={x,y,role:'survivor',dirX:0,dirY:1,anim:S.time*.7,alive:true,health:2,inventory:null,appearance,skinSeed:17};c.save();c.translate(x,y);c.scale(scale,scale);fake.x=0;fake.y=0;drawSurvivor(fake,false,true,c,appearance,true);c.restore();return true;};
const baseAttack=G.monsterAttack;G.monsterAttack=(attacker,isPlayer)=>{if((attacker.attackCooldown||0)<=0)attacker.attackAnim=.34;return baseAttack(attacker,isPlayer);};
const baseSpawn=G.spawnBots;G.spawnBots=()=>{baseSpawn();for(const b of G.bots){if(b.role!=='survivor')continue;b.spriteBase=Math.floor(Math.random()*4);b.skinSeed=Math.random()*1000;}};
function ready(){G.customSprites=true;dispatchEvent(new Event('misplaced-sprites-ready'));}
if(A()?.ready)setTimeout(ready,0);else addEventListener('misplaced-sprite-assets-ready',ready,{once:true});
})();
