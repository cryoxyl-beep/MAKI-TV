/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { auth, db } from "./lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { AniListAnime, SubscriptionItem, WatchHistoryItem } from "./types";

export interface UnifiedWatchState {
  anilistId: number;
  tmdbId: number;
  title: string;
  provider: string;
  progress: {
    watched: number;
    duration: number;
  };
  last_season_watched: number;
  last_episode_watched: number;
  percentage: number;
  updatedAt: string;
}

export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();

  // Reset times to compare days accurately
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
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

// Persist data in localStorage
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

export function syncToFirebase(key: string, data: any) {
  if (auth && auth.currentUser && db) {
    const uid = auth.currentUser.uid;
    const docRef = doc(db, "userData", uid);
    // Sanitize data to remove any undefined values which crash Firebase
    const sanitizedData = JSON.parse(JSON.stringify(data));

    // Add diagnostic logging requested by user
    const payloadSize = new Blob([JSON.stringify(sanitizedData)]).size;
    console.log(
      `[Firestore Sync] PATH: userData/${uid} | UID: ${uid} | KEY: ${key} | PAYLOAD SIZE: ${payloadSize} bytes`,
    );

    setDoc(docRef, { [key]: sanitizedData }, { merge: true })
      .then(() => {
        console.log(
          `[Firestore Sync Success] Successfully synced ${key} to userData/${uid}`,
        );
      })
      .catch((err) => {
        console.error(
          `[Firestore Sync Error] Failed to sync ${key} to userData/${uid}:`,
          err,
        );
      });
  } else {
    console.warn(
      `[Firestore Sync Warning] Cannot sync ${key}. Auth/DB not ready or no current user.`,
    );
  }
}

// Unified Watch Progress Tracking Getter/Setters
export function getUnifiedWatchStates(): Record<number, UnifiedWatchState> {
  return storage.get<Record<number, UnifiedWatchState>>(
    "unified_watch_states",
    {},
  );
}

export function getUnifiedWatchState(
  anilistId: number,
): UnifiedWatchState | null {
  const states = getUnifiedWatchStates();
  return states[anilistId] || null;
}

export function saveUnifiedWatchState(state: UnifiedWatchState): void {
  const states = getUnifiedWatchStates();
  states[state.anilistId] = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  storage.set("unified_watch_states", states);
  syncToFirebase("unified_watch_states", states);
}

// 1. History Persistence Helpers
// Returns the single unified history array
export function getUnifiedHistory(): WatchHistoryItem[] {
  const history = storage.get<WatchHistoryItem[]>("history", []);
  
  // Normalize legacy data fields to unified structure dynamically
  return history.map(item => {
    if (!item.id && (item.animeId || item.tmdbId)) {
      item.id = (item.animeId || item.tmdbId) as number;
    }
    if (!item.title && item.animeTitle) {
      item.title = item.animeTitle;
    }
    if (!item.posterImage && (item.coverImage || item.posterPath)) {
      item.posterImage = (item.coverImage || item.posterPath) as string;
    }
    if (!item.backdropImage && (item.bannerImage || item.backdropPath)) {
      item.backdropImage = (item.bannerImage || item.backdropPath) as string;
    }
    if (!item.type) {
      item.type = 'anime';
    }
    return item;
  });
}

export function getWatchHistory(): WatchHistoryItem[] {
  return getUnifiedHistory().filter((h) => !h.type || h.type === "anime");
}

export type MovieHistoryItem = WatchHistoryItem;

export function getMovieHistory(): MovieHistoryItem[] {
  return getUnifiedHistory().filter(
    (h) => h.type === "movie",
  );
}

export interface MovieHistoryInput {
  tmdbId: number;
  title: string;
  provider: string; // provider shouldn't be required but it's passed
  progress: number;
  duration?: number;
  posterPath?: string;
  backdropPath?: string;
}

export function addToMovieHistory(item: MovieHistoryInput): void {
  const history = getUnifiedHistory();
  const newItem: WatchHistoryItem = {
    ...item,
    id: item.tmdbId,
    posterImage: item.posterPath || "",
    backdropImage: item.backdropPath || "",
    type: "movie",
    watchedAt: new Date().toISOString(),
  };
  const filtered = history.filter(
    (h) => !(h.type === "movie" && (h.id === item.tmdbId || h.tmdbId === item.tmdbId)),
  );
  filtered.unshift(newItem);
  const newHistory = filtered.slice(0, 300);
  storage.set("history", newHistory);
  syncToFirebase("history", newHistory);
}

