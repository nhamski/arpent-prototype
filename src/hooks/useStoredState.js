import { useCallback, useState } from 'react';

export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try { localStorage.setItem(key, JSON.stringify(resolved)); }
        catch { /* quota or private mode */ }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
