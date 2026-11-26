/* BM27 v2.8.0 — "2K" presentation layer.
   Pure presentation: every button below is the game's own button, moved into a new look.
   Season, MySchool, Dynasty, saves and school logos keep running through their original code. */
(()=>{'use strict';
if(window.__BM27_V280__)return;window.__BM27_V280__=true;
const VERSION='3.0.2';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const has=v=>typeof v!=='undefined';

/* ---------- main menu tiles ---------- */
const TABS=[['play','PLAY'],['features','FEATURES'],['options','OPTIONS']];
// art: crop of the cover photo used behind each tile (x% y% zoom)
const TILE={
  season:{t:'SEASON',s:'Take over a Missouri program and play the complete MSHSAA season.',c:'#1f6bff',tab:'play',img:'season',art:'50% 22% / cover',big:1},
  myschool:{t:'MySCHOOL',s:'Create your own school, set your colors and build a powerhouse.',c:'#12b76a',tab:'play',img:'myschool',art:'50% 18% / cover',big:1},
  dynasty:{t:'DYNASTY',s:'Tryouts to commitment. Build a coaching career that lasts.',c:'#f5b700',tab:'play',img:'dynasty',art:'50% 22% / cover'},
  playnow:{t:'PLAY NOW',s:'Pick any two schools and tip off right now.',c:'#e4002b',tab:'play',img:'playnow',art:'50% 28% / cover'},
  legacy:{t:'LEGACY',s:'Relive classic seasons and chase all-time records.',c:'#9b51e0',tab:'play',img:'legacy',art:'50% 30% / cover'},
  seasonPass2713Menu:{t:'SEASON PASS',s:'Level up the pass by playing games and finishing goals.',c:'#ff7a00',tab:'play',img:'seasonpass',art:'50% 20% / cover'},
  branding255Btn:{t:'SCHOOL BRANDING',s:'Logos, colors and looks for every school in the game.',c:'#00b8d9',tab:'features',img:'branding',art:'50% 28% / cover',big:1},
  rosters:{t:'ROSTERS',s:'Edit players, positions and ratings in any save.',c:'#2dd4bf',tab:'features',img:'rosters',art:'50% 18% / cover'},
  history254Btn:{t:'HISTORIC ROSTERS',s:'Verified past rosters, playable in Play Now.',c:'#c084fc',tab:'features',img:'history',art:'50% 30% / cover'},
  settings:{t:'SETTINGS',s:'Difficulty, soundtrack, volume and display scale.',c:'#94a3b8',tab:'options',img:'settings',art:'50% 35% / cover',big:1}
};
const keyOf=b=>b.dataset.mode||b.id||(b.textContent||'').trim().toLowerCase().replace(/\W+/g,'-');
let menuTab='play';

function tileButtons(){const nav=$('rdModes');return nav?[...nav.querySelectorAll(':scope > button')]:[]}
function decorateTiles(){
  const nav=$('rdModes');if(!nav)return;
  nav.classList.add('k2-tiles');
  for(const b of tileButtons()){
    const k=keyOf(b),m=TILE[k]||{t:(b.textContent||'MODE').trim().toUpperCase(),s:'',c:'#64748b',tab:'features',art:'50% 50% / 180%'};
    b.dataset.k2Tab=m.tab;b.classList.add('k2-tile');b.classList.toggle('k2-big',!!m.big);
    b.style.setProperty('--tile',m.c);const ord=Object.keys(TILE).indexOf(k);b.style.order=String(ord<0?50:ord);
    if(b.dataset.k2Done!==k||!b.querySelector('.k2-art')){
      b.dataset.k2Done=k;b.dataset.k2Title=m.t;b.dataset.k2Sub=m.s;
      const [pos,size]=m.art.split(' / ');const art=m.img?`assets/final/tiles/${m.img}.jpg`:'assets/final/cover.jpeg';b.dataset.k2Big=m.img?`assets/final/tiles/${m.img}-big.jpg`:'';
      b.innerHTML=`<i class="k2-art" style="background-image:url(${art});background-position:${pos};background-size:${size}"></i><i class="k2-shade"></i><i class="k2-ghost">${esc(m.t)}</i><i class="k2-label"><b>${esc(m.t)}</b></i>`;
    }
    const hide=b.dataset.k2Tab!==menuTab;if(b.hidden!==hide)b.hidden=hide;
  }
}
function setMenuTab(t){menuTab=t;document.querySelectorAll('#k2MenuTabs [data-tab]').forEach(x=>x.classList.toggle('on',x.dataset.tab===t));decorateTiles();const first=tileButtons().filter(b=>!b.hidden).sort((a,b)=>(+a.style.order||0)-(+b.style.order||0))[0];if(first){first.focus({preventScroll:true});showInfo(first)}}
function cycleTab(d){const i=TABS.findIndex(t=>t[0]===menuTab);setMenuTab(TABS[(i+d+TABS.length)%TABS.length][0])}
function showInfo(b){const box=$('k2MenuInfo');if(!box||!b)return;swapBg(b.dataset.k2Big);box.innerHTML=`<small>${esc(TABS.find(t=>t[0]===menuTab)?.[1]||'')}</small><h2>${esc(b.dataset.k2Title||'')}</h2><p>${esc(b.dataset.k2Sub||'')}</p>`;box.style.setProperty('--tile',b.style.getPropertyValue('--tile'))}
let bgCur='';function swapBg(src){const box=document.querySelector('#rdMenu .k2-bg');if(!box||!src||src===bgCur)return;bgCur=src;const img=new Image();img.alt='';img.className='k2-bg-art';img.onload=()=>{img.classList.add('on');[...box.querySelectorAll('img')].filter(x=>x!==img).forEach(x=>{x.classList.remove('on');x.classList.add('off');setTimeout(()=>x.remove(),700)})};img.src=src;box.appendChild(img)}
function accountName(){const n=$('signedInName')?.textContent?.trim();return n||'GUEST'}
function buildMenu(){
  const menu=$('rdMenu');if(!menu)return;
  menu.classList.add('k2-menu');
  if(!$('k2MenuTop')){
    menu.insertAdjacentHTML('afterbegin',`<div class="k2-bg"><img src="assets/final/cover.jpeg" alt=""></div>
    <header id="k2MenuTop" class="k2-topbar"><div class="k2-brand"><img src="assets/icon.svg" alt=""><div><b>MSHSAA BM27</b><small>RAMPACEGAMES</small></div></div>
    <nav id="k2MenuTabs" class="k2-tabs"><span class="k2-btn-hint">LB</span>${TABS.map(([k,l])=>`<button type="button" data-tab="${k}">${l}</button>`).join('')}<span class="k2-btn-hint">RB</span></nav>
    <div class="k2-account"><span class="k2-dot"></span><b id="k2Account">GUEST</b><time id="k2Clock"></time></div></header>
    <div id="k2MenuInfo" class="k2-menu-info"></div>
    <footer class="k2-hints"><span><i>A</i>SELECT</span><span><i>B</i>BACK</span><span><i>LB</i><i>RB</i>SWITCH TAB</span><span class="k2-ver">v${VERSION}</span></footer>`);
    $('k2MenuTabs').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t)setMenuTab(t.dataset.tab)});
    const nav=$('rdModes');
    nav?.addEventListener('focusin',e=>{const b=e.target.closest('.k2-tile');if(b)showInfo(b)});
    nav?.addEventListener('mouseover',e=>{const b=e.target.closest('.k2-tile');if(b)showInfo(b)});
  }
  decorateTiles();
  if(!document.querySelector('#k2MenuTabs .on'))setMenuTab(menuTab);
  const v=document.querySelector('.v2713-menu-version span');if(v&&v.textContent!=='v'+VERSION)v.textContent='v'+VERSION;
}
function clock(){const c=$('k2Clock');if(c)c.textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});const a=$('k2Account');if(a)a.textContent=accountName()}

