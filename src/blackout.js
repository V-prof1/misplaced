'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
const blackoutBtn=document.getElementById('blackoutBtn');
const flashJoy=document.getElementById('flashJoy');
const flashStick=flashJoy?.querySelector('.flash-stick');
const powerHud=document.getElementById('powerHud');

const BLACKOUT_DURATION=6.4;
const BLACKOUT_COOLDOWN=24;
const CONE_LENGTH=158;
const CONE_HALF_ANGLE=.50;

G.blackoutState={time:0,maxTime:BLACKOUT_DURATION,source:null};
G.flashAim={x:0,y:-1,manual:false};

function killer(){return S.role==='monster'?G.player:G.bots.find(b=>b.alive&&b.role==='monster');}
function sameRoom(a,b){const za=G.zoneAt(a.x,a.y),zb=G.zoneAt(b.x,b.y);return !!za&&!!zb&&za.id===zb.id;}
function initMonster(m){if(!m||m.role!=='monster')return;m.blackoutCD=0;}

const baseSpawn=G.spawnBots;
G.spawnBots=()=>{
  baseSpawn();
  G.blackoutState.time=0;G.blackoutState.source=null;G.flashAim.manual=false;
  initMonster(G.player);for(const b of G.bots)initMonster(b);
};

function activateBlackout(m,human=false){
  if(!m||m.role!=='monster'||(m.blackoutCD||0)>0||(m.stun||0)>0||m.doorAction||G.blackoutState.time>0)return false;
  m.blackoutCD=BLACKOUT_COOLDOWN;
  G.blackoutState.time=BLACKOUT_DURATION;G.blackoutState.source=m;
  for(const s of [G.player,...G.bots])if(s?.role==='survivor'){s.blackoutFear=BLACKOUT_DURATION;s.noise=Math.max(s.noise||0,.18);}
  if(human){G.state.shake=Math.max(G.state.shake,1.4);G.showToast(`BLACKOUT — ${BLACKOUT_DURATION.toFixed(1)}s`);}
  return true;
}
G.useBlackout=()=>activateBlackout(G.player,true);

function aiUseBlackout(m){
  if(!m||m===G.player||m.role!=='monster'||!m.alive||(m.blackoutCD||0)>0||G.blackoutState.time>0||(m.stun||0)>0)return;
  const target=m.brain?.target;
  if(target&&target.health>0&&target.alive!==false&&sameRoom(m,target)){
    const d=G.distance(m,target);
    if(d>70&&d<285)activateBlackout(m,false);
    return;
  }
  if(S.role==='survivor'&&G.player.health>0&&sameRoom(m,G.player)&&G.distance(m,G.player)<245)activateBlackout(m,false);
}

function tick(dt){
  G.blackoutState.time=Math.max(0,G.blackoutState.time-dt);
  for(const a of [G.player,...G.bots]){
    if(!a)continue;
    if(a.role==='monster')a.blackoutCD=Math.max(0,(a.blackoutCD||0)-dt);
    else a.blackoutFear=Math.max(0,(a.blackoutFear||0)-dt);
  }
  if(G.blackoutState.time<=0){G.blackoutState.source=null;G.flashAim.manual=false;}
}

const baseUpdate=G.updateBots;
G.updateBots=dt=>{
  tick(dt);
  baseUpdate(dt);
  const m=G.bots.find(b=>b.alive&&b.role==='monster');if(m)aiUseBlackout(m);
  updateUi();
};

function activeForPlayer(){return S.running&&S.role==='survivor'&&G.blackoutState.time>0;}
function aim(){
  const p=G.player;
  if(!G.flashAim.manual){
    const dx=p.dirX||0,dy=p.dirY||1,l=Math.hypot(dx,dy)||1;G.flashAim.x=dx/l;G.flashAim.y=dy/l;
  }
  const l=Math.hypot(G.flashAim.x,G.flashAim.y)||1;return{x:G.flashAim.x/l,y:G.flashAim.y/l};
}

