/* BM27 v2.2.14 — Class 5/6 Eight-District Structure Hotfix */
(()=>{
'use strict';
const VERSION='2.2.14';
const HIGH_CLASSES=new Set(['5','6']);
const str=v=>String(v??'');
const isMissouri=t=>!!t&&!t.outOfState&&str(t.class)!=='Out of State';
function stableDistrict(team){
  const text=`${team?.name||''}|${team?.city||''}|${team?.id||''}`;
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
  return String((h>>>0)%8+1);
}
function normalizedDistrict(team){
  if(!team||!isMissouri(team)||!HIGH_CLASSES.has(str(team.class)))return team?.district;
  const n=Number(team.district);
  if(Number.isFinite(n)&&n>=1&&n<=8)return String(Math.trunc(n));
  if(Number.isFinite(n)&&n>0)return String(((Math.trunc(n)-1)%8)+1);
  return stableDistrict(team);
}
function normalizeTeam(team){
  if(!team||!isMissouri(team)||!HIGH_CLASSES.has(str(team.class)))return false;
  const d=normalizedDistrict(team);
  if(str(team.district)===d)return false;
  team.district=d;return true;
}
function normalizeList(list){let changed=false;for(const t of Array.isArray(list)?list:[])changed=normalizeTeam(t)||changed;return changed}
function normalizeAssignmentSnapshot(save){
  const hist=save?.v2?.assignmentHistory;if(!Array.isArray(hist))return false;
  let changed=false;
  for(const snap of hist){
    // Historical seasons stay frozen. Only the active-season snapshot follows the current structure.
    if(Number(snap?.season)!==Number(save.season))continue;
    for(const sc of snap.schools||[]){
      if(!HIGH_CLASSES.has(str(sc.classNo))&&!HIGH_CLASSES.has(str(sc.class)))continue;
      const fake={...sc,class:sc.classNo??sc.class,outOfState:false};
      const d=normalizedDistrict(fake);
      if(str(sc.district)!==d){sc.district=Number(d);changed=true}
    }
  }
  return changed;
}
function normalizeSave(save){
  if(!save)return false;
  let changed=normalizeList(save.teams);
  changed=normalizeAssignmentSnapshot(save)||changed;
  save.v2214=save.v2214||{};
  if(save.v2214.version!==VERSION){save.v2214.version=VERSION;save.v2214.class5Districts=8;save.v2214.class6Districts=8;changed=true}
  return changed;
}
function normalizeDirectory(){
  try{return typeof directory!=='undefined'&&Array.isArray(directory)?normalizeList(directory):false}catch{return false}
}
function refreshCreatorLimit(){
  const cls=document.getElementById('customSchoolClass'),dist=document.getElementById('customSchoolDistrict');if(!cls||!dist)return;
  const limited=HIGH_CLASSES.has(str(cls.value));dist.max=limited?'8':'16';
  if(limited&&Number(dist.value)>8)dist.value='8';
}
function installCreator(){
  const cls=document.getElementById('customSchoolClass'),form=document.getElementById('schoolCreatorForm');
  cls?.addEventListener('change',refreshCreatorLimit);refreshCreatorLimit();
  form?.addEventListener('submit',e=>{
    const c=document.getElementById('customSchoolClass')?.value,d=Number(document.getElementById('customSchoolDistrict')?.value);
    if(HIGH_CLASSES.has(str(c))&&(d<1||d>8)){e.preventDefault();e.stopImmediatePropagation();if(typeof toast==='function')toast(`Class ${c} only has Districts 1–8.`)}
  },true);
}
function install(){
  if(window.__BM27_V2214__)return;window.__BM27_V2214__=true;
  window.BM27DistrictCountForClass=c=>HIGH_CLASSES.has(str(c))?8:null;
  window.BM27NormalizeClass56Districts=normalizeSave;
  normalizeDirectory();
  if(typeof renderLauncher==='function'){
    const base=renderLauncher;renderLauncher=function(){normalizeDirectory();return base.apply(this,arguments)};
  }
  if(typeof newCareer==='function'){
    const base=newCareer;newCareer=function(){const save=base.apply(this,arguments);normalizeSave(save);return save};
  }
  if(typeof openSave==='function'){
    const base=openSave;openSave=function(){const r=base.apply(this,arguments);if(typeof current!=='undefined'&&current&&normalizeSave(current)){try{persist?.()}catch{}try{renderAll?.()}catch{}}return r};
  }
  if(typeof applyOffseason==='function'){
    const base=applyOffseason;applyOffseason=function(){const r=base.apply(this,arguments);if(typeof current!=='undefined'&&current){const changed=normalizeSave(current);if(changed){try{window.BM27SeasonEngine?.migrate?.(current,{reset:true});window.BM27SeasonEngine?.rebuildRecords?.()}catch{}try{persist?.();renderAll?.()}catch{}}}return r};
  }
  installCreator();
  if(typeof current!=='undefined'&&current&&normalizeSave(current)){try{persist?.()}catch{}}
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    const box=document.getElementById('updatesContent');if(!box||box.querySelector('[data-v2214-notes]'))return;
    box.insertAdjacentHTML('afterbegin','<article class="card" data-v2214-notes><p class="eyebrow">BM27 v2.2.14</p><h3>Class 5/6 Eight-District Structure</h3><ul class="update-list"><li>Class 5 and Class 6 are permanently limited to Districts 1–8.</li><li>Old saves with Class 5/6 teams in District 9+ are automatically migrated into the 1–8 structure.</li><li>New careers, synced school directories, custom schools, and promotion/relegation all obey the eight-district limit.</li><li>Class 5/6 district postseason can now produce no more than eight district champions for the State Tournament.</li><li>Historical completed seasons remain frozen; the active season assignment snapshot is repaired automatically.</li></ul></article>');
  },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();
