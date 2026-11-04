(()=>{
  let deferredPrompt=null;
  const buttons=()=>[document.getElementById('installAppBtn'),document.getElementById('installAppHeaderBtn')].filter(Boolean);
  const show=visible=>buttons().forEach(b=>b.classList.toggle('hidden',!visible));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show(true)});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;show(false);try{toast('MSHSAA Basketball Manager 27 was installed.')}catch{}});
  async function install(){
    if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;show(false);return}
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone;
    if(standalone){try{toast('The game is already installed.')}catch{};return}
    try{toast('In Chrome, use the Install icon in the address bar or Menu → Cast, save, and share → Install page as app. Managed school Chromebooks may disable installation.')}catch{}
  }
  buttons().forEach(b=>b.addEventListener('click',install));
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('BM27 service worker unavailable',e)));
})();
