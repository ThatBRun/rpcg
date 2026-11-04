/* BM27 v2.7.41 — authoritative Junior Game Adder root fix
   Replaces the layered v2.7.39/v2.7.40 scheduling UI with one capture-owned dialog.
*/
(()=>{'use strict';
const VERSION='2.7.41';
const GRADES=[3,4,5,6,7,8];
const LETTERS='ABCDEFGH'.split('');
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=v=>String(v||'').slice(0,10);
function save(){return typeof current!=='undefined'?current:null}
function toastSafe(m){try{toast?.(m)}catch{}}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.41 persist',e);return false}}
function api39(){return window.BM27V2739}
function api40(){return window.BM27V2740}
function ensure(s=save()){return api39()?.ensure?.(s)||null}
function gradeLabel(g){return `${g}${g===3?'rd':'th'} Grade`}
function ownProgramName(s=save()){
  const team=(s?.teams||[]).find(t=>String(t.id)===String(s?.schoolId));
  if(/marquette/i.test(String(team?.name||''))||/mustangs/i.test(String(team?.mascot||'')))return 'Marquette Junior Mustangs';
  return `${team?.name||team?.mascot||'Your School'} Junior Program`;
}
function activeLetters(v,g){const n=Math.max(1,Math.min(LETTERS.length,Number(v?.teamCounts?.[g])||1));return LETTERS.slice(0,n)}
function clubPool(){return (api39()?.clubs||[]).filter(x=>!x?.stlJuniorProgram)}
function juniorPool(s=save()){
  const mine=ownProgramName(s).toLowerCase();
  return (api40()?.programs||[]).filter(p=>String(p.name||'').toLowerCase()!==mine && !(mine.includes('marquette')&&p.id==='marquette-junior'));
}
function selectedSource(){
  const s=save(),v=ensure(s); if(!s||!v)return {grade:3,letter:'A'};
  let grade=Number($('v2739ScheduleGrade')?.value||3); if(!GRADES.includes(grade))grade=3;
  const letters=activeLetters(v,grade); let letter=$('v2739ScheduleTeam')?.value||letters[0]||'A'; if(!letters.includes(letter))letter=letters[0]||'A';
  return {grade,letter};
}
function removeLegacyDialogs(){
  for(const id of ['v2739ScheduleDialog','v2740JuniorScheduleDialog']){const el=$(id);if(el){try{if(el.open)el.close()}catch{} el.hidden=true;el.setAttribute('aria-hidden','true')}}
}
function ensureDialog(){
  if($('v2741JuniorGameDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<dialog id="v2741JuniorGameDialog"><form id="v2741JuniorGameForm"><div class="modal-head"><div><p class="eyebrow">JUNIOR PROGRAM • AUTHORITATIVE SCHEDULER</p><h2>Add Junior Game</h2></div><button id="v2741CancelX" type="button" class="icon-btn">×</button></div><div class="two"><label>Your grade<select id="v2741Grade">${GRADES.map(g=>`<option value="${g}">${gradeLabel(g)}</option>`).join('')}</select></label><label>Your team<select id="v2741Team"></select></label></div><label>Opponent type<select id="v2741OpponentType"><option value="junior">St. Louis Junior Program</option><option value="club">St. Louis Club Team</option><option value="own">Another Team From My Program</option></select></label><div id="v2741ProgramRow"><label>Opponent program<select id="v2741Program"></select></label></div><label>Opponent team<select id="v2741OpponentLetter"></select></label><div class="two"><label>Date<input id="v2741Date" type="date" required></label><label>Location<select id="v2741Location"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></label></div><div id="v2741Validation" class="muted small"></div><p id="v2741Preview" class="muted small"></p><div class="schedule-actions"><button id="v2741Submit" type="submit" class="primary">Add Game — No Pitch</button><button id="v2741Cancel" type="button" class="secondary">Cancel</button></div></form></dialog>`);
  $('v2741CancelX').onclick=$('v2741Cancel').onclick=()=>{try{$('v2741JuniorGameDialog').close()}catch{}};
  $('v2741Grade').addEventListener('change',()=>{populateSourceTeams();populateOpponent();validate()});
  $('v2741Team').addEventListener('change',()=>{populateOpponent();validate()});
  $('v2741OpponentType').addEventListener('change',()=>{populateOpponent();validate()});
  $('v2741Program').addEventListener('change',validate);
  $('v2741OpponentLetter').addEventListener('change',validate);
  $('v2741Date').addEventListener('change',validate);
  $('v2741Location').addEventListener('change',validate);
  $('v2741JuniorGameForm').addEventListener('submit',submit);
}
function populateSourceTeams(){
  const v=ensure(),g=Number($('v2741Grade')?.value||3),letters=activeLetters(v,g),sel=$('v2741Team'); if(!sel)return;
  const keep=sel.value; sel.innerHTML=letters.map(L=>`<option value="${L}">Team ${L}</option>`).join(''); if(letters.includes(keep))sel.value=keep;
}
function populateOpponent(){
  const s=save(),v=ensure(s); if(!s||!v)return;
  const g=Number($('v2741Grade').value),mine=$('v2741Team').value||'A',type=$('v2741OpponentType').value,program=$('v2741Program'),row=$('v2741ProgramRow'),opp=$('v2741OpponentLetter');
  if(type==='own'){
    row.hidden=true; const options=activeLetters(v,g).filter(L=>L!==mine); opp.innerHTML=options.length?options.map(L=>`<option value="${L}">Team ${L} • ${esc(ownProgramName(s))}</option>`).join(''):'<option value="">No other active team in this grade</option>';
  }else{
    row.hidden=false; const pool=type==='club'?clubPool():juniorPool(s); const keep=program.value;
    program.innerHTML=pool.length?pool.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''):'<option value="">No programs available</option>';
    if(pool.some(p=>String(p.id)===String(keep)))program.value=keep;
    const keepL=opp.value; opp.innerHTML=LETTERS.map(L=>`<option value="${L}">Team ${L}</option>`).join(''); if(LETTERS.includes(keepL))opp.value=keepL;
  }
}
function validationState(){
  const s=save(),v=ensure(s); if(!s||!v)return {ok:false,msg:'No Season Mode career is open.'};
  const grade=Number($('v2741Grade')?.value),letter=$('v2741Team')?.value,type=$('v2741OpponentType')?.value,oppL=$('v2741OpponentLetter')?.value,date=$('v2741Date')?.value;
  if(!GRADES.includes(grade))return {ok:false,msg:'Choose a valid grade.'};
  if(!activeLetters(v,grade).includes(letter))return {ok:false,msg:'Choose an active team from your program.'};
  const t=v?.teams?.[grade]?.[letter]; if(!t)return {ok:false,msg:'That junior team could not be found.'};
  if((t.schedule||[]).length>=26)return {ok:false,msg:`${gradeLabel(grade)} Team ${letter} already has 26 games.`};
  if(!date)return {ok:false,msg:'Choose a game date.'};
  const y=Number(s.season)||new Date().getFullYear(),min=`${y}-11-01`,max=`${y+1}-03-31`;
  if(date<min||date>max)return {ok:false,msg:`Junior games must be scheduled from ${min} through ${max}.`};
  if(type==='own'){
    if(!oppL||oppL===letter||!activeLetters(v,grade).includes(oppL))return {ok:false,msg:'Choose a different active team from your program.'};
    const ot=v?.teams?.[grade]?.[oppL]; if(!ot)return {ok:false,msg:'The opponent team could not be found.'};
    if((ot.schedule||[]).length>=26)return {ok:false,msg:`${gradeLabel(grade)} Team ${oppL} already has 26 games.`};
    const duplicate=(t.schedule||[]).some(g=>g.ownOpponentLetter===oppL&&dayKey(g.date)===date&&!g.played); if(duplicate)return {ok:false,msg:'Those two teams already have a game against each other on that date.'};
  }else{
    const programId=$('v2741Program')?.value; if(!programId)return {ok:false,msg:'Choose an opponent program.'};
    if(!LETTERS.includes(oppL))return {ok:false,msg:'Choose the opponent team letter.'};
    const duplicate=(t.schedule||[]).some(g=>String(g.opponentProgramId||g.opponentClubId)===String(programId)&&String(g.opponentLetter||'A')===oppL&&dayKey(g.date)===date&&!g.played); if(duplicate)return {ok:false,msg:'That matchup is already scheduled on this date.'};
  }
  return {ok:true,msg:'Ready to add this game.'};
}
function validate(){
  const s=save(),v=ensure(s); if(!s||!v)return false; const state=validationState(),grade=Number($('v2741Grade').value),mine=$('v2741Team').value||'A',type=$('v2741OpponentType').value,oppL=$('v2741OpponentLetter').value||'?',date=$('v2741Date').value;
  let opp='Opponent'; if(type==='own')opp=`${ownProgramName(s)} ${gradeLabel(grade)} Team ${oppL}`; else {const pool=type==='club'?clubPool():juniorPool(s),p=pool.find(x=>String(x.id)===String($('v2741Program').value));opp=`${p?.name||'Opponent'} ${gradeLabel(grade)} Team ${oppL}`}
  $('v2741Preview').textContent=`${ownProgramName(s)} ${gradeLabel(grade)} Team ${mine} vs ${opp}${date?` • ${date}`:''}`;
  $('v2741Validation').textContent=state.msg; $('v2741Submit').disabled=!state.ok; return state.ok;
}
function openDialog(){
  const s=save(),v=ensure(s); if(!s||!v){toastSafe('Open a Season Mode career first.');return}
  removeLegacyDialogs(); ensureDialog(); const src=selectedSource(); $('v2741Grade').value=String(src.grade); populateSourceTeams(); if(activeLetters(v,src.grade).includes(src.letter))$('v2741Team').value=src.letter;
  const y=Number(s.season)||new Date().getFullYear(),d=$('v2741Date'); d.min=`${y}-11-01`;d.max=`${y+1}-03-31`; const now=dayKey(s.day); d.value=(now>=d.min&&now<=d.max)?now:`${y}-11-24`;
  populateOpponent(); validate(); try{$('v2741JuniorGameDialog').showModal()}catch(e){console.warn('v2741 dialog',e);toastSafe('Could not open the Junior Game Adder. Refresh once and try again.')}
}
function submit(e){
  e.preventDefault(); e.stopPropagation(); const s=save(); if(!validate()||!s)return;
  const grade=Number($('v2741Grade').value),letter=$('v2741Team').value,type=$('v2741OpponentType').value,opponentLetter=$('v2741OpponentLetter').value,date=$('v2741Date').value,location=$('v2741Location').value;
  let result; try{
    if(type==='own')result=api40()?.addOwnProgramGame?.(s,{grade,letter,opponentLetter,date,location});
    else result=api40()?.addExternalGame?.(s,{grade,letter,opponentType:type,programId:$('v2741Program').value,opponentLetter,date,location});
  }catch(err){console.error('BM27 v2.7.41 junior add',err);result={ok:false,error:err?.message||'Unknown scheduling error'}}
  if(!result?.ok){toastSafe(result?.error||'That junior game could not be added.');return}
  try{$('v2741JuniorGameDialog').close()}catch{} persistSafe(); try{api39()?.renderJunior?.()}catch{};
  toastSafe(type==='own'?`${gradeLabel(grade)} Team ${letter} vs Team ${opponentLetter} added to both schedules.`:`${gradeLabel(grade)} Team ${letter} game added.`);
}
function install(){
  if(window.__BM27_V2741__)return;window.__BM27_V2741__=true; ensureDialog(); removeLegacyDialogs();
  // Capture phase owns the Add Junior Game click before old target listeners can run.
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#v2739AddGame');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openDialog()},true);
  // If v2.7.40 swapped the button already, remove its target listener by replacing it once.
  const old=$('v2739AddGame'); if(old&&!old.dataset.v2741){const b=old.cloneNode(true);b.dataset.v2741='1';b.textContent='Add Junior Game';old.replaceWith(b)}
  if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);setTimeout(()=>{removeLegacyDialogs();const b=$('v2739AddGame');if(b)b.dataset.v2741='1'},0);return r}}
  document.addEventListener('click',e=>{if(e.target.closest?.('#v2739JuniorNav'))setTimeout(()=>{removeLegacyDialogs();const b=$('v2739AddGame');if(b)b.dataset.v2741='1'},0)},true);
  try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.41'}catch{}
}
window.BM27V2741={version:VERSION,openDialog,validate,validationState};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
