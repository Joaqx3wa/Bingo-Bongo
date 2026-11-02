# Bingo Bongo ✳

Bingo de **90 bolas** para reunirse: el sorteo en la computadora y los cartones en el celular. Diseño colorido, bombo animado, sonidos y mucha suerte.

## Cómo jugar

1. Abre **El sorteo** en la computadora y pulsa **Invitar a jugar**.
2. Cada jugador escanea el QR o abre el enlace en su celular. En **Mis cartones**, la máquina genera su primer cartón y permite añadir hasta 6.
3. El anfitrión pulsa **¡Girar el bombo!** o la barra espaciadora. También puede usar el sorteo automático con intervalos de 5, 8 o 12 segundos.
4. Los jugadores miran la pantalla principal o escuchan los números y los marcan manualmente en sus celulares.
5. Una fila completa es **línea**. Los 15 números del cartón son **bingo**. El anfitrión pulsa **¡BINGO!**, comprueba el código del cartón y confirma para finalizar.

Cada cartón tiene 3 filas, 9 columnas, 15 números únicos y 5 números por fila. Los números se ordenan de arriba abajo en sus columnas: 1–9, 10–19, …, 80–90. No se repiten bolas durante un sorteo.

## Funciones

- Bombo animado, sonidos sintetizados y anuncio de números en español cuando el navegador dispone de voz compatible. El sonido se activa con el botón ♫.
- Tablero de 90 números, última bola destacada e historial por salida o por número.
- Sorteo automático, pausa al cambiar de pestaña, pantalla completa y celebración al finalizar.
- Cartones reproducibles con código de 10 caracteres y enlace/QR individual.
- Marcas, cartones y sorteo conservados en el almacenamiento local del navegador.
- Impresión de cartones en papel. La impresión omite las marcas para reutilizarlos.
- Diseño adaptable a celulares, navegación por teclado y respeto por movimiento reducido.

**Los dispositivos no se sincronizan en tiempo real.** El anfitrión controla el sorteo en la pantalla compartida; cada persona marca su propio cartón. El botón de bingo del anfitrión finaliza esa partida. Al iniciar otra, cada jugador debe limpiar sus marcas. Los cartones generados al azar no son una tira de seis con cobertura garantizada de los 90 números. Los códigos sirven para verificar números; no son un sistema antifraude ni un registro de quién recibió cada cartón.

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

Las pruebas validan 10.000 cartones, el sorteo completo sin repeticiones, los premios y la recuperación de estado válido.

## Privacidad y dependencias

No hay cuentas, analítica ni servidor de juego. Los datos se almacenan en este navegador y se pierden al borrar sus datos. Compartir un cartón comparte sus números, pero no sus marcas. Google Fonts carga las tipografías; si no está disponible, se usan fuentes del sistema. El generador QR se incluye localmente en `vendor/` bajo licencia MIT, incluida junto al archivo.
