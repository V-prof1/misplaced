'use strict';
window.MISPLACED = (() => {
  const G = {};
  G.W=640; G.H=360; G.WORLD_W=1280; G.WORLD_H=800; G.TILE=32; G.NAV=24;
  G.canvas=document.getElementById('game');
  G.ctx=G.canvas.getContext('2d',{alpha:false}); G.ctx.imageSmoothingEnabled=false;
  G.darknessCanvas=document.createElement('canvas'); G.darknessCanvas.width=G.W; G.darknessCanvas.height=G.H;
  G.dctx=G.darknessCanvas.getContext('2d',{alpha:true}); G.dctx.imageSmoothingEnabled=false;
  G.ui={
    menu:document.getElementById('menu'),result:document.getElementById('result'),resultTitle:document.getElementById('resultTitle'),resultText:document.getElementById('resultText'),
    hud:document.getElementById('hud'),roleLabel:document.getElementById('roleLabel'),zoneLabel:document.getElementById('zoneLabel'),objectiveText:document.getElementById('objectiveText'),objectiveCount:document.getElementById('objectiveCount'),
    staminaFill:document.querySelector('#staminaBar i'),statusWrap:document.getElementById('statusWrap'),statusValue:document.getElementById('statusValue'),hint:document.getElementById('hint'),toast:document.getElementById('toast'),damageFlash:document.getElementById('damageFlash'),
    mobile:document.getElementById('mobileControls'),menuBtn:document.getElementById('menuBtn'),actionBtn:document.getElementById('actionBtn'),attackBtn:document.getElementById('attackBtn'),sprintBtn:document.getElementById('sprintBtn'),joystick:document.getElementById('joystick')
  };
  G.state={running:false,role:'survivor',last:performance.now(),time:0,shake:0,roundEnded:false,touchActive:false,sprintHeld:false,camera:{x:0,y:0},keys:new Set(),input:{x:0,y:0,sprint:false,action:false,attack:false}};

  G.zones=[
    {id:'medical',name:'ALA MÉDICA',x:64,y:64,w:448,h:256,tint:'#18201f'},
    {id:'storage',name:'DEPÓSITO',x:64,y:416,w:448,h:320,tint:'#1d1c18'},
    {id:'corridor',name:'CORREDOR CENTRAL',x:512,y:64,w:192,h:672,tint:'#171b1a'},
    {id:'lab',name:'LABORATÓRIO',x:704,y:64,w:512,h:288,tint:'#171d20'},
    {id:'containment',name:'CONTENÇÃO',x:704,y:416,w:512,h:320,tint:'#211918'}
  ];
  G.doors=[
    {id:'d_med',x:506,y:176,w:12,h:64,open:false,zones:['medical','corridor'],hinge:'top'},
    {id:'d_lab',x:698,y:176,w:12,h:64,open:true,zones:['lab','corridor'],hinge:'bottom'},
    {id:'d_store',x:506,y:544,w:12,h:64,open:true,zones:['storage','corridor'],hinge:'top'},
    {id:'d_cont',x:698,y:544,w:12,h:64,open:false,zones:['containment','corridor'],hinge:'bottom'}
  ];
  G.crawlGap={x:506,y:456,w:16,h:40,zones:['storage','corridor']};
  G.walls=[]; const add=(x,y,w,h)=>G.walls.push({x,y,w,h});
  add(48,48,480,16);add(48,320,480,16);add(48,48,16,288);add(512,48,16,128);add(512,240,16,96);
  add(48,400,480,16);add(48,736,480,16);add(48,400,16,352);add(512,400,16,56);add(512,496,16,48);add(512,608,16,144);
  add(688,48,544,16);add(688,352,544,16);add(1216,48,16,320);add(688,48,16,128);add(688,240,16,128);
  add(688,400,544,16);add(688,736,544,16);add(1216,400,16,352);add(688,400,16,144);add(688,608,16,144);add(512,48,192,16);add(512,736,192,16);

  G.props=[
    {type:'bed',x:112,y:112,w:96,h:38},{type:'bed',x:112,y:214,w:96,h:38},{type:'stool',x:225,y:126,w:24,h:24},{type:'cabinet',x:300,y:92,w:38,h:70},{type:'cabinet',x:354,y:92,w:38,h:70},{type:'blood',x:306,y:238,w:62,h:28},{type:'lamp',x:256,y:154,w:12,h:12},
    {type:'crate',x:98,y:462,w:48,h:48},{type:'crate',x:154,y:478,w:48,h:48},{type:'crate',x:110,y:534,w:64,h:64},{type:'crate',x:214,y:650,w:48,h:48},{type:'locker',x:306,y:444,w:42,h:88},{type:'locker',x:356,y:444,w:42,h:88},{type:'barrel',x:304,y:620,w:30,h:30},{type:'barrel',x:344,y:620,w:30,h:30},
    {type:'desk',x:780,y:104,w:126,h:48},{type:'desk',x:974,y:104,w:126,h:48},{type:'tank',x:790,y:232,w:42,h:72},{type:'tank',x:860,y:232,w:42,h:72},{type:'blood',x:1032,y:242,w:70,h:22},{type:'cell',x:770,y:466,w:148,h:100},{type:'cell',x:970,y:466,w:148,h:100},{type:'chair',x:826,y:630,w:36,h:36},{type:'blood',x:1000,y:640,w:80,h:30},
    {type:'pipe',x:552,y:96,w:112,h:10},{type:'pipe',x:552,y:686,w:112,h:10},{type:'sign',x:565,y:364,w:86,h:28},{type:'vent',x:580,y:274,w:48,h:22},{type:'vent',x:580,y:470,w:48,h:22}
  ];
  G.colliders=G.props.filter(p=>!['blood','lamp','pipe','sign','vent'].includes(p.type)).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h}));
  G.cells=[{id:'pc1',x:420,y:260,zone:'medical',collected:false},{id:'pc2',x:250,y:690,zone:'storage',collected:false},{id:'pc3',x:1110,y:300,zone:'lab',collected:false}];
  G.extraction={x:610,y:102,r:26};
  G.player={x:610,y:360,r:10,speed:92,runSpeed:142,stamina:100,maxStamina:100,dirX:0,dirY:1,anim:0,role:'survivor',zone:'corridor',health:2,invuln:0,attackCooldown:0,kills:0,cells:0,noise:0,hitBoost:0,hitBoostMax:1.35};
  G.bots=[];

  G.zoneAt=(x,y)=>G.zones.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h)||null;
  G.zoneById=id=>G.zones.find(z=>z.id===id);
  G.distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  G.rectCircle=(r,x,y,rad)=>{const nx=Math.max(r.x,Math.min(x,r.x+r.w)),ny=Math.max(r.y,Math.min(y,r.y+r.h)),dx=x-nx,dy=y-ny;return dx*dx+dy*dy<rad*rad;};
  G.isBlocked=(x,y,r)=>{for(const w of G.walls)if(G.rectCircle(w,x,y,r))return true;for(const d of G.doors)if(!d.open&&G.rectCircle(d,x,y,r))return true;for(const c of G.colliders)if(G.rectCircle(c,x,y,r))return true;return x<20||y<20||x>G.WORLD_W-20||y>G.WORLD_H-20;};
  G.isNavBlocked=(x,y,r=10)=>{for(const w of G.walls)if(G.rectCircle(w,x,y,r))return true;for(const c of G.colliders)if(G.rectCircle(c,x,y,r))return true;return x<24||y<24||x>G.WORLD_W-24||y>G.WORLD_H-24;};
  G.move=(e,dx,dy)=>{const ox=e.x,oy=e.y,nx=e.x+dx;if(!G.isBlocked(nx,e.y,e.r))e.x=nx;const ny=e.y+dy;if(!G.isBlocked(e.x,ny,e.r))e.y=ny;return Math.hypot(e.x-ox,e.y-oy);};
  G.nearDoor=(e,range=50)=>{let best=null,bd=999;for(const d of G.doors){const dist=Math.hypot(e.x-(d.x+d.w/2),e.y-(d.y+d.h/2));if(dist<range&&dist<bd){best=d;bd=dist;}}return best;};
  G.boostMultiplier=e=>{if(!e.hitBoost)return 1;const t=Math.max(0,Math.min(1,e.hitBoost/(e.hitBoostMax||1.35)));return 1+.62*t;};
  G.showToast=msg=>{G.ui.toast.textContent=msg;G.ui.toast.classList.add('show');clearTimeout(G.showToast.t);G.showToast.t=setTimeout(()=>G.ui.toast.classList.remove('show'),1100);};
  G.flashDamage=()=>{G.ui.damageFlash.classList.add('show');clearTimeout(G.flashDamage.t);G.flashDamage.t=setTimeout(()=>G.ui.damageFlash.classList.remove('show'),130);};
  G.fitCanvas=()=>{const a=G.W/G.H;let w=innerWidth,h=innerHeight;if(w/h>a)w=h*a;else h=w/a;G.canvas.style.width=`${Math.floor(w)}px`;G.canvas.style.height=`${Math.floor(h)}px`;};
  return G;
})();
