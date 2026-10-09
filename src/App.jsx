import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { loadState, saveState, uid } from './storage.js';
import { parseVoice } from './parseVoice.js';
import { listen, stopListening, voiceAvailable } from './voice.js';

const COLORS = ['#1f7a4d', '#0050aa', '#c8102e', '#e4002b', '#f39200', '#6b3fa0', '#008c95', '#5a5a5a'];

export default function App() {
  const [state, setState] = useState(loadState);
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [toast, setToast] = useState(null); // { id, text, onUndo? }
  const toastTimer = useRef(null);

  useEffect(() => saveState(state), [state]);

  // Navegación con el historial: la pantalla sale de history.state (atrás/adelante del navegador)
  useEffect(() => {
    const onPop = (e) => setCurrentStoreId(e.state?.store ?? null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Botón "atrás" de Android: Capacitor no lo gestiona por sí solo (sin esto cerraría la app).
  // Si hay historial vuelve atrás (→ popstate → inicio); si estamos en el inicio, cierra la app.
  useEffect(() => {
    const handle = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else CapacitorApp.exitApp();
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  // Aviso temporal en la parte de abajo, con botón «Deshacer» opcional
  const showToast = (text, onUndo) => {
    clearTimeout(toastTimer.current);
    setToast({ id: uid(), text, onUndo });
    toastTimer.current = setTimeout(() => setToast(null), onUndo ? 4500 : 2000);
  };
  const hideToast = () => {
    clearTimeout(toastTimer.current);
    setToast(null);
  };

  const openStore = (id) => {
    window.history.pushState({ store: id }, '');
    setCurrentStoreId(id);
    hideToast();
  };
  const goHome = () => {
    if (window.history.state?.store) window.history.back();
    else setCurrentStoreId(null);
  };

  // ---- acciones ----
  const addItem = (name, storeId, qty = '') => {
    const id = uid();
    setState((s) => ({
      ...s,
      items: [...s.items, { id, name: name.trim(), qty: qty.trim(), storeId, done: false, createdAt: Date.now() }],
    }));
    return id;
  };

  // Dictado por voz: se apunta directamente y se ofrece deshacer por si se ha entendido mal
  const addVoiceItem = ({ name, qty }, storeId) => {
    const id = addItem(name, storeId, qty);
    const st = state.stores.find((s) => s.id === storeId);
    const where = storeId === currentStoreId ? '' : ` a ${st?.name}`;
    showToast(`«${name}»${qty ? ` (${qty})` : ''} añadido${where}`, () =>
      setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }))
    );
  };

  const toggleItem = (id) =>
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) }));

  // Quita productos y ofrece deshacer: se vuelven a meter en su sitio (orden por fecha de creación)
  const removeItems = (removed, text) => {
    if (removed.length === 0) return;
    const ids = new Set(removed.map((i) => i.id));
    setState((s) => ({ ...s, items: s.items.filter((i) => !ids.has(i.id)) }));
    showToast(text, () =>
      setState((s) => {
        const storeIds = new Set(s.stores.map((st) => st.id));
        const back = removed.filter((i) => storeIds.has(i.storeId) && !s.items.some((x) => x.id === i.id));
        return { ...s, items: [...s.items, ...back].sort((a, b) => a.createdAt - b.createdAt) };
      })
    );
  };

  const deleteItem = (id) => {
    const item = state.items.find((i) => i.id === id);
    if (item) removeItems([item], `«${item.name}» borrado`);
  };

  const moveItem = (id, storeId) => {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, storeId } : i)) }));
    const st = state.stores.find((s) => s.id === storeId);
    showToast(`Movido a ${st?.name}`);
  };

  const clearDone = (storeId) => {
    const removed = state.items.filter((i) => i.storeId === storeId && i.done);
    removeItems(removed, removed.length === 1 ? '1 producto quitado' : `${removed.length} productos quitados`);
  };

  const addStore = (name) =>
    setState((s) => ({
      ...s,
      stores: [...s.stores, { id: uid(), name: name.trim(), color: COLORS[s.stores.length % COLORS.length] }],
    }));

  const deleteStore = (id) =>
    setState((s) => ({ stores: s.stores.filter((st) => st.id !== id), items: s.items.filter((i) => i.storeId !== id) }));

  const store = state.stores.find((s) => s.id === currentStoreId);

  return (
    <>
      {store ? (
        <StoreScreen
          store={store}
          stores={state.stores}
          items={state.items.filter((i) => i.storeId === store.id)}
          onBack={goHome}
          onAdd={(name, qty) => addItem(name, store.id, qty)}
          onVoiceAdd={addVoiceItem}
          onNotice={showToast}
          onToggle={toggleItem}
          onDelete={deleteItem}
          onMove={moveItem}
          onClearDone={() => clearDone(store.id)}
          onDeleteStore={() => {
            if (confirm(`¿Borrar ${store.name} y todos sus productos?`)) {
              deleteStore(store.id);
              goHome();
            }
          }}
        />
      ) : (
        <HomeScreen
          stores={state.stores}
          items={state.items}
          onOpenStore={openStore}
          onAddItem={(name, storeId, qty) => {
            addItem(name, storeId, qty);
            const st = state.stores.find((s) => s.id === storeId);
            showToast(`«${name.trim()}» añadido a ${st?.name}`);
          }}
          onVoiceAdd={addVoiceItem}
          onNotice={showToast}
          onAddStore={addStore}
        />
      )}
      {toast && (
        <div className="toast" key={toast.id} role="status">
          <span>{toast.text}</span>
          {toast.onUndo && (
            <button
              className="toast-action"
              onClick={() => {
                toast.onUndo();
                hideToast();
              }}
            >
              Deshacer
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- Iconos (SVG en línea, heredan el color del texto) ---------------- */
const Icon = ({ d, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONS = {
  back: 'M15 18l-6-6 6-6',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  move: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  close: 'M6 6l12 12M18 6L6 18',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  mic: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3',
};

/* ---------------- Campo de producto con micrófono ---------------- */
// El micrófono solo aparece si hay reconocimiento de voz. Pulsarlo mientras escucha termina antes.
function VoiceField({ inputRef, placeholder, value, onChange, onVoice, onNotice }) {
  const [available, setAvailable] = useState(false);
  const [listening, setListening] = useState(false);
  const session = useRef(null); // escucha en curso: { stopped, gone }

  useEffect(() => {
    let alive = true;
    voiceAvailable().then((ok) => alive && setAvailable(ok));
    return () => {
      alive = false;
      // Si se sale de la pantalla mientras escucha, se descarta lo que llegue
      if (session.current) {
        session.current.gone = true;
        stopListening();
      }
    };
  }, []);

  const toggle = async () => {
    if (session.current) {
      session.current.stopped = true;
      stopListening();
      return;
    }
    const s = (session.current = {});
    setListening(true);
    try {
      const matches = await listen();
      if (!s.gone) onVoice(matches);
    } catch (e) {
      // Si lo ha parado el usuario sin llegar a decir nada, no hace falta avisar
      if (!s.gone && !s.stopped) onNotice(e.message);
    } finally {
      session.current = null;
      if (!s.gone) setListening(false);
    }
  };

  return (
    <div className="voice-field grow">
      <input
        ref={inputRef}
        placeholder={listening ? 'Escuchando…' : placeholder}
        enterKeyHint="done"
        value={value}
        onChange={onChange}
      />
      {available && (
        <button
          type="button"
          className={'mic' + (listening ? ' listening' : '')}
          title={listening ? 'Dejar de escuchar' : 'Añadir por voz'}
          aria-label={listening ? 'Dejar de escuchar' : 'Añadir por voz'}
          onClick={toggle}
        >
          <Icon d={ICONS.mic} size={20} />
        </button>
      )}
    </div>
  );
}

/* ---------------- Pantalla inicial ---------------- */
function HomeScreen({ stores, items, onOpenStore, onAddItem, onVoiceAdd, onNotice, onAddStore }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [newStore, setNewStore] = useState('');
  const [showNewStore, setShowNewStore] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!stores.some((s) => s.id === storeId)) setStoreId(stores[0]?.id ?? '');
  }, [stores, storeId]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !storeId) return;
    onAddItem(name, storeId, qty);
    setName('');
    setQty('');
    nameRef.current?.focus(); // para seguir añadiendo sin volver a tocar el campo
  };

  // «queso carrefour» se apunta directamente; si no se ha dicho el súper, se deja escrito para elegirlo
  const onVoice = (matches) => {
    const v = parseVoice(matches, stores);
    if (!v.name) onNotice('No te he entendido. Prueba otra vez');
    else if (v.storeId) onVoiceAdd(v, v.storeId);
    else {
      setName(v.name);
      setQty(v.qty);
      onNotice('No he oído el súper: elige uno y pulsa Añadir');
    }
  };

  const submitStore = (e) => {
    e.preventDefault();
    if (!newStore.trim()) return;
    onAddStore(newStore);
    setNewStore('');
    setShowNewStore(false);
  };

  const pendingOf = (id) => items.filter((i) => i.storeId === id && !i.done);
  const totalPending = items.filter((i) => !i.done).length;
  const selected = stores.find((s) => s.id === storeId);

  return (
    <div className="screen">
      <header className="topbar home">
        <div className="title-block">
          <h1>ToBuy</h1>
          <p className="subtitle">
            {totalPending === 0
              ? 'No tienes nada pendiente'
              : totalPending === 1
                ? '1 producto pendiente'
                : `${totalPending} productos pendientes`}
          </p>
        </div>
      </header>

      <section className="card add-card" style={{ '--c': selected?.color }}>
        <form onSubmit={submit} className="quick-add">
          <div className="input-row">
            <VoiceField
              inputRef={nameRef}
              placeholder="¿Qué necesitas?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onVoice={onVoice}
              onNotice={onNotice}
            />
            <input className="qty" placeholder="Cant." value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="chips" role="radiogroup" aria-label="Supermercado">
            {stores.map((s) => (
              <button
                type="button"
                key={s.id}
                role="radio"
                aria-checked={s.id === storeId}
                className={'chip' + (s.id === storeId ? ' active' : '')}
                style={{ '--c': s.color }}
                onClick={() => setStoreId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button className="primary" type="submit" disabled={!name.trim() || !storeId}>
            {selected ? `Añadir a ${selected.name}` : 'Añadir'}
          </button>
        </form>
      </section>

      <h2 className="section-title">¿Dónde vas a comprar?</h2>
      <div className="stores">
        {stores.map((s) => {
          const pending = pendingOf(s.id);
          return (
            <button key={s.id} className="store-card" style={{ '--c': s.color }} onClick={() => onOpenStore(s.id)}>
              <span className="store-top">
                <span className="store-name">{s.name}</span>
                <span className={'badge' + (pending.length === 0 ? ' zero' : '')}>{pending.length}</span>
              </span>
              <span className="store-preview">
                {pending.length === 0
                  ? 'Todo listo'
                  : pending.slice(0, 3).map((i) => i.name).join(', ') + (pending.length > 3 ? '…' : '')}
              </span>
            </button>
          );
        })}
        {showNewStore ? (
          <form onSubmit={submitStore} className="store-card new">
            <input
              autoFocus
              placeholder="Nombre del súper"
              value={newStore}
              onChange={(e) => setNewStore(e.target.value)}
              onBlur={() => !newStore.trim() && setShowNewStore(false)}
            />
            <button className="primary small" type="submit" disabled={!newStore.trim()}>Crear</button>
          </form>
        ) : (
          <button className="store-card add" onClick={() => setShowNewStore(true)}>
            <Icon d={ICONS.plus} /> Supermercado
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Pantalla de un supermercado ---------------- */
function StoreScreen({
  store, stores, items, onBack, onAdd, onVoiceAdd, onNotice, onToggle, onDelete, onMove, onClearDone, onDeleteStore,
}) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [movingId, setMovingId] = useState(null);
  const nameRef = useRef(null);

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const progress = items.length ? done.length / items.length : 0;

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name, qty);
    setName('');
    setQty('');
    nameRef.current?.focus();
  };

  // Por voz se apunta en este súper, salvo que se nombre otro («queso carrefour»)
  const onVoice = (matches) => {
    const v = parseVoice(matches, stores);
    if (v.name) onVoiceAdd(v, v.storeId ?? store.id);
    else onNotice('No te he entendido. Prueba otra vez');
  };

  const renderItem = (i) => (
    <li key={i.id} className={'item' + (i.done ? ' done' : '')}>
      <label>
        <input type="checkbox" checked={i.done} onChange={() => onToggle(i.id)} />
        <span className="check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
        <span className="item-name">{i.name}</span>
        {i.qty && <span className="item-qty">{i.qty}</span>}
      </label>
      {movingId === i.id ? (
        <select
          autoFocus
          value={i.storeId}
          onChange={(e) => {
            onMove(i.id, e.target.value);
            setMovingId(null);
          }}
          onBlur={() => setMovingId(null)}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      ) : (
        <>
          <button className="icon" title="Mover a otro súper" aria-label="Mover a otro súper" onClick={() => setMovingId(i.id)}>
            <Icon d={ICONS.move} size={18} />
          </button>
          <button className="icon danger" title="Borrar" aria-label="Borrar" onClick={() => onDelete(i.id)}>
            <Icon d={ICONS.close} size={18} />
          </button>
        </>
      )}
    </li>
  );

  return (
    <div className="screen" style={{ '--c': store.color }}>
      <header className="topbar store">
        <button className="icon-btn" aria-label="Volver" onClick={onBack}>
          <Icon d={ICONS.back} size={26} />
        </button>
        <div className="title-block">
          <h1>{store.name}</h1>
          <p className="subtitle">
            {items.length === 0
              ? 'Lista vacía'
              : todo.length === 0
                ? '¡Todo en el carro!'
                : `${done.length} de ${items.length} en el carro`}
          </p>
        </div>
        <button className="icon-btn" title="Borrar supermercado" aria-label="Borrar supermercado" onClick={onDeleteStore}>
          <Icon d={ICONS.trash} />
        </button>
        {items.length > 0 && (
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </header>

      <form onSubmit={submit} className="card quick-add row">
        <VoiceField
          inputRef={nameRef}
          placeholder="Añadir producto…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onVoice={onVoice}
          onNotice={onNotice}
        />
        <input className="qty" placeholder="Cant." value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="primary round" type="submit" aria-label="Añadir" disabled={!name.trim()}>
          <Icon d={ICONS.plus} />
        </button>
      </form>

      {items.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🧺</div>
          <p>No tienes nada apuntado para {store.name}.</p>
        </div>
      )}

      {items.length > 0 && todo.length === 0 && (
        <div className="empty small">
          <div className="empty-icon">🎉</div>
          <p>¡Ya lo tienes todo!</p>
        </div>
      )}

      {todo.length > 0 && <ul className="list">{todo.map(renderItem)}</ul>}

      {done.length > 0 && (
        <>
          <div className="done-header">
            <h2 className="section-title">En el carro · {done.length}</h2>
            <button className="link" onClick={onClearDone}>Quitar de la lista</button>
          </div>
          <ul className="list">{done.map(renderItem)}</ul>
        </>
      )}
    </div>
  );
}
