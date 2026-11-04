/* BM27 v2.7.37 — authoritative season-type/state synchronization
   Fixes saves where the calendar moved to Summer/Fall/Preseason but older UI
   still believed the career was in Regular Season.
*/
(()=>{'use strict';
const VERSION='2.7.37';
const $=id=>document.getElementById(id);
const dateOnly=v=>String(v||'').slice(0,10);
function save(){return typeof current!=='undefined'?current:null}
function toastSafe(m){try{toast?.(m)}catch{}}
function persistSafe(){try{return persist?.()}catch(e){console.warn('BM27 v2.7.37 persist',e);return false}}
function label(p){return ({summer:'Summer League',fall:'Fall League',preseason:'Preseason',regular:'Regular Season'}[p]||'Regular Season')}
function phaseFromDate(s=save()){
  if(!s)return 'regular';
  const y=Number(s.season)||new Date(s.day||Date.now()).getFullYear(),d=dateOnly(s.day);
  if(!d)return 'regular';
  if(d>=`${y}-05-30`&&d<=`${y}-09-03`)return 'summer';
  if(d>=`${y}-09-04`&&d<=`${y}-10-31`)return 'fall';
  if(d>=`${y}-11-01`&&d<=`${y}-11-23`)return 'preseason';
  return 'regular';
}
function syncPhase(s=save(),persist=false){
  if(!s)return 'regular';
  const p=phaseFromDate(s),name=label(p);
  s.v2721=s.v2721||{};
  s.v2721.stage=p;
  s.v2721.seasonStart=`${Number(s.season)||2026}-11-24T12:00:00`;
  s.v2736=s.v2736||{};
  s.v2736.phase=p;
  s.v2737=s.v2737||{};
  const changed=s.v2737.phase!==p||s.seasonType!==name||s.seasonPhase!==p;
  s.v2737.phase=p;
  s.v2737.phaseName=name;
  s.v2737.syncedAt=new Date().toISOString();
  // Friendly aliases for any older/newer modules that ask what season type is active.
  s.seasonType=name;
  s.seasonPhase=p;
  s.currentSeasonType=name;
  if(p==='summer'||p==='fall'){
    s.leagues=s.leagues||{};
    s.leagues.summer=Array.isArray(s.leagues.summer)?s.leagues.summer:[];
    s.leagues.fall=Array.isArray(s.leagues.fall)?s.leagues.fall:[];
    s.scheduleLocked=true;
  }else if(p==='preseason')s.scheduleLocked=false;
  if(changed&&persist)persistSafe();
  return p;
}
function syncLeagueControls(){
  const s=save();if(!s)return;const p=syncPhase(s,false);
  document.querySelectorAll('[data-league-add]').forEach(b=>{
    const type=String(b.dataset.leagueAdd||'');
    b.disabled=p!==type;
    b.textContent=type==='summer'?'Add Summer Game — No Pitch':'Add Fall Game — No Pitch';
    b.title=p===type?'Add a game directly to this league schedule.':`${label(type)} scheduling opens during the ${label(type)} phase.`;
  });
  document.querySelectorAll('[data-league-ai]').forEach(b=>{
    const type=String(b.dataset.leagueAi||'');
    b.disabled=p!==type;
    b.textContent=type==='summer'?'Build Summer Schedule':'Build Fall Schedule';
  });
  const card=$('v2721OffseasonFlow');
  if(card){
    const h=card.querySelector('h3');if(h)h.textContent=label(p);
    const tag=card.querySelector('.tag');if(tag)tag.textContent=p==='regular'?'SEASON':p.toUpperCase();
    const eyebrow=card.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent=`OFFSEASON CALENDAR • ${dateOnly(s.day)}`;
  }
  try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.37'}catch{}
}
function prepareLeagueDialog(type){
  const s=save();if(!s)return false;const p=syncPhase(s,true);
  if(p!==type){toastSafe(`${label(type)} scheduling is locked because the career is currently in ${label(p)}.`);return false}
  s.leagues=s.leagues||{summer:[],fall:[]};s.leagues[type]=Array.isArray(s.leagues[type])?s.leagues[type]:[];
  if(s.leagues[type].length>=10){toastSafe('This league already has 10 games.');return false}
  const lt=$('leagueType');if(lt)lt.value=type;
  const opp=$('leagueOpponent');if(opp)opp.innerHTML=(s.teams||[]).filter(t=>String(t.id)!==String(s.schoolId)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).map(t=>`<option value="${String(t.id).replace(/"/g,'&quot;')}">${String(t.name||'School')} ${String(t.mascot||'')}</option>`).join('');
  const input=$('leagueDate');if(input){
    const y=Number(s.season)||2026;
    input.min=type==='summer'?`${y}-05-30`:`${y}-09-04`;
    input.max=type==='summer'?`${y}-09-03`:`${y}-10-31`;
    if(!input.value||input.value<input.min||input.value>input.max)input.value=type==='summer'?`${y}-06-03`:`${y}-09-06`;
  }
  const dlg=$('leagueDialog');try{if(dlg&&!dlg.open)dlg.showModal()}catch{}
  return true;
}
function install(){
  if(window.__BM27_V2737__)return;window.__BM27_V2737__=true;
  syncPhase(save(),true);
  // Synchronize BEFORE older render wrappers inspect v2721.stage, then again after.
  if(typeof renderAll==='function'){
    const base=renderAll;renderAll=function(){syncPhase(save(),false);const r=base.apply(this,arguments);syncPhase(save(),false);syncLeagueControls();return r};
  }
  if(typeof renderLeagues==='function'){
    const base=renderLeagues;renderLeagues=function(){syncPhase(save(),false);const r=base.apply(this,arguments);syncPhase(save(),false);syncLeagueControls();return r};
  }
  if(typeof openSave==='function'){
    const base=openSave;openSave=function(){const r=base.apply(this,arguments);syncPhase(save(),true);syncLeagueControls();return r};
  }
  // Make the two direct-add buttons authoritative. No pitching/negotiation path is used.
  document.addEventListener('click',e=>{
    const add=e.target?.closest?.('[data-league-add]');
    if(add){
      e.preventDefault();e.stopImmediatePropagation();prepareLeagueDialog(String(add.dataset.leagueAdd||''));
      return;
    }
    const ai=e.target?.closest?.('[data-league-ai]');
    if(ai){syncPhase(save(),true);}
  },true);
  // Before league-form guards run, ensure the legacy stage field matches the actual date.
  document.addEventListener('submit',e=>{if(e.target?.id==='leagueForm')syncPhase(save(),true)},true);
  syncLeagueControls();
}
window.BM27V2737={version:VERSION,phase:phaseFromDate,syncPhase,syncLeagueControls,prepareLeagueDialog};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
