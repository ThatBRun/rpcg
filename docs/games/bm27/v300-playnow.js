/* BM27 v3.0 — PLAY NOW rebuilt from scratch.
   Broadcast-angle 3D court, real 5-on-5 basketball (spacing, screens, help defense,
   contested shots, blocks, rebounds, fouls, free throws, shot clock, overtime),
   real 2026-27 rosters when available, and a brand-new mobile controller.
   Replaces every older Play Now entry point (BM27PlayNow250-253) without touching
   Season, MySchool, Dynasty, saves or logos. */
(()=>{'use strict';
if(window.__BM27_PN300__)return;window.__BM27_PN300__=true;
const VERSION='3.0.0';
const $=s=>document.querySelector(s);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=Math.random;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};

/* ---------- court geometry (feet) ---------- */
const L=94,W=50,RIM_Y=25,RIM_Z=10,THREE=19.75;
const RIM_X=[88.75,5.25];               // team 0 attacks right, team 1 attacks left
const DIR=[1,-1];
const SETTINGS_KEY='bm27_pn300_settings';
const DEF_SETTINGS={qlen:3,diff:'pro',shotClock:35,side:0,sound:true,haptics:true,camera:'broadcast'};
const DIFF={rookie:{cpu:.80,green:1.45,steal:.6,label:'ROOKIE'},pro:{cpu:1,green:1,steal:1,label:'PRO'},allstate:{cpu:1.12,green:.8,steal:1.25,label:'ALL-STATE'},hof:{cpu:1.24,green:.62,steal:1.5,label:'HALL OF FAME'}};
let S=loadSettings();
function loadSettings(){try{return{...DEF_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return{...DEF_SETTINGS}}}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(S))}catch{}}

/* ---------- schools, rosters, ratings ---------- */
function schoolList(){
  let d=[];try{if(typeof directory!=='undefined'&&Array.isArray(directory))d=directory}catch{}
  const seen=new Set(),out=[];
  for(const s of d){const name=s?.name||s?.school;if(!name)continue;const k=norm(name);if(seen.has(k))continue;seen.add(k);out.push({name,cls:String(s.class??''),district:String(s.district??''),primary:s.primary||'#1d4ed8',secondary:s.secondary||'#ffffff',mascot:s.mascot&&s.mascot!=='Athletics'?s.mascot:'',city:s.city||''})}
  if(!out.length)['Marquette','Principia','Vashon','Kickapoo','Rockhurst','Chaminade'].forEach(name=>out.push({name,cls:'6',district:'',primary:'#1d4ed8',secondary:'#ffffff',mascot:'',city:''}));
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}
function saveTeam(name){try{if(typeof current!=='undefined'&&current?.teams)return current.teams.find(t=>norm(t.name)===norm(name))||null}catch{}return null}
function realEntry(name){
  try{if(typeof realRosterEntry==='function'){const e=realRosterEntry({name});if(e?.players?.length)return e}}catch{}
  const sc=window.BM27_REAL_ROSTERS?.schools||{};return sc[norm(name)]||null;
}
function parseHeight(h,pos){
  const m=String(h||'').match(/(\d)\D+(\d{1,2})/);if(m)return +m[1]+(+m[2])/12;
  return {PG:6.0,SG:6.2,SF:6.4,PF:6.6,C:6.8,G:6.1,F:6.5,W:6.3}[pos]||6.3;
}
const GFIRST=['Jalen','Mason','Caleb','Trey','Cameron','Malik','Jordan','Isaiah','Eli','Noah','Tyler','Drew','Jayden','Micah','Kaden','Andre','Xavier','Cole','Miles','Devin','Brayden','Nolan','Zion','Landon','Bryce','Jace','Owen','Carter'];
const GLAST=['Johnson','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Robinson','Clark','Lewis','Walker','Young','Allen','King','Wright','Hill','Scott','Green','Reed','Parker'];
const POS=['PG','SG','SF','PF','C'];
function genPlayer(r,i,bump,real){
  const pos=(real?.pos&&/^(PG|SG|SF|PF|C)$/.test(real.pos))?real.pos:POS[i%5];
  const grade=real?.grade?Number(real.grade)||9+Math.floor(r()*4):9+Math.floor(r()*4);
  const base=54+bump+(grade-9)*2.5+r()*20;
  const sk=(adj=0)=>clamp(Math.round(base+adj+(r()-.5)*18),35,97);
  const big=pos==='C'||pos==='PF',guard=pos==='PG'||pos==='SG';
  const p={name:real?.name||`${GFIRST[Math.floor(r()*GFIRST.length)]} ${GLAST[Math.floor(r()*GLAST.length)]}`,num:real?.num||String(Math.floor(r()*35)+1),pos,grade,
    height:real?.height||'',shooting:sk(guard?5:big?-6:0),finishing:sk(big?5:0),defense:sk(),passing:sk(guard?6:-3),rebounding:sk(big?9:-4),athleticism:sk(),real:!!real};
  if(real?.r)Object.assign(p,real.r);
  p.overall=Math.round((p.shooting+p.finishing+p.defense+p.passing+p.rebounding+p.athleticism)/6);return p;
}
function buildTeam(school){
  const st=saveTeam(school.name),real=realEntry(school.name)?.players||[];
  let roster;
  if(st?.roster?.length){roster=st.roster.map((p,i)=>({...p,num:p.num||p.jersey||String((i*7+3)%40+1),real:!!p.realRoster}))}
  else{const r=rng(hash(school.name+'|pn300'));const cls=Number(school.cls)||4,bump=(cls-3.5)*2.6;roster=Array.from({length:Math.max(10,Math.min(15,real.length))},(_,i)=>genPlayer(r,i,bump,real[i]))}
  const sorted=roster.slice().sort((a,b)=>(b.overall||0)-(a.overall||0));
  const starters=[];
  for(const pos of POS){const k=sorted.findIndex(p=>p.pos===pos);starters.push(k>=0?sorted.splice(k,1)[0]:sorted.shift())}
  const five=starters.filter(Boolean).slice(0,5);while(five.length<5)five.push(genPlayer(rng(five.length+9),five.length,0,null));
  const avg=k=>Math.round(five.reduce((a,p)=>a+(Number(p[k])||60),0)/5);
  const ovr=Math.round(five.reduce((a,p)=>a+(Number(p.overall)||60),0)/5);
  return{...school,abbr:abbr(school.name),five,bench:sorted,ovr,off:Math.round((avg('shooting')+avg('finishing')+avg('passing'))/3),def:Math.round((avg('defense')+avg('rebounding')+avg('athleticism'))/3),realCount:roster.filter(p=>p.real||p.realRoster).length,fromSave:!!st};
}
function abbr(name){const w=String(name).replace(/\(.*?\)/g,'').split(/[\s-]+/).filter(Boolean);if(w.length===1)return w[0].slice(0,4).toUpperCase();return w.map(x=>x[0]).join('').slice(0,4).toUpperCase()}
function hexRgb(h){const m=String(h||'').replace('#','');const f=m.length===3?m.split('').map(c=>c+c).join(''):m.padEnd(6,'0');return[parseInt(f.slice(0,2),16)||0,parseInt(f.slice(2,4),16)||0,parseInt(f.slice(4,6),16)||0]}
function cdist(a,b){const x=hexRgb(a),y=hexRgb(b);return Math.hypot(x[0]-y[0],x[1]-y[1],x[2]-y[2])}
function lum(h){const[r,g,b]=hexRgb(h);return(r*299+g*587+b*114)/1000}
function logo(name,cls){try{return window.BM27Logos252?.html?.(name,cls)||''}catch{return''}}

/* ---------- audio + haptics ---------- */
let AC=null;
function ac(){if(!S.sound)return null;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch{return null}}
function tone(f,d=.08,type='sine',v=.12,slide=0){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),a.currentTime+d);g.gain.value=v;g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d+.02)}
function noise(d=.3,v=.12,freq=1800,q=.8){const a=ac();if(!a)return;const n=a.sampleRate*d,b=a.createBuffer(1,n,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<n;i++)c[i]=(rnd()*2-1)*(1-i/n);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.value=v;s.buffer=b;s.connect(f).connect(g).connect(a.destination);s.start()}
const SFX={dribble:()=>tone(95,.07,'sine',.16,-40),swish:()=>noise(.28,.16,4200,1.6),rim:()=>{tone(420,.12,'triangle',.08);tone(610,.09,'triangle',.05)},buzzer:()=>tone(180,.9,'square',.07),whistle:()=>{tone(2800,.25,'sine',.08);tone(3100,.25,'sine',.05)},crowd:(v=.08)=>noise(1.3,v,900,.4),green:()=>{tone(880,.08,'sine',.08);setTimeout(()=>tone(1320,.1,'sine',.08),70)},block:()=>tone(140,.16,'sawtooth',.08,-60)};
function vib(ms){if(S.haptics)try{navigator.vibrate?.(ms)}catch{}}

/* ---------- state ---------- */
let G=null,raf=0,root=null,cv=null,cx=null,DPR=1,VW=0,VH=0,lastT=0,acc=0,cam={x:47,tx:47,shake:0};
const IN={mx:0,my:0,kx:0,ky:0,gx:0,gy:0,sprint:false,shootHeld:false};
let selection={home:null,away:null,side:'home'};

