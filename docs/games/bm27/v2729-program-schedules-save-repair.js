/* BM27 v2.7.29 — Reliable saves + JV/Freshman synchronized program schedules
   Loaded last. Keeps Varsity as the master calendar while JV/Freshman schedule,
   play, archive, reset and optionally enter their own tournaments.
*/
(()=>{
'use strict';
const VERSION='2.7.29';
const LEVELS=['JV','Freshman'];
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const clone=o=>JSON.parse(JSON.stringify(o));
const uid=()=>{try{return crypto.randomUUID()}catch{return `v2729-${Date.now()}-${Math.random().toString(36).slice(2)}`}};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOnly=v=>String(v||'').slice(0,10);
const dateMs=v=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:0};
const seasonLabel=y=>`${y}-${String(Number(y)+1).slice(-2)}`;
function save(){return typeof current!=='undefined'?current:null}
function userTeam(s=save()){return s?.teams?.find(t=>eq(t.id,s.schoolId))||null}
function stage(s=save()){try{return window.BM27V2721?.stage?.()||s?.v2721?.stage||'regular'}catch{return s?.v2721?.stage||'regular'}}
function toastSafe(m){try{toast?.(m)}catch{}}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.29 persist',e);return false}}
function teamById(s,id){return s?.teams?.find(t=>eq(t.id,id))||null}
function academicEligible(p){return !(p?.academics&&p.academics.eligible===false)}
function programs(s=save()){return Array.isArray(s?.v2?.programPlayers)?s.v2.programPlayers:[]}
function basePlayers(level,s=save()){return programs(s).filter(p=>(p.teamLevel||'Varsity')===level)}
function playUpMap(s=save()){const v=ensure(s);return v?.playUp||{}}
function playUpsTo(level,s=save()){
  const map=playUpMap(s);
  return programs(s).filter(p=>map[String(p.id)]===level && (level==='Varsity' ? ['JV','Freshman'].includes(p.teamLevel) : level==='JV'&&p.teamLevel==='Freshman'));
}
function eligibleRoster(level,s=save()){
  const list=[...basePlayers(level,s),...playUpsTo(level,s)].filter(academicEligible),seen=new Set();
  return list.filter(p=>{const k=String(p.id||p.name);if(seen.has(k))return false;seen.add(k);return true});
}
function teamRating(level,s=save()){
  const p=eligibleRoster(level,s).slice().sort((a,b)=>(Number(b.overall)||0)-(Number(a.overall)||0)).slice(0,8);
  if(!p.length)return level==='JV'?55:50;
  const avg=p.reduce((n,x)=>n+(Number(x.overall)||50),0)/p.length;
  const coach=(s?.v2?.staff||[]).filter(x=>x.assignment===level&&/coach/i.test(x.role||'')).sort((a,b)=>(Number(b.coaching)||0)-(Number(a.coaching)||0))[0];
  return Math.round(avg+(coach?Math.max(-2,Math.min(5,((Number(coach.coaching)||60)-60)/8)):0));
}
function opponentLevelRating(opp,level){const varsity=Number(opp?.rating)||68;return Math.max(40,Math.round(varsity-(level==='JV'?7:13)))}
function recordFromSchedule(schedule=[]){let wins=0,losses=0;for(const g of schedule)if(g.played){if(Number(g.myScore)>Number(g.oppScore))wins++;else losses++}return{wins,losses}}
function districtStarted(s=save()){
  return (s?.schedule||[]).some(g=>/district/i.test(`${g.type||''} ${g.roundName||''}`) && (g.played||dateMs(g.date)<=dateMs(s.day))) ||
    (s?.tournaments||[]).some(t=>/district/i.test(`${t.kind||''} ${t.type||''} ${t.name||''}`)&&!['Scheduled',''].includes(t.status||''));
}
function scheduleOpen(s=save()){
  if(!s)return false;const st=stage(s);return (st==='preseason'||st==='regular')&&!districtStarted(s);
}
function seasonMin(s=save()){return `${Number(s?.season)||2026}-11-24`}
function seasonMax(s=save()){return `${(Number(s?.season)||2026)+1}-03-31`}
function validGameDate(raw,s=save()){
  if(!raw)return false;const min=seasonMin(s),max=seasonMax(s);if(raw<min||raw>max)return false;
  if(stage(s)==='regular'&&raw<dateOnly(s.day))return false;return true;
}
function tournamentRounds(size){return Number(size)===8?['Quarterfinal','Semifinal','Championship']:['Semifinal','Championship']}
function ensureSubTeam(s,level){
  s.v2=s.v2||{};s.v2.subTeams=s.v2.subTeams||{};
  let st=s.v2.subTeams[level];if(!st)st=s.v2.subTeams[level]={wins:0,losses:0,schedule:[]};
  st.schedule=Array.isArray(st.schedule)?st.schedule:[];st.tournaments=Array.isArray(st.tournaments)?st.tournaments:[];
  for(const g of st.schedule){g.id=g.id||uid();g.level=level;g.source=g.source||'legacy';g.type=g.type||'Regular Season';g.home=g.home!==false;g.neutral=!!g.neutral;g.played=!!g.played}
  const r=recordFromSchedule(st.schedule);st.wins=r.wins;st.losses=r.losses;return st;
}
function archiveProgramYear(s,seasonNo){
  const v=s.v2729;if(!v)return;const already=v.programHistory.some(x=>Number(x.season)===Number(seasonNo));if(already)return;
  const teams={};for(const level of LEVELS){const st=ensureSubTeam(s,level);teams[level]={record:`${st.wins}-${st.losses}`,schedule:clone(st.schedule),tournaments:clone(st.tournaments||[])}}
  if(LEVELS.some(l=>teams[l].schedule.length||teams[l].tournaments.length))v.programHistory.push({season:Number(seasonNo),label:seasonLabel(seasonNo),archivedAt:new Date().toISOString(),teams});
}
function ensure(s=save()){
  if(!s)return null;s.v2729=s.v2729||{};const v=s.v2729;v.version=VERSION;v.programHistory=Array.isArray(v.programHistory)?v.programHistory:[];v.playUp=v.playUp&&typeof v.playUp==='object'?v.playUp:{};
  const seasonNo=Number(s.season)||2026;
  if(v.programSeason==null){
    v.programSeason=seasonNo;
    // Old BM27 auto-created 14-game lower-level schedules. Preserve completed games,
    // but remove unplayed generated games so the coach now builds these schedules.
    for(const level of LEVELS){const st=ensureSubTeam(s,level);st.schedule=st.schedule.filter(g=>g.played||g.source==='manual'||g.source==='varsity-copy'||g.source==='tournament');st.tournaments=st.tournaments||[];const r=recordFromSchedule(st.schedule);st.wins=r.wins;st.losses=r.losses}
    v.migratedExistingSaveAt=v.migratedExistingSaveAt||new Date().toISOString();
  } else if(Number(v.programSeason)!==seasonNo){
    archiveProgramYear(s,Number(v.programSeason));
    for(const level of LEVELS){const st=ensureSubTeam(s,level);st.schedule=[];st.tournaments=[];st.wins=0;st.losses=0}
    v.playUp={};v.programSeason=seasonNo;v.lastProgramResetAt=new Date().toISOString();
  } else for(const level of LEVELS)ensureSubTeam(s,level);
  // Drop play-up entries that no longer point at a valid lower-level player/target.
  const ids=new Set(programs(s).map(p=>String(p.id)));for(const id of Object.keys(v.playUp)){const p=programs(s).find(x=>eq(x.id,id)),target=v.playUp[id];if(!ids.has(id)||!p||(p.teamLevel==='JV'&&target!=='Varsity')||(p.teamLevel==='Freshman'&&!['JV','Varsity'].includes(target))||!['JV','Varsity'].includes(target))delete v.playUp[id]}
  return v;
}
function syncVarsityCallUps(s=save()){
  if(!s?.v2?.programPlayers)return;const team=userTeam(s);if(!team)return;
  const varsity=basePlayers('Varsity',s),ups=playUpsTo('Varsity',s),seen=new Set();
  team.roster=[...varsity,...ups].filter(p=>{const k=String(p.id||p.name);if(seen.has(k))return false;seen.add(k);return true});
  for(const p of team.roster)p.playingUp=(p.teamLevel||'Varsity')!=='Varsity';
  try{if(typeof teamRating==='function'&&team.roster.length)team.rating=teamRating(team.roster)}catch{}
}
function addGame(level,{opponentId,date,location='home',type='Regular Season'}={}){
  const s=save();ensure(s);if(!scheduleOpen(s))return toastSafe('JV/Freshman scheduling is closed right now.');const st=ensureSubTeam(s,level);
  if(st.schedule.length>=26)return toastSafe(`${level} already has 26 games scheduled.`);if(!teamById(s,opponentId)||eq(opponentId,s.schoolId))return toastSafe('Choose a valid opponent.');if(!validGameDate(date,s))return toastSafe(`Choose a date from ${seasonMin(s)} through ${seasonMax(s)} that has not already passed.`);
  st.schedule.push({id:uid(),level,opponentId:String(opponentId),date:new Date(`${date}T18:00:00`).toISOString(),home:location==='home',neutral:location==='neutral',played:false,type,source:'manual'});st.schedule.sort((a,b)=>dateMs(a.date)-dateMs(b.date));markAndPersist('program-schedule');renderHub();toastSafe(`${level} game added directly — no pitch required.`)
}
function copyVarsity(level){
  const s=save();ensure(s);if(!scheduleOpen(s))return toastSafe('JV/Freshman scheduling is closed right now.');const st=ensureSubTeam(s,level),existing=new Set(st.schedule.filter(g=>!g.tournamentId).map(g=>`${g.opponentId}|${dateOnly(g.date)}`));let added=0;
  const games=(s.schedule||[]).filter(g=>g.opponentId&&!g.tbd&&!g.tournamentId&&!g.nationalTournament&&!/district|state/i.test(`${g.type||''} ${g.roundName||''}`)).sort((a,b)=>dateMs(a.date)-dateMs(b.date));
  for(const g of games){if(st.schedule.length>=26)break;const day=dateOnly(g.date),key=`${g.opponentId}|${day}`;if(!validGameDate(day,s)||existing.has(key))continue;st.schedule.push({id:uid(),level,opponentId:String(g.opponentId),date:new Date(g.date).toISOString(),home:!!g.home,neutral:!!g.neutral,played:false,type:'Regular Season',source:'varsity-copy'});existing.add(key);added++}
  st.schedule.sort((a,b)=>dateMs(a.date)-dateMs(b.date));markAndPersist('program-schedule-copy');renderHub();toastSafe(`${added} Varsity matchup${added===1?'':'s'} applied directly to ${level}.`)
}
function createTournament(level,{name,size,startDate}={}){
  const s=save();ensure(s);if(!scheduleOpen(s))return toastSafe('Lower-level tournaments can only be added while scheduling is open.');const st=ensureSubTeam(s,level),rounds=tournamentRounds(size),reserve=rounds.length;
  if(st.schedule.length+reserve>26)return toastSafe(`${level} does not have enough room under the 26-game limit for this tournament.`);if(!validGameDate(startDate,s))return toastSafe('Choose a valid tournament start date.');
  const pool=(s.teams||[]).filter(t=>!eq(t.id,s.schoolId)).slice().sort(()=>Math.random()-.5).slice(0,Number(size)-1);if(pool.length<Number(size)-1)return toastSafe('Not enough opponents are loaded for this tournament.');
  const id=uid(),t={id,level,name:String(name||`${level} Invitational`),size:Number(size),teams:[String(s.schoolId),...pool.map(x=>String(x.id))],roundNames:rounds,currentRound:0,status:'Scheduled',playedOpponents:[],createdAt:new Date().toISOString()};st.tournaments.push(t);
  const opp=pool[0];st.schedule.push({id:uid(),level,opponentId:String(opp.id),date:new Date(`${startDate}T17:30:00`).toISOString(),home:false,neutral:true,played:false,type:'Tournament',source:'tournament',tournamentId:id,tournamentRound:0,roundName:rounds[0]});st.schedule.sort((a,b)=>dateMs(a.date)-dateMs(b.date));
  markAndPersist('program-tournament');renderHub();toastSafe(`${t.name} added to the ${level} schedule.`)
}
function nextTournamentGame(s,level,g,won){
  const st=ensureSubTeam(s,level),t=st.tournaments.find(x=>eq(x.id,g.tournamentId));if(!t)return;t.playedOpponents=t.playedOpponents||[];t.playedOpponents.push(String(g.opponentId));
  if(!won){t.status='Eliminated';return}const next=Number(g.tournamentRound||0)+1;if(next>=t.roundNames.length){t.status='Champion';t.champion=true;return}
  t.currentRound=next;t.status=t.roundNames[next];const candidates=t.teams.filter(id=>!eq(id,s.schoolId)&&!t.playedOpponents.includes(String(id))),oppId=String(candidates[(next-1)%Math.max(1,candidates.length)]||candidates[0]||g.opponentId);const d=new Date(g.date);d.setDate(d.getDate()+2);
  st.schedule.push({id:uid(),level,opponentId:oppId,date:d.toISOString(),home:false,neutral:true,played:false,type:'Tournament',source:'tournament',tournamentId:t.id,tournamentRound:next,roundName:t.roundNames[next]});st.schedule.sort((a,b)=>dateMs(a.date)-dateMs(b.date));
}
function allocateBoxScore(roster,total,level){
  const players=roster.slice().sort((a,b)=>(Number(b.overall)||0)-(Number(a.overall)||0)).slice(0,12);if(!players.length)return[];const weights=players.map((p,i)=>Math.max(1,(Number(p.overall)||50)-38+(i<5?12:2))*((0.75+Math.random()*.5))),sum=weights.reduce((a,b)=>a+b,0);let left=Number(total)||0;
  const rows=players.map((p,i)=>{let pts=i===players.length-1?left:Math.max(0,Math.min(left,Math.round(total*weights[i]/sum)));left-=pts;const row={playerId:p.id,name:p.name,pos:p.pos||'',teamLevel:p.teamLevel||level,playingUp:(p.teamLevel||level)!==level,points:pts,rebounds:Math.max(0,Math.round(Math.random()*7+(p.pos==='C'||p.pos==='PF'?2:0))),assists:Math.max(0,Math.round(Math.random()*5+(p.pos==='PG'?2:0))),steals:Math.random()<.45?1:0,blocks:(p.pos==='C'||p.pos==='PF')&&Math.random()<.45?1:0};p.programStats=p.programStats||{};const ps=p.programStats[level]||(p.programStats[level]={games:0,points:0,rebounds:0,assists:0,steals:0,blocks:0});ps.games++;ps.points+=row.points;ps.rebounds+=row.rebounds;ps.assists+=row.assists;ps.steals+=row.steals;ps.blocks+=row.blocks;p.stats=p.stats||{games:0,points:0,rebounds:0,assists:0};p.stats.games++;p.stats.points=(p.stats.points||0)+row.points;p.stats.rebounds=(p.stats.rebounds||0)+row.rebounds;p.stats.assists=(p.stats.assists||0)+row.assists;return row});
  if(left!==0&&rows.length)rows[0].points+=left;return rows;
}
function simulateProgramGame(s,level,g){
  if(g.played)return false;const opp=teamById(s,g.opponentId);if(!opp)return false;const ours=teamRating(level,s),theirs=opponentLevelRating(opp,level),home=g.neutral?0:(g.home?2:-1),edge=(ours-theirs)*.38+home;let my=Math.max(28,Math.round(44+ours*.28+edge+(Math.random()-.5)*16)),op=Math.max(28,Math.round(44+theirs*.28-edge*.35+(Math.random()-.5)*16));if(my===op)my++;
  g.played=true;g.myScore=my;g.oppScore=op;g.completedAt=s.day;g.resultNoticePending=true;g.boxScore=allocateBoxScore(eligibleRoster(level,s),my,level);const st=ensureSubTeam(s,level);const r=recordFromSchedule(st.schedule);st.wins=r.wins;st.losses=r.losses;if(g.tournamentId)nextTournamentGame(s,level,g,my>op);
  s.news=s.news||[];s.news.unshift({date:g.date,category:`${level} Basketball`,text:`${level}: ${userTeam(s)?.name||'Your school'} ${my>op?'defeated':'lost to'} ${opp.name}, ${my}-${op}${g.roundName?` (${g.roundName})`:''}.`});return true;
}
function processDueGames(s=save()){
  if(!s||['summer','fall'].includes(stage(s)))return 0;ensure(s);let changed=0,guard=0;
  while(guard++<80){let due=null,dueLevel=null;for(const level of LEVELS){const today=dateOnly(s.day),g=ensureSubTeam(s,level).schedule.filter(x=>!x.played&&dateOnly(x.date)<=today).sort((a,b)=>dateMs(a.date)-dateMs(b.date))[0];if(g&&(!due||dateMs(g.date)<dateMs(due.date))){due=g;dueLevel=level}}if(!due)break;if(simulateProgramGame(s,dueLevel,due))changed++;else{due.played=true;due.forfeit=true;due.completedAt=s.day;due.resultNoticePending=true;changed++}}
  if(changed){markSaveMeta('lower-level-auto-games');persistSafe()}return changed;
}
function markSaveMeta(reason){const s=save();if(!s)return;s.v2729=s.v2729||{};s.v2729.saveRevision=(Number(s.v2729.saveRevision)||0)+1;s.v2729.lastMutationAt=new Date().toISOString();s.v2729.lastMutation=reason||'update'}
function markAndPersist(reason){markSaveMeta(reason);return persistSafe()}
function removeGame(level,id){const s=save();if(!s)return;const st=ensureSubTeam(s,level),g=st.schedule.find(x=>eq(x.id,id));if(!g||g.played)return;st.schedule=st.schedule.filter(x=>!eq(x.id,id));markAndPersist('program-schedule-remove');renderHub()}
function setPlayUp(playerId,target){const s=save(),v=ensure(s),p=programs(s).find(x=>eq(x.id,playerId));if(!p)return;if(!target)delete v.playUp[String(playerId)];else if(p.teamLevel==='JV'&&target==='Varsity')v.playUp[String(playerId)]='Varsity';else if(p.teamLevel==='Freshman'&&['JV','Varsity'].includes(target))v.playUp[String(playerId)]=target;syncVarsityCallUps(s);markAndPersist('play-up');try{renderAll?.()}catch{} }
function scheduleRows(level){const s=save(),st=ensureSubTeam(s,level);if(!st.schedule.length)return '<p class="muted small">No games scheduled yet. Build this team’s schedule before the season.</p>';
  return st.schedule.map(g=>{const o=teamById(s,g.opponentId),place=g.neutral?'N':g.home?'vs':'at',status=g.played?`${Number(g.myScore)>Number(g.oppScore)?'W':'L'} ${g.myScore}-${g.oppScore}`:new Date(g.date).toLocaleDateString();return `<div class="row v2729-game ${g.played?'played':''}"><div class="grow"><b>${place} ${esc(o?.name||'Opponent')}</b>${g.roundName?` <span class="tag">${esc(g.roundName)}</span>`:''}<br><small>${new Date(g.date).toLocaleDateString()} • ${esc(g.type||'Regular Season')}${g.source==='varsity-copy'?' • Applied from Varsity':''}</small></div><b class="${g.played?(Number(g.myScore)>Number(g.oppScore)?'win':'loss'):''}">${esc(status)}</b>${!g.played&&scheduleOpen(s)?`<button class="secondary small-btn" data-v2729-remove="${level}:${esc(g.id)}">Remove</button>`:''}</div>`}).join('')}
function tournamentRows(level){const st=ensureSubTeam(save(),level);return (st.tournaments||[]).length?`<div class="v2729-tournaments">${st.tournaments.map(t=>`<span class="tag">${esc(t.name)} • ${esc(t.status||'Scheduled')}</span>`).join('')}</div>`:''}
function renderPlayUps(){const s=save(),host=$('v2729PlayUps');if(!s||!host)return;const list=programs(s).filter(p=>['JV','Freshman'].includes(p.teamLevel)).sort((a,b)=>a.teamLevel.localeCompare(b.teamLevel)||(Number(b.overall)||0)-(Number(a.overall)||0));const map=playUpMap(s);
  host.innerHTML=list.length?`<div class="table-wrap"><table><thead><tr><th>Player</th><th>Normal Team</th><th>OVR</th><th>Play Up</th></tr></thead><tbody>${list.map(p=>{const opts=p.teamLevel==='JV'?['','Varsity']:['','JV','Varsity'];return `<tr><td><b>${esc(p.name)}</b><br><small>${esc(p.pos||'')} • Grade ${esc(p.grade||'')}</small></td><td>${esc(p.teamLevel)}</td><td>${Number(p.overall)||'—'}</td><td><select data-v2729-playup="${esc(p.id)}">${opts.map(x=>`<option value="${x}" ${map[String(p.id)]===x?'selected':''}>${x?`Play up to ${x}`:`Stay ${p.teamLevel} only`}</option>`).join('')}</select></td></tr>`}).join('')}</tbody></table></div>`:'<p class="muted">No JV/Freshman players are loaded.</p>';
  host.querySelectorAll('[data-v2729-playup]').forEach(sel=>sel.onchange=()=>setPlayUp(sel.dataset.v2729Playup,sel.value));
}
function renderHub(){const s=save();if(!s)return;ensure(s);let host=$('v2729ProgramSchedules');const page=$('schedulePage');if(!page)return;if(!host){host=document.createElement('section');host.id='v2729ProgramSchedules';host.className='v2729-program';page.appendChild(host)}const open=scheduleOpen(s),locked= districtStarted(s)?'Varsity Districts have begun. JV/Freshman scheduling is closed.':!open?'Scheduling opens during Nov. 1 preseason and stays open during the regular season until Districts.':'';
  host.innerHTML=`<div class="section-head"><div><p class="eyebrow">WHOLE PROGRAM • SAME SCHOOL YEAR</p><h3>JV & Freshman Schedules</h3><p class="muted small">These teams advance on the same calendar as Varsity. When their scheduled date arrives, BM27 automatically plays the game. Adding a game is direct — no pitch or coach meeting.</p></div><span class="tag">${seasonLabel(s.season)}</span></div>${locked?`<div class="card"><b>${esc(locked)}</b></div>`:''}<div class="v2729-grid">${LEVELS.map(level=>{const st=ensureSubTeam(s,level);return `<article class="card"><div class="section-head"><div><p class="eyebrow">${level.toUpperCase()}</p><h3>${level} • ${st.wins}-${st.losses}</h3></div><span class="tag">${st.schedule.length}/26</span></div><div class="schedule-actions"><button class="primary" data-v2729-add="${level}" ${open?'':'disabled'}>Add ${level} Game</button><button class="secondary" data-v2729-copy="${level}" ${open?'':'disabled'}>Apply Varsity Schedule</button><button class="secondary" data-v2729-tournament="${level}" ${open?'':'disabled'}>Add ${level} Tournament</button></div>${tournamentRows(level)}<div class="stack v2729-list">${scheduleRows(level)}</div></article>`}).join('')}</div><article class="card"><div class="section-head"><div><p class="eyebrow">GAME-DAY CALL UPS</p><h3>Choose Who Can Play Up</h3><p class="muted small">JV players may play Varsity. Freshman players may play JV or Varsity. They stay on their normal roster and can still play their normal team games.</p></div></div><div id="v2729PlayUps"></div></article>`;
  host.querySelectorAll('[data-v2729-add]').forEach(b=>b.onclick=()=>openGameDialog(b.dataset.v2729Add));host.querySelectorAll('[data-v2729-copy]').forEach(b=>b.onclick=()=>copyVarsity(b.dataset.v2729Copy));host.querySelectorAll('[data-v2729-tournament]').forEach(b=>b.onclick=()=>openTournamentDialog(b.dataset.v2729Tournament));host.querySelectorAll('[data-v2729-remove]').forEach(b=>b.onclick=()=>{const [level,id]=b.dataset.v2729Remove.split(':');removeGame(level,id)});renderPlayUps();disableLegacyButtons();
}
function installDialogs(){if(!$('v2729ProgramGameDialog')){document.body.insertAdjacentHTML('beforeend',`<dialog id="v2729ProgramGameDialog"><form method="dialog" id="v2729ProgramGameForm"><div class="modal-head"><div><p class="eyebrow">DIRECT PROGRAM SCHEDULING</p><h2 id="v2729ProgramGameTitle">Add Game</h2></div><button value="cancel" class="icon-btn">×</button></div><input type="hidden" id="v2729ProgramLevel"><label>Opponent<select id="v2729ProgramOpponent" required></select></label><label>Date<input id="v2729ProgramDate" type="date" required></label><label>Location<select id="v2729ProgramLocation"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></label><label>Game type<select id="v2729ProgramType"><option>Regular Season</option><option>Showcase</option></select></label><p class="muted small">This game is applied immediately. No scheduling pitch is required.</p><button value="default" class="primary wide">Apply Game</button></form></dialog><dialog id="v2729ProgramTournamentDialog"><form method="dialog" id="v2729ProgramTournamentForm"><div class="modal-head"><div><p class="eyebrow">SEPARATE LOWER-LEVEL TOURNAMENT</p><h2 id="v2729ProgramTournamentTitle">Add Tournament</h2></div><button value="cancel" class="icon-btn">×</button></div><input type="hidden" id="v2729TournamentLevel"><label>Tournament name<input id="v2729TournamentName" maxlength="50" placeholder="Holiday Invitational"></label><label>Size<select id="v2729TournamentSize"><option value="4">4 teams</option><option value="8">8 teams</option></select></label><label>Starting date<input id="v2729TournamentDate" type="date" required></label><p class="muted small">BM27 fills the other schools from the loaded directory. This tournament belongs only to this lower-level team and does not enter Varsity into it.</p><button value="default" class="primary wide">Create Tournament</button></form></dialog>`)}
  const gf=$('v2729ProgramGameForm');if(gf&&!gf.dataset.bound){gf.dataset.bound='1';gf.addEventListener('submit',e=>{e.preventDefault();addGame($('v2729ProgramLevel').value,{opponentId:$('v2729ProgramOpponent').value,date:$('v2729ProgramDate').value,location:$('v2729ProgramLocation').value,type:$('v2729ProgramType').value});$('v2729ProgramGameDialog').close()})}
  const tf=$('v2729ProgramTournamentForm');if(tf&&!tf.dataset.bound){tf.dataset.bound='1';tf.addEventListener('submit',e=>{e.preventDefault();createTournament($('v2729TournamentLevel').value,{name:$('v2729TournamentName').value,size:Number($('v2729TournamentSize').value),startDate:$('v2729TournamentDate').value});$('v2729ProgramTournamentDialog').close()})}
}
function openGameDialog(level){const s=save();if(!s||!scheduleOpen(s))return toastSafe('Scheduling is closed.');installDialogs();$('v2729ProgramLevel').value=level;$('v2729ProgramGameTitle').textContent=`Add ${level} Game`;$('v2729ProgramOpponent').innerHTML=(s.teams||[]).filter(t=>!eq(t.id,s.schoolId)).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.mascot?' '+esc(t.mascot):''}</option>`).join('');const d=$('v2729ProgramDate');d.min=seasonMin(s);d.max=seasonMax(s);let suggested=stage(s)==='preseason'?seasonMin(s):dateOnly(s.day);if(suggested<seasonMin(s))suggested=seasonMin(s);if(suggested>seasonMax(s))suggested=seasonMax(s);d.value=suggested;$('v2729ProgramGameDialog').showModal()}
function openTournamentDialog(level){const s=save();if(!s||!scheduleOpen(s))return toastSafe('Scheduling is closed.');installDialogs();$('v2729TournamentLevel').value=level;$('v2729ProgramTournamentTitle').textContent=`Add ${level} Tournament`;$('v2729TournamentName').value=`${level} Invitational`;const d=$('v2729TournamentDate');d.min=seasonMin(s);d.max=seasonMax(s);d.value=stage(s)==='preseason'?seasonMin(s):dateOnly(s.day);$('v2729ProgramTournamentDialog').showModal()}
function disableLegacyButtons(){for(const b of document.querySelectorAll('[data-v2-subgame="JV"],[data-v2-subgame="Freshman"]')){b.disabled=true;const level=b.dataset.v2Subgame,st=ensureSubTeam(save(),level),next=st.schedule.find(g=>!g.played);b.textContent=next?`Auto plays ${new Date(next.date).toLocaleDateString()}`:`Build ${level} schedule in Schedule tab`}}
function renderHistoryExtra(){const s=save(),host=$('historyContent');if(!s||!host)return;ensure(s);host.querySelector('#v2729ProgramHistory')?.remove();const hist=s.v2729.programHistory||[];const box=document.createElement('section');box.id='v2729ProgramHistory';box.className='card v2729-history';box.innerHTML=`<div class="section-head"><div><p class="eyebrow">LOWER-LEVEL PROGRAM HISTORY</p><h3>JV & Freshman Seasons</h3><p class="muted small">Archived with the same school year as Varsity. Lower-level records and tournaments remain separate from the Varsity record.</p></div></div>${hist.length?hist.slice().reverse().map(y=>`<details><summary><b>${esc(y.label)}</b> • JV ${esc(y.teams?.JV?.record||'0-0')} • Freshman ${esc(y.teams?.Freshman?.record||'0-0')}</summary>${LEVELS.map(l=>`<h4>${l}</h4><div class="stack">${(y.teams?.[l]?.schedule||[]).map(g=>{const o=teamById(s,g.opponentId);return `<div class="row"><span>${new Date(g.date).toLocaleDateString()} • ${esc(o?.name||'Opponent')}${g.roundName?' • '+esc(g.roundName):''}</span><b>${g.played?`${g.myScore}-${g.oppScore}`:'Not played'}</b></div>`}).join('')||'<p class="muted small">No games.</p>'}</div>`).join('')}</details>`).join(''):'<p class="muted">No JV/Freshman season has been archived yet.</p>'}`;host.appendChild(box)}
async function manualSaveExact(){const s=save();if(!s)return toastSafe('Open a career before saving.');markSaveMeta('manual-save');const btn=$('manualSaveBtn'),pill=$('saveStatusPill');if(btn){btn.disabled=true;btn.textContent='Saving…'}if(pill){pill.dataset.state='saving';pill.textContent='Saving…'}const localOk=persistSafe();if(localOk===false){if(btn){btn.disabled=false;btn.textContent='Save Game'}return toastSafe('Device storage is full. Export a backup before making more changes.')}
  try{if(window.cloudGame?.signedIn){await window.cloudGame.forceSave(s);if(pill){pill.dataset.state='saved';pill.textContent='✓ Saved to account'}toastSafe('Saved to device and account.')}else{if(pill){pill.dataset.state='local';pill.textContent='✓ Saved on device'}toastSafe('Saved on this device.')}}catch(e){console.error('BM27 v2.7.29 manual save',e);if(pill){pill.dataset.state='error';pill.textContent='✓ Device saved • account retrying'}toastSafe('Device save is safe. Account save will retry automatically.')}finally{if(btn){btn.disabled=false;btn.textContent='Save Game'}}}
let oldRender=null;
function install(){if(window.__BM27_V2729__)return;window.__BM27_V2729__=true;installDialogs();
  if(typeof renderAll==='function'){oldRender=renderAll;renderAll=function(){const s=save();if(s){ensure(s);syncVarsityCallUps(s)}const r=oldRender.apply(this,arguments);if(save()){ensure(save());syncVarsityCallUps(save());renderHub();renderHistoryExtra();disableLegacyButtons();try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.29'}catch{}}return r}}
  // Manual Save now waits for Supabase acknowledgement instead of saying Saved before the account write finishes.
  document.addEventListener('click',e=>{const b=e.target.closest?.('#manualSaveBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();manualSaveExact()},true);
  // Always leave a fresh device copy when the tab/app is backgrounded or closed.
  window.addEventListener('pagehide',()=>{try{if(save()){markSaveMeta('pagehide');persistSafe()}}catch{}},{capture:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="schedule"]'))setTimeout(renderHub,0);if(e.target.closest?.('[data-page="history"]'))setTimeout(renderHistoryExtra,0);if(e.target.closest?.('[data-open-updates]'))setTimeout(addNotes,20)},true);
  if(save()){ensure(save());syncVarsityCallUps(save());processDueGames(save())}renderHub();renderHistoryExtra();addNotes();
}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2729-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2729-notes><p class="eyebrow">BM27 v2.7.29</p><h3>Program Schedules + Save Reliability</h3><ul class="update-list"><li>JV and Freshman now have coach-built schedules tied to the exact same calendar and season year as Varsity.</li><li>Add lower-level games directly with no scheduling pitch, or apply Varsity regular-season matchups with one button.</li><li>JV/Freshman games auto-play when their date is reached, reset with the Varsity season, and archive in History.</li><li>JV and Freshman can enter separate optional 4- or 8-team tournaments.</li><li>Choose Freshman players to play up to JV/Varsity and JV players to play up to Varsity without permanently moving their normal team assignment.</li><li>Cloud/device save conflicts now keep whichever copy is newer; a newer device copy automatically repairs the account copy.</li><li>Manual Save waits for an actual Supabase acknowledgement before showing Saved to account.</li></ul></article>`)}
window.BM27V2729={version:VERSION,ensure,addGame,copyVarsity,createTournament,processDueGames,setPlayUp,eligibleRoster,teamRating,renderHub,manualSaveExact,archiveProgramYear,scheduleOpen};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
