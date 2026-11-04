/* BM27 v2.4.7 — Dynasty: Road to Commitment */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const clamp=(n,a=25,b=99)=>Math.max(a,Math.min(b,Math.round(n)));
const attrs=['Finishing','Mid-Range','Three-Point','Free Throw','Ball Handle','Passing','Perimeter Defense','Interior Defense','Rebounding','Speed','Strength','Vertical','Stamina','Basketball IQ'];
const POS={PG:['Ball Handle','Passing','Speed','Three-Point'],SG:['Three-Point','Finishing','Perimeter Defense','Speed'],SF:['Finishing','Three-Point','Perimeter Defense','Rebounding'],PF:['Rebounding','Interior Defense','Strength','Finishing'],C:['Interior Defense','Rebounding','Strength','Finishing']};
function fresh(){
 let a={};attrs.forEach(x=>a[x]=55);
 return {v:2470,name:'Prospect',position:'PG',grade:9,phase:'tryouts',day:1,team:null,role:'Unassigned',coachTrust:35,workEthic:55,confidence:55,academics:75,recruiting:0,stars:0,offers:[],committed:null,trainingPoints:0,seasonGames:0,wins:0,losses:0,postseason:'Regular Season',districtWins:0,stateWins:0,nationalWins:0,career:{pts:0,reb:0,ast:0,stl:0,blk:0},attrs:a,tryoutScore:0,log:['Your high-school basketball journey begins. Earn your spot.']};
}
function overall(p){let core=POS[p.position]||POS.PG;return clamp(core.reduce((s,k)=>s+p.attrs[k],0)/core.length*.72+attrs.reduce((s,k)=>s+p.attrs[k],0)/attrs.length*.28,25,99)}
function potential(p){return clamp(overall(p)+(p.workEthic-50)*.18+(p.grade===9?10:p.grade===10?7:p.grade===11?4:2),40,99)}
function load(){try{return JSON.parse(localStorage.getItem('bm27_dynasty_player'))||fresh()}catch{return fresh()}}
let P=load();
function save(){localStorage.setItem('bm27_dynasty_player',JSON.stringify(P));try{if(typeof current!=='undefined'&&current){current.dynastyPlayer=P;persist?.()}}catch{}}
function outcome(type){
 const maps={
  hustle:{txt:'Dive for the loose ball and sprint back.',gain:{'Perimeter Defense':2,Stamina:1},score:7,trust:6},
  extra:{txt:'Make the extra pass instead of forcing a shot.',gain:{Passing:2,'Basketball IQ':2},score:8,trust:7},
  attack:{txt:'Attack the rim aggressively.',gain:{Finishing:2,Vertical:1},score:6,trust:3},
  shoot:{txt:'Take the open three with confidence.',gain:{'Three-Point':2},score:5,trust:2},
  listen:{txt:'Apply the coach’s correction on the very next rep.',gain:{'Basketball IQ':2},score:9,trust:8}
 };
 let o=maps[type];Object.entries(o.gain).forEach(([k,v])=>P.attrs[k]=clamp(P.attrs[k]+v));P.tryoutScore+=o.score+Math.floor(overall(P)/18);P.coachTrust=clamp(P.coachTrust+o.trust,0,99);P.day++;P.log.unshift('Tryout Day '+(P.day-1)+': '+o.txt);
 if(P.day>3){let s=P.tryoutScore+P.coachTrust*.35+overall(P)*.3;if(s>=72){P.team='Varsity';P.role='Bench';}else if(s>=58){P.team='Junior Varsity';P.role='Rotation';}else if(s>=45){P.team='Freshman';P.role='Rotation';}else{P.team='Freshman';P.role='Practice/Development';}P.phase='season';P.log.unshift('ROSTER DECISION: '+P.team+' — '+P.role+'. Your choices and ratings determined the result.')}
 save();render();
}
function train(k){if(P.phase!=='season')return;let choices={shoot:['Three-Point','Mid-Range','Free Throw'],handle:['Ball Handle','Passing','Basketball IQ'],finish:['Finishing','Vertical','Strength'],defense:['Perimeter Defense','Interior Defense','Rebounding'],physical:['Speed','Strength','Vertical','Stamina']};(choices[k]||[]).forEach(x=>P.attrs[x]=clamp(P.attrs[x]+(P.workEthic>=70?2:1)));P.workEthic=clamp(P.workEthic+1,0,99);P.trainingPoints++;P.log.unshift('Training: '+k+' session completed.');save();render()}
function game(choice){
 let skill=overall(P),good=Math.random()*100<skill+(P.coachTrust-50)*.2;let pts=good?(choice==='score'?12+Math.floor(Math.random()*15):7+Math.floor(Math.random()*12)):3+Math.floor(Math.random()*8);let reb=Math.floor(Math.random()*8)+(P.position==='C'||P.position==='PF'?3:0),ast=Math.floor(Math.random()*7)+(choice==='create'?4:0);P.career.pts+=pts;P.career.reb+=reb;P.career.ast+=ast;P.seasonGames++;if(good)P.wins++;else P.losses++;P.coachTrust=clamp(P.coachTrust+(good?3:-1),0,99);P.recruiting=clamp(P.recruiting+(good?5:1)+(overall(P)>=75?3:0),0,100);
 if(P.recruiting>=25&&P.offers.length<1)P.offers.push('Local College Interest');if(P.recruiting>=50&&P.offers.length<2)P.offers.push('Regional College Offer');if(P.recruiting>=75&&P.offers.length<3)P.offers.push('Division I Offer');
 if(P.recruiting>=90&&!P.offers.includes('National Power Offer'))P.offers.push('National Power Offer');
 P.log.unshift(`Game ${P.seasonGames}: ${pts} PTS, ${reb} REB, ${ast} AST — ${good?'stock up':'learning experience'}.`);save();render()
}
function postseason(){
 if(P.phase!=='season')return;
 const o=overall(P),roll=()=>Math.random()*100<o+P.coachTrust*.12;
 const stages=[['District Tournament','districtWins'],['State Tournament','stateWins'],['March Madness','nationalWins']];
 let result='';for(const [name,key] of stages){P.postseason=name;if(roll()){P[key]++;P.recruiting=clamp(P.recruiting+10,0,100);result+=' Won '+name+';';}else{result+=' Eliminated in '+name+'.';break}}
 P.log.unshift('POSTSEASON:'+result);save();render()
}
function advanceYear(){if(P.grade>=12){P.phase=P.committed?'graduated':'decision';P.log.unshift(P.committed?'Graduated as a '+overall(P)+' OVR prospect, committed to '+P.committed+'.':'Senior season complete. Choose your commitment.');save();render();return}P.grade++;P.phase='tryouts';P.day=1;P.tryoutScore=0;P.team=null;P.role='Unassigned';P.attrs.Stamina=clamp(P.attrs.Stamina+2);P.attrs.Strength=clamp(P.attrs.Strength+2);P.log.unshift('New school year: Grade '+P.grade+'. You must earn your role again.');save();render()}
function commit(x){if(P.grade<12)return;P.committed=x;P.phase='graduated';P.log.unshift('COMMITTED: '+x+'!');save();render()}
function mount(){
 if(document.getElementById('bm27DynastyCareer'))return;
 let root=document.createElement('section');root.id='bm27DynastyCareer';root.className='dyn247 hidden';document.body.appendChild(root);
 document.addEventListener('click',e=>{let b=e.target.closest?.('[data-rd-mode="dynasty"],[data-mode="dynasty"]');if(b)setTimeout(()=>{root.classList.remove('hidden');render()},150)},true);
 window.BM27Dynasty247={open:()=>{root.classList.remove('hidden');render()},player:()=>P};
}
function render(){
 let r=document.getElementById('bm27DynastyCareer');if(!r)return;let o=overall(P),pot=potential(P);
 let actions=P.phase==='tryouts'?`<div class="dactions"><button data-d="hustle">Hustle + Defend</button><button data-d="extra">Make Extra Pass</button><button data-d="attack">Attack Rim</button><button data-d="shoot">Take Open 3</button><button data-d="listen">Apply Coach Feedback</button></div>`:
 P.phase==='season'?`<div class="dactions"><button data-t="shoot">Shooting Workout</button><button data-t="handle">Guard Skills</button><button data-t="finish">Finishing</button><button data-t="defense">Defense</button><button data-t="physical">Athletic Training</button><button data-g="score">Play Game: Score</button><button data-g="create">Play Game: Create</button><button data-post>Play Postseason</button>${P.grade===12&&P.offers.length?P.offers.map(x=>`<button data-c="${x}">Commit: ${x}</button>`).join(''):''}<button data-year>Finish Season</button></div>`:
 P.phase==='decision'?`<div class="dactions">${P.offers.map(x=>`<button data-c="${x}">Commit: ${x}</button>`).join('')}</div>`:`<div class="dgrad">CAREER COMPLETE • ${o} OVR • ${P.committed||'Uncommitted'}</div>`;
 r.innerHTML=`<button class="dclose">← Back</button><div class="dhero"><div><small>DYNASTY • ROAD TO COMMITMENT</small><h1>${P.name} <span>${o} OVR</span></h1><p>Grade ${P.grade} • ${P.position} • ${P.team||'Tryouts'} • ${P.role}</p></div><div><b>${P.stars}★</b><small> Potential ${pot}</small></div></div>
 <div class="dmeters"><label>Coach Trust <progress max="99" value="${P.coachTrust}"></progress>${P.coachTrust}</label><label>Recruiting <progress max="100" value="${P.recruiting}"></progress>${P.recruiting}%</label><label>Work Ethic <progress max="99" value="${P.workEthic}"></progress>${P.workEthic}</label></div>
 <h2>${P.phase==='tryouts'?'TRYOUT DAY '+P.day:P.phase==='season'?'SEASON HUB':P.phase==='decision'?'COMMITMENT DAY':'GRADUATION'}</h2>${actions}
 <div class="dgrid">${attrs.map(x=>`<div><b>${P.attrs[x]}</b><span>${x}</span></div>`).join('')}</div>
 <div class="dstats"><b>Career:</b> ${P.career.pts} PTS • ${P.career.reb} REB • ${P.career.ast} AST • ${P.seasonGames} games • ${P.wins||0}-${P.losses||0} • ${P.postseason||'Regular Season'}</div><div class="dlog">${P.log.slice(0,7).map(x=>`<p>${x}</p>`).join('')}</div>`;
 r.querySelector('.dclose').onclick=()=>{r.classList.add('hidden');document.body.classList.remove('rd-in-game');document.getElementById('sportsShell')?.classList.remove('hidden');document.getElementById('rdModePortal')?.classList.add('hidden');};r.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>outcome(b.dataset.d));r.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>train(b.dataset.t));r.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>game(b.dataset.g));r.querySelector('[data-post]')?.addEventListener('click',postseason);r.querySelector('[data-year]')?.addEventListener('click',advanceYear);r.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>commit(b.dataset.c));
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount):mount();
})();