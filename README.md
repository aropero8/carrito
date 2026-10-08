# 🛒 Carrito


Lista de la compra organizada por supermercado.
App en React (Vite) preparada para empaquetar en Android con Capacitor.

## Qué hace
- **Inicio**: añade productos rápido eligiendo el supermercado con un toque, y ve cuántas cosas tienes pendientes en cada uno.
- **Pantalla de supermercado**: tu lista para esa tienda; marca lo que metes en el carro, mueve productos a otro súper (⇄), bórralos o vacía lo ya comprado.
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
capacitor.config.json   configuración de la app Android
android/                proyecto Android (generado por Capacitor)
```

## Tecnologías
React 18 · Vite · Capacitor 7
