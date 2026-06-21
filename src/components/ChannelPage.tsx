/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails, formatAiringStatus } from "../services/anilist";
import { getEpisodeProgress } from "../utils";
import { getFribbEntryByAnilist, initializeFribbMapping } from "../services/fribb";
import { getTVDBSeriesManifest } from "../services/thumbnails";
import { getTMDBMapping } from "../services/mapping";
import { getLogoPath } from "../services/tmdb";
import { safeSetItem } from "../lib/cacheManager";
import SkeletonLoader from "./SkeletonLoader";
import { Check, Star, Play, Info, Plus, X } from "lucide-react";
import LazyImage from "./LazyImage";
import EpisodeThumbnailItem from "./EpisodeThumbnailItem";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "../hooks/useLibrary";

interface ChannelPageProps {
  animeId: number;
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
  onSearch?: (query: string) => void;
}

export default function ChannelPage({ animeId, onWatchEpisode, onSubscriptionChanged, onSearch }: ChannelPageProps) {
  const [anime, setAnime] = useState<AniListAnime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [episodesPage, setEpisodesPage] = useState(1);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { isSubscribed, toggleSubscription, currentUser } = useLibrary();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(true);

  const [jikanEpisodes, setJikanEpisodes] = useState<any[]>([]);
  const [isJikanLoading, setIsJikanLoading] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [tvdbThumbnailMap, setTvdbThumbnailMap] = useState<Record<string, string>>({});

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
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadChannel();
    return () => { mounted = false; };
  }, [animeId]);

  useEffect(() => {
    let mounted = true;
    async function loadLogo() {
      if (!anime) return;
      setIsLogoLoading(true);
      try {
        const mapping = await getTMDBMapping(anime);
        if (mapping && mapping.tmdbId && mounted) {
          const url = await getLogoPath(mapping.type, mapping.tmdbId);
          if (mounted) {
            setLogoUrl(url);
            setLogoError(false);
          }
        }
      } catch (err) {
        console.error("Failed to load anime logo:", err);
      } finally {
        if (mounted) {
          setIsLogoLoading(false);
        }
      }
    }
    setLogoUrl(null);
    setLogoError(false);
    setIsLogoLoading(true);
    loadLogo();
    return () => { mounted = false; };
  }, [anime]);

  useEffect(() => {
    let mounted = true;
    async function loadTVDBManifest() {
      if (!anime) return;
      const idToUse = anime.anilistId || anime.id;
      if (!idToUse) return;

      await initializeFribbMapping();
      const entry = getFribbEntryByAnilist(idToUse);
      
      if (entry?.tvdb_id) {
        const manifest = await getTVDBSeriesManifest(entry.tvdb_id, entry.season);
        if (mounted) {
          setTvdbThumbnailMap(manifest);
        }
      }
    }
    loadTVDBManifest();
    return () => { mounted = false; };
  }, [anime?.id, anime?.anilistId]);

  useEffect(() => {
    let mounted = true;
    async function fetchJikanEpisodesData() {
      if (!anime?.id) return;
      setIsJikanLoading(true);
      try {
        const { fetchAllJikanEpisodes } = await import('../services/anilist');
        const eps = await fetchAllJikanEpisodes(anime.id);
        if (mounted && eps && eps.length > 0) {
          const visibleEpisodes = eps.filter((ep: any) => {
            if (!ep?.aired) return false;
            const airedTime = new Date(ep.aired).getTime();
            return !Number.isNaN(airedTime) && airedTime <= Date.now();
          });
          setJikanEpisodes(visibleEpisodes);
        }
      } catch (e) {
      } finally {
        if (mounted) setIsJikanLoading(false);
      }
    }
    fetchJikanEpisodesData();
    return () => { mounted = false; };
  }, [anime?.id]);

  useEffect(() => {
    if (anime) {
      const titleVal = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series";
      document.title = `${titleVal} - Miyoro`;
    }
  }, [anime]);

  const episodesCount = useMemo(() => {
    if (jikanEpisodes && jikanEpisodes.length > 0) {
      return jikanEpisodes.length;
    }
    return anime?.episodes || 12;
  }, [jikanEpisodes, anime?.episodes]);

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

  const subscribed = isSubscribed(anime.id);

  return (
    <div className="relative z-10 w-full bg-[#09090b] min-h-screen select-none pb-20 font-sans group/page -mt-[56px]">
      
      {/* =============== HERO ATMOSPHERE =============== */}
      <div className="absolute top-0 left-0 right-0 h-[480px] z-0 overflow-hidden pointer-events-none">
        {banner ? (
          <LazyImage
            src={banner}
            alt={mainTitle}
            className="w-full h-full object-cover opacity-20 object-top"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/50 to-transparent" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* =============== LEFT COLUMN: POSTER & METADATA =============== */}
          <div className="w-full md:w-[220px] lg:w-[260px] flex-shrink-0 flex flex-col gap-6 relative">
            <div className="w-48 sm:w-full mx-auto md:mx-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-white/[0.05] border border-white/[0.1]">
                <LazyImage
                  src={profileAvatar}
                  alt={mainTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Sidebar Action Buttons */}
              <div className="mt-4 flex flex-col gap-2">
                {anime.trailer && (
                  <button 
                    className="w-full py-2.5 bg-white/[0.05] hover:bg-white/[0.08] text-white/90 hover:text-white rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors border border-white/[0.05]"
                    onClick={() => {
                      if (anime.trailer?.id) window.open(`https://youtube.com/watch?v=${anime.trailer.id}`, '_blank');
                    }}
                  >
                    <Play className="w-4 h-4 text-red-500 fill-red-500" />
                    Watch trailer
                  </button>
                )}
              </div>

              {/* Sidebar Metadata */}
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Format</h4>
                  <p className="text-white text-sm font-medium">{anime.format || "TV"}</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Status</h4>
                  <p className="text-green-500 text-sm font-bold uppercase">{formatAiringStatus(anime.status)}</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Season</h4>
                  <p className="text-white text-sm font-medium">{anime.season ? `${anime.season.toUpperCase()} ${anime.seasonYear || ""}` : "UNKNOWN"}</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Studios</h4>
                  <p className="text-white text-sm font-medium">{studioName}</p>
                </div>
                {anime.averageScore && (
                  <div>
                    <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Score</h4>
                    <p className="text-white text-sm font-medium flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      {(anime.averageScore / 10).toFixed(1)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =============== RIGHT COLUMN: INFO & EPISODES =============== */}
          <div className="flex-1 min-w-0 flex flex-col">
            
            {/* Top info */}
            {anime.season && (
              <div className="text-white/60 text-sm uppercase tracking-widest font-semibold mb-2">
                {anime.season} {anime.seasonYear}
              </div>
            )}
            
            {isLogoLoading ? (
              <div className="h-[120px] w-[240px] max-w-full bg-white/5 rounded-lg animate-pulse mb-4 self-start" />
            ) : logoUrl && !logoError ? (
              <motion.img
                src={logoUrl}
                alt={mainTitle}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-h-[120px] w-auto object-contain mb-4 drop-shadow-2xl self-start"
                onError={() => setLogoError(true)}
              />
            ) : (
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                {mainTitle}
              </h1>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {anime.genres?.map(g => (
                <span key={g} className="px-3 py-1 bg-white/[0.06] border border-white/[0.08] text-white/90 text-xs font-bold rounded">
                  {g}
                </span>
              ))}
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => onWatchEpisode(anime.id, 1, 1)}
                className="h-12 px-8 bg-white text-black hover:bg-gray-200 rounded-full flex items-center justify-center transition-transform active:scale-95"
              >
                <Play className="w-5 h-5 fill-black mr-2.5" />
                <span className="font-bold tracking-wide">Play Now</span>
              </button>
              
              <button 
                onClick={handleLibraryToggle}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 flex items-center justify-center transition-all text-white active:scale-95"
                title={subscribed ? "Remove from Library" : "Add to Library"}
              >
                {subscribed ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>

            {/* Description */}
            <div className="mb-8 max-w-4xl">
              <p 
                className={`text-gray-300 text-sm md:text-base leading-relaxed font-sans ${descriptionExpanded ? "" : "line-clamp-3"}`}
                dangerouslySetInnerHTML={{ __html: anime.description || "No synopsis available." }}
              />
              {anime.description && anime.description.length > 200 && (
                <button 
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="text-white/50 hover:text-white mt-1.5 text-xs font-bold tracking-wider transition-colors uppercase"
                >
                  {descriptionExpanded ? "Show Less" : "+ More"}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 sm:gap-8 border-b border-white/[0.08] mb-6 overflow-x-auto scrollbar-hide">
              <button className="pb-3 text-white text-sm sm:text-base font-bold border-b-2 border-white whitespace-nowrap">
                Episodes
              </button>
            </div>

            {/* Episodes Controls */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="bg-white/5 px-3 py-1.5 rounded text-xs font-bold text-white/70 tracking-wide">
                {episodesCount} Episodes
              </div>
              
              {episodesCount > 50 && (
                <div className="flex flex-wrap gap-1.5 items-center bg-white/[0.02] rounded-lg p-1 border border-white/5">
                  {Array.from({ length: Math.ceil(episodesCount / 50) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setEpisodesPage(i + 1)}
                      className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
                        episodesPage === i + 1 
                          ? "bg-white text-black shadow-sm" 
                          : "text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {i * 50 + 1}-{Math.min((i + 1) * 50, episodesCount)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 pb-10">
              {(() => {
                const startIndex = (episodesPage - 1) * 50;
                const endIndex = Math.min(startIndex + 50, episodesCount);
                const eps = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i + 1);

                return eps.map((episodeNum, listIndex) => {
                  const watchProgress = getEpisodeProgress(anime.id, 1, episodeNum);
                  const jikanEp = jikanEpisodes.find(e => e.number === episodeNum);
                  const epTitleStr = jikanEp?.title || `${mainTitle.replace(/Season \d+/gi, "").trim()} - Episode ${episodeNum}`;
                  
                  return (
                    <motion.div
                      key={episodeNum}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(listIndex * 0.05, 0.3) }}
                      onClick={() => onWatchEpisode(anime.id, 1, episodeNum)}
                      className="group cursor-pointer flex flex-col gap-2 rounded-xl transition-all"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.05] group-hover:border-white/[0.2] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                        <EpisodeThumbnailItem
                          animeId={anime.anilistId || anime.id}
                          season={1}
                          episode={episodeNum}
                          fallbackImages={[anime.bannerImage || "", anime.coverImage?.extraLarge || "", anime.coverImage?.large || ""]}
                          animeTitle={mainTitle}
                          tvdbThumbnailMap={tvdbThumbnailMap}
                          alt={`Ep ${episodeNum}`}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 pointer-events-none"
                        />
                        {/* Gradient overlay for text */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        
                        {/* Play Icon hover effect */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                            <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                          </div>
                        </div>

                        {/* Labels on thumbnail */}
                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white text-black text-[10px] font-bold rounded uppercase">
                          Ep {episodeNum}
                        </div>
                        {/* Optional View count from Anivexa if available or just length */}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white/90 text-[10px] font-bold rounded backdrop-blur-sm">
                          24m
                        </div>

                        {/* Watch Progress bar */}
                        {watchProgress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
                            <div style={{ width: `${watchProgress}%` }} className="bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] h-full" />
                          </div>
                        )}
                      </div>
                      
                      <div className="px-1 mt-0.5">
                        <h4 className="text-white/90 text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-white transition-colors">
                          {epTitleStr}
                        </h4>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
