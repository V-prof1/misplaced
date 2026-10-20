'use strict';
(() => {
const G=window.MISPLACED,ctx=G.ctx,dctx=G.dctx;
const px=x=>Math.round(x-G.state.camera.x),py=y=>Math.round(y-G.state.camera.y);
const solidTypes=new Set(['bed','stool','cabinet','locker','crate','barrel','desk','tank','cell','chair','pallet','vault']);

function floor(z){
  const x=px(z.x),y=py(z.y);ctx.fillStyle=z.tint;ctx.fillRect(x,y,z.w,z.h);
  ctx.strokeStyle='rgba(190,202,195,.035)';ctx.lineWidth=1;
  for(let xx=z.x;xx<z.x+z.w;xx+=G.TILE){ctx.beginPath();ctx.moveTo(px(xx),y);ctx.lineTo(px(xx),y+z.h);ctx.stroke();}
  for(let yy=z.y;yy<z.y+z.h;yy+=G.TILE){ctx.beginPath();ctx.moveTo(x,py(yy));ctx.lineTo(x+z.w,py(yy));ctx.stroke();}
  ctx.strokeStyle='rgba(208,218,210,.06)';ctx.strokeRect(x+2,y+2,z.w-4,z.h-4);
  for(let i=0;i<14;i++){
    const hx=(z.x*9+z.y*5+i*83)%(z.w-24)+12,hy=(z.y*7+z.x*3+i*59)%(z.h-24)+12;
    ctx.fillStyle=i%3?'rgba(255,255,255,.018)':'rgba(0,0,0,.09)';ctx.fillRect(px(z.x+hx),py(z.y+hy),2+i%2,1);
  }
}
function ambient(){
  const lights=[
    {x:255,y:150,r:125,a:.055,c:'190,202,180'},
    {x:604,y:150,r:120,a:.045,c:'190,198,180'},
    {x:930,y:205,r:145,a:.055,c:'150,190,188'},
    {x:610,y:620,r:130,a:.048,c:'176,74,62'}
  ];
  for(const l of lights){const x=px(l.x),y=py(l.y),g=ctx.createRadialGradient(x,y,0,x,y,l.r);g.addColorStop(0,`rgba(${l.c},${l.a})`);g.addColorStop(1,`rgba(${l.c},0)`);ctx.fillStyle=g;ctx.fillRect(x-l.r,y-l.r,l.r*2,l.r*2);}
}
function shadow(x,y,w,h){ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(x+4,y+5,w,h);}
function rim(x,y,w,h,c='#7a817b'){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);}
function hazard(x,y,w,h,vertical=false){ctx.fillStyle='#c6a45c';if(vertical){for(let yy=2;yy<h-2;yy+=8)ctx.fillRect(x+1,y+yy,w-2,3);}else{for(let xx=2;xx<w-2;xx+=10)ctx.fillRect(x+xx,y+1,4,h-2);}}

function pallet(p,x,y){
  if(p.state==='broken'){
    ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(x-2,y+4,p.w+4,p.h+8);
    ctx.fillStyle='#6d4b31';
    if(p.axis==='h'){ctx.fillRect(x+4,y+3,18,4);ctx.fillRect(x+27,y+10,20,4);ctx.fillRect(x+p.w-14,y+1,10,4);}
    else{ctx.fillRect(x+2,y+5,4,18);ctx.fillRect(x+9,y+28,4,22);ctx.fillRect(x+1,y+p.h-14,4,10);}
    return;
  }
  shadow(x,y,p.w,p.h);
  if(p.state==='ready'){
    ctx.fillStyle='#271d17';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#946b43');
    ctx.fillStyle='#9c6339';
    if(p.axis==='h'){ctx.fillRect(x+3,y+3,p.w-6,4);ctx.fillRect(x+3,y+9,p.w-6,4);ctx.fillStyle='#d0a85d';ctx.fillRect(x+8,y+2,4,p.h-4);ctx.fillRect(x+p.w-12,y+2,4,p.h-4);}
    else{ctx.fillRect(x+3,y+3,4,p.h-6);ctx.fillRect(x+9,y+3,4,p.h-6);ctx.fillStyle='#d0a85d';ctx.fillRect(x+2,y+8,p.w-4,4);ctx.fillRect(x+2,y+p.h-12,p.w-4,4);}
  }else{
    ctx.fillStyle='#4d2e20';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#d0a35a');
    ctx.fillStyle='#a86136';
    if(p.axis==='h'){for(let xx=4;xx<p.w-4;xx+=14)ctx.fillRect(x+xx,y+3,9,p.h-6);hazard(x,y,p.w,3,false);}
    else{for(let yy=4;yy<p.h-4;yy+=14)ctx.fillRect(x+3,y+yy,p.w-6,9);hazard(x,y,3,p.h,true);}
  }
}
function vault(p,x,y){
  shadow(x,y,p.w,p.h);ctx.fillStyle='#1d2424';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#75827b');
  ctx.fillStyle='#0b0f0f';
  if(p.axis==='h')ctx.fillRect(x+9,y+3,p.w-18,p.h-6);else ctx.fillRect(x+3,y+9,p.w-6,p.h-18);
  ctx.fillStyle='#c3a458';
  if(p.axis==='h'){ctx.fillRect(x+2,y+2,5,p.h-4);ctx.fillRect(x+p.w-7,y+2,5,p.h-4);ctx.fillRect(x+10,y+1,p.w-20,2);}
  else{ctx.fillRect(x+2,y+2,p.w-4,5);ctx.fillRect(x+2,y+p.h-7,p.w-4,5);ctx.fillRect(x+1,y+10,2,p.h-20);}
}
function prop(p){
  const x=px(p.x),y=py(p.y);if(solidTypes.has(p.type)&&p.type!=='pallet'&&p.type!=='vault')shadow(x,y,p.w,p.h);
  switch(p.type){
    case'bed':ctx.fillStyle='#222a29';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#68736d');ctx.fillStyle='#727b70';ctx.fillRect(x+5,y+5,p.w-10,p.h-10);ctx.fillStyle='#c5c0a9';ctx.fillRect(x+9,y+7,27,13);ctx.fillStyle='#4a534e';ctx.fillRect(x+42,y+8,p.w-49,p.h-16);break;
    case'stool':ctx.fillStyle='#58605b';ctx.fillRect(x+2,y,p.w-4,8);rim(x+2,y,p.w-4,8,'#8b928c');ctx.fillStyle='#323835';ctx.fillRect(x+5,y+8,4,p.h-8);ctx.fillRect(x+p.w-9,y+8,4,p.h-8);break;
    case'cabinet':case'locker':ctx.fillStyle='#33413e';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#6d7a74');ctx.fillStyle='#131918';ctx.fillRect(x+4,y+4,p.w-8,p.h-8);ctx.strokeStyle='#52625c';ctx.strokeRect(x+6,y+6,p.w-12,p.h-12);ctx.fillStyle='#8a948d';for(let yy=11;yy<Math.min(p.h-8,35);yy+=6)ctx.fillRect(x+9,y+yy,p.w-18,2);break;
    case'crate':ctx.fillStyle='#5a412b';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#9a7448');ctx.strokeStyle='#b28a56';ctx.strokeRect(x+4,y+4,p.w-8,p.h-8);ctx.beginPath();ctx.moveTo(x+6,y+6);ctx.lineTo(x+p.w-6,y+p.h-6);ctx.moveTo(x+p.w-6,y+6);ctx.lineTo(x+6,y+p.h-6);ctx.stroke();break;
    case'barrel':ctx.fillStyle='#66564a';ctx.fillRect(x+3,y,p.w-6,p.h);rim(x+3,y,p.w-6,p.h,'#94806b');ctx.fillStyle='#2b302e';ctx.fillRect(x,y+5,p.w,4);ctx.fillRect(x,y+p.h-9,p.w,4);break;
    case'desk':ctx.fillStyle='#435152';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#788787');ctx.fillStyle='#171d1d';ctx.fillRect(x+5,y+8,p.w-10,p.h-13);ctx.fillStyle='#9aa69e';ctx.fillRect(x+12,y+12,30,15);ctx.fillStyle='#596965';ctx.fillRect(x+49,y+13,p.w-60,4);ctx.fillRect(x+49,y+22,Math.max(18,p.w-82),3);break;
    case'tank':ctx.fillStyle='#394643';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#72918a');ctx.fillStyle='#7faaa1';ctx.fillRect(x+6,y+8,p.w-12,p.h-17);ctx.fillStyle='rgba(171,220,208,.18)';ctx.fillRect(x+10,y+12,p.w-20,p.h-28);ctx.fillStyle='#111716';ctx.fillRect(x+3,y+p.h-10,p.w-6,7);break;
    case'cell':ctx.fillStyle='#111615';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#69736e');ctx.fillStyle='#303735';ctx.fillRect(x+7,y+p.h-23,p.w-14,17);ctx.fillStyle='#7c8680';for(let i=10;i<p.w;i+=15)ctx.fillRect(x+i,y,3,p.h);ctx.fillStyle='#a1a89f';ctx.fillRect(x,y,3,p.h);ctx.fillRect(x+p.w-3,y,3,p.h);break;
    case'chair':ctx.fillStyle='#675044';ctx.fillRect(x+6,y,p.w-12,20);rim(x+6,y,p.w-12,20,'#9b7560');ctx.fillStyle='#403630';ctx.fillRect(x,y+18,p.w,8);ctx.fillRect(x+5,y+26,5,10);ctx.fillRect(x+p.w-10,y+26,5,10);break;
    case'blood':ctx.fillStyle='rgba(110,26,26,.72)';ctx.fillRect(x+4,y+7,p.w-8,p.h-14);ctx.fillRect(x,y+11,7,7);ctx.fillStyle='rgba(47,7,7,.72)';ctx.fillRect(x+16,y+3,10,4);break;
    case'pipe':ctx.fillStyle='#58605c';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#929b94';ctx.fillRect(x,y,p.w,2);ctx.fillStyle='#2b302e';for(let i=16;i<p.w;i+=30)ctx.fillRect(x+i,y-2,4,p.h+4);break;
    case'sign':ctx.fillStyle='#303936';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#68736d');ctx.fillStyle='#c1c4b8';ctx.font='7px monospace';ctx.fillText('B L A C K R I D G E',x+8,y+17);break;
    case'lamp':{const f=.62+.25*Math.sin(G.state.time*6+p.x);ctx.fillStyle=`rgba(228,224,181,${f})`;ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='rgba(255,247,190,.18)';ctx.fillRect(x-5,y-3,p.w+10,p.h+6);break;}
    case'vent':ctx.fillStyle='#3b4642';ctx.fillRect(x,y,p.w,p.h);rim(x,y,p.w,p.h,'#69736e');ctx.fillStyle='#151a18';for(let i=5;i<p.w-3;i+=7)ctx.fillRect(x+i,y+4,2,p.h-8);break;
    case'pallet':pallet(p,x,y);break;
    case'vault':vault(p,x,y);break;
  }
}

function breach(){
  const g=G.crawlGap;if(!g)return;const x=px(g.x),y=py(g.y);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x-8,y-2,30,48);ctx.fillStyle='#35403b';ctx.fillRect(x-6,y-5,28,50);rim(x-6,y-5,28,50,'#768079');
  ctx.fillStyle='#101513';ctx.fillRect(x+1,y+2,14,36);ctx.fillStyle='#c2a157';ctx.fillRect(x-12,y-11,30,7);ctx.fillStyle='#181a18';ctx.font='6px monospace';ctx.fillText('SVC',x-2,y-5);
  ctx.fillStyle='#9b774c';ctx.fillRect(x+4,y+5,2,29);ctx.fillRect(x+11,y+8,2,26);
}
function walls(){
  for(const w of G.walls){const x=px(w.x),y=py(w.y);ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(x+4,y+5,w.w,w.h);ctx.fillStyle='#303735';ctx.fillRect(x,y,w.w,w.h);ctx.fillStyle='#69716c';ctx.fillRect(x,y,w.w,3);ctx.fillStyle='#171b19';ctx.fillRect(x,y+w.h-4,w.w,4);ctx.strokeStyle='#404945';ctx.strokeRect(x+.5,y+.5,w.w-1,w.h-1);}breach();
}
function doorOne(d,foreground=false){
  const x=px(d.x),y=py(d.y);ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(x-6,y-1,d.w+12,d.h+7);
  ctx.fillStyle=foreground?'#68736d':'#5b6761';ctx.fillRect(x-5,y-4,4,d.h+8);ctx.fillRect(x+d.w+1,y-4,4,d.h+8);
  ctx.fillStyle='#c2a65d';ctx.fillRect(x-5,y-4,4,5);ctx.fillRect(x+d.w+1,y+d.h-1,4,5);
  ctx.fillStyle='#39413e';ctx.fillRect(x-1,y-3,d.w+2,3);ctx.fillRect(x-1,y+d.h,d.w+2,3);
  if(d.open){ctx.fillStyle='rgba(150,170,158,.14)';ctx.fillRect(x-1,y+3,d.w+2,d.h-6);const panelY=d.hinge==='top'?y-2:y+d.h-15;ctx.fillStyle='#4b5550';ctx.fillRect(x-10,panelY,9,18);rim(x-10,panelY,9,18,'#879188');}
  else{ctx.fillStyle='#59635e';ctx.fillRect(x,y,d.w,d.h);rim(x,y,d.w,d.h,'#8b948e');ctx.fillStyle='#252b29';for(let yy=5;yy<d.h;yy+=9)ctx.fillRect(x+2,y+yy,d.w-4,3);ctx.fillStyle='#d2b365';ctx.fillRect(x+2,y+d.h/2,3,3);}
}
function doors(){G.doors.forEach(d=>doorOne(d));}
function doorForeground(){const z=G.zoneAt(G.player.x,G.player.y);if(!z)return;for(const d of G.doors)if(d.zones.includes(z.id))doorOne(d,true);}

