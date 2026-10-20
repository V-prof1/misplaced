'use strict';
(() => {
const G=window.MISPLACED,S=G.state,ctx=G.ctx;
const px=x=>Math.round(x-S.camera.x),py=y=>Math.round(y-S.camera.y);
const palettes={
  Mara:{coat:'#8a5a5c',coat2:'#56383a',hair:'#2f211d',skin:'#c9a48c',accent:'#d7b26e'},
  Eli:{coat:'#4e6e78',coat2:'#31464e',hair:'#302b25',skin:'#b98e73',accent:'#8fc0c2'},
  Nox:{coat:'#6a5d82',coat2:'#41394f',hair:'#17171a',skin:'#ba927b',accent:'#b3a0d4'},
  Iris:{coat:'#6f7651',coat2:'#454a34',hair:'#452a23',skin:'#d0aa8f',accent:'#b8c988'},
  default:{coat:'#65756c',coat2:'#3b4942',hair:'#2a2420',skin:'#c4ad93',accent:'#aab6a6'}
};
function visible(e){
  if(e===G.player)return true;
  const pz=G.zoneAt(G.player.x,G.player.y),ez=G.zoneAt(e.x,e.y);if(!pz||!ez||pz.id!==ez.id)return false;
  const d=G.distance(G.player,e),r=pz.id==='corridor'?186:260;return d<r;
}
function dirFrame(e){
  const dx=e.dirX||0,dy=e.dirY||1;
  if(Math.abs(dx)>.58)return dx>0?'right':'left';
  return dy<0?'back':'front';
}
function pixelShadow(w=22,h=7){ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(-w/2,13,w,h);ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(-w/2-3,16,w+6,3);}
function survivorSprite(e,me=false){
  if(!visible(e)||e.health<=0||e.alive===false)return;
  const P=palettes[e.name]||palettes.default,frame=dirFrame(e),walk=Math.sin((e.anim||0)*Math.PI*2),bob=Math.round(Math.abs(walk)*1.2),inj=e.health===1||e.injured;
  ctx.save();ctx.translate(px(e.x),py(e.y)-bob);
  pixelShadow(22,5);
  const stride=Math.round(walk*2);
  ctx.fillStyle=inj?'#382c2d':'#252d2e';ctx.fillRect(-7,4+Math.max(0,stride),5,11);ctx.fillRect(2,4+Math.max(0,-stride),5,11);
  ctx.fillStyle='#151a1b';ctx.fillRect(-8,13+Math.max(0,stride),7,3);ctx.fillRect(1,13+Math.max(0,-stride),7,3);
  ctx.fillStyle=P.coat2;ctx.fillRect(-9,-10,18,16);ctx.fillStyle=P.coat;ctx.fillRect(-7,-9,14,14);
  ctx.fillStyle='#252c2a';if(frame==='back')ctx.fillRect(-6,-8,12,10);else ctx.fillRect(-8,-7,3,9);
  ctx.fillStyle=P.coat2;
  if(frame==='left'){ctx.fillRect(-12,-7,5,13);ctx.fillRect(7,-5,4,10);}else if(frame==='right'){ctx.fillRect(7,-7,5,13);ctx.fillRect(-11,-5,4,10);}else{ctx.fillRect(-12,-7,4,12);ctx.fillRect(8,-7,4,12);}
  ctx.fillStyle=P.skin;ctx.fillRect(-12,4,4,3);ctx.fillRect(8,4,4,3);
  ctx.fillStyle=P.skin;ctx.fillRect(-5,-14,10,7);ctx.fillRect(-7,-23,14,11);
  ctx.fillStyle=P.hair;
  if(frame==='back'){ctx.fillRect(-8,-24,16,8);ctx.fillRect(-8,-18,3,6);ctx.fillRect(5,-18,3,6);}else{ctx.fillRect(-8,-24,16,5);ctx.fillRect(-8,-21,3,5);ctx.fillRect(5,-21,3,4);}
  if(frame!=='back'){
    ctx.fillStyle='#161717';if(frame==='left'){ctx.fillRect(-4,-18,2,2);}else if(frame==='right'){ctx.fillRect(2,-18,2,2);}else{ctx.fillRect(-4,-18,2,2);ctx.fillRect(2,-18,2,2);}
  }
  ctx.fillStyle=P.accent;ctx.fillRect(5,-7,2,3);
  if(e.inventory){ctx.fillStyle='#c6ad63';ctx.fillRect(-2,-5,4,4);ctx.fillStyle='#5d5132';ctx.fillRect(-1,-4,2,2);}
  if(inj){ctx.fillStyle='#852f2c';ctx.fillRect(6,-4,3,7);ctx.fillRect(5,5,2,2);}
  if((e.stun||0)>0){ctx.strokeStyle='rgba(231,199,92,.78)';ctx.strokeRect(-14,-27,28,45);}else if(e.hitBoost>0){ctx.strokeStyle='rgba(187,215,194,.38)';ctx.strokeRect(-13,-26,26,43);}
  if(me){ctx.strokeStyle='rgba(182,205,188,.28)';ctx.strokeRect(-11,-25,22,41);}
  ctx.restore();
}
function monsterSprite(e,me=false){
  if(!visible(e)||e.alive===false)return;
  const frame=dirFrame(e),walk=Math.sin((e.anim||0)*Math.PI*1.3),bob=Math.round(Math.abs(walk)*.8),twitch=Math.sin(S.time*17+e.x)>.992?2:0;
  ctx.save();ctx.translate(px(e.x),py(e.y)-bob);
  pixelShadow(31,7);
  ctx.fillStyle='#1c2221';ctx.fillRect(-8,5,6,14+Math.max(0,Math.round(walk*2)));ctx.fillRect(3,3,7,17+Math.max(0,Math.round(-walk*2)));
  ctx.fillStyle='#0d1110';ctx.fillRect(-9,17,8,4);ctx.fillRect(2,18,10,4);
  ctx.fillStyle='#252c2a';ctx.fillRect(-12,-14,21,21);ctx.fillStyle='#343d39';ctx.fillRect(-9,-12,15,17);ctx.fillStyle='#181d1c';ctx.fillRect(-10,-1,18,4);
  ctx.fillStyle='#242a28';
  if(frame==='left'){ctx.fillRect(-17,-11,6,23+twitch);ctx.fillRect(8,-10,5,15);}else if(frame==='right'){ctx.fillRect(8,-11,6,23+twitch);ctx.fillRect(-16,-10,5,15);}else{ctx.fillRect(-17,-11,6,17);ctx.fillRect(8,-10,6,25+twitch);}
  ctx.fillStyle='#b7b4a6';if(frame==='left')ctx.fillRect(-18,10+twitch,7,5);else ctx.fillRect(8,11+twitch,7,5);
  ctx.fillStyle='#8f9188';ctx.fillRect(-1,-19,7,7);ctx.fillRect(2,-21,5,4);
  ctx.save();ctx.translate(3+twitch,-27);ctx.rotate(-.08-.025*Math.sin(S.time*1.7));
  ctx.fillStyle='#d0cdbf';ctx.fillRect(-8,-7,15,13);ctx.fillStyle='#a9a79b';ctx.fillRect(-7,3,13,3);ctx.fillStyle='#ece7d5';ctx.fillRect(-5,-5,9,2);
  ctx.fillStyle='#070808';ctx.fillRect(-5,-1,3,3);ctx.fillRect(2,-1,3,3);ctx.fillStyle='#5b4a43';ctx.fillRect(-1,3,2,1);ctx.restore();
  ctx.fillStyle='#4a514d';ctx.fillRect(-8,-8,3,5);ctx.fillRect(4,-12,3,4);ctx.fillStyle='#151918';ctx.fillRect(-4,0,3,4);
  if((e.rushTime||0)>0){ctx.strokeStyle='rgba(147,52,47,.45)';ctx.strokeRect(-20,-37,38,60);}
  if((e.stun||0)>0){ctx.strokeStyle='rgba(228,192,78,.7)';ctx.strokeRect(-21,-38,40,61);}
  if(me){ctx.strokeStyle='rgba(176,67,59,.25)';ctx.strokeRect(-19,-36,36,57);}
  ctx.restore();
}
function drawEnhanced(){
  for(const b of G.bots){if(!b.alive)continue;b.role==='monster'?monsterSprite(b,false):survivorSprite(b,false);}
  if(G.player.role==='monster')monsterSprite(G.player,true);else survivorSprite(G.player,true);
}
const baseRender=G.render;
G.render=()=>{baseRender();drawEnhanced();};
})();
