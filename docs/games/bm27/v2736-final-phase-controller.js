/* BM27 v2.7.36 — FINAL authoritative phase controller
   Only this loaded file owns: Regular -> Summer -> Fall -> Preseason -> Regular.
   Root fix: legacy render helpers are no longer allowed to turn May 30 into Oct 30.
*/
(()=>{'use strict';
const VERSION='2.7.36';
const $=id=>document.getElementById(id);
const dateOnly=v=>String(v||'').slice(0,10);
const iso=(y,m,d,h=12)=>`${Number(y)}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:00:00`;
function save(){return typeof current!=='undefined'?current:null}
function toastSafe(m){try{toast?.(m)}catch{}}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.36 persist',e);return false}}
function renderSafe(){try{return renderAll?.()}catch(e){console.warn('BM27 v2.7.36 render',e)}}
function clone(x){return JSON.parse(JSON.stringify(x))}
function ensure(s=save()){
  if(!s)return null;
  s.v2721=s.v2721||{};
  s.leagues=s.leagues||{};
  s.leagues.summer=Array.isArray(s.leagues.summer)?s.leagues.summer:[];
  s.leagues.fall=Array.isArray(s.leagues.fall)?s.leagues.fall:[];
  return s.v2721;
}
function validPhase(p){return ['regular','summer','fall','preseason'].includes(String(p||'').toLowerCase())}
function oldMarker(s){
  return s?.v2721?.startedFromSeason!=null || ['summer','fall','preseason'].includes(String(s?.v2734?.phase||'').toLowerCase()) || ['summer','fall','preseason'].includes(String(s?.v2735?.phase||'').toLowerCase()) || ['summer','fall','preseason'].includes(String(s?.v2733?.lastPhaseDateFix?.stage||'').toLowerCase());
}
function markerPhase(s){
  for(const p of [s?.v2735?.phase,s?.v2734?.phase,s?.v2733?.lastPhaseDateFix?.stage]){const x=String(p||'').toLowerCase();if(['summer','fall','preseason'].includes(x))return x}
  return '';
}
function inferWhenMissing(s){
  const y=Number(s?.season)||0,d=dateOnly(s?.day);if(!y||!d)return 'regular';
  if(d>=`${y}-11-01`&&d<=`${y}-11-23`)return 'preseason';
  if(d>=`${y}-05-30`&&d<=`${y}-09-03`&&(oldMarker(s)||(s.leagues?.summer?.length||0)))return 'summer';
  if(d>=`${y}-09-04`&&d<=`${y}-10-31`&&(oldMarker(s)||(s.leagues?.fall?.length||0)))return 'fall';
  return 'regular';
}
function phase(s=save()){
  const v=ensure(s);if(!s||!v)return 'regular';
  let p=String(v.stage||'').toLowerCase();
  if(!validPhase(p)){p=inferWhenMissing(s);v.stage=p}
  // Repair already-made saves from v2.7.33-v2.7.35 where rollover finished
  // but a legacy render put the date at Oct 30 / left stage as Regular.
  if(p==='regular'&&oldMarker(s)){
    const y=Number(s.season)||2026,d=dateOnly(s.day);
    // Legacy markers only repair a Regular flag while the calendar is still in the
    // offseason portion of the year. A real Nov 24+ Regular Season must stay regular.
    if(d<`${y}-11-01`){
      const marked=markerPhase(s);
      if(marked){p=marked;v.stage=p}
      else if(!(s.schedule||[]).some(g=>!g.played)){p='summer';v.stage=p}
    }
  }
  return p;
}
function phaseName(p=phase()){return ({regular:'Regular Season',summer:'Summer League',fall:'Fall League',preseason:'Preseason'}[p]||'Regular Season')}
function targetFor(p,s=save()){
  const y=Number(s?.season)||2026;
  if(p==='summer')return iso(y,5,30);
  if(p==='fall')return iso(y,9,4);
  if(p==='preseason')return iso(y,11,1);
  return iso(y,11,24);
}
function setPhase(s,p,forceDate=true){
  if(!s)return false;const v=ensure(s);p=validPhase(p)?p:'regular';v.stage=p;v.seasonStart=iso(Number(s.season)||2026,11,24);if(forceDate)s.day=targetFor(p,s);
  s.v2736=s.v2736||{};s.v2736.phase=p;s.v2736.phaseDate=s.day;s.v2736.updatedAt=new Date().toISOString();return true;
}
function nationalDone(s){return !!(s?.v22?.nationals?.championId||s?.v22?.nationals?.status==='Complete')}
function leagueDone(s,type){const a=s?.leagues?.[type]||[];return a.length>0&&a.every(g=>g.played)}
function clearNegotiations(s){if(s?.v2?.scheduleNegotiations){s.v2.scheduleNegotiations.incoming=[];s.v2.scheduleNegotiations.outgoing=[]}}
function archiveOffseason(s){
  const v=ensure(s);if(!s||!v)return;
  if(typeof window.BM27V2721?.archiveOffseason==='function'){try{window.BM27V2721.archiveOffseason(s);return}catch{}}
  v.offseasonHistory=Array.isArray(v.offseasonHistory)?v.offseasonHistory:[];
  const id=`${s.season}-offseason`,entry={id,season:Number(s.season),label:`${s.season} Offseason`,summer:clone(s.leagues.summer),fall:clone(s.leagues.fall),archivedAt:s.day};
  const i=v.offseasonHistory.findIndex(x=>x.id===id);if(i>=0)v.offseasonHistory[i]=entry;else v.offseasonHistory.push(entry);
}
function normalizeRegularDates(s){
  const floor=new Date(`${Number(s.season)||2026}-11-24T00:00:00`).getTime();let cursor=floor;
  for(const g of (s.schedule||[]).filter(g=>!['Summer League','Fall League'].includes(g?.type)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))){
    let t=new Date(g.date).getTime();if(!Number.isFinite(t))t=floor;
    if(t<floor){const d=new Date(cursor);d.setHours(19,0,0,0);g.date=d.toISOString();cursor=d.getTime()+2*86400000}else cursor=Math.max(cursor,t+2*86400000)
  }
}
function repair(s=save()){
  if(!s)return false;const v=ensure(s);let p=phase(s),y=Number(s.season)||2026,d=dateOnly(s.day),changed=false;
  // Old clean/new careers that still sit on Oct 30 should be Nov 1 preseason unless they truly were in Fall League.
  if(p==='regular'&&d===`${y}-10-30`&&!oldMarker(s)&&!(s.leagues?.fall?.length||0)){p='preseason';v.stage=p;s.day=targetFor(p,s);changed=true;d=dateOnly(s.day)}
  const ranges={summer:[`${y}-05-30`,`${y}-09-03`],fall:[`${y}-09-04`,`${y}-10-31`],preseason:[`${y}-11-01`,`${y}-11-23`]};
  if(ranges[p]&&(d<ranges[p][0]||d>ranges[p][1])){s.day=targetFor(p,s);changed=true}
  v.version=VERSION;s.v2736=s.v2736||{};s.v2736.lastRepairAt=new Date().toISOString();return changed;
}
function toSummer(s){
  if(!nationalDone(s)){toastSafe('Finish the National Championship before starting Summer League.');return false}
  const oldSeason=Number(s.season)||0;
  try{if(typeof applyOffseason!=='function')throw new Error('Offseason rollover is unavailable.');applyOffseason()}catch(e){console.error('BM27 v2.7.36 rollover',e);toastSafe('The offseason rollover could not finish.');return false}
  const x=save();if(!x||Number(x.season)<=oldSeason){toastSafe('The season rollover was blocked. Finish every required game first.');return false}
  ensure(x);setPhase(x,'summer');x.schedule=[];x.scheduleLocked=true;x.leagues={summer:[],fall:[]};clearNegotiations(x);x.v2721.startedFromSeason=oldSeason;x.v2721.offseasonYear=Number(x.season);
  x.news=x.news||[];x.news.unshift({date:x.day,category:'Summer League',text:'Summer League begins May 30. Games are added directly — no pitch required.'});return true;
}
function toFall(s){
  if(!leagueDone(s,'summer')){toastSafe('Schedule and finish every Summer League game first.');return false}
  setPhase(s,'fall');clearNegotiations(s);s.news=s.news||[];s.news.unshift({date:s.day,category:'Fall League',text:'Fall League begins September 4. Games are added directly — no pitch required.'});return true;
}
function toPreseason(s){
  if(!leagueDone(s,'fall')){toastSafe('Schedule and finish every Fall League game first.');return false}
  archiveOffseason(s);setPhase(s,'preseason');s.schedule=[];s.scheduleLocked=false;clearNegotiations(s);for(const t of s.teams||[]){t.wins=0;t.losses=0;t.pf=0;t.pa=0}if(s.seasonEngine?.games)s.seasonEngine.games=[];
  s.news=s.news||[];s.news.unshift({date:s.day,category:'Program',text:'Fall League is complete. Preseason opens November 1. The new-year record is 0-0.'});
  try{window.BM27SeasonEngine?.migrate?.(s,{reset:true});window.BM27SeasonEngine?.rebuildRecords?.()}catch{}return true;
}
function toRegular(s){normalizeRegularDates(s);setPhase(s,'regular');s.scheduleLocked=false;s.news=s.news||[];s.news.unshift({date:s.day,category:'Program',text:`The ${s.season}-${String(Number(s.season)+1).slice(-2)} regular season begins November 24.`});return true}
function advancePhase(){
  let s=save();if(!s)return false;if(repair(s))persistSafe();const before=phase(s);let ok=false;
  if(before==='regular')ok=toSummer(s);else if(before==='summer')ok=toFall(s);else if(before==='fall')ok=toPreseason(s);else ok=toRegular(s);
  if(!ok){syncUI();return false}
  s=save();const after=phase(s);repair(s);persistSafe();renderSafe();
  // Final assertion AFTER all old render wrappers ran. Nothing may overwrite the phase/date after this.
  s=save();if(s){setPhase(s,after);persistSafe();syncUI()}
  if(after==='summer'||after==='fall')setTimeout(()=>document.querySelector('[data-page="leagues"]')?.click(),0);
  toastSafe(`${phaseName(after)} started — ${dateOnly(s?.day)}.`);return true;
}
function buttonState(s=save()){
  if(!s)return {label:'Next Phase',disabled:true};const p=phase(s);
  if(p==='regular')return nationalDone(s)?{label:'Start Summer League — May 30',disabled:false}:{label:'Finish National Championship First',disabled:true};
  if(p==='summer')return leagueDone(s,'summer')?{label:'Start Fall League — September 4',disabled:false}:{label:'Finish Summer League Games First',disabled:true};
  if(p==='fall')return leagueDone(s,'fall')?{label:'Start Preseason — November 1',disabled:false}:{label:'Finish Fall League Games First',disabled:true};
  return {label:'Start Regular Season — November 24',disabled:false};
}
function syncUI(){
  const s=save();if(!s)return;const p=phase(s),st=buttonState(s),card=$('v2721OffseasonFlow');
  if(card){const actions=card.querySelector('.schedule-actions');if(actions)actions.innerHTML=`<button id="v2736PhaseAdvance" class="primary" ${st.disabled?'disabled':''}>${st.label}</button>`;const h=card.querySelector('h3');if(h)h.textContent=phaseName(p);const tag=card.querySelector('.tag');if(tag)tag.textContent=p==='regular'?'SEASON':p.toUpperCase()}
  const next=$('nextSeasonBtn');if(next){next.textContent=st.label;next.disabled=st.disabled}
  document.querySelectorAll('[data-league-add]').forEach(b=>{const t=b.dataset.leagueAdd;b.textContent=t==='summer'?'Add Summer Game — No Pitch':'Add Fall Game — No Pitch';b.disabled=p!==t});
  try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.36'}catch{}
}
function install(){
  if(window.__BM27_V2736__)return;window.__BM27_V2736__=true;if(save()&&repair())persistSafe();
  const baseRender=typeof renderAll==='function'?renderAll:null;if(baseRender)renderAll=function(){const r=baseRender.apply(this,arguments);if(save()&&repair())persistSafe();syncUI();return r};
  const baseLeagues=typeof renderLeagues==='function'?renderLeagues:null;if(baseLeagues)renderLeagues=function(){const r=baseLeagues.apply(this,arguments);if(save()&&repair())persistSafe();syncUI();return r};
  if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);if(save()&&repair())persistSafe();syncUI();return r}};
  document.addEventListener('click',e=>{const b=e.target?.closest?.('#v2736PhaseAdvance,#v2722StartSummer,#v2721EndSummer,#v2721EndFall,#v2721StartSeason,#nextSeasonBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();advancePhase()},true);
  syncUI();
}
window.BM27V2736={version:VERSION,phase,phaseName,targetFor,setPhase,advancePhase,buttonState,repair};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
