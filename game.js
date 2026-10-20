(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

// Camada transparente separada para a escuridão/oclusão.
// Em alguns navegadores Android, destination-out não recorta corretamente
// quando usado diretamente em um canvas opaco (alpha:false).
const darknessCanvas = document.createElement('canvas');
darknessCanvas.width = 640;
darknessCanvas.height = 360;
const dctx = darknessCanvas.getContext('2d', { alpha: true });
dctx.imageSmoothingEnabled = false;

const W = 640, H = 360;
const WORLD_W = 1280, WORLD_H = 800;
const TILE = 32;

const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const roleLabel = document.getElementById('roleLabel');
const zoneLabel = document.getElementById('zoneLabel');
const staminaFill = document.querySelector('#staminaBar i');
const hint = document.getElementById('hint');
const toast = document.getElementById('toast');
const mobileControls = document.getElementById('mobileControls');
const menuBtn = document.getElementById('menuBtn');

const keys = new Set();
const input = { x:0, y:0, sprint:false, action:false };
let running = false;
let selectedRole = 'survivor';
let last = performance.now();
let time = 0;
let shake = 0;

const camera = { x: 0, y: 0 };

const zones = [
  { id:'medical', name:'ALA MÉDICA', x:64, y:64, w:448, h:256, tint:'#18201f' },
  { id:'storage', name:'DEPÓSITO', x:64, y:416, w:448, h:320, tint:'#1d1c18' },
  { id:'corridor', name:'CORREDOR CENTRAL', x:512, y:64, w:192, h:672, tint:'#171b1a' },
  { id:'lab', name:'LABORATÓRIO', x:704, y:64, w:512, h:288, tint:'#171d20' },
  { id:'containment', name:'CONTENÇÃO', x:704, y:416, w:512, h:320, tint:'#211918' },
];

const doors = [
  { id:'d_med', x:506, y:176, w:12, h:64, vertical:true, open:false, zones:['medical','corridor'] },
  { id:'d_lab', x:698, y:176, w:12, h:64, vertical:true, open:true, zones:['lab','corridor'] },
  { id:'d_store', x:506, y:544, w:12, h:64, vertical:true, open:true, zones:['storage','corridor'] },
  { id:'d_cont', x:698, y:544, w:12, h:64, vertical:true, open:false, zones:['containment','corridor'] },
];

const crawlGap = { x:506, y:456, w:16, h:40, zones:['storage','corridor'] };

const wallRects = [];
function addWall(x,y,w,h){ wallRects.push({x,y,w,h}); }
function buildWalls(){
  wallRects.length = 0;
  addWall(48,48,480,16); addWall(48,320,480,16); addWall(48,48,16,288);
  addWall(512,48,16,128); addWall(512,240,16,96);
  addWall(48,400,480,16); addWall(48,736,480,16); addWall(48,400,16,352);
  addWall(512,400,16,56); addWall(512,496,16,48); addWall(512,608,16,144);
  addWall(688,48,544,16); addWall(688,352,544,16); addWall(1216,48,16,320);
  addWall(688,48,16,128); addWall(688,240,16,128);
  addWall(688,400,544,16); addWall(688,736,544,16); addWall(1216,400,16,352);
  addWall(688,400,16,144); addWall(688,608,16,144);
  addWall(512,48,192,16); addWall(512,736,192,16);
}
buildWalls();

const props = [
  {type:'bed',x:112,y:112,w:96,h:38},{type:'bed',x:112,y:214,w:96,h:38},
  {type:'cabinet',x:300,y:92,w:38,h:70},{type:'cabinet',x:354,y:92,w:38,h:70},
  {type:'blood',x:306,y:238,w:62,h:28},{type:'lamp',x:256,y:154,w:12,h:12},
  {type:'crate',x:98,y:462,w:48,h:48},{type:'crate',x:154,y:478,w:48,h:48},{type:'crate',x:110,y:534,w:64,h:64},
  {type:'locker',x:306,y:444,w:42,h:88},{type:'locker',x:356,y:444,w:42,h:88},{type:'barrel',x:304,y:620,w:30,h:30},{type:'barrel',x:344,y:620,w:30,h:30},
  {type:'desk',x:780,y:104,w:126,h:48},{type:'desk',x:974,y:104,w:126,h:48},{type:'tank',x:790,y:232,w:42,h:72},{type:'tank',x:860,y:232,w:42,h:72},{type:'blood',x:1032,y:242,w:70,h:22},
  {type:'cell',x:770,y:466,w:148,h:100},{type:'cell',x:970,y:466,w:148,h:100},{type:'chair',x:826,y:630,w:36,h:36},{type:'blood',x:1000,y:640,w:80,h:30},
  {type:'pipe',x:552,y:96,w:112,h:10},{type:'pipe',x:552,y:686,w:112,h:10},{type:'sign',x:565,y:364,w:86,h:28}
];

const staticColliders = props.filter(p => !['blood','lamp','pipe','sign'].includes(p.type)).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}));