/* ---------- open / close ---------- */
function close(){cancelAnimationFrame(raf);raf=0;G=null;unbind();root?.remove();root=null;document.documentElement.classList.remove('pn300-open');try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen()}catch{}}
function open(){
  close();S=loadSettings();
  root=document.createElement('section');root.id='pn300';document.body.appendChild(root);document.documentElement.classList.add('pn300-open');
  const list=schoolList();let hist=null;try{hist=JSON.parse(sessionStorage.getItem('bm27-historic-playnow')||'null');sessionStorage.removeItem('bm27-historic-playnow')}catch{}
  let mine=null;try{if(typeof current!=='undefined'&&current?.teams&&current.schoolId!=null)mine=current.teams.find(t=>String(t.id)===String(current.schoolId))}catch{}
  const pick=n=>list.find(s=>norm(s.name)===norm(n));
  selection.home=selection.home&&pick(selection.home.name)||(mine&&pick(mine.name))||list[0];
  selection.away=selection.away&&pick(selection.away.name)||list.find(s=>s!==selection.home&&s.cls===selection.home.cls)||list[1]||list[0];
  if(hist){const h={name:hist.school+' ('+hist.season+')',cls:'6',primary:'#7c3aed',secondary:'#ffffff',historic:hist};selection.home=h}
  selection.side='away';renderSelect(list);
}
function renderSelect(list){
  const T={home:buildTeam(selection.home),away:buildTeam(selection.away)};
  if(selection.home.historic&&Array.isArray(selection.home.historic.players))selection.home.historic.players.slice(0,5).forEach((n,i)=>{T.home.five[i]={...T.home.five[i],name:typeof n==='string'?n:n.name,real:true}});
  root.className='pn3 select';
  root.innerHTML=`<header class="pn3-top"><button class="pn3-back" data-act="back">‹ MAIN MENU</button><div class="pn3-title"><small>PLAY NOW</small><h1>CHOOSE YOUR MATCHUP</h1></div><span class="pn3-ver">BM27 • 2026-27</span></header>
  <div class="pn3-match">${card(T.home,'HOME',selection.side==='home')}<div class="pn3-vs"><b>VS</b><button data-act="swap" title="Swap home and away">⇄ SWAP</button><button data-act="random">🎲 RANDOM</button></div>${card(T.away,'AWAY',selection.side==='away')}</div>
  <div class="pn3-browse"><div class="pn3-filter"><input id="pn3Search" placeholder="Search ${list.length} schools…" autocomplete="off"><div class="pn3-chips">${['ALL','6','5','4','3','2','1'].map(c=>`<button data-cls="${c}" class="${(root._cls||'ALL')===c?'on':''}">${c==='ALL'?'ALL':'C'+c}</button>`).join('')}</div><span>Picking <b>${selection.side.toUpperCase()}</b> — tap a team card above to switch</span></div><div id="pn3Grid" class="pn3-grid"></div></div>
  <footer class="pn3-setup">
    <label>QUARTERS<select data-set="qlen">${[2,3,4,5,8].map(v=>`<option value="${v}" ${S.qlen==v?'selected':''}>${v} MIN</option>`).join('')}</select></label>
    <label>DIFFICULTY<select data-set="diff">${Object.entries(DIFF).map(([k,v])=>`<option value="${k}" ${S.diff===k?'selected':''}>${v.label}</option>`).join('')}</select></label>
    <label>SHOT CLOCK<select data-set="shotClock">${[[35,'35 SEC'],[0,'OFF']].map(([v,l])=>`<option value="${v}" ${S.shotClock==v?'selected':''}>${l}</option>`).join('')}</select></label>
    <label>YOU CONTROL<select data-set="side">${[[0,'HOME'],[1,'AWAY'],[-1,'WATCH CPU']].map(([v,l])=>`<option value="${v}" ${S.side==v?'selected':''}>${l}</option>`).join('')}</select></label>
    <button class="pn3-go" data-act="tip">TIP OFF ▶</button>
  </footer>`;
  const grid=()=>{const q=norm($('#pn3Search')?.value||''),cls=root._cls||'ALL';const rows=list.filter(s=>(!q||norm(s.name).includes(q))&&(cls==='ALL'||s.cls===cls)).slice(0,240);const cur=selection[selection.side];
    $('#pn3Grid').innerHTML=rows.map(s=>`<button data-team="${esc(s.name)}" class="${cur&&norm(cur.name)===norm(s.name)?'on':''}" style="--c:${esc(s.primary)}">${logo(s.name,'pn3-glogo')}<span>${esc(s.name)}</span><small>${s.cls?'C'+esc(s.cls):''}${s.district?' • D'+esc(s.district):''}</small></button>`).join('')||'<p class="pn3-empty">No schools match that search.</p>'};
  grid();
  $('#pn3Search').oninput=grid;
  root.onclick=e=>{const b=e.target.closest('button,[data-side]');if(!b)return;
    if(b.dataset.cls){root._cls=b.dataset.cls;root.querySelectorAll('.pn3-chips button').forEach(x=>x.classList.toggle('on',x===b));grid();return}
    if(b.dataset.team){const s=list.find(x=>x.name===b.dataset.team);if(s){selection[selection.side]=s;if(selection.side==='home'){selection.side='away'}keepScroll(()=>renderSelect(list))}return}
    if(b.dataset.side){selection.side=b.dataset.side;keepScroll(()=>renderSelect(list));return}
    const a=b.dataset.act;if(a==='back'){close();try{window.BM27V280?.refresh?.()}catch{}return}
    if(a==='swap'){[selection.home,selection.away]=[selection.away,selection.home];renderSelect(list);return}
    if(a==='random'){selection.home=list[Math.floor(rnd()*list.length)];selection.away=list[Math.floor(rnd()*list.length)];if(selection.away===selection.home)selection.away=list[(list.indexOf(selection.home)+1)%list.length];renderSelect(list);return}
    if(a==='tip'){ac();startGame(T.home,T.away);return}};
  root.querySelectorAll('[data-set]').forEach(sel=>sel.onchange=()=>{const k=sel.dataset.set;S[k]=k==='diff'?sel.value:Number(sel.value);saveSettings()});
}
function keepScroll(fn){const y=$('#pn3Grid')?.scrollTop||0;fn();const g=$('#pn3Grid');if(g)g.scrollTop=y}
function card(t,label,active){
  return`<article class="pn3-card ${active?'active':''}" data-side="${label.toLowerCase()}" style="--c:${esc(t.primary)};--c2:${esc(t.secondary)}">
   <div class="pn3-card-top"><small>${label}${active?' • PICKING':''}</small><span>${t.cls?'CLASS '+esc(t.cls):''}${t.district?' • DIST '+esc(t.district):''}</span></div>
   <div class="pn3-card-logo">${logo(t.name,'pn3-clogo')}</div><h2>${esc(t.name)}</h2><p>${esc(t.mascot||'')}</p>
   <div class="pn3-rt"><div><b>${t.ovr}</b><span>OVR</span></div><div><b>${t.off}</b><span>OFF</span></div><div><b>${t.def}</b><span>DEF</span></div></div>
   <ol class="pn3-five">${t.five.map(p=>`<li><i>${esc(p.pos)}</i><span>${esc(p.name)}</span><b>${p.overall||'—'}</b></li>`).join('')}</ol>
   <em class="pn3-src">${t.fromSave?'Roster from your save':t.realCount?`${t.realCount} real 2026-27 players`:'Simulated roster'}</em></article>`;
}

/* ---------- game setup ---------- */
function mkPlayer(team,i,p){
  const h=parseHeight(p.height,p.pos);
  const r={spd:Number(p.athleticism)||60,sht:Number(p.shooting)||60,fin:Number(p.finishing)||60,def:Number(p.defense)||60,pas:Number(p.passing)||60,reb:Number(p.rebounding)||60};
  r.three=clamp(r.sht-(p.pos==='C'?10:p.pos==='PF'?5:0),30,99);r.hnd=clamp((r.pas+r.spd)/2+(p.pos==='PG'?6:0),30,99);
  return{t:team,i,name:p.name,last:String(p.name).split(' ').slice(-1)[0],num:String(p.num??i+1).replace(/\D/g,'').slice(0,2)||String(i+1),pos:p.pos,h,r,x:0,y:0,vx:0,vy:0,z:0,vz:0,face:DIR[team],anim:rnd()*6,act:null,actT:0,stun:0,burst:0,cut:0,cutT:3+rnd()*4,skin:['#8d5524','#c68642','#e0ac69','#f1c27d','#5c3a21','#a0662f'][hash(p.name)%6],hair:['#1b1b1b','#3b2414','#5a3a1e','#151515','#7a4a22'][hash(p.name+'h')%5],
    box:{pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,reb:0,ast:0,stl:0,blk:0,to:0,pf:0}};
}
function kit(home,away){
  let hj=home.primary,ht=home.secondary,aj=away.primary,at=away.secondary;
  if(cdist(hj,aj)<110){aj='#f8fafc';at=away.primary}             // away goes white when kits clash
  if(cdist(hj,ht)<60)ht=lum(hj)>140?'#111827':'#ffffff';
  if(cdist(aj,at)<60)at=lum(aj)>140?'#111827':'#ffffff';
  return[{jersey:hj,trim:ht,text:lum(hj)>150?'#111827':'#ffffff'},{jersey:aj,trim:at,text:lum(aj)>150?'#111827':'#ffffff'}];
}
function startGame(home,away){
  const user=Number(S.side);
  G={teams:[home,away],kits:kit(home,away),user,diff:DIFF[S.diff]||DIFF.pro,players:[],score:[0,0],q:1,clock:S.qlen*60,qlen:S.qlen*60,shot:S.shotClock||0,off:0,phase:'tip',phaseT:0,
    ball:{state:'dead',owner:null,x:47,y:25,z:4,vx:0,vy:0,vz:0},fouls:[0,0],arrow:1,ctl:[null,null],lastPass:null,msgs:[],flash:0,stats:[{},{}],paused:false,over:false,events:[],run:[0,0],lastTouch:0,meter:null,ft:null,inb:null,qScores:[[0,0,0,0],[0,0,0,0]],ot:0};
  home.five.forEach((p,i)=>G.players.push(mkPlayer(0,i,p)));away.five.forEach((p,i)=>G.players.push(mkPlayer(1,i,p)));
  team(0).forEach((p,i)=>{p.x=47-3-i*2.2;p.y=[25,14,36,8,42][i]});team(1).forEach((p,i)=>{p.x=47+3+i*2.2;p.y=[25,14,36,8,42][i]});
  team(0)[4].x=46;team(0)[4].y=25;team(1)[4].x=48;team(1)[4].y=25;
  G.ctl[0]=team(0)[0];G.ctl[1]=team(1)[0];
  buildGameDom();setPhase('tip',1.4);say('TIP-OFF','#fbbf24');SFX.crowd(.06);
  lastT=performance.now();acc=0;bind();raf=requestAnimationFrame(loop);
}
const team=t=>G.players.filter(p=>p.t===t);
const opp=t=>1-t;
const isUser=t=>G&&G.user===t;
const userP=()=>G&&G.user>=0?G.ctl[G.user]:null;

/* ---------- DOM for the game ---------- */
function buildGameDom(){
  const[h,a]=G.teams,[kh,ka]=G.kits;
  root.className='pn3 game';
  root.innerHTML=`<canvas id="pn3c"></canvas>
  <div class="pn3-bug"><div class="pn3-bt" style="--c:${esc(kh.jersey)}">${logo(h.name,'pn3-blogo')}<b>${esc(h.abbr)}</b><strong id="pn3s0">0</strong><i id="pn3f0"></i></div><div class="pn3-bc"><span id="pn3q">1ST</span><b id="pn3clk">0:00</b><em id="pn3sc"></em></div><div class="pn3-bt away" style="--c:${esc(ka.jersey)}"><i id="pn3f1"></i><strong id="pn3s1">0</strong><b>${esc(a.abbr)}</b>${logo(a.name,'pn3-blogo')}</div></div>
  <div id="pn3poss" class="pn3-poss"></div>
  <div id="pn3msg" class="pn3-msg"></div>
  <div id="pn3feed" class="pn3-feed"></div>
  <button class="pn3-pause" data-act="pause" aria-label="Pause">❚❚</button>
  ${G.user>=0?`<div class="pn3-pad" id="pn3pad">
    <div class="pn3-stickzone" id="pn3stick"><div class="pn3-base"><div class="pn3-knob"></div></div><span>MOVE</span></div>
    <div class="pn3-btns">
      <button class="pn3-b b-shoot" data-btn="shoot"><b>SHOOT</b><small>hold • release</small></button>
      <button class="pn3-b b-pass" data-btn="pass"><b>PASS</b></button>
      <button class="pn3-b b-move" data-btn="move"><b>CROSS</b></button>
      <button class="pn3-b b-sprint" data-btn="sprint"><b>SPRINT</b></button>
    </div></div>`:''}
  <div class="pn3-rotate">Turn your phone sideways for the full court ⟲</div>
  <div id="pn3menu" class="pn3-menu hidden"></div><div id="pn3final" class="pn3-final hidden"></div>`;
  cv=$('#pn3c');cx=cv.getContext('2d');resize();buildCrowd();
  root.querySelector('[data-act="pause"]').onclick=()=>pause(true);
  bindTouch();
}
function resize(){if(!cv)return;DPR=Math.min(2,window.devicePixelRatio||1);VW=root.clientWidth||innerWidth;VH=root.clientHeight||innerHeight;cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);cv.style.width=VW+'px';cv.style.height=VH+'px';crowdCanvas=null}

/* ---------- input ---------- */
const keys={};
function onKey(e){if(!G)return;const k=e.key.length===1?e.key.toLowerCase():e.key,down=e.type==='keydown';
  const game=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d',' ','j','k','e','l','f','Shift','Escape','p','q'];if(!game.includes(k))return;e.preventDefault();e.stopPropagation();
  if(down&&e.repeat){return}keys[k]=down;
  if(down){if(k==='Escape'||k==='p')return pause(!G.paused);if(k===' '||k==='j')btnDown('shoot');if(k==='k'||k==='e')btnDown('pass');if(k==='l'||k==='f')btnDown('move');if(k==='q')switchPlayer(true)}
  else{if(k===' '||k==='j')btnUp('shoot')}
  IN.kx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);IN.ky=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);IN.ksprint=!!keys.Shift}
let padPrev=[];
function pollPad(){const p=navigator.getGamepads?.()?.find?.(x=>x);if(!p)return;const ax=p.axes[0]||0,ay=p.axes[1]||0,dz=.18;IN.gx=Math.abs(ax)>dz?ax:0;IN.gy=Math.abs(ay)>dz?ay:0;
  const pr=i=>!!p.buttons[i]?.pressed,was=i=>!!padPrev[i];IN.gsprint=pr(7)||pr(5)||pr(6);
  if(pr(0)&&!was(0))btnDown('shoot');if(!pr(0)&&was(0))btnUp('shoot');if(pr(2)&&!was(2))btnDown('pass');if(pr(1)&&!was(1))btnDown('move');if(pr(3)&&!was(3))switchPlayer(true);if(pr(9)&&!was(9))pause(!G.paused);
  if(p.buttons[12]?.pressed)IN.gy=-1;if(p.buttons[13]?.pressed)IN.gy=1;if(p.buttons[14]?.pressed)IN.gx=-1;if(p.buttons[15]?.pressed)IN.gx=1;
  padPrev=p.buttons.map(b=>b.pressed)}
