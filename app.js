import { nextBall, makeCard, cardProgress, validHostState } from './game.js';
import { DrumRenderer, colorFor } from './drum.js';
import { setupPlayer } from './player-ui.js';
const $ = id => document.getElementById(id);
const HOST_KEY='bingo-bongo:90:host';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let storageWarning=false,toastTimer,autoTimer,confettiTimer,spinning=false,soundOn=false,audioContext,activeView='home',phase='idle';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{if(!storageWarning){storageWarning=true;toast('No se pudo guardar. Mantén la página abierta para conservar tu juego.');}}}
let host=read(HOST_KEY,{called:[],ended:false});if(!validHostState(host))host={called:[],ended:false};
host.mode=host.mode===75?75:90;
const total=()=>host.mode;
const drum=new DrumRenderer($('drum'),host.called,reducedMotion,total());drum.describe();
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4300);}
function persistHost(){save(HOST_KEY,host);}

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
function buildBoard(){cells.length=0;$('number-board').replaceChildren();$('number-board').dataset.mode=total();for(let n=1;n<=total();n++){const el=document.createElement('span');el.id='board-ball-'+n;el.className='board-ball';el.innerHTML='<span>'+n+'</span>';$('number-board').append(el);cells.push(el);}document.querySelector('.board-heading>div>span').textContent='/ '+total();$('host-mode').value=total();document.querySelector('.machine-panel').setAttribute('aria-label','Bombo de '+total()+' bolas');}
buildBoard();
function renderHost(pending=null){
  const latest=host.called.at(-1);
  cells.forEach((el,i)=>{const n=i+1,called=host.called.includes(n);el.className='board-ball'+(called?` called ball-${colorFor(n)}`:'')+(latest===n?' latest':'')+(pending===n?' pending-reveal':'');el.setAttribute('aria-label',`${n}, ${pending===n?'bola en presentación':latest===n?'última bola':called?'ya salió':'pendiente'}`);});
  // ball color variables also apply without the large sphere class.
  $('called-count').textContent=String(host.called.length).padStart(2,'0');
  $('remaining').textContent=`${total()-host.called.length} bolas por salir`;
  $('drum-count').textContent=`${total()-host.called.length} dentro`;
  $('game-status').textContent=spinning?'LA SUERTE ESTÁ GIRANDO…':host.ended?'PARTIDA FINALIZADA':host.called.length===total()?'SALIERON LAS '+total()+' BOLAS':latest?'LA SUERTE ESTÁ EN JUEGO':'TODO LISTO PARA EMPEZAR';
  $('draw').disabled=(spinning&&phase!=='mixing')||host.ended||host.called.length===total();
  $('draw-label').textContent=spinning?(phase==='mixing'?'¡Más clics, más giros!':'¡Ahí viene la suerte!'):host.ended?'Partida finalizada':host.called.length===total()?'Las '+total()+' están fuera':'¡Girar el bombo!';
  $('bingo').disabled=spinning||host.ended||!host.called.length;
  $('auto').disabled=host.ended||host.called.length===total();
  $('host-settings').disabled=spinning;$('host-mode').disabled=spinning||(!host.ended&&host.called.length>0);
  if(!pending){$('last-ball').className=latest?`sphere ball-${colorFor(latest)}`:'last-ball-placeholder';$('last-ball').innerHTML=latest?`<span>${latest}</span>`:'—';$('last-caption').textContent=host.ended?'¡Qué buena partida!':latest?'¡Busca y marca!':'¿Será la tuya?';}
}
function scheduleAuto(){clearTimeout(autoTimer);if($('auto').checked&&!host.ended&&host.called.length<total()&&activeView==='host'&&!document.hidden)autoTimer=setTimeout(draw,Number($('interval').value)*1000);}
async function presentBall(n){
  const overlay=$('draw-reveal'),ball=$('reveal-ball');phase='revealing';
  ball.className='sphere reveal-ball ball-'+colorFor(n);$('reveal-number').textContent=n;
  overlay.setAttribute('aria-label','Salió el '+n+'. Toca fuera de la bola para continuar.');overlay.classList.remove('flying');overlay.hidden=false;$('app-shell').inert=true;overlay.focus();
  tone(660,.22);tone(880,.3,.14);announce(n);
  await new Promise(resolve=>{let done=false;const dismiss=e=>{if(done)return;if(e.type==='click'&&e.target.closest('#reveal-ball'))return;if(e.type==='keydown'&&!['Escape','Enter',' '].includes(e.key))return;e.preventDefault();done=true;overlay.removeEventListener('click',dismiss);overlay.removeEventListener('keydown',dismiss);resolve();};overlay.addEventListener('click',dismiss);overlay.addEventListener('keydown',dismiss);});
  phase='flying';const target=cells[n-1].getBoundingClientRect(),from=ball.getBoundingClientRect();overlay.classList.add('flying');
  if(!reducedMotion&&target.width>0&&target.height>0){const dx=target.x+target.width/2-from.x-from.width/2,dy=target.y+target.height/2-from.y-from.height/2;const flight=ball.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx+'px,'+dy+'px) scale('+target.width/from.width+')'}],{duration:650,easing:'cubic-bezier(.55,.05,.28,1)',fill:'forwards'});try{await flight.finished;}catch{}flight.cancel();}
  overlay.hidden=true;overlay.classList.remove('flying');$('app-shell').inert=false;
}
async function draw(){
  if(host.ended||host.called.length>=total()||activeView!=='host'||$('modal').open)return;
  if(spinning){if(phase==='mixing'){drum.kick();tone(210,.07);$('game-status').textContent='¡MÁS IMPULSO! '+drum.motor.turns+' CLICS';}return;}
  clearTimeout(autoTimer);spinning=true;phase='mixing';document.body.classList.add('busy');drum.motor.turns=0;drum.kick();renderHost();
  const selected=nextBall(host.called,Math.random,total());const tick=setInterval(()=>tone(130+Math.random()*120,.055,0,'triangle',.035),110);
  try{while(drum.motor.running)await sleep(45);clearInterval(tick);phase='extracting';renderHost();drum.extract(selected);host.called.push(selected);persistHost();renderHost(selected);await sleep(reducedMotion?100:1100);drum.exiting=null;await presentBall(selected);}
  finally{clearInterval(tick);spinning=false;phase='idle';document.body.classList.remove('busy');$('app-shell').inert=false;$('draw-reveal').hidden=true;renderHost();$('draw').focus();}
  if(host.called.length===total())stopAuto();else scheduleAuto();
}
$('draw').onclick=draw;
$('auto').onchange=()=>{if($('auto').checked)draw();else stopAuto();};$('interval').onchange=scheduleAuto;
$('history-order').onclick=()=>{openModal('<span class="modal-icon">◉</span><h2>Así salió la suerte.</h2><p>Orden de salida, de la primera bola a la última.</p><div id="history-balls" class="verify-list"></div>');$('history-balls').innerHTML=host.called.length?host.called.map(n=>sphere(n)).join(''):'<p>Aún no salió ninguna bola.</p>';};
document.addEventListener('visibilitychange',()=>{drum.setActive(activeView==='host'&&!document.hidden);if(document.hidden&&$('auto').checked){stopAuto();toast('Sorteo automático pausado. Actívalo para continuar.');}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&activeView==='host'&&!$('modal').open&&(e.target===document.body||e.target===document.documentElement)){e.preventDefault();draw();}});
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('Instala la app para jugar sin la barra del navegador.');}catch{toast('Puedes instalar la app para verla en toda la pantalla.');}}
$('fullscreen').onclick=fullscreen;$('play-fullscreen').onclick=fullscreen;
$('host-settings').onclick=()=>{openModal('<span class="modal-icon">⚙</span><h2>A tu ritmo.</h2><p>El sorteo y los cartones se guardan en este navegador. El modo automático se pausa al salir del sorteo.</p><div class="settings-actions"><button id="new-game" class="secondary-button">↻ Empezar una nueva partida</button><button id="settings-help" class="secondary-button">? Cómo jugar</button></div>');$('new-game').onclick=confirmNewGame;$('settings-help').onclick=showHelp;};
function confirmNewGame(){openModal('<span class="modal-icon">↻</span><h2>¿Otra vuelta de suerte?</h2><p>El bombo volverá a tener todas sus bolas. Los jugadores deben limpiar sus marcas antes de la nueva partida.</p><div class="modal-actions"><button id="cancel-reset" class="secondary-button">Cancelar</button><button id="confirm-reset" class="dark-button">Nueva partida</button></div>');$('cancel-reset').onclick=closeModal;$('confirm-reset').onclick=()=>{host={called:[],ended:false,mode:total()};persistHost();drum.reset([],total());buildBoard();renderHost();closeModal();toast('Bombo listo. Los jugadores pueden iniciar una nueva participación.');};}
function confetti(){
  clearTimeout(confettiTimer);const layer=$('confetti');($('modal').open?$('modal'):document.body).append(layer);layer.replaceChildren();
  for(let i=0;i<150;i++){const el=document.createElement('i');el.className='confetto';el.style.cssText='left:'+Math.random()*100+'%;background:'+['#ed3545','#ffc629','#16a15e','#1761ef','#854ce6'][i%5]+';animation-delay:'+Math.random()*2+'s;animation-duration:'+(4+Math.random()*3)+'s;--drift:'+(Math.random()-.5)*400+'px;border-radius:'+(i%3===0?'50%':'2px');if(reducedMotion){el.style.animation='none';el.style.top=Math.random()*100+'%';el.style.transform='rotate('+Math.random()*180+'deg)';}layer.append(el);}
  confettiTimer=setTimeout(()=>layer.replaceChildren(),11000);
}
$('bingo').onclick=()=>{
  if(spinning||host.ended||!host.called.length)return;
  openModal('<span class="modal-icon">✦</span><h2>¿Se escuchó bingo?</h2><p>Comprueba todos los números del ganador. Introduce su código o compara el cartón con el tablero.</p><label class="eyebrow" for="verify-id">CÓDIGO DEL CARTÓN (OPCIONAL)</label><div class="verify-input-row"><input id="verify-id" maxlength="10" placeholder="A1B2C3D4E5" autocomplete="off"><button id="verify-card" class="secondary-button">Comprobar</button></div><p id="verify-result" aria-live="polite"></p><div class="verify-list" id="verify-list"></div><div class="modal-actions"><button id="continue-game" class="secondary-button">Seguir jugando</button><button id="finish-game" class="dark-button">Finalizar partida</button></div>');
  const finish=$('finish-game');$('verify-list').innerHTML=[...host.called].sort((a,b)=>a-b).map(n=>sphere(n)).join('');
  $('verify-id').oninput=()=>{finish.disabled=false;$('verify-result').textContent='';};
  $('verify-card').onclick=()=>{const id=$('verify-id').value.trim().toUpperCase();if(!/^[A-F0-9]{10}$/.test(id)){$('verify-result').textContent='Escribe los 10 caracteres del código del cartón.';finish.disabled=true;return;}const card=makeCard(id,total()),missing=card.flat().filter(n=>n!==null&&!host.called.includes(n)),progress=cardProgress(card,host.called);$('verify-result').textContent=missing.length?`${progress.line?'Tiene línea. ':''}Faltan ${missing.length} números para bingo: ${missing.join(', ')}.`:'¡Bingo válido! Todos los números han salido.';finish.disabled=missing.length>0;};
  $('continue-game').onclick=closeModal;finish.onclick=()=>{host.ended=true;persistHost();renderHost();celebrationSound();openModal(`<div class="celebration"><span class="modal-icon">✦</span><h2>¡BINGO!</h2><p>Partida finalizada después de <strong>${host.called.length} bolas</strong>.<br>¡Aplausos para quien se llevó la suerte!</p><button class="primary-button" id="celebrate-done">¡Qué buena partida!</button></div>`);confetti();$('celebrate-done').onclick=closeModal;};
};

