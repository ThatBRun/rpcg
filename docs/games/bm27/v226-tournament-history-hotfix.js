(()=>{
'use strict';
const VERSION='2.2.6';
const eq=(a,b)=>String(a)===String(b);

function archivedTournamentIds(save, season=null){
  const archives=save?.v2?.seasonArchive||[];
  const snap=season==null?archives.at(-1):[...archives].reverse().find(s=>Number(s.season)===Number(season));
  return new Set((snap?.tournaments||[]).map(t=>String(t.id)).filter(Boolean));
}

function removeArchivedFromActive(save, season=null){
  if(!save||!Array.isArray(save.tournaments))return 0;
  const ids=archivedTournamentIds(save,season);
  if(!ids.size)return 0; // Never remove a tournament unless History owns a copy first.
  const before=save.tournaments.length;
  save.tournaments=save.tournaments.filter(t=>!ids.has(String(t.id)));
  return before-save.tournaments.length;
}

function repairLingeringArchivedTournaments(save){
  if(!save?.v2?.seasonArchive?.length||!Array.isArray(save.tournaments))return 0;
  // Only repair tournaments proven to exist in a prior season archive.
  const priorIds=new Set();
  for(const s of save.v2.seasonArchive){
    if(Number(s.season)>=Number(save.season))continue;
    for(const t of s.tournaments||[])if(t?.id!=null)priorIds.add(String(t.id));
  }
  if(!priorIds.size)return 0;
  const before=save.tournaments.length;
  save.tournaments=save.tournaments.filter(t=>!priorIds.has(String(t.id)));
  return before-save.tournaments.length;
}

function install(){
  if(window.__BM27_V226_INSTALLED__)return;
  window.__BM27_V226_INSTALLED__=true;

  // Repair careers updated from older builds where archived tournaments still appear as active.
  if(typeof openSave==='function'){
    const baseOpen=openSave;
    openSave=function(...args){
      const r=baseOpen(...args);
      if(current){
        const removed=repairLingeringArchivedTournaments(current);
        if(removed){
          persist?.();
          renderTournaments?.();
          window.BM27SeasonEngine?.renderPostseason?.();
        }
      }
      return r;
    };
  }

  // Archive first (the existing v2 offseason flow does this), then remove exactly those archived tournaments.
  if(typeof applyOffseason==='function'){
    const baseOffseason=applyOffseason;
    applyOffseason=function(...args){
      if(!current)return baseOffseason(...args);
      const completedSeason=Number(current.season);
      const beforeSeason=Number(current.season);
      const result=baseOffseason(...args);
      // If offseason was rejected (unfinished games), the season number does not advance; do nothing.
      if(!current||Number(current.season)===beforeSeason)return result;
      const removed=removeArchivedFromActive(current,completedSeason);
      // Also clean any older archived IDs that predate this hotfix.
      const repaired=repairLingeringArchivedTournaments(current);
      current.v226=current.v226||{};
      current.v226.tournamentArchiveVersion=VERSION;
      current.v226.lastArchivedTournamentSeason=completedSeason;
      persist?.();
      renderTournaments?.();
      renderHistory?.();
      window.BM27SeasonEngine?.renderPostseason?.();
      if(removed||repaired)toast?.(`${removed+repaired} completed tournament${removed+repaired===1?'':'s'} moved to History.`);
      return result;
    };
  }

  // Keep the active Tournaments screen strictly current-season by filtering anything already archived.
  if(typeof renderTournaments==='function'){
    const baseRender=renderTournaments;
    renderTournaments=function(...args){
      if(current)repairLingeringArchivedTournaments(current);
      return baseRender(...args);
    };
  }

  if(current){
    const removed=repairLingeringArchivedTournaments(current);
    if(removed){persist?.();renderTournaments?.();}
  }
}

document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
window.BM27TournamentHistoryHotfix={version:VERSION,repair:repairLingeringArchivedTournaments};
})();
