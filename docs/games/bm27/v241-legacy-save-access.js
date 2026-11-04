/* BM27 v2.4.1 — Legacy Save Access Repair */
(()=>{'use strict';
const $=id=>document.getElementById(id),eq=(a,b)=>String(a)===String(b),MAX=5;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function all(){return typeof saves!=='undefined'&&Array.isArray(saves)?saves:[]}
function mode(s){return ['season','dynasty','myschool'].includes(s?.gameMode)?s.gameMode:'season'}
function legacy(m){return all().filter(s=>mode(s)===m).slice(MAX)}
function ensureBox(){const slots=$('rdSlots');if(!slots||$('rdLegacyBox'))return;slots.insertAdjacentHTML('afterend',`<section id="rdLegacyBox" class="rd-legacy-box hidden"><div class="rd-legacy-head"><div><span>OLDER CAREERS</span><h2>LEGACY SAVES</h2><p>Careers created before the five-slot system stay available here. Opening one does not delete or overwrite it.</p></div><b id="rdLegacyCount"></b></div><div id="rdLegacyList" class="rd-legacy-list"></div></section>`)}
function renderLegacy(m){ensureBox();const box=$('rdLegacyBox'),list=$('rdLegacyList');if(!box||!list)return;const arr=legacy(m);box.classList.toggle('hidden',!arr.length);$('rdLegacyCount').textContent=arr.length?`${arr.length} OLD SAVE${arr.length===1?'':'S'}`:'';list.innerHTML=arr.map(s=>{const t=(s.teams||[]).find(x=>eq(x.id,s.schoolId));return `<article class="rd-legacy-save"><div><b>${esc(s.name||'Career')}</b><strong>${esc(t?.name||'School')}</strong><small>${Number(s.season)||2026} • ${esc(s.difficulty||'Varsity')} • Original career</small></div><button data-v241-load="${esc(s.id)}">PLAY OLD SAVE</button></article>`}).join('')}
function launch(id){const s=all().find(x=>eq(x.id,id));if(!s)return;const m=mode(s);document.body.dataset.rdMode=m;$('sportsShell')?.classList.add('hidden');$('launcher')?.classList.add('hidden');$('rdModePortal')?.classList.add('hidden');document.body.classList.add('rd-in-game');openSave(id)}
function refreshCurrentPortal(){const p=$('rdModePortal');if(!p||p.classList.contains('hidden'))return;const m=localStorage.getItem('bm27-selected-mode')||'season';try{window.BM27V240?.renderPortal?.(m)}catch{}renderLegacy(m)}
function install(){if(window.__BM27_V241__)return;window.__BM27_V241__=true;ensureBox();
 const old=window.BM27V240?.renderPortal;if(old){window.BM27V240.renderPortal=function(m){const r=old(m);setTimeout(()=>renderLegacy(m),0);return r}}
 $('rdModePortal')?.addEventListener('click',e=>{const b=e.target.closest('[data-v241-load]');if(b){e.preventDefault();e.stopImmediatePropagation();launch(b.dataset.v241Load)}},true);
 // Cloud saves restore asynchronously. Repaint the portal after those old careers arrive.
 const base=window.cloudGame?.refreshSaves;if(base)window.cloudGame.refreshSaves=async function(){const r=await base.apply(this,arguments);refreshCurrentPortal();return r};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCurrentPortal()});
 setTimeout(refreshCurrentPortal,350);setTimeout(refreshCurrentPortal,1400);setTimeout(refreshCurrentPortal,3500);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();