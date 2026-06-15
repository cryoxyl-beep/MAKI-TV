/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from "./lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { AniListAnime, SubscriptionItem, WatchHistoryItem, AnimeHistoryItem, MovieHistoryItem, SeriesHistoryItem } from "./types";

export type { AnimeHistoryItem, MovieHistoryItem, SeriesHistoryItem, WatchHistoryItem };

// Startup Local Storage Sanitizer & Clean Architecture Invariant
if (typeof window !== "undefined" && !localStorage.getItem("makitv_v2_clean_arch")) {
  localStorage.removeItem("makitv_history");
  localStorage.removeItem("makitv_watch_later");
  localStorage.removeItem("makitv_libraries");
  localStorage.removeItem("makitv_seriesData");
  localStorage.removeItem("makitv_moviesData");
  localStorage.removeItem("makitv_userData");
  localStorage.removeItem("makitv_unified_watch_states");
  
  // Wipe legacy keys
  localStorage.removeItem("makitv_anime_library");
  localStorage.removeItem("makitv_anime_history");
  localStorage.removeItem("makitv_anime_watch_later");
  localStorage.removeItem("makitv_movies_library");
  localStorage.removeItem("makitv_movies_history");
  localStorage.removeItem("makitv_movies_watch_later");
  localStorage.removeItem("makitv_series_library");
  localStorage.removeItem("makitv_series_history");
  localStorage.removeItem("makitv_series_watch_later");

  localStorage.setItem("makitv_v2_clean_arch", "true");
}

export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const day = targetDate.getDate();
  const monthName = targetDate
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const dateFormatted = `${day} ${monthName}`;
  const dayName = targetDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();

  if (diffDays <= 0) return `TODAY • ${dateFormatted}`;
  if (diffDays === 1) return `YESTERDAY • ${dateFormatted}`;
  if (diffDays > 1 && diffDays <= 6) return `${dayName} • ${dateFormatted}`;

  return dateFormatted;
}

const STORAGE_PREFIX = "makitv_";

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error("[storage] Failed to get/parse item", key, e);
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error("[storage] Failed to set item", key, e);
    }
  },
  update: <T>(key: string, updater: (val: T) => T, defaultValue: T): void => {
    const current = storage.get(key, defaultValue);
    storage.set(key, updater(current));
  },
  remove: (key: string): void => {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
      console.error("[storage] Failed to remove item", key, e);
    }
  },
};

// Pure Syncing System
export function syncUserDataToFirebase() {
  if (!auth || !auth.currentUser || !db) return;
  const uid = auth.currentUser.uid;
  const userRef = doc(db, "users", uid);

  const payload = {
    anime: {
      library: storage.get("anime_library", []),
      watchHistory: storage.get("anime_history", []),
      watchLater: storage.get("anime_watch_later", []),
    },
    movies: {
      library: storage.get("movies_library", []),
      watchHistory: storage.get("movies_history", []),
      watchLater: storage.get("movies_watch_later", []),
    },
    series: {
      library: storage.get("series_library", []),
      watchHistory: storage.get("series_history", []),
      watchLater: storage.get("series_watch_later", []),
    },
  };

  const sanitized = JSON.parse(JSON.stringify(payload));

  setDoc(userRef, sanitized, { merge: true })
    .then(() => console.log(`[Firestore Sync] Successfully synced layout to users/${uid}`))
    .catch((err) => console.error(`[Firestore Sync Error] Failed to sync users/${uid}:`, err));
}

export function mergeFirestoreData(data: any) {
  if (!data) return;

  if (data.anime) {
    if (Array.isArray(data.anime.library)) {
      storage.set("anime_library", data.anime.library);
    }
    if (Array.isArray(data.anime.watchHistory)) {
      storage.set("anime_history", data.anime.watchHistory);
    }
    if (Array.isArray(data.anime.watchLater)) {
      storage.set("anime_watch_later", data.anime.watchLater);
    }
  }

  if (data.movies) {
    if (Array.isArray(data.movies.library)) {
      storage.set("movies_library", data.movies.library);
    }
    if (Array.isArray(data.movies.watchHistory)) {
      storage.set("movies_history", data.movies.watchHistory);
    }
    if (Array.isArray(data.movies.watchLater)) {
      storage.set("movies_watch_later", data.movies.watchLater);
    }
  }

  if (data.series) {
    if (Array.isArray(data.series.library)) {
      storage.set("series_library", data.series.library);
    }
    if (Array.isArray(data.series.watchHistory)) {
      storage.set("series_history", data.series.watchHistory);
    }
    if (Array.isArray(data.series.watchLater)) {
      storage.set("series_watch_later", data.series.watchLater);
    }
  }
}

// 1. History Persistence Helpers
export function getWatchHistory(): AnimeHistoryItem[] {
  return storage.get<AnimeHistoryItem[]>("anime_history", []);
}

