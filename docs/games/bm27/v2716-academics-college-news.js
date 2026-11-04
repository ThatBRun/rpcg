/* BM27 v2.7.16 — College Graduation + News + Reclass + Roster Grades
   Loaded last. Adds retroactive senior-to-college migration, an academic eligibility
   system, player reclassification, and dedicated Season News/Roster Grades pages.
*/
(()=>{
'use strict';
const VERSION=2716;
const GPA_MIN=1.5;
const q=id=>document.getElementById(id);
const qa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eq=(a,b)=>String(a)===String(b);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const copy=o=>JSON.parse(JSON.stringify(o));
const dateOnly=x=>{const d=new Date(x||Date.now());return Number.isNaN(d.getTime())?new Date():d};
const isoDay=x=>dateOnly(x).toISOString();
const addDays=(x,n)=>{const d=dateOnly(x);d.setDate(d.getDate()+n);return d.toISOString()};
const safePersist=()=>{try{persist?.()}catch(e){console.warn('BM27 v2.7.16 save skipped',e)}};
const safeRender=()=>{try{renderAll?.()}catch(e){console.warn('BM27 v2.7.16 render skipped',e)}};
function activeSave(){try{return typeof current!=='undefined'?current:null}catch{return null}}
function userTeam(save=activeSave()){return save?.teams?.find(t=>eq(t.id,save.schoolId))||null}
function hashText(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function seeded(seed){let a=hashText(seed)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function allProgramPlayers(save=activeSave()){
  if(!save)return[];
  const list=Array.isArray(save.v2?.programPlayers)&&save.v2.programPlayers.length?save.v2.programPlayers:(userTeam(save)?.roster||[]);
  const seen=new Set();return list.filter(p=>{const k=String(p?.id??`${p?.name}|${p?.pos}`);if(seen.has(k))return false;seen.add(k);return true});
}
function varsityPlayers(save=activeSave()){
  const all=allProgramPlayers(save),varsity=all.filter(p=>(p.teamLevel||'Varsity')==='Varsity');
  return varsity.length?varsity:(userTeam(save)?.roster||[]);
}
function findPlayer(id,save=activeSave()){return allProgramPlayers(save).find(p=>eq(p.id,id))||userTeam(save)?.roster?.find(p=>eq(p.id,id))||null}
function syncPlayerMirror(player,save=activeSave()){
  if(!player||!save)return;const t=userTeam(save);if(!t)return;
  const mirror=t.roster?.find(p=>eq(p.id,player.id));if(mirror&&mirror!==player){mirror.grade=player.grade;mirror.academics=player.academics;mirror.reclassHistory=player.reclassHistory;mirror.lastReclassSeason=player.lastReclassSeason;mirror.minutes=player.minutes}
}
function letter(score){score=Number(score)||0;return score>=93?'A':score>=90?'A-':score>=87?'B+':score>=83?'B':score>=80?'B-':score>=77?'C+':score>=73?'C':score>=70?'C-':score>=67?'D+':score>=63?'D':score>=60?'D-':'F'}
function gradePoints(score){score=Number(score)||0;return score>=93?4:score>=90?3.7:score>=87?3.3:score>=83?3:score>=80?2.7:score>=77?2.3:score>=73?2:score>=70?1.7:score>=67?1.3:score>=63?1:score>=60?.7:0}
function calcGPA(assignments){const a=(assignments||[]).slice(-8);if(!a.length)return 4;return Math.round((a.reduce((n,x)=>n+gradePoints(x.score),0)/a.length)*100)/100}
const SUBJECTS=['English','Mathematics','Science','U.S. History','Health','Elective'];
function assignment(player,date,idx=0,makeup=false){
  const a=player.academics||{},r=seeded(`${player.id}|${date}|${idx}|${makeup?'makeup':'class'}`),subject=makeup?'Academic Support':SUBJECTS[(hashText(player.id)+idx)%SUBJECTS.length];
  const activeSupport=a.supportUntil&&dateOnly(a.supportUntil)>=dateOnly(date);const base=Number(a.ability)||75;
  let score=Math.round(base+(r()-.5)*24+(activeSupport?11:0)+(makeup?9:0));score=clamp(score,35,100);
  return{id:`acad-${hashText(`${player.id}|${date}|${idx}|${makeup}`)}`,date:isoDay(date),subject,title:makeup?'Make-Up Work':`${subject} Assignment`,score,letter:letter(score)}
}
function initializeAcademics(player,save){
  if(!player)return;let a=player.academics;
  if(!a||typeof a!=='object'){
    const r=seeded(`${save?.id}|${player.id}|academics`),ability=Math.round(58+r()*38);
    a=player.academics={ability,assignments:[],gpa:0,eligible:true,supportUntil:null,lastCoachTalkDate:null};
  }
  a.assignments=Array.isArray(a.assignments)?a.assignments:[];a.ability=clamp(Number(a.ability)||72,45,99);
  if(!a.assignments.length){for(let i=4;i>=0;i--)a.assignments.push(assignment(player,addDays(save?.day||new Date(),-i*5),i,false))}
  a.assignments=a.assignments.slice(-12);updateEligibility(player,save,false);
}
function updateEligibility(player,save=activeSave(),announce=true){
  if(!player?.academics)return true;const a=player.academics,was=a.eligible!==false;a.gpa=calcGPA(a.assignments);a.eligible=a.gpa>=GPA_MIN;
  if(!a.eligible){if(player.academicMinutesBefore==null&&Number(player.minutes)>0)player.academicMinutesBefore=Number(player.minutes);player.minutes=0}
  else if(!was&&player.academicMinutesBefore!=null){player.minutes=clamp(Number(player.academicMinutesBefore)||8,0,36);delete player.academicMinutesBefore}
  if(announce&&was!==a.eligible&&save){save.news=save.news||[];save.news.unshift({date:save.day,category:'Academics',text:a.eligible?`${player.name} regained academic eligibility with a ${a.gpa.toFixed(2)} GPA.`:`${player.name} is academically ineligible after falling to a ${a.gpa.toFixed(2)} GPA. A 1.50 GPA is required to play.`})}
  syncPlayerMirror(player,save);return a.eligible
}
function recalcTeamRating(save=activeSave()){
  const t=userTeam(save);if(!t)return;const eligible=(t.roster||[]).filter(p=>isEligible(p));
  try{if(typeof teamRating==='function')t.rating=eligible.length?teamRating(eligible):35}catch{}
}
function isEligible(player){return !player?.academics||player.academics.eligible!==false}
function ensureAcademicSystem(save=activeSave()){
  if(!save)return false;save.v2716=save.v2716||{};const v=save.v2716;v.version=VERSION;v.collegeAlumni=Array.isArray(v.collegeAlumni)?v.collegeAlumni:[];
  for(const p of allProgramPlayers(save))initializeAcademics(p,save);
  if(!v.nextAcademicDate)v.nextAcademicDate=addDays(save.day||new Date(),7);
  recalcTeamRating(save);return true
}
function academicCatchUp(target,save=activeSave()){
  if(!save)return;ensureAcademicSystem(save);const v=save.v2716,limit=dateOnly(target||save.day);let next=dateOnly(v.nextAcademicDate);let guard=0,changed=false;
  while(next<=limit&&guard++<60){for(const p of allProgramPlayers(save)){initializeAcademics(p,save);p.academics.assignments.push(assignment(p,next.toISOString(),p.academics.assignments.length,false));p.academics.assignments=p.academics.assignments.slice(-12);updateEligibility(p,save,true)}next.setDate(next.getDate()+7);changed=true}
  v.nextAcademicDate=next.toISOString();if(changed)recalcTeamRating(save)
}
function beforeGame(g){const save=activeSave();if(!save)return true;academicCatchUp(g?.date||save.day,save);for(const p of varsityPlayers(save))updateEligibility(p,save,false);const eligible=varsityPlayers(save).filter(isEligible);recalcTeamRating(save);if(eligible.length<5){try{toast?.('You do not have five academically eligible Varsity players. Get grades up before playing.')}catch{}return false}return true}
function coachAcademicTalk(id){const save=activeSave(),p=findPlayer(id,save);if(!save||!p)return;initializeAcademics(p,save);const a=p.academics,now=dateOnly(save.day),last=a.lastCoachTalkDate?dateOnly(a.lastCoachTalkDate):null;if(last&&now-last<5*86400000){toast?.(`You already spoke with ${p.name} about grades recently.`);return}
  a.lastCoachTalkDate=save.day;a.supportUntil=addDays(save.day,14);a.ability=clamp(a.ability+3,45,99);a.assignments.push(assignment(p,save.day,a.assignments.length,true));a.assignments=a.assignments.slice(-12);updateEligibility(p,save,true);save.news=save.news||[];save.news.unshift({date:save.day,category:'Academics',text:`You told ${p.name} to get his grades up. He entered a two-week academic improvement plan and completed make-up work.`});recalcTeamRating(save);safePersist();renderGrades();renderNewsPage();try{renderRoster?.()}catch{};toast?.(`${p.name}'s academic improvement plan is active.`)}
function reclassPlayer(id,delta){const save=activeSave(),p=findPlayer(id,save);if(!save||!p)return;if(Number(p.lastReclassSeason)===Number(save.season))return toast?.(`${p.name} has already reclassified this season.`);const old=Number(p.grade)||9,n=old+Number(delta);if(n<9||n>12)return toast?.('Players can only be in grades 9–12.');p.grade=n;p.lastReclassSeason=Number(save.season);p.reclassHistory=Array.isArray(p.reclassHistory)?p.reclassHistory:[];p.reclassHistory.push({season:Number(save.season),from:old,to:n,date:save.day});if(n<12&&p.committed){p.committed=null}
  syncPlayerMirror(p,save);save.news=save.news||[];save.news.unshift({date:save.day,category:'Roster',text:`${p.name} reclassified from Grade ${old} to Grade ${n}.`});safePersist();renderGrades();renderNewsPage();try{renderRoster?.()}catch{};toast?.(`${p.name} is now in Grade ${n}.`)}

/* ---------- Seniors -> College, including existing saves ---------- */
function collegeList(){try{if(Array.isArray(window.BM27_ALL_COLLEGES)&&window.BM27_ALL_COLLEGES.length)return window.BM27_ALL_COLLEGES;if(typeof D1_COLLEGES!=='undefined'&&Array.isArray(D1_COLLEGES))return D1_COLLEGES}catch{}return[]}
function collegeNameById(id){if(id==null)return null;const c=collegeList().find(x=>eq(x.id,id));return c?.name||c?.school||c?.displayName||null}
function commitmentFor(save,p,season){const rows=save?.recruiting?.commitments||[];return rows.find(x=>String(x.player||'').trim().toLowerCase()===String(p.name||'').trim().toLowerCase()&&(x.season==null||Number(x.season)===Number(season)))||null}
function chooseCollege(save,p,season){
  const committed=p?.committed??commitmentFor(save,p,season)?.collegeId;if(committed!=null){const name=collegeNameById(committed);if(name)return{id:committed,name,association:collegeList().find(x=>eq(x.id,committed))?.association||'College Basketball'}}
  const list=collegeList();if(!list.length)return{id:`regional-${hashText(p?.name||'player')}`,name:'Regional College',association:'College Basketball'};
  const ovr=Number(p?.overall)||65,target=clamp(42+(ovr-50)*1.25,45,96),ranked=list.slice().sort((a,b)=>Math.abs((Number(a.prestige)||65)-target)-Math.abs((Number(b.prestige)||65)-target));const top=ranked.slice(0,Math.min(18,ranked.length));const pick=top[hashText(`${p?.id}|${season}|college`)%top.length]||ranked[0];return{id:pick.id,name:pick.name||pick.school||'College',association:pick.association||pick.division||'College Basketball'}
}
function alumniKey(x){return `${Number(x.season)||0}|${x.playerId||`${String(x.name||'').toLowerCase()}|${String(x.pos||'').toLowerCase()}`}`}
function addAlumni(save,p,season){ensureAcademicSystem(save);const v=save.v2716,key=alumniKey({season,playerId:p.id,name:p.name,pos:p.pos});if(v.collegeAlumni.some(x=>alumniKey(x)===key))return null;const c=chooseCollege(save,p,season);const rec={season:Number(season)||Number(save.season)-1,playerId:p.id||null,name:p.name||'Senior',pos:p.pos||'',overall:Number(p.overall)||0,collegeId:c.id,collegeName:c.name,association:c.association,graduatedAt:save.day};v.collegeAlumni.push(rec);return rec}
function archivedSeniors(save){const out=[];for(const arc of save?.v2?.seasonArchive||[]){if(Number(arc?.season)>=Number(save.season))continue;const lists=arc.rosters||{Varsity:arc.roster||[]};for(const p of Object.values(lists||{}).flatMap(x=>Array.isArray(x)?x:[]))if(Number(p?.grade)>=12)out.push({p,season:Number(arc.season)||Number(save.season)-1})}return out}
function removeGraduates(save,records){if(!save||!records?.length)return 0;const ids=new Set(records.map(x=>x.p?.id).filter(Boolean).map(String)),fallback=new Set(records.map(x=>`${String(x.p?.name||'').trim().toLowerCase()}|${String(x.p?.pos||'').trim().toLowerCase()}`));const gone=p=>!!p&&(ids.has(String(p.id))||fallback.has(`${String(p.name||'').trim().toLowerCase()}|${String(p.pos||'').trim().toLowerCase()}`));let removed=0;
  if(Array.isArray(save.v2?.programPlayers)){const before=save.v2.programPlayers.length;save.v2.programPlayers=save.v2.programPlayers.filter(p=>!gone(p));removed+=before-save.v2.programPlayers.length}
  const t=userTeam(save);if(t&&Array.isArray(t.roster)){const before=t.roster.length;t.roster=t.roster.filter(p=>!gone(p));removed+=before-t.roster.length}
  if(Array.isArray(save.tryoutPool))save.tryoutPool=save.tryoutPool.filter(p=>!gone(p));
  if(Array.isArray(save.v2?.injuries))save.v2.injuries=save.v2.injuries.filter(i=>!ids.has(String(i.playerId)));
  if(Array.isArray(save.v2?.collegeVisits))save.v2.collegeVisits=save.v2.collegeVisits.filter(i=>!ids.has(String(i.playerId)));
  for(const k of Object.keys(save.v2?.collegeRelations||{}))if(ids.has(String(save.v2.collegeRelations[k]?.playerId)))delete save.v2.collegeRelations[k];
  recalcTeamRating(save);return removed
}
function migrateOldSeniors(save=activeSave(),announce=true){if(!save)return{added:0,removed:0};save.v2716=save.v2716||{};ensureAcademicSystem(save);const old=archivedSeniors(save),added=[];for(const x of old){const rec=addAlumni(save,x.p,x.season);if(rec)added.push(rec)}const removed=removeGraduates(save,old);
  const marker=`${Number(save.season)}:${old.length}`;if(announce&&(added.length||removed)&&save.v2716.lastSeniorMigration!==marker){save.v2716.lastSeniorMigration=marker;save.news=save.news||[];save.news.unshift({date:save.day,category:'Recruiting',text:`College rollover repaired: ${old.length} prior senior${old.length===1?'':'s'} are recorded as graduates and cannot remain on the active high-school roster.`})}
  return{added:added.length,removed}
}
function captureCurrentSeniors(save=activeSave()){return allProgramPlayers(save).filter(p=>Number(p.grade)>=12).map(p=>p)}
function finishGraduatingClass(save,players,season){if(!save||!players?.length)return;const records=[];for(const p of players){const rec=addAlumni(save,p,season);if(rec)records.push(rec)}removeGraduates(save,players.map(p=>({p,season})));if(records.length){save.news=save.news||[];const names=records.slice(0,6).map(x=>`${x.name} → ${x.collegeName}`).join(' • ');save.news.unshift({date:save.day,category:'Recruiting',text:`Senior class moved on to college: ${names}${records.length>6?` • +${records.length-6} more`:''}.`})}ensureAcademicSystem(save)}

/* ---------- UI ---------- */
function ensureSeasonPages(){const game=q('game'),nav=q('sidebar')?.querySelector('nav'),main=game?.querySelector('main');if(!nav||!main)return;
  if(!q('news2716Nav')){const b=document.createElement('button');b.id='news2716Nav';b.className='nav';b.dataset.page='news2716';b.textContent='News';const dash=nav.querySelector('[data-page="dashboard"]');dash?.after(b)}
  if(!q('grades2716Nav')){const b=document.createElement('button');b.id='grades2716Nav';b.className='nav';b.dataset.page='grades2716';b.textContent='Roster Grades';const roster=nav.querySelector('[data-page="roster"]');roster?.after(b)}
  if(!q('news2716Page')){const s=document.createElement('section');s.id='news2716Page';s.className='page';s.innerHTML=`<div class="section-head"><div><p class="eyebrow">PROGRAM • RECRUITING • ACADEMICS • GAMES</p><h3>BM27 News Center</h3></div><select id="news2716Filter" aria-label="News category"><option value="all">All News</option><option value="academics">Academics</option><option value="recruiting">Recruiting & College</option><option value="games">Games</option><option value="program">Program</option></select></div><div id="news2716Summary" class="metrics"></div><div class="news2716-layout"><div id="news2716Feed" class="stack"></div><article class="card"><div class="section-head"><div><p class="eyebrow">GRADUATED SENIORS</p><h3>College Alumni</h3></div></div><div id="news2716Alumni" class="stack"></div></article></div>`;main.appendChild(s)}
  if(!q('grades2716Page')){const s=document.createElement('section');s.id='grades2716Page';s.className='page';s.innerHTML=`<div class="section-head"><div><p class="eyebrow">ACADEMIC ELIGIBILITY • 1.50 MINIMUM GPA</p><h3>Roster Grades</h3></div><select id="grades2716Level" aria-label="Roster level"><option value="Varsity">Varsity</option><option value="ALL">All Program Players</option><option value="JV">JV</option><option value="Freshman">Freshman</option></select></div><div id="grades2716Metrics" class="metrics"></div><div class="card grades2716-rule"><b>Eligibility Rule</b><span>A player below a <strong>1.50 GPA</strong> is immediately ineligible, receives 0 minutes, and cannot play until his GPA reaches 1.50 again.</span></div><div id="grades2716Table" class="table-wrap"></div>`;main.appendChild(s)}
  qa('#sidebar .nav[data-page="news2716"],#sidebar .nav[data-page="grades2716"]').forEach(b=>{if(b.dataset.v2716Bound)return;b.dataset.v2716Bound='1';b.addEventListener('click',e=>{e.preventDefault();qa('#sidebar .nav[data-page]').forEach(x=>x.classList.toggle('active',x===b));qa('#game .page').forEach(p=>p.classList.remove('active'));q(`${b.dataset.page}Page`)?.classList.add('active');if(q('pageTitle'))q('pageTitle').textContent=b.textContent;q('game')?.classList.remove('menu-open');if(b.dataset.page==='news2716')renderNewsPage();else renderGrades()})});
  const nf=q('news2716Filter');if(nf&&!nf.dataset.v2716){nf.dataset.v2716='1';nf.addEventListener('change',renderNewsPage)}const gl=q('grades2716Level');if(gl&&!gl.dataset.v2716){gl.dataset.v2716='1';gl.addEventListener('change',renderGrades)}
}
function newsCategory(n){const c=String(n?.category||'').toLowerCase(),t=String(n?.text||'').toLowerCase();if(c)return c.includes('academic')?'academics':c.includes('recruit')||c.includes('college')?'recruiting':c.includes('game')?'games':'program';if(/gpa|grade|academic|eligible|ineligible|assignment/.test(t))return'academics';if(/college|commit|recruit|senior|graduate|offer|scout/.test(t))return'recruiting';if(/defeated|fell to|lost to|victory|championship|tournament|game/.test(t))return'games';return'program'}
function renderNewsPage(){const save=activeSave();if(!save||!q('news2716Feed'))return;ensureAcademicSystem(save);const filter=q('news2716Filter')?.value||'all',news=(save.news||[]).slice().sort((a,b)=>dateOnly(b.date)-dateOnly(a.date)),rows=filter==='all'?news:news.filter(n=>newsCategory(n)===filter),alumni=(save.v2716?.collegeAlumni||[]).slice().sort((a,b)=>Number(b.season)-Number(a.season));const inel=varsityPlayers(save).filter(p=>!isEligible(p)).length;
  q('news2716Summary').innerHTML=[['Stories',news.length],['College Alumni',alumni.length],['Academic Holds',inel],['Current Season',`${save.season}–${String(Number(save.season)+1).slice(-2)}`]].map(x=>`<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  q('news2716Feed').innerHTML=rows.length?rows.slice(0,80).map(n=>`<article class="card news2716-story"><div><span class="tag">${esc(newsCategory(n).toUpperCase())}</span><small>${esc(dateOnly(n.date).toLocaleDateString())}</small></div><p>${esc(n.text||'Program update')}</p></article>`).join(''):'<article class="card"><p class="muted">No stories in this category yet.</p></article>';
  q('news2716Alumni').innerHTML=alumni.length?alumni.slice(0,40).map(a=>`<div class="row"><div><b>${esc(a.name)}</b><br><small>${esc(a.pos||'')} • ${Number(a.overall)||'—'} OVR • Class of ${Number(a.season)+1}</small></div><div class="news2716-college"><strong>${esc(a.collegeName)}</strong><small>${esc(a.association||'College Basketball')}</small></div></div>`).join(''):'<p class="muted">Graduating seniors will appear here with their college destination.</p>'
}
function assignmentMarkup(p){const a=p.academics?.assignments||[],last=a.slice(-5).reverse();return `<details class="grades2716-assign"><summary>${last[0]?`${esc(last[0].subject)} ${last[0].score}% (${esc(last[0].letter)})`:'No assignments'}</summary>${last.map(x=>`<div><span>${esc(x.subject)} • ${esc(dateOnly(x.date).toLocaleDateString())}</span><b class="grade-${x.score>=70?'pass':'fail'}">${x.score}% ${esc(x.letter)}</b></div>`).join('')}</details>`}
function renderGrades(){const save=activeSave();if(!save||!q('grades2716Table'))return;academicCatchUp(save.day,save);const level=q('grades2716Level')?.value||'Varsity',all=allProgramPlayers(save),players=(level==='ALL'?all:level==='Varsity'?varsityPlayers(save):all.filter(p=>(p.teamLevel||'Varsity')===level)).slice().sort((a,b)=>(a.teamLevel||'').localeCompare(b.teamLevel||'')||Number(b.grade)-Number(a.grade)||String(a.name).localeCompare(String(b.name)));const eligible=players.filter(isEligible).length,avg=players.length?players.reduce((n,p)=>n+(Number(p.academics?.gpa)||0),0)/players.length:0,support=players.filter(p=>p.academics?.supportUntil&&dateOnly(p.academics.supportUntil)>=dateOnly(save.day)).length;
  q('grades2716Metrics').innerHTML=[['Roster GPA',avg.toFixed(2)],['Eligible',eligible],['Ineligible',players.length-eligible],['Academic Plans',support]].map(x=>`<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  q('grades2716Table').innerHTML=`<table class="grades2716-table"><thead><tr><th>Player</th><th>Team</th><th>Grade</th><th>GPA</th><th>Status</th><th>Recent Assignments</th><th>Coach Action</th><th>Reclass</th></tr></thead><tbody>${players.map(p=>{const a=p.academics||{},ok=isEligible(p);return `<tr class="${ok?'':'grades2716-ineligible'}"><td><b>${esc(p.name)}</b><br><small>${esc(p.pos||'')} • ${Number(p.overall)||'—'} OVR</small></td><td>${esc(p.teamLevel||'Varsity')}</td><td><b>${Number(p.grade)||'—'}</b></td><td class="grades2716-gpa"><b>${Number(a.gpa||0).toFixed(2)}</b></td><td><span class="grades2716-status ${ok?'eligible':'ineligible'}">${ok?'ELIGIBLE':'INELIGIBLE'}</span>${!ok?'<small>0 MINUTES</small>':''}</td><td>${assignmentMarkup(p)}</td><td><button class="secondary" data-academic-talk="${esc(p.id)}">Tell Player: Get Grades Up</button></td><td><div class="grades2716-reclass">${Number(p.grade)<12?`<button class="secondary" data-reclass-id="${esc(p.id)}" data-reclass="1" ${Number(p.lastReclassSeason)===Number(save.season)?'disabled':''}>Reclass Up</button>`:''}${Number(p.grade)>9?`<button class="secondary" data-reclass-id="${esc(p.id)}" data-reclass="-1" ${Number(p.lastReclassSeason)===Number(save.season)?'disabled':''}>Reclass Back</button>`:''}</div>${Number(p.lastReclassSeason)===Number(save.season)?'<small>Reclassified this season</small>':''}</td></tr>`}).join('')}</tbody></table>`;
  q('grades2716Table').querySelectorAll('[data-academic-talk]').forEach(b=>b.onclick=()=>coachAcademicTalk(b.dataset.academicTalk));q('grades2716Table').querySelectorAll('[data-reclass-id]').forEach(b=>b.onclick=()=>reclassPlayer(b.dataset.reclassId,Number(b.dataset.reclass)))
}
function enhanceRoster(){const save=activeSave(),wrap=q('rosterTable');if(!save||!wrap)return;ensureAcademicSystem(save);wrap.querySelectorAll('[data-minutes]').forEach(inp=>{const p=findPlayer(inp.dataset.minutes,save);if(!p)return;const row=inp.closest('tr'),name=row?.querySelector('td');if(!isEligible(p)){inp.value='0';inp.disabled=true;row?.classList.add('grades2716-ineligible');if(name&&!name.querySelector('.grades2716-roster-hold'))name.insertAdjacentHTML('beforeend','<br><span class="grades2716-roster-hold">ACADEMICALLY INELIGIBLE</span>')}else inp.disabled=false})}
function migrate(save=activeSave(),announce=true){if(!save)return;ensureAcademicSystem(save);migrateOldSeniors(save,announce);ensureSeasonPages();recalcTeamRating(save)}

/* ---------- Hook existing game ---------- */
function install(){if(window.__BM27_V2716__)return;window.__BM27_V2716__=true;ensureSeasonPages();
  if(typeof openSave==='function'){const base=openSave;openSave=function(id){const r=base.apply(this,arguments);const s=activeSave();if(s){migrate(s,true);safePersist();safeRender()}return r}}
  if(typeof newCareer==='function'){const base=newCareer;newCareer=function(){const s=base.apply(this,arguments);migrate(s,false);return s}}
  if(typeof applyOffseason==='function'){const base=applyOffseason;applyOffseason=function(){const save=activeSave();if(!save)return base.apply(this,arguments);if((save.schedule||[]).some(g=>!g.played))return base.apply(this,arguments);const season=Number(save.season),grads=captureCurrentSeniors(save);const r=base.apply(this,arguments);const after=activeSave();if(after&&Number(after.season)>season){finishGraduatingClass(after,grads,season);migrateOldSeniors(after,false);safePersist();safeRender()}return r}}
  if(typeof simulateGame==='function'){const base=simulateGame;simulateGame=function(g){if(!beforeGame(g))return;return base.apply(this,arguments)}}
  if(typeof advance==='function'){const base=advance;advance=function(days=1){days=Math.max(1,Math.floor(Number(days)||1));let r;for(let i=0;i<days;i++){const save=activeSave();if(!save)break;const target=addDays(save.day,1);academicCatchUp(target,save);const before=(save.schedule||[]).filter(g=>g.played).length;r=base.call(this,1);const after=(activeSave()?.schedule||[]).filter(g=>g.played).length;if(after>before)break}safePersist();return r}}
  if(typeof renderRoster==='function'){const base=renderRoster;renderRoster=function(){const r=base.apply(this,arguments);enhanceRoster();return r}}
  if(typeof renderAll==='function'){const base=renderAll;let busy=false;renderAll=function(){if(!busy){busy=true;try{const s=activeSave();if(s){ensureAcademicSystem(s);ensureSeasonPages()}}finally{busy=false}}const r=base.apply(this,arguments);try{enhanceRoster();renderNewsPage();renderGrades();const ver=document.querySelector('.v2713-menu-version span');if(ver)ver.textContent='v2.7.16'}catch(e){console.warn('BM27 v2.7.16 UI render',e)}return r}}
  const auto=q('autoLineupBtn');if(auto){auto.onclick=()=>{const save=activeSave();if(!save)return;ensureAcademicSystem(save);const roster=varsityPlayers(save),ok=roster.filter(isEligible).sort((a,b)=>(b.overall||0)-(a.overall||0));roster.filter(p=>!isEligible(p)).forEach(p=>p.minutes=0);ok.forEach((p,i)=>p.minutes=i<5?30-i:i<9?12:4);recalcTeamRating(save);safePersist();safeRender();toast?.('Best academically eligible lineup selected.')}}
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const box=q('updatesContent');if(!box||box.querySelector('[data-v2716-notes]'))return;box.insertAdjacentHTML('afterbegin','<article class="card" data-v2716-notes><p class="eyebrow">BM27 v2.7.16</p><h3>Academics, Reclassification & College Graduation</h3><ul class="update-list"><li>Seniors now permanently graduate from every active roster and are recorded with college destinations.</li><li>Existing saves are retroactively repaired using archived senior classes.</li><li>Added a dedicated News Center and College Alumni feed.</li><li>Players can reclass up or back one grade once per season.</li><li>Added Roster Grades with assignment scores, GPA and a 1.50 eligibility minimum.</li><li>Academically ineligible players receive zero minutes and cannot play until their GPA recovers.</li><li>Coaches can put players on academic improvement plans and assign make-up work.</li></ul></article>')},0),{capture:true}));
  const save=activeSave();if(save){migrate(save,true);safePersist();safeRender()}
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27Academics2716={version:VERSION,minGPA:GPA_MIN,isEligible,beforeGame,ensure:ensureAcademicSystem,catchUp:academicCatchUp,migrate:migrateOldSeniors,renderGrades,renderNews:renderNewsPage};
})();
