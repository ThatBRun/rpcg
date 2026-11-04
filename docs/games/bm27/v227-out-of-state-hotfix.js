(()=>{
'use strict';
const VERSION='2.3.3';
const STATES=[
 ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['DC','District of Columbia']
];
const PUBLIC='https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_ADMINDATA_PUBLICSCH_2425/MapServer/1/query';
const PRIVATE='https://nces.ed.gov/opengis/rest/services/K12_School_Locations/EDGE_GEOCODE_PRIVATESCH_2324/MapServer/0/query';
const cache=new Map();
const $v=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eq=(a,b)=>String(a)===String(b);
const stateName=abbr=>STATES.find(s=>s[0]===abbr)?.[1]||abbr;
function opts(selected='IL'){return STATES.filter(s=>s[0]!=='MO').map(([a,n])=>`<option value="${a}" ${a===selected?'selected':''}>${n}</option>`).join('')}
function stableRating(id=''){let h=2166136261;for(const c of String(id)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return 58+(Math.abs(h)%30)}
function isOOS(t){return !!(t?.outOfState||String(t?.class)==='Out of State')}
function makeImported(raw){
 const id=raw.id,existing=current?.teams?.find(t=>eq(t.id,id));if(existing)return existing;
 const base={id,name:raw.name,mascot:'',city:raw.city||'',state:raw.state,class:'Out of State',district:raw.state,primary:'#334155',secondary:'#f8fafc',conference:`${stateName(raw.state)} • Out of State`,outOfState:true,nationalDirectory:true,ncesSource:raw.source,ncesSchoolYear:raw.year,rating:stableRating(id),wins:0,losses:0,pf:0,pa:0};
 base.roster=Array.from({length:13},(_,i)=>typeof makePlayer==='function'?makePlayer(base,i,current?.season||2026):{id:`${id}-p${i}`,name:`Player ${i+1}`,pos:['PG','SG','SF','PF','C'][i%5],grade:9+i%4,overall:base.rating,minutes:i<5?28:10});
 if(typeof teamRating==='function')base.rating=teamRating(base.roster)||base.rating;
 current.teams.push(base);current.v227=current.v227||{};current.v227.importedOutOfStateIds=[...new Set([...(current.v227.importedOutOfStateIds||[]),String(id)])];persist?.();return base;
}
async function arcgis(url,where,outFields){
 let offset=0,all=[];
 for(let guard=0;guard<10;guard++){
  const p=new URLSearchParams({where,outFields,returnGeometry:'false',f:'json',resultOffset:String(offset),resultRecordCount:'2000',orderByFields:outFields.split(',')[1]||outFields.split(',')[0]});
  const r=await fetch(`${url}?${p}`,{cache:'force-cache'});if(!r.ok)throw new Error(`NCES directory returned ${r.status}`);const j=await r.json();if(j.error)throw new Error(j.error.message||'NCES directory error');const f=j.features||[];all.push(...f.map(x=>x.attributes||{}));if(f.length<2000)break;offset+=f.length;
 }
 return all;
}
async function loadState(abbr){
 abbr=String(abbr||'').toUpperCase();if(abbr==='MO')return [];
 if(cache.has(abbr))return cache.get(abbr);
 const task=(async()=>{
  // Public directory: high schools and combined schools that offer grade 12.
  const pub=await arcgis(PUBLIC,`LSTATE='${abbr}' AND GSHI='12'`,`NCESSCH,SCH_NAME,LCITY,LSTATE,GSLO,GSHI,SCHOOL_LEVEL,SY_STATUS_TEXT`);
  const publicRows=pub.filter(a=>!/closed/i.test(a.SY_STATUS_TEXT||'')).map(a=>({id:`nces-public-${a.NCESSCH}`,name:a.SCH_NAME||'Unnamed School',city:a.LCITY||'',state:a.LSTATE||abbr,source:'NCES CCD Public',year:'2024-25',kind:'Public',gradeSpan:`${a.GSLO||'?'}-${a.GSHI||'12'}`}));
  // NCES private EDGE is the complete PSS location universe. Its geocode layer does not publish grade-span fields,
  // so it is included as the private-school directory rather than pretending grade data exists.
  let privateRows=[];try{const prv=await arcgis(PRIVATE,`STATE='${abbr}'`,`PPIN,NAME,CITY,STATE,SCHOOLYEAR`);privateRows=prv.map(a=>({id:`nces-private-${a.PPIN}`,name:a.NAME||'Unnamed School',city:a.CITY||'',state:a.STATE||abbr,source:'NCES PSS Private',year:a.SCHOOLYEAR||'2023-24',kind:'Private',gradeSpan:'PSS directory'}))}catch(e){console.warn('BM27 private directory unavailable',e)}
  const seen=new Set(),rows=[];for(const s of [...publicRows,...privateRows].sort((a,b)=>a.name.localeCompare(b.name))){const k=`${s.name}|${s.city}|${s.kind}`.toLowerCase();if(!seen.has(k)){seen.add(k);rows.push(s)}}return rows;
 })();cache.set(abbr,task);try{const rows=await task;cache.set(abbr,rows);return rows}catch(e){cache.delete(abbr);throw e}
}

let allStatesPromise=null;
async function loadAllOutOfStateSchools({force=false}={}){
 if(allStatesPromise&&!force)return allStatesPromise;
 if(force){allStatesPromise=null;for(const [abbr] of STATES)if(abbr!=='MO')cache.delete(abbr)}
 const codes=STATES.map(x=>x[0]).filter(x=>x!=='MO');
 window.BM27OutOfStateLoadStatus={loaded:0,total:codes.length,schools:0,failed:[],complete:false};
 allStatesPromise=(async()=>{
   const rows=[];let cursor=0;
   async function worker(){
     while(cursor<codes.length){
       const st=codes[cursor++];let result=null,lastErr=null;
       for(let attempt=1;attempt<=3&&!result;attempt++){try{result=await loadState(st)}catch(e){lastErr=e;if(attempt<3)await new Promise(r=>setTimeout(r,250*attempt))}}
       if(result){rows.push(...result)}else{window.BM27OutOfStateLoadStatus.failed.push({state:st,error:lastErr?.message||String(lastErr||'Unknown error')})}
       window.BM27OutOfStateLoadStatus.loaded++;window.BM27OutOfStateLoadStatus.schools=rows.length;
     }
   }
   await Promise.all(Array.from({length:8},worker));
   const unique=new Map();for(const r of rows)if(r?.id)unique.set(String(r.id),r);
   window.BM27AllOutOfStateSchools=[...unique.values()];
   window.BM27NationalDirectory=window.BM27AllOutOfStateSchools;
   window.BM27OutOfStateLoadStatus.schools=window.BM27AllOutOfStateSchools.length;
   window.BM27OutOfStateLoadStatus.complete=window.BM27OutOfStateLoadStatus.failed.length===0;
   window.dispatchEvent(new CustomEvent('bm27-out-of-state-loaded',{detail:window.BM27OutOfStateLoadStatus}));
   return window.BM27AllOutOfStateSchools;
 })();
 return allStatesPromise;
}
function resultRows(rows,q=''){q=q.trim().toLowerCase();return q?rows.filter(s=>`${s.name} ${s.city} ${s.kind}`.toLowerCase().includes(q)):rows}
function searchMarkup(prefix,selected='IL',context='schedule'){
 return `<div class="card" id="${prefix}Box" style="margin:12px 0"><div class="section-head"><div><b>Out of State Team Search</b><p class="muted small">Search NCES schools by state. Public results are schools offering grade 12; private results use the NCES PSS directory.</p></div><span class="tag">No class movement</span></div><div class="assignment-controls"><label>State<select id="${prefix}State">${opts(selected)}</select></label><label>Search<input id="${prefix}Query" placeholder="School or city"></label></div><button type="button" class="secondary wide" id="${prefix}Load">Search ${context==='tournament'?'Tournament Teams':'Teams'}</button><div id="${prefix}Status" class="muted small" style="margin-top:8px"></div><div id="${prefix}Results" class="stack" style="max-height:310px;overflow:auto;margin-top:8px"></div></div>`
}
async function runSearch(prefix,onChoose){
 const st=$v(`${prefix}State`)?.value,q=$v(`${prefix}Query`)?.value||'',status=$v(`${prefix}Status`),box=$v(`${prefix}Results`);if(!st||!box)return;
 status.textContent=`Loading ${stateName(st)}…`;box.innerHTML='';try{const all=await loadState(st),rows=resultRows(all,q);status.textContent=`${rows.length.toLocaleString()} matching schools • ${all.length.toLocaleString()} loaded for ${stateName(st)}`;box.innerHTML=rows.slice(0,500).map(s=>`<div class="row"><div class="grow"><b>${esc(s.name)}</b><br><small>${esc(s.city)}, ${esc(s.state)} • ${esc(s.kind)} • ${esc(s.gradeSpan)}</small></div><button type="button" class="primary small-btn" data-v227-pick="${esc(s.id)}">${onChoose.label}</button></div>`).join('')||(q?'<p class="muted">No matching schools.</p>':'<p class="muted">No schools returned for this state.</p>');if(rows.length>500)box.insertAdjacentHTML('beforeend',`<p class="muted small">Showing the first 500 matches. Type a school/city to narrow the list.</p>`);box.querySelectorAll('[data-v227-pick]').forEach(b=>b.onclick=()=>{const s=all.find(x=>eq(x.id,b.dataset.v227Pick));if(s)onChoose.pick(s,b)})}catch(e){console.error(e);status.textContent=`Out-of-state directory could not load: ${e.message||e}`;box.innerHTML='<p class="muted">Check your internet connection and try again.</p>'}
}
function installScheduleSearch(){
 if(typeof openScheduleDialog!=='function')return;const base=openScheduleDialog;openScheduleDialog=function(...args){const r=base(...args);const form=$v('scheduleForm');if(form&&!$v('v227ScheduleBox')){const label=$v('scheduleOpponent')?.closest('label');label?.insertAdjacentHTML('afterend',searchMarkup('v227Schedule','IL','schedule'));$v('v227ScheduleLoad').onclick=()=>runSearch('v227Schedule',{label:'Use Team',pick:(s)=>{const t=makeImported(s),sel=$v('scheduleOpponent');if(![...sel.options].some(o=>eq(o.value,t.id)))sel.add(new Option(`${t.name}${t.city?' — '+t.city+', '+t.state:''} — Out of State`,t.id));sel.value=t.id;toast?.(`${t.name} selected as an out-of-state opponent.`)}});$v('v227ScheduleQuery').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$v('v227ScheduleLoad').click()}}}return r}
}
function installTournamentSearch(){
 if(typeof openTournamentDialog!=='function')return;const base=openTournamentDialog;openTournamentDialog=function(...args){const r=base(...args);const form=$v('tournamentForm');if(form&&!$v('v227TournamentBox')){$v('tournamentSchoolPicker')?.insertAdjacentHTML('afterend',searchMarkup('v227Tournament','IL','tournament'));$v('v227TournamentLoad').onclick=()=>runSearch('v227Tournament',{label:'Add to Picker',pick:(s,b)=>{const t=makeImported(s);if(typeof renderTournamentPicker==='function')renderTournamentPicker();const cb=document.querySelector(`#tournamentSchoolPicker input[value="${CSS.escape(String(t.id))}"]`);if(cb&&!cb.checked){cb.click();b.textContent='Added';b.disabled=true}else if(cb?.checked){b.textContent='Already Added';b.disabled=true}else toast?.('Team imported. Search its name in the tournament picker to select it.')}});$v('v227TournamentQuery').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$v('v227TournamentLoad').click()}}}return r}
}
function renderOOSBrowser(host){
 const selected=host.dataset.oosState||'IL',query=host.dataset.oosQuery||'';
 host.innerHTML=`<div class="section-head"><div><p class="eyebrow">CLASS & DISTRICT ASSIGNMENTS</p><h2>Out of State</h2><p class="muted">National teams do not promote, relegate, or enter Missouri district/state postseason. Pick any state to browse its NCES directory.</p></div><span class="tag">Permanent Out of State</span></div><div class="assignment-controls"><label>Division<select id="assignmentClass"><option value="out-of-state" selected>Out of State</option></select></label><label>State<select id="v227ClassState">${opts(selected)}</select></label><label>Search<input id="v227ClassQuery" value="${esc(query)}" placeholder="School or city"></label></div><button id="v227ClassLoad" class="secondary">Load State Teams</button><div id="v227ClassStatus" class="muted small" style="margin:10px 0"></div><div id="v227ClassResults" class="district-assignment-grid"></div>`;
 const doLoad=async()=>{const st=$v('v227ClassState').value,q=$v('v227ClassQuery').value;host.dataset.oosState=st;host.dataset.oosQuery=q;const stat=$v('v227ClassStatus'),grid=$v('v227ClassResults');stat.textContent=`Loading ${stateName(st)}…`;grid.innerHTML='';try{const all=await loadState(st),rows=resultRows(all,q);stat.textContent=`${rows.length.toLocaleString()} matching schools • ${all.length.toLocaleString()} in the loaded NCES ${stateName(st)} directory`;const groups={Public:rows.filter(x=>x.kind==='Public'),Private:rows.filter(x=>x.kind==='Private')};grid.innerHTML=Object.entries(groups).filter(([,v])=>v.length).map(([kind,list])=>`<section class="district-assignment"><div class="district-assignment-head"><b>${kind} Schools</b><span>${list.length.toLocaleString()}</span></div>${list.slice(0,400).map(s=>`<div class="assignment-school"><span class="school-color-dot" style="--school-color:#64748b"></span><div><b>${esc(s.name)}</b><small>${esc(s.city)}, ${esc(s.state)} • ${esc(s.gradeSpan)}</small></div></div>`).join('')}${list.length>400?'<small class="muted">Search to narrow this list.</small>':''}</section>`).join('')||'<p class="muted">No matching schools.</p>'}catch(e){stat.textContent=`Directory could not load: ${e.message||e}`}};
 $v('v227ClassLoad').onclick=doLoad;$v('v227ClassState').onchange=doLoad;$v('v227ClassQuery').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();doLoad()}};doLoad();
}
function installClassesBrowser(){
 if(typeof renderClassesDistricts!=='function')return;const base=renderClassesDistricts;renderClassesDistricts=function(...args){const host=$v('classesDistrictsContent');if(host?.dataset.classNo==='out-of-state'){renderOOSBrowser(host);return}const r=base(...args);if(!host)return r;const sel=$v('assignmentClass');if(sel&&!sel.querySelector('option[value="out-of-state"]'))sel.add(new Option('Out of State','out-of-state'));if(sel){const prev=sel.onchange;sel.onchange=e=>{if(e.target.value==='out-of-state'){host.dataset.classNo='out-of-state';renderOOSBrowser(host)}else prev?.call(sel,e)}}return r}
}
function installFormatting(){
 if(typeof renderSchedule==='function'){const base=renderSchedule;renderSchedule=function(...args){const r=base(...args);if(!current)return r;document.querySelectorAll('#scheduleList .schedule-row small').forEach(()=>{});return r}}
}
function installUpdates(){document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const box=$v('updatesContent');if(!box||box.querySelector('[data-v227-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v227-notes><p class="eyebrow">BM27 v2.2.7</p><h3>Out-of-State Opponents Hotfix</h3><ul class="update-list"><li>Added an Out of State division to Classes & Districts with state-by-state NCES school browsing.</li><li>Added out-of-state team search when scheduling regular-season games.</li><li>Added out-of-state team search/import for custom tournaments.</li><li>Imported out-of-state opponents are fully playable and receive generated BM27 rosters/ratings.</li><li>Out-of-state teams are excluded from Missouri rankings, district/state postseason, class promotion and relegation.</li><li>Uses NCES CCD 2024–25 public-school data and NCES PSS 2023–24 private-school directory data.</li></ul></article>`);if(current){current.v227=current.v227||{};current.v227.seenUpdate=VERSION;persist?.()}},0),{capture:true}))}
function migrate(){if(!current)return;current.v227=current.v227||{};for(const t of current.teams||[]){if(isOOS(t)){t.outOfState=true;t.class='Out of State';t.district=t.state||t.district||'Out of State';t.conference=t.conference||'Out of State'}}current.v227.version=VERSION}
function install(){if(window.__BM27_V227__)return;window.__BM27_V227__=true;installScheduleSearch();installTournamentSearch();installClassesBrowser();installFormatting();installUpdates();loadAllOutOfStateSchools().catch(e=>console.error('BM27 nationwide startup directory failed',e));if(typeof openSave==='function'){const base=openSave;openSave=function(...args){const r=base(...args);migrate();loadAllOutOfStateSchools().catch(()=>{});return r}}if(current){migrate();persist?.()}}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27OutOfState={version:VERSION,loadState,loadAllStates:loadAllOutOfStateSchools,importSchool:makeImported,isOutOfState:isOOS,getAll:()=>window.BM27AllOutOfStateSchools||[]};
})();
