/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFribbEntryByAnilist, initializeFribbMapping } from "./fribb";
import { safeSetItem } from "../lib/cacheManager";

const TVDB_API_KEY = "e0a96c0b-7a3f-4063-ae2d-1f192cc2827e";
const TMDB_API_KEY = "fbc7f38e1070f1b873607893800598d9";

let tvdbToken: string | null = null;

let tvdbTokenPromise: Promise<string | null> | null = null;

/**
 * TVDB Login to get bearer token
 */
async function loginTVDB(): Promise<string | null> {
  if (tvdbTokenPromise) return tvdbTokenPromise;

  tvdbTokenPromise = (async () => {
    const cachedToken = localStorage.getItem("makitv_tvdb_token");
    const tokenTime = localStorage.getItem("makitv_tvdb_token_time");
    
    // Reuse token if it's less than 24 hours old
    if (cachedToken && tokenTime && Date.now() - Number(tokenTime) < 24 * 60 * 60 * 1000) {
      return cachedToken;
    }

    try {
      const res = await fetch("https://api4.thetvdb.com/v4/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: TVDB_API_KEY })
      });
      
      if (res.ok) {
        const data = await res.json();
        const token = data.data?.token;
        if (token) {
          safeSetItem("makitv_tvdb_token", token);
          safeSetItem("makitv_tvdb_token_time", Date.now().toString());
          return token;
        }
      }
    } catch (error) {
    }
    return null;
  })();

  try {
    const token = await tvdbTokenPromise;
    if (token) tvdbToken = token;
    return token;
  } finally {
    tvdbTokenPromise = null;
  }
}

/**
 * TVDB Thumbnail retrieval for a single episode
 */
async function getTVDBThumbnail(tvdbId: number, season: number, episode: number): Promise<string | null> {
  const manifest = await getTVDBSeriesManifest(tvdbId, { tvdb: season });
  return manifest[`${season}_${episode}`] || null;
}

const pendingTVDBManifests: Record<number, Promise<Record<string, string>>> = {};

/**
 * Bulk fetch TVDB manifest for a series (O(1) child lookups)
 */
export async function getTVDBSeriesManifest(tvdbId: number, seasonOverrides?: { tvdb?: number }): Promise<Record<string, string>> {
  const cacheKey = `makitv_tvdb_manifest_${tvdbId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.data;
      }
    } catch(e) {}
  }

  if (pendingTVDBManifests[tvdbId]) {
    return pendingTVDBManifests[tvdbId];
  }

  const fetchPromise = (async () => {
    let token = await loginTVDB();
    if (!token) return {};

    const fetchManifest = async (t: string) => {
      return fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/episodes/default?page=0`, {
        headers: { "Authorization": `Bearer ${t}` }
      });
    };

    try {
      let res = await fetchManifest(token);
      if (res.status === 401) {
        localStorage.removeItem("makitv_tvdb_token");
        token = await loginTVDB();
        if (token) res = await fetchManifest(token);
      }

      if (res.ok) {
        const data = await res.json();
        const episodes = data.data?.episodes || [];
        const manifest: Record<string, string> = {};
        
        episodes.forEach((ep: any) => {
          if (ep.image) {
            const s = seasonOverrides?.tvdb ?? ep.seasonNumber;
            manifest[`${s}_${ep.number}`] = ep.image;
          }
        });

        safeSetItem(cacheKey, JSON.stringify({ data: manifest, timestamp: Date.now() }));
        return manifest;
      }
    } catch (error) {
    }
    return {};
  })();

  pendingTVDBManifests[tvdbId] = fetchPromise;
  try {
    return await fetchPromise;
  } finally {
    delete pendingTVDBManifests[tvdbId];
  }
}

/**
 * TMDB Thumbnail retrieval
 */
async function getTMDBThumbnail(tmdbId: number, season: number, episode: number): Promise<string | null> {
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (data.still_path) {
        return `https://image.tmdb.org/t/p/w500${data.still_path}`;
      }
    }
  } catch (error) {
  }
  return null;
}

/**
 * Anivexa Thumbnail retrieval (legacy)
 */
