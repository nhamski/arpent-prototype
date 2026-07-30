import { useCallback, useEffect, useState } from 'react';
import { fetchAllForZip, fetchMarketData, fetchLocalConditions } from '../data/dataHub.js';

export function useLiveData(zip) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!zip || zip.length < 5) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAllForZip(zip);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [zip]);

  useEffect(() => { refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMarketPrices() {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMarketData()
      .then((data) => { if (!cancelled) setPrices(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { prices, loading };
}

export function useConditions(zip) {
  const [conditions, setConditions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zip || zip.length < 5) return;
    let cancelled = false;
    setLoading(true);
    fetchLocalConditions(zip)
      .then((data) => { if (!cancelled) setConditions(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [zip]);

  return { conditions, loading };
}
