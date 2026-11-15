/* BM27 v2.9.0 — THE LOCKER ROOM: features 2K doesn't have.
   Read-only on game logic: everything here reads the save. The only thing written is
   current.k2x (whiteboard plays, retired jerseys, trophy unlock dates, settings). */
(()=>{'use strict';
if(window.__BM27_V290__)return;window.__BM27_V290__=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=()=>{try{return (typeof current!=='undefined'&&current)?current:null}catch{return null}};
const me=()=>{try{return myTeam()}catch{return null}};
const team=id=>{const s=save();if(!s)return null;try{return s.teams.find(t=>String(t.id)===String(id))||opponent({opponentId:id})}catch{return null}};
const k2x=()=>{const s=save();if(!s)return {};s.k2x=s.k2x||{plays:[],retired:[],trophies:{},ticker:true};s.k2x.plays=s.k2x.plays||[];s.k2x.retired=s.k2x.retired||[];s.k2x.trophies=s.k2x.trophies||{};return s.k2x};
const store=()=>{try{persist()}catch(e){console.warn('BM27 locker save',e)}};
const logo=(name,cls='lrLogo')=>{try{return window.BM27V280?.logoHtml?.(name)?.replace('k2HudLogo',cls)||''}catch{return ''}};
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>{let x=hash(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)%100000)/100000}};
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const NUMS=[0,1,2,3,4,5,10,11,12,13,14,15,20,21,22,23,24,25,30,31,32,33,34,35,40,41,42,43,44,45,50,51,52,53,54,55];
function jersey(p,roster){const used=new Set();for(const q of roster||[]){if(q===p)break;used.add(q.__num)}let n=NUMS[hash(p.id||p.name)%NUMS.length],i=0;while(used.has(n)&&i<40){n=NUMS[(NUMS.indexOf(n)+1)%NUMS.length];i++}p.__num=n;return n}
function numbered(roster){roster=roster||[];roster.forEach(p=>jersey(p,roster));return roster}
const ovr=p=>Math.round(+(p.overall??p.ovr??0));
const played=()=>(save()?.schedule||[]).filter(g=>g.played&&Number.isFinite(+g.myScore));
const fmt=d=>{try{return new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}catch{return ''}};
const winProb=(a,b,home)=>{const d=(+a.rating||70)-(+b.rating||70)+(home?3:0);return 1/(1+Math.exp(-d/6.5))};

/* ---------- derived stats ---------- */
function streak(){const g=played();if(!g.length)return {n:0,w:true};const w=+g[g.length-1].myScore>+g[g.length-1].oppScore;let n=0;for(let i=g.length-1;i>=0;i--){const x=+g[i].myScore>+g[i].oppScore;if(x!==w)break;n++}return {n,w}}
function rival(){const s=save(),t=me();if(!s||!t)return null;const counts={};for(const g of s.schedule||[]){if(!g.opponentId)continue;counts[g.opponentId]=(counts[g.opponentId]||0)+(g.conferenceGame||/conference/i.test(g.type||'')?3:1)}
  let best=null,score=-1;for(const [id,c] of Object.entries(counts)){const o=team(id);if(!o)continue;const sc=c*10-Math.abs((+o.rating||70)-(+t.rating||70))+(String(o.district)===String(t.district)?8:0);if(sc>score){score=sc;best=o}}return best}
function h2h(id){const g=played().filter(x=>String(x.opponentId)===String(id));return {w:g.filter(x=>+x.myScore>+x.oppScore).length,l:g.filter(x=>+x.myScore<+x.oppScore).length,games:g}}
function hype(){const t=me();if(!t)return 0;const gp=(+t.wins||0)+(+t.losses||0);const pct=gp?(+t.wins)/gp:.5;const st=streak();let rank=99;try{rank=getRank(t)}catch{}
  return Math.max(3,Math.min(100,Math.round(pct*55+(st.w?st.n*5:-st.n*4)+Math.max(0,30-rank)+(gp?8:20))))}
function nextGame(){try{const g=nextUnplayed();return g&&g.opponentId?g:null}catch{return null}}

/* ---------- page shell ---------- */
const TABS=[['lr-home','Locker Room'],['lr-gazette','The Gazette'],['lr-scout','Scout Report'],['lr-ball','Crystal Ball'],['lr-chat','Group Chat'],['lr-board','Whiteboard'],['lr-intro','Hype Intro'],['lr-rafters','The Rafters'],['lr-trophy','Trophy Case']];
function ensureShell(){
  const nav=document.querySelector('#sidebar nav'),main=document.querySelector('#game main');if(!nav||!main)return false;
  for(const [id,label] of TABS){if($(id))continue;const b=document.createElement('button');b.type='button';b.className='nav lr-nav';b.id=id;b.textContent=label;b.onclick=()=>openTab(id);nav.appendChild(b)}
  if(!$('lrPage')){const sec=document.createElement('section');sec.id='lrPage';sec.className='page';main.appendChild(sec)}
  return true}
