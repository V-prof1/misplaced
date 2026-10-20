(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false });
ctx.imageSmoothingEnabled = false;

const darknessCanvas = document.createElement('canvas');
darknessCanvas.width = 640;
darknessCanvas.height = 360;
const dctx = darknessCanvas.getContext('2d', { alpha:true });
dctx.imageSmoothingEnabled = false;

const W=640,H=360,WORLD_W=1280,WORLD_H=800,TILE=32;
const menu=document.getElementById('menu');
const resultPanel=document.getElementById('result');
const resultTitle=document.getElementById('resultTitle');
const resultText=document.getElementById('resultText');
const hud=document.getElementById('hud');
const roleLabel=document.getElementById('roleLabel');
const zoneLabel=document.getElementById('zoneLabel');
const objectiveText=document.getElementById('objectiveText');
const objectiveCount=document.getElementById('objectiveCount');
const staminaFill=document.querySelector('#staminaBar i');
const statusWrap=document.getElementById('statusWrap');
const statusValue=document.getElementById('statusValue');
const hint=document.getElementById('hint');
const toast=document.getElementById('toast');
const damageFlash=document.getElementById('damageFlash');
const mobileControls=document.getElementById('mobileControls');
const menuBtn=document.getElementById('menuBtn');
const actionBtn=document.getElementById('actionBtn');
const attackBtn=document.getElementById('attackBtn');

const keys=new Set();
const input={x:0,y:0,sprint:false,action:false,attack:false};
let running=false,selectedRole='survivor',last=performance.now(),time=0,shake=0,roundEnded=false;
let touchActive=false,sprintHeld=false;
const camera={x:0,y:0};

const zones=[
  {id:'medical',name:'ALA MÉDICA',x:64,y:64,w:448,h:256,tint:'#18201f'},
  {id:'storage',name:'DEPÓSITO',x:64,y:416,w:448,h:320,tint:'#1d1c18'},
  {id:'corridor',name:'CORREDOR CENTRAL',x:512,y:64,w:192,h:672,tint:'#171b1a'},
  {id:'lab',name:'LABORATÓRIO',x:704,y:64,w:512,h:288,tint:'#171d20'},
  {id:'containment',name:'CONTENÇÃO',x:704,y:416,w:512,h:320,tint:'#211918'}
];

const doors=[
  {id:'d_med',x:506,y:176,w:12,h:64,open:false,zones:['medical','corridor']},
  {id:'d_lab',x:698,y:176,w:12,h:64,open:true,zones:['lab','corridor']},
  {id:'d_store',x:506,y:544,w:12,h:64,open:true,zones:['storage','corridor']},
  {id:'d_cont',x:698,y:544,w:12,h:64,open:false,zones:['containment','corridor']}
];
const crawlGap={x:506,y:456,w:16,h:40,zones:['storage','corridor']};
const connectors=[
  {a:'medical',b:'corridor',x:512,y:208,doorId:'d_med'},
  {a:'lab',b:'corridor',x:704,y:208,doorId:'d_lab'},
  {a:'storage',b:'corridor',x:512,y:576,doorId:'d_store'},
  {a:'containment',b:'corridor',x:704,y:576,doorId:'d_cont'},
  {a:'storage',b:'corridor',x:512,y:476,gap:true}
];

const wallRects=[];
function addWall(x,y,w,h){wallRects.push({x,y,w,h});}
function buildWalls(){
  wallRects.length=0;
  addWall(48,48,480,16);addWall(48,320,480,16);addWall(48,48,16,288);
  addWall(512,48,16,128);addWall(512,240,16,96);
  addWall(48,400,480,16);addWall(48,736,480,16);addWall(48,400,16,352);
  addWall(512,400,16,56);addWall(512,496,16,48);addWall(512,608,16,144);
  addWall(688,48,544,16);addWall(688,352,544,16);addWall(1216,48,16,320);
  addWall(688,48,16,128);addWall(688,240,16,128);
  addWall(688,400,544,16);addWall(688,736,544,16);addWall(1216,400,16,352);
  addWall(688,400,16,144);addWall(688,608,16,144);
  addWall(512,48,192,16);addWall(512,736,192,16);
}
buildWalls();

