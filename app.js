import { TOTAL, nextBall, makeCard, cardProgress, validHostState } from './game.js';

const $ = id => document.getElementById(id);
const HOST_KEY = 'bingo-bongo:90:host';
const CARDS_KEY = 'bingo-bongo:90:cards';
let storageWarning = false;
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { if (!storageWarning) { storageWarning = true; toast('No se pudo guardar. Mantén esta página abierta para conservar la partida.'); } } }
let host = read(HOST_KEY, { called: [], ended: false });
if (!validHostState(host)) host = { called: [], ended: false };
let cards = read(CARDS_KEY, []);
if (!Array.isArray(cards)) cards = [];
cards = cards.filter(c => c && typeof c.id === 'string' && /^[A-F0-9]{10}$/.test(c.id) && Array.isArray(c.marked)).slice(0,6).map(c => ({ id: c.id, marked: [...new Set(c.marked)].filter(n => makeCard(c.id).flat().includes(n)) }));
let spinning = false, soundOn = false, audioContext, autoTimer, toastTimer, ordered = false;
let activeView = 'host';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
}
function persistHost() { save(HOST_KEY, host); }
function persistCards() { save(CARDS_KEY, cards); }
function openModal(content) {
  $('modal-content').innerHTML = content;
  if (!$('modal').open) $('modal').showModal();
}
function closeModal() { $('modal').close(); }
$('close-modal').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target === $('modal')) { const r = $('modal').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeModal(); } });

// Audio is synthesized locally; it only starts after an explicit user gesture.
function tone(frequency, duration = .12, delay = 0, type = 'sine', volume = .08) {
  if (!soundOn || !audioContext) return;
  const osc = audioContext.createOscillator(), gain = audioContext.createGain();
  osc.type = type; osc.frequency.value = frequency;
  const start = audioContext.currentTime + delay;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + .01);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.start(start); osc.stop(start + duration + .02);
}
function chime() { [523.25,659.25,783.99,1046.5].forEach((n,i) => tone(n,.35,i*.13)); }
function announce(number) {
  if (!soundOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const message = new SpeechSynthesisUtterance(String(number));
  message.lang = 'es-ES'; message.rate = .88;
  const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
  if (voice) message.voice = voice;
  speechSynthesis.speak(message);
}
$('sound').onclick = async () => {
  if (!soundOn) {
    try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); await audioContext.resume(); }
    catch { toast('Este navegador no permite reproducir sonidos.'); return; }
  }
  soundOn = !soundOn;
  $('sound').setAttribute('aria-pressed', String(soundOn));
  $('sound').setAttribute('aria-label', soundOn ? 'Silenciar sonidos' : 'Activar sonidos');
  $('sound-note').textContent = soundOn ? '♫ Sonido activado. ¡Que se escuche la suerte!' : '♫ Activa el sonido y súbele a la emoción.';
  if (soundOn) tone(660); else if ('speechSynthesis' in window) speechSynthesis.cancel();
};

