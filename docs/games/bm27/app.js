
// College database guard: prevents Recruiting from crashing if colleges.js is missing or blocked.
if (!Array.isArray(window.D1_COLLEGES) || window.D1_COLLEGES.length === 0) {
  window.D1_COLLEGES = [
    { id: "fallback-mizzou", name: "Missouri", mascot: "Tigers", prestige: 82 },
    { id: "fallback-slu", name: "Saint Louis", mascot: "Billikens", prestige: 78 },
    { id: "fallback-kansas", name: "Kansas", mascot: "Jayhawks", prestige: 94 },
    { id: "fallback-illinois", name: "Illinois", mascot: "Fighting Illini", prestige: 84 }
  ];
  console.warn("BM27: colleges.js was unavailable; using the emergency college list.");
}
const D1_COLLEGES = window.D1_COLLEGES;
const BM27Storage=window.BM27Storage=window.BM27Storage||(()=>{
  const quotaError=e=>e&&(e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014);
  // v2.7.11: never delete career saves to recover browser quota. Only disposable caches are cleared.
  const cleanup=()=>{for(const key of ['mshsaa_bm27_directory']){try{localStorage.removeItem(key)}catch{}}};
  const set=(key,value)=>{
    try{localStorage.setItem(key,value);return true}catch(e){
      if(quotaError(e)){
        cleanup();
        try{localStorage.setItem(key,value);return true}catch(retryError){console.warn('BM27 storage quota still full:',key,retryError);return false}
      }
      console.warn('BM27 browser backup skipped:',key,e);return false
    }
  };
  const get=key=>{try{return localStorage.getItem(key)}catch{return null}};
  const remove=key=>{try{localStorage.removeItem(key)}catch{}};
  return {get,set,remove,cleanup};
})();
const $=id=>document.getElementById(id);
function uid(){
  try{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID()}catch{}
  const bytes=new Uint8Array(16);
  try{globalThis.crypto?.getRandomValues?.(bytes)}catch{}
  if(!bytes.some(Boolean)){for(let i=0;i<16;i++)bytes[i]=Math.floor(Math.random()*256)}
  bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
  const h=[...bytes].map(b=>b.toString(16).padStart(2,'0'));
  return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10,16).join('')}`;
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const FIRST=['Jalen','Mason','Caleb','Trey','Cameron','Malik','Jordan','Isaiah','Eli','Noah','Tyler','Drew','Jayden','Micah','Kaden','Andre','Xavier','Cole','Miles','Devin','Brayden','Nolan','Zion','Landon','Bryce','Jace'];
const LAST=['Johnson','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark','Lewis','Walker','Young','Allen','King','Wright','Hill','Scott','Green'];
const BASE_SCHOOLS=[
['Marquette','6','2','#0b6b3a','#ffffff'],['CBC','6','3','#5b21b6','#facc15'],['Chaminade','6','3','#b91c1c','#ffffff'],['De Smet Jesuit','6','3','#7f1d1d','#facc15'],['Lindbergh','6','1','#166534','#facc15'],['Kirkwood','6','1','#dc2626','#ffffff'],['Webster Groves','6','1','#1d4ed8','#facc15'],['Lafayette (Wildwood)','6','2','#991b1b','#f8fafc'],['Eureka','6','2','#7e22ce','#facc15'],['Parkway West','6','2','#1e3a8a','#facc15'],['Parkway Central','6','2','#dc2626','#1e3a8a'],['Parkway South','6','1','#14532d','#facc15'],['Vashon','4','4','#f97316','#000000'],['Cardinal Ritter','5','4','#1e3a8a','#facc15'],['St. Louis University High','6','3','#1d4ed8','#ffffff'],['Rockhurst','6','6','#1e3a8a','#ffffff'],['Oak Park','6','8','#111827','#f97316'],['Liberty','6','8','#1e3a8a','#facc15'],['Blue Springs','6','7','#4c1d95','#facc15'],['Lee’s Summit North','6','7','#111827','#facc15'],['Nixa','6','5','#dc2626','#e5e7eb'],['Kickapoo','6','5','#92400e','#facc15'],['Republic','6','5','#ea580c','#111827'],['Ozark','6','5','#dc2626','#111827'],['Joplin','6','5','#dc2626','#1e3a8a'],['Rock Bridge','6','4','#14532d','#facc15'],['Hickman','6','4','#7f1d1d','#facc15'],['Battle','6','4','#1e40af','#f97316'],['Jefferson City','5','5','#1e3a8a','#facc15'],['Helias Catholic','5','5','#1e3a8a','#ffffff'],['Staley','6','8','#0284c7','#111827'],['North Kansas City','6','8','#ca8a04','#111827'],['Raytown','6','7','#1d4ed8','#ffffff'],['Raytown South','5','7','#dc2626','#ffffff'],['Fort Zumwalt North','6','4','#111827','#facc15'],['Fort Zumwalt South','6','4','#dc2626','#1e3a8a'],['Francis Howell','6','4','#1e3a8a','#facc15'],['Francis Howell Central','6','4','#2563eb','#ffffff'],['Timberland','6','4','#111827','#facc15'],['Troy Buchanan','6','4','#7f1d1d','#facc15'],['Jackson','6','1','#dc2626','#111827'],['Cape Girardeau Central','6','1','#111827','#f97316'],['Sikeston','5','1','#dc2626','#111827'],['Poplar Bluff','6','1','#7f1d1d','#ffffff'],['Farmington','5','1','#111827','#facc15'],['Bolivar','5','5','#0284c7','#ffffff'],['West Plains','5','6','#dc2626','#ffffff'],['Branson','6','5','#dc2626','#111827'],['Willard','5','6','#dc2626','#111827'],['Camdenton','5','6','#5b21b6','#facc15'],['Lebanon','5','6','#facc15','#111827'],['Smithville','5','8','#16a34a','#ffffff'],['Kearney','5','8','#111827','#facc15'],['Grain Valley','5','7','#1e3a8a','#ffffff'],['St. Pius X (Kansas City)','5','8','#1e3a8a','#facc15'],['Bishop Miege','5','8','#dc2626','#facc15'],['MICDS','5','3','#dc2626','#16a34a'],['Priory','4','3','#dc2626','#ffffff'],['John Burroughs','5','3','#facc15','#111827'],['Lutheran North','4','4','#7f1d1d','#facc15'],['Principia','3','4','#1d4ed8','#facc15'],['Seymour','3','10','#dc2626','#ffffff'],['Sparta','3','10','#1e3a8a','#ffffff'],['Greenwood','3','10','#16a34a','#ffffff'],['Fair Grove','3','10','#dc2626','#facc15'],['Ava','3','10','#111827','#facc15'],['Conway','3','10','#1d4ed8','#ffffff']
].map((s,i)=>({id:'s'+i,name:s[0],mascot:'Athletics',class:s[1],district:s[2],primary:s[3],secondary:s[4],city:''}));
let directory=(()=>{try{return JSON.parse(BM27Storage.get('mshsaa_bm27_directory')||'null')||BASE_SCHOOLS}catch{return BASE_SCHOOLS}})();let current=null;let saves=[];
function exposeSchoolDirectory(){
 window.BM27SchoolDirectory=dedupeSchoolList(directory||BASE_SCHOOLS||[]);
 return window.BM27SchoolDirectory
}
function hydrateSchoolLogos(){
 const all=window.BM27SchoolDirectory||[];
 for(const t of all)if(t?.name&&!t.logo)t.logo=window.BM27Branding255?.logo?.(t.name)||window.BM27Logos252?.svg?.(t.name)||'';
 if(current?.teams)for(const t of current.teams)if(t?.name)t.logo=window.BM27Branding255?.logo?.(t.name)||window.BM27Logos252?.svg?.(t.name)||t.logo||'';
 return all.filter(t=>t.logo).length
}
window.BM27HydrateSchoolLogos=hydrateSchoolLogos;
exposeSchoolDirectory();
window.BM27SchoolLogo=function(name,cls='schoolLogo'){return window.BM27Branding255?.html?.(name,cls)||window.BM27Logos252?.html?.(name,cls)||''};

function rng(seed){let t=seed%2147483647;if(t<=0)t+=2147483646;return()=>((t=t*16807%2147483647)-1)/2147483646}function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)}
function makePlayer(school,index,season=2026){const r=rng(hash(school.name+index+season));const pos=['PG','SG','SF','PF','C'][index%5];const grade=9+Math.floor(r()*4);const base=50+r()*30+(grade-9)*2;const skill=()=>clamp(Math.round(base+(r()-.5)*18),35,96);const p={id:uid(),name:FIRST[Math.floor(r()*FIRST.length)]+' '+LAST[Math.floor(r()*LAST.length)],pos,grade,height:pos==='C'?`6'${3+Math.floor(r()*7)}"`:pos==='PF'?`6'${1+Math.floor(r()*6)}"`:`5'${7+Math.floor(r()*8)}"`,shooting:skill(),finishing:skill(),defense:skill(),passing:skill(),rebounding:skill(),athleticism:skill(),potential:clamp(Math.round(base+8+r()*15),55,99),minutes:index<5?28-index:12};p.overall=Math.round((p.shooting+p.finishing+p.defense+p.passing+p.rebounding+p.athleticism)/6);return p}
function teamRating(roster){return Math.round(roster.slice().sort((a,b)=>b.overall-a.overall).slice(0,8).reduce((a,p)=>a+p.overall,0)/8)}
function buildUniverse(userSchool){return dedupeSchoolList(directory).map((s,i)=>{const roster=Array.from({length:13},(_,n)=>makePlayer(s,n));return {...s,roster,rating:teamRating(roster),wins:0,losses:0,pf:0,pa:0,rank:0}})}
function normalizeSchoolName(name=''){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function schoolDataScore(s={}){let n=0;if(s.id&&!String(s.id).startsWith('s'))n+=4;if(s.mascot&&s.mascot!=='Athletics')n+=3;if(s.class!=null&&s.class!=='')n+=2;if(s.district!=null&&s.district!=='')n+=2;if(s.city)n+=1;if(s.primary)n+=1;if(s.secondary)n+=1;return n}
function dedupeSchoolList(list=[]){
  const groups=new Map();
  for(const raw of Array.isArray(list)?list:[]){if(!raw?.name)continue;const key=normalizeSchoolName(raw.name);if(!key)continue;(groups.get(key)||groups.set(key,[]).get(key)).push(raw)}
  const out=[];
  for(const group of groups.values()){const sorted=group.slice().sort((a,b)=>schoolDataScore(b)-schoolDataScore(a));const best={...sorted[0]};for(const s of sorted.slice(1)){if((!best.mascot||best.mascot==='Athletics')&&s.mascot&&s.mascot!=='Athletics')best.mascot=s.mascot;if((best.class==null||best.class==='')&&s.class!=null)best.class=s.class;if((best.district==null||best.district==='')&&s.district!=null)best.district=s.district;if(!best.city&&s.city)best.city=s.city;if(!best.primary&&s.primary)best.primary=s.primary;if(!best.secondary&&s.secondary)best.secondary=s.secondary}out.push(best)}
  return out;
}
function dedupeCareerSchools(save){
  if(!save?.teams?.length)return save;
  const groups=new Map();for(const t of save.teams){const key=normalizeSchoolName(t.name);(groups.get(key)||groups.set(key,[]).get(key)).push(t)}
  const idMap=new Map(),kept=[];
  for(const group of groups.values()){let canonical=group.find(t=>String(t.id)===String(save.schoolId))||group.slice().sort((a,b)=>(schoolDataScore(b)+(b.roster?.length||0))-(schoolDataScore(a)+(a.roster?.length||0)))[0];for(const t of group)idMap.set(String(t.id),String(canonical.id));kept.push(canonical)}
  if(kept.length===save.teams.length)return save;
  const remap=id=>id==null?id:(idMap.get(String(id))||id);
  save.teams=kept;save.schoolId=remap(save.schoolId);
  for(const g of save.schedule||[])g.opponentId=remap(g.opponentId);
  for(const g of save.seasonEngine?.games||[]){g.team1Id=remap(g.team1Id);g.team2Id=remap(g.team2Id);g.winnerId=remap(g.winnerId)}
  for(const t of save.tournaments||[]){t.teams=[...new Set((t.teams||[]).map(remap).map(String))];t.championId=remap(t.championId);for(const r of t.rounds||[])for(const m of r.matches||[]){m.team1Id=remap(m.team1Id);m.team2Id=remap(m.team2Id);m.winnerId=remap(m.winnerId)}}
  if(save.teamSchedules&&typeof save.teamSchedules==='object'){const rebuilt={};for(const [id,games] of Object.entries(save.teamSchedules)){const nid=String(remap(id));rebuilt[nid]=rebuilt[nid]||[];for(const g of games||[]){if(g.opponentId)g.opponentId=remap(g.opponentId);rebuilt[nid].push(g)}}save.teamSchedules=rebuilt}
  save.schoolDedupedAt=new Date().toISOString();return save;
}
directory=dedupeSchoolList(directory);
function rosterPack(){return window.BM27_REAL_ROSTERS||{season:'2025-2026',schools:{}}}
function realRosterEntry(team){const schools=rosterPack().schools||{};const key=normalizeSchoolName(team?.name);if(schools[key])return schools[key];const aliases={'de smet jesuit':'de smet jesuit','st louis university high':'st louis university high','lafayette wildwood':'lafayette wildwood'};return schools[aliases[key]]||null}
function applyRealRosters(save){
  if(!save?.teams)return save;
  let covered=0,verifiedPlayers=0;
  save.teams.forEach(team=>{
    const entry=realRosterEntry(team);if(!entry?.players?.length)return;
    const base=Array.from({length:Math.max(13,entry.players.length)},(_,i)=>makePlayer(team,i,save.season));
    entry.players.forEach((rp,i)=>{base[i].name=rp.name;base[i].realRoster=true;if(rp.pos)base[i].pos=rp.pos;if(rp.grade)base[i].grade=rp.grade;if(rp.height)base[i].height=rp.height});
    team.roster=base.slice(0,15);team.rating=teamRating(team.roster);team.rosterSource=entry.coverage==='complete'?'real':'mixed';team.realRosterVerifiedCount=entry.players.length;covered++;verifiedPlayers+=entry.players.length;
  });
  save.realRosterCoverage={schools:covered,players:verifiedPlayers,provider:rosterPack().provider||'Public roster data',updatedAt:rosterPack().updatedAt||null};
  return save;
}

function genSchedule(save,count=20){const me=save.teams.find(t=>String(t.id)===String(save.schoolId));if(!me)throw new Error('Selected school not found.');const peers=save.teams.filter(t=>String(t.id)!==String(me.id));const r=rng(hash(save.id+save.season+Date.now()));const nearby=peers.slice().sort((a,b)=>{const ac=String(a.class)===String(me.class)?0:1,bc=String(b.class)===String(me.class)?0:1;return ac-bc||Math.abs(Number(a.class)-Number(me.class))-Math.abs(Number(b.class)-Number(me.class))||(r()-.5)});const chosen=[];while(chosen.length<Math.min(26,count)&&peers.length){let pool=chosen.length<8?nearby:peers;let o=pool[Math.floor(r()*pool.length)];if(o)chosen.push(o)}const startDate=new Date(`${save.season}-11-27T19:00:00`);let day=0;return chosen.map((o,i)=>{day+=2+Math.floor(r()*4);const d=new Date(startDate);d.setDate(d.getDate()+day);return{id:uid(),opponentId:o.id,date:d.toISOString(),home:i%2===0,neutral:false,played:false,type:String(o.class)===String(me.class)&&String(o.district)===String(me.district)?'District':'Regular Season'}})}
function newCareer(name,schoolId,difficulty){const selected=directory.find(s=>String(s.id)===String(schoolId));if(!selected)throw new Error('Choose a valid school before starting your career.');const teams=buildUniverse(schoolId);const save={id:uid(),name,schoolId:selected.id,difficulty,createdAt:new Date().toISOString(),day:'2026-11-01T12:00:00',season:2026,teams,schedule:[],news:[],practice:'Balanced',strategy:{pace:'Balanced',defense:'Man'},history:{seasons:[],titles:0,districtTitles:0,wins:0,losses:0},program:{trust:70,morale:70,budget:65,reputation:50},meetings:[],tournaments:[],scheduleLocked:false};save.schedule=genSchedule(save,20);const team=teams.find(t=>String(t.id)===String(selected.id));save.news=[{date:save.day,text:`You were hired as head coach at ${team.name} ${team.mascot||''}.`.replace(/\s+\./,'.')},{date:save.day,text:'The 2026–27 fictional roster and schedule have been generated.'}];return save}
function compactSaveForDevice(save){
  if(!save)return save;
  const schoolId=String(save.schoolId);
  // Strip AI rosters before cloning. They are deterministic and can be regenerated when the save opens.
  const shell={...save,teams:Array.isArray(save.teams)?save.teams.map(team=>{
    if(String(team.id)===schoolId)return team;
    const compact={...team};delete compact.roster;
    compact.rosterSeed=compact.rosterSeed||`${save.id}:${save.season}:${team.id}`;
    return compact;
  }):save.teams,deviceSaveFormat:3};
  try{return JSON.parse(JSON.stringify(shell))}catch{return shell}
}
function hydrateDeviceSave(save){
  if(!save||!Array.isArray(save.teams))return save;
  const schoolId=String(save.schoolId);
  let rebuilt=false;
  for(const team of save.teams){
    if(String(team.id)===schoolId)continue;
    if(!Array.isArray(team.roster)||!team.roster.length){
      try{team.roster=Array.from({length:13},(_,i)=>{const player=makePlayer(team,i,save.season||2026);player.id=`ai-${team.id}-${save.season||2026}-${i}`;return player});rebuilt=true}catch{team.roster=[]}
    }
    if(!Number.isFinite(Number(team.rating))&&team.roster.length)team.rating=teamRating(team.roster);
  }
  if(rebuilt&&save.rosterMode==='real'&&typeof applyRealRosters==='function')try{applyRealRosters(save)}catch(e){console.warn('BM27 local roster hydration skipped',e)}
  return save
}
window.BM27FastSave={compactSave:compactSaveForDevice,hydrateSave:hydrateDeviceSave,version:'2.7.12'};
function loadSaves(){
  try{
    const parsed=JSON.parse(localStorage.getItem('mshsaa_bm27_saves')||'[]');
    saves=Array.isArray(parsed)?parsed.map(hydrateDeviceSave):[]
  }catch{saves=[]}
}
function persist(){
  if(current){
    current.updatedAt=new Date().toISOString();
    const i=saves.findIndex(s=>String(s.id)===String(current.id));
    if(i>=0)saves[i]=current;else saves.push(current)
  }
  // Write one compact device snapshot instead of serializing every AI roster several times.
  const compactSaves=saves.map(compactSaveForDevice);
  const savesJson=JSON.stringify(compactSaves);
  // Remove an older oversized emergency copy before replacing it with the compact version.
  BM27Storage.remove('mshsaa_bm27_last_good_save');
  const localOk=BM27Storage.set('mshsaa_bm27_saves',savesJson);
  if(current)BM27Storage.set('mshsaa_bm27_last_good_save',JSON.stringify(compactSaveForDevice(current)));
  window.cloudGame?.queueCurrentSave?.(current);
  return localOk
}
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200)}
function renderLauncher(readLocal=true){if(readLocal)loadSaves();directory=dedupeSchoolList(directory);$('schoolSelect').innerHTML=directory.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(s=>`<option value="${s.id}">${s.name}${s.mascot?' '+s.mascot:''} — Class ${s.class}, District ${s.district}</option>`).join('');$('saveList').innerHTML=saves.length?saves.map(s=>{const school=s.teams.find(t=>t.id===s.schoolId);return`<div class="save-card"><div class="school-swatch" style="background:${school.primary};color:${school.secondary}">${school.name.slice(0,2).toUpperCase()}</div><div><h3>${s.name}</h3><p>${school.name} • ${school.wins}-${school.losses} • ${s.rosterMode==='real'?'Real Rosters':'Generated'} • ${new Date(s.day).toLocaleDateString()}</p></div><div class="save-actions"><button class="primary" data-load="${s.id}">Play</button><button class="secondary" data-delete="${s.id}">Delete</button></div></div>`}).join(''):'<div class="card"><h3>No careers yet</h3><p class="muted">Create a save and take over a Missouri program.</p></div>';document.querySelectorAll('[data-load]').forEach(b=>b.onclick=()=>openSave(b.dataset.load));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('Delete this career permanently?')){const deletedId=b.dataset.delete;saves=saves.filter(s=>s.id!==deletedId);persist();window.cloudGame?.deleteSave(deletedId).catch(err=>toast('Cloud delete failed: '+err.message));renderLauncher()}})}
function openSave(id){current=saves.find(s=>String(s.id)===String(id));if(!current){toast('That save could not be found. Refreshing saves…');window.cloudGame?.refreshSaves?.().then(()=>renderLauncher(false)).catch(()=>{});return}current.tournaments=current.tournaments||[];$('launcher').classList.add('hidden');$('game').classList.remove('hidden');renderAll()}
function myTeam(){return current.teams.find(t=>t.id===current.schoolId)}function opponent(g){return current.teams.find(t=>t.id===g.opponentId)||(window.BM27ResolveNationalTeam?window.BM27ResolveNationalTeam(g?.opponentId||g?.nationalOpponentId):null)}
function renderAll(){const me=myTeam();$('sideSchool').textContent=me.name;$('currentDate').textContent=new Date(current.day).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});$('teamHero').style.background=`linear-gradient(110deg,${me.primary},${me.secondary})`;$('teamHero').innerHTML=`<div><p class="eyebrow">CLASS ${me.class} • DISTRICT ${me.district}</p><h1>${me.name}${me.mascot?' '+me.mascot:''}</h1><p>${me.wins}-${me.losses} • ${current.strategy.pace} pace • ${current.strategy.defense}</p></div><div class="hero-rating">${me.rating}</div>`;$('dashboardMetrics').innerHTML=[['Record',`${me.wins}-${me.losses}`],['Team OVR',me.rating],['State Rank','#'+getRank(me)],['Save Season','2026–27']].map(x=>`<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');renderNext();renderNews();renderRoster();renderSchedule();renderTournamentCenter();renderStandings();renderRankings();repairRecords();renderOffice();renderMeetings();renderHistory();persist()}
function getRank(team){return current.teams.slice().sort((a,b)=>power(b)-power(a)).findIndex(t=>t.id===team.id)+1}function power(t){return t.rating+t.wins*1.8-t.losses*.7+(t.pf-t.pa)/Math.max(1,t.wins+t.losses)/8}
function nextUnplayed(){return current.schedule.find(g=>!g.played)}function renderNext(){const games=current.schedule.filter(g=>!g.played).slice(0,5);$('nextGame').innerHTML=games.length?games.map(g=>{const o=opponent(g);const mark=o?(window.BM27Branding255?.html?.(o.name,'nextFiveLogo')||window.BM27Logos252?.html?.(o.name,'nextFiveLogo')||''):'';return `<div class="row next-five-row"><div class="next-five-team">${mark}<div><b>${g.home?'vs':'at'} ${o?.name||'TBD'}${o?.mascot?' '+o.mascot:''}</b><br><small>${new Date(g.date).toLocaleString()} • ${g.type}</small></div></div>${o?`<span class="tag">${o.rating} OVR</span>`:''}</div>`}).join(''):'<p class="muted">Regular season complete.</p>';$('playNextBtn').disabled=!games.length}
function renderNews(){$('newsFeed').innerHTML=current.news.slice(-6).reverse().map(n=>`<div class="row"><div>${n.text}<br><small>${new Date(n.date).toLocaleDateString()}</small></div></div>`).join('')}
function renderRoster(){const me=myTeam();$('rosterTable').innerHTML=`<table><thead><tr><th>Player</th><th>Pos</th><th>Grade</th><th>HT</th><th>OVR</th><th>SHT</th><th>FIN</th><th>DEF</th><th>PASS</th><th>REB</th><th>ATH</th><th>MIN</th></tr></thead><tbody>${me.roster.slice().sort((a,b)=>b.minutes-a.minutes).map(p=>`<tr><td><b>${p.name}</b></td><td>${p.pos}</td><td>${p.grade}</td><td>${p.height}</td><td class="rating">${p.overall}</td><td>${p.shooting}</td><td>${p.finishing}</td><td>${p.defense}</td><td>${p.passing}</td><td>${p.rebounding}</td><td>${p.athleticism}</td><td><input type="number" min="0" max="36" value="${p.minutes}" data-minutes="${p.id}" style="width:70px"></td></tr>`).join('')}</tbody></table>`;document.querySelectorAll('[data-minutes]').forEach(i=>i.onchange=()=>{const p=me.roster.find(x=>x.id===i.dataset.minutes);p.minutes=clamp(Number(i.value)||0,0,36);persist()})}
function scheduleEditable(){return current&&!current.schedule.some(g=>g.played)}
function renderSchedule(){const editable=scheduleEditable();current.tournaments=current.tournaments||[];$('scheduleHelp').textContent=editable?`Preseason scheduling is open. ${current.schedule.length}/26 games scheduled. Use the arrows to reorder games.`:'The schedule is locked because the season has started.';['aiScheduleBtn','addGameBtn','addTbdBtn','addTournamentBtn'].forEach(id=>{if($(id))$(id).disabled=!editable});$('scheduleList').innerHTML=current.schedule.length?current.schedule.map((g,i)=>{const o=g.tbd?null:opponent(g);const place=g.neutral?'Neutral':g.home?'vs':'at';const tournament=g.tournamentId?current.tournaments.find(t=>t.id===g.tournamentId):null;return`<div class="row schedule-row" data-opponent-id="${o?.id||''}"><div class="schedule-order">${editable&&!g.played?`<button class="secondary small-btn" data-move="up" data-game="${g.id}" ${i===0?'disabled':''}>↑</button><button class="secondary small-btn" data-move="down" data-game="${g.id}" ${i===current.schedule.length-1?'disabled':''}>↓</button>`:''}</div><div class="grow"><b>${g.tbd?'TBD Tournament Opponent':`${o?(window.BM27Branding255?.html?.(o.name,'scheduleOpponentLogo')||window.BM27Logos252?.html?.(o.name,'scheduleOpponentLogo')||''):''}<span>${place} ${o?.name||'Unknown School'}${o?.mascot?' '+o.mascot:''}</span>`}</b><br><small>${new Date(g.date).toLocaleDateString()} • ${tournament?tournament.name+' • ':''}${g.roundName||g.type}${o?(o.outOfState?` • ${o.state||'Out of State'}`:` • Class ${o.class}`):''}</small></div>${g.played?`<strong class="${g.myScore>g.oppScore?'win':'loss'}">${g.myScore>g.oppScore?'W':'L'} ${g.myScore}-${g.oppScore}</strong>`:editable?`<button class="secondary small-btn" data-remove-game="${g.id}">Remove</button>`:'<span class="tag">Upcoming</span>'}</div>`}).join(''):'<div class="card"><h3>No games scheduled</h3><p class="muted">Use AI Make Schedule, Add Game, Add Tournament, or Add TBD.</p></div>';document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>moveScheduleGame(b.dataset.game,b.dataset.move));document.querySelectorAll('[data-remove-game]').forEach(b=>b.onclick=()=>{const g=current.schedule.find(x=>x.id===b.dataset.removeGame);if(g?.tournamentId){current.tournaments=current.tournaments.filter(t=>t.id!==g.tournamentId);current.schedule=current.schedule.filter(x=>x.tournamentId!==g.tournamentId)}else current.schedule=current.schedule.filter(x=>x.id!==b.dataset.removeGame);renderSchedule();renderTournaments();persist();toast('Schedule updated and saved.')});renderTournaments()}
function moveScheduleGame(id,direction){if(!scheduleEditable())return;const i=current.schedule.findIndex(g=>g.id===id),j=direction==='up'?i-1:i+1;if(i<0||j<0||j>=current.schedule.length)return;const dateA=current.schedule[i].date,dateB=current.schedule[j].date;[current.schedule[i],current.schedule[j]]=[current.schedule[j],current.schedule[i]];current.schedule[i].date=dateA;current.schedule[j].date=dateB;renderSchedule();persist();toast('Game order saved.')}
function tournamentRoundNames(size){return size===8?['Quarterfinal','Semifinal','Championship']:['Semifinal','Championship']}
function openTournamentDialog(){if(!scheduleEditable())return toast('Schedule is locked.');if(current.schedule.length>23)return toast('Leave at least 3 open game slots for a tournament.');const d=new Date(current.day);d.setDate(d.getDate()+14);$('tournamentStart').value=d.toISOString().slice(0,10);$('tournamentDialog').showModal()}
function createTournament(name,size,startDate,preset){const rounds=tournamentRoundNames(size),needed=rounds.length;if(current.schedule.length+needed>26)throw new Error(`This tournament needs ${needed} schedule slots.`);const pool=current.teams.filter(t=>t.id!==current.schoolId).sort(()=>Math.random()-.5).slice(0,size-1);const path=[];let candidates=pool.slice();for(let r=0;r<rounds.length;r++){candidates.sort((a,b)=>b.rating-a.rating);path.push(candidates[Math.min(r,candidates.length-1)]?.id||pool[0].id)}const t={id:uid(),name:name||preset,size,preset,createdAt:new Date().toISOString(),status:'Scheduled',rounds:rounds.map((round,i)=>({name:round,opponentId:path[i],result:null})),teams:[current.schoolId,...pool.map(x=>x.id)]};current.tournaments.push(t);const base=new Date(startDate+'T18:00:00');rounds.forEach((round,i)=>{const d=new Date(base);d.setDate(d.getDate()+i*2);current.schedule.push({id:uid(),opponentId:i===0?path[0]:null,tbd:i>0,date:d.toISOString(),home:false,neutral:true,played:false,type:'Tournament',tournamentId:t.id,tournamentRound:i,roundName:round})});current.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));persist();renderSchedule();toast(`${t.name} added to the schedule.`)}
function updateTournamentAfterGame(g){if(!g.tournamentId)return;const t=current.tournaments.find(x=>x.id===g.tournamentId);if(!t)return;const round=t.rounds[g.tournamentRound];round.result={won:g.myScore>g.oppScore,myScore:g.myScore,oppScore:g.oppScore,opponentId:g.opponentId};if(g.myScore>g.oppScore){const next=current.schedule.find(x=>x.tournamentId===t.id&&x.tournamentRound===g.tournamentRound+1);if(next){next.opponentId=t.rounds[g.tournamentRound+1].opponentId;next.tbd=false;t.status=`Advanced to ${next.roundName}`}else t.status='Champion'}else{t.status=`Eliminated in ${g.roundName}`;current.schedule=current.schedule.filter(x=>!(x.tournamentId===t.id&&!x.played&&x.tournamentRound>g.tournamentRound))}}
function renderTournaments(){const el=$('tournamentList');if(!el||!current)return;current.tournaments=current.tournaments||[];el.innerHTML=current.tournaments.length?current.tournaments.map(t=>`<article class="card"><div class="row"><div><p class="eyebrow">${t.size}-TEAM TOURNAMENT</p><h3>${t.name}</h3></div><span class="tag">${t.status}</span></div><div class="bracket-grid">${t.rounds.map((r,i)=>{const o=current.teams.find(x=>x.id===r.opponentId);return`<div class="bracket-round"><small>${r.name}</small><b>${r.result?(r.result.won?'W ':'L ')+r.result.myScore+'-'+r.result.oppScore:(i===0||t.rounds[i-1]?.result?.won?o?.name||'TBD':'TBD')}</b></div>`}).join('')}</div></article>`).join(''):'<p class="muted">No tournaments entered.</p>'} 
function districtTeams(){const me=myTeam();return current.teams.filter(t=>String(t.class)===String(me.class)&&String(t.district)===String(me.district))}function renderStandings(){const teams=districtTeams().sort((a,b)=>b.wins-a.wins||a.losses-b.losses||power(b)-power(a));$('standingsTable').innerHTML=`<table><thead><tr><th>#</th><th>School</th><th>Record</th><th>OVR</th><th>PF</th><th>PA</th></tr></thead><tbody>${teams.map((t,i)=>`<tr><td>${i+1}</td><td><b>${t.name}</b></td><td>${t.wins}-${t.losses}</td><td>${t.rating}</td><td>${t.pf}</td><td>${t.pa}</td></tr>`).join('')}</tbody></table>`}
function renderRankings(){const teams=current.teams.slice().sort((a,b)=>power(b)-power(a)).slice(0,50);$('rankingsTable').innerHTML=`<table><thead><tr><th>Rank</th><th>School</th><th>Class</th><th>District</th><th>Record</th><th>Power</th></tr></thead><tbody>${teams.map((t,i)=>`<tr><td>${i+1}</td><td><b>${t.name}</b></td><td>${t.class}</td><td>${t.district}</td><td>${t.wins}-${t.losses}</td><td>${power(t).toFixed(1)}</td></tr>`).join('')}</tbody></table>`}
function renderOffice(){const focuses=['Balanced','Shooting','Defense','Athleticism','Ball Handling','Rebounding'];$('practiceChoices').innerHTML=focuses.map(f=>`<button class="choice ${current.practice===f?'active':''}" data-focus="${f}"><b>${f}</b><br><span class="muted small">Daily development boost</span></button>`).join('');document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{current.practice=b.dataset.focus;renderOffice();persist()});$('paceSelect').value=current.strategy.pace;$('defenseSelect').value=current.strategy.defense}
function renderHistory(){const h=current.history;$('historyContent').innerHTML=`<div class="history-grid"><div class="metric"><span>Career Wins</span><b>${h.wins}</b></div><div class="metric"><span>Career Losses</span><b>${h.losses}</b></div><div class="metric"><span>District Titles</span><b>${h.districtTitles||0}</b></div><div class="metric"><span>State Titles</span><b>${h.titles}</b></div></div><div class="card" style="margin-top:15px"><h3>Completed Seasons</h3>${h.seasons.length?h.seasons.map(s=>`<div class="row"><b>${s.year}</b><span>${s.record}</span></div>`).join(''):'<p class="muted">Your first season is in progress.</p>'}</div>${current.schedule.length&&current.schedule.every(g=>g.played)?'<button id="nextSeasonBtn" class="primary wide" style="margin-top:15px">Begin Offseason / Next Season</button>':''}`;if($('nextSeasonBtn'))$('nextSeasonBtn').onclick=()=>{if(window.BM27V2736?.advancePhase)return window.BM27V2736.advancePhase();return applyOffseason?.()}}
function develop(){const me=myTeam(),r=Math.random;me.roster.forEach(p=>{if(r()<.18){let key=current.practice==='Shooting'?'shooting':current.practice==='Defense'?'defense':current.practice==='Athleticism'?'athleticism':current.practice==='Ball Handling'?'passing':current.practice==='Rebounding'?'rebounding':['shooting','finishing','defense','passing','rebounding','athleticism'][Math.floor(r()*6)];p[key]=clamp(p[key]+1,35,p.potential);p.overall=Math.round((p.shooting+p.finishing+p.defense+p.passing+p.rebounding+p.athleticism)/6)}});me.rating=teamRating(me.roster)}
function simOtherGames(){}
function simulateGame(g){if(g.tbd&&!g.opponentId){const pool=current.teams.filter(t=>t.id!==current.schoolId);g.opponentId=pool[Math.floor(Math.random()*pool.length)].id;g.tbd=false;}const me=myTeam(),opp=opponent(g),homeBoost=g.home?2:-1,diff=me.rating-opp.rating+homeBoost+(current.difficulty==='Freshman'?5:current.difficulty==='All-State'?-4:0);let my=Math.round(62+me.rating*.18+diff*.35+(Math.random()-.5)*20),os=Math.round(62+opp.rating*.18-diff*.25+(Math.random()-.5)*20);if(my===os)my++;g.played=true;g.myScore=my;g.oppScore=os;me.pf+=my;me.pa+=os;opp.pf+=os;opp.pa+=my;if(my>os){me.wins++;opp.losses++;current.history.wins++;current.news.push({date:g.date,text:`${me.name} defeated ${opp.name}, ${my}-${os}.`})}else{me.losses++;opp.wins++;current.history.losses++;current.news.push({date:g.date,text:`${me.name} fell to ${opp.name}, ${my}-${os}.`})}current.day=g.date;const stars=me.roster.slice().sort((a,b)=>b.overall-a.overall).slice(0,3);const pbp=[`Opening tip controlled by ${g.home?me.name:opp.name}.`,`${stars[0].name} attacks the rim early.`,`${opp.name} answers with a run before halftime.`,`${stars[1].name} hits a key second-half shot.`,my>os?`${me.name} closes the game at the free-throw line.`:`${opp.name} makes the final defensive stop.`];$('gameResult').innerHTML=`<div class="scoreboard"><p class="eyebrow">FINAL</p><h2>${my>os?'Victory':'Defeat'}</h2><div class="scoreline"><div>${me.name}</div><b>${my}</b><span>–</span><b>${os}</b><div>${opp.name}</div></div><div class="play-by-play">${pbp.map(x=>`<div class="row">${x}</div>`).join('')}</div></div>`;$('gameDialog').showModal();updateTournamentAfterGame(g);renderAll()}
function advance(days=1){for(let d=0;d<days;d++){const date=new Date(current.day);date.setDate(date.getDate()+1);current.day=date.toISOString();develop();const due=current.schedule.find(g=>!g.played&&new Date(g.date)<=date);if(due)simulateGame(due)}renderAll()}