function inviteURL(id,mode=total()){const url=new URL(location.href);url.search='';url.hash=id?`card${mode===75?'75':''}=${id}`:'cards='+mode;return url.href;}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Enlace copiado. ¡Compártelo con tu gente!');}catch{toast('Mantén pulsado el enlace para seleccionarlo y copiarlo.');}}
function showInvite(id,mode=total()){const url=inviteURL(id,mode);openModal(`<span class="modal-icon">↗</span><h2>${id?'Tu cartón va contigo.':'Que no falte nadie.'}</h2><p>${id?'Este enlace abre los mismos números. Las marcas se guardan por separado en cada dispositivo.':'Escanea el QR, saca tu cartilla y elige un cartón. Mira el sorteo en la computadora y marca los números en tu celular.'}</p><div class="qr" id="qr"></div><div class="share-url" id="share-url"></div><div class="modal-actions"><button id="copy-url" class="dark-button">Copiar enlace ↗</button><button id="native-share" class="secondary-button">Compartir</button></div>`);$('share-url').textContent=url;try{const qr=window.qrcode(0,'M');qr.addData(url);qr.make();$('qr').innerHTML=qr.createImgTag(5,0,'Código QR de la invitación');}catch{$('qr').hidden=true;}$('copy-url').onclick=()=>copy(url);$('native-share').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Bingo Bongo · '+mode+' bolas',url});}catch(e){if(e.name!=='AbortError')await copy(url);}}else await copy(url);};if(['localhost','127.0.0.1'].includes(location.hostname)){const p=document.createElement('p');p.className='setting-note';p.textContent='Vista local: usa la web publicada para compartir el QR con otros dispositivos.';$('modal-content').append(p);}}
$('invite').onclick=()=>showInvite();
function showHelp(){openModal('<span class="modal-icon">✦</span><h2>El plan: jugar juntos.</h2><ol><li><strong>En la computadora:</strong> elige «Jugar bingo». Invita a tus amigos con el QR y gira el bombo.</li><li><strong>En el celular:</strong> elige «Sacar cartilla». Explora los candidatos, selecciona un cartón y añade otros si quieres. Confirma tu conjunto para comenzar; los cartones quedan bloqueados.</li><li><strong>Escucha y marca:</strong> cada clic añade impulso al bombo. Cuando termina de girar sale una bola; toca fuera de ella para continuar. Toca en tu cartón los números que escuches.</li><li><strong>¡Línea o bingo!</strong> Elige la misma modalidad de 75 o 90 bolas en el sorteo y en los cartones. La casilla central del formato BINGO es libre. Completar una línea y completar todo el cartón son premios distintos. El anfitrión verifica el código y finaliza la partida.</li></ol><p class="setting-note">Las marcas son manuales y los dispositivos no se sincronizan. El sorteo se sigue desde la pantalla principal.</p><button class="dark-button" id="help-done">¡A jugar!</button>');$('help-done').onclick=closeModal;}
$('help').onclick=showHelp;

if('serviceWorker'in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(()=>{console.info('Bingo Bongo: modo sin conexión no disponible en este navegador.');});});