function bindTouch(){
  const zone=$('#pn3stick');if(!zone)return;const base=zone.querySelector('.pn3-base'),knob=zone.querySelector('.pn3-knob');let id=null,ox=0,oy=0;const R=58;
  const place=(x,y)=>{const r=zone.getBoundingClientRect();base.style.left=(x-r.left)+'px';base.style.top=(y-r.top)+'px'};
  zone.addEventListener('pointerdown',e=>{if(id!==null)return;id=e.pointerId;zone.setPointerCapture(id);ox=e.clientX;oy=e.clientY;place(ox,oy);zone.classList.add('on');move(e);ac()});
  const move=e=>{if(e.pointerId!==id)return;let dx=e.clientX-ox,dy=e.clientY-oy;const d=Math.hypot(dx,dy);if(d>R){/* floating stick follows the thumb */ox+=dx/d*(d-R);oy+=dy/d*(d-R);place(ox,oy);dx=e.clientX-ox;dy=e.clientY-oy}
    knob.style.transform=`translate(${dx}px,${dy}px)`;const m=Math.min(1,Math.hypot(dx,dy)/R);const a=Math.atan2(dy,dx);IN.mx=m<.12?0:Math.cos(a)*m;IN.my=m<.12?0:Math.sin(a)*m;IN.tsprint=m>.97&&zone.classList.contains('lock')};
  const up=e=>{if(e.pointerId!==id)return;id=null;IN.mx=IN.my=0;knob.style.transform='';zone.classList.remove('on');base.style.left='';base.style.top=''};
  zone.addEventListener('pointermove',move);zone.addEventListener('pointerup',up);zone.addEventListener('pointercancel',up);
  root.querySelectorAll('[data-btn]').forEach(b=>{const k=b.dataset.btn;
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture?.(e.pointerId);b.classList.add('down');vib(10);if(k==='sprint')IN.tsprint2=true;else btnDown(k)});
    const rel=e=>{b.classList.remove('down');if(k==='sprint')IN.tsprint2=false;if(k==='shoot')btnUp('shoot')};b.addEventListener('pointerup',rel);b.addEventListener('pointercancel',rel);b.addEventListener('contextmenu',e=>e.preventDefault())});
}
function bind(){addEventListener('keydown',onKey,true);addEventListener('keyup',onKey,true);addEventListener('resize',resize);addEventListener('blur',blurPause);document.addEventListener('visibilitychange',blurPause)}
function unbind(){removeEventListener('keydown',onKey,true);removeEventListener('keyup',onKey,true);removeEventListener('resize',resize);removeEventListener('blur',blurPause);document.removeEventListener('visibilitychange',blurPause);for(const k in keys)keys[k]=false;Object.assign(IN,{mx:0,my:0,kx:0,ky:0,gx:0,gy:0})}
function blurPause(){if(G&&!G.over&&(document.hidden||!document.hasFocus()))pause(true)}
function inputVec(){let x=IN.mx+IN.kx+IN.gx,y=IN.my+IN.ky+IN.gy;const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}return{x,y,m:Math.min(1,m)}}
function sprinting(){return!!(IN.ksprint||IN.gsprint||IN.tsprint2)}

function btnDown(k){if(!G||G.paused||G.over||G.user<0)return;const me=userP();if(!me)return;
  if(G.phase==='ft'&&G.ft&&G.ft.shooter.t===G.user){if(k==='shoot')ftStop();return}
  if(G.phase!=='live')return;
  const onO=G.off===G.user;
  if(k==='shoot'){IN.shootHeld=true;if(onO){if(G.ball.owner===me){const rd=rimDist(me),sp=Math.hypot(me.vx,me.vy);if(rd<4.6||(rd<8.5&&sp>5))startLayup(me);else beginShot(me)}}else contestJump(me)}
  else if(k==='pass'){if(onO){if(G.ball.owner===me)userPass(me)}else switchPlayer(true)}
  else if(k==='move'){if(onO){if(G.ball.owner===me)dribbleMove(me)}else attemptSteal(me)}
}
function btnUp(k){if(!G||G.user<0)return;if(k==='shoot'){IN.shootHeld=false;const me=userP();if(me&&me.act==='shot'&&!me.released)releaseShot(me)}}
function updateButtons(){const pad=$('#pn3pad');if(!pad||!G)return;const onO=G.off===G.user;const set=(sel,txt,sub)=>{const b=pad.querySelector(sel);if(b&&b.dataset.txt!==txt){b.dataset.txt=txt;b.innerHTML=`<b>${txt}</b>${sub?`<small>${sub}</small>`:''}`}};
  if(G.phase==='ft'&&G.ft?.shooter.t===G.user){set('.b-shoot','SHOOT FT','tap on the line');return}
  set('.b-shoot',onO?'SHOOT':'BLOCK',onO?'hold • release':'jump & contest');set('.b-pass',onO?'PASS':'SWITCH');set('.b-move',onO?'CROSS':'STEAL');pad.classList.toggle('defense',!onO)}

/* ---------- messages ---------- */
function say(t,c='#fff',big=false){const m=$('#pn3msg');if(!m)return;m.innerHTML=`<b style="color:${c}">${esc(t)}</b>`;m.className='pn3-msg show'+(big?' big':'');clearTimeout(say.t);say.t=setTimeout(()=>m.className='pn3-msg',big?1900:1300)}
function feed(t){const f=$('#pn3feed');if(!f)return;const d=document.createElement('div');d.textContent=t;f.prepend(d);while(f.children.length>3)f.lastChild.remove();setTimeout(()=>d.classList.add('fade'),3600);setTimeout(()=>d.remove(),4200)}

/* ---------- phases ---------- */
function setPhase(p,t=0){G.phase=p;G.phaseT=t}
function giveBall(p){const b=G.ball;b.state='held';b.owner=p;b.x=p.x;b.y=p.y;b.z=3;G.off=p.t;G.lastTouch=p.t;p.hold=0;p.ai=.35+rnd()*.3;if(G.user===p.t)G.ctl[p.t]=p}
function changePoss(t){if(G.off!==t){G.off=t;G.shot=S.shotClock||0;G.run[t]++;G.run[opp(t)]=0}else G.shot=S.shotClock||0}
function inbound(t,where='baseline',delay=1){
  // the team t gets the ball out of bounds. Baseline = under the basket it defends.
  const b=G.ball;b.state='dead';b.owner=null;changePoss(t);const pg=team(t)[0];
  const ownRim=RIM_X[opp(t)];G.inb={t,timer:delay,spot:where==='baseline'?{x:ownRim-DIR[t]*-1*0,y:RIM_Y+6}:{x:clamp(pg.x,10,84),y:-1}};
  if(where==='baseline'){G.inb.spot={x:ownRim>47?93:1,y:RIM_Y+7}}
  if(where==='half'){G.inb.spot={x:47,y:-1}}
  setPhase('inbound',delay);
}
function endQuarterCheck(){if(G.clock>0)return false;G.clock=0;if(G.ball.state==='shot')return false;// let the shot land first
  SFX.buzzer();vib(60);
  const qi=Math.min(3,G.q-1);if(G.q<=4){G.qScores[0][qi]=G.score[0]-G.qScores[0].slice(0,qi).reduce((a,b)=>a+b,0);G.qScores[1][qi]=G.score[1]-G.qScores[1].slice(0,qi).reduce((a,b)=>a+b,0)}
  if(G.q>=4&&G.score[0]!==G.score[1]){finish();return true}
  const label=G.q===2?'HALFTIME':G.q>=4?'END OF REGULATION — OVERTIME!':`END OF ${ord(G.q)}`;say(label,'#fbbf24',true);
  G.q++;G.clock=G.q>4?Math.max(60,Math.round(G.qlen/2)):G.qlen;if(G.q===3)G.fouls=[0,0];if(G.q>4)G.ot++;
  G.ball.state='dead';G.ball.owner=null;const t=G.arrow;G.arrow=opp(G.arrow);
  setPhase('break',2.4);G.nextInb=t;return true}
const ord=q=>q>4?(q===5?'OT':`${q-4}OT`):['1ST','2ND','3RD','4TH'][q-1];

/* ---------- movement ---------- */
function steer(p,tx,ty,maxSp,dt,accel=9){
  tx=clamp(tx,.6,L-.6);ty=clamp(ty,.6,W-.6);const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
  let want=d<.15?0:Math.min(maxSp,d*3.4);if(p.stun>0)want*=.25;
  const wx=d?dx/d*want:0,wy=d?dy/d*want:0,k=Math.min(1,dt*accel);p.vx+=(wx-p.vx)*k;p.vy+=(wy-p.vy)*k;
}
function speedOf(p,sprint){let s=13.2+(p.r.spd-60)*.085;if(sprint)s*=1.32;if(G.ball.owner===p)s*=.9;if(p.burst>0)s*=1.45;return s}
function integrate(dt){
  for(const p of G.players){p.x+=p.vx*dt;p.y+=p.vy*dt;const sp=Math.hypot(p.vx,p.vy);p.anim+=sp*dt*.9;if(sp>.6)p.face=p.vx>=0?1:-1;
    p.stun=Math.max(0,p.stun-dt);p.burst=Math.max(0,p.burst-dt);p.reach=Math.max(0,(p.reach||0)-dt);
    if(p.z>0||p.vz>0){p.vz-=34*dt;p.z+=p.vz*dt;if(p.z<=0){p.z=0;p.vz=0;if(p.act==='jump')p.act=null}}
    p.x=clamp(p.x,-1.5,L+1.5);p.y=clamp(p.y,-1.5,W+1.5);if(p!==userP()){p.x=clamp(p.x,.4,L-.4);p.y=clamp(p.y,.4,W-.4)}}
  // body collisions — this is what makes screens and post-ups work
  const ps=G.players;for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=2.1;if(d<min&&d>0.001){const push=(min-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;
    if(a.t!==b.t){const def=a.t===G.off?b:a,off=a.t===G.off?a:b;if(G.ball.owner!==off&&def!==userP()&&Math.hypot(def.vx,def.vy)>6){def.vx*=.55;def.vy*=.55}}}}
}

/* ---------- offense AI ---------- */
function spot(t,i,p){const rx=RIM_X[t],d=DIR[t];const S5=[[24,25],[19.5,6.5],[19.5,43.5],[2.6,3.2],[8,33]];let[ox,oy]=S5[i];
  // light motion so nobody stands still
  const wob=Math.sin(G.time*0.6+i*1.7)*1.6;return{x:rx-d*ox+(i===0?0:wob*.6),y:oy+(i===4?wob:0)}}
function offBall(t,dt){const h=G.ball.owner,rx=RIM_X[t],d=DIR[t];
  const inb=G.phase==='inbound'&&G.inb&&G.inb.t===t?team(t)[0]:null;for(const p of team(t)){if(p===h||p===inb)continue;
    let s=spot(t,p.i,p);
    p.cutT-=dt;if(p.cutT<=0&&!p.cut){p.cut=1.4;p.cutT=5+rnd()*6}
    if(p.cut>0){p.cut-=dt;s={x:rx-d*4,y:RIM_Y+(p.y<25?-4:4)};if(p.cut<=0)p.cut=0}
    // pick-and-roll: the big sets a screen for the handler, then rolls
    if(p.i===4&&h&&G.pnr){if(G.pnr.stage==='set'){s={x:h.x+d*2.4,y:h.y+(h.y<25?2.4:-2.4)};if(Math.hypot(p.x-s.x,p.y-s.y)<1.6){G.pnr.t-=dt;if(G.pnr.t<=0)G.pnr.stage='roll'}}else{s={x:rx-d*5,y:RIM_Y}}}
    // transition: sprint up the floor when far away
    const far=Math.abs(p.x-s.x)>22;steer(p,s.x,s.y,speedOf(p,far),dt)}}
