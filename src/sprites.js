'use strict';
(() => {
const G=window.MISPLACED,S=G.state,ctx=G.ctx;
const px=x=>Math.round(x-S.camera.x),py=y=>Math.round(y-S.camera.y);
G.customSprites=true;

const chars={
  Mara:{jacket:'#8f4e55',jacket2:'#593139',pants:'#313538',hair:'#38231f',skin:'#c79e83',accent:'#d7b56f',boots:'#171a1b',pack:'#4b3835',style:'pony'},
  Eli:{jacket:'#4f7580',jacket2:'#304950',pants:'#2e3538',hair:'#282623',skin:'#b9876d',accent:'#8bc3c7',boots:'#15191a',pack:'#35464a',style:'beanie'},
  Nox:{jacket:'#6a5c86',jacket2:'#40374f',pants:'#2b2d36',hair:'#17171b',skin:'#b98f78',accent:'#b7a2dc',boots:'#141518',pack:'#373140',style:'hood'},
  Iris:{jacket:'#707951',jacket2:'#454b34',pants:'#32352d',hair:'#4a2b23',skin:'#d0a78b',accent:'#b8ca86',boots:'#171a16',pack:'#454831',style:'braid'},
  default:{jacket:'#65776d',jacket2:'#3a4942',pants:'#303638',hair:'#2a2420',skin:'#c5aa91',accent:'#aab6a6',boots:'#15191a',pack:'#38413c',style:'short'}
};

function visible(e){
  if(e===G.player)return true;
  const pz=G.zoneAt(G.player.x,G.player.y),ez=G.zoneAt(e.x,e.y);if(!pz||!ez||pz.id!==ez.id)return false;
  const d=G.distance(G.player,e),r=pz.id==='corridor'?196:278;return d<r;
}
function dir(e){
  const dx=e.dirX||0,dy=e.dirY||1;
  if(Math.abs(dx)>.55)return dx>0?'right':'left';
  return dy<0?'back':'front';
}
function R(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function O(x,y,w,h,c='#0d1111'){ctx.strokeStyle=c;ctx.lineWidth=1;ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,Math.round(w)-1,Math.round(h)-1);}
function shadow(w,h=6){R(-w/2,17,w,h,'rgba(0,0,0,.55)');R(-w/2-3,20,w+6,2,'rgba(0,0,0,.25)');}
function statusOutline(e,w,h,me){
  if((e.stun||0)>0){ctx.strokeStyle='rgba(232,199,91,.82)';ctx.strokeRect(-w/2-2,-h+7,w+4,h+15);}
  else if((e.hitBoost||0)>0){ctx.strokeStyle='rgba(185,216,194,.42)';ctx.strokeRect(-w/2-1,-h+8,w+2,h+13);}
  else if(me){ctx.strokeStyle='rgba(182,210,190,.25)';ctx.strokeRect(-w/2,-h+9,w,h+11);}
}
function drawFace(P,f,inj){
  if(f==='back')return;
  R(-6,-26,12,9,P.skin);R(-5,-27,10,2,'#e3c2a5');
  if(f==='left'){R(-4,-22,2,2,'#171818');R(3,-18,2,1,'#7e5144');}
  else if(f==='right'){R(2,-22,2,2,'#171818');R(-5,-18,2,1,'#7e5144');}
  else{R(-4,-22,2,2,'#171818');R(2,-22,2,2,'#171818');R(-1,-18,3,1,'#7b4e42');}
  if(inj)R(5,-20,2,4,'#7d2d2b');
}
function drawHair(P,f){
  R(-8,-31,16,7,P.hair);
  if(f==='back'){R(-9,-28,18,8,P.hair);R(-8,-20,4,4,P.hair);R(4,-20,4,4,P.hair);}
  else{R(-8,-28,3,7,P.hair);R(5,-28,3,5,P.hair);}
  if(P.style==='pony'){R(f==='left'?7:-9,-24,4,11,P.hair);R(f==='left'?8:-10,-14,3,6,P.hair);}
  if(P.style==='beanie'){R(-9,-33,18,5,'#26343a');R(-7,-36,14,4,'#35505a');R(5,-37,3,3,'#4d6d77');}
  if(P.style==='hood'){R(-10,-33,20,7,P.jacket2);R(-9,-28,3,8,P.jacket2);R(6,-28,3,8,P.jacket2);}
  if(P.style==='braid'){R(f==='right'?-10:7,-24,3,11,P.hair);R(f==='right'?-10:7,-13,3,4,'#6b4035');}
}
function drawPack(P,f){
  if(f==='front')return;
  if(f==='back'){R(-8,-15,16,14,P.pack);O(-8,-15,16,14,'#222b28');R(-5,-12,10,3,P.jacket2);R(-6,-4,12,2,P.accent);}
  else{const sx=f==='left'?5:-10;R(sx,-14,6,13,P.pack);O(sx,-14,6,13,'#222827');R(sx+2,-11,2,7,P.accent);}
}
function survivor(e,me=false){
  if(!visible(e)||e.health<=0||e.alive===false)return;
  const P=chars[e.name]||chars.default,f=dir(e),walk=Math.sin((e.anim||0)*Math.PI*2),phase=Math.round(walk*2),bob=Math.round(Math.abs(walk)*1.2),inj=e.health===1||e.injured;
  ctx.save();ctx.translate(px(e.x),py(e.y)-bob);
  shadow(28,6);
  const l1=Math.max(0,phase),l2=Math.max(0,-phase);
  R(-8,4+l1,6,12,inj?'#392f31':P.pants);R(2,4+l2,6,12,inj?'#392f31':P.pants);
  R(-8,9+l1,6,3,'#22272a');R(2,9+l2,6,3,'#22272a');
  R(-9,14+l1,8,4,P.boots);R(1,14+l2,8,4,P.boots);
  R(-9,17+l1,9,2,'#090b0c');R(1,17+l2,9,2,'#090b0c');
  R(-11,-13,22,20,'#151a1a');
  R(-10,-12,20,18,P.jacket2);R(-8,-11,16,16,P.jacket);
  R(-3,-10,6,14,'#29302f');R(-1,-10,2,14,'#9ca59e');
  R(-8,2,16,3,'#222728');R(-7,3,4,2,P.accent);
  R(-10,-10,4,7,'#27312f');R(6,-10,4,7,'#27312f');
  const as=Math.round(walk*2);
  if(f==='left'){
    R(-14,-10-as,5,15,P.jacket2);R(9,-7+as,4,11,P.jacket2);R(-14,3-as,5,4,P.skin);R(9,3+as,4,3,P.skin);
  }else if(f==='right'){
    R(9,-10+as,5,15,P.jacket2);R(-13,-7-as,4,11,P.jacket2);R(9,3+as,5,4,P.skin);R(-13,3-as,4,3,P.skin);
  }else{
    R(-14,-9-as,4,14,P.jacket2);R(10,-9+as,4,14,P.jacket2);R(-14,4-as,4,4,P.skin);R(10,4+as,4,4,P.skin);
  }
  drawPack(P,f);
  R(-3,-16,6,5,P.skin);drawFace(P,f,inj);drawHair(P,f);
  if(f!=='back'){R(5,-8,4,6,'#1a2020');R(6,-7,2,2,P.accent);R(8,-12,1,4,'#87918b');}
  if(e.name==='Mara'){R(-9,-5,3,8,'#b35e61');R(5,-1,4,5,'#5d3838');}
  if(e.name==='Eli'){R(-6,-14,12,3,'#394f56');R(6,-5,3,7,'#91b8b8');}
  if(e.name==='Nox'){R(-10,-14,20,3,'#332d40');R(-6,-5,4,6,'#8a78aa');}
  if(e.name==='Iris'){R(-9,-9,18,2,'#8d9668');R(5,-6,3,8,'#c2cb8b');}
  if(e.inventory){R(-3,-4,6,6,'#c6ad63');R(-2,-3,4,4,'#5d5132');R(-1,-2,2,2,'#dfca83');}
  if(inj){R(7,-2,4,8,'#7f2b2b');R(6,6,3,3,'#552020');R(-4,13+l1,2,2,'#6f2726');}
  statusOutline(e,32,48,me);
  ctx.restore();
}

function monster(e,me=false){
  if(!visible(e)||e.alive===false)return;
  const f=dir(e),walk=Math.sin((e.anim||0)*Math.PI*1.35),step=Math.round(walk*2),bob=Math.round(Math.abs(walk)*.8),twitch=Math.sin(S.time*16.5+e.x)>.991?2:0;
  ctx.save();ctx.translate(px(e.x),py(e.y)-bob);
  shadow(38,8);
  R(-10,5+Math.max(0,step),7,17,'#202725');R(3,2+Math.max(0,-step),8,20,'#1a211f');
  R(-11,19+Math.max(0,step),10,5,'#0b0e0d');R(2,19+Math.max(0,-step),12,5,'#090c0b');
  R(-8,8,4,5,'#39413d');R(5,6,5,4,'#323936');
  R(-15,-18,27,25,'#111615');
  R(-14,-17,25,23,'#2b3431');R(-11,-16,18,20,'#37423e');
  R(-12,-4,21,4,'#171c1a');R(-9,0,4,7,'#27302d');R(2,0,7,9,'#222a28');
  R(-14,-14,7,5,'#47514d');R(5,-16,8,6,'#252c2a');
  R(-4,-15,3,15,'#59615d');R(1,-13,2,10,'#202624');
  R(-10,-10,19,2,'#1a1f1d');R(-8,-9,3,3,'#73776f');R(4,-9,3,3,'#73776f');
  const leftLong=f!=='right';
  const longX=leftLong?-20:13,shortX=leftLong?10:-17;
  R(longX,-14,7,27+twitch,'#232b29');R(longX+1,-12,5,22+twitch,'#303936');
  R(shortX,-13,6,18,'#252d2b');R(shortX+1,-11,4,13,'#39413e');
  R(longX-1,11+twitch,9,6,'#b7b3a5');R(shortX,3,7,5,'#9d9c92');
  R(longX+1,15+twitch,2,4,'#d3cdbb');R(longX+5,15+twitch,2,5,'#d3cdbb');
  const hx=(f==='left'?-2:f==='right'?6:3)+twitch;
  R(-1,-23,8,8,'#777d78');R(2,-26,6,5,'#8b8e87');
  ctx.save();ctx.translate(hx,-34);ctx.rotate(-.09-.025*Math.sin(S.time*1.8));
  R(-10,-8,18,15,'#8e8b81');R(-9,-9,16,14,'#d2cfc2');
  R(-7,-7,12,2,'#e9e4d2');R(-8,4,14,3,'#aaa79c');
  R(-7,-4,2,6,'#b8b5aa');R(5,-5,2,8,'#9d9a90');R(-2,4,4,1,'#77746d');
  if(f!=='back'){R(-6,-2,3,3,'#050606');R(2,-2,3,3,'#050606');R(-5,-1,1,1,'#4d1f1c');R(3,-1,1,1,'#4d1f1c');}
  R(-1,2,2,1,'#675b56');ctx.restore();
  R(-11,-5,3,2,'#786b5e');R(6,-2,3,2,'#786b5e');R(-7,4,2,4,'#101413');
  R(-2,-16,1,4,'#908c79');R(-2,-10,1,3,'#908c79');
  R(7,5,3,4,'#472524');
  if((e.rushTime||0)>0){ctx.strokeStyle='rgba(154,52,47,.52)';ctx.strokeRect(-24,-47,47,73);R(-25,-8,3,22,'rgba(125,36,33,.35)');}
  if((e.stun||0)>0){ctx.strokeStyle='rgba(229,194,79,.76)';ctx.strokeRect(-25,-48,48,74);}
  else if(me){ctx.strokeStyle='rgba(176,67,59,.24)';ctx.strokeRect(-23,-46,44,70);}
  ctx.restore();
}

function draw(){
  for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?monster(b,false):survivor(b,false);}
  if(G.player.role==='monster')monster(G.player,true);else if(G.player.health>0)survivor(G.player,true);
}
const baseRender=G.render;
G.render=()=>{baseRender();draw();};
})();
