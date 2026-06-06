export interface FribbAnimeEntry {
  mal_id?: number;
  anilist_id?: number;
  [key: string]: any;
}

const FRIBB_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json";

let lookupMap: Map<number, number> | null = null;
let initPromise: Promise<void> | null = null;

export async function initializeFribbMapping(): Promise<void> {
  if (lookupMap) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("Fetching Fribb mapping...");
      const res = await fetch(FRIBB_URL);
      if (!res.ok) throw new Error("Failed to fetch Fribb mapping.");
      const jsonData = await res.json() as FribbAnimeEntry[];
      
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
      initPromise = null;
    }
  })();

  return initPromise;
}

export function getAniListId(malId: number): number | null {
  if (!lookupMap) {
    return null;
  }
  return lookupMap.get(malId) || null;
}
