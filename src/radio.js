'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
const style=document.createElement('style');style.textContent=`
#radioFeed{position:absolute;z-index:16;left:16px;top:86px;width:min(260px,43vw);pointer-events:none;display:flex;flex-direction:column;gap:5px}
.radio-msg{background:rgba(4,7,7,.78);border-left:2px solid #758279;padding:5px 7px;font:8px ui-monospace,monospace;letter-spacing:.06em;color:#c7cec8;box-shadow:0 4px 16px rgba(0,0,0,.25)}
.radio-msg b{color:#d7c88e;margin-right:5px}.radio-msg small{color:#79837d;margin-left:5px}
#radioToggle{position:absolute;z-index:17;left:16px;top:58px;pointer-events:auto;border:1px solid rgba(255,255,255,.12);background:rgba(6,9,9,.78);color:#c8cfca;padding:6px 9px;font:8px ui-monospace,monospace;letter-spacing:.1em}
#radioPanel{position:absolute;z-index:26;left:50%;bottom:20px;transform:translateX(-50%);width:min(560px,92vw);padding:10px;background:rgba(5,8,8,.96);border:1px solid #343c39;box-shadow:0 15px 45px #000;display:none;pointer-events:auto}
#radioPanel.open{display:block}.radio-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font:9px ui-monospace,monospace;letter-spacing:.15em;color:#d0d4ce}.radio-title span{color:#8e987f}
.radio-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.radio-call{border:1px solid #343b38;background:#101514;color:#bfc6c0;padding:8px 5px;font:8px ui-monospace,monospace;letter-spacing:.05em;min-height:36px}.radio-call:active{background:#1a2320}
@media(max-width:700px){#radioFeed{top:72px;left:10px;width:48vw}.radio-grid{grid-template-columns:repeat(2,1fr)}#radioToggle{top:45px;left:10px;padding:5px 7px}}
`;
document.head.appendChild(style);
const feed=document.createElement('div');feed.id='radioFeed';document.getElementById('app').appendChild(feed);
const toggle=document.createElement('button');toggle.id='radioToggle';toggle.textContent='RADIO [T]';document.getElementById('app').appendChild(toggle);
const panel=document.createElement('div');panel.id='radioPanel';panel.innerHTML=`<div class="radio-title"><b>WALKIE-TALKIE // CANAL 01</b><span>T PARA FECHAR</span></div><div class="radio-grid"></div>`;document.getElementById('app').appendChild(panel);
const grid=panel.querySelector('.radio-grid');
const calls=[
  {id:'killer',label:'KILLER AQUI!',text:'KILLER AQUI'},
  {id:'left',label:'KILLER SAIU',text:'KILLER SAIU DAQUI'},
  {id:'help',label:'PRECISO DE AJUDA',text:'PRECISO DE AJUDA'},
  {id:'objective',label:'VOU PRO OBJETIVO',text:'VOU PRO OBJETIVO'},
  {id:'item',label:'ITEM AQUI',text:'ITEM AQUI'},
  {id:'run',label:'CORRE!',text:'CORRE!'},
  {id:'door',label:'PORTA FECHADA',text:'PORTA FECHADA'},
  {id:'clear',label:'ÁREA LIMPA',text:'ÁREA LIMPA POR ENQUANTO'}
];
for(const c of calls){const b=document.createElement('button');b.className='radio-call';b.textContent=c.label;b.addEventListener('click',()=>sendPlayer(c));grid.appendChild(b);}
function zoneName(actor){return G.zoneAt(actor.x,actor.y)?.name||'SETOR DESCONHECIDO';}
function push(sender,text,zone,ttl=5.4){
  if(S.role!=='survivor')return;
  const el=document.createElement('div');el.className='radio-msg';el.innerHTML=`<b>${sender}</b>${text}<small>${zone||''}</small>`;feed.prepend(el);
  while(feed.children.length>4)feed.lastElementChild.remove();
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .35s';setTimeout(()=>el.remove(),360);},ttl*1000);
  document.dispatchEvent(new CustomEvent('misplaced-radio',{detail:{sender,text}}));
}
function killerActor(){return S.role==='monster'?G.player:G.bots.find(b=>b.alive&&b.role==='monster');}
function shareIntel(sender,kind){
  const board=G.aiBlackboard;if(!board)return;
  const z=G.zoneAt(sender.x,sender.y);if(!z)return;
  if(kind==='killer'){
    const k=killerActor();let x=z.x+z.w/2,y=z.y+z.h/2;
    if(k&&G.zoneAt(k.x,k.y)?.id===z.id){x=k.x;y=k.y;}
    board.killerIntel={x,y,zone:z.id,radio:true};board.killerIntelAge=0;
  }else if(kind==='left'&&board.killerIntel?.zone===z.id){board.killerIntelAge=Math.max(board.killerIntelAge,2.7);}
}
function sendPlayer(c){
  if(!S.running||S.role!=='survivor')return;
  const z=zoneName(G.player),suffix=(c.id==='killer'||c.id==='item'||c.id==='door')?` — ${z}`:'';
  push('VOCÊ',c.text+suffix,z);shareIntel(G.player,c.id);panel.classList.remove('open');
}
function togglePanel(){if(!S.running||S.role!=='survivor')return;panel.classList.toggle('open');}
toggle.addEventListener('click',togglePanel);addEventListener('keydown',e=>{if(e.code==='KeyT'&&!e.repeat)togglePanel();});

