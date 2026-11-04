/* BM27 v2.7.52: interstate / international tournament entrants, career-safe */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const getSave=()=>typeof current==='undefined'?null:current;
const clean=s=>String(s||'').trim();
const safe=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=s=>{try{toast(s)}catch{alert(s)}};
function ensureTeamRegistry(s){if(!s)return; s.teams=s.teams||[];s.v2752=s.v2752||{version:'2.7.52',internationalIds:[]};for(const t of s.teams){if(t?.international){t.outOfState=true;t.class='International';t.district=t.country||'International';t.conference=t.conference||'International';t.roster=t.roster||[];}}
}
function countTarget(){const sz=$('tournamentSize')?.value;return sz==='custom-count'?Math.max(2,Math.floor(Number($('v2742CustomCount')?.value)||8)):Math.max(2,Number(sz)||4)}
function ensureRoom(){const target=countTarget()-1;return typeof tournamentDraftSelection!=='undefined'&&tournamentDraftSelection.size<target}
function addSelected(t){const s=getSave();if(!s||!t)return;ensureTeamRegistry(s);if(typeof tournamentDraftSelection==='undefined')return notice('Open the tournament builder first.');const id=String(t.id);if(tournamentDraftSelection.has(id))return notice('That team is already selected.');if(!ensureRoom())return notice(`This tournament has ${countTarget()-1} opponent slots. Remove a team or increase the bracket size.`);tournamentDraftSelection.add(id);try{renderTournamentPicker();updateTournamentSelection();renderTournamentSelectedList()}catch(e){console.warn('Tournament picker refresh failed',e)}try{persist()}catch{}notice(`${t.name} added to this tournament.`)}
function makeInternational(name,city,country){const s=getSave();if(!s)throw Error('Open a career first.');ensureTeamRegistry(s);const norm=x=>clean(x).toLowerCase().replace(/\s+/g,' ');const key=[norm(name),norm(city),norm(country)].join('|');let existing=s.teams.find(t=>t.international&&[norm(t.name),norm(t.city),norm(t.country)].join('|')===key);if(existing)return existing;
 const id='bm27-intl-'+key.split('').reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(36);existing=s.teams.find(t=>String(t.id)===id);if(existing)return existing;
 const base={id,name,city,country,state:country,mascot:'',class:'International',district:country,conference:'International',international:true,outOfState:true,nationalOnly:false,primary:'#0f766e',secondary:'#ffffff',rating:68,wins:0,losses:0,pf:0,pa:0};base.roster=Array.from({length:13},(_,i)=>{try{if(typeof makePlayer==='function')return makePlayer(base,i,s.season||2026)}catch{}return{id:`${id}-p${i}`,name:`International Player ${i+1}`,pos:['PG','SG','SF','PF','C'][i%5],grade:9+i%4,overall:68,minutes:i<5?26:9}});
 try{if(typeof teamRating==='function')base.rating=teamRating(base.roster)||68}catch{}s.teams.push(base);s.v2752.internationalIds.push(id);try{persist()}catch{}return base;
}
function install(){if(!getSave()||!$('tournamentDialog'))return;ensureTeamRegistry(getSave());const form=$('tournamentForm');if(!form||$('v2752InternationalPanel'))return;
 const panel=document.createElement('section');panel.id='v2752InternationalPanel';panel.className='card';panel.style.cssText='margin:12px 0;padding:12px';panel.innerHTML=`<h3>International & Out-of-State Tournament Teams</h3><p class="muted small">Use the existing Out of State Team Search below to add a school from another U.S. state. Add international schools here to the same tournament bracket. Schools are stored in this career and work in existing saves.</p><div class="assignment-controls" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:8px"><label>School name<input id="v2752Name" maxlength="100" placeholder="School name"></label><label>City<input id="v2752City" maxlength="80" placeholder="City"></label><label>Country<input id="v2752Country" maxlength="80" placeholder="Country"></label></div><button type="button" id="v2752AddInternational" class="secondary wide">Add International Team to Tournament</button><p id="v2752Message" class="muted small"></p>`;
 const picker=$('tournamentSchoolPicker');picker?.insertAdjacentElement('afterend',panel);
 $('v2752AddInternational').onclick=()=>{const name=clean($('v2752Name').value),city=clean($('v2752City').value),country=clean($('v2752Country').value);if(!name||!country)return $('v2752Message').textContent='Enter a school name and country.';if(!ensureRoom())return $('v2752Message').textContent='Your bracket is full. Remove an opponent or increase its size.';try{const t=makeInternational(name,city,country);addSelected(t);$('v2752Message').textContent=`${t.name} (${country}) saved to this career.`;}catch(e){$('v2752Message').textContent=e.message||String(e)}};
 // Existing state-directory search is installed in an earlier script. Keep it visible and working.
 const native=$('v227TournamentBox');if(native)native.style.display='';
}
function afterOpen(){setTimeout(install,0)}
function init(){if(window.__BM27_V2752__)return;window.__BM27_V2752__=true;
 document.addEventListener('click',e=>{if(e.target.closest?.('#addTournamentBtn'))afterOpen()},true);
 const dlg=$('tournamentDialog');if(dlg){new MutationObserver(()=>{if(dlg.open)install()}).observe(dlg,{attributes:true,attributeFilter:['open']});}
 if(typeof openTournamentDialog==='function'){const base=openTournamentDialog;openTournamentDialog=function(...args){const r=base.apply(this,args);afterOpen();return r}}
 if(typeof openSave==='function'){const old=openSave;openSave=function(...args){const r=old.apply(this,args);ensureTeamRegistry(getSave());return r}}
 window.BM27InternationalTournaments={version:'2.7.52',makeInternational,addSelected,install};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
