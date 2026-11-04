/* BM27 v2.7.31 — Real Historic Rosters + Daily JV/Freshman Calendar
   Loaded last. Historic Play Now uses verified real-world roster data only.
   JV/Freshman due games are processed on every single calendar day advance.
*/
(()=>{'use strict';
const VERSION='2.7.31';const $=id=>document.getElementById(id);const dayKey=v=>String(v||'').slice(0,10);
function save(){return typeof current!=='undefined'?current:null}
function persistSafe(){try{return persist?.()}catch{return false}}
function processProgramDay(reason='calendar-day'){
 const s=save();if(!s)return 0;let changed=0;try{changed=Number(window.BM27V2732?.processOwnedDay?.(s,{reason}) ?? window.BM27V2729?.processDueGames?.(s) ?? 0)}catch(e){console.warn('BM27 program day',e)}
 if(changed){s.v2731=s.v2731||{};s.v2731.lastProcessedDay=dayKey(s.day);s.v2731.lastProcessedAt=new Date().toISOString();s.v2731.lastReason=reason;try{window.BM27V2730?.repairProgramRecords?.(s)}catch{}persistSafe();try{window.BM27V2729?.renderHub?.()}catch{}}
 try{window.BM27V2730?.collectAndShow?.(s)}catch{}return changed
}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2731-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2731-notes><p class="eyebrow">BM27 v2.7.31</p><h3>Real Historic Rosters + Daily Program Simulation</h3><ul class="update-list"><li>Historic Rosters no longer invent player identities. Only verified real-world roster data is playable; unavailable school/year combinations are clearly disabled.</li><li>The verified historical pack was expanded with additional public Missouri roster data.</li><li>Advance Day now processes JV and Freshman schedules on each individual calendar day, including every day inside Sim 7 Days.</li><li>Any lower-level game whose date has arrived is simulated, written to its schedule, updates the correct JV/Freshman record, and queues its labeled final-score result.</li><li>Playing a Varsity game that jumps the calendar forward also catches up every due JV/Freshman game automatically.</li></ul></article>`)}
function install(){if(window.__BM27_V2731__)return;window.__BM27_V2731__=true;
 if(typeof advance==='function'){const inheritedAdvance=advance;advance=function(days=1){const n=Math.max(0,Math.floor(Number(days)||0));if(n===0){processProgramDay('same-day');return}let r;for(let i=0;i<n;i++){r=inheritedAdvance.call(this,1);processProgramDay('advance-day')}return r}}
 if(typeof simulateGame==='function'){const inheritedGame=simulateGame;simulateGame=function(){const before=dayKey(save()?.day),r=inheritedGame.apply(this,arguments),after=dayKey(save()?.day);processProgramDay(before===after?'varsity-game':'varsity-date-jump');return r}}
 if(typeof openSave==='function'){const inheritedOpen=openSave;openSave=function(){const r=inheritedOpen.apply(this,arguments);processProgramDay('open-save');return r}}
 if(typeof renderAll==='function'){const inheritedRender=renderAll;renderAll=function(){const r=inheritedRender.apply(this,arguments);try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.32'}catch{}return r}}
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-open-updates]'))setTimeout(addNotes,20)},true);
 window.addEventListener('focus',()=>processProgramDay('focus'));document.addEventListener('visibilitychange',()=>{if(!document.hidden)processProgramDay('visible')});
 processProgramDay('install');addNotes();
}
window.BM27V2731={version:VERSION,processProgramDay};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