const props=[
  {type:'bed',x:112,y:112,w:96,h:38},{type:'bed',x:112,y:214,w:96,h:38},{type:'stool',x:225,y:126,w:24,h:24},
  {type:'cabinet',x:300,y:92,w:38,h:70},{type:'cabinet',x:354,y:92,w:38,h:70},{type:'blood',x:306,y:238,w:62,h:28},{type:'lamp',x:256,y:154,w:12,h:12},
  {type:'crate',x:98,y:462,w:48,h:48},{type:'crate',x:154,y:478,w:48,h:48},{type:'crate',x:110,y:534,w:64,h:64},{type:'crate',x:214,y:650,w:48,h:48},
  {type:'locker',x:306,y:444,w:42,h:88},{type:'locker',x:356,y:444,w:42,h:88},{type:'barrel',x:304,y:620,w:30,h:30},{type:'barrel',x:344,y:620,w:30,h:30},
  {type:'desk',x:780,y:104,w:126,h:48},{type:'desk',x:974,y:104,w:126,h:48},{type:'tank',x:790,y:232,w:42,h:72},{type:'tank',x:860,y:232,w:42,h:72},{type:'blood',x:1032,y:242,w:70,h:22},
  {type:'cell',x:770,y:466,w:148,h:100},{type:'cell',x:970,y:466,w:148,h:100},{type:'chair',x:826,y:630,w:36,h:36},{type:'blood',x:1000,y:640,w:80,h:30},
  {type:'pipe',x:552,y:96,w:112,h:10},{type:'pipe',x:552,y:686,w:112,h:10},{type:'sign',x:565,y:364,w:86,h:28},
  {type:'vent',x:580,y:274,w:48,h:22},{type:'vent',x:580,y:470,w:48,h:22}
];
const staticColliders=props.filter(p=>!['blood','lamp','pipe','sign','vent'].includes(p.type)).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}));

const powerCells=[
  {id:'pc1',x:420,y:260,zone:'medical',collected:false},
  {id:'pc2',x:250,y:690,zone:'storage',collected:false},
  {id:'pc3',x:1110,y:300,zone:'lab',collected:false}
];
const extraction={x:610,y:102,r:26};

const player={x:610,y:360,r:10,speed:92,runSpeed:142,stamina:100,maxStamina:100,dirX:0,dirY:1,anim:0,role:'survivor',zone:'corridor',health:2,invuln:0,attackCooldown:0,kills:0,cells:0,noise:0};
const bots=[];

function zoneAt(x,y){return zones.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)||null;}
function zoneById(id){return zones.find(z=>z.id===id);}
function doorById(id){return doors.find(d=>d.id===id);}
function rectCircle(rect,x,y,r){const nx=Math.max(rect.x,Math.min(x,rect.x+rect.w)),ny=Math.max(rect.y,Math.min(y,rect.y+rect.h)),dx=x-nx,dy=y-ny;return dx*dx+dy*dy<r*r;}
function isBlocked(x,y,r){
  for(const w of wallRects)if(rectCircle(w,x,y,r))return true;
  for(const d of doors)if(!d.open&&rectCircle(d,x,y,r))return true;
  for(const c of staticColliders)if(rectCircle(c,x,y,r))return true;
  return x<20||y<20||x>WORLD_W-20||y>WORLD_H-20;
}
function moveEntity(e,dx,dy){const nx=e.x+dx;if(!isBlocked(nx,e.y,e.r))e.x=nx;const ny=e.y+dy;if(!isBlocked(e.x,ny,e.r))e.y=ny;}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}

function resetDoors(){doors.forEach((d,i)=>d.open=i===1||i===2);}
function resetCells(){powerCells.forEach(c=>c.collected=false);}
function makeBot(role,x,y,name){return{role,x,y,r:10,dirX:0,dirY:1,anim:Math.random()*4,name,targetX:x,targetY:y,targetZone:zoneAt(x,y)?.id||'corridor',think:0,zone:zoneAt(x,y)?.id||'corridor',health:2,alive:true,injured:false,attackCooldown:0,memory:null,memoryTime:0};}
function spawnBots(){
  bots.length=0;
  if(selectedRole==='survivor'){
    bots.push(makeBot('monster',1040,560,'The Misplaced'));
    bots.push(makeBot('survivor',190,160,'Mara'));
    bots.push(makeBot('survivor',260,650,'Eli'));
    bots.push(makeBot('survivor',1060,170,'Nox'));
  }else{
    bots.push(makeBot('survivor',170,140,'Mara'));
    bots.push(makeBot('survivor',260,640,'Eli'));
    bots.push(makeBot('survivor',1040,150,'Nox'));
    bots.push(makeBot('survivor',1050,640,'Iris'));
  }
}

function fitCanvas(){const aspect=W/H;let w=innerWidth,h=innerHeight;if(w/h>aspect)w=h*aspect;else h=w/aspect;canvas.style.width=`${Math.floor(w)}px`;canvas.style.height=`${Math.floor(h)}px`;}
addEventListener('resize',fitCanvas);fitCanvas();

async function tryLandscape(){
  if(!matchMedia('(pointer:coarse)').matches)return;
  try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)await document.documentElement.requestFullscreen();}catch{}
  try{if(screen.orientation?.lock)await screen.orientation.lock('landscape');}catch{}
}

function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1100);}
function flashDamage(){damageFlash.classList.add('show');clearTimeout(flashDamage.t);flashDamage.t=setTimeout(()=>damageFlash.classList.remove('show'),120);}

