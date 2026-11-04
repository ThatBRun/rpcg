/* BM27 v2.3.6 — Tournament Format Core Repair */
(()=>{
'use strict';
const VERSION='2.3.6';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
function normalizeFormat(v){return ['single','third','placement'].includes(v)?v:'single'}
function formatName(v){return v==='third'?'Single Elimination + 3rd Place':v==='placement'?'Full Consolation / Placement':'Single Elimination'}

function selectedIds(){
 try{if(typeof selectedTournamentIds==='function')return selectedTournamentIds().map(String)}catch{}
 return [...document.querySelectorAll('#tournamentSchoolPicker input[data-tournament-school]:checked')].map(i=>String(i.value));
}

function createTournament236(name,size,start,preset,chosenIds,options={}){
 if(typeof current==='undefined'||!current)throw new Error('Open a career first.');
 if(!window.BM27TournamentEngine?.createBracket)throw new Error('Tournament engine is not ready. Reload BM27 and try again.');
 const wanted=Number(size);
 if(![4,8,16,32].includes(wanted))throw new Error('Tournament size must be 4, 8, 16, or 32 teams.');
 const format=normalizeFormat(options?.format || $('tournamentFormat')?.value || 'single');
 const ids=(chosenIds||selectedIds()).map(String);
 if(ids.length!==wanted-1)throw new Error(`Choose exactly ${wanted-1} other schools.`);
 const selected=ids.map(id=>(current.teams||[]).find(t=>eq(t.id,id))).filter(Boolean);
 if(selected.length!==wanted-1)throw new Error('One or more selected tournament schools could not be found.');
 const me=(current.teams||[]).find(t=>eq(t.id,current.schoolId));
 if(!me)throw new Error('Your school could not be found.');
 const field=[me,...selected];
 const rounds=Math.log2(wanted);
 const pending=(current.schedule||[]).filter(g=>!g.played&&!g.tournamentId).length;
 if(pending+rounds>26)throw new Error(`This tournament can require ${rounds} games and would exceed the 26-game regular-season limit.`);
 const kind=preset==='holiday'?'Holiday Tournament':preset==='showme'?'Show-Me Tournament':preset==='district'?'District Preview Tournament':'Custom Tournament';
 const startISO=new Date(`${start}T18:00:00`).toISOString();
 const t=window.BM27TournamentEngine.createBracket({
   name:name||'Custom Tournament',
   kind,
   entrants:field,
   startDate:startISO,
   automatic:false,
   format
 });
 if(!t)throw new Error('Bracket could not be created.');
 // Make the chosen format authoritative even if an older creator/repair touched it.
 t.format=format;
 t.formatVersion=2360;
 t.formatLabel=formatName(format);
 t.createdWithFormat=format;
 window.BM27TournamentEngine.advance(t);
 try{persist?.()}catch{}
 try{renderAll?.()}catch{}
 try{window.cloudGame?.forceSave?.(current).catch(()=>{})}catch{}
 try{toast?.(`${t.name} created — ${formatName(format)}.`)}catch{}
 return t;
}

function repairFormats(save){
 if(!save)return;
 for(const t of save.tournaments||[]){
   if(!t||t.automatic)continue;
   t.format=normalizeFormat(t.format||t.createdWithFormat);
   t.formatLabel=formatName(t.format);
   t.formatVersion=2360;
 }
 try{window.BM27TournamentEngine?.repair?.(save)}catch(e){console.warn('BM27 v2.3.6 tournament repair',e)}
}

function install(){
 if(window.__BM27_V236__)return;window.__BM27_V236__=true;

 // This is intentionally installed LAST so older tournament creators cannot win.
 try{createTournament=createTournament236}catch{}
 window.createTournament=createTournament236;

 const form=$('tournamentForm');
 if(form)form.onsubmit=e=>{
   e.preventDefault();
   try{
     const preset=$('tournamentPreset')?.value||'custom';
     const size=Number($('tournamentSize')?.value||8);
     const names={holiday:'Holiday Classic',showme:'Show-Me Shootout',district:'District Preview Classic',custom:'Custom Tournament'};
     const format=normalizeFormat($('tournamentFormat')?.value||'single');
     createTournament236($('tournamentName')?.value.trim()||names[preset]||'Custom Tournament',size,$('tournamentStart')?.value,preset,selectedIds(),{format});
     $('tournamentDialog')?.close();
   }catch(err){try{toast?.(err.message||String(err))}catch{}}
 };

 if(typeof openSave==='function'){
   const base=openSave;
   openSave=function(){const r=base.apply(this,arguments);repairFormats(typeof current!=='undefined'?current:null);return r}
 }
 if(typeof renderTournaments==='function'){
   const base=renderTournaments;
   renderTournaments=function(){repairFormats(typeof current!=='undefined'?current:null);return base.apply(this,arguments)}
 }
 setTimeout(()=>repairFormats(typeof current!=='undefined'?current:null),100);

 document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
   const box=$('updatesContent');if(!box||box.querySelector('[data-v236-notes]'))return;
   box.insertAdjacentHTML('afterbegin','<article class="card" data-v236-notes><p class="eyebrow">BM27 v2.3.6</p><h3>Tournament Format Core Repair</h3><ul class="update-list"><li>The tournament builder now has one authoritative creator loaded after every older hotfix.</li><li>Single Elimination advances winners only.</li><li>Single Elimination + 3rd Place sends semifinal losers to a real 3rd-place game.</li><li>Full Consolation / Placement keeps winners and losers moving through separate paths until every finishing place is decided.</li><li>The selected format is stored directly on the tournament and survives save/load.</li></ul></article>');
 },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V236={createTournament:createTournament236,repairFormats};
})();