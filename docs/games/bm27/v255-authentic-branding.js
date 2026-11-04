(()=>{'use strict';
const MODE='bm27-branding-mode',LEGACY='bm27-authentic-logo-map',DB='bm27-branding-db',STORE='logos';
const cache={};
function mode(){return localStorage.getItem(MODE)||'bm27'}
function baseName(n){return String(n||'School').replace(/\s+\(\d{4}-\d{2}\)$/,'').trim()}
function db(){return new Promise((ok,no)=>{let q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(STORE);q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)})}
async function put(n,v){cache[n]=v;let d=await db();await new Promise((ok,no)=>{let q=d.transaction(STORE,'readwrite').objectStore(STORE).put(v,n);q.onsuccess=ok;q.onerror=()=>no(q.error)});d.close()}
async function del(n){delete cache[n];let d=await db();await new Promise((ok,no)=>{let q=d.transaction(STORE,'readwrite').objectStore(STORE).delete(n);q.onsuccess=ok;q.onerror=()=>no(q.error)});d.close()}
async function loadLocal(){let d=await db(),tx=d.transaction(STORE),st=tx.objectStore(STORE);await new Promise((ok,no)=>{let q=st.openCursor();q.onsuccess=e=>{let c=e.target.result;if(c){cache[c.key]=c.value;c.continue()}else ok()};q.onerror=()=>no(q.error)});d.close();return cache}
async function migrateLegacy(){let raw;try{raw=localStorage.getItem(LEGACY)}catch{}if(!raw)return;try{let m=JSON.parse(raw)||{};for(const [n,v] of Object.entries(m))if(v)await put(n,v);localStorage.removeItem(LEGACY)}catch(e){console.warn('Legacy branding migration skipped',e)}}
function logo(name){name=baseName(name);if(cache[name])return cache[name];return window.BM27Logos252?.svg?.(name)||''}
function html(name,cls='bmLogo'){let n=baseName(name),src=logo(n),auth=mode()==='authentic'&&!!cache[n];return `<img class="${cls}" src="${src}" alt="${n} ${auth?'authentic':'BM27'} logo" data-brand-school="${n}">`}
function refresh(){document.querySelectorAll('[data-brand-school]').forEach(img=>{img.src=logo(img.dataset.brandSchool)});document.querySelectorAll('.brandingModeState').forEach(x=>x.textContent=mode()==='authentic'?'AUTHENTIC LOGOS':'BM27 LOGOS')}
function setMode(m){localStorage.setItem(MODE,m);refresh()}
async function absorbCloud(){if(!window.cloudGame?.signedIn)return {count:0,signedIn:false};let m=await window.cloudGame.loadBrandingLogos();if(m)for(const[n,v]of Object.entries(m))await put(n,v);refresh();return {count:Object.keys(m||{}).length,signedIn:true}}

async function removeLogoBackground(file,tolerance=38){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((ok,no)=>{let i=new Image;i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not read image'));i.src=url});
  const max=1600,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);
  const im=x.getImageData(0,0,w,h),d=im.data,seen=new Uint8Array(w*h),q=new Int32Array(w*h),samples=[];
  const pix=i=>[d[i*4],d[i*4+1],d[i*4+2]];
  for(let xx=0;xx<w;xx++){samples.push(pix(xx),pix((h-1)*w+xx))}
  for(let yy=0;yy<h;yy++){samples.push(pix(yy*w),pix(yy*w+w-1))}
  samples.sort((a,b)=>(a[0]+a[1]+a[2])-(b[0]+b[1]+b[2]));let mid=samples[Math.floor(samples.length/2)],bg=mid;
  let head=0,tail=0;function add(i){if(i>=0&&i<w*h&&!seen[i]){seen[i]=1;q[tail++]=i}}
  for(let xx=0;xx<w;xx++){add(xx);add((h-1)*w+xx)}for(let yy=0;yy<h;yy++){add(yy*w);add(yy*w+w-1)}
  const lim=tolerance*tolerance*3;
  while(head<tail){let i=q[head++],o=i*4,dr=d[o]-bg[0],dg=d[o+1]-bg[1],db=d[o+2]-bg[2];
   if(dr*dr+dg*dg+db*db>lim){seen[i]=2;continue}
   d[o+3]=0;let xx=i%w,yy=(i/w)|0;if(xx)add(i-1);if(xx<w-1)add(i+1);if(yy)add(i-w);if(yy<h-1)add(i+w)
  }
  x.putImageData(im,0,0);return c.toDataURL('image/png');
 }finally{URL.revokeObjectURL(url)}
}

function open(){document.getElementById('branding255')?.remove();let d=document.createElement('section');d.id='branding255';d.className='branding255';d.innerHTML=`<header><button id="brBack">← BACK</button><div><small>SCHOOL BRANDING</small><h1>CHOOSE YOUR LOGOS</h1></div></header><div class="brandChoices"><button data-brand="bm27"><b>BM27 LOGOS</b><span>Original generated school marks</span></button><button data-brand="authentic"><b>AUTHENTIC LOGOS</b><span>Imported school artwork • account sync</span></button></div><article class="brandImport"><h2>ADD AN AUTHENTIC SCHOOL LOGO</h2><p>Images up to 5 MB. Local copies use IndexedDB so multiple logos do not fill localStorage.</p><label>SCHOOL<select id="brSchool"></select></label><label>LOGO FILE<input id="brFile" type="file" accept="image/png,image/jpeg,image/webp"></label><label class="brBgRemove"><input id="brRemoveBg" type="checkbox"> REMOVE IMAGE BACKGROUND</label><label id="brToleranceWrap" class="brTolerance">BACKGROUND REMOVAL <input id="brTolerance" type="range" min="12" max="80" value="38"><span id="brTolVal">38</span></label><button id="brImport">IMPORT LOGO</button><button id="brRemove">REMOVE IMPORTED LOGO</button><button id="brTest">TEST CLOUD SYNC</button><p id="brStatus"></p></article><article><h2>ACTIVE: <span class="brandingModeState"></span></h2><div id="brPreview"></div></article>`;document.body.appendChild(d);
let names=[];try{if(typeof directory!=='undefined'&&Array.isArray(directory))names.push(...directory.map(x=>x.name||x.school).filter(Boolean));if(typeof current!=='undefined'&&current?.teams)names.push(...current.teams.map(x=>x.name).filter(Boolean))}catch{}names=[...new Set(names)].sort();let sel=d.querySelector('#brSchool');sel.innerHTML=names.map(n=>`<option>${n}</option>`).join('');
function preview(msg){let n=sel.value;if(!n)return;d.querySelector('#brPreview').innerHTML=`${html(n,'brandPreviewLogo')}<b>${n}</b>`;if(msg)d.querySelector('#brStatus').textContent=msg;else d.querySelector('#brStatus').textContent=cache[n]?'Authentic logo saved for this school.':'No imported authentic logo yet — BM27 fallback is being used.'}
d.querySelector('#brBack').onclick=()=>d.remove();
let bgCheck=d.querySelector('#brRemoveBg'),tol=d.querySelector('#brTolerance'),tolWrap=d.querySelector('#brToleranceWrap');function bgUI(){tolWrap.style.display=bgCheck.checked?'grid':'none'}bgCheck.onchange=bgUI;tol.oninput=()=>d.querySelector('#brTolVal').textContent=tol.value;bgUI();d.querySelectorAll('[data-brand]').forEach(b=>b.onclick=()=>{setMode(b.dataset.brand);preview()});sel.onchange=()=>preview();
d.querySelector('#brImport').onclick=async()=>{let f=d.querySelector('#brFile').files[0],n=sel.value;if(!f||!n)return preview('Choose a school and image first.');if(f.size>5*1024*1024)return preview('Please use an image no larger than 5 MB.');try{preview(bgCheck.checked?'Removing background…':'Importing logo…');let data;if(bgCheck.checked)data=await removeLogoBackground(f,Number(tol.value)||38);else data=await new Promise((ok,no)=>{let rd=new FileReader;rd.onload=()=>ok(rd.result);rd.onerror=()=>no(rd.error);rd.readAsDataURL(f)});await put(n,data);setMode('authentic');refresh();preview(window.cloudGame?.signedIn?'Logo saved. Syncing to your account…':'Logo saved on this device.');if(window.cloudGame?.signedIn){await window.cloudGame.saveBrandingLogo(n,data);preview(bgCheck.checked?'Background removed and transparent logo synced to your BM27 account.':'Logo synced to your BM27 account.')}}catch(err){console.error(err);preview('Logo import failed: '+(window.cloudGame?.errorText?.(err)||err?.message||'Unknown error'))}};
d.querySelector('#brTest').onclick=async()=>{if(!window.cloudGame?.signedIn)return preview('Cloud test: you are not signed in.');preview('Testing account branding sync…');try{await absorbCloud();preview('Cloud branding connection is working.')}catch(err){preview('Cloud test failed: '+(window.cloudGame?.errorText?.(err)||err?.message||'Unknown server error'))}};
d.querySelector('#brRemove').onclick=async()=>{let n=sel.value;await del(n);try{if(window.cloudGame?.signedIn)await window.cloudGame.deleteBrandingLogo(n)}catch(e){console.warn(e)}refresh();preview('Imported logo removed.')};refresh();preview()}
function install(){let host=document.getElementById('rdModes');if(host&&!document.getElementById('branding255Btn')){let b=document.createElement('button');b.id='branding255Btn';b.className='rd-mode';b.innerHTML='<b>SCHOOL BRANDING</b><span>BM27 or authentic high-school logos</span>';b.onclick=e=>{e.preventDefault();e.stopPropagation();open()};host.appendChild(b)}}
async function syncAll(){if(!window.cloudGame?.signedIn)throw new Error('Sign in to your BM27 account first.');await loadLocal();const entries=Object.entries(cache).filter(([,v])=>v);let ok=0,failed=[];for(const [n,v] of entries){try{await window.cloudGame.saveBrandingLogo(n,v);ok++}catch(e){failed.push({school:n,error:window.cloudGame?.errorText?.(e)||e?.message||String(e)})}}await absorbCloud();return {total:entries.length,ok,failed}}
function allLocal(){return {...cache}}

async function syncEverySchool(teams,onProgress){
 if(!window.cloudGame?.signedIn)throw new Error('Sign in to your BM27 account first.');
 await loadLocal();
 const list=(teams||window.BM27SchoolDirectory||[]).filter(t=>t?.name),seen=new Set(),unique=list.filter(t=>{let n=baseName(t.name);if(seen.has(n))return false;seen.add(n);return true});
 let covered=0,synced=0,generated=0,failed=[];
 for(const t of unique){const n=baseName(t.name);try{
   let imported=cache[n]||null;
   if(imported){await window.cloudGame.saveBrandingLogo(n,imported);synced++}
   let src=imported||window.BM27Logos252?.svg?.(n)||'';
   if(!src)throw new Error('Logo renderer failed');
   if(!imported)generated++;
   covered++;onProgress?.({ok:covered,total:unique.length,school:n,kind:imported?'imported':'generated'});
 }catch(e){failed.push({school:n,error:e?.message||String(e)})}}
 refresh();window.BM27LogoCoverage={total:unique.length,covered,failed:failed.length};
 return{ok:covered,total:unique.length,imported:synced,generated,failed}
}

async function syncManifest(manifest,onProgress){if(!window.cloudGame?.signedIn)throw new Error('Sign in first.');let rows=Array.isArray(manifest)?manifest:(manifest?.schools||[]),ok=0,failed=[];for(const row of rows){let n=baseName(row.school||row.name),u=row.logo_url||row.logoUrl;if(!n||!u)continue;try{let res=await fetch(u,{mode:'cors'});if(!res.ok)throw new Error('HTTP '+res.status);let blob=await res.blob();if(blob.size>5*1024*1024)throw new Error('Logo exceeds 5 MB');let data=await new Promise((yes,no)=>{let fr=new FileReader;fr.onload=()=>yes(fr.result);fr.onerror=no;fr.readAsDataURL(blob)});await put(n,data);await window.cloudGame.saveBrandingLogo(n,data);ok++;onProgress?.({ok,total:rows.length,school:n})}catch(e){failed.push({school:n,error:e.message||String(e)})}}refresh();return{ok,total:rows.length,failed}}

window.BM27Branding255={mode,logo,html,open,setMode,refresh,absorbCloud,syncAll,allLocal,syncManifest,syncEverySchool};
async function init(){try{await loadLocal();await migrateLegacy();await absorbCloud()}catch(e){console.warn('Branding cache init',e)}refresh();install()}
document.addEventListener('DOMContentLoaded',init);if(document.readyState!=='loading')init();let queued=false;new MutationObserver(()=>{if(document.getElementById('pn2713')||queued)return;queued=true;requestAnimationFrame(()=>{queued=false;if(!document.getElementById('pn2713'))install()})}).observe(document.documentElement,{childList:true,subtree:true});
})();