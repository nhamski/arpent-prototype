const CACHE_KEY = 'arpent.plantnet';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function cached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function cache(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); }
  catch { /* quota */ }
}

export async function identifyPlant(imageFile) {
  const proxyBase = import.meta.env.VITE_PROXY_BASE;
  const apiKey = import.meta.env.VITE_PLANTNET_API_KEY;
  if (!proxyBase && !apiKey) return null;

  const formData = new FormData();
  formData.append('images', imageFile);
  formData.append('organs', 'leaf');

  try {
    const url = apiKey
      ? `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&include-related-images=false&lang=en`
      : `${proxyBase}/api/plantnet-identify`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseIdentification(data);
  } catch {
    return null;
  }
}

export function parseIdentification(raw) {
  if (!raw?.results?.length) return null;
  return raw.results.slice(0, 5).map((r) => ({
    scientificName: r.species?.scientificNameWithoutAuthor || '',
    commonNames: r.species?.commonNames || [],
    family: r.species?.family?.scientificName || '',
    score: r.score || 0,
    gbifId: r.gbif?.id || null,
  }));
}

export async function identifyFromUrl(imageUrl) {
  const cacheKey = `${CACHE_KEY}.url.${imageUrl}`;
  const hit = cached(cacheKey);
  if (hit) return hit;

  const proxyBase = import.meta.env.VITE_PROXY_BASE;
  const apiKey = import.meta.env.VITE_PLANTNET_API_KEY;
  if (!proxyBase && !apiKey) return null;

  try {
    const url = apiKey
      ? `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&images=${encodeURIComponent(imageUrl)}&organs=leaf&include-related-images=false&lang=en`
      : `${proxyBase}/api/plantnet-identify-url?image=${encodeURIComponent(imageUrl)}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const data = await res.json();
    const result = parseIdentification(data);
    if (result) cache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}
