'use strict';
(() => {
const G=window.MISPLACED;

const pallets=G.pallets=[
  {id:'p_med',type:'pallet',x:408,y:178,w:66,h:16,axis:'h',zone:'medical',state:'ready'},
  {id:'p_store',type:'pallet',x:402,y:584,w:68,h:16,axis:'h',zone:'storage',state:'ready'},
  {id:'p_lab',type:'pallet',x:934,y:176,w:16,h:72,axis:'v',zone:'lab',state:'ready'},
  {id:'p_cont',type:'pallet',x:902,y:600,w:72,h:16,axis:'h',zone:'containment',state:'ready'}
];
const vaults=G.vaults=[
  {id:'v_med',type:'vault',x:238,y:180,w:58,h:12,axis:'h',zone:'medical'},
  {id:'v_store',type:'vault',x:212,y:610,w:58,h:12,axis:'h',zone:'storage'},
  {id:'v_lab',type:'vault',x:1000,y:190,w:12,h:58,axis:'v',zone:'lab'},
  {id:'v_cont',type:'vault',x:902,y:650,w:62,h:12,axis:'h',zone:'containment'}
];
G.props.push(...pallets,...vaults);

function center(o){return{x:o.x+o.w/2,y:o.y+o.h/2};}
function distanceTo(actor,o){const c=center(o);return Math.hypot(actor.x-c.x,actor.y-c.y);}
function blockingPallet(p){return p.state==='down';}

const baseBlocked=G.isBlocked;
G.isBlocked=(x,y,r)=>{
  if(baseBlocked(x,y,r))return true;
  for(const v of vaults)if(G.rectCircle(v,x,y,r))return true;
  for(const p of pallets)if(blockingPallet(p)&&G.rectCircle(p,x,y,r))return true;
  return false;
};
const baseNavBlocked=G.isNavBlocked;
G.isNavBlocked=(x,y,r=10)=>{
  if(baseNavBlocked(x,y,r))return true;
  for(const v of vaults)if(G.rectCircle(v,x,y,r))return true;
  for(const p of pallets)if(blockingPallet(p)&&G.rectCircle(p,x,y,r))return true;
  return false;
};

const baseMove=G.move;
G.move=(e,dx,dy)=>{
  if((e?.stun||0)>0)return 0;
  return baseMove(e,dx,dy);
};

G.resetInteractables=()=>{
  for(const p of pallets)p.state='ready';
  for(const a of [G.player,...G.bots]){if(!a)continue;a.stun=0;a.mobilityCooldown=0;}
};

function vaultDestination(actor,o){
  const c=center(o),off=(o.axis==='h'?o.h/2:o.w/2)+(actor.r||10)+18;
  if(o.axis==='h'){
    const side=actor.y<c.y?-1:1;
    const x=Math.max(o.x+8,Math.min(o.x+o.w-8,actor.x));
    return{x,y:c.y-side*off};
  }
  const side=actor.x<c.x?-1:1;
  const y=Math.max(o.y+8,Math.min(o.y+o.h-8,actor.y));
  return{x:c.x-side*off,y};
}
function canLand(actor,o){
  const d=vaultDestination(actor,o);
  return !G.isBlocked(d.x,d.y,actor.r||10)?d:null;
}
function doVault(actor,o,quiet=false){
  if((actor.mobilityCooldown||0)>0||(actor.stun||0)>0)return false;
  const d=canLand(actor,o);if(!d)return false;
  actor.x=d.x;actor.y=d.y;
  actor.mobilityCooldown=actor.role==='monster'?.72:.48;
  actor.stun=Math.max(actor.stun||0,actor.role==='monster'?.34:.13);
  actor.noise=Math.max(actor.noise||0,actor.role==='monster'?.75:.48);
  if(actor.brain){actor.brain.path=[];actor.brain.pathTimer=0;actor.brain.actionLock=.12;}
  actor.path=[];actor.pathTimer=0;
  if(actor===G.player&&!quiet){G.state.shake=Math.max(G.state.shake,.65);G.showToast(actor.role==='monster'?'PASSAGEM FORÇADA':'VAULT');}
  return true;
}
function killerFor(){return G.state.role==='monster'?G.player:G.bots.find(b=>b.alive&&b.role==='monster');}
function stunKillerNear(p,actor){
  const k=killerFor();if(!k||k===actor)return;
  const c=center(p),d=Math.hypot(k.x-c.x,k.y-c.y);
  if(d<52){
    k.stun=Math.max(k.stun||0,1.02);k.attackCooldown=Math.max(k.attackCooldown||0,.55);
    G.cancelDoorAction?.(k);
    if(k===G.player){G.state.shake=Math.max(G.state.shake,3.2);G.showToast('ATORDOADO PELA BARREIRA');}
  }
}
function dropPallet(actor,p,quiet=false){
  if(p.state!=='ready'||actor.role==='monster')return false;
  p.state='down';actor.mobilityCooldown=.28;actor.noise=Math.max(actor.noise||0,1);
  stunKillerNear(p,actor);
  if(actor.brain){actor.brain.pathTimer=0;actor.brain.actionLock=.2;}
  if(actor===G.player&&!quiet){G.state.shake=Math.max(G.state.shake,1.8);G.showToast('BARREIRA DERRUBADA');}
  return true;
}
function breakPallet(actor,p,quiet=false){
  if(p.state!=='down'||actor.role!=='monster')return false;
  p.state='broken';actor.stun=Math.max(actor.stun||0,.58);actor.mobilityCooldown=.7;actor.noise=Math.max(actor.noise||0,1);
  if(actor.brain){actor.brain.path=[];actor.brain.pathTimer=0;actor.brain.actionLock=.35;}
  if(actor===G.player&&!quiet){G.state.shake=Math.max(G.state.shake,1.6);G.showToast('BARREIRA DESTRUÍDA');}
  return true;
}

function nearestContext(actor,range=42){
  let best=null,bd=range;
  for(const p of pallets){
    if(p.state==='broken')continue;
    const d=distanceTo(actor,p);if(d<bd){best=p;bd=d;}
  }
  for(const v of vaults){const d=distanceTo(actor,v);if(d<bd){best=v;bd=d;}}
  return best;
}
G.contextHint=actor=>{
  if(!actor||actor.doorAction||(actor.stun||0)>0)return '';
  const o=nearestContext(actor);if(!o)return '';
  if(o.type==='vault')return '[E] VAULT';
  if(o.state==='ready'&&actor.role!=='monster')return '[E] DERRUBAR BARREIRA';
  if(o.state==='down'&&actor.role==='monster')return '[E] QUEBRAR BARREIRA';
  if(o.state==='down'&&actor.role!=='monster')return '[E] VAULT BARREIRA';
  return '';
};
G.tryContextInteract=actor=>{
  const o=nearestContext(actor);if(!o)return false;
  if(o.type==='vault')return doVault(actor,o);
  if(o.state==='ready'&&actor.role!=='monster')return dropPallet(actor,o);
  if(o.state==='down'&&actor.role==='monster')return breakPallet(actor,o);
  if(o.state==='down'&&actor.role!=='monster')return doVault(actor,o);
  return false;
};

function nearby(list,actor,range){let best=null,bd=range;for(const o of list){if(o.state==='broken')continue;const d=distanceTo(actor,o);if(d<bd){best=o;bd=d;}}return best;}
function nearestSurvivor(monster){
  const pool=[];if(G.state.role==='survivor'&&G.player.health>0)pool.push(G.player);
  for(const b of G.bots)if(b.alive&&b.role==='survivor')pool.push(b);
  let best=null,bd=999;for(const s of pool){const d=G.distance(monster,s);if(d<bd){best=s;bd=d;}}return best;
}
function survivorTactics(b,killer){
  if(!killer||(b.stun||0)>0||(b.mobilityCooldown||0)>0)return;
  const kd=G.distance(b,killer);
  const p=nearby(pallets.filter(x=>x.state==='ready'),b,36);
  if(p&&kd<104){dropPallet(b,p,true);return;}
  if(kd<150){
    const options=[...vaults,...pallets.filter(x=>x.state==='down')];
    const o=nearby(options,b,32);if(o){
      const d=canLand(b,o);
      if(d&&Math.hypot(d.x-killer.x,d.y-killer.y)>kd+18)doVault(b,o,true);
    }
  }
}
function monsterTactics(m){
  if((m.stun||0)>0||(m.mobilityCooldown||0)>0)return;
  const p=nearby(pallets.filter(x=>x.state==='down'),m,34);
  if(p){breakPallet(m,p,true);return;}
  const t=nearestSurvivor(m);if(!t||G.distance(m,t)>150)return;
  const o=nearby(vaults,m,30);if(o){
    const d=canLand(m,o),cur=G.distance(m,t);
    if(d&&Math.hypot(d.x-t.x,d.y-t.y)<cur-18)doVault(m,o,true);
  }
}

const baseUpdateBots=G.updateBots;
G.updateBots=dt=>{
  for(const b of G.bots){if(!b.alive)continue;b.stun=Math.max(0,(b.stun||0)-dt);b.mobilityCooldown=Math.max(0,(b.mobilityCooldown||0)-dt);}
  baseUpdateBots(dt);
  const killer=killerFor();
  for(const b of G.bots)if(b.alive&&b.role==='survivor')survivorTactics(b,killer);
  const monster=G.bots.find(b=>b.alive&&b.role==='monster');if(monster)monsterTactics(monster);
};
})();