function ensureProgram(){current.program=current.program||{trust:70,morale:70,budget:65,reputation:50};current.meetings=current.meetings||[]}
const MEETING_TEMPLATES=[
 {who:'Athletic Director',text:'The athletic director wants a tougher non-conference schedule next season.',choices:[['Agree',{trust:6,reputation:3}],['Protect the record',{trust:-3,morale:2}]]},
 {who:'Team Captain',text:'The captain asks for a lighter practice before the next game.',choices:[['Give players rest',{morale:7,trust:2}],['Keep practice intense',{morale:-4,reputation:2}]]},
 {who:'Booster Club',text:'Boosters offer support if the program hosts a showcase game.',choices:[['Accept showcase plan',{budget:8,reputation:5}],['Stay focused',{trust:2}]]},
 {who:'Assistant Coach',text:'An assistant suggests changing the defensive identity.',choices:[['Try the change',{trust:3,morale:2}],['Keep the system',{reputation:2}]]}
];
function generateMeeting(){ensureProgram();const t=MEETING_TEMPLATES[Math.floor(Math.random()*MEETING_TEMPLATES.length)];current.meetings.unshift({id:uid(),date:current.day,who:t.who,text:t.text,choices:t.choices,resolved:false});renderMeetings();persist()}
function renderMeetings(){if(!current)return;ensureProgram();$('programMetrics').innerHTML=Object.entries(current.program).map(([k,v])=>`<div class="metric"><span>${k[0].toUpperCase()+k.slice(1)}</span><b>${v}</b></div>`).join('');$('meetingsList').innerHTML=current.meetings.length?current.meetings.map(m=>`<article class="card"><p class="eyebrow">${m.who}</p><h3>${m.text}</h3>${m.resolved?`<p class="muted">Decision: ${m.decision}</p>`:`<div class="account-actions">${m.choices.map((c,i)=>`<button class="secondary" data-meeting="${m.id}" data-choice="${i}">${c[0]}</button>`).join('')}</div>`}</article>`).join(''):'<div class="card"><h3>No active meetings</h3><p class="muted">Advance time or generate a meeting.</p></div>';document.querySelectorAll('[data-meeting]').forEach(b=>b.onclick=()=>{const m=current.meetings.find(x=>x.id===b.dataset.meeting);const c=m.choices[Number(b.dataset.choice)];Object.entries(c[1]).forEach(([k,v])=>current.program[k]=clamp((current.program[k]||0)+v,0,100));m.resolved=true;m.decision=c[0];current.news.push({date:current.day,text:`Meeting decision: ${c[0]} (${m.who}).`});renderAll();toast('Decision saved.')})}
function aiMakeSchedule(){if(!scheduleEditable())return toast('Schedule is locked.');current.schedule=genSchedule(current,22);renderSchedule();persist();toast('AI created a 22-game cross-class schedule.')}
function openScheduleDialog(){if(!scheduleEditable())return toast('Schedule is locked.');if(current.schedule.length>=26)return toast('The 26-game limit has been reached.');$('scheduleOpponent').innerHTML=current.teams.filter(t=>t.id!==current.schoolId).sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${t.id}">${t.name}${t.mascot?' '+t.mascot:''} — Class ${t.class}</option>`).join('');const d=new Date(current.day);d.setDate(d.getDate()+7);$('scheduleDate').value=d.toISOString().slice(0,10);$('scheduleDialog').showModal()}
function addTbdGame(){if(!scheduleEditable())return toast('Schedule is locked.');if(current.schedule.length>=26)return toast('The 26-game limit has been reached.');const d=new Date(current.day);d.setDate(d.getDate()+7+current.schedule.length*3);current.schedule.push({id:uid(),tbd:true,opponentId:null,date:d.toISOString(),home:false,neutral:true,played:false,type:'Tournament'});renderSchedule();persist();toast('TBD tournament game added and saved.')}
function recalcRecord(team){const games=current.schedule.filter(g=>g.played&&(team.id===current.schoolId||g.opponentId===team.id));let w=0,l=0,pf=0,pa=0;for(const g of games){const isMe=team.id===current.schoolId;const scored=isMe?g.myScore:g.oppScore,allowed=isMe?g.oppScore:g.myScore;pf+=scored;pa+=allowed;if(scored>allowed)w++;else l++}team.wins=w;team.losses=l;team.pf=pf;team.pa=pa}
function repairRecords(){current.teams.forEach(recalcRecord);current.history.wins=myTeam().wins;current.history.losses=myTeam().losses}
function applyOffseason(){if(current.schedule.some(g=>!g.played))return toast('Finish the season first.');const byDistrict={};current.teams.forEach(t=>{const k=`${t.class}-${t.district}`;(byDistrict[k]??=[]).push(t)});Object.values(byDistrict).forEach(group=>{group.sort((a,b)=>b.wins-a.wins||b.rating-a.rating);const best=group[0],worst=group[group.length-1];if(best&&Number(best.class)<6)best.class=String(Number(best.class)+1);if(worst&&Number(worst.class)>1&&worst!==best)worst.class=String(Number(worst.class)-1)});current.teams.forEach(t=>{const returning=[];t.roster.forEach(p=>{if(p.grade<12){p.grade++;const growth=Math.max(-2,Math.round((p.potential-p.overall)/12+(Math.random()*3-1)));['shooting','finishing','defense','passing','rebounding','athleticism'].forEach(k=>p[k]=clamp(p[k]+growth,35,99));p.overall=Math.round((p.shooting+p.finishing+p.defense+p.passing+p.rebounding+p.athleticism)/6);returning.push(p)}});while(returning.length<13)returning.push(makePlayer(t,returning.length,current.season+1));t.roster=returning;t.rating=teamRating(t.roster);t.wins=t.losses=t.pf=t.pa=0});const me=myTeam();current.history.seasons.push({year:`${current.season}-${String(current.season+1).slice(-2)}`,record:`${current.history.wins}-${current.history.losses}`});current.season++;current.day=`${current.season}-05-30T12:00:00`;current.schedule=genSchedule(current,20);current.scheduleLocked=false;current.news.push({date:current.day,text:'Offseason complete: players developed, seniors graduated, and class movement was applied.'});generateMeeting();renderAll();toast('New season created and saved.')}
$('newSaveBtn').onclick=()=>{if(window.cloudGame?.configured&&!window.cloudGame?.signedIn){toast('Sign in before creating a server save.');return}$('newSaveDialog').showModal()};$('newSaveForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter||$('newSaveForm').querySelector('button.primary');const original=button?.textContent||'Start Career';if(button){button.disabled=true;button.textContent='Creating Career…'}let s=null;try{s=newCareer($('saveName').value.trim()||'New Career',$('schoolSelect').value,$('difficultySelect').value,$('rosterModeSelect')?.value||'generated');const requestedMode=localStorage.getItem('bm27-selected-mode')||'season';s.gameMode=['season','dynasty','myschool'].includes(requestedMode)?requestedMode:'season';s.modeVersion=2530;saves=saves.filter(x=>x.id!==s.id);saves.unshift(s);BM27Storage.set('mshsaa_bm27_saves',JSON.stringify(saves.map(compactSaveForDevice)));$('newSaveDialog').close();if(s.gameMode==='dynasty'){current=s;$('launcher')?.classList.add('hidden');$('sportsShell')?.classList.add('hidden');window.BM27Dynasty249?.open?.(s)}else{openSave(s.id)}toast(window.cloudGame?.configured&&window.cloudGame?.signedIn?'Career created and saved.':'Career created and saved on this device.');if(window.cloudGame?.configured&&window.cloudGame?.signedIn)window.cloudGame.forceSave(s).catch(err=>{console.error('New career cloud sync failed',err);toast('Career saved. Account update will retry automatically.')})}catch(err){console.error('Career creation failed',err);if(s&&!current){saves=saves.filter(x=>x.id!==s.id);BM27Storage.set('mshsaa_bm27_saves',JSON.stringify(saves.map(compactSaveForDevice)))}toast('Could not start career: '+(window.cloudGame?.errorText?.(err)||err.message||'Unknown error'))}finally{if(button){button.disabled=false;button.textContent=original}}};$('backToSaves').onclick=()=>{persist();current=null;$('game').classList.add('hidden');$('launcher').classList.remove('hidden');renderLauncher()};$('menuBtn').onclick=()=>$('game').classList.toggle('menu-open');document.querySelectorAll('.nav[data-page]').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav[data-page]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(b.dataset.page+'Page').classList.add('active');$('pageTitle').textContent=b.textContent;$('game').classList.remove('menu-open')});$('advanceBtn').onclick=()=>advance(1);$('simWeekBtn').onclick=()=>advance(7);$('playNextBtn').onclick=()=>{const g=nextUnplayed();if(g)simulateGame(g)};$('closeGameDialog').onclick=()=>$('gameDialog').close();$('autoLineupBtn').onclick=()=>{const r=myTeam().roster.slice().sort((a,b)=>b.overall-a.overall);r.forEach((p,i)=>p.minutes=i<5?30-i:i<9?12:4);renderAll();toast('Best available lineup selected.')};$('saveStrategyBtn').onclick=()=>{current.strategy={pace:$('paceSelect').value,defense:$('defenseSelect').value};renderAll();toast('Strategy saved.')};$('aiScheduleBtn').onclick=aiMakeSchedule;$('addGameBtn').onclick=openScheduleDialog;$('addTbdBtn').onclick=addTbdGame;$('addTournamentBtn').onclick=openTournamentDialog;$('newMeetingBtn').onclick=generateMeeting;$('tournamentForm').onsubmit=e=>{e.preventDefault();try{const preset=$('tournamentPreset').value,size=Number($('tournamentSize').value);const defaultName=preset==='holiday'?'Holiday Classic':preset==='showme'?'Show-Me Shootout':preset==='district'?'District Preview Classic':'Custom Tournament';createTournament($('tournamentName').value.trim()||defaultName,size,$('tournamentStart').value,preset,undefined,{format:$('tournamentFormat')?.value||'single'});$('tournamentDialog').close()}catch(err){toast(err.message)}};$('scheduleForm').onsubmit=e=>{e.preventDefault();if(current.schedule.length>=26)return toast('26-game limit reached.');const loc=$('scheduleLocation').value;current.schedule.push({id:uid(),opponentId:$('scheduleOpponent').value,date:new Date($('scheduleDate').value+'T19:00:00').toISOString(),home:loc==='home',neutral:loc==='neutral',played:false,type:$('scheduleType').value});current.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));$('scheduleDialog').close();renderSchedule();persist();toast('Game added and saved.')};
$('syncDirectoryBtn').onclick=async()=>{if(!window.cloudGame?.isAdmin){toast('Only administrators can sync schools.');return}const status=$('syncStatus'),button=$('syncDirectoryBtn');button.disabled=true;status.textContent='Downloading 2025–26 class and district assignments…';try{const res=await fetch('/.netlify/functions/sync-schools',{cache:'no-store'});let data={};try{data=await res.json()}catch{}if(!res.ok)throw new Error(data.error||`School sync returned ${res.status}`);if(!Array.isArray(data.schools)||data.schools.length<1)throw new Error(data.error||'The school list was empty.');directory=dedupeSchoolList(data.schools);BM27Storage.set('mshsaa_bm27_directory',JSON.stringify(directory));if(window.cloudGame?.signedIn)await window.cloudGame.saveSchoolsToServer(directory);status.textContent=data.liveSync===false?`Loaded ${directory.length} bundled schools. Live MSHSAA sync was unavailable, but the school directory is working.`:`Synced ${directory.length} schools for 2025–26 and saved the directory to Supabase.`;renderLauncher(false);toast('School directory sync complete.')}catch(e){console.error(e);status.textContent=`Sync failed: ${window.cloudGame?.errorText?.(e)||e.message||'Unknown error'}`;toast('School sync could not finish.')}finally{button.disabled=false}};


function tournamentCanCreate(){
  return !!current && scheduleEditable() && current.schedule.length <= 24;
}
function tournamentTeamName(id){
  const t=current?.teams?.find(x=>String(x.id)===String(id));
  return t ? `${t.name}${t.mascot?' '+t.mascot:''}` : 'TBD';
}
function renderTournamentCenter(){
  const status=$('tournamentHubStatus'), list=$('tournamentHubList');
  if(!status||!list||!current)return;
  current.tournaments=current.tournaments||[];
  const slots=Math.max(0,26-current.schedule.length);
  status.innerHTML=`<div class="row"><div><b>${scheduleEditable()?'Tournament entry is open':'Tournament entry is locked'}</b><br><small>${slots} of 26 schedule slots remain. A 4-team event uses 2 games; an 8-team event uses 3 games.</small></div><span class="tag">${current.tournaments.length} entered</span></div>`;
  const btn=$('createTournamentHubBtn'); if(btn)btn.disabled=!tournamentCanCreate();
  list.innerHTML=current.tournaments.length?current.tournaments.map(t=>{
    const rounds=t.rounds||[];
    return `<article class="card tournament-card"><div class="section-head"><div><p class="eyebrow">${t.size}-TEAM BRACKET</p><h3>${t.name}</h3></div><span class="tag">${t.status||'Scheduled'}</span></div>
      <div class="full-bracket">${rounds.map((r,i)=>`<div class="bracket-stage"><small>${r.name}</small><div class="bracket-match"><span>${tournamentTeamName(current.schoolId)}</span><b>vs</b><span>${r.result?tournamentTeamName(r.result.opponentId):(i===0||rounds[i-1]?.result?.won?tournamentTeamName(r.opponentId):'TBD')}</span></div><div class="bracket-result">${r.result?`${r.result.won?'WIN':'LOSS'} ${r.result.myScore}-${r.result.oppScore}`:'Scheduled'}</div></div>`).join('<div class="bracket-arrow">→</div>')}</div>
      ${scheduleEditable()?`<button class="secondary wide" data-remove-tournament="${t.id}">Remove Tournament</button>`:''}</article>`
  }).join(''):`<article class="card empty-tournament"><h3>No tournaments entered</h3><p class="muted">Press Create / Enter Tournament to add a premade Holiday Classic, Show-Me Shootout, District Preview Classic, or your own custom event.</p><button id="emptyCreateTournamentBtn" class="primary">Create First Tournament</button></article>`;
  document.querySelectorAll('[data-remove-tournament]').forEach(b=>b.onclick=()=>{
    if(!scheduleEditable())return toast('The schedule is locked.');
    current.tournaments=current.tournaments.filter(t=>t.id!==b.dataset.removeTournament);
    current.schedule=current.schedule.filter(g=>g.tournamentId!==b.dataset.removeTournament);
    renderAll(); toast('Tournament removed and save updated.');
  });
  const empty=$('emptyCreateTournamentBtn'); if(empty){empty.disabled=!tournamentCanCreate();empty.onclick=openTournamentDialog}
}
const tournamentHubBtn=$('createTournamentHubBtn');if(tournamentHubBtn)tournamentHubBtn.onclick=openTournamentDialog;

/* =========================
   VERSION 1.0 OFFICIAL RELEASE
   Backward-compatible save migration + tryouts, recruiting, tournaments and leagues
   ========================= */
const V10={version:10,varsityMin:13,varsityMax:15,tryoutPool:50,regularMax:26,leagueMax:10};
function v10GradeLabel(g){return ({9:'Freshman',10:'Sophomore',11:'Junior',12:'Senior'})[Number(g)]||`Grade ${g}`}
function migrateV10(save){
  if(!save)return save;
  save.dataVersion=10;
  save.tournaments=save.tournaments||[];
  save.leagues=save.leagues||{summer:[],fall:[]};
  save.recruiting=save.recruiting||{visits:[],commitments:[],actions:[]};
  save.staff=save.staff||{assistant:60,scouting:55,development:58};
  save.facilities=save.facilities||{gym:55,weightRoom:50,filmRoom:50};
  save.goals=save.goals||[{text:'Finish with a winning record',done:false},{text:'Develop one player by 5 OVR',done:false}];
  save.awards=save.awards||[];
  save.history=save.history||{seasons:[],titles:0,wins:0,losses:0};
  save.history.districtTitles=Number(save.history.districtTitles)||0;
  save.tryoutsFinalized=save.tryoutsFinalized ?? true;
  save.tryoutPool=save.tryoutPool||[];
  save.teams?.forEach(t=>{
    t.roster=t.roster||[];
    t.roster.forEach(p=>{p.offers=p.offers||[];p.interest=p.interest||{};p.committed=p.committed||null;p.stats=p.stats||{games:0,points:0,rebounds:0,assists:0};p.overall=p.overall||Math.round((p.shooting+p.finishing+p.defense+p.passing+p.rebounding+p.athleticism)/6)});
  });
  return save;
}
const originalOpenSaveV10=openSave;
openSave=function(id){const s=saves.find(x=>x.id===id);if(s)migrateV10(s);originalOpenSaveV10(id)};
const originalNewCareerV10=newCareer;
newCareer=function(name,schoolId,difficulty,rosterMode='generated'){
  const save=migrateV10(originalNewCareerV10(name,schoolId,difficulty));
  save.rosterMode=rosterMode==='real'?'real':'generated';
  save.realRosterMode=save.rosterMode==='real';
  const team=save.teams.find(t=>String(t.id)===String(save.schoolId));
  if(save.rosterMode==='real'){
    applyRealRosters(save);
    save.tryoutsFinalized=true;
    save.tryoutPool=[];
    save.scheduleLocked=false;
    save.schedule=genSchedule(save,20);
    const entry=realRosterEntry(team);
    const count=entry?.players?.length||0;
    save.news.push({date:save.day,text:count?`Real Roster Mode enabled. ${count} ${team.name} player name${count===1?'':'s'} verified from public 2025–26 coverage; uncovered roster slots use simulated players and ratings.`:'Real Roster Mode enabled, but this school is not yet in the verified roster pack. Generated players are being used until roster data is available.'});
  }else{
    save.tryoutsFinalized=false;
    save.schedule=[];
    save.tryoutPool=Array.from({length:V10.tryoutPool},(_,i)=>{const p=makePlayer(team,i,save.season);p.id=uid();p.minutes=0;p.selected=false;p.grade=9+Math.floor(Math.random()*4);p.overall=clamp(p.overall+Math.floor(Math.random()*9)-4,44,94);p.potential=clamp(Math.max(p.overall,p.potential),p.overall,99);return p});
    team.roster=[];team.rating=0;
    save.news.push({date:save.day,text:'Fifty students reported for tryouts. Select 13–15 players before building the schedule.'});
  }
  return save;
};
function ensureTryoutPool(){if(!current.tryoutPool?.length&&!current.tryoutsFinalized){const team=myTeam();current.tryoutPool=Array.from({length:50},(_,i)=>{const p=makePlayer(team,i,current.season);p.selected=false;p.minutes=0;return p})}}
function renderTryouts(){
  const table=$('tryoutTable');if(!table||!current)return;ensureTryoutPool();
  const selected=current.tryoutPool.filter(p=>p.selected).length;
  $('tryoutCount').textContent=`${selected}/${V10.varsityMax} selected`;
  const locked=current.tryoutsFinalized;
  $('tryoutActions').classList.toggle('hidden',locked);
  table.innerHTML=locked?`<div class="card"><h3>Varsity roster finalized</h3><p class="muted">Tryouts are complete for this season. Use the Roster page to manage minutes and development.</p></div>`:`<table><thead><tr><th>Pick</th><th>Player</th><th>Pos</th><th>Grade</th><th>OVR</th><th>POT</th><th>SHT</th><th>FIN</th><th>DEF</th><th>PASS</th><th>REB</th><th>ATH</th></tr></thead><tbody>${current.tryoutPool.slice().sort((a,b)=>b.overall-a.overall).map(p=>`<tr><td><input type="checkbox" data-tryout="${p.id}" ${p.selected?'checked':''}></td><td><b>${p.name}</b></td><td>${p.pos}</td><td>${v10GradeLabel(p.grade)}</td><td class="rating">${p.overall}</td><td>${p.potential}</td><td>${p.shooting}</td><td>${p.finishing}</td><td>${p.defense}</td><td>${p.passing}</td><td>${p.rebounding}</td><td>${p.athleticism}</td></tr>`).join('')}</tbody></table>`;
  document.querySelectorAll('[data-tryout]').forEach(c=>c.onchange=()=>{const p=current.tryoutPool.find(x=>x.id===c.dataset.tryout);if(c.checked&&current.tryoutPool.filter(x=>x.selected).length>=15){c.checked=false;return toast('Varsity rosters can have at most 15 players.')}p.selected=c.checked;renderTryouts();persist()});
}
function finalizeTryouts(){const picks=current.tryoutPool.filter(p=>p.selected);if(picks.length<13||picks.length>15)return toast('Select between 13 and 15 players.');const team=myTeam();team.roster=picks.map((p,i)=>({...p,minutes:i<5?30-i:i<10?12:4}));team.rating=teamRating(team.roster);current.tryoutsFinalized=true;current.news.push({date:current.day,text:`Varsity roster finalized with ${picks.length} players.`});renderAll();toast('Varsity roster finalized and saved.')}
function aiPickTryouts(){current.tryoutPool.forEach(p=>p.selected=false);current.tryoutPool.slice().sort((a,b)=>(b.overall+b.potential*.35)-(a.overall+a.potential*.35)).slice(0,15).forEach(p=>p.selected=true);renderTryouts();persist();toast('AI selected a balanced 15-player roster.')}
function collegeName(c){return `${c.name} ${c.mascot}`}
function recruitingLevel(p){return clamp(Math.round(p.overall*.65+p.potential*.35+(p.grade-9)*2),40,99)}
function generateOffersFor(p){p.offers=p.offers||[];const level=recruitingLevel(p);const eligible=D1_COLLEGES.filter(c=>c.prestige<=level+12).sort(()=>Math.random()-.5);const count=level>=90?4:level>=82?3:level>=74?2:level>=68?1:0;eligible.slice(0,count).forEach(c=>{if(!p.offers.some(o=>o.collegeId===c.id))p.offers.push({collegeId:c.id,date:current.day,scholarship:level>=72})});}
function renderRecruiting(){const box=$('seniorRecruiting');if(!box||!current)return;const seniors=myTeam().roster.filter(p=>Number(p.grade)===12);const offers=seniors.reduce((n,p)=>n+(p.offers?.length||0),0);$('recruitingSummary').innerHTML=[['D1 Programs',D1_COLLEGES.length],['Seniors',seniors.length],['Total Offers',offers],['Scheduled Visits',current.recruiting.visits.length]].map(x=>`<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');box.innerHTML=seniors.length?seniors.map(p=>`<article class="row"><div class="grow"><b>${p.name} • ${p.pos} • ${p.overall} OVR</b><br><small>${p.committed?`Committed to ${collegeName(D1_COLLEGES.find(c=>c.id===p.committed))}`:`Recruiting rating ${recruitingLevel(p)} • ${(p.offers||[]).length} offer(s)`}</small><div class="offer-list">${(p.offers||[]).map(o=>{const c=D1_COLLEGES.find(x=>x.id===o.collegeId);return `<span class="tag">${c?collegeName(c):'College'}</span>`}).join('')}</div></div>${!p.committed?`<button class="secondary" data-promote-player="${p.id}">Promote Player</button>`:''}</article>`).join(''):'<p class="muted">No seniors are currently on the roster.</p>';$('collegeVisits').innerHTML=current.recruiting.visits.length?current.recruiting.visits.map(v=>{const c=D1_COLLEGES.find(x=>x.id===v.collegeId);return `<div class="row"><div><b>${c?collegeName(c):'College Scout'}</b><br><small>${new Date(v.date).toLocaleDateString()} • scouting your game</small></div><span class="tag">Scheduled</span></div>`}).join(''):'<p class="muted">No visits scheduled. Invite a college to scout an upcoming game.</p>';document.querySelectorAll('[data-promote-player]').forEach(b=>b.onclick=()=>{const p=myTeam().roster.find(x=>x.id===b.dataset.promotePlayer);p.overall=clamp(p.overall+1,0,99);generateOffersFor(p);current.program.reputation=clamp(current.program.reputation+1,0,100);persist();renderRecruiting();toast('Highlights and film were sent to colleges.')})}
function inviteCollegeScout(){const future=current.schedule.find(g=>!g.played);if(!future)return toast('Schedule an upcoming game first.');const c=D1_COLLEGES[Math.floor(Math.random()*D1_COLLEGES.length)];current.recruiting.visits.push({id:uid(),collegeId:c.id,date:future.date,gameId:future.id});persist();renderRecruiting();toast(`${collegeName(c)} will attend an upcoming game.`)}
function processRecruitingAfterGame(g){const visits=current.recruiting.visits.filter(v=>v.gameId===g.id);if(!visits.length)return;myTeam().roster.filter(p=>p.grade===12).forEach(p=>{const boost=g.myScore>g.oppScore?4:1;const level=recruitingLevel(p)+boost;visits.forEach(v=>{const c=D1_COLLEGES.find(x=>x.id===v.collegeId);if(c&&level>=c.prestige-10&&!p.offers.some(o=>o.collegeId===c.id))p.offers.push({collegeId:c.id,date:g.date,scholarship:level>=72})})})}
function resolveSeniorCommitments(){myTeam().roster.filter(p=>p.grade===12).forEach(p=>{if(!p.offers?.length)return;p.offers.sort((a,b)=>(D1_COLLEGES.find(c=>c.id===b.collegeId)?.prestige||0)-(D1_COLLEGES.find(c=>c.id===a.collegeId)?.prestige||0));p.committed=p.offers[0].collegeId;const c=D1_COLLEGES.find(x=>x.id===p.committed);current.recruiting.commitments.push({player:p.name,collegeId:p.committed,season:current.season});current.news.push({date:current.day,text:`${p.name} committed to ${collegeName(c)}.`})})}
function renderLeagues(){if(!current)return;['summer','fall'].forEach(type=>{const list=current.leagues[type]||[];$(type+'Count').textContent=`${list.length}/10`;$(type+'Schedule').innerHTML=list.length?list.map((g,i)=>{const o=current.teams.find(t=>String(t.id)===String(g.opponentId));return `<div class="row"><div><b>${g.home?'vs':'at'} ${o?.name||'Unknown'}</b><br><small>${new Date(g.date).toLocaleDateString()} • ${g.played?`${g.myScore}-${g.oppScore}`:'Development game'}</small></div>${!g.played?`<button class="secondary" data-remove-league="${type}:${g.id}">Remove</button>`:'<span class="tag">Played</span>'}</div>`}).join(''):'<p class="muted small">No games scheduled.</p>'});document.querySelectorAll('[data-remove-league]').forEach(b=>b.onclick=()=>{const [type,id]=b.dataset.removeLeague.split(':');current.leagues[type]=current.leagues[type].filter(g=>g.id!==id);renderLeagues();persist()})}
function aiLeague(type){const seasonYear=current.season;const month=type==='summer'?6:9;const pool=current.teams.filter(t=>t.id!==current.schoolId).sort(()=>Math.random()-.5).slice(0,10);current.leagues[type]=pool.map((o,i)=>({id:uid(),opponentId:o.id,date:new Date(seasonYear,month,i*2+1,18).toISOString(),home:i%2===0,played:false,type}));renderLeagues();persist();toast(`${type[0].toUpperCase()+type.slice(1)} league schedule created.`)}
function openLeagueDialog(type){if((current.leagues[type]||[]).length>=10)return toast('This league already has 10 games.');$('leagueType').value=type;$('leagueOpponent').innerHTML=current.teams.filter(t=>t.id!==current.schoolId).sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${t.id}">${t.name} ${t.mascot||''}</option>`).join('');$('leagueDate').value=`${current.season}-${type==='summer'?'07-01':'09-01'}`;$('leagueDialog').showModal()}
let tournamentDraftSelection=new Set();
function selectedTournamentIds(){return [...tournamentDraftSelection]}
function ensureTournamentSelectedList(){let el=$('tournamentSelectedSchools');if(el)return el;el=document.createElement('div');el.id='tournamentSelectedSchools';el.className='selected-team-list';$('tournamentSelectionCount').insertAdjacentElement('afterend',el);return el}
function renderTournamentSelectedList(){const el=ensureTournamentSelectedList();const selected=selectedTournamentIds().map(id=>current.teams.find(t=>String(t.id)===String(id))).filter(Boolean);el.innerHTML=selected.length?selected.map(t=>`<span class="tag selected-school-chip">${t.name} ${t.mascot||''}<button type="button" aria-label="Remove ${t.name}" data-remove-tournament-school="${t.id}">×</button></span>`).join(''):'<span class="muted small">No other schools selected yet.</span>';el.querySelectorAll('[data-remove-tournament-school]').forEach(b=>b.onclick=()=>{tournamentDraftSelection.delete(String(b.dataset.removeTournamentSchool));renderTournamentPicker()})}
function renderTournamentPicker(){const picker=$('tournamentSchoolPicker');if(!picker||!current)return;const size=Number($('tournamentSize').value),need=size-1,q=($('tournamentSchoolSearch').value||'').trim().toLowerCase();while(tournamentDraftSelection.size>need)tournamentDraftSelection.delete([...tournamentDraftSelection].pop());const teams=current.teams.filter(t=>{if(String(t.id)===String(current.schoolId))return false;const hay=(`${t.name||''} ${t.mascot||''} ${t.city||''} ${t.state||''} ${t.class||''} ${t.district||''}`).toLowerCase();return !q||hay.includes(q)}).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));picker.innerHTML=teams.map(t=>{const detail=t.outOfState||String(t.class)==='Out of State'?`${t.city?t.city+', ':''}${t.state||'Out of State'} • Out of State`:`Class ${t.class} • District ${t.district}`;return `<label class="form-check"><input class="form-check-input" type="checkbox" data-tournament-school value="${t.id}" ${tournamentDraftSelection.has(String(t.id))?'checked':''}><span class="form-check-label">${t.name} ${t.mascot||''} • ${detail}</span></label>`}).join('')||'<p class="muted small">No schools match that search.</p>';picker.querySelectorAll('input').forEach(i=>i.onchange=()=>{const id=String(i.value);if(i.checked){if(tournamentDraftSelection.size>=need){i.checked=false;return toast(`You can select ${need} other schools for this bracket.`)}tournamentDraftSelection.add(id)}else tournamentDraftSelection.delete(id);updateTournamentSelection();renderTournamentSelectedList()});updateTournamentSelection();renderTournamentSelectedList()}
function updateTournamentSelection(){const size=Number($('tournamentSize').value),count=tournamentDraftSelection.size;$('tournamentSelectionCount').textContent=`${count}/${size-1} schools selected`;const submit=$('tournamentForm').querySelector('button.primary');if(submit)submit.disabled=count!==size-1}
function autoFillTournament(){const size=Number($('tournamentSize').value);tournamentDraftSelection=new Set(current.teams.filter(t=>String(t.id)!==String(current.schoolId)).sort(()=>Math.random()-.5).slice(0,size-1).map(t=>String(t.id)));$('tournamentSchoolSearch').value='';renderTournamentPicker()}
const originalOpenTournamentV10=openTournamentDialog;
openTournamentDialog=function(){if(!current.tryoutsFinalized)return toast('Finalize your varsity roster first.');tournamentDraftSelection=new Set();$('tournamentSchoolSearch').value='';originalOpenTournamentV10();setTimeout(renderTournamentPicker,0)};
createTournament=function(name,size,startDate,preset,chosenIds){const rounds=tournamentRoundNames(size),needed=rounds.length;if(current.schedule.length+needed>26)throw new Error(`This tournament needs ${needed} schedule slots.`);const ids=(chosenIds||selectedTournamentIds()).map(String);if(ids.length!==size-1)throw new Error(`Choose exactly ${size-1} other schools.`);const pool=ids.map(id=>current.teams.find(t=>String(t.id)===id)).filter(Boolean);if(pool.length!==size-1)throw new Error('One or more selected schools could not be found.');const entrants=[current.schoolId,...pool.map(t=>t.id)];const shuffled=entrants.slice().sort(()=>Math.random()-.5);const myIndex=shuffled.findIndex(id=>String(id)===String(current.schoolId));const firstOpponent=shuffled[myIndex%2===0?myIndex+1:myIndex-1];const t={id:uid(),name:name||'Custom Tournament',size,preset,createdAt:new Date().toISOString(),status:'Scheduled',teams:entrants,seeds:shuffled,rounds:rounds.map((round,i)=>({name:round,opponentId:i===0?firstOpponent:null,result:null}))};current.tournaments.push(t);const base=new Date(startDate+'T18:00:00');rounds.forEach((round,i)=>{const d=new Date(base);d.setDate(d.getDate()+i*2);current.schedule.push({id:uid(),opponentId:i===0?firstOpponent:null,tbd:i>0,date:d.toISOString(),home:false,neutral:true,played:false,type:'Tournament',tournamentId:t.id,tournamentRound:i,roundName:round})});current.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));persist();renderAll();toast(`${t.name} (${size} teams) added to the schedule.`)};
const oldSimV10=simulateGame;
simulateGame=function(g){oldSimV10(g);processRecruitingAfterGame(g);myTeam().roster.forEach(p=>{p.stats=p.stats||{games:0,points:0,rebounds:0,assists:0};p.stats.games++;p.stats.points+=Math.max(0,Math.round((p.minutes||0)/3+Math.random()*8));p.stats.rebounds+=Math.round(Math.random()*6);p.stats.assists+=Math.round(Math.random()*5)});persist()};
const oldOffseasonV10=applyOffseason;
applyOffseason=function(){if(current.schedule.some(g=>!g.played))return toast('Finish the season first.');resolveSeniorCommitments();oldOffseasonV10();migrateV10(current);current.tryoutsFinalized=false;const team=myTeam();current.tryoutPool=[...team.roster.map(p=>({...p,selected:true})),...Array.from({length:Math.max(0,50-team.roster.length)},(_,i)=>{const p=makePlayer(team,i,current.season);p.selected=false;p.minutes=0;return p})].slice(0,50);team.roster=[];team.rating=0;current.schedule=[];current.leagues={summer:[],fall:[]};current.news.push({date:current.day,text:'A new 50-player tryout pool is ready. Build next season’s team from scratch.'});renderAll();persist()};
const oldRenderAllV10=renderAll;
renderAll=function(){migrateV10(current);oldRenderAllV10();renderTryouts();renderRecruiting();renderLeagues();const canPlay=current.tryoutsFinalized;$('playNextBtn').disabled=!canPlay;$('aiScheduleBtn').disabled=!canPlay||!scheduleEditable();$('addGameBtn').disabled=!canPlay||!scheduleEditable();};
// tournament form upgraded
$('tournamentSize').addEventListener('change',renderTournamentPicker);$('tournamentSchoolSearch').addEventListener('input',renderTournamentPicker);$('autoFillTournamentBtn').onclick=autoFillTournament;
$('tournamentForm').onsubmit=e=>{e.preventDefault();try{const preset=$('tournamentPreset').value,size=Number($('tournamentSize').value);const names={holiday:'Holiday Classic',showme:'Show-Me Shootout',district:'District Preview Classic',custom:'Custom Tournament'};createTournament($('tournamentName').value.trim()||names[preset],size,$('tournamentStart').value,preset,selectedTournamentIds(),{format:$('tournamentFormat')?.value||'single'});$('tournamentDialog').close()}catch(err){toast(err.message)}};
$('aiPickRosterBtn').onclick=aiPickTryouts;$('clearRosterBtn').onclick=()=>{current.tryoutPool.forEach(p=>p.selected=false);renderTryouts();persist()};$('finalizeRosterBtn').onclick=finalizeTryouts;$('inviteCollegeBtn').onclick=inviteCollegeScout;
document.querySelectorAll('[data-league-ai]').forEach(b=>b.onclick=()=>aiLeague(b.dataset.leagueAi));document.querySelectorAll('[data-league-add]').forEach(b=>b.onclick=()=>openLeagueDialog(b.dataset.leagueAdd));
$('leagueForm').onsubmit=e=>{e.preventDefault();const type=$('leagueType').value;if(current.leagues[type].length>=10)return toast('10-game league limit reached.');const loc=$('leagueLocation').value;current.leagues[type].push({id:uid(),opponentId:$('leagueOpponent').value,date:new Date($('leagueDate').value+'T18:00:00').toISOString(),home:loc==='home',neutral:loc==='neutral',played:false,type});current.leagues[type].sort((a,b)=>new Date(a.date)-new Date(b.date));$('leagueDialog').close();renderLeagues();persist();toast('League game added and saved.')};


