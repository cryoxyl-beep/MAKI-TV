export function safeSetItem(key: string, value: string): void {
  try {
    enforceCacheLimits();
    localStorage.setItem(key, value);
  } catch (e) {
    if (isQuotaExceeded(e)) {
      evictCacheEntries();
      try {
        localStorage.setItem(key, value);
      } catch (retryError) {
        console.warn('Failed to set localStorage item even after eviction:', key);
      }
    } else {
      console.warn('Error setting localStorage item:', e);
    }
  }
}

function isQuotaExceeded(e: any): boolean {
  let quotaExceeded = false;
  if (e) {
    if (e.code) {
      if (e.code === 22 || e.code === 1014) {
        quotaExceeded = true;
      }
    } else if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      quotaExceeded = true;
    }
  }
  return quotaExceeded;
}

const JIKAN_TTL = 24 * 60 * 60 * 1000;
const ANIVEXA_TTL = 7 * 24 * 60 * 60 * 1000;

export function enforceCacheLimits() {
  const now = Date.now();
  let jikanKeys: {key: string, time: number}[] = [];
  let anivexaKeys: {key: string, time: number}[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (key.startsWith('jikan_cache_')) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && parsed.timestamp && now - parsed.timestamp > JIKAN_TTL) {
            localStorage.removeItem(key);
            i--; // adjust index since we removed
          } else {
            jikanKeys.push({ key, time: parsed?.timestamp || 0 });
          }
        }
      } catch (e) {
        localStorage.removeItem(key);
        i--;
      }
    } else if (key.startsWith('anivexa_episodes_')) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed && parsed.timestamp && now - parsed.timestamp > ANIVEXA_TTL) {
            localStorage.removeItem(key);
            i--;
          } else {
            anivexaKeys.push({ key, time: parsed?.timestamp || 0 });
          }
        }
      } catch(e) {
        localStorage.removeItem(key);
        i--;
      }
    }
  }

  // enforce capacity 50 for jikan
  if (jikanKeys.length > 50) {
    jikanKeys.sort((a, b) => a.time - b.time);
    const toRemove = jikanKeys.slice(0, jikanKeys.length - 50);
    toRemove.forEach(r => localStorage.removeItem(r.key));
  }

  // enforce capacity 25 for anivexa
  if (anivexaKeys.length > 25) {
    anivexaKeys.sort((a, b) => a.time - b.time);
    const toRemove = anivexaKeys.slice(0, anivexaKeys.length - 25);
    toRemove.forEach(r => localStorage.removeItem(r.key));
  }
}

function evictCacheEntries() {
  const now = Date.now();
  let jikanKeys: {key: string, time: number}[] = [];
  let anivexaKeys: {key: string, time: number}[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (key.startsWith('jikan_cache_')) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          jikanKeys.push({ key, time: parsed?.timestamp || 0 });
        }
      } catch (e) {
        localStorage.removeItem(key);
      }
    } else if (key.startsWith('anivexa_episodes_')) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          anivexaKeys.push({ key, time: parsed?.timestamp || 0 });
        }
      } catch(e) {
        localStorage.removeItem(key);
      }
    }
  }

  // Delete oldest jikan first (e.g., top 10 oldest)
  if (jikanKeys.length > 0) {
    jikanKeys.sort((a, b) => a.time - b.time);
    const toRemove = jikanKeys.slice(0, Math.max(1, Math.floor(jikanKeys.length / 2)));
    toRemove.forEach(r => localStorage.removeItem(r.key));
    return;
  }

  // If no jikan, delete oldest anivexa
  if (anivexaKeys.length > 0) {
    anivexaKeys.sort((a, b) => a.time - b.time);
    const toRemove = anivexaKeys.slice(0, Math.max(1, Math.floor(anivexaKeys.length / 2)));
    toRemove.forEach(r => localStorage.removeItem(r.key));
    return;
  }
}
