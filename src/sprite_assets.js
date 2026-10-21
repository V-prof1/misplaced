'use strict';
(() => {
const G=window.MISPLACED;
const V='061';
G.spriteAssets={ready:false,survivors:null,monster:null,error:null};
G.spriteAssetMeta={
  survivor:{cellW:48,cellH:56,colsPerCharacter:8,rows:{idle:0,walk:1,run:2,injured:3,item:4},characters:{Mara:0,Eli:1,Nox:2,Iris:3}},
  monster:{cellW:72,cellH:84,rows:{idle:0,walk:1,run:2,attack:3,stun:4}}
};
async function part(path){
  const r=await fetch(`assets/sprites/${path}?v=${V}`,{cache:'force-cache'});
  if(!r.ok)throw new Error(`Falha ao carregar sprite: ${path}`);
  return (await r.text()).trim();
}
async function join(paths){return (await Promise.all(paths.map(part))).join('');}
function imageFromBase64(data){return new Promise((resolve,reject)=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('PNG de sprite inválido'));img.src='data:image/png;base64,'+data;});}
const survivorParts=Array.from({length:6},(_,i)=>`survivors.b64.${i}`);
const monsterParts=['misplaced.b64.0','misplaced.b64.1','misplaced.b64.2','misplaced.b64.3a','misplaced.b64.3b','misplaced.b64.3c'];
Promise.all([
  join(survivorParts).then(imageFromBase64),
  join(monsterParts).then(imageFromBase64)
]).then(([survivors,monster])=>{
  G.spriteAssets.survivors=survivors;G.spriteAssets.monster=monster;G.spriteAssets.ready=true;
  dispatchEvent(new Event('misplaced-sprite-assets-ready'));
}).catch(err=>{G.spriteAssets.error=err;console.error('[MISPLACED] sprite atlas:',err);});
})();