// v1.0.1 manual save and reliability layer
async function manualSaveGame(){
  if(!current)return toast('Open a career before saving.');
  const localOk=persist();
  if(localOk===false)return toast('Device storage is full. Export a backup before making more changes.');
  // v2.7.12: Save is one action. Device backup happens immediately and, when signed in,
  // the exact same career save is pushed to the account automatically. No separate sync step.
  toast('Saved.');
  if(window.cloudGame?.signedIn){
    Promise.resolve(window.cloudGame?.flushSave?.(current) ?? window.cloudGame?.forceSave?.(current)).catch(err=>{
      console.error('Automatic account save retry queued',err);
      // No user action is required; cloud.js retains the latest snapshot and retries automatically.
    });
  }
  return {localOnly:!window.cloudGame?.signedIn}
}
$('manualSaveBtn')?.addEventListener('click',manualSaveGame);
$('backToSaves')?.addEventListener('click',()=>{if(current)manualSaveGame().catch(()=>{})});
window.addEventListener('error',event=>{console.error('Game error',event.error||event.message);const pill=$('saveStatusPill');if(pill){pill.dataset.state='error';pill.textContent='⚠ Game error — local backup kept'}});
window.addEventListener('unhandledrejection',event=>{console.error('Unhandled game error',event.reason);const pill=$('saveStatusPill');if(pill){pill.dataset.state='error';pill.textContent='⚠ Check save status'}});