export type SeriesHistoryItem = WatchHistoryItem;

export function getSeriesHistory(): SeriesHistoryItem[] {
  return getUnifiedHistory().filter(
    (h) => h.type === "series",
  );
}

export interface SeriesHistoryInput {
  tmdbId: number;
  title: string;
  seasonNumber: number;
  episodeNumber: number;
  provider: string;
  progress: number;
  duration?: number;
  posterPath?: string;
  backdropPath?: string;
}

export function addToSeriesHistory(item: SeriesHistoryInput): void {
  const history = getUnifiedHistory();
  const newItem: WatchHistoryItem = {
    ...item,
    id: item.tmdbId,
    posterImage: item.posterPath || "",
    backdropImage: item.backdropPath || "",
    type: "series",
    watchedAt: new Date().toISOString(),
  };
  const filtered = history.filter(
    (h) =>
      !(
        h.type === "series" &&
        (h.id === item.tmdbId || h.tmdbId === item.tmdbId) &&
        h.seasonNumber === item.seasonNumber &&
        h.episodeNumber === item.episodeNumber
      ),
  );
  filtered.unshift(newItem);
  const newHistory = filtered.slice(0, 300);
  storage.set("history", newHistory);
  syncToFirebase("history", newHistory);
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
  const history = getUnifiedHistory();

  // Try to find if we already have this episode in history to preserve existing thumbnailUrl if not provided
  const existing = history.find(
    (h) =>
      (!h.type || h.type === "anime") &&
      (h.id === item.animeId || h.animeId === item.animeId) &&
      h.episodeNumber === item.episodeNumber &&
      h.seasonNumber === item.seasonNumber,
  );

  const newItem: WatchHistoryItem = {
    ...item,
    id: item.animeId,
    title: item.animeTitle,
    posterImage: item.coverImage || "",
    backdropImage: item.bannerImage || "",
    type: "anime",
    watchedAt: new Date().toISOString(),
    thumbnailUrl: item.thumbnailUrl || existing?.thumbnailUrl,
  };

  // Remove existing history item for same anime and same episode/season if exists to put it on top
  const filtered = history.filter(
    (h) =>
      !(
        (!h.type || h.type === "anime") &&
        (h.id === item.animeId || h.animeId === item.animeId) &&
        h.episodeNumber === item.episodeNumber &&
        h.seasonNumber === item.seasonNumber
      ),
  );

  filtered.unshift(newItem); // put on top
  const newHistory = filtered.slice(0, 300); // keep last 300
  storage.set("history", newHistory); // keep last 300
  syncToFirebase("history", newHistory);
}