const cells = [];
for (let n = 1; n <= TOTAL; n++) {
  const el = document.createElement('span');
  el.className = 'board-number'; el.textContent = n;
  $('number-board').append(el); cells.push(el);
}
function renderHost() {
  const latest = host.called.at(-1);
  cells.forEach((el,i) => {
    el.className = 'board-number' + (host.called.includes(i+1) ? ' called' : '') + (latest === i+1 ? ' latest' : '');
    el.setAttribute('aria-label', `${i+1}${latest === i+1 ? ', última bola' : host.called.includes(i+1) ? ', ya salió' : ', pendiente'}`);
  });
  $('called-count').textContent = String(host.called.length).padStart(2,'0');
  $('remaining').textContent = `${TOTAL - host.called.length} por salir`;
  $('history-count').textContent = `(${host.called.length})`;
  $('game-status').textContent = host.ended ? 'PARTIDA FINALIZADA' : latest ? host.called.length === TOTAL ? 'TODAS LAS BOLAS FUERA' : 'LA SUERTE ESTÁ EN JUEGO' : 'LISTOS PARA JUGAR';
  $('ball-number').textContent = latest || '?';
  $('ball-kicker').textContent = latest ? 'ÚLTIMA BOLA' : 'TU PRÓXIMO';
  $('ball-caption').textContent = latest ? 'BINGO BONGO / 90' : 'NÚMERO DE LA SUERTE';
  $('draw-caption').textContent = host.ended ? '¡Qué buena partida! ¿Nos echamos otra?' : host.called.length === TOTAL ? 'Salieron las 90 bolas. Es hora de comprobar el bingo.' : latest ? `Salió el ${latest}. ¡Busca tu número y márcalo!` : 'Todo puede pasar en la siguiente bola.';
  $('draw').disabled = spinning || host.ended || host.called.length === TOTAL;
  $('draw-label').textContent = host.ended ? 'Partida finalizada' : host.called.length === TOTAL ? 'Ya salieron las 90' : '¡Girar el bombo!';
  $('bingo').disabled = spinning || host.ended || !host.called.length;
  $('auto').disabled = host.ended || host.called.length === TOTAL;
  $('board-hint').textContent = host.ended ? '¡Gracias por jugar! ✦' : '¿Alguien completó su cartón?';
  const history = ordered ? [...host.called].sort((a,b) => a-b) : [...host.called].reverse();
  $('history').replaceChildren();
  if (!history.length) $('history').innerHTML = '<p class="empty-history">El primer número está a un giro de distancia <span>↗</span></p>';
  history.forEach(n => { const el = document.createElement('span'); el.className = 'history-ball' + (n === latest ? ' latest' : ''); el.textContent = n; $('history').append(el); });
}
function stopAuto() { clearTimeout(autoTimer); autoTimer = null; $('auto').checked = false; }
function scheduleAuto() {
  clearTimeout(autoTimer);
  if ($('auto').checked && !host.ended && host.called.length < TOTAL && activeView === 'host' && !document.hidden) autoTimer = setTimeout(draw, Number($('interval').value)*1000);
}
async function draw() {
  if (spinning || host.ended || host.called.length >= TOTAL) return;
  clearTimeout(autoTimer);
  const selected = nextBall(host.called);
  spinning = true;
  $('draw').disabled = true; $('bingo').disabled = true; $('new-game').disabled = true;
  $('draw-label').textContent = 'La suerte está girando…';
  $('game-status').textContent = 'REDOBLE DE SUERTE…';
  $('machine').classList.add('spinning');
  $('ball-kicker').textContent = 'GIRANDO'; $('ball-caption').textContent = 'QUE SEA EL TUYO';
  let ticks = 0;
  const spin = setInterval(() => { $('ball-number').textContent = 1 + Math.floor(Math.random()*90); tone(200 + ticks*18,.05); ticks++; }, 90);
  await new Promise(resolve => setTimeout(resolve, reducedMotion ? 200 : 1650));
  clearInterval(spin);
  $('machine').classList.remove('spinning');
  host.called.push(selected); spinning = false;
  $('new-game').disabled = false;
  persistHost(); renderHost();
  $('hero-ball').classList.remove('ball-reveal'); void $('hero-ball').offsetWidth; $('hero-ball').classList.add('ball-reveal');
  tone(660,.22); tone(880,.3,.13);
  announce(selected);
  if (host.called.length === TOTAL) stopAuto(); else scheduleAuto();
}
$('draw').onclick = draw;
$('auto').onchange = () => { if ($('auto').checked) draw(); else stopAuto(); };
$('interval').onchange = scheduleAuto;
$('history-order').onclick = () => { ordered = !ordered; $('history-order').textContent = ordered ? 'Numérico ↑' : 'Por salida ↓'; $('history-order').setAttribute('aria-label', ordered ? 'Cambiar a orden de salida' : 'Cambiar a orden numérico'); renderHost(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && $('auto').checked) { stopAuto(); toast('Sorteo automático pausado. Actívalo para continuar.'); } });
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !e.repeat && activeView === 'host' && !$('modal').open && (e.target === document.body || e.target === document.documentElement)) { e.preventDefault(); draw(); }
});
$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else toast('Usa la opción de pantalla completa de tu navegador.'); }
  catch { toast('Usa la opción de pantalla completa de tu navegador.'); }
};
$('new-game').onclick = () => {
  if (spinning) return;
  stopAuto();
  openModal('<div class="modal-icon">↻</div><h2>Otra vuelta de suerte.</h2><p>Se borrarán los números del sorteo actual. Los cartones de los jugadores se conservan: cada persona debe limpiar sus marcas antes de volver a jugar.</p><div class="modal-actions"><button class="secondary-button" id="cancel-reset">Seguir jugando</button><button class="dark-button" id="confirm-reset">Nueva partida</button></div>');
  $('cancel-reset').onclick = closeModal;
  $('confirm-reset').onclick = () => { host = { called: [], ended: false }; persistHost(); renderHost(); closeModal(); toast('Nuevo sorteo listo. Recuerden limpiar las marcas de sus cartones.'); };
};
function confetti() {
  if (reducedMotion) return;
  $('confetti').replaceChildren();
  for (let i = 0; i < 90; i++) {
    const el = document.createElement('i'); el.className = 'confetto';
    el.style.cssText = `left:${Math.random()*100}%;background:${['#ff795e','#f8d96b','#92ae7d','#253f37'][i%4]};animation-delay:${Math.random()*.7}s;animation-duration:${2+Math.random()*2}s;--drift:${(Math.random()-.5)*400}px;border-radius:${i%3===0?'50%':'2px'}`;
    $('confetti').append(el);
  }
  setTimeout(() => $('confetti').replaceChildren(), 5000);
}
$('bingo').onclick = () => {
  if (spinning || host.ended || !host.called.length) return;
  stopAuto();
  openModal('<div class="modal-icon">✳</div><h2>¿Se escuchó bingo?</h2><p>Comprueba que los 15 números del cartón hayan salido. Puedes introducir su código o compararlo con el tablero.</p><label class="eyebrow" for="verify-id">CÓDIGO DEL CARTÓN (OPCIONAL)</label><div class="verify-input-row"><input id="verify-id" maxlength="10" placeholder="Ej. A1B2C3D4E5" autocomplete="off" aria-label="Código del cartón"><button id="verify-card" class="secondary-button">Comprobar</button></div><p id="verify-result" aria-live="polite"></p><div class="verify-list" id="verify-list"></div><div class="modal-actions"><button class="secondary-button" id="continue-game">Seguir jugando</button><button class="dark-button" id="finish-game">Confirmar y finalizar</button></div>');
  const finish = $('finish-game');
  $('verify-list').innerHTML = [...host.called].sort((a,b) => a-b).map(n=>`<span>${n}</span>`).join('');
  $('verify-id').oninput = () => { finish.disabled = false; $('verify-result').textContent = ''; };
  $('verify-card').onclick = () => {
    const id = $('verify-id').value.trim().toUpperCase();
    if (!/^[A-F0-9]{10}$/.test(id)) { $('verify-result').textContent = 'Escribe los 10 caracteres del código que aparece en el cartón.'; finish.disabled = true; return; }
    const card = makeCard(id), missing = card.flat().filter(n => n !== null && !host.called.includes(n));
    const progress = cardProgress(card, host.called);
    $('verify-result').textContent = missing.length ? `${progress.line ? 'Tiene línea, pero falta' : 'Falta'}${missing.length === 1 ? '' : 'n'} ${missing.length} número${missing.length===1?'':'s'} para bingo: ${missing.join(', ')}.` : '¡Bingo válido! Los 15 números han salido.';
    finish.disabled = missing.length > 0;
  };
  $('continue-game').onclick = closeModal;
  finish.onclick = () => {
    host.ended = true; persistHost(); renderHost(); confetti(); chime();
    openModal(`<div class="celebration"><span class="modal-icon">✳</span><div class="eyebrow" style="justify-content:center">LA SUERTE TIENE GANADOR</div><h2>¡BINGO!</h2><p>Partida finalizada después de <strong>${host.called.length} bolas</strong>.<br>Aplausos para quien se llevó la suerte.</p><button class="draw-button" id="celebrate-done">¡Qué buena partida!</button></div>`);
    $('celebrate-done').onclick = closeModal;
  };
};

