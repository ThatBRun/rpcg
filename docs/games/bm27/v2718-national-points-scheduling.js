/* BM27 v2.7.18 — National Points + Full National Rankings + In-Season Scheduling */
(()=>{
'use strict';
const VERSION=27180;
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const stateMap={Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY','District of Columbia':'DC'};
let rankCache={key:'',rows:[],rankMap:new Map()};
let pregameRankByGame=new Map();

function hash(value=''){
  let h=2166136261;
  for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
  return h>>>0;
}
function stateCode(raw){const s=String(raw||'').trim();return s.length===2?s.toUpperCase():(stateMap[s]||s||'??')}
function nationalDirectory(){const d=window.BM27NationalDirectory;return Array.isArray(d)?d:Array.isArray(d?.schools)?d.schools:[]}
function seasonWeek(save=current){
  if(!save)return 1;
  const start=new Date(`${Number(save.season)||2026}-11-24T12:00:00`).getTime();
  const now=new Date(save.day||Date.now()).getTime();
  return clamp(Math.floor((now-start)/604800000)+1,1,24);
}
function ensureState(save=current){
  if(!save)return null;
  save.v2718National=save.v2718National||{};
  const s=save.v2718National;
  s.version=VERSION;
  s.rankPage=Number(s.rankPage)||1;
  s.pointEvents=Array.isArray(s.pointEvents)?s.pointEvents:[];
  s.weeklySnapshots=Array.isArray(s.weeklySnapshots)?s.weeklySnapshots:[];
  return s;
}
function pointsForRank(rank){
  const r=Math.max(1,Number(rank)||1);
  return Math.max(5,Math.round(1000/Math.sqrt(r)));
}
function ratingFor(raw){return clamp(Number(raw?.rating)||68+(hash(raw?.id||raw?.name)%27),45,99)}
function dynamicNationalRecord(raw,save=current){
  const week=seasonWeek(save),rating=ratingFor(raw),id=String(raw?.id||raw?.name||'school');
  const games=clamp(week*2+(hash(`${id}|${save?.season}|games`)%2),0,26);
  const basePct=clamp(.28+(rating-60)/48,.18,.91);
  const seasonNoise=((hash(`${id}|${save?.season}|record`)%10001)/10000-.5)*.16;
  const pct=clamp(basePct+seasonNoise,.08,.96);
  const wins=clamp(Math.round(games*pct),0,games);
  return {wins,losses:games-wins};
}
function schoolRows(save=current){
  if(!save)return [];
  const map=new Map();
  const add=(raw,local=false)=>{
    if(!raw?.name)return;
    const id=String(raw.id||`${raw.name}|${raw.city||''}|${raw.state||''}`);
    const existing=map.get(id);
    const st=stateCode(raw.state||raw.stateCode||(local?'Missouri':''));
    const isUser=local&&eq(raw.id,save.schoolId);
    const rec=local?{wins:Number(raw.wins)||0,losses:Number(raw.losses)||0}:dynamicNationalRecord(raw,save);
    const row={id,name:raw.name,mascot:raw.mascot||'',city:raw.city||'',state:st,rating:ratingFor(raw),wins:rec.wins,losses:rec.losses,isUser,local,source:raw};
    if(!existing||local)map.set(id,row);
  };
  for(const raw of nationalDirectory())add(raw,false);
  for(const t of save.teams||[]){
    if(!t?.name||t.nationalOnly)continue;
    add(t,true);
  }
  return [...map.values()];
}
function provisionalSort(rows){
  return rows.slice().sort((a,b)=>{
    const aMo=a.state==='MO'&&!a.isUser?650:0,bMo=b.state==='MO'&&!b.isUser?650:0;
    const as=(a.wins*250)-(a.losses*35)+(a.rating*2)-aMo+(a.isUser?80:0);
    const bs=(b.wins*250)-(b.losses*35)+(b.rating*2)-bMo+(b.isUser?80:0);
    return bs-as||b.wins-a.wins||b.rating-a.rating||String(a.name).localeCompare(String(b.name));
  });
}
function syntheticPoints(row,total,save=current){
  const wins=Math.max(0,Number(row.wins)||0);if(!wins)return 0;
  const strength=clamp(1+(row.rating-68)/28,.75,2.1),maxRank=Math.max(1,total-1);
  let sample=0;
  for(let i=0;i<3;i++){
    const u=((hash(`${row.id}|${save?.season}|qualitysample|${i}`)%99999)+1)/100000;
    const oppRank=1+Math.floor(Math.pow(u,strength)*maxRank);
    sample+=pointsForRank(oppRank);
  }
  return Math.round((sample/3)*wins);
}
function localPointsMap(save,baseRankMap){
  const out=new Map(),winsSeen=new Map();
  for(const g of save?.seasonEngine?.games||[]){
    if(g?.status!=='final'||!g.team1Id||!g.team2Id)continue;
    const winner=g.winnerId||(Number(g.score1)>Number(g.score2)?g.team1Id:g.team2Id);
    const loser=eq(winner,g.team1Id)?g.team2Id:g.team1Id;
    const rank=baseRankMap.get(String(loser));if(!rank)continue;
    const k=String(winner);out.set(k,(out.get(k)||0)+pointsForRank(rank));winsSeen.set(k,(winsSeen.get(k)||0)+1);
  }
  return {points:out,winsSeen};
}
function eventTotal(save=current){return (ensureState(save)?.pointEvents||[]).reduce((n,e)=>n+(Number(e.points)||0),0)}
function userEvents(save=current){return ensureState(save)?.pointEvents||[]}
function eventKey(g){return String(g?.id||g?.engineGameId||g?.nationalMatchId||`${g?.opponentId}|${g?.date}`)}
function ensureUserPointEvents(save,baseRankMap){
  if(!save)return false;
  const s=ensureState(save),seen=new Set(s.pointEvents.map(e=>String(e.gameId)));
  let changed=false;
  for(const g of save.schedule||[]){
    if(!g?.played||Number(g.myScore)<=Number(g.oppScore)||!g.opponentId)continue;
    const key=eventKey(g);if(seen.has(key))continue;
    const rank=Number(g.v2718OpponentRankBeforeGame)||Number(pregameRankByGame.get(key))||baseRankMap.get(String(g.opponentId));
    if(!rank)continue;
    const opp=(save.teams||[]).find(t=>eq(t.id,g.opponentId))||window.BM27ResolveNationalTeam?.(g.opponentId);
    const pts=pointsForRank(rank);
    s.pointEvents.push({gameId:key,date:g.date||save.day,opponentId:String(g.opponentId),opponentName:opp?.name||'Opponent',opponentRank:rank,points:pts});
    seen.add(key);changed=true;
    if(new Date(g.date||0).getTime()>=Date.now()-86400000){
      save.news?.unshift?.({date:g.date||save.day,text:`NATIONAL POINTS: ${opp?.name||'Opponent'} was ranked #${rank}. Win bonus: +${pts} National Points.`});
    }
  }
  if(changed){rankCache.key='';try{persist?.()}catch{}}
  return changed;
}
function buildRankings(save=current){
  if(!save)return [];
  const s=ensureState(save),rows=schoolRows(save),week=seasonWeek(save);
  const localSig=(save.teams||[]).filter(t=>!t.nationalOnly).map(t=>`${t.id}:${t.wins||0}:${t.losses||0}`).join('|');
  const ptsSig=`${s.pointEvents.length}:${eventTotal(save)}`;
  const key=`${save.season}|${week}|${nationalDirectory().length}|${localSig}|${ptsSig}`;
  if(rankCache.key===key&&rankCache.rows.length)return rankCache.rows;

  const provisional=provisionalSort(rows);
  const baseRankMap=new Map(provisional.map((r,i)=>[String(r.id),i+1]));
  const userRow=rows.find(r=>r.isUser);
  if(userRow)baseRankMap.set('national-user',baseRankMap.get(String(userRow.id))||1);
  const added=ensureUserPointEvents(save,baseRankMap);
  if(added)return buildRankings(save);

  const total=Math.max(1,rows.length);
  const uPoints=eventTotal(save),localActual=localPointsMap(save,baseRankMap);
  for(const r of rows){
    if(r.isUser)r.nationalPoints=uPoints;
    else if(r.local){
      const key=String(r.id),seen=localActual.winsSeen.get(key)||0,actual=localActual.points.get(key)||0;
      r.nationalPoints=seen?actual+Math.round(syntheticPoints({...r,wins:Math.max(0,r.wins-seen)},total,save)):syntheticPoints(r,total,save);
    }else r.nationalPoints=syntheticPoints(r,total,save);
    const moPenalty=r.state==='MO'&&!r.isUser?650:0;
    r.nationalScore=(r.wins*250)+r.nationalPoints-(r.losses*35)+(r.rating*2)-moPenalty+(r.isUser?80:0);
  }
  rows.sort((a,b)=>b.nationalScore-a.nationalScore||b.wins-a.wins||b.nationalPoints-a.nationalPoints||b.rating-a.rating||String(a.name).localeCompare(String(b.name)));
  rows.forEach((r,i)=>r.rank=i+1);
  const rankMap=new Map(rows.map(r=>[String(r.id),r.rank]));
  if(userRow)rankMap.set('national-user',rankMap.get(String(userRow.id))||rows.length);
  rankCache={key,rows,rankMap};
  window.BM27NationalRankMap=rankMap;
  window.BM27NationalRankingsAll=rows;
  const userRank=userRow?rankMap.get(String(userRow.id)):null;
  if(userRank){
    const last=s.weeklySnapshots.at?.(-1);
    if(!last||Number(last.week)!==week){s.weeklySnapshots.push({week,rank:userRank,points:uPoints,wins:userRow.wins,losses:userRow.losses,date:save.day});if(s.weeklySnapshots.length>30)s.weeklySnapshots=s.weeklySnapshots.slice(-30)}
  }
  return rows;
}
function userRank(save=current){const rows=buildRankings(save),me=rows.find(r=>r.isUser);return me?.rank||rows.length||1}
function removeOldTop100(host){
  for(const h of [...host.querySelectorAll('h3')]){
    if(h.textContent.trim()!=='National Top 100')continue;
    const head=h.closest('.section-head'),table=head?.nextElementSibling;
    if(table?.classList?.contains('table-wrap'))table.remove();
    head?.remove();
  }
}
function renderNationalExtension(){
  const host=$('v22NationalsContent');if(!host||!current)return;
  const rows=buildRankings(current),s=ensureState(current);if(!rows.length)return;
  removeOldTop100(host);$('v2713NationalBrowser')?.remove();
  $('v2718NationalPoints')?.remove();$('v2718FullNationalRankings')?.remove();
  const me=rows.find(r=>r.isUser),week=seasonWeek(current),events=userEvents(current).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const topHead=host.querySelector(':scope > .section-head');if(topHead){const eye=topHead.querySelector('.eyebrow'),tag=topHead.querySelector('.tag');if(eye)eye.textContent='FULL NATIONAL RANKING POOL • 100 PER PAGE';if(tag)tag.textContent=`Your Rank: #${me?.rank||'—'}`}
  for(const metric of host.querySelectorAll('.metric')){const label=metric.querySelector('span'),value=metric.querySelector('b');if(label?.textContent?.trim()==='Your National Rank'&&value)value.textContent=`#${me?.rank||'—'}`}
  const pts=eventTotal(current),qualityWins=events.length;
  const pointsCard=document.createElement('section');pointsCard.id='v2718NationalPoints';pointsCard.className='card v2718-national-points';
  pointsCard.innerHTML=`<div class="section-head"><div><p class="eyebrow">WEEK ${week} • QUALITY-WIN SYSTEM</p><h3>National Points</h3><p class="muted small">Beat higher-ranked teams to earn more points. #1 is worth 1,000; #10 ≈ 316; #100 = 100; #1,000 ≈ 32. Every school is compared weekly using wins, National Points, losses and team strength.</p></div><span class="tag">${pts.toLocaleString()} PTS</span></div><div class="metrics"><div class="metric"><span>Your National Rank</span><b>#${me?.rank||'—'}</b></div><div class="metric"><span>National Points</span><b>${pts.toLocaleString()}</b></div><div class="metric"><span>Ranked Wins</span><b>${qualityWins}</b></div><div class="metric"><span>Current Week</span><b>${week}</b></div></div><div class="v2718-points-feed">${events.length?events.slice(0,6).map(e=>`<div class="row"><div><b>+${Number(e.points).toLocaleString()} pts</b> • beat #${e.opponentRank} ${escapeHtml(e.opponentName)}<br><small>${new Date(e.date).toLocaleDateString()}</small></div></div>`).join(''):'<p class="muted">Win games to start earning National Points.</p>'}</div>`;
  host.appendChild(pointsCard);

  const pages=Math.max(1,Math.ceil(rows.length/100));s.rankPage=clamp(Number(s.rankPage)||1,1,pages);const page=s.rankPage,start=(page-1)*100,show=rows.slice(start,start+100);
  const section=document.createElement('section');section.id='v2718FullNationalRankings';section.className='v2718-full-rankings';
  section.innerHTML=`<div class="section-head"><div><p class="eyebrow">EVERY HIGH SCHOOL • 100 PER PAGE</p><h3>Full National Rankings</h3><p class="muted small">${rows.length.toLocaleString()} schools ranked. Missouri schools remain eligible but receive the reduced national weight from the previous update; your school is exempt.</p></div><span class="tag">#${start+1}–${Math.min(start+100,rows.length)}</span></div><div class="ranking-pagination"><button id="v2718RankPrev" class="secondary" ${page<=1?'disabled':''}>← Previous 100</button><b>Page ${page} of ${pages}</b><button id="v2718RankNext" class="secondary" ${page>=pages?'disabled':''}>Next 100 →</button></div><div class="table-wrap"><table><thead><tr><th>Rank</th><th>School</th><th>State</th><th>Record</th><th>National Points</th><th>OVR</th></tr></thead><tbody>${show.map(r=>`<tr class="${r.isUser?'ranking-user':''}"><td><b>#${r.rank}</b></td><td><b>${escapeHtml(r.name)}</b>${r.isUser?' <span class="tag">YOU</span>':''}</td><td>${escapeHtml(r.state)}</td><td>${r.wins}-${r.losses}</td><td><b>${Number(r.nationalPoints||0).toLocaleString()}</b></td><td>${r.rating}</td></tr>`).join('')}</tbody></table></div>`;
  host.appendChild(section);
  $('v2718RankPrev')?.addEventListener('click',()=>{s.rankPage--;renderNationalExtension();host.scrollIntoView({block:'start',behavior:'smooth'})});
  $('v2718RankNext')?.addEventListener('click',()=>{s.rankPage++;renderNationalExtension();host.scrollIntoView({block:'start',behavior:'smooth'})});
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function invalidate(){rankCache.key=''}

/* Award points from every completed user game, including existing saves and live/national games. */
function installGameHook(){
  if(typeof simulateGame!=='function'||simulateGame.__v2718Wrapped)return;
  const base=simulateGame;
  const wrapped=function(g){
    if(current&&g&&!g.played&&g.opponentId){
      const ranks=buildRankings(current),oppRank=ranks.find(r=>eq(r.id,g.opponentId))?.rank;
      if(oppRank){g.v2718OpponentRankBeforeGame=oppRank;pregameRankByGame.set(eventKey(g),oppRank)}
    }
    const out=base.apply(this,arguments);
    if(current){invalidate();buildRankings(current);if($('v22NationalsPage')?.classList.contains('active'))setTimeout(renderNationalExtension,0)}
    return out;
  };
  wrapped.__v2718Wrapped=true;simulateGame=wrapped;
}

/* In-season Add Game: allowed until Districts begin or the 26-game cap is reached. */
function districtsStarted(save=current){
  if(!save)return true;
  if(save.seasonEngine?.postseason?.districtsCreated)return true;
  return (save.tournaments||[]).some(t=>t&&(t.type==='District Tournament'||t.kind==='District Tournament'||t.type==='State Tournament'||t.kind==='State Tournament'))||(save.schedule||[]).some(g=>g?.type==='District Tournament'||g?.type==='State Tournament');
}
function regularSlotCount(save=current){return (save?.schedule||[]).filter(g=>g?.type!=='District Tournament'&&g?.type!=='State Tournament'&&!g?.nationalTournament).length}
function canAddGame(save=current){return !!save&&!districtsStarted(save)&&regularSlotCount(save)<26}
let inheritedOpenSchedule=null,inheritedScheduleSubmit=null,inheritedRenderSchedule=null;
function openInSeasonSchedule(){
  if(!current)return;
  if(districtsStarted(current))return toast?.('Districts have started. The regular-season schedule is locked.');
  if(regularSlotCount(current)>=26)return toast?.('The 26-game schedule limit has been reached.');
  if(!inheritedOpenSchedule)return;
  const oldEditable=typeof scheduleEditable==='function'?scheduleEditable:null;
  try{
    if(oldEditable)scheduleEditable=()=>true;
    inheritedOpenSchedule();
  }finally{if(oldEditable)scheduleEditable=oldEditable}
  const dlg=$('scheduleDialog'),date=$('scheduleDate');
  if(date){const today=new Date(current.day);today.setHours(0,0,0,0);date.min=today.toISOString().slice(0,10);if(new Date(`${date.value}T12:00:00`)<today){const next=new Date(today);next.setDate(next.getDate()+2);date.value=next.toISOString().slice(0,10)}}
  const eye=dlg?.querySelector('.eyebrow');if(eye)eye.textContent='SEASON SCHEDULING';
  const title=dlg?.querySelector('h2');if(title)title.textContent='Add Regular-Season Game';
}
function refreshScheduleControls(){
  if(!current)return;
  const btn=$('addGameBtn'),help=$('scheduleHelp'),slots=regularSlotCount(current),districts=districtsStarted(current);
  if(btn){btn.disabled=districts||slots>=26;btn.title=districts?'Districts have started.':slots>=26?'26-game limit reached.':'Add another regular-season game.'}
  if(help){
    if(districts)help.textContent=`Districts have started. Regular-season scheduling is locked at ${slots}/26 games.`;
    else if(slots>=26)help.textContent='The 26-game regular-season limit has been reached. No more games can be added.';
    else if((current.schedule||[]).some(g=>g.played))help.textContent=`In-season scheduling is open. ${slots}/26 games scheduled. You can add games until Districts begin.`;
  }
}
function installScheduleHook(){
  if(!inheritedOpenSchedule&&typeof openScheduleDialog==='function')inheritedOpenSchedule=openScheduleDialog;
  if(!inheritedRenderSchedule&&typeof renderSchedule==='function'){
    inheritedRenderSchedule=renderSchedule;
    renderSchedule=function(){const r=inheritedRenderSchedule.apply(this,arguments);refreshScheduleControls();return r};
  }
  const btn=$('addGameBtn');if(btn)btn.onclick=openInSeasonSchedule;
  const form=$('scheduleForm');
  if(form&&!inheritedScheduleSubmit){
    inheritedScheduleSubmit=form.onsubmit;
    form.onsubmit=function(e){
      if(!current||districtsStarted(current)){e.preventDefault();toast?.('Districts have started. No more regular-season games can be added.');return false}
      if(regularSlotCount(current)>=26){e.preventDefault();toast?.('26-game limit reached.');return false}
      const raw=$('scheduleDate')?.value;if(raw){const chosen=new Date(`${raw}T12:00:00`),day=new Date(current.day);day.setHours(0,0,0,0);if(chosen<day){e.preventDefault();toast?.('Choose today or a future date for the new game.');return false}}
      const out=inheritedScheduleSubmit?.call(this,e);setTimeout(()=>{invalidate();refreshScheduleControls()},0);return out;
    };
  }
  refreshScheduleControls();
}

function installRenderHooks(){
  if(typeof renderAll==='function'&&!renderAll.__v2718Wrapped){
    const base=renderAll;
    const wrapped=function(){const r=base.apply(this,arguments);if(current){buildRankings(current);refreshScheduleControls();if($('v22NationalsPage')?.classList.contains('active'))setTimeout(renderNationalExtension,0)}return r};
    wrapped.__v2718Wrapped=true;renderAll=wrapped;
  }
  if(typeof openSave==='function'&&!openSave.__v2718Wrapped){
    const base=openSave;
    const wrapped=function(){const r=base.apply(this,arguments);if(current){ensureState(current);invalidate();buildRankings(current);refreshScheduleControls()}return r};
    wrapped.__v2718Wrapped=true;openSave=wrapped;
  }
  document.addEventListener('click',e=>{if(e.target.closest('#v22NationalsNav'))setTimeout(renderNationalExtension,30);if(e.target.closest('[data-open-updates]'))setTimeout(addUpdateNotes,20)},true);
  window.addEventListener('bm27-out-of-state-loaded',()=>{invalidate();if(current){buildRankings(current);if($('v22NationalsPage')?.classList.contains('active'))setTimeout(renderNationalExtension,0)}});
}
function addUpdateNotes(){
  const box=$('updatesContent');if(!box||box.querySelector('[data-v2718-notes]'))return;
  box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2718-notes><p class="eyebrow">BM27 v2.7.18</p><h3>National Points + Full Weekly Rankings</h3><ul class="update-list"><li>Added National Points. Every win earns points based on the opponent's national rank at the time of the game; beating higher-ranked teams is worth much more.</li><li>Every loaded high school now receives a national rank. The Nationals board shows 100 schools per page across the full nationwide directory.</li><li>National rankings compare wins, National Points, losses and team strength each week. Missouri schools keep a reduced national weight except for your school.</li><li>Existing saves automatically backfill National Points from already-played wins.</li><li>Regular-season games can now be added after the season starts. Adding games locks when Districts begin or when the 26-game limit is reached.</li></ul></article>`);
}
function boot(){
  if(current)ensureState(current);
  installGameHook();installScheduleHook();installRenderHooks();
  if(window.BM27V22){
    window.BM27V22.fullNationalRankings=buildRankings;
    window.BM27V22.nationalRankings=save=>buildRankings(save).slice(0,100);
    window.BM27V22.nationalUserRank=userRank;
  }
  window.BM27V2718={version:VERSION,fullNationalRankings:buildRankings,nationalUserRank:userRank,pointsForRank,render:renderNationalExtension,canAddGame,districtsStarted};
  if(current){invalidate();buildRankings(current);refreshScheduleControls()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
