/* BM27 v2.3.3 — Core Class/Postseason/Nationwide Integration Repair */
(()=>{
'use strict';
const VERSION='2.3.3',eq=(a,b)=>String(a)===String(b),$=id=>document.getElementById(id);
let repairing=false;
function classMax(save=current){
 const configured=Number(save?.v2?.classSystem?.maxClass)||6;
 const teamMax=Math.max(0,...(save?.teams||[]).filter(t=>!t?.outOfState&&!t?.nationalOnly).map(t=>Number(t.class)||0));
 return Math.max(6,configured,teamMax);
}
function rebalanceClass(save,c,count){
 const teams=(save?.teams||[]).filter(t=>!t?.outOfState&&!t?.nationalOnly&&Number(t.class)===Number(c)).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
 if(!teams.length)return;
 count=Math.max(8,Math.min(16,Number(count)||16));
 teams.forEach((t,i)=>t.district=String((i%count)+1));
}
function repairManualClasses(save=current){
 if(!save)return false;save.v2=save.v2||{};save.v2.classSystem=save.v2.classSystem||{minClass:1,maxClass:6,events:[]};save.v231=save.v231||{};save.v231.manualClassDistricts=save.v231.manualClassDistricts||{};
 const max=classMax(save);save.v2.classSystem.maxClass=max;
 if(max>6)save.v231.manualClassFloorMax=Math.max(Number(save.v231.manualClassFloorMax)||6,max);
 let changed=false;
 for(let c=7;c<=max;c++){
   const cnt=Math.max(8,Math.min(16,Number(save.v231.manualClassDistricts[c])||16));save.v231.manualClassDistricts[c]=cnt;
   const teams=(save.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly&&Number(t.class)===c);
   if(teams.length){const invalid=teams.some(t=>Number(t.district)<1||Number(t.district)>cnt)||new Set(teams.map(t=>Number(t.district))).size<Math.min(cnt,teams.length);if(invalid){rebalanceClass(save,c,cnt);changed=true}}
 }
 try{if(typeof freezeCurrentAssignments==='function')freezeCurrentAssignments(save)}catch{}
 return changed;
}
function highestStateChampion(save=current){
 const top=classMax(save);const t=(save?.tournaments||[]).find(x=>(x.type==='State Tournament'||x.kind==='State Tournament')&&Number(x.classNo)===top&&x.championId);return t?{top,t,championId:t.championId}:null;
}
function repairEngine(save=current){
 if(!save||!window.BM27SeasonEngine)return;
 const top=classMax(save),eng=window.BM27SeasonEngine.state?.(save);
 const hasTopRegular=(eng?.games||[]).some(g=>g.type==='Regular Season'&&Number((save.teams||[]).find(t=>eq(t.id,g.team1Id))?.class)===top);
 if(top>6&&!hasTopRegular){window.BM27SeasonEngine.migrate?.(save,{reset:true})}
 window.BM27SeasonEngine.rebuildRecords?.();window.BM27SeasonEngine.runPostseason?.();
}
function repairNationals(save=current){
 if(!save?.v22||!window.BM27V22)return;const qual=highestStateChampion(save);if(!qual)return;
 const n=save.v22.nationals;const correct=n&&Number(n.automaticBidClass)===qual.top&&n.automaticBidId!=null&&n.field?.some(id=>eq(id,eq(qual.championId,save.schoolId)?'national-user':qual.championId));
 if(n&&!correct&&!n.championId){
   save.schedule=(save.schedule||[]).filter(g=>!g.nationalTournament);
   save.v22.nationals=null;
 }
 if(!save.v22.nationals)window.BM27V22.createNationals?.(save);
 window.BM27V22.syncNationalSchedule?.(save);
}
async function forceNationwide(save=current){
 try{
   const loader=window.BM27OutOfState?.loadAllStates;if(!loader)return;
   const rows=await loader();
   if(save){save.v22=save.v22||{};const st=window.BM27OutOfStateLoadStatus||{};save.v22.nationalDirectoryLoadedStates=st.loaded||50;save.v22.nationalDirectoryTotalStates=st.total||50;save.v22.nationalDirectorySchoolCount=rows?.length||0;save.v22.allOutOfStateLoaded=!!st.complete;save.v22.allOutOfStateLoadFailures=st.failed||[];try{await window.BM27V22?.hydrateRealNationalPool?.(save)}catch{};try{persist?.()}catch{}}
 }catch(e){console.error('BM27 v2.3.3 nationwide loader',e)}
}
function repair(save=current){
 if(!save||repairing)return;repairing=true;try{repairManualClasses(save);repairEngine(save);repairNationals(save);save.v233={...(save.v233||{}),version:VERSION,season:Number(save.season)||2026,repairedAt:new Date().toISOString()};try{persist?.()}catch{}}finally{repairing=false}
}
function addStatus(){
 const next=$('nextGame');if(!next||$('v233DirectoryStatus'))return;const st=window.BM27OutOfStateLoadStatus;if(!st)return;const p=document.createElement('p');p.id='v233DirectoryStatus';p.className='muted small';p.textContent=st.complete?`Nationwide directory ready • ${Number(st.schools||0).toLocaleString()} out-of-state schools loaded`:`Nationwide directory loading • ${st.loaded||0}/${st.total||50} states • ${Number(st.schools||0).toLocaleString()} schools`;next.appendChild(p);
}
function install(){
 if(window.__BM27_V233__)return;window.__BM27_V233__=true;
 forceNationwide(current);setTimeout(()=>{if(current)repair(current);addStatus()},200);
 window.addEventListener('bm27-out-of-state-loaded',()=>{forceNationwide(current);setTimeout(()=>{try{renderAll?.();addStatus()}catch{}},0)});
 if(typeof openSave==='function'){const base=openSave;openSave=function(...a){const r=base(...a);setTimeout(()=>{repair(current);forceNationwide(current)},0);return r}}
 if(typeof newCareer==='function'){const base=newCareer;newCareer=function(...a){const r=base(...a);setTimeout(()=>{repair(current||r);forceNationwide(current||r)},0);return r}}
 if(typeof renderAll==='function'){const base=renderAll;renderAll=function(...a){if(current&&!repairing){repairManualClasses(current);repairNationals(current)}const r=base(...a);setTimeout(addStatus,0);return r}}
 document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{const box=$('updatesContent');if(!box||box.querySelector('[data-v233-notes]'))return;box.insertAdjacentHTML('afterbegin','<article class="card" data-v233-notes><p class="eyebrow">BM27 v2.3.3</p><h3>Core Class + March Madness + Nationwide Repair</h3><ul class="update-list"><li>Manual classes are rebuilt into the authoritative season engine immediately.</li><li>Every active Missouri class now receives automatic District and State tournaments after the user regular season ends.</li><li>The highest active class State champion is guaranteed the March Madness automatic bid.</li><li>Broken older March Madness fields self-rebuild when they used the wrong highest-class champion.</li><li>All out-of-state NCES directories begin loading as soon as BM27 opens, with retry handling and shared in-memory caching.</li><li>Manual classes persist across offseasons and use 8–16 districts.</li></ul></article>')},0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V233={repair,forceNationwide,repairManualClasses,repairNationals,classMax};
})();
