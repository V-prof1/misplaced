'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
const itemBtn=document.getElementById('itemBtn'),itemHud=document.getElementById('itemHud');
const LABELS={adrenaline:'ADRENALINA',battery:'CÉLULA',flash:'FLASH',decoy:'ISCA'};
const SHORT={adrenaline:'ADR',battery:'BAT',flash:'FLASH',decoy:'ISCA'};
const spawns=[
  {id:'i_med_a',type:'adrenaline',x:270,y:284,zone:'medical'},
  {id:'i_med_f',type:'flash',x:430,y:105,zone:'medical'},
  {id:'i_store_b',type:'battery',x:438,y:690,zone:'storage'},
  {id:'i_store_d',type:'decoy',x:248,y:448,zone:'storage'},
  {id:'i_lab_f',type:'flash',x:1142,y:314,zone:'lab'},
  {id:'i_lab_a',type:'adrenaline',x:930,y:300,zone:'lab'},
  {id:'i_cont_b',type:'battery',x:1160,y:690,zone:'containment'},
  {id:'i_cont_d',type:'decoy',x:748,y:690,zone:'containment'}
];
G.items=spawns.map(x=>({...x,active:true,pulse:Math.random()*6}));
G.decoys=[];

function lineClear(a,b){
  const d=G.distance(a,b),steps=Math.max(3,Math.ceil(d/10));
  for(let i=1;i<steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(G.isBlocked(x,y,2))return false;
  }
  return true;
}
function killer(){return S.role==='monster'?G.player:G.bots.find(b=>b.alive&&b.role==='monster');}
function nearestActive(actor,max=999){
  let best=null,bd=max;
  for(const it of G.items){
    if(!it.active)continue;
    if(G.zoneAt(actor.x,actor.y)?.id!==it.zone)continue;
    const d=Math.hypot(actor.x-it.x,actor.y-it.y);if(d<bd){best=it;bd=d;}
  }
  return best;
}
function pickup(actor,it){
  if(!actor||!it?.active||actor.role!=='survivor'||actor.inventory)return false;
  actor.inventory=it.type;it.active=false;
  if(actor===G.player)G.showToast(`${LABELS[it.type]} COLETADO`);
  return true;
}
function decoyPoint(actor){
  const dx=actor.dirX||1,dy=actor.dirY||0,l=Math.hypot(dx,dy)||1,z=G.zoneAt(actor.x,actor.y);
  let x=actor.x+dx/l*105,y=actor.y+dy/l*105;
  if(z){x=Math.max(z.x+24,Math.min(z.x+z.w-24,x));y=Math.max(z.y+24,Math.min(z.y+z.h-24,y));}
  if(G.isBlocked(x,y,8)){x=actor.x+dx/l*54;y=actor.y+dy/l*54;}
  return{x,y,zone:G.zoneAt(x,y)?.id||actor.zone};
}
function useItem(actor,quiet=false){
  const type=actor?.inventory;if(!type||actor.role!=='survivor')return false;
  const k=killer();
  if(type==='flash'){
    if(!k||G.distance(actor,k)>88||G.zoneAt(actor.x,actor.y)?.id!==G.zoneAt(k.x,k.y)?.id||!lineClear(actor,k)){
      if(actor===G.player&&!quiet)G.showToast('FLASH: KILLER FORA DO ALCANCE');
      return false;
    }
    k.stun=Math.max(k.stun||0,1.15);k.attackCooldown=Math.max(k.attackCooldown||0,.7);G.cancelDoorAction?.(k);
    if(k===G.player)G.state.shake=Math.max(G.state.shake,3.1);
    actor.noise=Math.max(actor.noise||0,.9);
  }else if(type==='adrenaline'){
    actor.adrenalineItemTime=3.2;actor.stamina=Math.min(actor.maxStamina||100,(actor.stamina||0)+28);actor.noise=Math.max(actor.noise||0,.35);
  }else if(type==='battery'){
    actor.batteryItemTime=5;actor.stamina=Math.min(actor.maxStamina||100,(actor.stamina||0)+62);
  }else if(type==='decoy'){
    const p=decoyPoint(actor);G.decoys.push({...p,life:3,maxLife:3});actor.noise=Math.max(actor.noise||0,.22);
    if(k&&k!==G.player&&G.distance(k,p)<390){
      const br=k.brain;if(br){br.target=null;br.targetLock=0;br.lastSeen={x:p.x,y:p.y,zone:p.zone};br.lastSeenAge=0;br.confidence=.5;br.searchPoint={x:p.x,y:p.y,zone:p.zone};br.searchTimer=1.6;br.decision=.7;br.pathTimer=0;}
      k.memory={x:p.x,y:p.y,zone:p.zone};k.memoryTime=2.6;
    }
  }
  actor.inventory=null;
  if(actor===G.player&&!quiet){
    const msg=type==='flash'?'FLASH DISPARADO':type==='adrenaline'?'ADRENALINA — 3.2s':type==='battery'?'CÉLULA DE RESERVA — 5s':'ISCA SONORA LANÇADA';G.showToast(msg);
  }
  return true;
}
G.usePlayerItem=()=>useItem(G.player,false);
G.resetItems=()=>{
  for(const it of G.items)it.active=true;G.decoys.length=0;
  for(const a of [G.player,...G.bots])if(a){a.inventory=null;a.adrenalineItemTime=0;a.batteryItemTime=0;}
};

