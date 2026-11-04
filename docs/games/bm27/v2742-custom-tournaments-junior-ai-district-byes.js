/* BM27 v2.7.42 — flexible tournaments + Missouri mega event + junior AI schedules.
   District bye placement is implemented in season-engine.js: top seeds receive first-round byes.
*/
(()=>{'use strict';
const VERSION='2.7.42';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const dayKey=v=>String(v||'').slice(0,10);
function save(){return typeof current!=='undefined'?current:null}
function toastSafe(m){try{toast?.(m)}catch{}}
function persistSafe(){try{return persist?.()}catch(e){console.warn('v2742 persist',e)}}
function renderSafe(){try{return renderAll?.()}catch(e){console.warn('v2742 render',e)}}
function ensureTournamentControls(){
  const form=$('tournamentForm'),size=$('tournamentSize'),preset=$('tournamentPreset');if(!form||!size||!preset)return;
  if(![...size.options].some(o=>o.value==='custom-count')){size.insertAdjacentHTML('beforeend','<option value="custom-count">Custom Team Count</option><option value="all-missouri">Every Missouri School — Special Event</option>')}
  if(!$('v2742CustomCount')){
    const label=document.createElement('label');label.id='v2742CustomCountWrap';label.style.display='none';label.innerHTML='Custom number of teams<input id="v2742CustomCount" type="number" min="2" max="512" value="12"><small class="muted">Top seeds automatically receive byes when needed.</small>';
    size.closest('label')?.insertAdjacentElement('afterend',label);
  }
  size.addEventListener('change',syncTournamentControls);
  syncTournamentControls();
}
function syncTournamentControls(){
  const mode=$('tournamentSize')?.value,wrap=$('v2742CustomCountWrap'),picker=$('tournamentSchoolPicker')?.closest?.('.team-picker')||$('tournamentSchoolPicker');
  if(wrap)wrap.style.display=mode==='custom-count'?'':'none';
  const count=$('v2742CustomCount');if(count&&save())count.max=String(Math.max(2,(save().teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly).length));
  const note=$('tournamentSelectionCount');if(note&&mode==='all-missouri')note.textContent='Every Missouri school will be entered automatically.';
}
function selectedIds(){try{return typeof selectedTournamentIds==='function'?selectedTournamentIds().map(String):[]}catch{return []}}
function customTeamCount(){const n=Number($('v2742CustomCount')?.value||8),max=(save()?.teams||[]).length||512;return Math.max(2,Math.min(max,Math.round(n)))}
function createFlexibleTournament({allMissouri=false}={}){
  const s=save(),engine=window.BM27SeasonEngine;if(!s||!engine?.createBracket||!engine?.driveTournament)throw new Error('Tournament engine is unavailable.');
  let entrants=[];
  if(allMissouri){entrants=(s.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly).map(t=>String(t.id));if(!entrants.includes(String(s.schoolId)))entrants.unshift(String(s.schoolId));}
  else {const count=customTeamCount(),chosen=selectedIds();if(chosen.length!==count-1)throw new Error(`Choose exactly ${count-1} other schools for a ${count}-team tournament.`);entrants=[String(s.schoolId),...chosen];}
  entrants=[...new Set(entrants)];if(entrants.length<2)throw new Error('At least two teams are required.');
  const start=$('tournamentStart')?.value;if(!start)throw new Error('Choose a tournament start date.');
  const rounds=Math.ceil(Math.log2(entrants.length));
  if(!allMissouri){const nonPost=(s.schedule||[]).filter(g=>!['District Tournament','State Tournament'].includes(g.type)).length;if(nonPost+rounds>26)throw new Error(`Your path can require ${rounds} games and would exceed the 26-game limit.`)}
  const name=$('tournamentName')?.value.trim()||(allMissouri?'Missouri Mega Tournament':`${entrants.length}-Team Custom Tournament`);
  const type=allMissouri?'Missouri Mega Tournament':'Custom Tournament';
  const t=engine.createBracket({name,type,entrants,startDate:new Date(`${start}T18:00:00`).toISOString(),automatic:false});
  if(!t)throw new Error('Could not create the tournament.');t.specialEvent=!!allMissouri;t.customTeamCount=entrants.length;t.v2742=true;engine.driveTournament(t);persistSafe();renderSafe();return t;
}
function juniorApi(){return window.BM27V2739}
function crossApi(){return window.BM27V2740}
function activeLetters(v,g){const n=Math.max(1,Math.min(8,Number(v?.teamCounts?.[g])||1));return 'ABCDEFGH'.slice(0,n).split('')}
function aiJuniorSchedules(){
  const s=save(),a=juniorApi(),x=crossApi(),v=a?.ensure?.(s);if(!s||!v||!x?.addExternalGame)return toastSafe('Junior Program is not ready yet.');
  const programs=[...(x.programs||[])],clubs=[...(a.clubs||[])].filter(c=>!c.stlJuniorProgram);const y=Number(s.season)||2026;let added=0;
  for(const g of [3,4,5,6,7,8])for(const L of activeLetters(v,g)){
    const team=v?.teams?.[g]?.[L];if(!team)continue;let target=Math.min(18,26-(team.schedule||[]).length),attempt=0;
    while(target>0&&attempt++<80){const isClub=attempt%3===0&&clubs.length;const pool=isClub?clubs:programs;if(!pool.length)break;const p=pool[(attempt*7+g+L.charCodeAt(0))%pool.length],oppL='ABCDE'[(attempt+g)%5];const d=new Date(`${y}-11-24T18:00:00`);d.setDate(d.getDate()+((attempt*3+g*2+L.charCodeAt(0))%100));const date=dayKey(d.toISOString());const res=x.addExternalGame(s,{grade:g,letter:L,opponentType:isClub?'club':'junior',programId:p.id,opponentLetter:oppL,date,location:attempt%2?'away':'home'});if(res?.ok){added++;target--}
    }
  }
  persistSafe();a.renderJunior?.();toastSafe(`AI generated ${added} junior-program games.`);return added;
}
function installJuniorButton(){const page=$('juniorProgramPage');if(!page||$('v2742JuniorAI'))return;const card=document.createElement('article');card.className='card';card.id='v2742JuniorAI';card.innerHTML='<div class="section-head"><div><p class="eyebrow">JUNIOR PROGRAM AI</p><h3>AI Generate Junior Schedules</h3><p class="muted small">Builds schedules for every active 3rd–8th grade team while preserving games you already made.</p></div><button id="v2742BuildJuniorSchedules" class="primary">AI Generate All Schedules</button></div>';page.insertBefore(card,page.querySelector('.office-grid')||page.firstChild);$('v2742BuildJuniorSchedules').onclick=aiJuniorSchedules;}
function install(){if(window.__BM27_V2742__)return;window.__BM27_V2742__=true;ensureTournamentControls();installJuniorButton();document.addEventListener('submit',e=>{if(e.target?.id!=='tournamentForm')return;const mode=$('tournamentSize')?.value;if(!['custom-count','all-missouri'].includes(mode))return;e.preventDefault();e.stopImmediatePropagation();try{const t=createFlexibleTournament({allMissouri:mode==='all-missouri'});$('tournamentDialog')?.close();toastSafe(`${t.name} created with ${t.customTeamCount} teams.`)}catch(err){toastSafe(err.message||String(err))}},true);document.addEventListener('click',e=>{if(e.target.closest?.('#v2739JuniorNav'))setTimeout(installJuniorButton,0)},true);try{const x=document.querySelector('.v2713-menu-version span');if(x)x.textContent='v2.7.42'}catch{}}
window.BM27V2742={version:VERSION,createFlexibleTournament,aiJuniorSchedules};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
