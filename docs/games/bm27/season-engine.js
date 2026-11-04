/* MSHSAA Basketball Manager 27 — Season Engine 1.4.2
   One authoritative game ledger for regular season + all tournaments.
   Loaded after app.js/cloud.js so it replaces older season/tournament code paths.
*/
(()=>{
  'use strict';
  const VERSION=1433;
  const REGULAR='Regular Season';
  const eq=(a,b)=>String(a)===String(b);
  const team=id=>current?.teams?.find(t=>eq(t.id,id));
  const nowIso=()=>new Date().toISOString();
  const copy=o=>JSON.parse(JSON.stringify(o));
  const dateAdd=(iso,days)=>{const d=new Date(iso);d.setDate(d.getDate()+days);return d.toISOString()};
  const pow2=n=>{let p=1;while(p<n)p*=2;return p};
  const roundNames=size=>{const n=Math.log2(size),out=[];for(let i=0;i<n;i++){const left=size/(2**i);out.push(left===32?'Round of 32':left===16?'Sweet 16':left===8?'Quarterfinal':left===4?'Semifinal':left===2?'Championship':`Round ${i+1}`)}return out};
  const seededOrder=ids=>ids.slice().sort((a,b)=>{const A=team(a),B=team(b);return ((B?.wins||0)-(A?.wins||0))||((B?.rating||0)-(A?.rating||0))||String(A?.name||'').localeCompare(String(B?.name||''))});
  const scorePair=(a,b,homeA=false)=>{const ar=Number(a?.rating)||70,br=Number(b?.rating)||70;const edge=(ar-br)*.36+(homeA?2:0);let s1=Math.round(62+ar*.16+edge+(Math.random()-.5)*18),s2=Math.round(62+br*.16-edge*.45+(Math.random()-.5)*18);s1=Math.max(35,s1);s2=Math.max(35,s2);if(s1===s2)s1++;return[s1,s2]};

  function state(save=current){
    if(!save)return null;
    save.seasonEngine=save.seasonEngine||{version:VERSION,season:Number(save.season)||2026,games:[],postseason:{classNo:null,districtsCreated:false,stateCreated:false},migratedAt:nowIso()};
    save.seasonEngine.version=VERSION;
    if(!Number.isFinite(Number(save.seasonEngine.season)))save.seasonEngine.season=Number(save.season)||2026;
    save.seasonEngine.games=Array.isArray(save.seasonEngine.games)?save.seasonEngine.games:[];
    save.seasonEngine.postseason=save.seasonEngine.postseason||{};
    return save.seasonEngine;
  }
  function gameById(id,save=current){return state(save)?.games.find(g=>eq(g.id,id))}
  function addGame(data,save=current){const s=state(save);if(!s)throw new Error('Season engine has no active career save.');const existing=data.id&&s.games.find(g=>eq(g.id,data.id));if(existing){Object.assign(existing,data);return existing}const g={id:data.id||uid(),season:Number(save?.season)||Number(current?.season)||2026,status:'scheduled',score1:null,score2:null,winnerId:null,...data};s.games.push(g);return g}
  function removeGame(id,save=current){const s=state(save);if(!s)return;s.games=s.games.filter(g=>!eq(g.id,id))}
  function completeGame(g,s1,s2){if(!g||g.status==='final')return g;g.status='final';g.played=true;g.score1=Number(s1);g.score2=Number(s2);g.winnerId=g.score1>g.score2?g.team1Id:g.team2Id;return g}
  function gameIncludes(g,id){return eq(g.team1Id,id)||eq(g.team2Id,id)}
  function userScores(g){if(!g||g.status!=='final')return null;return eq(g.team1Id,current.schoolId)?{my:g.score1,opp:g.score2}:{my:g.score2,opp:g.score1}}

  function isPostseasonType(type=''){return type==='District Tournament'||type==='State Tournament'}
  function isTournamentType(type=''){return isPostseasonType(type)||/Tournament$/i.test(type)||type==='Tournament'}

  function syncVisibleSchedule(save=current){
    if(!save)return;
    const eng=state(save),validTournamentIds=new Set((save.tournaments||[]).map(t=>String(t.id)));
    // Drop unplayed deleted custom-tournament games from authoritative ledger.
    eng.games=eng.games.filter(g=>!(g.tournamentId&&!validTournamentIds.has(String(g.tournamentId))&&g.status!=='final'));
    for(const sg of save.schedule||[]){
      if(!sg.opponentId)continue;
      let eg=sg.engineGameId?eng.games.find(g=>eq(g.id,sg.engineGameId)):null;
      if(!eg){
        eg=addGame({team1Id:save.schoolId,team2Id:sg.opponentId,date:sg.date,type:sg.type||REGULAR,userVisible:true,tournamentId:sg.tournamentId||null,tournamentMatchId:sg.tournamentMatchId||null,roundIndex:sg.tournamentRound??null,roundName:sg.roundName||null},save);
        sg.engineGameId=eg.id;
      }
      Object.assign(eg,{team1Id:save.schoolId,team2Id:sg.opponentId,date:sg.date,type:sg.type||REGULAR,userVisible:true,tournamentId:sg.tournamentId||null,tournamentMatchId:sg.tournamentMatchId||null,roundIndex:sg.tournamentRound??null,roundName:sg.roundName||null});
      if(sg.played&&Number.isFinite(+sg.myScore)&&Number.isFinite(+sg.oppScore))completeGame(eg,+sg.myScore,+sg.oppScore);
      if(eg.status==='final'){
        const sc=userScores(eg);sg.played=true;sg.myScore=sc.my;sg.oppScore=sc.opp;
      }
    }
  }

  function circlePairs(ids){
    let arr=ids.slice();if(arr.length%2)arr.push(null);const rounds=[];
    for(let r=0;r<arr.length-1;r++){
      const pairs=[];for(let i=0;i<arr.length/2;i++){const a=arr[i],b=arr[arr.length-1-i];if(a&&b)pairs.push([a,b])}rounds.push(pairs);arr=[arr[0],arr[arr.length-1],...arr.slice(1,-1)];
    }return rounds;
  }
  function buildAiRegularSchedules(save=current,force=false){
    if(!save)return;const eng=state(save);syncVisibleSchedule(save);
    if(force)eng.games=eng.games.filter(g=>g.status==='final'||g.userVisible||isTournamentType(g.type));
    const existing=eng.games.filter(g=>g.type===REGULAR&&!g.userVisible&&!g.tournamentId);
    if(existing.length&&!force)return;
    const byClass=new Map();for(const t of save.teams||[]){if(eq(t.id,save.schoolId))continue;const c=String(t.class||'6');if(!byClass.has(c))byClass.set(c,[]);byClass.get(c).push(t.id)}
    let classOffset=0;
    for(const ids of byClass.values()){
      if(ids.length<2)continue;const rounds=circlePairs(ids);const counts=Object.fromEntries(ids.map(id=>[id,0]));let ri=0,safety=0;
      while(ids.some(id=>counts[id]<20)&&safety++<200){const pairs=rounds[ri%rounds.length];const base=new Date(`${save.season||2026}-11-24T19:00:00`);base.setDate(base.getDate()+classOffset+(ri*3));for(const [a,b] of pairs){if(counts[a]>=20&&counts[b]>=20)continue;const d=new Date(base);d.setHours(18+(ri%2));const g=addGame({team1Id:a,team2Id:b,date:d.toISOString(),type:REGULAR,userVisible:false},save);counts[a]++;counts[b]++;}ri++}
      classOffset++;
    }
  }

  function rebuildRecords(){
    if(!current)return;syncVisibleSchedule(current);const activeSeason=Number(current.season)||2026;for(const t of current.teams||[]){t.wins=0;t.losses=0;t.pf=0;t.pa=0}
    for(const g of state().games){if(Number(g.season||activeSeason)!==activeSeason)continue;if(g.status!=='final'||!g.team1Id||!g.team2Id)continue;const a=team(g.team1Id),b=team(g.team2Id);if(!a||!b)continue;a.pf+=g.score1;a.pa+=g.score2;b.pf+=g.score2;b.pa+=g.score1;if(g.score1>g.score2){a.wins++;b.losses++}else{b.wins++;a.losses++}}
    const me=team(current.schoolId);current.history=current.history||{};current.history.wins=me?.wins||0;current.history.losses=me?.losses||0;
  }

  function simulateAiGame(g){if(!g||g.status==='final'||gameIncludes(g,current.schoolId))return;const a=team(g.team1Id),b=team(g.team2Id);if(!a||!b)return;const [s1,s2]=scorePair(a,b,false);completeGame(g,s1,s2)}
  function simulateAiUntil(iso,{classNo=null,all=false}={}){const cutoff=new Date(iso).getTime();for(const g of state().games){if(g.status==='final'||gameIncludes(g,current.schoolId)||isTournamentType(g.type))continue;if(classNo!=null&&!eq(team(g.team1Id)?.class,classNo))continue;if(!all&&new Date(g.date).getTime()>cutoff)continue;simulateAiGame(g)}}

  function bracketRoundMatches(ids,date,roundIndex){const out=[];for(let i=0;i<ids.length;i+=2)out.push({id:uid(),team1Id:ids[i]||null,team2Id:ids[i+1]||null,date,roundIndex,status:'scheduled',score1:null,score2:null,winnerId:null});return out}
  function createBracket({name,type,entrants,startDate,classNo=null,districtNo=null,automatic=false}){
    const unique=[...new Set((entrants||[]).map(x=>typeof x==='object'?x.id:x).filter(Boolean).map(String))];if(!unique.length)return null;
    const size=pow2(Math.max(2,unique.length)),ordered=seededOrder(unique),seeded=[];
    // v2.7.42+: highest seeds receive first-round byes whenever the field is not a power of two.
    const byes=Math.max(0,size-ordered.length),pairs=size/2;let idx=0;
    for(let pair=0;pair<pairs;pair++){
      if(pair<byes){seeded.push(ordered[idx++]||null,null)}
      else{seeded.push(ordered[idx++]||null,ordered[idx++]||null)}
    }
    const names=roundNames(size),rounds=names.map((n,i)=>({name:n,date:dateAdd(startDate,i*2),matches:i===0?bracketRoundMatches(seeded,dateAdd(startDate,i*2),i):[]}));
    const t={id:uid(),engineVersion:VERSION,name,type,kind:type,size,automatic,classNo,districtNo,status:'Scheduled',teams:unique,rounds,championId:null,createdAt:nowIso()};current.tournaments=current.tournaments||[];current.tournaments.push(t);return t;
  }
  function tournamentById(id){return (current.tournaments||[]).find(t=>eq(t.id,id))}
  function scheduleUserMatch(t,m,ri){
    if(!m||m.status==='final'||(!eq(m.team1Id,current.schoolId)&&!eq(m.team2Id,current.schoolId)))return false;const opp=eq(m.team1Id,current.schoolId)?m.team2Id:m.team1Id;if(!opp)return false;
    let sg=current.schedule.find(g=>eq(g.tournamentMatchId,m.id));if(!sg){sg={id:uid(),opponentId:opp,date:m.date,home:false,neutral:true,played:false,type:t.type,tournamentId:t.id,tournamentMatchId:m.id,tournamentRound:ri,roundName:t.rounds[ri].name};current.schedule.push(sg)}else Object.assign(sg,{opponentId:opp,date:m.date,tbd:false,type:t.type,tournamentId:t.id,tournamentRound:ri,roundName:t.rounds[ri].name});
    current.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));syncVisibleSchedule(current);t.status=`${t.rounds[ri].name}: your game is ready`;return true;
  }
  function completeBracketMatch(t,m,ri,userResult=null){
    if(!m||m.status==='final')return m?.winnerId||null;
    if(!m.team1Id||!m.team2Id){m.status='final';m.winnerId=m.team1Id||m.team2Id;m.score1=m.score2=null;return m.winnerId}
    const a=team(m.team1Id),b=team(m.team2Id);if(!a||!b)return null;let s1,s2;if(userResult){if(eq(m.team1Id,current.schoolId)){s1=userResult.my;s2=userResult.opp}else{s1=userResult.opp;s2=userResult.my}}else[s1,s2]=scorePair(a,b,false);
    m.status='final';m.score1=+s1;m.score2=+s2;m.winnerId=s1>s2?m.team1Id:m.team2Id;
    const eg=addGame({team1Id:m.team1Id,team2Id:m.team2Id,date:m.date,type:t.type,tournamentId:t.id,tournamentMatchId:m.id,roundIndex:ri,roundName:t.rounds[ri].name,userVisible:gameIncludes(m,current.schoolId)});completeGame(eg,s1,s2);
    return m.winnerId;
  }
  function recordChampionship(t){
    if(!t?.championId||!eq(t.championId,current.schoolId)||t.historyRecorded)return;
    current.history=current.history||{seasons:[],titles:0,districtTitles:0,wins:0,losses:0};
    current.history.districtTitles=Number(current.history.districtTitles)||0;
    current.history.titles=Number(current.history.titles)||0;
    if(t.type==='District Tournament'){window.BM27RC252?.award?.('district','district-'+String(current.id)+'-'+String(current.season)+'-'+String(t.id));current.history.districtTitles++;current.news=current.news||[];current.news.unshift({date:current.day,text:`${team(current.schoolId)?.name||'Your school'} won the Class ${t.classNo} District ${t.districtNo} championship.`})}
    if(t.type==='State Tournament'){window.BM27RC252?.award?.('state','state-'+String(current.id)+'-'+String(current.season)+'-'+String(t.id));current.history.titles++;current.news=current.news||[];current.news.unshift({date:current.day,text:`${team(current.schoolId)?.name||'Your school'} won the Class ${t.classNo} state championship.`})}
    t.historyRecorded=true;
  }
  function makeNextRound(t,ri){const r=t.rounds[ri],next=t.rounds[ri+1];if(!r||r.matches.some(m=>m.status!=='final'))return false;if(!next){t.championId=r.matches[0]?.winnerId||null;t.status=t.championId?`${team(t.championId)?.name||'Unknown'} — Champion`:'Complete';recordChampionship(t);return true}if(!next.matches.length)next.matches=bracketRoundMatches(r.matches.map(m=>m.winnerId),next.date,ri+1);return true}
  function driveTournament(t){
    if(!t||t.championId)return;
    for(let ri=0;ri<t.rounds.length;ri++){
      const r=t.rounds[ri];if(!r.matches.length)return;
      for(const m of r.matches){if(m.status==='final')continue;if(!m.team1Id||!m.team2Id){completeBracketMatch(t,m,ri);continue}if(gameIncludes(m,current.schoolId)){scheduleUserMatch(t,m,ri);return}completeBracketMatch(t,m,ri)}
      if(r.matches.some(m=>m.status!=='final'))return;makeNextRound(t,ri);
    }
  }
  function processTournamentResult(sg){
    const t=tournamentById(sg.tournamentId);if(!t)return;
    // v2.7.9: custom tournaments must stay on the canonical placement engine.
    // The older Season path eliminated the user after a loss and deleted future
    // consolation/3rd-place schedule rows. Automatic districts/state still use
    // this Season engine, but custom tournaments delegate their result here.
    if(!t.automatic&&window.BM27TournamentEngine?.process){
      window.BM27TournamentEngine.process(sg);
      try{window.BM27V279Tournament?.syncTournamentToSeasonEngine?.(t)}catch(e){console.warn('v2.7.9 tournament ledger sync',e)}
      return;
    }
    const ri=Number(sg.tournamentRound)||0,r=t.rounds?.[ri];const m=r?.matches?.find(x=>eq(x.id,sg.tournamentMatchId));if(!m)return;
    completeBracketMatch(t,m,ri,{my:+sg.myScore,opp:+sg.oppScore});for(const other of r.matches)if(other.status!=='final')completeBracketMatch(t,other,ri);makeNextRound(t,ri);
    if(!eq(m.winnerId,current.schoolId)){current.schedule=current.schedule.filter(g=>!(eq(g.tournamentId,t.id)&&!g.played));while(!t.championId)driveTournament(t)}else driveTournament(t);
  }

  function regularUserGames(){return (current.schedule||[]).filter(g=>!g.tournamentId&&!isPostseasonType(g.type)&&g.type!=='summer'&&g.type!=='fall')}
  function userRegularComplete(){const gs=regularUserGames();return gs.length>0&&gs.every(g=>g.played)}
  function classTeams(c){return (current.teams||[]).filter(t=>eq(t.class,c))}
  function classRegularGames(c){return state().games.filter(g=>g.type===REGULAR&&eq(team(g.team1Id)?.class,c)&&eq(team(g.team2Id)?.class,c))}
  function classRegularComplete(c){return classRegularGames(c).every(g=>g.status==='final')}
  function postseasonFor(type,c){return (current.tournaments||[]).filter(t=>t.type===type&&eq(t.classNo,c))}
  function latestClassRegularDate(c){const ts=classRegularGames(c).map(g=>new Date(g.date).getTime()).filter(Number.isFinite);return new Date(ts.length?Math.max(...ts):new Date(current.day).getTime()).toISOString()}

  function activeMissouriClasses(){
    const configuredMax=Number(current?.v2?.classSystem?.maxClass)||6;
    const set=new Set();
    for(const t of current?.teams||[]){if(t?.outOfState||t?.nationalOnly)continue;const c=Number(t.class);if(Number.isFinite(c)&&c>=1&&c<=configuredMax)set.add(c)}
    for(let c=1;c<=configuredMax;c++)if((current?.teams||[]).some(t=>!t?.outOfState&&!t?.nationalOnly&&Number(t.class)===c))set.add(c);
    return [...set].sort((a,b)=>a-b);
  }
  function runClassPostseason(c,{isUserClass=false}={}){
    if(isUserClass){
      simulateAiUntil(current.day,{classNo:c,all:false});
      if(!userRegularComplete())return false;
    }
    // Once the user's regular season is complete, every other Missouri class finishes
    // its AI regular season too. This guarantees newly-created classes have real
    // district and state champions instead of existing only in the Classes screen.
    simulateAiUntil(current.day,{classNo:c,all:true});
    if(!classRegularComplete(c))return false;
    let districts=postseasonFor('District Tournament',c);
    if(!districts.length){
      const groups=new Map();
      for(const t of classTeams(c).filter(t=>!t.outOfState&&!t.nationalOnly)){
        const d=String(t.district||1);if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t.id)
      }
      const start=dateAdd(latestClassRegularDate(c),3);
      for(const [d,ids] of [...groups.entries()].sort((a,b)=>Number(a[0])-Number(b[0])))if(ids.length)createBracket({name:`Class ${c} District ${d} Tournament`,type:'District Tournament',entrants:ids,startDate:start,classNo:c,districtNo:d,automatic:true});
      districts=postseasonFor('District Tournament',c);
    }
    for(const d of districts)driveTournament(d);
    if(districts.length&&districts.every(t=>t.championId)){
      let st=postseasonFor('State Tournament',c)[0];
      if(!st){
        const champs=districts.map(t=>t.championId).filter(Boolean);
        const last=Math.max(...districts.map(t=>new Date(t.rounds.at(-1)?.date||current.day).getTime()));
        st=createBracket({name:`MSHSAA Class ${c} State Tournament`,type:'State Tournament',entrants:champs,startDate:dateAdd(new Date(last).toISOString(),3),classNo:c,automatic:true});
      }
      if(st)driveTournament(st);
    }
    return true;
  }
  function runPostseason(){
    if(!current)return;buildAiRegularSchedules(current,false);syncVisibleSchedule(current);rebuildRecords();
    const userClass=Number(team(current.schoolId)?.class);if(!Number.isFinite(userClass))return;
    // Do not launch statewide postseason before the player finishes the regular season.
    simulateAiUntil(current.day,{classNo:userClass,all:false});
    if(!userRegularComplete()){rebuildRecords();return}
    for(const c of activeMissouriClasses())runClassPostseason(c,{isUserClass:c===userClass});
    rebuildRecords();
  }

  function bracketHTML(t){return `<div class="full-bracket">${(t.rounds||[]).map(r=>`<section class="bracket-stage"><small>${r.name}</small>${(r.matches||[]).map(m=>`<div class="bracket-match ${m.status==='final'?'played':''}"><span>${team(m.team1Id)?.name||'BYE / TBD'}${m.status==='final'&&m.team1Id&&m.score1!=null?` <b>${m.score1}</b>`:''}</span><span>${team(m.team2Id)?.name||'BYE / TBD'}${m.status==='final'&&m.team2Id&&m.score2!=null?` <b>${m.score2}</b>`:''}</span>${m.winnerId?`<em>Winner: ${team(m.winnerId)?.name||'TBD'}</em>`:''}</div>`).join('')||'<div class="bracket-match"><span>TBD</span><span>TBD</span></div>'}</section>`).join('<div class="bracket-arrow">→</div>')}</div>`}
  function renderTournamentCenterNew(){
    if(!current)return;const status=$('tournamentHubStatus'),list=$('tournamentHubList');if(status){const c=team(current.schoolId)?.class,ugs=regularUserGames(),ds=postseasonFor('District Tournament',c),st=postseasonFor('State Tournament',c)[0];let msg=!userRegularComplete()?`Regular season: ${ugs.filter(g=>g.played).length}/${ugs.length} completed.`:!ds.length?'All class regular-season games are being completed; districts will start automatically.':ds.some(t=>!t.championId)?`Districts: ${ds.filter(t=>t.championId).length}/${ds.length} champions decided.`:!st?'Districts complete; state bracket is being created.':!st.championId?'State tournament in progress.':`Season complete — ${team(st.championId)?.name||'Unknown'} is the Class ${c} champion.`;status.innerHTML=`<div class="row"><div><b>Automatic Missouri postseason</b><br><small>${msg}</small></div><span class="tag">Engine ${VERSION}</span></div>`}
    if(list){const ts=current.tournaments||[];list.innerHTML=ts.length?ts.map(t=>`<article class="card tournament-card"><div class="section-head"><div><p class="eyebrow">${t.type||'Tournament'} • ${t.size}-TEAM BRACKET</p><h3>${t.name}</h3></div><span class="tag">${t.status||'Scheduled'}</span></div>${bracketHTML(t)}${!t.automatic&&scheduleEditable()?`<button class="secondary wide" data-engine-remove-tournament="${t.id}">Remove Tournament</button>`:''}</article>`).join(''):'<article class="card"><h3>No tournaments yet</h3><p class="muted">Custom tournaments can be added before the season. Districts and state happen automatically.</p></article>';list.querySelectorAll('[data-engine-remove-tournament]').forEach(b=>b.onclick=()=>{const id=b.dataset.engineRemoveTournament;current.tournaments=current.tournaments.filter(t=>!eq(t.id,id));current.schedule=current.schedule.filter(g=>!eq(g.tournamentId,id));state().games=state().games.filter(g=>!eq(g.tournamentId,id));persist();renderAll()})}
  }

  function createCustomTournament(name,size,start,preset,chosenIds){
    const wanted=[4,8,16,32].includes(Number(size))?Number(size):8;const ids=(chosenIds||[]).map(String);if(ids.length!==wanted-1)throw new Error(`Choose exactly ${wanted-1} other schools.`);const rounds=Math.log2(wanted);const regularCount=(current.schedule||[]).filter(g=>!g.tournamentId).length;const customSlots=(current.schedule||[]).filter(g=>g.tournamentId&&!isPostseasonType(g.type)).length;if(regularCount+customSlots+rounds>26)throw new Error(`This tournament needs ${rounds} possible games and would exceed the 26-game limit.`);
    const entrants=[String(current.schoolId),...ids];if(new Set(entrants).size!==wanted)throw new Error('Tournament teams must be unique.');for(const id of entrants)if(!team(id))throw new Error('A selected tournament school is missing from this save.');const type=preset==='holiday'?'Holiday Tournament':preset==='showme'?'Show-Me Tournament':'Custom Tournament';const t=createBracket({name:name||'Custom Tournament',type,entrants,startDate:new Date(`${start}T18:00:00`).toISOString(),automatic:false});driveTournament(t);persist();renderAll();return t;
  }

  function enforceSeniorNight(g){if(typeof seniorNightReady==='function'&&!seniorNightReady()){toast('Choose a home Senior Night game before playing the season.');return false}if(g?.seniorNight){const seniors=myTeam()?.roster?.filter(p=>Number(p.grade)===12&&(!window.BM27Academics2716||window.BM27Academics2716.isEligible(p)))||[];myTeam().roster.forEach(p=>p.seniorNightStarter=false);seniors.forEach(p=>{p.seniorNightStarter=true;p.minutes=Math.max(Number(p.minutes)||0,24)});current.news=current.news||[];current.news.unshift({date:g.date,text:`Senior Night: ${seniors.map(p=>p.name).join(', ')} started and were honored before the game.`})}return true}
  function simulateUserGame(g,options={}){
    const silent=!!options?.silent;
    if(!current||!g||g.played)return;
    if(window.BM27Academics2716&&!window.BM27Academics2716.beforeGame(g))return;
    // Nationals must bypass Missouri-only opponent lookup. This private engine path is used
    // by Play Next/advance and previously caused the lingering 'Opponent could not be found' bug.
    if(g?.nationalMatchId&&window.BM27SimulateNationalScheduleGame){return window.BM27SimulateNationalScheduleGame(g);}
    if(!enforceSeniorNight(g))return;if(g.tbd&&!g.opponentId)return toast('This tournament matchup is waiting for the previous bracket round.');syncVisibleSchedule(current);const me=team(current.schoolId),opp=team(g.opponentId)||(window.BM27ResolveNationalTeam?window.BM27ResolveNationalTeam(g?.opponentId||g?.nationalOpponentId):null);if(!opp)return toast('Opponent could not be found.');const [my,os]=scorePair(me,opp,!!g.home);g.played=true;g.myScore=my;g.oppScore=os;current.day=g.date;
    let eg=g.engineGameId?gameById(g.engineGameId):null;if(!eg){eg=addGame({team1Id:current.schoolId,team2Id:g.opponentId,date:g.date,type:g.type||REGULAR,userVisible:true,tournamentId:g.tournamentId||null,tournamentMatchId:g.tournamentMatchId||null,roundIndex:g.tournamentRound??null,roundName:g.roundName||null});g.engineGameId=eg.id}completeGame(eg,my,os);
    if(g.tournamentId)processTournamentResult(g);
    simulateAiUntil(g.date,{classNo:team(current.schoolId)?.class,all:false});if(typeof processRecruitingAfterGame==='function')try{processRecruitingAfterGame(g)}catch(e){console.warn('Recruiting postgame skipped',e)}
    for(const p of myTeam()?.roster||[]){if(window.BM27Academics2716&&!window.BM27Academics2716.isEligible(p))continue;if((Number(p.minutes)||0)<=0)continue;p.stats=p.stats||{games:0,points:0,rebounds:0,assists:0};p.stats.games++;p.stats.points+=Math.max(0,Math.round((p.minutes||0)/3+Math.random()*8));p.stats.rebounds+=Math.round(Math.random()*6);p.stats.assists+=Math.round(Math.random()*5)}
    current.news=current.news||[];current.news.unshift({date:g.date,text:my>os?`${me.name} defeated ${opp.name}, ${my}-${os}.`:`${me.name} fell to ${opp.name}, ${my}-${os}.`});runPostseason();rebuildRecords();
    if(!silent){
      if($('gameResult'))$('gameResult').innerHTML=`<div class="scoreboard"><p class="eyebrow">FINAL</p><h2>${my>os?'Victory':'Defeat'}</h2><div class="scoreline"><div>${me.name}</div><b>${my}</b><span>–</span><b>${os}</b><div>${opp.name}</div></div></div>`;
      try{$('gameDialog')?.showModal()}catch{}
      renderAll();persist();window.cloudGame?.forceSave?.(current).catch(e=>{console.error(e);toast('Saved in the game, but cloud sync failed.')});
    }
    return {played:true,myScore:my,oppScore:os,game:g};
  }

  function advanceEngine(days=1){
    if(!current)return;const count=Math.max(0,Math.floor(Number(days)||0));
    for(let i=0;i<count;i++){
      const d=new Date(current.day);d.setDate(d.getDate()+1);current.day=d.toISOString();
      if(typeof develop==='function')develop();
      simulateAiUntil(current.day,{classNo:team(current.schoolId)?.class,all:false});
      if(window.BM27V2732?.processOwnedDay){
        try{window.BM27V2732.processOwnedDay(current,{reason:'season-engine-day',skipRender:true})}catch(e){console.warn('BM27 owned-team day resolver',e)}
      }else{
        const due=(current.schedule||[]).find(g=>!g.played&&new Date(g.date)<=d);if(due)simulateUserGame(due);
      }
    }
    runPostseason();renderAll();
  }

  function migrate(save=current,{reset=false}={}){
    if(!save)return;
    if(typeof dedupeCareerSchools==='function')dedupeCareerSchools(save);
    save.history=save.history||{seasons:[],titles:0,districtTitles:0,wins:0,losses:0};
    save.history.districtTitles=Number(save.history.districtTitles)||0;
    const activeSeason=Number(save.season)||2026;
    const engineSeason=Number(save.seasonEngine?.season);
    const seasonChanged=Number.isFinite(engineSeason)&&engineSeason!==activeSeason;
    if(reset||save.seasonEngine?.version!==VERSION||seasonChanged){
      const finals=[];
      for(const sg of save.schedule||[]){
        if(sg.played&&sg.opponentId&&Number.isFinite(+sg.myScore)&&Number.isFinite(+sg.oppScore)){
          const engineId=sg.engineGameId||uid();
          sg.engineGameId=engineId;
          finals.push({id:engineId,season:activeSeason,team1Id:save.schoolId,team2Id:sg.opponentId,date:sg.date,type:sg.type||REGULAR,userVisible:true,tournamentId:sg.tournamentId||null,tournamentMatchId:sg.tournamentMatchId||null,roundIndex:sg.tournamentRound??null,roundName:sg.roundName||null,status:'final',played:true,score1:+sg.myScore,score2:+sg.oppScore,winnerId:+sg.myScore>+sg.oppScore?save.schoolId:sg.opponentId})
        }
      }
      save.seasonEngine={version:VERSION,season:activeSeason,games:finals,postseason:{},migratedAt:nowIso()};
      save.tournaments=(save.tournaments||[]).filter(t=>!isPostseasonType(t.type||t.kind));for(const t of save.tournaments)t.engineVersion=VERSION;
      save.schedule=(save.schedule||[]).filter(g=>!isPostseasonType(g.type)&&(!g.tournamentId||save.tournaments.some(t=>eq(t.id,g.tournamentId))));
    }else{
      const eng=state(save);eng.season=activeSeason;
      for(const g of eng.games)if(!Number.isFinite(Number(g.season)))g.season=activeSeason;
    }
    buildAiRegularSchedules(save,false);syncVisibleSchedule(save);
  }


  // Replace old runtime paths with one engine.
  repairRecords=rebuildRecords;
  simulateGame=simulateUserGame;
  advance=advanceEngine;
  createTournament=createCustomTournament;
  renderTournamentCenter=renderTournamentCenterNew;
  renderTournaments=renderTournamentCenterNew;
  updateTournamentAfterGame=processTournamentResult;
  window.checkAutomaticPostseason=runPostseason;
  window.BM27SeasonEngine={version:VERSION,migrate,rebuildRecords,runPostseason,runClassPostseason,activeMissouriClasses,simulateAiUntil,simulateUserGame,createBracket,driveTournament,state};

  const baseRenderAll=renderAll;
  renderAll=function(){if(current){migrate(current);rebuildRecords();runPostseason();rebuildRecords()}return baseRenderAll()};
  const baseRenderSchedule=renderSchedule;
  renderSchedule=function(){if(current)syncVisibleSchedule(current);return baseRenderSchedule()};
  const baseOpenSave=openSave;
  openSave=function(id){baseOpenSave(id);if(current){migrate(current);runPostseason();rebuildRecords();persist();baseRenderAll()}};
  const baseNewCareer=newCareer;
  newCareer=function(...args){const s=baseNewCareer(...args);migrate(s,{reset:true});return s};
  const baseAi=aiMakeSchedule;
  aiMakeSchedule=function(){baseAi();if(current){migrate(current,{reset:true});persist();renderAll()}};
  const baseOffseason=typeof applyOffseason==='function'?applyOffseason:null;
  if(baseOffseason)applyOffseason=function(){const result=baseOffseason();if(current){current.seasonEngine=null;current.tournaments=[];migrate(current,{reset:true});persist();renderAll()}return result};
  const play=$('playNextBtn');if(play)play.onclick=()=>{const g=nextUnplayed();if(g)simulateUserGame(g)};
  const adv=$('advanceBtn');if(adv)adv.onclick=()=>advanceEngine(1);const week=$('simWeekBtn');if(week)week.onclick=()=>advanceEngine(7);
  if(current){migrate(current);runPostseason();rebuildRecords()}
})();