const baseSpawn=G.spawnBots;
G.spawnBots=()=>{baseSpawn();G.resetItems();};

const baseBoost=G.boostMultiplier;
G.boostMultiplier=e=>{
  let m=baseBoost(e);if(e?.role==='survivor'&&(e.adrenalineItemTime||0)>0)m*=1.22;return Math.min(m,2.05);
};

function botShouldUse(b,k){
  if(!b.inventory||!k)return false;
  const d=G.distance(b,k),threat=b.brain?.threat||b.threatMemory||0;
  if(b.inventory==='flash')return d<78&&G.zoneAt(b.x,b.y)?.id===G.zoneAt(k.x,k.y)?.id&&lineClear(b,k);
  if(b.inventory==='adrenaline')return d<155&&threat>.25;
  if(b.inventory==='battery')return (b.stamina||0)<32&&threat>.2;
  if(b.inventory==='decoy')return d>115&&d<260&&threat>.18&&!lineClear(b,k);
  return false;
}
function seekItem(b){
  if(b.inventory||(b.brain?.threat||0)>.18||b.doorAction||(b.stun||0)>0)return;
  const it=nearestActive(b,220);if(!it)return;
  if(b.brain){b.brain.searchPoint={x:it.x,y:it.y,zone:it.zone};b.brain.decision=Math.max(b.brain.decision||0,.55);b.brain.pathTimer=0;}
  b.targetX=it.x;b.targetY=it.y;b.targetZone=it.zone;
}
function tryPickup(actor){if(actor.role!=='survivor'||actor.inventory)return;const it=nearestActive(actor,19);if(it)pickup(actor,it);}

const baseUpdate=G.updateBots;
G.updateBots=dt=>{
  const actors=[G.player,...G.bots];
  for(const a of actors){if(!a)continue;a.adrenalineItemTime=Math.max(0,(a.adrenalineItemTime||0)-dt);a.batteryItemTime=Math.max(0,(a.batteryItemTime||0)-dt);if(a.batteryItemTime>0)a.stamina=Math.min(a.maxStamina||100,(a.stamina||0)+15*dt);}
  for(const d of G.decoys)d.life-=dt;G.decoys=G.decoys.filter(d=>d.life>0);
  if(S.role==='survivor'&&G.player.health>0)tryPickup(G.player);
  for(const b of G.bots)if(b.alive&&b.role==='survivor')seekItem(b);
  baseUpdate(dt);
  const k=killer();
  for(const b of G.bots){if(!b.alive||b.role!=='survivor')continue;tryPickup(b);if(botShouldUse(b,k))useItem(b,true);}
  updateHud();
};

function updateHud(){
  if(!itemBtn||!itemHud)return;
  const surv=S.running&&S.role==='survivor';itemBtn.classList.toggle('hidden',!surv);
  if(!surv){itemHud.textContent='';return;}
  const inv=G.player.inventory;itemBtn.textContent=inv?SHORT[inv]:'ITEM';
  itemBtn.classList.toggle('ready',!!inv);
  itemHud.textContent=inv?`ITEM [R] · ${LABELS[inv]}`:'ITEM [R] · VAZIO';
}
itemBtn?.addEventListener('pointerdown',e=>{e.preventDefault();if(S.running&&S.role==='survivor')G.usePlayerItem();});
addEventListener('keydown',e=>{if(e.code==='KeyR'&&S.running&&S.role==='survivor'&&!e.repeat)G.usePlayerItem();});

const baseRender=G.render;
G.render=()=>{
  baseRender();if(!S.running)return;
  const ctx=G.ctx,cx=G.state.camera.x,cy=G.state.camera.y,pz=G.zoneAt(G.player.x,G.player.y)?.id;
  for(const it of G.items){
    if(!it.active||it.zone!==pz||Math.hypot(G.player.x-it.x,G.player.y-it.y)>275)continue;
    const x=Math.round(it.x-cx),y=Math.round(it.y-cy),pulse=.5+.5*Math.sin(S.time*4+it.pulse);
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x-8,y+6,16,4);ctx.strokeStyle=`rgba(205,185,100,${.38+.25*pulse})`;ctx.strokeRect(x-8.5,y-8.5,17,17);
    if(it.type==='adrenaline'){ctx.fillStyle='#9b443f';ctx.fillRect(x-5,y-6,10,12);ctx.fillStyle='#d9c9b0';ctx.fillRect(x-2,y-9,4,4);}
    else if(it.type==='battery'){ctx.fillStyle='#596e61';ctx.fillRect(x-6,y-7,12,14);ctx.fillStyle='#b3d0ad';ctx.fillRect(x-3,y-4,6,8);}
    else if(it.type==='flash'){ctx.fillStyle='#776f55';ctx.fillRect(x-7,y-4,14,9);ctx.fillStyle='#e7dfb1';ctx.fillRect(x+3,y-2,5,5);}
    else{ctx.fillStyle='#4b5561';ctx.fillRect(x-6,y-6,12,12);ctx.fillStyle='#be9e55';ctx.fillRect(x-2,y-9,4,4);}
  }
  if(S.role==='monster')for(const d of G.decoys){
    if(d.zone!==pz)continue;const x=Math.round(d.x-cx),y=Math.round(d.y-cy),t=1-d.life/d.maxLife,r=8+t*28;ctx.strokeStyle=`rgba(205,177,91,${.55*(1-t)})`;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
  }
};
updateHud();
})();