function survivor(e,me=false){
  const x=px(e.x),y=py(e.y),inj=e.health===1||e.injured;ctx.save();ctx.translate(x,y+Math.round(Math.sin(e.anim*Math.PI*2)));
  if((e.stun||0)>0){ctx.strokeStyle='rgba(222,190,92,.6)';ctx.strokeRect(-14,-24,28,44);}else if(e.hitBoost>0){ctx.strokeStyle='rgba(185,210,190,.35)';ctx.strokeRect(-13,-23,26,42);}
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(-9,10,18,5);ctx.fillStyle=inj?'#3d2e2d':'#293133';ctx.fillRect(-6,4,5,9);ctx.fillRect(2,4,5,9);
  ctx.fillStyle=me?'#74887c':'#62766c';ctx.fillRect(-8,-8,16,14);ctx.strokeStyle=me?'#aebdb2':'#82938a';ctx.strokeRect(-8.5,-8.5,17,15);
  ctx.fillStyle=inj?'#573a38':'#354640';ctx.fillRect(-7,-6,4,10);ctx.fillRect(3,-6,4,10);ctx.fillStyle='#d0b99d';ctx.fillRect(-5,-16,10,9);ctx.fillStyle='#302722';ctx.fillRect(-6,-18,12,4);if(inj){ctx.fillStyle='#812e2a';ctx.fillRect(5,-2,3,5);}ctx.restore();
}
function monster(e,me=false){
  const x=px(e.x),y=py(e.y),idle=Math.sin(e.anim*.7),twitch=Math.sin(G.state.time*13+e.x)>.985?2:0;ctx.save();ctx.translate(x,y+Math.round(idle));
  if((e.stun||0)>0){ctx.strokeStyle='rgba(221,177,72,.75)';ctx.strokeRect(-18,-31,36,52);}
  ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(-12,12,25,6);ctx.fillStyle='#29302d';ctx.fillRect(-8,3,6,13);ctx.fillRect(3,2,6,14);ctx.fillStyle='#39413d';ctx.fillRect(-10,-12,18,17);ctx.fillStyle='#202522';ctx.fillRect(8,-8,5,19);ctx.fillRect(9,8,6,9+twitch);ctx.fillStyle='#454d48';ctx.fillRect(-15,-11,5,14);
  ctx.save();ctx.translate(2+twitch,-22);ctx.rotate(-.1-.015*idle);ctx.fillStyle='#d0ccbb';ctx.fillRect(-7,-6,13,11);ctx.strokeStyle='#7f7b70';ctx.strokeRect(-7.5,-6.5,14,12);ctx.fillStyle='#050606';ctx.fillRect(-4,-2,2,2);ctx.fillRect(2,-2,2,2);ctx.restore();if(me){ctx.strokeStyle='rgba(196,84,72,.36)';ctx.strokeRect(-17,-30,34,50);}ctx.restore();
}
function entities(){for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?monster(b):survivor(b);}G.player.role==='monster'?monster(G.player,true):G.player.health>0&&survivor(G.player,true);}
function cells(){for(const c of G.cells){if(c.collected)continue;const x=px(c.x),y=py(c.y),p=.5+.5*Math.sin(G.state.time*4+c.x);ctx.fillStyle='rgba(165,205,175,.10)';ctx.fillRect(x-14,y-14,28,28);ctx.fillStyle='#34483c';ctx.fillRect(x-7,y-11,14,22);rim(x-7,y-11,14,22,'#7b9783');ctx.fillStyle=`rgba(182,228,192,${.62+.35*p})`;ctx.fillRect(x-3,y-7,6,14);}}
function extraction(){const x=px(G.extraction.x),y=py(G.extraction.y),ready=G.player.cells===3;ctx.strokeStyle=ready?'rgba(190,226,194,.8)':'rgba(112,126,118,.48)';ctx.strokeRect(x-23,y-14,46,28);ctx.fillStyle=ready?'rgba(145,190,153,.16)':'rgba(58,67,62,.16)';ctx.fillRect(x-20,y-11,40,22);}

