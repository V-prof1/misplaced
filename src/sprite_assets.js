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
const survivorParts=[
  'survivors.b64.0','survivors.b64.1',
  'survivors.b64.2a','survivors.b64.2b','survivors.b64.2c','survivors.b64.2d',
  'survivors.b64.3','survivors.b64.4','survivors.b64.5'
];
const monsterParts=[
  'misplaced.b64.0a','misplaced.b64.0b','misplaced.b64.0c','misplaced.b64.0d',
  'misplaced.b64.1a','misplaced.b64.1b','misplaced.b64.1c','misplaced.b64.1d',
  'misplaced.b64.2',
  'misplaced.b64.3a0','misplaced.b64.3a1','misplaced.b64.3a2','misplaced.b64.3a3',
  'misplaced.b64.3b','misplaced.b64.3c'
];
Promise.all([
  join(survivorParts).then(imageFromBase64),
  join(monsterParts).then(imageFromBase64)
]).then(([survivors,monster])=>{
  if(survivors.width!==1536||survivors.height!==280)throw new Error(`Atlas survivor inesperado: ${survivors.width}x${survivors.height}`);
  if(monster.width!==576||monster.height!==420)throw new Error(`Atlas monster inesperado: ${monster.width}x${monster.height}`);
  G.spriteAssets.survivors=survivors;
  G.spriteAssets.monster=monster;
  G.spriteAssets.ready=true;
  dispatchEvent(new Event('misplaced-sprite-assets-ready'));
}).catch(err=>{G.spriteAssets.error=err;console.error('[MISPLACED] sprite atlas:',err);});
})();