async function getAnivexaThumbnail(anilistId: number, episode: number): Promise<string | null> {
  try {
    const res = await fetch(`https://anivexa-api-nine.vercel.app/episodes/${anilistId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const ep = data.find(e => Number(e.number) === episode);
        return ep?.image || null;
      }
    }
  } catch (error) {
  }
  return null;
}

/**
 * Main Tiered Thumbnail Export
 */
export async function getEpisodeThumbnail(options: {
  animeId: number; // AniList ID
  malId?: number;
  season: number;
  episode: number;
  fallbackImages?: string[]; // [banner, extraLarge, large]
  animeTitle?: string;
  tvdbThumbnailMap?: Record<string, string>;
}): Promise<string | null> {
  const { animeId, season, episode, fallbackImages, tvdbThumbnailMap } = options;
  const cacheKey = `makitv_thumb_${animeId}_${season}_${episode}`;
  
  // Check Local Persistent Cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // Ensure mapping is ready for fallback lookups
  await initializeFribbMapping();
  const fribbEntry = getFribbEntryByAnilist(animeId);
  
  // Custom Override: For Re:Zero, use TVDB as primary
  const isReZero = 
    [21355, 100049, 101291, 108632, 119661, 163134, 189046].includes(animeId) ||
    [31240, 39587, 42203, 54857, 61316].includes(options.malId || 0) ||
    options.animeTitle?.toLowerCase().includes("re:zero") ||
    options.animeTitle?.toLowerCase().includes("re-zero") ||
    (fribbEntry && typeof fribbEntry['anime-planet_id'] === 'string' && fribbEntry['anime-planet_id'].includes("re-zero"));

  if (isReZero) {
    if (tvdbThumbnailMap) {
      const mappedSeason = fribbEntry?.season?.tvdb ?? season;
      const mappedEpisode = episode + (fribbEntry?.episode_offset?.tvdb || 0);
      const tvdbUrl = tvdbThumbnailMap[`${mappedSeason}_${mappedEpisode}`];
      if (tvdbUrl) {
        safeSetItem(cacheKey, tvdbUrl);
        return tvdbUrl;
      }
    }

    if (fribbEntry?.tvdb_id) {
      const s = fribbEntry.season?.tvdb ?? season;
      const e = episode + (fribbEntry.episode_offset?.tvdb || 0);
      const tvdbImg = await getTVDBThumbnail(fribbEntry.tvdb_id, s, e);
      if (tvdbImg) {
        safeSetItem(cacheKey, tvdbImg);
        return tvdbImg;
      }
    }
  }

  // Step 1: TMDB (PRIMARY for general anime, SECONDARY for Re:Zero)
  if (fribbEntry) {
    const tmdbRaw = fribbEntry.themoviedb_id;
    const tmdbId = typeof tmdbRaw === 'object' ? tmdbRaw?.tv : tmdbRaw;
    
    if (tmdbId && typeof tmdbId === 'number') {
      const mappedSeason = fribbEntry.season?.tmdb ?? season;
      const mappedEpisode = episode + (fribbEntry.episode_offset?.tmdb || 0);
      const tmdbImg = await getTMDBThumbnail(tmdbId, mappedSeason, mappedEpisode);
      if (tmdbImg) {
        safeSetItem(cacheKey, tmdbImg);
        return tmdbImg;
      }
    }
  }

  // Step 2: TheTVDB (SECONDARY for general anime)
  // Check if not already executed as primary in isReZero block
  if (!isReZero) {
    // Try parent-provided map first if it actually contains the episode map
    if (tvdbThumbnailMap) {
      const mappedSeason = fribbEntry?.season?.tvdb ?? season;
      const mappedEpisode = episode + (fribbEntry?.episode_offset?.tvdb || 0);
      const tvdbUrl = tvdbThumbnailMap[`${mappedSeason}_${mappedEpisode}`];
      if (tvdbUrl) {
        safeSetItem(cacheKey, tvdbUrl);
        return tvdbUrl;
      }
    }

    // Next try manual resolution via fribb entry id
    if (fribbEntry?.tvdb_id) {
      const s = fribbEntry.season?.tvdb ?? season;
      const e = episode + (fribbEntry.episode_offset?.tvdb || 0);
      const tvdbImg = await getTVDBThumbnail(fribbEntry.tvdb_id, s, e);
      if (tvdbImg) {
        safeSetItem(cacheKey, tvdbImg);
        return tvdbImg;
      }
    }
  }

  // Step 3: Existing Fallback Source (Anivexa)
  const anivexaImg = await getAnivexaThumbnail(animeId, episode);
  if (anivexaImg) {
    safeSetItem(cacheKey, anivexaImg);
    return anivexaImg;
  }

  // Step 4: AniList Fallback
  if (fallbackImages && fallbackImages.length > 0) {
    const aniListImg = fallbackImages.find(img => !!img) || null;
    if (aniListImg) {
      safeSetItem(cacheKey, aniListImg);
      return aniListImg;
    }
  }

  return null;
}
