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

export interface AnimeHistoryItem {
  id: number;
  title: string;
  thumbnail: string;
  thumbnailUrl?: string;
  coverImage?: string;
  bannerImage?: string;
  seasonNumber: number;
  episodeNumber: number;
  progress: number;
  duration?: number | string;
  watchedAt: string;
  type: "anime";
}

export interface MovieHistoryItem {
  id: number;
  title: string;
  thumbnail: string;
  backdropImage?: string;
  progress: number;
  duration?: number | string;
  watchedAt: string;
  type: "movie";
}

export interface SeriesHistoryItem {
  id: number;
  title: string;
  thumbnail: string;
  thumbnailUrl?: string;
  posterImage?: string;
  backdropImage?: string;
  seasonNumber: number;
  episodeNumber: number;
  progress: number;
  duration?: number | string;
  watchedAt: string;
  type: "series";
}

export interface WatchHistoryItem {
  id: number;
  title: string;
  thumbnail: string;
  bannerImage?: string;
  backdropImage?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  progress: number;
  duration?: number | string;
  watchedAt: string;
  type: "anime" | "movie" | "series";
  thumbnailUrl?: string; // Backwards compatibility helper
  posterImage?: string; // Backwards compatibility helper
  coverImage?: string; // Backwards compatibility helper
  animeTitle?: string; // Backwards compatibility helper
  provider?: string; // Backwards compatibility helper
}

export interface SubscriptionItem {
  animeId: number;
  animeTitle: string;
  coverImage?: string;
  bannerImage?: string;
  subscribedAt: string;
}

export interface CollectionItem {
  id: number;
  title: string;
  posterPath?: string;
  coverImage?: string;
  backdropPath?: string;
  bannerImage?: string;
  type: "anime" | "movie" | "series";
  addedAt: string;
  animeId?: number;
  tmdbId?: number;
}

export interface CollectionsState {
  toBinge: CollectionItem[];
  watched: CollectionItem[];
}

export interface UnifiedWatchState {
  anilistId: number;
  episodeProgressList: Record<number, { progress: number; duration: number }>;
  updatedAt: string;
}
