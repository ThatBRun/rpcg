/* BM27 2.7.57: Single authoritative conference repair controller. */
(()=>{'use strict';
const key='bm27_conference_assignments_v2747';
const txt=v=>String(v??'').trim(), low=v=>txt(v).toLowerCase(), $=id=>document.getElementById(id);
const active=()=>typeof current==='undefined'?null:current;
const mo=t=>t&&!t.outOfState&&!t.nationalOnly&&!t.international&&!t.isInternational&&(!t.state||['mo','missouri'].includes(low(t.state)))&&(!t.country||['us','usa','united states','united states of america'].includes(low(t.country)));
const schools=s=>(s?.teams||[]).filter(mo);
const primary=()=>[...new Set(window.BM27V2743?.primaryConferences||[])];
const divisions=()=>window.BM27V2743?.divisions||[];
const bad=c=>!txt(c)||/unassigned/i.test(txt(c));
const area=t=>{const x=low([t.city,t.county,t.location,t.region,t.name].join(' '));if(/st\.? louis|chesterfield|wildwood|ballwin|kirkwood|parkway|eureka|hazelwood|st\.? charles|wentzville|o.fallon|florissant|ladue|rockwood|webster|affton/.test(x))return 'STL';if(/kansas city|blue springs|lee.s summit|raytown|liberty|park hill|independence|belton|platt|grandview|grain valley/.test(x))return 'KC';if(/springfield|nixa|ozark|republic|joplin|branson|carthage|webb city|neosh|willard/.test(x))return 'SW';if(/columbia|jefferson city|fulton|sedalia|boonville|moberly/.test(x))return 'CENTRAL';if(/cape girardeau|sikeston|poplar bluff|kennett|dexter|charleston/.test(x))return 'SE';if(/st\.? joseph|maryville|chillicothe|cameron|savannah/.test(x))return 'NW';return 'OTHER'};
const groupHint=n=>{const x=low(n);if(/st louis|suburban|metro|gateway|four rivers|jefferson county|public high|crossroads/.test(x))return 'STL';if(/kansas city|kci|greater kansas|interscholastic|midland/.test(x))return 'KC';if(/ozark|southwest|mid.lakes|frisco|big 8|polk|summit/.test(x))return 'SW';if(/southeast|bootheel|stoddard|scott|mississippi|black river/.test(x))return 'SE';if(/central|kaysinger|missouri river|show.me/.test(x))return 'CENTRAL';if(/grand river|harrison|clarence|highway 275/.test(x))return 'NW';return 'OTHER'};
const cls=t=>Number(t.class||t.classification||3)||3;
const hash=s=>{let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619)}return h>>>0};
function eligible(s){if(!s)return false;const games=[...(s.schedule||[]),...(s.seasonEngine?.games||[])];return !games.some(g=>{const played=g?.played===true||g?.completed===true||g?.final===true||['final','played','completed'].includes(low(g?.status));if(!played)return false;const words=[g.type,g.gameType,g.seasonType,g.phase,g.competition,g.stage,g.category].map(low).filter(Boolean).join(' ');if(/pre.?season|summer|fall|scrimmage|exhibition|friendly|postseason|district|state|tournament|playoff/.test(words))return false;return !words||/regular|conference|league/.test(words)});}
function plan(s,random=false){const ts=schools(s);const defined=primary();const currentNames=ts.map(t=>txt(t.conference||t.conferenceParent)).filter(n=>n&&!bad(n));const extra=[...new Set(currentNames.filter(n=>!defined.includes(n)))];let names=[...defined,...extra];
 if(ts.length<4)return {error:'At least four Missouri schools must be loaded.'};
 // At most floor(N/4) live conferences. Primary conferences receive priority; unavailable extras are merged.
 const max=Math.floor(ts.length/4);if(names.length>max)names=names.slice(0,max);
 if(!names.length)names=['Independent'];
 const incumbents=new Map();for(const t of ts){const n=txt(t.conference||t.conferenceParent);if(!incumbents.has(n))incumbents.set(n,[]);incumbents.get(n).push(t)}
 const buckets=names.map(name=>{const existing=incumbents.get(name)||[];const freq={};for(const t of existing){const r=area(t);freq[r]=(freq[r]||0)+1}const region=Object.keys(freq).sort((a,b)=>freq[b]-freq[a])[0]||groupHint(name);return {name,region,items:[]}});
 let remain=ts.slice().sort((a,b)=>low(a.name).localeCompare(low(b.name))||txt(a.id).localeCompare(txt(b.id)));
 const cost=(t,b)=>{let v=area(t)===b.region?100:(area(t)==='OTHER'||b.region==='OTHER'?25:-55);if(txt(t.conference)===b.name||txt(t.conferenceParent)===b.name)v+=random?18:68;if(b.items.length){if(t.city&&b.items.some(x=>low(x.city)===low(t.city)))v+=40;if(t.county&&b.items.some(x=>low(x.county)===low(t.county)))v+=30;v-=b.items.reduce((a,x)=>a+Math.abs(cls(x)-cls(t)),0)/b.items.length*8}if(random)v+=(hash(`${t.id}|${b.name}|${random}`)%47)-23;return v};
 // Seed all named conferences; no conference can remain at zero or fewer than four.
 for(let i=0;i<4;i++)for(const b of buckets){let bi=0,bs=-Infinity;for(let j=0;j<remain.length;j++){const x=cost(remain[j],b);if(x>bs){bs=x;bi=j}}b.items.push(remain.splice(bi,1)[0])}
 const cap=Math.ceil(ts.length/buckets.length);
 // Assign remaining schools to geographically compatible buckets without capacity overflow.
 while(remain.length){const t=remain.shift();const options=buckets.filter(b=>b.items.length<cap);options.sort((a,b)=>cost(t,b)-cost(t,a)||a.items.length-b.items.length);options[0].items.push(t)}
 const map=new Map();for(const b of buckets)for(const t of b.items)map.set(txt(t.id),b.name);
 const counts=buckets.map(b=>({name:b.name,count:b.items.length,region:b.region}));
 return {map,counts,total:ts.length,extrasMerged:extra.filter(n=>!names.includes(n)),primaryUnavailable:defined.filter(n=>!names.includes(n))};}
