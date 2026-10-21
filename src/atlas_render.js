'use strict';
(() => {
const G=window.MISPLACED;
const baseRender=G.render;
G.render=()=>{
  // Safety-first renderer: the base characters are ALWAYS rendered.
  // Custom PNG sprites are layered on top only when their atlases finished
  // decoding. This removes every path that could leave players or the killer
  // invisible while we validate the new sprite pack on mobile.
  baseRender();
  if(!G.spriteAssets?.ready||!G.renderCustomEntities)return;
  try{G.renderCustomEntities();}
  catch(err){
    // Keep gameplay visible even if one custom frame fails.
    G.spriteAssets.error=err;
    G.spriteAssets.ready=false;
    console.error('[MISPLACED] custom sprite render disabled:',err);
  }
};
})();
