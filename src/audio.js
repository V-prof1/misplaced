'use strict';
(() => {
const G=window.MISPLACED,S=G.state;
let ac=null,master=null,ambGain=null,hum1=null,hum2=null,noiseBuf=null,unlocked=false;
function ensure(){
  if(ac)return ac;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ac=new AC();master=ac.createGain();master.gain.value=.42;master.connect(ac.destination);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const data=noiseBuf.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  startAmbience();return ac;
}
function unlock(){const a=ensure();if(!a)return;if(a.state==='suspended')a.resume();unlocked=true;}
addEventListener('pointerdown',unlock,{once:false,passive:true});addEventListener('keydown',unlock,{once:false});
function gain(v=.1){const g=ac.createGain();g.gain.value=v;g.connect(master);return g;}
function tone(freq,dur=.12,type='sine',vol=.08,slide=0){if(!unlocked||!ensure())return;const o=ac.createOscillator(),g=gain(0);o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),ac.currentTime+dur);g.gain.setValueAtTime(0.0001,ac.currentTime);g.gain.exponentialRampToValueAtTime(vol,ac.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);o.connect(g);o.start();o.stop(ac.currentTime+dur+.02);}
function noise(dur=.08,vol=.06,cut=1200){if(!unlocked||!ensure())return;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=gain(0);s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=cut;g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);s.connect(f);f.connect(g);s.start();s.stop(ac.currentTime+dur+.01);}
function startAmbience(){ambGain=ac.createGain();ambGain.gain.value=.016;ambGain.connect(master);hum1=ac.createOscillator();hum2=ac.createOscillator();hum1.type='sine';hum2.type='triangle';hum1.frequency.value=48;hum2.frequency.value=96.3;hum1.connect(ambGain);hum2.connect(ambGain);hum1.start();hum2.start();}
const sfx={
  step(){noise(.045,.025,650);tone(72,.05,'sine',.018,-12);},
  sprint(){noise(.055,.032,780);tone(78,.055,'sine',.021,-14);},
  attack(){noise(.09,.075,1700);tone(120,.13,'sawtooth',.055,-70);},
  hit(){noise(.12,.095,850);tone(65,.18,'square',.06,-30);},
  door(open=true){tone(open?240:180,.08,'square',.035,-70);setTimeout(()=>noise(.06,.045,1000),45);},
  pickup(){tone(620,.08,'triangle',.035,160);tone(910,.06,'sine',.018,40);},
  item(){tone(430,.09,'triangle',.035,220);},
  pallet(){noise(.11,.085,900);tone(95,.14,'square',.04,-30);},
  vault(){noise(.06,.038,1200);tone(160,.07,'triangle',.02,-40);},
  sense(){tone(330,.22,'sine',.05,190);setTimeout(()=>tone(580,.18,'sine',.035,-80),90);},
  rush(){noise(.25,.04,2200);tone(88,.3,'sawtooth',.025,70);},
  blackout(){tone(75,.65,'sawtooth',.065,-35);setTimeout(()=>{noise(.18,.08,500);tone(48,.7,'square',.035,-18);},140);},
  radio(){tone(760,.055,'square',.026,-120);setTimeout(()=>noise(.07,.025,2500),55);setTimeout(()=>tone(940,.045,'square',.018,-160),115);},
  heartbeat(strong=false){tone(strong?58:52,.11,'sine',strong?.055:.034,-8);setTimeout(()=>tone(strong?54:49,.1,'sine',strong?.047:.028,-6),145);}
};
G.audio=sfx;
document.addEventListener('misplaced-radio',()=>sfx.radio());
function wrap(name,after){const fn=G[name];if(typeof fn!=='function')return;G[name]=function(...args){const r=fn.apply(this,args);try{after(r,args);}catch{}return r;};}
wrap('monsterAttack',()=>sfx.attack());
wrap('applyHitBoost',()=>sfx.hit());
wrap('requestDoor',(r,args)=>{if(r)sfx.door(!!args[2]);});
wrap('usePlayerItem',(r)=>{if(r!==false)sfx.item();});
wrap('tryContextInteract',(r,args)=>{if(r){const a=args[0];const o=G.pallets?.find(p=>Math.hypot(a.x-(p.x+p.w/2),a.y-(p.y+p.h/2))<45);o?sfx.pallet():sfx.vault();}});
wrap('useSense',(r)=>{if(r!==false)sfx.sense();});
wrap('useRush',(r)=>{if(r!==false)sfx.rush();});
wrap('useBlackout',(r)=>{if(r!==false)sfx.blackout();});
const inv=new WeakMap();let stepT=0,heartT=0,ambientT=3,lastX=G.player.x,lastY=G.player.y;
const baseRender=G.render;
G.render=()=>{
  baseRender();if(!S.running||!unlocked)return;
  const now=performance.now()/1000,p=G.player,dx=p.x-lastX,dy=p.y-lastY,moved=Math.hypot(dx,dy);lastX=p.x;lastY=p.y;
  const moving=moved>.1,fast=moving&&S.input?.sprint&&p.stamina>0;
  if(moving&&now>stepT){fast?sfx.sprint():sfx.step();stepT=now+(fast?.255:.39);}
  for(const a of [p,...G.bots]){if(!a||a.role!=='survivor')continue;const old=inv.get(a)||null;if(a.inventory&&a.inventory!==old&&a===p)sfx.pickup();inv.set(a,a.inventory||null);}
  if(S.role==='survivor'){
    const k=G.bots.find(b=>b.alive&&b.role==='monster');if(k){const same=G.zoneAt(k.x,k.y)?.id===G.zoneAt(p.x,p.y)?.id,d=G.distance(k,p);if(same&&d<210&&now>heartT){const strong=d<105||G.blackoutState?.time>0;sfx.heartbeat(strong);heartT=now+(strong?.62:1.0);}}
  }
  if(now>ambientT){ambientT=now+4+Math.random()*7;if(Math.random()<.55){tone(145+Math.random()*90,.06,'square',.009,-30);noise(.04,.008,1600);}}
  if(ambGain){const target=G.blackoutState?.time>0?.009:.016;ambGain.gain.setTargetAtTime(target,ac.currentTime,.4);}
};
})();