function set(k,v){if(window.BM27Storage?.set)return window.BM27Storage.set(k,v);return localStorage.setItem(k,v)}
function apply(s,map){for(const t of schools(s)){const name=map instanceof Map?map.get(txt(t.id)):map[txt(t.id)];if(!name)continue;t.conference=name;t.conferenceParent=name;t.conferenceManual=true;t.conferenceName=name;}}
function readMap(){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch{return {}}}
function run(random=false){const s=active();if(!s)return alert('Open a career first.');if(!eligible(s))return alert('Conference changes are locked after a completed regular-season game. Preseason, summer and fall do not count.');const p=plan(s,random);if(p.error)return alert(p.error);const message=`${random?'Realistically randomize':'Balance'} ${p.total} Missouri schools into ${p.counts.length} conferences? All populated conferences will have at least 4 schools. This also updates other unlocked saves. ${p.extrasMerged.length} undersized custom conference(s) may be merged.`;if(!confirm(message))return;
 const overrides=readMap();for(const [id,name] of p.map)overrides[id]=name;apply(s,overrides);
 /* Other careers retain their own conference choices; upgrades are save-local. */
 
 try{set(key,JSON.stringify(overrides));if(typeof persist==='function')persist();else if(typeof saves!=='undefined')set('mshsaa_bm27_saves',JSON.stringify(saves))}catch(e){console.error(e);alert('Conference assignments changed in memory but saving failed. '+e.message);return}
 window.BM27V2743?.render?.();audit(s,p);const nums=Object.values(count(s));if(nums.some(n=>n<4)||new Set(schools(s).map(t=>txt(t.id))).size!==p.total){alert('Conference audit failed. Check the console for details; changes may not be complete.');return}alert(`Verified: ${p.total} Missouri schools, ${nums.length} populated conferences, minimum ${Math.min(...nums)} schools, maximum ${Math.max(...nums)} schools.`)}
function count(s){const out={};for(const t of schools(s)){const c=txt(t.conference)||'Unassigned';out[c]=(out[c]||0)+1}return out}
function audit(s=active(),p){if(!s)return null;const counts=count(s),values=Object.values(counts);const problems=Object.entries(counts).filter(([,n])=>n<4);const primaryEmpty=primary().filter(n=>!counts[n]);const result={total:schools(s).length,activeConferences:values.length,small:problems,emptyPrimary:primaryEmpty,min:values.length?Math.min(...values):0,max:values.length?Math.max(...values):0};window.BM27ConferenceLastAudit=result;const label=$('bm2757Audit');if(label)label.textContent=` ${result.total} Missouri teams · ${result.activeConferences} populated conferences · ${result.small.length} undersized · ${primaryEmpty.length} empty primary`;return result}
function install(){const host=$('conferencesPage')||$('bm27ConferenceManager');if(host&&!$('bm2757Tools')){const d=document.createElement('article');d.className='card';d.id='bm2757Tools';d.innerHTML='<h3>Conference Manager · Verified Assignments</h3><p class="muted small">Uses the complete Missouri conference directory, fills each populated conference with at least four teams, and saves one conference per school. Custom conferences with too few schools may be merged.</p><button type="button" class="secondary" id="bm2757Balance">Balance All Conferences</button> <button type="button" class="secondary" id="bm2757Random">Realistic Randomize</button><p class="muted small" id="bm2757Audit"></p>';host.prepend(d);$('bm2757Balance').onclick=()=>run(false);$('bm2757Random').onclick=()=>run(true)}
 // The previous three controls call incompatible algorithms; replace them with one authoritative handler.
 for(const id of ['bm2754Balance','bm2755Balance','bm2755Random','bm27RandomizeConferences']){const b=$(id);if(b){b.style.display='none';b.setAttribute('aria-hidden','true')}}audit();}
function boot(){install();document.addEventListener('click',e=>{const b=e.target.closest?.('#bm2754Balance,#bm2755Balance,#bm2755Random,#bm27RandomizeConferences');if(!b)return;e.preventDefault();e.stopImmediatePropagation();run(/Random|random/.test(b.id))},true);
 if(typeof renderAll==='function'){const orig=renderAll;renderAll=function(...args){const r=orig.apply(this,args);install();return r}}
 if(typeof openSave==='function'){const orig=openSave;openSave=function(...args){const r=orig.apply(this,args);const s=active();if(s){audit(s)}install();return r}}
 window.BM27ConferenceV2757={plan,run,audit,eligible,apply};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
