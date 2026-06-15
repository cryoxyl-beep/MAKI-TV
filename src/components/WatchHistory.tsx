/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useLibrary } from "../hooks/useLibrary";
import { getWatchHistory } from "../utils";
import { WatchHistoryItem } from "../types";
import LazyImage from "./LazyImage";
import ShelfScroller from "./ShelfScroller";
import { Play } from "lucide-react";

interface WatchHistoryProps {
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
}

/**
 * WatchHistory Component
 * Renders a horizontal list of recently watched episodes with progress bars.
 * Styling matches the History tab in LibraryPage.
 */
export default function WatchHistory({ onWatchEpisode }: WatchHistoryProps) {
  const { isLoading: libraryLoading } = useLibrary();
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const items = getWatchHistory();
    // Only show the 10 most recent unique anime items to keep it clean on home feed
    // or just the last 15 episodes. Let's do last 15 episodes.
    setHistoryItems(items.slice(0, 15));
    
    if (items.length > 0) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [libraryLoading]);

  if (!isVisible || historyItems.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 relative isolate mb-8 animate-fade-in group/history">
      <div className="px-4 md:px-6 flex flex-col">
        <h2 className="text-2xl font-bold text-[#f1f1f1] tracking-tight">Continue Watching</h2>
        <p className="text-[13px] text-gray-400 font-medium mt-0.5">Resume where you left off</p>
      </div>

      <ShelfScroller>
        {historyItems.map((item, index) => (
          <div 
            key={`${item.id}-${item.seasonNumber || 0}-${item.episodeNumber || 0}-${item.type}-${index}`}
            onClick={() => {
              if (item.type === 'movie') {
                window.location.href = `/movies/watch/${item.id}`;
              } else if (item.type === 'series') {
                window.location.href = `/series/watch/${item.id}/${item.seasonNumber}/${item.episodeNumber}`;
              } else {
                onWatchEpisode(item.id, item.seasonNumber || 1, item.episodeNumber || 1);
              }
            }}
            className="snap-start shrink-0 w-64 md:w-72 flex flex-col gap-2 cursor-pointer group"
          >
            {/* Thumbnail Wrapper */}
            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all duration-300">
              <LazyImage 
                src={item.thumbnailUrl || item.backdropImage || item.posterImage || item.bannerImage || item.coverImage || ""}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              
              {/* Dark Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 pointer-events-none">
                <div className="p-3 bg-white/10 backdrop-blur-md rounded-full shadow-2xl transform scale-90 group-hover:scale-100 transition-all duration-300">
                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                </div>
              </div>

              {/* Episode Number Badge */}
              {(item.type === 'anime' || item.type === 'series') && item.episodeNumber && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest z-10">
                  EP {item.episodeNumber}
                </div>
              )}

              {item.type === 'movie' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest z-10">
                  MOVIE
                </div>
              )}

              {/* Progress Bar */}
              {item.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                  <div
                    style={{ width: `${item.progress}%` }}
                    className="bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] h-full transition-all duration-500"
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col px-1">
              <h3 className="text-white font-bold text-sm leading-tight truncate group-hover:text-gray-200 transition-colors">
                {item.title || item.animeTitle || "Unknown"}
              </h3>
              {(item.type === 'anime' || item.type === 'series') && (
                <p className="text-gray-400 text-xs font-medium mt-1">
                  Season {item.seasonNumber} • Episode {item.episodeNumber}
                </p>
              )}
              {item.type === 'movie' && (
                <p className="text-gray-400 text-xs font-medium mt-1">
                  Movie
                </p>
              )}
            </div>
          </div>
        ))}
      </ShelfScroller>
    </div>
  );
}