function startGame(role){
  selectedRole=role;roundEnded=false;player.role=role;player.stamina=100;player.health=2;player.invuln=0;player.attackCooldown=0;player.kills=0;player.cells=0;player.noise=0;
  if(role==='monster'){player.x=610;player.y=660;player.speed=102;player.runSpeed=150;}else{player.x=610;player.y=360;player.speed=92;player.runSpeed=142;}
  resetDoors();resetCells();spawnBots();
  menu.classList.remove('visible');resultPanel.classList.remove('visible');hud.classList.remove('hidden');
  mobileControls.classList.toggle('hidden',matchMedia('(pointer:fine)').matches);
  attackBtn.classList.toggle('hidden',role!=='monster');
  roleLabel.textContent=role==='monster'?'THE MISPLACED':'SOBREVIVENTE';
  objectiveText.textContent=role==='monster'?'ELIMINE OS SOBREVIVENTES':'ENCONTRE AS CÉLULAS';
  updateObjectiveHud();updateStatusHud();
  running=true;last=performance.now();tryLandscape();
}
function backToMenu(){running=false;roundEnded=false;menu.classList.add('visible');resultPanel.classList.remove('visible');hud.classList.add('hidden');mobileControls.classList.add('hidden');}
function finishRound(win,title,text){if(roundEnded)return;roundEnded=true;running=false;resultTitle.textContent=title;resultText.textContent=text;resultTitle.style.color=win?'#d8ddd2':'#b96861';resultPanel.classList.add('visible');mobileControls.classList.add('hidden');}

function updateObjectiveHud(){
  if(selectedRole==='monster'){const alive=bots.filter(b=>b.role==='survivor'&&b.alive).length;objectiveCount.textContent=`${4-alive} / 4`;}
  else{objectiveCount.textContent=`${player.cells} / 3`;objectiveText.textContent=player.cells<3?'ENCONTRE AS CÉLULAS':'VÁ PARA A EXTRAÇÃO';}
}
function updateStatusHud(){
  if(selectedRole==='monster'){statusValue.textContent=player.attackCooldown>0?'RECUPERANDO':'CAÇANDO';statusWrap.classList.toggle('danger',false);return;}
  statusValue.textContent=player.health===2?'ESTÁVEL':player.health===1?'FERIDO':'MORTO';statusWrap.classList.toggle('danger',player.health<2);
}

document.querySelectorAll('.role-card').forEach(b=>b.addEventListener('click',()=>startGame(b.dataset.role)));
menuBtn.addEventListener('click',backToMenu);document.getElementById('resultMenuBtn').addEventListener('click',backToMenu);document.getElementById('retryBtn').addEventListener('click',()=>startGame(selectedRole));

addEventListener('keydown',e=>{keys.add(e.code);if(e.code==='KeyE')input.action=true;if((e.code==='KeyF'||e.code==='Space')&&selectedRole==='monster')input.attack=true;if(e.code==='Escape'&&running)backToMenu();});
addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('pointerdown',e=>{if(running&&selectedRole==='monster'&&e.pointerType==='mouse')input.attack=true;});

const joystick=document.getElementById('joystick'),stick=joystick.querySelector('.stick');let joyId=null;
function joyMove(clientX,clientY){const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=clientX-cx,dy=clientY-cy,m=Math.hypot(dx,dy),max=39;if(m>max){dx=dx/m*max;dy=dy/m*max;}stick.style.transform=`translate(${dx}px,${dy}px)`;input.x=dx/max;input.y=dy/max;const l=Math.hypot(input.x,input.y);if(l>1){input.x/=l;input.y/=l;}}
joystick.addEventListener('pointerdown',e=>{joyId=e.pointerId;touchActive=true;joystick.setPointerCapture(e.pointerId);joyMove(e.clientX,e.clientY)});joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e.clientX,e.clientY)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;touchActive=false;input.x=0;input.y=0;stick.style.transform='';}
joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
const sprintBtn=document.getElementById('sprintBtn');sprintBtn.addEventListener('pointerdown',e=>{sprintHeld=true;sprintBtn.setPointerCapture(e.pointerId)});sprintBtn.addEventListener('pointerup',()=>sprintHeld=false);sprintBtn.addEventListener('pointercancel',()=>sprintHeld=false);actionBtn.addEventListener('pointerdown',()=>input.action=true);attackBtn.addEventListener('pointerdown',()=>input.attack=true);

function updateKeyboard(){let x=0,y=0;if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;if(keys.has('KeyD')||keys.has('ArrowRight'))x++;if(keys.has('KeyW')||keys.has('ArrowUp'))y--;if(keys.has('KeyS')||keys.has('ArrowDown'))y++;if(x||y){const l=Math.hypot(x,y);x/=l;y/=l;}if(!touchActive){input.x=x;input.y=y;}input.sprint=keys.has('ShiftLeft')||keys.has('ShiftRight')||sprintHeld;}