const player = {
  x:610, y:360, r:10, speed:92, runSpeed:142, stamina:100, maxStamina:100,
  dirX:0, dirY:1, anim:0, role:'survivor', zone:'corridor', hurt:0
};

const bots = [];
function spawnBots(){
  bots.length=0;
  if(selectedRole==='survivor'){
    bots.push(makeBot('monster', 1040, 560, 'The Misplaced'));
    bots.push(makeBot('survivor', 190, 160, 'Mara'));
    bots.push(makeBot('survivor', 260, 650, 'Eli'));
    bots.push(makeBot('survivor', 1060, 170, 'Nox'));
  } else {
    bots.push(makeBot('survivor', 170, 140, 'Mara'));
    bots.push(makeBot('survivor', 260, 640, 'Eli'));
    bots.push(makeBot('survivor', 1040, 150, 'Nox'));
    bots.push(makeBot('survivor', 1050, 640, 'Iris'));
  }
}
function makeBot(role,x,y,name){
  return {role,x,y,r:10,dirX:0,dirY:1,anim:Math.random()*10,name,targetX:x,targetY:y,think:0,zone:zoneAt(x,y)?.id||'corridor',stun:0};
}

function fitCanvas(){
  const aspect = W/H;
  let w = innerWidth, h = innerHeight;
  if(w/h > aspect) w = h*aspect; else h = w/aspect;
  canvas.style.width = `${Math.floor(w)}px`;
  canvas.style.height = `${Math.floor(h)}px`;
}
addEventListener('resize',fitCanvas); fitCanvas();

function zoneAt(x,y){
  return zones.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h) || null;
}

function rectCircle(rect,x,y,r){
  const nx=Math.max(rect.x,Math.min(x,rect.x+rect.w));
  const ny=Math.max(rect.y,Math.min(y,rect.y+rect.h));
  const dx=x-nx,dy=y-ny; return dx*dx+dy*dy<r*r;
}
function isBlocked(x,y,r){
  for(const w of wallRects) if(rectCircle(w,x,y,r)) return true;
  for(const d of doors) if(!d.open && rectCircle(d,x,y,r)) return true;
  for(const c of staticColliders) if(rectCircle(c,x,y,r)) return true;
  return x<20||y<20||x>WORLD_W-20||y>WORLD_H-20;
}
function moveEntity(e,dx,dy){
  const nx=e.x+dx; if(!isBlocked(nx,e.y,e.r)) e.x=nx;
  const ny=e.y+dy; if(!isBlocked(e.x,ny,e.r)) e.y=ny;
}

function nearDoor(e){
  let best=null,bd=999;
  for(const d of doors){
    const cx=d.x+d.w/2,cy=d.y+d.h/2;
    const dist=Math.hypot(e.x-cx,e.y-cy);
    if(dist<50&&dist<bd){best=d;bd=dist;}
  }
  return best;
}
function toggleDoor(){
  const d=nearDoor(player); if(!d) return;
  d.open=!d.open; shake=1.6;
  showToast(d.open?'PORTA ABERTA':'PORTA FECHADA');
}

function showToast(msg){ toast.textContent=msg; toast.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>toast.classList.remove('show'),900); }

