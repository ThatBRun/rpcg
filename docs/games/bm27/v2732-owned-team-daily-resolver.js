/* BM27 v2.7.32 — Authoritative owned-team daily resolver
   Exactly three owned teams: Varsity, JV and Freshman.
   Every calendar day resolves every due game for those teams once, independent of UI rendering.
*/
(()=>{'use strict';
const VERSION='2.7.32';
const OWNED=['Varsity','JV','Freshman'];
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const dayKey=v=>String(v||'').slice(0,10);
const clone=o=>JSON.parse(JSON.stringify(o));
function save(){return typeof current!=='undefined'?current:null}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.32 persist',e);return false}}
function stage(s){try{return window.BM27V2721?.stage?.()||s?.v2721?.stage||'regular'}catch{return s?.v2721?.stage||'regular'}}
function teamName(s,id){return s?.teams?.find(t=>eq(t.id,id))?.name||'Opponent'}
function normalizeOwnedProgram(s=save()){
  if(!s)return 0;s.v2=s.v2||{};let changed=0;
  const wanted=[{name:'Varsity',active:true},{name:'JV',active:true},{name:'Freshman',active:true}];
  if(JSON.stringify(s.v2.teamLevels||[])!==JSON.stringify(wanted)){s.v2.teamLevels=wanted;changed++}
  for(const p of s.v2.programPlayers||[]){if(p.teamLevel==='Sophomore'||p.teamLevel==='Junior'){p.teamLevel='JV';changed++}}
  s.v2.subTeams=s.v2.subTeams||{};
  for(const old of ['Sophomore','Junior'])if(s.v2.subTeams[old]){
    s.v2732=s.v2732||{};s.v2732.removedTeamHistory=s.v2732.removedTeamHistory||{};
    if(!s.v2732.removedTeamHistory[old])s.v2732.removedTeamHistory[old]=clone(s.v2.subTeams[old]);
    delete s.v2.subTeams[old];changed++;
  }
  for(const st of s.v2.staff||[])if(st.assignment==='Sophomore'||st.assignment==='Junior'){st.assignment='JV';if(st.role==='Sophomore Coach'||st.role==='Junior Coach')st.role='JV Assistant Coach';changed++}
  for(const st of s.v2.staffPool||[])if(st.assignment==='Sophomore'||st.assignment==='Junior'){st.assignment='JV';if(st.role==='Sophomore Coach'||st.role==='Junior Coach')st.role='JV Assistant Coach';changed++}
  if(changed){s.v2732=s.v2732||{};s.v2732.ownedTeamMigrationAt=s.v2732.ownedTeamMigrationAt||new Date().toISOString()}
  return changed;
}
function dueSignature(s,today){
  const bits=[];
  for(const g of s?.schedule||[])if(!g.played&&dayKey(g.date)<=today)bits.push(`V:${g.id||''}:${dayKey(g.date)}:${g.opponentId||''}`);
  for(const level of ['JV','Freshman'])for(const g of s?.v2?.subTeams?.[level]?.schedule||[])if(!g.played&&dayKey(g.date)<=today)bits.push(`${level[0]}:${g.id||''}:${dayKey(g.date)}:${g.opponentId||''}`);
  bits.sort();return bits.join('|');
}
function snapshotPlayed(s){
  const out=new Map();
  for(const g of s?.schedule||[])if(g.played)out.set(`Varsity:${g.id}`,true);
  for(const level of ['JV','Freshman'])for(const g of s?.v2?.subTeams?.[level]?.schedule||[])if(g.played)out.set(`${level}:${g.id}`,true);
  return out;
}
let resultQueue=[];
function installResultDialog(){
  if($('v2732OwnedResultsDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<dialog id="v2732OwnedResultsDialog"><div class="modal-head"><div><p class="eyebrow">OWNED PROGRAM • GAME DAY</p><h2>Varsity, JV & Freshman Results</h2></div></div><div id="v2732OwnedResultsList" class="stack"></div><button id="v2732OwnedResultsClose" class="primary wide" type="button">Continue</button></dialog>`);
  $('v2732OwnedResultsClose')?.addEventListener('click',()=>{try{$('v2732OwnedResultsDialog').close()}catch{};setTimeout(showQueuedResults,0)});
}
function showQueuedResults(){
  installResultDialog();const d=$('v2732OwnedResultsDialog');if(!d||d.open||!resultQueue.length)return;
  const other=[...document.querySelectorAll('dialog[open]')].find(x=>x!==d);if(other){setTimeout(showQueuedResults,180);return}
  const rows=resultQueue.splice(0,resultQueue.length);
  $('v2732OwnedResultsList').innerHTML=rows.map(r=>`<article class="card"><div class="section-head"><div><p class="eyebrow">${r.level.toUpperCase()} • FINAL</p><h3>${r.won?'WIN':'LOSS'} ${r.myScore}-${r.oppScore}</h3></div><span class="tag">${r.level}</span></div><p><b>${r.opponent}</b>${r.roundName?` • ${r.roundName}`:''}</p><p class="muted small">${new Date(r.date).toLocaleDateString()} • Updated on the ${r.level} schedule and record.</p></article>`).join('');
  try{d.showModal()}catch{}
}
function collectNewResults(s,before){
  const rows=[];
  for(const g of s?.schedule||[]){const key=`Varsity:${g.id}`;if(!g.played||before.has(key)||g.v2732NotifiedAt)continue;g.v2732NotifiedAt=new Date().toISOString();rows.push({level:'Varsity',date:g.date,opponent:teamName(s,g.opponentId),myScore:g.myScore,oppScore:g.oppScore,won:Number(g.myScore)>Number(g.oppScore),roundName:g.roundName||''})}
  for(const level of ['JV','Freshman'])for(const g of s?.v2?.subTeams?.[level]?.schedule||[]){const key=`${level}:${g.id}`;if(!g.played||before.has(key)||g.v2732NotifiedAt)continue;g.v2732NotifiedAt=new Date().toISOString();g.v2730NotifiedAt=g.v2730NotifiedAt||g.v2732NotifiedAt;delete g.resultNoticePending;rows.push({level,date:g.date,opponent:teamName(s,g.opponentId),myScore:g.myScore,oppScore:g.oppScore,won:Number(g.myScore)>Number(g.oppScore),roundName:g.roundName||''})}
  if(rows.length){resultQueue.push(...rows.sort((a,b)=>String(a.date).localeCompare(String(b.date))||OWNED.indexOf(a.level)-OWNED.indexOf(b.level)));setTimeout(showQueuedResults,20)}
  return rows.length;
}
function processVarsity(s,today){
  const engine=window.BM27SeasonEngine;const sim=engine?.simulateUserGame;if(typeof sim!=='function')return 0;
  const due=(s.schedule||[]).filter(g=>!g.played&&dayKey(g.date)<=today&&(!g.tbd||g.opponentId)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)));
  let changed=0;
  for(const g of due){
    try{sim(g,{silent:true,calendarBatch:true});if(g.played)changed++}catch(e){console.warn('BM27 v2.7.32 Varsity auto game skipped',g?.id,e)}
  }
  return changed;
}
function processOwnedDay(s=save(),options={}){
  if(!s)return 0;const today=dayKey(s.day);if(!today)return 0;
  let migrated=normalizeOwnedProgram(s);s.v2732=s.v2732||{};
  const beforeSig=dueSignature(s,today);
  if(!migrated&&s.v2732.lastScanDay===today&&s.v2732.lastScanSignature===beforeSig)return 0;
  const before=snapshotPlayed(s);let changed=0;
  // Main Season schedule is not played during Summer/Fall League phases.
  if(!['summer','fall'].includes(stage(s)))changed+=processVarsity(s,today);
  try{changed+=Number(window.BM27V2729?.processDueGames?.(s)||0)}catch(e){console.warn('BM27 v2.7.32 lower-team resolver',e)}
  try{window.BM27V2719?.syncStats?.(s,true)}catch{}
  try{window.BM27V2730?.repairProgramRecords?.(s)}catch{}
  const notices=collectNewResults(s,before);
  const remaining=dueSignature(s,today);s.v2732.lastScanDay=today;s.v2732.lastScanSignature=remaining?`${remaining}|retry`:remaining;s.v2732.lastScanAt=new Date().toISOString();s.v2732.lastReason=options.reason||'calendar-day';
  if(changed||migrated||notices){persistSafe();try{window.BM27V2729?.renderHub?.()}catch{}}
  return changed;
}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2732-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2732-notes><p class="eyebrow">BM27 v2.7.32</p><h3>Owned-Team Daily Calendar + Faster Program</h3><ul class="update-list"><li>Every calendar day now checks Varsity, JV and Freshman in one authoritative resolver and simulates every game whose date has arrived.</li><li>Multiple owned-team games on the same day all resolve before the calendar continues.</li><li>Sophomore and Junior program teams were removed. Existing players from those old team levels are preserved on JV.</li><li>Daily simulation is no longer tied to page rendering, cutting repeated background work on phones, Chromebooks and slower computers.</li><li>One combined Game Day result screen identifies the team, opponent, final score and result for every owned-team game that was auto-simulated.</li></ul></article>`)}
function install(){
  if(window.__BM27_V2732__)return;window.__BM27_V2732__=true;installResultDialog();
  const s=save();if(s){normalizeOwnedProgram(s);processOwnedDay(s,{reason:'install'})}
  if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);if(save())processOwnedDay(save(),{reason:'open-save'});return r}}
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-open-updates]'))setTimeout(addNotes,20)},true);
  window.addEventListener('focus',()=>{const s=save();if(s)processOwnedDay(s,{reason:'focus'})});
  try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.32'}catch{}
  addNotes();
}
window.BM27V2732={version:VERSION,ownedTeams:OWNED,normalizeOwnedProgram,processOwnedDay,dueSignature};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
