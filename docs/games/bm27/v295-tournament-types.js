/* BM27 v2.9.5 — More tournament types.
   New formats run as their own small event engine on top of normal schedule games, so the
   existing bracket engine (Single / 3rd Place / Placement) is untouched:
     • Round Robin (4–6 teams)         • Pool Play + Placement Finals (8 teams)
     • Double Elimination (4 or 8)     • Best-of-3 / Best-of-5 Series (2 teams)
   Plus 12 premade tournaments with their own names, dates, sizes and formats.
   Your games are ordinary schedule games (played by the season engine like any other game).
   Other schools' event games are simulated for the event only; they don't change season records. */
(()=>{'use strict';
if(window.__BM27_V295__)return;window.__BM27_V295__=true;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eq=(a,b)=>String(a)===String(b);
const cur=()=>{try{return (typeof current!=='undefined'&&current)?current:null}catch{return null}};
const team=id=>(cur()?.teams||[]).find(t=>eq(t.id,id))||null;
const tname=id=>team(id)?.name||'TBD';
const store=()=>{try{persist()}catch(e){console.warn('BM27 events save',e)}};
const toast_=m=>{try{toast(m)}catch{console.log(m)}};
const uid_=()=>{try{return uid()}catch{return 'ev-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}};
const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const addDays=(iso,n)=>{const d=new Date(iso);d.setDate(d.getDate()+n);return d.toISOString()};
const fmtDate=d=>{try{return new Date(d).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}catch{return ''}};
const logo=name=>{try{return window.BM27V280?.logoHtml?.(name)?.replace('k2HudLogo','v295Logo')||''}catch{return ''}};
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>{let x=hash(seed)||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)%100000)/100000}};

/* ---------- formats ---------- */
const FORMATS={
  roundrobin:{label:'Round Robin',sizes:[4,5,6],note:'Everyone plays everyone once. Best record wins the title; point differential breaks ties.'},
  pool:{label:'Pool Play + Placement Finals',sizes:[8],note:'Two pools of four play a round robin, then 1st vs 1st plays for the title, 2nd vs 2nd for 3rd place, and so on.'},
  double:{label:'Double Elimination',sizes:[4,8],note:'You are not out until you lose twice. If the losers-bracket team wins the final, a deciding game is played.'},
  series3:{label:'Best-of-3 Series',sizes:[2],note:'You and one opponent. First to 2 wins takes the series.'},
  series5:{label:'Best-of-5 Series',sizes:[2],note:'You and one opponent. First to 3 wins takes the series.'}
};
const isNew=f=>Object.prototype.hasOwnProperty.call(FORMATS,f);
const BRACKET_SIZES=[4,8,16,32];

/* ---------- premade tournaments ---------- */
const PRESETS={
  turkey:{name:'Turkey Day Shootout',kind:'Thanksgiving Tournament',format:'roundrobin',size:4,md:[10,27]},
  tipoff:{name:'Tip-Off Classic',kind:'Tip-Off Tournament',format:'single',size:8,md:[11,5]},
  hof:{name:'Hall of Fame Classic',kind:'Hall of Fame Tournament',format:'third',size:4,md:[11,12]},
  smalltown:{name:'Small Town Showdown',kind:'Small Town Tournament',format:'double',size:4,md:[11,19]},
  kingcourt:{name:'King of the Court',kind:'King of the Court',format:'roundrobin',size:6,md:[11,28]},
  mlk:{name:'MLK Showcase',kind:'MLK Showcase',format:'pool',size:8,md:[0,16]},
  ozark:{name:'Ozark Mountain Classic',kind:'Ozark Classic',format:'placement',size:8,md:[0,9]},
  border:{name:'Border War Classic',kind:'Border War Tournament',format:'double',size:8,md:[0,23]},
  gateway:{name:'Gateway Invitational',kind:'Gateway Invitational',format:'third',size:16,md:[11,26]},
  midwest:{name:'Midwest Invitational',kind:'Midwest Invitational',format:'placement',size:16,md:[0,2]},
  rivalry:{name:'Rivalry Series',kind:'Rivalry Series',format:'series3',size:2,md:[0,30]},
  heartland:{name:'Heartland Hoops Series',kind:'Heartland Series',format:'series5',size:2,md:[1,6]}
};
const OLD_KINDS={holiday:'Holiday Tournament',showme:'Show-Me Tournament',district:'District Preview Tournament',custom:'Custom Tournament'};
window.BM27PresetKinds=Object.assign({},OLD_KINDS,Object.fromEntries(Object.entries(PRESETS).map(([k,p])=>[k,p.kind])));

/* ---------- event structure builders ---------- */
const S=i=>({seed:i}),W=m=>({m,res:'W'}),L=m=>({m,res:'L'}),P=(pool,place)=>({pool,place});
function rrRounds(n){const ids=[...Array(n).keys()];if(n%2)ids.push(null);const k=ids.length,rounds=[];let arr=ids.slice();
  for(let r=0;r<k-1;r++){const pairs=[];for(let i=0;i<k/2;i++){const a=arr[i],b=arr[k-1-i];if(a!==null&&b!==null)pairs.push([a,b])}rounds.push(pairs);arr=[arr[0],arr[k-1],...arr.slice(1,k-1)]}
  return rounds}
function buildMatches(format,n){
  const M=[];const add=(id,stage,a,b,label,group,extra={})=>M.push({id,stage,a,b,label,group,...extra});
  if(format==='roundrobin'){rrRounds(n).forEach((pairs,r)=>pairs.forEach(([a,b],i)=>add(`r${r}m${i}`,r,S(a),S(b),`Round ${r+1}`,'RR')))}
  else if(format==='pool'){
    const pools={A:[0,3,4,7],B:[1,2,5,6]};
    for(const [p,seeds] of Object.entries(pools))rrRounds(4).forEach((pairs,r)=>pairs.forEach(([a,b],i)=>add(`${p}${r}${i}`,r,S(seeds[a]),S(seeds[b]),`Pool ${p} • Game ${r+1}`,`POOL ${p}`)));
    add('f1',3,P('A',1),P('B',1),'Championship','FINALS');add('f3',3,P('A',2),P('B',2),'3rd Place Game','FINALS');
    add('f5',3,P('A',3),P('B',3),'5th Place Game','FINALS');add('f7',3,P('A',4),P('B',4),'7th Place Game','FINALS');
  }
  else if(format==='double'&&n===4){
    add('w1',0,S(0),S(3),'Winners Round 1','WINNERS');add('w2',0,S(1),S(2),'Winners Round 1','WINNERS');
    add('wf',1,W('w1'),W('w2'),'Winners Final','WINNERS');add('l1',1,L('w1'),L('w2'),'Elimination Game','LOSERS');
    add('lf',2,W('l1'),L('wf'),'Losers Final','LOSERS');
    add('gf',3,W('wf'),W('lf'),'Championship','FINAL');add('gf2',4,W('gf'),L('gf'),'Championship (If Necessary)','FINAL',{needIf:'reset'});
  }
  else if(format==='double'){
    add('w1',0,S(0),S(7),'Winners Round 1','WINNERS');add('w2',0,S(3),S(4),'Winners Round 1','WINNERS');add('w3',0,S(1),S(6),'Winners Round 1','WINNERS');add('w4',0,S(2),S(5),'Winners Round 1','WINNERS');
    add('w5',1,W('w1'),W('w2'),'Winners Semifinal','WINNERS');add('w6',1,W('w3'),W('w4'),'Winners Semifinal','WINNERS');
    add('l1',1,L('w1'),L('w2'),'Losers Round 1','LOSERS');add('l2',1,L('w3'),L('w4'),'Losers Round 1','LOSERS');
    add('l3',2,W('l1'),L('w6'),'Losers Round 2','LOSERS');add('l4',2,W('l2'),L('w5'),'Losers Round 2','LOSERS');
    add('wf',2,W('w5'),W('w6'),'Winners Final','WINNERS');
    add('l5',3,W('l3'),W('l4'),'Losers Semifinal','LOSERS');add('lf',4,W('l5'),L('wf'),'Losers Final','LOSERS');
    add('gf',5,W('wf'),W('lf'),'Championship','FINAL');add('gf2',6,W('gf'),L('gf'),'Championship (If Necessary)','FINAL',{needIf:'reset'});
  }
  else if(format==='series3'||format==='series5'){
    const g=format==='series3'?3:5,need=Math.ceil(g/2);
    for(let i=0;i<g;i++)add(`g${i+1}`,i,S(i%2?1:0),S(i%2?0:1),`Game ${i+1}`,'SERIES',i>=need?{needIf:'series'}:{});
  }
  return M}
const maxUserGames=(format,n)=>format==='roundrobin'?n-1+(n%2?0:0):format==='pool'?4:format==='double'?(n===4?5:7):format==='series3'?3:format==='series5'?5:0;
const STRIDE={roundrobin:1,pool:1,double:1,series3:2,series5:2};

/* ---------- engine ---------- */
const events=()=>{const c=cur();if(!c)return [];c.v295events=Array.isArray(c.v295events)?c.v295events:[];return c.v295events};
const matchById=(ev,id)=>ev.matches.find(m=>m.id===id);
function poolTable(ev,pool){
  const rows={};for(const m of ev.matches)if(m.group===`POOL ${pool}`){for(const id of [m.aId,m.bId])if(id!=null&&!rows[id])rows[id]={id,w:0,l:0,pf:0,pa:0}}
  const ms=ev.matches.filter(m=>m.group===`POOL ${pool}`);
  for(const m of ms)if(m.done&&!m.skipped){const a=rows[m.aId],b=rows[m.bId];a.pf+=m.sa;a.pa+=m.sb;b.pf+=m.sb;b.pa+=m.sa;if(m.sa>m.sb){a.w++;b.l++}else{b.w++;a.l++}}
  return {complete:ms.every(m=>m.done),rows:sortTable(Object.values(rows),ms)}}
function sortTable(rows,ms){
  const h2h=(x,y)=>{const m=ms.find(m=>m.done&&((eq(m.aId,x.id)&&eq(m.bId,y.id))||(eq(m.aId,y.id)&&eq(m.bId,x.id))));if(!m)return 0;return eq(m.winner,x.id)?-1:1};
  return rows.sort((x,y)=>(y.w-x.w)||h2h(x,y)||((y.pf-y.pa)-(x.pf-x.pa))||(y.pf-x.pf)||((+team(y.id)?.rating||0)-(+team(x.id)?.rating||0)))}
function rrTable(ev){
  const rows=Object.fromEntries(ev.teams.map(id=>[id,{id,w:0,l:0,pf:0,pa:0}]));
  for(const m of ev.matches)if(m.done&&!m.skipped){const a=rows[m.aId],b=rows[m.bId];if(!a||!b)continue;a.pf+=m.sa;a.pa+=m.sb;b.pf+=m.sb;b.pa+=m.sa;if(m.sa>m.sb){a.w++;b.l++}else{b.w++;a.l++}}
  return sortTable(Object.values(rows),ev.matches)}
function resolve(ev,src){
  if(!src)return null;
  if(src.seed!=null)return ev.teams[src.seed]??null;
  if(src.m){const m=matchById(ev,src.m);if(!m||!m.done||m.skipped)return null;return src.res==='W'?m.winner:m.loser}
  if(src.pool){const t=poolTable(ev,src.pool);if(!t.complete)return null;return t.rows[src.place-1]?.id??null}
  return null}
function seriesWins(ev){const w={};for(const m of ev.matches)if(m.done&&!m.skipped)w[m.winner]=(w[m.winner]||0)+1;return w}
function needed(ev,m){
  if(m.needIf==='reset'){const gf=matchById(ev,'gf');if(!gf?.done)return null;return eq(gf.winner,gf.bId)}
  if(m.needIf==='series'){const need=ev.format==='series3'?2:3,w=seriesWins(ev);if(Object.values(w).some(v=>v>=need))return false;return true}
  return true}
function simScore(ev,m){
  const a=team(m.aId),b=team(m.bId),r=rng(ev.id+m.id),ra=+a?.rating||70,rb=+b?.rating||70,d=ra-rb;
  let sa=Math.round(62+ra*.18+d*.35+(r()-.5)*20),sb=Math.round(62+rb*.18-d*.35+(r()-.5)*20);if(sa===sb){if(r()<.5)sa++;else sb++}
  return [sa,sb]}
function finish(ev,m,sa,sb){m.sa=sa;m.sb=sb;m.done=true;m.winner=sa>sb?m.aId:m.bId;m.loser=sa>sb?m.bId:m.aId}
function freeDate(ev,iso,rowId){
  const taken=new Set((cur().schedule||[]).filter(g=>g.id!==rowId).map(g=>ymd(g.date)));
  let d=iso,guard=0;while(taken.has(ymd(d))&&guard++<20)d=addDays(d,1);return d}
function userRow(ev,m){
  const c=cur(),me=c.schoolId,opp=eq(m.aId,me)?m.bId:m.aId;
  let row=m.rowId?(c.schedule||[]).find(g=>g.id===m.rowId):null;
  if(row)return row;
  if(m.rowId&&m.rowMade){return null} // user removed it from the schedule
  const lastUser=ev.matches.filter(x=>x.rowId&&x!==m).map(x=>(c.schedule||[]).find(g=>g.id===x.rowId)?.date).filter(Boolean).sort().pop();
  let date=m.date;if(lastUser&&new Date(date)<=new Date(lastUser))date=addDays(lastUser,1);
  const today=new Date(c.day);if(new Date(date)<=today){const t=addDays(c.day,1);date=new Date(t)>new Date(date)?t:date}
  date=freeDate(ev,date,null);
  row={id:uid_(),opponentId:opp,date,home:false,neutral:true,played:false,type:'Tournament',eventId:ev.id,eventMatchId:m.id,eventName:ev.name,roundName:`${ev.name} • ${m.label}`};
  c.schedule.push(row);c.schedule.sort((x,y)=>new Date(x.date)-new Date(y.date));
  m.rowId=row.id;m.rowMade=true;m.userDate=date;return row}
function step(ev){
  if(ev.done||ev.cancelled)return false;const c=cur();if(!c)return false;const me=String(c.schoolId),today=new Date(c.day);let changed=false;
  for(let pass=0;pass<40;pass++){let moved=false;
    for(const m of ev.matches){
      if(m.done)continue;
      if(m.needIf){
        // only decide an if-necessary game once every earlier game is finished
        if(ev.matches.some(x=>x!==m&&x.stage<m.stage&&!x.done))continue;
        const n=needed(ev,m);if(n===null)continue;
        if(n===false){m.done=true;m.skipped=true;if(m.rowId){const c2=cur();c2.schedule=(c2.schedule||[]).filter(g=>!(g.id===m.rowId&&!g.played))}moved=true;continue}}
      const a=resolve(ev,m.a),b=resolve(ev,m.b);if(a==null||b==null)continue;
      if(m.aId!==a||m.bId!==b){m.aId=a;m.bId=b;moved=true}
      if(eq(a,me)||eq(b,me)){
        const row=userRow(ev,m);
        if(!row){const [sa,sb]=simScore(ev,m);finish(ev,m,sa,sb);m.forfeitNote='Removed from your schedule — simulated';moved=true;continue}
        if(row.played&&Number.isFinite(+row.myScore)&&Number.isFinite(+row.oppScore)){const mine=+row.myScore,theirs=+row.oppScore;eq(a,me)?finish(ev,m,mine,theirs):finish(ev,m,theirs,mine);moved=true}
        else if(!m.rowMadeLogged){m.rowMadeLogged=true;moved=true}
      }else if(new Date(m.date)<=today||ev.simAll){const [sa,sb]=simScore(ev,m);finish(ev,m,sa,sb);moved=true}
    }
    if(!moved)break;changed=true}
  // user eliminated (no remaining matches can involve them): finish the rest as days pass
  if(!ev.userOut&&isUserOut(ev)){ev.userOut=true;changed=true}
  if(ev.matches.every(m=>m.done)){complete(ev);changed=true}
  if(changed)status(ev);
  return changed}
function isUserOut(ev){const me=String(cur().schoolId);
  if(ev.format==='double'){const losses=ev.matches.filter(m=>m.done&&!m.skipped&&eq(m.loser,me)).length;return losses>=2}
  return false}
function complete(ev){
  if(ev.done)return;ev.done=true;const pl={};
  if(ev.format==='roundrobin')rrTable(ev).forEach((r,i)=>pl[i+1]=r.id);
  else if(ev.format==='pool'){for(const [id,p] of [['f1',1],['f3',3],['f5',5],['f7',7]]){const m=matchById(ev,id);if(m?.done){pl[p]=m.winner;pl[p+1]=m.loser}}}
  else if(ev.format==='double'){const g2=matchById(ev,'gf2'),g=g2&&!g2.skipped?g2:matchById(ev,'gf');pl[1]=g.winner;pl[2]=g.loser;pl[3]=matchById(ev,'lf').loser;
    if(ev.teams.length===8){pl[4]=matchById(ev,'l5').loser;pl[5]=matchById(ev,'l3').loser;pl[6]=matchById(ev,'l4').loser;pl[7]=matchById(ev,'l1').loser;pl[8]=matchById(ev,'l2').loser}
    else pl[4]=matchById(ev,'l1').loser}
  else{const w=seriesWins(ev);const ids=ev.teams.slice().sort((x,y)=>(w[y]||0)-(w[x]||0));pl[1]=ids[0];pl[2]=ids[1];ev.seriesScore=`${w[ids[0]]||0}-${w[ids[1]]||0}`}
  ev.placements=pl;ev.championId=pl[1];
  const c=cur(),me=String(c.schoolId),mine=Object.entries(pl).find(([,id])=>eq(id,me))?.[0];
  const text=eq(ev.championId,me)?`${tname(me)} won the ${ev.name}! (${FORMATS[ev.format].label})`:`${tname(ev.championId)} won the ${ev.name}.${mine?` ${tname(me)} finished ${ordinal(+mine)}.`:''}`;
  try{c.news=c.news||[];c.news.unshift({date:c.day,text})}catch{}
  if(eq(ev.championId,me))try{toast_(`🏆 ${ev.name} champions!`)}catch{}
}
const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])};
function status(ev){
  const me=String(cur().schoolId);
  if(ev.cancelled){ev.status='Cancelled';return}
  if(ev.done){ev.status=`Final • Champion: ${tname(ev.championId)}`;return}
  const next=ev.matches.find(m=>!m.done&&(eq(m.aId,me)||eq(m.bId,me))&&m.rowId);
  if(next){const row=(cur().schedule||[]).find(g=>g.id===next.rowId);ev.status=`Next: ${next.label} vs ${tname(eq(next.aId,me)?next.bId:next.aId)}${row?` • ${fmtDate(row.date)}`:''}`;return}
  ev.status=ev.userOut?'Eliminated — the rest of the event finishes as days pass':'Waiting on other results'}
