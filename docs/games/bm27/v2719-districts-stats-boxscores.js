/* BM27 v2.7.19 — Official District Structure + Authoritative Stats/Box Scores */
(()=>{
'use strict';
const VERSION=2719;
const eq=(a,b)=>String(a)===String(b);
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));
const statsCache=new Map();
let persistTimer=null;

function queuePersist(){
  clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{try{persist?.()}catch(e){console.warn('BM27 v2.7.19 save',e)}},80);
}
function isMissouriTeam(t){return !!t&&!t.outOfState&&!t.nationalOnly&&Number.isFinite(Number(t.class))}
function districtLimit(classNo,save=current){
  const c=Number(classNo);
  if(c>=1&&c<=4)return 16;
  if(c===5||c===6)return 8;
  if(c>=7)return Math.max(8,Math.min(16,Math.round(Number(save?.v231?.manualClassDistricts?.[c])||16)));
  return 16;
}
function classTeams(save,c){return (save?.teams||[]).filter(t=>isMissouriTeam(t)&&Number(t.class)===Number(c))}
function leastBucket(buckets){let idx=0;for(let i=1;i<buckets.length;i++)if(buckets[i].length<buckets[idx].length)idx=i;return idx}
function normalizeClassDistricts(save,c){
  const teams=classTeams(save,c);if(!teams.length)return false;
  const limit=districtLimit(c,save),buckets=Array.from({length:limit},()=>[]),invalid=[];let changed=false;
  for(const t of teams){const d=Math.trunc(Number(t.district));if(Number.isFinite(d)&&d>=1&&d<=limit)buckets[d-1].push(t);else invalid.push(t)}
  invalid.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))||String(a.id).localeCompare(String(b.id)));
  for(const t of invalid){const i=leastBucket(buckets);t.district=String(i+1);buckets[i].push(t);changed=true}
  // A real active class should have every official district represented. Preserve valid
  // assignments and only move one school from an oversized district when a district is empty.
  if(teams.length>=limit){
    for(let empty=0;empty<limit;empty++){
      if(buckets[empty].length)continue;
      let donor=-1;
      for(let i=0;i<limit;i++)if(buckets[i].length>1&&(donor<0||buckets[i].length>buckets[donor].length))donor=i;
      if(donor<0)break;
      buckets[donor].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))||String(a.id).localeCompare(String(b.id)));
      const moved=buckets[donor].pop();moved.district=String(empty+1);buckets[empty].push(moved);changed=true;
    }
  }
  return changed;
}
function syncActiveAssignmentSnapshot(save){
  const hist=save?.v2?.assignmentHistory;if(!Array.isArray(hist))return false;let changed=false;
  const byId=new Map((save.teams||[]).map(t=>[String(t.id),t]));
  for(const snap of hist){if(Number(snap?.season)!==Number(save.season))continue;for(const sc of snap.schools||[]){const t=byId.get(String(sc.id??sc.schoolId));if(!t||!isMissouriTeam(t))continue;const c=Number(t.class),d=Number(t.district);if(Number(sc.classNo??sc.class)!==c){if('classNo'in sc)sc.classNo=c;else sc.class=c;changed=true}if(Number(sc.district)!==d){sc.district=d;changed=true}}}
  return changed;
}
function tournamentType(t){return String(t?.type||t?.kind||'')}
function classPostseason(save,c){return (save?.tournaments||[]).filter(t=>Number(t.classNo)===Number(c)&&['District Tournament','State Tournament'].includes(tournamentType(t)))}
function removeTournamentSet(save,ids){
  const set=new Set([...ids].map(String));if(!set.size)return;
  save.tournaments=(save.tournaments||[]).filter(t=>!set.has(String(t.id)));
  save.schedule=(save.schedule||[]).filter(g=>!set.has(String(g.tournamentId)));
  if(save.seasonEngine?.games)save.seasonEngine.games=save.seasonEngine.games.filter(g=>!set.has(String(g.tournamentId)));
}
function repairPostseasonShape(save,c){
  const teams=classTeams(save,c),limit=districtLimit(c,save);if(!teams.length)return false;
  const expected=Math.min(limit,teams.length),all=classPostseason(save,c),districts=all.filter(t=>tournamentType(t)==='District Tournament'),states=all.filter(t=>tournamentType(t)==='State Tournament');
  // Completed state tournaments are historical results and are never rewritten.
  if(states.some(t=>t.championId))return false;
  let changed=false;
  if(districts.length){
    const nums=districts.map(t=>Number(t.districtNo));
    const unique=new Set(nums.filter(Number.isFinite));
    const wrong=districts.length!==expected||unique.size!==districts.length||nums.some(d=>!Number.isInteger(d)||d<1||d>limit)||(teams.length>=limit&&Array.from({length:limit},(_,i)=>i+1).some(d=>!unique.has(d)));
    if(wrong){
      const ids=new Set(all.map(t=>String(t.id)));removeTournamentSet(save,ids);changed=true;
      save.news=save.news||[];
      const key=`district-structure-${save.season}-${c}-${limit}`;
      if(!save.v2719DistrictNotices)save.v2719DistrictNotices=[];
      if(!save.v2719DistrictNotices.includes(key)){
        save.v2719DistrictNotices.push(key);
        save.news.unshift({date:save.day,text:`Postseason structure corrected: Class ${c} now uses exactly ${limit} districts for the ${save.season} season.`});
      }
    }
  }else if(states.length){
    // A state bracket cannot exist without its district champions.
    removeTournamentSet(save,new Set(states.map(t=>String(t.id))));changed=true;
  }
  if(!changed&&states.length){
    for(const st of states){const entrants=(st.teams||[]).length;if(entrants&&entrants!==expected){removeTournamentSet(save,new Set([String(st.id)]));changed=true}}
  }
  return changed;
}
function normalizeDistrictSystem(save,force=false){
  if(!save)return false;save.v2719=save.v2719||{};let changed=false;
  const season=Number(save.season)||2026;
  if(force||save.v2719.districtSeason!==season||save.v2719.districtVersion!==VERSION){
    const max=Math.max(6,Number(save?.v2?.classSystem?.maxClass)||6,...(save.teams||[]).filter(isMissouriTeam).map(t=>Number(t.class)||0));
    for(let c=1;c<=max;c++)changed=normalizeClassDistricts(save,c)||changed;
    changed=syncActiveAssignmentSnapshot(save)||changed;
    save.v2719.districtSeason=season;save.v2719.districtVersion=VERSION;
  }
  const max=Math.max(6,Number(save?.v2?.classSystem?.maxClass)||6,...(save.teams||[]).filter(isMissouriTeam).map(t=>Number(t.class)||0));
  for(let c=1;c<=max;c++)changed=repairPostseasonShape(save,c)||changed;
  return changed;
}

