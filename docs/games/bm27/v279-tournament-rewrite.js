/* BM27 v2.7.10 — Tournament Selection Count Fix + Tournament Center */
(()=>{
'use strict';
const VERSION='2.7.10';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const uid279=()=>{try{return crypto.randomUUID()}catch{return `v279-${Date.now()}-${Math.random().toString(36).slice(2)}`}};
const normalizeFormat=v=>['single','third','placement'].includes(v)?v:'single';
const ordinal=n=>{n=Number(n)||0;const v=n%100;const s=(v>=11&&v<=13)?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th');return `${n}${s}`};
const team=id=>(typeof current!=='undefined'&&current?.teams||[]).find(t=>eq(t.id,id));
const teamName=id=>team(id)?.name||'TBD';
const played=m=>!!(m&&(m.played||m.status==='final'));
const loserOf=m=>{if(!played(m)||!m?.team1Id||!m?.team2Id||!m?.winnerId)return null;return eq(m.winnerId,m.team1Id)?m.team2Id:m.team1Id};
const datePlus=(iso,days)=>{const d=new Date(iso);d.setDate(d.getDate()+days);return d.toISOString()};
const formatLabel=v=>v==='third'?'Single Elimination + 3rd Place':v==='placement'?'Full Consolation / Placement':'Single Elimination';
const roundLabels=size=>{const out=[];for(let left=Number(size);left>1;left/=2)out.push(left===32?'Round of 32':left===16?'Sweet 16':left===8?'Quarterfinal':left===4?'Semifinal':left===2?'Championship':`Round of ${left}`);return out};

function selectedPickerIds(){
  // The picker can be filtered by search, so DOM checkboxes are not an authoritative
  // count of everything the user selected. app.js keeps the full selection in
  // tournamentDraftSelection and exposes it through selectedTournamentIds().
  // Always prefer that complete list, then fall back to visible checked boxes.
  let ids=[];
  try{
    if(typeof selectedTournamentIds==='function') ids=selectedTournamentIds().map(String);
  }catch{}
  if(!ids.length) ids=[...document.querySelectorAll('#tournamentSchoolPicker input[data-tournament-school]:checked')].map(i=>String(i.value));
  const me=String(current?.schoolId||'');
  return [...new Set(ids.filter(id=>id&&id!==me))];
}
function tournamentKind(preset){return preset==='holiday'?'Holiday Tournament':preset==='showme'?'Show-Me Tournament':preset==='district'?'District Preview Tournament':'Custom Tournament'}
function scheduleEditable279(){try{return typeof scheduleEditable==='function'?!!scheduleEditable():true}catch{return true}}

function installBuilderUI(){
  const form=$('tournamentForm'),format=$('tournamentFormat');if(!form||!format||$('v279BracketMode'))return;
  const block=document.createElement('div');block.className='v279-builder-block';
  block.innerHTML=`<label>Bracket setup<select id="v279BracketMode"><option value="auto">Automatic seeding</option><option value="manual">Manual layout + byes</option></select><small class="muted">Manual layout lets you place every team into an exact first-round slot. Leave a slot as BYE to give the paired team a first-round pass.</small></label><div id="v279ManualBracketEditor" class="v279-manual-editor hidden"></div>`;
  format.closest('label')?.insertAdjacentElement('afterend',block);
  $('v279BracketMode').addEventListener('change',()=>{renderManualEditor(true);refreshSubmitState()});
  $('tournamentSize')?.addEventListener('change',()=>setTimeout(()=>{renderManualEditor(true);refreshSubmitState()},0));
  form.addEventListener('change',refreshSubmitState,true);
  form.addEventListener('input',refreshSubmitState,true);
  const submit=form.querySelector('button.primary');if(submit){new MutationObserver(()=>{if($('v279BracketMode')?.value==='manual'&&submit.disabled)submit.disabled=false}).observe(submit,{attributes:true,attributeFilter:['disabled']})}
  renderManualEditor(false);refreshSubmitState();
}

function manualTeamOptions(selected=''){
  if(typeof current==='undefined'||!current)return '<option value="">BYE</option>';
  const teams=(current.teams||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
  return `<option value="">BYE</option>${teams.map(t=>`<option value="${String(t.id).replace(/"/g,'&quot;')}" ${eq(t.id,selected)?'selected':''}>${t.name}${t.mascot?` ${t.mascot}`:''}</option>`).join('')}`;
}

function renderManualEditor(reset=false){
  const box=$('v279ManualBracketEditor'),mode=$('v279BracketMode');if(!box||!mode)return;
  const manual=mode.value==='manual';box.classList.toggle('hidden',!manual);if(!manual)return;
  const size=Number($('tournamentSize')?.value||8);
  let previous=[];
  if(!reset)previous=[...box.querySelectorAll('[data-v279-slot]')].map(s=>s.value);
  const checked=selectedPickerIds();
  const defaults=previous.length===size?previous:[String(current?.schoolId||''),...checked].slice(0,size);
  while(defaults.length<size)defaults.push('');
  box.innerHTML=`<div class="v279-manual-head"><div><b>Manual First-Round Layout</b><p class="muted small">Slots 1–2 play each other, 3–4 play each other, and so on. A team paired with BYE advances automatically.</p></div><div class="v279-manual-actions"><button type="button" class="secondary" id="v279FillSelected">Fill Selected</button><button type="button" class="secondary" id="v279ClearSlots">Clear</button></div></div><div class="v279-slot-grid">${Array.from({length:size},(_,i)=>`<label class="v279-slot"><span>Slot ${i+1}${i%2===0?' • Match '+(Math.floor(i/2)+1):''}</span><select data-v279-slot data-slot-index="${i}">${manualTeamOptions(defaults[i])}</select></label>`).join('')}</div><p id="v279ManualStatus" class="muted small"></p>`;
  $('v279FillSelected').onclick=()=>{
    const ids=[String(current?.schoolId||''),...selectedPickerIds().filter(id=>!eq(id,current?.schoolId))];
    [...box.querySelectorAll('[data-v279-slot]')].forEach((s,i)=>s.value=ids[i]||'');updateManualStatus();
  };
  $('v279ClearSlots').onclick=()=>{[...box.querySelectorAll('[data-v279-slot]')].forEach(s=>s.value='');const first=box.querySelector('[data-v279-slot]');if(first)first.value=String(current?.schoolId||'');updateManualStatus()};
  box.querySelectorAll('[data-v279-slot]').forEach(s=>s.addEventListener('change',updateManualStatus));
  updateManualStatus();
}
function manualSlots(){return [...document.querySelectorAll('#v279ManualBracketEditor [data-v279-slot]')].map(s=>String(s.value||''))}
function updateManualStatus(){
  const status=$('v279ManualStatus');if(!status)return;const slots=manualSlots(),filled=slots.filter(Boolean),unique=new Set(filled),byes=slots.length-filled.length,hasMe=filled.some(id=>eq(id,current?.schoolId));
  status.textContent=`${filled.length} teams • ${byes} BYE slot${byes===1?'':'s'}${unique.size!==filled.length?' • Duplicate team selected':''}${!hasMe?' • Your school must be included':''}`;
}
function refreshSubmitState(){
  const form=$('tournamentForm'),btn=form?.querySelector('button.primary');if(!btn)return;
  if($('v279BracketMode')?.value==='manual'){btn.disabled=false;updateManualStatus()}
}

function addInitialLedger(t,m,ri){
  if(!m?.team1Id||!m?.team2Id||typeof current==='undefined'||!current)return;
  current.teamSchedules=current.teamSchedules||{};
  for(const [id,opp] of [[m.team1Id,m.team2Id],[m.team2Id,m.team1Id]]){
    current.teamSchedules[id]=current.teamSchedules[id]||[];
    if(!current.teamSchedules[id].some(g=>eq(g.tournamentMatchId,m.id)))current.teamSchedules[id].push({id:uid279(),teamId:id,opponentId:opp,date:m.date,played:false,type:t.kind,tournamentId:t.id,tournamentMatchId:m.id,tournamentRound:ri,roundName:t.rounds[ri]?.name||'Tournament'});
  }
}

function createManualTournament(name,size,start,preset,format,slots){
  if(typeof current==='undefined'||!current)throw new Error('Open a Season career first.');
  if(!window.BM27TournamentEngine?.advance)throw new Error('Tournament engine is not ready. Reload BM27 and try again.');
  const wanted=Number(size);if(![4,8,16,32].includes(wanted))throw new Error('Tournament size must be 4, 8, 16, or 32 teams.');
  if(!start)throw new Error('Choose a tournament starting date.');
  if(!Array.isArray(slots)||slots.length!==wanted)throw new Error('The manual bracket slots are incomplete.');
  const filled=slots.filter(Boolean);if(filled.length<2)throw new Error('Put at least two teams into the bracket.');
  if(new Set(filled).size!==filled.length)throw new Error('A team can only appear once in a manual bracket.');
  if(!filled.some(id=>eq(id,current.schoolId)))throw new Error('Your school must appear in the manual bracket.');
  for(const id of filled)if(!team(id))throw new Error('One of the selected bracket teams could not be found.');
  const rounds=Math.log2(wanted),pending=(current.schedule||[]).filter(g=>!g.played&&!g.tournamentId).length;
  if(pending+rounds>26)throw new Error(`This tournament can require ${rounds} games for your team and would exceed the 26-game regular-season limit.`);
  const startISO=new Date(`${start}T18:00:00`).toISOString(),labels=roundLabels(wanted);
  const bracketRounds=labels.map((label,ri)=>({name:label,date:datePlus(startISO,ri*2),matches:[]}));
  for(let i=0;i<wanted;i+=2){bracketRounds[0].matches.push({id:uid279(),team1Id:slots[i]||null,team2Id:slots[i+1]||null,date:startISO,roundIndex:0,path:'',played:false,score1:null,score2:null,winnerId:null,label:labels[0]})}
  const t={id:uid279(),name:name||'Custom Tournament',kind:tournamentKind(preset),type:tournamentKind(preset),classNo:null,districtNo:null,size:wanted,automatic:false,format:normalizeFormat(format),formatVersion:2710,formatLabel:formatLabel(format),createdWithFormat:normalizeFormat(format),layoutMode:'manual',manualSlots:slots.slice(),status:'Scheduled',teams:filled.slice(),seeds:slots.slice(),rounds:bracketRounds,championId:null,placements:{},createdAt:new Date().toISOString()};
  current.tournaments=current.tournaments||[];current.tournaments.push(t);for(const m of bracketRounds[0].matches)addInitialLedger(t,m,0);
  window.BM27TournamentEngine.advance(t);syncTournamentToSeasonEngine(t);try{persist?.()}catch{}try{renderAll?.()}catch{}try{window.cloudGame?.forceSave?.(current).catch(()=>{})}catch{}
  try{toast?.(`${t.name} created — manual bracket with BYEs enabled.`)}catch{}return t;
}

function installSubmitOverride(){
  const form=$('tournamentForm');if(!form)return;
  form.onsubmit=e=>{
    e.preventDefault();
    try{
      const preset=$('tournamentPreset')?.value||'custom',size=Number($('tournamentSize')?.value||8),format=normalizeFormat($('tournamentFormat')?.value||'single'),mode=$('v279BracketMode')?.value||'auto';
      const names={holiday:'Holiday Classic',showme:'Show-Me Shootout',district:'District Preview Classic',custom:'Custom Tournament'},name=$('tournamentName')?.value.trim()||names[preset]||'Custom Tournament',start=$('tournamentStart')?.value;
      if(mode==='manual')createManualTournament(name,size,start,preset,format,manualSlots());
      else {
        const selected=selectedPickerIds(),needed=size-1;
        if(selected.length!==needed)throw new Error(`Choose exactly ${needed} other schools. ${selected.length} are currently selected.`);
        if(window.BM27V236?.createTournament)window.BM27V236.createTournament(name,size,start,preset,selected,{format});
        else if(typeof createTournament==='function')createTournament(name,size,start,preset,selected,{format});
        else throw new Error('Tournament creator is not available.');
      }
      $('tournamentDialog')?.close();
    }catch(err){try{toast?.(err.message||String(err))}catch{console.error(err)}}
  };
}

function pathBits(path=''){return String(path).split('').reduce((n,c)=>(n*2)+(c==='L'?1:0),0)}
function placementRange(size,path=''){const p=String(path),group=Math.max(2,Number(size)/Math.pow(2,p.length)),start=pathBits(p)*group+1;return[start,start+group-1]}
function pathLabel(t,path,ri){
  const total=Math.log2(Number(t.size)||2),p=String(path||'');
  if(ri===total-1){const [start]=placementRange(t.size,p);return start===1?'Championship':`${ordinal(start)} Place Game`}
  if(!p.includes('L'))return t.rounds?.[ri]?.name||'Championship Bracket';
  const [start,end]=placementRange(t.size,p);return `${ordinal(start)}–${ordinal(end)} Place Bracket`;
}
function allPaths(length){if(length<=0)return[''];let a=[''];for(let i=0;i<length;i++)a=a.flatMap(p=>[p+'W',p+'L']);return a}
function matchHTML(m,label=''){
  if(!m)return `<div class="bracket-match v279-placeholder">${label?`<div class="placement-label">${label}</div>`:''}<span>TBD</span><span>TBD</span></div>`;
  const done=played(m);return `<div class="bracket-match ${done?'played':''}">${label&&label!==(m.label||'')?`<div class="placement-label">${label}</div>`:m.label?`<div class="placement-label">${m.label}</div>`:''}<span>${m.team1Id?teamName(m.team1Id):'BYE / TBD'}${done&&m.team1Id&&m.score1!=null?` <b>${m.score1}</b>`:''}</span><span>${m.team2Id?teamName(m.team2Id):'BYE / TBD'}${done&&m.team2Id&&m.score2!=null?` <b>${m.score2}</b>`:''}</span>${m.winnerId?`<em>Winner: ${teamName(m.winnerId)}</em>`:''}</div>`;
}
function renderRound(t,ri){
  const r=t.rounds?.[ri]||{name:`Round ${ri+1}`,matches:[]};
  if(t.format!=='placement')return `<section class="bracket-stage"><small>${r.name}</small>${(r.matches||[]).map(m=>matchHTML(m)).join('')||matchHTML(null)}</section>`;
  const paths=allPaths(ri),perPath=Math.max(1,Number(t.size)/Math.pow(2,ri+1));
  return `<section class="bracket-stage v279-placement-stage"><small>${r.name}</small>${paths.map(path=>{const actual=(r.matches||[]).filter(m=>String(m.path||'')===path);const count=Math.max(perPath,actual.length);return `<div class="v279-path-group"><div class="v279-path-title">${pathLabel(t,path,ri)}</div>${Array.from({length:count},(_,i)=>matchHTML(actual[i],actual[i]?.label||'')).join('')}</div>`}).join('')}</section>`;
}
function thirdPlaceHTML(t){
  if(t.format!=='third')return'';const m=t.thirdPlaceGame;
  return `<section class="bracket-stage v279-third-stage"><small>3rd Place Game</small>${matchHTML(m||null,'3rd Place Game')}</section>`;
}
function placementsHTML(t){
  const places={...(t.placements||{})};if(t.championId&&!places[1])places[1]=t.championId;
  const rows=Object.entries(places).filter(([,id])=>id).sort((a,b)=>Number(a[0])-Number(b[0]));
  if(!rows.length)return'';return `<div class="v279-placements"><h4>Final Placements</h4><div class="placement-summary">${rows.map(([p,id])=>`<div class="placement-chip"><b>${ordinal(p)}</b><span>${teamName(id)}</span></div>`).join('')}</div></div>`;
}
function bracketHTML279(t){
  const rounds=t.rounds||[];return `<div class="v279-format-note"><b>${formatLabel(t.format)}</b>${t.layoutMode==='manual'?' • Manual first-round layout':''}</div><div class="full-bracket v279-full-bracket">${rounds.map((_,ri)=>renderRound(t,ri)).join('<div class="bracket-arrow">→</div>')}</div>${thirdPlaceHTML(t)}${placementsHTML(t)}`;
}

function syncTournamentToSeasonEngine(t){
  try{
    if(!t||typeof current==='undefined'||!current||!window.BM27SeasonEngine?.state)return;
    const eng=window.BM27SeasonEngine.state(current);eng.games=eng.games||[];const active=Number(current.season)||2026;
    const entries=[];(t.rounds||[]).forEach((r,ri)=>(r.matches||[]).forEach(m=>entries.push({m,ri,name:m.label||r.name})));if(t.thirdPlaceGame)entries.push({m:t.thirdPlaceGame,ri:Math.max(0,(t.rounds||[]).length-1),name:'3rd Place Game'});
    for(const {m,ri,name} of entries){if(!played(m)||!m.team1Id||!m.team2Id||!Number.isFinite(+m.score1)||!Number.isFinite(+m.score2))continue;let g=eng.games.find(x=>eq(x.tournamentMatchId,m.id));if(!g){g={id:`v279-${m.id}`,season:active,team1Id:m.team1Id,team2Id:m.team2Id,date:m.date,type:t.kind||t.type||'Tournament',userVisible:eq(m.team1Id,current.schoolId)||eq(m.team2Id,current.schoolId),tournamentId:t.id,tournamentMatchId:m.id,roundIndex:ri,roundName:name,status:'final',played:true,score1:+m.score1,score2:+m.score2,winnerId:m.winnerId};eng.games.push(g)}else Object.assign(g,{season:active,team1Id:m.team1Id,team2Id:m.team2Id,date:m.date,type:t.kind||t.type||'Tournament',tournamentId:t.id,tournamentMatchId:m.id,roundIndex:ri,roundName:name,status:'final',played:true,score1:+m.score1,score2:+m.score2,winnerId:m.winnerId,userVisible:eq(m.team1Id,current.schoolId)||eq(m.team2Id,current.schoolId)})}
  }catch(e){console.warn('BM27 v2.7.10 season-ledger sync skipped',e)}
}

function repairTournament279(t){
  if(!t)return;t.format=normalizeFormat(t.format||t.createdWithFormat);t.formatLabel=formatLabel(t.format);t.placements=t.placements||{};t.rounds=Array.isArray(t.rounds)?t.rounds:[];
  for(const [ri,r] of t.rounds.entries()){r.matches=Array.isArray(r.matches)?r.matches:[];for(const m of r.matches){if(m.status==='final'&&!m.played)m.played=true;if(m.played&&!m.status)m.status='final';m.roundIndex=Number.isFinite(Number(m.roundIndex))?Number(m.roundIndex):ri}}
  try{window.BM27TournamentEngine?.repair?.(current)}catch(e){console.warn('BM27 v2.7.10 tournament repair',e)}
  syncTournamentToSeasonEngine(t);
}
function repairAll(){if(typeof current==='undefined'||!current)return;for(const t of current.tournaments||[])repairTournament279(t)}

function removeTournament279(id){
  if(typeof current==='undefined'||!current)return;current.tournaments=(current.tournaments||[]).filter(t=>!eq(t.id,id));current.schedule=(current.schedule||[]).filter(g=>!eq(g.tournamentId,id));
  for(const key of Object.keys(current.teamSchedules||{}))current.teamSchedules[key]=(current.teamSchedules[key]||[]).filter(g=>!eq(g.tournamentId,id));
  try{const eng=window.BM27SeasonEngine?.state?.(current);if(eng)eng.games=(eng.games||[]).filter(g=>!eq(g.tournamentId,id))}catch{}
  try{persist?.()}catch{}try{renderAll?.()}catch{}
}
function tournamentListHTML(t,allowRemove,open=false){
  const done=!!t.championId&&(t.format!=='third'||!t.thirdPlaceGame||played(t.thirdPlaceGame));
  return `<details class="card tournament-card v279-tournament-item" data-v279-tournament="${t.id}" ${open?'open':''}><summary class="v279-tournament-summary"><div><p class="eyebrow">${t.kind||t.type||'Tournament'} • ${t.size||'?'}-TEAM BRACKET</p><h3>${t.name||'Tournament'}</h3><p class="muted small">${formatLabel(t.format)}${t.layoutMode==='manual'?' • Manual layout':''}</p></div><div class="v279-summary-right"><span class="tag">${done?'Complete':t.status||'Scheduled'}</span><span class="v279-chevron">⌄</span></div></summary><div class="v279-tournament-body">${bracketHTML279(t)}${allowRemove&&!t.automatic&&scheduleEditable279()?`<button class="secondary wide" data-v279-remove="${t.id}">Remove Tournament</button>`:''}</div></details>`;
}
function renderList(target,allowRemove){
  const el=$(target);if(!el||typeof current==='undefined'||!current)return;repairAll();const openIds=new Set([...el.querySelectorAll('details[open][data-v279-tournament]')].map(d=>String(d.dataset.v279Tournament)));const ts=current.tournaments||[];
  el.innerHTML=ts.length?ts.map((t,i)=>tournamentListHTML(t,allowRemove,openIds.has(String(t.id))||(openIds.size===0&&i===0&&target==='tournamentHubList'))).join(''):'<article class="card"><h3>No tournaments yet</h3><p class="muted">Create a custom tournament here. District and state tournaments are generated automatically during Season mode.</p></article>';
  el.querySelectorAll('[data-v279-remove]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();removeTournament279(b.dataset.v279Remove)});
}
function statusHTML(){
  if(typeof current==='undefined'||!current)return'';const c=team(current.schoolId)?.class,custom=(current.tournaments||[]).filter(t=>!t.automatic),active=custom.filter(t=>!t.championId||(t.format==='third'&&t.thirdPlaceGame&&!played(t.thirdPlaceGame)));
  return `<div class="row"><div><b>Tournament Center</b><br><small>${active.length?`${active.length} custom tournament${active.length===1?' is':'s are'} currently in progress.`:`${custom.length} custom tournament${custom.length===1?'':'s'} in this career.`} Open any tournament below to view the full championship and consolation paths.</small></div><span class="tag">Class ${c||'—'} • v${VERSION}</span></div>`;
}
function renderCenter279(){const s=$('tournamentHubStatus');if(s)s.innerHTML=statusHTML();renderList('tournamentHubList',true)}
function renderTournaments279(){renderList('tournamentList',false);renderCenter279()}

function installRenderer(){
  try{renderTournamentCenter=renderCenter279;window.renderTournamentCenter=renderCenter279}catch{}
  try{renderTournaments=renderTournaments279;window.renderTournaments=renderTournaments279}catch{}
}
function installOpenDialogHook(){
  if(typeof openTournamentDialog!=='function')return;const base=openTournamentDialog;openTournamentDialog=function(){const r=base.apply(this,arguments);setTimeout(()=>{installBuilderUI();renderManualEditor(true);refreshSubmitState();installSubmitOverride()},0);return r};window.openTournamentDialog=openTournamentDialog;
}
function installUpdatesNote(){document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const box=$('updatesContent');if(!box||box.querySelector('[data-v279-notes]'))return;box.insertAdjacentHTML('afterbegin','<article class="card" data-v279-notes><p class="eyebrow">BM27 v2.7.10</p><h3>Tournament Selection Count Fix</h3><ul class="update-list"><li>Fixed the 32-team builder so 31 selected opponents are accepted correctly even after using school search/filtering.</li><li>The Create Bracket validator now reads the same full saved selection list as the 31/31 counter.</li><li>Season custom tournaments still keep one authoritative winner/loser path after every played game.</li><li>3rd-place games remain scheduled after a semifinal loss.</li><li>Full consolation brackets show championship, 3rd, 5th, 7th and deeper placement paths.</li><li>Tournament Center now uses collapsible tournament entries so each full bracket can be opened or closed.</li><li>Manual Bracket Layout lets you place teams into exact first-round slots and assign BYEs.</li><li>Existing custom tournaments are repaired and synchronized into the Season game ledger.</li></ul></article>')},0),{capture:true}))}
function install(){
  if(window.__BM27_V279__)return;window.__BM27_V279__=true;installBuilderUI();installSubmitOverride();installRenderer();installOpenDialogHook();installUpdatesNote();repairAll();setTimeout(()=>{repairAll();try{renderTournaments279()}catch{}},250);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V279Tournament={version:VERSION,repairAll,renderTournamentCenter:renderCenter279,renderTournaments:renderTournaments279,createManualTournament,syncTournamentToSeasonEngine};
})();
