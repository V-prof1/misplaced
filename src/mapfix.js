'use strict';
(() => {
const G=window.MISPLACED;

// Two old gaps between the big rooms were not real rooms. Because zoneAt()
// returned null there, entering them made the visibility mask become 100% black.
// Seal those maintenance voids so they read as solid architecture instead of fake doors.
const seals=[
  {x:512,y:336,w:16,h:64,id:'west_service_seal'},
  {x:688,y:368,w:16,h:32,id:'east_service_seal'}
];
for(const s of seals){
  const exists=G.walls.some(w=>w.x===s.x&&w.y===s.y&&w.w===s.w&&w.h===s.h);
  if(!exists)G.walls.push(s);
}

// Small environmental details beside the sealed sections so the player can
// visually understand that these are blocked service shafts, not entrances.
G.props.push(
  {type:'vent',x:548,y:352,w:48,h:22,decorative:true},
  {type:'vent',x:620,y:380,w:48,h:22,decorative:true}
);
})();