function nearDoor(e,range=50){let best=null,bd=999;for(const d of doors){const cx=d.x+d.w/2,cy=d.y+d.h/2,dist=Math.hypot(e.x-cx,e.y-cy);if(dist<range&&dist<bd){best=d;bd=dist;}}return best;}
function nearCell(){let best=null,bd=999;for(const c of powerCells){if(c.collected)continue;const dist=Math.hypot(player.x-c.x,player.y-c.y);if(dist<38&&dist<bd){best=c;bd=dist;}}return best;}
function nearExtraction(){return Math.hypot(player.x-extraction.x,player.y-extraction.y)<42;}
function interact(){
  if(selectedRole==='survivor'){
    const c=nearCell();if(c){c.collected=true;player.cells++;showToast('CÉLULA DE ENERGIA RECUPERADA');shake=1.4;updateObjectiveHud();return;}
    if(player.cells===3&&nearExtraction()){finishRound(true,'VOCÊ ESCAPOU','A energia de emergência respondeu. Você deixou Blackridge antes que a instalação fechasse sobre você.');return;}
  }
  const d=nearDoor(player);if(d){d.open=!d.open;player.noise=1;shake=1.4;showToast(d.open?'PORTA ABERTA':'PORTA FECHADA');}
}

function monsterAttack(attacker,isPlayer){
  if(attacker.attackCooldown>0)return;attacker.attackCooldown=.72;shake=isPlayer?2.2:1.4;
  const targets=isPlayer?bots.filter(b=>b.role==='survivor'&&b.alive):[player];
  let victim=null,bd=999;
  for(const t of targets){if(t.health<=0)continue;const dist=distance(attacker,t);if(dist<42&&dist<bd&&zoneAt(attacker.x,attacker.y)?.id===zoneAt(t.x,t.y)?.id){victim=t;bd=dist;}}
  if(!victim)return;
  if(victim===player){if(player.invuln>0)return;player.health--;player.invuln=1.05;flashDamage();showToast(player.health>0?'VOCÊ FOI FERIDO':'VOCÊ CAIU');updateStatusHud();if(player.health<=0)finishRound(false,'VOCÊ NÃO SAIU','The Misplaced alcançou você antes que Blackridge pudesse ser reativada.');}
  else{victim.health--;victim.injured=victim.health===1;if(victim.health<=0){victim.alive=false;attacker.kills++;showToast(`${victim.name.toUpperCase()} ELIMINADO`);updateObjectiveHud();if(bots.filter(b=>b.role==='survivor'&&b.alive).length===0)finishRound(true,'NENHUMA TESTEMUNHA','Blackridge voltou ao silêncio. Nenhum sobrevivente deixou a instalação.');}else showToast(`${victim.name.toUpperCase()} FERIDO`);}
}

function updatePlayer(dt){
  updateKeyboard();player.invuln=Math.max(0,player.invuln-dt);player.attackCooldown=Math.max(0,player.attackCooldown-dt);player.noise=Math.max(0,player.noise-dt*.8);
  const moving=Math.hypot(input.x,input.y)>.1;const sprinting=input.sprint&&moving&&player.stamina>.5;let speed=sprinting?player.runSpeed:player.speed;if(selectedRole==='survivor'&&player.health===1)speed*=.9;
  if(sprinting){player.stamina=Math.max(0,player.stamina-(selectedRole==='monster'?22:32)*dt);player.noise=Math.max(player.noise,.8);}else player.stamina=Math.min(player.maxStamina,player.stamina+18*dt);
  if(moving){player.dirX=input.x;player.dirY=input.y;player.anim+=dt*(sprinting?9:5.5);moveEntity(player,input.x*speed*dt,input.y*speed*dt);}else player.anim+=dt*.65;
  if(input.action){interact();input.action=false;}if(input.attack){if(selectedRole==='monster')monsterAttack(player,true);input.attack=false;}
  const z=zoneAt(player.x,player.y);if(z){player.zone=z.id;zoneLabel.textContent=z.name;}
  staminaFill.style.width=`${player.stamina}%`;updateStatusHud();
  let text='';if(selectedRole==='survivor'){const c=nearCell();if(c)text='[E] PEGAR CÉLULA';else if(player.cells===3&&nearExtraction())text='[E] EXTRAIR';}
  if(!text){const d=nearDoor(player);if(d)text='[E] '+(d.open?'FECHAR PORTA':'ABRIR PORTA');}
  hint.textContent=text;hint.classList.toggle('show',!!text);
}

function connectorFor(from,to){return connectors.find(c=>(c.a===from&&c.b===to)||(c.a===to&&c.b===from))||null;}
function nextZoneStep(from,target){if(from===target)return target;if(from!=='corridor'&&target!=='corridor')return'corridor';return target;}
function routeTarget(e,targetX,targetY,targetZone){
  const current=zoneAt(e.x,e.y)?.id||e.zone||'corridor';if(current===targetZone)return{x:targetX,y:targetY};
  const next=nextZoneStep(current,targetZone),con=connectorFor(current,next);if(!con)return{x:targetX,y:targetY};
  const d=con.doorId?doorById(con.doorId):null;if(d&&!d.open&&Math.hypot(e.x-con.x,e.y-con.y)<42)d.open=true;
  return{x:con.x,y:con.y};
}
function randomPointInZone(id){const z=zoneById(id)||zones[2];return{x:z.x+42+Math.random()*(z.w-84),y:z.y+42+Math.random()*(z.h-84)};}
function pickWanderTarget(bot){const z=zones[Math.floor(Math.random()*zones.length)],p=randomPointInZone(z.id);bot.targetX=p.x;bot.targetY=p.y;bot.targetZone=z.id;}
function canSee(a,b){const za=zoneAt(a.x,a.y),zb=zoneAt(b.x,b.y);return!!za&&!!zb&&za.id===zb.id&&distance(a,b)<260;}
function canHearMonsterTarget(monster,target){if(target!==player)return false;return player.noise>0&&distance(monster,target)<340;}

