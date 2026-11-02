# Bingo Bongo ✦

Bingo de **75 y 90 bolas**: el bombo en la computadora y hasta seis cartones confirmados en cada celular.

**Jugar:** https://joaqx3wa.github.io/Bingo-Bongo/

## El sorteo

Elige **Jugar bingo** y la modalidad antes de sacar la primera bola. Cada clic en **Girar el bombo** añade impulso: la jaula y sus pelotas siguen girando y frenan hasta detenerse. Luego una sola pelota sale por la ranura. La pelota grande se conserva sobre el fondo difuminado hasta hacer clic fuera, o pulsar Escape o Enter; después vuela al tablero. En modo automático, el siguiente turno se programa después de cerrar esa presentación.

El bombo contiene una partícula por cada número aún disponible. No repite bolas y conserva el sorteo al recargar. **Nueva partida** y **Reiniciar partida** están siempre a la vista encima del bombo. Nueva partida permite elegir 75 o 90 bolas. Reiniciar vacía el tablero y vuelve a llenar el bombo conservando la modalidad. Ambas acciones piden confirmar antes de borrar el sorteo. Al finalizar, el botón principal también permite iniciar otra partida. **Invitar** comparte un QR con la modalidad elegida. Los **efectos de sonido** están activados por defecto y se habilitan automáticamente con la primera interacción que permite el navegador. El botón **Efectos** los silencia o activa. **Voz** controla el narrador de números de forma independiente y comienza desactivado. Se guardan ambas preferencias en este navegador. Al confirmar **¡BINGO!**, aparece confeti y, si los efectos están activos, se reproduce una fanfarria; el navegador y el volumen del dispositivo deben permitir audio.

## Elegir y confirmar cartones

1. En **Sacar cartilla**, elige el formato del mismo sorteo: **90 bolas · 3 × 9** o **75 bolas · BINGO 5 × 5**.
2. Usa las flechas o **Cambiar cartón** para explorar candidatos.
3. Pulsa **Seleccionar cartón** cuando encuentres uno que te guste.
4. Pulsa **Añadir otro cartón** para buscar y seleccionar otro. Puedes elegir hasta seis. Antes de confirmar puedes revisar y quitar los seleccionados.
5. Pulsa **Confirmar y jugar** y confirma el conjunto. Esos cartones quedan bloqueados durante la participación y se guardan al recargar o cerrar el navegador. No es posible añadir, sustituir o quitar cartones mientras la participación esté activa.

En la pantalla de juego, alterna entre tus cartones mediante las pestañas numeradas o las flechas. Al marcar o desmarcar un número, se aplica a **todos los cartones confirmados que tengan ese número**. La vista de juego se gira mediante CSS si el dispositivo está vertical, manteniendo el diseño horizontal sin depender del bloqueo de orientación del sistema.

El menú ⋯ permite compartir o imprimir el cartón visible. **Terminar mi participación** requiere confirmación, finaliza ese conjunto y limpia sus marcas para preparar una participación nueva. No interrumpe el sorteo del anfitrión.

## Formatos y premios

- **90 bolas:** tres filas, nueve columnas y quince números únicos; cinco números por fila y al menos uno por columna. Rangos 1–9, 10–19, …, 80–90. Línea: una fila completa. Bingo: los quince números.
- **75 bolas:** cinco filas y cinco columnas con cabecera B I N G O. Rangos 1–15, 16–30, 31–45, 46–60, 61–75. Centro libre y veinticuatro números únicos. Se detectan filas, columnas y diagonales completas como línea. El verificador de bingo completo exige los veinticuatro números.

El anfitrión comprueba el código de diez caracteres del cartón con la misma modalidad. Los cartones son reproducibles a partir del código; el código no es un registro de entrega ni un mecanismo antifraude. Los cartones de 90 bolas generados individualmente no forman una tira de seis con cobertura garantizada de los noventa números.

**Los dispositivos no se sincronizan en vivo.** Los jugadores siguen el sorteo de la pantalla principal y marcan manualmente. El bloqueo y las marcas compartidas corresponden a los cartones de ese navegador. El anfitrión finaliza su sorteo y cada jugador termina su participación desde su propio menú para preparar la siguiente.

## Instalar y jugar sin conexión

No hay un botón de instalación dentro de la página. Se conserva el manifiesto, los iconos y el service worker para instalarla desde el **menú del navegador**. En iPhone: **Safari → Compartir → Añadir a pantalla de inicio**. La opción exacta depende del navegador.

Después de una carga completa, los recursos necesarios se guardan para funcionar sin conexión. Los QR se comparten desde la dirección publicada. Los datos se conservan en el almacenamiento local y se pierden al borrar los datos del navegador.

## Publicación y desarrollo

Es una web estática sin claves, cuentas ni base de datos. GitHub Pages publica `main` desde la raíz. Todos los recursos usan rutas relativas bajo `/Bingo-Bongo/`.

Con Node.js 20 o posterior, sin instalar dependencias:

```sh
node server.mjs
node --test tests/*.test.mjs
```

Abre `http://localhost:4173`. Las pruebas cubren 10.000 cartones de 90 bolas, 3.000 de 75 bolas, sorteos sin repeticiones, conservación de pelotas, acumulación y frenado del giro, sesiones confirmadas, marcas comunes, premios, iconos y recursos sin conexión.

Las tipografías y los sonidos son locales. No hay analítica. El generador QR se incluye en `vendor/` bajo licencia MIT. El service worker limita su caché a esta aplicación y respeta otros sitios del mismo dominio. Se respeta la preferencia de movimiento reducido: las partículas se muestran sin movimiento y el confeti como decoración estática.