// v1.0.2 cloud-size compatibility + required Senior Night
function migrateSeniorNight(save){
  if(!save)return save;
  save.seniorNightGameId=save.seniorNightGameId||null;
  (save.schedule||[]).forEach(g=>{if(g.seniorNight)save.seniorNightGameId=g.id});
  return save;
}
const renderScheduleBeforeSeniorNight=renderSchedule;
renderSchedule=function(){
  migrateSeniorNight(current);
  renderScheduleBeforeSeniorNight();
  const editable=scheduleEditable();
  document.querySelectorAll('.schedule-row').forEach((row,index)=>{
    const g=current.schedule[index];
    if(!g)return;
    const details=row.querySelector('.grow');
    if(g.seniorNight&&details){
      const badge=document.createElement('span');
      badge.className='tag';
      badge.textContent='Senior Night';
      details.appendChild(document.createTextNode(' '));
      details.appendChild(badge);
    }
    if(editable&&!g.played&&g.home&&!g.neutral){
      const btn=document.createElement('button');
      btn.className='secondary small-btn';
      btn.textContent=g.seniorNight?'Senior Night ✓':'Make Senior Night';
      btn.disabled=Boolean(g.seniorNight);
      btn.addEventListener('click',()=>setSeniorNight(g.id));
      row.appendChild(btn);
    }
  });
  const hasSeniors=myTeam()?.roster?.some(p=>Number(p.grade)===12);
  if(editable&&hasSeniors&&!current.seniorNightGameId){
    $('scheduleHelp').textContent+= ' A home Senior Night game is required before the season can begin.';
  }
};
function setSeniorNight(gameId){
  if(!scheduleEditable())return toast('Senior Night must be selected before the season begins.');
  const game=current.schedule.find(g=>g.id===gameId);
  if(!game||!game.home||game.neutral)return toast('Senior Night must be a home game.');
  current.schedule.forEach(g=>g.seniorNight=false);
  game.seniorNight=true;
  game.type=game.type==='Tournament'?game.type:'Senior Night';
  current.seniorNightGameId=game.id;
  current.news.push({date:current.day,text:`Senior Night was scheduled for the home game against ${opponent(game)?.name||'an opponent'}.`});
  persist();renderSchedule();renderNext();toast('Senior Night selected and saved.');
}
function seniorNightReady(){
  const seniors=myTeam()?.roster?.filter(p=>Number(p.grade)===12)||[];
  if(!seniors.length)return true;
  const game=current.schedule.find(g=>g.id===current.seniorNightGameId);
  return Boolean(game&&game.home&&!game.neutral);
}
const simulateGameBeforeSeniorNight=simulateGame;
simulateGame=function(g){
  if(!seniorNightReady())return toast('Choose a home Senior Night game before playing the season.');
  const seniors=myTeam().roster.filter(p=>Number(p.grade)===12);
  if(g.seniorNight){
    myTeam().roster.forEach(p=>p.seniorNightStarter=false);
    seniors.forEach(p=>{p.seniorNightStarter=true;p.minutes=Math.max(Number(p.minutes)||0,24)});
    current.news.push({date:g.date,text:`Senior Night: ${seniors.map(p=>p.name).join(', ')} started and were honored before the game.`});
  }
  const result=simulateGameBeforeSeniorNight(g);
  persist();
  return result;
};
const playButton=$('playNextBtn');
if(playButton)playButton.onclick=()=>{const g=nextUnplayed();if(g)simulateGame(g)};
const renderAllBeforeSeniorNight=renderAll;
renderAll=function(){migrateSeniorNight(current);renderAllBeforeSeniorNight();if($('playNextBtn')&&!seniorNightReady())$('playNextBtn').disabled=true;};

