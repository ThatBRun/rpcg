/* BM27 v2.2.10 — Live All Games Hotfix
   Adds Play / Watch Live controls for regular-season, district and state games.
*/
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
function eligible(g){
  if(!g||g.played||g.tbd||!g.opponentId)return false;
  const type=String(g.type||'Regular Season');
  return type==='Regular Season'||type==='District Tournament'||type==='State Tournament'||type==='Conference'||type==='Showcase'||/Tournament$/i.test(type);
}
function play(g){if(!eligible(g))return;simulateGame(g)}
function watch(g){
  if(!eligible(g))return;
  if(typeof window.BM27WatchLiveGame==='function')window.BM27WatchLiveGame(g);
  else simulateGame(g);
}
function actionBlock(g,compact=false){
  const wrap=document.createElement('div');
  wrap.className='schedule-actions bm27-live-game-actions';
  wrap.style.marginLeft='auto';
  wrap.style.gap='6px';
  const playBtn=document.createElement('button');playBtn.type='button';playBtn.className=`primary${compact?' small-btn':''}`;playBtn.textContent='Play';
  const liveBtn=document.createElement('button');liveBtn.type='button';liveBtn.className=`secondary${compact?' small-btn':''}`;liveBtn.textContent='Watch Live';
  playBtn.onclick=e=>{e.preventDefault();e.stopPropagation();play(g)};
  liveBtn.onclick=e=>{e.preventDefault();e.stopPropagation();watch(g)};
  wrap.append(playBtn,liveBtn);return wrap;
}
function enhanceSchedule(){
  if(typeof current==='undefined'||!current||!$('scheduleList'))return;
  const rows=[...$('scheduleList').querySelectorAll('.schedule-row')];
  rows.forEach((row,i)=>{
    const g=current.schedule?.[i];if(!eligible(g)||row.querySelector('.bm27-live-game-actions'))return;
    // Keep preseason Remove controls intact; once a matchup is ready, Play/Watch Live sit beside them.
    row.appendChild(actionBlock(g,true));
  });
}
function enhanceTournamentCenter(){
  if(typeof current==='undefined'||!current)return;
  const list=$('tournamentHubList');if(!list)return;
  const cards=[...list.querySelectorAll('.tournament-card')];
  cards.forEach((card,i)=>{
    const t=current.tournaments?.[i];if(!t||card.querySelector('.bm27-postseason-live-actions'))return;
    const type=String(t.type||t.kind||'');
    if(type!=='District Tournament'&&type!=='State Tournament')return;
    const g=current.schedule?.find(x=>!x.played&&eq(x.tournamentId,t.id)&&eligible(x));
    if(!g)return;
    const wrap=actionBlock(g,false);wrap.classList.add('bm27-postseason-live-actions');
    const head=card.querySelector('.section-head');
    if(head)head.appendChild(wrap);else card.prepend(wrap);
  });
}
function enhanceNextGame(){
  const g=typeof nextUnplayed==='function'?nextUnplayed():null,next=$('nextGame');
  if(!next||!eligible(g))return;
  // v2 already adds a live button here. Make sure its wording and handler use the newer v2.2 center.
  let live=$('v2WatchLiveBtn');
  if(live){live.textContent='Watch Live';live.onclick=e=>{e.preventDefault();watch(g)}}
}
function enhance(){enhanceSchedule();enhanceTournamentCenter();enhanceNextGame()}
function install(){
  // Run after every major render without replacing game/season logic.
  if(typeof renderAll==='function'){const baseRender=renderAll;renderAll=function(){const r=baseRender.apply(this,arguments);enhance();return r}}
  if(typeof renderSchedule==='function'){const baseSchedule=renderSchedule;renderSchedule=function(){const r=baseSchedule.apply(this,arguments);enhanceSchedule();return r}}
  if(typeof renderTournamentCenter==='function'){const baseTournament=renderTournamentCenter;renderTournamentCenter=function(){const r=baseTournament.apply(this,arguments);enhanceTournamentCenter();return r}}
  // Catch DOM refreshes from bracket advancement and cloud-save reloads.
  document.addEventListener('click',()=>setTimeout(enhance,0),true);
  enhance();
  document.querySelectorAll('[data-open-updates]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{
    const box=$('updatesContent');if(!box||box.querySelector('[data-v2210-notes]'))return;
    box.insertAdjacentHTML('afterbegin','<article class="card" data-v2210-notes><p class="eyebrow">BM27 v2.2.10</p><h3>Live All Games Hotfix</h3><ul class="update-list"><li>Regular-season games now have Play and Watch Live controls directly on the schedule.</li><li>Your active District Tournament game now has Play and Watch Live controls in the postseason bracket and schedule.</li><li>Your active State Tournament game now has Play and Watch Live controls in the postseason bracket and schedule.</li><li>District and State live games still use the authoritative season engine, so bracket advancement, records, titles, history and the next matchup continue normally.</li><li>March Madness Live Game Center behavior is preserved.</li></ul></article>');
  },0),{capture:true}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
window.BM27LiveAllGames={enhance,watch};
})();
