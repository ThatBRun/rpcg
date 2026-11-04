/* BM27 v2.7.16 — Academics / College Graduation build base
   Preserves the v2.7.14 performance work while upgrading Play Now with
   matchup defense, help/recover logic, contests, steals, interceptions and smarter CPU offense.
*/
(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const byId=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eq=(a,b)=>String(a)===String(b);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const BM27_PERF={
  lowPower:((Number(navigator.hardwareConcurrency)||8)<=4)||((Number(navigator.deviceMemory)||8)<=4)||matchMedia('(max-width: 900px)').matches,
  playNowFps:45
};
if(BM27_PERF.lowPower)BM27_PERF.playNowFps=30;
document.documentElement.classList.toggle('bm27-perf-lite',BM27_PERF.lowPower);
function safePersist(){try{if(typeof persist==='function')persist()}catch(e){console.warn('BM27 v2.7.13 persist',e)}}
function schoolLogo(name,cls=''){
  try{
    const branded=window.BM27Branding255?.logo?.(name);
    if(branded)return `<img class="${esc(cls)}" src="${branded}" alt="${esc(name)} logo">`;
    const html=window.BM27Logos252?.html?.(name,cls);
    if(html)return html;
  }catch{}
  const initials=String(name||'BM').split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase();
  return `<span class="${esc(cls)}" style="display:grid;place-items:center;font-weight:1000">${esc(initials)}</span>`;
}
function allCareerSaves(){try{return typeof saves!=='undefined'&&Array.isArray(saves)?saves:[]}catch{return[]}}
function teamOf(save){return save?.teams?.find(t=>eq(t.id,save.schoolId))||null}

/* ---------- Loading screen ---------- */
let loadTimer=0;
function ensureLoader(){
  let el=byId('bm2713Loading');
  if(el)return el;
  el=document.createElement('div');el.id='bm2713Loading';
  el.innerHTML=`<div class="bm2713-load-inner"><img class="bm2713-load-logo" src="assets/icon.svg" alt=""><div class="bm2713-load-kicker">RAMPACEGAMES PRESENTS</div><div class="bm2713-load-title">MSHSAA Basketball Manager 27</div><div class="bm2713-load-track"><span></span></div><div id="bm2713LoadStatus" class="bm2713-load-status">LOADING BM27…</div></div>`;
  document.body.prepend(el);return el;
}
function showLoading(label='LOADING BM27…',callback,ms=650){
  const el=ensureLoader(),st=byId('bm2713LoadStatus');
  clearTimeout(loadTimer);if(st)st.textContent=label;el.classList.remove('hidden');
  loadTimer=setTimeout(()=>{el.classList.add('hidden');if(typeof callback==='function')callback()},Math.max(260,ms));
}
function bootLoading(){const el=ensureLoader();const st=byId('bm2713LoadStatus');if(st)st.textContent='LOADING MENUS • SAVES • SCHOOL DATA…';setTimeout(()=>el.classList.add('hidden'),520)}
window.BM27Loading2713={show:showLoading};

/* ---------- Main menu ---------- */
function showSportsScreen(id){
  const sports=byId('sportsShell');if(!sports)return;
  sports.classList.remove('hidden');$$('#sportsShell .rd-screen').forEach(x=>x.classList.add('hidden'));byId(id)?.classList.remove('hidden');
}
function populateRosterSelect(){
  const sel=byId('rdSaveSelect');if(!sel)return;
  sel.innerHTML='<option value="">Choose a save…</option>'+allCareerSaves().map(s=>`<option value="${esc(s.id)}">${esc(s.name||'Career')} — ${esc(teamOf(s)?.name||'School')}</option>`).join('');
}
function menuAction(mode){
  if(mode==='season'||mode==='dynasty'||mode==='myschool')return showLoading(`OPENING ${mode.toUpperCase()}…`,()=>window.BM27V240?.renderPortal?.(mode),300);
  if(mode==='playnow')return showLoading('SETTING THE COURT…',()=>window.BM27PlayNow253?.open?.(),300);
  if(mode==='legacy')return showLoading('OPENING LEGACY…',()=>window.BM27Legacy256?.open?.(),300);
  if(mode==='settings')return showSportsScreen('rdSettings');
  if(mode==='rosters'){populateRosterSelect();return showSportsScreen('rdRoster')}
  if(mode==='branding')return window.BM27Branding255?.open?.();
  if(mode==='history')return window.BM27History254?.open?.();
  if(mode==='seasonpass')return openPassHub();
}
function buildMainMenu(){
  const menu=byId('rdMenu');let modes=byId('rdModes');if(!menu||!modes)return;
  menu.classList.add('v2713-main-menu');
  // v2.4/v2.3 both attached click handlers to the old rdModes node. Clone it once so
  // the v2.7.13 menu has one authoritative router and the loading screen can actually show.
  if(!modes.dataset.v2713Router){const clean=modes.cloneNode(true);clean.dataset.v2713Router='1';modes.replaceWith(clean);modes=clean}
  const existing=[...modes.querySelectorAll('button')];
  const findMode=m=>existing.find(b=>b.dataset.mode===m);
  const dyn=findMode('dynasty'),season=findMode('season'),legacy=findMode('legacy'),play=findMode('playnow'),my=findMode('myschool'),rost=findMode('rosters'),settings=findMode('settings');
  let branding=modes.querySelector('#branding255Btn'),history=modes.querySelector('#history254Btn');
  // These buttons can be injected a few milliseconds after the menu on older builds.
  if(!branding&&byId('branding255Btn')){branding=byId('branding255Btn');modes.appendChild(branding)}
  if(!history&&byId('history254Btn')){history=byId('history254Btn');modes.appendChild(history)}
  const labels=new Map([[dyn,'Dynasty'],[season,'Season'],[legacy,'Legacy'],[play,'Play Now'],[my,'MySchool'],[rost,'Rosters'],[settings,'Settings'],[branding,'School Branding'],[history,'Historic Rosters']]);
  for(const [b,label] of labels)if(b)b.innerHTML=`<b>${label}</b>`;
  let pass=byId('seasonPass2713Menu');if(!pass){pass=document.createElement('button');pass.id='seasonPass2713Menu';pass.className='v2713-season-pass-menu';pass.innerHTML='<b>Season Pass</b>';modes.appendChild(pass)}
  const order=[dyn,season,pass,legacy,play,my,branding,rost,history,settings].filter(Boolean);order.forEach(b=>modes.appendChild(b));
  if(!modes.dataset.v2713Bound){modes.dataset.v2713Bound='1';modes.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.id==='seasonPass2713Menu')return menuAction('seasonpass');if(b.id==='branding255Btn')return menuAction('branding');if(b.id==='history254Btn')return menuAction('history');const m=b.dataset.mode;if(m)menuAction(m)},true)}
  if(menu.dataset.v2713!=='1'){
    menu.dataset.v2713='1';const art=menu.querySelector('.rd-menu-art'),now=menu.querySelector('.rd-now'),oldPanel=menu.querySelector('.rd-menu-panel'),shade=menu.querySelector('.rd-menu-shade');
    const shell=document.createElement('div');shell.className='v2713-menu-shell';shell.innerHTML=`<div class="v2713-menu-head"><small>RAMPACEGAMES • 2026–27</small><h1>MSHSAA Basketball Manager 27</h1><div class="v2713-menu-version"><span>v2.7.29</span><span>MISSOURI HIGH-SCHOOL BASKETBALL</span></div></div>`;shell.appendChild(modes);
    const footer=document.createElement('div');footer.className='v2713-menu-footer';footer.innerHTML='<i></i><b>BM27 ONLINE</b><span>• SAVES AUTO-CLOUD WHEN SIGNED IN</span>';shell.appendChild(footer);oldPanel?.remove();shade?.remove();menu.appendChild(shell);if(now){now.classList.add('v2713-now');menu.appendChild(now)}if(art)menu.insertBefore(art,menu.firstChild)
  }
}

