const CACHE='bingo-bongo-v5-focus-physics-1';
const BASE_FILES=['./','./index.html','./style.css','./app.js','./game.js','./drum.js','./drum-3d.js','./spin-audio.js','./ticket-layout.js','./vendor/three.module.min.js','./vendor/three.core.min.js','./player-ui.js','./player-session.js','./vendor/qrcode.js','./manifest.webmanifest','./favicon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
const FILES=BASE_FILES.flatMap(file=>!file.includes('/vendor/')&&(file.endsWith('.js')||file.endsWith('.css'))?[file,file+'?v=5']:[file]);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bingo-bongo-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
// Network first keeps published updates fresh; the complete app is cached for offline play.
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  event.respondWith((async()=>{
    try {const response=await fetch(event.request,{cache:'no-store'});if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;}
    catch {return await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match(new URL('./index.html',scope).href):null)||Response.error();}
  })());
});
