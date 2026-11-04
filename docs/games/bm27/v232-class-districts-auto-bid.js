/* BM27 v2.3.2 — Manual District Limits + Highest-Class Auto Bid */
(()=>{
'use strict';
function install(){
 if(window.__BM27_V232__)return;window.__BM27_V232__=true;
 document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
  const box=document.getElementById('updatesContent');if(!box||box.querySelector('[data-v232-notes]'))return;
  box.insertAdjacentHTML('afterbegin','<article class="card" data-v232-notes><p class="eyebrow">BM27 v2.3.2</p><h3>Manual District Limits + Highest-Class March Madness Auto Bid</h3><ul class="update-list"><li>Manually added Missouri classes now allow 8–16 districts.</li><li>Class 5 and Class 6 remain fixed at exactly 8 districts.</li><li>March Madness now waits for the highest active Missouri class State Tournament to finish.</li><li>The highest-class state champion receives an automatic bid to the 68-team March Madness field.</li><li>If an auto-bid champion is outside the Top 68, it replaces the final at-large selection.</li><li>If you manually add Class 7 or higher, that new highest class becomes the automatic-bid championship.</li></ul></article>');
 },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