let currentTab='';
function openTab(id){
  if(!save())return;currentTab=id;
  document.querySelectorAll('#game .nav').forEach(x=>x.classList.toggle('active',x.id===id));
  document.querySelectorAll('#game .page').forEach(p=>p.classList.remove('active'));
  $('lrPage').classList.add('active');const t=TABS.find(x=>x[0]===id);if($('pageTitle'))$('pageTitle').textContent=t?t[1]:'Locker Room';
  render(id);window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click',e=>{const b=e.target.closest?.('#sidebar .nav');if(b&&!b.classList.contains('lr-nav')){document.querySelectorAll('.lr-nav').forEach(x=>x.classList.remove('active'));currentTab=''}},true);
const head=(kick,title,sub='')=>`<div class="section-head"><div><p class="eyebrow">${esc(kick)}</p><h3>${esc(title)}</h3>${sub?`<p class="muted small lr-sub">${sub}</p>`:''}</div><span class="lr-only">ONLY IN BM27</span></div>`;
function render(id){const host=$('lrPage');if(!host)return;try{host.innerHTML=({'lr-home':home,'lr-gazette':gazette,'lr-scout':scout,'lr-ball':ball,'lr-chat':chat,'lr-board':board,'lr-intro':intro,'lr-rafters':rafters,'lr-trophy':trophies}[id]||home)()}catch(e){console.warn('BM27 locker room',e);host.innerHTML=head('LOCKER ROOM','Something went wrong','This screen could not be built for this save. The rest of the game is unaffected.')}
  if(id==='lr-board')mountBoard();if(id==='lr-gazette')wireGazette();if(id==='lr-intro')wireIntro();if(id==='lr-rafters')wireRafters();if(id==='lr-home')wireHome()}

/* ---------- Locker Room home ---------- */
function home(){const t=me();if(!t)return '';const h=hype(),st=streak(),r=rival(),g=nextGame(),o=g?team(g.opponentId):null;const p=o?winProb(t,o,g.home&&!g.neutral):null;
  const themes=['BLACKOUT','WHITE-OUT','PAJAMA NIGHT','HAWAIIAN NIGHT','JERSEY NIGHT','NEON NIGHT','PINK OUT','FARMER NIGHT','RETRO 80s','SCHOOL COLORS'];const theme=g?themes[hash(g.id)%themes.length]:'SCHOOL COLORS';
  const cards=TABS.slice(1).map(([id,l])=>`<button type="button" class="lr-card" data-lr-go="${id}"><b>${esc(l)}</b><small>${esc({'lr-gazette':'Your local paper writes up every game','lr-scout':'Their best players, matchups, keys to win','lr-ball':'3,000 simulations of the rest of your season','lr-chat':'The team group chat and the parents','lr-board':'Draw up plays on a real half court','lr-intro':'Lights out — PA intros for your starting five','lr-rafters':'Banners, retired jerseys, program legends','lr-trophy':'Coaching milestones you have unlocked'}[id])}</small></button>`).join('');
  return head('BM27 EXCLUSIVE','The Locker Room','Stuff no other basketball game does — built from your actual save.')+
  `<div class="lr-grid2"><article class="card lr-hype"><h3>Town Buzz</h3><div class="lr-meter"><i style="width:${h}%"></i></div><div class="lr-meter-row"><b>${h}</b><span>${h>=85?'THE WHOLE TOWN IS SOLD OUT':h>=65?'GYM IS PACKED':h>=45?'STUDENT SECTION SHOWING UP':h>=25?'QUIET NIGHT IN THE BLEACHERS':'EMPTY GYM ENERGY'}</span></div>
  <p class="muted small">${st.n?`${st.n}-game ${st.w?'winning':'losing'} streak.`:'Season has not tipped off yet.'} ${g&&g.home&&!g.neutral?`Student section theme for the next home game: <b class="lr-theme">${theme}</b>`:''}</p></article>
  <article class="card"><h3>Next Up</h3>${o?`<div class="lr-mini-match">${logo(t.name)}<span>${g.home&&!g.neutral?'VS':'@'}</span>${logo(o.name)}<div><b>${esc(o.name)}</b><small>${fmt(g.date)} • ${esc(g.type||'')}</small></div></div><div class="lr-prob"><div class="lr-prob-bar"><i style="width:${Math.round(p*100)}%"></i></div><small>WIN PROBABILITY <b>${Math.round(p*100)}%</b>${p<.35?' • <em class="lr-upset">UPSET ALERT</em>':p>.8?' • HEAVY FAVORITE':''}</small></div>`:'<p class="muted">No opponent set yet.</p>'}
  ${r?`<p class="muted small">Rival: <b>${esc(r.name)}</b> — all-time ${h2h(r.id).w}-${h2h(r.id).l}${o&&String(o.id)===String(r.id)?' • <em class="lr-upset">RIVALRY WEEK</em>':''}</p>`:''}</article></div>
  <div class="lr-cards">${cards}</div>
  <article class="card"><h3>Around the State Ticker</h3><label class="lr-toggle"><input type="checkbox" id="lrTickerOn" ${k2x().ticker!==false?'checked':''}> Show the scrolling scores ticker at the bottom of the game</label></article>`}
function wireHome(){$('lrPage').querySelectorAll('[data-lr-go]').forEach(b=>b.onclick=()=>{window.BM27V280?.openGroup?.('locker');$(b.dataset.lrGo)?.click()});const c=$('lrTickerOn');if(c)c.onchange=()=>{k2x().ticker=c.checked;store();ticker(true)}}

/* ---------- The Gazette ---------- */
let gazIdx=-1;
function topPlayer(g){const ps=g?.boxScore?.team?.players||[];if(!ps.length)return null;return ps.slice().sort((a,b)=>(b.pts+b.reb*.6+b.ast*.7)-(a.pts+a.reb*.6+a.ast*.7))[0]}
function headline(g,t,o,r){const m=+g.myScore-+g.oppScore,w=m>0,up=(+o?.rating||70)>(+t.rating||70)+4;const T=t.name.toUpperCase(),O=(o?.name||'Opponent').toUpperCase();
  if(w&&m<=2)return pick(r,[`${T} SURVIVES ${O} THRILLER`,`HEART-STOPPER! ${T} EDGES ${O}`,`BY A HAIR: ${T} ${g.myScore}, ${O} ${g.oppScore}`]);
  if(w&&up)return pick(r,[`GIANT KILLERS: ${T} TOPPLES ${O}`,`SHOCKER! ${T} STUNS ${O}`,`${T} SENDS A MESSAGE TO THE STATE`]);
  if(w&&m>=25)return pick(r,[`${T} ROLLS PAST ${O}`,`STATEMENT NIGHT: ${T} BURIES ${O}`,`NO CONTEST: ${T} ROUTS ${O}`]);
  if(w)return pick(r,[`${T} HANDLES ${O}`,`${T} TAKES CARE OF BUSINESS`,`${T} PULLS AWAY FROM ${O}`]);
  if(m>=-3)return pick(r,[`SO CLOSE: ${T} FALLS SHORT AT THE BUZZER`,`${O} SNEAKS PAST ${T}`]);
  return pick(r,[`ROUGH NIGHT: ${O} HANDLES ${T}`,`${T} LOOKING FOR ANSWERS AFTER ${O} LOSS`,`BACK TO THE DRAWING BOARD FOR ${T}`])}
function gazette(){const t=me(),gs=played();if(!t)return '';if(!gs.length)return head('THE GAZETTE','Hot off the press','The paper covers every game you play. Go win one.');
  if(gazIdx<0||gazIdx>=gs.length)gazIdx=gs.length-1;const g=gs[gazIdx],o=team(g.opponentId),r=rng(g.id),w=+g.myScore>+g.oppScore,tp=topPlayer(g);
  const city=t.city||t.name;const quotes=w?['We just played together. That is the whole story.','Proud of the guys. We defended like crazy tonight.','Our bench was huge. Everybody contributed.','We will enjoy it tonight and get back to work tomorrow.']:['We did not deserve that one. We will be back.','Credit to them. We have to clean up the turnovers.','Losses teach you more than wins. We will grow from it.','I have to coach better. That one is on me.'];
  const opts=gs.map((x,i)=>`<option value="${i}" ${i===gazIdx?'selected':''}>${fmt(x.date)} — ${x.home&&!x.neutral?'vs':'at'} ${esc(team(x.opponentId)?.name||'Opponent')} (${+x.myScore>+x.oppScore?'W':'L'} ${x.myScore}-${x.oppScore})</option>`).join('');
  return head('THE GAZETTE',`${city} Gazette`,'Your hometown paper, written fresh for every game.')+
  `<div class="lr-gaz-tools"><select id="lrGazPick">${opts}</select><button type="button" class="secondary" id="lrGazShare">Make Share Graphic</button></div>
  <article class="lr-paper"><div class="lr-paper-head"><small>${esc(fmt(g.date)).toUpperCase()} • SPORTS • 25¢</small><h2>THE ${esc(city.toUpperCase())} GAZETTE</h2></div>
  <h1>${esc(headline(g,t,o,r))}</h1>
  <div class="lr-paper-score"><div>${logo(t.name)}<b>${esc(t.name)}</b><strong>${g.myScore}</strong></div><span>FINAL</span><div>${logo(o?.name||'')}<b>${esc(o?.name||'Opponent')}</b><strong>${g.oppScore}</strong></div></div>
  <div class="lr-paper-cols"><p><b>${esc((g.home&&!g.neutral?city:o?.name||'ON THE ROAD').toUpperCase())} —</b> ${w?`${esc(t.name)} improved to ${t.wins}-${t.losses} with a ${g.myScore}-${g.oppScore} win over ${esc(o?.name||'its opponent')}`:`${esc(t.name)} dropped to ${t.wins}-${t.losses} after a ${g.oppScore}-${g.myScore} loss to ${esc(o?.name||'its opponent')}`}${g.type&&g.type!=='Regular Season'?` in ${esc(g.type)} action`:''}. ${tp?`${esc(tp.name)} led the way with ${tp.pts} points, ${tp.reb} rebounds and ${tp.ast} assists.`:''} ${Math.abs(g.myScore-g.oppScore)<=3?'It came down to the final possessions in a game nobody in the building will forget soon.':w&&g.myScore-g.oppScore>=20?'It was never in doubt after the first quarter.':''}</p>
  <p class="lr-quote">“${esc(pick(r,quotes))}”<br><small>— Head Coach, ${esc(t.name)}</small></p>
  ${tp?`<div class="lr-potg"><small>PLAYER OF THE GAME</small><b>${esc(tp.name)}</b><span>${tp.pts} PTS • ${tp.reb} REB • ${tp.ast} AST${tp.stl?` • ${tp.stl} STL`:''}${tp.blk?` • ${tp.blk} BLK`:''}</span></div>`:''}</div></article>
  <div id="lrShareOut"></div>`}
function wireGazette(){const sel=$('lrGazPick');if(sel)sel.onchange=()=>{gazIdx=+sel.value;render('lr-gazette')};const b=$('lrGazShare');if(b)b.onclick=shareCard}
function imgSrc(name){const m=/src="([^"]+)"/.exec(logo(name)||'');return m?m[1].replace(/&amp;/g,'&'):''}
function loadImg(src){return new Promise(res=>{if(!src)return res(null);const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src})}
async function shareCard(){const t=me(),gs=played(),g=gs[gazIdx]||gs[gs.length-1];if(!t||!g)return;const o=team(g.opponentId),tp=topPlayer(g);
  const c=document.createElement('canvas');c.width=c.height=1080;const x=c.getContext('2d');
  const gr=x.createLinearGradient(0,0,1080,1080);gr.addColorStop(0,t.primary||'#1d4ed8');gr.addColorStop(.55,'#07080c');gr.addColorStop(1,o?.primary||'#7f1d1d');x.fillStyle=gr;x.fillRect(0,0,1080,1080);
  x.globalAlpha=.07;x.fillStyle='#fff';for(let i=-1080;i<1080;i+=56){x.beginPath();x.moveTo(i,0);x.lineTo(i+28,0);x.lineTo(i+28+1080,1080);x.lineTo(i+1080,1080);x.fill()}x.globalAlpha=1;
  x.fillStyle='#fff';x.textAlign='center';x.font='italic 900 64px "Avenir Next Condensed","Bahnschrift",Impact,Arial';x.fillText('FINAL',540,140);
  const [a,b]=await Promise.all([loadImg(imgSrc(t.name)),loadImg(imgSrc(o?.name||''))]);try{if(a)x.drawImage(a,140,230,280,280);if(b)x.drawImage(b,660,230,280,280)}catch{}
  x.font='italic 900 200px "Avenir Next Condensed","Bahnschrift",Impact,Arial';x.fillText(String(g.myScore),280,720);x.fillText(String(g.oppScore),800,720);
  x.font='italic 900 48px "Avenir Next Condensed","Bahnschrift",Impact,Arial';x.fillText(t.name.toUpperCase().slice(0,22),280,800);x.fillText((o?.name||'OPPONENT').toUpperCase().slice(0,22),800,800);
  if(tp){x.globalAlpha=.85;x.font='800 26px Arial';x.fillText('PLAYER OF THE GAME',540,890);x.font='italic 900 44px "Avenir Next Condensed","Bahnschrift",Impact,Arial';const line=`${tp.name.toUpperCase()} • ${tp.pts} PTS ${tp.reb} REB ${tp.ast} AST`;let sz=44;while(x.measureText(line).width>980&&sz>24){sz-=2;x.font=`italic 900 ${sz}px "Avenir Next Condensed","Bahnschrift",Impact,Arial`}x.fillText(line,540,940);x.globalAlpha=1}
  x.font='800 26px Arial';x.globalAlpha=.6;x.fillText(`${fmt(g.date).toUpperCase()} • MSHSAA BM27 • RAMPACEGAMES`,540,1010);
  let url='';try{url=c.toDataURL('image/png')}catch{const out=$('lrShareOut');if(out)out.innerHTML='<p class="muted">This school logo blocks image export. Try another game.</p>';return}
  const out=$('lrShareOut');if(out)out.innerHTML=`<article class="card lr-share"><img src="${url}" alt="Final score graphic"><div><a class="primary" download="BM27-final-${esc(t.name)}.png" href="${url}">Download PNG</a><p class="muted small">On iPhone, press and hold the picture and tap Save to Photos.</p></div></article>`;out.scrollIntoView({behavior:'smooth',block:'center'})}

