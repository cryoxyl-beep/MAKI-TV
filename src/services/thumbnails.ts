/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFribbEntryByAnilist, initializeFribbMapping } from "./fribb";

const TVDB_API_KEY = "e0a96c0b-7a3f-4063-ae2d-1f192cc2827e";
const TMDB_API_KEY = "fbc7f38e1070f1b873607893800598d9";

let tvdbToken: string | null = null;

/**
 * TVDB Login to get bearer token
 */
async function loginTVDB(): Promise<string | null> {
  const cachedToken = localStorage.getItem("makitv_tvdb_token");
  const tokenTime = localStorage.getItem("makitv_tvdb_token_time");
  
  // Reuse token if it's less than 24 hours old
  if (cachedToken && tokenTime && Date.now() - Number(tokenTime) < 24 * 60 * 60 * 1000) {
    tvdbToken = cachedToken;
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
        tvdbToken = token;
        localStorage.setItem("makitv_tvdb_token", token);
        localStorage.setItem("makitv_tvdb_token_time", Date.now().toString());
        return token;
      }
    }
  } catch (error) {
    console.error("TVDB Login failed:", error);
  }
  return null;
}

/**
 * TVDB Thumbnail retrieval
 */
async function getTVDBThumbnail(tvdbId: number, season: number, episode: number): Promise<string | null> {
  let token = await loginTVDB();
  if (!token) return null;

  const fetchWithToken = async (t: string) => {
    return fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/episodes/default?page=0`, {
      headers: { "Authorization": `Bearer ${t}` }
    });
  };

  try {
    let res = await fetchWithToken(token);
    
    // Handle 401 Unauthorized (token expired)
    if (res.status === 401) {
      localStorage.removeItem("makitv_tvdb_token");
      token = await loginTVDB();
      if (token) res = await fetchWithToken(token);
    }

    if (res.ok) {
      const data = await res.json();
      const episodes = data.data?.episodes || [];
      const ep = episodes.find((e: any) => e.seasonNumber === season && e.number === episode);
      if (ep && ep.image) {
        return ep.image;
      }
    }
  } catch (error) {
    console.error("TVDB lookup failed:", error);
  }
  return null;
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
    console.error("TMDB lookup failed:", error);
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
      console.log("Raw Anivexa Episode Payload Structure:", data);
      if (Array.isArray(data)) {
        const ep = data.find(e => Number(e.number) === episode);
        return ep?.image || null;
      }
    }
  } catch (error) {
    console.error("Anivexa lookup failed:", error);
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
}): Promise<string | null> {
  const { animeId, season, episode, fallbackImages, animeTitle = "Unknown" } = options;
  const cacheKey = `makitv_thumb_${animeId}_${season}_${episode}`;
  
  // Check Cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // Ensure mapping is ready
  await initializeFribbMapping();

  const fribbEntry = getFribbEntryByAnilist(animeId);
  console.log(`[Thumbnail Lookup] Anime: ${animeTitle} | Season: ${season} | Episode: ${episode}`);
  
  // Tier 1: TVDB
  const tvdbId = fribbEntry?.tvdb_id;
  if (tvdbId) {
    console.log("TVDB ID located for processing:", tvdbId);
    const mappedSeason = fribbEntry?.season?.tvdb ?? season;
    const tvdbImg = await getTVDBThumbnail(tvdbId, mappedSeason, episode);
    if (tvdbImg) {
      console.log("--> Trying TVDB... [Success]");
      localStorage.setItem(cacheKey, tvdbImg);
      return tvdbImg;
    }
    console.log("--> Trying TVDB... [Failed]");
  } else {
    console.count("--> TVDB Skipped (no mapping)");
  }

  // Tier 2: TMDB
  const tmdbRaw = fribbEntry?.themoviedb_id;
  const tmdbId = typeof tmdbRaw === 'object' ? tmdbRaw?.tv : tmdbRaw;
  
  if (tmdbId && typeof tmdbId === 'number') {
    const mappedSeason = fribbEntry?.season?.tmdb ?? season;
    const tmdbImg = await getTMDBThumbnail(tmdbId, mappedSeason, episode);
    if (tmdbImg) {
      console.log("--> Trying TMDB... [Success]");
      localStorage.setItem(cacheKey, tmdbImg);
      return tmdbImg;
    }
    console.log("--> Trying TMDB... [Failed]");
  }

  // Tier 3: Anivexa
  const anivexaImg = await getAnivexaThumbnail(animeId, episode);
  if (anivexaImg) {
    console.log("--> Trying Anivexa... [Success]");
    localStorage.setItem(cacheKey, anivexaImg);
    return anivexaImg;
  }
  console.log("--> Trying Anivexa... [Failed]");

  // Tier 4: AniList Fallback
  console.log("--> Falling back to AniList static assets.");
  if (fallbackImages && fallbackImages.length > 0) {
    const aniListImg = fallbackImages.find(img => !!img) || null;
    if (aniListImg) {
      localStorage.setItem(cacheKey, aniListImg);
      return aniListImg;
    }
  }

  return null;
}
