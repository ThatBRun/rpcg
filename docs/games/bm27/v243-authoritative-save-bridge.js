/* BM27 v2.4.3 — Authoritative Save Bridge */
(()=>{'use strict';
const $=id=>document.getElementById(id);
function refresh(){
  const mode=localStorage.getItem('bm27-selected-mode')||'season';
  const p=$('rdModePortal');
  if(p&&!p.classList.contains('hidden'))try{window.BM27V240?.renderPortal?.(mode)}catch{}
}
function install(){
  if(window.__BM27_V243__)return;window.__BM27_V243__=true;
  const cg=window.cloudGame;
  if(cg?.refreshSaves){
    const base=cg.refreshSaves;
    cg.refreshSaves=async function(){const r=await base.apply(this,arguments);refresh();return r};
  }
  // The Real Deal sign-in uses the hidden original sign-in button. Refresh after it completes.
  $('signInBtn')?.addEventListener('click',()=>{setTimeout(()=>cg?.refreshSaves?.().catch(()=>{}),900);setTimeout(refresh,1800)},false);
  window.addEventListener('focus',refresh);
  setTimeout(refresh,500);setTimeout(refresh,1800);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V243={refresh};
})();