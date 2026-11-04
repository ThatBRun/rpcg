/* BM27 v2.7.49 — Realistic, save-aware conference randomizer */
(()=>{'use strict';
const id=x=>document.getElementById(x);
const lower=x=>String(x||'').toLowerCase();
const overridesKey='bm27_conference_assignments_v2747';
const notify=message=>typeof toast==='function'?toast(message):alert(message);
const getCurrent=()=>typeof current!=='undefined'?current:null;
const teamsOf=s=>(s?.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly);
const region=t=>{
 const city=lower([t.city,t.county,t.location,t.name].filter(Boolean).join(' '));
 const conf=lower(t.conferenceParent||t.conference);
 if(/st[. ]?louis|chesterfield|wildwood|ballwin|kirkwood|webster|parkway|rockwood|eureka|florissant|hazelwood|arnold|ferguson|ladue|pattonville|creve coeur|st\. charles|st charles|o.fallon|wentzville|troy|festus|jefferson county|suburban st\. louis|metro catholic|public high league|gateway athletic|jcca|four rivers/.test(city+' '+conf))return 'STL';
 if(/kansas city|independence|lee.s summit|blue springs|raytown|liberty|park hill|belton|grain valley|grandview|north kansas|platt|suburban conference|kci|interscholastic league/.test(city+' '+conf))return 'KC';
 if(/springfield|nixa|ozark|republic|branson|joplin|carthage|webb city|ne[o]?sho|willard|central ozark|mid.lakes|ozark mountain|greater ozarks/.test(city+' '+conf))return 'SW';
 if(/columbia|jefferson city|fulton|boonville|sedalia|moberly|central missouri|cmac|show.me/.test(city+' '+conf))return 'CENTRAL';
 if(/cape girardeau|sikeston|poplar bluff|kennett|dexter|bootheel|southeast missouri|semoc|stoddard/.test(city+' '+conf))return 'SE';
 if(/st[. ]?joseph|maryville|chillicothe|cameron|midland empire|grand river|hdc/.test(city+' '+conf))return 'NW';
 // Keep unfamiliar rural areas within their established league rather than relocate them statewide.
 return 'RURAL:'+lower(t.conferenceParent||t.conference||'unassigned');
};
const regular=g=>{
 const labels=[g.type,g.gameType,g.seasonType,g.phase,g.category,g.competition,g.stage,g.eventType,g.leagueType].filter(x=>x!=null&&String(x).trim()).map(lower);
 if(labels.some(x=>/pre[ -]?season|exhibition|friendly|scrimmage|summer|fall|off[ -]?season|post[ -]?season|playoff|tournament|district|state championship|national championship/.test(x)))return false;
 return !labels.length||labels.some(x=>/regular[ -]?season|conference|league/.test(x));
};
const finished=g=>g.played===true||g.completed===true||g.final===true||['final','completed','played'].includes(lower(g.status));
function unlocked(s){
 if(!s)return false;
 const school=String(s.schoolId??'');
 const belongs=g=>!school||[g.team1Id,g.team2Id,g.homeId,g.awayId,g.schoolId,g.opponentId].some(x=>String(x??'')===school);
 return ![...(s.schedule||[]),...(s.seasonEngine?.games||[])].some(g=>belongs(g)&&finished(g)&&regular(g));
}
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function randomize(){
 const s=getCurrent();if(!s)return notify('Load a career first.');
 if(!unlocked(s))return notify('Randomization is locked after a regular-season game is completed. Preseason, summer and fall do not count.');
 if(!confirm('Realistically randomize conferences for all Missouri schools in this career? Schools are grouped by region and similar class. This will replace the current conference assignments in your saves.'))return;
 const teams=teamsOf(s), groups=new Map();
 for(const t of teams){let c=String(t.conference||'').trim();if(!c||c==='Independent'||/unassigned/i.test(c)){c=window.BM27V2743?.conferenceForTeam?.(t)||c;}if(!c||c==='Independent'||/unassigned/i.test(c))continue;
 const cls=Number(t.class||t.classification||0);const bucket=cls>=5?'LARGE':cls>=3?'MEDIUM':'SMALL';const r=region(t),key=r+'|'+bucket;
 if(!groups.has(key))groups.set(key,[]);groups.get(key).push(t);
 }
 let changed=0;const updated=[];
 for(const list of groups.values()){
   if(list.length<2)continue;
   // Preserve conference sizes and regional mix by permuting actual conference memberships.
   const names=shuffle(list.map(t=>t.conference));
   // Avoid accidental identity permutation when alternatives exist.
   if(names.every((name,i)=>name===list[i].conference)&&new Set(names).size>1)names.push(names.shift());
   for(let i=0;i<list.length;i++){
     const t=list[i],name=names[i];if(!name||t.conference===name)continue;
     t.conference=name;t.conferenceManual=true;t.conferenceParent=name;updated.push([String(t.id),name]);changed++;
   }
 }
 if(!changed)return notify('No realistic swaps are available for these schools. Add more nearby schools or conferences.');
 // Persist across existing careers via the same shared override mapping as manual transfers.
 let map={};try{map=JSON.parse(localStorage.getItem(overridesKey)||'{}')||{}}catch{}
 for(const [school,conf] of updated)map[school]=conf;
 const set=(key,val)=>{if(window.BM27Storage?.set)BM27Storage.set(key,val);else localStorage.setItem(key,val)};
 set(overridesKey,JSON.stringify(map));
 if(typeof saves!=='undefined'&&Array.isArray(saves))for(const career of saves)for(const team of teamsOf(career)){
   const c=map[String(team.id)];if(c){team.conference=c;team.conferenceManual=true;team.conferenceParent=c}
 }
 if(typeof directory!=='undefined'){
   for(const team of directory){const c=map[String(team.id)];if(c){team.conference=c;team.conferenceManual=true;team.conferenceParent=c}}
   set('mshsaa_bm27_directory',JSON.stringify(directory));
 }
 // Apply changes across all loaded modes before saving. The override map also
 // applies automatically when an older Season, My School or Dynasty save opens.
 for(const team of teamsOf(s)){const c=map[String(team.id)];if(c){team.conference=c;team.conferenceManual=true;team.conferenceParent=c;}}
 if(typeof persist==='function')persist();
 window.BM27V2743?.assign?.(s);
 if(typeof renderAll==='function')renderAll();else window.BM27V2743?.render?.();
 notify('Randomized '+changed+' school conference assignments, keeping nearby schools and similar classes together.');
}
function mount(){const box=id('bm27ConferenceManager');if(!box||id('bm27RandomizeConferences'))return;
 const section=document.createElement('div');section.style.marginTop='16px';section.innerHTML='<hr><h4>Realistic Conference Randomizer</h4><p class="muted small">Randomizes schools within geographic regions and similar class sizes. Keeps conference sizes balanced. Available before the first completed regular-season game; preseason, summer and fall games do not lock it.</p><button type="button" class="secondary" id="bm27RandomizeConferences">Randomize All Conferences</button>';
 box.appendChild(section);id('bm27RandomizeConferences').addEventListener('click',randomize);
}
function install(){mount();
 // Reapply shared randomized membership to both newer and existing careers,
 // including the My School view, every time a save is opened.
 if(typeof openSave==='function'&&!window.__bm2750Open){
   window.__bm2750Open=true;const previous=openSave;
   openSave=function(){const result=previous.apply(this,arguments);const s=getCurrent();
     if(s){let map={};try{map=JSON.parse(localStorage.getItem(overridesKey)||'{}')||{}}catch{}
       for(const team of teamsOf(s)){const c=map[String(team.id)];if(c){team.conference=c;team.conferenceParent=c;team.conferenceManual=true;}}
       if(typeof renderAll==='function')renderAll();}
     mount();return result;};
 }
 if(typeof renderAll==='function'&&!window.__bm2749Render){window.__bm2749Render=true;const orig=renderAll;renderAll=function(){const out=orig.apply(this,arguments);mount();return out;}}if(typeof openSave==='function'&&!window.__bm2749Open){window.__bm2749Open=true;const orig=openSave;openSave=function(){const out=orig.apply(this,arguments);mount();return out;}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