export function mergeFirebaseHistory(firebaseHistory: any[]) {
  if (
    !firebaseHistory ||
    !Array.isArray(firebaseHistory) ||
    firebaseHistory.length === 0
  ) {
    return;
  }
  const localHistory = getUnifiedHistory();
  if (localHistory.length === 0) {
    storage.set("history", firebaseHistory.slice(0, 300));
    return;
  }

  const combined = [...localHistory, ...firebaseHistory];
  combined.sort(
    (a, b) =>
      new Date(b.watchedAt || 0).getTime() -
      new Date(a.watchedAt || 0).getTime(),
  );

  const unique: WatchHistoryItem[] = [];
  const seen = new Set();

  for (const item of combined) {
    let key = "";
    if (item.type === "movie") {
      key = `movie_${item.tmdbId}`;
    } else if (item.type === "series") {
      key = `series_${item.tmdbId}_${item.seasonNumber}_${item.episodeNumber}`;
    } else {
      key = `anime_${item.animeId}_${item.seasonNumber}_${item.episodeNumber}`;
    }
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  storage.set("history", unique.slice(0, 300));
}

// Get the last progress of a specific episode
export function getEpisodeProgress(
  animeId: number,
  seasonNumber: number,
  episodeNumber: number,
): number {
  const history = getWatchHistory();
  const found = history.find(
    (h) =>
      h.animeId === animeId &&
      h.seasonNumber === seasonNumber &&
      h.episodeNumber === episodeNumber,
  );
  return found ? found.progress : 0;
}

// 2. Subscriptions / "Channels" Subscribed Helpers
export function getSubscriptions(): SubscriptionItem[] {
  return storage.get<SubscriptionItem[]>("subscriptions", []);
}

export function isSubscribed(animeId: number): boolean {
  const subs = getSubscriptions();
  return subs.some((s) => s.animeId === animeId);
}

export function toggleSubscription(anime: AniListAnime): boolean {
  const subs = getSubscriptions();
  const alreadySubscribed = subs.some((s) => s.animeId === anime.id);

  let updatedSubs: SubscriptionItem[];
  if (alreadySubscribed) {
    updatedSubs = subs.filter((s) => s.animeId !== anime.id);
  } else {
    updatedSubs = [
      ...subs,
      {
        animeId: anime.id,
        animeTitle:
          anime.title.english ||
          anime.title.romaji ||
          anime.title.userPreferred ||
          "Untitled Anime",
        coverImage: anime.coverImage.large || anime.coverImage.medium,
        bannerImage: anime.bannerImage,
        subscribedAt: new Date().toISOString(),
      },
    ];
  }

  storage.set("subscriptions", updatedSubs);
  return !alreadySubscribed;
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
  return storage.get<WatchLaterItem[]>("watch_later", []);
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
      i.episodeNumber === episodeNumber,
  );
}

export function toggleWatchLater(
  item: Omit<WatchLaterItem, "savedAt">,
): boolean {
  const items = getWatchLater();
  const exists = isWatchLater(
    item.animeId,
    item.seasonNumber,
    item.episodeNumber,
  );

  if (exists) {
    const newLater = items.filter(
      (i) =>
        !(
          i.animeId === item.animeId &&
          i.seasonNumber === item.seasonNumber &&
          i.episodeNumber === item.episodeNumber
        ),
    );
    storage.set("watch_later", newLater);
    syncToFirebase("watch_later", newLater);
    return false;
  } else {
    const newLater = [{ ...item, savedAt: new Date().toISOString() }, ...items];
    storage.set("watch_later", newLater);
    syncToFirebase("watch_later", newLater);
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
  // We want to construct an ordered list of seasons
  // The current anime itself is one of them.
  // We inspect its relations to find "PREQUEL", "SEQUEL", and compile them.

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

  // Add relations
  if (anime.relations?.edges) {
    const edges = anime.relations.edges;

    // Sort and filtering of relation items
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
          // Avoid clutter unless popular
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

  // Deduplicate by animeId just in case
  const uniqueSeasons = seasons.filter(
    (s, index, self) =>
      self.findIndex((u) => u.animeId === s.animeId) === index,
  );

  // Group roles
  const prequels = uniqueSeasons
    .filter((s) => s.role === "prequel")
    .sort((a, b) => a.animeId - b.animeId);
  const sequels = uniqueSeasons
    .filter((s) => s.role === "sequel")
    .sort((a, b) => a.animeId - b.animeId);
  const alternatives = uniqueSeasons
    .filter((s) => s.role === "alternative")
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 2); // limit to 2 alternatives

  // Combine into direct sequence
  // Order: prequels -> current -> sequels -> alternatives
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

  // Assign season numbers sequence (1, 2, 3...)
  return orderedList.map((item, idx) => ({
    id: item.animeId, // this points to the AniList media ID
    seasonNumber: idx + 1,
    animeId: item.animeId,
    title: item.title,
    coverImage: item.coverImage,
    bannerImage: item.bannerImage,
    episodesCount: item.episodesCount,
  }));
}

// 4. Custom Anime Video Clips / Loops database
// This matches real open source video loops to represent anime watching with true media feedback
export interface AnimeVideoLoop {
  url: string;
  subtitles: { time: number; text: string; jpn?: string }[];
}

export const ANIME_VIDEO_CLIPS: AnimeVideoLoop[] = [
  {
    url: "https://assets.mixkit.co/videos/preview/mixkit-star-trails-over-dense-forest-41582-large.mp4", // Starry cinematic sky
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
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // generic funny clip
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
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", // tech/modern loop
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
  // Use simple hash to pick one loop, so it's consistent for each anime
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
