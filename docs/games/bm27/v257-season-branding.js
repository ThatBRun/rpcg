(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function logo(t,cls='seasonLogo'){if(!t)return'';return window.BM27Branding255?.html?.(t.name,cls)||window.BM27Logos252?.html?.(t.name,cls)||''}
function team(){try{return current?.teams?.find(t=>String(t.id)===String(current.schoolId))}catch{return null}}
function theme(){let t=team(),g=document.getElementById('game');if(!t||!g)return;g.classList.add('season257');g.style.setProperty('--school-primary',t.primary||'#1d4ed8');g.style.setProperty('--school-secondary',t.secondary||'#fff');
let side=document.getElementById('sideSchool');if(side&&!side.parentElement?.querySelector('.side257Logo'))side.insertAdjacentHTML('beforebegin',logo(t,'side257Logo'));
let hero=document.getElementById('teamHero');if(hero&&!hero.querySelector('.hero257Logo'))hero.insertAdjacentHTML('afterbegin',logo(t,'hero257Logo'));
}
function schedule(){/* v2.6.2: schedule logos render directly in app.js */}
function next(){/* v2.6.2: next-five logos render directly in app.js */}
function generic(){document.querySelectorAll('#standingsTable tbody tr,#rankingsTable tbody tr').forEach(r=>{if(r.querySelector('.tiny257Logo'))return;let cell=r.querySelector('td');if(!cell)return;let name=cell.textContent.trim(),t=current?.teams?.find(x=>name.includes(x.name));if(t)cell.insertAdjacentHTML('afterbegin',logo(t,'tiny257Logo'))})}
function apply(){if(typeof current==='undefined'||!current)return;theme();schedule();next();generic();window.BM27Branding255?.refresh?.()}
let queued=false;function q(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
document.addEventListener('click',q);new MutationObserver(()=>{if(document.getElementById('pn2713'))return;q()}).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('bm27-branding-cloud-loaded',q);setTimeout(q,400);window.BM27Season257={apply:q};
})();