function startGame(role){
  selectedRole=role; player.role=role;
  player.x=610;player.y=360;player.stamina=100;player.hurt=0;
  if(role==='monster'){player.x=610;player.y=660;player.speed=100;player.runSpeed=148;}
  else {player.speed=92;player.runSpeed=142;}
  spawnBots();
  menu.classList.remove('visible'); hud.classList.remove('hidden');
  mobileControls.classList.toggle('hidden', matchMedia('(pointer:fine)').matches);
  roleLabel.textContent=role==='monster'?'THE MISPLACED':'SURVIVOR';
  document.getElementById('objective').textContent=role==='monster'?'HUNT THE SURVIVORS':'EXPLORE BLACKRIDGE';
  running=true; last=performance.now();
}
function backToMenu(){ running=false; menu.classList.add('visible'); hud.classList.add('hidden'); mobileControls.classList.add('hidden'); }

document.querySelectorAll('.role-card').forEach(b=>b.addEventListener('click',()=>startGame(b.dataset.role)));
menuBtn.addEventListener('click',backToMenu);

addEventListener('keydown',e=>{keys.add(e.code); if(e.code==='KeyE') input.action=true; if(e.code==='Escape'&&running) backToMenu();});
addEventListener('keyup',e=>keys.delete(e.code));

function updateKeyboard(){
  let x=0,y=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))x--;
  if(keys.has('KeyD')||keys.has('ArrowRight'))x++;
  if(keys.has('KeyW')||keys.has('ArrowUp'))y--;
  if(keys.has('KeyS')||keys.has('ArrowDown'))y++;
  if(x||y){const l=Math.hypot(x,y);x/=l;y/=l;}
  if(!touchActive){input.x=x;input.y=y;}
  input.sprint=keys.has('ShiftLeft')||keys.has('ShiftRight')||sprintHeld;
}

let touchActive=false,sprintHeld=false;
const joystick=document.getElementById('joystick'),stick=joystick.querySelector('.stick');
let joyId=null;
function joyMove(clientX,clientY){
  const r=joystick.getBoundingClientRect(); const cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=clientX-cx,dy=clientY-cy; const m=Math.hypot(dx,dy),max=39;
  if(m>max){dx=dx/m*max;dy=dy/m*max;}
  stick.style.transform=`translate(${dx}px,${dy}px)`;
  input.x=dx/max;input.y=dy/max; const l=Math.hypot(input.x,input.y); if(l>1){input.x/=l;input.y/=l;}
}
joystick.addEventListener('pointerdown',e=>{joyId=e.pointerId;touchActive=true;joystick.setPointerCapture(e.pointerId);joyMove(e.clientX,e.clientY)});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyMove(e.clientX,e.clientY)});
function joyEnd(e){if(e.pointerId!==joyId)return;joyId=null;touchActive=false;input.x=0;input.y=0;stick.style.transform='';}
joystick.addEventListener('pointerup',joyEnd);joystick.addEventListener('pointercancel',joyEnd);
const sprintBtn=document.getElementById('sprintBtn');
sprintBtn.addEventListener('pointerdown',e=>{sprintHeld=true;sprintBtn.setPointerCapture(e.pointerId)});sprintBtn.addEventListener('pointerup',()=>sprintHeld=false);sprintBtn.addEventListener('pointercancel',()=>sprintHeld=false);
document.getElementById('actionBtn').addEventListener('pointerdown',()=>input.action=true);

function updatePlayer(dt){
  updateKeyboard();
  const moving=Math.hypot(input.x,input.y)>.1;
  let sprinting=input.sprint&&moving&&player.stamina>0.5;
  const speed=sprinting?player.runSpeed:player.speed;
  if(sprinting) player.stamina=Math.max(0,player.stamina-32*dt); else player.stamina=Math.min(player.maxStamina,player.stamina+18*dt);
  if(moving){player.dirX=input.x;player.dirY=input.y;player.anim+=dt*(sprinting?10:6);moveEntity(player,input.x*speed*dt,input.y*speed*dt);} else player.anim+=dt*1.5;
  if(input.action){toggleDoor(); input.action=false;}
  const z=zoneAt(player.x,player.y); if(z){player.zone=z.id;zoneLabel.textContent=z.name;}
  staminaFill.style.width=`${player.stamina}%`;
  const d=nearDoor(player); hint.textContent=d?'[E] '+(d.open?'FECHAR PORTA':'ABRIR PORTA'):''; hint.classList.toggle('show',!!d);
}