function updateBots(dt){
  for(const b of bots){if(!b.alive)continue;b.think-=dt;b.attackCooldown=Math.max(0,b.attackCooldown-dt);b.anim+=dt*(b.injured?3.7:4.8);b.zone=zoneAt(b.x,b.y)?.id||b.zone;b.memoryTime=Math.max(0,b.memoryTime-dt);
    let goal={x:b.targetX,y:b.targetY,zone:b.targetZone};
    if(b.role==='monster'){
      const candidates=selectedRole==='survivor'?[player]:bots.filter(x=>x.role==='survivor'&&x.alive);let target=null,bd=1e9;for(const t of candidates){const d=distance(b,t);if(d<bd&&(canSee(b,t)||canHearMonsterTarget(b,t))){target=t;bd=d;}}
      if(target){const z=zoneAt(target.x,target.y);b.memory={x:target.x,y:target.y,zone:z?.id||b.zone};b.memoryTime=2.8;goal={...b.memory};if(distance(b,target)<43)monsterAttack(b,false);}
      else if(b.memory&&b.memoryTime>0)goal={...b.memory};
      else if(b.think<=0){pickWanderTarget(b);goal={x:b.targetX,y:b.targetY,zone:b.targetZone};b.think=1.4+Math.random()*1.8;}
    }else{
      const monster=selectedRole==='monster'?player:bots.find(x=>x.role==='monster'&&x.alive);
      if(monster&&canSee(b,monster)){
        const z=zoneAt(b.x,b.y)||zones[2],dx=b.x-monster.x,dy=b.y-monster.y,l=Math.hypot(dx,dy)||1;goal={x:Math.max(z.x+28,Math.min(z.x+z.w-28,b.x+dx/l*190)),y:Math.max(z.y+28,Math.min(z.y+z.h-28,b.y+dy/l*190)),zone:z.id};b.think=.45;
      }else if(b.think<=0){pickWanderTarget(b);goal={x:b.targetX,y:b.targetY,zone:b.targetZone};b.think=.9+Math.random()*2.1;}
    }
    const routed=routeTarget(b,goal.x,goal.y,goal.zone||b.zone);let dx=routed.x-b.x,dy=routed.y-b.y,l=Math.hypot(dx,dy);if(l>5){dx/=l;dy/=l;b.dirX=dx;b.dirY=dy;let sp=b.role==='monster'?78:(b.injured?58:66);moveEntity(b,dx*sp*dt,dy*sp*dt);}else b.think=0;
  }
}

function updateCamera(dt){const tx=player.x-W/2,ty=player.y-H/2,s=1-Math.pow(.0008,dt);camera.x+=(tx-camera.x)*s;camera.y+=(ty-camera.y)*s;camera.x=Math.max(0,Math.min(WORLD_W-W,camera.x));camera.y=Math.max(0,Math.min(WORLD_H-H,camera.y));}
function px(x){return Math.round(x-camera.x)}function py(y){return Math.round(y-camera.y)}

function drawFloor(z){
  const sx=px(z.x),sy=py(z.y);ctx.fillStyle=z.tint;ctx.fillRect(sx,sy,z.w,z.h);ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;
  for(let x=z.x;x<z.x+z.w;x+=TILE){ctx.beginPath();ctx.moveTo(px(x),sy);ctx.lineTo(px(x),sy+z.h);ctx.stroke();}
  for(let y=z.y;y<z.y+z.h;y+=TILE){ctx.beginPath();ctx.moveTo(sx,py(y));ctx.lineTo(sx+z.w,py(y));ctx.stroke();}
  for(let i=0;i<24;i++){const hx=(z.x*13+z.y*7+i*71)%(z.w-20)+10,hy=(z.y*11+z.x*3+i*47)%(z.h-20)+10;ctx.fillStyle=i%3===0?'rgba(0,0,0,.12)':'rgba(255,255,255,.018)';ctx.fillRect(px(z.x+hx),py(z.y+hy),2+(i%3),1+(i%2));}
  ctx.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<5;i++){const cx=px(z.x+30+((i*101+z.x)%Math.max(40,z.w-60))),cy=py(z.y+24+((i*67+z.y)%Math.max(40,z.h-48)));ctx.fillRect(cx,cy,18+i*3,1);ctx.fillRect(cx+6,cy-2,1,5);}
}

