/* BM27 v2.7.54 — geographic conference balancing, including user-created conferences */
(()=>{'use strict';
const $=x=>document.getElementById(x), low=x=>String(x||'').trim().toLowerCase();
const overrideKey='bm27_conference_assignments_v2747';
const bad=c=>!String(c||'').trim()||/^(?:missouri class\s*[1-6]\s*[—–-]\s*unassigned|unassigned)$/i.test(String(c).trim());
const eligible=t=>t&&!t.outOfState&&!t.nationalOnly&&!t.international&&!t.isInternational&&(!t.state||/^(mo|missouri)$/i.test(String(t.state)))&&(!t.country||/^(us|usa|united states|united states of america)$/i.test(String(t.country)));
const teams=s=>(s?.teams||[]).filter(eligible);
const reg=t=>{const x=low([t.city,t.county,t.location,t.region,t.name].filter(Boolean).join(' ')),c=low(t.conferenceParent||t.conference);
 if(/st\.? louis|st\.? charles|chesterfield|wildwood|ballwin|kirkwood|webster|parkway|rockwood|eureka|florissant|hazelwood|arnold|ferguson|ladue|pattonville|creve coeur|o.fallon|wentzville|troy|festus|suburban st\.? louis|metro catholic|gateway athletic|four rivers/.test(x+' '+c))return 'STL';
 if(/kansas city|independence|lee.s summit|blue springs|raytown|liberty|park hill|belton|grain valley|grandview|north kansas|platt|gkcsc|kci|interscholastic league/.test(x+' '+c))return 'KC';
 if(/springfield|nixa|ozark|republic|branson|joplin|carthage|webb city|neosho|willard|central ozark|mid.lakes|ozark mountain|greater ozarks/.test(x+' '+c))return 'SW';
 if(/columbia|jefferson city|fulton|boonville|sedalia|moberly|central missouri|cmac|show.me/.test(x+' '+c))return 'CENTRAL';
 if(/cape girardeau|sikeston|poplar bluff|kennett|dexter|bootheel|southeast missouri|semoc|stoddard/.test(x+' '+c))return 'SE';
 if(/st\.? joseph|maryville|chillicothe|cameron|midland empire|grand river|hdc/.test(x+' '+c))return 'NW';
 return 'RURAL:'+low(t.county||t.region||t.conferenceParent||t.conference||'other');};
const cls=t=>Number(t.class||t.classification||3)||3;
const current=()=>typeof current!=='undefined'?current:null;
const alertUser=m=>typeof toast==='function'?toast(m):alert(m);
const finished=g=>g?.played===true||g?.completed===true||g?.final===true||['final','completed','played'].includes(low(g?.status));
const regular=g=>{const tags=[g.type,g.gameType,g.seasonType,g.phase,g.category,g.competition,g.stage,g.eventType].filter(Boolean).map(low);return !tags.some(x=>/preseason|pre-season|summer|fall|exhibition|scrimmage|friendly|tournament|playoff|district|postseason|offseason/.test(x))&&(!tags.length||tags.some(x=>/regular|conference|league/.test(x)));};
function locked(s){if(!s)return true;if(s.bm2753?.stage&&s.bm2753.stage!=='complete')return true;return [...(s.schedule||[]),...(s.seasonEngine?.games||[])].some(g=>finished(g)&&regular(g));}
function balanced(s){const ts=teams(s);if(ts.length<4)return {changes:0,groups:0,short:0,reason:'At least four Missouri schools must be loaded.'};
 const byRegion=new Map();for(const t of ts){const r=reg(t);if(!byRegion.has(r))byRegion.set(r,[]);byRegion.get(r).push(t)}
 const assignments=new Map(), stats=[];
 for(const [region,arr] of byRegion){if(arr.length<4){stats.push({region,small:arr.length});continue}
  const existing=new Map();for(const t of arr){const name=bad(t.conference)?'Independent':String(t.conference).trim();if(!existing.has(name))existing.set(name,[]);existing.get(name).push(t)}
  // Never create more conference slots than can be staffed with four schools.
  const targetCount=Math.min(Math.floor(arr.length/4),existing.size);
  const viable=[...existing].sort((a,b)=>b[1].length-a[1].length||a[0].localeCompare(b[0])).slice(0,targetCount);
  if(!viable.length)viable.push(['Independent',[]]);
  const buckets=viable.map(([name])=>({name,items:[]}));
  // Keep incumbents where possible, while ensuring each retained conference has four teams.
  const remaining=arr.slice().sort((a,b)=>low(a.name).localeCompare(low(b.name)));
  const score=(t,b)=>{const incumbency=low(t.conference)===low(b.name)?60:0;const group=b.items;const sameCity=group.filter(x=>t.city&&low(x.city)===low(t.city)).length;const sameCounty=group.filter(x=>t.county&&low(x.county)===low(t.county)).length;const classDist=group.length?group.reduce((n,x)=>n+Math.abs(cls(x)-cls(t)),0)/group.length:0;return incumbency+sameCity*24+sameCounty*12-classDist*9;};
  for(const b of buckets){while(b.items.length<4&&remaining.length){remaining.sort((a,c)=>score(c,b)-score(a,b)||low(a.name).localeCompare(low(c.name)));b.items.push(remaining.shift())}}
  const limit=Math.ceil(arr.length/buckets.length);
  for(const t of remaining){const options=buckets.filter(b=>b.items.length<limit);const ranked=(options.length?options:buckets).sort((a,b)=>score(t,b)-score(t,a)||a.items.length-b.items.length);ranked[0].items.push(t)}
  for(const b of buckets)for(const t of b.items)assignments.set(String(t.id),b.name);
  stats.push({region,groups:buckets.length});
 }
 // Small rural clusters are absorbed into the nearest existing group when possible.
 for(const t of ts){if(assignments.has(String(t.id)))continue;const options=[...new Set(assignments.values())];if(!options.length){assignments.set(String(t.id),'Independent');continue}const same=ts.filter(x=>assignments.has(String(x.id))&&reg(x)===reg(t));const pool=same.length?same:ts.filter(x=>assignments.has(String(x.id)));const ranked=pool.sort((a,b)=>(low(a.county)===low(t.county)?-1:1)-(low(b.county)===low(t.county)?-1:1)||Math.abs(cls(a)-cls(t))-Math.abs(cls(b)-cls(t)));assignments.set(String(t.id),assignments.get(String(ranked[0].id)));}
 let changes=0;for(const t of ts){const c=assignments.get(String(t.id));if(!c)continue;if(t.conference!==c)changes++;t.conference=c;t.conferenceParent=c;t.conferenceManual=true}
 const counts={};for(const t of ts)counts[t.conference]=(counts[t.conference]||0)+1;
 return {changes,groups:Object.keys(counts).length,short:Object.values(counts).filter(n=>n<4).length,assignments};}
function run(){const s=current();if(!s)return alertUser('Open a career first.');if(locked(s))return alertUser('Conference rebalancing is only available before completed regular-season games and postseason tournaments. Preseason, summer and fall do not lock it.');if(!confirm('Rebalance all Missouri conferences (including custom conferences) by geographic area? Conferences with fewer than four schools may be merged into nearby conferences. Existing career conference assignments will change.'))return;
 const result=balanced(s);if(!result.assignments)return alertUser(result.reason||'Could not rebalance conferences.');
 let map={};try{map=JSON.parse(localStorage.getItem(overrideKey)||'{}')||{}}catch{}
 for(const [id,conf] of result.assignments)map[id]=conf;
 const set=(k,v)=>{if(window.BM27Storage?.set)BM27Storage.set(k,v);else localStorage.setItem(k,v)};
 set(overrideKey,JSON.stringify(map));
 if(typeof saves!=='undefined'&&Array.isArray(saves)){for(const career of saves){if(locked(career))continue;for(const t of teams(career)){const c=map[String(t.id)];if(c){t.conference=c;t.conferenceParent=c;t.conferenceManual=true}}}}
 if(typeof directory!=='undefined'&&Array.isArray(directory)){for(const t of directory){const c=map[String(t.id)];if(c){t.conference=c;t.conferenceParent=c;t.conferenceManual=true}}set('mshsaa_bm27_directory',JSON.stringify(directory))}
 try{if(typeof persist==='function')persist()}catch(e){console.warn('Conference balance save failed',e)}
 if(typeof renderAll==='function')renderAll();
 alertUser(`Balanced ${result.groups} conferences. ${result.changes} school assignments changed; ${result.short} conferences have fewer than four loaded schools.`);}
function mount(){const host=$('bm27ConferenceManager')||$('conferencesPage');if(!host||$('bm2754Balance'))return;const box=document.createElement('article');box.className='card';box.style.margin='16px 0';box.innerHTML='<h3>Geographic Conference Balancing</h3><p class="muted small">Group Missouri schools by area and similar class. Every conference has at least four loaded teams wherever the school count permits. Small custom conferences may merge into nearby conferences. This changes conference assignments, not school records.</p><button class="secondary" type="button" id="bm2754Balance">Balance All Conferences</button>';host.appendChild(box);$('bm2754Balance').addEventListener('click',run)}
function install(){mount();if(typeof renderAll==='function'){const orig=renderAll;renderAll=function(...args){const r=orig.apply(this,args);mount();return r}}document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="conferences"]'))setTimeout(mount,0)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.BM27BalanceConferences={balanced,locked,run};
})();
