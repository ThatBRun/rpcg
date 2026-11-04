/* BM27 v2.7.20 — Authoritative Senior Graduation Hard Fix
   Last-loaded safety layer. Captures seniors before offseason, lets every older
   offseason system finish, then permanently removes that graduating class from
   all active high-school roster mirrors and records the user's graduates in
   College Alumni. Also repairs already-made saves from archived senior classes.
*/
(()=>{
'use strict';
const VERSION=2720;
const eq=(a,b)=>String(a)===String(b);
const activeSave=()=>{try{return typeof current!=='undefined'?current:null}catch{return null}};
const userTeam=save=>save?.teams?.find(t=>eq(t.id,save.schoolId))||null;
const sig=p=>`${String(p?.name||'').trim().toLowerCase()}|${String(p?.pos||'').trim().toLowerCase()}`;
const uniquePlayers=list=>{const out=[],seen=new Set();for(const p of list||[]){if(!p)continue;const k=p.id!=null?`id:${p.id}`:`sig:${sig(p)}`;if(seen.has(k))continue;seen.add(k);out.push(p)}return out};
function hashText(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function collegeList(){try{if(Array.isArray(window.BM27_ALL_COLLEGES)&&window.BM27_ALL_COLLEGES.length)return window.BM27_ALL_COLLEGES;if(typeof D1_COLLEGES!=='undefined'&&Array.isArray(D1_COLLEGES))return D1_COLLEGES}catch{}return[]}
function collegeFor(p,season){
  const list=collegeList();
  const committed=p?.committed;
  if(committed!=null&&list.length){const c=list.find(x=>eq(x.id,committed)||String(x.name||x.school||'').toLowerCase()===String(committed).toLowerCase());if(c)return{id:c.id??committed,name:c.name||c.school||String(committed),association:c.association||c.division||'College Basketball'}}
  if(!list.length)return{id:`regional-${hashText(`${p?.id}|${season}`)}`,name:'Regional College',association:'College Basketball'};
  const ovr=Number(p?.overall)||65,target=Math.max(45,Math.min(96,42+(ovr-50)*1.25));
  const ranked=list.slice().sort((a,b)=>Math.abs((Number(a.prestige)||65)-target)-Math.abs((Number(b.prestige)||65)-target));
  const top=ranked.slice(0,Math.min(20,ranked.length));const c=top[hashText(`${p?.id}|${p?.name}|${season}|college`)%top.length]||ranked[0];
  return{id:c?.id??null,name:c?.name||c?.school||'College',association:c?.association||c?.division||'College Basketball'};
}
function ensureState(save){save.v2720=save.v2720||{};save.v2720.version=VERSION;save.v2720.graduates=Array.isArray(save.v2720.graduates)?save.v2720.graduates:[];save.v2716=save.v2716||{};save.v2716.collegeAlumni=Array.isArray(save.v2716.collegeAlumni)?save.v2716.collegeAlumni:[];return save.v2720}
function keysFromPlayers(players){const ids=new Set(),sigs=new Set();for(const p of players||[]){if(p?.id!=null)ids.add(String(p.id));else if(p?.name)sigs.add(sig(p))}return{ids,sigs}}
function mergeKeys(...parts){const ids=new Set(),sigs=new Set();for(const k of parts){for(const x of k?.ids||[])ids.add(String(x));for(const x of k?.sigs||[])sigs.add(String(x))}return{ids,sigs}}
function matches(p,keys){if(!p)return false;if(p.id!=null&&keys.ids.has(String(p.id)))return true;return !!p.name&&keys.sigs.has(sig(p))}
function archivedSeniorRecords(save){
  const out=[];const currentSeason=Number(save?.season)||0;
  for(const arc of save?.v2?.seasonArchive||[]){
    const season=Number(arc?.season);if(Number.isFinite(season)&&season>=currentSeason)continue;
    const rosters=arc?.rosters||{Varsity:arc?.roster||[]};
    for(const list of Object.values(rosters||{}))for(const p of Array.isArray(list)?list:[])if(Number(p?.grade)>=12)out.push({p,season:Number.isFinite(season)?season:Math.max(0,currentSeason-1)});
  }
  return out
}
function knownGraduateKeys(save){
  ensureState(save);const ids=new Set(),sigs=new Set();
  for(const g of save.v2720.graduates||[]){if(g.playerId!=null)ids.add(String(g.playerId));else if(g.name)sigs.add(`${String(g.name).trim().toLowerCase()}|${String(g.pos||'').trim().toLowerCase()}`)}
  for(const g of save.v2716.collegeAlumni||[]){if(g.playerId!=null)ids.add(String(g.playerId));else if(g.name)sigs.add(`${String(g.name).trim().toLowerCase()}|${String(g.pos||'').trim().toLowerCase()}`)}
  for(const x of archivedSeniorRecords(save)){if(x.p?.id!=null)ids.add(String(x.p.id));else if(x.p?.name)sigs.add(sig(x.p))}
  return{ids,sigs}
}
function captureGraduatingClass(save){
  if(!save)return{season:0,user:[],all:[],keys:{ids:new Set(),sigs:new Set()}};
  const all=[];for(const t of save.teams||[])for(const p of t.roster||[])if(Number(p?.grade)>=12)all.push(p);
  for(const p of save.v2?.programPlayers||[])if(Number(p?.grade)>=12)all.push(p);
  for(const p of save.tryoutPool||[])if(Number(p?.grade)>=12)all.push(p);
  const me=userTeam(save),user=[];
  for(const p of save.v2?.programPlayers||[])if(Number(p?.grade)>=12)user.push(p);
  for(const p of me?.roster||[])if(Number(p?.grade)>=12)user.push(p);
  return{season:Number(save.season)||0,user:uniquePlayers(user).map(p=>({...p})),all:uniquePlayers(all).map(p=>({...p})),keys:keysFromPlayers(uniquePlayers(all))}
}
function addGraduateRecord(save,p,season){
  if(!save||!p)return false;const state=ensureState(save),playerId=p.id??null,signature=sig(p);
  const exists=state.graduates.some(g=>(playerId!=null&&g.playerId!=null&&eq(g.playerId,playerId))||(!playerId&&`${String(g.name||'').trim().toLowerCase()}|${String(g.pos||'').trim().toLowerCase()}`===signature));
  if(!exists)state.graduates.push({season:Number(season)||Math.max(0,Number(save.season)-1),playerId,name:p.name||'Senior',pos:p.pos||'',overall:Number(p.overall)||0});
  const alumni=save.v2716.collegeAlumni;const already=alumni.some(g=>(playerId!=null&&g.playerId!=null&&eq(g.playerId,playerId))||(`${String(g.name||'').trim().toLowerCase()}|${String(g.pos||'').trim().toLowerCase()}`===signature&&Number(g.season)===Number(season)));
  if(!already){const c=collegeFor(p,season);alumni.push({season:Number(season)||Math.max(0,Number(save.season)-1),playerId,name:p.name||'Senior',pos:p.pos||'',overall:Number(p.overall)||0,collegeId:c.id,collegeName:c.name,association:c.association,graduatedAt:save.day||new Date().toISOString()})}
  return !exists||!already
}
function purgeKeys(save,keys,{allTeams=true}={}){
  if(!save||(!keys?.ids?.size&&!keys?.sigs?.size))return 0;let removed=0;
  const filter=list=>{if(!Array.isArray(list))return list;const before=list.length,out=list.filter(p=>!matches(p,keys));removed+=before-out.length;return out};
  if(Array.isArray(save.v2?.programPlayers))save.v2.programPlayers=filter(save.v2.programPlayers);
  if(allTeams){for(const t of save.teams||[])if(Array.isArray(t.roster))t.roster=filter(t.roster)}else{const me=userTeam(save);if(me&&Array.isArray(me.roster))me.roster=filter(me.roster)}
  if(Array.isArray(save.tryoutPool))save.tryoutPool=filter(save.tryoutPool);
  if(Array.isArray(save.v2?.injuries))save.v2.injuries=save.v2.injuries.filter(x=>!keys.ids.has(String(x?.playerId)));
  if(Array.isArray(save.v2?.collegeVisits))save.v2.collegeVisits=save.v2.collegeVisits.filter(x=>!keys.ids.has(String(x?.playerId)));
  for(const k of Object.keys(save.v2?.collegeRelations||{}))if(keys.ids.has(String(save.v2.collegeRelations[k]?.playerId)))delete save.v2.collegeRelations[k];
  try{if(typeof syncVarsity==='function')syncVarsity(save)}catch{}
  return removed
}
function repairExistingSave(save,{announce=true,force=false}={}){
  if(!save)return{removed:0,added:0};ensureState(save);const archive=archivedSeniorRecords(save);let added=0;
  for(const x of archive)if(addGraduateRecord(save,x.p,x.season))added++;
  const keys=knownGraduateKeys(save);const removed=purgeKeys(save,keys,{allTeams:false});
  const marker=`${Number(save.season)||0}|${archive.length}|${save.v2?.seasonArchive?.length||0}`;
  if((removed||added)&&announce&&save.v2720.lastRepairMarker!==marker){save.v2720.lastRepairMarker=marker;save.news=save.news||[];save.news.unshift({date:save.day||new Date().toISOString(),category:'Recruiting',text:`Senior graduation repair: ${removed} stale graduated roster entr${removed===1?'y was':'ies were'} removed. Previous seniors are now college alumni and cannot return to the active roster.`})}
  save.v2720.lastRepairSeason=Number(save.season)||0;return{removed,added}
}
function finalizeGraduatingClass(save,snapshot){
  if(!save||!snapshot)return{removed:0,graduated:0};ensureState(save);let graduated=0;
  for(const p of snapshot.user||[]){addGraduateRecord(save,p,snapshot.season);graduated++}
  // Purge the exact pre-offseason senior class only after every older offseason wrapper has finished.
  let removed=purgeKeys(save,snapshot.keys,{allTeams:true});
  // Also purge any prior graduates known from archives/alumni, in case an older mirror rebuilt them.
  removed+=purgeKeys(save,knownGraduateKeys(save),{allTeams:false});
  save.v2720.lastGraduatedSeason=snapshot.season;save.v2720.lastGraduatedCount=graduated;save.v2720.lastPurgedCount=removed;
  if(graduated){save.news=save.news||[];save.news.unshift({date:save.day||new Date().toISOString(),category:'Recruiting',text:`Graduation finalized: ${graduated} senior${graduated===1?' has':'s have'} left the high-school program for college. They cannot remain on next season's roster.`})}
  return{removed,graduated}
}
function safePersist(){try{persist?.()}catch(e){console.warn('BM27 v2.7.20 persist',e)}}
function safeRender(){try{renderAll?.()}catch(e){console.warn('BM27 v2.7.20 render',e)}}
function install(){
  if(window.__BM27_V2720__)return;window.__BM27_V2720__=true;
  if(typeof applyOffseason==='function'){
    const base=applyOffseason;
    applyOffseason=function(){
      const before=activeSave();if(!before)return base.apply(this,arguments);
      const startSeason=Number(before.season)||0,snapshot=captureGraduatingClass(before);
      const result=base.apply(this,arguments);const after=activeSave();
      if(after&&Number(after.season)>startSeason){finalizeGraduatingClass(after,snapshot);repairExistingSave(after,{announce:false,force:true});safePersist();safeRender()}
      return result
    }
  }
  if(typeof openSave==='function'){
    const base=openSave;openSave=function(id){
      try{if(typeof saves!=='undefined'){const s=saves.find(x=>eq(x?.id,id));if(s)repairExistingSave(s,{announce:true,force:true})}}catch(e){console.warn('BM27 v2.7.20 pre-open repair',e)}
      const r=base.apply(this,arguments);const s=activeSave();if(s){const z=repairExistingSave(s,{announce:true,force:true});if(z.removed||z.added)safePersist()}return r
    }
  }
  // A very light final safety check after renders prevents any older roster mirror from resurrecting a known graduate.
  if(typeof renderAll==='function'){
    const base=renderAll;let busy=false;renderAll=function(){
      if(!busy){busy=true;try{const s=activeSave();if(s)repairExistingSave(s,{announce:false})}finally{busy=false}}
      const r=base.apply(this,arguments);try{const v=document.querySelector('.v2713-menu-version span');if(v)v.textContent='v2.7.20'}catch{}return r
    }
  }
  document.querySelectorAll?.('[data-open-updates]')?.forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const box=document.getElementById('updatesContent');if(!box||box.querySelector('[data-v2720-notes]'))return;box.insertAdjacentHTML('afterbegin','<article class="card" data-v2720-notes><p class="eyebrow">BM27 v2.7.20</p><h3>Authoritative Senior Graduation Fix</h3><ul class="update-list"><li>The graduating senior class is captured before offseason and permanently purged after every other rollover system finishes.</li><li>Seniors are removed from Program, Varsity, tryout and roster mirrors so they cannot reappear next season.</li><li>Graduating players are preserved in College Alumni with college destinations.</li><li>Already-made saves are repaired from archived senior classes and existing alumni records when opened.</li></ul></article>')},0),{capture:true}));
  const s=activeSave();if(s){const r=repairExistingSave(s,{announce:true,force:true});if(r.removed||r.added)safePersist()}
  setTimeout(()=>{const s=activeSave();if(s){const r=repairExistingSave(s,{announce:true,force:true});if(r.removed||r.added){safePersist();safeRender()}}},250);
}
window.BM27SeniorGraduation2720={version:VERSION,capture:captureGraduatingClass,repair:repairExistingSave,finalize:finalizeGraduatingClass,purge:purgeKeys,knownKeys:knownGraduateKeys};
if(typeof document!=='undefined'&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
