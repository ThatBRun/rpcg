/* BM27 v2.2.12 — March Madness + Tournament Repair */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
function repair(){try{window.BM27TournamentEngine?.repair?.(typeof current!=='undefined'?current:null)}catch(e){console.warn('BM27 tournament repair',e)}}
function install(){
  if(window.__BM27_V2212__)return;window.__BM27_V2212__=true;
  if(typeof renderAll==='function'){const base=renderAll;renderAll=function(){repair();const r=base.apply(this,arguments);repair();return r}}
  if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);repair();return r}}
  if(typeof createTournament==='function'){const base=createTournament;createTournament=function(){const t=base.apply(this,arguments);repair();return t}}
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    const box=$('updatesContent');if(!box||box.querySelector('[data-v2212-notes]'))return;
    box.insertAdjacentHTML('afterbegin','<article class="card" data-v2212-notes><p class="eyebrow">BM27 v2.2.12</p><h3>March Madness + Tournament Repair</h3><ul class="update-list"><li>March Madness no longer uses fictional generated national schools.</li><li>The national Top 100 and 68-team field now use real schools already in BM27 plus real NCES out-of-state schools when more teams are needed.</li><li>Old March Madness saves that still reference fictional nat-* schools automatically rebuild the national field with real schools.</li><li>Fixed national opponent resolution so using a real Missouri school in March Madness never turns that school into a national-only team.</li><li>Custom tournaments now self-repair missing active schedule links and stale matchup references.</li><li>Single elimination, 3rd-place, and full placement/consolation formats use the repaired bracket path.</li></ul></article>');
  },0),{capture:true}));
  repair();
  try{window.BM27V22?.hydrateRealNationalPool?.(typeof current!=='undefined'?current:null)}catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
