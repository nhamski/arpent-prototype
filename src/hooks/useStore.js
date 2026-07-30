import { useCallback, useState } from 'react';

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(key, items) {
  try { localStorage.setItem(key, JSON.stringify(items)); }
  catch { /* quota */ }
}

export function useStore(key) {
  const [items, setItems] = useState(() => load(key));

  const persist = useCallback((fn) => {
    setItems((prev) => {
      const next = fn(prev);
      save(key, next);
      return next;
    });
  }, [key]);

  const add = useCallback((item) => {
    persist((prev) => [...prev, item]);
  }, [persist]);

  const update = useCallback((id, patch) => {
    persist((prev) => prev.map((i) => i.id === id ? { ...i, ...patch } : i));
  }, [persist]);

  const remove = useCallback((id) => {
    persist((prev) => prev.filter((i) => i.id !== id));
  }, [persist]);

  const clear = useCallback(() => {
    persist(() => []);
  }, [persist]);

  return { items, add, update, remove, clear };
}