/* ---------- save slots: empty slot starts a new save the normal way ---------- */
function portal(){
  const slots=$('rdSlots');if(!slots||slots.dataset.k2)return;slots.dataset.k2='1';
  slots.addEventListener('click',e=>{if(e.target.closest('button'))return;const empty=e.target.closest('.rd-slot.rd-empty');if(empty&&!$('rdCreateSlot')?.disabled)$('rdCreateSlot')?.click()});
}

/* ---------- in-game hub ---------- */
const GROUPS=[
  ['home','HOME',['dashboard','news2716','central','meetings','office','coach270Nav']],
  ['team','TEAM',['roster','tryouts','grades2716','stats270Nav','juniorProgram','program']],
  ['season','SEASON',['schedule','tournaments','standings','conferences','bm2751-nav','rankings','classesDistricts','nationals','seasonPass2713']],
  ['recruit','RECRUITING',['recruiting','leagues','bm2755CollegeNav']],
  ['legacy','LEGACY',['dynasty','dynastyLab','history']],
  ['more','MORE',[]]
];
let hubGroup='home';
const navKey=b=>b.dataset.page||b.id;
function sideButtons(){return [...document.querySelectorAll('#sidebar nav .nav, #sidebar nav button')].filter(b=>navKey(b))}
function groupOf(k){for(const [g,,keys] of GROUPS)if(keys.includes(k))return g;return 'more'}
let lastActive='';
function activeKey(){const a=document.querySelector('#sidebar .nav.active');return a&&navKey(a)?navKey(a):(lastActive||'dashboard')}
function buildHub(){
  const main=document.querySelector('#game main');if(!main)return;
  document.getElementById('game')?.classList.add('k2-game');
  let bar=$('k2Hub');
  if(!bar){
    const header=main.querySelector(':scope > header');
    (header||main.firstElementChild).insertAdjacentHTML('afterend',`<div id="k2Hub" class="k2-hub"><div id="k2HubHud" class="k2-hud"></div><nav id="k2HubGroups" class="k2-tabs k2-hub-groups"></nav><nav id="k2HubSub" class="k2-subtabs"></nav></div>`);
    bar=$('k2Hub');
    $('k2HubGroups').addEventListener('click',e=>{const t=e.target.closest('[data-group]');if(!t)return;hubGroup=t.dataset.group;renderHubTabs();const first=$('k2HubSub').querySelector('button');if(first&&!$('k2HubSub').querySelector('.on'))first.click()});
    $('k2HubSub').addEventListener('click',e=>{const t=e.target.closest('[data-k]');if(!t)return;const src=sideButtons().find(b=>navKey(b)===t.dataset.k);src?.click();setTimeout(renderHubTabs,0);window.scrollTo({top:0,behavior:'smooth'})});
  }
  const ak=activeKey();if(ak!==lastActive){lastActive=ak;hubGroup=groupOf(ak)}renderHubTabs();renderHud();
}
function renderHubTabs(){
  const g=$('k2HubGroups'),s=$('k2HubSub');if(!g||!s)return;
  const btns=sideButtons();const act=activeKey();
  const present=new Set(btns.map(b=>groupOf(navKey(b))));
  const sig=[hubGroup,act,btns.map(navKey).join(',')].join('|');if(g.dataset.sig===sig)return;g.dataset.sig=sig;
  g.innerHTML=`<span class="k2-btn-hint">LB</span>`+GROUPS.filter(([k])=>present.has(k)).map(([k,l])=>`<button type="button" data-group="${k}" class="${k===hubGroup?'on':''}">${l}</button>`).join('')+`<span class="k2-btn-hint">RB</span>`;
  const order=(GROUPS.find(g=>g[0]===hubGroup)||[,,[]])[2];const rank=b=>{const i=order.indexOf(navKey(b));return i<0?99:i};
  const mine=btns.filter(b=>groupOf(navKey(b))===hubGroup).sort((a,b)=>rank(a)-rank(b));
  if(hubGroup==='more'){const exit=mine.findIndex(b=>b.id==='backToSaves');if(exit>=0)mine.push(mine.splice(exit,1)[0])}
  s.innerHTML=mine.map(b=>`<button type="button" data-k="${esc(navKey(b))}" class="${navKey(b)===act?'on':''}${b.id==='backToSaves'?' k2-exit':''}">${esc((b.textContent||'').trim())}</button>`).join('');
}
function cycleGroup(d){const keys=[...document.querySelectorAll('#k2HubGroups [data-group]')].map(x=>x.dataset.group);if(!keys.length)return;const i=Math.max(0,keys.indexOf(hubGroup));hubGroup=keys[(i+d+keys.length)%keys.length];renderHubTabs();$('k2HubSub')?.querySelector('button:not(.k2-exit)')?.click()}
function logoHtml(name){try{return window.BM27Branding255?.html?.(name,'k2HudLogo')||window.BM27Logos252?.html?.(name,'k2HudLogo')||''}catch{return ''}}
function renderHud(){
  const hud=$('k2HubHud');if(!hud)return;let me=null;try{if(has(current)&&current)me=myTeam()}catch{}
  if(!me){hud.innerHTML='';return}
  const rank=(()=>{try{return getRank(me)}catch{return ''}})();
  const sig=[me.name,me.wins,me.losses,me.rating,rank,current.day].join('|');if(hud.dataset.sig===sig&&hud.querySelector('img'))return;hud.dataset.sig=sig;
  const mode=(document.body.dataset.rdMode||'season').toUpperCase().replace('MYSCHOOL','MySCHOOL');
  hud.innerHTML=`<div class="k2-hud-logo">${logoHtml(me.name)}</div><div class="k2-hud-main"><small>${esc(mode)} • CLASS ${esc(me.class)} • DISTRICT ${esc(me.district)}</small><b>${esc(me.name)}${me.mascot?` <span>${esc(me.mascot)}</span>`:''}</b></div>
  <div class="k2-hud-stats"><div><small>RECORD</small><b>${Number(me.wins)||0}-${Number(me.losses)||0}</b></div><div><small>TEAM OVR</small><b class="k2-ovr ${tier(me.rating)}">${Math.round(Number(me.rating)||0)}</b></div>${rank?`<div><small>STATE RANK</small><b>#${rank}</b></div>`:''}</div>`;
}