function openness(p){let m=99;for(const d of team(opp(p.t))){const q=Math.hypot(d.x-p.x,d.y-p.y);if(q<m)m=q}return m}
function rimDist(p){return Math.hypot(RIM_X[p.t]-p.x,RIM_Y-p.y)}
function aiHandler(p,dt){
  const t=p.t,rx=RIM_X[t],d=DIR[t],dist=rimDist(p),open=openness(p),sc=S.shotClock?G.shot:99,q=G.diff.cpu*(isUser(opp(t))?1:.97);
  p.ai-=dt;p.hold=(p.hold||0)+dt;
  if(!G.pnr&&p.i<=1&&rnd()<dt*.08&&dist>18)G.pnr={stage:'set',t:.6,team:t};
  if(G.pnr&&G.pnr.team!==t)G.pnr=null;
  let tx=p.x,ty=p.y;
  if(p.mode==='drive'){tx=rx-d*2.5;ty=RIM_Y+(p.y<RIM_Y?-1.5:1.5);const block=nearestDef(p);if(block&&block.d<3&&Math.sign(block.p.x-p.x)===d){ty=p.y+(p.y<RIM_Y?-6:6)}}
  else if(p.mode==='reset'){const s=spot(t,0);tx=s.x;ty=s.y;if(Math.hypot(p.x-tx,p.y-ty)<3)p.mode=null}
  else{const s=spot(t,p.i===0?0:p.i);tx=lerp(p.x,s.x,.5);ty=lerp(p.y,s.y,.5);if(Math.abs(p.x-rx)>40){tx=rx-d*24;ty=RIM_Y}}
  steer(p,tx,ty,speedOf(p,Math.abs(p.x-rx)>40||p.mode==='drive'&&open>4),dt);
  if(p.ai>0)return;p.ai=.32+rnd()*.42;
  if(Math.abs(p.x-rx)>32){p.mode=null;return}        // bring it up first
  const three=dist>=THREE,rating=three?p.r.three:dist<9?p.r.fin:p.r.sht;
  if(dist<5.5){return startLayup(p)}
  const wantShot=(open>5&&dist<=24&&rating>=(three?60:52)&&rnd()<.42*q)||(open>8&&dist<THREE+1&&rnd()<.6)||(sc<4&&sc>0);
  if(wantShot&&p.hold>.7){return dist<9?startLayup(p):beginShot(p)}
  if(dist<THREE+1.5&&open>=4&&p.hold>.3&&rnd()<.6*q*(rating/70)){return dist<9?startLayup(p):beginShot(p)}
  if(open>=3&&dist<THREE+1&&p.hold>1.3&&rnd()<.4*q){return dist<9?startLayup(p):beginShot(p)}
  if(p.hold>1.6&&dist<9&&rnd()<.55){return startLayup(p)}
  if(p.hold>2.4&&dist<THREE+2&&open>2.5&&rnd()<.45){return beginShot(p)}
  const mate=bestPassTarget(p,null);
  if(mate&&((open<3.4&&mate.score>1.2&&rnd()<.62)||(p.hold>2.6&&rnd()<.5)||(openness(mate.p)>7&&rimDist(mate.p)<12&&rnd()<.75))){return doPass(p,mate.p)}
  if(open>2.8&&dist<26&&rnd()<.42+(p.r.fin-60)*.006){p.mode='drive';return}
  if(p.mode==='drive'&&open<2.4&&rnd()<.5){p.mode='reset'}
}
function nearestDef(p){let best=null,bd=99;for(const d of team(opp(p.t))){const q=Math.hypot(d.x-p.x,d.y-p.y);if(q<bd){bd=q;best=d}}return best?{p:best,d:bd}:null}
function bestPassTarget(from,dir){let best=null;for(const m of team(from.t)){if(m===from)continue;const dx=m.x-from.x,dy=m.y-from.y,d=Math.hypot(dx,dy);if(d<3)continue;let s=openness(m)*.35-d*.025+(rimDist(m)<12?.8:0);
  if(dir&&dir.m>.3){const cos=(dx*dir.x+dy*dir.y)/(d*Math.hypot(dir.x,dir.y));s+=cos*3}
  if(!best||s>best.score)best={p:m,score:s}}return best}

/* ---------- defense AI ---------- */
function defense(t,dt){const o=opp(t),rx=RIM_X[o],h=G.ball.owner;const hand=h&&h.t===o?h:null;const hDist=hand?rimDist(hand):99;
  let helper=null;if(hand&&hDist<16){let bd=99;for(const d of team(t)){if(d.i===hand.i)continue;const q=Math.hypot(d.x-rx,d.y-RIM_Y);if(q<bd){bd=q;helper=d}}}
  for(const d of team(t)){if(isUser(t)&&d===userP())continue;
    const man=team(o)[d.i];let tx,ty;
    if(G.ball.state==='loose'||G.ball.state==='shot'){const b=G.ball;if(Math.hypot(b.x-d.x,b.y-d.y)<18){tx=b.x;ty=b.y}else{tx=lerp(man.x,rx,.4);ty=lerp(man.y,RIM_Y,.4)}}
    else{const vx=rx-man.x,vy=RIM_Y-man.y,n=Math.hypot(vx,vy)||1;const on=man===hand;let g=on?3:clamp(n*.28,3.5,9);
      if(!on&&hand){const bx=hand.x-man.x,by=hand.y-man.y,bn=Math.hypot(bx,by)||1;tx=man.x+vx/n*g+bx/bn*Math.min(4,bn*.15);ty=man.y+vy/n*g+by/bn*Math.min(4,bn*.15)}else{tx=man.x+vx/n*g;ty=man.y+vy/n*g}
      if(d===helper){tx=lerp(tx,rx-DIR[o]*3,.7);ty=lerp(ty,RIM_Y,.7)}
      if(Math.abs(man.x-rx)>47){tx=lerp(tx,rx-DIR[o]*20,.5)}}
    const q=d.r.def*.6+d.r.spd*.4;steer(d,tx,ty,speedOf(d,Math.abs(d.x-tx)>12)*(.92+(q-60)*.004),dt,7+(q-60)*.06);d.face=Math.sign(man.x-d.x)||d.face;
    // CPU on-ball pressure: reach-ins and contests
    if(!isUser(t)&&hand&&man===hand&&G.ball.owner===hand&&!hand.act){const dd=Math.hypot(hand.x-d.x,hand.y-d.y);if(dd<3.1&&hand.burst<=0&&Math.hypot(hand.vx,hand.vy)<7&&rnd()<dt*.022*G.diff.steal*(isUser(o)?1:.7)*(d.r.def/hand.r.hnd)){
      if(rnd()<.7){stolen(d,hand)}else foul(d,hand,false)}}
    if(!isUser(t)&&G.ball.state==='held'&&G.ball.owner?.act==='shot'&&man===G.ball.owner&&Math.hypot(man.x-d.x,man.y-d.y)<5&&!d.z&&rnd()<.6)jump(d,10)}}

/* ---------- actions ---------- */
function jump(p,v=11){if(p.z>0)return;p.vz=v+(p.r.spd-60)*.05;p.z=.01;if(!p.act)p.act='jump'}
function contestJump(p){jump(p,11.5);p.contestUntil=G.time+.6;vib(12)}
function switchPlayer(manual){if(G.user<0)return;const t=G.user;if(G.off===t)return;const b=G.ball;let best=null,bd=99;for(const p of team(t)){const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<bd&&p!==G.ctl[t]){bd=d;best=p}}if(best){G.ctl[t]=best;if(manual)vib(8)}}
function dribbleMove(p){if(p.burst>0||p.moveCD>G.time)return;p.burst=.5;p.moveCD=G.time+1.1;SFX.dribble();vib(14);const nd=nearestDef(p);
  if(nd&&nd.d<4.2){const edge=(p.r.hnd-nd.p.r.def)*.008+.24;if(rnd()<edge){nd.p.stun=.9;nd.p.vx*=.2;nd.p.vy*=.2;say('ANKLES! '+p.last.toUpperCase(),'#38bdf8');SFX.crowd(.07)}else if(rnd()<.07){stolen(nd.p,p);return}}
  say(['CROSSOVER','BETWEEN THE LEGS','HESI','SPIN'][Math.floor(rnd()*4)],'#e2e8f0')}
function attemptSteal(p){if(p.reach>0)return;p.reach=.45;vib(10);const h=G.ball.owner;if(!h||h.t===p.t)return;const d=Math.hypot(h.x-p.x,h.y-p.y);
  const spam=G.time-(p.lastReach||-9)<.9;p.lastReach=G.time;
  if(d<3.6){const ch=clamp(.2+(p.r.def-h.r.hnd)*.006-(h.burst>0?.12:0),.06,.42);if(rnd()<ch)return stolen(p,h);if(rnd()<(spam?.38:.14))return foul(p,h,false);say('REACH','#94a3b8')}else say('TOO FAR','#94a3b8')}
function stolen(d,h){const b=G.ball;b.state='loose';b.owner=null;b.x=h.x;b.y=h.y;b.z=2.5;const a=Math.atan2(h.y-d.y,h.x-d.x)+(rnd()-.5);b.vx=Math.cos(a)*-9;b.vy=Math.sin(a)*-9;b.vz=4;b.lastTeam=h.t;b.stealBy=d;h.box.to++;d.box.stl++;
  say(isUser(d.t)?'STEAL!':'STRIPPED!',isUser(d.t)?'#22c55e':'#f87171');SFX.crowd(.08);vib(30);G.pnr=null;h.act=null;G.meter=null}
function foul(d,o,shooting,shotPts=2,made=false){d.box.pf++;G.fouls[d.t]++;SFX.whistle();vib(25);G.meter=null;
  if(shooting){const n=made?1:shotPts;say(made?'AND ONE!':`FOUL • ${n} SHOTS`,'#fbbf24',made);feed(`Foul on ${d.name} (#${d.num})`);startFT(o,n);return}
  if(G.fouls[d.t]>=7){say('BONUS • 2 SHOTS','#fbbf24');feed(`Team foul #${G.fouls[d.t]} — ${G.teams[d.t].abbr} in the bonus`);startFT(o,2);return}
  say('FOUL','#fbbf24');feed(`Foul on ${d.name} (#${d.num})`);const b=G.ball;b.state='dead';b.owner=null;inbound(o.t,'side',1.1)}
function doPass(from,to){const b=G.ball,d=Math.hypot(to.x-from.x,to.y-from.y);b.state='pass';b.owner=null;b.from=from;b.to=to;b.x=from.x;b.y=from.y;b.z=4;b.t=0;b.dur=.16+d/48;b.sx=from.x;b.sy=from.y;b.lastTeam=from.t;from.hold=0;
  // lead the receiver a little
  b.ex=to.x+to.vx*b.dur*.6;b.ey=to.y+to.vy*b.dur*.6;G.lastPass={p:from,t:G.time};
  for(const df of team(opp(from.t))){const seg=segDist(df.x,df.y,b.sx,b.sy,b.ex,b.ey);if(seg<1.3&&Math.hypot(df.x-b.sx,df.y-b.sy)<d){const ch=clamp(.08*(df.r.def/70)*(isUser(df.t)?1:G.diff.steal*.8),.03,.3);if(rnd()<ch){b.intercept=df;break}}}
  if(isUser(from.t))G.ctl[from.t]=to;SFX.dribble()}
function userPass(me){const t=bestPassTarget(me,inputVec());if(t)doPass(me,t.p)}
function segDist(px,py,ax,ay,bx,by){const vx=bx-ax,vy=by-ay,l=vx*vx+vy*vy||1;const k=clamp(((px-ax)*vx+(py-ay)*vy)/l,0,1);return Math.hypot(px-(ax+vx*k),py-(ay+vy*k))}

function contestOf(s){let c=0,who=null;for(const d of team(opp(s.t))){const dd=Math.hypot(d.x-s.x,d.y-s.y);let v=clamp((6.2-dd)/4.6,0,1);if(d.z>.4||G.time<(d.contestUntil||0))v=Math.min(1,v*1.35+.08);v*=.85+d.r.def*.003+(d.h-s.h)*.12;if(v>c){c=v;who=d}}return{c:clamp(c,0,1),who}}
function beginShot(p){if(p.act)return;p.act='shot';p.actT=0;p.released=false;p.vx*=.2;p.vy*=.2;p.shotFrom={x:p.x,y:p.y,dist:rimDist(p)};p.pts=p.shotFrom.dist>=THREE?3:2;
  if(isUser(p.t)&&G.ctl[p.t]===p){const r=p.pts===3?p.r.three:p.r.sht;const gw=clamp(.05*G.diff.green*(.7+r/170)*(p.shotFrom.dist>24?.7:1),.018,.11);G.meter={v:0,green:gw,target:.86};vib(8)}else{G.meter=G.meter&&G.meter.p===p?G.meter:null}
  p.cpuRelease=.8+(rnd()-.5)*.28}
function startLayup(p){if(p.act)return;p.act='layup';p.actT=0;p.released=false;const run=Math.hypot(p.vx,p.vy);p.dunk=(p.h>=6.25||p.r.spd>=82)&&rimDist(p)<6.5&&(run>9||p.h>=6.6)&&rnd()<.75;p.pts=2;p.shotFrom={x:p.x,y:p.y,dist:rimDist(p)};jump(p,p.dunk?14:11)}
function releaseShot(p){if(p.released)return;p.released=true;const tgt=G.meter&&isUser(p.t)?G.meter:null;let timing='good';
  if(tgt){const off=tgt.v-tgt.target;if(Math.abs(off)<=tgt.green)timing='green';else if(Math.abs(off)<=tgt.green*2.6)timing='good';else timing=off<0?'early':'late';G.lastTiming={timing,off};G.meter=null}
  else{const r=rnd(),gch=.15*G.diff.cpu;timing=r<gch?'green':r<gch+.6?'good':r<.88?'early':'late'}
  launch(p,timing)}