function runAll(){const c=cur();if(!c||!Array.isArray(c.v295events)||!c.v295events.length)return false;let ch=false;
  const dead=new Set();for(const ev of c.v295events)for(const m of ev.matches)if(m.skipped&&m.rowId)dead.add(m.rowId);
  if(dead.size){const before=c.schedule.length;c.schedule=c.schedule.filter(g=>!(dead.has(g.id)&&!g.played));if(c.schedule.length!==before)ch=true}for(const ev of c.v295events)try{if(step(ev))ch=true}catch(e){console.warn('BM27 event',ev?.name,e)}if(ch)store();return ch}

/* ---------- create ---------- */
function createEvent({name,format,preset,start,ids}){
  const c=cur();if(!c)throw new Error('Open a career first.');
  const F=FORMATS[format];const n=ids.length+1;
  if(!F.sizes.includes(n))throw new Error(`${F.label} needs ${F.sizes.map(x=>x-1).join(' or ')} other school${F.sizes[0]>2?'s':''}.`);
  if(!start)throw new Error('Pick a starting date.');
  const startISO=new Date(`${start}T18:00:00`).toISOString();
  if(ymd(startISO)<=ymd(c.day))throw new Error('Pick a starting date after today.');
  const need=maxUserGames(format,n),pending=(c.schedule||[]).filter(g=>!g.played).length;
  if(pending+need>26)throw new Error(`This ${F.label} can add up to ${need} games and would go past the 26-game limit.`);
  const me=team(c.schoolId);const field=[me,...ids.map(team)].filter(Boolean);if(field.length!==n)throw new Error('One or more schools could not be found.');
  field.sort((a,b)=>(+b.rating||0)-(+a.rating||0));
  const ev={id:uid_(),name,format,preset,kind:window.BM27PresetKinds[preset]||'Custom Tournament',size:n,start:startISO,createdAt:new Date().toISOString(),teams:field.map(t=>t.id),matches:buildMatches(format,n),done:false};
  const stride=STRIDE[format]||1;for(const m of ev.matches)m.date=addDays(startISO,m.stage*stride);
  events().push(ev);step(ev);store();
  try{renderAll()}catch{}renderEvents();
  toast_(`${name} created — ${F.label}.`);return ev}

