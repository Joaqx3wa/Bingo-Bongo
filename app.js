import { TOTAL, nextBall, makeCard, cardProgress, validHostState } from './game.js';
import { DrumRenderer, colorFor } from './drum.js';
const $ = id => document.getElementById(id);
const HOST_KEY='bingo-bongo:90:host',CARDS_KEY='bingo-bongo:90:cards',SELECT_KEY='bingo-bongo:90:selected';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let storageWarning=false,toastTimer,autoTimer,spinning=false,soundOn=false,audioContext,activeView='home',selectedId=null,activeIndex=0,installPrompt;
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{if(!storageWarning){storageWarning=true;toast('No se pudo guardar. Mantén la página abierta para conservar tu juego.');}}}
let host=read(HOST_KEY,{called:[],ended:false});if(!validHostState(host))host={called:[],ended:false};
let cards=read(CARDS_KEY,[]);if(!Array.isArray(cards))cards=[];
cards=cards.filter(c=>c&&typeof c.id==='string'&&/^[A-F0-9]{10}$/.test(c.id)&&Array.isArray(c.marked)).slice(0,6).map(c=>({id:c.id,marked:[...new Set(c.marked)].filter(n=>typeof n==='number'&&makeCard(c.id).flat().includes(n))}));
const remembered=read(SELECT_KEY,null);activeIndex=Math.max(0,cards.findIndex(c=>c.id===remembered));
const drum=new DrumRenderer($('drum'),host.called,reducedMotion);drum.describe();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4300);}
function persistHost(){save(HOST_KEY,host);}
function persistCards(){save(CARDS_KEY,cards);}
function stopAuto(){clearTimeout(autoTimer);autoTimer=null;$('auto').checked=false;}
function openModal(content){stopAuto();$('modal-content').innerHTML=content;if(!$('modal').open)$('modal').showModal();}
function closeModal(){$('modal').close();}
$('close-modal').onclick=closeModal;
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function sphere(n,extra=''){return `<div class="sphere ball-${colorFor(n)} ${extra}"><span>${n}</span></div>`;}

// Audio is generated on the device, and enabled only by the sound button.
function tone(frequency,duration=.12,delay=0,type='sine',volume=.07){
  if(!soundOn||!audioContext)return;
  const osc=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+delay;
  osc.type=type;osc.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.01);gain.gain.exponentialRampToValueAtTime(.001,start+duration);
  osc.connect(gain);gain.connect(audioContext.destination);osc.start(start);osc.stop(start+duration+.02);
}
function chime(){[523.25,659.25,783.99,1046.5].forEach((n,i)=>tone(n,.35,i*.13));}
function announce(n){if(!soundOn||!('speechSynthesis'in window))return;speechSynthesis.cancel();const message=new SpeechSynthesisUtterance(String(n));message.lang='es-ES';message.rate=.88;const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('es'));if(voice)message.voice=voice;speechSynthesis.speak(message);}
$('sound').onclick=async()=>{if(!soundOn){try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();}catch{toast('Este navegador no permite reproducir sonidos.');return;}}soundOn=!soundOn;$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Silenciar sonidos':'Activar sonidos');if(soundOn){tone(660);toast('Sonidos activados. ¡Que se escuche la suerte!');}else if('speechSynthesis'in window)speechSynthesis.cancel();};

