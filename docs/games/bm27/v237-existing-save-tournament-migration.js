/* BM27 v2.3.7 — Existing Save Tournament Format Migration */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
const validFormat=v=>['single','third','placement'].includes(v)?v:'single';
function loser(m){if(!m?.played||!m.team1Id||!m.team2Id||!m.winnerId)return null;return eq(m.winnerId,m.team1Id)?m.team2Id:m.team1Id}
function uid237(){try{return crypto.randomUUID()}catch{return `t237-${Date.now()}-${Math.random().toString(36).slice(2)}`}}
function ensureOldThirdPlace(t,save){
 if(t.format!=='third'||t.thirdPlaceGame||!Array.isArray(t.rounds)||t.rounds.length<2)return;
 const semis=t.rounds[t.rounds.length-2];
 if(!semis?.matches?.length||semis.matches.some(m=>!m.played))return;
 const ls=semis.matches.map(loser).filter(Boolean);
 if(ls.length!==2)return;
 const final=t.rounds[t.rounds.length-1];
 const date=final?.date||semis.date||save.day;
 t.thirdPlaceGame={id:uid237(),team1Id:ls[0],team2Id:ls[1],date,played:false,score1:null,score2:null,winnerId:null,label:'3rd Place Game'};
}
function cleanStaleUnplayed(t,save){
 const valid=new Set((t.rounds||[]).flatMap(r=>(r.matches||[]).map(m=>String(m.id))));
 if(t.thirdPlaceGame)valid.add(String(t.thirdPlaceGame.id));
 save.schedule=(save.schedule||[]).filter(g=>!eq(g.tournamentId,t.id)||g.played||!g.tournamentMatchId||valid.has(String(g.tournamentMatchId)));
 for(const id of Object.keys(save.teamSchedules||{})){
   save.teamSchedules[id]=(save.teamSchedules[id]||[]).filter(g=>!eq(g.tournamentId,t.id)||g.played||!g.tournamentMatchId||valid.has(String(g.tournamentMatchId)));
 }
}
function migrateTournament(t,save){
 if(!t||t.automatic||!Array.isArray(t.rounds))return false;
 const before=JSON.stringify({format:t.format,formatVersion:t.formatVersion,third:!!t.thirdPlaceGame});
 // Preserve the format that an old save already chose. v2.2.11+ stored it as t.format.
 t.format=validFormat(t.format||t.createdWithFormat);
 t.createdWithFormat=t.format;
 t.formatVersion=2370;
 t.formatLabel=t.format==='third'?'Single Elimination + 3rd Place':t.format==='placement'?'Full Consolation / Placement':'Single Elimination';
 t.placements=t.placements||{};
 t.rounds.forEach((r,ri)=>{r.matches=Array.isArray(r.matches)?r.matches:[];r.matches.forEach(m=>{m.roundIndex=ri})});
 ensureOldThirdPlace(t,save);
 cleanStaleUnplayed(t,save);
 // Core repair/advance now reads the migrated format and generates the correct next path.
 try{window.BM27TournamentEngine?.repair?.(save)}catch(e){console.warn('v2.3.7 bracket migration repair',e)}
 return before!==JSON.stringify({format:t.format,formatVersion:t.formatVersion,third:!!t.thirdPlaceGame});
}
function migrateSave(save){
 if(!save)return 0;
 save.tournaments=Array.isArray(save.tournaments)?save.tournaments:[];
 let changed=0;
 for(const t of save.tournaments)if(migrateTournament(t,save))changed++;
 save.v237=save.v237||{};
 save.v237.tournamentFormatMigration=true;
 save.v237.migratedSeason=Number(save.season)||0;
 save.v237.migratedCount=changed;
 return changed;
}
function migrateCurrent(render=false){
 if(typeof current==='undefined'||!current)return 0;
 const n=migrateSave(current);
 try{persist?.()}catch{}
 if(render)try{renderAll?.()}catch{}
 return n;
}
function install(){
 if(window.__BM27_V237__)return;window.__BM27_V237__=true;
 // Critical: migrate the saved object BEFORE old openSave wrappers render/advance it.
 if(typeof openSave==='function'){
   const base=openSave;
   openSave=function(id){
     try{
       if(typeof saves!=='undefined'){
         const s=saves.find(x=>eq(x?.id,id));
         if(s)migrateSave(s);
       }
     }catch(e){console.warn('v2.3.7 pre-open tournament migration',e)}
     const r=base.apply(this,arguments);
     migrateCurrent(true);
     return r;
   };
 }
 // Cloud restoration can replace the in-memory object after startup.
 setTimeout(()=>migrateCurrent(false),75);
 setTimeout(()=>migrateCurrent(true),650);
 if(typeof renderTournaments==='function'){
   const base=renderTournaments;
   renderTournaments=function(){migrateCurrent(false);return base.apply(this,arguments)}
 }
 document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
   const box=$('updatesContent');if(!box||box.querySelector('[data-v237-notes]'))return;
   box.insertAdjacentHTML('afterbegin','<article class="card" data-v237-notes><p class="eyebrow">BM27 v2.3.7</p><h3>Existing Save Tournament Migration</h3><ul class="update-list"><li>Previously created tournaments are migrated before an old career renders.</li><li>The saved Single, 3rd Place, or Full Placement format remains authoritative.</li><li>Old completed semifinals can generate their missing 3rd-place game.</li><li>Stale unplayed bracket links are removed and rebuilt by the core tournament engine.</li><li>The migration is saved back into the existing career automatically.</li></ul></article>');
 },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V237={migrateSave,migrateCurrent};
})();