export function getMovieHistory(): MovieHistoryItem[] {
  return storage.get<MovieHistoryItem[]>("movies_history", []);
}

export function getSeriesHistory(): SeriesHistoryItem[] {
  return storage.get<SeriesHistoryItem[]>("series_history", []);
}

export function getUnifiedHistory(): WatchHistoryItem[] {
  const anime = getWatchHistory();
  const movies = getMovieHistory();
  const series = getSeriesHistory();
  const combined: WatchHistoryItem[] = [...anime, ...movies, ...series];
  combined.sort(
    (a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
  );
  return combined;
}

// Unified Watch Progress tracking helper (local storage only for granular performance, with BG sync)
export function getUnifiedWatchStates(): Record<number, any> {
  return storage.get<Record<number, any>>("anime_watch_progress", {});
}

export function getUnifiedWatchState(anilistId: number): any | null {
  const states = getUnifiedWatchStates();
  return states[anilistId] || null;
}

export function saveUnifiedWatchState(state: any): void {
  const states = getUnifiedWatchStates();
  states[state.anilistId] = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  storage.set("anime_watch_progress", states);
}

export interface MovieHistoryInput {
  tmdbId: number;
  title: string;
  provider?: string;
  progress: number;
  duration?: number | string;
  posterPath?: string;
  backdropPath?: string;
}

export function addToMovieHistory(item: MovieHistoryInput): void {
  console.log("[MOVIE HISTORY WRITE]", item);
  const history = getMovieHistory();
  const newItem: MovieHistoryItem = {
    id: item.tmdbId,
    title: item.title,
    thumbnail: item.posterPath || "",
    backdropImage: item.backdropPath || "",
    progress: item.progress,
    duration: typeof item.duration === "number" ? item.duration : parseFloat(item.duration || "0") || 0,
    watchedAt: new Date().toISOString(),
    type: "movie",
  };
  const filtered = history.filter((h) => h.id !== item.tmdbId);
  filtered.unshift(newItem);
  const limited = filtered.slice(0, 300);
  storage.set("movies_history", limited);
  syncUserDataToFirebase();
}

export interface SeriesHistoryInput {
  tmdbId: number;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  provider?: string;
  progress: number;
  duration?: number | string;
  posterPath?: string;
  backdropPath?: string;
}

export function addToSeriesHistory(item: SeriesHistoryInput): void {
  console.log("[SERIES HISTORY WRITE]", item);
  const history = getSeriesHistory();
  const newItem: SeriesHistoryItem = {
    id: item.tmdbId,
    title: item.title,
    thumbnail: item.posterPath || "",
    backdropImage: item.backdropPath || "",
    seasonNumber: item.seasonNumber,
    episodeNumber: item.episodeNumber,
    progress: item.progress,
    duration: typeof item.duration === "number" ? item.duration : parseFloat(item.duration || "0") || 0,
    watchedAt: new Date().toISOString(),
    type: "series",
  };
  const filtered = history.filter(
    (h) => !(h.id === item.tmdbId && h.seasonNumber === item.seasonNumber && h.episodeNumber === item.episodeNumber)
  );
  filtered.unshift(newItem);
  const limited = filtered.slice(0, 300);
  storage.set("series_history", limited);
  syncUserDataToFirebase();
}

export interface AnimeHistoryInput {
  animeId: number;
  animeTitle: string;
  episodeNumber: number;
  seasonNumber: number;
  progress: number;
  duration?: string | number;
  bannerImage?: string;
  coverImage?: string;
  thumbnailUrl?: string;
}

export function addToWatchHistory(item: AnimeHistoryInput): void {
  const history = getWatchHistory();

  const newItem: AnimeHistoryItem = {
    id: item.animeId,
    title: item.animeTitle,
    thumbnail: item.thumbnailUrl || item.coverImage || "",
    bannerImage: item.bannerImage || "",
    seasonNumber: item.seasonNumber,
    episodeNumber: item.episodeNumber,
    progress: item.progress,
    duration: typeof item.duration === "number" ? item.duration : parseFloat(item.duration || "0") || 0,
    watchedAt: new Date().toISOString(),
    type: "anime",
  };

  const filtered = history.filter(
    (h) => !(h.id === item.animeId && h.seasonNumber === item.seasonNumber && h.episodeNumber === item.episodeNumber)
  );

  filtered.unshift(newItem);
  const limited = filtered.slice(0, 300);
  storage.set("anime_history", limited);
  syncUserDataToFirebase();
}

export function getEpisodeProgress(
  animeId: number,
  seasonNumber: number,
  episodeNumber: number,
): number {
  const history = getWatchHistory();
  const found = history.find(
    (h) =>
      h.id === animeId &&
      h.seasonNumber === seasonNumber &&
      h.episodeNumber === episodeNumber
  );
  return found ? found.progress : 0;
}

// 2. Library Storage Helpers
export function getAnimeLibrary(): SubscriptionItem[] {
  return storage.get<SubscriptionItem[]>("anime_library", []);
}
export function saveAnimeLibrary(data: SubscriptionItem[]) {
  storage.set("anime_library", data);
  syncUserDataToFirebase();
}

export function getMoviesLibrary() {
  return storage.get<any[]>("movies_library", []);
}
export function saveMoviesLibrary(data: any[]) {
  storage.set("movies_library", data);
  syncUserDataToFirebase();
}

export function getMoviesWatchLater() {
  return storage.get<any[]>("movies_watch_later", []);
}
export function saveMoviesWatchLater(data: any[]) {
  storage.set("movies_watch_later", data);
  syncUserDataToFirebase();
}

export function getSeriesLibrary() {
  return storage.get<any[]>("series_library", []);
}
export function saveSeriesLibrary(data: any[]) {
  storage.set("series_library", data);
  syncUserDataToFirebase();
}

export function getSeriesWatchLater() {
  return storage.get<any[]>("series_watch_later", []);
}
export function saveSeriesWatchLater(data: any[]) {
  storage.set("series_watch_later", data);
  syncUserDataToFirebase();
}

// 3. Watch Later Helpers
export interface WatchLaterItem {
  animeId: number;
  animeTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  bannerImage?: string;
  coverImage?: string;
  savedAt: string;
}

export function getWatchLater(): WatchLaterItem[] {
  return storage.get<WatchLaterItem[]>("anime_watch_later", []);
}

export function isWatchLater(
  animeId: number,
  seasonNumber: number,
  episodeNumber: number,
): boolean {
  return getWatchLater().some(
    (i) =>
      i.animeId === animeId &&
      i.seasonNumber === seasonNumber &&
      i.episodeNumber === episodeNumber
  );
}

export function toggleWatchLater(
  item: Omit<WatchLaterItem, "savedAt">,
): boolean {
  const items = getWatchLater();
  const exists = isWatchLater(
    item.animeId,
    item.seasonNumber,
    item.episodeNumber
  );

  if (exists) {
    const newLater = items.filter(
      (i) =>
        !(
          i.animeId === item.animeId &&
          i.seasonNumber === item.seasonNumber &&
          i.episodeNumber === item.episodeNumber
        )
    );
    storage.set("anime_watch_later", newLater);
    syncUserDataToFirebase();
    return false;
  } else {
    const newLater = [{ ...item, savedAt: new Date().toISOString() }, ...items];
    storage.set("anime_watch_later", newLater);
    syncUserDataToFirebase();
    return true;
  }
}

// 4. Seasons builder algorithm
export interface SeasonInfo {
  id: number;
  seasonNumber: number;
  animeId: number;
  title: string;
  coverImage: string;
  bannerImage: string;
  episodesCount: number;
  status?: string;
  popularity?: number;
}

export function buildSeasonsList(anime: AniListAnime): SeasonInfo[] {
  const currentTitle =
    anime.title.english ||
    anime.title.romaji ||
    anime.title.userPreferred ||
    "Main Series";

  const seasons: {
    animeId: number;
    title: string;
    coverImage: string;
    bannerImage: string;
    episodesCount: number;
    role: "prequel" | "current" | "sequel" | "alternative";
    popularity: number;
  }[] = [];

  if (anime.relations?.edges) {
    const edges = anime.relations.edges;

    edges.forEach((edge) => {
      const node = edge.node;
      if (node.type === "ANIME") {
        const title =
          node.title.english ||
          node.title.romaji ||
          node.title.userPreferred ||
          "Alternative Series";
        const cover =
          node.coverImage.extraLarge ||
          node.coverImage.large ||
          node.coverImage.medium ||
          "";
        const banner = node.bannerImage || "";
        const episodes = node.episodes || 12;
        const pop = node.popularity || 0;

        if (edge.relationType === "PREQUEL") {
          seasons.push({
            animeId: node.id,
            title,
            coverImage: cover,
            bannerImage: banner,
            episodesCount: episodes,
            role: "prequel",
            popularity: pop,
          });
        } else if (edge.relationType === "SEQUEL") {
          seasons.push({
            animeId: node.id,
            title,
            coverImage: cover,
            bannerImage: banner,
            episodesCount: episodes,
            role: "sequel",
            popularity: pop,
          });
        } else if (
          edge.relationType === "ALTERNATIVE" ||
          edge.relationType === "SIDE_STORY" ||
          edge.relationType === "PARENT"
        ) {
          if (pop > 1000) {
            seasons.push({
              animeId: node.id,
              title,
              coverImage: cover,
              bannerImage: banner,
              episodesCount: episodes,
              role: "alternative",
              popularity: pop,
            });
          }
        }
      }
    });
  }

  const uniqueSeasons = seasons.filter(
    (s, index, self) =>
      self.findIndex((u) => u.animeId === s.animeId) === index
  );

  const prequels = uniqueSeasons
    .filter((s) => s.role === "prequel")
    .sort((a, b) => a.animeId - b.animeId);
  const sequels = uniqueSeasons
    .filter((s) => s.role === "sequel")
    .sort((a, b) => a.animeId - b.animeId);
  const alternatives = uniqueSeasons
    .filter((s) => s.role === "alternative")
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 2);

  const orderedList: typeof uniqueSeasons = [
    ...prequels,
    {
      animeId: anime.id,
      title: currentTitle,
      coverImage:
        anime.coverImage.extraLarge ||
        anime.coverImage.large ||
        anime.coverImage.medium ||
        "",
      bannerImage: anime.bannerImage || "",
      episodesCount: anime.episodes || 12,
      role: "current",
      popularity: anime.popularity,
    },
    ...sequels,
    ...alternatives,
  ];

  return orderedList.map((item, idx) => ({
    id: item.animeId,
    seasonNumber: idx + 1,
    animeId: item.animeId,
    title: item.title,
    coverImage: item.coverImage,
    bannerImage: item.bannerImage,
    episodesCount: item.episodesCount,
  }));
}

