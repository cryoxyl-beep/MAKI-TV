/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";

const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";

// Helper function to execute GraphQL queries
async function fetchAniList<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const response = await fetch(ANILIST_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AniList API Error Response:", text);
    throw new Error(`AniList API failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (result.errors) {
    console.error("AniList GraphQL Errors:", result.errors);
    throw new Error(result.errors[0]?.message || "GraphQL Query Error");
  }

  return result.data as T;
}

// 1. Fetch main feed (combines trending, popular, airing)
export async function fetchAnimeFeed(category?: string, searchWord?: string): Promise<AniListAnime[]> {
  const query = `
    query ($search: String, $genre: String, $sort: [MediaSort], $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, search: $search, genre: $genre, sort: $sort) {
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
          format
          synonyms
          season
          seasonYear
          status
          popularity
          averageScore
          description
          genres
          studios(isMain: true) {
            nodes {
              name
            }
          }
          trailer {
            id
            site
            thumbnail
          }
        }
      }
    }
  `;

  // Map Category Chips to AniList genres, or sorting methods if appropriate
  let genre: string | undefined = undefined;
  let sort: string[] = ["POPULARITY_DESC"];
  const perPage = searchWord ? 30 : 24;

  if (category && category !== "All") {
    // If the category is trending or similar, we adjust sorting instead of genre
    if (category === "Trending") {
      sort = ["TRENDING_DESC", "POPULARITY_DESC"];
    } else if (category === "Most Watched") {
      sort = ["POPULARITY_DESC"];
    } else if (category === "Currently Airing") {
      sort = ["UPDATED_AT_DESC"];
    } else {
      // It's a genre chip e.g. "Action", "Romance" etc.
      genre = category;
    }
  }

  try {
    interface FeedResponse {
      Page: {
        media: AniListAnime[];
      };
    }

    const variables: Record<string, any> = {
      sort,
      perPage,
    };

    if (genre) variables.genre = genre;
    if (searchWord) variables.search = searchWord;

    const data = await fetchAniList<FeedResponse>(query, variables);
    return data.Page.media;
  } catch (err) {
    console.error("Error fetching feed:", err);
    // Return empty list instead of crashing
    return [];
  }
}

// 2. Fetch complete details of a specific anime (representing its channel/series hub)
export async function fetchAnimeDetails(id: number): Promise<AniListAnime | null> {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
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
        format
        synonyms
        season
        seasonYear
        status
        popularity
        averageScore
        description
        genres
        studios(isMain: true) {
          nodes {
            name
          }
        }
        trailer {
          id
          site
          thumbnail
        }
        relations {
          edges {
            relationType
            node {
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
              }
              bannerImage
              episodes
              status
              popularity
              type
            }
          }
        }
      }
    }
  `;

  try {
    interface DetailResponse {
      Media: AniListAnime;
    }

    const data = await fetchAniList<DetailResponse>(query, { id });
    return data.Media;
  } catch (err) {
    console.error(`Error fetching details for anime ID ${id}:`, err);
    return null;
  }
}

// Formatter to cleanly render status descriptions
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

// Formatter to render numbers nicely in YouTube styles (e.g. 1.2M, 450K)
export function formatPopularity(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, "")}M subscribers`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K subscribers`;
  }
  return `${count} subscribers`;
}

// Similar format for views on videos
export function formatViews(count: number): string {
  // We use popularity * 12 to simulate realistic total view views
  const simulatedViews = Math.floor(count * 8.5);
  if (simulatedViews >= 1000000) {
    return `${(simulatedViews / 1000000).toFixed(1).replace(/\.0$/, "")}M views`;
  }
  if (simulatedViews >= 1000) {
    return `${(simulatedViews / 1000).toFixed(1).replace(/\.0$/, "")}K views`;
  }
  return `${simulatedViews} views`;
}
