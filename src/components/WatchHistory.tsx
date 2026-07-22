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
import { motion, AnimatePresence } from "framer-motion";
import { getTMDBMapping } from "../services/mapping";
import { getLogoPath } from "../services/tmdb";

interface WatchHistoryProps {
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
}

interface ContinueWatchingCardProps {
  item: WatchHistoryItem;
  index: number;
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
}

function ContinueWatchingCard({ item, index, onWatchEpisode }: ContinueWatchingCardProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadLogo() {
      setIsLogoLoading(true);
      setLogoError(false);
      try {
        let url: string | null = null;
        
        // 1. Check Firebase first
        const collectionName = item.type === 'series' ? 'series' : item.type === 'movie' ? 'movies' : 'anime';
        const docId = item.id.toString();
        
        try {
          // Import at the top level is assumed, but we can do it inline or at the file top.
          // Let's use getDocument from our firestore service.
          const { getDocument, updateDocument, setDocument } = await import('../services/firestore');
          const cachedDoc = await getDocument<any>(collectionName, docId);
          
          if (cachedDoc && cachedDoc.hd_clear_logo) {
            url = cachedDoc.hd_clear_logo;
          } else {
            // 2. Not in Firebase, fetch from TMDB
            if (item.type === 'movie') {
              url = await getLogoPath('movie', item.id);
            } else if (item.type === 'series') {
              url = await getLogoPath('tv', item.id);
            } else {
              // Anime
              const mockAnime: any = {
                id: item.id,
                title: {
                  userPreferred: item.title || item.animeTitle || ""
                },
                format: "TV",
                seasonYear: null,
                synonyms: []
              };
              const mapped = await getTMDBMapping(mockAnime);
              if (mapped && active) {
                url = await getLogoPath(mapped.type, mapped.tmdbId);
              }
            }
            
            // 3. Save back to Firebase
            if (url) {
              if (cachedDoc) {
                await updateDocument(collectionName, docId, { hd_clear_logo: url }).catch(console.error);
              } else {
                await setDocument(collectionName, docId, { hd_clear_logo: url }).catch(console.error);
              }
            }
          }
        } catch (fbErr) {
          console.error("Firebase cache error:", fbErr);
          // Fallback to TMDB if Firebase fails
          if (item.type === 'movie') {
            url = await getLogoPath('movie', item.id);
          } else if (item.type === 'series') {
            url = await getLogoPath('tv', item.id);
          } else {
            const mockAnime: any = {
              id: item.id,
              title: {
                userPreferred: item.title || item.animeTitle || ""
              },
              format: "TV",
              seasonYear: null,
              synonyms: []
            };
            const mapped = await getTMDBMapping(mockAnime);
            if (mapped && active) {
              url = await getLogoPath(mapped.type, mapped.tmdbId);
            }
          }
        }

        if (active) {
          if (url) {
            setLogoUrl(url);
          } else {
            setLogoError(true);
          }
        }
      } catch (err) {
        console.error("Failed to load logo for", item.title, err);
        if (active) {
          setLogoError(true);
        }
      } finally {
        if (active) {
          setIsLogoLoading(false);
        }
      }
    }
    loadLogo();
    return () => {
      active = false;
    };
  }, [item.id, item.type, item.title, item.animeTitle]);

  const showLogo = !!logoUrl && !logoError && logoLoaded;

  // Format the episode progress badge text for top-right corner
  const formatEpisodeBadge = () => {
    if (item.type === 'anime') {
      return `EP ${item.episodeNumber}`;
    }
    if (item.type === 'series') {
      if (item.seasonNumber !== undefined && item.seasonNumber > 0) {
        return `S${item.seasonNumber} • E${item.episodeNumber}`;
      }
      return `EP ${item.episodeNumber}`;
    }
    return null;
  };

  const episodeBadgeText = formatEpisodeBadge();

  return (
    <div 
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
      {/* Preloader to detect image load or failure smoothly before transitioning layouts */}
      {logoUrl && !logoLoaded && !logoError && (
        <img 
          src={logoUrl} 
          alt="preload" 
          className="hidden" 
          onLoad={() => setLogoLoaded(true)} 
          onError={() => setLogoError(true)}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Thumbnail Wrapper */}
      <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all duration-300">
        <LazyImage 
          src={item.thumbnailUrl || item.backdropImage || item.posterImage || item.bannerImage || item.coverImage || ""}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Subtle Dark Gradient Overlay behind logo (Bottom half) */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-10"
            />
          )}
        </AnimatePresence>

        {/* Overlaid HD Clear Logo inside Bottom-Left Corner */}
        <AnimatePresence>
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute bottom-3 left-3 md:bottom-4 md:left-4 max-w-[50%] z-20 pointer-events-none"
            >
              <img
                src={logoUrl!}
                alt="Branding Logo"
                className="max-h-[30px] md:max-h-[36px] w-auto h-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dark Overlay on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 pointer-events-none z-25">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-full shadow-2xl transform scale-90 group-hover:scale-100 transition-all duration-300">
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Existing Media Badge (TOP-LEFT corner, kept exactly where it is) */}
        <div className="absolute top-3 left-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest z-30 shadow-sm">
          {item.type === 'movie' ? 'MOVIE' : item.type === 'series' ? 'SERIES' : 'ANIME'}
        </div>

        {/* Episode Progress Badge (TOP-RIGHT corner, premium glassmorphism styling) */}
        {episodeBadgeText && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/[0.08] backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest z-30 shadow-sm">
            {episodeBadgeText}
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

      {/* Info Panel below thumbnail, smoothly transitions away only when logo successfully loads */}
      <AnimatePresence initial={false} mode="wait">
        {!showLogo && (
          <motion.div
            key="fallback-info"
            initial={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex flex-col px-1 overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
    // Only show the 15 most recent episodes in the Continue Watching section
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
          <ContinueWatchingCard 
            key={`${item.id}-${item.seasonNumber || 0}-${item.episodeNumber || 0}-${item.type}-${index}`}
            item={item}
            index={index}
            onWatchEpisode={onWatchEpisode}
          />
        ))}
      </ShelfScroller>
    </div>
  );
}
