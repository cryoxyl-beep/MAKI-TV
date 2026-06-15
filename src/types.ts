/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimeTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface CoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface StudioNode {
  name: string;
}

export interface StudioConnection {
  nodes?: StudioNode[];
}

export interface RelationNode {
  id: number;
  title: AnimeTitle;
  coverImage: CoverImage;
  bannerImage?: string;
  episodes?: number;
  status?: string;
  popularity?: number;
  type?: string;
}

export interface RelationEdge {
  relationType: string;
  node: RelationNode;
}

export interface RelationsConnection {
  edges?: RelationEdge[];
}

export interface TrailerInfo {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AniListAnime {
  id: number;
  anilistId?: number;
  title: AnimeTitle;
  coverImage: CoverImage;
  bannerImage?: string;
  episodes?: number;
  season?: string;
  seasonYear?: number;
  status?: string;
  popularity: number;
  averageScore?: number;
  description?: string;
  genres?: string[];
  synonyms?: string[];
  format?: string;
  studios?: StudioConnection;
  relations?: RelationsConnection;
  trailer?: TrailerInfo;
}

export interface WatchHistoryItem {
  type?: 'anime' | 'movie' | 'series';
  // Common
  watchedAt: string; // ISO Date String
  progress: number; // 0 to 100
  duration?: string | number; // Duration string e.g., "24:00"

  // Anime
  animeId?: number;
  animeTitle?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  bannerImage?: string;
  coverImage?: string;
  thumbnailUrl?: string;

  // Movie/Series
  tmdbId?: number;
  title?: string;
  provider?: string;
  posterPath?: string;
  backdropPath?: string;
}

export interface SubscriptionItem {
  animeId: number;
  animeTitle: string;
  coverImage?: string;
  bannerImage?: string;
  subscribedAt: string;
}