function drawProp(p){
  const x=px(p.x),y=py(p.y);
  switch(p.type){
    case'bed':ctx.fillStyle='#202626';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#5e655e';ctx.fillRect(x+6,y+6,p.w-12,p.h-12);ctx.fillStyle='#a8a795';ctx.fillRect(x+10,y+8,24,12);ctx.fillStyle='#303534';ctx.fillRect(x+4,y+p.h-3,5,6);ctx.fillRect(x+p.w-9,y+p.h-3,5,6);break;
    case'stool':ctx.fillStyle='#3b403d';ctx.fillRect(x+3,y,p.w-6,8);ctx.fillRect(x+6,y+8,3,p.h-8);ctx.fillRect(x+p.w-9,y+8,3,p.h-8);break;
    case'cabinet':ctx.fillStyle='#2f3937';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#111514';ctx.fillRect(x+4,y+4,p.w-8,p.h-8);ctx.strokeStyle='#58625f';ctx.strokeRect(x+6,y+6,p.w-12,p.h-12);ctx.fillStyle='#727b74';ctx.fillRect(x+p.w-10,y+34,2,6);break;
    case'crate':ctx.fillStyle='#3d3326';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#6c583e';ctx.strokeRect(x+3,y+3,p.w-6,p.h-6);ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+p.w-5,y+p.h-5);ctx.moveTo(x+p.w-5,y+5);ctx.lineTo(x+5,y+p.h-5);ctx.stroke();break;
    case'locker':ctx.fillStyle='#293231';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#131716';ctx.fillRect(x+4,y+4,p.w-8,p.h-8);ctx.fillStyle='#4d5653';for(let i=0;i<4;i++)ctx.fillRect(x+9,y+12+i*6,p.w-18,2);ctx.fillRect(x+p.w-9,y+45,2,8);break;
    case'barrel':ctx.fillStyle='#423a32';ctx.fillRect(x+3,y,p.w-6,p.h);ctx.fillStyle='#65584b';ctx.fillRect(x,y+5,p.w,4);ctx.fillRect(x,y+p.h-9,p.w,4);break;
    case'desk':ctx.fillStyle='#303737';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#141817';ctx.fillRect(x+5,y+8,p.w-10,p.h-12);ctx.fillStyle='#859087';ctx.fillRect(x+12,y+13,28,14);ctx.fillStyle='#59645e';ctx.fillRect(x+46,y+14,44,3);ctx.fillRect(x+46,y+21,30,3);break;
    case'tank':ctx.fillStyle='#2b3231';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#73857f';ctx.fillRect(x+6,y+8,p.w-12,p.h-17);ctx.fillStyle='rgba(151,188,176,.12)';ctx.fillRect(x+10,y+13,p.w-20,p.h-28);ctx.fillStyle='#0c1110';ctx.fillRect(x+3,y+p.h-9,p.w-6,6);break;
    case'cell':ctx.fillStyle='#0d1010';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#58605c';ctx.lineWidth=2;ctx.strokeRect(x,y,p.w,p.h);for(let i=12;i<p.w;i+=15)ctx.fillRect(x+i,y,2,p.h);ctx.fillStyle='#272b2a';ctx.fillRect(x+8,y+p.h-24,p.w-16,18);break;
    case'chair':ctx.fillStyle='#493c34';ctx.fillRect(x+7,y,p.w-14,20);ctx.fillRect(x,y+18,p.w,8);ctx.fillRect(x+5,y+24,5,12);ctx.fillRect(x+p.w-10,y+24,5,12);break;
    case'blood':ctx.fillStyle='rgba(91,28,28,.72)';ctx.fillRect(x+4,y+7,p.w-8,p.h-14);ctx.fillRect(x,y+11,7,7);ctx.fillRect(x+p.w-5,y+4,5,5);ctx.fillStyle='rgba(40,10,10,.65)';ctx.fillRect(x+13,y+2,8,4);break;
    case'pipe':ctx.fillStyle='#3d4441';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#727a75';ctx.fillRect(x,y,p.w,2);ctx.fillStyle='#242827';for(let i=16;i<p.w;i+=32)ctx.fillRect(x+i,y-3,5,p.h+6);break;
    case'sign':ctx.fillStyle='#252b29';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#4f5651';ctx.strokeRect(x+.5,y+.5,p.w-1,p.h-1);ctx.fillStyle='#a2a79d';ctx.font='7px monospace';ctx.fillText('B L A C K R I D G E',x+8,y+17);break;
    case'lamp':{const flick=.55+.45*Math.sin(time*6+p.x);ctx.fillStyle=`rgba(214,214,176,${.45+.35*flick})`;ctx.fillRect(x,y,p.w,p.h);break;}
    case'vent':ctx.fillStyle='#2b302e';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#151817';for(let i=5;i<p.w-3;i+=7)ctx.fillRect(x+i,y+4,2,p.h-8);break;
  }
}

