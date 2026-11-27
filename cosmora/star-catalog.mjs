export function validateStarCatalog(payload) {
  if (payload?.schema !== 1 || !Array.isArray(payload.stars) || payload.stars.length === 0) {
    throw new TypeError('Geçersiz yıldız kataloğu biçimi');
  }
  const seen = new Set();
  return payload.stars.map(star => {
    if (!star || !Number.isSafeInteger(star.hip) || star.hip < 1 || seen.has(star.hip) ||
        !Number.isFinite(star.ra) || star.ra < 0 || star.ra >= 24 ||
        !Number.isFinite(star.dec) || Math.abs(star.dec) > 90 ||
        !Number.isFinite(star.magnitude) ||
        (star.ci != null && !Number.isFinite(star.ci))) {
      throw new TypeError('Geçersiz veya yinelenen HIP kaydı');
    }
    seen.add(star.hip);
    return {
      hip: star.hip,
      ra: star.ra,
      dec: star.dec,
      magnitude: star.magnitude,
      distancePc: star.distancePc ?? null, spectrum: star.spectrum ?? null,
      ci: star.ci ?? null,
      name: typeof star.name === 'string' && star.name.trim() ? star.name.trim() : `HIP ${star.hip}`
    };
  });
}

export async function loadStarCatalog(url, fallback, request = fetch) {
  try {
    const response = await request(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const imported = validateStarCatalog(await response.json());
    const merged = new Map(fallback.map(star => [star.hip, star]));
    for (const star of imported) merged.set(star.hip, star);
    return [...merged.values()].sort((a, b) => a.magnitude - b.magnitude);
  } catch (error) {
    if (error?.message !== 'HTTP 404') {
      console.warn('Yerel yıldız kataloğu yüklenemedi:', error);
      globalThis.dispatchEvent?.(new Event('cosmora-catalog-fallback'));
    }
    return fallback;
  }
}