function pickWanderTarget(bot){
  const z=zones[Math.floor(Math.random()*zones.length)];
  bot.targetX=z.x+40+Math.random()*(z.w-80); bot.targetY=z.y+40+Math.random()*(z.h-80);
}
function canSense(a,b){
  const za=zoneAt(a.x,a.y),zb=zoneAt(b.x,b.y); if(!za||!zb||za.id!==zb.id)return false;
  return Math.hypot(a.x-b.x,a.y-b.y)<250;
}
function updateBots(dt){
  for(const b of bots){
    b.think-=dt; b.anim+=dt*5; b.zone=zoneAt(b.x,b.y)?.id||b.zone;
    let tx=b.targetX,ty=b.targetY;
    if(b.role==='monster'){
      let target = selectedRole==='survivor'?player:bots.filter(x=>x.role==='survivor').sort((a,c)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(c.x-b.x,c.y-b.y))[0];
      if(target&&canSense(b,target)){tx=target.x;ty=target.y;b.think=.3;} else if(b.think<=0){pickWanderTarget(b);tx=b.targetX;ty=b.targetY;b.think=1.5+Math.random()*2;}
    } else {
      const monster=selectedRole==='monster'?player:bots.find(x=>x.role==='monster');
      if(monster&&canSense(b,monster)){
        const dx=b.x-monster.x,dy=b.y-monster.y,l=Math.hypot(dx,dy)||1;tx=b.x+dx/l*180;ty=b.y+dy/l*180;b.think=.4;
      } else if(b.think<=0){pickWanderTarget(b);tx=b.targetX;ty=b.targetY;b.think=1+Math.random()*3;}
    }
    let dx=tx-b.x,dy=ty-b.y,l=Math.hypot(dx,dy);
    if(l>6){dx/=l;dy/=l;b.dirX=dx;b.dirY=dy;const sp=b.role==='monster'?72:60;moveEntity(b,dx*sp*dt,dy*sp*dt);} else b.think=0;
  }
}

function updateCamera(dt){
  const targetX=player.x-W/2,targetY=player.y-H/2;
  const smooth=1-Math.pow(0.0008,dt);
  camera.x+=(targetX-camera.x)*smooth; camera.y+=(targetY-camera.y)*smooth;
  camera.x=Math.max(0,Math.min(WORLD_W-W,camera.x)); camera.y=Math.max(0,Math.min(WORLD_H-H,camera.y));
}

function px(x){return Math.round(x-camera.x)}function py(y){return Math.round(y-camera.y)}

function drawFloor(z){
  const sx=px(z.x),sy=py(z.y);
  ctx.fillStyle=z.tint;ctx.fillRect(sx,sy,z.w,z.h);
  ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;
  for(let x=z.x;x<z.x+z.w;x+=TILE){ctx.beginPath();ctx.moveTo(px(x),sy);ctx.lineTo(px(x),sy+z.h);ctx.stroke();}
  for(let y=z.y;y<z.y+z.h;y+=TILE){ctx.beginPath();ctx.moveTo(sx,py(y));ctx.lineTo(sx+z.w,py(y));ctx.stroke();}
  for(let i=0;i<18;i++){
    const hx=(z.x*13+z.y*7+i*71)%(z.w-20)+10,hy=(z.y*11+z.x*3+i*47)%(z.h-20)+10;
    ctx.fillStyle=i%3===0?'rgba(0,0,0,.10)':'rgba(255,255,255,.018)';ctx.fillRect(px(z.x+hx),py(z.y+hy),2+(i%3),1+(i%2));
  }
}