function drawWalls(){for(const w of wallRects){const x=px(w.x),y=py(w.y);ctx.fillStyle='#252928';ctx.fillRect(x,y,w.w,w.h);ctx.fillStyle='#454a47';ctx.fillRect(x,y,w.w,3);ctx.fillStyle='#111313';ctx.fillRect(x,y+w.h-4,w.w,4);ctx.fillStyle='#626763';for(let bx=8;bx<w.w-4;bx+=28)ctx.fillRect(x+bx,y+5,2,2);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+3,y+3,2,Math.max(0,w.h-7));}const gx=px(crawlGap.x),gy=py(crawlGap.y);ctx.fillStyle='#050606';ctx.fillRect(gx-2,gy-2,20,44);ctx.fillStyle='#59605d';ctx.fillRect(gx-4,gy-3,3,46);ctx.fillRect(gx+18,gy-3,3,46);}
function drawDoors(){for(const d of doors){const x=px(d.x),y=py(d.y);if(d.open){ctx.fillStyle='#111514';ctx.fillRect(x,y,d.w,d.h);ctx.fillStyle='#4a514e';ctx.fillRect(x,y,4,d.h);ctx.fillStyle='#7c817a';ctx.fillRect(x+2,y+6,2,4);}else{ctx.fillStyle='#4a4f4d';ctx.fillRect(x,y,d.w,d.h);ctx.fillStyle='#1c201f';for(let yy=5;yy<d.h;yy+=9)ctx.fillRect(x+2,y+yy,d.w-4,3);ctx.fillStyle='#b0a67e';ctx.fillRect(x+2,y+d.h/2,3,3);}}}

function drawPowerCells(){for(const c of powerCells){if(c.collected)continue;const x=px(c.x),y=py(c.y),pulse=.5+.5*Math.sin(time*4+c.x);ctx.fillStyle='rgba(158,184,162,.08)';ctx.fillRect(x-13,y-13,26,26);ctx.fillStyle='#28342d';ctx.fillRect(x-6,y-10,12,20);ctx.fillStyle=`rgba(164,205,173,${.55+.4*pulse})`;ctx.fillRect(x-3,y-6,6,12);ctx.fillStyle='#859788';ctx.fillRect(x-8,y-8,2,16);ctx.fillRect(x+6,y-8,2,16);}}
function drawExtraction(){const x=px(extraction.x),y=py(extraction.y),ready=player.cells===3;ctx.strokeStyle=ready?'rgba(176,205,178,.65)':'rgba(90,98,94,.35)';ctx.strokeRect(x-22,y-13,44,26);ctx.fillStyle=ready?'rgba(139,180,148,.14)':'rgba(50,56,53,.12)';ctx.fillRect(x-20,y-11,40,22);ctx.fillStyle=ready?'#9fbaa4':'#59625d';ctx.fillRect(x-3,y-3,6,6);}

function drawSurvivor(e,isPlayer=false){const x=px(e.x),y=py(e.y),bob=Math.round(Math.sin(e.anim*Math.PI*2)*1);ctx.save();ctx.translate(x,y+bob);const left=e.dirX<-.25,right=e.dirX>.25,back=e.dirY<-.3,inj=e.health===1||e.injured;ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(-8,9,16,5);ctx.fillStyle=inj?'#342929':'#2a3033';ctx.fillRect(-6,4,5,9);ctx.fillRect(2,4,5,9);ctx.fillStyle=isPlayer?'#65756c':'#56645f';ctx.fillRect(-8,-8,16,14);ctx.fillStyle=inj?'#4b3534':'#303b37';ctx.fillRect(-7,-6,4,10);ctx.fillRect(3,-6,4,10);ctx.fillStyle='#9a8b73';ctx.fillRect(-2,-6,4,10);ctx.fillStyle='#596660';ctx.fillRect(-11,-6,4,11);ctx.fillRect(8,-6,4,11);ctx.fillStyle='#c4ad93';ctx.fillRect(-5,-16,10,9);ctx.fillStyle='#2a2420';ctx.fillRect(-6,-18,12,4);ctx.fillRect(-6,-15,3,4);if(!back){ctx.fillStyle='#171817';ctx.fillRect(left?-4:-3,-13,2,2);ctx.fillRect(right?2:1,-13,2,2);}if(inj){ctx.fillStyle='#702c2a';ctx.fillRect(5,-2,3,5);}if(isPlayer){ctx.strokeStyle='rgba(203,214,203,.22)';ctx.strokeRect(-10,-20,20,35);}ctx.restore();}
function drawMonster(e,isPlayer=false){const x=px(e.x),y=py(e.y),idle=Math.sin(e.anim*.7),twitch=Math.sin(time*13+e.x)>.985?2:0;ctx.save();ctx.translate(x,y+Math.round(idle));ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(-11,11,23,6);ctx.fillStyle='#242927';ctx.fillRect(-8,3,6,13);ctx.fillRect(3,2,6,14);ctx.fillStyle='#303634';ctx.fillRect(-10,-12,18,17);ctx.fillRect(-13,-10,6,10);ctx.fillStyle='#1c201f';ctx.fillRect(-6,-10,9,14);ctx.fillStyle='#272c2a';ctx.fillRect(8,-8,5,19);ctx.fillRect(9,8,6,9+twitch);ctx.fillStyle='#353a37';ctx.fillRect(-15,-11,5,14);ctx.fillStyle='#3a3e3b';ctx.fillRect(-2,-17,5,6);ctx.save();ctx.translate(2+twitch,-22);ctx.rotate(-.10-.015*idle);ctx.fillStyle='#b8b5a7';ctx.fillRect(-7,-6,13,11);ctx.fillStyle='#060707';ctx.fillRect(-4,-2,2,2);ctx.fillRect(2,-2,2,2);ctx.fillStyle='#777369';ctx.fillRect(3,2,1,4);ctx.restore();ctx.fillStyle='#1b1f1e';ctx.fillRect(11,16,1,4);ctx.fillRect(13,16,1,5);ctx.fillRect(15,15,1,4);if(isPlayer){ctx.strokeStyle='rgba(185,90,80,.26)';ctx.strokeRect(-17,-30,34,50);}ctx.restore();}
function drawEntities(){for(const b of bots){if(!b.alive)continue;if(b.role==='monster')drawMonster(b);else drawSurvivor(b);}if(player.role==='monster')drawMonster(player,true);else if(player.health>0)drawSurvivor(player,true);}

