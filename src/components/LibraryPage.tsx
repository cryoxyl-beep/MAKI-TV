/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { WatchHistoryItem } from "../types";
import { getWatchHistory, getWatchLater, WatchLaterItem, toggleWatchLater, formatRelativeDate } from "../utils";
import { Trash2, Play } from "lucide-react";
import LazyImage from "./LazyImage";
import { useLibrary } from "../hooks/useLibrary";
import { motion, AnimatePresence } from "motion/react";
import { EpisodeTitleLabel } from "./EpisodeTitleLabel";

interface LibraryPageProps {
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onNavigateToChannel: (id: number) => void;
  onHistoryCleared: () => void;
}

type Tab = "history" | "library" | "watch_later";

export default function LibraryPage({ onWatchEpisode, onNavigateToChannel }: LibraryPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [watchLaterItems, setWatchLaterItems] = useState<WatchLaterItem[]>([]);
  const { library, isLoading: libraryLoading } = useLibrary();
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  useEffect(() => {
    // When library loads (which triggers user data sync), we re-fetch history
    setHistoryItems(getWatchHistory());
    setWatchLaterItems(getWatchLater());
    
    // Smooth natural animation transition for premium feel
    const timer = setTimeout(() => {
      setIsLocalLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [libraryLoading]);

  const handleRemoveWatchLater = (item: WatchLaterItem) => {
    toggleWatchLater(item);
    setWatchLaterItems(getWatchLater());
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "history", label: "History" },
    { id: "library", label: "In Library" },
    { id: "watch_later", label: "Watch Later" },
  ];

  const showLoader = libraryLoading || isLocalLoading;

  return (
    <div className="w-full bg-[#0a0a0c] min-h-screen select-none px-4 md:px-8 py-8 animate-fade-in pb-24">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl font-extrabold tracking-tight">
            Library
          </h1>
          <p className="text-sm text-gray-400">
            Everything important to me
          </p>
        </div>

        {/* Premium Segmented Control Tabs */}
        <div className="flex bg-white/[0.03] p-1 rounded-full border border-white/[0.05] self-start w-fit">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                  isActive 
                    ? "text-[#08080a]" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                <span className="relative z-10">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="library-tab-indicator"
                    className="absolute inset-0 bg-white rounded-full -z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content with Smooth Transitions */}
        <div className="pt-2 relative min-h-[400px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-full"
            >
              {activeTab === "history" && (
                <div>
                  {showLoader ? (
                    <div className="flex flex-col gap-2">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-1.5">
                           <div className="relative aspect-video w-24 sm:w-32 bg-white/5 rounded-lg shimmer-bone shrink-0" />
                           <div className="flex-1 min-w-0 py-1 space-y-2">
                              <div className="h-4 w-1/3 shimmer-bone rounded" />
                              <div className="h-3 w-1/4 shimmer-bone rounded-sm" />
                              <div className="h-3 w-12 shimmer-bone rounded-sm" />
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-gray-500 text-sm">Your History is empty.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {historyItems.map((episode) => (
                        <div
                          key={`${episode.animeId}-${episode.seasonNumber}-${episode.episodeNumber}`}
                          onClick={() => onWatchEpisode(episode.animeId, episode.seasonNumber, episode.episodeNumber)}
                          className="flex items-center gap-4 bg-transparent hover:bg-white/[0.03] rounded-xl p-1.5 cursor-pointer transition-colors group"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-video w-24 sm:w-32 bg-black rounded-lg overflow-hidden shrink-0">
                            <LazyImage
                              src={episode.bannerImage || episode.coverImage}
                              alt={episode.animeTitle}
                              className="w-full h-full object-cover"
                            />
                            {/* Hover states protected by pointer-events-none to prevent render flickering */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                              <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                <Play className="w-3.5 h-3.5 fill-white text-white drop-shadow-md ml-0.5" />
                              </div>
                            </div>
                            {episode.progress > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                <div
                                  style={{ width: `${episode.progress}%` }}
                                  className="bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] h-full"
                                />
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0 py-1">
                            <h3 className="text-white font-semibold text-xs sm:text-sm leading-tight truncate">
                              <EpisodeTitleLabel 
                                animeId={episode.animeId} 
                                seasonNumber={episode.seasonNumber} 
                                episodeNumber={episode.episodeNumber}
                                asFallback 
                              />
                            </h3>
                            <h4 className="text-gray-400 text-[11px] sm:text-xs font-medium mt-0.5 truncate">
                              {episode.animeTitle}
                            </h4>
                            <div className="text-[10px] sm:text-[11px] text-gray-500 mt-1 font-medium">
                              {formatRelativeDate(episode.watchedAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "library" && (
                <div>
                  {showLoader ? (
                    <div className="grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex flex-col space-y-2">
                           <div className="aspect-[2/3] rounded-lg bg-white/5 shimmer-bone w-full" />
                           <div className="h-4 w-2/3 shimmer-bone rounded" />
                        </div>
                      ))}
                    </div>
                  ) : library.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-gray-500 text-sm">Your Library is empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 min-[500px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {library.map((item) => (
                        <div
                          key={item.animeId}
                          onClick={() => onNavigateToChannel(item.animeId)}
                          className="group relative flex flex-col cursor-pointer"
                        >
                          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/5 group-hover:border-white/25 transition-colors">
                            <LazyImage
                              src={item.coverImage}
                              alt={item.animeTitle}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <h3 className="mt-2 text-white text-xs font-medium leading-snug truncate">
                            {item.animeTitle}
                          </h3>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "watch_later" && (
                <div>
                  {showLoader ? (
                    <div className="flex flex-col gap-2">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-1.5">
                           <div className="relative aspect-video w-24 sm:w-32 bg-white/5 rounded-lg shimmer-bone shrink-0" />
                           <div className="flex-1 min-w-0 py-1 space-y-2">
                              <div className="h-4 w-1/3 shimmer-bone rounded" />
                              <div className="h-3 w-1/4 shimmer-bone rounded-sm" />
                              <div className="h-3 w-12 shimmer-bone rounded-sm" />
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : watchLaterItems.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-gray-500 text-sm">No episodes saved for later.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {watchLaterItems.map((item) => (
                        <div
                          key={`${item.animeId}-${item.seasonNumber}-${item.episodeNumber}`}
                          onClick={() => onWatchEpisode(item.animeId, item.seasonNumber, item.episodeNumber)}
                          className="flex items-center gap-4 bg-transparent hover:bg-white/[0.03] rounded-xl p-1.5 cursor-pointer transition-colors group relative pr-12"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-video w-24 sm:w-32 bg-black rounded-lg overflow-hidden shrink-0">
                            <LazyImage
                              src={item.bannerImage || item.coverImage}
                              alt={item.animeTitle}
                              className="w-full h-full object-cover"
                            />
                            {/* Hover states protected by pointer-events-none to prevent render flickering */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                              <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                <Play className="w-3.5 h-3.5 fill-white text-white drop-shadow-md ml-0.5" />
                              </div>
                            </div>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0 py-1">
                            <h3 className="text-white font-semibold text-xs sm:text-sm leading-tight truncate">
                              <EpisodeTitleLabel 
                                animeId={item.animeId} 
                                seasonNumber={item.seasonNumber} 
                                episodeNumber={item.episodeNumber}
                                asFallback 
                              />
                            </h3>
                            <h4 className="text-gray-400 text-[11px] sm:text-xs font-medium mt-0.5 truncate">
                              {item.animeTitle}
                            </h4>
                            <div className="text-[10px] sm:text-[11px] text-gray-500 mt-1 font-medium">
                              Added {formatRelativeDate(item.savedAt)}
                            </div>
                          </div>
                          {/* Remove Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveWatchLater(item);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