export interface AnimeVideoLoop {
  url: string;
  subtitles: { time: number; text: string; jpn?: string }[];
}

export const ANIME_VIDEO_CLIPS: AnimeVideoLoop[] = [
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-star-trails-over-dense-forest-41582-large.mp4",
    subtitles: [
      {
        time: 2,
        text: "Long ago, the world was filled with magical elements...",
        jpn: "遥か昔、世界は魔法、元素で満ちていた……",
      },
      {
        time: 6,
        text: "But shadows began rising from the dark abyss.",
        jpn: "しかし、深淵より闇の影が立ち上がった。",
      },
      {
        time: 10,
        text: "Can our young hero unlock the ultimate standard?",
        jpn: "若き勇者は究極の規格を解放できるのか？",
      },
      {
        time: 15,
        text: "Find out in this incredible adventure of MakiTV!",
        jpn: "MakiTVの素晴らしい冒険で、真実を見届けよ！",
      },
      {
        time: 20,
        text: "This is my absolute standard, my ultimate destiny!",
        jpn: "これが私の絶対的な基準であり、究極の運命だ！",
      },
    ],
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    subtitles: [
      {
        time: 3,
        text: "The forest of spirits awakened in spring...",
        jpn: "春、精霊たちの森が目覚めた……",
      },
      {
        time: 8,
        text: "They lived in pure joy and tranquility.",
        jpn: "彼らは純粋な喜びと静寂の中で暮らしていた。",
      },
      {
        time: 15,
        text: "Until the supreme guardian arrived!",
        jpn: "至高の守護者が現れるその時まで！",
      },
    ],
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    subtitles: [
      {
        time: 3,
        text: "In the cybernetic neon landscape of Neo-Tokyo...",
        jpn: "ネオ・東京のサイバーパンクなネオン街で……",
      },
      {
        time: 8,
        text: "Every code line tells a story of dreams and nightmares.",
        jpn: "すべてのコードが夢と悪夢の物語を語る。",
      },
      {
        time: 14,
        text: "The standard is set! Proceed with caution.",
        jpn: "基準は設定された！厳重に警戒せよ。",
      },
    ],
  },
];