function newId() { const array = new Uint8Array(5); crypto.getRandomValues(array); return [...array].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase(); }
function addCard(id = newId()) {
  if (cards.some(c => c.id === id)) return;
  if (cards.length >= 6) { toast('Puedes tener hasta 6 cartones. Quita uno para imprimir otro.'); return; }
  cards.push({ id, marked: [] }); persistCards(); renderCards(id);
  $('printer-status').textContent = 'Imprimiendo un poquito de suerte…';
  [180,240,180,320].forEach((n,i)=>tone(n,.08,i*.12,'triangle',.04));
  setTimeout(() => { $('printer-status').textContent = 'Tu cartón está listo.'; }, 950);
}
function renderCards(animateId) {
  $('ticket-output').replaceChildren();
  cards.forEach((item,index) => {
    const card = makeCard(item.id), progress = cardProgress(card,item.marked);
    const ticket = document.createElement('article'); ticket.className = 'ticket'; ticket.id = `ticket-${item.id}`;
    ticket.setAttribute('aria-label', `Cartón ${index+1}, código ${item.id}`);
    if (item.id !== animateId) ticket.style.animation = 'none';
    ticket.innerHTML = `<div class="ticket-top"><strong>bingo bongo ✳</strong><span class="ticket-id">#${item.id}</span></div><div class="ticket-col-labels"><span>1–9</span><span>10–19</span><span>20–29</span><span>30–39</span><span>40–49</span><span>50–59</span><span>60–69</span><span>70–79</span><span>80–90</span></div><div class="ticket-grid"></div><div class="ticket-bottom"><span class="card-count">${String(progress.count).padStart(2,'0')} / 15 marcados</span><div class="ticket-buttons"><button data-action="share" aria-label="Compartir cartón ${index+1}">Compartir ↗</button><button data-action="clear" aria-label="Limpiar marcas del cartón ${index+1}">Limpiar</button><button data-action="remove" aria-label="Quitar cartón ${index+1}">Quitar ×</button></div></div><div class="ticket-status" ${progress.line ? '' : 'hidden'}>${progress.bingo ? '¡15 de 15! Avisa al anfitrión para comprobar tu bingo. ✳' : '¡Tienes una línea marcada! Avísale al anfitrión. ✦'}</div>`;
    card.flat().forEach((n,i) => {
      const cell = document.createElement(n === null ? 'span' : 'button');
      cell.className = 'ticket-cell' + (n === null ? ' blank' : item.marked.includes(n) ? ' marked' : '');
      if (n !== null) {
        cell.textContent = n; cell.setAttribute('aria-label', `Número ${n}, fila ${Math.floor(i/9)+1}`); cell.setAttribute('aria-pressed', String(item.marked.includes(n)));
        cell.onclick = () => {
          const previous = cardProgress(card,item.marked);
          if (item.marked.includes(n)) item.marked = item.marked.filter(v=>v!==n); else item.marked.push(n);
          persistCards();
          const now = cardProgress(card,item.marked);
          cell.classList.toggle('marked',item.marked.includes(n)); cell.setAttribute('aria-pressed', String(item.marked.includes(n)));
          ticket.querySelector('.card-count').textContent = `${String(now.count).padStart(2,'0')} / 15 marcados`;
          const status = ticket.querySelector('.ticket-status'); status.hidden = !now.line;
          status.textContent = now.bingo ? '¡15 de 15! Avisa al anfitrión para comprobar tu bingo. ✳' : '¡Tienes una línea marcada! Avísale al anfitrión. ✦';
          tone(item.marked.includes(n)?660:330,.08);
          if (now.bingo && !previous.bingo) { confetti(); chime(); toast('¡Bingo marcado! Avisa al anfitrión para que compruebe tu cartón.'); }
          else if (now.line && !previous.line) { chime(); toast('¡Línea marcada! El anfitrión debe verificarla.'); }
        };
      } else cell.setAttribute('aria-hidden','true');
      ticket.querySelector('.ticket-grid').append(cell);
    });
    ticket.querySelector('[data-action="share"]').onclick = () => showInvite(item.id);
    ticket.querySelector('[data-action="clear"]').onclick = () => {
      openModal('<div class="modal-icon">↻</div><h2>Cartón como nuevo.</h2><p>¿Limpiar todas las marcas de este cartón? Sus números se conservan.</p><div class="modal-actions"><button class="secondary-button" id="cancel-card">Conservar</button><button class="dark-button" id="confirm-card">Limpiar marcas</button></div>');
      $('cancel-card').onclick = closeModal; $('confirm-card').onclick = () => { item.marked = []; persistCards(); renderCards(); closeModal(); };
    };
    ticket.querySelector('[data-action="remove"]').onclick = () => {
      openModal('<div class="modal-icon">▦</div><h2>¿Quitar este cartón?</h2><p>Se quitarán el cartón y sus marcas de este dispositivo. Para conservarlo, comparte primero su enlace.</p><div class="modal-actions"><button class="secondary-button" id="cancel-card">Conservar</button><button class="dark-button" id="confirm-card">Quitar cartón</button></div>');
      $('cancel-card').onclick = closeModal; $('confirm-card').onclick = () => { cards = cards.filter(c => c.id !== item.id); persistCards(); renderCards(); closeModal(); if (!cards.length) $('printer-status').textContent = 'Tu próximo cartón te espera.'; };
    };
    $('ticket-output').append(ticket);
  });
  $('generate').disabled = cards.length >= 6;
}
$('generate').onclick = () => addCard();
$('print').onclick = () => { if (!cards.length) { toast('Primero imprime un cartón en la máquina.'); return; } window.print(); };
function inviteURL(id) { const url = new URL(location.href); url.hash = id ? `card=${id}` : 'cards'; url.search = ''; return url.href; }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Enlace copiado. ¡Compártelo con tu gente!'); }
  catch { const input = document.createElement('textarea'); input.value = text; $('modal-content').append(input); input.select(); try { if (!document.execCommand('copy')) throw Error(); toast('Enlace copiado.'); } catch { toast('Selecciona y copia el enlace que aparece en pantalla.'); } input.remove(); }
}
function showInvite(id) {
  const url = inviteURL(id);
  openModal(`<div class="modal-icon">↗</div><h2>${id ? 'Este cartón viaja contigo.' : 'La próxima bola nos reúne.'}</h2><p>${id ? 'Este enlace abre el mismo cartón. Las marcas se guardan por separado en cada dispositivo.' : 'Escanea el QR con tu celular para generar tu propio cartón. Mira el sorteo en la computadora y marca los números que salgan.'}</p><div class="qr" id="qr"></div><div class="share-url" id="share-url"></div><div class="modal-actions"><button class="dark-button" id="copy-url">Copiar enlace ↗</button><button class="secondary-button" id="native-share">Compartir</button></div>`);
  $('share-url').textContent = url;
  try { const qr = window.qrcode(0,'M'); qr.addData(url); qr.make(); $('qr').innerHTML = qr.createImgTag(5,0,'Código QR de la invitación'); }
  catch { $('qr').hidden = true; }
  $('copy-url').onclick = () => copy(url);
  $('native-share').onclick = async () => { if (navigator.share) { try { await navigator.share({title:'Bingo Bongo · 90 bolas',url}); } catch(e) { if (e.name !== 'AbortError') await copy(url); } } else await copy(url); };
  if (['localhost','127.0.0.1'].includes(location.hostname)) { const note = document.createElement('p'); note.textContent = 'Vista local: el QR funcionará entre dispositivos cuando publiques la web en GitHub Pages.'; note.style.fontSize = '10px'; $('modal-content').append(note); }
}
$('invite').onclick = () => showInvite();
$('share-card-page').onclick = () => showInvite();
$('help').onclick = () => {
  openModal('<div class="modal-icon">✳</div><h2>El plan: jugar juntos.</h2><ol><li><strong>En la computadora:</strong> abre «El sorteo» y comparte la invitación. Puedes activar sonidos y anunciar los números en voz alta.</li><li><strong>En cada celular:</strong> entra a «Mis cartones» y genera uno. Tiene 15 números en 3 filas, con 5 números por fila.</li><li><strong>Gira, escucha y marca:</strong> el anfitrión saca bolas del 1 al 90, sin repetir. Los jugadores marcan sus números manualmente.</li><li><strong>¡Línea o bingo!</strong> Una fila completa es línea; el cartón entero es bingo. El anfitrión verifica el código y pulsa «¡Bingo!» para finalizar.</li></ol><p>La página funciona sin cuentas. No sincroniza partidas entre celulares: sigan el sorteo de la pantalla principal. Los cartones y sus marcas se conservan en cada navegador.</p><button class="draw-button" id="help-done">¡A jugar!</button>');
  $('help-done').onclick = closeModal;
};
function route() {
  const hash = location.hash.slice(1);
  const match = /^card=([A-Fa-f0-9]{10})$/.exec(hash);
  activeView = hash === 'cards' || match ? 'cards' : 'host';
  $('host-view').hidden = activeView !== 'host'; $('cards-view').hidden = activeView !== 'cards';
  $('nav-host').classList.toggle('active', activeView === 'host'); $('nav-cards').classList.toggle('active', activeView === 'cards');
  $('nav-host').setAttribute('aria-current',activeView === 'host' ? 'page' : 'false'); $('nav-cards').setAttribute('aria-current',activeView === 'cards' ? 'page' : 'false');
  document.title = activeView === 'host' ? 'Bingo Bongo · Que ruede la diversión' : 'Mis cartones · Bingo Bongo';
  if (activeView === 'cards') {
    stopAuto();
    if (match && !cards.some(c => c.id === match[1].toUpperCase())) {
      if (cards.length < 6) addCard(match[1].toUpperCase());
      else toast('Ya tienes 6 cartones. Quita uno y abre de nuevo el enlace para añadir este.');
    }
    if (!cards.length) addCard(); else renderCards();
  }
}
window.addEventListener('hashchange', route);
renderHost(); route();