/* ---------- Scout Report ---------- */
function teamSkills(t){const r=(t?.roster||[]).slice().sort((a,b)=>ovr(b)-ovr(a)).slice(0,8);const avg=k=>r.length?Math.round(r.reduce((s,p)=>s+(+p[k]||0),0)/r.length):0;return {SHOOTING:avg('shooting'),FINISHING:avg('finishing'),DEFENSE:avg('defense'),PASSING:avg('passing'),REBOUNDING:avg('rebounding'),ATHLETICISM:avg('athleticism')}}
function scout(){const t=me(),g=nextGame();if(!t)return '';if(!g)return head('SCOUT REPORT','No opponent on the board','Once a game is on your schedule, your staff will have the full report here.');
  const o=team(g.opponentId);if(!o)return head('SCOUT REPORT','Opponent unknown','This matchup is waiting for its opponent.');
  const ms=teamSkills(t),os=teamSkills(o),p=winProb(t,o,g.home&&!g.neutral),hh=h2h(o.id);const stars=numbered(o.roster).slice().sort((a,b)=>ovr(b)-ovr(a)).slice(0,3);
  const edges=Object.keys(ms).map(k=>[k,ms[k]-os[k]]).sort((a,b)=>b[1]-a[1]);const best=edges[0],worst=edges[edges.length-1];
  const keys=[`Lean on your ${best[0].toLowerCase()} — you are +${best[1]} there.`,worst[1]<0?`Their ${worst[0].toLowerCase()} is ${-worst[1]} better than yours. Plan for it.`:'You match up everywhere. Play clean and win the turnover battle.',stars[0]?`Make ${stars[0].name} (#${stars[0].__num}) work for every shot.`:'',g.home&&!g.neutral?'Use the home crowd early.':'Road game — weather the first run.'].filter(Boolean);
  return head('SCOUT REPORT',`${o.name}${o.mascot?' '+o.mascot:''}`,`${fmt(g.date)} • ${esc(g.type||'')} • ${g.neutral?'Neutral site':g.home?'Home':'Away'}`)+
  `<div class="lr-grid2"><article class="card"><div class="lr-mini-match lr-big">${logo(t.name)}<span>${Math.round(+t.rating||0)}</span><em>OVR</em><span>${Math.round(+o.rating||0)}</span>${logo(o.name)}</div>
  <div class="lr-prob"><div class="lr-prob-bar"><i style="width:${Math.round(p*100)}%"></i></div><small>WIN PROBABILITY <b>${Math.round(p*100)}%</b>${p<.35?' • <em class="lr-upset">UPSET ALERT</em>':''}</small></div>
  <p class="muted small">Their record: <b>${o.wins||0}-${o.losses||0}</b> • All-time vs them: <b>${hh.w}-${hh.l}</b> • Class ${esc(o.class)}, District ${esc(o.district)}</p></article>
  <article class="card"><h3>Tale of the Tape</h3>${Object.keys(ms).map(k=>{const a=ms[k],b=os[k];return `<div class="lr-tape"><b class="${a>=b?'up':''}">${a}</b><div><i style="width:${a/(a+b||1)*100}%"></i></div><small>${k}</small><div class="r"><i style="width:${b/(a+b||1)*100}%"></i></div><b class="${b>a?'up':''}">${b}</b></div>`}).join('')}</article></div>
  <div class="lr-grid2"><article class="card"><h3>Players to Watch</h3>${stars.map(p=>`<div class="row lr-watch"><span class="lr-num">#${p.__num}</span><div class="grow"><b>${esc(p.name)}</b><br><small>${esc(p.pos)} • Grade ${esc(p.grade)} • ${esc(p.height||'')}</small></div><span class="k2-ovr ${window.BM27V280?.tier?.(ovr(p))||''}">${ovr(p)}</span></div>`).join('')||'<p class="muted">No roster data.</p>'}</article>
  <article class="card"><h3>Keys to the Game</h3><ol class="lr-keys">${keys.map(k=>`<li>${esc(k)}</li>`).join('')}</ol></article></div>`}

/* ---------- Crystal Ball ---------- */
function ball(){const t=me(),s=save();if(!t)return '';const rest=(s.schedule||[]).filter(g=>!g.played&&g.opponentId&&!g.tournamentId).map(g=>({g,o:team(g.opponentId)})).filter(x=>x.o);
  const w0=+t.wins||0,l0=+t.losses||0;if(!rest.length)return (s.schedule||[]).length?head('CRYSTAL BALL','Nothing left to predict',`You finished the regular schedule at ${w0}-${l0}.`):head('CRYSTAL BALL','No schedule yet','Build your schedule and the Crystal Ball will project your season.');
  const N=3000,dist=new Array(rest.length+1).fill(0),ps=rest.map(x=>winProb(t,x.o,x.g.home&&!x.g.neutral));const r=rng(s.id+s.day);
  for(let i=0;i<N;i++){let w=0;for(const p of ps)if(r()<p)w++;dist[w]++}
  const exp=ps.reduce((a,b)=>a+b,0),winOut=ps.reduce((a,b)=>a*b,1),max=Math.max(...dist);const mostW=dist.indexOf(max);
  const hardest=rest.map((x,i)=>({...x,p:ps[i]})).sort((a,b)=>a.p-b.p).slice(0,3);
  return head('CRYSTAL BALL','Season Projection',`${N.toLocaleString()} simulations of your remaining ${rest.length} games. Just a forecast — nothing here changes your save.`)+
  `<div class="metrics lr-metrics"><div class="metric"><span>Projected Record</span><b>${Math.round(w0+exp)}-${Math.round(l0+rest.length-exp)}</b></div><div class="metric"><span>Most Likely</span><b>${w0+mostW}-${l0+rest.length-mostW}</b></div><div class="metric"><span>Win Out Odds</span><b>${winOut<.001?'<0.1':(winOut*100).toFixed(1)}%</b></div><div class="metric"><span>Finish .500+</span><b>${Math.round(dist.reduce((a,c,i)=>a+((w0+i)>=(l0+rest.length-i)?c:0),0)/N*100)}%</b></div></div>
  <article class="card"><h3>Final Record Odds</h3><div class="lr-hist">${dist.map((c,i)=>`<div title="${w0+i}-${l0+rest.length-i}: ${(c/N*100).toFixed(1)}%"><i style="height:${Math.max(2,c/max*100)}%" class="${i===mostW?'on':''}"></i><small>${w0+i}-${l0+rest.length-i}</small></div>`).join('')}</div></article>
  <article class="card"><h3>Toughest Games Left</h3>${hardest.map(x=>`<div class="row"><div class="grow lr-mini-row">${logo(x.o.name)}<div><b>${x.g.home&&!x.g.neutral?'vs':'at'} ${esc(x.o.name)}</b><br><small>${fmt(x.g.date)} • ${Math.round(+x.o.rating||0)} OVR</small></div></div><span class="tag">${Math.round(x.p*100)}% WIN</span></div>`).join('')}</article>`}

/* ---------- Group Chat ---------- */
function chat(){const t=me(),s=save();if(!t)return '';const roster=numbered(t.roster||[]);const r=rng(s.id+String(s.day).slice(0,10));const gs=played(),last=gs[gs.length-1],tp=last?topPlayer(last):null,g=nextGame(),o=g?team(g.opponentId):null,st=streak();
  const first=n=>String(n||'').split(' ')[0];const pl=()=>pick(r,roster)||{name:'Teammate'};const msgs=[];const add=(who,text,kind='them')=>msgs.push({who,text,kind});
  const groupName=`${t.name.toUpperCase()} HOOPS 🏀`;
  if(!roster.length)add('Assistant Coach','Tryouts are this week. Roster goes up on the gym door Friday.');
  if(last){const w=+last.myScore>+last.oppScore;if(w){add(first(pl().name),pick(r,['W 😤😤','THAT WAS CRAZY','we different fr','LETS GOOOO 🔥']));if(tp)add(first(pl().name),`${first(tp.name)} had ${tp.pts} 😭 nobody could guard him`);if(tp&&roster.find(p=>p.name===tp.name))add(first(tp.name),pick(r,['team win 🤝','yall set me up','just doing my job']));}
    else{add(first(pl().name),pick(r,['that one hurt','we gotta lock in fr','film tomorrow is gonna be rough 😬']));add('Assistant Coach','Film room 3:15. Bring a notebook.')}}
  if(st.n>=3&&st.w)add(first(pl().name),`${st.n} straight 👀 dont jinx it`);
  if(o){add(first(pl().name),`${o.name} next. they ${o.wins||0}-${o.losses||0}`);if((+o.rating||0)>(+t.rating||0)+3)add(first(pl().name),pick(r,['they got some dawgs','gonna be a war','nobody believes in us and thats fine']));else add(first(pl().name),pick(r,['we should be good','dont sleep on them tho','business trip 💼']));
    const rv=rival();if(rv&&String(rv.id)===String(o.id))add(first(pl().name),'ITS RIVALRY WEEK. no excuses 😤');}
  const inel=roster.filter(p=>window.BM27Academics2716&&!window.BM27Academics2716.isEligible(p));if(inel.length)add('Assistant Coach',`Study hall 7am for ${inel.slice(0,3).map(p=>first(p.name)).join(', ')}${inel.length>3?' and others':''}. Grades first.`);
  const seniors=roster.filter(p=>+p.grade===12);if(seniors.length&&g?.seniorNight)add('Team Mom',`Senior Night is ${fmt(g.date)}! Seniors bring your parents to the floor at halftime 💐`);
  const parentGripe=roster.filter(p=>!window.BM27Academics2716||window.BM27Academics2716.isEligible(p)).slice().sort((a,b)=>(ovr(b)-(+b.minutes||0)/2)-(ovr(a)-(+a.minutes||0)/2))[0];
  if(parentGripe&&(+parentGripe.minutes||0)<15&&ovr(parentGripe)>=70)add(`${first(parentGripe.name)}'s Dad`,`Coach, respectfully, ${first(parentGripe.name)} is a ${ovr(parentGripe)} overall and played ${parentGripe.minutes||0} minutes. Can we talk?`,'parent');
  add('Team Mom',pick(r,['Snack schedule is posted 🍕','Bus leaves 4:30 sharp. Do NOT be late.','Team pictures Thursday — wear the home whites!','Spaghetti dinner fundraiser Sunday 🍝']));
  if(roster.length)add(first(pl().name),pick(r,['who took my headband','coach can we play music in warmups','whos driving to open gym','practice was brutal today 💀','can we get new shoes this year 🙏']));
  return head('GROUP CHAT',groupName,'What your players (and their parents) are saying today.')+
  `<div class="lr-phone"><div class="lr-phone-top"><b>${esc(groupName)}</b><small>${roster.length} members</small></div><div class="lr-msgs">${msgs.map(m=>`<div class="lr-msg ${m.kind}"><small>${esc(m.who)}</small><p>${esc(m.text)}</p></div>`).join('')}</div><div class="lr-phone-bot">Messages refresh every in-game day</div></div>`}

