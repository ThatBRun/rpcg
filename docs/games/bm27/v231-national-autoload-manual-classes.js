/* BM27 v2.3.1 — Nationwide Autoload + Manual Class Manager */
(()=>{
'use strict';
const VERSION='2.3.3', $=id=>document.getElementById(id);
function ensure(save){
 if(!save)return;
 save.v231=save.v231||{};
 save.v2=save.v2||{};
 save.v2.classSystem=save.v2.classSystem||{minClass:1,maxClass:6,events:[]};
 save.v2.classSystem.events=Array.isArray(save.v2.classSystem.events)?save.v2.classSystem.events:[];
}
function nationwideKick(force=false){
 try{
  if(typeof current==='undefined'||!current||!window.BM27V22?.hydrateRealNationalPool)return;
  ensure(current); current.v22=current.v22||{};
  if(force){current.v22.nationalDirectoryReady=false;current.v22.nationalHydrating=false;current.v22.nationalDirectoryLoadedStates=0}
  if(!current.v22.nationalDirectoryReady&&!current.v22.nationalHydrating){
   current.v231.nationwideAutoloadStarted=true;
   window.BM27V22.hydrateRealNationalPool(current);
  }
 }catch(e){console.warn('BM27 v2.3.1 nationwide autoload',e)}
}
function distributeIntoClass(classNo){
 const teams=(current.teams||[]).filter(t=>!t.outOfState && Number(t.class)===classNo);
 const districtCount=(classNo===5||classNo===6)?8:Math.max(8,Math.min(16,Number(current.v231?.manualClassDistricts?.[classNo])||16));
 teams.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
 teams.forEach((t,i)=>t.district=String((i%districtCount)+1));
 return districtCount;
}
function refreshClassInputs(){
 if(!current)return;ensure(current);const max=Number(current.v2.classSystem.maxClass)||6;
 const sel=$('customSchoolClass');if(sel){for(let c=1;c<=max;c++)if(![...sel.options].some(o=>Number(o.value||o.textContent)===c))sel.add(new Option(String(c),String(c)))}
}
function addClass(){
 if(!current)return;ensure(current);
 const input=$('v231ClassNo'),dist=$('v231DistrictCount');
 const oldMax=Number(current.v2.classSystem.maxClass)||6;
 const requested=Number(input?.value)||oldMax+1;
 if(requested!==oldMax+1)return toast?.(`The next class must be Class ${oldMax+1}.`);
 const n=oldMax+1;
 const districtCount=Math.max(8,Math.min(16,Math.round(Number(dist?.value)||16)));
 const eligible=(current.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly&&Number(t.class)===oldMax).sort((a,b)=>(b.rating||0)-(a.rating||0)||String(a.name||'').localeCompare(String(b.name||'')));
 if(eligible.length<districtCount)return toast?.(`Class ${oldMax} needs at least ${districtCount} schools before Class ${n} can use ${districtCount} districts.`);
 current.v2.classSystem.maxClass=n;
 current.v231.manualClassDistricts=current.v231.manualClassDistricts||{};
 current.v231.manualClassDistricts[n]=districtCount;
 current.v231.manualClassFloorMax=Math.max(Number(current.v231.manualClassFloorMax)||6,n);
 current.v2.classSystem.events.push({season:current.season,type:'manual-added',classNo:n,districts:districtCount});
 // Move enough teams to populate every district, while keeping the old class alive.
 const target=Math.min(eligible.length,Math.max(districtCount,Math.min(Math.ceil(eligible.length*.50),districtCount*3)));
 eligible.slice(0,target).forEach(t=>t.class=String(n));
 distributeIntoClass(n);distributeIntoClass(oldMax);
 // Rebuild the current-season assignment snapshot and the authoritative AI schedule so
 // the new class immediately receives regular season, district and state-tournament paths.
 try{freezeCurrentAssignments?.(current)}catch{}
 try{window.BM27SeasonEngine?.migrate?.(current,{reset:true});window.BM27SeasonEngine?.rebuildRecords?.()}catch(e){console.warn('BM27 class engine rebuild',e)}
 current.news=current.news||[];current.news.unshift({date:current.day,text:`Manual classification change: Class ${n} was added with ${districtCount} districts and is active immediately.`});
 refreshClassInputs();persist?.();renderAll?.();setTimeout(()=>renderClassesDistricts?.(),0);
 toast?.(`Class ${n} added with ${districtCount} districts.`);
}
function injectClassManager(){
 const host=$('classesDistrictsContent');if(!host||!current)return;
 ensure(current);
 if(host.querySelector('[data-v231-class-manager]'))return;
 const currentMax=current.v2.classSystem.maxClass||6;
 const card=document.createElement('article');card.className='card';card.dataset.v231ClassManager='1';
 card.innerHTML=`<div class="section-head"><div><p class="eyebrow">CLASS MANAGER</p><h3>Add a New Class Manually</h3><p class="muted small">Creates a real Missouri classification and moves a portion of the previous highest class into it. Choose 8–16 districts for manually added classes. Class 5 and 6 always stay at exactly 8 districts.</p></div><span class="tag">Current max: Class ${currentMax}</span></div><div class="assignment-controls"><label>New class number<input id="v231ClassNo" type="number" min="${currentMax+1}" max="20" value="${currentMax+1}"></label><label>Districts (8–16)<input id="v231DistrictCount" type="number" min="8" max="16" value="16"></label></div><button type="button" id="v231AddClass" class="primary">Add Class</button>`;
 host.prepend(card);$('v231AddClass').onclick=addClass;
}
function deferNationwide(){const run=()=>nationwideKick(false);if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,700)}
function install(){
 if(window.__BM27_V231__)return;window.__BM27_V231__=true;
 // Re-hook career entry points after every prior module has loaded, restoring automatic nationwide startup.
 if(typeof openSave==='function'){const base=openSave;openSave=function(){const r=base.apply(this,arguments);deferNationwide();return r}}
 if(typeof newCareer==='function'){const base=newCareer;newCareer=function(){const r=base.apply(this,arguments);deferNationwide();return r}}
 if(typeof renderClassesDistricts==='function'){const base=renderClassesDistricts;renderClassesDistricts=function(){const r=base.apply(this,arguments);setTimeout(injectClassManager,0);return r}}
 // Force a retry for v2.3 saves where the startup loader was lost/broken.
 setTimeout(()=>{refreshClassInputs();deferNationwide()},220);
 document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
  const box=$('updatesContent');if(!box||box.querySelector('[data-v231-notes]'))return;
  box.insertAdjacentHTML('afterbegin','<article class="card" data-v231-notes><p class="eyebrow">BM27 v2.3.1</p><h3>Nationwide Autoload + Manual Classes</h3><ul class="update-list"><li>Restored automatic nationwide out-of-state directory loading whenever a career opens or starts.</li><li>The loader runs after all v2.3 modules so later wrappers cannot accidentally disable it.</li><li>Classes & Districts now includes a manual Add Class manager.</li><li>New classes become real progression/postseason classes and immediately receive schools from the previous highest class.</li><li>Class 5 and Class 6 remain locked to eight districts.</li></ul></article>');
 },0),{capture:true}));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27V231={nationwideKick,addClass};
})();