function launch(p,timing){const dist=p.shotFrom.dist,con=contestOf(p),c=con.c,layup=p.act==='layup',r=layup?p.r.fin:p.pts===3?p.r.three:p.r.sht;
  let base=layup?(p.dunk?.92:.7):dist<8?.62:dist<14?.53:dist<THREE?.48:dist<24?.41:Math.max(.1,.41-(dist-24)*.035);
  const rf=clamp(r/70,.62,1.36);let pr;
  if(layup)pr=base*rf*(1-c*(p.dunk?.3:.45));
  else if(timing==='green')pr=clamp(.97-c*.42,.45,.98);
  else if(timing==='good')pr=base*rf*(1-c*.4);
  else pr=base*rf*.6*(1-c*.4);
  if(!isUser(p.t))pr*=clamp(G.diff.cpu,.7,1.3)*(timing==='green'?1:.98);
  pr=clamp(pr,.02,.985);
  // block check
  let blocked=null;if(con.who){const bd=Math.hypot(con.who.x-p.x,con.who.y-p.y);if(bd<3.4&&(con.who.z>.6||G.time<(con.who.contestUntil||0))){const bc=clamp(.12+(con.who.r.def-60)*.005+(con.who.h-p.h)*.12+(layup?.06:0)-(p.dunk?.05:0),.04,.42);if(rnd()<bc)blocked=con.who}}
  const make=!blocked&&rnd()<pr;
  // shooting foul on heavy contact
  let fouled=null;if(con.who&&c>.6&&rnd()<(layup?.16:.06))fouled=con.who;
  p.box.fga++;if(p.pts===3)p.box.tpa++;
  const b=G.ball;b.state='shot';b.owner=null;b.shooter=p;b.make=make;b.pts=p.pts;b.blocked=blocked;b.fouled=fouled;b.timing=timing;b.t=0;b.sx=p.x+DIR[p.t]*.6;b.sy=p.y;b.sz=layup?(p.dunk?9.5:8.5):7.6+(p.h-6);
  b.dur=layup?(p.dunk?.22:.42):.78+dist*.022;b.apex=layup?(p.dunk?10.6:11.6):Math.max(14,11+dist*.32);b.lastTeam=p.t;b.ex=RIM_X[p.t];b.ey=RIM_Y;
  if(make){const ox=(rnd()-.5)*.3;b.ex+=ox}else{b.ex+=(rnd()-.5)*1.6;b.ey+=(rnd()-.5)*1.4}
  G.pnr=null;p.act=layup?p.act:'follow';p.actT=0;
  if(timing==='green'&&isUser(p.t)){say('GREEN RELEASE','#22c55e');SFX.green();vib(35)}
  else if(isUser(p.t)&&!layup)say(timing==='good'?(c>.5?'CONTESTED':'GOOD RELEASE'):timing==='early'?'EARLY RELEASE':'LATE RELEASE',timing==='good'?'#e2e8f0':'#f59e0b');
  if(blocked){b.dur=.14;b.apex=b.sz+1}
}
function scored(p,pts,how){G.score[p.t]+=pts;p.box.pts+=pts;if(how!=='ft'){p.box.fgm++;if(pts===3)p.box.tpm++}
  if(how!=='ft'&&G.lastPass&&G.lastPass.p.t===p.t&&G.lastPass.p!==p&&G.time-G.lastPass.t<4){G.lastPass.p.box.ast++}
  G.run[p.t]+=pts;G.run[opp(p.t)]=0;cam.shake=pts===3?.35:.2;
  if(how!=='ft'){const big=pts===3||how==='dunk';say(how==='dunk'?`${p.last.toUpperCase()} THROWS IT DOWN!`:pts===3?`${p.last.toUpperCase()} FROM DEEP!`:`${p.last.toUpperCase()} +${pts}`,isUser(p.t)||G.user<0?'#fbbf24':'#f87171',big);SFX.swish();SFX.crowd(big?.12:.07);if(isUser(p.t))vib(big?60:30)}
  if(G.run[p.t]>=8&&how!=='ft'&&!G.runSaid){G.runSaid=true;feed(`${G.teams[p.t].abbr} on an ${G.run[p.t]}-0 run`)}else if(G.run[p.t]<8)G.runSaid=false}

/* ---------- free throws ---------- */
function startFT(shooter,n){const b=G.ball;b.state='dead';b.owner=null;G.ft={shooter,n,i:0,stage:'setup',t:1.1,stop:null,marker:0,dir:1};setPhase('ft');
  const t=shooter.t,rx=RIM_X[t],d=DIR[t];shooter.x=rx-d*14.25;shooter.y=RIM_Y;shooter.vx=shooter.vy=0;
  const lane=[[-3.5,-7],[-3.5,7],[-7,-7],[-7,7]];let k=0;
  for(const p of G.players){if(p===shooter)continue;if(k<4){p.x=rx-d*(-lane[k][0]+3);p.y=RIM_Y+lane[k][1];k++}else{p.x=rx-d*(24+(p.t===t?2:-2));p.y=RIM_Y+(p.i%2?8:-8)}p.vx=p.vy=0}
  // the rest stand behind the arc
  let j=0;for(const p of G.players){if(p===shooter)continue;if(j++<4)continue;p.x=rx-d*(22+j);p.y=RIM_Y+(j%2?10:-10)}
}
function ftUpdate(dt){const F=G.ft;if(!F)return;F.t-=dt;
  if(F.stage==='setup'&&F.t<=0){F.stage='aim';F.t=isUser(F.shooter.t)?6:.8;F.marker=0;F.dir=1}
  else if(F.stage==='aim'){F.marker+=F.dir*dt*(1.05+(.85-F.shooter.r.sht/100));if(F.marker>1){F.marker=1;F.dir=-1}if(F.marker<0){F.marker=0;F.dir=1}if(F.t<=0)ftStop()}
  else if(F.stage==='flight'&&F.t<=0){const p=F.shooter;p.box.fta++;F.i++;if(F.make){p.box.ftm++;scored(p,1,'ft');SFX.swish();say(`FREE THROW ${F.i}/${F.n} • GOOD`,'#e2e8f0')}else{SFX.rim();say(`FREE THROW ${F.i}/${F.n} • MISS`,'#94a3b8')}
    if(F.i<F.n){F.stage='setup';F.t=.7;G.ball.state='dead'}else{const last=F.make;G.ft=null;if(last){inbound(opp(p.t),'baseline',1)}else{setPhase('live');const b=G.ball;b.state='loose';b.x=RIM_X[p.t];b.y=RIM_Y;b.z=10;b.vx=-DIR[p.t]*(5+rnd()*5);b.vy=(rnd()-.5)*10;b.vz=6;b.lastTeam=p.t;G.shot=S.shotClock||0}}}}
function ftStop(){const F=G.ft;if(!F||F.stage!=='aim')return;const p=F.shooter;const zone=.06+p.r.sht/1400;let pr;
  if(isUser(p.t)){const off=Math.abs(F.marker-.5);pr=off<zone?.95:off<zone*2.5?.72:.32;if(off<zone){vib(25);SFX.green()}}else pr=clamp(.45+p.r.sht/230,.45,.9)*clamp(G.diff.cpu,.8,1.1);
  F.make=rnd()<pr;F.stage='flight';F.t=.9;G.ball.state='ftflight';G.ball.ft={sx:p.x+DIR[p.t]*.5,sy:p.y,t:0,make:F.make,ex:RIM_X[p.t],ey:RIM_Y}}

/* ---------- ball ---------- */
function ballUpdate(dt){const b=G.ball;
  if(b.state==='held'&&b.owner){const p=b.owner;p.dribT=(p.dribT||0)+dt*(Math.hypot(p.vx,p.vy)>3?3.2:2.2);const ph=p.dribT%1;const dz=Math.abs(Math.sin(ph*Math.PI));if(ph<(p.lastPh||0))SFX.dribble();p.lastPh=ph;
    const hand=p.act==='shot'||p.act==='layup'?0:1;b.x=p.x+p.face*.9*hand;b.y=p.y+.5;b.z=p.act==='shot'?6+p.h-6+p.z:p.act==='layup'?7+p.z:.4+dz*2.6;
    // out of bounds on the handler
    if(p.x<0||p.x>L||p.y<0||p.y>W){p.box.to++;say('OUT OF BOUNDS','#f87171');SFX.whistle();inbound(opp(p.t),'side',1.1);return}
    return}
  if(b.state==='pass'){b.t+=dt;const k=clamp(b.t/b.dur,0,1);b.x=lerp(b.sx,b.ex,k);b.y=lerp(b.sy,b.ey,k);b.z=4+Math.sin(k*Math.PI)*1.6;
    if(b.intercept&&k>.45&&Math.hypot(b.intercept.x-b.x,b.intercept.y-b.y)<2.8){const df=b.intercept;b.intercept=null;b.from.box.to++;df.box.stl++;giveBall(df);changePoss(df.t);say(isUser(df.t)?'PICKED OFF!':'PASS STOLEN','#f87171');SFX.crowd(.08);vib(30);return}
    const r=b.to;if(k>=1||Math.hypot(r.x-b.x,r.y-b.y)<1.4&&k>.5){giveBall(r);return}return}
  if(b.state==='shot'){b.t+=dt;const k=clamp(b.t/b.dur,0,1);b.x=lerp(b.sx,b.ex,k);b.y=lerp(b.sy,b.ey,k);
    const z0=b.sz,z1=RIM_Z,a=b.apex;b.z=(1-k)*(1-k)*z0+2*(1-k)*k*(2*a-(z0+z1)/2)+k*k*z1;
    if(b.blocked&&k>=1){const d=b.blocked;d.box.blk++;b.state='loose';b.vx=-DIR[b.lastTeam]*(10+rnd()*8);b.vy=(rnd()-.5)*14;b.vz=5;say(isUser(d.t)?'REJECTED!':'BLOCKED','#38bdf8',true);SFX.block();SFX.crowd(.1);vib(40);cam.shake=.3;b.blocked=null;b.shooter.act=null;return}
    if(k>=1){const s=b.shooter;s.act=null;G.shot=S.shotClock||0;
      if(b.make){scored(s,b.pts,s.dunk&&b.pts===2&&b.dur<.3?'dunk':'fg');b.state='net';b.t=0;b.x=b.ex;b.y=b.ey;b.z=RIM_Z;
        if(b.fouled){foul(b.fouled,s,true,b.pts,true);return}
        b.after=opp(s.t);return}
      SFX.rim();if(b.fouled){foul(b.fouled,s,true,b.pts,false);return}
      b.state='loose';const ang=(DIR[s.t]>0?Math.PI:0)+(rnd()-.5)*2.2;const sp=5+rnd()*9;b.vx=Math.cos(ang)*sp;b.vy=Math.sin(ang)*sp;b.vz=6+rnd()*7;return}
    return}
  if(b.state==='net'){if(!G.netShake)G.netShake={side:b.ex>47?1:0,t:.45};b.t+=dt;b.z=Math.max(5.5,RIM_Z-b.t*14);if(b.t>.35){inbound(b.after,'baseline',.9)}return}
  if(b.state==='ftflight'){const f=b.ft;f.t+=G.dt;const k=clamp(f.t/.8,0,1);b.x=lerp(f.sx,f.ex,k);b.y=lerp(f.sy,f.ey,k);b.z=(1-k)*(1-k)*8+2*(1-k)*k*15+k*k*RIM_Z;return}
  if(b.state==='loose'){b.vz-=32*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;if(b.z<=.4){b.z=.4;if(Math.abs(b.vz)>3){b.vz=-b.vz*.52;SFX.dribble()}else b.vz=0;b.vx*=.82;b.vy*=.82}
    b.vx*=1-dt*.4;b.vy*=1-dt*.4;
    if(b.x<-.5||b.x>L+.5||b.y<-.5||b.y>W+.5){SFX.whistle();say('OUT OF BOUNDS','#94a3b8');inbound(opp(b.lastTeam),'side',1.1);return}
    // rebounds / recoveries
    let best=null,bs=0;for(const p of G.players){const d=Math.hypot(p.x-b.x,p.y-b.y);const reach=p.h+1.6+p.z;if(d<2.3&&b.z<reach){const s=(p.r.reb/70)*(1+(p.h-6.3)*.35)*(p.t===opp(b.lastTeam)?1.25:1)*(1+p.z*.2)*rnd();if(s>bs){bs=s;best=p}}}
    if(best&&(b.z<best.h+1||rnd()<.35)){const off=best.t===b.lastTeam;if(b.wasShot!==false){best.box.reb++}giveBall(best);if(!off)changePoss(best.t);else G.shot=S.shotClock||0;
      if(b.stealBy){b.stealBy=null}else say(off?'OFFENSIVE BOARD':'REBOUND',off?'#38bdf8':'#e2e8f0');G.pnr=null;
      if(isUser(best.t))G.ctl[best.t]=best;return}}
}
function chaseLoose(dt){const b=G.ball;
  // predict where the ball comes down
  let px=b.x,py=b.y;if(b.vz>0){const tt=(b.vz+Math.sqrt(b.vz*b.vz+64*Math.max(0,b.z-5)))/32;px=b.x+b.vx*tt;py=b.y+b.vy*tt}
  const order=G.players.map(p=>({p,d:Math.hypot(p.x-px,p.y-py)})).sort((a,c)=>a.d-c.d);
  order.forEach((o,k)=>{const p=o.p;if(isUser(p.t)&&p===userP())return;if(k<4||o.d<12){steer(p,px+(p.t===b.lastTeam?0:DIR[b.lastTeam]*.8),py,speedOf(p,true),dt);if(o.d<4&&b.z>4&&b.z<12&&!p.z&&rnd()<dt*3)jump(p,10)}else{const s=spot(p.t,p.i);steer(p,lerp(p.x,s.x,.5),lerp(p.y,s.y,.5),speedOf(p,false),dt)}})}