const cells=[];
for(let n=1;n<=TOTAL;n++){const el=document.createElement('span');el.id=`board-ball-${n}`;el.className='board-ball';el.innerHTML=`<span>${n}</span>`;$('number-board').append(el);cells.push(el);}
function renderHost(pending=null){
  const latest=host.called.at(-1);
  cells.forEach((el,i)=>{const n=i+1,called=host.called.includes(n);el.className='board-ball'+(called?` called ball-${colorFor(n)}`:'')+(latest===n?' latest':'')+(pending===n?' pending-reveal':'');el.setAttribute('aria-label',`${n}, ${pending===n?'bola en presentación':latest===n?'última bola':called?'ya salió':'pendiente'}`);});
  // ball color variables also apply without the large sphere class.
  $('called-count').textContent=String(host.called.length).padStart(2,'0');
  $('remaining').textContent=`${TOTAL-host.called.length} bolas por salir`;
  $('drum-count').textContent=`${TOTAL-host.called.length} dentro`;
  $('game-status').textContent=spinning?'LA SUERTE ESTÁ GIRANDO…':host.ended?'PARTIDA FINALIZADA':host.called.length===90?'SALIERON LAS 90 BOLAS':latest?'LA SUERTE ESTÁ EN JUEGO':'TODO LISTO PARA EMPEZAR';
  $('draw').disabled=spinning||host.ended||host.called.length===90;
  $('draw-label').textContent=spinning?'¡Ahí viene la suerte!':host.ended?'Partida finalizada':host.called.length===90?'Las 90 están fuera':'¡Girar el bombo!';
  $('bingo').disabled=spinning||host.ended||!host.called.length;
  $('auto').disabled=host.ended||host.called.length===90;
  $('host-settings').disabled=spinning;
  if(!pending){$('last-ball').className=latest?`sphere ball-${colorFor(latest)}`:'last-ball-placeholder';$('last-ball').innerHTML=latest?`<span>${latest}</span>`:'—';$('last-caption').textContent=host.ended?'¡Qué buena partida!':latest?'¡Busca y marca!':'¿Será la tuya?';}
}
function scheduleAuto(){clearTimeout(autoTimer);if($('auto').checked&&!host.ended&&host.called.length<90&&activeView==='host'&&!document.hidden)autoTimer=setTimeout(draw,Number($('interval').value)*1000);}
async function presentBall(n){
  const overlay=$('draw-reveal'),ball=$('reveal-ball');
  ball.className=`sphere reveal-ball ball-${colorFor(n)}`;$('reveal-number').textContent=n;
  overlay.setAttribute('aria-label',`¡Salió el ${n}!`);overlay.classList.remove('flying');overlay.hidden=false;
  $('app-shell').inert=true;
  tone(660,.22);tone(880,.3,.14);announce(n);
  await sleep(reducedMotion?650:1900);
  const target=cells[n-1].getBoundingClientRect(),from=ball.getBoundingClientRect();
  overlay.classList.add('flying');
  if(!reducedMotion&&target.width>0&&target.height>0){
    const dx=target.x+target.width/2-from.x-from.width/2,dy=target.y+target.height/2-from.y-from.height/2;
    const flight=ball.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx}px,${dy}px) scale(${target.width/from.width})`}],{duration:650,easing:'cubic-bezier(.55,.05,.28,1)',fill:'forwards'});
    try{await flight.finished;}catch{}flight.cancel();
  }
  overlay.hidden=true;overlay.classList.remove('flying');$('app-shell').inert=false;
}
async function draw(){
  if(spinning||host.ended||host.called.length>=90||activeView!=='host'||$('modal').open)return;
  clearTimeout(autoTimer);spinning=true;document.body.classList.add('busy');renderHost();drum.mixing=true;
  const selected=nextBall(host.called);
  const tick=setInterval(()=>tone(130+Math.random()*120,.055,0,'triangle',.035),110);
  try{
    await sleep(reducedMotion?150:2300);clearInterval(tick);drum.mixing=false;
    drum.extract(selected);host.called.push(selected);persistHost();renderHost(selected);
    await sleep(reducedMotion?80:580);drum.exiting=null;
    await presentBall(selected);
  }finally{clearInterval(tick);spinning=false;drum.mixing=false;document.body.classList.remove('busy');$('app-shell').inert=false;$('draw-reveal').hidden=true;renderHost();}
  if(host.called.length===90)stopAuto();else scheduleAuto();
}
$('draw').onclick=draw;
$('auto').onchange=()=>{if($('auto').checked)draw();else stopAuto();};$('interval').onchange=scheduleAuto;
$('history-order').onclick=()=>{openModal('<span class="modal-icon">◉</span><h2>Así salió la suerte.</h2><p>Orden de salida, de la primera bola a la última.</p><div id="history-balls" class="verify-list"></div>');$('history-balls').innerHTML=host.called.length?host.called.map(n=>sphere(n)).join(''):'<p>Aún no salió ninguna bola.</p>';};
document.addEventListener('visibilitychange',()=>{drum.setActive(activeView==='host'&&!document.hidden);if(document.hidden&&$('auto').checked){stopAuto();toast('Sorteo automático pausado. Actívalo para continuar.');}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&activeView==='host'&&!$('modal').open&&(e.target===document.body||e.target===document.documentElement)){e.preventDefault();draw();}});
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Instala la app para jugar sin la barra del navegador.');}catch{toast('Puedes instalar la app para verla en toda la pantalla.');}}
$('fullscreen').onclick=fullscreen;$('play-fullscreen').onclick=fullscreen;
$('host-settings').onclick=()=>{openModal('<span class="modal-icon">⚙</span><h2>A tu ritmo.</h2><p>El sorteo y los cartones se guardan en este navegador. El modo automático se pausa al salir del sorteo.</p><div class="settings-actions"><button id="new-game" class="secondary-button">↻ Empezar una nueva partida</button><button id="settings-help" class="secondary-button">? Cómo jugar</button></div>');$('new-game').onclick=confirmNewGame;$('settings-help').onclick=showHelp;};
function confirmNewGame(){openModal('<span class="modal-icon">↻</span><h2>¿Otra vuelta de suerte?</h2><p>El bombo volverá a tener sus 90 bolas. Los jugadores deben limpiar sus marcas antes de la nueva partida.</p><div class="modal-actions"><button id="cancel-reset" class="secondary-button">Cancelar</button><button id="confirm-reset" class="dark-button">Nueva partida</button></div>');$('cancel-reset').onclick=closeModal;$('confirm-reset').onclick=()=>{host={called:[],ended:false};persistHost();drum.reset([]);renderHost();closeModal();toast('90 bolas listas. Recuerden limpiar sus cartones.');};}
function confetti(){if(reducedMotion)return;$('confetti').replaceChildren();for(let i=0;i<90;i++){const el=document.createElement('i');el.className='confetto';el.style.cssText=`left:${Math.random()*100}%;background:${['#ed3545','#ffc629','#16a15e','#1761ef','#854ce6'][i%5]};animation-delay:${Math.random()*.7}s;animation-duration:${2+Math.random()*2}s;--drift:${(Math.random()-.5)*400}px;border-radius:${i%3===0?'50%':'2px'}`;$('confetti').append(el);}setTimeout(()=>$('confetti').replaceChildren(),5000);}
$('bingo').onclick=()=>{
  if(spinning||host.ended||!host.called.length)return;
  openModal('<span class="modal-icon">✦</span><h2>¿Se escuchó bingo?</h2><p>Comprueba los 15 números del ganador. Introduce su código o compara el cartón con el tablero.</p><label class="eyebrow" for="verify-id">CÓDIGO DEL CARTÓN (OPCIONAL)</label><div class="verify-input-row"><input id="verify-id" maxlength="10" placeholder="A1B2C3D4E5" autocomplete="off"><button id="verify-card" class="secondary-button">Comprobar</button></div><p id="verify-result" aria-live="polite"></p><div class="verify-list" id="verify-list"></div><div class="modal-actions"><button id="continue-game" class="secondary-button">Seguir jugando</button><button id="finish-game" class="dark-button">Finalizar partida</button></div>');
  const finish=$('finish-game');$('verify-list').innerHTML=[...host.called].sort((a,b)=>a-b).map(n=>sphere(n)).join('');
  $('verify-id').oninput=()=>{finish.disabled=false;$('verify-result').textContent='';};
  $('verify-card').onclick=()=>{const id=$('verify-id').value.trim().toUpperCase();if(!/^[A-F0-9]{10}$/.test(id)){$('verify-result').textContent='Escribe los 10 caracteres del código del cartón.';finish.disabled=true;return;}const card=makeCard(id),missing=card.flat().filter(n=>n!==null&&!host.called.includes(n)),progress=cardProgress(card,host.called);$('verify-result').textContent=missing.length?`${progress.line?'Tiene línea. ':''}Faltan ${missing.length} números para bingo: ${missing.join(', ')}.`:'¡Bingo válido! Los 15 números han salido.';finish.disabled=missing.length>0;};
  $('continue-game').onclick=closeModal;finish.onclick=()=>{host.ended=true;persistHost();renderHost();confetti();chime();openModal(`<div class="celebration"><span class="modal-icon">✦</span><h2>¡BINGO!</h2><p>Partida finalizada después de <strong>${host.called.length} bolas</strong>.<br>¡Aplausos para quien se llevó la suerte!</p><button class="primary-button" id="celebrate-done">¡Qué buena partida!</button></div>`);$('celebrate-done').onclick=closeModal;};
};

// Candidate cards retain the same seeds and marks as the first version.
function newId(){const a=new Uint8Array(5);crypto.getRandomValues(a);return [...a].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();}
function appendCard(id=newId()){if(cards.some(c=>c.id===id)||cards.length>=6)return false;cards.push({id,marked:[]});persistCards();return true;}
function selectCard(index,focus=false){activeIndex=Math.max(0,Math.min(index,cards.length-1));save(SELECT_KEY,cards[activeIndex]?.id);renderCards();if(focus)$('card-choices').querySelector('.active')?.focus();}
function gridElements(card,marked,interactive){
  return card.flat().map((n,i)=>{const cell=document.createElement(interactive&&n!==null?'button':'span');cell.className='ticket-cell'+(n===null?' blank':marked.includes(n)?' marked':'');
    if(n===null)cell.setAttribute('aria-hidden','true');else{cell.textContent=n;if(interactive){cell.dataset.number=String(n);cell.setAttribute('aria-label',`Número ${n}, fila ${Math.floor(i/9)+1}`);cell.setAttribute('aria-pressed',String(marked.includes(n)));}}
    return cell;
  });
}
function renderCards(newId=null){
  $('card-choices').replaceChildren();$('card-choices').setAttribute('role','radiogroup');
  const start=Math.floor(activeIndex/3)*3;
  cards.slice(start,start+3).forEach((item,j)=>{const index=start+j,preview=document.createElement('article');preview.className='card-preview'+(index===activeIndex?' active':'')+(newId===item.id?' new-ticket':'');preview.tabIndex=0;preview.setAttribute('role','radio');preview.setAttribute('aria-checked',String(index===activeIndex));preview.setAttribute('aria-label',`Elegir cartón ${index+1}, código ${item.id}`);
    preview.innerHTML=`<div class="preview-top"><strong>bingo bongo ✦</strong><span class="preview-code">#${item.id}</span></div><div class="ticket-grid preview-grid"></div><div class="preview-bottom"><span>${item.marked.length} / 15 marcados</span><span class="preview-select"><i></i>${index===activeIndex?'Elegido':'Elegir'}</span></div>`;
    preview.querySelector('.preview-grid').append(...gridElements(makeCard(item.id),item.marked,false));preview.onclick=()=>selectCard(index,true);preview.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCard(index,true);}else if(e.key==='ArrowRight'){e.preventDefault();selectCard(Math.min(activeIndex+1,cards.length-1),true);}else if(e.key==='ArrowLeft'){e.preventDefault();selectCard(Math.max(activeIndex-1,0),true);}};$('card-choices').append(preview);
  });
  $('card-page').textContent=`Cartón ${activeIndex+1} de ${cards.length}`;$('prev-card').disabled=activeIndex<=0;$('next-card').disabled=activeIndex>=cards.length-1;$('generate').disabled=cards.length>=6;$('choose-card').disabled=!cards.length;$('card-options').disabled=!cards.length;
}
$('generate').onclick=()=>{if(!appendCard()){toast('Tienes 6 cartones. Quita uno desde el menú ⋯ para sacar otro.');return;}activeIndex=cards.length-1;save(SELECT_KEY,cards[activeIndex].id);renderCards(cards[activeIndex].id);$('printer-status').textContent='IMPRIMIENDO UN POQUITO DE SUERTE…';[180,240,180,320].forEach((n,i)=>tone(n,.08,i*.12,'triangle',.04));setTimeout(()=>$('printer-status').textContent='TUS QUINCE NÚMEROS DE LA SUERTE',850);};
$('prev-card').onclick=()=>selectCard(activeIndex-1);$('next-card').onclick=()=>selectCard(activeIndex+1);
$('choose-card').onclick=()=>{const item=cards[activeIndex];if(item){save(SELECT_KEY,item.id);location.hash=`play=${item.id}`;}};
$('card-options').onclick=()=>{const item=cards[activeIndex];if(!item)return;openModal(`<span class="modal-icon">▦</span><h2>Tu cartón, a tu manera.</h2><p>Código #${item.id}</p><div class="settings-actions"><button id="option-share" class="secondary-button">Compartir este cartón ↗</button><button id="option-print" class="secondary-button">Imprimir en papel</button><button id="option-remove" class="secondary-button">Quitar este cartón</button></div>`);$('option-share').onclick=()=>showInvite(item.id);$('option-print').onclick=()=>{closeModal();location.hash=`play=${item.id}`;route();requestAnimationFrame(()=>window.print());};$('option-remove').onclick=()=>{openModal('<span class="modal-icon">▦</span><h2>¿Quitar este cartón?</h2><p>Se quitarán el cartón y sus marcas de este dispositivo. Puedes conservarlo compartiendo su enlace.</p><div class="modal-actions"><button id="cancel-remove" class="secondary-button">Conservar</button><button id="confirm-remove" class="dark-button">Quitar cartón</button></div>');$('cancel-remove').onclick=closeModal;$('confirm-remove').onclick=()=>{cards=cards.filter(c=>c.id!==item.id);if(!cards.length)appendCard();persistCards();activeIndex=Math.min(activeIndex,cards.length-1);renderCards();closeModal();};};};
function currentCard(){return cards.find(c=>c.id===selectedId);}
function updateProgress(item){const progress=cardProgress(makeCard(item.id),item.marked);$('play-count').textContent=`${progress.count} de 15 marcados`;$('progress-fill').style.width=`${progress.count/15*100}%`;$('play-status').textContent=progress.bingo?'¡BINGO! Avisa al anfitrión para verificarlo.':progress.line?'¡LÍNEA! Avísale al anfitrión.':'Toca los números que escuches.';$('play-status').classList.toggle('winner',progress.line);return progress;}
function renderPlayer(){const item=currentCard();if(!item)return;$('play-id').textContent=`#${item.id}`;$('player-grid').replaceChildren(...gridElements(makeCard(item.id),item.marked,true));updateProgress(item);}
$('player-grid').onclick=e=>{const button=e.target.closest('button[data-number]');if(!button)return;const item=currentCard();if(!item)return;const n=Number(button.dataset.number),before=cardProgress(makeCard(item.id),item.marked);item.marked=item.marked.includes(n)?item.marked.filter(v=>v!==n):[...item.marked,n];persistCards();button.classList.toggle('marked',item.marked.includes(n));button.setAttribute('aria-pressed',String(item.marked.includes(n)));tone(item.marked.includes(n)?660:330,.08);const now=updateProgress(item);if(now.bingo&&!before.bingo){confetti();chime();toast('¡Bingo marcado! Avisa al anfitrión para comprobarlo.');}else if(now.line&&!before.line){chime();toast('¡Línea marcada! El anfitrión debe verificarla.');}};
$('clear-card').onclick=()=>{const item=currentCard();if(!item)return;openModal('<span class="modal-icon">↻</span><h2>Cartón como nuevo.</h2><p>Se limpiarán sus marcas. Los números se conservan para otra partida.</p><div class="modal-actions"><button id="cancel-clear" class="secondary-button">Conservar</button><button id="confirm-clear" class="dark-button">Limpiar marcas</button></div>');$('cancel-clear').onclick=closeModal;$('confirm-clear').onclick=()=>{item.marked=[];persistCards();renderPlayer();closeModal();};};
$('share-card').onclick=()=>{if(selectedId)showInvite(selectedId);};