// v1.1 official program expansion
function migrateV11(save){
  if(!save)return save;
  save.dataVersion=Math.max(11,save.dataVersion||0);
  save.customization=save.customization||{court:'Classic',jersey:'Traditional',crowdTheme:'School Colors'};
  save.coaching=save.coaching||{offense:'Motion',defense:save.strategy?.defense||'Man',development:'Balanced',assistant:'Generalist'};
  save.facilities=save.facilities||{gym:1,weightRoom:1,filmRoom:1,training:1};
  save.records=save.records||{singleGamePoints:0,bestSeasonWins:0,retiredJerseys:[],hallOfFame:[],banners:[]};
  save.goals=save.goals||[{text:'Finish with a winning record',complete:false},{text:'Win the district',complete:false},{text:'Develop an All-State player',complete:false}];
  save.transferPortal=save.transferPortal||[];
  save.recruitingClass=save.recruitingClass||[];
  save.weeklyRanking=save.weeklyRanking||null;
  return save;
}
function customSchools(){try{return JSON.parse(localStorage.getItem('bm27_custom_schools')||'[]')}catch{return []}}
function saveCustomSchools(list){BM27Storage.set('bm27_custom_schools',JSON.stringify(list));directory=[...BASE_SCHOOLS,...list,...directory.filter(s=>!String(s.id).startsWith('custom-')&&!BASE_SCHOOLS.some(b=>b.id===s.id))]}
function renderSchoolPreview(){const name=$('customSchoolName')?.value||'West County High',mascot=$('customSchoolMascot')?.value||'Wolves',c=$('customSchoolClass')?.value||'6',a=$('customPrimary')?.value||'#1d4ed8',b=$('customSecondary')?.value||'#facc15';const el=$('schoolPreview');if(el){el.style.background=`linear-gradient(120deg,${a},${b})`;el.innerHTML=`<strong>${name} ${mascot}</strong><span>Class ${c}</span>`}}
$('createSchoolBtn')?.addEventListener('click',()=>{$('schoolCreatorDialog').showModal();renderSchoolPreview()});
['customSchoolName','customSchoolMascot','customSchoolClass','customPrimary','customSecondary'].forEach(id=>$(id)?.addEventListener('input',renderSchoolPreview));
$('schoolCreatorForm')?.addEventListener('submit',e=>{e.preventDefault();const school={id:'custom-'+uid(),name:$('customSchoolName').value.trim(),mascot:$('customSchoolMascot').value.trim(),city:$('customSchoolCity').value.trim(),class:$('customSchoolClass').value,district:String($('customSchoolDistrict').value||1),conference:$('customSchoolConference').value.trim()||('Missouri Class '+$('customSchoolClass').value+' — Unassigned'),conferenceManual:!!$('customSchoolConference').value.trim(),primary:$('customPrimary').value,secondary:$('customSecondary').value,custom:true};const list=customSchools();list.push(school);saveCustomSchools(list);BM27Storage.set('mshsaa_bm27_directory',JSON.stringify(directory));$('schoolCreatorDialog').close();renderLauncher(false);$('schoolSelect').value=school.id;toast(`${school.name} ${school.mascot} created.`)});
(function loadCustom(){const list=customSchools();if(list.length){const ids=new Set(directory.map(s=>s.id));directory.push(...list.filter(s=>!ids.has(s.id)))}})();
function generateWeeklyNews(){if(!current)return;const me=myTeam(),next=current.schedule.find(g=>!g.played);const items=[];if(next){const o=opponent(next);items.push(`Keys to the game: control the glass, limit turnovers, and contain ${o?.name||'the opponent'} in transition.`)}const hot=me.roster?.slice().sort((a,b)=>b.overall-a.overall)[0];if(hot)items.push(`${hot.name} is drawing attention after strong practices and an overall rating of ${hot.overall}.`);if(Math.random()<.35)items.push('Upset alert: a lower-ranked district opponent knocked off a state contender.');items.forEach(text=>current.news.unshift({date:current.day,text}));current.news=current.news.slice(0,30)}
function renderProgramCenter(){if(!current||!$('programCenter'))return;migrateV11(current);const me=myTeam(),f=current.facilities,c=current.coaching,x=current.customization;$('programCenter').innerHTML=`<div class="office-grid"><article class="card"><h3>Coaching System</h3><label>Offense<select id="v11Offense">${['Motion','5-Out','Pace and Space','Post Heavy','Princeton'].map(v=>`<option ${c.offense===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Development focus<select id="v11Development">${['Balanced','Shooting','Defense','Athleticism','Playmaking'].map(v=>`<option ${c.development===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Assistant specialty<select id="v11Assistant">${['Generalist','Recruiter','Defensive Mind','Player Developer','Scout'].map(v=>`<option ${c.assistant===v?'selected':''}>${v}</option>`).join('')}</select></label><button id="saveV11Coaching" class="primary wide">Save Coaching Plan</button></article><article class="card"><h3>School Customization</h3><label>Court design<select id="v11Court">${['Classic','Modern','Dark Hardwood','Tournament Floor'].map(v=>`<option ${x.court===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Jersey style<select id="v11Jersey">${['Traditional','Modern','Throwback','Statement'].map(v=>`<option ${x.jersey===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Crowd theme<select id="v11Crowd">${['School Colors','White Out','Blackout','Student Section'].map(v=>`<option ${x.crowdTheme===v?'selected':''}>${v}</option>`).join('')}</select></label><button id="saveV11Custom" class="primary wide">Save Customization</button></article></div><div class="section-head"><h3>Facilities</h3><span class="tag">Budget ${current.program.budget}</span></div><div class="record-grid">${Object.entries(f).map(([k,v])=>`<article class="card"><h3>${k.replace(/([A-Z])/g,' $1')}</h3><p>Level ${v}/5</p><div class="facility-meter"><span style="width:${v*20}%"></span></div><button class="secondary wide" data-upgrade="${k}" ${v>=5?'disabled':''}>Upgrade (${10+v*5} budget)</button></article>`).join('')}</div><div class="office-grid"><article class="card"><h3>Program Goals</h3>${current.goals.map(g=>`<div class="news-item">${g.complete?'✅':'⬜'} ${g.text}</div>`).join('')}</article><article class="card"><h3>Program Legacy</h3><p>Banners: ${current.records.banners.length}</p><p>Retired jerseys: ${current.records.retiredJerseys.length}</p><p>Hall of Fame members: ${current.records.hallOfFame.length}</p><button id="retireTopSenior" class="secondary wide">Retire Top Senior Jersey</button></article></div>`;
 $('saveV11Coaching').onclick=()=>{c.offense=$('v11Offense').value;c.development=$('v11Development').value;c.assistant=$('v11Assistant').value;persist();toast('Coaching plan saved.')};$('saveV11Custom').onclick=()=>{x.court=$('v11Court').value;x.jersey=$('v11Jersey').value;x.crowdTheme=$('v11Crowd').value;persist();toast('School customization saved.')};document.querySelectorAll('[data-upgrade]').forEach(b=>b.onclick=()=>{const k=b.dataset.upgrade,cost=10+f[k]*5;if(current.program.budget<cost)return toast('Not enough program budget.');current.program.budget-=cost;f[k]++;persist();renderProgramCenter();toast('Facility upgraded.')});$('retireTopSenior').onclick=()=>{const s=(me.roster||[]).filter(p=>p.grade===12).sort((a,b)=>b.overall-a.overall)[0];if(!s)return toast('There are no seniors to honor right now.');if(!current.records.retiredJerseys.includes(s.name))current.records.retiredJerseys.push(s.name);persist();renderProgramCenter();toast(`${s.name} added to the program legacy.`)}}
const renderAllV11=renderAll;renderAll=function(){migrateV11(current);renderAllV11();renderProgramCenter()};
if(typeof globalThis.advanceDay==='undefined')globalThis.advanceDay=advance;
const advanceDayV11=advanceDay;advanceDay=function(days=1){advanceDayV11(days);if(current&&new Date(current.day).getDay()===1){generateWeeklyNews();persist();renderAll()}};

// v1.1.2 tournament advancement + confirmed schedule saving
(function(){
  function saveConfirmed(message){
    persist();
    window.cloudGame?.forceSave(current)
      .then(()=>{ if(message) toast(message); })
      .catch(err=>{ console.error('Confirmed save failed',err); toast('Saved. Account update will retry automatically.'); });
  }

  function availableTournamentOpponent(t, completedRoundIndex){
    const used=new Set([String(current.schoolId)]);
    (t.rounds||[]).slice(0,completedRoundIndex+1).forEach(r=>{
      if(r?.result?.opponentId!=null) used.add(String(r.result.opponentId));
      else if(r?.opponentId!=null) used.add(String(r.opponentId));
    });
    const candidates=(t.teams||[])
      .map(id=>current.teams.find(team=>String(team.id)===String(id)))
      .filter(team=>team&&!used.has(String(team.id)));
    if(!candidates.length){
      return current.teams.filter(team=>String(team.id)!==String(current.schoolId)&&!used.has(String(team.id)))
        .sort(()=>Math.random()-.5)[0]||null;
    }
    // Simulate the other side of the bracket by favoring stronger teams, with variation.
    return candidates.sort((a,b)=>(b.rating+Math.random()*12)-(a.rating+Math.random()*12))[0];
  }

  updateTournamentAfterGame=function(g){
    if(!g?.tournamentId)return;
    current.tournaments=current.tournaments||[];
    const t=current.tournaments.find(x=>String(x.id)===String(g.tournamentId));
    if(!t)return;
    const roundIndex=Number(g.tournamentRound||0);
    const round=t.rounds?.[roundIndex];
    if(!round)return;
    const won=Number(g.myScore)>Number(g.oppScore);
    round.opponentId=g.opponentId;
    round.result={won,myScore:g.myScore,oppScore:g.oppScore,opponentId:g.opponentId,playedAt:g.date};

    if(won){
      const nextGame=current.schedule.find(x=>String(x.tournamentId)===String(t.id)&&Number(x.tournamentRound)===roundIndex+1&&!x.played);
      const nextRound=t.rounds?.[roundIndex+1];
      if(nextGame&&nextRound){
        const nextOpponent=availableTournamentOpponent(t,roundIndex);
        if(nextOpponent){
          nextRound.opponentId=nextOpponent.id;
          nextGame.opponentId=nextOpponent.id;
          nextGame.tbd=false;
          nextGame.type='Tournament';
          nextGame.roundName=nextRound.name;
          t.status=`Advanced to ${nextRound.name}`;
          current.news.unshift({date:g.date,text:`${myTeam().name} advanced to the ${nextRound.name} of the ${t.name} and will face ${nextOpponent.name} ${nextOpponent.mascot||''}.`.replace(/\s+\./g,'.')});
        }
      }else{
        t.status='Champion';
        t.championId=current.schoolId;
        current.news.unshift({date:g.date,text:`${myTeam().name} won the ${t.name} championship.`});
      }
    }else{
      t.status=`Eliminated in ${g.roundName||round.name}`;
      current.schedule=current.schedule.filter(x=>!(String(x.tournamentId)===String(t.id)&&!x.played&&Number(x.tournamentRound)>roundIndex));
      current.news.unshift({date:g.date,text:`${myTeam().name} was eliminated from the ${t.name}.`});
    }
    saveConfirmed('Tournament bracket and schedule saved.');
  };

  const previousMoveScheduleGame=moveScheduleGame;
  moveScheduleGame=function(id,direction){
    previousMoveScheduleGame(id,direction);
    if(current) saveConfirmed('Game order saved to cloud.');
  };

  // Confirm schedule persistence after every schedule-list mutation, including
  // tournament creation/removal, regular games, TBD games, and AI schedules.
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-remove-game],#addGameBtn,#addTbdBtn,#aiScheduleBtn');
    if(!target)return;
    setTimeout(()=>{ if(current) saveConfirmed('Schedule saved.'); },50);
  });

  const oldCreateTournamentV112=createTournament;
  createTournament=function(...args){
    const result=oldCreateTournamentV112(...args);
    saveConfirmed('Tournament and schedule saved to cloud.');
    return result;
  };
})();
/* =========================================================
   VERSION 1.2.0 — ONE AUTHORITATIVE SCHEDULE + POSTSEASON ENGINE
   ========================================================= */
(()=>{
  const ENGINE=121;
  const eq=(a,b)=>String(a)===String(b);
  const getTeam=id=>current?.teams?.find(t=>eq(t.id,id))||(window.BM27ResolveNationalTeam?window.BM27ResolveNationalTeam(id):null);
  const scorePair=(a,b)=>{
    const ar=Number(a?.rating)||70,br=Number(b?.rating)||70,d=ar-br;
    let x=Math.round(58+ar*.2+d*.3+(Math.random()-.5)*18);
    let y=Math.round(58+br*.2-d*.25+(Math.random()-.5)*18);
    if(x===y)x++;
    return [Math.max(35,x),Math.max(35,y)];
  };
  const datePlus=(iso,days)=>{const d=new Date(iso);d.setDate(d.getDate()+days);return d.toISOString()};
  const nextPow2=n=>{let p=2;while(p<n&&p<128)p*=2;return p};
  const roundLabels=size=>{
    const names=[];let n=size;
    while(n>1){
      names.push(n===2?'Championship':n===4?'Semifinals':n===8?'Quarterfinals':`Round of ${n}`);
      n/=2;
    }
    return names;
  };
  const regularUserGames=save=>(save.schedule||[]).filter(g=>!g.tournamentId&&!['Summer League','Fall League','Tryout','Exhibition'].includes(g.type));

  function createLeagueSchedules(save,force=false){
    if(!save?.teams?.length)return;
    if(!force&&save.scheduleEngineVersion===ENGINE&&save.teamSchedules){syncUserSchedule(save);return}
    save.teamSchedules={};
    const season=Number(save.season)||2026;
    const base=new Date(`${season}-11-27T18:00:00.000Z`);
    const byClass=new Map();
    save.teams.forEach(t=>{const k=String(t.class||1);if(!byClass.has(k))byClass.set(k,[]);byClass.get(k).push(t)});

    // Guaranteed round-robin scheduling. Every AI school receives exactly
    // 20 regular-season games before postseason eligibility is checked.
    for(const schools of byClass.values()){
      const ids=schools.filter(t=>!eq(t.id,save.schoolId)).map(t=>t.id);
      ids.forEach(id=>save.teamSchedules[id]=[]);
      if(ids.length<2)continue;
      const rotation=ids.slice();
      if(rotation.length%2===1)rotation.push(null);
      const rounds=rotation.length-1;
      let gameDay=0,cycle=0,safety=0;
      while(ids.some(id=>save.teamSchedules[id].length<20)&&safety<5000){
        safety++;const roundIndex=cycle%rounds;
        if(roundIndex===0&&cycle>0){
          const fixed=rotation[0],rest=rotation.slice(1);
          rest.unshift(rest.pop());rotation.splice(0,rotation.length,fixed,...rest);
        }
        const pairs=[];
        for(let i=0;i<rotation.length/2;i++){
          const a=rotation[i],b=rotation[rotation.length-1-i];
          if(a&&b)pairs.push([a,b]);
        }
        for(const [a,b] of pairs){
          gameDay+=2+(gameDay%3===0?1:0);
          const date=datePlus(base,gameDay),matchId=uid();
          const ta=save.teams.find(t=>eq(t.id,a)),tb=save.teams.find(t=>eq(t.id,b));
          const type=eq(ta?.district,tb?.district)?'District':'Regular Season';
          save.teamSchedules[a].push({id:uid(),matchId,teamId:a,opponentId:b,date,played:false,type});
          save.teamSchedules[b].push({id:uid(),matchId,teamId:b,opponentId:a,date,played:false,type});
        }
        // Standard circle-method rotation after each round.
        const fixed=rotation[0],rest=rotation.slice(1);rest.unshift(rest.pop());rotation.splice(0,rotation.length,fixed,...rest);
        cycle++;
      }
      // Emergency fallback for extremely small/irregular imported universes.
      for(const id of ids){
        while(save.teamSchedules[id].length<20){
          const candidates=ids.filter(x=>!eq(x,id));if(!candidates.length)break;
          const b=candidates[save.teamSchedules[id].length%candidates.length];
          if(save.teamSchedules[b].length>=20)break;
          gameDay+=2;const date=datePlus(base,gameDay),matchId=uid();
          const ta=save.teams.find(t=>eq(t.id,id)),tb=save.teams.find(t=>eq(t.id,b));
          const type=eq(ta?.district,tb?.district)?'District':'Regular Season';
          save.teamSchedules[id].push({id:uid(),matchId,teamId:id,opponentId:b,date,played:false,type});
          save.teamSchedules[b].push({id:uid(),matchId,teamId:b,opponentId:id,date,played:false,type});
        }
      }
    }
    save.teams.forEach(t=>save.teamSchedules[t.id]??=[]);
    save.scheduleEngineVersion=ENGINE;
    save.postseasonEngineVersion=ENGINE;
    syncUserSchedule(save);
  }

  function syncUserSchedule(save){
    save.teamSchedules=save.teamSchedules||{};
    save.teamSchedules[save.schoolId]=save.teamSchedules[save.schoolId]||[];
    for(const g of regularUserGames(save)){
      if(!g.opponentId)continue;
      g.matchId=g.matchId||`USER-${g.id}`;
      const userList=save.teamSchedules[save.schoolId];
      let ug=userList.find(x=>eq(x.matchId,g.matchId));
      if(!ug){ug={id:uid(),matchId:g.matchId,teamId:save.schoolId,opponentId:g.opponentId,date:g.date,type:g.type,played:false};userList.push(ug)}
      Object.assign(ug,{opponentId:g.opponentId,date:g.date,type:g.type,played:!!g.played,teamScore:g.myScore,oppScore:g.oppScore});
      const oppList=save.teamSchedules[g.opponentId]??=[];
      let og=oppList.find(x=>eq(x.matchId,g.matchId));
      if(!og){og={id:uid(),matchId:g.matchId,teamId:g.opponentId,opponentId:save.schoolId,date:g.date,type:g.type,played:false};oppList.push(og)}
      Object.assign(og,{date:g.date,type:g.type,played:!!g.played,teamScore:g.oppScore,oppScore:g.myScore});
    }
  }

  function markLedger(aId,bId,date,aScore,bScore,matchId,tournamentMatchId,meta={}){
    current.teamSchedules=current.teamSchedules||{};
    for(const [id,opp,sc,os] of [[aId,bId,aScore,bScore],[bId,aId,bScore,aScore]]){
      const list=current.teamSchedules[id]??=[];
      let g=list.find(x=>tournamentMatchId?eq(x.tournamentMatchId,tournamentMatchId):eq(x.matchId,matchId));
      if(!g){g={id:uid(),teamId:id,opponentId:opp,date,matchId,tournamentMatchId,...meta};list.push(g)}
      Object.assign(g,{opponentId:opp,date,played:true,teamScore:+sc,oppScore:+os,...meta});
    }
  }

  function rebuildRecords(){
    if(!current)return;
    current.teams.forEach(t=>{t.wins=0;t.losses=0;t.pf=0;t.pa=0});
    const seen=new Set();
    for(const g of Object.values(current.teamSchedules||{}).flat()){
      if(!g?.played||!g.teamId||!g.opponentId||!Number.isFinite(+g.teamScore)||!Number.isFinite(+g.oppScore))continue;
      const key=g.tournamentMatchId?`T:${g.tournamentMatchId}`:`R:${g.matchId||[g.teamId,g.opponentId,g.date].sort().join('|')}`;
      if(seen.has(key))continue;seen.add(key);
      const a=getTeam(g.teamId),b=getTeam(g.opponentId);if(!a||!b)continue;
      a.pf+=+g.teamScore;a.pa+=+g.oppScore;b.pf+=+g.oppScore;b.pa+=+g.teamScore;
      if(+g.teamScore>+g.oppScore){a.wins++;b.losses++}else{b.wins++;a.losses++}
    }
    current.history=current.history||{};const me=getTeam(current.schoolId);current.history.wins=me?.wins||0;current.history.losses=me?.losses||0;
  }
  repairRecords=rebuildRecords;

  function simulateAiGame(g){
    if(g.played)return;
    const a=getTeam(g.teamId),b=getTeam(g.opponentId);if(!a||!b)return;
    const [s1,s2]=scorePair(a,b);markLedger(a.id,b.id,g.date,s1,s2,g.matchId,null,{type:g.type||'Regular Season'});
  }
  function simulateAiThrough(date,classNo=null,all=false){
    const cutoff=new Date(date).getTime(),seen=new Set();
    for(const g of Object.values(current.teamSchedules||{}).flat()){
      if(g.played||g.tournamentId||eq(g.teamId,current.schoolId)||eq(g.opponentId,current.schoolId))continue;
      if(classNo!=null&&!eq(getTeam(g.teamId)?.class,classNo))continue;
      if(!all&&new Date(g.date).getTime()>cutoff)continue;
      const key=g.matchId||[g.teamId,g.opponentId,g.date].sort().join('|');if(seen.has(key))continue;seen.add(key);simulateAiGame(g);
    }
  }

  function makeMatches(ids,date,roundIndex,path=''){
    const matches=[];for(let i=0;i<ids.length;i+=2)matches.push({id:uid(),team1Id:ids[i]||null,team2Id:ids[i+1]||null,date,roundIndex,path,played:false,score1:null,score2:null,winnerId:null});return matches;
  }
  const ordinal=n=>{n=Number(n)||0;const v=n%100;const suffix=(v>=11&&v<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');return `${n}${suffix}`};
  function loserOf(m){if(!m?.played||!m.team1Id||!m.team2Id||!m.winnerId)return null;return eq(m.winnerId,m.team1Id)?m.team2Id:m.team1Id}
  function placementRange(size,path=''){const bits=String(path).split('').reduce((n,c)=>(n*2)+(c==='L'?1:0),0),group=Math.max(2,Number(size)/Math.pow(2,String(path).length));const start=bits*group+1;return [start,start+group-1]}
  function placementMatchLabel(t,path,ri){
    const total=Math.log2(Number(t.size)||2),p=String(path||'');
    if(ri===total-1){const [start]=placementRange(t.size,p);return start===1?'Championship':`${ordinal(start)} Place Game`}
    if(!p.includes('L'))return t.rounds?.[ri]?.name||'Championship Bracket';
    const [start,end]=placementRange(t.size,p);return `${ordinal(start)}–${ordinal(end)} Place Bracket`;
  }
  function placementSummaryHTML(t){const rows=Object.entries(t.placements||{}).sort((a,b)=>Number(a[0])-Number(b[0]));return rows.length?`<div class="placement-summary">${rows.map(([place,id])=>`<div class="placement-chip"><b>${ordinal(place)}</b><span>${getTeam(id)?.name||'TBD'}</span></div>`).join('')}</div>`:''}
  function addTournamentLedger(t,m,ri){
    if(!m.team1Id||!m.team2Id)return;
    for(const [id,opp] of [[m.team1Id,m.team2Id],[m.team2Id,m.team1Id]]){
      const list=current.teamSchedules[id]??=[];
      if(!list.some(g=>eq(g.tournamentMatchId,m.id)))list.push({id:uid(),teamId:id,opponentId:opp,date:m.date,played:false,type:t.kind,tournamentId:t.id,tournamentMatchId:m.id,tournamentRound:ri,roundName:m.label||t.rounds[ri].name});
    }
  }
  function addUserTournamentGame(t,m,ri){
    if(!m||(!eq(m.team1Id,current.schoolId)&&!eq(m.team2Id,current.schoolId)))return false;
    const opp=eq(m.team1Id,current.schoolId)?m.team2Id:m.team1Id;if(!opp)return false;
    if(!current.schedule.some(g=>eq(g.tournamentMatchId,m.id)))current.schedule.push({id:uid(),opponentId:opp,date:m.date,home:false,neutral:true,played:false,type:t.kind,tournamentId:t.id,tournamentMatchId:m.id,tournamentRound:ri,roundName:m.label||t.rounds[ri].name});
    current.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));return true;
  }
  function createBracket({name,kind,entrants,startDate,classNo=null,districtNo=null,automatic=false,format='single'}){
    const unique=[...new Map((entrants||[]).filter(Boolean).map(t=>[String(t.id),t])).values()];if(!unique.length)return null;
    if(unique.length===1){const only=unique[0],t={id:uid(),name,kind,classNo,districtNo,size:1,automatic,format:'single',status:`${only.name} — Champion`,teams:[only.id],seeds:[only.id],rounds:[{name:'Championship',date:startDate,matches:[]}],championId:only.id,placements:{1:only.id}};current.tournaments.push(t);return t}
    const size=nextPow2(unique.length),seeded=unique.slice().sort((a,b)=>(b.wins-a.wins)||(b.rating-a.rating)).map(t=>t.id);
    while(seeded.length<size)seeded.push(null);
    const safeFormat=automatic?'single':(['single','third','placement'].includes(format)?format:'single');
    const labels=roundLabels(size),rounds=labels.map((name,ri)=>({name,date:datePlus(startDate,ri*2),matches:ri===0?makeMatches(seeded,datePlus(startDate,ri*2),ri,''):[]}));
    const t={id:uid(),name,kind,classNo,districtNo,size,automatic,format:safeFormat,status:'Scheduled',teams:unique.map(t=>t.id),seeds:seeded,rounds,championId:null,placements:{}};
    rounds[0].matches.forEach(m=>m.label=placementMatchLabel(t,m.path,0));
    current.tournaments.push(t);rounds[0].matches.forEach(m=>addTournamentLedger(t,m,0));return t;
  }
  function finishMatch(t,m,ri,userScore=null){
    if(m.played)return m.winnerId;
    if(!m.team1Id||!m.team2Id){m.played=true;m.score1=m.score2=null;m.winnerId=m.team1Id||m.team2Id;return m.winnerId}
    const a=getTeam(m.team1Id),b=getTeam(m.team2Id);if(!a||!b)return null;
    let s1,s2;if(userScore){if(eq(m.team1Id,current.schoolId)){s1=userScore.my;s2=userScore.opp}else{s1=userScore.opp;s2=userScore.my}}else[s1,s2]=scorePair(a,b);
    m.played=true;m.score1=+s1;m.score2=+s2;m.winnerId=s1>s2?a.id:b.id;
    markLedger(a.id,b.id,m.date,s1,s2,null,m.id,{type:t.kind,tournamentId:t.id,tournamentRound:ri,roundName:m.label||t.rounds[ri].name});return m.winnerId;
  }
  function addThirdPlaceLedger(t,m){
    if(!m?.team1Id||!m?.team2Id)return;
    for(const [id,opp] of [[m.team1Id,m.team2Id],[m.team2Id,m.team1Id]]){const list=current.teamSchedules[id]??=[];if(!list.some(g=>eq(g.tournamentMatchId,m.id)))list.push({id:uid(),teamId:id,opponentId:opp,date:m.date,played:false,type:t.kind,tournamentId:t.id,tournamentMatchId:m.id,tournamentRound:t.rounds.length-1,tournamentPlacement:'third',roundName:'3rd Place Game'})}
  }
  function addUserThirdPlaceGame(t,m){
    if(!m||(!eq(m.team1Id,current.schoolId)&&!eq(m.team2Id,current.schoolId)))return false;const opp=eq(m.team1Id,current.schoolId)?m.team2Id:m.team1Id;if(!opp)return false;
    if(!current.schedule.some(g=>eq(g.tournamentMatchId,m.id)))current.schedule.push({id:uid(),opponentId:opp,date:m.date,home:false,neutral:true,played:false,type:t.kind,tournamentId:t.id,tournamentMatchId:m.id,tournamentRound:t.rounds.length-1,tournamentPlacement:'third',roundName:'3rd Place Game'});
    current.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));return true;
  }
  function finishThirdPlace(t,m,userScore=null){
    if(!m||m.played)return m?.winnerId||null;const a=getTeam(m.team1Id),b=getTeam(m.team2Id);if(!a||!b)return null;let s1,s2;if(userScore){if(eq(m.team1Id,current.schoolId)){s1=userScore.my;s2=userScore.opp}else{s1=userScore.opp;s2=userScore.my}}else[s1,s2]=scorePair(a,b);
    m.played=true;m.score1=+s1;m.score2=+s2;m.winnerId=s1>s2?a.id:b.id;markLedger(a.id,b.id,m.date,s1,s2,null,m.id,{type:t.kind,tournamentId:t.id,tournamentRound:t.rounds.length-1,tournamentPlacement:'third',roundName:'3rd Place Game'});return m.winnerId;
  }
  function finalizePlacementTournament(t,round){
    const places={};for(const m of round.matches){const [start,end]=placementRange(t.size,m.path||'');if(m.winnerId)places[start]=m.winnerId;const loser=loserOf(m);if(loser)places[end]=loser}t.placements=places;t.championId=places[1]||round.matches.find(m=>String(m.path||'').split('').every(c=>c==='W'))?.winnerId||null;t.status=t.championId?`${getTeam(t.championId)?.name||'Unknown'} — Champion • placements complete`:'Complete';
  }
  function buildNextRound(t,ri){
    const round=t.rounds[ri];if(!round||round.matches.some(m=>!m.played))return false;
    const next=t.rounds[ri+1];
    if(t.format==='placement'){
      if(!next){finalizePlacementTournament(t,round);return true}
      if(!next.matches.length){
        const groups=new Map();for(const m of round.matches){const base=String(m.path||''),w=m.winnerId,l=loserOf(m);if(w){const k=base+'W';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(w)}if(l){const k=base+'L';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)}}
        for(const [path,ids] of groups){const ms=makeMatches(ids,next.date,ri+1,path);for(const m of ms){m.label=placementMatchLabel(t,path,ri+1);next.matches.push(m);addTournamentLedger(t,m,ri+1)}}
      }
      t.status=`${next.name} / placement games in progress`;return true;
    }
    if(t.format==='third'&&ri===t.rounds.length-2&&!t.thirdPlaceGame){const losers=round.matches.map(loserOf).filter(Boolean);if(losers.length===2){t.thirdPlaceGame={id:uid(),team1Id:losers[0],team2Id:losers[1],date:next?.date||datePlus(round.date,2),played:false,score1:null,score2:null,winnerId:null,label:'3rd Place Game'};addThirdPlaceLedger(t,t.thirdPlaceGame)}}
    if(!next){const final=round.matches[0];t.championId=final?.winnerId||null;t.placements=t.placements||{};if(final?.winnerId)t.placements[1]=final.winnerId;const runner=loserOf(final);if(runner)t.placements[2]=runner;t.status=t.championId?`${getTeam(t.championId)?.name||'Unknown'} — Champion`:'Complete';return true}
    if(!next.matches.length){next.matches=makeMatches(round.matches.map(m=>m.winnerId),next.date,ri+1);next.matches.forEach(m=>{m.label=next.name;addTournamentLedger(t,m,ri+1)})}
    t.status=`${next.name} in progress`;return true;
  }
  function advanceTournament(t){
    const pendingThird=t?.format==='third'&&t.thirdPlaceGame&&!t.thirdPlaceGame.played;if(!t||(t.championId&&!pendingThird))return;
    if(pendingThird&&(eq(t.thirdPlaceGame.team1Id,current.schoolId)||eq(t.thirdPlaceGame.team2Id,current.schoolId))){
      addUserThirdPlaceGame(t,t.thirdPlaceGame);t.status='3rd Place Game: awaiting your game';return;
    }
    for(let ri=0;ri<t.rounds.length;ri++){
      const r=t.rounds[ri];
      for(const m of r.matches){
        if(m.played)continue;
        if(!m.team1Id||!m.team2Id){finishMatch(t,m,ri);continue}
        if(eq(m.team1Id,current.schoolId)||eq(m.team2Id,current.schoolId)){addUserTournamentGame(t,m,ri);t.status=`${m.label||r.name}: awaiting your game`;return}
        finishMatch(t,m,ri);
      }
      if(r.matches.some(m=>!m.played))return;
      buildNextRound(t,ri);
    }
    if(t.format==='third'&&t.thirdPlaceGame&&!t.thirdPlaceGame.played){const m=t.thirdPlaceGame;if(eq(m.team1Id,current.schoolId)||eq(m.team2Id,current.schoolId)){addUserThirdPlaceGame(t,m);t.status='3rd Place Game: awaiting your game';return}finishThirdPlace(t,m)}
    if(t.format==='third'&&t.thirdPlaceGame?.played){t.placements=t.placements||{};t.placements[3]=t.thirdPlaceGame.winnerId;const fourth=loserOf(t.thirdPlaceGame);if(fourth)t.placements[4]=fourth;t.status=t.championId?`${getTeam(t.championId)?.name||'Unknown'} — Champion • 3rd place decided`:'Complete'}
  }
  function processUserTournament(game){
    const t=current.tournaments.find(x=>eq(x.id,game.tournamentId));if(!t)throw new Error('Tournament bracket could not be found.');
    if(game.tournamentPlacement==='third'){const m=t.thirdPlaceGame;if(!m||(!eq(m.id,game.tournamentMatchId)&&game.tournamentMatchId))throw new Error('3rd-place matchup could not be found.');finishThirdPlace(t,m,{my:+game.myScore,opp:+game.oppScore});t.placements=t.placements||{};t.placements[3]=m.winnerId;const fourth=loserOf(m);if(fourth)t.placements[4]=fourth;advanceTournament(t);return}
    let ri=Number(game.tournamentRound)||0,r=t.rounds?.[ri],m=r?.matches?.find(x=>eq(x.id,game.tournamentMatchId));
    if(!m&&game.tournamentMatchId){for(let i=0;i<(t.rounds||[]).length;i++){const hit=t.rounds[i]?.matches?.find(x=>eq(x.id,game.tournamentMatchId));if(hit){ri=i;r=t.rounds[i];m=hit;break}}}
    if(!m){for(let i=0;i<(t.rounds||[]).length;i++){const hit=t.rounds[i]?.matches?.find(x=>!x.played&&(eq(x.team1Id,current.schoolId)||eq(x.team2Id,current.schoolId)));if(hit){ri=i;r=t.rounds[i];m=hit;game.tournamentRound=i;game.tournamentMatchId=hit.id;break}}}
    if(!r||!m)throw new Error('Tournament matchup could not be found. Open the Tournament Center once to repair this bracket, then try again.');
    finishMatch(t,m,ri,{my:+game.myScore,opp:+game.oppScore});
    for(const other of r.matches)if(!other.played)finishMatch(t,other,ri);
    buildNextRound(t,ri);
    if(!eq(m.winnerId,current.schoolId)){
      const canContinue=t.format==='placement'||(t.format==='third'&&ri===t.rounds.length-2);
      if(canContinue)t.status=t.format==='placement'?'Placement bracket continues': 'Advanced to 3rd Place Game';
      else{t.status=`Eliminated in ${m.label||r.name}`;current.schedule=current.schedule.filter(g=>!(eq(g.tournamentId,t.id)&&!g.played))}
    }
    advanceTournament(t);
  }

  function userRegularComplete(){const games=regularUserGames(current);return games.length>0&&games.every(g=>g.played)}
  function classRegularComplete(c){
    return current.teams.filter(t=>eq(t.class,c)).every(t=>(current.teamSchedules[t.id]||[]).filter(g=>!g.tournamentId).every(g=>g.played));
  }
  function lastRegularDate(c){
    const times=[];current.teams.filter(t=>eq(t.class,c)).forEach(t=>(current.teamSchedules[t.id]||[]).filter(g=>!g.tournamentId).forEach(g=>times.push(new Date(g.date).getTime())));
    return new Date(times.length?Math.max(...times):new Date(current.day).getTime()).toISOString();
  }
  function districtTournaments(c){return current.tournaments.filter(t=>t.kind==='District Tournament'&&eq(t.classNo,c))}
  function runPostseason(){
    if(!current)return;createLeagueSchedules(current);syncUserSchedule(current);const c=getTeam(current.schoolId)?.class;if(c==null)return;
    simulateAiThrough(current.day,c,false);
    if(!userRegularComplete()){rebuildRecords();return}
    simulateAiThrough(current.day,c,true);
    if(!classRegularComplete(c)){rebuildRecords();return}
    let districts=districtTournaments(c);
    if(!districts.length){
      const groups=new Map();current.teams.filter(t=>eq(t.class,c)).forEach(t=>{const d=String(t.district||1);if(!groups.has(d))groups.set(d,[]);groups.get(d).push(t)});
      const start=datePlus(lastRegularDate(c),3);
      for(const [d,teams] of [...groups.entries()].sort((a,b)=>Number(a[0])-Number(b[0])))createBracket({name:`Class ${c} District ${d} Tournament`,kind:'District Tournament',entrants:teams,startDate:start,classNo:c,districtNo:d,automatic:true});
      districts=districtTournaments(c);
    }
    districts.forEach(advanceTournament);
    if(districts.length&&districts.every(t=>t.championId)){
      let state=current.tournaments.find(t=>t.kind==='State Tournament'&&eq(t.classNo,c));
      if(!state){const champs=districts.map(t=>getTeam(t.championId)).filter(Boolean);state=createBracket({name:`MSHSAA Class ${c} State Tournament`,kind:'State Tournament',entrants:champs,startDate:datePlus(Math.max(...districts.map(t=>new Date(t.rounds.at(-1)?.date||current.day).getTime())),3),classNo:c,automatic:true})}
      advanceTournament(state);
    }
    rebuildRecords();
  }
  window.checkAutomaticPostseason=runPostseason;

  function bracketHTML(t){
    const main=`<div class="full-bracket">${(t.rounds||[]).map(r=>`<section class="bracket-stage"><small>${r.name}</small>${(r.matches||[]).map(m=>`<div class="bracket-match ${m.played?'played':''}">${m.label&&m.label!==r.name?`<div class="placement-label">${m.label}</div>`:''}<span>${getTeam(m.team1Id)?.name||'BYE / TBD'}${m.played&&m.team1Id?` <b>${m.score1??''}</b>`:''}</span><span>${getTeam(m.team2Id)?.name||'BYE / TBD'}${m.played&&m.team2Id?` <b>${m.score2??''}</b>`:''}</span>${m.winnerId?`<em>Winner: ${getTeam(m.winnerId)?.name||'TBD'}</em>`:''}</div>`).join('')||'<div class="bracket-match"><span>TBD</span><span>TBD</span></div>'}</section>`).join('<div class="bracket-arrow">→</div>')}</div>`;
    const third=t.thirdPlaceGame?`<section class="bracket-stage" style="margin-top:10px"><small>3rd Place Game</small><div class="bracket-match ${t.thirdPlaceGame.played?'played':''}"><span>${getTeam(t.thirdPlaceGame.team1Id)?.name||'TBD'}${t.thirdPlaceGame.played?` <b>${t.thirdPlaceGame.score1??''}</b>`:''}</span><span>${getTeam(t.thirdPlaceGame.team2Id)?.name||'TBD'}${t.thirdPlaceGame.played?` <b>${t.thirdPlaceGame.score2??''}</b>`:''}</span>${t.thirdPlaceGame.winnerId?`<em>3rd: ${getTeam(t.thirdPlaceGame.winnerId)?.name||'TBD'}</em>`:''}</div></section>`:'';
    const format=t.format==='placement'?'<p class="muted small"><b>Full placement bracket:</b> teams continue after losses so every finishing position can be decided.</p>':t.format==='third'?'<p class="muted small"><b>3rd-place format:</b> semifinal losers meet in a 3rd-place game.</p>':'';
    return format+main+third+placementSummaryHTML(t);
  }
  function renderTournamentList(target,allowRemove){
    const el=$(target);if(!el||!current)return;const ts=current.tournaments||[];
    el.innerHTML=ts.length?ts.map(t=>`<article class="card tournament-card"><div class="section-head"><div><p class="eyebrow">${t.kind||'Tournament'} • ${t.size}-TEAM BRACKET</p><h3>${t.name}</h3></div><span class="tag">${t.status||'Scheduled'}</span></div>${bracketHTML(t)}${allowRemove&&!t.automatic&&scheduleEditable()?`<button class="secondary wide" data-remove-v120="${t.id}">Remove Tournament</button>`:''}</article>`).join(''):'<article class="card"><h3>No tournaments yet</h3><p class="muted">District brackets begin automatically after every school in your class completes the regular season. State begins after every district champion is decided.</p></article>';
    el.querySelectorAll('[data-remove-v120]').forEach(b=>b.onclick=()=>{current.tournaments=current.tournaments.filter(t=>!eq(t.id,b.dataset.removeV120));current.schedule=current.schedule.filter(g=>!eq(g.tournamentId,b.dataset.removeV120));renderAll()});
  }
  renderTournamentCenter=function(){
    const status=$('tournamentHubStatus');if(status){
      const c=getTeam(current.schoolId)?.class,regular=userRegularComplete(),classTeams=current.teams.filter(t=>eq(t.class,c));
      const incomplete=classTeams.filter(t=>(current.teamSchedules[t.id]||[]).filter(g=>!g.tournamentId).some(g=>!g.played));
      const ds=districtTournaments(c),state=current.tournaments.find(t=>t.kind==='State Tournament'&&eq(t.classNo,c));
      let message='';
      if(!regular)message=`Finish your visible regular season (${regularUserGames(current).filter(g=>g.played).length}/${regularUserGames(current).length} complete).`;
      else if(incomplete.length)message=`Completing statewide Class ${c} schedules: ${classTeams.length-incomplete.length}/${classTeams.length} schools finished.`;
      else if(!ds.length)message='District brackets are being generated automatically.';
      else if(ds.some(t=>!t.championId))message=`Districts in progress: ${ds.filter(t=>t.championId).length}/${ds.length} champions decided.`;
      else if(!state)message='All district champions are set. Building the state bracket.';
      else if(!state.championId)message='State tournament in progress.';
      else message=`Season complete — ${getTeam(state.championId)?.name||'Unknown'} won the Class ${c} state championship.`;
      status.innerHTML=`<div class="row"><div><b>Automatic Missouri postseason</b><br><small>${message}</small></div><span class="tag">Class ${c}</span></div>`
    }
    renderTournamentList('tournamentHubList',true);
  };
  renderTournaments=function(){try{window.BM27TournamentEngine?.repair?.(current)}catch(e){console.warn('Bracket repair',e)}renderTournamentList('tournamentList',false);renderTournamentCenter()};

  createTournament=function(name,size,start,preset,chosenIds,options={}){
    if(!current)throw new Error('Open a career first.');
    const wanted=Math.max(4,Math.min(32,Number(size)||8));
    const roundsNeeded=Math.log2(wanted),requestedFormat=['single','third','placement'].includes(options?.format)?options.format:'single';
    const maxUserGames=requestedFormat==='third'?roundsNeeded+1:roundsNeeded;
    if((current.schedule||[]).filter(g=>!g.played).length+maxUserGames>26)throw new Error(`This ${requestedFormat==='third'?'3rd-place':requestedFormat==='placement'?'consolation/placement':'single-elimination'} tournament can require ${maxUserGames} schedule slots and would exceed the 26-game regular-season limit.`);
    const ids=(chosenIds||selectedTournamentIds?.()||[]).map(String);
    if(ids.length!==wanted-1)throw new Error(`Choose exactly ${wanted-1} other schools.`);
    const selected=ids.map(id=>getTeam(id)).filter(Boolean);
    if(selected.length!==wanted-1)throw new Error('One or more selected tournament schools could not be found.');
    const field=[getTeam(current.schoolId),...selected];
    const kind=preset==='holiday'?'Holiday Tournament':preset==='showme'?'Show-Me Tournament':'Custom Tournament';
    const format=requestedFormat;
    const t=createBracket({name:name||'Custom Tournament',kind,entrants:field,startDate:new Date(`${start}T18:00:00`).toISOString(),automatic:false,format});advanceTournament(t);persist();renderAll();return t;
  };

  simulateGame=function(g){
    if(!g||g.played)return;if(g?.nationalMatchId&&window.BM27SimulateNationalScheduleGame)return window.BM27SimulateNationalScheduleGame(g);if(g.tbd&&!g.opponentId)return toast('This matchup is still waiting for a bracket winner.');
    createLeagueSchedules(current);syncUserSchedule(current);
    const me=getTeam(current.schoolId),opp=getTeam(g.opponentId);if(!opp)return toast('Opponent could not be found.');
    const boost=g.home?2:-1,diff=(me.rating||70)-(opp.rating||70)+boost+(current.difficulty==='Freshman'?5:current.difficulty==='All-State'?-4:0);
    let my=Math.round(62+(me.rating||70)*.18+diff*.35+(Math.random()-.5)*20),os=Math.round(62+(opp.rating||70)*.18-diff*.25+(Math.random()-.5)*20);if(my===os)my++;
    g.played=true;g.myScore=my;g.oppScore=os;current.day=g.date;
    if(g.tournamentId)processUserTournament(g);else markLedger(current.schoolId,opp.id,g.date,my,os,g.matchId||`USER-${g.id}`,null,{type:g.type||'Regular Season'});
    simulateAiThrough(g.date,getTeam(current.schoolId)?.class,false);
    current.news.unshift({date:g.date,text:my>os?`${me.name} defeated ${opp.name}, ${my}-${os}.`:`${me.name} fell to ${opp.name}, ${my}-${os}.`});
    runPostseason();rebuildRecords();
    $('gameResult').innerHTML=`<div class="scoreboard"><p class="eyebrow">FINAL</p><h2>${my>os?'Victory':'Defeat'}</h2><div class="scoreline"><div>${me.name}</div><b>${my}</b><span>–</span><b>${os}</b><div>${opp.name}</div></div></div>`;$('gameDialog').showModal();
    renderAll();window.cloudGame?.forceSave(current).catch(e=>{console.error(e);toast('Game saved. Account update will retry automatically.')});
  };
  updateTournamentAfterGame=processUserTournament;processTournamentResult=processUserTournament;

  function repairActiveTournaments(save=current){
    if(!save)return;save.tournaments=Array.isArray(save.tournaments)?save.tournaments:[];save.schedule=Array.isArray(save.schedule)?save.schedule:[];
    for(const t of save.tournaments){
      if(!t||!Array.isArray(t.rounds))continue;t.format=['single','third','placement'].includes(t.format)?t.format:'single';t.placements=t.placements||{};
      t.rounds.forEach((r,ri)=>{r.matches=Array.isArray(r.matches)?r.matches:[];for(const m of r.matches){m.roundIndex=Number.isFinite(Number(m.roundIndex))?Number(m.roundIndex):ri;if(!m.label)m.label=t.format==='placement'?placementMatchLabel(t,m.path||'',ri):r.name}});
      if(t.format==='third'&&!t.thirdPlaceGame&&t.rounds.length>=2){
        const semi=t.rounds[t.rounds.length-2];
        if(semi?.matches?.length===2&&semi.matches.every(m=>m.played)){
          const losers=semi.matches.map(loserOf).filter(Boolean);
          if(losers.length===2){t.thirdPlaceGame={id:uid(),team1Id:losers[0],team2Id:losers[1],date:t.rounds[t.rounds.length-1]?.date||datePlus(semi.date,2),played:false,score1:null,score2:null,winnerId:null,label:'3rd Place Game'};addThirdPlaceLedger(t,t.thirdPlaceGame)}
        }
      }
      // Remove stale unplayed schedule rows whose bracket match no longer exists.
      const valid=new Set(t.rounds.flatMap(r=>r.matches||[]).map(m=>String(m.id)));if(t.thirdPlaceGame)valid.add(String(t.thirdPlaceGame.id));
      save.schedule=save.schedule.filter(g=>!eq(g.tournamentId,t.id)||g.played||!g.tournamentMatchId||valid.has(String(g.tournamentMatchId)));
      if(t.championId&&!(t.format==='third'&&t.thirdPlaceGame&&!t.thirdPlaceGame.played))continue;
      try{advanceTournament(t)}catch(e){console.warn('Tournament self-repair skipped',t.name,e)}
    }
  }
  window.BM27TournamentEngine={repair:repairActiveTournaments,advance:advanceTournament,process:processUserTournament,createBracket,buildNextRound};

  function migrate(save){
    if(!save)return;
    const upgrading=save.postseasonEngineVersion!==ENGINE;
    save.tournaments=(save.tournaments||[]).filter(t=>{
      const valid=t?.rounds?.every(r=>Array.isArray(r.matches));
      const obsoletePostseason=upgrading&&(t.kind==='District Tournament'||t.kind==='State Tournament');
      return valid&&!obsoletePostseason;
    });
    save.schedule=(save.schedule||[]).filter(g=>!g.tournamentId||save.tournaments.some(t=>eq(t.id,g.tournamentId)));
    createLeagueSchedules(save,upgrading);
    save.postseasonEngineVersion=ENGINE;
    if(save===current)repairActiveTournaments(save);
  }
  const previousOpen=openSave;openSave=function(id){previousOpen(id);migrate(current);runPostseason();rebuildRecords();renderAll()};
  const previousNew=newCareer;newCareer=function(...args){const save=previousNew(...args);migrate(save);return save};
  const previousAiSchedule=aiMakeSchedule;aiMakeSchedule=function(){previousAiSchedule();createLeagueSchedules(current,true);syncUserSchedule(current);renderAll()};
  const previousOffseason=applyOffseason;applyOffseason=function(){previousOffseason();if(current){current.tournaments=[];createLeagueSchedules(current,true);runPostseason();renderAll()}};
  if(current){migrate(current);runPostseason();rebuildRecords()}
})();


