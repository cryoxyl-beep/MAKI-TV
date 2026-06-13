export interface FribbAnimeEntry {
  mal_id?: number;
  anilist_id?: number;
  tvdb_id?: number;
  themoviedb_id?: number | { tv?: number; movie?: number };
  season?: { tvdb?: number; tmdb?: number };
  [key: string]: any;
}

const FRIBB_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json";

let lookupByMal: Map<number, FribbAnimeEntry> | null = null;
let lookupByAnilist: Map<number, FribbAnimeEntry> | null = null;
let initPromise: Promise<void> | null = null;

export async function initializeFribbMapping(): Promise<void> {
  if (lookupByMal) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("Fetching Fribb mapping...");
      const res = await fetch(FRIBB_URL);
      if (!res.ok) throw new Error("Failed to fetch Fribb mapping.");
      const jsonData = await res.json() as FribbAnimeEntry[];
      
      const malMap = new Map<number, FribbAnimeEntry>();
      const anilistMap = new Map<number, FribbAnimeEntry>();

      for (const entry of jsonData) {
        if (typeof entry.mal_id === "number") {
          malMap.set(entry.mal_id, entry.extra || entry); // Fribb sometimes puts IDs in root, sometimes in extra
          // Actually, let's just store the whole entry
          malMap.set(entry.mal_id, entry);
        }
        if (typeof entry.anilist_id === "number") {
          anilistMap.set(entry.anilist_id, entry);
        }
      }
      lookupByMal = malMap;
      lookupByAnilist = anilistMap;
      console.log("Fribb mapping initialized with", malMap.size, "entries.");
    } catch (error) {
      console.error("Error initializing Fribb mapping:", error);
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

export function getAniListId(malId: number): number | null {
  if (!lookupByMal) return null;
  return lookupByMal.get(malId)?.anilist_id || null;
}

export function getFribbEntryByMal(malId: number): FribbAnimeEntry | null {
  if (!lookupByMal) return null;
  return lookupByMal.get(malId) || null;
}

export function getFribbEntryByAnilist(anilistId: number): FribbAnimeEntry | null {
  if (!lookupByAnilist) return null;
  return lookupByAnilist.get(anilistId) || null;
}

export function getRandomFribbEntryWithAnilist(): FribbAnimeEntry | null {
  if (!lookupByAnilist || lookupByAnilist.size === 0) return null;
  const entries = Array.from(lookupByAnilist.values());
  const validEntries = entries.filter(e => e.anilist_id && e.mal_id);
  if (validEntries.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * validEntries.length);
  return validEntries[randomIndex];
}