/* ---------- Season Pass ---------- */
const PASS_REWARDS=[200,250,300,350,400,500,550,600,650,750,800,850,900,1000,1100,1200,1300,1500,1750,2500];
function ensurePass(save){
  if(!save)return null;const season=Number(save.season)||2026;
  save.seasonPass=save.seasonPass||{season,claimed:[],bonusXP:0,archive:[],districtBase:0,stateBase:0};
  if(Number(save.seasonPass.season)!==season){
    const old={season:save.seasonPass.season,claimed:[...(save.seasonPass.claimed||[])],completedAt:new Date().toISOString()};
    save.seasonPass.archive=Array.isArray(save.seasonPass.archive)?save.seasonPass.archive:[];save.seasonPass.archive.push(old);
    save.seasonPass={season,claimed:[],bonusXP:0,archive:save.seasonPass.archive,districtBase:Number(save.history?.districtTitles)||0,stateBase:Number(save.history?.titles)||0};
  }
  save.seasonPass.claimed=Array.isArray(save.seasonPass.claimed)?save.seasonPass.claimed:[];if(save.seasonPass.districtBase==null)save.seasonPass.districtBase=0;if(save.seasonPass.stateBase==null)save.seasonPass.stateBase=0;return save.seasonPass;
}
function passXP(save){
  if(!save)return 0;const sp=ensurePass(save),me=teamOf(save),games=(save.schedule||[]).filter(g=>g.played).length,wins=Number(me?.wins)||0;
  const hist=save.history||{},district=Math.max(0,(Number(hist.districtTitles)||0)-(Number(sp?.districtBase)||0)),state=Math.max(0,(Number(hist.titles)||0)-(Number(sp?.stateBase)||0));
  return games*120+wins*80+district*350+state*900+(Number(sp?.bonusXP)||0);
}
function seasonLabel(save){const y=Number(save?.season)||2026;return `${y}–${String(y+1).slice(-2)}`}
function addRC(amount,key){
  try{let w=window.BM27RC252?.wallet?.()||{rc:0,awards:{}};w.awards=w.awards||{};if(w.awards[key])return false;w.awards[key]=Date.now();w.rc=(Number(w.rc)||0)+amount;localStorage.setItem('bm27_rc_252',JSON.stringify(w));return true}catch{return false}
}
function passMarkup(save,allowClaim=true){
  const sp=ensurePass(save),xp=passXP(save),level=Math.min(20,Math.floor(xp/300)+1),next=Math.min(6000,level*300),prev=(level-1)*300,pct=level>=20?100:clamp(((xp-prev)/(next-prev))*100,0,100),me=teamOf(save);
  return `<div class="sp2713-hero"><div class="sp2713-kicker">SEASON PASS • ${esc(seasonLabel(save))}</div><h2>ROAD TO STATE</h2><p>${esc(me?.name||'Your Program')} • Earn Pass XP by playing games, winning, and making postseason runs.</p><div class="sp2713-progress"><span style="width:${pct}%"></span></div><div class="sp2713-summary"><span><b>${xp.toLocaleString()}</b> XP</span><span><b>Tier ${level}</b> / 20</span><span><b>${(sp.claimed||[]).length}</b> rewards claimed</span></div></div><div class="sp2713-tiers">${PASS_REWARDS.map((reward,i)=>{const tier=i+1,need=tier*300,unlocked=xp>=need,claimed=sp.claimed.includes(tier);return `<article class="sp2713-tier ${unlocked?'unlocked':''} ${claimed?'claimed':''}"><span class="sp2713-tier-level">TIER ${tier} • ${need} XP</span><strong>${reward.toLocaleString()} RC</strong><p>${tier%5===0?'Milestone reward for your season run.':'Season Pass reward.'}</p>${allowClaim?`<button class="${unlocked&&!claimed?'primary':'secondary'}" data-sp-claim="${tier}" ${!unlocked||claimed?'disabled':''}>${claimed?'CLAIMED':unlocked?'CLAIM REWARD':'LOCKED'}</button>`:''}</article>`}).join('')}</div>${sp.archive?.length?`<div class="sp2713-archive">Past passes: ${sp.archive.slice(-4).map(x=>`${x.season}–${String(Number(x.season)+1).slice(-2)} (${x.claimed?.length||0}/20 claimed)`).join(' • ')}</div>`:''}`;
}
function claimPassTier(tier){
  if(typeof current==='undefined'||!current)return;const sp=ensurePass(current),xp=passXP(current),need=tier*300;if(xp<need||sp.claimed.includes(tier))return;
  sp.claimed.push(tier);sp.claimed.sort((a,b)=>a-b);addRC(PASS_REWARDS[tier-1]||0,`season-pass-${current.id}-${current.season}-${tier}`);safePersist();renderSeasonPass();try{toast?.(`Season Pass Tier ${tier} claimed: +${(PASS_REWARDS[tier-1]||0).toLocaleString()} RC`)}catch{}
}
function renderSeasonPass(){const page=byId('seasonPass2713Page');if(!page||typeof current==='undefined'||!current)return;page.innerHTML=passMarkup(current,true);page.querySelectorAll('[data-sp-claim]').forEach(b=>b.onclick=()=>claimPassTier(Number(b.dataset.spClaim)))}
function installSeasonPassPage(){
  const game=byId('game'),nav=byId('sidebar')?.querySelector('nav'),main=game?.querySelector('main');if(!nav||!main)return;
  let button=byId('seasonPass2713Nav');if(!button){button=document.createElement('button');button.id='seasonPass2713Nav';button.className='nav';button.dataset.page='seasonPass2713';button.textContent='Season Pass';nav.appendChild(button)}
  let page=byId('seasonPass2713Page');if(!page){page=document.createElement('section');page.id='seasonPass2713Page';page.className='page';main.appendChild(page)}
  let isSeason=true;try{isSeason=typeof current==='undefined'||!current||(current.gameMode||'season')==='season'}catch{}button.classList.toggle('hidden',!isSeason);if(!isSeason&&page.classList.contains('active'))page.classList.remove('active');
  button.onclick=()=>{$$('.nav[data-page]').forEach(x=>x.classList.toggle('active',x===button));$$('.page').forEach(p=>p.classList.remove('active'));page.classList.add('active');if(byId('pageTitle'))byId('pageTitle').textContent='Season Pass';game.classList.remove('menu-open');renderSeasonPass()};
}
function openPassHub(){
  byId('seasonPass2713Hub')?.remove();const list=allCareerSaves().filter(s=>(s.gameMode||'season')==='season');const d=document.createElement('section');d.id='seasonPass2713Hub';d.className='pn2713';
  d.innerHTML=`<div style="max-width:1200px;margin:auto;padding:24px"><button id="spHubBack" class="pn2713-back">← MAIN MENU</button><div style="margin:24px 0"><small class="sp2713-kicker">SEASON PASSES</small><h1 style="font-size:clamp(38px,7vw,82px);margin:.1em 0">ROAD TO STATE</h1><p style="color:#94a3b8">Each Season career has its own pass. Progress and claimed tiers are stored inside that career save.</p></div>${list.length?list.map(s=>`<article class="sp2713-hero" data-sp-save="${esc(s.id)}"><div class="sp2713-kicker">${esc(s.name||'Season Career')}</div><h2>${esc(teamOf(s)?.name||'School')}</h2><div class="sp2713-summary"><span><b>${passXP(s).toLocaleString()}</b> XP</span><span><b>${ensurePass(s).claimed.length}</b>/20 rewards claimed</span></div><button class="primary" data-sp-open="${esc(s.id)}" style="margin-top:14px">OPEN SEASON CAREER</button></article>`).join(''):'<article class="sp2713-hero"><h2>No Season career yet</h2><p>Create a Season save to start your first Season Pass.</p></article>'}</div>`;document.body.appendChild(d);byId('spHubBack').onclick=()=>d.remove();d.querySelectorAll('[data-sp-open]').forEach(b=>b.onclick=()=>{d.remove();window.BM27V240?.renderPortal?.('season')});
}

/* ---------- Dynasty exit ---------- */
function exitDynastyToMain(){
  try{safePersist()}catch{};const dyn=byId('dyn249');if(dyn)dyn.classList.add('hidden');byId('rdModePortal')?.classList.add('hidden');byId('launcher')?.classList.add('hidden');byId('game')?.classList.add('hidden');document.body.classList.remove('rd-in-game');delete document.body.dataset.rdMode;showSportsScreen('rdMenu');buildMainMenu();
}
function dynastyExitFix(){const b=byId('dyExit');if(b)b.textContent='← MAIN MENU';const b2=byId('dyn270Exit');if(b2)b2.textContent='← MAIN MENU'}
document.addEventListener('click',e=>{if(e.target.closest('#dyExit,#dyn270Exit')){e.preventDefault();e.stopImmediatePropagation();showLoading('RETURNING TO MAIN MENU…',exitDynastyToMain,360)}},true);

