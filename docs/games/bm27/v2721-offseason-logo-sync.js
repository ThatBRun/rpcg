/* BM27 v2.7.21 — Cross-device logo loader + staged offseason calendar
   Loaded last so it can coordinate every older offseason wrapper safely.
*/
(()=>{
'use strict';
const VERSION='2.7.22';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const clone=o=>JSON.parse(JSON.stringify(o));
const iso=(year,month,day,hour=12)=>`${Number(year)}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00`;
const dateOnly=v=>String(v||'').slice(0,10);
const monthOf=v=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.getMonth()+1:0};
function save(){return typeof current!=='undefined'?current:null}
function me(s=save()){return s?.teams?.find(t=>eq(t.id,s.schoolId))||null}
function persistSafe(){try{persist?.()}catch(e){console.warn('BM27 v2.7.22 persist',e)}}
function renderSafe(){try{renderAll?.()}catch(e){console.warn('BM27 v2.7.22 render',e)}}
function notify(msg){try{toast?.(msg)}catch{} }

function ensure(s=save()){
  if(!s)return null;
  s.v2721=s.v2721||{};
  const v=s.v2721;
  v.version=VERSION;
  v.offseasonHistory=Array.isArray(v.offseasonHistory)?v.offseasonHistory:[];
  if(!v.stage){
    const m=monthOf(s.day),hasSchedule=(s.schedule||[]).length>0,hasPlayed=(s.schedule||[]).some(g=>g.played);
    if(!hasSchedule&&!s.tryoutsFinalized&&m>=10&&m<=11){v.stage='preseason';v.seasonStart=iso(s.season,11,24);}
    else if(!hasPlayed&&m===9&&(s.leagues?.fall?.length||0)){v.stage='fall';v.seasonStart=iso(s.season,11,24);}
    else if(!hasPlayed&&m>=5&&m<=8&&(s.leagues?.summer?.length||0)){v.stage='summer';v.seasonStart=iso(s.season,11,24);}
    else v.stage='regular';
  }
  s.leagues=s.leagues||{summer:[],fall:[]};
  s.leagues.summer=Array.isArray(s.leagues.summer)?s.leagues.summer:[];
  s.leagues.fall=Array.isArray(s.leagues.fall)?s.leagues.fall:[];
  v.seasonStart=v.seasonStart||iso(s.season,11,24);
  return v;
}
function stage(){return ensure()?.stage||'regular'}
function stageName(x=stage()){return ({summer:'Summer League',fall:'Fall League',preseason:'Preseason',regular:'Regular Season'}[x]||'Regular Season')}
function leagueRecord(list){let w=0,l=0;for(const g of list||[])if(g.played){if(Number(g.myScore)>Number(g.oppScore))w++;else l++}return{w,l}}
function allLeaguePlayed(type){const list=save()?.leagues?.[type]||[];return list.length>0&&list.every(g=>g.played)}
function seasonStartDate(s=save()){return iso(s?.season||2026,11,24)}
function beforeSeasonStart(date,s=save()){return new Date(date).getTime()<new Date(seasonStartDate(s)).getTime()}
function gameIsRegular(g){return g&&!['Summer League','Fall League'].includes(g.type)&&!g.nationalTournament}

function offseasonRating(s=save()){
  const lists=[];
  if(Array.isArray(s?.v2?.programPlayers))lists.push(...s.v2.programPlayers.filter(p=>Number(p.grade)<12));
  if(Array.isArray(s?.tryoutPool))lists.push(...s.tryoutPool);
  if(me(s)?.roster?.length)lists.push(...me(s).roster);
  const seen=new Set(),players=lists.filter(p=>{const k=String(p?.id||p?.name||'');if(!k||seen.has(k))return false;seen.add(k);return true}).sort((a,b)=>(Number(b.overall)||0)-(Number(a.overall)||0)).slice(0,15);
  if(!players.length)return Number(me(s)?.rating)||70;
  return Math.round(players.reduce((n,p)=>n+(Number(p.overall)||65),0)/players.length);
}
function leagueScore(type,g){
  const s=save(),opp=s?.teams?.find(t=>eq(t.id,g.opponentId));if(!s||!opp)return null;
  const ar=offseasonRating(s),br=Number(opp.rating)||70,home=g.home===true?2:g.neutral?0:-1,edge=(ar-br)*.32+home;
  let a=Math.max(35,Math.round(61+ar*.17+edge+(Math.random()-.5)*18));
  let b=Math.max(35,Math.round(61+br*.17-edge*.35+(Math.random()-.5)*18));
  if(a===b)a++;
  return[a,b];
}
function playLeagueGame(type,id){
  const s=save(),v=ensure(s);if(!s||!v)return;
  if(v.stage!==type)return notify(`${stageName(type)} games can only be played during the ${stageName(type)} phase.`);
  const g=s.leagues?.[type]?.find(x=>eq(x.id,id));if(!g||g.played)return;
  const sc=leagueScore(type,g);if(!sc)return notify('Opponent could not be found.');
  g.played=true;g.myScore=sc[0];g.oppScore=sc[1];g.completedAt=s.day;g.type=type==='summer'?'Summer League':'Fall League';
  const opp=s.teams.find(t=>eq(t.id,g.opponentId));
  s.news=s.news||[];s.news.unshift({date:s.day,category:type==='summer'?'Summer League':'Fall League',text:`${stageName(type)}: ${me(s)?.name||'Your team'} ${sc[0]>sc[1]?'defeated':'lost to'} ${opp?.name||'Opponent'}, ${sc[0]}-${sc[1]}. This result does not affect the regular-season record.`});
  // Small development benefit only; no regular-season box score or season stats are written.
  const pool=(s.v2?.programPlayers||s.tryoutPool||[]).filter(p=>Number(p.grade)<12).sort(()=>Math.random()-.5).slice(0,2);
  for(const p of pool){if(Number.isFinite(Number(p.overall))&&Math.random()<.5)p.overall=Math.min(99,Number(p.overall)+1)}
  persistSafe();renderSafe();
}
function removeLeagueGame(type,id){const s=save();if(!s)return;s.leagues[type]=(s.leagues[type]||[]).filter(g=>!eq(g.id,id));persistSafe();renderSafe()}

function renderLeagueList(type){
  const s=save(),v=ensure(s),host=$(type+'Schedule');if(!s||!v||!host)return;
  const list=s.leagues[type]||[],active=v.stage===type;
  host.innerHTML=list.length?list.map(g=>{const o=s.teams.find(t=>eq(t.id,g.opponentId));return `<div class="row v2721-league-row"><div><b>${g.home?'vs':g.neutral?'vs (N)':'at'} ${o?.name||'Unknown'}</b><br><small>${new Date(g.date).toLocaleDateString()} • ${g.played?`${g.myScore}-${g.oppScore}`:'Development game • does not count toward season record'}</small></div><div class="schedule-actions">${!g.played&&active?`<button class="primary small-btn" data-v2721-play-league="${type}:${g.id}">Play / Sim</button><button class="secondary small-btn" data-v2721-remove-league="${type}:${g.id}">Remove</button>`:g.played?'<span class="tag">Played</span>':'<span class="tag">Locked</span>'}</div></div>`}).join(''):'<p class="muted small">No games scheduled.</p>';
  host.querySelectorAll('[data-v2721-play-league]').forEach(b=>b.onclick=()=>{const [t,id]=b.dataset.v2721PlayLeague.split(':');playLeagueGame(t,id)});
  host.querySelectorAll('[data-v2721-remove-league]').forEach(b=>b.onclick=()=>{const [t,id]=b.dataset.v2721RemoveLeague.split(':');removeLeagueGame(t,id)});
  const count=$(type+'Count'),r=leagueRecord(list);if(count)count.textContent=`${list.length}/10 • ${r.w}-${r.l}`;
}
function phaseInstructions(v){
  if(v.stage==='summer')return 'Summer League begins May 30. Import/add or AI-build 1–10 development games, play every scheduled game, then end Summer League.';
  if(v.stage==='fall')return 'Fall League begins September 4. Import/add or AI-build 1–10 development games, play every scheduled game, then end Fall League.';
  if(v.stage==='preseason')return 'Preseason begins November 1. Build/finalize your team and schedule the new season. Regular-season games cannot begin before November 24.';
  return 'Regular season is active. Summer and Fall League results stay separate from the season record and history.';
}
function renderPhaseCard(){
  const s=save(),v=ensure(s),page=$('leaguesPage');if(!s||!v||!page)return;
  let card=$('v2721OffseasonFlow');if(!card){card=document.createElement('article');card.id='v2721OffseasonFlow';card.className='card v2721-flow';const head=page.querySelector('.section-head');head?.insertAdjacentElement('afterend',card)}
  const sr=leagueRecord(s.leagues.summer),fr=leagueRecord(s.leagues.fall),canEndSummer=allLeaguePlayed('summer'),canEndFall=allLeaguePlayed('fall'),nationalDone=!!(s.v22?.nationals?.championId||s.v22?.nationals?.status==='Complete');
  card.innerHTML=`<div class="section-head"><div><p class="eyebrow">OFFSEASON CALENDAR • ${dateOnly(s.day)}</p><h3>${stageName(v.stage)}</h3><p class="muted small">${phaseInstructions(v)}</p></div><span class="tag">${v.stage==='regular'?'SEASON':v.stage.toUpperCase()}</span></div><div class="v2721-flow-steps"><span class="${v.stage==='summer'?'active':''}">May 30<br><b>Summer</b></span><span class="${v.stage==='fall'?'active':''}">Sep 4<br><b>Fall</b></span><span class="${v.stage==='preseason'?'active':''}">Nov 1<br><b>Preseason</b></span><span class="${v.stage==='regular'?'active':''}">Nov 24<br><b>Season</b></span></div><div class="metrics"><div class="metric"><span>Summer</span><b>${sr.w}-${sr.l}</b></div><div class="metric"><span>Fall</span><b>${fr.w}-${fr.l}</b></div><div class="metric"><span>Season Starts</span><b>Nov 24</b></div></div><div class="schedule-actions">${v.stage==='regular'&&nationalDone?`<button id="v2722StartSummer" class="primary">Start Summer League — May 30</button>`:''}${v.stage==='summer'?`<button id="v2721EndSummer" class="primary" ${canEndSummer?'':'disabled'}>End Summer League</button>`:''}${v.stage==='fall'?`<button id="v2721EndFall" class="primary" ${canEndFall?'':'disabled'}>End Fall League</button>`:''}${v.stage==='preseason'?`<button id="v2721StartSeason" class="primary">Start Regular Season — Nov 24</button>`:''}</div>${v.stage==='regular'&&nationalDone?'<p class="muted small">The National Championship is complete. Start Summer League here when you are ready to roll the career into the offseason.</p>':''}${v.stage==='summer'&&!canEndSummer?'<p class="muted small">Schedule at least one Summer League game and finish every scheduled game before ending Summer League.</p>':''}${v.stage==='fall'&&!canEndFall?'<p class="muted small">Schedule at least one Fall League game and finish every scheduled game before ending Fall League.</p>':''}`;
  $('v2722StartSummer')?.addEventListener('click',()=>{if(window.BM27V2736?.advancePhase)return window.BM27V2736.advancePhase();if(typeof applyOffseason==='function')applyOffseason()});
  $('v2721EndSummer')?.addEventListener('click',()=>window.BM27V2736?.advancePhase?.()??endSummer());
  $('v2721EndFall')?.addEventListener('click',()=>window.BM27V2736?.advancePhase?.()??endFall());
  $('v2721StartSeason')?.addEventListener('click',()=>window.BM27V2736?.advancePhase?.()??startRegularSeason());
}
function archiveOffseason(s=save()){
  const v=ensure(s);if(!s||!v)return;
  const key=`${s.season}-offseason`;
  const entry={id:key,season:Number(s.season),label:`${s.season} Offseason`,summer:clone(s.leagues.summer||[]),fall:clone(s.leagues.fall||[]),archivedAt:s.day};
  const i=v.offseasonHistory.findIndex(x=>x.id===key);if(i>=0)v.offseasonHistory[i]=entry;else v.offseasonHistory.push(entry);
}
function endSummer(){const s=save(),v=ensure(s);if(!s||v.stage!=='summer')return;if(!allLeaguePlayed('summer'))return notify('Finish every scheduled Summer League game first.');v.stage='fall';s.day=iso(s.season,9,4);s.news=s.news||[];s.news.unshift({date:s.day,category:'Fall League',text:'Summer League is complete. Fall League opens September 4.'});persistSafe();renderSafe()}
function endFall(){const s=save(),v=ensure(s);if(!s||v.stage!=='fall')return;if(!allLeaguePlayed('fall'))return notify('Finish every scheduled Fall League game first.');archiveOffseason(s);v.stage='preseason';v.seasonStart=seasonStartDate(s);s.day=iso(s.season,11,1);s.schedule=[];s.scheduleLocked=false;for(const t of s.teams||[]){t.wins=0;t.losses=0;t.pf=0;t.pa=0}if(s.seasonEngine?.games) s.seasonEngine.games=[];s.news=s.news||[];s.news.unshift({date:s.day,category:'Program',text:'Fall League is complete. Preseason opens November 1. The new-year record is 0-0 and regular-season games begin November 24.'});try{window.BM27SeasonEngine?.migrate?.(s,{reset:true});window.BM27SeasonEngine?.rebuildRecords?.()}catch{}persistSafe();renderSafe()}
function normalizeSeasonDates(s=save()){
  if(!s)return;const floor=new Date(seasonStartDate(s));let cursor=new Date(floor);
  const games=(s.schedule||[]).filter(gameIsRegular).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  for(const g of games){const d=new Date(g.date);if(d<floor){g.date=new Date(cursor).toISOString();cursor.setDate(cursor.getDate()+2)}else if(d>=cursor)cursor=new Date(d)}
  s.schedule?.sort?.((a,b)=>new Date(a.date)-new Date(b.date));
}
function startRegularSeason(){const s=save(),v=ensure(s);if(!s||v.stage!=='preseason')return;normalizeSeasonDates(s);s.day=seasonStartDate(s);v.stage='regular';s.news=s.news||[];s.news.unshift({date:s.day,category:'Program',text:`The ${s.season}-${String(Number(s.season)+1).slice(-2)} regular season officially begins November 24.`});persistSafe();renderSafe()}

let inheritedOffseason=null,inheritedRenderLeagues=null,inheritedRenderHistory=null,inheritedRenderAll=null,inheritedAdvance=null,inheritedAiLeague=null,inheritedOpenLeague=null;
function beginOffseason(){
  const s=save(),v=ensure(s);if(!s)return;
  if(v.stage!=='regular')return notify(`You are already in the ${stageName(v.stage)} phase.`);
  const startSeason=Number(s.season)||0;
  const r=inheritedOffseason?.apply(this,arguments);
  const after=save();if(!after||Number(after.season)<=startSeason)return r;
  const z=ensure(after);z.stage='summer';z.startedFromSeason=startSeason;z.offseasonYear=Number(after.season);z.seasonStart=seasonStartDate(after);after.day=iso(after.season,5,30);after.schedule=[];after.scheduleLocked=true;after.leagues={summer:[],fall:[]};after.news=after.news||[];after.news.unshift({date:after.day,category:'Summer League',text:'Offseason begins May 30. Summer League is now open. Summer/Fall results are stored separately and do not affect the regular-season record.'});persistSafe();renderSafe();setTimeout(()=>document.querySelector('[data-page="leagues"]')?.click(),0);return r;
}
function renderHistoryExtra(){
  const s=save(),v=ensure(s),host=$('historyContent');if(!s||!v||!host)return;
  host.querySelector('#v2721OffseasonHistory')?.remove();
  const archives=v.offseasonHistory||[];const section=document.createElement('section');section.id='v2721OffseasonHistory';section.className='card v2721-history';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">SEPARATE DEVELOPMENT HISTORY</p><h3>Summer & Fall League History</h3><p class="muted small">These games never count toward a regular-season record, season stats, Districts, State, or the previous year's history.</p></div></div>${archives.length?archives.slice().reverse().map(a=>{const sr=leagueRecord(a.summer),fr=leagueRecord(a.fall);return `<details><summary><b>${a.label}</b><span>Summer ${sr.w}-${sr.l} • Fall ${fr.w}-${fr.l}</span></summary><div class="office-grid"><div><h4>Summer League</h4>${(a.summer||[]).map(g=>historyGame(s,g)).join('')||'<p class="muted small">No games.</p>'}</div><div><h4>Fall League</h4>${(a.fall||[]).map(g=>historyGame(s,g)).join('')||'<p class="muted small">No games.</p>'}</div></div></details>`}).join(''):'<p class="muted">No completed Summer/Fall League cycle yet.</p>'}`;
  host.appendChild(section);
  // v2.7.36: the final phase controller owns nextSeasonBtn text and behavior.
}
function historyGame(s,g){const o=s.teams?.find(t=>eq(t.id,g.opponentId));return `<div class="row"><span>${o?.name||'Opponent'}</span><b>${g.played?`${g.myScore}-${g.oppScore}`:'Not played'}</b></div>`}
function aiLeague2721(type){
  const s=save(),v=ensure(s);if(!s)return;if(v.stage!==type)return notify(`${stageName(type)} scheduling is locked right now.`);
  const pool=(s.teams||[]).filter(t=>!eq(t.id,s.schoolId)).slice().sort(()=>Math.random()-.5).slice(0,10),dates=[];
  const start=type==='summer'?new Date(iso(s.season,6,3,18)):new Date(iso(s.season,9,6,18));
  for(let i=0;i<pool.length;i++){const d=new Date(start);d.setDate(d.getDate()+i*4);dates.push(d.toISOString())}
  s.leagues[type]=pool.map((o,i)=>({id:typeof uid==='function'?uid():`${type}-${Date.now()}-${i}`,opponentId:o.id,date:dates[i],home:i%2===0,neutral:false,played:false,type:type==='summer'?'Summer League':'Fall League'}));persistSafe();renderSafe();notify(`${stageName(type)} schedule imported with ${pool.length} games.`)
}
function openLeague2721(type){
  const s=save(),v=ensure(s);if(!s)return;if(v.stage!==type)return notify(`${stageName(type)} scheduling is locked right now.`);
  if((s.leagues[type]||[]).length>=10)return notify('This league already has 10 games.');
  inheritedOpenLeague?.call(this,type);
  const input=$('leagueDate');if(input){if(type==='summer'){input.min=`${s.season}-05-30`;input.max=`${s.season}-09-03`;if(beforeRange(input.value,input.min,input.max))input.value=`${s.season}-06-03`}else{input.min=`${s.season}-09-04`;input.max=`${s.season}-10-31`;if(beforeRange(input.value,input.min,input.max))input.value=`${s.season}-09-06`}}
}
function beforeRange(v,min,max){return !v||v<min||v>max}
function refreshPhaseUI(){
  const s=save(),v=ensure(s);if(!s||!v)return;
  renderPhaseCard();renderLeagueList('summer');renderLeagueList('fall');
  const summerActive=v.stage==='summer',fallActive=v.stage==='fall';
  document.querySelectorAll('[data-league-ai="summer"],[data-league-add="summer"]').forEach(b=>{b.disabled=!summerActive});
  document.querySelectorAll('[data-league-ai="fall"],[data-league-add="fall"]').forEach(b=>{b.disabled=!fallActive});
  const a1=document.querySelector('[data-league-ai="summer"]'),a2=document.querySelector('[data-league-ai="fall"]');if(a1)a1.textContent='Import / AI Build Summer Games';if(a2)a2.textContent='Import / AI Build Fall Games';
  const b1=document.querySelector('[data-league-add="summer"]'),b2=document.querySelector('[data-league-add="fall"]');if(b1)b1.textContent='Add Summer Game';if(b2)b2.textContent='Add Fall Game';
  const offseason=v.stage==='summer'||v.stage==='fall';
  for(const id of ['addGameBtn','aiScheduleBtn','addTbdBtn','addTournamentBtn','createTournamentHubBtn','playNextBtn']){const b=$(id);if(b&&offseason)b.disabled=true}
  for(const id of ['advanceBtn','simWeekBtn']){const b=$(id);if(b)b.disabled=offseason}
  if(v.stage==='preseason'){
    const add=$('addGameBtn');if(add)add.disabled=!s.tryoutsFinalized;
    const help=$('scheduleHelp');if(help)help.textContent='Preseason opens November 1. Build your team and schedule games now; all regular-season games must be November 24 or later.';
  }
  const date=$('scheduleDate');if(date&&(v.stage==='preseason'||v.stage==='regular'))date.min=`${s.season}-11-24`;
}
function installLogoLoader(){
  const box=$('branding255');if(!box||$('v2721LoadSyncedLogos'))return;
  const article=box.querySelector('.brandImport');if(!article)return;const btn=document.createElement('button');btn.id='v2721LoadSyncedLogos';btn.type='button';btn.className='primary';btn.textContent='LOAD SYNCED LOGOS FROM MY ACCOUNT';
  const test=$('brTest');(test||article.querySelector('#brRemove'))?.insertAdjacentElement('afterend',btn);
  btn.onclick=async()=>{const st=$('brStatus');if(!window.cloudGame?.signedIn){if(st)st.textContent='Sign in to your BM27 account first.';return}btn.disabled=true;if(st)st.textContent='Loading synced logos from your account…';try{await window.BM27Branding255?.absorbCloud?.();window.BM27Branding255?.setMode?.('authentic');const total=Object.keys(window.BM27Branding255?.allLocal?.()||{}).length;if(st)st.textContent=`Synced logos loaded. ${total} imported/account logo${total===1?'':'s'} available on this device.`;window.BM27Branding255?.refresh?.()}catch(e){console.error(e);if(st)st.textContent='Could not load synced logos: '+(window.cloudGame?.errorText?.(e)||e?.message||String(e))}finally{btn.disabled=false}}
}
function scheduleGuards(){
  const form=$('scheduleForm');if(form&&!form.dataset.v2721Guard){form.dataset.v2721Guard='1';form.addEventListener('submit',e=>{const s=save(),v=ensure(s);if(!s||!v)return;if(v.stage==='summer'||v.stage==='fall'){e.preventDefault();e.stopImmediatePropagation();notify('Regular-season scheduling opens November 1.');return}const raw=$('scheduleDate')?.value;if(raw&&raw<`${s.season}-11-24`){e.preventDefault();e.stopImmediatePropagation();notify('Regular-season games cannot be scheduled before November 24.')}},true)}
  const tf=$('tournamentForm');if(tf&&!tf.dataset.v2721Guard){tf.dataset.v2721Guard='1';tf.addEventListener('submit',e=>{const s=save(),v=ensure(s),raw=$('tournamentStart')?.value;if(!s||!v)return;if(v.stage==='summer'||v.stage==='fall'||(raw&&raw<`${s.season}-11-24`)){e.preventDefault();e.stopImmediatePropagation();notify(v.stage==='summer'||v.stage==='fall'?'Regular-season tournaments open November 1.':'Season tournaments cannot begin before November 24.')}},true)}
  const lf=$('leagueForm');if(lf&&!lf.dataset.v2721Guard){lf.dataset.v2721Guard='1';lf.addEventListener('submit',e=>{const s=save(),v=ensure(s),type=$('leagueType')?.value,raw=$('leagueDate')?.value;if(!s||!v)return;if(v.stage!==type){e.preventDefault();e.stopImmediatePropagation();notify(`${stageName(type)} scheduling is locked right now.`);return}const min=type==='summer'?`${s.season}-05-30`:`${s.season}-09-04`,max=type==='summer'?`${s.season}-09-03`:`${s.season}-10-31`;if(raw&&(raw<min||raw>max)){e.preventDefault();e.stopImmediatePropagation();notify(`${stageName(type)} games must be scheduled between ${min} and ${max}.`) }},true)}
}
function install(){
  if(window.__BM27_V2721__)return;window.__BM27_V2721__=true;
  inheritedOffseason=typeof applyOffseason==='function'?applyOffseason:null;if(inheritedOffseason)applyOffseason=beginOffseason;
  if(typeof renderLeagues==='function'){inheritedRenderLeagues=renderLeagues;renderLeagues=function(){const r=inheritedRenderLeagues.apply(this,arguments);refreshPhaseUI();return r}}
  if(typeof renderHistory==='function'){inheritedRenderHistory=renderHistory;renderHistory=function(){const r=inheritedRenderHistory.apply(this,arguments);renderHistoryExtra();return r}}
  if(typeof renderAll==='function'){inheritedRenderAll=renderAll;renderAll=function(){const r=inheritedRenderAll.apply(this,arguments);refreshPhaseUI();renderHistoryExtra();installLogoLoader();try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.23'}catch{}return r}}
  if(typeof advance==='function'){inheritedAdvance=advance;advance=function(days=1){const s=save(),v=ensure(s);if(v&&(v.stage==='summer'||v.stage==='fall')){notify(`Finish the ${stageName(v.stage)} phase before advancing the calendar.`);return}const r=inheritedAdvance.apply(this,arguments);const a=save(),z=ensure(a);if(a&&z?.stage==='preseason'&&!beforeSeasonStart(a.day,a)){z.stage='regular';if(new Date(a.day)<new Date(seasonStartDate(a)))a.day=seasonStartDate(a);normalizeSeasonDates(a);persistSafe();renderSafe()}return r}}
  if(typeof aiLeague==='function'){inheritedAiLeague=aiLeague;aiLeague=aiLeague2721}
  if(typeof openLeagueDialog==='function'){inheritedOpenLeague=openLeagueDialog;openLeagueDialog=openLeague2721}
  document.querySelectorAll('[data-league-ai]').forEach(b=>b.onclick=()=>aiLeague2721(b.dataset.leagueAi));document.querySelectorAll('[data-league-add]').forEach(b=>b.onclick=()=>openLeague2721(b.dataset.leagueAdd));
  scheduleGuards();ensure();refreshPhaseUI();renderHistoryExtra();installLogoLoader();try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.23'}catch{}
  let repairTimer=0;new MutationObserver(()=>{if(document.getElementById('pn2713')||repairTimer)return;repairTimer=setTimeout(()=>{repairTimer=0;installLogoLoader();scheduleGuards()},280)}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-open-updates]'))setTimeout(addNotes,20);
    if(e.target.closest('#branding255Btn'))setTimeout(installLogoLoader,30);
    if(e.target.closest('#addGameBtn')&&stage()==='preseason')setTimeout(()=>{const s=save(),d=$('scheduleDate');if(s&&d){d.min=`${s.season}-11-24`;if(!d.value||d.value<d.min)d.value=d.min}},20);
    if((e.target.closest('#addTournamentBtn')||e.target.closest('#createTournamentHubBtn'))&&stage()==='preseason')setTimeout(()=>{const s=save(),d=$('tournamentStart');if(s&&d){d.min=`${s.season}-11-24`;if(!d.value||d.value<d.min)d.value=d.min}},20);
    if(e.target.closest('#aiScheduleBtn')&&stage()==='preseason')setTimeout(()=>{const s=save();if(s){normalizeSeasonDates(s);persistSafe();try{renderSchedule?.()}catch{}refreshPhaseUI()}},40);
  },true);
  addNotes();
}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2721-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2721-notes><p class="eyebrow">BM27 v2.7.22</p><h3>Faster Startup + Play Now Gameplay Overhaul</h3><ul class="update-list"><li>Reduced startup/background repair work and deferred uncached nationwide refreshes until the first idle window so the menu becomes usable faster.</li><li>When Varsity March Madness has a champion, the Summer & Fall tab now shows Start Summer League — May 30.</li><li>Play Now contact is no longer glue-like: ball handlers can slide, burst and beat defenders while defenders still recover and help.</li><li>Added crossover/burst controls, player stamina, jersey numbers, stronger spacing/contact logic and more balanced defensive speed.</li><li>Pause now opens a full team-stat and player box-score screen with points, rebounds, assists, steals, blocks, turnovers, FG and 3PT stats.</li><li>School Branding still includes Load Synced Logos From My Account, and the May 30 → Sep 4 → Nov 1 → Nov 24 offseason calendar remains intact.</li></ul></article>`)}
window.BM27V2721={version:VERSION,ensure,stage,playLeagueGame,endSummer,endFall,startRegularSeason,archiveOffseason,normalizeSeasonDates,loadSyncedLogos:()=>window.BM27Branding255?.absorbCloud?.()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
