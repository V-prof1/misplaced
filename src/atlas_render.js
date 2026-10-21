'use strict';
(() => {
const G=window.MISPLACED;
const baseRender=G.render;
G.render=()=>{
  if(!G.customSprites||!G.renderCustomEntities)return baseRender();
  const alive=G.bots.map(b=>b.alive),role=G.player.role,health=G.player.health;
  try{
    for(const b of G.bots)b.alive=false;
    G.player.role='survivor';G.player.health=0;
    baseRender();
  }finally{
    for(let i=0;i<G.bots.length;i++)G.bots[i].alive=alive[i];
    G.player.role=role;G.player.health=health;
  }
  G.renderCustomEntities();
};
})();
