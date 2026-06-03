/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { WatchHistoryItem } from "../types";
import { getWatchHistory, storage } from "../utils";
import { History, Trash2, Play, CircleDot, RefreshCw, Layers } from "lucide-react";
import LazyImage from "./LazyImage";

interface HistoryPageProps {
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onNavigateToChannel: (id: number) => void;
  onHistoryCleared: () => void;
}

export default function HistoryPage({ onWatchEpisode, onNavigateToChannel, onHistoryCleared }: HistoryPageProps) {
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    setHistoryItems(getWatchHistory());
  }, []);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your watching history? This will delete all progress details.")) {
      storage.set("history", []);
      setHistoryItems([]);
      onHistoryCleared();
    }
  };

  // 1. CONTINUE WATCHING (Items with active progress > 0 and < 98%, sorted recently)
  const continueWatching = historyItems.filter(
    (item) => item.progress > 0 && item.progress < 98
  );

  // 2. WATCHED EPISODES (Individual episode history items)
  const watchedEpisodes = historyItems;

  // 3. WATCHED ANIME (Unique anime channels visited)
  const watchedAnimeMap: Record<number, WatchHistoryItem> = {};
  historyItems.forEach((item) => {
    if (!watchedAnimeMap[item.animeId]) {
      watchedAnimeMap[item.animeId] = item;
    }
  });
  const watchedAnimeList = Object.values(watchedAnimeMap);

  return (
    <div className="w-full bg-[#0f0f0f] pb-24 min-h-screen select-none px-4 md:px-6 py-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page title and Clear All history helper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ff6b35]/15 text-[#ff6b35] rounded-xl border border-[#ff6b35]/25 shadow shadow-[#ff6b35]/5">
              <History className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight font-sans">
                Watch History Panel
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Track your active season checkpoints and continue watching smoothly
              </p>
            </div>
          </div>

          {historyItems.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-red-950/20 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Watching Logs</span>
            </button>
          )}
        </div>

        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-500 font-sans">
            <span className="text-4xl mb-3">🎬</span>
            <div className="text-white font-bold text-lg">Your History is empty</div>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xs mt-1 leading-relaxed">
              When you watch episodes on MakiTV, your checkpoints and resume logs will appear here, fully synchronized locally!
            </p>
          </div>
        ) : (
          <>
            {/* ================= SECTION 1: CONTINUE WATCHING ================= */}
            {continueWatching.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#1f1f1f] pb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] animate-pulse" />
                  <h2 className="text-white text-base md:text-lg font-bold font-sans tracking-tight">
                    Continue Watching
                  </h2>
                </div>
                
                {/* Large horizontal cards layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {continueWatching.slice(0, 6).map((item) => (
                    <div
                      key={`${item.animeId}-${item.seasonNumber}-${item.episodeNumber}`}
                      className="flex flex-col bg-[#181818] border border-white/5 rounded-2xl overflow-hidden hover:bg-[#1e1e1e] transition-colors group relative"
                    >
                      {/* Thumbnail with progress bar */}
                      <div className="relative aspect-video bg-black overflow-hidden border-b border-white/5">
                        <LazyImage
                          src={item.bannerImage || item.coverImage}
                          alt={item.animeTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => onWatchEpisode(item.animeId, item.seasonNumber, item.episodeNumber)}
                          className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <div className="p-3 bg-[#ff6b35] rounded-full text-white shadow shadow-[#ff6b35]/25 transform scale-90 group-hover:scale-100 transition-transform">
                            <Play className="w-4.5 h-4.5 fill-white stroke-none" />
                          </div>
                        </button>
                        
                        {/* Progress Bar slider overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-[#333] select-none">
                          <div
                            style={{ width: `${item.progress}%` }}
                            className="bg-gradient-to-r from-[#ff6b35] to-[#ffa585] h-full"
                          />
                        </div>
                        <span className="absolute bottom-2.5 right-2.5 px-1 py-0.2 bg-black/80 text-[10px] text-[#ff6b35] font-bold rounded">
                          {Math.round(item.progress)}% Watched
                        </span>
                      </div>

                      {/* Info Details block */}
                      <div className="p-4 flex flex-col pt-3 pb-3 justify-between flex-1 gap-2.5">
                        <div>
                          <h3 className="text-white text-sm font-bold truncate group-hover:text-[#ff6b35] transition-colors leading-tight">
                            {item.animeTitle}
                          </h3>
                          <span className="text-[11px] text-gray-400 mt-0.5 block">
                            Season {item.seasonNumber} • Episode {item.episodeNumber}
                          </span>
                        </div>
                        <button
                          onClick={() => onWatchEpisode(item.animeId, item.seasonNumber, item.episodeNumber)}
                          className="w-full py-1.5 bg-[#2c2c2c] hover:bg-[#ff6b35] text-white hover:text-white transition-colors text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Resume Watch</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ================= SECTION 2: WATCHED EPISODES ================= */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 border-b border-[#1f1f1f] pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                <h2 className="text-white text-base md:text-lg font-bold font-sans tracking-tight">
                  Watched Episodes History
                </h2>
              </div>

              {/* Smaller list of episode snapshots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watchedEpisodes.map((item, idx) => {
                  const watchedDate = new Date(item.watchedAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={idx}
                      onClick={() => onWatchEpisode(item.animeId, item.seasonNumber, item.episodeNumber)}
                      className="flex p-2.5 bg-[#121212] border border-white/5 hover:border-[#333] rounded-xl hover:bg-[#181818] cursor-pointer transition-all gap-4 group"
                    >
                      <div className="relative w-28 sm:w-32 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0">
                        <LazyImage
                          src={item.bannerImage || item.coverImage}
                          alt={item.animeTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 right-1 px-1 bg-black/80 text-[10px] text-white font-bold rounded">
                          23:45
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                        <div className="min-w-0">
                          <h4 className="text-white font-bold text-xs sm:text-sm truncate group-hover:text-[#ff6b35] transition-colors leading-tight">
                            {item.animeTitle}
                          </h4>
                          <span className="text-[10px] sm:text-xs text-[#ff6b35] font-semibold mt-0.5 block truncate">
                            Season {item.seasonNumber} • Episode {item.episodeNumber}
                          </span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-gray-500 block text-right font-medium">
                          Watched {watchedDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ================= SECTION 3: WATCHED ANIME ================= */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 border-b border-[#1f1f1f] pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                <h2 className="text-white text-base md:text-lg font-bold font-sans tracking-tight">
                  Recently Visited Series Channels
                </h2>
              </div>

              {/* Stacked vertical list of anime channels */}
              <div className="flex flex-col gap-2">
                {watchedAnimeList.map((item) => (
                  <div
                    key={item.animeId}
                    onClick={() => onNavigateToChannel(item.animeId)}
                    className="flex p-3 rounded-xl bg-[#121212] hover:bg-[#181818] border border-white/5 items-center gap-4 transition-all duration-150 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-black flex-shrink-0 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
                      <LazyImage
                        src={item.coverImage}
                        alt={item.animeTitle}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm sm:text-base group-hover:text-[#ff6b35] transition-colors truncate">
                        {item.animeTitle}
                      </h3>
                      <p className="text-[11px] text-[#aaa] font-medium">
                        Active Channel Hub View • Persistent Cookie Logged
                      </p>
                    </div>

                    <div className="px-3 py-1.5 rounded-lg bg-[#272727] font-semibold text-xs text-white group-hover:bg-[#ff6b35] group-hover:text-white transition-colors">
                      Enter Channel
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
