/* BM27 v2.4.4 — PLAY SAVE FIX
   Final safety layer: a save that exists can always be entered, even if an older migration wrapper fails. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const eq=(a,b)=>String(a)===String(b);
function findSave(id){return (typeof saves!=='undefined'&&Array.isArray(saves))?saves.find(s=>eq(s?.id,id)):null}
function showGame(save){
  if(!save)return false;
  current=save;
  current.tournaments=current.tournaments||[];
  $('sportsShell')?.classList.add('hidden');
  $('rdModePortal')?.classList.add('hidden');
  $('launcher')?.classList.add('hidden');
  $('game')?.classList.remove('hidden');
  document.body.classList.add('rd-in-game');
  document.body.dataset.rdMode=['season','dynasty','myschool'].includes(save.gameMode)?save.gameMode:'season';
  try{renderAll()}catch(e){console.error('BM27 render recovery',e)}
  return true;
}
const wrappedOpen=(typeof openSave==='function')?openSave:null;
function safeOpen(id){
  const save=findSave(id);
  if(!save){window.cloudGame?.refreshSaves?.().then(()=>{const s=findSave(id);if(s)showGame(s)}).catch(()=>{});return false}
  try{
    if(wrappedOpen)wrappedOpen(id);
  }catch(e){
    console.error('Older open-save layer failed; using direct recovery.',e);
  }
  // Some older wrappers can silently fail without throwing.
  if(typeof current==='undefined'||!current||!eq(current.id,id)||$('game')?.classList.contains('hidden'))showGame(save);
  else{
    $('sportsShell')?.classList.add('hidden');$('rdModePortal')?.classList.add('hidden');
    $('launcher')?.classList.add('hidden');$('game')?.classList.remove('hidden');
    document.body.classList.add('rd-in-game');
  }
  return true;
}
function install(){
  window.BM27PlaySave=safeOpen;
  // Make every existing caller—including new-career creation—use the repaired opener.
  try{openSave=safeOpen}catch{}
  // Capture PLAY clicks before older slot handlers can interfere.
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-rd-load],[data-v241-load],[data-load]');
    if(!b)return;
    const id=b.dataset.rdLoad||b.dataset.v241Load||b.dataset.load;
    if(id==null)return;
    e.preventDefault();e.stopImmediatePropagation();
    safeOpen(id);
  },true);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install):install();
})();