/* =========================================================
   VERSION 1.3.0 — REAL ROSTERS + UPDATE CENTER + RELEASE REPAIR
   ========================================================= */
(()=>{
  const CHANGELOG=[
    {version:'1.4.2',title:'District, Titles & Real Roster Hotfix',items:[
      'Deduplicates synced and legacy schools so the same program cannot appear twice in a district or postseason bracket.',
      'Existing careers automatically remap duplicate school IDs without deleting schedules or played results.',
      'District championships are now counted in Career History, and state titles are recorded by the rebuilt postseason engine.',
      'Real Roster Mode is a full career mode: it bypasses tryouts, builds the playable roster immediately, and clearly labels Real Roster saves.',
      'Added a safe admin SQL helper for ThatBRun; no password is stored in the game.'
    ]},
    {version:'1.4.0',title:'Rebuilt Season Engine & Chromebook App',items:[
      'Replaced the season, statewide simulation, tournament, district and state flow with one authoritative game ledger.',
      'Every AI regular-season matchup now exists once and both schools derive their records from the same result.',
      'Custom 4/8/16/32-team brackets, automatic districts and automatic state use the same bracket engine.',
      'Districts begin after the class regular season is complete; state begins from district champions only.',
      'Added Chromebook/PWA installation support with standalone app display and offline shell caching.',
      'Preserved Senior Night, real-roster mode, recruiting, cloud saves, school creator and MyGM systems.'
    ]},
    {version:'1.3.0',title:'Real Rosters & Reliability',items:[
      'Added Real Roster Mode for new careers with verified public 2025–26 player data where available.',
      'Added a What’s New button on the Career Hub and every in-game page.',
      'Fixed startup load order so every dialog exists before app.js attaches events.',
      'Added the missing Save Game button and live cloud-save status indicator.',
      'Fixed custom tournaments so the schools you select remain the actual bracket field.',
      'Records are rebuilt before standings and rankings render.',
      'Admin roster-pack sync can refresh verified roster data without deleting careers.'
    ]},
    {version:'1.2.x',title:'Postseason & Simulation',items:[
      'Statewide schedules, district brackets, state brackets, tournament advancement, cloud-save safeguards and mobile fixes.'
    ]}
  ];
  function renderUpdates(){
    const box=$('updatesContent');if(!box)return;
    box.innerHTML=CHANGELOG.map(r=>`<article class="card"><div class="section-head"><div><p class="eyebrow">VERSION ${r.version}</p><h3>${r.title}</h3></div></div><ul class="update-list">${r.items.map(x=>`<li>${x}</li>`).join('')}</ul></article>`).join('');
  }
  function openUpdates(){renderUpdates();$('updatesDialog')?.showModal()}
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',openUpdates));
  $('closeUpdatesBtn')?.addEventListener('click',()=>$('updatesDialog')?.close());

  async function syncRealRosterPack(){
    if(!window.cloudGame?.isAdmin)return toast('Only administrators can refresh the real roster pack.');
    const btn=$('syncRealRostersBtn'),status=$('rosterSyncStatus');if(btn)btn.disabled=true;if(status)status.textContent='Refreshing verified real roster pack…';
    try{
      const res=await fetch('/.netlify/functions/sync-real-rosters',{cache:'no-store'});const data=await res.json();if(!res.ok||!data?.schools)throw new Error(data?.error||`Roster sync returned ${res.status}`);
      window.BM27_REAL_ROSTERS=data;
      if(status)status.textContent=`Real roster pack ready: ${Object.keys(data.schools).length} schools with verified public player data. Updated ${data.updatedAt||'recently'}.`;
      toast('Real roster pack refreshed. New Real Roster careers will use it.');
    }catch(e){console.error(e);if(status)status.textContent=`Roster refresh failed: ${e.message||e}`;toast('Roster pack refresh failed; bundled data is still available.')}finally{if(btn)btn.disabled=false}
  }
  $('syncRealRostersBtn')?.addEventListener('click',syncRealRosterPack);

  // Recalculate records before tables/hero are drawn, so the UI never shows stale standings.
  const renderAllV130=renderAll;
  renderAll=function(){
    try{if(current&&typeof repairRecords==='function')repairRecords()}catch(e){console.warn('Record pre-render repair skipped',e)}
    renderAllV130();
  };

  // Make the roster source visible without changing the existing table layout.
  const renderRosterV130=renderRoster;
  renderRoster=function(){
    renderRosterV130();
    if(!current)return;const me=myTeam();const wrap=$('rosterTable');if(!wrap)return;
    const verified=Number(me.realRosterVerifiedCount)||0;
    if(current.rosterMode==='real')wrap.insertAdjacentHTML('afterbegin',`<div class="roster-source-note"><b>Real Roster Mode</b> • ${verified?`${verified} verified public player name${verified===1?'':'s'} for ${me.name}`:'No verified roster data for this school yet'} • player ratings are simulated.</div>`);
  };

  // Existing saves remain compatible; just fill newly introduced fields.
  const openSaveV130=openSave;
  openSave=function(id){openSaveV130(id);if(current){current.rosterMode=current.rosterMode||'generated';renderAll()}};

  // Expose diagnostics in console for quick field testing after deploy.
  window.BM27Diagnostics={
    version:'1.3.0',
    snapshot(){return current?{saveId:current.id,school:myTeam()?.name,rosterMode:current.rosterMode,record:`${myTeam()?.wins||0}-${myTeam()?.losses||0}`,schedule:current.schedule?.length||0,tournaments:current.tournaments?.length||0,teamSchedules:Object.keys(current.teamSchedules||{}).length}:null},
    run(){const issues=[];if(!$('leagueDialog'))issues.push('leagueDialog missing');if(!$('manualSaveBtn'))issues.push('manualSaveBtn missing');if(!$('saveStatusPill'))issues.push('saveStatusPill missing');if(!Array.isArray(window.D1_COLLEGES))issues.push('D1_COLLEGES missing');if(!window.BM27_REAL_ROSTERS)issues.push('real roster pack missing');return {ok:issues.length===0,issues,version:'1.3.0'}}
  };
})();

document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>window.BM27HydrateSchoolLogos?.(),0));
window.addEventListener('bm27-branding-cloud-loaded',()=>window.BM27HydrateSchoolLogos?.());
