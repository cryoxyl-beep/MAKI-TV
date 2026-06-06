/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";

export async function fetchAniListImagesById(malId: number): Promise<{
    id?: number;
    coverImage?: any;
    bannerImage?: string;
    color?: string;
}> {
  const query = `
    query ($malId: Int) {
      Media (idMal: $malId, type: ANIME) {
        id
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

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { malId },
      }),
    });

    const jsonText = await response.text();
    try {
      const json = JSON.parse(jsonText);
      if (malId === 57555) {
        console.log("[AniList Debug]");
        console.log("Requested MAL ID:", malId);
        console.log("Raw AniList Response:", json);
        console.log("Media Object:", json?.data?.Media);
        console.log("Returned AniList ID:", json?.data?.Media?.id);
      }
      if (json.data && json.data.Media) {
        return json.data.Media;
      }
    } catch(e) {}
  } catch (err) {
    console.error("AniList fetch error:", err);
  }
  return {};
}

export async function fetchJikanAnimeFeed(category?: string, searchWord?: string, page: number = 1): Promise<AniListAnime[]> {
  // Let's implement Jikan API fetching
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
      url = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`;
      // Jikan genres require genre ids, simplifying for now
    }
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error("Jikan API error");
  const json = await response.json();
  const jikanData = json.data || [];

  // Map Jikan data to AniListAnime structure
  const result: AniListAnime[] = await Promise.all(jikanData.map(async (item: any) => {
    // Determine title to search in AniList - usually romaji
    const images = await fetchAniListImagesById(item.mal_id);

    return {
      id: item.mal_id,
      anilistId: images.id,
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
  }));

  return result;
}

export async function fetchJikanAnimeDetails(id: number): Promise<AniListAnime | null> {
  const url = `https://api.jikan.moe/v4/anime/${id}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const json = await response.json();
  const item = json.data;
  if (!item) return null;

  const images = await fetchAniListImagesById(item.mal_id);

  return {
      id: item.mal_id,
      anilistId: images.id,
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
}