export function getClipsByAnimeId(animeId: number): AnimeVideoLoop {
  const index = animeId % ANIME_VIDEO_CLIPS.length;
  return ANIME_VIDEO_CLIPS[index];
}

interface ParsedEpisodeQuery {
  titleQuery: string;
  episodeNumber: number;
  seasonNumber: number;
}

export function parseEpisodeSearch(query: string): ParsedEpisodeQuery | null {
  const normalized = query.toLowerCase().trim();

  const epRegex = /\b(?:episodes?|ep\.?|e)\s*[:#-]?\s*(\d+)\b/i;
  const seasonRegex = /\b(?:seasons?|s\.?)\s*[:#-]?\s*(\d+)\b/i;

  const epMatch = normalized.match(epRegex);
  const seasonMatch = normalized.match(seasonRegex);

  if (!epMatch) {
    return null;
  }

  const episodeNumber = parseInt(epMatch[1], 10);
  const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;

  let titleQuery = normalized
    .replace(epRegex, "")
    .replace(seasonRegex, "")
    .replace(/\s+/g, " ")
    .trim();

  titleQuery = titleQuery.replace(/^[,.-]+|[,.-]+$/g, "").trim();

  if (!titleQuery) {
    return null;
  }

  return {
    titleQuery,
    episodeNumber,
    seasonNumber,
  };
}