/* ---------- builder UI ---------- */
let origSizeHTML='';
function installBuilder(){
  const fmt=$('tournamentFormat'),preset=$('tournamentPreset'),size=$('tournamentSize');if(!fmt||!preset||!size||fmt.dataset.v295)return;fmt.dataset.v295='1';
  origSizeHTML=size.innerHTML;
  fmt.insertAdjacentHTML('beforeend',`<optgroup label="NEW FORMATS">${Object.entries(FORMATS).map(([k,f])=>`<option value="${k}">${f.label}</option>`).join('')}</optgroup>`);
  const custom=preset.querySelector('option[value="custom"]');
  preset.insertAdjacentHTML('beforeend','');
  const og=document.createElement('optgroup');og.label='MORE PREMADE TOURNAMENTS';og.innerHTML=Object.entries(PRESETS).map(([k,p])=>`<option value="${k}">${esc(p.name)} — ${esc((FORMATS[p.format]||{label:p.format==='third'?'3rd Place Game':p.format==='placement'?'Placement Bracket':'Single Elim'}).label)}, ${p.size} teams</option>`).join('');
  if(custom)preset.insertBefore(og,custom);else preset.appendChild(og);
  const note=document.createElement('small');note.id='v295FormatNote';note.className='muted v295-note';fmt.closest('label')?.appendChild(note);
  fmt.addEventListener('change',()=>syncFormat(true));
  preset.addEventListener('change',applyPreset);
  $('tournamentName')?.addEventListener('input',e=>{e.target.dataset.v295Auto=''});
  syncFormat(false);
}
function syncFormat(fromUser){
  const fmt=$('tournamentFormat'),size=$('tournamentSize');if(!fmt||!size)return;const f=fmt.value,nw=isNew(f);
  const isMine=size.dataset.v295Sizes==='1';
  if(nw){const want=FORMATS[f].sizes,keep=Number(size.value);
    if(!isMine||[...size.options].map(o=>+o.value).join(',')!==want.join(',')){
      if(!isMine)origSizeHTML=size.innerHTML;
      size.innerHTML=want.map(v=>`<option value="${v}">${v===2?'2 teams (you + 1 opponent)':v+' teams'}</option>`).join('');size.dataset.v295Sizes='1';
      size.value=String(want.includes(keep)?keep:want[0]);size.dispatchEvent(new Event('change',{bubbles:true}))}}
  else if(isMine){const keep=size.value;size.innerHTML=origSizeHTML;delete size.dataset.v295Sizes;
    size.value=[...size.options].some(o=>o.value===keep)?keep:'8';size.dispatchEvent(new Event('change',{bubbles:true}))}
  const block=document.querySelector('.v279-builder-block');if(block){block.classList.toggle('hidden',nw);if(nw&&$('v279BracketMode')&&$('v279BracketMode').value!=='auto'){$('v279BracketMode').value='auto';$('v279BracketMode').dispatchEvent(new Event('change',{bubbles:true}))}}
  const note=$('v295FormatNote');if(note)note.textContent=nw?FORMATS[f].note:'';
  const fl=fmt.closest('label')?.querySelector('small.muted:not(.v295-note)');if(fl)fl.classList.toggle('hidden',nw);
}
function applyPreset(){
  const p=PRESETS[$('tournamentPreset').value];const name=$('tournamentName');
  if(!p){if(name?.dataset.v295Auto==='1'){name.value='';name.dataset.v295Auto=''}return}
  if(name&&(!name.value||name.dataset.v295Auto==='1')){name.value=p.name;name.dataset.v295Auto='1'}
  const fmt=$('tournamentFormat');if(fmt){fmt.value=p.format;syncFormat(false)}
  const size=$('tournamentSize');if(size&&[...size.options].some(o=>+o.value===p.size)){size.value=String(p.size);size.dispatchEvent(new Event('change',{bubbles:true}))}
  const c=cur(),startEl=$('tournamentStart');if(c&&startEl){const season=+c.season||new Date(c.day).getFullYear();const y=p.md[0]>=7?season:season+1;let d=new Date(y,p.md[0],p.md[1],18);
    const min=new Date(c.day);min.setDate(min.getDate()+2);if(d<min){d=new Date(c.day);d.setDate(d.getDate()+14)}startEl.value=ymd(d)}
}
function pickedIds(){let ids=[];try{if(typeof selectedTournamentIds==='function')ids=selectedTournamentIds().map(String)}catch{}
  if(!ids.length)ids=[...document.querySelectorAll('#tournamentSchoolPicker input:checked')].map(i=>String(i.value));
  const me=String(cur()?.schoolId||'');return [...new Set(ids.filter(id=>id&&id!==me))]}
