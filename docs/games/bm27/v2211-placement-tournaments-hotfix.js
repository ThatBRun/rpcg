/* BM27 v2.2.11 — Scrollable Sidebar + Placement Tournaments */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
function migrate(){
  if(typeof current==='undefined'||!current)return;
  for(const t of current.tournaments||[]){
    if(!t.format)t.format='single';
    if(!t.placements)t.placements={};
  }
}
function install(){
  if(window.__BM27_V2211__)return;window.__BM27_V2211__=true;
  if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);migrate();return r}}
  migrate();
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    const box=$('updatesContent');if(!box||box.querySelector('[data-v2211-notes]'))return;
    box.insertAdjacentHTML('afterbegin','<article class="card" data-v2211-notes><p class="eyebrow">BM27 v2.2.11</p><h3>Placement Tournament + Sidebar Hotfix</h3><ul class="update-list"><li>The left sidebar can now scroll when the navigation is taller than the screen.</li><li>Custom tournaments now offer Single Elimination, Single Elimination + 3rd Place, or Full Consolation / Placement formats.</li><li>Full Placement keeps every team playing after a loss and generates placement paths for every finishing position.</li><li>8-team tournaments can finish with Championship, 3rd-place, 5th-place and 7th-place games; larger brackets continue the same system for additional places.</li><li>Placement games use the normal BM27 game engine, schedule, Live Game Center, records and tournament history.</li></ul></article>');
  },0),{capture:true}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
