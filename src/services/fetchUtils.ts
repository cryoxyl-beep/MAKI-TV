const jikanCache = new Map<string, { data: any; timestamp: number }>();
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 350; // Jikan 3 requests/sec limit
let requestPromise = Promise.resolve();

async function throttleJikanRequest() {
  const previousPromise = requestPromise;
  
  let resolveCurrent!: () => void;
  requestPromise = new Promise(resolve => {
    resolveCurrent = resolve;
  });

  await previousPromise;
  
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_GAP_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_GAP_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();
  resolveCurrent();
}

export async function fetchJikan(url: string, retries = 0, delay = 1000): Promise<any> {
  // Check memory cache first (15 min cache)
  const cached = jikanCache.get(url);
  if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
    return cached.data;
  }

  for (let i = 0; i <= retries; i++) {
    try {
      await throttleJikanRequest();
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();
        jikanCache.set(url, { data: json, timestamp: Date.now() });
        return json;
      }
      if (response.status === 429 || response.status >= 500) {
        console.warn(`Jikan API failed with status ${response.status} on ${url}. Retrying (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      return await response.json();
    } catch (error) {
      if (i === retries) {
        console.error(`Jikan API error on ${url}:`, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  return null;
}