document.addEventListener('submit',e=>{
  if(e.target?.id!=='tournamentForm')return;const f=$('tournamentFormat')?.value;
  if(!isNew(f))return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
    const preset=$('tournamentPreset')?.value||'custom';const p=PRESETS[preset];
    const name=$('tournamentName')?.value.trim()||p?.name||({holiday:'Holiday Classic',showme:'Show-Me Shootout',district:'District Preview Classic'}[preset])||`${FORMATS[f].label} Classic`;
    try{if(typeof scheduleEditable==='function'&&!scheduleEditable())throw new Error('Schedule is locked.')}catch(err){if(err.message==='Schedule is locked.')throw err}
    createEvent({name,format:f,preset,start:$('tournamentStart')?.value,ids:pickedIds()});
    $('tournamentDialog')?.close();
  }catch(err){toast_(err.message||String(err))}
},true);

/* ---------- display ---------- */
function teamCell(id,me){return `<span class="v295-team${eq(id,me)?' me':''}">${logo(tname(id))}<b>${esc(tname(id))}</b></span>`}
function tableHTML(rows,me,title){return `<div class="table-wrap"><table class="v295-table"><thead><tr><th>${esc(title||'Team')}</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>+/-</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${eq(r.id,me)?'v295-me':''}"><td><span class="v295-rank">${i+1}</span>${teamCell(r.id,me)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf}</td><td>${r.pa}</td><td>${r.pf-r.pa>0?'+':''}${r.pf-r.pa}</td></tr>`).join('')}</tbody></table></div>`}
function matchHTML(m,me){
  if(m.skipped)return `<div class="v295-match skip"><small>${esc(m.label)}</small><em>Not needed</em></div>`;
  const side=(id,s,won)=>`<div class="v295-side${won?' win':''}${eq(id,me)?' me':''}">${id!=null?teamCell(id,me):'<span class="muted">TBD</span>'}<strong>${m.done?s:''}</strong></div>`;
  const row=m.rowId?(cur().schedule||[]).find(g=>g.id===m.rowId):null;
  return `<div class="v295-match${(eq(m.aId,me)||eq(m.bId,me))?' mine':''}"><small>${esc(m.label)} • ${fmtDate(row?.date||m.date)}${m.forfeitNote?' • '+esc(m.forfeitNote):''}</small>${side(m.aId,m.sa,m.done&&eq(m.winner,m.aId))}${side(m.bId,m.sb,m.done&&eq(m.winner,m.bId))}</div>`}
function eventHTML(ev){
  const me=String(cur().schoolId),F=FORMATS[ev.format];let body='';
  if(ev.format==='roundrobin')body=tableHTML(rrTable(ev),me,'Standings');
  if(ev.format==='pool')body=`<div class="v295-grid2">${['A','B'].map(p=>`<div><h4>Pool ${p}</h4>${tableHTML(poolTable(ev,p).rows,me,'Team')}</div>`).join('')}</div>`;
  if(ev.format.startsWith('series')){const w=seriesWins(ev);body=`<div class="v295-series">${ev.teams.map(id=>`<div>${logo(tname(id))}<b>${esc(tname(id))}</b><strong>${w[id]||0}</strong></div>`).join('<span>WINS</span>')}</div>`}
  const groups=[...new Set(ev.matches.map(m=>m.group))];
  const games=groups.map(g=>`<section class="v295-col"><h4>${esc(g)}</h4>${ev.matches.filter(m=>m.group===g&&(m.aId!=null||m.bId!=null||!m.done||m.skipped)).map(m=>matchHTML(m,me)).join('')}</section>`).join('');
  const places=ev.placements?`<div class="v295-places">${Object.entries(ev.placements).sort((a,b)=>a[0]-b[0]).map(([p,id])=>`<span class="${eq(id,me)?'v295-me':''}"><b>${ordinal(+p)}</b> ${esc(tname(id))}</span>`).join('')}</div>`:'';
  return `<details class="card v295-event" ${ev.done?'':'open'} data-v295="${ev.id}"><summary><div><p class="eyebrow">${esc(ev.kind)} • ${esc(F.label)} • ${ev.size} TEAMS</p><h3>${esc(ev.name)}</h3><p class="muted small">${esc(ev.status||'')}</p></div>${ev.championId?`<span class="v295-champ">🏆 ${esc(tname(ev.championId))}</span>`:''}</summary>
  ${places}${body}<div class="v295-cols">${games}</div>
  <div class="v295-actions">${!ev.done&&!ev.cancelled?`${ev.userOut?`<button type="button" class="secondary small-btn" data-v295-sim="${ev.id}">Sim Rest of Event</button>`:''}<button type="button" class="secondary small-btn" data-v295-cancel="${ev.id}">Withdraw From Event</button>`:`<button type="button" class="secondary small-btn" data-v295-remove="${ev.id}">Remove From List</button>`}</div></details>`}
function renderEvents(){
  const c=cur();const page=$('tournamentsPage');if(!c||!page)return;
  let box=$('v295Events');const list=events().filter(e=>!e.hidden);
  if(!box){box=document.createElement('div');box.id='v295Events';box.className='stack';const anchor=page.querySelector('#tournamentHubList');if(anchor)anchor.insertAdjacentElement('afterend',box);else page.appendChild(box);
    box.addEventListener('click',onAction);
    box.addEventListener('toggle',e=>{const d=e.target.closest?.('[data-v295]');if(d)openState[d.dataset.v295]=d.open},true)}
  const sig=JSON.stringify(list.map(e=>[e.id,e.status,e.matches.map(m=>m.done?1:0).join(''),e.done]));if(!page.contains(box)){const anchor=page.querySelector('#tournamentHubList');anchor?anchor.insertAdjacentElement('afterend',box):page.appendChild(box)}
  if(box.dataset.sig===sig)return;box.dataset.sig=sig;
  box.innerHTML=list.length?`<div class="section-head"><div><p class="eyebrow">NEW TOURNAMENT TYPES</p><h3>Round Robins, Pools, Double Elim & Series</h3></div></div>${list.slice().reverse().map(eventHTML).join('')}`:'';
  for(const d of box.querySelectorAll('[data-v295]'))if(d.dataset.v295 in openState)d.open=openState[d.dataset.v295];
}
const openState={};
function onAction(e){
  const b=e.target.closest('button');if(!b)return;const c=cur();const ev=events().find(x=>x.id===(b.dataset.v295Sim||b.dataset.v295Cancel||b.dataset.v295Remove));if(!ev)return;
  if(b.dataset.v295Sim){ev.simAll=true;step(ev);store();renderEvents();return}
  if(b.dataset.v295Cancel){if(!confirm(`Withdraw from ${ev.name}? Its unplayed games are removed from your schedule.`))return;
    c.schedule=(c.schedule||[]).filter(g=>!(g.eventId===ev.id&&!g.played));ev.cancelled=true;ev.done=true;ev.status='Withdrew';store();try{renderAll()}catch{}renderEvents();return}
  if(b.dataset.v295Remove){ev.hidden=true;store();renderEvents()}
}

/* ---------- wiring ---------- */
function patchKinds(){ // make premade kinds show for bracket formats too (createBracket keeps whatever kind it's given)
  try{const base=window.BM27TournamentEngine?.createBracket;if(base&&!base.__v295){const wrapped=function(o){try{const p=$('tournamentPreset')?.value;if(o&&!o.automatic&&PRESETS[p]&&(o.kind==='Custom Tournament'||!o.kind))o.kind=PRESETS[p].kind}catch{}return base.apply(this,arguments)};wrapped.__v295=1;window.BM27TournamentEngine.createBracket=wrapped}}catch{}}
let t0=0;
function tick(){t0=0;installBuilder();patchKinds();if(!cur())return;runAll();if($('tournamentsPage')?.classList.contains('active')||$('v295Events'))renderEvents()}
const q=()=>{if(!t0)t0=setTimeout(tick,120)};
function install(){
  if(typeof renderAll==='function'){const base=renderAll;renderAll=function(){const r=base.apply(this,arguments);try{runAll()}catch{}q();return r}}
  document.addEventListener('click',e=>{if(e.target.closest?.('#advanceBtn,#playNextBtn,.nav,[data-k]'))setTimeout(q,60)},true);
  q();setInterval(()=>{if(cur()&&!$('game')?.classList.contains('hidden'))q()},4000);
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-open-updates]'))setTimeout(notes,40)},true);
}
function notes(){const box=$('updatesContent');if(!box||box.querySelector('[data-v295-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v295-notes><p class="eyebrow">BM27 v2.9.5</p><h3>More Tournament Types</h3><ul class="update-list"><li>New formats: Round Robin (4–6 teams), Pool Play + Placement Finals (8), Double Elimination (4 or 8), Best-of-3 and Best-of-5 Series.</li><li>12 new premade tournaments: Turkey Day Shootout, Tip-Off Classic, Hall of Fame Classic, Small Town Showdown, King of the Court, MLK Showcase, Ozark Mountain Classic, Border War Classic, Gateway Invitational, Midwest Invitational, Rivalry Series and Heartland Hoops Series.</li><li>Standings, pools, brackets and final placements show on the Tournaments page.</li></ul></article>`)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
window.BM27V295={formats:FORMATS,presets:PRESETS,create:createEvent,run:runAll,events};
})();