function cutPortal(z,d){
  if(!d.open||!d.zones.includes(z.id))return;const cx=d.x+d.w/2,cy=d.y+d.h/2,dist=Math.hypot(G.player.x-cx,G.player.y-cy);if(dist>155)return;
  const otherId=d.zones.find(id=>id!==z.id),other=G.zoneById(otherId);if(!other)return;const ocx=other.x+other.w/2,side=ocx<cx?-1:1;
  const closeness=Math.max(0,1-dist/155),depth=72+closeness*105,near=18,far=34+closeness*30,x0=px(cx+side*3),x1=px(cx+side*depth),yy=py(cy);
  dctx.save();dctx.globalCompositeOperation='destination-out';dctx.beginPath();dctx.rect(px(other.x),py(other.y),other.w,other.h);dctx.clip();dctx.fillStyle=`rgba(0,0,0,${.78+closeness*.22})`;dctx.beginPath();dctx.moveTo(x0,yy-near);dctx.lineTo(x0,yy+near);dctx.lineTo(x1,yy+far);dctx.lineTo(x1,yy-far);dctx.closePath();dctx.fill();dctx.restore();
}
function cutBreach(z){
  const g=G.crawlGap;if(!g||!g.zones.includes(z.id))return;const cx=g.x+g.w/2,cy=g.y+g.h/2,dist=Math.hypot(G.player.x-cx,G.player.y-cy);if(dist>125)return;
  const otherId=g.zones.find(id=>id!==z.id),other=G.zoneById(otherId);if(!other)return;const side=(other.x+other.w/2)<cx?-1:1,closeness=Math.max(0,1-dist/125),depth=52+closeness*76,x0=px(cx+side*2),x1=px(cx+side*depth),yy=py(cy);
  dctx.save();dctx.globalCompositeOperation='destination-out';dctx.beginPath();dctx.rect(px(other.x),py(other.y),other.w,other.h);dctx.clip();dctx.fillStyle=`rgba(0,0,0,${.72+closeness*.2})`;dctx.beginPath();dctx.moveTo(x0,yy-12);dctx.lineTo(x0,yy+12);dctx.lineTo(x1,yy+27);dctx.lineTo(x1,yy-27);dctx.closePath();dctx.fill();dctx.restore();
}
function darkness(){
  const z=G.zoneAt(G.player.x,G.player.y);dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,G.W,G.H);dctx.fillStyle='#000';dctx.fillRect(0,0,G.W,G.H);
  if(z){dctx.save();dctx.globalCompositeOperation='destination-out';dctx.beginPath();dctx.rect(px(z.x),py(z.y),z.w,z.h);dctx.clip();const x=px(G.player.x),y=py(G.player.y),r=z.id==='corridor'?230:345,g=dctx.createRadialGradient(x,y,28,x,y,r);g.addColorStop(0,'#000');g.addColorStop(.60,'#000');g.addColorStop(.83,'rgba(0,0,0,.62)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.fillRect(px(z.x),py(z.y),z.w,z.h);dctx.restore();for(const d of G.doors)cutPortal(z,d);cutBreach(z);}
  ctx.drawImage(G.darknessCanvas,0,0);
}
G.render=()=>{ctx.fillStyle='#030404';ctx.fillRect(0,0,G.W,G.H);ctx.save();if(G.state.shake>0){const s=G.state.shake*1.2;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);G.state.shake=Math.max(0,G.state.shake-.14);}G.zones.forEach(floor);ambient();G.props.forEach(prop);cells();extraction();walls();doors();entities();darkness();doorForeground();ctx.restore();};
G.renderMenu=()=>{G.state.camera.x+=(610-G.W/2-G.state.camera.x)*.02;G.state.camera.y+=(360-G.H/2-G.state.camera.y)*.02;ctx.fillStyle='#030404';ctx.fillRect(0,0,G.W,G.H);G.zones.forEach(floor);ambient();G.props.forEach(prop);walls();doors();monster({x:628,y:270,anim:G.state.time*.4,stun:0});ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(0,0,G.W,G.H);};
})();