/* ---------- Play Now rebuilt ---------- */
const PN={root:null,raf:0,G:null,keys:{},charge:false,prevKeyDown:null,prevKeyUp:null,ui:null,lastFrame:0,lastHud:0,courtBg:null};
const PN_NUMBERS=[0,1,2,3,4,5,10,11,12,13,14,15,20,21,22,23,24,25,30,31,32,33,34,35];
function pnClose(){if(PN.raf)cancelAnimationFrame(PN.raf);PN.raf=0;PN.G=null;PN.charge=false;PN.keys={};PN.ui=null;PN.lastFrame=0;PN.lastHud=0;PN.courtBg=null;byId('pn2713')?.remove();if(window.onkeydown===PN.keyDown)window.onkeydown=PN.prevKeyDown;if(window.onkeyup===PN.keyUp)window.onkeyup=PN.prevKeyUp;PN.keyDown=PN.keyUp=null;PN.prevKeyDown=PN.prevKeyUp=null}
function pnTeams(){
  let src=[];try{if(typeof directory!=='undefined'&&Array.isArray(directory))src.push(...directory)}catch{}
  try{if(Array.isArray(window.BM27SchoolDirectory))src.push(...window.BM27SchoolDirectory)}catch{}
  try{if(Array.isArray(window.BM27NationalDirectory))src.push(...window.BM27NationalDirectory)}catch{}
  if(!src.length&&typeof current!=='undefined'&&current?.teams)src=current.teams.filter(t=>!t.nationalOnly);
  const seen=new Set(),out=[];for(const t of src){const name=t?.name||t?.school;if(!name)continue;const state=t.state||t.stateCode||'MO',key=`${String(name).toLowerCase()}|${String(state).toLowerCase()}`;if(seen.has(key))continue;seen.add(key);out.push({name,state,city:t.city||'',mascot:t.mascot||'',source:t})}
  if(!out.length)['Marquette','Lafayette','Vashon','Principia'].forEach(name=>out.push({name,state:'MO'}));
  try{const h=JSON.parse(sessionStorage.getItem('bm27-historic-playnow')||'null');if(h){out.unshift({name:h.school,state:h.state||'HISTORIC',city:h.city||'',mascot:h.mascot||'',historic:h});sessionStorage.removeItem('bm27-historic-playnow')}}catch{}
  return out;
}
function pnHash(n,k=0){let h=2166136261;for(const c of String(n)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return 68+((Math.abs(h)>>(k*4))%30)}
function pnRatings(t){if(t?.historic?.players?.length){const a=t.historic.players.map(p=>Number(p.overall)||70),ovr=Math.round(a.reduce((x,y)=>x+y,0)/a.length);return{ovr:clamp(ovr,55,99),off:clamp(ovr+((pnHash(t.name,1)%7)-3),55,99),def:clamp(ovr+((pnHash(t.name,2)%7)-3),55,99)}}return {ovr:pnHash(t.name),off:pnHash(t.name,1),def:pnHash(t.name,2)}}
function pnCard(t,side){const rr=pnRatings(t);return `<article class="pn2713-team-card ${side}"><small>${side.toUpperCase()}</small><div class="logo">${schoolLogo(t.name,'')}</div><h2>${esc(t.name)}</h2><div class="pn2713-rating-row"><span><b>${rr.ovr}</b> OVR</span><span><b>${rr.off}</b> OFF</span><span><b>${rr.def}</b> DEF</span></div>${t.historic?`<span class="pn2713-historic-tag">${esc(t.historic.season)} • ${esc(t.historic.source||'HISTORIC')}</span>`:''}</article>`}
function pnOpen(){
  pnClose();const teams=pnTeams();let home=0,away=Math.min(1,teams.length-1),side='home',q='',era='current';const years=window.BM27History254?.years?.()||['2025-26'];let histYear=years[0];
  const forced=teams[0]?.historic;if(forced){era='historic';histYear=forced.season||histYear}
  const asEntry=t=>{if(t?.historic)return t;if(era!=='historic')return t;try{return window.BM27History254?.historicEntry?.(t,histYear)||t}catch{return t}};
  const r=document.createElement('section');r.id='pn2713';r.className='pn2713 pn2713-select';document.body.appendChild(r);PN.root=r;
  function draw(){const H=asEntry(teams[home]),A=asEntry(teams[away]);
    r.innerHTML=`<header><button id="pn2713Back" class="pn2713-back">← MAIN MENU</button><div><small>PLAY NOW • GAMEPLAY EDITION</small><h1>CHOOSE THE MATCHUP</h1></div><span style="font-weight:900;color:#94a3b8">${teams.length.toLocaleString()} TEAMS</span></header><div class="pn2713-select-stage"><div id="pnHomeCard">${pnCard(H,'home')}</div><div class="pn2713-vs"><b>VS</b><small>TIP OFF</small></div><div id="pnAwayCard">${pnCard(A,'away')}</div></div><div class="pn2713-picker"><div class="pn2713-picker-head"><button id="pnPickHome" class="${side==='home'?'active':''}">SELECT HOME</button><button id="pnPickAway" class="${side==='away'?'active':''}">SELECT AWAY</button><div class="pn2713-history-controls"><label>ROSTERS <select id="pnRosterEra"><option value="current" ${era==='current'?'selected':''}>Current</option><option value="historic" ${era==='historic'?'selected':''}>Historic — Real Rosters</option></select></label><label id="pnHistoricYearWrap" style="${era==='historic'?'':'display:none'}">SEASON <select id="pnHistoricYear">${years.map(y=>`<option ${y===histYear?'selected':''}>${y}</option>`).join('')}</select></label></div><input id="pnSearch" value="${esc(q)}" placeholder="Search every high school"></div><div id="pnTeamGrid" class="pn2713-team-grid"></div></div><div class="pn2713-launch"><p>${era==='historic'?`Historic season ${esc(histYear)} • verified real-world rosters only • `:''}Move WASD/Arrows • Shift sprint • Q crossover/burst • Hold Space shoot • E pass/switch • F steal/block • Esc pause + stats</p><button id="pnTip" class="pn2713-tip">READY • TIP OFF</button></div>`;
    byId('pn2713Back').onclick=()=>{pnClose();showSportsScreen('rdMenu');buildMainMenu()};byId('pnPickHome').onclick=()=>{side='home';draw()};byId('pnPickAway').onclick=()=>{side='away';draw()};byId('pnRosterEra').onchange=e=>{era=e.target.value;draw()};if(byId('pnHistoricYear'))byId('pnHistoricYear').onchange=e=>{histYear=e.target.value;draw()};byId('pnSearch').oninput=e=>{q=e.target.value;renderGrid()};const tip=byId('pnTip'),he=asEntry(teams[home]),ae=asEntry(teams[away]),blocked=era==='historic'&&(he?.historic?.unavailable||ae?.historic?.unavailable);if(tip){tip.disabled=!!blocked;tip.textContent=blocked?'VERIFIED ROSTER REQUIRED':'READY • TIP OFF';tip.onclick=()=>{const H=asEntry(teams[home]),A=asEntry(teams[away]);if(era==='historic'&&(H?.historic?.unavailable||A?.historic?.unavailable))return;pnStart(H,A)}}renderGrid();
  }
  function renderGrid(){const box=byId('pnTeamGrid');if(!box)return;const needle=q.trim().toLowerCase();const rows=[];for(let i=0;i<teams.length&&rows.length<100;i++){const t=teams[i];if(!needle||`${t.name} ${t.city||''} ${t.state}`.toLowerCase().includes(needle))rows.push({t,i})}box.innerHTML=rows.map(({t,i})=>`<button data-pn-team="${i}" class="${(side==='home'?home:away)===i?'selected':''}">${schoolLogo(t.name,'')}<span>${esc(t.name)}${era==='historic'?`<small>${esc(histYear)}</small>`:''}</span></button>`).join('')||'<p>No matching schools.</p>';box.querySelectorAll('img').forEach(img=>{img.loading='lazy';img.decoding='async'});box.onclick=e=>{const b=e.target.closest('[data-pn-team]');if(!b)return;const i=Number(b.dataset.pnTeam);if(side==='home')home=i;else away=i;draw()}}
  draw();
}
function pnLocalTeam(entry){if(entry?.historic)return null;try{return (typeof current!=='undefined'&&current?.teams||[]).find(t=>String(t.name).toLowerCase()===String(entry?.name).toLowerCase())||entry?.source||null}catch{return entry?.source||null}}
function pnPlayerMeta(entry,team,slot){const local=pnLocalTeam(entry),hsrc=entry?.historic?.players?.[slot]||null,src=hsrc||(local?.roster||[])[slot]||null,positions=['PG','SG','SF','PF','C'],base=Math.abs(pnHash(`${entry?.name||'BM27'}|${entry?.historic?.season||'current'}`,slot)%PN_NUMBERS.length),number=src?.number??src?.jersey??PN_NUMBERS[(base+slot*5)%PN_NUMBERS.length];return{name:src?.name||`${entry?.mascot||entry?.name||'BM27'} ${positions[slot]}`,number:String(number),pos:src?.pos||positions[slot],overall:Number(src?.overall)||clamp(pnRatings(entry).ovr+(2-slot),60,99)}}
function pnEmptyBox(){return{pts:0,reb:0,ast:0,stl:0,blk:0,tov:0,fgm:0,fga:0,m3:0,a3:0}}
function pnEmptyTeamStats(){return{fgm:0,fga:0,m3:0,a3:0,reb:0,ast:0,stl:0,blk:0,tov:0}}
function pnStart(h,a){
  const r=byId('pn2713');if(!r)return;if(PN.raf)cancelAnimationFrame(PN.raf);PN.raf=0;r.className='pn2713 pn2713-game';
  r.innerHTML=`<div class="pn2713-scoreboard"><div class="pn2713-score-team home">${schoolLogo(h.name,'')}<div class="pn2713-team-name"><small>HOME</small><b>${esc(h.name)}</b></div><strong id="pnHomeScore" class="pn2713-points">0</strong></div><div class="pn2713-center-clock"><span>QUARTER</span><span>SHOT</span><b id="pnQuarter">1</b><b id="pnShot" class="shot">24</b><strong id="pnClock">2:00</strong></div><div class="pn2713-score-team away"><strong id="pnAwayScore" class="pn2713-points">0</strong><div class="pn2713-team-name"><small>AWAY</small><b>${esc(a.name)}</b></div>${schoolLogo(a.name,'')}</div></div><div class="pn2713-game-tools"><div class="buttons"><button id="pnTeamSelect">TEAM SELECT</button><button id="pnMainMenu">MAIN MENU</button><button id="pnPause">PAUSE / STATS</button><span class="pn2715-difficulty">SIM-HARD • REAL CONTACT</span></div><div id="pnMessage" class="pn2713-message">TIP OFF • HOME BALL</div></div><div class="pn2713-arena"><canvas id="pnCourt" width="1280" height="720"></canvas></div><div class="pn2713-hud"><div class="pn2713-statbox"><span>HOME FG <b id="pnHFG">0/0</b></span><span>3PT <b id="pnH3">0/0</b></span></div><div><div class="pn2713-meter"><div class="zones"></div><i id="pnNeedle" class="needle"></i></div><div class="pn2722-player-status"><span id="pnPlayerLabel">#0 PG</span><span>STAMINA <b id="pnStaminaText">100</b></span><i><b id="pnStaminaBar" style="width:100%"></b></i></div></div><div class="pn2713-statbox"><span>AWAY FG <b id="pnAFG">0/0</b></span><span>3PT <b id="pnA3">0/0</b></span></div></div><div class="pn2713-controls"><div class="pn2713-dpad"><button data-pn-key="ArrowUp">▲</button><button data-pn-key="ArrowLeft">◀</button><button data-pn-key="ArrowDown">▼</button><button data-pn-key="ArrowRight">▶</button></div><div class="pn2713-actions"><button id="pnSteal">STEAL / BLOCK</button><button id="pnPass">PASS / SWITCH</button><button id="pnCrossover">CROSSOVER</button><button id="pnShoot" class="shoot">HOLD SHOOT</button><button data-pn-key="Shift">SPRINT</button></div></div><div id="pnPausePanel" class="pn2722-pause hidden"><div class="pn2722-pause-card"><div class="pn2722-pause-head"><div><small>PLAY NOW</small><h2 id="pnPauseTitle">PAUSED</h2></div><div><button id="pnResumeGame" class="primary">RESUME</button><button id="pnRestartGame" class="secondary">RESTART</button><button id="pnPauseTeamSelect" class="secondary">TEAM SELECT</button><button id="pnPauseMainMenu" class="secondary">MAIN MENU</button></div></div><div id="pnPauseStats"></div><div class="pn2722-controls-help"><b>CONTROLS</b><span>WASD / Arrows — Move</span><span>Shift — Sprint</span><span>Q — Crossover + burst</span><span>Space — Shot meter</span><span>E — Pass / defender switch</span><span>F — Steal / block / contest</span></div></div></div>`;
  const G=PN.G={h,a,ratings:[pnRatings(h),pnRatings(a)],score:[0,0],q:1,time:120,shot:24,last:performance.now(),poss:0,pause:false,finished:false,meter:0,dir:1,stats:[pnEmptyTeamStats(),pnEmptyTeamStats()],players:[],ball:{owner:0,shot:false,x:310,y:360,z:0,team:0},lastAward:false,cpuDecision:.25,cpuLane:2,reachCooldown:0,reachPenalty:0,contestUntil:0,bumpPressure:0,possessionAge:0,dribbleCooldown:0,dribbleBurst:0,lastPass:null};
  for(let team=0;team<2;team++)for(let i=0;i<5;i++){const m=pnPlayerMeta(team? a:h,team,i);G.players.push({team,slot:i,x:team?890+i*14:310-i*14,y:150+i*105,ctl:team===0&&i===0,name:m.name,number:m.number,pos:m.pos,overall:m.overall,stamina:100,stun:0,box:pnEmptyBox()})}
  PN.ui={home:byId('pnHomeScore'),away:byId('pnAwayScore'),quarter:byId('pnQuarter'),clock:byId('pnClock'),shot:byId('pnShot'),needle:byId('pnNeedle'),hfg:byId('pnHFG'),h3:byId('pnH3'),afg:byId('pnAFG'),a3:byId('pnA3'),message:byId('pnMessage'),canvas:byId('pnCourt'),playerLabel:byId('pnPlayerLabel'),staminaText:byId('pnStaminaText'),staminaBar:byId('pnStaminaBar')};PN.lastFrame=0;PN.lastHud=0;PN.courtBg=null;
  byId('pnTeamSelect').onclick=pnOpen;byId('pnMainMenu').onclick=()=>{pnClose();showSportsScreen('rdMenu');buildMainMenu()};byId('pnPause').onclick=()=>pnTogglePause();byId('pnPass').onclick=pnPass;byId('pnSteal').onclick=pnSteal;byId('pnCrossover').onclick=pnCrossover;byId('pnShoot').onpointerdown=pnBegin;byId('pnShoot').onpointerup=byId('pnShoot').onpointercancel=pnRelease;
  r.querySelectorAll('[data-pn-key]').forEach(b=>{const k=b.dataset.pnKey;b.onpointerdown=e=>{e.preventDefault();PN.keys[k]=1};b.onpointerup=b.onpointercancel=()=>PN.keys[k]=0});
  PN.prevKeyDown=window.onkeydown;PN.prevKeyUp=window.onkeyup;PN.keyDown=e=>{if(!PN.G)return;const k=e.key;PN.keys[k]=1;if(k===' '&&!e.repeat){e.preventDefault();pnBegin()}if(k.toLowerCase()==='e'&&!e.repeat)pnPass();if(k.toLowerCase()==='f'&&!e.repeat)pnSteal();if(k.toLowerCase()==='q'&&!e.repeat)pnCrossover();if(k==='Escape'&&!e.repeat){e.preventDefault();pnTogglePause()}};PN.keyUp=e=>{PN.keys[e.key]=0;if(e.key===' ')pnRelease()};window.onkeydown=PN.keyDown;window.onkeyup=PN.keyUp;pnReset(0);PN.raf=requestAnimationFrame(pnLoop);
}
function pnSetText(el,value){const v=String(value);if(el&&el.textContent!==v)el.textContent=v}
function pnSay(x){pnSetText(PN.ui?.message||byId('pnMessage'),x)}
function pnControlled(){return PN.G?.players.find(p=>p.team===0&&p.ctl)}
function pnNearest(team,x,y,exclude=null){const G=PN.G;if(!G)return null;let best=null,bd=1e9;for(const p of G.players){if(p.team!==team||p===exclude)continue;const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=p}}return best?{p:best,d:bd}:null}
function pnMoveToward(p,tx,ty,speed,dt){const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);if(d<.5)return;const step=Math.min(d,speed*dt);p.x+=dx/d*step;p.y+=dy/d*step;p.x=clamp(p.x,55,1225);p.y=clamp(p.y,90,630)}
function pnSegmentDistance(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,l2=vx*vx+vy*vy;if(!l2)return Math.hypot(px-ax,py-ay);const t=clamp(((px-ax)*vx+(py-ay)*vy)/l2,0,1);return Math.hypot(px-(ax+t*vx),py-(ay+t*vy))}
function pnContest(team,shooter){const n=pnNearest(1-team,shooter.x,shooter.y);if(!n)return{distance:999,amount:0,defender:null};const amount=clamp((118-n.d)/103,0,1);return{distance:n.d,amount,defender:n.p}}
function pnBegin(){const G=PN.G;if(G&&!G.pause&&!G.finished&&G.poss===0&&!G.ball.shot){PN.charge=true;G.meter=0;G.dir=1}}
function pnShotAttempt(team,shooter,is3){const G=PN.G;if(!G)return;const s=G.stats[team];s.fga++;if(is3)s.a3++;if(shooter?.box){shooter.box.fga++;if(is3)shooter.box.a3++}}
function pnTurnover(team,player){const G=PN.G;if(!G)return;G.stats[team].tov++;if(player?.box)player.box.tov++}
function pnStealCredit(team,player){const G=PN.G;if(!G)return;G.stats[team].stl++;if(player?.box)player.box.stl++}
function pnBlockCredit(team,player){const G=PN.G;if(!G)return;G.stats[team].blk++;if(player?.box)player.box.blk++}
function pnRelease(){
  const G=PN.G;if(!G||!PN.charge)return;PN.charge=false;const p=G.players[G.ball.owner]||pnControlled();if(!p||G.poss!==0)return;
  const dx=1164-p.x,dy=360-p.y,dist=Math.hypot(dx,dy),is3=dist>410,c=pnContest(0,p),timing=1-Math.min(1,Math.abs(G.meter-.72)/.72),greenWindow=.032+clamp((G.ratings[0].off-80)*.00045,-.004,.006),green=Math.abs(G.meter-.72)<greenWindow;
  let base=clamp(.66-dist/1750+(G.ratings[0].off-80)*.0035,.18,.69),chance=clamp(base*(.24+.9*timing)*(1-.68*c.amount),.025,.86),make=green?(c.amount<.34||Math.random()<clamp(.92-c.amount*.48,.48,.9)):Math.random()<chance;
  const blockChance=c.distance<31?clamp(.12+(G.ratings[1].def-75)*.007+(31-c.distance)*.011,.08,.48):0,blocked=Math.random()<blockChance;if(blocked){make=false;pnBlockCredit(1,c.defender)}pnShotAttempt(0,p,is3);
  G.ball={owner:null,shot:true,team:0,x:p.x,y:p.y,z:0,vx:dx/65,vy:dy/65,vz:10,make,pts:is3?3:2,shooter:G.players.indexOf(p),shooterX:p.x,shooterY:p.y,blocked};
  const pct=Math.round(c.amount*100);pnSay(blocked?'BLOCKED BY THE DEFENSE':green?`GREEN • ${pct}% CONTEST`:c.amount>.72?`SMOTHERED • ${pct}% CONTEST`:c.amount>.32?`CONTESTED • ${pct}%`:G.meter<.72?'OPEN • EARLY RELEASE':'OPEN • LATE RELEASE')
}
function pnPass(){
  const G=PN.G;if(!G||G.finished||G.ball.shot)return;
  if(G.poss===1){const bh=G.players[G.ball.owner],homes=G.players.filter(p=>p.team===0).sort((a,b)=>Math.hypot(a.x-(bh?.x||0),a.y-(bh?.y||0))-Math.hypot(b.x-(bh?.x||0),b.y-(bh?.y||0)));const cur=pnControlled(),pick=homes.find(p=>p!==cur)||homes[0];if(pick){homes.forEach(p=>p.ctl=false);pick.ctl=true;pnSay(`SWITCHED TO #${pick.number} ${pick.pos}`)}return}
  const from=G.players[G.ball.owner]||pnControlled();if(!from)return;const mates=G.players.filter(p=>p.team===0),i=mates.indexOf(from),n=mates[(i+1)%mates.length];let lane=999,stealer=null;for(const d of G.players.filter(p=>p.team===1)){const ld=pnSegmentDistance(d.x,d.y,from.x,from.y,n.x,n.y);if(ld<lane){lane=ld;stealer=d}}const targetD=pnNearest(1,n.x,n.y)?.d||999,pressure=Math.max(clamp((50-lane)/50,0,1),clamp((42-targetD)/42,0,1)),stealChance=pressure*clamp(.28+(G.ratings[1].def-G.ratings[0].off)*.006,.16,.48);
  if(Math.random()<stealChance){pnTurnover(0,from);pnStealCredit(1,stealer);pnSay('PASS PICKED OFF');pnReset(1);return}mates.forEach(p=>p.ctl=false);n.ctl=true;G.lastPass={team:0,passer:G.players.indexOf(from),at:performance.now()};G.ball.owner=G.players.indexOf(n);G.ball.x=n.x;G.ball.y=n.y;pnSay(pressure>.45?'TIGHT-WINDOW PASS COMPLETE':'PASS COMPLETE')
}
function pnSteal(){
  const G=PN.G;if(!G||G.finished)return;if(G.poss!==1){pnSay('PROTECT THE BALL');return}const c=pnControlled();if(!c)return;if(G.ball.shot&&G.ball.team===1){const d=Math.hypot(c.x-(G.ball.shooterX||G.ball.x),c.y-(G.ball.shooterY||G.ball.y));if(d<88){G.contestUntil=performance.now()+420;const swat=d<46&&G.ball.z<70&&Math.random()<clamp(.14+(G.ratings[0].def-74)*.007+(46-d)*.007,.1,.42);if(swat){G.ball.make=false;G.ball.blocked=true;pnBlockCredit(0,c);pnSay('USER BLOCK!')}else{G.ball.make=G.ball.make&&Math.random()>.16;pnSay('STRONG SHOT CONTEST')}}else pnSay('TOO FAR TO CONTEST');return}const bh=G.players[G.ball.owner];if(!bh)return;if(G.reachCooldown>0){pnSay('REACH COOLDOWN');return}const d=Math.hypot(c.x-bh.x,c.y-bh.y);G.reachCooldown=.72;G.contestUntil=performance.now()+520;
  if(d<54){const chance=clamp(.14+(G.ratings[0].def-G.ratings[1].off)*.006+(54-d)*.004,.08,.34);if(Math.random()<chance){pnTurnover(1,bh);pnStealCredit(0,c);pnSay('CLEAN STEAL • HOME BALL');pnReset(0);return}G.reachPenalty=.42;pnSay('REACH MISSED • RECOVER')}else pnSay(d<100?'HAND UP • CONTEST READY':'CLOSE THE GAP')
}
function pnCrossover(){const G=PN.G;if(!G||G.pause||G.finished||G.poss!==0||G.ball.shot)return;const c=G.players[G.ball.owner];if(!c||c.team!==0||G.dribbleCooldown>0)return pnSay('DRIBBLE MOVE RECOVERING');const n=pnNearest(1,c.x,c.y),dy=(PN.keys.ArrowDown||PN.keys.s?1:0)-(PN.keys.ArrowUp||PN.keys.w?1:0),side=dy||((n?.p?.y??360)>c.y?-1:1);G.dribbleCooldown=.78;G.dribbleBurst=.42;c.stamina=Math.max(0,c.stamina-7);c.y=clamp(c.y+side*28,90,630);c.x=clamp(c.x+15,55,1225);if(n&&n.d<88){const win=clamp(.52+(G.ratings[0].off-G.ratings[1].def)*.008,.28,.76);if(Math.random()<win){n.p.stun=Math.max(n.p.stun,.30);pnSay('CROSSOVER • DEFENDER BEAT')}else pnSay('CROSSOVER • DEFENDER RECOVERS')}else pnSay('CROSSOVER • BURST')}
function pnReset(team,shotClock=24){const G=PN.G;if(!G)return;PN.charge=false;G.meter=0;G.poss=team;G.shot=shotClock;G.possessionAge=0;G.cpuDecision=.18+Math.random()*.22;G.bumpPressure=0;G.lastPass=null;G.players.forEach(p=>{const j=p.slot;p.x=p.team?(team===1?980-j*24:900+j*12):(team===0?300+j*20:380-j*12);p.y=150+j*105;p.ctl=p.team===0&&j===0;p.stun=0});const o=G.players.findIndex(p=>p.team===team&&p.slot===0);G.ball={owner:o,shot:false,team,x:G.players[o]?.x||(team?980:300),y:G.players[o]?.y||360,z:0}}
function pnPad(){const G=PN.G,p=navigator.getGamepads?.()[0];if(!G||!p)return;PN.keys.gx=Math.abs(p.axes[0]||0)>.16?p.axes[0]:0;PN.keys.gy=Math.abs(p.axes[1]||0)>.16?p.axes[1]:0;PN.keys.gs=p.buttons[7]?.pressed;if(p.buttons[0]?.pressed&&!G.gA){G.gA=1;pnBegin()}if(!p.buttons[0]?.pressed&&G.gA){G.gA=0;pnRelease()}if(p.buttons[2]?.pressed&&!G.gX){G.gX=1;pnPass()}if(!p.buttons[2]?.pressed)G.gX=0;if(p.buttons[1]?.pressed&&!G.gB){G.gB=1;pnSteal()}if(!p.buttons[1]?.pressed)G.gB=0;if(p.buttons[3]?.pressed&&!G.gY){G.gY=1;pnCrossover()}if(!p.buttons[3]?.pressed)G.gY=0}
function pnFinish(){const G=PN.G;if(!G||G.finished)return;G.finished=true;G.pause=true;pnSay(`FINAL • ${G.h.name} ${G.score[0]} — ${G.score[1]} ${G.a.name}`);if(G.score[0]>G.score[1]&&!G.lastAward){G.lastAward=true;window.BM27RC252?.award?.('win','playnow-2722-'+Date.now())}pnRenderPause('FINAL')}
function pnOffenseTarget(team,slot){const ys=[360,155,565,255,465];if(team===0){const xs=[650,820,820,720,720];return{x:xs[slot],y:ys[slot]}}const xs=[630,460,460,560,560];return{x:xs[slot],y:ys[slot]}}
function pnSpaceOffense(team,dt){const G=PN.G,owner=G.players[G.ball.owner];for(const p of G.players){if(p.team!==team||p===owner||p.ctl)continue;const t=pnOffenseTarget(team,p.slot);pnMoveToward(p,t.x,t.y,150,dt)}}
function pnRunDefense(defTeam,dt){
  const G=PN.G,bh=G.players[G.ball.owner];if(!bh||bh.team===defTeam)return;const attackX=bh.team===0?1164:116,dir=bh.team===0?1:-1,defRating=G.ratings[defTeam].def,baseSpeed=205+(defRating-68)*1.65+(defTeam===1?9:0),ballToRim=Math.hypot(attackX-bh.x,360-bh.y);
  for(const d of G.players){if(d.team!==defTeam||d.ctl)continue;const match=G.players.find(p=>p.team===1-defTeam&&p.slot===d.slot)||bh;let tx,ty;if(match===bh){tx=bh.x+dir*32;ty=bh.y}else{tx=match.x*.84+attackX*.16;ty=match.y*.86+360*.14;if(ballToRim<300&&Math.abs(match.y-bh.y)>105){tx=tx*.62+(attackX-dir*150)*.38;ty=ty*.62+360*.38}}let speed=baseSpeed;if(d.stun>0)speed*=.28;if(G.dribbleBurst>0&&match===bh)speed*=.72;pnMoveToward(d,tx,ty,speed,dt)
  }
}
function pnUserMovement(dt){
  const G=PN.G,c=pnControlled();if(!c)return;let dx=(PN.keys.ArrowRight||PN.keys.d?1:0)-(PN.keys.ArrowLeft||PN.keys.a?1:0)+(PN.keys.gx||0),dy=(PN.keys.ArrowDown||PN.keys.s?1:0)-(PN.keys.ArrowUp||PN.keys.w?1:0)+(PN.keys.gy||0),mag=Math.hypot(dx,dy),m=mag||1,sprint=!!(PN.keys.Shift||PN.keys.gs),moving=mag>.05;if(sprint&&moving&&c.stamina>0)c.stamina=Math.max(0,c.stamina-dt*22);else c.stamina=Math.min(100,c.stamina+dt*(moving?7:13));let sp=sprint&&c.stamina>0?285:190;if(G.dribbleBurst>0&&G.poss===0)sp*=1.24;if(G.poss===1&&G.reachPenalty>0)sp*=.58;const ix=dx/m,iy=dy/m;c.x=clamp(c.x+ix*sp*dt,55,1225);c.y=clamp(c.y+iy*sp*dt,90,630);
  if(G.poss===0&&moving){let contact=false;for(const d of G.players.filter(p=>p.team===1)){if(d.stun>0)continue;const vx=c.x-d.x,vy=c.y-d.y,dist=Math.hypot(vx,vy)||.001,body=G.dribbleBurst>0?34:40;if(dist<body){contact=true;const nx=vx/dist,ny=vy/dist,overlap=body-dist,headOn=clamp(-(ix*nx+iy*ny),0,1),sideDot=ix*(-ny)+iy*nx;c.x+=nx*overlap*.52;c.y+=ny*overlap*.52;c.x+=(-ny)*sideDot*overlap*.20;c.y+=nx*sideDot*overlap*.20;if(headOn>.72&&!G.dribbleBurst){c.x-=ix*overlap*.12;c.y-=iy*overlap*.12}if(G.dribbleBurst>0&&c.x>d.x+6&&dist<58)d.stun=Math.max(d.stun,.18)}}c.x=clamp(c.x,55,1225);c.y=clamp(c.y,90,630);G.bumpPressure=contact?G.bumpPressure+dt*(sprint?1.05:.72):Math.max(0,G.bumpPressure-dt*1.7);if(G.bumpPressure>1.5&&G.possessionAge>.8){G.bumpPressure=.45;if(Math.random()<.12){pnTurnover(0,c);const n=pnNearest(1,c.x,c.y);pnStealCredit(1,n?.p);pnSay('BALL STRIPPED ON THE DRIVE');pnReset(1);return}}}
}
function pnCpuBestPass(bh){const G=PN.G;let best=null,bestGap=-1;for(const p of G.players){if(p.team!==1||p===bh)continue;const n=pnNearest(0,p.x,p.y),gap=(n?.d||160)-Math.hypot(p.x-bh.x,p.y-bh.y)*.04;if(gap>bestGap){bestGap=gap;best=p}}return{p:best,gap:bestGap}}
function pnCpuShoot(p){
  const G=PN.G,dx=116-p.x,dy=360-p.y,dist=Math.hypot(dx,dy),is3=dist>410,c=pnContest(1,p),manualBoost=performance.now()<G.contestUntil&&pnControlled()&&Math.hypot(pnControlled().x-p.x,pnControlled().y-p.y)<92 ? .22 : 0,contest=clamp(c.amount+manualBoost,0,1),base=clamp(.67-dist/1750+(G.ratings[1].off-80)*.004,.23,.72);let chance=clamp(base*(1-contest*.58),.08,.76);if(is3)chance*=.91;const blockChance=c.distance<31?clamp(.08+(G.ratings[0].def-74)*.006+(31-c.distance)*.01+(manualBoost ? .14 : 0),.06,.43):0,blocked=Math.random()<blockChance,make=!blocked&&Math.random()<chance;if(blocked)pnBlockCredit(0,c.defender);pnShotAttempt(1,p,is3);G.ball={owner:null,shot:true,team:1,x:p.x,y:p.y,z:0,vx:dx/62,vy:dy/62,vz:10,make,pts:is3?3:2,shooter:G.players.indexOf(p),shooterX:p.x,shooterY:p.y,blocked};pnSay(blocked?'HOME BLOCK!':contest>.7?'CPU SHOT • SMOTHERED':contest>.32?'CPU SHOT • CONTESTED':'CPU SHOT • OPEN')
}
function pnCpuOffense(dt){
  const G=PN.G;if(G.poss!==1||G.ball.shot)return;let bh=G.players[G.ball.owner];if(!bh||bh.team!==1){pnReset(1);bh=G.players[G.ball.owner]}G.cpuDecision-=dt;const nearest=pnNearest(0,bh.x,bh.y),guard=nearest?.d||999,dist=Math.hypot(bh.x-116,bh.y-360);
  if(G.cpuDecision<=0){G.cpuDecision=.3+Math.random()*.38;const pass=pnCpuBestPass(bh);if(guard<58&&pass.p&&pass.gap>guard+18&&Math.random()<.68){G.lastPass={team:1,passer:G.players.indexOf(bh),at:performance.now()};G.ball.owner=G.players.indexOf(pass.p);G.ball.x=pass.p.x;G.ball.y=pass.p.y;pnSay('CPU KICKS TO THE OPEN MAN');return}const shoot=G.shot<4.5||(dist<165&&guard>28)||(dist<255&&guard>58&&Math.random()<.56)||(dist>390&&dist<505&&guard>92&&Math.random()<.42);if(shoot){pnCpuShoot(bh);return}const lanes=[175,270,360,450,545];let bestLane=G.cpuLane,bestSpace=-1;for(let i=0;i<lanes.length;i++){let space=999;for(const d of G.players.filter(p=>p.team===0))space=Math.min(space,Math.hypot(d.x-(bh.x-100),d.y-lanes[i]));if(space>bestSpace){bestSpace=space;bestLane=i}}G.cpuLane=bestLane}
  const laneY=[175,270,360,450,545][G.cpuLane]||360,driveSpeed=195+(G.ratings[1].off-68)*1.3;let targetY=laneY;if(nearest&&nearest.d<82)targetY=clamp(laneY+(bh.y<nearest.p.y?-92:92),120,600);pnMoveToward(bh,Math.max(132,bh.x-155),targetY,driveSpeed,dt)
}
function pnResolveShot(){
  const G=PN.G,b=G.ball;if(!b.shot)return;const made=b.make,team=b.team,pts=b.pts,shooter=G.players[b.shooter];if(made){G.score[team]+=pts;G.stats[team].fgm++;if(pts===3)G.stats[team].m3++;if(shooter?.box){shooter.box.pts+=pts;shooter.box.fgm++;if(pts===3)shooter.box.m3++}if(G.lastPass?.team===team&&performance.now()-G.lastPass.at<4500&&G.lastPass.passer!==b.shooter){const a=G.players[G.lastPass.passer];if(a?.box){a.box.ast++;G.stats[team].ast++}}pnSay(`${team===0?'HOME':'AWAY'} +${pts}`);pnReset(1-team);return}
  const offChance=team===0?.20:.24,off=Math.random()<offChance,reboundTeam=off?team:1-team,rimX=team===0?1164:116,rebounder=pnNearest(reboundTeam,rimX,360)?.p;if(rebounder?.box){rebounder.box.reb++;G.stats[reboundTeam].reb++}pnSay(b.blocked?(off?'BLOCKED • OFFENSE RECOVERS':'BLOCKED • DEFENSIVE REBOUND'):(off?'OFFENSIVE REBOUND':'DEFENSIVE REBOUND'));pnReset(reboundTeam,off?14:24)
}
function pnUpdate(dt){
  const G=PN.G;if(!G||G.pause||G.finished)return;pnPad();G.time-=dt;G.shot-=dt;G.possessionAge+=dt;G.reachCooldown=Math.max(0,G.reachCooldown-dt);G.reachPenalty=Math.max(0,G.reachPenalty-dt);G.dribbleCooldown=Math.max(0,G.dribbleCooldown-dt);G.dribbleBurst=Math.max(0,G.dribbleBurst-dt);for(const p of G.players)p.stun=Math.max(0,(p.stun||0)-dt);if(PN.charge){G.meter+=G.dir*dt*1.42;if(G.meter>=1){G.meter=1;G.dir=-1}if(G.meter<=0){G.meter=0;G.dir=1}}
  if(G.time<=0){if(G.q<4){G.q++;G.time=120;pnReset(G.q%2);pnSay(`QUARTER ${G.q}`)}else{G.time=0;pnFinish();return}}
  if(G.shot<=0&&!G.ball.shot){const owner=G.players[G.ball.owner];pnTurnover(G.poss,owner);pnSay('SHOT CLOCK VIOLATION');pnReset(1-G.poss)}
  pnUserMovement(dt);if(!PN.G||G.finished)return;pnSpaceOffense(G.poss,dt);pnRunDefense(1-G.poss,dt);if(G.poss===1)pnCpuOffense(dt);
  if(G.ball.owner!=null){const o=G.players[G.ball.owner];if(o){G.ball.x=o.x;G.ball.y=o.y}}
  if(G.ball.shot){const fs=dt*60;G.ball.x+=G.ball.vx*fs;G.ball.y+=G.ball.vy*fs;G.ball.z+=G.ball.vz*fs;G.ball.vz-=.38*fs;const done=G.ball.team===0?G.ball.x>=1148:G.ball.x<=132;if(done)pnResolveShot()}
}
function pnBuildCourtBackground(c){
  if(!c)return null;const bg=document.createElement('canvas');bg.width=c.width;bg.height=c.height;const x=bg.getContext('2d'),w=bg.width,h=bg.height;
  x.fillStyle='#111827';x.fillRect(0,0,w,h);x.fillStyle='#0b1018';x.fillRect(0,0,w,64);x.fillRect(0,h-64,w,64);for(let i=0;i<70;i++){x.fillStyle=i%4===0?'#fbbf24':i%3===0?'#60a5fa':'#ffffff55';x.fillRect(12+i*18,20+(i%3)*8,4,4);x.fillRect(12+i*18,h-28-(i%3)*8,4,4)}
  const top=72,bottom=h-72,courtH=bottom-top;x.fillStyle='#bd7a3b';x.fillRect(26,top,w-52,courtH);for(let i=0;i<18;i++){x.fillStyle=i%2?'#c98a49':'#b87337';x.fillRect(26+i*(w-52)/18,top,(w-52)/18,courtH)}x.strokeStyle='#f8fafc';x.lineWidth=4;x.strokeRect(42,top+16,w-84,courtH-32);x.beginPath();x.moveTo(w/2,top+16);x.lineTo(w/2,bottom-16);x.stroke();x.beginPath();x.arc(w/2,h/2,76,0,Math.PI*2);x.stroke();x.strokeRect(42,h/2-145,230,290);x.strokeRect(w-272,h/2-145,230,290);x.beginPath();x.arc(272,h/2,76,-Math.PI/2,Math.PI/2);x.stroke();x.beginPath();x.arc(w-272,h/2,76,Math.PI/2,Math.PI*1.5);x.stroke();x.strokeStyle='#ef4444';x.lineWidth=5;x.beginPath();x.arc(105,h/2,17,0,Math.PI*2);x.stroke();x.beginPath();x.arc(w-105,h/2,17,0,Math.PI*2);x.stroke();x.save();x.globalAlpha=.17;x.fillStyle='#fff';x.font='900 58px Inter, sans-serif';x.textAlign='center';x.fillText('BM27',w/2,h/2+20);x.restore();return bg;
}
function pnDrawCourt(){
  const G=PN.G,c=PN.ui?.canvas||byId('pnCourt');if(!G||!c)return;const x=c.getContext('2d'),w=c.width,h=c.height;if(!PN.courtBg||PN.courtBg.width!==w||PN.courtBg.height!==h)PN.courtBg=pnBuildCourtBackground(c);x.drawImage(PN.courtBg,0,0);
  for(const p of G.players){x.save();x.globalAlpha=.22;x.fillStyle='#000';x.beginPath();x.ellipse(p.x+5,p.y+18,23,10,0,0,Math.PI*2);x.fill();x.globalAlpha=1;x.beginPath();x.fillStyle=p.team?'#dc2626':'#2563eb';x.arc(p.x,p.y,23,0,Math.PI*2);x.fill();x.strokeStyle=p.ctl?'#fff':'#0b102088';x.lineWidth=p.ctl?5:2;x.stroke();x.fillStyle='#fff';x.font='1000 16px Inter, sans-serif';x.textAlign='center';x.fillText(String(p.number),p.x,p.y+6);x.font='900 9px Inter, sans-serif';x.fillStyle='#e2e8f0';x.fillText(p.pos,p.x,p.y-29);if(p.ctl){x.fillStyle='#111827';x.fillRect(p.x-24,p.y+31,48,5);x.fillStyle=p.stamina>35?'#22c55e':'#f59e0b';x.fillRect(p.x-24,p.y+31,48*(p.stamina/100),5)}x.restore()}
  x.save();x.globalAlpha=.18;x.fillStyle='#000';x.beginPath();x.ellipse(G.ball.x+4,G.ball.y+10,12,6,0,0,Math.PI*2);x.fill();x.globalAlpha=1;x.beginPath();x.fillStyle='#f97316';x.arc(G.ball.x,G.ball.y-Math.max(0,G.ball.z),10,0,Math.PI*2);x.fill();x.strokeStyle='#4a210b';x.lineWidth=2;x.stroke();x.restore();if(G.pause&&!byId('pnPausePanel')?.classList.contains('hidden')){x.fillStyle='#02040a88';x.fillRect(0,0,w,h)}
}
function pnPct(m,a){return a?Math.round(m/a*100):0}
function pnPlayerRows(team){const G=PN.G;return G.players.filter(p=>p.team===team).map(p=>`<tr><td><b>#${esc(p.number)}</b></td><td><b>${esc(p.name)}</b><small>${esc(p.pos)}</small></td><td>${p.box.pts}</td><td>${p.box.reb}</td><td>${p.box.ast}</td><td>${p.box.stl}</td><td>${p.box.blk}</td><td>${p.box.tov}</td><td>${p.box.fgm}-${p.box.fga}</td><td>${p.box.m3}-${p.box.a3}</td></tr>`).join('')}
function pnRenderPause(title='PAUSED'){
  const G=PN.G,panel=byId('pnPausePanel'),host=byId('pnPauseStats');if(!G||!panel||!host)return;pnSetText(byId('pnPauseTitle'),title);const a=G.stats[0],b=G.stats[1];host.innerHTML=`<div class="pn2722-teamstats"><div><b>${esc(G.h.name)}</b><strong>${G.score[0]}</strong><span>FG ${a.fgm}-${a.fga} (${pnPct(a.fgm,a.fga)}%)</span><span>3PT ${a.m3}-${a.a3}</span><span>REB ${a.reb} • AST ${a.ast} • STL ${a.stl}</span><span>BLK ${a.blk} • TO ${a.tov}</span></div><div class="pn2722-vsmini">TEAM STATS</div><div><b>${esc(G.a.name)}</b><strong>${G.score[1]}</strong><span>FG ${b.fgm}-${b.fga} (${pnPct(b.fgm,b.fga)}%)</span><span>3PT ${b.m3}-${b.a3}</span><span>REB ${b.reb} • AST ${b.ast} • STL ${b.stl}</span><span>BLK ${b.blk} • TO ${b.tov}</span></div></div><div class="pn2722-boxgrid"><section><h3>HOME BOX SCORE</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3PT</th></tr></thead><tbody>${pnPlayerRows(0)}</tbody></table></div></section><section><h3>AWAY BOX SCORE</h3><div class="table-wrap"><table><thead><tr><th>#</th><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>FG</th><th>3PT</th></tr></thead><tbody>${pnPlayerRows(1)}</tbody></table></div></section></div>`;panel.classList.remove('hidden');byId('pnResumeGame').disabled=G.finished;byId('pnResumeGame').onclick=()=>pnTogglePause(false);byId('pnRestartGame').onclick=()=>{const h=G.h,a=G.a;if(PN.raf)cancelAnimationFrame(PN.raf);PN.raf=0;pnStart(h,a)};byId('pnPauseTeamSelect').onclick=pnOpen;byId('pnPauseMainMenu').onclick=()=>{pnClose();showSportsScreen('rdMenu');buildMainMenu()}
}
function pnTogglePause(force){const G=PN.G;if(!G||G.finished&&force===false)return;G.pause=typeof force==='boolean'?force:!G.pause;const b=byId('pnPause');if(b)b.textContent=G.pause?'RESUME':'PAUSE / STATS';const panel=byId('pnPausePanel');if(G.pause)pnRenderPause(G.finished?'FINAL':'PAUSED');else panel?.classList.add('hidden')}
function pnRefreshHud(t,force=false){
  const G=PN.G,u=PN.ui;if(!G||!u)return;if(!force&&t-PN.lastHud<90)return;PN.lastHud=t;pnSetText(u.home,G.score[0]);pnSetText(u.away,G.score[1]);pnSetText(u.quarter,G.q);pnSetText(u.clock,Math.floor(G.time/60)+':'+String(Math.floor(G.time%60)).padStart(2,'0'));pnSetText(u.shot,Math.max(0,Math.ceil(G.shot)));pnSetText(u.hfg,`${G.stats[0].fgm}/${G.stats[0].fga}`);pnSetText(u.h3,`${G.stats[0].m3}/${G.stats[0].a3}`);pnSetText(u.afg,`${G.stats[1].fgm}/${G.stats[1].fga}`);pnSetText(u.a3,`${G.stats[1].m3}/${G.stats[1].a3}`);const c=pnControlled();if(c){pnSetText(u.playerLabel,`#${c.number} ${c.pos} • ${c.name}`);pnSetText(u.staminaText,Math.round(c.stamina));if(u.staminaBar)u.staminaBar.style.width=`${clamp(c.stamina,0,100)}%`}
}
function pnLoop(t){const G=PN.G;if(!G)return;if(document.hidden){G.last=t;PN.raf=requestAnimationFrame(pnLoop);return}const frameMs=G.pause?220:(1000/BM27_PERF.playNowFps);if(PN.lastFrame&&t-PN.lastFrame<frameMs){PN.raf=requestAnimationFrame(pnLoop);return}PN.lastFrame=t;const dt=Math.min(.05,(t-G.last)/1000||0);G.last=t;pnUpdate(dt);pnDrawCourt();pnRefreshHud(t);if(PN.ui?.needle)PN.ui.needle.style.left=(G.meter*100)+'%';PN.raf=requestAnimationFrame(pnLoop)}
function installPlayNow(){window.BM27PlayNow253={...(window.BM27PlayNow253||{}),open:pnOpen}}


