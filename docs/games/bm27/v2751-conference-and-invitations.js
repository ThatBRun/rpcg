/* BM27 2.7.51 — common conference editor and nearby-school invitations */
(()=>{'use strict';
const el=id=>document.getElementById(id), same=(a,b)=>String(a??'')===String(b??''), lower=x=>String(x??'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const active=()=>typeof current!=='undefined'?current:null, all=()=>typeof saves!=='undefined'&&Array.isArray(saves)?saves:[];
const key='bm27_conference_assignments_v2747';
const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}};
const write=(k,v)=>{try{if(window.BM27Storage?.set)window.BM27Storage.set(k,JSON.stringify(v));else localStorage.setItem(k,JSON.stringify(v))}catch(e){console.error('BM27 storage',e)}};
const notify=t=>typeof toast==='function'?toast(t):alert(t);
const me=s=>s?.teams?.find(t=>same(t.id,s.schoolId));
const domestic=t=>!t.outOfState&&!t.nationalOnly;
function label(g){return [g.type,g.gameType,g.seasonType,g.phase,g.category,g.competition,g.stage,g.eventType,g.leagueType].filter(Boolean).map(lower)}
function regular(g){const a=label(g);if(a.some(x=>/pre[ -]?season|scrimmage|exhibition|summer|fall|off[ -]?season|post[ -]?season|playoff|tournament|district|state championship|national championship|showcase|friendly/.test(x)))return false;return !a.length||a.some(x=>/regular[ -]?season|conference/.test(x))}
const done=g=>g.played===true||g.completed===true||g.final===true||['final','played','completed'].includes(lower(g.status));
function gameBelongs(g,s){const ids=[g.team1Id,g.team2Id,g.homeId,g.awayId,g.schoolId,g.opponentId];return ids.some(v=>same(v,s.schoolId))||((s.schedule||[]).includes(g)&&!ids.some(v=>v!==undefined&&v!==null&&v!==''));}
function canTransfer(s){if(!s)return false;const games=[...(s.schedule||[]),...(s.seasonEngine?.games||[])];return !games.some(g=>done(g)&&regular(g)&&gameBelongs(g,s));}
function options(s){const set=new Set([...(window.BM27V2743?.primaryConferences||[]),...(window.BM27V2743?.divisions||[])]);for(const t of [...(s?.teams||[]),...(typeof directory!=='undefined'?directory:[])])if(t.conference&&!/independent|unassigned/i.test(t.conference))set.add(t.conference);try{for(const n of JSON.parse(localStorage.getItem('bm27_user_conferences')||'[]'))set.add(n)}catch{}return [...set].filter(Boolean).sort()}
function sync(s){const map=read();for(const t of s?.teams||[]){const c=map[String(t.id)];if(c){t.conference=c;t.conferenceParent=c;t.conferenceManual=true}}}
function setConference(conf){const s=active(),t=me(s);if(!t)return notify('Open a career and choose a school first.');if(!canTransfer(s))return notify('Conference transfers are locked after your first completed regular-season game.');if(!conf)return notify('Choose a conference.');const map=read();map[String(t.id)]=conf;write(key,map);for(const save of all())sync(save);sync(s);
if(typeof directory!=='undefined'){for(const school of directory)if(same(school.id,t.id)){school.conference=conf;school.conferenceParent=conf;school.conferenceManual=true}write('mshsaa_bm27_directory',directory)}
if(typeof persist==='function')persist();if(typeof renderAll==='function')renderAll();render();notify('Saved '+t.name+' in '+conf+'.');}
function render(){const s=active(),t=me(s);if(!s||!t)return;const selOptions=options(s);if(t.conference&&!selOptions.includes(t.conference))selOptions.unshift(t.conference);
const can=canTransfer(s), html=`<h3>My School — Conference</h3><p class="muted small">${esc(t.name)} • Current conference: <strong>${esc(t.conference||'Unassigned')}</strong></p><label>Choose a conference <select class="bm2751-select" ${can?'':'disabled'}>${selOptions.map(c=>`<option value="${esc(c)}" ${c===t.conference?'selected':''}>${esc(c)}</option>`).join('')}</select></label> <button type="button" class="secondary bm2751-save" ${can?'':'disabled'}>Save My Conference</button><p class="muted small">${can?'Open until your first completed regular-season game. Preseason, summer and fall do not count.':'Locked after a completed regular-season game.'}</p>`;
for(const host of [el('conferencesPage'),el('dashboardPage'),el('programPage')].filter(Boolean)){
let box=host.querySelector('.bm2751-editor');if(!box){box=document.createElement('article');box.className='card bm2751-editor';box.style.margin='12px 0';host.prepend(box)}
box.innerHTML=html;box.querySelector('.bm2751-save').onclick=()=>setConference(box.querySelector('.bm2751-select').value);
}
// Make conference editing discoverable even when the older conference center fails to mount.
if(el('v2743ConferenceNav')&&!el('bm2751-nav')){const nav=el('v2743ConferenceNav');nav.insertAdjacentHTML('afterend','<button class="nav" type="button" id="bm2751-nav">My Conference</button>');el('bm2751-nav').onclick=()=>{const tab=el('v2743ConferenceNav');tab?.click();el('conferencesPage')?.querySelector('.bm2751-editor')?.scrollIntoView({block:'start',behavior:'smooth'})}}
renderInvitations();}
const hash=s=>{let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
function locality(t){const s=lower([t.city,t.county,t.location,t.name,t.conferenceParent,t.conference].join(' '));if(/st[ .]?louis|chesterfield|wildwood|ballwin|eureka|parkway|rockwood|kirkwood|st[ .]?charles|o.fallon|wentzville|hazelwood|florissant|ladue|suburban/.test(s))return 'STL';if(/kansas city|blue springs|lee.s summit|raytown|liberty|park hill|independence/.test(s))return 'KC';if(/springfield|ozark|nixa|joplin|branson|republic|carthage/.test(s))return 'SW';if(/columbia|jefferson city|fulton|sedalia|moberly/.test(s))return 'CENTRAL';if(/cape girardeau|sikeston|poplar bluff|kennett|bootheel/.test(s))return 'SE';return lower(t.conferenceParent||t.conference||'missouri')}
function seasonKey(s){return String(s.season??new Date(s.day||Date.now()).getFullYear())}
function seedInvitations(s){if(!s)return;const season=seasonKey(s);s.bm2751Invitations??={};if(s.bm2751Invitations[season])return;const t=me(s);if(!t)return;
const candidates=(s.teams||[]).filter(x=>domestic(x)&&!same(x.id,t.id));const loc=locality(t), classN=Number(t.class||t.classification)||3;
const ranked=candidates.map(x=>({t:x,score:(locality(x)===loc?100:0)+(lower(x.city)===lower(t.city)&&x.city?50:0)+(lower(x.conferenceParent||x.conference)===lower(t.conferenceParent||t.conference)?20:0)-Math.abs((Number(x.class||x.classification)||3)-classN)*4,noise:hash(s.id+'|'+season+'|'+x.id)%1000})).sort((a,b)=>b.score-a.score||a.noise-b.noise);
// 50 distinct in-area schools when available; the nearest available schools fill shortfalls.
const offers=ranked.slice(0,50).map((x,i)=>({id:'invite-'+season+'-'+i,schoolId:x.t.id,status:'pending',createdAt:s.day||new Date().toISOString(),season}));s.bm2751Invitations[season]=offers;}
function renderInvitations(){const s=active(),page=el('schedulePage');if(!s||!page)return;seedInvitations(s);const season=seasonKey(s),offers=s.bm2751Invitations?.[season]||[];
let box=el('bm2751Invitations');if(!box){box=document.createElement('article');box.id='bm2751Invitations';box.className='card';box.style.margin='16px 0';page.insertBefore(box,el('scheduleList'))}
const pending=offers.filter(o=>o.status==='pending');box.innerHTML=`<h3>Incoming Game Requests</h3><p class="muted small">${offers.length} schools invited your program this season. ${pending.length} requests awaiting a response. Nearby schools and similar classes are prioritized. Accepting adds a regular-season game, subject to your schedule limit.</p><div style="max-height:420px;overflow:auto">${offers.map(o=>{const school=s.teams.find(t=>same(t.id,o.schoolId));return `<div class="row" style="margin:6px 0;gap:8px"><div class="grow"><b>${esc(school?.name||'Unknown School')}</b><br><small>Class ${esc(school?.class||'?')} • ${esc(school?.city||school?.conference||'Missouri')} • ${esc(o.status)}</small></div>${o.status==='pending'?`<button type="button" class="secondary bm2751-accept" data-request="${esc(o.id)}">Accept</button><button type="button" class="secondary bm2751-decline" data-request="${esc(o.id)}">Decline</button>`:''}</div>`}).join('')}</div>`;
box.querySelectorAll('.bm2751-accept').forEach(btn=>btn.onclick=()=>accept(btn.dataset.request));box.querySelectorAll('.bm2751-decline').forEach(btn=>btn.onclick=()=>{const o=offers.find(x=>x.id===btn.dataset.request);if(o){o.status='declined';persist?.();renderInvitations()}})}
function accept(id){const s=active(),offers=s?.bm2751Invitations?.[seasonKey(s)]||[],offer=offers.find(o=>o.id===id);if(!offer||offer.status!=='pending')return;
if(s.schedule.length>=26)return notify('The 26-game schedule is full. Remove a game before accepting.');
if(typeof scheduleEditable==='function'&&!scheduleEditable())return notify('Scheduling is locked in this career.');
const opponent=s.teams.find(t=>same(t.id,offer.schoolId));if(!opponent)return notify('That school is not available in this save.');
const date=new Date(s.day||Date.now());date.setDate(date.getDate()+Math.max(7,14+s.schedule.length*4));
const year=Number(seasonKey(s));if(Number.isFinite(year)&&year>2000){const start=new Date(year,10,24,19);if(date<start)date.setTime(start.getTime()+s.schedule.length*3*86400000)}
const used=new Set(s.schedule.map(g=>String(g.date||'').slice(0,10)));while(used.has(date.toISOString().slice(0,10)))date.setDate(date.getDate()+1);
s.schedule.push({id:typeof uid==='function'?uid():'inv-'+Date.now()+'-'+id,opponentId:opponent.id,date:date.toISOString(),home:hash(id)%2===0,neutral:false,played:false,type:'Regular Season',fromSchoolRequest:true});s.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));offer.status='accepted';offer.gameDate=date.toISOString();if(typeof persist==='function')persist();if(typeof renderAll==='function')renderAll();renderInvitations();notify('Accepted '+opponent.name+' — game added to schedule.')}
function install(){if(window.__bm2751Installed)return;window.__bm2751Installed=true;
if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);const s=active();if(s){sync(s);seedInvitations(s);if(typeof persist==='function')persist();render()}return r}}
if(typeof renderAll==='function'){const base=renderAll;renderAll=function(){const r=base.apply(this,arguments);render();return r}}
if(typeof advance==='function'){const base=advance;advance=function(){const before=active()&&seasonKey(active());const out=base.apply(this,arguments);if(active()&&before!==seasonKey(active())){seedInvitations(active());persist?.()}renderInvitations();return out}}
if(active()){sync(active());seedInvitations(active());render()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
