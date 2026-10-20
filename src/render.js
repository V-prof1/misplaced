'use strict';
(() => {
const G=window.MISPLACED,ctx=G.ctx,dctx=G.dctx;
const px=x=>Math.round(x-G.state.camera.x),py=y=>Math.round(y-G.state.camera.y);

function floor(z){
  const x=px(z.x),y=py(z.y);ctx.fillStyle=z.tint;ctx.fillRect(x,y,z.w,z.h);
  ctx.strokeStyle='rgba(255,255,255,.025)';
  for(let xx=z.x;xx<z.x+z.w;xx+=G.TILE){ctx.beginPath();ctx.moveTo(px(xx),y);ctx.lineTo(px(xx),y+z.h);ctx.stroke();}
  for(let yy=z.y;yy<z.y+z.h;yy+=G.TILE){ctx.beginPath();ctx.moveTo(x,py(yy));ctx.lineTo(x+z.w,py(yy));ctx.stroke();}
  for(let i=0;i<24;i++){const hx=(z.x*13+z.y*7+i*71)%(z.w-20)+10,hy=(z.y*11+z.x*3+i*47)%(z.h-20)+10;ctx.fillStyle=i%3?'rgba(255,255,255,.018)':'rgba(0,0,0,.12)';ctx.fillRect(px(z.x+hx),py(z.y+hy),2+i%3,1+i%2);}
}

function prop(p){
  const x=px(p.x),y=py(p.y);
  switch(p.type){
    case'bed':ctx.fillStyle='#202626';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#5e655e';ctx.fillRect(x+6,y+6,p.w-12,p.h-12);ctx.fillStyle='#a8a795';ctx.fillRect(x+10,y+8,24,12);break;
    case'stool':ctx.fillStyle='#3b403d';ctx.fillRect(x+3,y,p.w-6,8);ctx.fillRect(x+6,y+8,3,p.h-8);ctx.fillRect(x+p.w-9,y+8,3,p.h-8);break;
    case'cabinet':case'locker':ctx.fillStyle='#293231';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#111514';ctx.fillRect(x+4,y+4,p.w-8,p.h-8);ctx.strokeStyle='#58625f';ctx.strokeRect(x+6,y+6,p.w-12,p.h-12);break;
    case'crate':ctx.fillStyle='#3d3326';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#6c583e';ctx.strokeRect(x+3,y+3,p.w-6,p.h-6);ctx.beginPath();ctx.moveTo(x+5,y+5);ctx.lineTo(x+p.w-5,y+p.h-5);ctx.moveTo(x+p.w-5,y+5);ctx.lineTo(x+5,y+p.h-5);ctx.stroke();break;
    case'barrel':ctx.fillStyle='#423a32';ctx.fillRect(x+3,y,p.w-6,p.h);ctx.fillStyle='#65584b';ctx.fillRect(x,y+5,p.w,4);ctx.fillRect(x,y+p.h-9,p.w,4);break;
    case'desk':ctx.fillStyle='#303737';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#141817';ctx.fillRect(x+5,y+8,p.w-10,p.h-12);ctx.fillStyle='#859087';ctx.fillRect(x+12,y+13,28,14);break;
    case'tank':ctx.fillStyle='#2b3231';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#73857f';ctx.fillRect(x+6,y+8,p.w-12,p.h-17);ctx.fillStyle='rgba(151,188,176,.12)';ctx.fillRect(x+10,y+13,p.w-20,p.h-28);break;
    case'cell':ctx.fillStyle='#0d1010';ctx.fillRect(x,y,p.w,p.h);ctx.strokeStyle='#58605c';ctx.strokeRect(x,y,p.w,p.h);for(let i=12;i<p.w;i+=15)ctx.fillRect(x+i,y,2,p.h);break;
    case'chair':ctx.fillStyle='#493c34';ctx.fillRect(x+7,y,p.w-14,20);ctx.fillRect(x,y+18,p.w,8);break;
    case'blood':ctx.fillStyle='rgba(91,28,28,.72)';ctx.fillRect(x+4,y+7,p.w-8,p.h-14);ctx.fillRect(x,y+11,7,7);break;
    case'pipe':ctx.fillStyle='#3d4441';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#727a75';ctx.fillRect(x,y,p.w,2);break;
    case'sign':ctx.fillStyle='#252b29';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#a2a79d';ctx.font='7px monospace';ctx.fillText('B L A C K R I D G E',x+8,y+17);break;
    case'lamp':ctx.fillStyle=`rgba(214,214,176,${.65+.2*Math.sin(G.state.time*6+p.x)})`;ctx.fillRect(x,y,p.w,p.h);break;
    case'vent':ctx.fillStyle='#2b302e';ctx.fillRect(x,y,p.w,p.h);ctx.fillStyle='#151817';for(let i=5;i<p.w-3;i+=7)ctx.fillRect(x+i,y+4,2,p.h-8);break;
  }
}

function breach(){
  const g=G.crawlGap;if(!g)return;
  const x=px(g.x),y=py(g.y);
  // This is a real narrow maintenance passage, not a fake doorway.
  ctx.fillStyle='#232724';ctx.fillRect(x-6,y-5,28,50);
  ctx.fillStyle='#343a36';ctx.fillRect(x-1,y+1,18,38);
  ctx.fillStyle='#171b19';ctx.fillRect(x+2,y+4,12,32);
  ctx.fillStyle='#656a66';ctx.fillRect(x-6,y-5,5,12);ctx.fillRect(x-6,y+33,5,12);ctx.fillRect(x+21,y-5,4,13);ctx.fillRect(x+21,y+32,4,13);
  ctx.fillStyle='#9a6f4d';ctx.fillRect(x+4,y+6,2,27);ctx.fillRect(x+11,y+9,2,24);
  ctx.fillStyle='#b6a56d';ctx.fillRect(x-12,y-11,28,6);ctx.fillStyle='#151716';ctx.font='5px monospace';ctx.fillText('SVC',x-3,y-6);
}
function walls(){for(const w of G.walls){const x=px(w.x),y=py(w.y);ctx.fillStyle='#252928';ctx.fillRect(x,y,w.w,w.h);ctx.fillStyle='#454a47';ctx.fillRect(x,y,w.w,3);ctx.fillStyle='#111313';ctx.fillRect(x,y+w.h-4,w.w,4);}breach();}

function doorOne(d,foreground=false){
  const x=px(d.x),y=py(d.y);
  // Metallic threshold makes an open doorway readable instead of a black slit.
  ctx.fillStyle=foreground?'#505753':'#59605c';ctx.fillRect(x-4,y-3,3,d.h+6);ctx.fillRect(x+d.w+1,y-3,3,d.h+6);
  ctx.fillStyle='#303633';ctx.fillRect(x-1,y-2,d.w+2,3);ctx.fillRect(x-1,y+d.h-1,d.w+2,3);
  if(d.open){
    ctx.fillStyle='rgba(123,132,124,.24)';ctx.fillRect(x-2,y+4,d.w+4,d.h-8);
    const panelY=d.hinge==='top'?y-3:y+d.h-13;ctx.fillStyle='#3c423f';ctx.fillRect(x-8,panelY,8,16);ctx.fillStyle='#737a75';ctx.fillRect(x-7,panelY+3,5,2);ctx.fillRect(x-7,panelY+10,5,2);
  }else{
    ctx.fillStyle='#484e4b';ctx.fillRect(x,y,d.w,d.h);ctx.fillStyle='#202422';for(let yy=5;yy<d.h;yy+=9)ctx.fillRect(x+2,y+yy,d.w-4,3);ctx.fillStyle='#b1a277';ctx.fillRect(x+2,y+d.h/2,3,3);
  }
}
function doors(){G.doors.forEach(d=>doorOne(d));}
function doorForeground(){const z=G.zoneAt(G.player.x,G.player.y);if(!z)return;for(const d of G.doors)if(d.zones.includes(z.id))doorOne(d,true);}

function survivor(e,me=false){const x=px(e.x),y=py(e.y),inj=e.health===1||e.injured;ctx.save();ctx.translate(x,y+Math.round(Math.sin(e.anim*Math.PI*2)));if(e.hitBoost>0){ctx.strokeStyle='rgba(185,210,190,.28)';ctx.strokeRect(-13,-23,26,42);}ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(-8,9,16,5);ctx.fillStyle=inj?'#342929':'#2a3033';ctx.fillRect(-6,4,5,9);ctx.fillRect(2,4,5,9);ctx.fillStyle=me?'#65756c':'#56645f';ctx.fillRect(-8,-8,16,14);ctx.fillStyle=inj?'#4b3534':'#303b37';ctx.fillRect(-7,-6,4,10);ctx.fillRect(3,-6,4,10);ctx.fillStyle='#c4ad93';ctx.fillRect(-5,-16,10,9);ctx.fillStyle='#2a2420';ctx.fillRect(-6,-18,12,4);if(inj){ctx.fillStyle='#702c2a';ctx.fillRect(5,-2,3,5);}ctx.restore();}
function monster(e,me=false){const x=px(e.x),y=py(e.y),idle=Math.sin(e.anim*.7),twitch=Math.sin(G.state.time*13+e.x)>.985?2:0;ctx.save();ctx.translate(x,y+Math.round(idle));ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(-11,11,23,6);ctx.fillStyle='#242927';ctx.fillRect(-8,3,6,13);ctx.fillRect(3,2,6,14);ctx.fillStyle='#303634';ctx.fillRect(-10,-12,18,17);ctx.fillStyle='#272c2a';ctx.fillRect(8,-8,5,19);ctx.fillRect(9,8,6,9+twitch);ctx.fillStyle='#353a37';ctx.fillRect(-15,-11,5,14);ctx.save();ctx.translate(2+twitch,-22);ctx.rotate(-.1-.015*idle);ctx.fillStyle='#b8b5a7';ctx.fillRect(-7,-6,13,11);ctx.fillStyle='#060707';ctx.fillRect(-4,-2,2,2);ctx.fillRect(2,-2,2,2);ctx.restore();if(me){ctx.strokeStyle='rgba(185,90,80,.26)';ctx.strokeRect(-17,-30,34,50);}ctx.restore();}
function entities(){for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?monster(b):survivor(b);}G.player.role==='monster'?monster(G.player,true):G.player.health>0&&survivor(G.player,true);}

function cells(){for(const c of G.cells){if(c.collected)continue;const x=px(c.x),y=py(c.y),p=.5+.5*Math.sin(G.state.time*4+c.x);ctx.fillStyle='rgba(158,184,162,.08)';ctx.fillRect(x-13,y-13,26,26);ctx.fillStyle='#28342d';ctx.fillRect(x-6,y-10,12,20);ctx.fillStyle=`rgba(164,205,173,${.55+.4*p})`;ctx.fillRect(x-3,y-6,6,12);}}
function extraction(){const x=px(G.extraction.x),y=py(G.extraction.y),ready=G.player.cells===3;ctx.strokeStyle=ready?'rgba(176,205,178,.65)':'rgba(90,98,94,.35)';ctx.strokeRect(x-22,y-13,44,26);ctx.fillStyle=ready?'rgba(139,180,148,.14)':'rgba(50,56,53,.12)';ctx.fillRect(x-20,y-11,40,22);}

function cutPortal(z,d){
  if(!d.open||!d.zones.includes(z.id))return;
  const cx=d.x+d.w/2,cy=d.y+d.h/2,dist=Math.hypot(G.player.x-cx,G.player.y-cy);
  if(dist>155)return;
  const otherId=d.zones.find(id=>id!==z.id),other=G.zoneById(otherId);if(!other)return;
  const ocx=other.x+other.w/2,side=ocx<cx?-1:1;
  const closeness=Math.max(0,1-dist/155),depth=72+closeness*105,near=18,far=34+closeness*30;
  const x0=px(cx+side*3),x1=px(cx+side*depth),yy=py(cy);
  dctx.save();dctx.globalCompositeOperation='destination-out';
  dctx.beginPath();dctx.rect(px(other.x),py(other.y),other.w,other.h);dctx.clip();
  dctx.fillStyle=`rgba(0,0,0,${.78+closeness*.22})`;
  dctx.beginPath();dctx.moveTo(x0,yy-near);dctx.lineTo(x0,yy+near);dctx.lineTo(x1,yy+far);dctx.lineTo(x1,yy-far);dctx.closePath();dctx.fill();
  dctx.restore();
}
function cutBreach(z){
  const g=G.crawlGap;if(!g||!g.zones.includes(z.id))return;
  const cx=g.x+g.w/2,cy=g.y+g.h/2,dist=Math.hypot(G.player.x-cx,G.player.y-cy);if(dist>125)return;
  const otherId=g.zones.find(id=>id!==z.id),other=G.zoneById(otherId);if(!other)return;
  const side=(other.x+other.w/2)<cx?-1:1,closeness=Math.max(0,1-dist/125),depth=52+closeness*76;
  const x0=px(cx+side*2),x1=px(cx+side*depth),yy=py(cy);
  dctx.save();dctx.globalCompositeOperation='destination-out';dctx.beginPath();dctx.rect(px(other.x),py(other.y),other.w,other.h);dctx.clip();
  dctx.fillStyle=`rgba(0,0,0,${.72+closeness*.2})`;dctx.beginPath();dctx.moveTo(x0,yy-12);dctx.lineTo(x0,yy+12);dctx.lineTo(x1,yy+27);dctx.lineTo(x1,yy-27);dctx.closePath();dctx.fill();dctx.restore();
}
function darkness(){
  const z=G.zoneAt(G.player.x,G.player.y);
  dctx.globalCompositeOperation='source-over';dctx.clearRect(0,0,G.W,G.H);dctx.fillStyle='#000';dctx.fillRect(0,0,G.W,G.H);
  if(z){
    dctx.save();dctx.globalCompositeOperation='destination-out';dctx.beginPath();dctx.rect(px(z.x),py(z.y),z.w,z.h);dctx.clip();
    const x=px(G.player.x),y=py(G.player.y),r=z.id==='corridor'?220:330,g=dctx.createRadialGradient(x,y,24,x,y,r);g.addColorStop(0,'#000');g.addColorStop(.62,'#000');g.addColorStop(.84,'rgba(0,0,0,.68)');g.addColorStop(1,'rgba(0,0,0,0)');dctx.fillStyle=g;dctx.fillRect(px(z.x),py(z.y),z.w,z.h);dctx.restore();
    for(const d of G.doors)cutPortal(z,d);
    cutBreach(z);
  }
  ctx.drawImage(G.darknessCanvas,0,0);
}

G.render=()=>{ctx.fillStyle='#030404';ctx.fillRect(0,0,G.W,G.H);ctx.save();if(G.state.shake>0){const s=G.state.shake*1.2;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);G.state.shake=Math.max(0,G.state.shake-.14);}G.zones.forEach(floor);G.props.forEach(prop);cells();extraction();walls();doors();entities();darkness();doorForeground();ctx.restore();};
G.renderMenu=()=>{G.state.camera.x+=(610-G.W/2-G.state.camera.x)*.02;G.state.camera.y+=(360-G.H/2-G.state.camera.y)*.02;ctx.fillStyle='#030404';ctx.fillRect(0,0,G.W,G.H);G.zones.forEach(floor);G.props.forEach(prop);walls();doors();monster({x:628,y:270,anim:G.state.time*.4});ctx.fillStyle='rgba(0,0,0,.64)';ctx.fillRect(0,0,G.W,G.H);};
})();
