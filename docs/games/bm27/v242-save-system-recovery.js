/* BM27 v2.4.2 — Save System Recovery */
(()=>{'use strict';
const $=id=>document.getElementById(id),eq=(a,b)=>String(a)===String(b);
function modeOf(s){return ['season','dynasty','myschool'].includes(s?.gameMode)?s.gameMode:'season'}
function refresh(){const p=$('rdModePortal');if(!p||p.classList.contains('hidden'))return;const m=localStorage.getItem('bm27-selected-mode')||'season';try{window.BM27V240?.renderPortal?.(m)}catch(e){console.warn('Save portal refresh skipped',e)}}
function recoverLocal(){try{if(window.cloudGame?.signedIn)return;if(typeof saves==='undefined'||!Array.isArray(saves)||saves.length)return;const raw=localStorage.getItem('mshsaa_bm27_last_good_save');if(!raw)return;const one=JSON.parse(raw);if(one?.id){const hydrated=window.BM27FastSave?.hydrateSave?.(one)||one;saves=[hydrated];window.BM27Storage?.set('mshsaa_bm27_saves',JSON.stringify([window.BM27FastSave?.compactSave?.(hydrated)||hydrated]))}}catch(e){console.warn('Last-good save recovery skipped',e)}}
function install(){if(window.__BM27_V242__)return;window.__BM27_V242__=true;recoverLocal();Promise.resolve(window.cloudGame?.ready).then(()=>{recoverLocal();refresh()}).catch(()=>refresh());window.addEventListener('focus',refresh);$('rdModePortal')?.addEventListener('click',e=>{const b=e.target.closest('[data-rd-load],[data-v241-load]');if(!b)return;const id=b.dataset.rdLoad||b.dataset.v241Load;const save=(typeof saves!=='undefined'&&Array.isArray(saves))?saves.find(x=>eq(x.id,id)):null;if(save)document.body.dataset.rdMode=modeOf(save)},true)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V242={refresh,recoverLocal,modeOf};
})();