export interface FribbAnimeEntry {
  mal_id?: number;
  anilist_id?: number;
  [key: string]: any;
}

const FRIBB_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json";
const CACHE_KEY_DATA = "fribb_anime_map_data";
const CACHE_KEY_TIME = "fribb_anime_map_time";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

let lookupMap: Map<number, number> | null = null;
let isInitializing = false;

export async function initializeFribbMapping(): Promise<void> {
  if (lookupMap || isInitializing) return;
  isInitializing = true;

  try {
    const now = Date.now();
    const cachedTimeStr = localStorage.getItem(CACHE_KEY_TIME);
    const cachedDataStr = localStorage.getItem(CACHE_KEY_DATA);

    let jsonData: FribbAnimeEntry[] | null = null;

    if (cachedTimeStr && cachedDataStr) {
      const cachedTime = parseInt(cachedTimeStr, 10);
      if (now - cachedTime < CACHE_DURATION_MS) {
        try {
          jsonData = JSON.parse(cachedDataStr);
        } catch (e) {
          console.warn("Failed to parse cached Fribb mapping. Refetching...");
        }
      }
    }

    if (!jsonData) {
      console.log("Fetching Fribb mapping...");
      const res = await fetch(FRIBB_URL);
      if (!res.ok) throw new Error("Failed to fetch Fribb mapping.");
      jsonData = await res.json() as FribbAnimeEntry[];
      
      localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(jsonData));
      localStorage.setItem(CACHE_KEY_TIME, now.toString());
    }

    const map = new Map<number, number>();
    for (const entry of jsonData) {
      if (typeof entry.mal_id === "number" && typeof entry.anilist_id === "number") {
        map.set(entry.mal_id, entry.anilist_id);
      }
    }
    lookupMap = map;
    console.log("Fribb mapping initialized with", map.size, "entries.");
  } catch (error) {
    console.error("Error initializing Fribb mapping:", error);
  } finally {
    isInitializing = false;
  }
}

export function getAniListId(malId: number): number | null {
  if (!lookupMap) {
    // If not initialized yet, we will just return null. 
    // Ideally initializeFribbMapping is called on app load.
    return null;
  }
  return lookupMap.get(malId) || null;
}