/* ---------- user control ---------- */
function userMove(dt){const me=userP();if(!me)return;const v=inputVec();
  if(me.act==='shot'){me.vx*=.8;me.vy*=.8;return}
  if(me.act==='layup'){return}
  const sp=speedOf(me,sprinting());const tx=me.x+v.x*sp,ty=me.y+v.y*sp;
  if(v.m>0.05){const k=Math.min(1,dt*11);me.vx+=(v.x*sp*v.m-me.vx)*k;me.vy+=(v.y*sp*v.m-me.vy)*k}else{me.vx*=1-Math.min(1,dt*8);me.vy*=1-Math.min(1,dt*8)}
  // drive the lane and press shoot near the rim = layup / dunk
  if(G.ball.owner===me&&me.act==='shot'&&false)void tx;
  // defense assist: hold-steer near your man is "sticky"
  if(G.off!==me.t&&v.m<.05){const man=G.ball.owner&&G.ball.owner.t!==me.t?team(opp(me.t))[me.i]:null;if(man){const rx=RIM_X[man.t],vx=rx-man.x,vy=RIM_Y-man.y,n=Math.hypot(vx,vy)||1;steer(me,man.x+vx/n*3,man.y+vy/n*3,speedOf(me,false)*.8,dt,5)}}
}

/* ---------- main update ---------- */
function update(dt){G.dt=dt;G.time=(G.time||0)+dt;pollPad();
  if(G.phase==='tip'){G.phaseT-=dt;const b=G.ball;b.x=47;b.y=25;b.z=4+Math.max(0,(1.4-G.phaseT))*9;
    if(G.phaseT<=.3&&!G.tipped){G.tipped=true;const c0=team(0)[4],c1=team(1)[4];jump(c0,13);jump(c1,13);const w=rnd()<.5+(c0.r.spd+c0.h*10-c1.r.spd-c1.h*10)*.006?0:1;G.arrow=opp(w);G.tipWin=w}
    if(G.phaseT<=0){const w=G.tipWin??0;giveBall(team(w)[0]);changePoss(w);setPhase('live');say(`${G.teams[w].abbr} WINS THE TIP`,'#e2e8f0')}
    integrate(dt);return}
  if(G.phase==='break'){G.phaseT-=dt;if(G.phaseT<=0){const t=G.nextInb;inbound(t,'half',.9);say(`${ord(G.q)} ${G.q>4?'':'QUARTER'}`.trim(),'#fbbf24')}integrate(dt);return}
  if(G.phase==='inbound'){G.phaseT-=dt;const I=G.inb;const pg=team(I.t)[0];steer(pg,I.spot.x,clamp(I.spot.y,0,W),speedOf(pg,true),dt);offBall(I.t,dt);defense(opp(I.t),dt);if(G.user>=0&&G.off!==G.user)userMove(dt);integrate(dt);
    G.ball.x=pg.x;G.ball.y=pg.y;G.ball.z=3;
    if(G.phaseT<=0&&Math.hypot(pg.x-I.spot.x,pg.y-clamp(I.spot.y,0,W))<4){const mate=bestPassTarget(pg,null);setPhase('live');if(mate&&I.spot.y<0){giveBall(pg);doPass(pg,mate.p)}else{giveBall(pg)}if(isUser(I.t))G.ctl[I.t]=G.ball.owner||G.ball.to||pg;else if(G.user>=0){G.ctl[G.user]=team(G.user)[0]}G.inb=null}
    return}
  if(G.phase==='ft'){ftUpdate(dt);if(G.ball.state==='ftflight')ballUpdate(dt);for(const p of G.players){p.vx*=.8;p.vy*=.8}integrate(dt);return}
  if(G.phase!=='live')return;
  // clocks
  G.clock-=dt;if(S.shotClock&&G.ball.state!=='shot'&&G.ball.state!=='loose')G.shot-=dt;
  if(G.clock<=0&&endQuarterCheck())return;
  if(S.shotClock&&G.shot<=0&&G.ball.state==='held'){const o=G.ball.owner;o.box.to++;SFX.buzzer();say('SHOT CLOCK VIOLATION','#f87171',true);inbound(opp(o.t),'side',1.2);return}
  const off=G.off,def=opp(off),b=G.ball,h=b.owner;
  // shooting animations
  for(const p of G.players){if(p.act==='shot'){p.actT+=dt;if(!p.released){if(isUser(p.t)&&G.ctl[p.t]===p&&G.meter){G.meter.v=p.actT/.62;if(G.meter.v>=1.22||(!IN.shootHeld&&p.actT>.06))releaseShot(p)}else if(p.actT/.62>=p.cpuRelease)releaseShot(p);if(p.actT>.18&&!p.z&&!p.jumped){p.jumped=true;jump(p,10)}}}
    else if(p.act==='layup'){p.actT+=dt;if(!p.released&&p.actT>(p.dunk?.34:.3)){p.released=true;launch(p,'good')}}
    else if(p.act==='follow'){p.actT+=dt;if(p.actT>.5)p.act=null}
    if(!p.act)p.jumped=false}
  if(b.state==='held'&&h){
    if(isUser(off)&&h===userP()){userMove(dt);
}
    else if(!isUser(off)||G.user<0||h!==userP()){if(isUser(off)&&h!==userP()){G.ctl[off]=h;userMove(dt)}else aiHandler(h,dt)}
    offBall(off,dt);defense(def,dt);if(isUser(def))userMove(dt)}
  else if(b.state==='pass'){offBall(off,dt);defense(def,dt);if(G.user>=0)userMove(dt);const r=b.to;steer(r,lerp(r.x,b.ex,.6),lerp(r.y,b.ey,.6),speedOf(r,false),dt)}
  else if(b.state==='shot'||b.state==='net'){offBall(off,dt);defense(def,dt);if(G.user>=0)userMove(dt);
    // crash the glass while the shot is up
    if(b.state==='shot')for(const p of G.players){if(p===b.shooter||(isUser(p.t)&&p===userP()))continue;if((p.i>=3||rnd()<.2)&&Math.hypot(p.x-RIM_X[b.lastTeam],p.y-RIM_Y)<22)steer(p,RIM_X[b.lastTeam]-DIR[b.lastTeam]*(p.t===b.lastTeam?4:3.2),RIM_Y+(p.i%2?3:-3),speedOf(p,true),dt)}}
  else if(b.state==='loose'){chaseLoose(dt);if(G.user>=0)userMove(dt)}
  ballUpdate(dt);integrate(dt);
  // the user's defender: auto-pick the on-ball defender when possession flips
  if(G.user>=0&&G.off!==G.user&&G.lastOff!==G.off){const hb=G.ball.owner;if(hb)G.ctl[G.user]=team(G.user)[hb.i]}
  G.lastOff=G.off;
}

/* ---------- camera + projection ---------- */
let P={s:14,farY:0,nearY:0};
function setupProjection(){const portrait=VH>VW*1.05;const wFt=portrait?40:Math.min(64,Math.max(46,VW/16));P.s=VW/wFt;P.farY=VH*(portrait?.25:.30);P.nearY=VH*(portrait?.63:.95);P.portrait=portrait;P.wFt=wFt}
function proj(x,y,z=0){const t=clamp(y/W,-.15,1.15),k=.72+.28*t,s=P.s*k;const sy=P.farY+(P.nearY-P.farY)*(t*.82+.18*t*t);return{x:VW/2+(x-cam.x)*s,y:sy-z*s*.93,s}}

/* ---------- rendering ---------- */
let crowdCanvas=null;
function buildCrowd(){const c=document.createElement('canvas');c.width=2400;c.height=260;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,260);g.addColorStop(0,'#05070d');g.addColorStop(1,'#151b2b');x.fillStyle=g;x.fillRect(0,0,2400,260);
  const r=rng(hash(G?.teams?.[0]?.name||'bm27'));const kc=G?.kits?.[0]?.jersey||'#1d4ed8',kc2=G?.kits?.[1]?.jersey||'#dc2626';
  for(let row=0;row<9;row++){const y=40+row*24;for(let i=0;i<220;i++){const px=i*11+(row%2)*5+r()*3;const col=r()<.32?kc:r()<.12?kc2:['#e5e7eb','#9ca3af','#4b5563','#d1d5db','#1f2937','#f59e0b'][Math.floor(r()*6)];x.fillStyle=col;x.globalAlpha=.55+row*.05;x.beginPath();x.arc(px,y,4.3,0,7);x.fill();x.fillRect(px-4,y+4,8,9)}}
  x.globalAlpha=1;x.fillStyle='rgba(0,0,0,.35)';for(let i=0;i<12;i++)x.fillRect(i*200,0,6,260);crowdCanvas=c}
function drawArena(){const g=cx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'#03050a');g.addColorStop(.35,'#0b1020');g.addColorStop(1,'#0b0f19');cx.fillStyle=g;cx.fillRect(0,0,VW,VH);
  if(!crowdCanvas)buildCrowd();const top=P.farY-P.s*7.2,h=P.s*6.4;const off=((cam.x*P.s*.55)%600+600)%600;for(let i=-1;i<Math.ceil(VW/600)+2;i++)cx.drawImage(crowdCanvas,0,0,600,260,i*600-off,top-h*.15,600,h*1.15);
  // scorer's table banner
  const a=proj(-4,-2.5),b=proj(L+4,-2.5);cx.fillStyle='#0f172a';cx.fillRect(a.x,a.y-P.s*1.25,b.x-a.x,P.s*1.25);const k0=G.kits[0].jersey;cx.fillStyle=k0;cx.globalAlpha=.85;cx.fillRect(a.x,a.y-P.s*1.25,b.x-a.x,P.s*.18);cx.globalAlpha=1;
  cx.fillStyle='#e2e8f0';cx.font=`900 ${Math.round(P.s*.62)}px Inter,system-ui,sans-serif`;cx.textBaseline='middle';const lab=`${G.teams[0].name.toUpperCase()} • MSHSAA BASKETBALL MANAGER 27 • ${G.teams[1].name.toUpperCase()} • `;
  const wTxt=cx.measureText(lab).width;let sx=a.x+((-cam.x*P.s*.9)%wTxt);while(sx<b.x){cx.fillText(lab,sx,a.y-P.s*.6);sx+=wTxt}}
