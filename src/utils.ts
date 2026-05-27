/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

// Persist data in localStorage
const STORAGE_PREFIX = "makitv_";

export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(STORAGE_PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error("Local storage error:", e);
    }
  },
};

// Unified Watch Progress Tracking Getter/Setters
export function getUnifiedWatchStates(): Record<number, UnifiedWatchState> {
  return storage.get<Record<number, UnifiedWatchState>>("unified_watch_states", {});
}

export function getUnifiedWatchState(anilistId: number): UnifiedWatchState | null {
  const states = getUnifiedWatchStates();
  return states[anilistId] || null;
}

export function saveUnifiedWatchState(state: UnifiedWatchState): void {
  const states = getUnifiedWatchStates();
  states[state.anilistId] = {
    ...state,
    updatedAt: new Date().toISOString()
  };
  storage.set("unified_watch_states", states);
}

// 1. History Persistence Helpers
export function getWatchHistory(): WatchHistoryItem[] {
  return storage.get<WatchHistoryItem[]>("history", []);
}

export function addToWatchHistory(item: Omit<WatchHistoryItem, "watchedAt">): void {
  const history = getWatchHistory();
  const newItem: WatchHistoryItem = {
    ...item,
    watchedAt: new Date().toISOString(),
  };

  // Remove existing history item for same anime and same episode/season if exists to put it on top
  const filtered = history.filter(
    (h) => !(h.animeId === item.animeId && h.episodeNumber === item.episodeNumber && h.seasonNumber === item.seasonNumber)
  );

  filtered.unshift(newItem); // put on top
  storage.set("history", filtered.slice(0, 100)); // keep last 100
}

// Get the last progress of a specific episode
export function getEpisodeProgress(animeId: number, seasonNumber: number, episodeNumber: number): number {
  const history = getWatchHistory();
  const found = history.find(
    (h) => h.animeId === animeId && h.seasonNumber === seasonNumber && h.episodeNumber === episodeNumber
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
        animeTitle: anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Anime",
        coverImage: anime.coverImage.large || anime.coverImage.medium,
        bannerImage: anime.bannerImage,
        subscribedAt: new Date().toISOString(),
      },
    ];
  }

  storage.set("subscriptions", updatedSubs);
  return !alreadySubscribed;
}

// 3. Seasons builder algorithm
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
  
  const currentTitle = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Main Series";
  
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
        const title = node.title.english || node.title.romaji || node.title.userPreferred || "Alternative Series";
        const cover = node.coverImage.extraLarge || node.coverImage.large || node.coverImage.medium || "";
        const banner = node.bannerImage || "";
        const episodes = node.episodes || 12;
        const pop = node.popularity || 0;

        if (edge.relationType === "PREQUEL") {
          seasons.push({ animeId: node.id, title, coverImage: cover, bannerImage: banner, episodesCount: episodes, role: "prequel", popularity: pop });
        } else if (edge.relationType === "SEQUEL") {
          seasons.push({ animeId: node.id, title, coverImage: cover, bannerImage: banner, episodesCount: episodes, role: "sequel", popularity: pop });
        } else if (edge.relationType === "ALTERNATIVE" || edge.relationType === "SIDE_STORY" || edge.relationType === "PARENT") {
          // Avoid clutter unless popular
          if (pop > 1000) {
            seasons.push({ animeId: node.id, title, coverImage: cover, bannerImage: banner, episodesCount: episodes, role: "alternative", popularity: pop });
          }
        }
      }
    });
  }

  // Deduplicate by animeId just in case
  const uniqueSeasons = seasons.filter((s, index, self) => self.findIndex((u) => u.animeId === s.animeId) === index);

  // Group roles
  const prequels = uniqueSeasons.filter((s) => s.role === "prequel").sort((a, b) => a.animeId - b.animeId);
  const sequels = uniqueSeasons.filter((s) => s.role === "sequel").sort((a, b) => a.animeId - b.animeId);
  const alternatives = uniqueSeasons.filter((s) => s.role === "alternative").sort((a, b) => b.popularity - a.popularity).slice(0, 2); // limit to 2 alternatives

  // Combine into direct sequence
  // Order: prequels -> current -> sequels -> alternatives
  const orderedList: typeof uniqueSeasons = [
    ...prequels,
    {
      animeId: anime.id,
      title: currentTitle,
      coverImage: anime.coverImage.extraLarge || anime.coverImage.large || anime.coverImage.medium || "",
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
      { time: 2, text: "Long ago, the world was filled with magical elements...", jpn: "遥か昔、世界は魔法、元素で満ちていた……" },
      { time: 6, text: "But shadows began rising from the dark abyss.", jpn: "しかし、深淵より闇の影が立ち上がった。" },
      { time: 10, text: "Can our young hero unlock the ultimate standard?", jpn: "若き勇者は究極の規格を解放できるのか？" },
      { time: 15, text: "Find out in this incredible adventure of MakiTV!", jpn: "MakiTVの素晴らしい冒険で、真実を見届けよ！" },
      { time: 20, text: "This is my absolute standard, my ultimate destiny!", jpn: "これが私の絶対的な基準であり、究極の運命だ！" }
    ],
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", // generic funny clip
    subtitles: [
      { time: 3, text: "The forest of spirits awakened in spring...", jpn: "春、精霊たちの森が目覚めた……" },
      { time: 8, text: "They lived in pure joy and tranquility.", jpn: "彼らは純粋な喜びと静寂の中で暮らしていた。" },
      { time: 15, text: "Until the supreme guardian arrived!", jpn: "至高の守護者が現れるその時まで！" },
    ]
  },
  {
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", // tech/modern loop
    subtitles: [
      { time: 3, text: "In the cybernetic neon landscape of Neo-Tokyo...", jpn: "ネオ・東京のサイバーパンクなネオン街で……" },
      { time: 8, text: "Every code line tells a story of dreams and nightmares.", jpn: "すべてのコードが夢と悪夢の物語を語る。" },
      { time: 14, text: "The standard is set! Proceed with caution.", jpn: "基準は設定された！厳重に警戒せよ。" },
    ]
  }
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