function drawAmbient(){
  const flick1=.65+.35*Math.sin(time*7.5),flick2=.55+.45*Math.sin(time*3.2+2);
  const lights=[{x:608,y:130,r:100,c:`rgba(176,190,166,${.045+.035*flick1})`},{x:608,y:610,r:110,c:`rgba(170,60,50,${.04+.055*flick2})`},{x:930,y:196,r:120,c:'rgba(135,165,164,.055)'}];
  for(const l of lights){const gx=px(l.x),gy=py(l.y),g=ctx.createRadialGradient(gx,gy,0,gx,gy,l.r);g.addColorStop(0,l.c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(gx-l.r,gy-l.r,l.r*2,l.r*2);}
  ctx.fillStyle='rgba(213,219,207,.11)';for(let i=0;i<30;i++){const wx=(i*83+time*(3+(i%4)))%WORLD_W,wy=(i*47+Math.sin(time*.3+i)*12+120)%WORLD_H;ctx.fillRect(px(wx),py(wy),1,1);}
}

function applyDarkness(){
  const z=zoneAt(player.x,player.y);dctx.setTransform(1,0,0,1,0,0);dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,W,H);dctx.fillStyle='#000';dctx.fillRect(0,0,W,H);
  if(z){dctx.save();dctx.globalCompositeOperation='destination-out';dctx.beginPath();dctx.rect(px(z.x),py(z.y),z.w,z.h);dctx.clip();const sx=px(player.x),sy=py(player.y),radius=z.id==='corridor'?220:330,g=dctx.createRadialGradient(sx,sy,24,sx,sy,radius);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.62,'rgba(0,0,0,1)');g.addColorStop(.84,'rgba(0,0,0,.68)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.fillRect(px(z.x),py(z.y),z.w,z.h);dctx.restore();}
  ctx.drawImage(darknessCanvas,0,0);
  if(z){ctx.save();ctx.globalCompositeOperation='screen';const sx=px(player.x),sy=py(player.y),g=ctx.createRadialGradient(sx,sy,0,sx,sy,52);g.addColorStop(0,player.role==='monster'?'rgba(110,40,34,.07)':'rgba(188,194,170,.075)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(sx-54,sy-54,108,108);ctx.restore();}
}

function render(){ctx.fillStyle='#030404';ctx.fillRect(0,0,W,H);ctx.save();if(shake>0){const s=shake*1.2;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);shake=Math.max(0,shake-.14);}for(const z of zones)drawFloor(z);drawAmbient();for(const p of props)drawProp(p);drawPowerCells();drawExtraction();drawWalls();drawDoors();drawEntities();applyDarkness();ctx.strokeStyle='rgba(255,255,255,.025)';ctx.strokeRect(.5,.5,W-1,H-1);ctx.restore();}
function renderMenuBackdrop(){camera.x+=(610-W/2-camera.x)*.02;camera.y+=(360-H/2-camera.y)*.02;ctx.fillStyle='#030404';ctx.fillRect(0,0,W,H);for(const z of zones)drawFloor(z);for(const p of props)drawProp(p);drawWalls();drawDoors();const fake={x:628,y:270,dirX:0,dirY:1,anim:time*.4,health:2};drawMonster(fake);ctx.fillStyle='rgba(0,0,0,.64)';ctx.fillRect(0,0,W,H);}
function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;time+=dt;if(running){updatePlayer(dt);updateBots(dt);updateCamera(dt);render();}else renderMenuBackdrop();requestAnimationFrame(loop);}requestAnimationFrame(loop);
})();