function hash32(x){let h=2166136261>>>0;for(const c of String(x)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rngFor(x){let a=hash32(x)||1;return()=>((a=Math.imul(a^a>>>15,1|a),a^=a+Math.imul(a^a>>>7,61|a),((a^a>>>14)>>>0)/4294967296))}
function resolveTeam(id){
  let t=(current?.teams||[]).find(x=>eq(x.id,id));if(t)return t;
  try{t=window.BM27ResolveNationalTeam?.(id)}catch{}return t||null;
}
function resolveOpponent(g){return resolveTeam(g?.opponentId||g?.nationalOpponentId)||null}
function eligible(p){return !window.BM27Academics2716||window.BM27Academics2716.isEligible(p)}
function rotation(team,userSide=false){
  let roster=(team?.roster||[]).filter(p=>!userSide||eligible(p));
  if(!roster.length)return[];
  let active=roster.filter(p=>(Number(p.minutes)||0)>0);
  if(active.length<5)active=roster.slice().sort((a,b)=>(Number(b.overall)||0)-(Number(a.overall)||0)).slice(0,Math.min(10,roster.length));
  return active.slice().sort((a,b)=>(Number(b.minutes)||0)-(Number(a.minutes)||0)||(Number(b.overall)||0)-(Number(a.overall)||0)).slice(0,12);
}
function allocMinutes(players,rand){
  const n=players.length;if(!n)return[];const cap=32,total=Math.min(160,n*cap),weights=players.map((p,i)=>Math.max(1,Number(p.minutes)||Math.max(4,28-i*2)+(Number(p.overall)||65)/20)),sum=weights.reduce((a,b)=>a+b,0),expected=weights.map(w=>w/sum*total),mins=Array(n).fill(0);
  for(let k=0;k<total;k++){let best=-1,score=-Infinity;for(let i=0;i<n;i++){if(mins[i]>=cap)continue;const s=expected[i]-mins[i]+rand()*.001;if(s>score){score=s;best=i}}if(best<0)break;mins[best]++}
  return mins;
}
function allocPoints(players,minutes,target,rand){
  if(!players.length)return[];target=Math.max(0,Math.round(Number(target)||0));const weights=players.map((p,i)=>Math.max(.1,(minutes[i]||1)*(.65+(Number(p.shooting)||Number(p.finishing)||Number(p.overall)||65)/100))),sum=weights.reduce((a,b)=>a+b,0),pts=weights.map(w=>Math.floor(target*w/sum));let left=target-pts.reduce((a,b)=>a+b,0);
  while(left-->0){let pick=Math.floor(rand()*players.length);if(!Number.isFinite(pick))pick=0;pts[pick]++}return pts;
}
function shootingLine(points,rand){
  const q=Math.max(0,Math.round(points));let th=q>=3?Math.floor(rand()*(Math.min(4,Math.floor(q/3))+1)):0;let rem=q-th*3,ft=rem%2,tw=(rem-ft)/2;
  while(tw>0&&rand()<.23){tw--;ft+=2}
  const fg=tw+th,miss2=Math.floor(rand()*Math.max(2,Math.min(7,tw+3))),miss3=Math.floor(rand()*Math.max(2,Math.min(6,th+3))),fga=fg+miss2+miss3,tha=th+miss3,fta=ft+(ft?Math.floor(rand()*3):Math.floor(rand()*2));
  return{fg,fa:fga,th,tha,ft,fta};
}
function playerLine(p,min,pts,rand){
  const s=shootingLine(pts,rand),ov=Number(p.overall)||65,rebSkill=Number(p.rebounding)||ov,passSkill=Number(p.passing)||ov,def=Number(p.defense)||ov;
  return{playerId:p.id??null,name:p.name||'Player',pos:p.pos||'',min,pts,reb:Math.max(0,Math.round(min/32*(1+rebSkill/15)+rand()*2)),ast:Math.max(0,Math.round(min/32*(passSkill/18)+rand()*2)),stl:Math.max(0,Math.floor(min/18*(def/70)+rand()*1.6)),blk:Math.max(0,Math.floor(min/20*((Number(p.rebounding)||def)/75)+rand()*1.4)),to:Math.max(0,Math.floor(min/14*rand()*1.6)),...s};
}
function sideTotals(players,score){
  const sum=k=>players.reduce((a,p)=>a+(Number(p[k])||0),0);
  return{score:Number(score)||0,min:sum('min'),pts:sum('pts'),reb:sum('reb'),ast:sum('ast'),stl:sum('stl'),blk:sum('blk'),to:sum('to'),fg:sum('fg'),fa:sum('fa'),th:sum('th'),tha:sum('tha'),ft:sum('ft'),fta:sum('fta')};
}
function generateSide(teamObj,score,seed,userSide){
  const rand=rngFor(seed),players=rotation(teamObj,userSide);if(!players.length)return{name:teamObj?.name||'Opponent',score:Number(score)||0,players:[],totals:{score:Number(score)||0}};
  const mins=allocMinutes(players,rand),pts=allocPoints(players,mins,score,rand),lines=players.map((p,i)=>playerLine(p,mins[i],pts[i],rand));return{name:teamObj?.name||'Opponent',score:Number(score)||0,players:lines,totals:sideTotals(lines,score)};
}
function ensureBox(g){
  if(!current||!g?.played||!Number.isFinite(Number(g.myScore))||!Number.isFinite(Number(g.oppScore)))return null;
  if(Number(g.boxScore?.version)>=VERSION&&Array.isArray(g.boxScore?.team?.players))return g.boxScore;
  const me=resolveTeam(current.schoolId),opp=resolveOpponent(g),seed=`${current.id||'save'}|${current.season}|${g.id}|${g.date}|${g.myScore}|${g.oppScore}`;
  const home=generateSide(me,g.myScore,seed+'|team',true),away=generateSide(opp,g.oppScore,seed+'|opp',false);
  if(!away.name||away.name==='Opponent')away.name=g.opponentName||g.nationalOpponentName||'Opponent';
  g.boxScore={version:VERSION,generatedAt:new Date().toISOString(),team:home,opponent:away};current.gameStats=current.gameStats||{};current.gameStats[g.id]=g.boxScore;return g.boxScore;
}
function blankStats(){return{games:0,minutes:0,points:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fgm:0,fga:0,threeMade:0,threeAtt:0,ftm:0,fta:0}}
function rebuildSeasonStats(save=current){
  if(!save)return false;const me=(save.teams||[]).find(t=>eq(t.id,save.schoolId));if(!me)return false;
  for(const p of me.roster||[])p.stats=blankStats();
  for(const g of (save.schedule||[]).filter(x=>x.played).sort((a,b)=>new Date(a.date)-new Date(b.date))){const b=ensureBox(g);if(!b)continue;for(const line of b.team.players||[]){const p=(me.roster||[]).find(x=>(line.playerId!=null&&eq(x.id,line.playerId))||String(x.name)===String(line.name));if(!p)continue;const s=p.stats||blankStats();s.games++;s.minutes+=line.min||0;s.points+=line.pts||0;s.rebounds+=line.reb||0;s.assists+=line.ast||0;s.steals+=line.stl||0;s.blocks+=line.blk||0;s.turnovers+=line.to||0;s.fgm+=line.fg||0;s.fga+=line.fa||0;s.threeMade+=line.th||0;s.threeAtt+=line.tha||0;s.ftm+=line.ft||0;s.fta+=line.fta||0;p.stats=s}}
  save.v2719=save.v2719||{};save.v2719.statsVersion=VERSION;return true;
}
function statSignature(save=current){
  if(!save)return'';const games=(save.schedule||[]).filter(g=>g.played).map(g=>`${g.id}:${g.myScore}:${g.oppScore}:${g.boxScore?.version||0}`).join('|'),me=(save.teams||[]).find(t=>eq(t.id,save.schoolId)),roster=(me?.roster||[]).map(p=>p.id||p.name).join(',');return`${save.id}|${save.season}|${roster}|${games}`;
}
function syncStats(save=current,force=false){
  if(!save)return false;const before=statSignature(save);if(!force&&statsCache.get(String(save.id))===before)return false;let changed=false;
  for(const g of (save.schedule||[]).filter(x=>x.played)){if(Number(g.boxScore?.version)!==VERSION){ensureBox(g);changed=true}}
  rebuildSeasonStats(save);const after=statSignature(save);statsCache.set(String(save.id),after);return changed||before!==after;
}
function fmtPct(m,a){return a?`${(100*m/a).toFixed(1)}%`:'—'}
function playerTable(side){
  if(!side?.players?.length)return `<div class="card"><p class="muted">Individual roster data is unavailable for ${esc(side?.name||'this opponent')}. The final team score is still preserved.</p></div>`;
  const rows=side.players.map(p=>`<tr><td><b>${esc(p.name)}</b><small>${esc(p.pos||'')}</small></td><td>${p.min}</td><td>${p.pts}</td><td>${p.reb}</td><td>${p.ast}</td><td>${p.stl}</td><td>${p.blk}</td><td>${p.to}</td><td>${p.fg}-${p.fa}</td><td>${p.th}-${p.tha}</td><td>${p.ft}-${p.fta}</td></tr>`).join(''),t=side.totals||sideTotals(side.players,side.score);
  return `<div class="table-wrap"><table><thead><tr><th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3PT</th><th>FT</th></tr></thead><tbody>${rows}<tr><td><b>TEAM TOTAL</b></td><td>${t.min||0}</td><td><b>${side.score}</b></td><td>${t.reb||0}</td><td>${t.ast||0}</td><td>${t.stl||0}</td><td>${t.blk||0}</td><td>${t.to||0}</td><td>${t.fg||0}-${t.fa||0}</td><td>${t.th||0}-${t.tha||0}</td><td>${t.ft||0}-${t.fta||0}</td></tr></tbody></table></div>`;
}
function showBox(g){
  if(!g)return;const b=ensureBox(g);if(!b)return alert('This game does not have a completed score yet.');
  let d=$('v270Box');if(!d){d=document.createElement('dialog');d.id='v270Box';document.body.appendChild(d)}
  d.innerHTML=`<div class="modal-head"><div><p class="eyebrow">FINAL BOX SCORE • OFFICIAL GAME STATS</p><h2>${esc(b.team.name)} ${b.team.score} – ${b.opponent.score} ${esc(b.opponent.name)}</h2><p class="muted small">${new Date(g.date).toLocaleDateString()} • ${esc(g.roundName||g.type||'Game')}</p></div><button id="v270BoxClose" class="icon-btn" type="button">×</button></div><h3>${esc(b.team.name)}</h3>${playerTable(b.team)}<h3 style="margin-top:18px">${esc(b.opponent.name)}</h3>${playerTable(b.opponent)}`;
  d.querySelector('#v270BoxClose').onclick=()=>d.close();try{if(d.open)d.close();d.showModal()}catch{d.setAttribute('open','')}
}
function renderStatsPage(){
  if(!current)return;syncStats(current,true);let p=$('stats270Page');if(!p){p=document.createElement('section');p.id='stats270Page';p.className='page';document.querySelector('#game main')?.appendChild(p)}
  const me=resolveTeam(current.schoolId),players=(me?.roster||[]).slice().sort((a,b)=>((b.stats?.points||0)/(b.stats?.games||1))-((a.stats?.points||0)/(a.stats?.games||1))||Number(b.overall||0)-Number(a.overall||0)),games=(current.schedule||[]).filter(g=>g.played).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const playerRows=players.map(x=>{const s=x.stats||blankStats(),gp=s.games||0;return `<tr><td><b>${esc(x.name)}</b><small>${esc(x.pos||'')} • Grade ${esc(x.grade||'—')}</small></td><td>${gp}</td><td>${gp?(s.points/gp).toFixed(1):'0.0'}</td><td>${gp?(s.rebounds/gp).toFixed(1):'0.0'}</td><td>${gp?(s.assists/gp).toFixed(1):'0.0'}</td><td>${gp?(s.steals/gp).toFixed(1):'0.0'}</td><td>${gp?(s.blocks/gp).toFixed(1):'0.0'}</td><td>${fmtPct(s.fgm,s.fga)}</td><td>${fmtPct(s.threeMade,s.threeAtt)}</td><td>${fmtPct(s.ftm,s.fta)}</td></tr>`}).join('');
  const gameCards=games.map(g=>{const b=ensureBox(g),opp=b?.opponent?.name||resolveOpponent(g)?.name||'Opponent';return `<button class="card v270GameCard" data-v2719-box="${esc(g.id)}"><span><b>${g.myScore>g.oppScore?'W':'L'} ${g.myScore}-${g.oppScore} • ${esc(opp)}</b><small>${new Date(g.date).toLocaleDateString()} • ${esc(g.roundName||g.type||'Game')}</small></span><strong>BOX SCORE →</strong></button>`}).join('');
  p.innerHTML=`<div class="section-head"><div><p class="eyebrow">AUTHORITATIVE SEASON STATISTICS</p><h3>Player Stats & Box Scores</h3><p class="muted small">Season totals are calculated directly from each saved box score, so the numbers always match the games.</p></div><span class="tag">${games.length} GAME${games.length===1?'':'S'}</span></div><article class="card"><h3>Season Player Stats</h3><div class="table-wrap"><table><thead><tr><th>Player</th><th>GP</th><th>PPG</th><th>RPG</th><th>APG</th><th>SPG</th><th>BPG</th><th>FG%</th><th>3P%</th><th>FT%</th></tr></thead><tbody>${playerRows||'<tr><td colspan="10">No players available.</td></tr>'}</tbody></table></div></article><div class="section-head" style="margin-top:18px"><div><h3>Game Box Scores</h3><p class="muted small">Open any completed game to see the full stat line.</p></div></div><div class="stack">${gameCards||'<div class="card">Play a game to create stats.</div>'}</div>`;
  p.querySelectorAll('[data-v2719-box]').forEach(b=>b.onclick=()=>showBox((current.schedule||[]).find(g=>eq(g.id,b.dataset.v2719Box))));queuePersist();
}
function openStatsPage(){
  document.querySelectorAll('#game .page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('#game .nav,#stats270Nav,#coach270Nav').forEach(x=>x.classList.remove('active'));const nav=$('stats270Nav');nav?.classList.add('active');let p=$('stats270Page');if(!p){p=document.createElement('section');p.id='stats270Page';p.className='page';document.querySelector('#game main')?.appendChild(p)}p.classList.add('active');if($('pageTitle'))$('pageTitle').textContent='Game Stats';$('game')?.classList.remove('menu-open');renderStatsPage();
}
function wireStatUI(){
  const nav=$('stats270Nav');if(nav&&!nav.dataset.v2719){nav.dataset.v2719='1';nav.onclick=openStatsPage}
  const rows=[...document.querySelectorAll('#scheduleList .schedule-row')];rows.forEach((row,i)=>{const g=current?.schedule?.[i];if(!g?.played)return;let b=row.querySelector('.v270BoxBtn');if(!b){b=document.createElement('button');b.className='secondary small-btn v270BoxBtn';b.textContent='Stats';row.appendChild(b)}b.dataset.gameId=String(g.id);b.onclick=e=>{e.stopPropagation();showBox((current.schedule||[]).find(x=>eq(x.id,b.dataset.gameId)))}});
  if($('stats270Page')?.classList.contains('active'))renderStatsPage();
}
function prepare(save,force=false){const changed=normalizeDistrictSystem(save,force);const statsChanged=syncStats(save,force);if(changed||statsChanged)queuePersist();return changed||statsChanged}

// Make the official district-count helper available everywhere, including future UI modules.
window.BM27DistrictCountForClass=function(c){return districtLimit(c,typeof current!=='undefined'?current:null)};

try{
  const baseRenderAll=renderAll;renderAll=function(){if(current)prepare(current,false);const r=baseRenderAll.apply(this,arguments);if(current)syncStats(current,false);setTimeout(wireStatUI,0);return r};
}catch(e){console.warn('BM27 v2.7.19 render hook',e)}
try{
  const baseRenderSchedule=renderSchedule;renderSchedule=function(){const r=baseRenderSchedule.apply(this,arguments);setTimeout(wireStatUI,0);return r};
}catch(e){console.warn('BM27 v2.7.19 schedule hook',e)}
try{
  const baseOpenSave=openSave;openSave=function(id){try{const s=(typeof saves!=='undefined'?saves:[]).find(x=>eq(x.id,id));if(s)normalizeDistrictSystem(s,true)}catch{}const r=baseOpenSave.apply(this,arguments);if(current)prepare(current,true);setTimeout(wireStatUI,0);return r};
}catch(e){console.warn('BM27 v2.7.19 open hook',e)}
try{
  const baseNewCareer=newCareer;newCareer=function(){const s=baseNewCareer.apply(this,arguments);if(s){normalizeDistrictSystem(s,true);syncStats(s,true)}return s};
}catch(e){console.warn('BM27 v2.7.19 new career hook',e)}
try{
  const baseSim=simulateGame;simulateGame=function(g){if(current)normalizeDistrictSystem(current,false);const r=baseSim.apply(this,arguments);if(current&&g?.played){syncStats(current,true);queuePersist();setTimeout(wireStatUI,0)}return r};
}catch(e){console.warn('BM27 v2.7.19 game hook',e)}
try{
  if(typeof applyOffseason==='function'){const baseOffseason=applyOffseason;applyOffseason=function(){const r=baseOffseason.apply(this,arguments);if(current){normalizeDistrictSystem(current,true);syncStats(current,true);queuePersist()}return r}}
}catch(e){console.warn('BM27 v2.7.19 offseason hook',e)}

function install(){
  if(window.__BM27_V2719__)return;window.__BM27_V2719__=true;
  if(typeof current!=='undefined'&&current)prepare(current,true);
  wireStatUI();
  const list=$('scheduleList');if(list)new MutationObserver(()=>requestAnimationFrame(wireStatUI)).observe(list,{childList:true,subtree:true});
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    const box=$('updatesContent');if(!box||box.querySelector('[data-v2719-notes]'))return;
    box.insertAdjacentHTML('afterbegin','<article class="card" data-v2719-notes><p class="eyebrow">BM27 v2.7.19</p><h3>Official Districts + Stats / Box Score Repair</h3><ul class="update-list"><li>Classes 1–4 now use Districts 1–16.</li><li>Classes 5–6 are permanently locked to Districts 1–8.</li><li>Existing active saves repair invalid district assignments and rebuild an incorrect active postseason structure.</li><li>Player season stats now come directly from saved game box scores, so totals and box scores match.</li><li>Every completed user game receives a persistent box score, including tournament, postseason, and national games.</li><li>Game Stats now shows season player averages plus every completed game box score.</li></ul></article>');
  },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V2719={version:VERSION,districtLimit,normalizeDistrictSystem,ensureBox,rebuildSeasonStats,showBox,renderStatsPage,syncStats};
})();
