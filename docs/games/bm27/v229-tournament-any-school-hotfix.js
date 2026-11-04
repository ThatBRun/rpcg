(()=>{
'use strict';
const VERSION='2.2.9';
function installUpdates(){document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const box=document.getElementById('updatesContent');if(!box||box.querySelector('[data-v229-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v229-notes><p class="eyebrow">BM27 v2.2.9</p><h3>Any-School Tournament Selection Hotfix</h3><ul class="update-list"><li>Custom tournament school selection is no longer capped at 150 teams.</li><li>The tournament search now matches school name, mascot, city, state, class and district.</li><li>Out-of-state directory results can be added directly to the tournament with one click.</li><li>Missouri and imported out-of-state schools can be mixed in the same custom bracket.</li></ul></article>`);},0),{capture:true}))}
function install(){if(window.__BM27_V229__)return;window.__BM27_V229__=true;installUpdates()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
