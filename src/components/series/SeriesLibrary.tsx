import { useState, useEffect } from "react";
import { getSeriesHistory, formatRelativeDate, SeriesHistoryItem } from "../../utils";
import { Trash2, Play } from "lucide-react";
import LazyImage from "../LazyImage";
import { useSeriesData, SeriesWatchLaterItem } from "../../hooks/useSeriesData";
import { motion, AnimatePresence } from "framer-motion";
import { TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import { useNavigate } from "react-router-dom";

type Tab = "history" | "library" | "watch_later";

export default function SeriesLibrary() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [historyItems, setHistoryItems] = useState<SeriesHistoryItem[]>([]);
  const { collections, watchLater, isLoading: libraryLoading, removeFromCollection, toggleWatchLater } = useSeriesData();
  const [isLocalLoading, setIsLocalLoading] = useState(true);

  useEffect(() => {
    setHistoryItems(getSeriesHistory());
    const timer = setTimeout(() => {
      setIsLocalLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [libraryLoading]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "history", label: "History" },
    { id: "library", label: "Collections" },
    { id: "watch_later", label: "Watch Later" },
  ];

  const showLoader = libraryLoading || isLocalLoading;

  return (
    <div className="w-full bg-[#0a0a0c] min-h-screen select-none px-4 md:px-8 py-8 animate-fade-in pb-24 text-white">
      <div className="max-w-[1200px] mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl font-extrabold tracking-tight">
            TV Collections
          </h1>
          <p className="text-sm text-gray-400">
            Keep Tracking everything you Love
          </p>
        </div>

        {/* Premium Segmented Control Tabs */}
        <div className="flex bg-white/[0.03] p-1 rounded-full border border-white/[0.05] mx-auto w-fit">
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
                    layoutId="series-library-tab-indicator"
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
                    <div className="flex flex-col gap-6">
                      <div className="space-y-4">
                        <div className="h-5 w-24 shimmer-bone rounded" />
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex gap-4">
                             <div className="relative aspect-video w-40 sm:w-56 bg-white/5 rounded-lg shimmer-bone shrink-0" />
                             <div className="flex-1 min-w-0 py-2 space-y-3">
                                <div className="h-5 w-1/3 shimmer-bone rounded" />
                                <div className="h-4 w-1/4 shimmer-bone rounded-sm" />
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-gray-500 text-sm">Your History is empty.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-8">
                      {(Object.entries(
                        historyItems.reduce((acc, item) => {
                          const dateStr = formatRelativeDate(item.watchedAt);
                          if (!acc[dateStr]) acc[dateStr] = [];
                          acc[dateStr].push(item);
                          return acc;
                        }, {} as Record<string, SeriesHistoryItem[]>)
                      ) as [string, SeriesHistoryItem[]][]).map(([dateStr, items]) => (
                        <div key={dateStr} className="flex flex-col gap-3">
                          <h2 className="text-white text-base sm:text-lg font-bold tracking-tight uppercase border-b border-white/[0.08] pb-2">
                            {dateStr}
                          </h2>
                          <div className="flex flex-col gap-2">
                            {items.map((item, idx) => (
                              <div
                                key={`${item.id}-${idx}`}
                                onClick={() => navigate(`/series/watch/${item.id}/${item.seasonNumber}/${item.episodeNumber}`)}
                                className="flex items-start sm:items-center gap-4 bg-transparent hover:bg-white/[0.03] rounded-xl p-2 cursor-pointer transition-colors group"
                              >
                                {/* Thumbnail */}
                                <div className="relative aspect-video w-40 sm:w-56 bg-black rounded-lg overflow-hidden shrink-0 border border-white/5">
                                  <LazyImage
                                    src={item.thumbnailUrl ? `${item.thumbnailUrl}` : (item.backdropImage ? `${TMDB_IMAGE_BASE_URL_W500}${item.backdropImage}` : "")}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  {/* Hover Play symbol */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                      <Play className="w-4 h-4 fill-white text-white drop-shadow-md ml-0.5" />
                                    </div>
                                  </div>
                                  {item.progress > 0 && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                      <div
                                        style={{ width: `${item.progress}%` }}
                                        className="bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] h-full"
                                      />
                                    </div>
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0 py-1 flex flex-col justify-center h-full">
                                  <h3 className="text-white font-semibold text-sm sm:text-base leading-snug truncate group-hover:text-gray-200 transition-colors">
                                    {item.title}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-1 uppercase font-mono tracking-wider">
                                    S{item.seasonNumber} • E{item.episodeNumber}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "library" && (
                <div className="space-y-12">
                  {showLoader ? (
                    <div className="space-y-12 animate-pulse">
                      <div className="space-y-4">
                        <div className="h-6 w-32 bg-white/10 rounded" />
                        <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex flex-col space-y-2 w-[160px] shrink-0">
                               <div className="aspect-[2/3] rounded-lg bg-white/5 w-full" />
                               <div className="h-4 w-2/3 bg-white/10 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      {/* 🔥 To Binge Section */}
                      <div className="space-y-4">
                        <h2 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
                          <span>🔥</span> To Binge
                          <span className="text-xs text-gray-500 font-normal">({(collections?.toBinge || []).length})</span>
                        </h2>
                        {(!collections?.toBinge || collections.toBinge.length === 0) ? (
                          <div className="h-[220px] flex items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.03] text-gray-500 text-sm">
                            No series in To Binge.
                          </div>
                        ) : (
                          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
                            {collections.toBinge.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => navigate(`/series/show/${item.id}`)}
                                className="group relative flex flex-col w-[160px] shrink-0 cursor-pointer snap-start"
                              >
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/5 group-hover:border-white/25 transition-colors">
                                  <LazyImage
                                    src={item.posterPath ? `${TMDB_IMAGE_BASE_URL_W500}${item.posterPath}` : ''}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      removeFromCollection("toBinge", item.id);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/90 text-white/70 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-md"
                                    title="Remove from To Binge"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <h3 className="mt-2 text-white text-xs font-medium leading-snug truncate">
                                  {item.title}
                                </h3>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ✓ Watched Section */}
                      <div className="space-y-4">
                        <h2 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
                          <span>✓</span> Watched
                          <span className="text-xs text-gray-500 font-normal">({(collections?.watched || []).length})</span>
                        </h2>
                        {(!collections?.watched || collections.watched.length === 0) ? (
                          <div className="h-[220px] flex items-center justify-center rounded-xl bg-white/[0.01] border border-white/[0.03] text-gray-500 text-sm">
                            No series in Watched.
                          </div>
                        ) : (
                          <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
                            {collections.watched.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => navigate(`/series/show/${item.id}`)}
                                className="group relative flex flex-col w-[160px] shrink-0 cursor-pointer snap-start"
                              >
                                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/5 group-hover:border-white/25 transition-colors">
                                  <LazyImage
                                    src={item.posterPath ? `${TMDB_IMAGE_BASE_URL_W500}${item.posterPath}` : ''}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      removeFromCollection("watched", item.id);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full hover:bg-black/95 text-white/70 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer backdrop-blur-md"
                                    title="Remove from Watched"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <h3 className="mt-2 text-white text-xs font-medium leading-snug truncate">
                                  {item.title}
                                </h3>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "watch_later" && (
                <div>
                  {showLoader ? (
                    <div className="flex flex-col gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4">
                           <div className="relative aspect-video w-40 sm:w-56 bg-white/5 rounded-lg shimmer-bone shrink-0" />
                           <div className="flex-1 min-w-0 py-2 space-y-3">
                              <div className="h-5 w-1/3 shimmer-bone rounded" />
                              <div className="h-4 w-1/4 shimmer-bone rounded-sm" />
                           </div>
                        </div>
                      ))}
                    </div>
                  ) : watchLater.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-gray-500 text-sm">No TV Series saved for later.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                       {watchLater.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => navigate(`/series/watch/${item.id}/1/1`)}
                          className="flex items-start sm:items-center gap-4 bg-transparent hover:bg-white/[0.03] rounded-xl p-2 cursor-pointer transition-colors group relative pr-12"
                        >
                          {/* Thumbnail */}
                          <div className="relative aspect-video w-40 sm:w-56 bg-black rounded-lg overflow-hidden shrink-0 border border-white/5">
                            <LazyImage
                              src={item.backdropPath ? `${TMDB_IMAGE_BASE_URL_W500}${item.backdropPath}` : ''}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Hover states */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 pointer-events-none">
                              <div className="p-2 bg-white/20 backdrop-blur-md rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                <Play className="w-4 h-4 fill-white text-white drop-shadow-md ml-0.5" />
                              </div>
                            </div>
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0 py-1 flex flex-col justify-center h-full">
                            <h3 className="text-white font-semibold text-sm sm:text-base leading-snug truncate group-hover:text-gray-200 transition-colors">
                              {item.title}
                            </h3>
                          </div>
                          {/* Remove Action */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchLater({ id: item.id } as any);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
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
