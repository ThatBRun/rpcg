/* BM27 v2.7.38 — MSHSAA Central + Population + College Emails + Schedule Pitch Boost */
(()=>{'use strict';
const VERSION='2.7.38';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=v=>String(v||'').slice(0,10);
const eq=(a,b)=>String(a)===String(b);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function save(){return typeof current!=='undefined'?current:null}
function persistSafe(){try{return persist?.()}catch(e){console.warn('v2738 persist',e);return false}}
function renderSafe(){try{return renderAll?.()}catch(e){console.warn('v2738 render',e)}}
function toastSafe(m){try{toast?.(m)}catch{}}
function myTeamSafe(s=save()){try{return myTeam?.()||(s?.teams||[]).find(t=>eq(t.id,s?.schoolId))}catch{return (s?.teams||[]).find(t=>eq(t.id,s?.schoolId))}}
function seasonPhase(s=save()){return String(s?.seasonPhase||s?.v2737?.phase||s?.v2736?.phase||s?.v2721?.stage||'regular').toLowerCase()}
function ensure(s=save()){
  if(!s)return null;
  s.v2738=s.v2738||{};
  const v=s.v2738;
  v.version=VERSION;
  v.population=Number(v.population)||0;
  v.posts=Array.isArray(v.posts)?v.posts:[];
  v.emails=Array.isArray(v.emails)?v.emails:[];
  v.postedGameIds=Array.isArray(v.postedGameIds)?v.postedGameIds:[];
  v.lastPitchDay=v.lastPitchDay||'';
  v.lastEmailPopupId=v.lastEmailPopupId||'';
  v.lastEmailDay=v.lastEmailDay||'';
  v.lastPopulationSync=v.lastPopulationSync||0;
  return v;
}
function ensureUI(){
  if($('centralNav'))return;
  const navAnchor=document.querySelector('.nav[data-page="news"], .nav[data-page="office"]')||document.querySelector('.sidebar nav')||document.querySelector('.sidebar');
  if(navAnchor){
    const btn=document.createElement('button');
    btn.className='nav'; btn.dataset.page='central'; btn.id='centralNav'; btn.textContent='MSHSAA Central';
    navAnchor.insertAdjacentElement(navAnchor.matches('.nav')?'afterend':'beforeend',btn);
    btn.onclick=()=>activatePage('central',btn.textContent);
  }
  if(!$('centralPage')){
    const sec=document.createElement('section');
    sec.id='centralPage'; sec.className='page';
    sec.innerHTML=`<div class="section-head"><div><p class="eyebrow">SOCIAL • POPULATION • COLLEGE REACH</p><h3>MSHSAA Central</h3><p class="muted small">Post your game updates, grow your population, receive college emails and attract more game pitches.</p></div><span id="v2738RankTag" class="tag">LIVE</span></div>
      <div id="v2738CentralMetrics" class="metrics"></div>
      <div class="office-grid v2738-grid">
        <article class="card"><div class="section-head"><div><p class="eyebrow">SOCIAL FEED</p><h3>Post Game Updates</h3></div><button id="v2738PostLatestBtn" class="primary">Post Latest Game Update</button></div><div id="v2738PostHint" class="muted small"></div><div id="v2738CentralFeed" class="stack"></div></article>
        <article class="card"><div class="section-head"><div><p class="eyebrow">COLLEGE INBOX</p><h3>Emails from Colleges</h3></div><button id="v2738MarkReadBtn" class="secondary">Mark All Read</button></div><div id="v2738CentralEmails" class="stack"></div></article>
      </div>`;
    const historyPage=$('historyPage')||document.querySelector('.page:last-of-type');
    if(historyPage?.parentNode)historyPage.parentNode.insertBefore(sec,historyPage); else $('game')?.appendChild(sec);
  }
  if(!$('v2738EmailDialog')){
    document.body.insertAdjacentHTML('beforeend',`<dialog id="v2738EmailDialog"><div class="modal-head"><div><p class="eyebrow">NEW COLLEGE EMAIL</p><h2 id="v2738EmailDialogTitle">Inbox</h2></div><button class="icon-btn" id="v2738EmailClose" type="button">×</button></div><div id="v2738EmailDialogBody" class="stack"></div><button id="v2738EmailAcknowledge" class="primary wide" type="button">Got it</button></dialog>`);
    $('v2738EmailClose')?.addEventListener('click',()=>{try{$('v2738EmailDialog').close()}catch{}});
    $('v2738EmailAcknowledge')?.addEventListener('click',()=>{try{$('v2738EmailDialog').close()}catch{}});
  }
  if(!$('v2738InlineStyle')){
    const style=document.createElement('style'); style.id='v2738InlineStyle';
    style.textContent=`
      .v2738-grid{align-items:start}.v2738-post{overflow:hidden}.v2738-post img{width:100%;border-radius:16px;border:1px solid rgba(255,255,255,.12);margin:.6rem 0}.v2738-email.unread{border:1px solid rgba(107,181,255,.45);box-shadow:0 0 0 1px rgba(107,181,255,.12) inset}.v2738-mini{font-size:.82rem}.v2738-metrics .metric b{font-size:1.1rem}.v2738-feed-meta{display:flex;gap:.5rem;flex-wrap:wrap}.v2738-pill{display:inline-flex;align-items:center;padding:.2rem .5rem;border-radius:999px;background:rgba(255,255,255,.08);font-size:.78rem}.v2738-email-body{white-space:pre-wrap;line-height:1.45}.v2738-post-actions{display:flex;gap:.5rem;flex-wrap:wrap}`;
    document.head.appendChild(style);
  }
  $('v2738PostLatestBtn')?.addEventListener('click',()=>{if(postLatestGameUpdate())renderCentral()});
  $('v2738MarkReadBtn')?.addEventListener('click',()=>{const v=ensure();if(!v)return;v.emails.forEach(e=>e.read=true);persistSafe();renderCentral();toastSafe('All college emails marked as read.')});
}
function activatePage(page,title){
  document.querySelectorAll('.nav[data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(page+'Page')?.classList.add('active');
  if($('pageTitle'))$('pageTitle').textContent=title||'MSHSAA Central';
  $('game')?.classList.remove('menu-open');
}
function allPlayedGames(s=save()){
  if(!s)return [];
  const out=[];
  for(const g of s.schedule||[])if(g.played)out.push({...g,__level:'Varsity'});
  return out.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function gameKey(g){return String(g.id||`${g.__level||'Varsity'}|${g.opponentId}|${dayKey(g.date)}`)}
function opponentName(s,g){return (s.teams||[]).find(t=>eq(t.id,g.opponentId))?.name || (window.BM27ResolveNationalTeam?.(g.opponentId)?.name) || 'Opponent'}
function currentNationalRank(s=save()){
  if(window.BM27NationalRankingsAll&&Array.isArray(window.BM27NationalRankingsAll)){
    const me=window.BM27NationalRankingsAll.find(r=>r.isUser||eq(r.id,s?.schoolId));
    if(me?.rank)return Number(me.rank);
  }
  try{return Number(window.BM27V2718?.userRank?.(s))||null}catch{return null}
}
function gameSummaryText(s,g){
  const me=myTeamSafe(s); const opp=opponentName(s,g); const won=Number(g.myScore)>Number(g.oppScore); const rank=g.v2718OpponentRankBeforeGame||window.BM27NationalRankMap?.get?.(String(g.opponentId));
  return `${me?.name||'Your team'} ${won?'beat':'fell to'} ${opp} ${g.myScore}-${g.oppScore}${rank?` • opponent was #${rank}`:''}.`;
}
function socialImageData(s,g){
  const me=myTeamSafe(s),opp=opponentName(s,g),won=Number(g.myScore)>Number(g.oppScore),rank=g.v2718OpponentRankBeforeGame||window.BM27NationalRankMap?.get?.(String(g.opponentId));
  const title=`${me?.name||'Team'} ${won?'W':'L'} ${g.myScore}-${g.oppScore}`;
  const sub=`${won?'Defeated':'Lost to'} ${opp}${rank?` • Opponent #${rank}`:''}`;
  const date=new Date(g.date||Date.now()).toLocaleDateString();
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#0f172a"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><rect x="30" y="30" width="1140" height="570" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/><text x="60" y="105" fill="#bfdbfe" font-family="Arial" font-size="34" font-weight="700">MSHSAA CENTRAL • GAME UPDATE</text><text x="60" y="210" fill="#fff" font-family="Arial" font-size="68" font-weight="800">${escXml(title)}</text><text x="60" y="285" fill="#dbeafe" font-family="Arial" font-size="38">${escXml(sub)}</text><text x="60" y="360" fill="#e5e7eb" font-family="Arial" font-size="28">${escXml(date)} • ${escXml(g.__level||'Varsity')} • ${escXml(g.type||'Regular Season')}</text><circle cx="975" cy="210" r="120" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.2)"/><text x="975" y="198" text-anchor="middle" fill="#fff" font-family="Arial" font-size="58" font-weight="800">${g.myScore}</text><text x="975" y="258" text-anchor="middle" fill="#dbeafe" font-family="Arial" font-size="28">${escXml(me?.name||'YOU')}</text><circle cx="975" cy="430" r="120" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.16)"/><text x="975" y="418" text-anchor="middle" fill="#fff" font-family="Arial" font-size="58" font-weight="800">${g.oppScore}</text><text x="975" y="478" text-anchor="middle" fill="#dbeafe" font-family="Arial" font-size="28">${escXml(opp)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function escXml(s){return String(s??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]))}
function postLatestGameUpdate(){
  const s=save(),v=ensure(s); if(!s||!v)return false;
  const g=allPlayedGames(s).find(x=>!v.postedGameIds.includes(gameKey(x)));
  if(!g){toastSafe('No unposted completed game is available right now.');return false}
  const rank=g.v2718OpponentRankBeforeGame||window.BM27NationalRankMap?.get?.(String(g.opponentId));
  const won=Number(g.myScore)>Number(g.oppScore);
  const popGain=Math.max(40,Math.round((won?70:30)+(rank?Math.max(0,220-rank):20)));
  const post={id:`post-${Date.now()}`,date:s.day,gameId:gameKey(g),title:`${won?'Game Day Win':'Game Day Update'} • ${g.__level||'Varsity'}`,text:gameSummaryText(s,g),image:socialImageData(s,g),likes:Math.max(8,Math.round(popGain*1.4)),populationGain:popGain};
  v.posts.unshift(post); v.postedGameIds.push(post.gameId); v.population+=popGain; syncNationalPopulationBonus(s); maybeGenerateCollegeEmail(s,true); s.news=s.news||[]; s.news.unshift({date:s.day,text:`MSHSAA Central post published. Population +${popGain}.`}); persistSafe(); toastSafe(`Posted to MSHSAA Central • Population +${popGain}`); return true;
}
function syncNationalPopulationBonus(s=save()){
  if(!s)return; const v=ensure(s); s.v2718National=s.v2718National||{}; s.v2718National.pointEvents=Array.isArray(s.v2718National.pointEvents)?s.v2718National.pointEvents:[];
  const points=Math.round(v.population*0.65);
  const id='v2738-population-bonus';
  let ev=s.v2718National.pointEvents.find(e=>String(e.gameId)===id);
  if(!ev){ev={gameId:id,date:s.day,opponentId:'mshsaa-central',opponentName:'MSHSAA Central Population Boost',opponentRank:1,points}; s.v2718National.pointEvents.push(ev);} else {ev.points=points; ev.date=s.day; ev.opponentName='MSHSAA Central Population Boost';}
}
function collegePool(){return Array.isArray(window.D1_COLLEGES)?window.D1_COLLEGES:[]}
function collegeNameOf(c){try{return collegeName?.(c)||`${c?.name||'College'}`}catch{return c?.name||'College'}}
function playerForEmail(s=save()){
  const roster=(myTeamSafe(s)?.roster||[]).slice().sort((a,b)=>Number(b.overall||0)-Number(a.overall||0));
  return roster[0]||null;
}
function maybeGenerateCollegeEmail(s=save(),force=false){
  if(!s)return false; const v=ensure(s), colls=collegePool(); if(!colls.length)return false;
  const day=dayKey(s.day); const desired=clamp(Math.floor(v.population/180)+(currentNationalRank(s)&&currentNationalRank(s)<=100?1:0),0,18);
  const can=force || (desired>v.emails.length && v.lastEmailDay!==day);
  if(!can)return false;
  const player=playerForEmail(s); if(!player)return false;
  const used=new Set(v.emails.map(e=>String(e.collegeId)+':'+String(e.playerId)));
  const options=colls.filter(c=>!used.has(String(c.id)+':'+String(player.id)));
  const college=options[Math.floor(Math.random()*options.length)]||colls[Math.floor(Math.random()*colls.length)];
  const subj=`${collegeNameOf(college)} asking about ${player.name}`;
  const body=`Coach,\n\nThis is ${collegeNameOf(college)}. Our staff has been tracking ${player.name} (${player.pos}, ${player.overall} OVR) and we wanted to learn more.\n\nCan you tell us about ${player.name}'s role, work ethic, academics and long-term upside? We are especially interested in how ${player.name.split(' ')[0]} handles big-game pressure and whether more college programs are starting to check in.\n\nWe also noticed the buzz around your program on MSHSAA Central. Keep posting updates — it helps our staff keep tabs on your team.\n\nThanks,\n${collegeNameOf(college)} Recruiting Staff`;
  const email={id:`mail-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:s.day,collegeId:college.id,collegeName:collegeNameOf(college),playerId:player.id,subject:subj,body,read:false};
  v.emails.unshift(email); v.lastEmailDay=day; persistSafe(); showEmailPopup(email); return true;
}
function showEmailPopup(email){
  ensureUI(); const d=$('v2738EmailDialog'); if(!d||!email)return; $('v2738EmailDialogTitle').textContent=email.subject; $('v2738EmailDialogBody').innerHTML=`<article class="card"><p class="eyebrow">${esc(email.collegeName)}</p><h3>${esc(email.subject)}</h3><p class="muted small">${new Date(email.date||Date.now()).toLocaleString()}</p><div class="v2738-email-body">${esc(email.body)}</div></article>`; try{if(!d.open)d.showModal()}catch{}
}
function renderCentral(){
  ensureUI(); const s=save(),v=ensure(s); if(!s||!v)return;
  syncNationalPopulationBonus(s);
  const rank=currentNationalRank(s); const me=myTeamSafe(s); const unread=v.emails.filter(e=>!e.read).length;
  $('v2738RankTag').textContent=rank?`National Rank #${rank}`:'Growing';
  $('v2738CentralMetrics').innerHTML=`<div class="metric"><span>Population</span><b>${Number(v.population).toLocaleString()}</b></div><div class="metric"><span>MSHSAA Central Posts</span><b>${v.posts.length}</b></div><div class="metric"><span>College Emails</span><b>${v.emails.length}</b></div><div class="metric"><span>Unread</span><b>${unread}</b></div><div class="metric"><span>Boosted National Points</span><b>${Math.round(v.population*0.65).toLocaleString()}</b></div><div class="metric"><span>Program</span><b>${esc(me?.name||'Team')}</b></div>`;
  const nextPost=allPlayedGames(s).find(x=>!v.postedGameIds.includes(gameKey(x)));
  $('v2738PostHint').textContent=nextPost?`Ready to post: ${gameSummaryText(s,nextPost)}`:'Play a game first, then post the result here to grow your population.';
  $('v2738PostLatestBtn').disabled=!nextPost;
  $('v2738CentralFeed').innerHTML=v.posts.length?v.posts.map(p=>`<article class="card v2738-post"><div class="section-head"><div><p class="eyebrow">MSHSAA CENTRAL</p><h3>${esc(p.title)}</h3></div><span class="tag">+${Number(p.populationGain||0)} Population</span></div><p>${esc(p.text)}</p><img alt="Game update graphic" src="${p.image}"><div class="v2738-feed-meta"><span class="v2738-pill">❤️ ${Number(p.likes||0).toLocaleString()}</span><span class="v2738-pill">📅 ${new Date(p.date||Date.now()).toLocaleDateString()}</span></div></article>`).join(''):'<p class="muted">No posts yet. Use <b>Post Latest Game Update</b> after a game to publish your first update.</p>';
  $('v2738CentralEmails').innerHTML=v.emails.length?v.emails.map(m=>`<article class="card v2738-email ${m.read?'':'unread'}" data-mail-id="${esc(m.id)}"><div class="section-head"><div><p class="eyebrow">${esc(m.collegeName)}</p><h3>${esc(m.subject)}</h3></div><span class="tag">${m.read?'READ':'NEW'}</span></div><p class="muted small">${new Date(m.date||Date.now()).toLocaleDateString()}</p><div class="v2738-email-body">${esc(m.body)}</div><div class="v2738-post-actions"><button class="secondary v2738-open-mail" data-mail-open="${esc(m.id)}">Open Popup</button><button class="secondary v2738-read-mail" data-mail-read="${esc(m.id)}">${m.read?'Marked Read':'Mark Read'}</button></div></article>`).join(''):'<p class="muted">Grow your population to unlock more college emails.</p>';
  document.querySelectorAll('[data-mail-open]').forEach(b=>b.onclick=()=>{const mail=v.emails.find(x=>x.id===b.dataset.mailOpen); if(mail){mail.read=true; persistSafe(); renderCentral(); showEmailPopup(mail)}});
  document.querySelectorAll('[data-mail-read]').forEach(b=>b.onclick=()=>{const mail=v.emails.find(x=>x.id===b.dataset.mailRead); if(mail){mail.read=true; persistSafe(); renderCentral();}});
}
function uniqueOfferKey(x){return `${x.opponentId}|${dayKey(x.date)}|${x.location}`}
function hasFutureGameVs(s,teamId){return (s.schedule||[]).some(g=>!g.played&&eq(g.opponentId,teamId))}
function activeOfferVs(s,teamId){return (s.v2?.scheduleNegotiations?.incoming||[]).some(o=>o.status==='Offered'&&eq(o.opponentId,teamId))}
function addIncomingOffer(s,team,source='Missouri'){
  if(!s?.v2?.scheduleNegotiations)return false;
  const start=new Date(s.day||Date.now()); start.setDate(start.getDate()+7+Math.floor(Math.random()*21)); start.setHours(19,0,0,0);
  const rank=currentNationalRank(s)||999; const interest=clamp(62+Math.floor((ensure(s).population||0)/120)+(rank<=100?12:rank<=250?7:0)+(source==='National'?8:0),50,99);
  const offer={id:`offer-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,opponentId:team.id,date:start.toISOString(),location:Math.random()<.5?'away':'home',type:'Regular Season',status:'Offered',interest};
  s.v2.scheduleNegotiations.incoming.unshift(offer);
  s.news=s.news||[]; s.news.unshift({date:s.day,text:`${team.name} pitched your program a Regular Season game${source==='National'?' from the national scene':''}.`});
  return true;
}
function maybeAddPitches(s=save()){
  if(!s||seasonPhase(s)==='summer'||seasonPhase(s)==='fall')return 0; ensure(s); s.v2=s.v2||{}; s.v2.scheduleNegotiations=s.v2.scheduleNegotiations||{incoming:[],outgoing:[]};
  const today=dayKey(s.day); if(s.v2738.lastPitchDay===today)return 0; s.v2738.lastPitchDay=today;
  let added=0;
  const pool=(s.teams||[]).filter(t=>!eq(t.id,s.schoolId));
  const missouriPool=pool.filter(t=>!t.outOfState && !hasFutureGameVs(s,t.id) && !activeOfferVs(s,t.id));
  if(missouriPool.length){const team=missouriPool[Math.floor(Math.random()*missouriPool.length)]; if(addIncomingOffer(s,team,'Missouri'))added++;}
  const pop=ensure(s).population||0; const rank=currentNationalRank(s)||999;
  const nationalChance=clamp(0.22 + (pop/2000) + (rank<=100?0.25:rank<=250?0.1:0),0.22,0.9);
  if(Math.random()<nationalChance){
    const nationalPool=pool.filter(t=>(t.outOfState||t.state&&String(t.state).toUpperCase()!=='MO')&&!hasFutureGameVs(s,t.id)&&!activeOfferVs(s,t.id));
    if(nationalPool.length){const team=nationalPool.sort((a,b)=>(b.rating||70)-(a.rating||70))[Math.floor(Math.random()*Math.min(10,nationalPool.length))]; if(addIncomingOffer(s,team,'National'))added++;}
  }
  if(added)persistSafe(); return added;
}
function maybeAutoPopupEmail(s=save()){
  if(!s)return; const v=ensure(s); const next=v.emails.find(e=>!e.read && e.id!==v.lastEmailPopupId); if(next){v.lastEmailPopupId=next.id; persistSafe(); showEmailPopup(next);}
}
function onDateMaybeChanged(){
  const s=save(); if(!s)return; ensure(s); syncNationalPopulationBonus(s); maybeGenerateCollegeEmail(s,false); maybeAddPitches(s); maybeAutoPopupEmail(s);
}
function install(){
  if(window.__BM27_V2738__)return; window.__BM27_V2738__=true; ensureUI(); if(save())ensure(save());
  const baseRender=typeof renderAll==='function'?renderAll:null; if(baseRender){renderAll=function(){const s=save(); if(s)ensure(s); const beforeDay=s?dayKey(s.day):''; const r=baseRender.apply(this,arguments); const after=save()?dayKey(save().day):''; ensureUI(); if(save())ensure(save()); if(beforeDay!==after||save())onDateMaybeChanged(); renderCentral(); return r;}}
  if(typeof openSave==='function'){const base=openSave; openSave=function(){const r=base.apply(this,arguments); if(save()){ensure(save()); onDateMaybeChanged(); renderCentral();} return r;}}
  document.addEventListener('click',e=>{if(e.target.closest?.('#centralNav')){e.preventDefault();activatePage('central','MSHSAA Central');renderCentral();}},true);
  try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.38'}catch{}
  if(save()){onDateMaybeChanged(); renderCentral();}
}
window.BM27V2738={version:VERSION,ensure,renderCentral,postLatestGameUpdate,maybeGenerateCollegeEmail,maybeAddPitches,syncNationalPopulationBonus};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
