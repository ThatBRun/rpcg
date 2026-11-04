/* BM27 v2.2.13 — Nationwide School Startup + March Madness Diversity Hotfix */
(()=>{
'use strict';
const VERSION='2.2.13';
function kick(){
  try{
    if(typeof current!=='undefined'&&current&&window.BM27V22?.hydrateRealNationalPool){
      current.v22=current.v22||{};
      if(!current.v22.nationalDirectoryReady&&!current.v22.nationalHydrating)window.BM27V22.hydrateRealNationalPool(current);
    }
  }catch(e){console.warn('BM27 nationwide preload kickoff',e)}
}
function deferKick(){const run=()=>kick();if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1100});else setTimeout(run,650)}
function install(){
  if(window.__BM27_V2213__)return;window.__BM27_V2213__=true;
  if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);deferKick();return r}}
  if(typeof newCareer==='function'){const base=newCareer;newCareer=function(){const r=base.apply(this,arguments);deferKick();return r}}
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    const box=document.getElementById('updatesContent');if(!box||box.querySelector('[data-v2213-notes]'))return;
    box.insertAdjacentHTML('afterbegin','<article class="card" data-v2213-notes><p class="eyebrow">BM27 v2.2.13</p><h3>Nationwide School Startup + March Madness Diversity</h3><ul class="update-list"><li>Opening a career now preloads every state directory in the background instead of stopping when Missouri already has 99 schools.</li><li>The nationwide directory is kept in memory while only the 99-school National Top 100 pool is saved, preventing enormous career-save files.</li><li>March Madness waits for the nationwide preload before creating its 68-team field.</li><li>The National Top 100 is built state-by-state so Missouri cannot occupy nearly every national spot.</li><li>Older Missouri-heavy March Madness fields automatically rebuild when they are still in progress.</li><li>All national schools are real BM27/NCES school-directory entries; fictional nat-* teams remain disabled.</li></ul></article>');
  },0),{capture:true}));
  deferKick();
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