/* ---------- Whiteboard ---------- */
let board_={strokes:[],tool:'pen',color:'#fff',undo:[]};
function boardHtml(){const plays=k2x().plays||[];return head('WHITEBOARD','Draw It Up','Draw plays on a real half court. Tap O / X then tap the court to place players. Plays save with your career.')+
  `<div class="lr-board-tools"><button type="button" data-tool="pen" class="secondary on">✏️ Pen</button><button type="button" data-tool="arrow" class="secondary">➜ Cut</button><button type="button" data-tool="dash" class="secondary">┅ Pass</button><button type="button" data-tool="o" class="secondary">O Offense</button><button type="button" data-tool="x" class="secondary">X Defense</button><span class="lr-colors">${['#ffffff','#facc15','#ef4444','#38bdf8','#22c55e'].map(c=>`<button type="button" data-color="${c}" style="--c:${c}" aria-label="color"></button>`).join('')}</span><button type="button" id="lrUndo" class="secondary">Undo</button><button type="button" id="lrClear" class="secondary">Clear</button></div>
  <div class="lr-court-wrap"><canvas id="lrCourt" width="940" height="880"></canvas></div>
  <div class="lr-board-save"><input id="lrPlayName" maxlength="32" placeholder="Name this play (e.g. Horns Flare)"><button type="button" id="lrSavePlay" class="primary">Save Play</button></div>
  <article class="card"><h3>Playbook</h3><div id="lrPlays" class="lr-plays">${plays.length?plays.map((p,i)=>`<div class="row"><div class="grow"><b>${esc(p.name)}</b><br><small>${p.strokes.length} marks • ${fmt(p.at)}</small></div><button type="button" class="secondary small-btn" data-load="${i}">Load</button><button type="button" class="secondary small-btn" data-del="${i}">Delete</button></div>`).join(''):'<p class="muted">No plays saved yet.</p>'}</div></article>`}
