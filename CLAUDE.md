# CLAUDE.md — Carrito (lista de la compra)

Contexto del proyecto para Claude Code. Léelo antes de tocar nada.

## Qué es
App personal de lista de la compra organizada **por supermercado**. El usuario elige a qué súper va y ve solo lo que tiene apuntado para ese sitio. Desde la pantalla inicial se pueden añadir productos rápido eligiendo el súper.

Objetivo final: **app Android** empaquetada con **Capacitor**. Uso personal; el repo es **privado en GitHub**, pero se mantiene ordenado por si en el futuro se comparte o se hace público.

## Stack
- React 18 + Vite 6 (JavaScript, sin TypeScript)
- Capacitor 7 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `@capacitor/app` para el botón atrás)
- CSS plano en `src/App.css` (sin librerías de UI), con modo claro/oscuro vía `prefers-color-scheme`
- Sin backend: datos solo en el dispositivo

## Estructura
```
index.html               entrada Vite (viewport-fit=cover para notch/safe areas)
vite.config.js           base: './'  ← obligatorio para que funcione en el WebView de Capacitor
capacitor.config.json    appId com.alberto.carrito, appName Carrito, webDir dist
src/main.jsx             monta <App/>
src/App.jsx              App (estado global) + HomeScreen + StoreScreen
src/storage.js           loadState/saveState en localStorage (clave 'lista-compra-v1'), uid(), supermercados por defecto
src/App.css              estilos
android/                 proyecto nativo generado por Capacitor (minSdk 23, targetSdk 35)
```

## Modelo de datos
```js
state = {
  stores: [{ id, name, color }],                         // por defecto: Mercadona, Lidl, Carrefour, Dia
  items:  [{ id, name, qty, storeId, done, createdAt }]   // qty es texto libre ("2", "1 kg"...)
}
```
- Todo el estado vive en `App` y se persiste con un `useEffect` en cada cambio.
- Borrar un supermercado borra también sus productos (con `confirm`).
- Si se cambia la forma del estado, **subir la versión de la clave** (`lista-compra-v2`) y migrar los datos antiguos en `loadState`, para no perder la lista del usuario.

## Navegación
No hay router. `currentStoreId` decide la pantalla (`null` = inicio). Abrir un súper hace `history.pushState({ store: id })` y el listener de `popstate` toma la pantalla de `e.state` (así funcionan atrás y adelante en el navegador).

**Botón atrás de Android**: el núcleo de Capacitor 7 no lo gestiona (sin plugin, atrás cierra la app siempre). Por eso se usa `@capacitor/app`: en `App` hay un listener de `backButton` que hace `history.back()` si `canGoBack` (→ `popstate` → inicio) y `App.exitApp()` si no (en el inicio, cierra la app). Ojo: si se quita ese listener, el plugin por defecto va atrás en el historial pero **en el inicio no hace nada**. Si se añaden más pantallas, que cada una haga `pushState` para que este esquema siga funcionando.

## Funcionalidad actual
- Inicio: añadido rápido (nombre + cantidad + chip de súper), tarjetas de supermercados con el número de pendientes, añadir supermercado.
- Supermercado: añadir producto, marcar/desmarcar (sección «En el carro»), mover a otro súper (⇄), borrar producto, vaciar comprados, borrar supermercado.

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
- Verificado (oct. 2026): `npm install` y `npm run build` sin errores; probado en navegador a 380 px (añadido rápido, pantalla de súper, mover/borrar/vaciar, borrar súper, persistencia, modo claro/oscuro); `./gradlew assembleDebug` compila; probado en emulador Android (API 37): carga, safe areas y botón atrás (súper → inicio → cierra la app).
- Ideas posibles (no pedidas aún): reordenar productos, sugerencias de productos ya usados, editar nombre/color de un súper, `@capacitor/preferences` en lugar de localStorage, icono y splash de la app (`@capacitor/assets`), compartir la lista.

## Convenciones
- **Interfaz y textos en español.** Comentarios en español.
- Mantenerlo simple: sin dependencias nuevas salvo que aporten algo claro.
- Diseño mobile-first; probar a ~380 px de ancho; respetar `env(safe-area-inset-*)`.
- Commits pequeños con mensajes en español.

## Git / GitHub
- Rama `main`, repo privado en GitHub: https://github.com/aropero8/carrito (`origin`).
- Los commits usan el email noreply de GitHub (`user.email` configurado **solo en este repo**): la cuenta bloquea los push que exponen el email personal. No cambiarlo.
- `.gitattributes` fuerza LF en `android/gradlew` (y está marcado como ejecutable, `100755`).
- Ubicación local: `C:\Users\ALBERTO\Desktop\repos\carrito` (Windows).
- `.gitignore` excluye `node_modules`, `dist`, `.env*`, y los ficheros de firma de Android (`*.jks`, `*.keystore`, `keystore.properties`). **Nunca subir keystores ni secretos.**
- `android/` sí se versiona (Capacitor genera su propio `android/.gitignore`).
- Sin licencia por ahora. Si se hace público, añadir `LICENSE` (MIT).