/* ---------- All National teams browser ---------- */
const NATIONAL_STATES=['ALL','AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const NATIONAL_STATE_CODES={ALABAMA:'AL',ALASKA:'AK',ARIZONA:'AZ',ARKANSAS:'AR',CALIFORNIA:'CA',COLORADO:'CO',CONNECTICUT:'CT',DELAWARE:'DE','DISTRICT OF COLUMBIA':'DC',FLORIDA:'FL',GEORGIA:'GA',HAWAII:'HI',IDAHO:'ID',ILLINOIS:'IL',INDIANA:'IN',IOWA:'IA',KANSAS:'KS',KENTUCKY:'KY',LOUISIANA:'LA',MAINE:'ME',MARYLAND:'MD',MASSACHUSETTS:'MA',MICHIGAN:'MI',MINNESOTA:'MN',MISSISSIPPI:'MS',MISSOURI:'MO',MONTANA:'MT',NEBRASKA:'NE',NEVADA:'NV','NEW HAMPSHIRE':'NH','NEW JERSEY':'NJ','NEW MEXICO':'NM','NEW YORK':'NY','NORTH CAROLINA':'NC','NORTH DAKOTA':'ND',OHIO:'OH',OKLAHOMA:'OK',OREGON:'OR',PENNSYLVANIA:'PA','RHODE ISLAND':'RI','SOUTH CAROLINA':'SC','SOUTH DAKOTA':'SD',TENNESSEE:'TN',TEXAS:'TX',UTAH:'UT',VERMONT:'VT',VIRGINIA:'VA',WASHINGTON:'WA','WEST VIRGINIA':'WV',WISCONSIN:'WI',WYOMING:'WY'};
function nationalStateCode(v){const x=String(v||'').trim().toUpperCase();return NATIONAL_STATE_CODES[x]||x}
let natPage=1,natQuery='',natState='ALL',augmentLock=false,natCache=null,natSearchTimer=0;
function nationalRows(){
  if(natCache)return natCache;const map=new Map();const add=t=>{if(!t?.name)return;const id=String(t.id||`${t.name}|${t.city||''}|${t.state||''}`);if(!map.has(id))map.set(id,{id,name:t.name,city:t.city||'',state:nationalStateCode(t.state||t.stateCode),kind:t.kind||t.source||'High School',rank:window.BM27NationalRankMap?.get?.(id)||null})};
  const dir=window.BM27NationalDirectory;if(Array.isArray(dir))dir.forEach(add);else if(Array.isArray(dir?.schools))dir.schools.forEach(add);
  if(Array.isArray(window.BM27AllOutOfStateSchools))window.BM27AllOutOfStateSchools.forEach(add);
  try{if(typeof current!=='undefined'&&current?.teams)current.teams.forEach(add)}catch{}
  natCache=[...map.values()].sort((a,b)=>(a.rank||999999)-(b.rank||999999)||(a.state||'').localeCompare(b.state||'')||a.name.localeCompare(b.name));return natCache;
}
function renderNationalBrowser(){
  const host=byId('v2713NationalBrowser');if(!host)return;const all=nationalRows();
  if(!all.length){host.innerHTML=`<div class="v2713-national-loading"><b>National school directory is still loading.</b><br><span>BM27 will show every loaded national team here instead of only the Top 100.</span><br><button id="v2713NatRetry" class="secondary">Reload National Teams</button></div>`;byId('v2713NatRetry').onclick=async()=>{byId('v2713NatRetry').disabled=true;try{await window.BM27OutOfState?.loadAllStates?.({force:true});await window.BM27V22?.hydrateRealNationalPool?.(current)}catch(e){console.warn(e)}renderNationalBrowser()};return}
  const q=natQuery.trim().toLowerCase();let rows=all.filter(t=>(natState==='ALL'||t.state===natState)&&(!q||`${t.name} ${t.city} ${t.state}`.toLowerCase().includes(q)));const per=100,pages=Math.max(1,Math.ceil(rows.length/per));natPage=clamp(natPage,1,pages);const start=(natPage-1)*per,show=rows.slice(start,start+per);
  host.innerHTML=`<div class="section-head"><div><p class="eyebrow">FULL NATIONAL DIRECTORY</p><h3>All National Teams</h3><p class="muted small">Every national school BM27 has loaded is listed here — not just the Top 100 rankings.</p></div><span class="tag">${all.length.toLocaleString()} loaded</span></div><div class="tools"><input id="v2713NatSearch" value="${esc(natQuery)}" placeholder="Search school or city"><select id="v2713NatState">${NATIONAL_STATES.map(s=>`<option value="${s}" ${s===natState?'selected':''}>${s==='ALL'?'All States':s}</option>`).join('')}</select><div class="count">Showing ${rows.length?start+1:0}–${Math.min(start+per,rows.length)} of ${rows.length.toLocaleString()}</div></div><div class="v2713-national-list">${show.map(t=>`<div class="v2713-national-team"><div>${schoolLogo(t.name,'bmLogoTiny')}</div><div><b>${t.rank?`#${t.rank} `:''}${esc(t.name)}</b><small>${esc([t.city,t.state].filter(Boolean).join(', '))}${t.kind?' • '+esc(t.kind):''}${t.rank?' • Nationally ranked':''}</small></div></div>`).join('')||'<div class="v2713-national-loading">No teams match this filter.</div>'}</div><div class="v2713-national-pagination"><button id="v2713NatPrev" class="secondary" ${natPage<=1?'disabled':''}>← Previous</button><b>Page ${natPage} of ${pages}</b><button id="v2713NatNext" class="secondary" ${natPage>=pages?'disabled':''}>Next →</button></div>`;
  byId('v2713NatSearch').oninput=e=>{natQuery=e.target.value;natPage=1;clearTimeout(natSearchTimer);natSearchTimer=setTimeout(renderNationalBrowser,140)};byId('v2713NatState').onchange=e=>{natState=e.target.value;natPage=1;renderNationalBrowser()};byId('v2713NatPrev').onclick=()=>{natPage--;renderNationalBrowser()};byId('v2713NatNext').onclick=()=>{natPage++;renderNationalBrowser()};
}
function augmentNationals(){
  natCache=null;
  if(augmentLock)return;const content=byId('v22NationalsContent');if(!content||!content.offsetParent)return;if(byId('v2718FullNationalRankings'))return;if(byId('v2713NationalBrowser'))return;augmentLock=true;const host=document.createElement('section');host.id='v2713NationalBrowser';host.className='v2713-national-browser';content.appendChild(host);renderNationalBrowser();augmentLock=false;
}
window.addEventListener('bm27-out-of-state-loaded',()=>{natCache=null;setTimeout(()=>{augmentNationals();renderNationalBrowser()},0)});

/* ---------- What's New ---------- */
function updateNotes(){
  const box=byId('updatesContent');if(!box||box.querySelector('[data-v2713-notes]'))return;
  box.insertAdjacentHTML('afterbegin',`<article class="card" data-v2713-notes><p class="eyebrow">BM27 v2.7.15 • PLAY NOW HARD DEFENSE</p><h3>Play Now Hard Defense • Performance Preserved</h3><ul class="update-list"><li>Play Now now uses matchup-based man defense with on-ball pressure, help defense, recover logic and drive cutoffs.</li><li>Bad passing lanes can be intercepted, body contact can strip reckless drives, and close defenders can block or heavily contest shots.</li><li>CPU offense now attacks gaps, passes out of pressure, finds open teammates and takes context-aware drives, pull-ups and threes.</li><li>Shot timing is tighter and contests directly shrink make chances, while clean green releases remain rewarding.</li><li>Performance pass remains intact: cached court, reduced DOM writes, adaptive 30/45 FPS rendering, and hidden-tab throttling.</li><li>Main-menu effects are reduced automatically on lower-power/mobile devices while keeping the new menu design.</li><li>National-team search is debounced and its directory is cached to prevent repeated full sorting.</li><li>Added a 20-tier Season Pass to Season Mode. Pass XP comes from games, wins, district titles and state titles, and progress saves with the career.</li><li>Completely rebuilt Play Now presentation with a new team-select screen, arena court, live FG/3PT stats, shot meter, polished scoreboard and permanently visible HOME and AWAY point totals.</li><li>Dynasty now has a reliable direct exit back to the main menu.</li><li>Restored the BM27 loading screen for startup and major mode transitions.</li><li>Rebuilt the main menu around the new left-side layout with an animated background and direct access to Dynasty, Season, Season Pass, Legacy, Play Now, MySchool, School Branding, Rosters, Historic Rosters and Settings.</li><li>Nationals in Season Mode now includes an All National Teams browser showing every nationwide school BM27 has loaded, with search, state filtering and pagination.</li></ul></article>`);
}

/* ---------- Install / recurring repair ---------- */
function tick(){buildMainMenu();installSeasonPassPage();dynastyExitFix();if(byId('v22NationalsPage')?.classList.contains('active'))augmentNationals()}
function install(){
  if(window.__BM27_V2713__)return;window.__BM27_V2713__=true;ensureLoader();buildMainMenu();installSeasonPassPage();installPlayNow();dynastyExitFix();bootLoading();
  document.addEventListener('click',e=>{if(e.target.closest('[data-open-updates]'))setTimeout(updateNotes,0);if(e.target.closest('#v22NationalsNav'))setTimeout(augmentNationals,80)},true);
  let tickTimer=0;const observer=new MutationObserver(()=>{if(byId('pn2713')||tickTimer)return;tickTimer=setTimeout(()=>{tickTimer=0;if(document.visibilityState==='visible'&&!byId('pn2713'))tick()},260)});observer.observe(document.body||document.documentElement,{childList:true,subtree:true});setInterval(()=>{if(document.visibilityState==='visible'&&!byId('pn2713'))tick()},20000);
  window.BM27V2713={showLoading,buildMainMenu,renderSeasonPass,openPassHub,pnOpen,renderNationalBrowser};
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