function poly(pts,fill,stroke,lw){cx.beginPath();pts.forEach((p,i)=>i?cx.lineTo(p.x,p.y):cx.moveTo(p.x,p.y));cx.closePath();if(fill){cx.fillStyle=fill;cx.fill()}if(stroke){cx.strokeStyle=stroke;cx.lineWidth=lw||2;cx.stroke()}}
function line(pts,stroke,lw){cx.beginPath();pts.forEach((p,i)=>i?cx.lineTo(p.x,p.y):cx.moveTo(p.x,p.y));cx.strokeStyle=stroke;cx.lineWidth=lw;cx.stroke()}
function arcPts(cxw,cyw,r,a0,a1,n=40){const o=[];for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n,y=cyw+Math.sin(a)*r;o.push(proj(cxw+Math.cos(a)*r,clamp(y,-50,100)))}return o}
function drawCourt(){
  const kc=G.kits[0].jersey;
  poly([proj(-5,-3),proj(L+5,-3),proj(L+5,W+4),proj(-5,W+4)],'#1a1206');
  const f=cx.createLinearGradient(0,P.farY,0,P.nearY);f.addColorStop(0,'#b07a42');f.addColorStop(.5,'#d39a5c');f.addColorStop(1,'#e2ad70');
  poly([proj(-3,-1.5),proj(L+3,-1.5),proj(L+3,W+1.5),proj(-3,W+1.5)],kc);
  poly([proj(0,0),proj(L,0),proj(L,W),proj(0,W)],f);
  // planks
  cx.globalAlpha=.16;for(let y=1;y<W;y+=1.25){line([proj(0,y),proj(L,y)],y%2.5<1.25?'#7c4a1e':'#f6d3a2',1)}cx.globalAlpha=1;
  // glossy reflection
  const sh=cx.createLinearGradient(0,P.farY,0,P.nearY);sh.addColorStop(0,'rgba(255,255,255,.10)');sh.addColorStop(.4,'rgba(255,255,255,0)');poly([proj(0,0),proj(L,0),proj(L,W),proj(0,W)],sh);
  // paint
  cx.globalAlpha=.88;poly([proj(0,19),proj(19,19),proj(19,31),proj(0,31)],kc);poly([proj(L-19,19),proj(L,19),proj(L,31),proj(L-19,31)],kc);cx.globalAlpha=1;
  // center logo
  const c=proj(47,25);cx.save();cx.translate(c.x,c.y);cx.scale(1,.5);cx.beginPath();cx.arc(0,0,6*c.s,0,7);cx.fillStyle=kc;cx.globalAlpha=.9;cx.fill();cx.globalAlpha=1;cx.fillStyle=G.kits[0].text;cx.font=`900 ${Math.round(c.s*2.1)}px Inter,system-ui,sans-serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(G.teams[0].abbr,0,0);cx.restore();cx.textAlign='left';
  const wl='rgba(255,255,255,.92)',lw=Math.max(1.5,P.s*.13);
  poly([proj(0,0),proj(L,0),proj(L,W),proj(0,W)],null,wl,lw);line([proj(47,0),proj(47,W)],wl,lw);line(arcPts(47,25,6,0,Math.PI*2,48),wl,lw);
  for(const[bx,s]of[[0,1],[L,-1]]){line([proj(bx,19),proj(bx+s*19,19),proj(bx+s*19,31),proj(bx,31)],wl,lw);line(arcPts(bx+s*19,25,6,s>0?-Math.PI/2:Math.PI/2,s>0?Math.PI/2:Math.PI*1.5,30),wl,lw);
    const rx=bx+s*5.25;const a=Math.acos(clamp((25-0)/THREE,-1,1));const pts=[];for(let i=0;i<=60;i++){const ang=-Math.PI/2+Math.PI*i/60;const yy=25+Math.sin(ang)*THREE;if(yy<0||yy>W)continue;pts.push(proj(rx+s*Math.cos(ang)*THREE,yy))}line(pts,wl,lw);void a;
    // baseline text
    const bt=proj(bx+s*-1.7,25);cx.save();cx.translate(bt.x,bt.y);cx.fillStyle='rgba(255,255,255,.75)';cx.font=`900 ${Math.round(bt.s*.9)}px Inter,system-ui`;cx.textAlign='center';cx.rotate(0);cx.restore()}
  // sideline apron text
  const ap=proj(47,W+.8);cx.fillStyle='rgba(255,255,255,.85)';cx.font=`900 ${Math.round(ap.s*.95)}px Inter,system-ui,sans-serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(G.teams[0].name.toUpperCase(),ap.x,ap.y);cx.textAlign='left';
}
function drawHoop(side){const s=side?-1:1,bx=side?L:0,rx=RIM_X[side?0:1];/* side 0 = left hoop (x=5.25) */
  const base=bx+(-s)*-2.5,top=13.5;
  const st=[proj(bx-s*3.2,24),proj(bx-s*3.2,26)];
  // stanchion
  const p1=proj(bx-s*3.4,25,0),p2=proj(bx-s*3.4,25,top-1.5),p3=proj(bx-s*1.6,25,top-1.5),p4=proj(bx+s*4,25,11);
  cx.strokeStyle='#111827';cx.lineWidth=Math.max(4,p1.s*.55);cx.beginPath();cx.moveTo(p1.x,p1.y);cx.lineTo(p2.x,p2.y);cx.lineTo(p4.x,p4.y);cx.stroke();
  poly([proj(bx-s*4.2,22.4),proj(bx-s*2.6,22.4),proj(bx-s*2.6,27.6),proj(bx-s*4.2,27.6)],'#0b1220');
  const pad=[proj(bx-s*3.9,24.2,0),proj(bx-s*3.9,24.2,4)];cx.strokeStyle=G.kits[0].jersey;cx.lineWidth=Math.max(6,p1.s*.9);cx.beginPath();cx.moveTo(pad[0].x,pad[0].y);cx.lineTo(pad[1].x,pad[1].y);cx.stroke();void st;void base;void p3;
  // backboard (glass)
  const bbx=bx+s*4;const bb=[proj(bbx,22,9),proj(bbx,28,9),proj(bbx,28,12.5),proj(bbx,22,12.5)];poly(bb,'rgba(220,235,255,.22)','rgba(255,255,255,.9)',Math.max(1.5,bb[0].s*.12));
  poly([proj(bbx,24,10.2),proj(bbx,26,10.2),proj(bbx,26,11.7),proj(bbx,24,11.7)],null,'rgba(239,68,68,.95)',Math.max(1.2,bb[0].s*.09));
  // rim + net
  const rimX=bx+s*5.25;const pts=[],low=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;pts.push(proj(rimX+Math.cos(a)*.75,25+Math.sin(a)*.75,RIM_Z));low.push(proj(rimX+Math.cos(a)*.45,25+Math.sin(a)*.45,RIM_Z-1.7))}
  const sw=G.netShake&&G.netShake.side===side?G.netShake.t:0;
  cx.strokeStyle='rgba(255,255,255,.75)';cx.lineWidth=1;for(let i=0;i<24;i+=2){cx.beginPath();cx.moveTo(pts[i].x,pts[i].y);cx.lineTo(low[i].x+Math.sin(G.time*30+i)*sw*4,low[i].y+sw*4);cx.stroke()}
  line(low,'rgba(255,255,255,.55)',1);line(pts,'#f97316',Math.max(2,pts[0].s*.16));void rx}
function drawPlayer(p){const k=G.kits[p.t],b=proj(p.x,p.y,0),s=b.s;const ctl=G.user>=0&&G.ctl[G.user]===p;
  // shadow
  cx.fillStyle='rgba(0,0,0,.32)';cx.beginPath();cx.ellipse(b.x,b.y,s*1.15,s*.38,0,0,7);cx.fill();
  if(ctl){cx.strokeStyle=G.off===p.t?'#fbbf24':'#38bdf8';cx.lineWidth=Math.max(2,s*.16);cx.beginPath();cx.ellipse(b.x,b.y,s*1.45,s*.5,0,0,7);cx.stroke();cx.globalAlpha=.25;cx.fillStyle=cx.strokeStyle;cx.fill();cx.globalAlpha=1}
  if(G.ball.owner===p&&!ctl){cx.strokeStyle='rgba(251,191,36,.6)';cx.lineWidth=Math.max(1.5,s*.1);cx.beginPath();cx.ellipse(b.x,b.y,s*1.3,s*.45,0,0,7);cx.stroke()}
  const H=p.h*s*.93,lift=p.z*s*.93,y0=b.y-lift;const run=Math.hypot(p.vx,p.vy)>1?Math.sin(p.anim*2.2):0;const f=p.face;
  const legW=s*.34,hip=y0-H*.47;
  // legs
  cx.strokeStyle=p.skin;cx.lineCap='round';cx.lineWidth=legW;
  cx.beginPath();cx.moveTo(b.x-s*.22,hip);cx.lineTo(b.x-s*.22+run*s*.55,y0-s*.15);cx.moveTo(b.x+s*.22,hip);cx.lineTo(b.x+s*.22-run*s*.55,y0-s*.15);cx.stroke();
  // shoes
  cx.fillStyle=k.trim;cx.fillRect(b.x-s*.22+run*s*.55-s*.3,y0-s*.28,s*.6,s*.26);cx.fillRect(b.x+s*.22-run*s*.55-s*.3,y0-s*.28,s*.6,s*.26);
  // shorts
  cx.fillStyle=k.jersey;roundRect(b.x-s*.55,hip-H*.02,s*1.1,H*.2,s*.15);cx.fillStyle=k.trim;cx.fillRect(b.x-s*.55,hip+H*.15,s*1.1,s*.1);
  // torso
  const sh=hip-H*.32;cx.fillStyle=k.jersey;roundRect(b.x-s*.6,sh,s*1.2,H*.34,s*.25);cx.strokeStyle=k.trim;cx.lineWidth=Math.max(1,s*.1);cx.beginPath();cx.moveTo(b.x-s*.35,sh+s*.05);cx.quadraticCurveTo(b.x,sh+s*.45,b.x+s*.35,sh+s*.05);cx.stroke();
  cx.fillStyle=k.text;cx.font=`900 ${Math.round(s*.62)}px Inter,system-ui,sans-serif`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(p.num,b.x,sh+H*.19);
  // arms
  cx.strokeStyle=p.skin;cx.lineWidth=s*.26;cx.beginPath();
  const up=p.act==='shot'||p.act==='layup'||p.act==='follow'||p.z>.5||(p.reach>0);
  if(up){cx.moveTo(b.x-s*.5,sh+s*.2);cx.lineTo(b.x-s*.35+f*s*.2,sh-H*.24);cx.moveTo(b.x+s*.5,sh+s*.2);cx.lineTo(b.x+s*.35+f*s*.3,sh-H*.24)}
  else if(G.off!==p.t&&G.phase==='live'){cx.moveTo(b.x-s*.55,sh+s*.25);cx.lineTo(b.x-s*1.15,sh+H*.1);cx.moveTo(b.x+s*.55,sh+s*.25);cx.lineTo(b.x+s*1.15,sh+H*.1)}
  else{cx.moveTo(b.x-s*.55,sh+s*.25);cx.lineTo(b.x-s*.65-run*s*.3,sh+H*.3);cx.moveTo(b.x+s*.55,sh+s*.25);cx.lineTo(b.x+s*.65+run*s*.3,sh+H*.3)}cx.stroke();
  // head
  const hy=sh-s*.62;cx.fillStyle=p.skin;cx.beginPath();cx.arc(b.x,hy,s*.42,0,7);cx.fill();cx.fillStyle=p.hair;cx.beginPath();cx.arc(b.x,hy-s*.1,s*.43,Math.PI*1.02,Math.PI*1.98);cx.fill();
  cx.textAlign='left';
  if(ctl){const ny=hy-s*1.05;cx.font=`800 ${Math.round(Math.max(10,s*.55))}px Inter,system-ui,sans-serif`;cx.textAlign='center';const label=`${p.last.toUpperCase()}`;const w=cx.measureText(label).width+s*.6;cx.fillStyle='rgba(2,6,23,.75)';roundRect(b.x-w/2,ny-s*.42,w,s*.84,s*.3);cx.fillStyle='#fff';cx.fillText(label,b.x,ny);cx.textAlign='left';
    if(G.meter&&p.act==='shot')drawMeter(b.x+s*1.35,hy+s*.3,s)}
}
function drawMeter(x,y,s){const m=G.meter,h=s*3.4,w=Math.max(7,s*.45),top=y-h;cx.fillStyle='rgba(2,6,23,.8)';roundRect(x-w/2-2,top-2,w+4,h+4,4);
  const gTop=top+h*(1-(m.target+m.green)),gH=h*m.green*2;cx.fillStyle='rgba(34,197,94,.9)';cx.fillRect(x-w/2,gTop,w,gH);
  const v=clamp(m.v,0,1.25);cx.fillStyle=Math.abs(m.v-m.target)<=m.green?'#22c55e':'#fbbf24';cx.fillRect(x-w/2,top+h*(1-Math.min(1,v)),w,h*Math.min(1,v)-0);cx.fillStyle='#fff';cx.fillRect(x-w/2-3,gTop+gH/2-1,w+6,2)}
