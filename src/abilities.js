'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
const senseBtn=document.getElementById('senseBtn'),rushBtn=document.getElementById('rushBtn'),powerHud=document.getElementById('powerHud');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function survivors(){
  const out=[];if(S.role==='survivor'&&G.player.health>0)out.push(G.player);
  for(const b of G.bots)if(b.alive&&b.role==='survivor')out.push(b);return out;
}
function initMonster(m){
  if(!m||m.role!=='monster')return;m.senseCD=0;m.senseTime=0;m.senseTick=0;m.rushCD=0;m.rushTime=0;m.senseEchoes=[];
}
G.resetKillerAbilities=()=>{initMonster(G.player);for(const b of G.bots)initMonster(b);};
const baseSpawn=G.spawnBots;
G.spawnBots=()=>{baseSpawn();G.resetKillerAbilities();};

function targetNoise(t){
  if(t===G.player){const moving=Math.hypot(S.input?.x||0,S.input?.y||0)>.15;return (G.player.noise||0)+(moving?.28:0)+(G.player.health===1?.2:0);}
  const moving=Math.hypot(t.velX||0,t.velY||0)>18;return (t.noise||0)+(moving?.3:0)+(t.injured?.24:0);
}
function scanSense(m){
  const pool=survivors(),heard=[];
  for(const t of pool){
    const d=G.distance(m,t),noise=targetNoise(t);if(d>365||noise<.12)continue;
    const err=18+clamp(d/365,0,1)*34,ang=Math.random()*Math.PI*2,rad=Math.random()*err;
    heard.push({x:t.x+Math.cos(ang)*rad,y:t.y+Math.sin(ang)*rad,zone:G.zoneAt(t.x,t.y)?.id||t.zone,ttl:1.35,name:t.name||'SURVIVOR'});
  }
  if(m===G.player){m.senseEchoes.push(...heard);m.senseEchoes=m.senseEchoes.slice(-8);}
  else if(heard.length){
    heard.sort((a,b)=>G.distance(m,a)-G.distance(m,b));const e=heard[0],br=m.brain;
    if(br){br.target=null;br.targetLock=0;br.lastSeen={x:e.x,y:e.y,zone:e.zone};br.lastSeenAge=0;br.confidence=Math.max(br.confidence||0,.48);br.searchPoint={x:e.x,y:e.y,zone:e.zone};br.searchTimer=1.4;br.decision=.55;br.pathTimer=0;}
    m.memory={x:e.x,y:e.y,zone:e.zone};m.memoryTime=2.2;
  }
}
function useSense(m,human=false){
  if(!m||m.role!=='monster'||m.senseCD>0||(m.stun||0)>0||m.doorAction)return false;
  m.senseCD=14;m.senseTime=3.4;m.senseTick=0;scanSense(m);
  if(human){G.state.shake=Math.max(G.state.shake,.7);G.showToast('ECOS DO VAZIO — 3.4s');}
  return true;
}
function useRush(m,human=false){
  if(!m||m.role!=='monster'||m.rushCD>0||(m.stun||0)>0||m.doorAction)return false;
  m.rushCD=12.5;m.rushTime=1.7;m.attackCooldown=Math.max(m.attackCooldown||0,.28);m.noise=Math.max(m.noise||0,.75);
  if(human){G.state.shake=Math.max(G.state.shake,1.05);G.showToast('PASSO DESLOCADO — 1.7s');}
  return true;
}
G.useSense=()=>useSense(G.player,true);G.useRush=()=>useRush(G.player,true);

const baseBoost=G.boostMultiplier;
G.boostMultiplier=e=>{
  let m=baseBoost(e);if(e?.role==='monster'&&(e.rushTime||0)>0)m*=1.30;return Math.min(m,2.1);
};