function board(){return boardHtml()}
function drawCourt(x,W,H){x.fillStyle='#c98a4b';x.fillRect(0,0,W,H);x.globalAlpha=.12;for(let i=0;i<W;i+=24){x.fillStyle=i%48?'#7c4a1e':'#e6b07a';x.fillRect(i,0,12,H)}x.globalAlpha=1;
  const t=me();x.strokeStyle='#fff';x.lineWidth=4;const s=W/50;x.strokeRect(2,2,W-4,H-4);
  x.fillStyle=(t?.primary||'#1d4ed8')+'cc';x.fillRect(W/2-6*s,0,12*s,19*s);x.strokeRect(W/2-6*s,0,12*s,19*s);
  x.beginPath();x.arc(W/2,19*s,6*s,0,Math.PI);x.stroke();x.beginPath();x.setLineDash([12,10]);x.arc(W/2,19*s,6*s,Math.PI,2*Math.PI);x.stroke();x.setLineDash([]);
  const R=19.75*s,hy=5.25*s;x.beginPath();x.moveTo(W/2-R,0);x.lineTo(W/2-R,hy);x.arc(W/2,hy,R,Math.PI,0,true);x.lineTo(W/2+R,0);x.stroke();
  x.beginPath();x.arc(W/2,H,6*s,Math.PI,2*Math.PI);x.stroke();
  x.beginPath();x.moveTo(W/2-3*s,4*s);x.lineTo(W/2+3*s,4*s);x.stroke();x.strokeStyle='#ff6b00';x.beginPath();x.arc(W/2,5.25*s,.9*s,0,7);x.stroke();
  x.globalAlpha=.18;x.fillStyle='#fff';x.font=`italic 900 ${6*s}px "Avenir Next Condensed",Bahnschrift,Impact,Arial`;x.textAlign='center';x.fillText((t?.name||'BM27').toUpperCase(),W/2,H-9*s);x.globalAlpha=1}
