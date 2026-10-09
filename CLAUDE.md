# CLAUDE.md — ToBuy (lista de la compra)

Contexto del proyecto para Claude Code. Léelo antes de tocar nada.

## Qué es
App personal de lista de la compra organizada **por supermercado**. El usuario elige a qué súper va y ve solo lo que tiene apuntado para ese sitio. Desde la pantalla inicial se pueden añadir productos rápido eligiendo el súper.

Objetivo final: **app Android** empaquetada con **Capacitor**. Uso personal; el repo es **público en GitHub** con licencia **GPL-3.0-or-later** (`LICENSE`), así que se mantiene ordenado y sin datos sensibles.

La app se llamaba «Carrito» y pasó a llamarse **ToBuy** (oct. 2026). Solo cambió el nombre visible: el `appId`/paquete Android sigue siendo `com.alberto.carrito` y la carpeta local sigue siendo `carrito`. El repo de GitHub se renombró de `carrito` a `tobuy` (GitHub redirige la dirección antigua). **No cambiar el `appId`**: Android la trataría como otra app y se perderían los datos guardados (localStorage va ligado a la app).

## Stack
- React 18 + Vite 6 (JavaScript, sin TypeScript)
- Capacitor 7 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `@capacitor/app` para el botón atrás, `@capacitor/status-bar` para la barra de estado)
- CSS plano en `src/App.css` (sin librerías de UI), con modo claro/oscuro vía `prefers-color-scheme`
- Sin backend: datos solo en el dispositivo

## Estructura
```
index.html               entrada Vite (viewport-fit=cover para notch/safe areas)
vite.config.js           base: './'  ← obligatorio para que funcione en el WebView de Capacitor
capacitor.config.json    appId com.alberto.carrito, appName ToBuy, webDir dist, config de StatusBar
.claude/launch.json      servidor de desarrollo para las vistas previas de Claude Code (puerto 5181)
src/main.jsx             monta <App/>
src/App.jsx              App (estado global) + HomeScreen + StoreScreen
src/storage.js           loadState/saveState en localStorage (clave 'lista-compra-v1'), uid(), supermercados por defecto
src/App.css              estilos
android/                 proyecto nativo generado por Capacitor (minSdk 23, targetSdk 35)
assets/icon-only.svg     diseño del icono (carrito blanco sobre #1f7a4d)
```

## Icono de la app
- **Android 8+ (adaptativo)**: `res/mipmap-anydpi-v26/ic_launcher*.xml` → fondo `@color/ic_launcher_background` (`#1F7A4D`, en `values/`) + primer plano vectorial `res/drawable-v24/ic_launcher_foreground.xml` (también capa `monochrome` para iconos temáticos). Es el mismo dibujo que el SVG, en sus coordenadas de 1024 con dos `group` de transformación; las ranuras de la cesta son huecos de un `clip-path`.
- **Android < 8**: PNG `mipmap-*/ic_launcher.png` y `ic_launcher_round.png`, generados desde `assets/icon-only.svg` con `npx @capacitor/assets@3.0.5 generate --android`. Después, **revertir `AndroidManifest.xml`** (la herramienta lo reformatea sin cambiar nada).
- **No poner `icon-foreground`/`icon-background` en `assets/`**: la herramienta generaría las capas adaptativas en PNG a tamaño de 48 dp (bug suyo: se ven borrosas) y sobrescribiría los XML de `mipmap-anydpi-v26`.
- Si se cambia el dibujo, cambiar el SVG **y** el vector. Ojo: en los comentarios de un SVG no puede haber `--` (rompe el XML y la herramienta lo ignora).
- El splash de Android ≤ 11 (`drawable*/splash.png`) sigue siendo el de la plantilla de Capacitor; en Android 12+ el sistema muestra el icono de la app.

## Modelo de datos
```js
state = {
  stores: [{ id, name, color }],                         // por defecto: Mercadona, Lidl, Carrefour (azul #004e9f), Dia
  items:  [{ id, name, qty, storeId, done, createdAt }]   // qty es texto libre ("2", "1 kg"...)
}
```
- Todo el estado vive en `App` y se persiste con un `useEffect` en cada cambio.
- Borrar un supermercado borra también sus productos (con `confirm`).
- Si se cambia la forma del estado, **subir la versión de la clave** (`lista-compra-v2`) y migrar los datos antiguos en `loadState`, para no perder la lista del usuario.
- Si solo cambia un **valor** guardado (no la forma), se migra en `migrateStores` (`storage.js`) sin subir la clave; debe ser idempotente porque se ejecuta en cada arranque. Ejemplo actual: un súper Carrefour (por id `carrefour` o por nombre) que siga con el rojo antiguo exacto `#c8102e` pasa a `#004e9f`; si tiene otro color, o es otro súper con ese rojo, no se toca.

## Navegación
No hay router. `currentStoreId` decide la pantalla (`null` = inicio). Abrir un súper hace `history.pushState({ store: id })` y el listener de `popstate` toma la pantalla de `e.state` (así funcionan atrás y adelante en el navegador).