/* ---------- dashboard: 2K "next game" banner + quick tiles ---------- */
function goPage(k){const b=sideButtons().find(x=>navKey(x)===k);b?.click();window.scrollTo({top:0,behavior:'smooth'})}
function fmtDate(d){try{return new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}catch{return ''}}
function renderDashboard(){
  const page=$('dashboardPage');if(!page||!page.classList.contains('active'))return;
  let me=null;try{if(has(current)&&current)me=myTeam()}catch{}if(!me)return;
  let g=null,opp=null;try{g=nextUnplayed();opp=g?opponent(g):null}catch{}
  const sched=current.schedule||[],played=sched.filter(x=>x.played).length,last=sched.filter(x=>x.played).slice(-1)[0];
  const sig=[me.id,g?.id,opp?.name,played,me.wins,me.losses,current.day].join('|');
  let box=$('k2NextGame');
  if(!box){page.insertAdjacentHTML('afterbegin','<section id="k2NextGame" class="k2-next"></section><nav id="k2Quick" class="k2-quick"></nav>');box=$('k2NextGame');
    box.addEventListener('click',e=>{const b=e.target.closest('[data-k2act]');if(!b)return;if(b.dataset.k2act==='play')$('playNextBtn')?.click();else if(b.dataset.k2act==='advance')$('advanceBtn')?.click();else goPage(b.dataset.k2act)});
    $('k2Quick').addEventListener('click',e=>{const b=e.target.closest('[data-k2go]');if(b)goPage(b.dataset.k2go)})}
  if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  const side=(t,label)=>`<div class="k2-next-team"><div class="k2-next-logo">${t?logoHtml(t.name):''}</div><b>${esc(t?.name||'TBD')}</b><small>${esc(label)}</small></div>`;
  if(g){
    const home=g.home&&!g.neutral, where=g.neutral?'NEUTRAL SITE':home?'HOME':'AWAY';
    box.innerHTML=`<div class="k2-next-kicker"><span>NEXT GAME</span><span>${esc(fmtDate(g.date))} • ${esc(g.type||'Regular Season')} • ${where}</span></div>
    <div class="k2-next-match">${side(me,`${Number(me.wins)||0}-${Number(me.losses)||0} • ${Math.round(+me.rating||0)} OVR`)}<div class="k2-next-vs">${home?'VS':'@'}</div>${side(opp,opp?`${Number(opp.wins)||0}-${Number(opp.losses)||0} • ${Math.round(+opp.rating||0)} OVR`:'Waiting on bracket')}</div>
    <div class="k2-next-actions"><button type="button" class="primary" data-k2act="play">PLAY / SIM GAME</button><button type="button" class="secondary" data-k2act="schedule">FULL SCHEDULE</button></div>`;
  }else{
    box.innerHTML=`<div class="k2-next-kicker"><span>${sched.length?'SCHEDULE':'PRESEASON'}</span><span>${esc(fmtDate(current.day))}</span></div>
    <div class="k2-next-empty"><b>${sched.length?'NO GAMES LEFT ON THE SCHEDULE':'NO GAMES SCHEDULED YET'}</b><p>${sched.length?'Keep advancing days to move through the postseason and offseason.':'Finalize your roster in Tryouts, then build your schedule.'}</p></div>
    <div class="k2-next-actions"><button type="button" class="primary" data-k2act="${sched.length?'advance':'schedule'}">${sched.length?'ADVANCE DAY':'BUILD SCHEDULE'}</button><button type="button" class="secondary" data-k2act="${current.tryoutsFinalized?'roster':'tryouts'}">${current.tryoutsFinalized?'ROSTER':'TRYOUTS'}</button></div>`;
  }
  const roster=me.roster||[],seniors=roster.filter(p=>+p.grade===12).length;
  const lastTxt=last?`${+last.myScore>+last.oppScore?'W':'L'} ${last.myScore}-${last.oppScore}`:'—';
  const tiles=[['roster','ROSTER',`${roster.length} PLAYERS`],['schedule','SCHEDULE',`${played}/${sched.length} PLAYED`],['standings','STANDINGS',`CLASS ${me.class}`],['recruiting','RECRUITING',`${seniors} SENIORS`],['office','COACH OFFICE',`${(current.strategy?.pace||$('paceSelect')?.value||'Balanced')}`.toUpperCase()],['history','LAST GAME',lastTxt]];
  const have=new Set(sideButtons().map(navKey));
  $('k2Quick').innerHTML=tiles.filter(t=>have.has(t[0])).map(([k,l,v])=>`<button type="button" data-k2go="${k}"><small>${l}</small><b>${esc(v)}</b></button>`).join('');
}