const states=new WeakMap();
function stateFor(b){if(!states.has(b))states.set(b,{cd:1+Math.random()*2,lastThreat:false,help:false,lastZone:null});return states.get(b);}
function botRadio(b,dt,k){
  const st=stateFor(b);st.cd=Math.max(0,st.cd-dt);if(st.cd>0)return;
  const z=G.zoneAt(b.x,b.y),threat=Math.max(b.brain?.threat||0,b.threatMemory||0),d=k?G.distance(b,k):999,same=!!z&&G.zoneAt(k?.x,k?.y)?.id===z.id;
  const nowThreat=threat>.38||(same&&d<205);
  if(nowThreat&&!st.lastThreat){
    const msg=d<92?'CORRE! KILLER COLADO!':`KILLER EM ${z?.name||'ALGUM SETOR'}`;if(S.role==='survivor')push(b.name.toUpperCase(),msg,z?.name);shareIntel(b,'killer');st.cd=4.2+Math.random()*2;
  }else if(!nowThreat&&st.lastThreat&&threat<.12){if(S.role==='survivor')push(b.name.toUpperCase(),'PERDI O KILLER',z?.name);shareIntel(b,'left');st.cd=5+Math.random()*3;}
  else if(b.health===1&&!st.help&&threat<.28){if(S.role==='survivor')push(b.name.toUpperCase(),'TÔ FERIDO, PRECISO DE AJUDA',z?.name);st.help=true;st.cd=7;}
  else if(b.inventory&&Math.random()<.18){const names={flash:'FLASH',adrenaline:'ADRENALINA',battery:'BATERIA',decoy:'ISCA'};if(S.role==='survivor')push(b.name.toUpperCase(),`PEGUEI ${names[b.inventory]||'UM ITEM'}`,z?.name);st.cd=7+Math.random()*4;}
  else st.cd=1.4+Math.random()*2.3;
  st.lastThreat=nowThreat;st.lastZone=z?.id||st.lastZone;
}
const baseUpdate=G.updateBots;
G.updateBots=dt=>{
  baseUpdate(dt);
  const k=killerActor();for(const b of G.bots)if(b.alive&&b.role==='survivor')botRadio(b,dt,k);
  const show=S.running&&S.role==='survivor';toggle.style.display=show?'block':'none';if(!show){panel.classList.remove('open');feed.innerHTML='';}
};
toggle.style.display='none';
})();