**Botón atrás de Android**: el núcleo de Capacitor 7 no lo gestiona (sin plugin, atrás cierra la app siempre). Por eso se usa `@capacitor/app`: en `App` hay un listener de `backButton` que hace `history.back()` si `canGoBack` (→ `popstate` → inicio) y `App.exitApp()` si no (en el inicio, cierra la app). Ojo: si se quita ese listener, el plugin por defecto va atrás en el historial pero **en el inicio no hace nada**. Si se añaden más pantallas, que cada una haga `pushState` para que este esquema siga funcionando.

## Barra de estado (Android)
Configurada en `capacitor.config.json` → `plugins.StatusBar`: `style: "DARK"` (hora e iconos **en blanco**, porque todas las cabeceras tienen fondo de color y texto blanco) y `overlaysWebView: true` (la cabecera se dibuja detrás de la barra; su `padding-top` usa `env(safe-area-inset-top)`). El plugin lo aplica en nativo al arrancar y lo reaplica si cambia el tema del sistema, así que no hay código JS. Si alguna pantalla tuviera cabecera clara, habría que llamar a `StatusBar.setStyle({ style: Style.Light })` al entrar en ella y restaurar `Style.Dark` al salir.

## Funcionalidad actual
- Inicio: total de pendientes en la cabecera, añadido rápido (nombre + cantidad + chip de súper; el botón toma el color del súper elegido y el foco vuelve al campo para seguir añadiendo), tarjetas de supermercados con el número de pendientes y los primeros productos, añadir supermercado.
- Supermercado: cabecera y acentos con el color del súper, barra de progreso («X de Y en el carro»), añadir producto, marcar/desmarcar (casilla redonda propia; sección «En el carro»), mover a otro súper, borrar producto, quitar los comprados, borrar supermercado.
- Avisos (toast) abajo, gestionados en `App`: al añadir desde el inicio, al mover y al borrar. Borrar un producto y «Quitar de la lista» ofrecen **Deshacer** (~4,5 s): los productos vuelven ordenados por `createdAt`.
- Iconos: SVG en línea (`Icon` + `ICONS` en `App.jsx`), sin dependencias. El color del súper llega al CSS con la variable `--c`; los tonos derivados usan `color-mix()` (WebView ≥ 111).

## Comandos
```bash
npm install
npm run dev                       # probar en el navegador
npm run build                     # genera dist/
npx cap sync android              # tras cada build (copia dist/ y plugins a android/)
npx cap open android              # abre Android Studio
npm run android                   # build + sync + abrir
```
Compilar el APK desde terminal (sin Android Studio): `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`. Necesita JDK 21 y el SDK de Android: si no existe `android/local.properties` (no se versiona; lo crea Android Studio), definir `ANDROID_HOME` (en este equipo: `%LOCALAPPDATA%\Android\Sdk`).

## Estado / pendiente
- Verificado (oct. 2026): `npm install` y `npm run build` sin errores; probado en navegador a 380 px (añadido rápido, pantalla de súper, mover/borrar/vaciar, borrar súper, persistencia, modo claro/oscuro); `./gradlew assembleDebug` compila; probado en emulador Android (API 37): carga, safe areas y botón atrás (súper → inicio → cierra la app), barra de estado blanca en inicio y súper con el sistema en claro y en oscuro. Migración de Carrefour probada en navegador (datos antiguos, color personalizado, súper añadido a mano, instalación nueva).
- **Sin probar en Android ≤14** (solo hay imagen de API 37). Allí la cabecera detrás de la barra depende de que el WebView del sistema esté actualizado (≥140) para que `env(safe-area-inset-top)` funcione; si el título quedara bajo la barra, esa es la causa.
- Emulador sin ventana: `emulator -avd Medium_Phone_API_37.0 -no-window -no-snapshot-save`. Si hay un móvil conectado por USB, usar siempre `adb -s emulator-5554` para no instalar nada en él por error.
- Ideas posibles (no pedidas aún): reordenar productos, sugerencias de productos ya usados, editar nombre/color de un súper, `@capacitor/preferences` en lugar de localStorage, splash propio para Android ≤ 11, compartir la lista.

## Convenciones
- **Interfaz y textos en español.** Comentarios en español.
- Mantenerlo simple: sin dependencias nuevas salvo que aporten algo claro.
- Diseño mobile-first; probar a ~380 px de ancho; respetar `env(safe-area-inset-*)`.
- Commits pequeños con mensajes en español.

## Git / GitHub
- Rama `main`, repo público en GitHub: https://github.com/aropero8/tobuy (`origin`).
- Los commits usan el email noreply de GitHub (`user.email` configurado **solo en este repo**): la cuenta bloquea los push que exponen el email personal. No cambiarlo.
- `.gitattributes` fuerza LF en `android/gradlew` (y está marcado como ejecutable, `100755`).
- Ubicación local: `C:\Users\ALBERTO\Desktop\repos\carrito` (Windows).
- `.gitignore` excluye `node_modules`, `dist`, `.env*`, `.claude/settings.local.json` (ajustes personales; `.claude/launch.json` sí se sube) y los ficheros de firma de Android (`*.jks`, `*.keystore`, `keystore.properties`). **Nunca subir keystores ni secretos.**
- `android/` sí se versiona (Capacitor genera su propio `android/.gitignore`).
- Licencia GPL-3.0-or-later: texto oficial en `LICENSE`, campo `license` en `package.json` y aviso al final del `README.md`. Al ser público, se ve **todo el historial**: antes de cada push, comprobar que no entra nada sensible (keystores, `.env`, emails personales, contraseñas).