function inviteURL(id){const url=new URL(location.href);url.search='';url.hash=id?`card=${id}`:'cards';return url.href;}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Enlace copiado. ¡Compártelo con tu gente!');}catch{toast('Mantén pulsado el enlace para seleccionarlo y copiarlo.');}}
function showInvite(id){const url=inviteURL(id);openModal(`<span class="modal-icon">↗</span><h2>${id?'Tu cartón va contigo.':'Que no falte nadie.'}</h2><p>${id?'Este enlace abre los mismos números. Las marcas se guardan por separado en cada dispositivo.':'Escanea el QR, saca tu cartilla y elige un cartón. Mira el sorteo en la computadora y marca los números en tu celular.'}</p><div class="qr" id="qr"></div><div class="share-url" id="share-url"></div><div class="modal-actions"><button id="copy-url" class="dark-button">Copiar enlace ↗</button><button id="native-share" class="secondary-button">Compartir</button></div>`);$('share-url').textContent=url;try{const qr=window.qrcode(0,'M');qr.addData(url);qr.make();$('qr').innerHTML=qr.createImgTag(5,0,'Código QR de la invitación');}catch{$('qr').hidden=true;}$('copy-url').onclick=()=>copy(url);$('native-share').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Bingo Bongo · 90 bolas',url});}catch(e){if(e.name!=='AbortError')await copy(url);}}else await copy(url);};if(['localhost','127.0.0.1'].includes(location.hostname)){const p=document.createElement('p');p.className='setting-note';p.textContent='Vista local: usa la web publicada para compartir el QR con otros dispositivos.';$('modal-content').append(p);}}
$('invite').onclick=()=>showInvite();
function showHelp(){openModal('<span class="modal-icon">✦</span><h2>El plan: jugar juntos.</h2><ol><li><strong>En la computadora:</strong> elige «Jugar bingo». Invita a tus amigos con el QR y gira el bombo.</li><li><strong>En el celular:</strong> elige «Sacar cartilla». Saca varios cartones, elige uno y ábrelo para jugar en toda la pantalla.</li><li><strong>Escucha y marca:</strong> el bombo tiene 90 bolas que salen una por una. Toca en tu cartón los números que escuches.</li><li><strong>¡Línea o bingo!</strong> Completar una fila es línea. Marcar los 15 números es bingo. El anfitrión verifica el código y finaliza la partida.</li></ol><p class="setting-note">Las marcas son manuales y los dispositivos no se sincronizan. El sorteo se sigue desde la pantalla principal.</p><button class="dark-button" id="help-done">¡A jugar!</button>');$('help-done').onclick=closeModal;}
$('help').onclick=showHelp;

// Install on compatible browsers; Safari and others get device-specific steps.
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('install').hidden=true;toast('¡Bingo Bongo instalado! Tu suerte tiene casa.');});
function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
$('install').hidden=isStandalone();
$('install').onclick=async()=>{
  if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')$('install').hidden=true;return;}
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  openModal(`<span class="modal-icon">↓</span><h2>Tu bingo, a un toque.</h2><p>Instala Bingo Bongo para abrirlo como una app, sin la barra del navegador.</p>${ios?'<ol><li>Abre esta página en <strong>Safari</strong>.</li><li>Toca <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).</li><li>Elige <strong>Añadir a pantalla de inicio</strong> y confirma.</li></ol>':'<ol><li>Abre esta página en <strong>Chrome o Edge</strong>.</li><li>Abre el menú del navegador (⋮ o ⋯).</li><li>Elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</li></ol>'}<p class="setting-note">La opción disponible depende de tu navegador. Una vez cargada, la app puede funcionar sin conexión.</p>`);
};
if('serviceWorker'in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{console.info('Bingo Bongo: modo sin conexión no disponible en este navegador.');});});