function tickActor(a,dt){
  if(!a||a.role!=='monster')return;
  a.senseCD=Math.max(0,(a.senseCD||0)-dt);a.senseTime=Math.max(0,(a.senseTime||0)-dt);a.senseTick=Math.max(0,(a.senseTick||0)-dt);a.rushCD=Math.max(0,(a.rushCD||0)-dt);a.rushTime=Math.max(0,(a.rushTime||0)-dt);
  if(a.senseTime>0&&a.senseTick<=0){scanSense(a);a.senseTick=.55;}
  if(a.senseEchoes)for(const e of a.senseEchoes)e.ttl-=dt;
  if(a.senseEchoes)a.senseEchoes=a.senseEchoes.filter(e=>e.ttl>0);
}
function aiUsePowers(m){
  if(!m||m===G.player||m.role!=='monster'||!m.alive||(m.stun||0)>0||m.doorAction)return;
  const br=m.brain,target=br?.target;
  if(target&&target.health>0&&target.alive!==false){
    const d=G.distance(m,target);if(d>105&&d<235&&m.rushCD<=0)useRush(m,false);
  }else if(m.senseCD<=0&&(br?.lastSeenAge??99)>1.1){
    let candidate=false;for(const s of survivors()){if(G.distance(m,s)<350&&targetNoise(s)>.12){candidate=true;break;}}
    if(candidate)useSense(m,false);
  }
}

const baseUpdate=G.updateBots;
G.updateBots=dt=>{
  tickActor(G.player,dt);for(const b of G.bots)tickActor(b,dt);
  baseUpdate(dt);
  const m=G.bots.find(b=>b.alive&&b.role==='monster');if(m)aiUsePowers(m);
  updateHud();
};

function cd(v){return v>0?`${Math.ceil(v)}s`:'PRONTO';}
function updateHud(){
  if(!senseBtn||!rushBtn||!powerHud)return;
  const show=S.running&&S.role==='monster';senseBtn.classList.toggle('hidden',!show);rushBtn.classList.toggle('hidden',!show);
  if(!show){powerHud.textContent='';return;}
  senseBtn.textContent=G.player.senseCD>0?Math.ceil(G.player.senseCD):'SENSE';rushBtn.textContent=G.player.rushCD>0?Math.ceil(G.player.rushCD):'RUSH';
  senseBtn.classList.toggle('ready',G.player.senseCD<=0);rushBtn.classList.toggle('ready',G.player.rushCD<=0);
  powerHud.textContent=`Q ECOS · ${cd(G.player.senseCD||0)}   |   R PASSO · ${cd(G.player.rushCD||0)}`;
}
senseBtn?.addEventListener('pointerdown',e=>{e.preventDefault();if(S.running&&S.role==='monster')G.useSense();});
rushBtn?.addEventListener('pointerdown',e=>{e.preventDefault();if(S.running&&S.role==='monster')G.useRush();});
addEventListener('keydown',e=>{
  if(!S.running||S.role!=='monster'||e.repeat)return;
  if(e.code==='KeyQ')G.useSense();if(e.code==='KeyR')G.useRush();
});

const baseRender=G.render;
G.render=()=>{
  baseRender();if(!S.running)return;const ctx=G.ctx,cx=G.state.camera.x,cy=G.state.camera.y;
  if(S.role==='monster'){
    for(const e of G.player.senseEchoes||[]){
      const x=Math.round(e.x-cx),y=Math.round(e.y-cy),t=clamp(e.ttl/1.35,0,1),r=9+(1-t)*22;
      ctx.strokeStyle=`rgba(176,82,74,${.18+.5*t})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle=`rgba(218,155,143,${.3+.5*t})`;ctx.fillRect(x-1,y-1,3,3);
    }
    if((G.player.rushTime||0)>0){ctx.strokeStyle='rgba(126,45,42,.28)';ctx.lineWidth=5;ctx.strokeRect(3,3,G.W-6,G.H-6);}
    if((G.player.senseTime||0)>0){ctx.strokeStyle='rgba(174,150,112,.16)';ctx.lineWidth=2;ctx.strokeRect(8,8,G.W-16,G.H-16);}
  }
};
updateHud();
})();