function roundRect(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();cx.fill()}
function drawBall(){const b=G.ball;if(G.phase==='ft'&&G.ft&&b.state==='dead'){const s=G.ft.shooter;b.x=s.x+DIR[s.t]*.5;b.y=s.y+.3;b.z=G.ft.stage==='aim'?6.6:3+Math.abs(Math.sin(G.time*7))*1.5}else if(b.state==='dead'&&G.phase!=='inbound'&&G.phase!=='tip')return;const g=proj(b.x,b.y,0),p=proj(b.x,b.y,b.z),r=Math.max(3,p.s*.42);
  cx.fillStyle='rgba(0,0,0,.28)';cx.beginPath();cx.ellipse(g.x,g.y,r*1.05,r*.38,0,0,7);cx.fill();
  const gr=cx.createRadialGradient(p.x-r*.35,p.y-r*.35,r*.2,p.x,p.y,r);gr.addColorStop(0,'#fdba74');gr.addColorStop(1,'#c2410c');cx.fillStyle=gr;cx.beginPath();cx.arc(p.x,p.y,r,0,7);cx.fill();
  cx.strokeStyle='rgba(30,10,0,.7)';cx.lineWidth=Math.max(1,r*.14);cx.beginPath();cx.moveTo(p.x-r,p.y);cx.lineTo(p.x+r,p.y);cx.moveTo(p.x,p.y-r);cx.lineTo(p.x,p.y+r);cx.stroke();
  if(b.state==='shot'&&b.timing==='green'){cx.strokeStyle='rgba(34,197,94,.55)';cx.lineWidth=r*.5;cx.beginPath();cx.arc(p.x,p.y,r*1.6,0,7);cx.stroke()}}
function drawFT(){const F=G.ft;if(!F||F.stage!=='aim'||!isUser(F.shooter.t))return;const w=Math.min(360,VW*.6),x=VW/2-w/2,y=VH*.2;cx.fillStyle='rgba(2,6,23,.85)';roundRect(x-12,y-30,w+24,62,14);const zone=(.06+F.shooter.r.sht/1400)*w;cx.fillStyle='#22c55e';cx.fillRect(VW/2-zone,y-6,zone*2,16);cx.fillStyle='rgba(255,255,255,.2)';cx.fillRect(x,y,w,4);cx.fillStyle='#fff';cx.fillRect(x+F.marker*w-2,y-12,4,28);cx.font='800 12px Inter,system-ui';cx.textAlign='center';cx.fillText(`FREE THROW ${F.i+1} OF ${F.n} — TAP SHOOT IN THE GREEN`,VW/2,y-17);cx.textAlign='left'}
function render(){cx.setTransform(DPR,0,0,DPR,0,0);setupProjection();
  if(cam.shake>0){cx.translate((rnd()-.5)*cam.shake*12,(rnd()-.5)*cam.shake*8)}
  drawArena();drawCourt();
  const items=G.players.map(p=>({y:p.y,f:()=>drawPlayer(p)}));
  items.push({y:25.01,f:()=>drawHoop(0)},{y:25.02,f:()=>drawHoop(1)});
  items.push({y:G.ball.y+.05+(G.ball.z>7?0:0),f:drawBall});
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
  drawFT();
  // off-screen indicator for the user's player
  const me=userP();if(me){const p=proj(me.x,me.y);if(p.x<0||p.x>VW){cx.fillStyle='#fbbf24';const x=p.x<0?14:VW-14;cx.beginPath();cx.moveTo(x,p.y-10);cx.lineTo(x+(p.x<0?-10:10),p.y);cx.lineTo(x,p.y+10);cx.fill()}}
}
function updateCamera(dt){const b=G.ball;let tx=b.x;const h=b.owner;if(h)tx=h.x+DIR[h.t]*7;if(b.state==='shot')tx=lerp(b.x,b.ex,.5);const half=(VW/2)/P.s/.86;tx=clamp(tx,half-4,L-half+4);if(half*2>L+8)tx=47;cam.x+=(tx-cam.x)*Math.min(1,dt*2.6);cam.shake=Math.max(0,cam.shake-dt);if(G.netShake){G.netShake.t-=dt;if(G.netShake.t<=0)G.netShake=null}}

/* ---------- HUD ---------- */
let hudPrev='';
function hud(){const fmt=t=>{t=Math.max(0,t);return t<60?t.toFixed(1):`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`};
  const sc=S.shotClock?Math.max(0,Math.ceil(G.shot)):'';const key=[G.score,G.q,fmt(G.clock),sc,G.fouls,G.off,G.phase].join('|');if(key===hudPrev)return;hudPrev=key;
  $('#pn3s0').textContent=G.score[0];$('#pn3s1').textContent=G.score[1];$('#pn3q').textContent=ord(G.q);$('#pn3clk').textContent=fmt(G.clock);const e=$('#pn3sc');e.textContent=S.shotClock?sc:'';e.classList.toggle('low',S.shotClock&&G.shot<=5);
  $('#pn3f0').textContent=G.fouls[0]>=7?'BONUS':'';$('#pn3f1').textContent=G.fouls[1]>=7?'BONUS':'';
  root.querySelectorAll('.pn3-bt').forEach((el,i)=>el.classList.toggle('poss',G.off===i&&G.phase==='live'));updateButtons()}

/* ---------- loop ---------- */
function loop(t){if(!G)return;const dt=Math.min(.05,(t-lastT)/1000);lastT=t;
  if(!G.paused&&!G.over){acc+=dt;const step=1/60;let n=0;while(acc>=step&&n<5){update(step);acc-=step;n++}if(n>=5)acc=0;updateCamera(dt)}
  render();hud();raf=requestAnimationFrame(loop)}

/* ---------- pause / final ---------- */
function pause(on){if(!G||G.over)return;G.paused=on;const m=$('#pn3menu');if(!m)return;if(!on){m.classList.add('hidden');return}
  m.classList.remove('hidden');m.innerHTML=`<div class="pn3-panel"><small>PAUSED • ${ord(G.q)} ${$('#pn3clk')?.textContent||''}</small><h2>${esc(G.teams[0].abbr)} ${G.score[0]} — ${G.score[1]} ${esc(G.teams[1].abbr)}</h2>
   <div class="pn3-mbtns"><button data-m="resume" class="pri">RESUME</button><button data-m="box">BOX SCORE</button><button data-m="sim">SIM TO END</button><button data-m="restart">RESTART</button><button data-m="settings">SETTINGS</button><button data-m="quit">QUIT TO TEAM SELECT</button><button data-m="menu">MAIN MENU</button></div>
   <div id="pn3sub"></div><p class="pn3-help">${controlsHelp()}</p></div>`;
  m.onclick=e=>{const b=e.target.closest('[data-m]');if(!b)return;const k=b.dataset.m;
    if(k==='resume')pause(false);else if(k==='box')$('#pn3sub').innerHTML=boxHTML();else if(k==='restart'){const[h,a]=G.teams;startGame(h,a)}else if(k==='quit')open();else if(k==='menu')close();else if(k==='sim')simToEnd();
    else if(k==='settings'){$('#pn3sub').innerHTML=`<div class="pn3-sets"><label><input type="checkbox" data-s="sound" ${S.sound?'checked':''}> Sound</label><label><input type="checkbox" data-s="haptics" ${S.haptics?'checked':''}> Vibration</label><label>Difficulty <select data-s="diff">${Object.entries(DIFF).map(([k2,v])=>`<option value="${k2}" ${S.diff===k2?'selected':''}>${v.label}</option>`).join('')}</select></label></div>`;
      $('#pn3sub').querySelectorAll('[data-s]').forEach(i=>i.onchange=()=>{const k2=i.dataset.s;S[k2]=i.type==='checkbox'?i.checked:i.value;if(k2==='diff')G.diff=DIFF[S.diff];saveSettings()})}}}
function controlsHelp(){return'<b>Phone:</b> drag anywhere on the left to move • SHOOT: hold, let go at the top of the jump (green bar) • drive to the rim and tap SHOOT for a layup or dunk • PASS goes where you push the stick • CROSS = dribble move (breaks ankles) • on defense: BLOCK, STEAL, SWITCH. <b>Keyboard:</b> WASD/arrows, Space shoot, K pass, L move/steal, Shift sprint, Q switch, Esc pause. <b>Controller:</b> A shoot, X pass, B move/steal, Y switch, RT sprint, Start pause.'}
function simToEnd(){const qLeft=Math.max(0,4-G.q)+G.clock/G.qlen;const pace=G.qlen/60*3.4;const r=[G.teams[0].ovr,G.teams[1].ovr];for(let t=0;t<2;t++){const pts=Math.round(qLeft*pace*(1+(r[t]-r[1-t])*.012)*(.85+rnd()*.3)*2.1);for(let i=0;i<pts;){const p=team(t)[Math.floor(rnd()*5)],v=rnd()<.3?3:2;p.box.pts+=v;p.box.fgm++;p.box.fga+=2;if(v===3){p.box.tpm++;p.box.tpa++}G.score[t]+=v;i+=v}}
  if(G.score[0]===G.score[1])G.score[rnd()<.5?0:1]+=2;G.q=Math.max(4,G.q);G.clock=0;$('#pn3menu').classList.add('hidden');G.paused=false;finish()}
function finish(){if(G.over)return;G.over=true;SFX.buzzer();SFX.crowd(.12);const w=G.score[0]>G.score[1]?0:1;const userWon=G.user>=0&&w===G.user;
  if(userWon){try{window.BM27RC252?.award?.('win','playnow300-'+Date.now())}catch{}}
  const all=G.players.slice().sort((a,b)=>(b.box.pts+b.box.reb*1.2+b.box.ast*1.5+b.box.stl*2+b.box.blk*2)-(a.box.pts+a.box.reb*1.2+a.box.ast*1.5+a.box.stl*2+a.box.blk*2));const pog=all[0];
  const f=$('#pn3final');f.classList.remove('hidden');f.innerHTML=`<div class="pn3-panel wide"><small>FINAL${G.ot?` • ${G.ot>1?G.ot+'OT':'OT'}`:''}</small>
   <div class="pn3-fscore"><div class="${w===0?'win':''}">${logo(G.teams[0].name,'pn3-flogo')}<b>${G.score[0]}</b><span>${esc(G.teams[0].name)}</span></div><em>—</em><div class="${w===1?'win':''}">${logo(G.teams[1].name,'pn3-flogo')}<b>${G.score[1]}</b><span>${esc(G.teams[1].name)}</span></div></div>
   <h3>${G.user<0?esc(G.teams[w].name)+' wins':userWon?'VICTORY'+(window.BM27RC252?' • +400 RC':''):'DEFEAT'}</h3>
   <p class="pn3-pog">PLAYER OF THE GAME: <b>${esc(pog.name)}</b> (${esc(G.teams[pog.t].abbr)}) — ${pog.box.pts} PTS, ${pog.box.reb} REB, ${pog.box.ast} AST</p>
   ${boxHTML()}<div class="pn3-mbtns"><button data-f="again" class="pri">REMATCH</button><button data-f="teams">NEW MATCHUP</button><button data-f="menu">MAIN MENU</button></div></div>`;
  f.onclick=e=>{const b=e.target.closest('[data-f]');if(!b)return;if(b.dataset.f==='again'){const[h,a]=G.teams;startGame(h,a)}else if(b.dataset.f==='teams')open();else close()};
  try{const log=JSON.parse(localStorage.getItem('bm27_pn300_log')||'[]');log.unshift({at:Date.now(),home:G.teams[0].name,away:G.teams[1].name,score:G.score,user:G.user});localStorage.setItem('bm27_pn300_log',JSON.stringify(log.slice(0,25)))}catch{}}
function boxHTML(){return`<div class="pn3-box">${[0,1].map(t=>`<table><caption style="--c:${esc(G.kits[t].jersey)}">${esc(G.teams[t].name)}</caption><thead><tr><th>PLAYER</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th><th>3PT</th><th>FT</th></tr></thead><tbody>${team(t).map(p=>`<tr><td><i>${esc(p.pos)}</i> ${esc(p.name)}</td><td>${p.box.pts}</td><td>${p.box.reb}</td><td>${p.box.ast}</td><td>${p.box.stl}</td><td>${p.box.blk}</td><td>${p.box.fgm}-${p.box.fga}</td><td>${p.box.tpm}-${p.box.tpa}</td><td>${p.box.ftm}-${p.box.fta}</td></tr>`).join('')}</tbody></table>`).join('')}</div>`}

/* ---------- install over every older Play Now entry ---------- */
const API={open,close,version:VERSION,get state(){return G},_step(n=60){for(let i=0;i<n&&G&&!G.over;i++)if(!G.paused)update(1/60)}};
window.BM27PlayNow300=API;
function install(){for(const k of['BM27PlayNow250','BM27PlayNow251','BM27PlayNow252','BM27PlayNow253']){window[k]={...(window[k]||{}),open}}}
install();document.addEventListener('DOMContentLoaded',install);setTimeout(install,0);setTimeout(install,1500);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-mode="playnow"],[data-248="playnow"]');if(!b||root)return;e.preventDefault();e.stopImmediatePropagation();open()},true);
})();
