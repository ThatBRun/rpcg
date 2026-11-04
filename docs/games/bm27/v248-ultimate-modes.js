/* BM27 v2.4.8 — Ultimate Modes / Presentation */
(()=>{'use strict';
const WIDE="";
const TRACK='assets/soundtrack/01-friday-night-lights.mp3';
function q(s){return document.querySelector(s)}
function loading(text='LOADING BM27…',cb){let x=document.createElement('div');x.className='bm248-load';x.innerHTML=`<img src="${WIDE}" alt=""><div class="bm248-loadbar"></div><b>${text}</b>`;document.body.appendChild(x);setTimeout(()=>x.classList.add('go'),30);setTimeout(()=>{x.remove();cb?.()},900+Math.random()*800)}
function cover(){
 let c=q('#rdCover,#realDealCover,.rd-cover,.cover-screen'); if(!c)return;
 if(WIDE){c.style.backgroundImage=`linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.48)),url("${WIDE}")`;c.style.backgroundSize='cover';c.style.backgroundPosition='center'}
 const start=()=>{let a=q('audio');if(a){let sources=[...q('audio')?.querySelectorAll('source')||[]];let f=sources.find(x=>/friday|01-/i.test(x.src));if(f)a.src=f.src;a.volume=.7;a.play().catch(()=>{})}};
 c.addEventListener('pointerdown',start,{once:true});c.addEventListener('keydown',start,{once:true});
}
function addModes(){
 let shell=q('#sportsShell');if(!shell||q('#bm248Modes'))return;
 let host=document.createElement('section');host.id='bm248Modes';host.className='bm248-modes';
 host.innerHTML=`<button data-248="playnow"><b>PLAY NOW</b><span>One game. Pick teams. Tip off.</span></button><button data-248="legacy"><b>LEGACY</b><span>Build your ultimate high-school roster.</span></button>`;
 shell.appendChild(host);
 host.onclick=e=>{let b=e.target.closest('[data-248]');if(!b)return;loading(b.dataset['248']==='playnow'?'SETTING THE COURT…':'OPENING LEGACY…',()=>openMode(b.dataset['248']))}
}
function schools(){try{return (typeof directory!=='undefined'&&Array.isArray(directory)?directory:[]).slice(0,250)}catch{return []}}
function openMode(mode){
 let old=q('#bm248Overlay');old?.remove();let d=document.createElement('section');d.id='bm248Overlay';d.className='bm248-overlay';
 if(mode==='playnow'){let ss=schools();let opts=ss.length?ss.map((x,i)=>`<option value="${i}">${x.name||x.school||'School '+(i+1)}</option>`).join(''):'<option>Home Team</option><option>Away Team</option>';d.innerHTML=`<button class="bmback">← MAIN MENU</button><h1>PLAY NOW</h1><p>Choose two teams and play a standalone basketball game.</p><div class="bm248-pick"><label>HOME<select id="pnh">${opts}</select></label><b>VS</b><label>AWAY<select id="pna">${opts}</select></label></div><button id="pntip">TIP OFF</button><div id="pnresult"></div>`}
 else{let state=JSON.parse(localStorage.getItem('bm27_legacy')||'null')||{coins:5000,wins:0,losses:0,lineup:[]};d.innerHTML=`<button class="bmback">← MAIN MENU</button><h1>LEGACY</h1><p>Build a dream roster across BM27 eras. Earn Legacy Coins, collect players and create a lineup.</p><div class="legacy-wallet">${state.coins} LC • ${state.wins}-${state.losses}</div><div class="legacy-grid"><button data-pack>OPEN STARTER PACK<br><small>1,000 LC</small></button><button data-lg>PLAY LEGACY GAME</button><div id="legacyLine"><b>LINEUP</b><p>${state.lineup.length?state.lineup.join(' • '):'Open a pack to begin.'}</p></div></div>`;d.dataset.state=JSON.stringify(state)}
 document.body.appendChild(d);d.querySelector('.bmback').onclick=()=>d.remove();
 if(mode==='playnow')d.querySelector('#pntip').onclick=()=>loading('TIP-OFF…',()=>{let h=d.querySelector('#pnh').selectedOptions[0].text,a=d.querySelector('#pna').selectedOptions[0].text,hs=45+Math.floor(Math.random()*45),as=45+Math.floor(Math.random()*45);d.querySelector('#pnresult').innerHTML=`<h2>FINAL</h2><b>${h} ${hs} — ${as} ${a}</b>`});
 else{let st=JSON.parse(d.dataset.state);d.querySelector('[data-pack]').onclick=()=>{if(st.coins<1000)return alert('Not enough Legacy Coins.');st.coins-=1000;let pool=['Elite Point Guard','Sharpshooting Wing','Lockdown Defender','Glass Cleaner','Rim Protector','Two-Way Star'];let card=pool[Math.floor(Math.random()*pool.length)]+' '+(78+Math.floor(Math.random()*18))+' OVR';st.lineup.push(card);st.lineup=st.lineup.slice(-10);localStorage.setItem('bm27_legacy',JSON.stringify(st));openMode('legacy')};d.querySelector('[data-lg]').onclick=()=>{let win=Math.random()<.55;win?st.wins++:st.losses++;st.coins+=win?650:250;localStorage.setItem('bm27_legacy',JSON.stringify(st));loading(win?'LEGACY WIN +650 LC':'GAME COMPLETE +250 LC',()=>openMode('legacy'))}}
}
function hooks(){document.addEventListener('click',e=>{let b=e.target.closest('button,[data-rd-mode],[data-mode]');if(!b)return;if(b.closest('#bm248Overlay,#bm248Modes'))return;if(/dynasty|season|myschool|roster/i.test((b.textContent||'')+(b.dataset?.rdMode||'')))loading('LOADING '+(b.textContent||'MODE').trim().slice(0,24)+'…')},true)}
function boot(){cover();addModes();hooks();new MutationObserver(()=>{if(document.getElementById('pn2713'))return;cover();addModes()}).observe(document.body,{childList:true,subtree:true})}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();window.BM27V248={loading,openMode};})();