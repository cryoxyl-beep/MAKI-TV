/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";

const ANILIST_API_URL = "https://graphql.anilist.co";

const ANILIST_GENRE_MAP: Record<string, string> = {
  "Action": "Action",
  "Adventure": "Adventure",
  "Comedy": "Comedy",
  "Drama": "Drama",
  "Fantasy": "Fantasy",
  "Romance": "Romance",
  "Sci-Fi": "Sci-Fi",
  "Slice of Life": "Slice of Life",
  "Supernatural": "Supernatural",
  "Mystery": "Mystery",
  "Sports": "Sports",
  "Suspense": "Psychological", // Mapping suspense to psychological as it's common in AniList
  "Horror": "Horror",
};

export async function fetchAniList(query: string, variables: any = {}): Promise<any> {
  const cacheKey = `makitv_core_cache_anilist_${btoa(query + JSON.stringify(variables)).replace(/=/g, "")}`;
  
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Determine expiry. 24 hours.
      const expiry = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp < expiry) {
        return parsed.data;
      }
    } catch {
      // ignore
    }
  }

  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      await new Promise((res) => setTimeout(res, 2000));
      return fetchAniList(query, variables); // retry once
    }
    throw new Error(`AniList API Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`AniList API Error: ${json.errors[0].message}`);
  }

  if (json.data) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: json.data,
      }));
    } catch (e) {
      console.warn("localStorage quota exceeded for AniList cache:", e);
    }
  }

  return json.data;
}

export async function fetchAniListImagesByTitles(titles: string[]): Promise<Record<string, any>> {
  if (!titles.length) return {};
  
  const queryChunks = titles.map((title, index) => {
    return `anime_${index}: Media (search: $search_${index}, type: ANIME, sort: SEARCH_MATCH) {
        coverImage {
          extraLarge
          large
          medium
          color
        }
        bannerImage
      }`;
  });

  const variableDeclarations = titles.map((_, index) => `$search_${index}: String`).join(', ');

  const query = `
    query (${variableDeclarations}) {
      ${queryChunks.join('\n')}
    }
  `;

  const variables = titles.reduce((acc, title, index) => {
    acc[`search_${index}`] = title;
    return acc;
  }, {} as Record<string, string>);

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 429) {
      const waitTime = parseInt(response.headers.get("Retry-After") || "2", 10) * 1000;
      await new Promise(r => setTimeout(r, waitTime));
      return fetchAniListImagesByTitles(titles);
    }

    if (response.ok) {
      const json = await response.json();
      return json.data || {};
    }
  } catch (err) {
    console.error("AniList fetch error:", err);
  }
  return {};
}

export async function fetchAniListImagesByTitle(title: string): Promise<{
    coverImage?: any;
    bannerImage?: string;
    color?: string;
}> {
  const result = await fetchAniListImagesByTitles([title]);
  return result["anime_0"] || {};
}

export async function fetchAnimeFeed(category?: string, searchWord?: string, page: number = 1): Promise<AniListAnime[]> {
  let url = `https://api.jikan.moe/v4/anime?page=${page}&limit=25`;
  
  if (searchWord && searchWord.trim()) {
    url += `&q=${encodeURIComponent(searchWord)}`;
  } else {
    if (!category || category === "All" || category === "Trending") {
      url = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`;
    } else if (category === "Most Watched") {
      url = `https://api.jikan.moe/v4/top/anime?filter=bypopularity&page=${page}&limit=25`;
    } else if (category === "Currently Airing") {
      url = `https://api.jikan.moe/v4/top/anime?filter=airing&page=${page}&limit=25`;
    } else {
      // Basic genre matching for Jikan categories (Action: 1, Adventure: 2, Comedy: 4, etc.)
      const genreMap: Record<string, string> = {
        "Action": "1", "Adventure": "2", "Comedy": "4", "Drama": "8", "Fantasy": "10", 
        "Romance": "22", "Sci-Fi": "24", "Slice of Life": "36", "Supernatural": "37", 
        "Mystery": "7", "Sports": "30", "Suspense": "41", "Horror": "14"
      };
      if (genreMap[category]) {
         url = `https://api.jikan.moe/v4/anime?genres=${genreMap[category]}&page=${page}&limit=25&order_by=popularity`;
      } else {
         url = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`;
      }
    }
  }

  const cacheKey = `jikan_cache_${btoa(url)}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
      try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
              return parsed.data;
          }
      } catch (e) {}
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 1000));
          return fetchAnimeFeed(category, searchWord, page);
        }
        return [];
    }
    const json = await response.json();
    const jikanData = json.data || [];

    const titles = jikanData.map((item: any) => item.title);
    const imagesBatch = await fetchAniListImagesByTitles(titles);

    const result: AniListAnime[] = jikanData.map((item: any, index: number) => {
      const images = imagesBatch[`anime_${index}`] || {};

      return {
        id: item.mal_id,
        title: {
          romaji: item.title,
          english: item.title_english || item.title,
          native: item.title_japanese,
          userPreferred: item.title,
        },
        coverImage: images.coverImage || {
          extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          medium: item.images?.jpg?.image_url,
          color: images.color || "#ff6b35"
        },
        bannerImage: images.bannerImage || "",
        episodes: item.episodes || 12,
        season: item.season || "UNKNOWN",
        seasonYear: item.year || 2024,
        status: item.status || "UNKNOWN",
        popularity: item.members || 0,
        averageScore: Math.round((item.score || 0) * 10),
        description: item.synopsis || "No description available.",
        genres: item.genres?.map((g: any) => g.name) || [],
        synonyms: item.title_synonyms || [],
        format: item.type || "TV",
      };
    });

    try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch(e) { }

    return result;
  } catch (err) {
    console.error("fetchAnimeFeed Error:", err);
    return [];
  }
}