const mask=document.createElement('canvas');mask.width=G.W;mask.height=G.H;
const mctx=mask.getContext('2d',{alpha:true});mctx.imageSmoothingEnabled=false;
function carveCone(){
  const ctx=G.ctx,p=G.player,a=aim();
  const px=Math.round(p.x-S.camera.x),py=Math.round(p.y-S.camera.y),ang=Math.atan2(a.y,a.x);
  mctx.globalCompositeOperation='source-over';mctx.clearRect(0,0,G.W,G.H);mctx.fillStyle='rgba(0,0,0,.965)';mctx.fillRect(0,0,G.W,G.H);
  mctx.globalCompositeOperation='destination-out';
  // Tiny local pool so the survivor can always read their immediate collision space.
  mctx.fillStyle='rgba(0,0,0,.88)';mctx.beginPath();mctx.arc(px,py,23,0,Math.PI*2);mctx.fill();
  const ex1=px+Math.cos(ang-CONE_HALF_ANGLE)*CONE_LENGTH,ey1=py+Math.sin(ang-CONE_HALF_ANGLE)*CONE_LENGTH;
  const ex2=px+Math.cos(ang+CONE_HALF_ANGLE)*CONE_LENGTH,ey2=py+Math.sin(ang+CONE_HALF_ANGLE)*CONE_LENGTH;
  mctx.fillStyle='rgba(0,0,0,.96)';mctx.beginPath();mctx.moveTo(px,py);mctx.lineTo(ex1,ey1);mctx.lineTo(ex2,ey2);mctx.closePath();mctx.fill();
  // Softer fringe around the cone, still dramatically smaller than normal sight.
  const softLen=CONE_LENGTH+28,soft=.61;
  mctx.fillStyle='rgba(0,0,0,.25)';mctx.beginPath();mctx.moveTo(px,py);
  mctx.lineTo(px+Math.cos(ang-soft)*softLen,py+Math.sin(ang-soft)*softLen);
  mctx.lineTo(px+Math.cos(ang+soft)*softLen,py+Math.sin(ang+soft)*softLen);mctx.closePath();mctx.fill();
  mctx.globalCompositeOperation='source-over';ctx.drawImage(mask,0,0);
}
function killerEyes(){
  const k=killer();if(!k||k===G.player||!sameRoom(G.player,k))return;
  const ctx=G.ctx,x=Math.round(k.x-S.camera.x),y=Math.round(k.y-S.camera.y-22);
  const pulse=.55+.45*Math.sin(S.time*8);
  ctx.fillStyle=`rgba(145,24,20,${.12+.16*pulse})`;ctx.fillRect(x-9,y-5,18,10);
  ctx.fillStyle=`rgba(255,71,56,${.72+.24*pulse})`;ctx.fillRect(x-5,y-1,3,2);ctx.fillRect(x+3,y-1,3,2);
  ctx.fillStyle=`rgba(255,190,154,${.55+.35*pulse})`;ctx.fillRect(x-4,y-1,1,1);ctx.fillRect(x+4,y-1,1,1);
}

const baseRender=G.render;
G.render=()=>{
  baseRender();
  if(activeForPlayer()){carveCone();killerEyes();}
};

function updateUi(){
  if(!blackoutBtn)return;
  const show=S.running&&S.role==='monster';blackoutBtn.classList.toggle('hidden',!show);
  if(show){blackoutBtn.textContent=(G.player.blackoutCD||0)>0?Math.ceil(G.player.blackoutCD):'BLACK';blackoutBtn.classList.toggle('ready',(G.player.blackoutCD||0)<=0);}
  const bActive=activeForPlayer();flashJoy?.classList.toggle('hidden',!bActive);
  G.ui.mobile?.classList.toggle('blackout-survivor',bActive);
  if(powerHud&&show){
    const state=(G.player.blackoutCD||0)>0?`${Math.ceil(G.player.blackoutCD)}s`:'PRONTO';
    const extra=`   |   B BLACKOUT · ${state}`;
    if(!powerHud.textContent.includes('BLACKOUT'))powerHud.textContent+=extra;
  }
}

blackoutBtn?.addEventListener('pointerdown',e=>{e.preventDefault();if(S.running&&S.role==='monster')G.useBlackout();});
addEventListener('keydown',e=>{if(e.code==='KeyB'&&S.running&&S.role==='monster'&&!e.repeat)G.useBlackout();});

let flashId=null;
function flashMove(clientX,clientY){
  if(!flashJoy)return;const r=flashJoy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=clientX-cx,dy=clientY-cy,m=Math.hypot(dx,dy),max=39;if(m<4)return;
  const rawX=dx,rawY=dy;if(m>max){dx=dx/m*max;dy=dy/m*max;}
  if(flashStick)flashStick.style.transform=`translate(${dx}px,${dy}px)`;
  const l=Math.hypot(rawX,rawY)||1;G.flashAim.x=rawX/l;G.flashAim.y=rawY/l;G.flashAim.manual=true;
}
flashJoy?.addEventListener('pointerdown',e=>{if(!activeForPlayer())return;flashId=e.pointerId;flashJoy.setPointerCapture(e.pointerId);flashMove(e.clientX,e.clientY);});
flashJoy?.addEventListener('pointermove',e=>{if(e.pointerId===flashId)flashMove(e.clientX,e.clientY);});
function flashEnd(e){if(e.pointerId!==flashId)return;flashId=null;if(flashStick)flashStick.style.transform='';}
flashJoy?.addEventListener('pointerup',flashEnd);flashJoy?.addEventListener('pointercancel',flashEnd);

// Mouse aiming gives PC players the same independent flashlight control.
G.canvas.addEventListener('pointermove',e=>{
  if(!activeForPlayer()||e.pointerType!=='mouse')return;
  const r=G.canvas.getBoundingClientRect(),mx=(e.clientX-r.left)*G.W/r.width,my=(e.clientY-r.top)*G.H/r.height;
  const px=G.player.x-S.camera.x,py=G.player.y-S.camera.y,dx=mx-px,dy=my-py,l=Math.hypot(dx,dy);if(l<5)return;
  G.flashAim.x=dx/l;G.flashAim.y=dy/l;G.flashAim.manual=true;
});

updateUi();
})();