function route(){
  if(spinning){history.replaceState(null,'','#host');return;}
  const hash=location.hash.slice(1),match=/^(?:play|card)=([A-Fa-f0-9]{10})$/.exec(hash);
  activeView=hash==='host'?'host':hash==='cards'?'cards':match?'play':'home';
  if(match){selectedId=match[1].toUpperCase();if(!cards.some(c=>c.id===selectedId)){if(!appendCard(selectedId)){activeView='cards';toast('Ya tienes 6 cartones. Quita uno del menú ⋯ y vuelve a abrir el enlace.');}}if(activeView==='play'){activeIndex=cards.findIndex(c=>c.id===selectedId);save(SELECT_KEY,selectedId);}}
  for(const view of ['home','host','cards','play'])$(`${view}-view`).hidden=view!==activeView;
  document.body.dataset.view=activeView;
  $('back').hidden=activeView==='home';$('back').href=activeView==='play'?'#cards':'#home';$('back-label').textContent=activeView==='play'?'Cambiar cartón':'Inicio';
  document.title=activeView==='play'?'Mi cartón · Bingo Bongo':activeView==='host'?'El sorteo · Bingo Bongo':activeView==='cards'?'Sacar cartilla · Bingo Bongo':'Bingo Bongo · ¡Que gire la suerte!';
  if(activeView!=='host')stopAuto();drum.setActive(activeView==='host'&&!document.hidden);
  if(activeView==='cards'){if(!cards.length){appendCard();appendCard();appendCard();activeIndex=0;}activeIndex=Math.max(0,Math.min(activeIndex,cards.length-1));renderCards();}
  if(activeView==='play')renderPlayer();
}
window.addEventListener('hashchange',route);renderHost();route();
