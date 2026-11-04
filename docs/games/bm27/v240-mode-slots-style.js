/* BM27 v2.4.0 — Mode Save Slots + Mode Identity */
(()=>{'use strict';
const $=id=>document.getElementById(id), eq=(a,b)=>String(a)===String(b);
const MAX=5, MODES={season:{title:'SEASON MODE',sub:'Take control of a program and play the complete BM27 season.',accent:'season'},dynasty:{title:'DYNASTY MODE',sub:'Build your coaching career, program legacy, and long-term dynasty.',accent:'dynasty'},myschool:{title:'MY SCHOOL',sub:'Create your school, shape the roster, and build a new powerhouse.',accent:'myschool'}};
let selectedMode='season';
function modeOf(s){return ['season','dynasty','myschool'].includes(s?.gameMode)?s.gameMode:'season'}
function allSaves(){return (typeof saves!=='undefined'&&Array.isArray(saves))?saves:[]}
function modeSaves(m){return allSaves().filter(s=>modeOf(s)===m).slice(0,MAX)}
function shell(){if($('rdModePortal'))return;document.body.insertAdjacentHTML('beforeend',`<section id="rdModePortal" class="rd-screen rd-mode-portal hidden"><img class="rd-mode-art" src="assets/final/main-menu.jpeg" alt=""><div class="rd-mode-overlay"></div><div class="rd-mode-wrap"><button id="rdPortalBack" class="rd-menu-back">← MAIN MENU</button><div class="rd-mode-head"><p class="rd-kicker">RAMPACECORP • MSHSAABBM27</p><h1 id="rdPortalTitle">SEASON MODE</h1><p id="rdPortalSub"></p><div id="rdSlotCount" class="rd-slot-count"></div></div><div id="rdSlots" class="rd-slots"></div><div class="rd-portal-actions"><button id="rdCreateSlot" class="rd-create-slot">+ CREATE NEW SAVE</button><button id="rdMySchoolCreator" class="rd-create-slot hidden">+ SCHOOL CREATOR</button></div></div></section>`);
 const header=document.querySelector('#game header');if(header&&!$('rdGameMenuBtn'))header.insertAdjacentHTML('afterbegin','<button id="rdGameMenuBtn" class="rd-game-menu">← MAIN MENU</button>');
}
function renderPortal(m){selectedMode=m;localStorage.setItem('bm27-selected-mode',m);document.body.dataset.rdMode=m;const meta=MODES[m];$('rdModePortal').className=`rd-screen rd-mode-portal rd-theme-${m}`;$('rdPortalTitle').textContent=meta.title;$('rdPortalSub').textContent=meta.sub;const arr=modeSaves(m);$('rdSlotCount').textContent=`${arr.length} / ${MAX} SAVE SLOTS USED`;
 $('rdSlots').innerHTML=Array.from({length:MAX},(_,i)=>{const s=arr[i];if(!s)return `<article class="rd-slot rd-empty"><span>SLOT ${i+1}</span><b>EMPTY SLOT</b><small>Ready for a new ${meta.title.toLowerCase()} save</small></article>`;const team=(s.teams||[]).find(t=>eq(t.id,s.schoolId));return `<article class="rd-slot"><span>SLOT ${i+1}</span><div class="rd-slot-main"><b>${esc240(s.name||'Career')}</b><strong>${esc240(team?.name||'School')}</strong><small>${Number(s.season)||2026} • ${team?.wins||0}-${team?.losses||0} • ${esc240(s.difficulty||'Varsity')}</small></div><div class="rd-slot-actions"><button data-rd-load="${esc240(s.id)}">PLAY</button><button data-rd-delete="${esc240(s.id)}">DELETE</button></div></article>`}).join('');
 $('rdCreateSlot').disabled=arr.length>=MAX;$('rdCreateSlot').textContent=arr.length>=MAX?'5 / 5 SAVE SLOTS FULL':'+ CREATE NEW SAVE';$('rdMySchoolCreator').classList.toggle('hidden',m!=='myschool');show240('rdModePortal')}
function esc240(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show240(id){['rdSplash','rdLegal','rdMenu','rdSettings','rdRoster','rdModePortal'].forEach(x=>$(x)?.classList.toggle('hidden',x!==id))}
function toMain(){try{if(typeof current!=='undefined'&&current)persist?.()}catch{}try{current=null}catch{}$('game')?.classList.add('hidden');$('launcher')?.classList.add('hidden');$('sportsShell')?.classList.remove('hidden');document.body.classList.remove('rd-in-game');delete document.body.dataset.rdMode;show240('rdMenu')}
function launchSave(id){const s=allSaves().find(x=>eq(x.id,id));if(!s)return;const actualMode=modeOf(s);selectedMode=actualMode;document.body.dataset.rdMode=actualMode;$('sportsShell')?.classList.add('hidden');$('launcher')?.classList.add('hidden');document.body.classList.add('rd-in-game');if(actualMode==='dynasty'){window.BM27Dynasty249?.open?.(s);return}openSave(id)}
function createSave(){if(modeSaves(selectedMode).length>=MAX)return toast?.(`Maximum of ${MAX} saves for ${MODES[selectedMode].title}.`);$('sportsShell')?.classList.add('hidden');$('launcher')?.classList.remove('hidden');try{renderLauncher?.(false)}catch{}$('newSaveDialog')?.showModal()}
function install(){if(window.__BM27_V240__)return;window.__BM27_V240__=true;shell();
 // Replace the Real Deal mode routing with dedicated, styled mode save portals.
 const modes=$('rdModes');if(modes)modes.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;const m=b.dataset.mode;if(m==='playnow'||m==='legacy'){e.preventDefault();e.stopImmediatePropagation();if(m==='playnow')window.BM27PlayNow253?.open?.();else window.BM27Legacy256?.open?.();return}
if(MODES[m]){e.preventDefault();e.stopImmediatePropagation();renderPortal(m)}},true);
 $('rdPortalBack').onclick=toMain;$('rdGameMenuBtn').onclick=toMain;
 $('rdCreateSlot').onclick=createSave;$('rdMySchoolCreator').onclick=()=>{if(modeSaves('myschool').length>=MAX)return toast?.('My School has 5 / 5 save slots filled.');createSave();setTimeout(()=>$('createSchoolBtn')?.click(),120)};
 $('rdSlots').onclick=e=>{const l=e.target.closest('[data-rd-load]'),d=e.target.closest('[data-rd-delete]');if(l)launchSave(l.dataset.rdLoad);if(d&&confirm('Delete this save permanently?')){const id=d.dataset.rdDelete;try{if(typeof current!=='undefined'&&current&&eq(current.id,id))current=null;saves=saves.filter(s=>!eq(s.id,id));if(!window.cloudGame?.signedIn)window.BM27Storage?.set('mshsaa_bm27_saves',JSON.stringify(saves.map(x=>window.BM27FastSave?.compactSave?.(x)||x)));window.cloudGame?.deleteSave(id).catch(()=>{});renderPortal(selectedMode)}catch(err){console.error(err)}}};
 // Enforce five saves per mode before creation and tag before any persistence.
 const baseNewCareer240=typeof newCareer==='function'?newCareer:null;
 if(baseNewCareer240)newCareer=function(){if(modeSaves(selectedMode).length>=MAX)throw new Error(`${MODES[selectedMode].title} already has 5 save slots.`);const made=baseNewCareer240.apply(this,arguments);if(made){made.gameMode=selectedMode;made.modeVersion=2420}return made};
 const form=$('newSaveForm');if(form)form.addEventListener('submit',e=>{if(modeSaves(selectedMode).length>=MAX){e.preventDefault();e.stopImmediatePropagation();toast?.(`${MODES[selectedMode].title} already has 5 save slots.`)}},true);
 // Existing untagged careers stay in Season Mode; do not break old saves.
 for(const s of allSaves())if(!s.gameMode)s.gameMode='season'; // v2.4.1: do not persist here; cloud startup may still be restoring older careers.
 // Any old Exit to Saves control now returns to its mode's five-slot portal.
 const old=$('backToSaves');if(old)old.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();try{persist?.()}catch{}try{current=null}catch{}$('game')?.classList.add('hidden');$('launcher')?.classList.add('hidden');$('sportsShell')?.classList.remove('hidden');document.body.classList.remove('rd-in-game');renderPortal(selectedMode)},true);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V240={renderPortal,modeOf,modeSaves,toMain};
})();