function drawProp(p){
  const x=px(p.x),y=py(p.y);
  switch(p.type){
    case 'bed':
      ctx.fillStyle='#202626';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#5e655e';ctx.fillRect(x+6,y+6,p.w-12,p.h-12);ctx.fillStyle='#a8a795';ctx.fillRect(x+10,y+8,24,12);ctx.fillStyle='#303534';ctx.fillRect(x+4,y+p.h-3,5,6);ctx.fillRect(x+p.w-9,y+p.h-3,5,6);break;
    case 'cabinet':
      ctx.fillStyle='#2f3937';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#111514';ctx.fillRect(x+4,y+4,p.w-8,p.h-8);ctx.strokeStyle='#58625f';ctx.strokeRect(x+6,y+6,p.w-12,p.h-12);ctx.fillStyle='#727b74';ctx.fillRect(x+p.w-10,y+34,2,6);break;
    case 'crate':
      ctx.fillStyle='#3d3326';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#6c583e';ctx.strokeRect(x+3,y+3,p.w-6,p.h-6);ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+p.w-5,y+p.h-5);ctx.moveTo(x+p.w-5,y+5);ctx.lineTo(x+5,y+p.h-5);ctx.stroke();break;
    case 'locker':
      ctx.fillStyle='#293231';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#131716';ctx.fillRect(x+4,y+4,p.w-8,p.h-8);ctx.fillStyle='#4d5653';for(let i=0;i<4;i++)ctx.fillRect(x+9,y+12+i*6,p.w-18,2);ctx.fillRect(x+p.w-9,y+45,2,8);break;
    case 'barrel':
      ctx.fillStyle='#423a32';ctx.fillRect(x+3,y,p.w-6,p.h);ctx.fillStyle='#65584b';ctx.fillRect(x,y+5,p.w,4);ctx.fillRect(x,y+p.h-9,p.w,4);break;
    case 'desk':
      ctx.fillStyle='#303737';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#141817';ctx.fillRect(x+5,y+8,p.w-10,p.h-12);ctx.fillStyle='#859087';ctx.fillRect(x+12,y+13,28,14);ctx.fillStyle='#59645e';ctx.fillRect(x+46,y+14,44,3);ctx.fillRect(x+46,y+21,30,3);break;
    case 'tank':
      ctx.fillStyle='#2b3231';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#73857f';ctx.fillRect(x+6,y+8,p.w-12,p.h-17);ctx.fillStyle='rgba(151,188,176,.12)';ctx.fillRect(x+10,y+13,p.w-20,p.h-28);ctx.fillStyle='#0c1110';ctx.fillRect(x+3,y+p.h-9,p.w-6,6);break;
    case 'cell':
      ctx.fillStyle='#0d1010';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#58605c';ctx.lineWidth=2;ctx.strokeRect(x,y,p.w,p.h);for(let i=12;i<p.w;i+=15){ctx.fillRect(x+i,y,2,p.h);}ctx.fillStyle='#272b2a';ctx.fillRect(x+8,y+p.h-24,p.w-16,18);break;
    case 'chair':
      ctx.fillStyle='#493c34';ctx.fillRect(x+7,y,p.w-14,20);ctx.fillRect(x,y+18,p.w,8);ctx.fillRect(x+5,y+24,5,12);ctx.fillRect(x+p.w-10,y+24,5,12);break;
    case 'blood':
      ctx.fillStyle='rgba(91,28,28,.72)';ctx.fillRect(x+4,y+7,p.w-8,p.h-14);ctx.fillRect(x,y+11,7,7);ctx.fillRect(x+p.w-5,y+4,5,5);ctx.fillStyle='rgba(40,10,10,.65)';ctx.fillRect(x+13,y+2,8,4);break;
    case 'pipe':
      ctx.fillStyle='#3d4441';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#727a75';ctx.fillRect(x,y,p.w,2);ctx.fillStyle='#242827';for(let i=16;i<p.w;i+=32)ctx.fillRect(x+i,y-3,5,p.h+6);break;
    case 'sign':
      ctx.fillStyle='#252b29';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#4f5651';ctx.strokeRect(x+.5,y+.5,p.w-1,p.h-1);ctx.fillStyle='#a2a79d';ctx.font='7px monospace';ctx.fillText('B L A C K R I D G E',x+8,y+17);break;
    case 'lamp':
      ctx.fillStyle='#b8b69c';ctx.fillRect(x,y,p.w,p.h);break;
  }
}

function drawWalls(){
  for(const w of wallRects){
    const x=px(w.x),y=py(w.y);ctx.fillStyle='#252928';ctx.fillRect(x,y,w.w,w.h);ctx.fillStyle='#3b403e';ctx.fillRect(x,y, w.w,3);ctx.fillStyle='#111313';ctx.fillRect(x,y+w.h-4,w.w,4);
    ctx.fillStyle='#626763';for(let bx=8;bx<w.w-4;bx+=28)ctx.fillRect(x+bx,y+5,2,2);
  }
  const gx=px(crawlGap.x),gy=py(crawlGap.y);ctx.fillStyle='#0a0b0b';ctx.fillRect(gx-2,gy-2,20,44);ctx.fillStyle='#59605d';ctx.fillRect(gx-4,gy-3,3,46);ctx.fillRect(gx+18,gy-3,3,46);
}

