import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSearchHistory(screenKey: string, maxItems = 10) {
  const [history, setHistory] = useState<string[]>([]);
  const storageKey = `@sb_sh_${screenKey}`;

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(raw => {
      if (raw) setHistory(JSON.parse(raw));
    }).catch(() => {});
  }, [storageKey]);

  const persist = useCallback((updated: string[]) => {
    AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
  }, [storageKey]);

  const addToHistory = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setHistory(prev => {
      const updated = [t, ...prev.filter(s => s !== t)].slice(0, maxItems);
      persist(updated);
      return updated;
    });
  }, [persist, maxItems]);

  const removeFromHistory = useCallback((term: string) => {
    setHistory(prev => {
      const updated = prev.filter(s => s !== term);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(storageKey).catch(() => {});
  }, [storageKey]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
