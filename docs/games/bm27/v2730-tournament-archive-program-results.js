/* BM27 v2.7.30 — authoritative tournament archival + JV/Freshman game-day results
   Loaded last. Completed-season Varsity tournaments live only in History, and
   lower-level games show a labeled result when the shared career date reaches them.
*/
(()=>{
'use strict';
const VERSION='2.7.30';
const LEVELS=['JV','Freshman'];
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOnly=v=>String(v||'').slice(0,10);
const dateMs=v=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:0};
const seasonLabel=y=>`${Number(y)}-${String(Number(y)+1).slice(-2)}`;
function save(){return typeof current!=='undefined'?current:null}
function toastSafe(m){try{toast?.(m)}catch{}}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.30 persist',e);return false}}
function ensure(s=save()){
  if(!s)return null;s.v2730=s.v2730||{};const v=s.v2730;v.version=VERSION;v.tournamentHistory=Array.isArray(v.tournamentHistory)?v.tournamentHistory:[];v.migrated=!!v.migrated;return v;
}
function teamName(s,id){return s?.teams?.find(t=>eq(t.id,id))?.name||'Opponent'}
function seasonFromDate(v){const d=new Date(v);if(!Number.isFinite(d.getTime()))return null;const y=d.getFullYear(),m=d.getMonth()+1;return m>=7?y:y-1}
function tournamentGames(s,id){return (s?.schedule||[]).filter(g=>eq(g.tournamentId,id))}
function tournamentKey(season,id,name=''){return `${Number(season)}|${String(id||name)}`}
function compactGame(s,g){return {id:g.id||null,date:g.date||null,opponentId:g.opponentId??null,opponentName:teamName(s,g.opponentId),played:!!g.played,myScore:g.myScore??null,oppScore:g.oppScore??null,type:g.type||'Tournament',roundName:g.roundName||null,neutral:!!g.neutral,home:!!g.home}}
function makeArchive(s,t,season,games=tournamentGames(s,t?.id)){
  return {key:tournamentKey(season,t?.id,t?.name),season:Number(season),label:seasonLabel(season),id:t?.id??null,name:t?.name||'Tournament',type:t?.type||t?.kind||'Tournament',kind:t?.kind||t?.type||'Tournament',status:t?.status||'',size:t?.size||t?.teams?.length||0,championId:t?.championId??null,championName:t?.championId?teamName(s,t.championId):null,archivedAt:new Date().toISOString(),tournament:clone(t||{}),games:(games||[]).map(g=>compactGame(s,g))};
}
function upsertArchive(s,entry){
  const v=ensure(s);if(!entry)return false;const key=entry.key||tournamentKey(entry.season,entry.id,entry.name);entry.key=key;const i=v.tournamentHistory.findIndex(x=>x.key===key||(x.id!=null&&entry.id!=null&&Number(x.season)===Number(entry.season)&&eq(x.id,entry.id)));if(i>=0){const old=v.tournamentHistory[i];v.tournamentHistory[i]={...old,...entry,games:(entry.games?.length?entry.games:old.games)||[],tournament:entry.tournament||old.tournament};return false}v.tournamentHistory.push(entry);return true;
}
function archiveSnapshot(s,snapshot,season){let added=0;for(const item of snapshot||[]){const t=item.tournament||item;const games=item.games||[];if(upsertArchive(s,makeArchive(s,t,season,games)))added++}return added}
function cleanupIds(s,ids){
  const set=new Set([...ids].map(String));if(!set.size)return 0;let removed=0;
  const beforeT=(s.tournaments||[]).length;s.tournaments=(s.tournaments||[]).filter(t=>!set.has(String(t.id)));removed+=beforeT-s.tournaments.length;
  s.schedule=(s.schedule||[]).filter(g=>!g.tournamentId||!set.has(String(g.tournamentId)));
  if(Array.isArray(s.seasonEngine?.games))s.seasonEngine.games=s.seasonEngine.games.filter(g=>!g.tournamentId||!set.has(String(g.tournamentId)));
  for(const k of Object.keys(s.teamSchedules||{}))s.teamSchedules[k]=(s.teamSchedules[k]||[]).filter(g=>!g.tournamentId||!set.has(String(g.tournamentId)));
  return removed;
}
function snapshotActive(s){return (s?.tournaments||[]).map(t=>({tournament:clone(t),games:clone(tournamentGames(s,t.id))}))}
function importV2Archives(s){
  let added=0;for(const a of s?.v2?.seasonArchive||[]){if(Number(a.season)>=Number(s.season))continue;for(const t of a.tournaments||[]){const games=(a.schedule||[]).filter(g=>eq(g.tournamentId,t.id)).map(g=>({id:null,date:g.date,opponentId:null,opponentName:g.opponent||'Opponent',played:!!g.played,myScore:g.myScore,oppScore:g.oppScore,type:g.type||t.type,roundName:g.roundName||null}));const entry={key:tournamentKey(a.season,t.id,t.name),season:Number(a.season),label:a.label||seasonLabel(a.season),id:t.id??null,name:t.name||'Tournament',type:t.type||t.kind||'Tournament',kind:t.kind||t.type||'Tournament',status:t.status||'',size:t.size||0,championId:t.championId??null,championName:t.championName||null,archivedAt:new Date().toISOString(),tournament:clone(t),games};if(upsertArchive(s,entry))added++}}
  return added;
}
function repairProgramRecords(s){let changed=0;s.v2=s.v2||{};s.v2.subTeams=s.v2.subTeams||{};for(const level of LEVELS){const st=s.v2.subTeams[level];if(!st)continue;st.schedule=Array.isArray(st.schedule)?st.schedule:[];let w=0,l=0;for(const g of st.schedule){g.level=level;if(g.played&&Number.isFinite(Number(g.myScore))&&Number.isFinite(Number(g.oppScore))){if(Number(g.myScore)>Number(g.oppScore))w++;else l++}}if(Number(st.wins)!==w||Number(st.losses)!==l){st.wins=w;st.losses=l;changed++}}return changed}
function migrateExisting(s=save(),force=false){
  if(!s)return 0;const v=ensure(s);let changed=0;changed+=importV2Archives(s);const priorIds=new Set();
  for(const a of s?.v2?.seasonArchive||[])if(Number(a.season)<Number(s.season))for(const t of a.tournaments||[])if(t?.id!=null)priorIds.add(String(t.id));
  const stage=s?.v2721?.stage||'regular',fallbackSeason=Number(s?.v2721?.startedFromSeason??(Number(s.season)-1));
  for(const t of [...(s.tournaments||[])]){
    const games=tournamentGames(s,t.id);const inferred=games.map(g=>seasonFromDate(g.date)).filter(Number.isFinite).sort((a,b)=>a-b)[0];
    const staleByArchive=priorIds.has(String(t.id)),staleByDate=Number.isFinite(inferred)&&inferred<Number(s.season),staleByOffseason=['summer','fall'].includes(stage);
    if(staleByArchive||staleByDate||staleByOffseason){const yr=staleByArchive?([...s.v2.seasonArchive].reverse().find(a=>(a.tournaments||[]).some(x=>eq(x.id,t.id)))?.season??fallbackSeason):(staleByDate?inferred:fallbackSeason);if(upsertArchive(s,makeArchive(s,t,yr,games)))changed++;cleanupIds(s,[t.id]);changed++}
  }
  changed+=repairProgramRecords(s);if(!v.migrated||force){v.migrated=true;v.migratedAt=v.migratedAt||new Date().toISOString();changed++}return changed;
}
function recordThrough(st,g){let w=0,l=0;const end=dateMs(g.date);for(const x of st.schedule||[]){if(!x.played||dateMs(x.date)>end)continue;if(!Number.isFinite(Number(x.myScore))||!Number.isFinite(Number(x.oppScore)))continue;if(Number(x.myScore)>Number(x.oppScore))w++;else l++}return`${w}-${l}`}
function pendingProgramResults(s=save(),mark=false){
  if(!s)return[];const out=[];for(const level of LEVELS){const st=s?.v2?.subTeams?.[level];if(!st)continue;for(const g of st.schedule||[]){if(!g.played||g.v2730NotifiedAt)continue;const justResolved=!!g.resultNoticePending||(g.completedAt&&dateOnly(g.completedAt)===dateOnly(s.day));if(!justResolved)continue;const opp=teamName(s,g.opponentId);out.push({level,id:g.id,opponent:opp,date:g.date,myScore:g.myScore,oppScore:g.oppScore,forfeit:!!g.forfeit,won:Number(g.myScore)>Number(g.oppScore),roundName:g.roundName||'',record:recordThrough(st,g)});if(mark){g.v2730NotifiedAt=new Date().toISOString();delete g.resultNoticePending}}}return out.sort((a,b)=>dateMs(a.date)-dateMs(b.date)||a.level.localeCompare(b.level));
}
let resultQueue=[];
function installResultDialog(){if($('v2730ProgramResultsDialog'))return;document.body.insertAdjacentHTML('beforeend',`<dialog id="v2730ProgramResultsDialog" class="v2730-results-dialog"><div class="modal-head"><div><p class="eyebrow">PROGRAM GAME DAY</p><h2>JV & Freshman Results</h2></div></div><div id="v2730ProgramResultsList" class="stack"></div><button id="v2730ProgramResultsClose" class="primary wide" type="button">Continue</button></dialog>`);$('v2730ProgramResultsClose')?.addEventListener('click',()=>{try{$('v2730ProgramResultsDialog').close()}catch{};setTimeout(showQueuedResults,0)})}
function showQueuedResults(){installResultDialog();const d=$('v2730ProgramResultsDialog');if(!d||d.open||!resultQueue.length)return;const other=[...document.querySelectorAll('dialog[open]')].find(x=>x!==d);if(other){setTimeout(showQueuedResults,250);return}const batch=resultQueue.splice(0,resultQueue.length);$('v2730ProgramResultsList').innerHTML=batch.map(r=>`<article class="card v2730-result ${r.won?'win':'loss'}"><div class="section-head"><div><p class="eyebrow">${esc(r.level.toUpperCase())} • FINAL</p><h3>${r.forfeit?'Forfeit':`${r.won?'WIN':'LOSS'} ${esc(r.myScore)}-${esc(r.oppScore)}`}</h3></div><span class="tag">${esc(r.level)} ${esc(r.record)}</span></div><p><b>${esc(r.opponent)}</b>${r.roundName?` • ${esc(r.roundName)}`:''}</p><p class="muted small">${new Date(r.date).toLocaleDateString()} • This result has been saved to the ${esc(r.level)} schedule and record.</p></article>`).join('');try{d.showModal()}catch{}}
function collectAndShow(s=save()){
  const found=pendingProgramResults(s,false);if(!found.length)return 0;pendingProgramResults(s,true);resultQueue.push(...found);persistSafe();setTimeout(showQueuedResults,20);return found.length;
}
function renderTournamentHistory(){
  const s=save(),host=$('historyContent');if(!s||!host)return;ensure(s);host.querySelector('#v2730TournamentHistory')?.remove();const hist=(s.v2730.tournamentHistory||[]).slice().sort((a,b)=>Number(b.season)-Number(a.season)||String(a.name).localeCompare(String(b.name)));if(!hist.length)return;
  const groups=new Map();for(const x of hist){const k=Number(x.season);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}const sec=document.createElement('section');sec.id='v2730TournamentHistory';sec.className='card v2730-tournament-history';sec.innerHTML=`<div class="section-head"><div><p class="eyebrow">ARCHIVED VARSITY EVENTS</p><h3>Tournament History</h3><p class="muted small">Completed-season tournaments are removed from the active Schedule and Tournaments tabs and live here permanently.</p></div><span class="tag">${hist.length} event${hist.length===1?'':'s'}</span></div>${[...groups.entries()].sort((a,b)=>b[0]-a[0]).map(([season,items])=>`<details><summary><b>${seasonLabel(season)}</b> • ${items.length} tournament${items.length===1?'':'s'}</summary>${items.map(t=>`<article class="v2730-history-event"><div class="row"><div><b>${esc(t.name)}</b><br><small>${esc(t.type||'Tournament')}${t.status?' • '+esc(t.status):''}${t.championName?' • Champion: '+esc(t.championName):''}</small></div><span class="tag">${Number(t.size)||'?'} teams</span></div><div class="stack">${(t.games||[]).length?(t.games||[]).map(g=>`<div class="row"><span>${g.date?new Date(g.date).toLocaleDateString()+' • ':''}${esc(g.roundName||g.type||'Tournament')} • ${esc(g.opponentName||'Opponent')}</span><b>${g.played?(Number(g.myScore)>Number(g.oppScore)?'W ':'L ')+esc(g.myScore)+'-'+esc(g.oppScore):'Unplayed'}</b></div>`).join(''):'<p class="muted small">Bracket archived. No user schedule games were stored for this event.</p>'}</div></article>`).join('')}</details>`).join('')}`;host.appendChild(sec)
}
function archiveCompletedSeason(before,after,season,snapshot){const added=archiveSnapshot(after,snapshot,season),ids=new Set((snapshot||[]).map(x=>String((x.tournament||x).id)).filter(Boolean));cleanupIds(after,ids);after.v2730=after.v2730||{};after.v2730.lastArchivedSeason=Number(season);after.v2730.lastArchiveAt=new Date().toISOString();return added}
let baseOffseason=null,baseRenderAll=null,baseRenderHistory=null;
function install(){
  if(window.__BM27_V2730__)return;window.__BM27_V2730__=true;installResultDialog();
  if(typeof applyOffseason==='function'){baseOffseason=applyOffseason;applyOffseason=function(){const before=save(),season=Number(before?.season),snap=before?snapshotActive(before):[];const r=baseOffseason.apply(this,arguments);const after=save();if(after&&Number(after.season)>season){const added=archiveCompletedSeason(before,after,season,snap);migrateExisting(after,true);persistSafe();if(added||snap.length)toastSafe(`${snap.length} tournament${snap.length===1?'':'s'} moved to History.`);try{renderTournamentHistory();renderTournaments?.();renderSchedule?.()}catch{}}return r}}
  if(typeof renderHistory==='function'){baseRenderHistory=renderHistory;renderHistory=function(){const r=baseRenderHistory.apply(this,arguments);renderTournamentHistory();return r}}
  if(typeof renderAll==='function'){baseRenderAll=renderAll;renderAll=function(){const s=save();if(s){const changed=migrateExisting(s);if(changed)persistSafe()}const r=baseRenderAll.apply(this,arguments);if(save()){repairProgramRecords(save());renderTournamentHistory();collectAndShow(save());try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.30'}catch{}}return r}}
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="history"]'))setTimeout(renderTournamentHistory,0);if(e.target.closest?.('[data-page="schedule"]'))setTimeout(()=>collectAndShow(save()),0);if(e.target.closest?.('[data-open-updates]'))setTimeout(addNotes,20)},true);
  const s=save();if(s){const changed=migrateExisting(s,true);repairProgramRecords(s);if(changed)persistSafe();renderTournamentHistory();collectAndShow(s)}addNotes();
}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2730-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2730-notes><p class="eyebrow">BM27 v2.7.30</p><h3>Tournament Archive + Program Game-Day Results</h3><ul class="update-list"><li>After a season, Varsity tournaments are copied to permanent History and removed from the active Schedule, Tournaments tab, season ledger and team schedules.</li><li>Existing saves repair lingering tournaments that belong to prior seasons without deleting their historical copy.</li><li>JV and Freshman games now show a labeled final-score popup when their scheduled date is reached.</li><li>Lower-level schedules show W/L scores and their records are recalculated from completed games, including older saves.</li></ul></article>`)}
window.BM27V2730={version:VERSION,ensure,migrate:migrateExisting,archiveSnapshot,cleanupIds,pendingProgramResults,repairProgramRecords,renderTournamentHistory,collectAndShow};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