function drawStrokes(x,W,H,strokes){for(const st of strokes){x.strokeStyle=x.fillStyle=st.c;x.lineWidth=5;x.lineCap=x.lineJoin='round';const P=st.p.map(([a,b])=>[a*W,b*H]);
  if(st.t==='o'||st.t==='x'){const [a,b]=P[0];x.font='900 40px Arial';x.textAlign='center';x.textBaseline='middle';if(st.t==='o'){x.beginPath();x.arc(a,b,24,0,7);x.lineWidth=5;x.stroke();x.font='900 26px Arial';x.fillText(st.n||'',a,b+1)}else{x.fillText('X',a,b)}continue}
  if(P.length<2)continue;x.setLineDash(st.t==='dash'?[14,12]:[]);x.beginPath();x.moveTo(...P[0]);for(const q of P.slice(1))x.lineTo(...q);x.stroke();x.setLineDash([]);
  if(st.t==='arrow'||st.t==='dash'){const [a,b]=P[P.length-1],[c,d]=P[Math.max(0,P.length-4)];const ang=Math.atan2(b-d,a-c);x.beginPath();x.moveTo(a,b);x.lineTo(a-22*Math.cos(ang-.45),b-22*Math.sin(ang-.45));x.lineTo(a-22*Math.cos(ang+.45),b-22*Math.sin(ang+.45));x.closePath();x.fill()}}}
function mountBoard(){const c=$('lrCourt');if(!c)return;const x=c.getContext('2d');const W=c.width,H=c.height;const redraw=()=>{drawCourt(x,W,H);drawStrokes(x,W,H,board_.strokes)};redraw();
  const pos=e=>{const r=c.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return [(p.clientX-r.left)/r.width,(p.clientY-r.top)/r.height]};let cur=null;
  const down=e=>{e.preventDefault();const p=pos(e);if(board_.tool==='o'||board_.tool==='x'){const n=board_.tool==='o'?board_.strokes.filter(s=>s.t==='o').length%5+1:'';board_.strokes.push({t:board_.tool,c:board_.color,p:[p],n:String(n)});redraw();return}cur={t:board_.tool,c:board_.color,p:[p]};board_.strokes.push(cur)};
  const move=e=>{if(!cur)return;e.preventDefault();const p=pos(e),l=cur.p[cur.p.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>.004){cur.p.push(p.map(v=>Math.round(v*1000)/1000));redraw()}};
  const up=()=>{if(cur&&cur.p.length<2)board_.strokes.pop();cur=null;redraw()};
  c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);window.addEventListener('pointerup',up,{once:false});c.style.touchAction='none';
  const host=$('lrPage');host.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{board_.tool=b.dataset.tool;host.querySelectorAll('[data-tool]').forEach(y=>y.classList.toggle('on',y===b))});
  host.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{board_.color=b.dataset.color;host.querySelectorAll('[data-color]').forEach(y=>y.classList.toggle('on',y===b))});
  $('lrUndo').onclick=()=>{board_.strokes.pop();redraw()};$('lrClear').onclick=()=>{if(board_.strokes.length&&!confirm('Clear the whiteboard?'))return;board_.strokes=[];redraw()};
  $('lrSavePlay').onclick=()=>{if(!board_.strokes.length)return toast?.('Draw something first.');const name=($('lrPlayName').value||'').trim()||`Play ${k2x().plays.length+1}`;k2x().plays.unshift({name,strokes:JSON.parse(JSON.stringify(board_.strokes)),at:new Date().toISOString()});k2x().plays=k2x().plays.slice(0,30);store();try{toast(`Saved “${name}” to your playbook.`)}catch{}render('lr-board')};
  $('lrPlays').onclick=e=>{const l=e.target.closest('[data-load]'),d=e.target.closest('[data-del]');if(l){board_.strokes=JSON.parse(JSON.stringify(k2x().plays[+l.dataset.load].strokes));$('lrPlayName').value=k2x().plays[+l.dataset.load].name;redraw();c.scrollIntoView({behavior:'smooth',block:'center'})}if(d&&confirm('Delete this play?')){k2x().plays.splice(+d.dataset.del,1);store();render('lr-board')}}}

