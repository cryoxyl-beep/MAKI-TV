/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";

// Jikan genre mapper mapping AniList chip text names directly to Jikan numerical IDs
const JIKAN_GENRE_MAP: Record<string, number> = {
  "Action": 1,
  "Adventure": 2,
  "Comedy": 4,
  "Drama": 8,
  "Fantasy": 10,
  "Romance": 22,
  "Sci-Fi": 24,
  "Slice of Life": 36,
  "Supernatural": 37,
  "Mystery": 7,
  "Sports": 30,
  "Suspense": 14,
  "Horror": 14,
};

/**
 * Unified Jikan client wrapper.
 * Automatically respects rate-limiting (429 handling) and caches results in localStorage.
 */
async function fetchJikan(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const queryStr = new URLSearchParams(params).toString();
  const url = `https://api.jikan.moe/v4${endpoint}${queryStr ? "?" + queryStr : ""}`;

  // Use localStorage cache to minimize outward API queries
  const isCacheable = !endpoint.includes("/anime") || Object.keys(params).length > 0;
  const cacheKey = `makitv_core_cache_jikan_${btoa(url).replace(/=/g, "")}`;
  
  if (isCacheable) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Expiry durations: details and relations have long lives (7 days), category searches live for 30 minutes
        const isDetails = endpoint.includes("/anime/") && !endpoint.includes("/relations");
        const expiry = isDetails ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
        
        if (Date.now() - parsed.timestamp < expiry) {
          return parsed.data;
        }
      } catch {
        // fail-silent and refetch
      }
    }
  }

  // Artificial short delay to prevent simultaneous queries triggering rate limits
  await new Promise((resolve) => setTimeout(resolve, 250));

  let attempts = 3;
  while (attempts > 0) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.warn(`Jikan Rate Limit (429) hit. Re-trying after backoff sleep...`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        attempts--;
        continue;
      }
      if (!response.ok) {
        throw new Error(`Jikan API Error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      
      if (isCacheable && result) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: result,
          }));
        } catch (e) {
          console.warn("localStorage quota exceeded for Jikan cache:", e);
        }
      }
      return result;
    } catch (err) {
      console.error(`Jikan fetch failed for ${url}:`, err);
      attempts--;
      if (attempts === 0) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Helper to fetch and merge multiple pages securely to meet target limit requirements,
 * since Jikan limit is hard-capped at 25 items max. Also handles Jikan rate limits nicely.
 */
async function fetchJikanPaginated(
  endpoint: string,
  params: Record<string, string> = {},
  targetCount: number = 35
): Promise<any> {
  let combinedData: any[] = [];
  const limit = 25; // Strict maximum boundary for Jikan API
  
  // Create copies of the original parameters
  const queryParams: Record<string, string> = { ...params, limit: String(limit) };
  
  // Standard two-page loop to get up to 50 results (since limit=25)
  for (let page = 1; page <= 2; page++) {
    queryParams.page = String(page);
    try {
      const res = await fetchJikan(endpoint, queryParams);
      if (res && Array.isArray(res.data)) {
        combinedData = [...combinedData, ...res.data];
        
        // If there's no next page, we don't need to try pulling the next page
        if (res.pagination && !res.pagination.has_next_page) {
          break;
        }
      } else {
        break;
      }
    } catch (err) {
      console.error(`Jikan paginated retrieval failed on page ${page} of ${endpoint}:`, err);
      break;
    }
    
    // Stop early if we have enough raw items and we don't need another page
    if (combinedData.length >= targetCount) {
      break;
    }
    
    // Slight gap to respect rate-limiting limits
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return { data: combinedData };
}

/**
 * Clean up and filter out Jikan responses to drop content pollution.
 * Supports rule: Only accept 'tv' and 'movie'. Exclude 'special', 'ova', 'ona', 'music', 
 * and blocklists containing "Chibi", "Shorts", "Recap", "Summary", or "Mini-Anime".
 */
function cleanAndFilterJikanItems(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  
  return items.filter((item) => {
    if (!item) return false;
    
    // 1. Strict format check
    const format = (item.type || "").toLowerCase();
    if (format !== "tv" && format !== "movie") {
      return false;
    }

    // 2. Strict text checking for metadata tags
    const titleEnglish = (item.title_english || "").toLowerCase();
    const titleRomaji = (item.title || "").toLowerCase();
    const titleJapanese = (item.title_japanese || "").toLowerCase();
    const synonyms = Array.isArray(item.titles) 
      ? item.titles.map((t: any) => (t.title || "").toLowerCase()) 
      : [];
      
    const allTitles = [titleEnglish, titleRomaji, titleJapanese, ...synonyms];
    const blockedFlags = ["chibi", "shorts", "recap", "summary", "mini-anime"];
    
    const isBlocked = allTitles.some((titleText) => 
      blockedFlags.some((flag) => titleText.includes(flag))
    );
    
    if (isBlocked) {
      return false;
    }

    return true;
  });
}

/**
 * Maps a filtered Jikan API record to our standardized AniListAnime schema style
 */
function mapJikanToAniListAnime(item: any): AniListAnime {
  const titleRomaji = item.title || "";
  const titleEnglish = item.title_english || titleRomaji;
  const titleJapanese = item.title_japanese || titleRomaji;

  const coverLarge = item.images?.webp?.image_url || item.images?.jpg?.image_url || "";
  const coverExtraLarge = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || coverLarge;
  const coverMedium = item.images?.webp?.small_image_url || item.images?.jpg?.small_image_url || coverLarge;

  let statusStr = "FINISHED";
  const jikanStatus = (item.status || "").toLowerCase();
  if (jikanStatus.includes("airing") || jikanStatus.includes("releasing")) {
    statusStr = "RELEASING";
  } else if (jikanStatus.includes("yet") || jikanStatus.includes("upcoming")) {
    statusStr = "NOT_YET_RELEASED";
  }

  // Fallback synonyms indexing
  const synonyms: string[] = [];
  if (Array.isArray(item.titles)) {
    item.titles.forEach((t: any) => {
      if (t.title && !synonyms.includes(t.title)) {
        synonyms.push(t.title);
      }
    });
  }
  if (item.title_synonyms && Array.isArray(item.title_synonyms)) {
    item.title_synonyms.forEach((syn: string) => {
      if (syn && !synonyms.includes(syn)) {
        synonyms.push(syn);
      }
    });
  }

  return {
    id: item.mal_id,
    title: {
      romaji: titleRomaji,
      english: titleEnglish,
      native: titleJapanese,
      userPreferred: titleEnglish || titleRomaji,
    },
    coverImage: {
      extraLarge: coverExtraLarge,
      large: coverLarge,
      medium: coverMedium,
      color: "#ff6b35",
    },
    bannerImage: coverExtraLarge, // cropped by browser object-cover
    episodes: item.episodes || 12,
    season: (item.season || "unknown").toUpperCase(),
    seasonYear: item.year || (item.aired?.from ? new Date(item.aired.from).getFullYear() : undefined),
    status: statusStr,
    popularity: item.members || (item.score ? Math.round(item.score * 5000) : 10000),
    averageScore: item.score ? Math.round(item.score * 10) : undefined,
    description: item.synopsis || "No biography summary available for this item.",
    genres: item.genres?.map((g: any) => g.name) || [],
    synonyms,
    format: (item.type || "TV").toUpperCase(),
    studios: {
      nodes: item.studios?.map((s: any) => ({ name: s.name })) || [],
    },
    trailer: item.trailer?.youtube_id ? { id: item.trailer.youtube_id, site: "youtube" } : undefined,
  };
}

/**
 * Backoff-supported helper to query Jikan relations
 */
async function fetchJikanRelations(id: number): Promise<any[]> {
  try {
    const res = await fetchJikan(`/anime/${id}/relations`);
    return res?.data || [];
  } catch {
    return [];
  }
}

// ================= PUBLIC EXPORTS =================

/**
 * 1. Fetch main feed channels from Jikan rather than AniList GraphQL
 */
export async function fetchAnimeFeed(category?: string, searchWord?: string): Promise<AniListAnime[]> {
  try {
    let result: any = null;

    if (searchWord && searchWord.trim()) {
      result = await fetchJikanPaginated("/anime", {
        q: searchWord,
        sfw: "true",
      });
    } else {
      if (!category || category === "All") {
        result = await fetchJikanPaginated("/top/anime", { type: "tv" });
      } else if (category === "Trending") {
        result = await fetchJikanPaginated("/top/anime", { filter: "airing", type: "tv" });
      } else if (category === "Most Watched") {
        result = await fetchJikanPaginated("/top/anime", { filter: "bypopularity", type: "tv" });
      } else if (category === "Currently Airing") {
        result = await fetchJikanPaginated("/top/anime", { filter: "airing", type: "tv" });
      } else {
        // Genre Chip mapping
        const genreId = JIKAN_GENRE_MAP[category];
        if (genreId) {
          result = await fetchJikanPaginated("/anime", {
            genres: String(genreId),
            orderBy: "popularity",
            sort: "desc",
            sfw: "true",
            type: "tv",
          });
        } else {
          result = await fetchJikanPaginated("/top/anime", { type: "tv" });
        }
      }
    }

    if (result && result.data) {
      const filtered = cleanAndFilterJikanItems(result.data);
      return filtered.map(mapJikanToAniListAnime);
    }
  } catch (err) {
    console.error("fetchAnimeFeed failed inside Jikan service layer:", err);
  }
  return [];
}

/**
 * 2. Fetch specific channel details, compiling relations as virtual seasons structures
 */
export async function fetchAnimeDetails(id: number): Promise<AniListAnime | null> {
  try {
    const res = await fetchJikan(`/anime/${id}`);
    if (!res || !res.data) {
      return null;
    }
    const mapped = mapJikanToAniListAnime(res.data);

    // Dynamic Sequel/Prequel relations lookup to populate visual seasons selection arrays
    const relationsCacheKey = `makitv_core_cache_relations_refined_${id}`;
    const cachedEdges = localStorage.getItem(relationsCacheKey);
    let edges: any[] = [];

    if (cachedEdges) {
      try {
        edges = JSON.parse(cachedEdges);
      } catch {
        edges = [];
      }
    } else {
      const relationsData = await fetchJikanRelations(id);
      if (relationsData && Array.isArray(relationsData)) {
        for (const relGroup of relationsData) {
          const relationType = (relGroup.relation || "").toUpperCase();
          
          if (relGroup.entry && Array.isArray(relGroup.entry)) {
            for (const itemEntry of relGroup.entry) {
              if (itemEntry.type === "anime") {
                edges.push({
                  relationType,
                  node: {
                    id: itemEntry.mal_id,
                    title: {
                      romaji: itemEntry.name,
                      english: itemEntry.name,
                      userPreferred: itemEntry.name,
                    },
                    coverImage: {
                      extraLarge: `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300`,
                      large: `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300`,
                      medium: `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150`,
                    },
                    bannerImage: `https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200`,
                    episodes: 12,
                    status: "FINISHED",
                    popularity: 10000,
                    type: "ANIME",
                  },
                });
              }
            }
          }
        }
        try {
          localStorage.setItem(relationsCacheKey, JSON.stringify(edges));
        } catch (err) {
          console.warn("Failed to cache relations in localStorage:", err);
        }
      }
    }

    mapped.relations = { edges };
    return mapped;
  } catch (err) {
    console.error(`fetchAnimeDetails failed for ID ${id}:`, err);
    return null;
  }
}

/**
 * 3. Formatter to cleanly render status descriptions
 */
export function formatAiringStatus(status?: string): string {
  if (!status) return "Unknown Status";
  switch (status.toUpperCase()) {
    case "RELEASING":
      return "Currently Airing";
    case "FINISHED":
      return "Finished Airing";
    case "NOT_YET_RELEASED":
      return "Upcoming";
    case "CANCELLED":
      return "Cancelled";
    case "HIATUS":
      return "On Hiatus";
    default:
      return status;
  }
}

/**
 * 4. Formatter to render numbers nicely in YouTube styles (e.g. 1.2M, 450K)
 */
export function formatPopularity(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M subscribers`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K subscribers`;
  }
  return `${count} subscribers`;
}

/**
 * 5. Similar format for views on videos
 */
export function formatViews(count: number): string {
  const simulatedViews = Math.floor(count * 8.5);
  if (simulatedViews >= 1000000) {
    return `${(simulatedViews / 1000000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (simulatedViews >= 1000) {
    return `${(simulatedViews / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${simulatedViews} views`;
}
