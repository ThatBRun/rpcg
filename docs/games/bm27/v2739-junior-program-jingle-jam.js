/* BM27 v2.7.39 — Junior Program + Jingle Jam + Junior State
   Grades 3-8. User-selectable A/B/C/D/E/etc team counts.
   User-built schedules. Annual Dec 14-23 Jingle Jam with five A-E brackets per grade.
   Championship finalists from every Jingle Jam bracket qualify for Junior State.
*/
(()=>{'use strict';
const VERSION='2.7.39';
const GRADES=[3,4,5,6,7,8];
const LETTERS='ABCDEFGH'.split('');
const JAM_BRACKETS='ABCDE'.split('');
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const dayKey=v=>String(v||'').slice(0,10);
const clone=o=>JSON.parse(JSON.stringify(o));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const CLUBS=[
  ['3d-vision','3D Vision Basketball',77],['crossover-elite','Crossover Elite Basketball',80],['genesis','Genesis Basketball Academy',74],
  ['knights','Knights Basketball Academy',81],['larry-hughes','Larry Hughes Basketball Academy',84],['mavericks','Mavericks Basketball',78],
  ['stl-maccabi','STL Maccabi Select',76],['arch-city','Arch City Select',79],['stl-swish','STL Swish',78],
  ['triple-threat','Triple Threat Academy',80],['btb-stl','BTB St. Louis',75],['stl-stars','St. Louis Stars',82],
  ['tsf-elite','TSF Elite',80],['lou-city','Lou City Basketball Club',77],['2dribble','2Dribble Basketball',73]
].map(([id,name,rating])=>({id,name,rating}));
function save(){return typeof current!=='undefined'?current:null}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.39 persist',e);return false}}
function toastSafe(m){try{toast?.(m)}catch{}}
function uid(prefix='jr'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`}
function hash(v=''){let h=2166136261;for(const c of String(v)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function gradeLabel(g){return `${g}${g===3?'rd':'th'} Grade`}
function me(s=save()){try{return myTeam?.()||(s?.teams||[]).find(t=>eq(t.id,s?.schoolId))}catch{return (s?.teams||[]).find(t=>eq(t.id,s?.schoolId))}}
function programName(s=save()){
  const t=me(s),name=String(t?.name||''),mascot=String(t?.mascot||'');
  if(/marquette/i.test(name)||/mustangs/i.test(mascot))return 'Marquette Junior Mustangs';
  return `${mascot?`Junior ${mascot}`:`${name||'School'} Junior Program`}`;
}
function ensure(s=save()){
  if(!s)return null;s.v2739=s.v2739||{};const v=s.v2739;v.version=VERSION;
  v.teamCounts=v.teamCounts||{};v.teams=v.teams||{};v.history=Array.isArray(v.history)?v.history:[];v.resultQueue=Array.isArray(v.resultQueue)?v.resultQueue:[];
  for(const g of GRADES){v.teamCounts[g]=clamp(Number(v.teamCounts[g])||1,1,LETTERS.length);v.teams[g]=v.teams[g]||{};for(let i=0;i<LETTERS.length;i++){const L=LETTERS[i];v.teams[g][L]=v.teams[g][L]||{id:`junior-${g}-${L}`,grade:g,letter:L,wins:0,losses:0,pf:0,pa:0,schedule:[]};v.teams[g][L].schedule=Array.isArray(v.teams[g][L].schedule)?v.teams[g][L].schedule:[]}}
  const season=Number(s.season)||2026;
  if(Number(v.activeSeason)!==season){
    if(v.activeSeason){v.history.unshift({season:v.activeSeason,teamCounts:clone(v.teamCounts),teams:clone(v.teams),jingleJam:clone(v.jingleJam||null),state:clone(v.state||null),archivedAt:s.day});if(v.history.length>8)v.history.length=8}
    v.activeSeason=season;
    for(const g of GRADES)for(const L of LETTERS){const t=v.teams[g][L];t.wins=t.losses=t.pf=t.pa=0;t.schedule=[]}
    v.jingleJam=null;v.state=null;v.resultQueue=[];
  }
  return v;
}
function activeTeam(v,g,L){return !!v&&LETTERS.indexOf(L)<Number(v.teamCounts[g]||0)}
function juniorTeam(v,g,L){return v?.teams?.[g]?.[L]||null}
function oppDisplay(id,grade,letter){const c=CLUBS.find(x=>x.id===id);return c?`${c.name} • ${gradeLabel(grade)} ${letter}`:'Junior Opponent'}
function scorePair(a,b,seed=''){
  const edge=(Number(a)||70)-(Number(b)||70),noise=((hash(seed)%1901)/100-9.5);
  let x=Math.round(38+(Number(a)||70)*.28+edge*.28+noise),y=Math.round(38+(Number(b)||70)*.28-edge*.18-noise*.35);
  x=Math.max(18,x);y=Math.max(18,y);if(x===y)x++;return [x,y]
}
function juniorRating(s,g,L){const base=Number(me(s)?.rating)||72;return clamp(Math.round(44+g*3+(base-70)*.25+(8-LETTERS.indexOf(L))*1.7),42,90)}
function simulateRegularGame(s,t,g){
  if(g.played||g.managedBy)return false;const club=CLUBS.find(x=>x.id===g.opponentClubId)||CLUBS[0];const opponentRating=Number(g.opponentRating)||((Number(club.rating)||70)+Math.max(0,t.grade-5));const [my,opp]=scorePair(juniorRating(s,t.grade,t.letter),opponentRating,`${s.season}|${t.id}|${g.id}`);
  g.played=true;g.myScore=my;g.oppScore=opp;g.result=my>opp?'W':'L';t.pf+=my;t.pa+=opp;if(my>opp)t.wins++;else t.losses++;
  queueResult(s,{level:`${gradeLabel(t.grade)} ${t.letter}`,date:g.date,opponent:g.opponentName||club.name,myScore:my,oppScore:opp,won:my>opp,type:g.type||'Junior Game'});return true;
}
function queueResult(s,r){const v=ensure(s);v.resultQueue.push({...r,id:uid('jr-result')});}
function showResults(){
  const s=save(),v=ensure(s);if(!s||!v||!v.resultQueue.length)return;ensureUI();const d=$('v2739JuniorResultsDialog');if(!d||d.open)return;
  const other=[...document.querySelectorAll('dialog[open]')].find(x=>x!==d);if(other){setTimeout(showResults,180);return}
  const rows=v.resultQueue.splice(0,v.resultQueue.length);$('v2739JuniorResultsList').innerHTML=rows.map(r=>`<article class="card"><p class="eyebrow">${esc(r.level)} • ${esc(r.type||'FINAL')}</p><h3>${r.won?'WIN':'LOSS'} ${r.myScore}-${r.oppScore}</h3><p><b>${esc(r.opponent)}</b></p><p class="muted small">${new Date(r.date).toLocaleDateString()} • Record and schedule updated.</p></article>`).join('');persistSafe();try{d.showModal()}catch{}
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function participantClub(club,g,L,slot){return {id:`club-${club.id}-${g}-${L}-${slot}`,clubId:club.id,name:`${club.name} ${gradeLabel(g)} ${L}`,rating:clamp(club.rating+(5-JAM_BRACKETS.indexOf(L))*2+(g-6)+(hash(`${club.id}|${g}|${L}|${slot}`)%7)-3,45,94),isUser:false,grade:g,letter:L}}
function participantUser(s,g,L){return {id:`user-${g}-${L}`,name:`${programName(s)} ${gradeLabel(g)} ${L}`,rating:juniorRating(s,g,L),isUser:true,grade:g,letter:L,userTeamId:`junior-${g}-${L}`}}
function jamField(s,g,L){
  const v=ensure(s),arr=[];if(activeTeam(v,g,L))arr.push(participantUser(s,g,L));
  const offset=hash(`${s.season}|${g}|${L}|field`)%CLUBS.length;for(let i=0;arr.length<8&&i<CLUBS.length*2;i++){const club=CLUBS[(offset+i)%CLUBS.length];if(arr.some(x=>x.clubId===club.id))continue;arr.push(participantClub(club,g,L,i))}return arr;
}
function makeGame(a,b,date,meta={}){return {id:uid('jam-game'),team1:a,team2:b,date,played:false,score1:null,score2:null,winner:null,loser:null,...meta}}
function createJingleJam(s){
  const v=ensure(s);if(v.jingleJam&&Number(v.jingleJam.season)===Number(s.season))return v.jingleJam;
  const year=Number(s.season)||2026,j={season:year,name:'Jingle Jam',start:`${year}-12-14`,end:`${year}-12-23`,createdAt:s.day,grades:{},stateQualifiers:[]};
  for(const g of GRADES){j.grades[g]={brackets:{}};for(const L of JAM_BRACKETS){const teams=jamField(s,g,L),q=[];for(let i=0;i<8;i+=2)q.push(makeGame(teams[i],teams[i+1],`${year}-12-14T18:${String((i/2)*10).padStart(2,'0')}:00`,{round:'Quarterfinal',grade:g,bracket:L}));j.grades[g].brackets[L]={grade:g,letter:L,teams,games:q,status:'Quarterfinals',champion:null,runnerUp:null}}}
  v.jingleJam=j;return j;
}
function findUserScheduleGame(v,p,gameId){if(!p?.isUser)return null;const t=juniorTeam(v,p.grade,p.letter);return t?.schedule?.find(x=>x.tournamentGameId===gameId)||null}
function attachUserTournamentGame(s,game,eventName){const v=ensure(s);for(const p of [game.team1,game.team2]){if(!p?.isUser)continue;const t=juniorTeam(v,p.grade,p.letter);if(!t||t.schedule.some(x=>x.tournamentGameId===game.id))continue;const opp=p.id===game.team1.id?game.team2:game.team1;t.schedule.push({id:uid('jr-sched'),date:game.date,opponentName:opp.name,played:false,type:eventName,managedBy:eventName,tournamentGameId:game.id,roundName:game.round});t.schedule.sort((a,b)=>String(a.date).localeCompare(String(b.date)))}}
function recordTournamentUserResult(s,game,eventName){const v=ensure(s);for(const p of [game.team1,game.team2]){if(!p?.isUser)continue;const t=juniorTeam(v,p.grade,p.letter),sg=findUserScheduleGame(v,p,game.id);if(!t)continue;const mine=p.id===game.team1.id?game.score1:game.score2,opp=p.id===game.team1.id?game.score2:game.score1,other=p.id===game.team1.id?game.team2:game.team1;if(sg){sg.played=true;sg.myScore=mine;sg.oppScore=opp;sg.result=mine>opp?'W':'L'}t.pf+=mine;t.pa+=opp;if(mine>opp)t.wins++;else t.losses++;queueResult(s,{level:`${gradeLabel(p.grade)} ${p.letter}`,date:game.date,opponent:other.name,myScore:mine,oppScore:opp,won:mine>opp,type:`${eventName} ${game.round}`})}}
function playTournamentGame(s,game,eventName){if(game.played)return false;attachUserTournamentGame(s,game,eventName);const [a,b]=scorePair(game.team1.rating,game.team2.rating,`${eventName}|${s.season}|${game.id}`);game.score1=a;game.score2=b;game.played=true;game.winner=a>b?game.team1:game.team2;game.loser=a>b?game.team2:game.team1;recordTournamentUserResult(s,game,eventName);return true}
function processJamBracket(s,b,today){
  let changed=0;for(const g of b.games)if(!g.played&&dayKey(g.date)<=today)changed+=playTournamentGame(s,g,'Jingle Jam')?1:0;
  const q=b.games.filter(x=>x.round==='Quarterfinal');if(q.length===4&&q.every(x=>x.played)&&!b.games.some(x=>x.round==='Semifinal')){b.games.push(makeGame(q[0].winner,q[1].winner,`${s.season}-12-19T18:00:00`,{round:'Semifinal',grade:b.grade,bracket:b.letter}),makeGame(q[2].winner,q[3].winner,`${s.season}-12-19T19:30:00`,{round:'Semifinal',grade:b.grade,bracket:b.letter}));b.status='Semifinals';changed++}
  for(const g of b.games)if(!g.played&&dayKey(g.date)<=today)changed+=playTournamentGame(s,g,'Jingle Jam')?1:0;
  const sf=b.games.filter(x=>x.round==='Semifinal');if(sf.length===2&&sf.every(x=>x.played)&&!b.games.some(x=>x.round==='Championship')){b.games.push(makeGame(sf[0].winner,sf[1].winner,`${s.season}-12-23T18:00:00`,{round:'Championship',grade:b.grade,bracket:b.letter}));b.status='Championship';changed++}
  for(const g of b.games)if(!g.played&&dayKey(g.date)<=today)changed+=playTournamentGame(s,g,'Jingle Jam')?1:0;
  const fin=b.games.find(x=>x.round==='Championship');if(fin?.played&&!b.champion){b.champion=clone(fin.winner);b.runnerUp=clone(fin.loser);b.status='Complete';const j=ensure(s).jingleJam;for(const p of [fin.winner,fin.loser])if(!j.stateQualifiers.some(x=>x.id===p.id&&x.grade===b.grade&&x.fromBracket===b.letter))j.stateQualifiers.push({...clone(p),fromBracket:b.letter,qualifiedAt:fin.date});changed++}
  return changed;
}
function processJingleJam(s,today){
  const y=Number(s.season)||2026;if(today<`${y}-12-14`)return 0;const j=createJingleJam(s);let changed=0;for(const g of GRADES)for(const L of JAM_BRACKETS)changed+=processJamBracket(s,j.grades[g].brackets[L],today);if(today>=`${y}-12-24`)changed+=createStateIfReady(s)?1:0;return changed;
}
function createStateIfReady(s){
  const v=ensure(s),j=v.jingleJam;if(!j||v.state&&Number(v.state.season)===Number(s.season))return false;
  const allComplete=GRADES.every(g=>JAM_BRACKETS.every(L=>j.grades[g].brackets[L].status==='Complete'));if(!allComplete)return false;
  const state={season:Number(s.season),name:'Junior State',grades:{},createdAt:s.day};
  for(const g of GRADES){const q=j.stateQualifiers.filter(x=>x.grade===g).sort((a,b)=>JAM_BRACKETS.indexOf(a.fromBracket)-JAM_BRACKETS.indexOf(b.fromBracket)||b.rating-a.rating);state.grades[g]={entrants:q,games:[],status:'Play-In',champion:null};const seeds=q.slice(0,10);state.grades[g].games.push(makeGame(seeds[6],seeds[9],`${Number(s.season)+1}-01-03T18:00:00`,{round:'Play-In',grade:g,bracket:'STATE',seedSlot:'7v10'}),makeGame(seeds[7],seeds[8],`${Number(s.season)+1}-01-03T19:30:00`,{round:'Play-In',grade:g,bracket:'STATE',seedSlot:'8v9'}))}
  v.state=state;return true;
}
function processStateGrade(s,st,g,today){
  let changed=0;for(const gm of st.games)if(!gm.played&&dayKey(gm.date)<=today)changed+=playTournamentGame(s,gm,'Junior State')?1:0;
  const play=st.games.filter(x=>x.round==='Play-In');if(play.length===2&&play.every(x=>x.played)&&!st.games.some(x=>x.round==='Quarterfinal')){const e=st.entrants,final8=[e[0],e[1],e[2],e[3],e[4],e[5],play[0].winner,play[1].winner];st.games.push(makeGame(final8[0],final8[7],`${Number(s.season)+1}-01-05T17:00:00`,{round:'Quarterfinal',grade:g,bracket:'STATE'}),makeGame(final8[3],final8[4],`${Number(s.season)+1}-01-05T18:15:00`,{round:'Quarterfinal',grade:g,bracket:'STATE'}),makeGame(final8[2],final8[5],`${Number(s.season)+1}-01-05T19:30:00`,{round:'Quarterfinal',grade:g,bracket:'STATE'}),makeGame(final8[1],final8[6],`${Number(s.season)+1}-01-05T20:45:00`,{round:'Quarterfinal',grade:g,bracket:'STATE'}));st.status='Quarterfinals';changed++}
  for(const gm of st.games)if(!gm.played&&dayKey(gm.date)<=today)changed+=playTournamentGame(s,gm,'Junior State')?1:0;
  const qf=st.games.filter(x=>x.round==='Quarterfinal');if(qf.length===4&&qf.every(x=>x.played)&&!st.games.some(x=>x.round==='Semifinal')){st.games.push(makeGame(qf[0].winner,qf[1].winner,`${Number(s.season)+1}-01-08T18:00:00`,{round:'Semifinal',grade:g,bracket:'STATE'}),makeGame(qf[2].winner,qf[3].winner,`${Number(s.season)+1}-01-08T19:30:00`,{round:'Semifinal',grade:g,bracket:'STATE'}));st.status='Semifinals';changed++}
  for(const gm of st.games)if(!gm.played&&dayKey(gm.date)<=today)changed+=playTournamentGame(s,gm,'Junior State')?1:0;
  const sf=st.games.filter(x=>x.round==='Semifinal');if(sf.length===2&&sf.every(x=>x.played)&&!st.games.some(x=>x.round==='Championship')){st.games.push(makeGame(sf[0].winner,sf[1].winner,`${Number(s.season)+1}-01-11T18:00:00`,{round:'Championship',grade:g,bracket:'STATE'}));st.status='Championship';changed++}
  for(const gm of st.games)if(!gm.played&&dayKey(gm.date)<=today)changed+=playTournamentGame(s,gm,'Junior State')?1:0;
  const fin=st.games.find(x=>x.round==='Championship');if(fin?.played&&!st.champion){st.champion=clone(fin.winner);st.runnerUp=clone(fin.loser);st.status='Complete';changed++}
  return changed;
}
function processState(s,today){const st=ensure(s).state;if(!st)return 0;let changed=0;for(const g of GRADES)changed+=processStateGrade(s,st.grades[g],g,today);return changed}
function processJuniorDay(s=save(),options={}){
  if(!s)return 0;const v=ensure(s),today=dayKey(s.day);if(!today)return 0;let changed=0;
  for(const g of GRADES)for(let i=0;i<v.teamCounts[g];i++){const t=v.teams[g][LETTERS[i]];for(const gm of t.schedule)if(!gm.played&&!gm.managedBy&&dayKey(gm.date)<=today)changed+=simulateRegularGame(s,t,gm)?1:0}
  changed+=processJingleJam(s,today);changed+=processState(s,today);
  if(changed){v.lastProcessedDay=today;v.lastProcessedAt=new Date().toISOString();v.lastReason=options.reason||'calendar-day';persistSafe();renderJunior();setTimeout(showResults,30)}
  return changed;
}
function ensureUI(){
  if(!$('v2739JuniorNav')){
    const after=document.querySelector('.nav[data-page="program"]')||document.querySelector('.nav[data-page="leagues"]')||document.querySelector('.nav[data-page="roster"]');if(after){const b=document.createElement('button');b.id='v2739JuniorNav';b.className='nav';b.dataset.page='juniorProgram';b.textContent='Junior Program';after.insertAdjacentElement('afterend',b);b.onclick=()=>activateJunior()}
  }
  if(!$('juniorProgramPage')){const sec=document.createElement('section');sec.id='juniorProgramPage';sec.className='page';sec.innerHTML=`<div class="section-head"><div><p class="eyebrow">3RD–8TH GRADE • FEEDER PROGRAM</p><h3 id="v2739ProgramTitle">Junior Program</h3><p class="muted small">Choose A/B/C/D/E/etc. teams by grade, build their schedules, and follow Jingle Jam + Junior State.</p></div><span id="v2739SeasonTag" class="tag"></span></div><div id="v2739JuniorMetrics" class="metrics"></div><div class="office-grid"><article class="card"><div class="section-head"><div><p class="eyebrow">PROGRAM BUILDER</p><h3>Grade Teams</h3></div></div><div id="v2739GradeBuilder" class="stack"></div></article><article class="card"><div class="section-head"><div><p class="eyebrow">SCHEDULE MANAGER</p><h3>Junior Team Schedule</h3></div><button id="v2739AddGame" class="primary">Add Junior Game</button></div><div class="schedule-actions"><label>Grade<select id="v2739ScheduleGrade">${GRADES.map(g=>`<option value="${g}">${gradeLabel(g)}</option>`).join('')}</select></label><label>Team<select id="v2739ScheduleTeam"></select></label></div><div id="v2739ScheduleList" class="stack"></div></article></div><article class="card"><div class="section-head"><div><p class="eyebrow">DECEMBER 14–23 • EVERY YEAR</p><h3>Jingle Jam</h3><p class="muted small">Five competitive brackets per grade: A, B, C, D and E. The two championship finalists from every bracket qualify for Junior State.</p></div><span id="v2739JamStatus" class="tag">UPCOMING</span></div><div id="v2739JingleJam"></div></article><article class="card"><div class="section-head"><div><p class="eyebrow">JUNIOR POSTSEASON</p><h3>Junior State</h3><p class="muted small">Ten qualifiers per grade — the two Jingle Jam finalists from each A–E bracket.</p></div><span id="v2739StateStatus" class="tag">WAITING</span></div><div id="v2739State"></div></article>`;const hist=$('historyPage')||document.querySelector('.page:last-of-type');hist?.parentNode?.insertBefore(sec,hist)}
  if(!$('v2739ScheduleDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="v2739ScheduleDialog"><form method="dialog" id="v2739ScheduleForm"><div class="modal-head"><div><p class="eyebrow">JUNIOR PROGRAM SCHEDULING</p><h2>Add Junior Game</h2></div><button value="cancel" class="icon-btn">×</button></div><label>Grade<select id="v2739DialogGrade">${GRADES.map(g=>`<option value="${g}">${gradeLabel(g)}</option>`).join('')}</select></label><label>Team<select id="v2739DialogTeam"></select></label><label>Opponent<select id="v2739DialogOpponent">${CLUBS.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Date<input id="v2739DialogDate" type="date" required></label><label>Location<select id="v2739DialogLocation"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></label><button value="default" class="primary wide">Add Game</button></form></dialog>`);
  if(!$('v2739JuniorResultsDialog'))document.body.insertAdjacentHTML('beforeend',`<dialog id="v2739JuniorResultsDialog"><div class="modal-head"><div><p class="eyebrow">JUNIOR PROGRAM • FINAL SCORES</p><h2>Junior Results</h2></div></div><div id="v2739JuniorResultsList" class="stack"></div><button id="v2739JuniorResultsClose" class="primary wide" type="button">Continue</button></dialog>`);
  $('v2739JuniorResultsClose')?.addEventListener('click',()=>{try{$('v2739JuniorResultsDialog').close()}catch{};setTimeout(showResults,20)});
  $('v2739AddGame')?.addEventListener('click',openScheduleDialog);
  $('v2739ScheduleGrade')?.addEventListener('change',()=>{syncTeamSelects();renderJuniorSchedule()});$('v2739ScheduleTeam')?.addEventListener('change',renderJuniorSchedule);$('v2739DialogGrade')?.addEventListener('change',syncDialogTeams);
  $('v2739ScheduleForm')?.addEventListener('submit',submitJuniorGame);
}
function activateJunior(){document.querySelectorAll('.nav[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page==='juniorProgram'));document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$('juniorProgramPage')?.classList.add('active');if($('pageTitle'))$('pageTitle').textContent='Junior Program';$('game')?.classList.remove('menu-open');renderJunior()}
function syncTeamSelects(){const s=save(),v=ensure(s);if(!v)return;const g=Number($('v2739ScheduleGrade')?.value||3),count=v.teamCounts[g],opts=LETTERS.slice(0,count).map(L=>`<option value="${L}">Team ${L}</option>`).join('');if($('v2739ScheduleTeam'))$('v2739ScheduleTeam').innerHTML=opts;syncDialogTeams()}
function syncDialogTeams(){const s=save(),v=ensure(s);if(!v)return;const g=Number($('v2739DialogGrade')?.value||3),count=v.teamCounts[g];if($('v2739DialogTeam'))$('v2739DialogTeam').innerHTML=LETTERS.slice(0,count).map(L=>`<option value="${L}">Team ${L}</option>`).join('')}
function openScheduleDialog(){const s=save(),v=ensure(s);if(!s||!v)return;const g=Number($('v2739ScheduleGrade')?.value||3),L=$('v2739ScheduleTeam')?.value||'A';$('v2739DialogGrade').value=String(g);syncDialogTeams();$('v2739DialogTeam').value=L;const y=Number(s.season)||2026,d=$('v2739DialogDate');d.min=`${y}-11-01`;d.max=`${y+1}-03-31`;d.value=dayKey(s.day)>=d.min&&dayKey(s.day)<=d.max?dayKey(s.day):`${y}-11-24`;try{$('v2739ScheduleDialog').showModal()}catch{}}
function submitJuniorGame(e){e.preventDefault();const s=save(),v=ensure(s);if(!s||!v)return;const g=Number($('v2739DialogGrade').value),L=$('v2739DialogTeam').value,t=juniorTeam(v,g,L),club=CLUBS.find(x=>x.id===$('v2739DialogOpponent').value);if(!t||!club)return;const loc=$('v2739DialogLocation').value,date=$('v2739DialogDate').value;if(t.schedule.length>=26){toastSafe('That junior team already has 26 scheduled games.');return}t.schedule.push({id:uid('jr-sched'),opponentClubId:club.id,opponentName:`${club.name} ${gradeLabel(g)} ${L}`,date:`${date}T18:00:00`,home:loc==='home',neutral:loc==='neutral',played:false,type:'Junior Regular Season'});t.schedule.sort((a,b)=>String(a.date).localeCompare(String(b.date)));try{$('v2739ScheduleDialog').close()}catch{}persistSafe();renderJunior();toastSafe(`${gradeLabel(g)} ${L} game added.`)}
function changeTeamCount(g,count){const s=save(),v=ensure(s);if(!v)return;v.teamCounts[g]=clamp(Number(count)||1,1,LETTERS.length);persistSafe();renderJunior();toastSafe(`${gradeLabel(g)} now has ${v.teamCounts[g]} team${v.teamCounts[g]===1?'':'s'}.`)}
function renderJuniorSchedule(){const s=save(),v=ensure(s),box=$('v2739ScheduleList');if(!s||!v||!box)return;const g=Number($('v2739ScheduleGrade')?.value||3),L=$('v2739ScheduleTeam')?.value||'A',t=juniorTeam(v,g,L);if(!t){box.innerHTML='<p class="muted small">Choose an active junior team.</p>';return}box.innerHTML=`<div class="section-head"><div><h3>${gradeLabel(g)} Team ${L}</h3><p class="muted small">Record ${t.wins}-${t.losses} • ${t.schedule.length}/26 games</p></div></div>`+(t.schedule.length?t.schedule.map(gm=>`<div class="row"><div><b>${gm.home?'vs':gm.neutral?'neutral vs':'at'} ${esc(gm.opponentName||'Opponent')}</b><br><small>${new Date(gm.date).toLocaleDateString()} • ${esc(gm.type||'Game')}${gm.roundName?` • ${esc(gm.roundName)}`:''}</small></div><span class="tag">${gm.played?`${gm.result||''} ${gm.myScore}-${gm.oppScore}`:'Scheduled'}</span></div>`).join(''):'<p class="muted small">No games scheduled yet.</p>')}
function renderJingleJam(){const s=save(),v=ensure(s),box=$('v2739JingleJam');if(!box||!s||!v)return;const j=v.jingleJam;if(!j){box.innerHTML=`<p class="muted">Jingle Jam will automatically build on December 14. Each grade has five A–E brackets with 8 teams per bracket.</p>`;$('v2739JamStatus').textContent='UPCOMING';return}$('v2739JamStatus').textContent=GRADES.every(g=>JAM_BRACKETS.every(L=>j.grades[g].brackets[L].status==='Complete'))?'COMPLETE':'IN PROGRESS';box.innerHTML=GRADES.map(g=>`<details class="card"><summary><b>${gradeLabel(g)}</b> • 5 brackets • ${j.stateQualifiers.filter(x=>x.grade===g).length}/10 state qualifiers</summary><div class="stack">${JAM_BRACKETS.map(L=>{const b=j.grades[g].brackets[L],fin=b.games.find(x=>x.round==='Championship');return `<div class="row"><div><b>Bracket ${L}</b><br><small>${b.status}${fin?.played?` • Champion ${esc(b.champion?.name||'')}`:''}</small></div><span class="tag">${fin?.played?'2 → STATE':b.games.filter(x=>x.played).length+'/'+b.games.length}</span></div>`}).join('')}</div></details>`).join('')}
function renderState(){const s=save(),v=ensure(s),box=$('v2739State');if(!box||!s||!v)return;const st=v.state;if(!st){box.innerHTML=`<p class="muted">Junior State is created after all 30 Jingle Jam brackets finish. Each grade receives 10 qualifiers — both finalists from brackets A–E.</p>`;$('v2739StateStatus').textContent='WAITING';return}const complete=GRADES.every(g=>st.grades[g].status==='Complete');$('v2739StateStatus').textContent=complete?'COMPLETE':'QUALIFIED';box.innerHTML=GRADES.map(g=>{const x=st.grades[g];return `<div class="row"><div><b>${gradeLabel(g)} State</b><br><small>${x.status}${x.champion?` • Champion ${esc(x.champion.name)}`:''}</small></div><span class="tag">${x.entrants.length} teams</span></div>`}).join('')}
function renderJunior(){ensureUI();const s=save(),v=ensure(s);if(!s||!v)return;$('v2739ProgramTitle').textContent=programName(s);$('v2739SeasonTag').textContent=`${s.season}-${String(Number(s.season)+1).slice(-2)}`;const active=GRADES.reduce((n,g)=>n+v.teamCounts[g],0),games=GRADES.reduce((n,g)=>n+LETTERS.slice(0,v.teamCounts[g]).reduce((m,L)=>m+v.teams[g][L].schedule.length,0),0);$('v2739JuniorMetrics').innerHTML=`<div class="metric"><span>Grades</span><b>3–8</b></div><div class="metric"><span>Active Teams</span><b>${active}</b></div><div class="metric"><span>Scheduled Games</span><b>${games}</b></div><div class="metric"><span>Jingle Jam Brackets</span><b>30</b></div><div class="metric"><span>State Qualifiers</span><b>${v.jingleJam?.stateQualifiers?.length||0}/60</b></div>`;$('v2739GradeBuilder').innerHTML=GRADES.map(g=>`<div class="row"><div><b>${gradeLabel(g)}</b><br><small>Teams ${LETTERS.slice(0,v.teamCounts[g]).join(', ')}</small></div><label>Teams<select data-v2739-count="${g}">${LETTERS.map((L,i)=>`<option value="${i+1}" ${v.teamCounts[g]===i+1?'selected':''}>${i+1} • A–${L}</option>`).join('')}</select></label></div>`).join('');document.querySelectorAll('[data-v2739-count]').forEach(sel=>sel.onchange=()=>changeTeamCount(Number(sel.dataset.v2739Count),Number(sel.value)));syncTeamSelects();renderJuniorSchedule();renderJingleJam();renderState()}
function hookDailyResolver(){const api=window.BM27V2732;if(!api||api.__v2739Wrapped)return false;const base=api.processOwnedDay;api.processOwnedDay=function(s,options={}){const a=Number(base?.(s,options)||0),b=Number(processJuniorDay(s,options)||0);return a+b};api.__v2739Wrapped=true;api.juniorTeams=true;return true}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2739-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2739-notes><p class="eyebrow">BM27 v2.7.39</p><h3>Junior Program + Jingle Jam</h3><ul class="update-list"><li>Added coach-controlled junior teams for grades 3–8 with selectable A/B/C/D/E/etc team counts and direct schedule building.</li><li>Junior games simulate automatically on the same daily career calendar as Varsity, JV and Freshman.</li><li>Jingle Jam automatically runs Dec. 14–23 every season with five A–E brackets for every grade.</li><li>Jingle Jam fields use a simulated pool based on real St. Louis-area youth programs; the game does not claim those clubs are actual tournament entrants.</li><li>Both championship finalists from all five brackets advance to Junior State, creating 10 state qualifiers per grade.</li></ul></article>`)}
function install(){if(window.__BM27_V2739__)return;window.__BM27_V2739__=true;ensureUI();ensure(save());hookDailyResolver();if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);ensure(save());processJuniorDay(save(),{reason:'open-save'});renderJunior();return r}}document.addEventListener('click',e=>{if(e.target.closest?.('#v2739JuniorNav')){e.preventDefault();activateJunior()}if(e.target.closest?.('[data-open-updates]'))setTimeout(addNotes,20)},true);window.addEventListener('focus',()=>{if(save()){processJuniorDay(save(),{reason:'focus'});renderJunior()}});if(save())processJuniorDay(save(),{reason:'install'});renderJunior();addNotes();try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.39'}catch{}}
window.BM27V2739={version:VERSION,ensure,processJuniorDay,createJingleJam,createStateIfReady,renderJunior,clubs:CLUBS,grades:GRADES,brackets:JAM_BRACKETS};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