export async function fetchAnimeDetails(id: number): Promise<AniListAnime | null> {
  const url = `https://api.jikan.moe/v4/anime/${id}/full`;
  
  const cacheKey = `jikan_cache_details_${id}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
      try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
              return parsed.data;
          }
      } catch (e) {}
  }

  let jikanFailed = false;
  let json: any = null;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      jikanFailed = true;
    } else {
      json = await response.json();
    }
  } catch (err) {
    jikanFailed = true;
  }

  if (jikanFailed || !json || !json.data) {
    console.log("Jikan failed, falling back to AniList for MAL ID", id);
    const fallbackQuery = `
      query ($idMal: Int) {
        Media (idMal: $idMal, type: ANIME) {
          idMal
          title {
            romaji
            english
            native
            userPreferred
          }
          coverImage {
            extraLarge
            large
            medium
            color
          }
          bannerImage
          episodes
          season
          seasonYear
          status
          popularity
          averageScore
          description
          genres
          synonyms
          format
          studios(isMain: true) {
            nodes {
              name
            }
          }
          trailer {
            id
            site
          }
          relations {
            edges {
              relationType(version: 2)
              node {
                idMal
                title {
                  userPreferred
                  english
                  romaji
                }
                coverImage {
                  large
                }
                type
                format
              }
            }
          }
        }
      }
    `;

    try {
      const fallbackData = await fetchAniList(fallbackQuery, { idMal: id });
      if (fallbackData && fallbackData.Media) {
         const m = fallbackData.Media;
         const result = {
            id: m.idMal || id,
            title: m.title || { romaji: "Unknown", english: "Unknown", native: null, userPreferred: "Unknown" },
            coverImage: m.coverImage || { extraLarge: "", large: "", medium: "", color: "#ff6b35" },
            bannerImage: m.bannerImage || "",
            episodes: m.episodes || 12,
            season: m.season || "UNKNOWN",
            seasonYear: m.seasonYear || 2024,
            status: m.status || "UNKNOWN",
            popularity: m.popularity || 0,
            averageScore: m.averageScore || 0,
            description: m.description || "No description available.",
            genres: m.genres || [],
            synonyms: m.synonyms || [],
            format: m.format || "TV",
            studios: m.studios || { nodes: [] },
            trailer: m.trailer || null,
            relations: {
              edges: (m.relations?.edges || [])
                .filter((e: any) => e.node && e.node.type === "ANIME" && e.node.idMal)
                .map((e: any) => ({
                relationType: e.relationType,
                node: {
                  id: e.node.idMal,
                  type: "ANIME",
                  title: e.node.title || { userPreferred: "Unknown", english: "Unknown", romaji: "Unknown" },
                  coverImage: e.node.coverImage || { extraLarge: "", large: "", medium: "" },
                  bannerImage: "",
                  episodes: 12,
                  popularity: 1500
                }
              }))
            }
         };

         try {
             localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
         } catch(e) { }

         return result as AniListAnime;
      }
    } catch (fallbackErr) {
      console.error("AniList fallback also failed:", fallbackErr);
      return null;
    }
    return null;
  }

  const item = json.data;
  if (!item) return null;

    const titleRomaji = item.title;
    const images = await fetchAniListImagesByTitle(titleRomaji);

    const result = {
        id: item.mal_id,
        title: {
          romaji: item.title,
          english: item.title_english || item.title,
          native: item.title_japanese,
          userPreferred: item.title,
        },
        coverImage: images.coverImage || {
          extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          medium: item.images?.jpg?.image_url,
          color: images.color || "#ff6b35"
        },
        bannerImage: images.bannerImage || "",
        episodes: item.episodes || 12,
        season: item.season || "UNKNOWN",
        seasonYear: item.year || 2024,
        status: item.status || "UNKNOWN",
        popularity: item.members || 0,
        averageScore: Math.round((item.score || 0) * 10),
        description: item.synopsis || "No description available.",
        genres: item.genres?.map((g: any) => g.name) || [],
        synonyms: item.title_synonyms || [],
        format: item.type || "TV",
        studios: { nodes: item.studios?.map((s: any) => ({ name: s.name })) || [] },
        trailer: item.trailer?.youtube_id ? { id: item.trailer.youtube_id, site: "youtube" } : null,
        relations: {
          edges: item.relations?.flatMap((rel: any) => 
            rel.entry.filter((e: any) => e.type === "anime").map((e: any) => ({
              relationType: rel.relation.toUpperCase().replace(" ", "_"),
              node: {
                id: e.mal_id,
                type: "ANIME",
                title: { userPreferred: e.name, english: e.name, romaji: e.name },
                coverImage: { extraLarge: "", large: "", medium: "" },
                bannerImage: "",
                episodes: 12,
                popularity: 1500
              }
            }))
          ) || []
        }
    };
    
    try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch(e) { }

    return result as AniListAnime;
}

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

export function formatPopularity(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M subscribers`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K subscribers`;
  }
  return `${count} subscribers`;
}

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

export async function fetchAnimeTrailer(idMal: number, signal?: AbortSignal): Promise<{ id: string, site: string } | null> {
  const query = `
    query ($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) {
        trailer {
          id
          site
        }
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { idMal },
      }),
      signal
    });

    if (response.ok) {
      const json = await response.json();
      if (json.data?.Media?.trailer?.id && json.data?.Media?.trailer?.site === "youtube") {
        return json.data.Media.trailer;
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error("[Hero Trailer] Failed to fetch trailer", err);
    }
  }
  return null;
}