function drawDoors(){
  for(const d of doors){
    const x=px(d.x),y=py(d.y);
    ctx.save();
    if(d.open){
      ctx.fillStyle='#111514';ctx.fillRect(x,y,d.w,d.h);ctx.fillStyle='#4a514e';ctx.fillRect(x+(d.vertical?0:2),y,4,d.h);
      ctx.fillStyle='#7c817a';ctx.fillRect(x+2,y+6,2,4);
    }else{
      ctx.fillStyle='#4a4f4d';ctx.fillRect(x,y,d.w,d.h);ctx.fillStyle='#1c201f';for(let yy=5;yy<d.h;yy+=9)ctx.fillRect(x+2,y+yy,d.w-4,3);ctx.fillStyle='#b0a67e';ctx.fillRect(x+2,y+d.h/2,3,3);
    }
    ctx.restore();
  }
}

function drawSurvivor(e,isPlayer=false){
  const x=px(e.x),y=py(e.y);const bob=Math.round(Math.sin(e.anim*Math.PI*2)*1);
  ctx.save();ctx.translate(x,y+bob);
  const left=e.dirX<-.25; const right=e.dirX>.25; const back=e.dirY<-.3;
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(-8,9,16,5);
  ctx.fillStyle='#2a3033';ctx.fillRect(-6,4,5,9);ctx.fillRect(2,4,5,9);
  ctx.fillStyle=isPlayer?'#65756c':'#56645f';ctx.fillRect(-8,-8,16,14);ctx.fillStyle='#303b37';ctx.fillRect(-7,-6,4,10);ctx.fillRect(3,-6,4,10);ctx.fillStyle='#9a8b73';ctx.fillRect(-2,-6,4,10);
  ctx.fillStyle='#596660';ctx.fillRect(-11,-6,4,11);ctx.fillRect(8,-6,4,11);
  ctx.fillStyle='#c4ad93';ctx.fillRect(-5,-16,10,9);ctx.fillStyle='#2a2420';ctx.fillRect(-6,-18,12,4);ctx.fillRect(-6,-15,3,4);
  if(!back){ctx.fillStyle='#171817';ctx.fillRect(left?-4:-3,-13,2,2);ctx.fillRect(right?2:1,-13,2,2);}
  ctx.fillStyle='#9b9c8d';ctx.fillRect(10,-2,5,3);
  if(isPlayer){ctx.strokeStyle='rgba(203,214,203,.25)';ctx.strokeRect(-10,-20,20,35);}
  ctx.restore();
}

function drawMonster(e,isPlayer=false){
  const x=px(e.x),y=py(e.y);const bob=Math.round(Math.sin(e.anim*Math.PI)*1);
  ctx.save();ctx.translate(x,y+bob);
  ctx.fillStyle='rgba(0,0,0,.56)';ctx.fillRect(-11,11,23,6);
  ctx.fillStyle='#242927';ctx.fillRect(-8,3,6,13);ctx.fillRect(3,2,6,14);
  ctx.fillStyle='#303634';ctx.fillRect(-10,-12,18,17);ctx.fillRect(-13,-10,6,10);ctx.fillStyle='#1c201f';ctx.fillRect(-6,-10,9,14);
  ctx.fillStyle='#272c2a';ctx.fillRect(8,-8,5,19);ctx.fillRect(9,8,6,9);ctx.fillStyle='#353a37';ctx.fillRect(-15,-11,5,14);
  ctx.fillStyle='#3a3e3b';ctx.fillRect(-2,-17,5,6);ctx.save();ctx.translate(2,-22);ctx.rotate(-.10);ctx.fillStyle='#b8b5a7';ctx.fillRect(-7,-6,13,11);ctx.fillStyle='#060707';ctx.fillRect(-4,-2,2,2);ctx.fillRect(2,-2,2,2);ctx.fillStyle='#777369';ctx.fillRect(3,2,1,4);ctx.restore();
  ctx.fillStyle='#1b1f1e';ctx.fillRect(11,16,1,4);ctx.fillRect(13,16,1,5);ctx.fillRect(15,15,1,4);
  if(isPlayer){ctx.strokeStyle='rgba(185,90,80,.28)';ctx.strokeRect(-17,-30,34,50);}
  ctx.restore();
}