/* ---------- Hype Intro (PA announcer) ---------- */
function starters(){const t=me();const r=numbered(t?.roster||[]).filter(p=>!window.BM27Academics2716||window.BM27Academics2716.isEligible(p));return r.slice().sort((a,b)=>(+b.minutes||0)-(+a.minutes||0)||ovr(b)-ovr(a)).slice(0,5)}
const POS={PG:'point guard',SG:'shooting guard',SF:'small forward',PF:'power forward',C:'center'};
const GR={9:'freshman',10:'sophomore',11:'junior',12:'senior'};
function intro(){const t=me();if(!t)return '';const s5=starters();const voice='speechSynthesis' in window;
  return head('HYPE INTRO','Lights Out. Starting Five.','Your PA announcer introduces the starters with a full-screen intro. Turn your sound up.')+
  `<article class="card lr-intro-card"><div class="lr-intro-cards">${s5.map(p=>`<div class="lr-pcard"><span>#${p.__num}</span><b>${esc(p.name)}</b><small>${esc(p.pos)} • ${esc(GR[p.grade]||'')} • ${esc(p.height||'')}</small><i class="k2-ovr ${window.BM27V280?.tier?.(ovr(p))||''}">${ovr(p)}</i></div>`).join('')}</div>
  <div class="lr-intro-actions"><button type="button" class="primary" id="lrRunIntro">▶ Run Intro</button>${voice?'':'<span class="muted small">This device has no voice; the intro will play silently.</span>'}</div></article>`}
function wireIntro(){const b=$('lrRunIntro');if(b)b.onclick=runIntro}
function say(text){return Promise.all([sayRaw(text),new Promise(r=>setTimeout(r,2300))])}
function sayRaw(text){return new Promise(res=>{try{if(!('speechSynthesis' in window))return setTimeout(res,1800);const u=new SpeechSynthesisUtterance(text);u.rate=.92;u.pitch=.8;u.volume=1;const v=speechSynthesis.getVoices().find(v=>/en-US/i.test(v.lang)&&/male|david|alex|daniel|fred/i.test(v.name))||speechSynthesis.getVoices().find(v=>/en/i.test(v.lang));if(v)u.voice=v;u.onend=()=>res();u.onerror=()=>res();speechSynthesis.speak(u);setTimeout(res,9000)}catch{setTimeout(res,1500)}})}
async function runIntro(){const t=me();if(!t)return;const s5=starters();const ov=document.createElement('div');ov.id='lrIntroOverlay';ov.style.setProperty('--team',t.primary||'#1d4ed8');ov.innerHTML=`<button type="button" class="lr-intro-skip">SKIP ✕</button><div class="lr-spot"></div><div class="lr-intro-stage"></div>`;document.body.appendChild(ov);
  let stop=false;ov.querySelector('.lr-intro-skip').onclick=()=>{stop=true;try{speechSynthesis.cancel()}catch{}ov.remove()};const stage=ov.querySelector('.lr-intro-stage');
  stage.innerHTML=`<div class="lr-intro-logo">${logo(t.name)}<h1>${esc(t.name)}</h1><p>${esc(t.mascot||'')}</p></div>`;await say(`Ladies and gentlemen, please rise and welcome, your ${t.name} ${t.mascot||''}!`);
  for(const p of s5){if(stop)return;stage.innerHTML=`<div class="lr-intro-player"><span>#${p.__num}</span><small>${esc((GR[p.grade]||'').toUpperCase())} • ${esc((POS[p.pos]||p.pos||'').toUpperCase())} • ${esc(p.height||'')}</small><h1>${esc(p.name)}</h1><i class="k2-ovr ${window.BM27V280?.tier?.(ovr(p))||''}">${ovr(p)}</i></div>`;
    await say(`At ${POS[p.pos]||'guard'}, a ${GR[p.grade]||''}, number ${p.__num}, ${p.name}!`)}
  if(stop)return;stage.innerHTML=`<div class="lr-intro-logo">${logo(t.name)}<h1>LET'S GO!</h1></div>`;await say(`Let's go ${t.mascot||t.name}!`);setTimeout(()=>ov.remove(),1200)}

