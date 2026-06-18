/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";
import { getAniListId, initializeFribbMapping } from "./fribb";
import { safeSetItem } from "../lib/cacheManager";

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
  const matchedMalId = variables?.idMal || variables?.malId;
  if (matchedMalId === 57555) {
  }
  if (json.errors) {
    throw new Error(`AniList API Error: ${json.errors[0].message}`);
  }

  if (json.data) {
    try {
      safeSetItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: json.data,
      }));
    } catch (e) {
      // Ignore
    }
  }

  return json.data;
}

const ANILIST_SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page (page: $page, perPage: $perPage) {
      media (search: $search, type: ANIME) {
        id
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
      }
    }
  }
`;

export async function fetchAnimeFeed(category?: string, searchWord?: string, page: number = 1): Promise<AniListAnime[]> {
  if (searchWord && searchWord.trim()) {
    const q = searchWord.trim();
    // Cache key for search list containing BOTH
    const cacheKey = `dual_search_cache_${btoa(q + "_" + page)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed.data;
        }
      } catch (e) {}
    }

    const jikanUrl = `https://api.jikan.moe/v4/anime?page=${page}&limit=25&q=${encodeURIComponent(q)}`;
    
    // We execute both requests in parallel using Promise.allSettled
    const [jikanRes, anilistRes] = await Promise.allSettled([
      fetch(jikanUrl).then(async (res) => {
        if (!res.ok) {
          if (res.status === 429) {
            await new Promise(r => setTimeout(r, 1000));
            // Retry once
            const retryRes = await fetch(jikanUrl);
            if (!retryRes.ok) throw new Error("Retry Jikan failed");
            return retryRes.json();
          }
          throw new Error("Jikan failed status: " + res.status);
        }
        return res.json();
      }),
      fetchAniList(ANILIST_SEARCH_QUERY, { search: q, page, perPage: 25 })
    ]);

    const mergedMap = new Map<number, AniListAnime>();

    await initializeFribbMapping();

    // 1. Process Jikan results if successful
    if (jikanRes.status === "fulfilled" && jikanRes.value?.data) {
      const jikanData = jikanRes.value.data;
      for (const item of jikanData) {
        const malId = item.mal_id;
        const anilistId = getAniListId(malId);
        const itemSynonyms: string[] = [
          ...(item.title_synonyms || []),
          ...(item.titles?.map((t: any) => t.title) || [])
        ].filter((val: string, idx: number, self: string[]) => val && self.indexOf(val) === idx);

        mergedMap.set(malId, {
          id: malId,
          anilistId: anilistId || undefined,
          title: {
            romaji: item.title,
            english: item.title_english || item.title,
            native: item.title_japanese,
            userPreferred: item.title,
          },
          coverImage: {
            extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
            large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
            medium: item.images?.jpg?.image_url,
            color: "#ff6b35"
          },
          bannerImage: "",
          episodes: item.episodes || 12,
          season: item.season || "UNKNOWN",
          seasonYear: item.year || 2024,
          status: item.status || "UNKNOWN",
          popularity: item.members || 0,
          averageScore: Math.round((item.score || 0) * 10),
          description: item.synopsis || "No description available.",
          genres: item.genres?.map((g: any) => g.name) || [],
          synonyms: itemSynonyms,
          format: item.type || "TV",
        });
      }
    }

    // 2. Process AniList results if successful
    if (anilistRes.status === "fulfilled" && anilistRes.value?.Page?.media) {
      const mediaList = anilistRes.value.Page.media;
      for (const media of mediaList) {
        const malId = media.idMal || media.id; // preference to idMal which is MAL ID
        const finalAnilistId = media.id;
        
        const aniSynonyms = [
          ...(media.synonyms || []),
          media.title?.userPreferred,
          media.title?.romaji,
          media.title?.english,
          media.title?.native
        ].filter((val, idx, self) => val && self.indexOf(val) === idx) as string[];

        const existing = mergedMap.get(malId);
        if (!existing) {
          mergedMap.set(malId, {
            id: malId,
            anilistId: finalAnilistId,
            title: {
              romaji: media.title?.romaji || "",
              english: media.title?.english || media.title?.romaji || "",
              native: media.title?.native || "",
              userPreferred: media.title?.userPreferred || "",
            },
            coverImage: {
              extraLarge: media.coverImage?.extraLarge || "",
              large: media.coverImage?.large || "",
              medium: media.coverImage?.medium || "",
              color: media.coverImage?.color || "#ff6b35"
            },
            bannerImage: media.bannerImage || "",
            episodes: media.episodes || 12,
            season: media.season || "UNKNOWN",
            seasonYear: media.seasonYear || 2024,
            status: media.status || "UNKNOWN",
            popularity: media.popularity || 0,
            averageScore: media.averageScore || 0,
            description: media.description || "No description available.",
            genres: media.genres || [],
            synonyms: aniSynonyms,
            format: media.format || "TV",
          });
        } else {
          // Merge synonyms
          existing.synonyms = Array.from(new Set([
            ...(existing.synonyms || []),
            ...aniSynonyms
          ])).filter(Boolean) as string[];
          if (!existing.bannerImage && media.bannerImage) {
            existing.bannerImage = media.bannerImage;
          }
          if (!existing.anilistId && finalAnilistId) {
            existing.anilistId = finalAnilistId;
          }
        }
      }
    }

    const mergedList = Array.from(mergedMap.values());
    
    // Save to cache
    try {
      safeSetItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: mergedList }));
    } catch (e) {}

    return mergedList;
  }

  let url = `https://api.jikan.moe/v4/anime?page=${page}&limit=25`;
  
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
    if (category && category.startsWith("id:")) {
       const catId = category.split(":")[1];
       url = `https://api.jikan.moe/v4/anime?genres=${catId}&page=${page}&limit=25&order_by=popularity`;
    } else if (genreMap[category]) {
       url = `https://api.jikan.moe/v4/anime?genres=${genreMap[category]}&page=${page}&limit=25&order_by=popularity`;
    } else {
       url = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`;
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

    await initializeFribbMapping();

    const result: AniListAnime[] = jikanData.map((item: any) => {
      const anilistId = getAniListId(item.mal_id);

      return {
        id: item.mal_id,
        anilistId: anilistId || undefined,
        title: {
          romaji: item.title,
          english: item.title_english || item.title,
          native: item.title_japanese,
          userPreferred: item.title,
        },
        coverImage: {
          extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          medium: item.images?.jpg?.image_url,
          color: "#ff6b35"
        },
        bannerImage: "",
        episodes: item.episodes || 12,
        season: item.season || "UNKNOWN",
        seasonYear: item.year || 2024,
        status: item.status || "UNKNOWN",
        popularity: item.members || 0,
        averageScore: Math.round((item.score || 0) * 10),
        description: item.synopsis || "No description available.",
        genres: item.genres?.map((g: any) => g.name) || [],
        synonyms: [
          ...(item.title_synonyms || []),
          ...(item.titles?.map((t: any) => t.title) || [])
        ].filter((val: string, idx: number, self: string[]) => val && self.indexOf(val) === idx),
        format: item.type || "TV",
      };
    });

    try {
        safeSetItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch(e) { }

    return result;
  } catch (err) {
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
    const fallbackQuery = `
      query ($idMal: Int) {
        Media (idMal: $idMal, type: ANIME) {
          idMal
          id
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
            anilistId: m.id,
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
             safeSetItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
         } catch(e) { }

         return result as AniListAnime;
      }
    } catch (fallbackErr) {
      return null;
    }
    return null;
  }

  const item = json.data;
  if (!item) return null;

  await initializeFribbMapping();

  const anilistId = getAniListId(item.mal_id);

  let aniListCover: any = null;
  let aniListBanner: string = "";
  
  try {
    const imgQuery = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          coverImage {
            extraLarge
            large
            medium
            color
          }
          bannerImage
        }
      }
    `;
    const imgData = await fetchAniList(imgQuery, { idMal: id });
    if (imgData?.Media) {
       if (imgData.Media.coverImage) aniListCover = imgData.Media.coverImage;
       if (imgData.Media.bannerImage) aniListBanner = imgData.Media.bannerImage;
    }
  } catch (err) {
  }

  const result = {
      id: item.mal_id,
      anilistId: anilistId || undefined,
      title: {
        romaji: item.title,
        english: item.title_english || item.title,
        native: item.title_japanese,
        userPreferred: item.title,
      },
      coverImage: aniListCover || {
        extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
        large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
        medium: item.images?.jpg?.image_url,
        color: "#ff6b35"
      },
      bannerImage: aniListBanner || "",
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
        safeSetItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch(e) { }

    return result as AniListAnime;
}

export async function fetchNewReleases(page: number = 1): Promise<AniListAnime[]> {
  const url = `https://api.jikan.moe/v4/seasons/now?page=${page}&limit=25`;
  const cacheKey = `jikan_cache_new_releases_${page}`;
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
        return fetchNewReleases(page);
      }
      return [];
    }
    const json = await response.json();
    const jikanData = json.data || [];

    await initializeFribbMapping();

    const result: AniListAnime[] = jikanData.map((item: any) => {
      const anilistId = getAniListId(item.mal_id);
      return {
        id: item.mal_id,
        anilistId: anilistId || undefined,
        title: {
          romaji: item.title,
          english: item.title_english || item.title,
          native: item.title_japanese,
          userPreferred: item.title,
        },
        coverImage: {
          extraLarge: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          large: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
          medium: item.images?.jpg?.image_url,
          color: "#ff6b35"
        },
        bannerImage: "",
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
      safeSetItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    } catch(e) { }

    return result;
  } catch (err) {
    return [];
  }
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
      // Ignore
    }
  }
  return null;
}

export async function fetchJikanEpisodes(malId: number, page: number = 1): Promise<any> {
    const url = `https://api.jikan.moe/v4/anime/${malId}/episodes?page=${page}`;
    const cacheKey = `jikan_episodes_${malId}_${page}`;
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
        if (response.ok) {
            const data = await response.json();
            try {
                safeSetItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
            } catch(e) {}
            return data;
        }
    } catch(e) {}
    
    return null;
}

export async function fetchAllJikanEpisodes(malId: number): Promise<any[]> {
    let allEpisodes: any[] = [];
    let page = 1;
    let hasNextPage = true;
    
    while (hasNextPage && page <= 5) { // Limit to 5 pages for safety -> max 500 episodes
        const data = await fetchJikanEpisodes(malId, page);
        if (data && data.data && data.data.length > 0) {
            const mappedData = data.data.map((e: any) => ({
                ...e,
                number: e.mal_id
            }));
            allEpisodes = [...allEpisodes, ...mappedData];
            hasNextPage = data.pagination?.has_next_page || false;
            page++;
            if (hasNextPage) {
               await new Promise(r => setTimeout(r, 350)); // Jikan rate limit buffer
            }
        } else {
            hasNextPage = false;
        }
    }
    
    return allEpisodes;
}