function drawEntities(){
  for(const b of bots){ if(b.role==='monster') drawMonster(b,false); else drawSurvivor(b,false); }
  if(player.role==='monster')drawMonster(player,true);else drawSurvivor(player,true);
}

function drawAmbient(){
  const lights=[{x:608,y:130,c:'rgba(176,190,166,.08)'},{x:608,y:610,c:'rgba(170,60,50,.09)'},{x:930,y:196,c:'rgba(135,165,164,.06)'}];
  for(const l of lights){const g=ctx.createRadialGradient(px(l.x),py(l.y),0,px(l.x),py(l.y),95);g.addColorStop(0,l.c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(px(l.x)-100,py(l.y)-100,200,200);}
  ctx.fillStyle='rgba(213,219,207,.10)';for(let i=0;i<24;i++){const wx=(i*83+time*7)%WORLD_W,wy=(i*47+Math.sin(time*.3+i)*12+120)%WORLD_H;ctx.fillRect(px(wx),py(wy),1,1)}
}

function applyDarkness(){
  const z=zoneAt(player.x,player.y);

  dctx.setTransform(1,0,0,1,0,0);
  dctx.globalCompositeOperation='source-over';
  dctx.clearRect(0,0,W,H);
  dctx.fillStyle='#000';
  dctx.fillRect(0,0,W,H);

  if(z){
    dctx.save();
    dctx.globalCompositeOperation='destination-out';
    dctx.beginPath();
    dctx.rect(px(z.x),py(z.y),z.w,z.h);
    dctx.clip();

    const sx=px(player.x),sy=py(player.y);
    const radius=z.id==='corridor'?230:340;
    const g=dctx.createRadialGradient(sx,sy,28,sx,sy,radius);
    g.addColorStop(0,'rgba(0,0,0,1)');
    g.addColorStop(.58,'rgba(0,0,0,1)');
    g.addColorStop(.82,'rgba(0,0,0,.72)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    dctx.fillStyle=g;
    dctx.fillRect(px(z.x),py(z.y),z.w,z.h);
    dctx.restore();
  }

  ctx.drawImage(darknessCanvas,0,0);

  if(z){
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const sx=px(player.x),sy=py(player.y);
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,48);
    g.addColorStop(0,player.role==='monster'?'rgba(110,40,34,.075)':'rgba(188,194,170,.075)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.fillRect(sx-50,sy-50,100,100);
    ctx.restore();
  }
}

function render(){
  ctx.fillStyle='#030404';ctx.fillRect(0,0,W,H);
  ctx.save();
  if(shake>0){const s=shake*1.2;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);shake=Math.max(0,shake-.12);}
  for(const z of zones)drawFloor(z);
  drawAmbient();
  for(const p of props)drawProp(p);
  drawWalls();drawDoors();drawEntities();
  applyDarkness();
  ctx.strokeStyle='rgba(255,255,255,.025)';ctx.strokeRect(.5,.5,W-1,H-1);
  ctx.restore();
}

function loop(now){
  const dt=Math.min(.033,(now-last)/1000||0);last=now;time+=dt;
  if(running){updatePlayer(dt);updateBots(dt);updateCamera(dt);render();}
  else {renderMenuBackdrop();}
  requestAnimationFrame(loop);
}
function renderMenuBackdrop(){
  camera.x+=(610-W/2-camera.x)*.02;camera.y+=(360-H/2-camera.y)*.02;
  ctx.fillStyle='#030404';ctx.fillRect(0,0,W,H);
  for(const z of zones)drawFloor(z);for(const p of props)drawProp(p);drawWalls();drawDoors();
  const fake={x:628,y:270,dirX:0,dirY:1,anim:time*.4,role:'monster'};drawMonster(fake,false);
  ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,0,W,H);
}
requestAnimationFrame(loop);
})();
