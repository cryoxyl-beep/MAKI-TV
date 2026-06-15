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

export interface UnifiedHistoryItem {
  id: number;
  title: string;
  posterImage: string;
  backdropImage: string;
  type: 'anime' | 'movie' | 'series';
  progress: number;
  watchedAt: string;
  duration?: string | number;
  episodeNumber?: number;
  seasonNumber?: number;
  thumbnailUrl?: string;
  provider?: string;

  // Legacy backwards compatibility
  animeId?: number;
  animeTitle?: string;
  coverImage?: string;
  bannerImage?: string;
  tmdbId?: number;
  posterPath?: string;
  backdropPath?: string;
}

export type WatchHistoryItem = UnifiedHistoryItem;

export interface SubscriptionItem {
  animeId: number;
  animeTitle: string;
  coverImage?: string;
  bannerImage?: string;
  subscribedAt: string;
}
