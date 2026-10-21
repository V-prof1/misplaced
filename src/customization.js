'use strict';
(() => {
const G=window.MISPLACED;
const KEY='misplaced_survivor_appearance_v1';
const hairStyles=['short','messy','pony','braids','bun','undercut'];
const outfits=['jacket','hoodie','coverall','vest','parka'];
const hairColors=['#241b18','#4b2d22','#8b5a32','#b08a5a','#d5c09a','#2a292e','#7b3434','#44506d'];
const eyeColors=['#5d7d87','#6e8a59','#7b5a3b','#8a6c91','#a6a7a0','#4e6f91'];
const outfitColors=['#596f68','#5a6f83','#75555c','#6c5d83','#69734d','#8a6947','#3e4447','#8a8580'];
const defaults={hair:'messy',hairColor:'#241b18',eyes:'#5d7d87',outfit:'jacket',outfitColor:'#596f68'};
const clone=o=>JSON.parse(JSON.stringify(o));
function validColor(v,list,fallback){return list.includes(v)?v:fallback;}
function sanitize(a={}){return{hair:hairStyles.includes(a.hair)?a.hair:defaults.hair,hairColor:validColor(a.hairColor,hairColors,defaults.hairColor),eyes:validColor(a.eyes,eyeColors,defaults.eyes),outfit:outfits.includes(a.outfit)?a.outfit:defaults.outfit,outfitColor:validColor(a.outfitColor,outfitColors,defaults.outfitColor)};}
function load(){try{return sanitize(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch{return clone(defaults);}}
function save(a){try{localStorage.setItem(KEY,JSON.stringify(a));}catch{}}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function randomAppearance(){return{hair:pick(hairStyles),hairColor:pick(hairColors),eyes:pick(eyeColors),outfit:pick(outfits),outfitColor:pick(outfitColors)};}
G.appearanceOptions={hairStyles,outfits,hairColors,eyeColors,outfitColors};G.player.appearance=load();G.randomSurvivorAppearance=randomAppearance;
const baseSpawn=G.spawnBots;
G.spawnBots=()=>{baseSpawn();for(const b of G.bots){if(b.role!=='survivor')continue;b.appearance=randomAppearance();b.skinSeed=Math.random()*1000;}};
const modal=document.getElementById('customizer'),openBtn=document.getElementById('inventoryBtn'),closeBtn=document.getElementById('customizerClose'),randomBtn=document.getElementById('customizerRandom'),doneBtn=document.getElementById('customizerDone'),preview=document.getElementById('customizerPreview');let current=clone(G.player.appearance);
const labels={short:'CURTO',messy:'BAGUNÇADO',pony:'RABO',braids:'TRANÇAS',bun:'COQUE',undercut:'UNDERCUT',jacket:'JAQUETA',hoodie:'MOLETOM',coverall:'MACACÃO',vest:'COLETE',parka:'PARKA'};
function makeChoiceButtons(id,values,key){const wrap=document.getElementById(id);if(!wrap)return;wrap.innerHTML='';for(const v of values){const b=document.createElement('button');b.type='button';b.className='custom-choice';b.dataset.value=v;b.textContent=labels[v]||v;b.addEventListener('click',()=>{current[key]=v;commit();});wrap.appendChild(b);}}
function makeSwatches(id,values,key){const wrap=document.getElementById(id);if(!wrap)return;wrap.innerHTML='';for(const v of values){const b=document.createElement('button');b.type='button';b.className='color-swatch';b.dataset.value=v;b.style.setProperty('--swatch',v);b.setAttribute('aria-label',v);b.addEventListener('click',()=>{current[key]=v;commit();});wrap.appendChild(b);}}
function sync(){document.querySelectorAll('.custom-choice').forEach(b=>b.classList.toggle('selected',b.dataset.value===current.hair||b.dataset.value===current.outfit));const groups=[['hairColorSwatches','hairColor'],['eyeColorSwatches','eyes'],['outfitColorSwatches','outfitColor']];for(const [id,key] of groups)document.querySelectorAll(`#${id} .color-swatch`).forEach(b=>b.classList.toggle('selected',b.dataset.value===current[key]));drawPreview();}
function commit(){current=sanitize(current);G.player.appearance=clone(current);save(current);sync();}
function drawPreview(){if(!preview)return;const c=preview.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,preview.width,preview.height);c.fillStyle='#080b0c';c.fillRect(0,0,preview.width,preview.height);c.strokeStyle='rgba(255,255,255,.035)';for(let y=12;y<preview.height;y+=12){c.beginPath();c.moveTo(0,y+.5);c.lineTo(preview.width,y+.5);c.stroke();}if(G.drawSurvivorPreview)G.drawSurvivorPreview(c,current,preview.width/2,preview.height*.69,3.15);}
makeChoiceButtons('hairChoices',hairStyles,'hair');makeChoiceButtons('outfitChoices',outfits,'outfit');makeSwatches('hairColorSwatches',hairColors,'hairColor');makeSwatches('eyeColorSwatches',eyeColors,'eyes');makeSwatches('outfitColorSwatches',outfitColors,'outfitColor');sync();
openBtn?.addEventListener('click',()=>{current=clone(G.player.appearance);sync();modal?.classList.remove('hidden');});closeBtn?.addEventListener('click',()=>modal?.classList.add('hidden'));randomBtn?.addEventListener('click',()=>{current=randomAppearance();commit();});doneBtn?.addEventListener('click',()=>modal?.classList.add('hidden'));modal?.addEventListener('pointerdown',e=>{if(e.target===modal)modal.classList.add('hidden');});addEventListener('misplaced-sprites-ready',drawPreview);
function previewLoop(){if(modal&&!modal.classList.contains('hidden'))drawPreview();requestAnimationFrame(previewLoop);}requestAnimationFrame(previewLoop);
})();
