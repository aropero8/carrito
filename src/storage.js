// Guardado local. localStorage funciona dentro del WebView de Capacitor.
// Si más adelante quieres algo más robusto, cámbialo por @capacitor/preferences.
const KEY = 'lista-compra-v1';

const CARREFOUR_ROJO_ANTIGUO = '#c8102e';
const CARREFOUR_AZUL = '#004e9f';

const DEFAULT_STATE = {
  stores: [
    { id: 'mercadona', name: 'Mercadona', color: '#1f7a4d' },
    { id: 'lidl', name: 'Lidl', color: '#0050aa' },
    { id: 'carrefour', name: 'Carrefour', color: CARREFOUR_AZUL },
    { id: 'dia', name: 'Dia', color: '#e4002b' },
  ],
  items: [], // { id, name, qty, storeId, done, createdAt }
};

// Migraciones de valores guardados. No cambian la forma del estado, así que no hace falta subir la clave.
// Carrefour pasó del rojo antiguo al azul: solo se cambia si sigue con ese rojo exacto.
function migrateStores(stores) {
  return stores.map((s) =>
    (s.id === 'carrefour' || s.name?.trim().toLowerCase() === 'carrefour') &&
    s.color?.toLowerCase() === CARREFOUR_ROJO_ANTIGUO
      ? { ...s, color: CARREFOUR_AZUL }
      : s
  );
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { stores: migrateStores(parsed.stores ?? DEFAULT_STATE.stores), items: parsed.items ?? [] };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin espacio o almacenamiento bloqueado: se ignora */
  }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
