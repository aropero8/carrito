# 🛒 ToBuy


Lista de la compra organizada por supermercado.
App en React (Vite) preparada para empaquetar en Android con Capacitor.

## Qué hace
- **Inicio**: añade productos rápido eligiendo el supermercado con un toque, y ve cuántas cosas tienes pendientes en cada uno.
- **Pantalla de supermercado**: tu lista para esa tienda; marca lo que metes en el carro, mueve productos a otro súper, bórralos o quita lo ya comprado (con opción de deshacer).
- **Por voz**: pulsa el micrófono y di, por ejemplo, «queso Carrefour» o «2 kilos de naranjas en el Lidl», y se apunta solo.
- Puedes añadir o borrar supermercados. Todo se guarda en el móvil.

## Probar en el navegador
```bash
npm install
npm run dev
```

## Crear la app Android
Necesitas Android Studio instalado. El proyecto nativo ya está en `android/`.
```bash
npm install
npm run build
npx cap sync android
npx cap open android     # abre Android Studio → botón ▶ para instalarla en el móvil
```
Después de cambiar código: `npm run android` (build + sync + abrir Android Studio).

Para cambiar el identificador o el nombre de la app, edita `capacitor.config.json`.

## Estructura
```
src/
  App.jsx      pantallas (inicio y supermercado) y lógica
  App.css      estilos (modo claro y oscuro)
  storage.js   guardado local y supermercados por defecto
  voice.js     micrófono: reconocimiento de voz en Android y en el navegador
  parseVoice.js  frase dictada → producto, cantidad y súper
capacitor.config.json   configuración de la app Android
android/                proyecto Android (generado por Capacitor)
  …/VoicePlugin.java    plugin nativo de reconocimiento de voz
```

## Tecnologías
React 18 · Vite · Capacitor 7

## Licencia
Copyright (C) 2026 aropero8.

Este programa es software libre: puedes redistribuirlo y/o modificarlo bajo los términos de la [Licencia Pública General de GNU](LICENSE) (GPL) publicada por la Free Software Foundation, versión 3 o (a tu elección) cualquier versión posterior. Se distribuye SIN NINGUNA GARANTÍA.
