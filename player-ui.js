import {makeCard,cardProgress} from './game.js?v=5';
import {TICKET_COLORS,fitTicket} from './ticket-layout.js?v=5';
import {createSession,validSession,toggleSessionNumber,cardMarks} from './player-session.js?v=5';

export function setupPlayer({$,read,save,toast,openModal,closeModal,tone,chime,confetti,showInvite}){
  const DRAFT='bingo-bongo:draft:v3',SESSION='bingo-bongo:session:v3';
  let session=read(SESSION,null);if(!validSession(session))session=null;
  let draft=read(DRAFT,null);
  const validId=id=>typeof id==='string'&&/^[A-F0-9]{10}$/.test(id);
  if(!draft||![75,90].includes(draft.mode)||!Array.isArray(draft.candidates)||!draft.candidates.every(validId)||!Array.isArray(draft.selected)||!draft.selected.every(validId)||draft.selected.length>6)draft={mode:90,candidates:[],selected:[],cursor:0,choosing:true,colors:{}};
  draft.selected=[...new Set(draft.selected)];draft.cursor=Math.max(0,Math.min(Number(draft.cursor)||0,(draft.choosing?draft.candidates:draft.selected).length-1));
  draft.colors=draft.colors&&typeof draft.colors==='object'?draft.colors:{};if(session)session.colors=session.colors&&typeof session.colors==='object'?session.colors:{};
  const colorNames={red:'rojo',orange:'naranja',yellow:'amarillo',green:'verde',blue:'azul',purple:'violeta'};
  const locked=()=>Boolean(session?.locked);
  function applyColor(element,id,colors){const key=Object.hasOwn(TICKET_COLORS,colors[id])?colors[id]:'blue';element.style.setProperty('--ticket-color',TICKET_COLORS[key]);element.style.setProperty('--ticket-ink',['yellow','orange'].includes(key)?'#18274b':'#ffffff');}
  function palette(container,id,colors,onChange){container.replaceChildren();for(const [key,hex]of Object.entries(TICKET_COLORS)){const button=document.createElement('button');button.style.background=hex;button.type='button';button.setAttribute('aria-label','Color '+colorNames[key]);button.setAttribute('aria-pressed',String((colors[id]||'blue')===key));button.onclick=()=>{colors[id]=key;persist();onChange();};container.append(button);}}
  const gridObserver=new ResizeObserver(entries=>{for(const {target}of entries){const grid=target.querySelector('.ticket-grid');if(grid)fitTicket(target,grid,grid.classList.contains('kind75')?75:90,target.querySelector('.bingo-letters'));}});
  function observeTickets(){gridObserver.disconnect();for(const body of document.querySelectorAll('.preview-card-body,#player-card-body'))gridObserver.observe(body);}

  function persist(){save(DRAFT,draft);if(session)save(SESSION,session);}
  function newId(){const a=new Uint8Array(5);crypto.getRandomValues(a);return [...a].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();}
  function candidate(){if(!draft.candidates.length)draft.candidates.push(newId());}
  function list(){return draft.choosing?draft.candidates:draft.selected;}
  function current(){return list()[draft.cursor];}
  function letters(){const el=document.createElement('div');el.className='bingo-letters';el.innerHTML='<span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>';return el;}
  function cells(id,mode,marks=[],interactive=false){return makeCard(id,mode).flat().map((n,i)=>{
    const free=mode===75&&i===12,el=document.createElement(interactive&&n!==null?'button':'span');
    el.className='ticket-cell'+(free?' free marked':n===null?' blank':marks.includes(n)?' marked':'');
    if(free){el.textContent='★';el.setAttribute('aria-label','Casilla libre');}
    else if(n===null)el.setAttribute('aria-hidden','true');
    else{el.textContent=n;if(interactive){el.dataset.number=n;el.setAttribute('aria-label',`Número ${n}`);el.setAttribute('aria-pressed',String(marks.includes(n)));}}
    return el;
  });}
  function render(){
    candidate();if(!draft.choosing&&!draft.selected.length){draft.choosing=true;draft.cursor=0;}
    draft.cursor=Math.max(0,Math.min(draft.cursor,list().length-1));const id=current();$('card-mode').value=String(draft.mode);
    $('card-choices').removeAttribute('role');$('card-choices').replaceChildren();
    const article=document.createElement('article');article.className=`card-preview active kind${draft.mode}`;article.setAttribute('aria-label',`Cartón ${id}`);
    article.innerHTML=`<div class="preview-top"><strong>bingo bongo ✦</strong><span class="preview-code">#${id}</span></div><div class="preview-card-body"><div class="ticket-grid preview-grid kind${draft.mode}"></div></div><div class="preview-bottom"><span>${draft.mode===75?'75 bolas · 24 números + libre':'90 bolas · 15 números'}</span><span>${draft.selected.includes(id)?'✓ Seleccionado':'Candidato'}</span></div>`;
    if(draft.mode===75)article.querySelector('.preview-card-body').prepend(letters());article.querySelector('.preview-grid').append(...cells(id,draft.mode));applyColor(article,id,draft.colors);$('card-choices').append(article);palette($('card-palette'),id,draft.colors,render);observeTickets();
    $('selected-strip').replaceChildren();draft.selected.forEach((chosen,i)=>{
      const chip=document.createElement('div');chip.className='selected-chip';applyColor(chip,chosen,draft.colors);const view=document.createElement('button');view.textContent=`Cartón ${i+1} ✓`;view.setAttribute('aria-label',`Revisar cartón seleccionado ${i+1}`);view.onclick=()=>{draft.choosing=false;draft.cursor=i;persist();render();};
      const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',`Quitar cartón seleccionado ${i+1}`);remove.onclick=()=>{draft.selected=draft.selected.filter(v=>v!==chosen);if(!draft.selected.length)draft.choosing=true;draft.cursor=0;persist();render();};chip.append(view,remove);$('selected-strip').append(chip);
    });
    $('card-page').textContent=draft.choosing?`Candidato ${draft.cursor+1}`:`Elegido ${draft.cursor+1} de ${draft.selected.length}`;
    $('prev-card').disabled=draft.cursor<=0;$('next-card').disabled=!draft.choosing&&draft.cursor>=draft.selected.length-1;
    $('generate').hidden=!draft.choosing;$('add-card').hidden=draft.choosing||draft.selected.length>=6;
    $('choose-card').textContent=draft.choosing?(draft.selected.includes(id)?'Ya seleccionado ✓':'Seleccionar cartón ✓'):`Confirmar y jugar (${draft.selected.length}) →`;
    $('choose-card').disabled=draft.choosing&&(draft.selected.includes(id)||draft.selected.length>=6);
    $('selection-note').textContent=draft.choosing?'Cambia de candidato hasta encontrar el tuyo. Puedes elegir hasta 6 cartones.':'Al confirmar se bloquean estos cartones durante toda la partida.';
    $('printer-status').textContent=draft.choosing?'BUSCA TU PRÓXIMO CARTÓN DE LA SUERTE':'TUS CARTONES ESTÁN LISTOS';persist();
  }
  function next(){if(locked())return;if(draft.choosing&&draft.cursor===draft.candidates.length-1)draft.candidates.push(newId());draft.cursor=Math.min(draft.cursor+1,list().length-1);persist();render();}
  $('next-card').onclick=next;$('prev-card').onclick=()=>{if(locked())return;draft.cursor=Math.max(0,draft.cursor-1);persist();render();};
  $('generate').onclick=()=>{if(locked())return;draft.candidates.push(newId());draft.cursor=draft.candidates.length-1;persist();render();const ticket=$('card-choices').firstElementChild;ticket.classList.add('new-ticket');};
  $('add-card').onclick=()=>{if(locked())return;draft.choosing=true;draft.candidates.push(newId());draft.cursor=draft.candidates.length-1;persist();render();};
  $('card-mode').onchange=()=>{if(locked())return;if(draft.selected.length){$('card-mode').value=draft.mode;toast('Quita los cartones seleccionados antes de cambiar de modalidad.');return;}draft.mode=Number($('card-mode').value);draft.candidates=[];draft.cursor=0;draft.choosing=true;persist();render();};
  $('choose-card').onclick=()=>{
    if(locked())return;
    if(draft.choosing){if(draft.selected.length>=6||draft.selected.includes(current()))return;draft.selected.push(current());draft.choosing=false;draft.cursor=draft.selected.length-1;persist();render();return;}
    openModal(`<span class="modal-icon">🔒</span><h2>¿Jugamos con estos?</h2><p>Confirmarás <strong>${draft.selected.length} ${draft.selected.length===1?'cartón':'cartones'} de ${draft.mode} bolas</strong>. No podrás añadir, quitar ni cambiar cartones durante la partida. Los números que marques se aplicarán a todos tus cartones.</p><div class="modal-actions"><button id="review-selection" class="secondary-button">Revisar</button><button id="confirm-selection" class="dark-button">Confirmar y comenzar</button></div>`);
    $('review-selection').onclick=closeModal;$('confirm-selection').onclick=()=>{session=createSession(draft.selected,draft.mode);session.colors={...draft.colors};persist();closeModal();location.hash='play';};
  };
  function marks(id){return cardMarks(session,id);}
  function updateProgress(){const id=session.ids[session.index],progress=cardProgress(makeCard(id,session.mode),session.marks),total=session.mode===75?24:15;
    $('play-count').textContent=`${progress.count} de ${total} marcados`;$('progress-fill').style.width=`${progress.count/total*100}%`;
    $('play-status').textContent=progress.bingo?'¡BINGO! El anfitrión debe verificarlo.':progress.line?'¡LÍNEA! Avísale al anfitrión.':'Un toque marca el número en todos tus cartones.';$('play-status').classList.toggle('winner',progress.line);
    $('session-tabs').querySelectorAll('button').forEach((button,i)=>{const p=cardProgress(makeCard(session.ids[i],session.mode),session.marks);button.textContent=`${i+1}${p.bingo?' ★':p.line?' ✓':''}`;});return progress;
  }
  function renderPlayer(){
    if(!locked())return;session.index=Math.max(0,Math.min(Number(session.index)||0,session.ids.length-1));const id=session.ids[session.index];
    document.body.dataset.cardMode=String(session.mode);$('play-ticket').className=`play-ticket kind${session.mode}`;applyColor($('play-ticket'),id,session.colors);$('player-card-body').className=`player-card-body kind${session.mode}`;$('player-grid').className=`ticket-grid player-grid kind${session.mode}`;
    $('play-letters').hidden=session.mode!==75;$('player-grid').replaceChildren(...cells(id,session.mode,marks(id),true));$('play-id').textContent=`#${id}`;
    $('session-tabs').replaceChildren();session.ids.forEach((_,i)=>{const button=document.createElement('button');button.className=i===session.index?'active':'';button.setAttribute('aria-label',`Ver cartón confirmado ${i+1}`);button.setAttribute('aria-current',String(i===session.index));button.onclick=()=>{session.index=i;persist();renderPlayer();};$('session-tabs').append(button);});
    $('player-page').textContent=`${session.index+1} / ${session.ids.length}`;$('player-prev').disabled=session.ids.length===1;$('player-next').disabled=session.ids.length===1;updateProgress();observeTickets();
  }
  $('player-prev').onclick=()=>{session.index=(session.index-1+session.ids.length)%session.ids.length;persist();renderPlayer();};$('player-next').onclick=()=>{session.index=(session.index+1)%session.ids.length;persist();renderPlayer();};
  $('player-grid').onclick=e=>{const button=e.target.closest('button[data-number]');if(!button||!locked())return;const id=session.ids[session.index],before=cardProgress(makeCard(id,session.mode),session.marks);session=toggleSessionNumber(session,Number(button.dataset.number));persist();button.classList.toggle('marked',session.marks.includes(Number(button.dataset.number)));button.setAttribute('aria-pressed',String(session.marks.includes(Number(button.dataset.number))));tone(660,.08);const now=updateProgress();if(now.bingo&&!before.bingo){confetti();chime();toast('¡Bingo marcado! Avisa al anfitrión para verificarlo.');}else if(now.line&&!before.line)toast('¡Línea marcada! Avísale al anfitrión.');};
  $('player-menu').onclick=()=>{
    if(!locked())return;openModal(`<span class="modal-icon">🔒</span><h2>Cartones confirmados.</h2><p>Juegas con ${session.ids.length} ${session.ids.length===1?'cartón':'cartones'} de ${session.mode} bolas. Se conservan aunque recargues o cierres la página.</p><div class="ticket-palette-row"><span>Color del cartón visible</span><div id="play-palette" class="ticket-palette" aria-label="Elegir color del cartón visible"></div></div><div class="settings-actions"><button id="share-active" class="secondary-button">Compartir el cartón visible ↗</button><button id="print-active" class="secondary-button">Imprimir el cartón visible</button><button id="end-player-session" class="secondary-button">Terminar mi participación</button></div>`);
    const repaintPalette=()=>{renderPlayer();palette($('play-palette'),session.ids[session.index],session.colors,repaintPalette);};palette($('play-palette'),session.ids[session.index],session.colors,repaintPalette);
    $('share-active').onclick=()=>showInvite(session.ids[session.index],session.mode);$('print-active').onclick=()=>{closeModal();window.print();};
    $('end-player-session').onclick=()=>{openModal('<span class="modal-icon">⚑</span><h2>¿Terminaste de jugar?</h2><p>Esto finaliza tu participación y borra las marcas de esta partida. No cambia ni interrumpe el sorteo del anfitrión.</p><div class="modal-actions"><button id="keep-session" class="secondary-button">Seguir jugando</button><button id="finish-session" class="dark-button">Terminar participación</button></div>');$('keep-session').onclick=closeModal;$('finish-session').onclick=()=>{session={...session,locked:false,marks:[]};draft={mode:session.mode,candidates:[],selected:[],cursor:0,choosing:true,colors:{}};persist();closeModal();location.hash='home';};};
  };
  function enter(hash){
    if(locked()){if(hash!=='play')history.replaceState(null,'','#play');renderPlayer();return 'play';}
    const shared=/^(?:play|card|card75)=([A-Fa-f0-9]{10})$/.exec(hash),invitation=/^cards=(75|90)$/.exec(hash);
    if(shared){const id=shared[1].toUpperCase(),mode=hash.startsWith('card75=')?75:90;if(draft.selected.length&&draft.mode!==mode){toast('Este cartón es de otra modalidad. Revisa tu selección antes de añadirlo.');}else{draft.mode=mode;if(!draft.candidates.includes(id))draft.candidates.push(id);draft.cursor=draft.candidates.indexOf(id);draft.choosing=true;}render();history.replaceState(null,'','#cards');return 'cards';}
    if(hash==='cards'||invitation||hash==='play'){if(invitation&&!draft.selected.length&&draft.mode!==Number(invitation[1]))draft={mode:Number(invitation[1]),candidates:[],selected:[],cursor:0,choosing:true,colors:{}};render();return 'cards';}
    return null;
  }
  return {enter,locked,renderPlayer};
}
