/* BM27 v2.3.5 — Existing Save Senior Migration */
(()=>{
'use strict';
const VERSION='2.3.5';
const eq=(a,b)=>String(a)===String(b);
function archivedGraduateKeys(save){
 const ids=new Set(), sigs=new Set();
 const archives=save?.v2?.seasonArchive||[];
 const currentSeason=Number(save?.season)||0;
 for(const season of archives){
  if(Number(season?.season)>=currentSeason)continue;
  const rosters=season?.rosters||{Varsity:season?.roster||[]};
  for(const list of Object.values(rosters||{}))for(const p of Array.isArray(list)?list:[]){
   if(Number(p?.grade)>=12){
    if(p?.id!=null)ids.add(String(p.id));
    if(p?.name)sigs.add(`${String(p.name).trim().toLowerCase()}|${String(p.pos||'').trim().toLowerCase()}`);
   }
  }
 }
 return {ids,sigs};
}
function wasArchivedSenior(p,keys){
 if(!p)return false;
 if(p.id!=null&&keys.ids.has(String(p.id)))return true;
 const sig=`${String(p.name||'').trim().toLowerCase()}|${String(p.pos||'').trim().toLowerCase()}`;
 return !!p.name&&keys.sigs.has(sig);
}
function repairGraduatedSeniors(save){
 if(!save)return 0;
 save.v2=save.v2||{};
 const keys=archivedGraduateKeys(save);
 let removed=0;
 const removeList=list=>(Array.isArray(list)?list.filter(p=>{const gone=wasArchivedSenior(p,keys);if(gone)removed++;return !gone}):list);

 // Whole-program roster is authoritative in Program Dynasty.
 if(Array.isArray(save.v2.programPlayers))save.v2.programPlayers=removeList(save.v2.programPlayers);

 // Also clean every team roster, including the user's mirrored Varsity roster.
 for(const t of save.teams||[])if(Array.isArray(t.roster))t.roster=removeList(t.roster);

 // Old tryout pools could also carry graduated seniors forward.
 if(Array.isArray(save.tryoutPool))save.tryoutPool=removeList(save.tryoutPool);

 const graduateIds=keys.ids;
 if(Array.isArray(save.v2.injuries))save.v2.injuries=save.v2.injuries.filter(i=>!graduateIds.has(String(i?.playerId)));
 if(Array.isArray(save.v2.collegeVisits))save.v2.collegeVisits=save.v2.collegeVisits.filter(v=>!graduateIds.has(String(v?.playerId)));
 for(const k of Object.keys(save.v2.collegeRelations||{})){
   const rel=save.v2.collegeRelations[k];
   if(graduateIds.has(String(rel?.playerId)))delete save.v2.collegeRelations[k];
 }
 try{if(typeof syncVarsity==='function')syncVarsity(save)}catch{}

 save.v235=save.v235||{};
 save.v235.migratedExistingSave=true;
 save.v235.lastMigrationSeason=Number(save.season)||0;
 save.v235.lastRemovedCount=removed;
 return removed;
}
function migrateCurrent(render=false){
 if(typeof current==='undefined'||!current)return 0;
 const n=repairGraduatedSeniors(current);
 try{persist?.()}catch{}
 if(render)try{renderAll?.()}catch{}
 if(n){
   current.news=current.news||[];
   current.news.unshift({date:current.day,text:`Existing-save migration removed ${n} graduated senior${n===1?'':'s'} from active rosters. Historical rosters remain unchanged.`});
   try{persist?.()}catch{}
   if(render)try{renderAll?.()}catch{}
 }
 return n;
}
function install(){
 if(window.__BM27_V235__)return;window.__BM27_V235__=true;

 // Run directly on the selected save object BEFORE the game renders.
 if(typeof openSave==='function'){
   const base=openSave;
   openSave=function(id){
     try{
       if(typeof saves!=='undefined'){
         const s=saves.find(x=>String(x?.id)===String(id));
         if(s)repairGraduatedSeniors(s);
       }
     }catch(e){console.warn('BM27 v2.3.5 pre-open migration',e)}
     const r=base.apply(this,arguments);
     migrateCurrent(true);
     return r;
   };
 }

 // Cloud/local save restoration can happen after DOM setup, so retry after startup.
 setTimeout(()=>migrateCurrent(false),50);
 setTimeout(()=>migrateCurrent(true),500);

 // Future offseasons still get the cleanup as a safety check.
 if(typeof applyOffseason==='function'){
   const base=applyOffseason;
   applyOffseason=function(){
     const r=base.apply(this,arguments);
     setTimeout(()=>migrateCurrent(true),0);
     return r;
   };
 }

 document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
   const box=document.getElementById('updatesContent');
   if(!box||box.querySelector('[data-v235-notes]'))return;
   box.insertAdjacentHTML('afterbegin','<article class="card" data-v235-notes><p class="eyebrow">BM27 v2.3.5</p><h3>Existing Save Senior Migration</h3><ul class="update-list"><li>Old careers are repaired before they render.</li><li>Graduated seniors are matched by player ID and by name/position for older saves whose IDs changed.</li><li>Varsity, JV, Freshman, Sophomore, Junior, team rosters, and tryout pools are cleaned.</li><li>Historical season archives stay untouched.</li></ul></article>');
 },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V235={repairGraduatedSeniors,migrateCurrent};
})();