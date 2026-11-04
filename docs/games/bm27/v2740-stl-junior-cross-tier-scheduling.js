/* BM27 v2.7.40 — St. Louis Junior Programs + Cross-Tier Scheduling
   Adds St. Louis-area school-based junior-program opponents to the v2.7.39 junior circuit.
   Junior A/B/C/etc teams may schedule sibling teams in the same program and any letter tier from another program.
   School-program names below are BM27 feeder-simulation labels; they are not claims of official program branding.
*/
(()=>{'use strict';
const VERSION='2.7.40';
const GRADES=[3,4,5,6,7,8];
const LETTERS='ABCDEFGH'.split('');
const $=id=>typeof document!=='undefined'?document.getElementById(id):null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dayKey=v=>String(v||'').slice(0,10);
const eq=(a,b)=>String(a)===String(b);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STL_JUNIOR_PROGRAMS=[
  ['marquette-junior','Marquette Junior Mustangs',83],
  ['lafayette-junior','Lafayette Junior Program',82],
  ['eureka-junior','Eureka Junior Program',80],
  ['rockwood-summit-junior','Rockwood Summit Junior Program',79],
  ['parkway-west-junior','Parkway West Junior Program',80],
  ['parkway-central-junior','Parkway Central Junior Program',78],
  ['parkway-south-junior','Parkway South Junior Program',79],
  ['parkway-north-junior','Parkway North Junior Program',78],
  ['kirkwood-junior','Kirkwood Junior Program',82],
  ['webster-groves-junior','Webster Groves Junior Program',81],
  ['lindbergh-junior','Lindbergh Junior Program',79],
  ['ladue-junior','Ladue Junior Program',79],
  ['clayton-junior','Clayton Junior Program',76],
  ['desmet-junior','De Smet Junior Program',84],
  ['chaminade-junior','Chaminade Junior Program',85],
  ['cbc-junior','CBC Junior Program',85],
  ['sluh-junior','SLUH Junior Program',84],
  ['vianney-junior','Vianney Junior Program',80],
  ['micds-junior','MICDS Junior Program',81],
  ['priory-junior','Priory Junior Program',78],
  ['francis-howell-junior','Francis Howell Junior Program',80],
  ['francis-howell-central-junior','Francis Howell Central Junior Program',79],
  ['francis-howell-north-junior','Francis Howell North Junior Program',77],
  ['ft-zumwalt-west-junior','Fort Zumwalt West Junior Program',80],
  ['ft-zumwalt-south-junior','Fort Zumwalt South Junior Program',78],
  ['st-dominic-junior','St. Dominic Junior Program',80]
].map(([id,name,rating])=>({id,name,rating,stlJuniorProgram:true}));
function save(){return typeof current!=='undefined'?current:null}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.40 persist',e);return false}}
function toastSafe(m){try{toast?.(m)}catch{}}
function uid(prefix='jr40'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`}
function gradeLabel(g){return `${g}${g===3?'rd':'th'} Grade`}
function me(s=save()){try{return myTeam?.()||(s?.teams||[]).find(t=>eq(t.id,s?.schoolId))}catch{return (s?.teams||[]).find(t=>eq(t.id,s?.schoolId))}}
function ownProgramName(s=save()){const t=me(s),name=String(t?.name||''),mascot=String(t?.mascot||'');if(/marquette/i.test(name)||/mustangs/i.test(mascot))return 'Marquette Junior Mustangs';return `${name||mascot||'Your School'} Junior Program`}
function ensure(s=save()){const api=window.BM27V2739;if(!s||!api?.ensure)return null;const v=api.ensure(s);v.v2740=v.v2740||{};v.v2740.version=VERSION;v.v2740.pendingResults=Array.isArray(v.v2740.pendingResults)?v.v2740.pendingResults:[];return v}
function activeLetters(v,g){return LETTERS.slice(0,clamp(Number(v?.teamCounts?.[g])||1,1,LETTERS.length))}
function team(v,g,L){return v?.teams?.[g]?.[L]||null}
function ownedRating(s,g,L){const base=Number(me(s)?.rating)||72;return clamp(Math.round(44+Number(g)*3+(base-70)*.25+(8-LETTERS.indexOf(L))*1.7),42,90)}
function tierAdjustment(L){return ({A:8,B:5,C:3,D:1,E:-1,F:-3,G:-5,H:-7})[L]??0}
function externalRating(program,g,L){return clamp(Math.round((Number(program?.rating)||74)+(Number(g)-6)+tierAdjustment(L)),45,96)}
function pushProgramsIntoJinglePool(){const clubs=window.BM27V2739?.clubs;if(!Array.isArray(clubs))return 0;let added=0;for(const p of STL_JUNIOR_PROGRAMS){if(!clubs.some(c=>c.id===p.id)){clubs.push({...p});added++}}return added}
function rebuildUnplayedJingleJam(s=save()){
  const api=window.BM27V2739,v=ensure(s);if(!api||!v?.jingleJam)return false;
  const games=[];for(const gd of Object.values(v.jingleJam.grades||{}))for(const b of Object.values(gd.brackets||{}))games.push(...(b.games||[]));
  if(games.some(g=>g.played))return false;
  v.jingleJam=null;v.state=null;api.createJingleJam(s);return true;
}
function programPool(type,s=save()){
  if(type==='club')return (window.BM27V2739?.clubs||[]).filter(x=>!x.stlJuniorProgram);
  if(type==='junior'){
    const mine=ownProgramName(s).toLowerCase();
    return STL_JUNIOR_PROGRAMS.filter(p=>p.name.toLowerCase()!==mine && !(mine.includes('marquette')&&p.id==='marquette-junior'));
  }
  return [];
}
function addExternalGame(s,{grade,letter,opponentType,programId,opponentLetter,date,location}){
  const v=ensure(s);if(!v)return {ok:false,error:'Junior program is unavailable.'};
  const t=team(v,grade,letter);if(!t)return {ok:false,error:'Choose an active junior team.'};
  if(t.schedule.length>=26)return {ok:false,error:'That junior team already has 26 scheduled games.'};
  const pool=programPool(opponentType,s),program=pool.find(p=>p.id===programId);if(!program)return {ok:false,error:'Choose an opponent program.'};
  const L=LETTERS.includes(opponentLetter)?opponentLetter:'A';
  const loc=location||'home';
  const game={id:uid('jr-sched'),opponentClubId:program.id,opponentName:`${program.name} • ${gradeLabel(grade)} ${L}`,opponentProgramId:program.id,opponentProgramType:opponentType,opponentLetter:L,opponentRating:externalRating(program,grade,L),date:`${date}T18:00:00`,home:loc==='home',neutral:loc==='neutral',played:false,type:'Junior Regular Season'};
  t.schedule.push(game);t.schedule.sort((a,b)=>String(a.date).localeCompare(String(b.date)));return {ok:true,game};
}
function addOwnProgramGame(s,{grade,letter,opponentLetter,date,location}){
  const v=ensure(s);if(!v)return {ok:false,error:'Junior program is unavailable.'};
  const a=team(v,grade,letter),b=team(v,grade,opponentLetter);if(!a||!b||!activeLetters(v,grade).includes(letter)||!activeLetters(v,grade).includes(opponentLetter))return {ok:false,error:'Both program teams must be active in that grade.'};
  if(letter===opponentLetter)return {ok:false,error:'A team cannot schedule itself.'};
  if(a.schedule.length>=26||b.schedule.length>=26)return {ok:false,error:'One of those teams already has 26 scheduled games.'};
  const seriesId=uid('jr-own'),loc=location||'home',program=ownProgramName(s);
  const aGame={id:uid('jr-sched'),ownSeriesId:seriesId,ownerLetter:letter,ownOpponentLetter:opponentLetter,opponentName:`${program} • ${gradeLabel(grade)} ${opponentLetter}`,date:`${date}T18:00:00`,home:loc==='home',neutral:loc==='neutral',played:false,type:'Junior Program Matchup',managedBy:'v2740-own-matchup'};
  const bGame={id:uid('jr-sched'),ownSeriesId:seriesId,ownerLetter:opponentLetter,ownOpponentLetter:letter,opponentName:`${program} • ${gradeLabel(grade)} ${letter}`,date:`${date}T18:00:00`,home:loc==='away',neutral:loc==='neutral',played:false,type:'Junior Program Matchup',managedBy:'v2740-own-matchup'};
  a.schedule.push(aGame);b.schedule.push(bGame);a.schedule.sort((x,y)=>String(x.date).localeCompare(String(y.date)));b.schedule.sort((x,y)=>String(x.date).localeCompare(String(y.date)));return {ok:true,game:aGame,mirror:bGame};
}
function scorePair(a,b,seed=''){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}const edge=a-b,noise=((h>>>0)%1901)/100-9.5;let x=Math.round(38+a*.28+edge*.28+noise),y=Math.round(38+b*.28-edge*.18-noise*.35);x=Math.max(18,x);y=Math.max(18,y);if(x===y)x++;return[x,y]}
function queueOwnResult(s,r){const v=ensure(s);if(!v)return;v.v2740.pendingResults.push({...r,id:uid('jr-result')});setTimeout(showOwnResults,40)}
function processOwnMatchups(s=save(),options={}){
  const v=ensure(s);if(!s||!v)return 0;const today=dayKey(s.day);if(!today)return 0;const seen=new Set();let changed=0;
  for(const g of GRADES){for(const L of activeLetters(v,g)){const t=team(v,g,L);for(const gm of t.schedule||[]){if(gm.managedBy!=='v2740-own-matchup'||gm.played||dayKey(gm.date)>today||seen.has(gm.ownSeriesId))continue;seen.add(gm.ownSeriesId);const otherL=gm.ownOpponentLetter,ot=team(v,g,otherL);if(!ot)continue;const mirror=(ot.schedule||[]).find(x=>x.ownSeriesId===gm.ownSeriesId);if(!mirror)continue;const [a,b]=scorePair(ownedRating(s,g,L),ownedRating(s,g,otherL),`${s.season}|${gm.ownSeriesId}`);gm.played=true;gm.myScore=a;gm.oppScore=b;gm.result=a>b?'W':'L';mirror.played=true;mirror.myScore=b;mirror.oppScore=a;mirror.result=b>a?'W':'L';t.pf=(t.pf||0)+a;t.pa=(t.pa||0)+b;ot.pf=(ot.pf||0)+b;ot.pa=(ot.pa||0)+a;if(a>b){t.wins=(t.wins||0)+1;ot.losses=(ot.losses||0)+1}else{t.losses=(t.losses||0)+1;ot.wins=(ot.wins||0)+1}queueOwnResult(s,{grade:g,letter:L,otherLetter:otherL,date:gm.date,a,b,winner:a>b?L:otherL});changed++}}
  }
  if(changed){v.v2740.lastProcessedDay=today;v.v2740.lastReason=options.reason||'calendar-day';persistSafe();try{window.BM27V2739?.renderJunior?.()}catch{}}
  return changed;
}
function showOwnResults(){if(typeof document==='undefined')return;const s=save(),v=ensure(s),queue=v?.v2740?.pendingResults;if(!queue?.length)return;const d=$('v2739JuniorResultsDialog');if(!d)return;if(d.open||[...document.querySelectorAll('dialog[open]')].some(x=>x!==d)){setTimeout(showOwnResults,180);return}const rows=queue.splice(0,queue.length);const box=$('v2739JuniorResultsList');if(box)box.innerHTML=rows.map(r=>`<article class="card"><p class="eyebrow">${gradeLabel(r.grade).toUpperCase()} • SAME PROGRAM</p><h3>Team ${r.winner} wins ${r.a}-${r.b}</h3><p><b>${esc(ownProgramName(s))} Team ${esc(r.letter)} vs Team ${esc(r.otherLetter)}</b></p><p class="muted small">${new Date(r.date).toLocaleDateString()} • Both team schedules and records updated.</p></article>`).join('');persistSafe();try{d.showModal()}catch{}}
function ensureDialog(){
  if(typeof document==='undefined'||$('v2740JuniorScheduleDialog'))return;
  document.body.insertAdjacentHTML('beforeend',`<dialog id="v2740JuniorScheduleDialog"><form method="dialog" id="v2740JuniorScheduleForm"><div class="modal-head"><div><p class="eyebrow">JUNIOR PROGRAM SCHEDULING • CROSS-TIER</p><h2>Add Junior Game</h2></div><button value="cancel" class="icon-btn">×</button></div><div class="two"><label>Your grade<select id="v2740Grade">${GRADES.map(g=>`<option value="${g}">${gradeLabel(g)}</option>`).join('')}</select></label><label>Your team<select id="v2740Team"></select></label></div><label>Opponent type<select id="v2740OpponentType"><option value="junior">St. Louis Junior Program</option><option value="club">St. Louis Club Team</option><option value="own">Another Team From My Program</option></select></label><div id="v2740ProgramWrap"><label>Opponent program<select id="v2740OpponentProgram"></select></label></div><label>Opponent team<select id="v2740OpponentLetter"></select></label><div class="two"><label>Date<input id="v2740Date" type="date" required></label><label>Location<select id="v2740Location"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></label></div><p id="v2740MatchupPreview" class="muted small"></p><button value="default" class="primary wide">Add Game — No Pitch</button></form></dialog>`);
  $('v2740Grade')?.addEventListener('change',syncDialog);$('v2740Team')?.addEventListener('change',syncDialog);$('v2740OpponentType')?.addEventListener('change',syncDialog);$('v2740OpponentProgram')?.addEventListener('change',syncPreview);$('v2740OpponentLetter')?.addEventListener('change',syncPreview);$('v2740JuniorScheduleForm')?.addEventListener('submit',submitDialog);
}
function replaceOldButton(){if(typeof document==='undefined')return;const old=$('v2739AddGame');if(!old||old.dataset.v2740)return;const b=old.cloneNode(true);b.dataset.v2740='1';b.textContent='Add Junior Game';old.replaceWith(b);b.addEventListener('click',openDialog)}
function syncDialog(){const s=save(),v=ensure(s);if(!v)return;const g=Number($('v2740Grade')?.value||3),letters=activeLetters(v,g);const teamSel=$('v2740Team');if(teamSel){const keep=teamSel.value;teamSel.innerHTML=letters.map(L=>`<option value="${L}">Team ${L}</option>`).join('');if(letters.includes(keep))teamSel.value=keep}const mine=teamSel?.value||letters[0]||'A',type=$('v2740OpponentType')?.value||'junior',programSel=$('v2740OpponentProgram'),wrap=$('v2740ProgramWrap'),oppSel=$('v2740OpponentLetter');if(type==='own'){if(wrap)wrap.style.display='none';const others=letters.filter(L=>L!==mine);if(oppSel)oppSel.innerHTML=others.length?others.map(L=>`<option value="${L}">Team ${L} • same program</option>`).join(''):'<option value="">No other active team in this grade</option>'}else{if(wrap)wrap.style.display='';const pool=programPool(type,s);if(programSel)programSel.innerHTML=pool.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');if(oppSel)oppSel.innerHTML=LETTERS.map(L=>`<option value="${L}">Team ${L}</option>`).join('')}syncPreview()}
function syncPreview(){const s=save(),v=ensure(s),p=$('v2740MatchupPreview');if(!p||!v)return;const g=Number($('v2740Grade')?.value||3),mine=$('v2740Team')?.value||'A',type=$('v2740OpponentType')?.value||'junior',oppL=$('v2740OpponentLetter')?.value||'A';let opp='';if(type==='own')opp=`${ownProgramName(s)} ${gradeLabel(g)} Team ${oppL}`;else{const prog=programPool(type,s).find(x=>x.id===$('v2740OpponentProgram')?.value);opp=`${prog?.name||'Opponent'} ${gradeLabel(g)} Team ${oppL}`}p.textContent=`Matchup: ${ownProgramName(s)} ${gradeLabel(g)} Team ${mine} vs ${opp}. Letter levels do not have to match.`}
function openDialog(){const s=save(),v=ensure(s);if(!s||!v)return;ensureDialog();const g=Number($('v2739ScheduleGrade')?.value||3),L=$('v2739ScheduleTeam')?.value||activeLetters(v,g)[0]||'A';$('v2740Grade').value=String(g);syncDialog();if(activeLetters(v,g).includes(L))$('v2740Team').value=L;syncDialog();const y=Number(s.season)||2026,d=$('v2740Date');d.min=`${y}-11-01`;d.max=`${y+1}-03-31`;const today=dayKey(s.day);d.value=today>=d.min&&today<=d.max?today:`${y}-11-24`;syncPreview();try{$('v2740JuniorScheduleDialog').showModal()}catch{}}
function submitDialog(e){e.preventDefault();const s=save(),v=ensure(s);if(!s||!v)return;const grade=Number($('v2740Grade').value),letter=$('v2740Team').value,type=$('v2740OpponentType').value,opponentLetter=$('v2740OpponentLetter').value,date=$('v2740Date').value,location=$('v2740Location').value;let result;if(type==='own')result=addOwnProgramGame(s,{grade,letter,opponentLetter,date,location});else result=addExternalGame(s,{grade,letter,opponentType:type,programId:$('v2740OpponentProgram').value,opponentLetter,date,location});if(!result.ok){toastSafe(result.error);return}try{$('v2740JuniorScheduleDialog').close()}catch{}persistSafe();window.BM27V2739?.renderJunior?.();toastSafe(type==='own'?`${gradeLabel(grade)} Team ${letter} vs Team ${opponentLetter} added to both schedules.`:`${gradeLabel(grade)} Team ${letter} cross-tier game added.`)}
function addInfoCard(){if(typeof document==='undefined')return;const page=$('juniorProgramPage');if(!page||$('v2740JuniorCircuitInfo'))return;const firstCard=page.querySelector('.office-grid');const card=document.createElement('article');card.id='v2740JuniorCircuitInfo';card.className='card';card.innerHTML=`<div class="section-head"><div><p class="eyebrow">ST. LOUIS JUNIOR CIRCUIT</p><h3>Cross-Tier Scheduling</h3><p class="muted small">Schedule school-based St. Louis junior programs, club programs, or another team from your own grade. A teams can play B/C/etc. teams and vice versa.</p></div><span class="tag">${STL_JUNIOR_PROGRAMS.length} JR PROGRAMS</span></div>`;if(firstCard)page.insertBefore(card,firstCard);else page.appendChild(card)}
function hookDaily(){const api=window.BM27V2732;if(!api||api.__v2740Wrapped)return false;const base=api.processOwnedDay;api.processOwnedDay=function(s,options={}){const a=Number(base?.(s,options)||0),b=Number(processOwnMatchups(s,options)||0);return a+b};api.__v2740Wrapped=true;return true}
function addNotes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v2740-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2740-notes><p class="eyebrow">BM27 v2.7.40</p><h3>St. Louis Junior Programs + Cross-Tier Games</h3><ul class="update-list"><li>Added a St. Louis junior school-program pool alongside the existing club circuit and Jingle Jam fields.</li><li>Junior schedules now allow cross-tier games: A vs B, B vs C, A vs D, and any other A–H combination.</li><li>If your grade has multiple teams, you can schedule teams from your own program against each other and both schedules/records update from the same result.</li><li>The new scheduler uses small cascading selectors instead of loading hundreds of matchup options at once.</li></ul></article>`)}
function install(){if(window.__BM27_V2740__)return;window.__BM27_V2740__=true;pushProgramsIntoJinglePool();const s=save();if(s){ensure(s);rebuildUnplayedJingleJam(s)}ensureDialog();replaceOldButton();addInfoCard();hookDaily();if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);pushProgramsIntoJinglePool();const s=save();if(s){ensure(s);rebuildUnplayedJingleJam(s);processOwnMatchups(s,{reason:'open-save'})}replaceOldButton();addInfoCard();return r}}document.addEventListener('click',e=>{if(e.target.closest?.('#v2739JuniorNav'))setTimeout(()=>{replaceOldButton();addInfoCard()},0);if(e.target.closest?.('[data-open-updates]'))setTimeout(addNotes,20)},true);window.addEventListener('focus',()=>{if(save())processOwnMatchups(save(),{reason:'focus'})});addNotes();try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.40'}catch{}}
window.BM27V2740={version:VERSION,programs:STL_JUNIOR_PROGRAMS,addExternalGame,addOwnProgramGame,processOwnMatchups,externalRating,pushProgramsIntoJinglePool};
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install()}
})();
