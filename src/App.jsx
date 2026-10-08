import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { loadState, saveState, uid } from './storage.js';

const COLORS = ['#1f7a4d', '#0050aa', '#c8102e', '#e4002b', '#f39200', '#6b3fa0', '#008c95', '#5a5a5a'];

export default function App() {
  const [state, setState] = useState(loadState);
  const [currentStoreId, setCurrentStoreId] = useState(null);

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

  const openStore = (id) => {
    window.history.pushState({ store: id }, '');
    setCurrentStoreId(id);
  };
  const goHome = () => {
    if (window.history.state?.store) window.history.back();
    else setCurrentStoreId(null);
  };

  // ---- acciones ----
  const addItem = (name, storeId, qty = '') =>
    setState((s) => ({
      ...s,
      items: [...s.items, { id: uid(), name: name.trim(), qty: qty.trim(), storeId, done: false, createdAt: Date.now() }],
    }));

  const toggleItem = (id) =>
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)) }));

  const deleteItem = (id) => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));

  const moveItem = (id, storeId) =>
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, storeId } : i)) }));

  const clearDone = (storeId) =>
    setState((s) => ({ ...s, items: s.items.filter((i) => !(i.storeId === storeId && i.done)) }));

  const addStore = (name) =>
    setState((s) => ({
      ...s,
      stores: [...s.stores, { id: uid(), name: name.trim(), color: COLORS[s.stores.length % COLORS.length] }],
    }));

  const deleteStore = (id) =>
    setState((s) => ({ stores: s.stores.filter((st) => st.id !== id), items: s.items.filter((i) => i.storeId !== id) }));

  const store = state.stores.find((s) => s.id === currentStoreId);

  return store ? (
    <StoreScreen
      store={store}
      stores={state.stores}
      items={state.items.filter((i) => i.storeId === store.id)}
      onBack={goHome}
      onAdd={(name, qty) => addItem(name, store.id, qty)}
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
      onAddItem={addItem}
      onAddStore={addStore}
    />
  );
}

/* ---------------- Pantalla inicial ---------------- */
function HomeScreen({ stores, items, onOpenStore, onAddItem, onAddStore }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [storeId, setStoreId] = useState(stores[0]?.id ?? '');
  const [newStore, setNewStore] = useState('');
  const [showNewStore, setShowNewStore] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    if (!stores.some((s) => s.id === storeId)) setStoreId(stores[0]?.id ?? '');
  }, [stores, storeId]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !storeId) return;
    onAddItem(name, storeId, qty);
    const st = stores.find((s) => s.id === storeId);
    setFlash(`«${name.trim()}» añadido a ${st?.name}`);
    setTimeout(() => setFlash(''), 1800);
    setName('');
    setQty('');
  };

  const submitStore = (e) => {
    e.preventDefault();
    if (!newStore.trim()) return;
    onAddStore(newStore);
    setNewStore('');
    setShowNewStore(false);
  };

  const pending = (id) => items.filter((i) => i.storeId === id && !i.done).length;

  return (
    <div className="screen">
      <header className="topbar">
        <h1>🛒 Carrito</h1>
      </header>

      <section className="card">
        <h2>Añadir rápido</h2>
        <form onSubmit={submit} className="quick-add">
          <input
            className="grow"
            placeholder="¿Qué necesitas? (p. ej. leche)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input className="qty" placeholder="Cant." value={qty} onChange={(e) => setQty(e.target.value)} />
          <div className="chips">
            {stores.map((s) => (
              <button
                type="button"
                key={s.id}
                className={'chip' + (s.id === storeId ? ' active' : '')}
                style={{ '--c': s.color }}
                onClick={() => setStoreId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button className="primary" type="submit" disabled={!name.trim() || !storeId}>
            Añadir
          </button>
        </form>
        {flash && <p className="flash">{flash}</p>}
      </section>

      <h2 className="section-title">¿Dónde vas a comprar?</h2>
      <div className="stores">
        {stores.map((s) => (
          <button key={s.id} className="store-card" style={{ '--c': s.color }} onClick={() => onOpenStore(s.id)}>
            <span className="store-name">{s.name}</span>
            <span className="badge">{pending(s.id)}</span>
          </button>
        ))}
        {showNewStore ? (
          <form onSubmit={submitStore} className="store-card new">
            <input autoFocus placeholder="Nombre" value={newStore} onChange={(e) => setNewStore(e.target.value)} />
            <button className="primary small" type="submit">OK</button>
          </form>
        ) : (
          <button className="store-card add" onClick={() => setShowNewStore(true)}>
            + Supermercado
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Pantalla de un supermercado ---------------- */
function StoreScreen({ store, stores, items, onBack, onAdd, onToggle, onDelete, onMove, onClearDone, onDeleteStore }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [movingId, setMovingId] = useState(null);

  const todo = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name, qty);
    setName('');
    setQty('');
  };

  const renderItem = (i) => (
    <li key={i.id} className={'item' + (i.done ? ' done' : '')}>
      <label>
        <input type="checkbox" checked={i.done} onChange={() => onToggle(i.id)} />
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
          <button className="icon" title="Mover a otro súper" onClick={() => setMovingId(i.id)}>⇄</button>
          <button className="icon" title="Borrar" onClick={() => onDelete(i.id)}>✕</button>
        </>
      )}
    </li>
  );

  return (
    <div className="screen">
      <header className="topbar" style={{ background: store.color }}>
        <button className="back" onClick={onBack}>‹</button>
        <h1>{store.name}</h1>
        <button className="icon light" title="Borrar supermercado" onClick={onDeleteStore}>🗑</button>
      </header>

      <form onSubmit={submit} className="card quick-add row">
        <input className="grow" placeholder="Añadir producto…" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="qty" placeholder="Cant." value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="primary" type="submit" disabled={!name.trim()}>+</button>
      </form>

      {items.length === 0 && <p className="empty">No tienes nada apuntado para {store.name}.</p>}

      {todo.length > 0 && <ul className="list">{todo.map(renderItem)}</ul>}

      {done.length > 0 && (
        <>
          <div className="done-header">
            <h2 className="section-title">En el carro ({done.length})</h2>
            <button className="link" onClick={onClearDone}>Vaciar</button>
          </div>
          <ul className="list">{done.map(renderItem)}</ul>
        </>
      )}
    </div>
  );
}
