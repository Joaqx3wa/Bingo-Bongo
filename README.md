# Bingo Bongo ✳

Bingo de **90 bolas** para reunirse: el sorteo en la computadora y el cartón en el celular. Colores del arcoíris, pelotas con relieve, un bombo con 90 partículas y pantallas de juego sin desplazamiento.

**Jugar:** https://joaqx3wa.github.io/Bingo-Bongo/

## Cómo jugar

1. En el inicio, elige **Jugar bingo** en la computadora. Pulsa **Invitar** para mostrar el QR.
2. Cada jugador elige **Sacar cartilla** en su celular. Puede generar hasta 6 cartones y elegir uno. **Jugar con este cartón** abre únicamente el cartón seleccionado, grande y con el logo en una esquina.
3. El anfitrión pulsa **¡Girar el bombo!** o la barra espaciadora. También puede usar el sorteo automático con intervalos de 5, 8 o 12 segundos.
4. Los jugadores miran la pantalla principal o escuchan los números y los marcan manualmente en sus celulares.
5. Una fila completa es **línea**. Los 15 números del cartón son **bingo**. El anfitrión pulsa **¡BINGO!**, comprueba el código del cartón y confirma para finalizar.

Cada cartón tiene 3 filas, 9 columnas, 15 números únicos y 5 números por fila. Los números se ordenan de arriba abajo en sus columnas: 1–9, 10–19, …, 80–90. No se repiten bolas durante un sorteo.

## Funciones

- Bombo de jaula con manivela, 90 pelotas individuales, gravedad, rebotes, mezcla y salida de una pelota por extracción. El número de pelotas disminuye con el sorteo.
- Cada bola extraída aparece grande sobre un fondo difuminado y después se desplaza a su lugar en el tablero de pelotas. Última bola destacada e historial por orden de salida.
- Sonidos sintetizados y anuncio de números en español cuando el navegador dispone de voz compatible. El sonido se activa con el botón ♫.
- Sorteo automático, pausa al cambiar de pestaña, pantalla completa y celebración al finalizar.
- Cartones reproducibles con código de 10 caracteres y enlace/QR individual.
- Marcas, cartones y sorteo conservados en el almacenamiento local del navegador.
- Impresión del cartón elegido desde el menú ⋯ de la selección. La impresión omite las marcas para reutilizarlo.
- Inicio, selector y cartón a pantalla completa; diseño para celular vertical, horizontal y computadora, navegación por teclado y respeto por movimiento reducido.
- App instalable con manifiesto, iconos y service worker. Recursos guardados para jugar sin conexión después de la primera carga completa.

**Los dispositivos no se sincronizan en tiempo real.** El anfitrión controla el sorteo en la pantalla compartida; cada persona marca su propio cartón. El botón de bingo del anfitrión finaliza esa partida. Al iniciar otra, cada jugador debe limpiar sus marcas. Los cartones generados al azar no son una tira de seis con cobertura garantizada de los 90 números. Los códigos sirven para verificar números; no son un sistema antifraude ni un registro de quién recibió cada cartón.

## Instalar en el celular

Pulsa **Instalar app**. En navegadores compatibles se abre el diálogo nativo cuando está disponible. En los demás se muestran los pasos para instalarla desde el menú. En iPhone, abre en Safari, toca **Compartir → Añadir a pantalla de inicio**. La instalación final requiere la acción del usuario en su navegador.

La app instalada abre sin la barra del navegador. El soporte y la opción exacta dependen del navegador. Para compartir invitaciones con otros dispositivos necesitas la dirección publicada; jugar y marcar funcionan sin conexión una vez almacenados los recursos. Los datos conservan el almacenamiento local del navegador correspondiente.

## Publicar en GitHub Pages

Es una web estática: no requiere servidor, claves ni base de datos.

1. En el repositorio, abre **Settings → Pages**.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Selecciona **main** y **/ (root)** y guarda.
4. GitHub mostrará la dirección publicada, normalmente `https://joaqx3wa.github.io/Bingo-Bongo/`.

Los archivos usan rutas relativas y funcionan bajo el subdirectorio del repositorio. Los QR usan la dirección desde la que se abre la web; compártelos desde la página publicada.

## Desarrollo

Requiere Node.js 20 o posterior, sin instalar dependencias:

```sh
npm start
```

Abre `http://localhost:4173`. Para probar desde otro dispositivo en tu red, usa la IP local de la computadora y permite el puerto 4173 si tu firewall lo solicita. El enlace localhost solo funciona en la computadora que ejecuta el servidor.

```sh
npm test
```

Las pruebas validan 10.000 cartones, el sorteo completo sin repeticiones, los premios, la recuperación de estado, la conservación de partículas en el bombo, los iconos de instalación y los recursos sin conexión. También se revisan los recorridos de juego y el ajuste a pantallas pequeñas en el navegador.

## Privacidad y dependencias

No hay cuentas, analítica ni servidor de juego. Los datos se almacenan en este navegador y se pierden al borrar sus datos. Compartir un cartón comparte sus números, pero no sus marcas. Las tipografías son del sistema y todos los recursos necesarios están en el repositorio. El generador QR se incluye localmente en `vendor/` bajo licencia MIT, incluida junto al archivo. El service worker limita su caché a esta aplicación para no interferir con otros sitios del mismo dominio de GitHub Pages.
