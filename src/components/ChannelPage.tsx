/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails, formatAiringStatus } from "../services/anilist";
import { getEpisodeProgress } from "../utils";
import SkeletonLoader from "./SkeletonLoader";
import { Check, Star, Play, Info, Plus, X } from "lucide-react";
import LazyImage from "./LazyImage";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

interface ChannelPageProps {
  animeId: number;
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
}

export default function ChannelPage({ animeId, onWatchEpisode, onSubscriptionChanged }: ChannelPageProps) {
  const [anime, setAnime] = useState<AniListAnime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [episodesPage, setEpisodesPage] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { isSubscribed, toggleSubscription, currentUser } = useLibrary();

  const [anivexaEpisodes, setAnivexaEpisodes] = useState<any[]>([]);
  const [isAnivexaLoading, setIsAnivexaLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadChannel() {
      setIsLoading(true);
      try {
        const data = await fetchAnimeDetails(animeId);
        if (data && mounted) {
          setAnime(data);
          setEpisodesPage(1); // Reset page on anime change
        }
      } catch (err) {
        console.error("Error loading channel:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadChannel();
    return () => { mounted = false; };
  }, [animeId]);

  useEffect(() => {
    let mounted = true;
    async function fetchAnivexaEpisodes() {
      if (!anime?.anilistId) return;
      
      const cacheKey = `anivexa_episodes_${anime.anilistId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000) {
            if (mounted) {
              setAnivexaEpisodes(parsed.data);
              setIsAnivexaLoading(false);
            }
            return;
          }
        } catch(e) {}
      }

      setIsAnivexaLoading(true);
      try {
        const res = await fetch(`https://anivexa-api-nine.vercel.app/episodes/${anime.anilistId}`);
        if (res.ok) {
           const data = await res.json();
           if (mounted && data?.anineko?.episodes?.sub) {
             setAnivexaEpisodes(data.anineko.episodes.sub);
             try {
               localStorage.setItem(cacheKey, JSON.stringify({
                 timestamp: Date.now(),
                 data: data.anineko.episodes.sub
               }));
             } catch (err) {}
           }
        }
      } catch (e) {
        console.error("Failed to fetch Anivexa episodes", e);
      } finally {
        if (mounted) setIsAnivexaLoading(false);
      }
    }
    fetchAnivexaEpisodes();
    return () => { mounted = false; };
  }, [anime?.anilistId]);

  useEffect(() => {
    if (anime) {
      const titleVal = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series";
      document.title = `${titleVal} • Miyoro`;
    }
  }, [anime]);

  const handleLibraryToggle = async () => {
    if (anime) {
      if (!currentUser) {
        alert("Please sign in to add to your library.");
        return;
      }
      await toggleSubscription(anime);
      onSubscriptionChanged();
    }
  };

  if (isLoading) {
    return <SkeletonLoader type="channel" />;
  }

  if (!anime) {
    return (
      <div className="w-full text-center py-20 bg-[#0f0f0f] text-gray-400">
        <p>Anime channel details could not be found.</p>
      </div>
    );
  }

  const romaji = anime.title.romaji || "";
  const english = anime.title.english || "";
  const mainTitle = english || romaji || anime.title.userPreferred || "Untitled Series";
  
  const banner = anime.bannerImage || anime.coverImage.extraLarge || "";
  const profileAvatar = anime.coverImage.large || anime.coverImage.medium || "";
  const studioName = anime.studios?.nodes?.[0]?.name || anime.format || "Unknown Studio";

  const episodesCount = anime.episodes || 12;
  const subscribed = isSubscribed(anime.id);

  return (
    <div className="w-full bg-transparent pb-20 select-none z-10 relative animate-fade-in -mt-[56px]">
      
      {/* =============== TOP CHANNEL HERO BANNER =============== */}
      <div className="w-full h-[280px] sm:h-[360px] md:h-[440px] relative overflow-hidden bg-black/20">
        {banner ? (
          <LazyImage
            src={banner}
            alt={mainTitle}
            className="w-full h-full object-cover brightness-[0.6]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.03]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-black/20 to-black/40" />
      </div>

      {/* =============== CHANNEL HEADER CONTAINER =============== */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row gap-5 md:gap-8 items-start relative -mt-16 sm:-mt-24 z-10">
        
        {/* Large circular avatar */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-black/40 ring-4 ring-white/[0.08] flex-shrink-0 shadow-2xl relative group animate-fade-in">
          <LazyImage
            src={profileAvatar}
            alt={mainTitle}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Channel text summary details */}
        <div className="flex-1 min-w-0 md:pt-4">
          <h1 className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight font-sans block truncate leading-tight drop-shadow">
            {mainTitle}
          </h1>
          
          <div className="flex flex-wrap items-center mt-1.5 text-xs sm:text-sm text-[#aaa] gap-1.5 sm:gap-2 leading-none">
            <span className="text-white hover:text-white/80 transition-colors font-semibold">
              {studioName}
            </span>
            {anime.averageScore && (
              <>
                <span className="text-gray-600">•</span>
                <span className="text-white drop-shadow font-bold flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white stroke-none" />
                  {(anime.averageScore / 10).toFixed(1)} Rating
                </span>
              </>
            )}
            <span className="text-gray-600">•</span>
            <span className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/90 font-medium rounded">
              {formatAiringStatus(anime.status)}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-400 mt-3 line-clamp-1 max-w-xl font-normal leading-relaxed">
            {anime.genres?.slice(0, 4).join("  •  ")}
          </p>
        </div>

        {/* Add to Library Action Button */}
        <div className="md:pt-4 self-stretch md:self-auto flex items-center gap-3">
          <button
            onClick={() => setShowInfoModal(true)}
            className="w-10 h-10 flex flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white transition-colors"
            title="More Information"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={handleLibraryToggle}
            className={`w-full md:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-tight shadow flex items-center justify-center gap-2 transition-all cursor-pointer ${
              subscribed
                ? "bg-[#272727] text-white hover:bg-[#323232] border border-white/5"
                : "bg-white text-black hover:bg-gray-200"
            }`}
          >
            {subscribed ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>In Library</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add to Library</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =============== MAIN TABS CONTENT AREA =============== */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 font-sans">
        <div className="animate-fade-in flex flex-col space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-white text-lg font-bold">Uploaded Episodes</h3>
            
            {/* Pagination controls */}
            {episodesCount > 50 && (
              <div className="flex flex-wrap gap-1.5 items-center bg-white/[0.02] rounded-lg p-1 border border-white/5 shadow-md">
                {Array.from({ length: Math.ceil(episodesCount / 50) }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setEpisodesPage(i + 1)}
                    className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all cursor-pointer ${
                      episodesPage === i + 1 
                        ? "bg-white text-black shadow-sm" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {i * 50 + 1}-{Math.min((i + 1) * 50, episodesCount)}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Responsive Playlist Grid (High Density) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
            {(() => {
              const startIndex = (episodesPage - 1) * 50;
              const endIndex = Math.min(startIndex + 50, episodesCount);
              const eps = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i + 1);

              return eps.map((episodeNum, listIndex) => {
                const watchProgress = getEpisodeProgress(anime.id, 1, episodeNum);
                const anivexaEp = anivexaEpisodes.find(e => e.number === episodeNum);
                const epTitleStr = anivexaEp?.title || `${mainTitle.replace(/Season \d+/gi, "").trim()} - Ep ${episodeNum}`;
                const epImage = anivexaEp?.image || (isAnivexaLoading ? "" : (banner || profileAvatar));
                
                return (
                  <motion.div
                    key={episodeNum}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(listIndex * 0.05, 0.3) }}
                    onClick={() => onWatchEpisode(anime.id, 1, episodeNum)}
                    className="bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.1] rounded-2xl overflow-hidden p-3 transition-all cursor-pointer group flex flex-col gap-3 min-w-0 shadow-lg"
                  >
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/[0.03] shadow shrink-0">
                      <LazyImage
                        src={epImage}
                        alt={`Ep ${episodeNum}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all bg-opacity-70">
                        <Play className="w-8 h-8 fill-white stroke-none transform scale-90 group-hover:scale-100 transition-all duration-300 drop-shadow-lg" />
                      </div>
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">23:45</span>
                      {watchProgress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div style={{ width: `${watchProgress}%` }} className="bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] h-full" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider block mb-1">
                          Episode {startIndex + listIndex + 1}
                        </span>
                        <h4 className="text-white text-xs lg:text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-white/80 transition-colors">
                          {epTitleStr}
                        </h4>
                      </div>
                      <p className="text-[10px] lg:text-xs text-gray-500 mt-2 line-clamp-1 font-mono">
                        {watchProgress > 0 ? `Resume at ${Math.round(watchProgress)}%` : "Not watched yet"}
                      </p>
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInfoModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
                <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">{mainTitle}</h2>
                <button 
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left Column: Synopsis */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className="text-white/60 text-xs uppercase tracking-wider font-bold mb-2">Synopsis</h4>
                      <p 
                        className="text-gray-300 text-sm leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: anime.description || "No synopsis available." }}
                      />
                    </div>
                    <div>
                      <h4 className="text-white/60 text-xs uppercase tracking-wider font-bold mb-3">Genres</h4>
                      <div className="flex flex-wrap gap-2">
                        {anime.genres?.map(g => (
                          <span key={g} className="px-3 py-1 bg-white/[0.05] border border-white/[0.1] rounded-full text-xs text-white/80 font-medium">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Metadata */}
                  <div className="w-full md:w-64 space-y-4">
                    <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-4">
                      <div>
                        <h4 className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Studio</h4>
                        <p className="text-white text-sm font-medium">{studioName}</p>
                      </div>
                      <div>
                        <h4 className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Status</h4>
                        <p className="text-white text-sm font-medium">{formatAiringStatus(anime.status)}</p>
                      </div>
                      <div>
                        <h4 className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Season Info</h4>
                        <p className="text-white text-sm font-medium">{anime.season || "Unknown"} {anime.seasonYear || ""}</p>
                      </div>
                      <div>
                        <h4 className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Episodes</h4>
                        <p className="text-white text-sm font-medium">{episodesCount} total</p>
                      </div>
                      {anime.averageScore && (
                        <div>
                          <h4 className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Score</h4>
                          <p className="text-white text-sm font-medium flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-white" />
                            {(anime.averageScore / 10).toFixed(1)} / 10
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
