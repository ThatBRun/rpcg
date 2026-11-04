/* BM27 v2.7.44 — Custom school management and conference controls */
(()=>{'use strict';
const $=id=>document.getElementById(id), key='bm27_custom_schools';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const customs=()=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch{return []}};
const write=x=>{if(typeof saveCustomSchools==='function')saveCustomSchools(x);else localStorage.setItem(key,JSON.stringify(x));BM27Storage.set('mshsaa_bm27_directory',JSON.stringify(directory));};
const notify=msg=>typeof toast==='function'?toast(msg):alert(msg);
const selected=()=>$('schoolSelect')?.value;
const same=(a,b)=>String(a??'')===String(b??'');
const overridesKey='bm27_conference_assignments_v2747';
function overrides(){try{return JSON.parse(localStorage.getItem(overridesKey)||'{}')||{}}catch{return {}}}
function applyOverrides(save){if(!save||!Array.isArray(save.teams))return;const map=overrides();for(const t of save.teams){const c=map[String(t.id)];if(c){t.conference=c;t.conferenceManual=true;t.conferenceParent=c}}}

const references=id=>(typeof saves==='undefined'?[]:saves).filter(s=>s.schoolId===id||(s.teams||[]).some(t=>t.id===id));
function updatePicker(){let box=$('bm27CustomManager');if(!box){box=document.createElement('div');box.id='bm27CustomManager';box.style.margin='12px 0';const sel=$('schoolSelect');if(!sel)return;sel.parentElement.insertAdjacentElement('afterend',box)}const entries=customs();box.innerHTML='<label>Manage custom schools <select id="bm27CustomTarget"><option value="">Select a custom school</option>'+entries.map(x=>`<option value="${safe(x.id)}">${safe(x.name)} ${safe(x.mascot||'')}</option>`).join('')+'</select></label><button class="secondary" type="button" id="bm27DeleteCustom" '+(!entries.length?'disabled':'')+'>Delete Custom School</button><p class="muted small">Built-in schools cannot be deleted. Schools used by saved careers are protected.</p>';
$('bm27DeleteCustom').onclick=()=>{const id=$('bm27CustomTarget').value,x=customs().find(x=>x.id===id);if(!x)return notify('Choose a custom school first.');const used=references(id);if(used.length)return notify('Cannot delete '+x.name+': it is used by '+used.length+' saved career(s). Delete those careers first.');if(!confirm('Permanently delete custom school '+x.name+' from this device?'))return;write(customs().filter(t=>t.id!==id));if(typeof renderLauncher==='function')renderLauncher(false);notify(x.name+' deleted from the custom school directory.');};}
function options(){const values=new Set([...(window.BM27V2743?.primaryConferences||[]),...(window.BM27V2743?.divisions||[])]);for(const s of (typeof directory!=='undefined'?directory:[]))if(s.conference&&s.conference!=='Independent')values.add(s.conference);for(const s of (typeof current!=='undefined'&&current?.teams||[]))if(s.conference&&s.conference!=='Independent')values.add(s.conference);try{for(const x of JSON.parse(localStorage.getItem('bm27_user_conferences')||'[]'))values.add(x)}catch{}return [...values].sort();}
function installCreatorPicker(){const input=$('customSchoolConference');if(!input)return;let list=$('bm27ConfSuggestions');if(!list){list=document.createElement('datalist');list.id='bm27ConfSuggestions';document.body.append(list);input.setAttribute('list',list.id)}list.innerHTML=options().map(x=>`<option value="${safe(x)}"></option>`).join('');input.placeholder='Choose or enter conference name';}
function seasonUnlocked(){
  if(typeof current==='undefined'||!current)return false;
  // The old fixed Nov 24 check used the wrong year for some saved careers.
  // A conference is editable until the first actual regular-season result.
  const myId=String(current.schoolId||'');
  // Only a completed REGULAR-SEASON game can lock conference changes.
  // Check every common event/phase label: some older saves store preseason in
  // seasonType, phase, category or competition rather than type.
  const isRegularSeasonGame=g=>{
    const labels=[g.type,g.gameType,g.seasonType,g.phase,g.category,g.competition,g.stage,g.eventType,g.leagueType]
      .filter(v=>v!=null&&String(v).trim()).map(v=>String(v).toLowerCase());
    if(labels.some(v=>/pre[ -]?season|exhibition|friendly|scrimmage|summer|fall|off[ -]?season|post[ -]?season|playoff|tournament|district|state championship|national championship/.test(v)))return false;
    return labels.length===0||labels.some(v=>/regular[ -]?season|conference|league/.test(v));
  };
  const isCompleted=g=>g.played===true||g.completed===true||g.final===true||
    ['final','completed','played'].includes(String(g.status||'').toLowerCase());
  const myGame=g=>!myId||[g.team1Id,g.team2Id,g.homeId,g.awayId,g.schoolId,g.opponentId].some(x=>String(x??'')===myId);
  const played=(current.schedule||[]).some(g=>isCompleted(g)&&isRegularSeasonGame(g)&&myGame(g));
  const leagueFinal=(current.seasonEngine?.games||[]).some(g=>isCompleted(g)&&isRegularSeasonGame(g)&&myGame(g));
  return !played&&!leagueFinal;
}
function rememberConference(team,name){
  team.conference=name;team.conferenceManual=true;
  const map=overrides();map[String(team.id)]=name;BM27Storage.set(overridesKey,JSON.stringify(map));
  if(typeof saves!=='undefined'&&Array.isArray(saves)){for(const save of saves)applyOverrides(save)}
  const matching=(typeof directory!=='undefined'?directory:[]).find(s=>String(s.id)===String(team.id));
  if(matching){matching.conference=name;matching.conferenceManual=true;}
  const entries=customs();const custom=entries.find(s=>String(s.id)===String(team.id));
  if(custom){custom.conference=name;custom.conferenceManual=true;write(entries);}
  if(typeof directory!=='undefined')BM27Storage.set('mshsaa_bm27_directory',JSON.stringify(directory));
  applyOverrides(current);window.BM27V2743?.assign?.(current);
  if(typeof persist==='function')persist();
  window.BM27V2743?.render?.();
}
function renderConferenceManager(){
  const dash=$('dashboardPage')||$('programPage');if(dash&&!$('bm27ConferenceShortcut')){const b=document.createElement('button');b.id='bm27ConferenceShortcut';b.className='secondary';b.type='button';b.textContent='Manage My School Conference';b.style.margin='10px 0';b.onclick=()=>{const nav=$('v2743ConferenceNav');if(nav)nav.click();else notify('Open Conferences from the side menu.');};dash.prepend(b)}const page=$('conferencesPage');if(!page)return;let box=$('bm27ConferenceManager');if(!box){box=document.createElement('article');box.id='bm27ConferenceManager';box.className='card';page.prepend(box)}const team=typeof current!=='undefined'?current?.teams?.find(t=>same(t.id,current.schoolId)):null;const enabled=seasonUnlocked();box.innerHTML=`<h3>Manage Conferences</h3><p class="muted small">Change your school's conference before regular-season play begins. Existing schedules and finished games remain unchanged.</p><label>My school's conference<select id="bm27MyConference" ${enabled?'':'disabled'}>${[...new Set([team?.conference,...options()].filter(Boolean))].map(c=>`<option value="${safe(c)}" ${c===team?.conference?'selected':''}>${safe(c)}</option>`).join('')}</select></label><button type="button" class="secondary" id="bm27SaveConference" ${enabled?'':'disabled'}>Save Conference</button><label>Create a conference<input id="bm27NewConference" maxlength="80" placeholder="Conference name"></label><button type="button" class="secondary" id="bm27CreateConference">Create Conference</button><p class="muted small">${enabled?'Conference transfers are open until your first regular-season game is completed.':'Conference transfers are locked because a regular-season game has been completed (or no career is loaded).'}</p>`;
$('bm27SaveConference').onclick=()=>{if(!seasonUnlocked())return notify('Conference changes are locked after the season starts.');const c=$('bm27MyConference').value;if(!team||!c)return;rememberConference(team,c);renderConferenceManager();notify('Conference updated to '+c+' and saved.');};
$('bm27CreateConference').onclick=()=>{const v=$('bm27NewConference').value.trim();if(!v)return notify('Enter a conference name.');if(v.length>80)return notify('Conference name is too long.');const existing=options();if(existing.some(x=>x.toLowerCase()===v.toLowerCase()))return notify('That conference already exists.');const stored=JSON.parse(localStorage.getItem('bm27_user_conferences')||'[]');stored.push(v);BM27Storage.set('bm27_user_conferences',JSON.stringify(stored));installCreatorPicker();renderConferenceManager();notify('Conference created: '+v);};}
function install(){
  // Apply the account's chosen conference assignments to older careers when loaded.
  if(typeof openSave==='function'&&!window.__bm2747Open){window.__bm2747Open=true;const original=openSave;openSave=function(){const result=original.apply(this,arguments);if(typeof current!=='undefined'&&current){applyOverrides(current);window.BM27V2743?.assign?.(current);if(typeof persist==='function')persist();renderConferenceManager()}return result}}
  installCreatorPicker();updatePicker();renderConferenceManager();const form=$('schoolCreatorForm');if(form&&!form.dataset.bm2744){form.dataset.bm2744='1';form.addEventListener('submit',()=>{setTimeout(()=>{const xs=customs(),x=xs[xs.length-1];if(x){x.conferenceManual=!!x.conference&&x.conference!=='Independent';if(!x.conferenceManual)x.conference='Missouri Class '+(x.class||'Other')+' — Unassigned';write(xs)}updatePicker();installCreatorPicker();},0)})}
if(typeof renderLauncher==='function'&&!window.__bm2744Launcher){window.__bm2744Launcher=true;const orig=renderLauncher;renderLauncher=function(){const r=orig.apply(this,arguments);updatePicker();return r;}}
if(typeof renderAll==='function'&&!window.__bm2744Render){window.__bm2744Render=true;const orig=renderAll;renderAll=function(){const r=orig.apply(this,arguments);renderConferenceManager();return r;}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
