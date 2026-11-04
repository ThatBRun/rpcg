/* BM27 v2.2 — Live Games, Difficulty & Nationals Update
   Loaded after app.js, season-engine.js and v2-program.js.
*/
(()=>{
'use strict';
const VERSION=22140;
const $22=id=>document.getElementById(id);
const eq22=(a,b)=>String(a)===String(b);
const rand22=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
const clamp22=(n,a,b)=>Math.max(a,Math.min(b,n));
const DIFF={
  Freshman:{cash:125000,userBoost:8,oppBoost:-2,meeting:14,injury:.65,stateBonus:15000,staffMult:.90,label:'Freshman'},
  Varsity:{cash:75000,userBoost:0,oppBoost:3,meeting:-3,injury:1,stateBonus:50000,staffMult:1,label:'Varsity'},
  'All-State':{cash:40000,userBoost:-4,oppBoost:8,meeting:-15,injury:1.35,stateBonus:100000,staffMult:1.15,label:'All-State'}
};
const STATES=['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const PREFIX=['Central','North','South','East','West','Memorial','Lincoln','Roosevelt','Washington','Jefferson','Union','Liberty','Heritage','Centennial','Ridge','Valley','Lakeside','Mountain View','Parkview','Riverside'];
const MASCOTS=['Tigers','Eagles','Wildcats','Knights','Panthers','Bulldogs','Warriors','Lions','Mustangs','Falcons','Rams','Hawks','Vikings','Spartans','Bears','Wolves'];
const INJURIES=[
  ['Ankle Sprain',3,14],['Knee Soreness',2,10],['Wrist Sprain',4,16],['Back Tightness',2,8],['Shoulder Strain',3,12],['Foot Soreness',2,9],['Hamstring Strain',5,18]
];
function profile(save=current){return DIFF[save?.difficulty]||DIFF.Varsity}
function uid22(){try{return crypto.randomUUID()}catch{}return `${Date.now()}-${Math.random().toString(36).slice(2)}`}
function seasonStart(save=current){return new Date(`${Number(save?.season)||2026}-11-01T12:00:00`)}
function regularStart(save=current){return new Date(`${Number(save?.season)||2026}-11-24T12:00:00`)}
function ensureV22(save=current){
  if(!save)return null; save.v22=save.v22||{};const v=save.v22;
  v.schemaVersion=VERSION;
  v.lastStateTitles=Number.isFinite(Number(v.lastStateTitles))?Number(v.lastStateTitles):Number(save.history?.titles||0);
  v.nationalSeason=Number(v.nationalSeason)||Number(save.season)||2026;
  v.rankPage=Number(v.rankPage)||1;
  v.injuryLog=Array.isArray(v.injuryLog)?v.injuryLog:[];
  if(v.nationalSeason!==Number(save.season)){v.nationalSeason=Number(save.season);v.nationalPool=null;v.nationals=null;}
  ensureNationalPool(save);
  normalizeCalendar(save);
  return v;
}
function normalizeCalendar(save=current){
  if(!save)return;const min=regularStart(save).getTime();let bump=0;
  for(const g of (save.schedule||[]).filter(g=>!g.played&&(g.type==='Regular Season'||!g.type)).sort((a,b)=>new Date(a.date)-new Date(b.date))){
    if(new Date(g.date).getTime()<min){const d=new Date(min);d.setDate(d.getDate()+bump*2);g.date=d.toISOString();bump++;}
  }
  // v2.7.36: this helper may normalize REGULAR GAME dates, but it must never rewrite the career day.
  // May 30 and Sep 4 are legitimate offseason dates before the Nov 1 preseason.
}
function hash22(value=''){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h>>>0)}
function realNationalEntry(t){const h=hash22(t.id||`${t.name}|${t.state}|${t.city||''}`),rating=Number(t.rating)||68+(h%27),games=Math.max(4,Math.min(28,Number(t.wins||0)+Number(t.losses||0)||6+(h%7))),wins=(Number(t.wins||0)+Number(t.losses||0))?Number(t.wins||0):Math.max(1,Math.min(games-1,Math.round(games*clamp22((rating-53)/48,.28,.92))));return{id:String(t.id),name:t.name||'Unknown School',state:t.state||'Missouri',city:t.city||'',mascot:t.mascot||'',rating,wins,losses:(Number(t.wins||0)+Number(t.losses||0))?Number(t.losses||0):games-wins,pf:0,pa:0,realSchool:true,source:t.ncesSource||t.source||'BM27 school directory'}}
function realSaveCandidates(save){return (save?.teams||[]).filter(t=>t&&t.id!=null&&!eq22(t.id,save.schoolId)&&!t.nationalOnly&&t.name).map(realNationalEntry)}
const NATIONAL_STATE_CODES=['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
let nationalRankingCache={key:'',all:[],userRank:100,rankMap:new Map()};
function nationalDirectoryRows(){const d=window.BM27NationalDirectory;return Array.isArray(d)?d:Array.isArray(d?.schools)?d.schools:[]}
function directoryEntry(raw){if(!raw?.id||!raw?.name)return null;return realNationalEntry({id:raw.id,name:raw.name,state:raw.state||raw.stateCode,city:raw.city||'',mascot:raw.mascot||'',rating:raw.rating,wins:raw.wins,losses:raw.losses,ncesSource:raw.source||raw.ncesSource})}

function stateCodeFromEntry(t){
  const raw=String(t?.state||'').trim();
  if(raw.length===2)return raw.toUpperCase();
  const map={Alabama:'AL',Alaska:'AK',Arizona:'AZ',Arkansas:'AR',California:'CA',Colorado:'CO',Connecticut:'CT',Delaware:'DE',Florida:'FL',Georgia:'GA',Hawaii:'HI',Idaho:'ID',Illinois:'IL',Indiana:'IN',Iowa:'IA',Kansas:'KS',Kentucky:'KY',Louisiana:'LA',Maine:'ME',Maryland:'MD',Massachusetts:'MA',Michigan:'MI',Minnesota:'MN',Mississippi:'MS',Missouri:'MO',Montana:'MT',Nebraska:'NE',Nevada:'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',Ohio:'OH',Oklahoma:'OK',Oregon:'OR',Pennsylvania:'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',Tennessee:'TN',Texas:'TX',Utah:'UT',Vermont:'VT',Virginia:'VA',Washington:'WA','West Virginia':'WV',Wisconsin:'WI',Wyoming:'WY','District of Columbia':'DC'};
  return map[raw]||raw||'??';
}
function diverseNationalPool(entries,save=current){
  const unique=new Map();
  for(const t of entries||[]){if(!t?.id||!t?.name)continue;const e=t.realSchool?t:realNationalEntry(t);unique.set(String(e.id),e)}
  const groups=new Map();
  for(const e of unique.values()){const st=stateCodeFromEntry(e);if(!groups.has(st))groups.set(st,[]);groups.get(st).push(e)}
  for(const arr of groups.values())arr.sort((a,b)=>hash22(`${a.id}|${save?.season||2026}`)-hash22(`${b.id}|${save?.season||2026}`));
  const order=['MO',...NATIONAL_STATE_CODES];const out=[];let round=0;
  while(out.length<99&&round<25){let added=0;for(const st of order){const arr=groups.get(st)||[];if(arr[round]&&out.length<99){out.push(arr[round]);added++}}if(!added)break;round++}
  if(out.length<99){for(const e of unique.values()){if(out.length>=99)break;if(!out.some(x=>eq22(x.id,e.id)))out.push(e)}}
  return out.slice(0,99);
}
async function hydrateRealNationalPool(save=current){
  if(!save)return [];const v=save.v22||(save.v22={});if(v.nationalHydrating)return v.nationalPool||[];
  v.nationalHydrating=true;v.nationalLoadError='';v.nationalDirectoryReady=false;v.nationalDirectoryLoadedStates=0;v.nationalDirectoryTotalStates=NATIONAL_STATE_CODES.length+1;
  try{
    if(!window.BM27OutOfState?.loadAllStates)throw new Error('National school directory is not ready yet.');
    try{await window.BM27OutOfState.ready?.()}catch{}
    const directory=await window.BM27OutOfState.loadAllStates();
    window.BM27NationalDirectory=Array.isArray(directory)?directory:[];
    const all=[...realSaveCandidates(save)];
    for(const raw of window.BM27NationalDirectory){const e=directoryEntry(raw);if(e)all.push(e)}
    v.nationalPool=diverseNationalPool(all,save);
    const states=new Set(window.BM27NationalDirectory.map(stateCodeFromEntry).filter(Boolean));
    v.nationalDirectoryReady=true;v.nationalDirectoryLoadedStates=v.nationalDirectoryTotalStates;v.nationalDirectorySchoolCount=window.BM27NationalDirectory.length+(save.teams||[]).filter(t=>!t.nationalOnly&&t.name).length;
    v.nationalStatesRepresented=states.size+1;
    nationalRankingCache.key='';
    if(stateComplete(save)&&!v.nationals)setTimeout(()=>{try{createNationals(save);syncNationalSchedule(save);persist?.();renderAll?.()}catch(e){console.warn('BM27 nationals startup creation',e)}},0);
    const field=v.nationals?.field||[];const fieldTeams=field.map(id=>id==='national-user'?{state:'MO'}:nationalTeam(save,id)).filter(Boolean);const fieldStates=new Set(fieldTeams.map(stateCodeFromEntry));
    if(v.nationals&&!v.nationals.championId&&fieldStates.size<10){v.nationals=null;for(const g of (save.schedule||[]).filter(g=>g.nationalTournament&&!g.played))g.__bm27Remove=true;save.schedule=(save.schedule||[]).filter(g=>!g.__bm27Remove);if(stateComplete(save))createNationals(save)}
  }catch(e){console.error('BM27 nationwide school preload failed',e);v.nationalPool=diverseNationalPool(realSaveCandidates(save),save);v.nationalLoadError=e?.message||String(e)}finally{v.nationalHydrating=false;try{persist?.()}catch{};setTimeout(()=>{try{renderNationalsPage()}catch{}},0)}
  return v.nationalPool||[];
}
function ensureNationalPool(save=current){
  if(!save)return [];const v=save.v22||{};
  if(Array.isArray(v.nationalPool)&&v.nationalPool.some(t=>String(t?.id||'').startsWith('nat-'))){v.nationalPool=[];if(v.nationals&&JSON.stringify(v.nationals.field||[]).includes('nat-'))v.nationals=null}
  const local=realSaveCandidates(save);
  const existing=(v.nationalPool||[]).filter(t=>t?.realSchool&&!String(t.id).startsWith('nat-'));
  v.nationalPool=diverseNationalPool([...existing,...local],save);
  // Crucially, do not treat 99 Missouri schools as a completed national preload.
  if(!v.nationalDirectoryReady&&!v.nationalHydrating)setTimeout(()=>hydrateRealNationalPool(save),0);
  return v.nationalPool;
}
function nationalPower(t,isUser=false){const games=(t.wins||0)+(t.losses||0),pct=games?(t.wins||0)/games:.5;let score=(t.rating||70)+pct*18+(t.wins||0)*.35-(t.losses||0)*.1+(isUser?1.5:0);if(!isUser&&stateCodeFromEntry(t)==='MO')score-=7.5;return score}
function fullNationalRankings(save=current){
  if(!save)return [];ensureV22(save);const me=save.teams.find(t=>eq22(t.id,save.schoolId));
  const user={id:'national-user',name:me?.name||'Your School',state:'Missouri',mascot:me?.mascot||'',rating:me?.rating||70,wins:me?.wins||0,losses:me?.losses||0,isUser:true,realSchool:true};
  const dir=nationalDirectoryRows(),pool=save.v22.nationalPool||[];
  const poolSig=pool.map(t=>`${t.id}:${t.wins||0}:${t.losses||0}`).join('|');
  const key=[save.season,dir.length,user.rating,user.wins,user.losses,poolSig].join('~');
  if(nationalRankingCache.key===key&&nationalRankingCache.all.length)return nationalRankingCache.all;
  const map=new Map();
  for(const raw of dir){const e=directoryEntry(raw);if(e&&stateCodeFromEntry(e)!=='MO')map.set(String(e.id),e)}
  for(const e0 of pool){const e=e0.realSchool?{...e0}:realNationalEntry(e0);if(stateCodeFromEntry(e)!=='MO')map.set(String(e.id),e)}
  for(const t of save.teams||[]){if(!t?.id||!t?.name||eq22(t.id,save.schoolId)||t.nationalOnly||t.outOfState)continue;const e=realNationalEntry(t);if(stateCodeFromEntry(e)!=='MO')continue;const gate=hash22(`${e.id}|${save.season||2026}|missouri-national`)%100;if(gate<12)map.set(String(e.id),e)}
  const all=[user,...map.values()].sort((a,b)=>nationalPower(b,b.isUser)-nationalPower(a,a.isUser)||b.wins-a.wins||String(a.name).localeCompare(String(b.name))).map((t,i)=>({...t,rank:i+1}));
  const rankMap=new Map(all.map(t=>[String(t.id),t.rank]));
  nationalRankingCache={key,all,userRank:rankMap.get('national-user')||all.length,rankMap};
  window.BM27NationalRankMap=rankMap;window.BM27NationalRankingsAll=all;
  return all;
}
function nationalRankings(save=current){return fullNationalRankings(save).slice(0,100)}
function nationalUserRank(save=current){fullNationalRankings(save);return nationalRankingCache.userRank||100}
window.addEventListener?.('bm27-out-of-state-loaded',()=>{nationalRankingCache.key=''});
function advanceNationalWorld(save=current){
  if(!save)return;ensureV22(save);for(const t of save.v22.nationalPool){if((t.wins+t.losses)>=28)continue;const chance=clamp22(.25+(t.rating-65)/45,.18,.88);if(Math.random()<chance)t.wins++;else t.losses++;}
}
function highestClassNumber(save=current){
  const configured=Number(save?.v2?.classSystem?.maxClass||0);
  const teamMax=Math.max(0,...(save?.teams||[]).filter(t=>!t.outOfState&&!t.nationalOnly).map(t=>Number(t.class)||0));
  return Math.max(configured,teamMax,6);
}
function highestClassStateTournament(save=current){
  const top=highestClassNumber(save);
  return (save?.tournaments||[]).find(t=>(t.type==='State Tournament'||t.kind==='State Tournament')&&Number(t.classNo)===top&&t.championId)||null;
}
function stateComplete(save=current){return !!highestClassStateTournament(save)}
function nationalTeam(save,id){if(id==='national-user'){const me=save.teams.find(t=>eq22(t.id,save.schoolId));return{id,name:me?.name||'Your School',mascot:me?.mascot||'',state:me?.state||'Missouri',rating:me?.rating||70,wins:me?.wins||0,losses:me?.losses||0,isUser:true,realSchool:true}}const local=save.v22.nationalPool.find(t=>eq22(t.id,id))||save.teams?.find(t=>eq22(t.id,id));if(local)return local;const raw=nationalDirectoryRows().find(t=>eq22(t.id,id));return raw?directoryEntry(raw):null}
function ensureNationalOpponentProxy(save,id){
  if(!save||!id||id==='national-user')return null;
  save.teams=Array.isArray(save.teams)?save.teams:[];
  const existing=save.teams.find(t=>eq22(t.id,id));if(existing)return existing;
  const src=nationalTeam(save,id);if(!src)return null;
  const proxy={id:src.id,name:src.name,mascot:src.mascot||'',city:src.city||'',state:src.state||'',rating:src.rating||70,wins:0,losses:0,pf:0,pa:0,class:'Out of State',district:src.state||'National',conference:'National',nationalOnly:true,outOfState:true,realSchool:true,ncesSource:src.source||'National directory',roster:[]};save.teams.push(proxy);return proxy;
}
function matchObj(a,b,round){return{id:uid22(),team1Id:a||null,team2Id:b||null,round,status:'scheduled',score1:null,score2:null,winnerId:null}}
function createNationals(save=current){
  if(!save||save.v22.nationals||!stateComplete(save))return;
  ensureNationalPool(save);if(!save.v22.nationalDirectoryReady||(save.v22.nationalPool||[]).length<67){hydrateRealNationalPool(save);return null}
  const fullRanks=(window.BM27V2718?.fullNationalRankings?.(save)||fullNationalRankings(save)),ranks=fullRanks.slice(0,100),userRank=(window.BM27V2718?.nationalUserRank?.(save)||nationalUserRank(save));
  const autoState=highestClassStateTournament(save),autoChampId=autoState?.championId;
  const autoIsUser=autoChampId&&eq22(autoChampId,save.schoolId);
  const autoFieldId=autoIsUser?'national-user':autoChampId;
  let field=ranks.slice(0,68).map(x=>x.id);
  // The champion of Missouri's highest active classification owns an automatic bid.
  // If that school is outside the normal Top 68, it replaces the last at-large team.
  if(autoFieldId&&!field.some(id=>eq22(id,autoFieldId))){field[field.length-1]=autoFieldId}
  field=[...new Map(field.map(id=>[String(id),id])).values()];
  while(field.length<68){const add=ranks.find(x=>!field.some(id=>eq22(id,x.id)));if(!add)break;field.push(add.id)}
  const userSelected=userRank<=68||autoIsUser;
  const n=save.v22.nationals={season:save.season,status:userSelected?'Selected':'Missed Field',userRank,field,rounds:[],championId:null,automaticBidId:autoFieldId||null,automaticBidClass:Number(autoState?.classNo)||highestClassNumber(save)};
  const autoTeam=autoFieldId?nationalTeam(save,autoFieldId):null;
  if(autoTeam)save.news?.unshift({date:save.day,text:`MARCH MADNESS AUTO BID: ${autoTeam.name} earned the automatic bid by winning the Class ${n.automaticBidClass} Missouri State Tournament.`});
  if(!userSelected)save.news?.unshift({date:save.day,text:`Varsity March Madness selection: ${myTeam().name} finished No. ${userRank} nationally and missed the 68-team field.`});
  else save.news?.unshift({date:save.day,text:autoIsUser?`NATIONALS: ${myTeam().name} is going to March Madness automatically as the Class ${n.automaticBidClass} Missouri state champion!`:`NATIONALS: ${myTeam().name} earned the No. ${userRank} national ranking and was selected for the 68-team Varsity March Madness field!`});
  const playInSeeds=field.slice(60,68);const first=[];for(let i=0;i<4;i++)first.push(matchObj(playInSeeds[i],playInSeeds[7-i],'First Four'));n.rounds.push({name:'First Four',matches:first});driveNationalRound(save);syncNationalSchedule(save);
}
function simNationalScore(a,b,save=current){const p=profile(save),ar=(a?.rating||70)+(a?.isUser?p.userBoost:0),br=(b?.rating||70)+(b?.isUser?p.userBoost:0)+(a?.isUser?p.oppBoost:0);let s1=Math.round(58+ar*.18+(ar-br)*.34+(Math.random()-.5)*18),s2=Math.round(58+br*.18+(br-ar)*.30+(Math.random()-.5)*18);if(s1===s2)s1++;return[Math.max(35,s1),Math.max(35,s2)]}
function completeNationalMatch(save,m,s1,s2){m.score1=s1;m.score2=s2;m.status='final';m.winnerId=s1>s2?m.team1Id:m.team2Id;}
function buildNextNationalRound(save){
  const n=save.v22.nationals,last=n.rounds[n.rounds.length-1];if(!last||last.matches.some(m=>m.status!=='final'))return;
  if(last.name==='Championship'){n.championId=last.matches[0].winnerId;n.status='Complete';const champ=nationalTeam(save,n.championId);save.news?.unshift({date:save.day,text:`Varsity March Madness champion: ${champ?.name||'Unknown School'}.`});return}
  let entrants;
  if(last.name==='First Four')entrants=[...n.field.slice(0,60),...last.matches.map(m=>m.winnerId)];else entrants=last.matches.map(m=>m.winnerId);
  const names={64:'Round of 64',32:'Round of 32',16:'Sweet 16',8:'Elite Eight',4:'Final Four',2:'Championship'};const name=names[entrants.length]||`Round of ${entrants.length}`;
  const matches=[];for(let i=0;i<entrants.length/2;i++)matches.push(matchObj(entrants[i],entrants[entrants.length-1-i],name));n.rounds.push({name,matches});
}
function driveNationalRound(save=current){
  const n=save?.v22?.nationals;if(!n||n.championId)return;let round=n.rounds[n.rounds.length-1];if(!round)return;
  for(const m of round.matches){if(m.status==='final')continue;if(m.team1Id==='national-user'||m.team2Id==='national-user')continue;const a=nationalTeam(save,m.team1Id),b=nationalTeam(save,m.team2Id),[s1,s2]=simNationalScore(a,b,save);completeNationalMatch(save,m,s1,s2)}
  if(round.matches.every(m=>m.status==='final')){buildNextNationalRound(save);round=n.rounds[n.rounds.length-1];if(!n.championId&&round&&round.matches.every(m=>m.team1Id!=='national-user'&&m.team2Id!=='national-user'))driveNationalRound(save)}
}
function userNationalMatch(save=current){const n=save?.v22?.nationals;if(!n||n.championId)return null;const r=n.rounds[n.rounds.length-1];return r?.matches.find(m=>m.status!=='final'&&(m.team1Id==='national-user'||m.team2Id==='national-user'))||null}
function nationalRoundDate(save,roundName){
  const state=highestClassStateTournament(save)||(save.tournaments||[]).find(t=>(t.type==='State Tournament'||t.kind==='State Tournament')&&t.championId);
  const stateFinal=state?.rounds?.at?.(-1)?.date||state?.rounds?.at?.(-1)?.matches?.[0]?.date||save.day||new Date().toISOString();
  const base=new Date(Math.max(new Date(stateFinal).getTime()||0,new Date(save.day||0).getTime()||0));
  const offsets={'First Four':3,'Round of 64':5,'Round of 32':8,'Sweet 16':11,'Elite Eight':14,'Final Four':18,'Championship':21};
  base.setDate(base.getDate()+(offsets[roundName]??5));base.setHours(19,0,0,0);return base.toISOString();
}
function syncNationalSchedule(save=current){
  if(!save?.v22?.nationals)return;
  const n=save.v22.nationals;
  save.schedule=Array.isArray(save.schedule)?save.schedule:[];
  // Reconcile any already-finished national games back into visible schedule history.
  for(const r of n.rounds||[])for(const m of r.matches||[]){
    const sg=save.schedule.find(g=>g.nationalMatchId===m.id);
    if(!sg||m.status!=='final')continue;
    const userFirst=m.team1Id==='national-user';
    sg.played=true;sg.myScore=userFirst?m.score1:m.score2;sg.oppScore=userFirst?m.score2:m.score1;
  }
  const m=userNationalMatch(save);if(!m)return;
  let g=save.schedule.find(x=>x.nationalMatchId===m.id);
  const oppId=m.team1Id==='national-user'?m.team2Id:m.team1Id;
  // Add a lightweight nationalOnly team into the active career so every legacy/core game path
  // can resolve this opponent by the normal opponentId without adding it to Missouri rankings.
  ensureNationalOpponentProxy(save,oppId);
  if(!g){
    g={id:uid22(),opponentId:oppId,nationalOpponentId:oppId,date:nationalRoundDate(save,m.round),home:false,neutral:true,played:false,type:'Varsity March Madness',nationalMatchId:m.id,roundName:m.round,nationalTournament:true};
    save.schedule.push(g);
  }else Object.assign(g,{opponentId:oppId,nationalOpponentId:oppId,date:g.date||nationalRoundDate(save,m.round),type:'Varsity March Madness',roundName:m.round,nationalTournament:true});
  save.schedule.sort((a,b)=>new Date(a.date)-new Date(b.date));
}
function simulateNationalScheduleGame(g){
  if(!current||!g?.nationalMatchId)return false;
  ensureV22(current);const n=current.v22.nationals;if(!n)return false;
  const all=(n.rounds||[]).flatMap(r=>r.matches||[]),m=all.find(x=>x.id===g.nationalMatchId);if(!m||m.status==='final'){syncNationalSchedule(current);return true}
  const a=nationalTeam(current,m.team1Id),b=nationalTeam(current,m.team2Id),[s1,s2]=simNationalScore(a,b,current),userFirst=m.team1Id==='national-user';
  const myScore=userFirst?s1:s2,oppScore=userFirst?s2:s1,opp=userFirst?b:a,me=myTeam();
  g.played=true;g.myScore=myScore;g.oppScore=oppScore;g.tbd=false;g.type='Varsity March Madness';g.roundName=m.round;
  me.pf=(me.pf||0)+myScore;me.pa=(me.pa||0)+oppScore;if(opp){opp.pf=(opp.pf||0)+oppScore;opp.pa=(opp.pa||0)+myScore}
  if(myScore>oppScore){me.wins=(me.wins||0)+1;if(opp)opp.losses=(opp.losses||0)+1;current.history.wins=(current.history.wins||0)+1}
  else{me.losses=(me.losses||0)+1;if(opp)opp.wins=(opp.wins||0)+1;current.history.losses=(current.history.losses||0)+1}
  current.day=g.date||current.day;completeNationalMatch(current,m,s1,s2);n.status=myScore>oppScore?'Advanced':'Eliminated';
  current.news?.unshift({date:current.day,text:`Varsity March Madness ${m.round}: ${me.name} ${myScore>oppScore?'defeated':'lost to'} ${opp?.name||'Opponent'}, ${myScore}-${oppScore}.`});
  // Finish every other matchup in this round, build the next one, and stop only if the user has another game waiting.
  driveNationalRound(current);syncNationalSchedule(current);persist();renderAll();renderNationalsPage();return true;
}
function playNationalGame(live=false){
  syncNationalSchedule(current);const m=userNationalMatch();if(!m)return toast('No Varsity March Madness game is waiting for you.');
  const g=current.schedule.find(x=>x.nationalMatchId===m.id);if(!g)return toast('March Madness schedule game could not be created.');
  const oppId=m.team1Id==='national-user'?m.team2Id:m.team1Id,opp=nationalTeam(current,oppId);
  if(!live){simulateGame(g);return}
  const [s1,s2]=simNationalScore(nationalTeam(current,m.team1Id),nationalTeam(current,m.team2Id),current),userFirst=m.team1Id==='national-user',myScore=userFirst?s1:s2,oppScore=userFirst?s2:s1;
  runLivePresentation({title:`Varsity March Madness — ${m.round}`,us:myTeam().name,them:opp?.name||'Opponent',finalUs:myScore,finalThem:oppScore,onFinish:()=>{
    // Preserve the score the viewer just watched, then reconcile the bracket/schedule exactly once.
    if(g.played)return;const a=nationalTeam(current,m.team1Id),b=nationalTeam(current,m.team2Id),me=myTeam();g.played=true;g.myScore=myScore;g.oppScore=oppScore;g.type='Varsity March Madness';g.roundName=m.round;
    me.pf=(me.pf||0)+myScore;me.pa=(me.pa||0)+oppScore;if(opp){opp.pf=(opp.pf||0)+oppScore;opp.pa=(opp.pa||0)+myScore}
    if(myScore>oppScore){me.wins=(me.wins||0)+1;if(opp)opp.losses=(opp.losses||0)+1;current.history.wins=(current.history.wins||0)+1}else{me.losses=(me.losses||0)+1;if(opp)opp.wins=(opp.wins||0)+1;current.history.losses=(current.history.losses||0)+1}
    current.day=g.date||current.day;completeNationalMatch(current,m,userFirst?myScore:oppScore,userFirst?oppScore:myScore);current.v22.nationals.status=myScore>oppScore?'Advanced':'Eliminated';current.news?.unshift({date:current.day,text:`Varsity March Madness ${m.round}: ${me.name} ${myScore>oppScore?'defeated':'lost to'} ${opp?.name||'Opponent'}, ${myScore}-${oppScore}.`});driveNationalRound(current);syncNationalSchedule(current);persist();renderAll();renderNationalsPage();
  }});
}
function nationalMatchHTML(m){const a=nationalTeam(current,m.team1Id),b=nationalTeam(current,m.team2Id),user=m.team1Id==='national-user'||m.team2Id==='national-user',winner=m.status==='final'?m.winnerId:null;return `<div class="national-match ${user?'user-match':''} ${m.status==='final'?'played':''}"><span class="${winner&&winner===m.team1Id?'winner':''}"><i>${a?.name||'TBD'}</i>${m.status==='final'?`<b>${m.score1}</b>`:''}</span><span class="${winner&&winner===m.team2Id?'winner':''}"><i>${b?.name||'TBD'}</i>${m.status==='final'?`<b>${m.score2}</b>`:''}</span></div>`}
function bracketNationalHTML(n){
  if(!n?.rounds?.length)return '<p class="muted">The national bracket has not been created yet.</p>';
  const firstFour=n.rounds.find(r=>r.name==='First Four');
  const main=n.rounds.filter(r=>r.name!=='First Four');
  const first=firstFour?`<div class="national-first-four"><div class="national-first-four-head"><span>FIRST FOUR</span><small>Play-in games</small></div><div class="national-first-four-grid">${firstFour.matches.map(nationalMatchHTML).join('')}</div></div>`:'';
  const body=main.length?`<div class="national-bracket-scroll"><div class="national-bracket national-main-bracket">${main.map((r,idx)=>`<section class="national-round" data-round="${r.name}"><h4>${r.name}</h4><div class="national-round-games">${r.matches.map(nationalMatchHTML).join('')}</div></section>`).join('')}</div></div>`:`<div class="national-bracket-waiting"><b>Round of 64 will populate after the First Four.</b><span>Winners automatically move into the main bracket.</span></div>`;
  return `<div class="national-bracket-shell">${first}${body}</div>`;
}
function renderNationalsPage(){
  const el=$22('v22NationalsContent');if(!el||!current)return;ensureV22(current);if(stateComplete(current)&&!current.v22.nationals)createNationals(current);driveNationalRound(current);syncNationalSchedule(current);const ranks=nationalRankings(current),n=current.v22.nationals,waiting=userNationalMatch(current);const userRank=nationalUserRank(current),realReady=!!current.v22.nationalDirectoryReady&&nationalDirectoryRows().length>0;
  el.innerHTML=`<div class="section-head"><div><p class="eyebrow">FULL NATIONAL RANKING POOL • TOP 100 SHOWN</p><h2>National Rankings & Varsity March Madness</h2></div><span class="tag">Your Rank: #${userRank}</span></div><div class="metrics"><div class="metric"><span>National Field</span><b>Top 68</b></div><div class="metric"><span>Your National Rank</span><b>#${userRank}</b></div><div class="metric"><span>Nationals Status</span><b>${n?.status||'Regular Season'}</b></div></div>${n?`<article class="card"><div class="section-head"><h3>Varsity March Madness</h3>${waiting?`<div class="schedule-actions"><button id="v22PlayNational" class="primary">Play</button><button id="v22WatchNational" class="secondary">Watch Live</button></div>`:''}</div>${bracketNationalHTML(n)}</article>`:stateComplete(current)&&!realReady?`<article class="card"><h3>Building the real-school national field…</h3><p class="muted">BM27 is loading the nationwide high-school directory. ${current.v22.nationalDirectoryLoadedStates||0}/${current.v22.nationalDirectoryTotalStates||51} state directories loaded. ${current.v22.nationalLoadError?`Directory note: ${current.v22.nationalLoadError}`:'March Madness waits for the national preload so Missouri cannot fill the whole field.'}</p></article>`:'<article class="card"><h3>Selection happens after Missouri State</h3><p class="muted">Finish in the national Top 68 when Missouri postseason ends to earn a Varsity March Madness bid. The highest-class Missouri state champion receives an automatic bid.</p></article>'}<div class="section-head" style="margin-top:20px"><div><h3>National Top 100</h3><p class="muted small">Every loaded out-of-state school is eligible for the national board. Missouri schools have a reduced national-selection weight, except your school.</p></div><span class="tag">${fullNationalRankings(current).length.toLocaleString()} ranked</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>School</th><th>State</th><th>Record</th><th>OVR</th></tr></thead><tbody>${ranks.map(t=>`<tr class="${t.isUser?'ranking-user':''}"><td>${t.rank}</td><td><b>${t.name}</b>${t.isUser?' <span class="tag">YOU</span>':''}</td><td>${t.state}</td><td>${t.wins}-${t.losses}</td><td>${t.rating}</td></tr>`).join('')}</tbody></table></div>`;
  $22('v22PlayNational')?.addEventListener('click',()=>playNationalGame(false));$22('v22WatchNational')?.addEventListener('click',()=>playNationalGame(true));
}
function installNationalsPage(){
  const nav=document.querySelector('#sidebar nav'),main=document.querySelector('#game main');if(nav&&!$22('v22NationalsNav')){const b=document.createElement('button');b.className='nav';b.id='v22NationalsNav';b.dataset.page='nationals';b.textContent='Nationals';nav.appendChild(b);b.onclick=()=>{document.querySelectorAll('.nav[data-page]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$22('v22NationalsPage').classList.add('active');$22('pageTitle').textContent='Nationals';$22('game').classList.remove('menu-open');renderNationalsPage()}}
  if(main&&!$22('v22NationalsPage')){const s=document.createElement('section');s.id='v22NationalsPage';s.className='page';s.innerHTML='<div id="v22NationalsContent"></div>';main.appendChild(s)}
}
function renderMissouriRankings(){
  if(!current||!$22('rankingsTable'))return;ensureV22(current);const all=current.teams.filter(t=>!t.nationalOnly&&!t.outOfState).slice().sort((a,b)=>power(b)-power(a));const pages=Math.max(1,Math.ceil(all.length/50));current.v22.rankPage=clamp22(current.v22.rankPage||1,1,pages);const page=current.v22.rankPage,start=(page-1)*50,teams=all.slice(start,start+50);
  $22('rankingsTable').innerHTML=`<div class="ranking-pagination"><button id="rankPrev" class="secondary" ${page<=1?'disabled':''}>← Previous 50</button><b>Page ${page} of ${pages} • #${start+1}-${Math.min(start+50,all.length)} of ${all.length}</b><button id="rankNext" class="secondary" ${page>=pages?'disabled':''}>Next 50 →</button></div><table><thead><tr><th>Rank</th><th>School</th><th>Class</th><th>District</th><th>Record</th><th>Power</th></tr></thead><tbody>${teams.map((t,i)=>`<tr class="${eq22(t.id,current.schoolId)?'ranking-user':''}"><td>${start+i+1}</td><td><b>${t.name}</b></td><td>${t.class}</td><td>${t.district}</td><td>${t.wins}-${t.losses}</td><td>${power(t).toFixed(1)}</td></tr>`).join('')}</tbody></table>`;$22('rankPrev')?.addEventListener('click',()=>{current.v22.rankPage--;renderMissouriRankings()});$22('rankNext')?.addEventListener('click',()=>{current.v22.rankPage++;renderMissouriRankings()});
}
function enrichInjuries(){if(!current?.v2?.injuries)return;for(const i of current.v2.injuries){if(i.type)continue;const tpl=INJURIES[rand22(0,INJURIES.length-1)];i.type=tpl[0];i.severity=(new Date(i.returnDate)-new Date(i.started))/86400000>10?'Moderate':'Minor';}}
function showInjuryStrip(){const hero=$22('dashboardMetrics');if(!hero||!current?.v2)return;let box=$22('v22InjuryStrip');if(!box){box=document.createElement('div');box.id='v22InjuryStrip';box.className='injury-strip';hero.insertAdjacentElement('afterend',box)}const out=current.v2.injuries.filter(i=>i.status==='Out');box.innerHTML=out.length?`<b>Injury Report:</b> ${out.map(i=>`${i.playerName} — ${i.type||'Injury'} (${new Date(i.returnDate).toLocaleDateString()})`).join(' • ')}`:'<b>Injury Report:</b> All Varsity players available.'}
function syncDifficultyMoney(save=current,isNew=false){if(!save?.v2?.finances)return;const p=profile(save);if(isNew){save.v2.finances.cash=p.cash;if(save.v2.finances.ledger?.length)save.v2.finances.ledger[0]={date:save.day||new Date().toISOString(),amount:p.cash,reason:`${save.difficulty} starting program budget`};for(const s of save.v2.staffPool||[])s.salary=Math.round((s.salary||10000)*p.staffMult);}}
function syncStateBonus(){if(!current?.v22||!current?.v2?.finances)return;const titles=Number(current.history?.titles)||0,prev=Number(current.v22.lastStateTitles)||0;if(titles<=prev)return;const count=titles-prev,desired=profile().stateBonus,extra=Math.max(0,desired-15000)*count;if(extra){current.v2.finances.cash+=extra;current.v2.finances.ledger.unshift({date:current.day,amount:extra,reason:`Difficulty state-title bonus adjustment (${current.difficulty})`});current.news?.unshift({date:current.day,text:`${current.difficulty} state championship reward completed: $${desired.toLocaleString()} total.`})}current.v22.lastStateTitles=titles;}
function runLivePresentation({title,us,them,finalUs,finalThem,onFinish}){
  const dlg=$22('v2LiveDialog');if(!dlg){onFinish?.();return}dlg.innerHTML=`<div class="modal-head"><div><p class="eyebrow">LIVE GAME CENTER</p><h2 id="v22LiveTitle">${title}</h2></div><button id="v22LiveClose" class="icon-btn">×</button></div><div class="live-score v22-live-score"><div><small>${us}</small><strong id="v22UsScore">0</strong></div><div class="live-clock"><b id="v22Quarter">1ST</b><strong id="v22Clock">8:00</strong><small id="v22Possession">Tipoff</small></div><div><small>${them}</small><strong id="v22ThemScore">0</strong></div></div><div class="live-controls"><button id="v22Pause" class="secondary">Pause</button><button id="v22Speed" class="secondary">1×</button><button id="v22ToFourth" class="secondary">Sim to 4th</button><button id="v22Finish" class="primary">Finish Game</button></div><div class="live-coaching"><label>Pace<select id="v22LivePace"><option>Slow</option><option selected>Balanced</option><option>Fast</option></select></label><label>Defense<select id="v22LiveDefense"><option>Man</option><option>2-3 Zone</option><option>Full Court Press</option></select></label></div><div id="v22RunBar" class="run-bar"><span></span></div><div id="v22LiveFeed" class="live-feed"></div>`;
  try{dlg.showModal()}catch{}let paused=false,speed=1,finish=false,step=0,usScore=0,themScore=0;const total=64,feed=$22('v22LiveFeed');let completed=false;const complete=()=>{if(completed)return;completed=true;$22('v22UsScore').textContent=finalUs;$22('v22ThemScore').textContent=finalThem;$22('v22Quarter').textContent='FINAL';$22('v22Clock').textContent='0:00';feed?.insertAdjacentHTML('afterbegin',`<div class="news-item"><b>FINAL</b> ${us} ${finalUs}, ${them} ${finalThem}</div>`);onFinish?.()};
  $22('v22LiveClose').onclick=()=>{finish=true;complete();dlg.close()};$22('v22Pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'Resume':'Pause'};$22('v22Speed').onclick=e=>{speed=speed===1?4:speed===4?8:1;e.currentTarget.textContent=`${speed}×`};$22('v22ToFourth').onclick=()=>{step=Math.max(step,48);speed=8};$22('v22Finish').onclick=()=>{finish=true};
  const loop=async()=>{while(step<total&&!finish){if(paused){await new Promise(r=>setTimeout(r,120));continue}await new Promise(r=>setTimeout(r,Math.max(35,360/speed)));step++;const q=Math.min(4,Math.floor((step-1)/16)+1),pos=(step-1)%16,secs=Math.max(0,480-pos*30),m=Math.floor(secs/60),s=String(secs%60).padStart(2,'0');$22('v22Quarter').textContent=['1ST','2ND','3RD','4TH'][q-1];$22('v22Clock').textContent=`${m}:${s}`;const targetUs=Math.round(finalUs*step/total),targetThem=Math.round(finalThem*step/total),beforeUs=usScore,beforeThem=themScore;usScore=targetUs;themScore=targetThem;$22('v22UsScore').textContent=usScore;$22('v22ThemScore').textContent=themScore;const ourEvent=usScore-beforeUs>=themScore-beforeThem;const roster=ourEvent?(myTeam()?.roster||[]):[];const p=roster.length?roster[rand22(0,roster.length-1)]:null;const text=ourEvent?`${p?.name||us} ${Math.random()<.35?'hits a three':Math.random()<.6?'scores at the rim':'knocks down a jumper'}.`:`${them} ${Math.random()<.5?'scores in transition':'answers with a basket'}.`;$22('v22Possession').textContent=ourEvent?`${us} ball`:`${them} ball`;feed?.insertAdjacentHTML('afterbegin',`<div class="news-item"><b>${$22('v22Quarter').textContent} ${m}:${s}</b> ${text}</div>`);const pct=clamp22(50+(usScore-themScore)*2,5,95);$22('v22RunBar').firstElementChild.style.width=`${pct}%`;}complete()};loop();
}
function watchMissouriLive(g){if(!g||g.played)return;const oldDialog=$22('gameDialog');const title=`${myTeam().name} vs ${opponent(g)?.name||'Opponent'}`;simulateGame(g);try{oldDialog?.close()}catch{}if(!g.played)return;runLivePresentation({title,us:myTeam().name,them:opponent(g)?.name||'Opponent',finalUs:g.myScore||0,finalThem:g.oppScore||0,onFinish:()=>{ensureV22(current);syncStateBonus();persist();renderAll()}})}
function installLiveCapture(){document.addEventListener('click',e=>{const b=e.target.closest?.('#v2WatchLiveBtn');if(!b)return;e.preventDefault();e.stopImmediatePropagation();const g=nextUnplayed?.();if(g)watchMissouriLive(g)},true)}
function installCollegeFix(){document.addEventListener('click',e=>{const b=e.target.closest?.('[data-v2-college-pick]');if(!b)return;setTimeout(()=>{const req=$22('v2RequestCollege'),hidden=$22('v2CollegeSelected');if(req&&hidden?.value)req.disabled=false},0)},true)}
function installMobilePolish(){document.body.classList.add('bm27-v22-mobile');}
function updateWhatsNew(){document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>{setTimeout(()=>{const box=$22('updatesContent');if(!box||box.querySelector('[data-v22-notes]'))return;box.insertAdjacentHTML('afterbegin',`<article class="card" data-v22-notes><p class="eyebrow">BM27 v2.2.0</p><h3>Live Games, Difficulty & Nationals Update</h3><ul class="update-list"><li><b>v2.2.6:</b> Completed tournaments now leave the active Tournaments page at season rollover and are accessible only inside that season in History.</li><li><b>v2.2.4:</b> Fixed national opponents so March Madness schedule games always resolve correctly through the core game engine; older national schedule entries self-repair their opponent IDs.</li><li><b>v2.2.3:</b> Varsity March Madness games now appear on your real schedule, can be played/simulated from the schedule, and the rest of the national bracket auto-simulates/advances.</li><li>Rebuilt live game presentation with quarter clock, live score, possession feed, pace/defense controls, pause, speed, Sim to 4th and Finish Game.</li><li>Difficulty now more strongly affects game strength, starting budgets, staff costs, recruiting/meeting pressure and injury risk.</li><li>State championship rewards: Freshman $15,000; Varsity $50,000; All-State $100,000.</li><li>Major mobile UI redesign with better bottom navigation, responsive cards, full-screen dialogs and touch targets.</li><li>Fixed college meeting selection so selecting a college actually enables the meeting request.</li><li>Preseason opens November 1; regular-season games are normalized to November 24 or later.</li><li>Rare classification expansion/contraction remains active, including possible Class 7 creation or removal of the current highest class.</li><li>Rare eighth-grade high-school tryouts remain active and visible in Middle School scouting.</li><li>Expanded injury presentation with injury types, severity and return dates.</li><li>Added 100-school National Rankings. Top 68 after Missouri State are selected for Varsity March Madness.</li><li>Added a 68-team national bracket with First Four, Round of 64, Round of 32, Sweet 16, Elite Eight, Final Four and Championship.</li><li>Missouri Rankings now paginate 50 schools per page from No. 1 through the entire synced state directory.</li></ul></article>`);if(current){ensureV22(current);current.v2.seenUpdate='2.2.0';persist()}},0)},{capture:true}))}

function patchDifficultyUI(){
  if(!current)return;const p=profile();const box=$22('v2Finance');if(box){box.querySelectorAll('.metric').forEach(m=>{const label=m.querySelector('span')?.textContent||'';if(label.includes('State Title Bonus')){const b=m.querySelector('b');if(b)b.textContent='$'+p.stateBonus.toLocaleString()}});let note=box.querySelector('[data-v22-difficulty]');if(!note){note=document.createElement('div');note.dataset.v22Difficulty='1';note.className='card';note.style.marginTop='12px';box.appendChild(note)}note.innerHTML=`<b>${current.difficulty} Difficulty</b><p class="muted small">Starting budget $${p.cash.toLocaleString()} • State title $${p.stateBonus.toLocaleString()} • ${current.difficulty==='Freshman'?'friendlier games and negotiations':current.difficulty==='Varsity'?'stronger opponents and tighter finances':'elite opponents, toughest negotiations and highest injury pressure'}.</p>`}
}

function installHooks(){
  installNationalsPage();installLiveCapture();installCollegeFix();installMobilePolish();updateWhatsNew();
  const baseOpponent=opponent;opponent=function(g){const normal=baseOpponent(g);if(normal)return normal;if(current&&g?.nationalOpponentId)return nationalTeam(current,g.nationalOpponentId)||null;return null};
  const baseNew=newCareer;newCareer=function(...args){const s=baseNew(...args);s.v22=s.v22||{};s.v22.lastStateTitles=Number(s.history?.titles)||0;ensureV22(s);syncDifficultyMoney(s,true);s.day=seasonStart(s).toISOString();normalizeCalendar(s);return s};
  const baseOpen=openSave;openSave=function(id){baseOpen(id);if(current){ensureV22(current);enrichInjuries();syncNationalSchedule(current);renderMissouriRankings();renderNationalsPage()}};
  const baseSim=simulateGame;simulateGame=function(g){if(!current||!g)return;ensureV22(current);if(g.nationalMatchId)return simulateNationalScheduleGame(g);const opp=opponent(g),p=profile();const originalOpp=opp?.rating;if(opp)opp.rating=Math.max(35,(opp.rating||70)+p.oppBoost);try{return baseSim(g)}finally{if(opp&&originalOpp!=null)opp.rating=originalOpp;advanceNationalWorld(current);enrichInjuries();syncStateBonus();if(stateComplete(current)&&!current.v22.nationals)createNationals(current);syncNationalSchedule(current);persist()}};
  const baseRender=renderAll;renderAll=function(){if(current){ensureV22(current);enrichInjuries();normalizeCalendar(current);syncNationalSchedule(current)}const r=baseRender();if(current){renderMissouriRankings();showInjuryStrip();patchDifficultyUI();if($22('v22NationalsPage')?.classList.contains('active'))renderNationalsPage();syncStateBonus()}return r};
  renderRankings=renderMissouriRankings;getRank=function(team){return current.teams.filter(t=>!t.nationalOnly&&!t.outOfState).slice().sort((a,b)=>power(b)-power(a)).findIndex(t=>eq22(t.id,team.id))+1};
  const baseOff=applyOffseason;applyOffseason=function(){const r=baseOff();if(current){ensureV22(current);current.v22.nationalSeason=Number(current.season);current.v22.nationalPool=null;current.v22.nationals=null;current.v22.nationalDirectoryReady=false;current.v22.nationalDirectoryLoadedStates=0;ensureNationalPool(current);current.day=`${current.season}-05-30T12:00:00`;persist();renderAll()}return r};
  if(current){ensureV22(current);enrichInjuries();renderMissouriRankings()}
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',installHooks):installHooks();
window.BM27ResolveNationalTeam=function(id){if(!current||id==null)return null;ensureV22(current);return current.teams?.find(t=>eq22(t.id,id))||ensureNationalOpponentProxy(current,id)||nationalTeam(current,id)||null};
window.BM27SimulateNationalScheduleGame=function(g){return simulateNationalScheduleGame(g)};
window.BM27WatchLiveGame=function(g){return watchMissouriLive(g)};
window.BM27RunLivePresentation=runLivePresentation;
window.BM27V22={version:VERSION,ensure:ensureV22,nationalRankings,fullNationalRankings,nationalUserRank,createNationals,driveNationalRound,userNationalMatch,syncNationalSchedule,renderNationalsPage,hydrateRealNationalPool};
})();