/* ---------- 2K rating badges in every table with an OVR / POT column ---------- */
function tier(v){v=Number(v)||0;return v>=90?'k2-t-gal':v>=85?'k2-t-ame':v>=80?'k2-t-gold':v>=70?'k2-t-silver':'k2-t-bronze'}
function badgeTables(root){
  for(const table of (root||document).querySelectorAll('#game table, .rd-roster-list table')){
    const heads=[...table.querySelectorAll('thead th')];const cols=heads.map((h,i)=>/^(OVR|POT|POTENTIAL|OVERALL)$/i.test(h.textContent.trim())?i:-1).filter(i=>i>=0);if(!cols.length)continue;
    for(const tr of table.querySelectorAll('tbody tr'))for(const i of cols){const td=tr.children[i];if(!td||td.dataset.k2b)continue;const n=td.textContent.trim();if(!/^\d{1,3}$/.test(n)||td.children.length)continue;td.dataset.k2b='1';td.innerHTML=`<span class="k2-ovr ${tier(n)}">${n}</span>`}
  }
}

/* ---------- data repair: old builds could make heights like 5'12" ---------- */
const fixedSaves=new Set();
function fixHeight(h){const m=/^(\d)'(\d{1,2})"$/.exec(String(h||''));if(!m)return h;const t=+m[1]*12+ +m[2];return +m[2]>=12?`${Math.floor(t/12)}'${t%12}"`:h}
function repairHeights(){try{if(!has(current)||!current||fixedSaves.has(current.id))return;fixedSaves.add(current.id);let n=0;const fix=p=>{if(p&&p.height){const v=fixHeight(p.height);if(v!==p.height){p.height=v;n++}}};for(const t of current.teams||[])for(const p of t.roster||[])fix(p);for(const p of current.v2?.programPlayers||[])fix(p);for(const p of current.tryoutPool||[])fix(p);if(n)try{persist()}catch{}}catch{}}

/* ---------- controls: keyboard + controller ---------- */
function visibleScreen(){if(!$('game')?.classList.contains('hidden')&&document.body.classList.contains('rd-in-game'))return 'game';const m=$('rdMenu');if(m&&!m.classList.contains('hidden')&&!$('sportsShell')?.classList.contains('hidden'))return 'menu';return ''}
function back(){
  if(document.querySelector('dialog[open]'))return;
  for(const ov of document.querySelectorAll('#pn2713,.pn251,.legacy251,.pn252,.legacy252,#spHub2713,[id^="legacy"],[id^="history254"]')){if(!ov.offsetParent&&getComputedStyle(ov).position!=='fixed')continue;if(ov.classList.contains('hidden')||getComputedStyle(ov).display==='none')continue;const b=[...ov.querySelectorAll('button')].find(x=>/MAIN MENU|BACK|CLOSE/i.test(x.textContent||''));if(b){b.click();return}}
  const p=$('rdModePortal');if(p&&!p.classList.contains('hidden')){$('rdPortalBack')?.click();return}
  const s=$('sportsShell');if(s&&!s.classList.contains('hidden')){const scr=document.querySelector('#sportsShell .rd-screen:not(.hidden)');scr?.querySelector('.rd-back')?.click();return}
}
function moveTile(d){const els=tileButtons().filter(b=>!b.hidden).sort((a,b)=>(+a.style.order||0)-(+b.style.order||0));if(!els.length)return;let i=els.indexOf(document.activeElement);i=i<0?0:(i+d+els.length)%els.length;els[i].focus();els[i].scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});showInfo(els[i])}
document.addEventListener('keydown',e=>{
  if(e.target.matches?.('input,textarea,select'))return;const scr=visibleScreen();
  if(scr==='menu'){if(e.key==='ArrowRight'){e.preventDefault();moveTile(1)}else if(e.key==='ArrowLeft'){e.preventDefault();moveTile(-1)}else if(e.key==='q'||e.key==='Q'||e.key==='['){cycleTab(-1)}else if(e.key==='e'||e.key==='E'||e.key===']'){cycleTab(1)}}
  else if(scr==='game'){if(e.key==='['||e.key==='q'||e.key==='Q')cycleGroup(-1);else if(e.key===']'||e.key==='e'||e.key==='E')cycleGroup(1)}
  if(e.key==='Escape'||e.key==='Backspace')back();
});
let padLast=0,padPrev={};
function pad(){const gp=navigator.getGamepads?.()?.[0];if(gp){const now=Date.now();const lb=gp.buttons[4]?.pressed,rb=gp.buttons[5]?.pressed,b=gp.buttons[1]?.pressed;
  if(now-padLast>220){const scr=visibleScreen();if(lb&&!padPrev.lb){padLast=now;scr==='menu'?cycleTab(-1):scr==='game'&&cycleGroup(-1)}if(rb&&!padPrev.rb){padLast=now;scr==='menu'?cycleTab(1):scr==='game'&&cycleGroup(1)}if(b&&!padPrev.b){padLast=now;back()}}
  padPrev={lb,rb,b}}requestAnimationFrame(pad)}
