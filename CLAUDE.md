# CLAUDE.md — Carrito (lista de la compra)

Contexto del proyecto para Claude Code. Léelo antes de tocar nada.

## Qué es
App personal de lista de la compra organizada **por supermercado**. El usuario elige a qué súper va y ve solo lo que tiene apuntado para ese sitio. Desde la pantalla inicial se pueden añadir productos rápido eligiendo el súper.

Objetivo final: **app Android** empaquetada con **Capacitor**. Uso personal; el repo es **privado en GitHub**, pero se mantiene ordenado por si en el futuro se comparte o se hace público.

## Stack
- React 18 + Vite 6 (JavaScript, sin TypeScript)
- Capacitor 7 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)
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
No hay router. `currentStoreId` decide la pantalla (`null` = inicio). Se usa `history.pushState`/`popstate` para que el **botón atrás de Android** vuelva al inicio en vez de cerrar la app. Si se añaden más pantallas, mantener este comportamiento (o usar `@capacitor/app` y su evento `backButton`).

## Funcionalidad actual
- Inicio: añadido rápido (nombre + cantidad + chip de súper), tarjetas de supermercados con el número de pendientes, añadir supermercado.
- Supermercado: añadir producto, marcar/desmarcar (sección «En el carro»), mover a otro súper (⇄), borrar producto, vaciar comprados, borrar supermercado.

## Comandos
```bash
npm install
npm run dev                       # probar en el navegador
npm run build                     # genera dist/
npx cap add android               # solo la primera vez (crea android/)
npx cap sync android              # tras cada build
npx cap open android              # abre Android Studio
npm run android                   # build + sync + abrir
```

## Estado / pendiente
- El código se escribió **sin poder ejecutar `npm install` ni compilar** (el entorno no tenía acceso a npm). Lo primero: `npm install && npm run build` y corregir lo que falle.
- La carpeta `android/` aún no existe; se crea con `npx cap add android`.
- Ideas posibles (no pedidas aún): reordenar productos, sugerencias de productos ya usados, editar nombre/color de un súper, `@capacitor/preferences` en lugar de localStorage, icono y splash de la app (`@capacitor/assets`), compartir la lista.

## Convenciones
- **Interfaz y textos en español.** Comentarios en español.
- Mantenerlo simple: sin dependencias nuevas salvo que aporten algo claro.
- Diseño mobile-first; probar a ~380 px de ancho; respetar `env(safe-area-inset-*)`.
- Commits pequeños con mensajes en español.

## Git / GitHub
- Rama `main`, repo privado en GitHub del usuario (nombre sugerido: `carrito`).
- Ubicación local: `C:\Users\ALBERTO\Desktop\repos\carrito` (Windows).
- `.gitignore` excluye `node_modules`, `dist`, `.env*`, y los ficheros de firma de Android (`*.jks`, `*.keystore`, `keystore.properties`). **Nunca subir keystores ni secretos.**
- `android/` sí se versiona (Capacitor genera su propio `android/.gitignore`).
- Sin licencia por ahora. Si se hace público, añadir `LICENSE` (MIT).