const player=setupPlayer({$,read,save,toast,openModal,closeModal,tone,chime,confetti,showInvite});
async function celebrationSound(){try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();const previous=soundOn;soundOn=true;[523,659,784,1046,1318].forEach((n,i)=>tone(n,.6,i*.13,'triangle',.13));[262,330,392,523].forEach((n,i)=>tone(n,.8,.7+i*.12,'sine',.1));soundOn=previous;}catch{}}
$('host-mode').onchange=()=>{if(spinning||(!host.ended&&host.called.length)){ $('host-mode').value=total();return;}const mode=Number($('host-mode').value);host={called:[],ended:false,mode};persistHost();drum.reset([],mode);buildBoard();renderHost();};
function route(){
  if(spinning){history.replaceState(null,'','#host');return;}
  const hash=location.hash.slice(1),playerView=player.enter(hash);activeView=playerView||(hash==='host'?'host':'home');
  for(const view of ['home','host','cards','play'])$(view+'-view').hidden=view!==activeView;
  document.body.dataset.view=activeView;$('back').hidden=activeView==='home'||activeView==='play';$('back').href='#home';$('back-label').textContent='Inicio';
  document.querySelector('.brand').setAttribute('aria-disabled',String(activeView==='play'));document.querySelector('.brand').tabIndex=activeView==='play'?-1:0;
  document.title=activeView==='play'?'Mis cartones confirmados · Bingo Bongo':activeView==='host'?'El sorteo · Bingo Bongo':activeView==='cards'?'Elegir cartones · Bingo Bongo':'Bingo Bongo · ¡Que gire la suerte!';
  if(activeView!=='host')stopAuto();drum.setActive(activeView==='host'&&!document.hidden);
}
window.addEventListener('hashchange',route);renderHost();route();