window.addEventListener('gamepadconnected',()=>{if(!pad.on){pad.on=1;requestAnimationFrame(pad)}});

/* ---------- keep the layer in sync with the game (batched) ---------- */
function tick(){
  try{buildMenu()}catch(e){console.warn('BM27 2K menu',e)}
  try{portal()}catch{}
  try{if(visibleScreen()==='game'){repairHeights();buildHub();renderDashboard();badgeTables()}}catch(e){console.warn('BM27 2K hub',e)}
  clock();
}
const mine=n=>{for(let x=n;x;x=x.parentNode){if(x.id==='k2Hub'||x.id==='k2MenuTop'||x.id==='k2MenuInfo'||x.id==='k2NextGame'||x.id==='k2Quick')return true;if(x.dataset?.k2b||x.classList?.contains('k2-tile'))return true}return false};
let timer=0;const queue=(recs)=>{if(Array.isArray(recs)&&recs.every(r=>mine(r.target)))return;if(timer)return;timer=setTimeout(()=>{timer=0;tick()},90)};
function notes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v280-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v280-notes><p class="eyebrow">BM27 v${VERSION}</p><h3>The 2K Update</h3><ul class="update-list"><li>v2.8.1: new 2K-style in-game menus — Next Game matchup banner with both school logos, quick tiles, cleaner schedule rows, section headers, chips and inputs.</li><li>v2.8.1: fixed text getting cut off on buttons, rating badges and titles; tables now scroll sideways on phones instead of cutting off columns; phone header buttons no longer squeeze; injury report text is readable.</li><li>Brand new main menu with mode tiles, tabs (LB/RB or Q/E) and controller hints.</li><li>New in-game hub: team HUD with your school logo, record, OVR and rank, plus top tabs for every screen.</li><li>2K-style rating badges on rosters, a refreshed look for cards, tables, slots and dialogs.</li><li>Fixed: the game could freeze or crash around districts and the state tournament.</li><li>Fixed: if no Senior Night was picked, days passed but games were never played — Senior Night now auto-sets to your last home game.</li><li>Fixed: new careers logged a "renderMeetingsV2" error; the startup schedule error; stray "\\n" text on screen; national school list retrying nonstop when offline.</li><li>Season, MySchool, saves and school logos work exactly as before.</li></ul></article>`)}
function install(){
  document.body.classList.add('k2');
  tick();
  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
  setInterval(clock,15000);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-open-updates]'))setTimeout(notes,30)},true);
  if(typeof renderAll==='function'){const base=renderAll;renderAll=function(){const r=base.apply(this,arguments);queue();return r}}
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
function addGroup(k,l,keys){if(GROUPS.some(g=>g[0]===k))return;GROUPS.splice(GROUPS.length-1,0,[k,l,keys]);const g=$('k2HubGroups');if(g)g.dataset.sig='';queue()}
function openGroup(k){hubGroup=k;const g=$('k2HubGroups');if(g)g.dataset.sig='';renderHubTabs()}
window.BM27V280={version:VERSION,refresh:tick,tier,addGroup,openGroup,logoHtml};
})();
