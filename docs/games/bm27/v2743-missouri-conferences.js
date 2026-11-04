/* BM27 v2.7.43 — Missouri Conferences
   Adds statewide conference assignments, St. Louis Suburban pools, KC Suburban divisions,
   Gateway Athletic divisions, conference records, and a Season Mode Conferences page.
*/
(()=>{'use strict';
const VERSION='2.7.43';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
function save(){return typeof current!=='undefined'?current:null}
function persistSafe(){try{return persist?.()}catch(e){console.warn('v2743 persist',e)}}

const PRIMARY=[
'Big 8',
'Big Springs Conference',
'Black River League',
'Bootheel',
'Carroll-Livingston Activities Association (CLAA)',
'Central Activities',
'Central Ozark',
'Clarence Cannon',
'Crossroads',
'Eastern Missouri',
'Four Rivers',
'Frisco',
'Gasconade Valley',
'Golden Valley Vernon',
'Grand River',
'Greater Ozarks Conference (GOC)',
'Greater Kansas City Suburban Conference (GKCSC)',
'Harrison-Daviess-Caldwell (HDC)',
'Highway 275',
'Interscholastic League (Kansas City)',
'Interstate-70 (I-70)',
'James River Valley Conference (JRVC)',
'Jefferson County Activities Association (JCAA)',
'Kansas City Interscholastic (KCI)',
'Kaysinger',
'Lewis & Clark',
'Metro Catholic Conference (MCC)',
'Metro League',
'Mid-Lakes',
'Midland Empire',
'Mid-State',
'Mineral Area Activities Association (MAAA)',
'Mississippi Valley Conference (MVC)',
'Ozark 7 Conference',
'Ozarks Foothills',
'Ozark Highlands Conference (OHC)',
'Polk County League',
'Public High League (PHL)',
'Scott-Mississippi',
'Show-Me Central',
'South Central Association',
'South Central Activities Association',
'Southeast Missouri Conference (SEMOC)',
'Southwest Central League (SWCL)',
'Southwest Conference',
'Stoddard County Activities Association (SCAA)',
'Suburban St. Louis',
'Summit',
'Western Missouri (WEMO)',
'Suburban St. Louis — Yellow Pool',
'Suburban St. Louis — Red Pool',
'Suburban St. Louis — Green Pool',
'Suburban St. Louis — Blue Pool',
'Greater Kansas City Suburban — Gold',
'Greater Kansas City Suburban — Red',
'Greater Kansas City Suburban — White',
'Greater Kansas City Suburban — Blue',
'Gateway Athletic — North',
'Gateway Athletic — Central',
'Gateway Athletic — South',
'Missouri River Valley — East',
'Missouri River Valley — West',
'Independent'
];
const DIVISIONS=[
'Suburban St. Louis — Yellow Pool','Suburban St. Louis — Red Pool','Suburban St. Louis — Green Pool','Suburban St. Louis — Blue Pool',
'Greater Kansas City Suburban — Gold','Greater Kansas City Suburban — Red','Greater Kansas City Suburban — White','Greater Kansas City Suburban — Blue',
'Gateway Athletic — North','Gateway Athletic — Central','Gateway Athletic — South','Missouri River Valley — East','Missouri River Valley — West','JCAA — Large Schools','JCAA — Small Schools'
];
const ALL=[...new Set([...PRIMARY,...DIVISIONS])];

const MEMBERS={
  'Suburban St. Louis — Yellow Pool':['Marquette','Eureka','Kirkwood','Webster Groves','Lafayette (Wildwood)','Lafayette','McCluer','McCluer North'],
  'Suburban St. Louis — Red Pool':['Lindbergh','Parkway West','Parkway Central','Ladue','Oakville','Pattonville','Mehlville'],
  'Suburban St. Louis — Green Pool':['Parkway South','Parkway North','Rockwood Summit','Summit','Hazelwood East','Hazelwood West','Jennings','Riverview Gardens'],
  'Suburban St. Louis — Blue Pool':['Clayton','Affton','Seckman','Northwest (Cedar Hill)','Northwest','Normandy','STEAM Academy at McCluer South-Berkeley','Hazelwood Central','University City'],
  'Metro Catholic Conference (MCC)':['CBC','Christian Brothers College','Chaminade','De Smet Jesuit','St. Louis University High','SLUH','St. John Vianney','Vianney'],
  'Central Missouri Activities (CMAC)':['Rock Bridge','Hickman','Battle','Jefferson City','Helias Catholic','Capital City','Smith-Cotton'],
  'Gateway Athletic — Central':['Fort Zumwalt East','Fort Zumwalt North','Fort Zumwalt South','North Point','Washington','Timberland'],
  'Gateway Athletic — South':['Francis Howell','Troy Buchanan','Francis Howell Central','Francis Howell North','Fort Zumwalt West','Liberty (Wentzville)','Liberty Wentzville'],
  'Gateway Athletic — North':['Warrenton','Orchard Farm','Holt','St. Charles','St. Charles West','Winfield'],
  'Greater Kansas City Suburban — Gold':['Blue Springs','Blue Springs South',"Lee's Summit",'Lee’s Summit','Lee’s Summit West',"Lee's Summit West",'Liberty North','Raymore-Peculiar','Staley'],
  'Greater Kansas City Suburban — Red':['Lee’s Summit North',"Lee's Summit North",'Liberty','North Kansas City','Oak Park','Park Hill','Park Hill South','St. Joseph Central','Central (St. Joseph)'],
  'Greater Kansas City Suburban — White':['Belton','Fort Osage','Grain Valley','Platte County','Raytown','Truman','William Chrisman'],
  'Greater Kansas City Suburban — Blue':['Grandview','Kearney','Raytown South','Ruskin','Smithville','Winnetonka'],
  'Southeast Missouri Conference (SEMOC)':['Cape Girardeau Central','Cape Central','Jackson','Sikeston','Poplar Bluff','Charleston','Dexter','Kennett','New Madrid County Central','Notre Dame (Cape Girardeau)'],
  'Metro League':['MICDS','Priory','John Burroughs','Lutheran North','Principia','Lutheran South','Westminster Christian Academy'],
  'Public High League (PHL)':['Vashon','Soldan','Sumner','Gateway STEM','Cleveland NJROTC','Roosevelt','Carnahan'],
  'Mineral Area Activities Association (MAAA)':['Farmington','North County','Fredericktown','Arcadia Valley','Central (Park Hills)','Potosi','West County','Bismarck'],
  'Ozark Mountain Conference (OMC)':['Nixa','Kickapoo','Republic','Ozark','Joplin','Branson','Willard','Camdenton','Lebanon','West Plains','Glendale','Hillcrest','Parkview','Waynesville','Marshfield','Carl Junction','Webb City','Neosho'],
  'Midland Empire':['St. Pius X (Kansas City)','St. Pius X Kansas City','Excelsior Springs','Benton','Cameron','Chillicothe','Lafayette (St. Joseph)','Maryville','Savannah'],
  'Greater Ozarks Conference (GOC)':['Greenwood','Billings','Crane','Marion C. Early','New Covenant Academy','Pleasant Hope','Spokane'],
  'South Central Association':['Ava','Cabool','Houston','Liberty (Mountain View)','Mountain Grove','Salem','Thayer','Willow Springs'],
  'Mid-Lakes':['Fair Grove','Strafford','Buffalo','Forsyth','Hollister','Reeds Spring'],
  'Summit':['Seymour','Sparta','Conway','Fordland','Gainesville','Hartville','Norwood'],
  'Missouri River Valley — East':['Carrollton','Holden','Knob Noster','Lafayette County','Lexington','Richmond'],
  'Missouri River Valley — West':['Center','Clinton','Harrisonville','Oak Grove','Odessa','Pleasant Hill','Warrensburg'],
  'Independent':['Rockhurst','Cardinal Ritter','St. Francis Borgia','Rolla']
};
const LOOKUP=new Map();for(const [c,names] of Object.entries(MEMBERS))for(const n of names)LOOKUP.set(norm(n),c);
const PARENT={
  'Suburban St. Louis — Yellow Pool':'Suburban St. Louis','Suburban St. Louis — Red Pool':'Suburban St. Louis','Suburban St. Louis — Green Pool':'Suburban St. Louis','Suburban St. Louis — Blue Pool':'Suburban St. Louis',
  'Greater Kansas City Suburban — Gold':'Greater Kansas City Suburban Conference (GKCSC)','Greater Kansas City Suburban — Red':'Greater Kansas City Suburban Conference (GKCSC)','Greater Kansas City Suburban — White':'Greater Kansas City Suburban Conference (GKCSC)','Greater Kansas City Suburban — Blue':'Greater Kansas City Suburban Conference (GKCSC)',
  'Gateway Athletic — North':'Gateway Athletic Conference','Gateway Athletic — Central':'Gateway Athletic Conference','Gateway Athletic — South':'Gateway Athletic Conference',
  'Missouri River Valley — East':'Missouri River Valley (MRVC)','Missouri River Valley — West':'Missouri River Valley (MRVC)','JCAA — Large Schools':'Jefferson County Activities Association (JCAA)','JCAA — Small Schools':'Jefferson County Activities Association (JCAA)'
};
function conferenceForTeam(t){
  if(!t)return 'Independent';
  const own=String(t.conference||t.conferenceName||'').trim();
  if(t.conferenceManual&&own)return own;
  if(own&&own!=='Independent')return own;
  const mapped=LOOKUP.get(norm(t.name));if(mapped)return mapped;
  return 'Independent';
}
function assign(s=save()){
  if(!s)return 0;s.v2743=s.v2743||{};let changed=0;
  for(const t of s.teams||[]){if(t.outOfState||t.nationalOnly)continue;const c=conferenceForTeam(t);if(t.conference!==c){t.conference=c;changed++}const p=c;if(t.conferenceParent!==p){t.conferenceParent=p;changed++}}
  s.v2743.version=VERSION;s.v2743.assignedAt=s.v2743.assignedAt||new Date().toISOString();return changed;
}
function confId(t){return conferenceForTeam(t)}
function isConferenceGame(g,s=save()){
  if(!g||!s||g.status!=='final'||/Tournament/i.test(String(g.type||'')))return false;
  const a=(s.teams||[]).find(t=>eq(t.id,g.team1Id)),b=(s.teams||[]).find(t=>eq(t.id,g.team2Id));if(!a||!b)return false;return confId(a)!=='Independent'&&confId(a)===confId(b);
}
function records(s=save()){
  const map=new Map((s?.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly).map(t=>[String(t.id),{w:0,l:0,pf:0,pa:0}]));
  for(const g of s?.seasonEngine?.games||[]){if(!isConferenceGame(g,s))continue;const a=map.get(String(g.team1Id)),b=map.get(String(g.team2Id));if(!a||!b)continue;a.pf+=Number(g.score1)||0;a.pa+=Number(g.score2)||0;b.pf+=Number(g.score2)||0;b.pa+=Number(g.score1)||0;if(Number(g.score1)>Number(g.score2)){a.w++;b.l++}else{b.w++;a.l++}}
  return map;
}
function markUserSchedule(s=save()){
  if(!s)return;const me=(s.teams||[]).find(t=>eq(t.id,s.schoolId));if(!me)return;
  for(const g of s.schedule||[]){if(/Tournament/i.test(String(g.type||'')))continue;const o=(s.teams||[]).find(t=>eq(t.id,g.opponentId));g.conferenceGame=!!(o&&confId(me)!=='Independent'&&confId(me)===confId(o));if(g.conferenceGame&&['Regular Season','Conference',''].includes(String(g.type||'')))g.type='Conference'}
}
function ensureUI(){
  if(!$('v2743ConferenceNav')){const anchor=document.querySelector('.nav[data-page="standings"]');if(anchor){const b=document.createElement('button');b.className='nav';b.id='v2743ConferenceNav';b.dataset.page='conferences';b.textContent='Conferences';anchor.insertAdjacentElement('afterend',b)}}
  if(!$('conferencesPage')){const sec=document.createElement('section');sec.id='conferencesPage';sec.className='page';sec.innerHTML=`<div class="section-head"><div><p class="eyebrow">MISSOURI CONFERENCES</p><h3>Conference Center</h3><p class="muted small">Conference records are separate from district standings. Same-conference regular-season games automatically count here.</p></div><span id="v2743UserConference" class="tag">Conference</span></div><div id="v2743ConferenceMetrics" class="metrics"></div><article class="card"><div class="section-head"><div><h3>Conference Standings</h3><p class="muted small">Choose any Missouri conference or division.</p></div><select id="v2743ConferenceSelect"></select></div><div id="v2743ConferenceStandings" class="table-wrap"></div></article><article class="card"><div class="section-head"><div><h3>All Missouri Conferences</h3><p class="muted small">Includes statewide primary conferences plus the major basketball divisions used by the Suburban, Gateway and Kansas City leagues.</p></div><span class="tag">${PRIMARY.length} PRIMARY</span></div><div id="v2743ConferenceDirectory" class="v2743-directory"></div></article>`;const page=$('standingsPage');page?.parentNode?.insertBefore(sec,page.nextSibling)}
  if(!$('v2743ConferenceStyle')){const st=document.createElement('style');st.id='v2743ConferenceStyle';st.textContent='.v2743-directory{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.5rem}.v2743-conf-chip{padding:.65rem .75rem;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.035);font-size:.86rem}.v2743-user-row{background:rgba(255,255,255,.06)}';document.head.appendChild(st)}
}
function standingsFor(c,s=save()){
  const rec=records(s);return (s?.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly&&confId(t)===c).map(t=>({t,r:rec.get(String(t.id))||{w:0,l:0,pf:0,pa:0}})).sort((a,b)=>b.r.w-a.r.w||a.r.l-b.r.l||(b.t.wins||0)-(a.t.wins||0)||(b.t.rating||0)-(a.t.rating||0));
}
function render(){
  ensureUI();const s=save();if(!s)return;assign(s);markUserSchedule(s);const me=(s.teams||[]).find(t=>eq(t.id,s.schoolId)),myc=confId(me),rec=records(s),myr=rec.get(String(s.schoolId))||{w:0,l:0};
  $('v2743UserConference').textContent=myc;$('v2743ConferenceMetrics').innerHTML=`<div class="metric"><span>Your Conference</span><b>${esc(myc)}</b></div><div class="metric"><span>Conference Record</span><b>${myr.w}-${myr.l}</b></div><div class="metric"><span>Overall Record</span><b>${Number(me?.wins)||0}-${Number(me?.losses)||0}</b></div><div class="metric"><span>Conference Members</span><b>${standingsFor(myc,s).length}</b></div>`;
  const sel=$('v2743ConferenceSelect');if(sel){const keep=sel.value||myc;const choices=[...new Set([...ALL,...(s.teams||[]).map(t=>t.conference).filter(Boolean),...(()=>{try{return JSON.parse(localStorage.getItem('bm27_user_conferences')||'[]')}catch{return []}})()])];sel.innerHTML=choices.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');sel.value=choices.includes(keep)?keep:myc;sel.onchange=()=>renderTable(sel.value)};
  const listing=[...new Set([...PRIMARY,...(s.teams||[]).map(t=>t.conference).filter(c=>c&&!PRIMARY.includes(c)&&!DIVISIONS.includes(c)&&!/^Missouri Class .*Unassigned/i.test(c))])];
  $('v2743ConferenceDirectory').innerHTML=listing.map(c=>`<div class="v2743-conf-chip"><b>${esc(c)}</b><br><small>${standingsFor(c,s).length} loaded team${standingsFor(c,s).length===1?'':'s'}</small></div>`).join('');renderTable(sel?.value||myc);
}
function renderTable(c){const s=save(),rows=standingsFor(c,s),box=$('v2743ConferenceStandings');if(!box)return;box.innerHTML=rows.length?`<table><thead><tr><th>#</th><th>School</th><th>Conf</th><th>Overall</th><th>PF</th><th>PA</th></tr></thead><tbody>${rows.map((x,i)=>`<tr class="${eq(x.t.id,s.schoolId)?'v2743-user-row':''}"><td>${i+1}</td><td><b>${esc(x.t.name)}</b></td><td>${x.r.w}-${x.r.l}</td><td>${Number(x.t.wins)||0}-${Number(x.t.losses)||0}</td><td>${x.r.pf}</td><td>${x.r.pa}</td></tr>`).join('')}</tbody></table>`:`<p class="muted">No currently loaded Missouri schools are assigned to ${esc(c)}.</p>`}
function activate(){document.querySelectorAll('.nav[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page==='conferences'));document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$('conferencesPage')?.classList.add('active');if($('pageTitle'))$('pageTitle').textContent='Conferences';$('game')?.classList.remove('menu-open');render()}
function install(){if(window.__BM27_V2743__)return;window.__BM27_V2743__=true;ensureUI();if(save()){if(assign())persistSafe();markUserSchedule(save())}if(typeof renderAll==='function'){const base=renderAll;renderAll=function(){if(save()){assign(save());markUserSchedule(save())}const r=base.apply(this,arguments);render();return r}}if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);if(save()){assign(save());markUserSchedule(save());persistSafe()}render();return r}}document.addEventListener('click',e=>{if(e.target.closest?.('#v2743ConferenceNav')){e.preventDefault();activate()}},true);render();try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.43'}catch{}}
window.BM27V2743={version:VERSION,primaryConferences:PRIMARY,divisions:DIVISIONS,conferenceFamilies:PARENT,conferenceForTeam:confId,assign,records,standingsFor,render};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
