'use strict';
(() => {
const G=window.MISPLACED;
const V='064';
G.spriteAssets={ready:false,survivors:null,monster:null,error:null};
G.spriteAssetMeta={
  survivor:{cellW:24,cellH:32,phases:6,colsPerCharacter:8,rows:{idle:0,walk:1,run:2,injured:3,item:4,interact:5,death:6},characters:{Mara:0,Eli:1,Nox:2,Iris:3}},
  monster:{cellW:36,cellH:48,phases:6,rows:{idle:0,walk:1,run:2,rush:3,attack:4,stun:5,blackout:6,death:7}}
};
async function part(path){
  const r=await fetch(`assets/sprites/${path}?v=${V}`,{cache:'force-cache'});
  if(!r.ok)throw new Error(`Falha ao carregar sprite: ${path}`);
  return (await r.text()).trim();
}
async function join(paths){return (await Promise.all(paths.map(part))).join('');}
function imageFromBase64(data){return new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('PNG de sprite inválido'));img.src='data:image/png;base64,'+data;});}
const survivorParts=['v063_survivors.b64.0','v063_survivors.b64.1','v063_survivors.b64.2','v063_survivors.b64.3','v063_survivors.b64.4'];
const monsterParts=['v063_misplaced.b64.0','v063_misplaced.b64.1','v063_misplaced.b64.2'];
Promise.all([
  join(survivorParts).then(imageFromBase64),
  join(monsterParts).then(imageFromBase64)
]).then(([survivors,monster])=>{
  if(survivors.width!==768||survivors.height!==224)throw new Error(`Atlas survivor inesperado: ${survivors.width}x${survivors.height}`);
  if(monster.width!==288||monster.height!==384)throw new Error(`Atlas monster inesperado: ${monster.width}x${monster.height}`);
  G.spriteAssets.survivors=survivors;
  G.spriteAssets.monster=monster;
  G.spriteAssets.ready=true;
  dispatchEvent(new Event('misplaced-sprite-assets-ready'));
}).catch(err=>{G.spriteAssets.error=err;console.error('[MISPLACED] sprite atlas:',err);});
})();