/* ---------- The Rafters ---------- */
function rafters(){const t=me(),s=save();if(!t)return '';const h=s.history||{};const seasons=(h.seasons||[]).slice();const ret=k2x().retired;
  const banners=[];for(let i=0;i<(+h.titles||0);i++)banners.push({k:'STATE CHAMPIONS',y:seasons.filter(x=>/state|champ/i.test(JSON.stringify(x)))[i]?.season||''});for(let i=0;i<(+h.districtTitles||0);i++)banners.push({k:'DISTRICT CHAMPIONS',y:''});
  for(const x of seasons){const w=+x.wins||0,l=+x.losses||0;if(w>=20)banners.push({k:`${w}-${l} SEASON`,y:x.season||''})}
  const roster=numbered(t.roster||[]);
  return head('THE RAFTERS',`${t.name} Gymnasium`,'Championship banners hang automatically. Retire the jerseys of your program legends.')+
  `<div class="lr-rafters" style="--team:${t.primary||'#1d4ed8'};--team2:${t.secondary||'#fff'}">${banners.length?banners.map(b=>`<div class="lr-banner"><small>${esc(t.name.toUpperCase())}</small><b>${esc(b.k)}</b><span>${esc(b.y)}</span></div>`).join(''):'<div class="lr-banner lr-empty"><b>SPACE RESERVED</b><span>Win something</span></div>'}
  ${ret.map(j=>`<div class="lr-banner lr-jersey"><span>${esc(j.num)}</span><b>${esc(j.name.toUpperCase())}</b><small>${esc(j.year||'')}</small></div>`).join('')}</div>
  <article class="card"><h3>Retire a Jersey</h3><p class="muted small">Honor a player forever. It's purely ceremonial — nobody leaves your roster.</p><div class="lr-retire"><select id="lrRetPick">${roster.map((p,i)=>`<option value="${i}">#${p.__num} ${esc(p.name)} — ${esc(p.pos)}, Grade ${esc(p.grade)}</option>`).join('')}</select><button type="button" class="primary" id="lrRetire">Raise to the Rafters</button></div>
  ${ret.length?`<div class="stack" style="margin-top:12px">${ret.map((j,i)=>`<div class="row"><div class="grow"><b>#${esc(j.num)} ${esc(j.name)}</b><br><small>Retired ${esc(j.year||'')}</small></div><button type="button" class="secondary small-btn" data-unret="${i}">Take Down</button></div>`).join('')}</div>`:''}</article>`}
function wireRafters(){const b=$('lrRetire');if(b)b.onclick=()=>{const t=me(),r=numbered(t.roster||[]),p=r[+$('lrRetPick').value];if(!p)return;if(k2x().retired.some(j=>j.id===p.id))return toast?.('That jersey is already in the rafters.');k2x().retired.push({id:p.id,name:p.name,num:p.__num,year:`${save().season}-${String(+save().season+1).slice(-2)}`});store();try{toast(`#${p.__num} ${p.name} is going to the rafters!`)}catch{}render('lr-rafters')};
  $('lrPage').querySelectorAll('[data-unret]').forEach(x=>x.onclick=()=>{if(!confirm('Take this jersey down?'))return;k2x().retired.splice(+x.dataset.unret,1);store();render('lr-rafters')})}

/* ---------- Trophy Case ---------- */
const TROPHIES=[
 ['first','First Whistle','Win your first game',gs=>gs.some(w)],
 ['streak5','Heater','Win 5 in a row',()=>maxStreak()>=5],
 ['streak10','Unconscious','Win 10 in a row',()=>maxStreak()>=10],
 ['giant','Giant Killer','Beat a team rated 8+ OVR higher',gs=>gs.some(g=>w(g)&&(+team(g.opponentId)?.rating||0)>=(+me()?.rating||0)+8)],
 ['buzzer','Buzzer Beater','Win by 1 point',gs=>gs.some(g=>+g.myScore-+g.oppScore===1)],
 ['century','Century Club','Score 100 in a game',gs=>gs.some(g=>+g.myScore>=100)],
 ['wall','The Wall','Hold an opponent under 40',gs=>gs.some(g=>+g.oppScore<40)],
 ['blowout','Running Clock','Win by 30+',gs=>gs.some(g=>+g.myScore-+g.oppScore>=30)],
 ['road','Road Warriors','Win 5 road games',gs=>gs.filter(g=>w(g)&&!g.home&&!g.neutral).length>=5],
 ['fortress','Fortress','Win 8 home games',gs=>gs.filter(g=>w(g)&&g.home&&!g.neutral).length>=8],
 ['senior','Senior Send-Off','Win on Senior Night',gs=>gs.some(g=>w(g)&&g.seniorNight)],
 ['twenty','20-Win Club','Reach 20 wins in a season',()=>(+me()?.wins||0)>=20],
 ['rival','Bragging Rights','Beat your rival',gs=>{const r=rival();return !!r&&gs.some(g=>w(g)&&String(g.opponentId)===String(r.id))}],
 ['bounce','Bounce Back','Win right after a loss',gs=>gs.some((g,i)=>i>0&&w(g)&&!w(gs[i-1]))],
 ['district','District Champs','Win a district title',()=>(+save()?.history?.districtTitles||0)>0],
 ['state','State Champions','Win the state title',()=>(+save()?.history?.titles||0)>0],
 ['playbook','Mad Scientist','Save 3 plays on the Whiteboard',()=>(k2x().plays||[]).length>=3],
 ['legend','Legend','Retire a jersey',()=>(k2x().retired||[]).length>0]];
function w(g){return +g.myScore>+g.oppScore}
function maxStreak(){let m=0,c=0;for(const g of played()){c=w(g)?c+1:0;m=Math.max(m,c)}return m}
function checkTrophies(silent){const s=save();if(!s)return [];const gs=played(),got=k2x().trophies,news=[];for(const [id,name,,test] of TROPHIES){let ok=false;try{ok=test(gs)}catch{}if(ok&&!got[id]){got[id]=s.day||new Date().toISOString();news.push(name)}}
  if(news.length){store();if(!silent)popTrophy(news.length===1?news[0]:`${news.length} Trophies`)}return news}
function popTrophy(name){const d=document.createElement('div');d.className='lr-pop';d.innerHTML=`<small>TROPHY UNLOCKED</small><b>🏆 ${esc(name)}</b>`;document.body.appendChild(d);setTimeout(()=>d.classList.add('out'),3200);setTimeout(()=>d.remove(),3800)}
function trophies(){checkTrophies(true);const got=k2x().trophies;const n=Object.keys(got).length;
  return head('TROPHY CASE',`${n} / ${TROPHIES.length} Unlocked`,'Milestones from your career. They unlock on their own as you play.')+
  `<div class="lr-trophies">${TROPHIES.map(([id,name,desc])=>`<div class="lr-trophy ${got[id]?'on':''}"><i>${got[id]?'🏆':'🔒'}</i><b>${esc(name)}</b><small>${esc(desc)}</small>${got[id]?`<em>${fmt(got[id])}</em>`:''}</div>`).join('')}</div>`}

/* ---------- Around-the-state ticker ---------- */
let tickerSig='';
function ticker(force){const s=save(),host=document.querySelector('#game main');let bar=$('lrTicker');
  if(!s||!host||k2x().ticker===false||document.getElementById('game')?.classList.contains('hidden')){bar?.remove();tickerSig='';return}
  const games=(s.seasonEngine?.games||[]).filter(g=>(g.status==='final'||g.played)&&Number.isFinite(+g.score1)).slice(-24).reverse();
  const sig=games.length+'|'+(games[0]?.id||'');if(!force&&sig===tickerSig&&bar)return;tickerSig=sig;
  if(!games.length){bar?.remove();return}
  const nm=id=>team(id)?.name||'—';const items=games.map(g=>{const a=+g.score1,b=+g.score2;return `<span><b class="${a>b?'w':''}">${esc(nm(g.team1Id))} ${a}</b> <b class="${b>a?'w':''}">${esc(nm(g.team2Id))} ${b}</b>${g.type&&g.type!=='Regular Season'?` <em>${esc(g.type)}</em>`:''}</span>`}).join('');
  if(!bar){bar=document.createElement('div');bar.id='lrTicker';host.appendChild(bar)}
  bar.innerHTML=`<strong>AROUND THE STATE</strong><div class="lr-tick-track"><div class="lr-tick-move" style="animation-duration:${Math.max(30,games.length*5)}s">${items}${items}</div></div>`}

/* ---------- wiring ---------- */
function tick(){const s=save();const inGame=s&&!$('game')?.classList.contains('hidden');if(!inGame){$('lrTicker')?.remove();return}
  if(ensureShell()){window.BM27V280?.addGroup?.('locker','LOCKER ROOM',TABS.map(t=>t[0]))}
  const day=s.day;if(tick.day!==day){tick.day=day;checkTrophies(false);if(currentTab&&$('lrPage')?.classList.contains('active')&&currentTab!=='lr-board')render(currentTab)}
  ticker(false)}
let t0=0;const q=()=>{if(t0)return;t0=setTimeout(()=>{t0=0;try{tick()}catch(e){console.warn('BM27 locker room',e)}},250)};
function notes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v290-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v290-notes><p class="eyebrow">BM27 v2.9.0</p><h3>The Locker Room — only in BM27</h3><ul class="update-list"><li>New LOCKER ROOM tab with Town Buzz, win probability, Upset Alerts and Rivalry Week.</li><li>The Gazette: a hometown newspaper front page for every game, plus a shareable Final Score graphic.</li><li>Scout Report: tale of the tape, players to watch, keys to the game.</li><li>Crystal Ball: 3,000-sim season projection with record odds.</li><li>Group Chat: your team's group chat — and the parents.</li><li>Whiteboard: draw plays on a half court and save your playbook.</li><li>Hype Intro: PA announcer starting-lineup intros.</li><li>The Rafters: banners and retired jerseys. Trophy Case with 18 milestones. Around-the-State scores ticker.</li></ul></article>`)}
function install(){new MutationObserver(recs=>{if(recs.every(r=>r.target.closest?.('#lrPage,#lrTicker,.lr-pop')))return;q()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-open-updates]'))setTimeout(notes,40)},true);q()}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
window.BM27V290={version:'2.9.0',open:openTab,checkTrophies};
})();
