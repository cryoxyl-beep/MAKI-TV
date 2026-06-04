/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails, formatAiringStatus, formatPopularity } from "../services/anilist";
import { toggleSubscription, isSubscribed, getEpisodeProgress } from "../utils";
import SkeletonLoader from "./SkeletonLoader";
import { Check, Star, Play, Info, UserPlus, Youtube } from "lucide-react";
import LazyImage from "./LazyImage";

interface ChannelPageProps {
  animeId: number;
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
}

export default function ChannelPage({ animeId, onWatchEpisode, onSubscriptionChanged }: ChannelPageProps) {
  const [anime, setAnime] = useState<AniListAnime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"videos" | "about">("videos");
  const [subscribed, setSubscribed] = useState(false);
  const [episodesPage, setEpisodesPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function loadChannel() {
      setIsLoading(true);
      try {
        const data = await fetchAnimeDetails(animeId);
        if (data && mounted) {
          setAnime(data);
          setSubscribed(isSubscribed(data.id));
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
    if (anime) {
      const titleVal = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series";
      document.title = `${titleVal} • Miyoro`;
    }
  }, [anime]);

  const handleSubscribeToggle = () => {
    if (anime) {
      const result = toggleSubscription(anime);
      setSubscribed(result);
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
  const channelHandle = mainTitle.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "anime";

  const episodesCount = anime.episodes || 12;

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
              @{channelHandle}
            </span>
            <span className="text-gray-600">•</span>
            {anime.averageScore && (
              <span className="text-white drop-shadow font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-white stroke-none" />
                {(anime.averageScore / 10).toFixed(1)} Rating
              </span>
            )}
            <span className="text-gray-600">•</span>
            <span>{formatPopularity(anime.popularity)}</span>
            <span className="text-gray-600">•</span>
            <span className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/90 font-medium rounded">
              {formatAiringStatus(anime.status)}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-400 mt-3 line-clamp-1 max-w-xl font-normal leading-relaxed">
            {anime.genres?.slice(0, 4).join("  •  ")}
          </p>
        </div>

        {/* Subscribe Action Button */}
        <div className="md:pt-4 self-stretch md:self-auto flex items-center">
          <button
            onClick={handleSubscribeToggle}
            className={`w-full md:w-auto px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-tight shadow flex items-center justify-center gap-2 transition-all cursor-pointer ${
              subscribed
                ? "bg-[#272727] text-white hover:bg-[#323232] border border-white/5"
                : "bg-white text-black hover:bg-gray-200"
            }`}
          >
            {subscribed ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Subscribed</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Subscribe Channel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =============== TAB SELECTION NAV BAR =============== */}
      <div className="border-b border-white/[0.08] bg-[#0c0c10] sticky top-14 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex gap-6 sm:gap-8 items-center h-12">
          {[
            { id: "videos" as const, label: "Videos", icon: Youtube },
            { id: "about" as const, label: "About channel", icon: Info },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center h-full px-1 text-xs sm:text-sm font-medium tracking-tight cursor-pointer transition-colors duration-150 gap-1.5 ${
                  isActive ? "text-white font-bold" : "text-white/50 hover:text-white"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-gray-400"}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-full shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* =============== MAIN TABS CONTENT AREA =============== */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 font-sans">
        
        {/* TAB 1: VIDEOS TAB */}
        {activeTab === "videos" && (
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
            
            {/* 3-column Responsive Playlist Grid (3 on Desktop, 2 on Tablet, 1 on Mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
              {(() => {
                const startIndex = (episodesPage - 1) * 50;
                const endIndex = Math.min(startIndex + 50, episodesCount);
                const eps = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i + 1);

                return eps.map((episodeNum, listIndex) => {
                  const watchProgress = getEpisodeProgress(anime.id, 1, episodeNum);
                  
                  return (
                    <div
                      key={episodeNum}
                      onClick={() => onWatchEpisode(anime.id, 1, episodeNum)}
                      className="bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.1] rounded-2xl overflow-hidden p-3 transition-all cursor-pointer group flex flex-col gap-3 min-w-0 shadow-lg"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/[0.03] shadow shrink-0">
                        <LazyImage
                          src={banner || profileAvatar}
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
                            {mainTitle.replace(/Season \d+/gi, "").trim()} - Ep {episodeNum}
                          </h4>
                        </div>
                        <p className="text-[10px] lg:text-xs text-gray-500 mt-2 line-clamp-1 font-mono">
                          {watchProgress > 0 ? `Resume at ${Math.round(watchProgress)}%` : "Not watched yet"}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: ABOUT TAB */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white/[0.01] p-6 lg:p-8 rounded-2xl border border-white/[0.05] animate-fade-in font-sans shadow-lg">
            {/* Description left panel */}
            <div className="md:col-span-8 space-y-4">
              <h3 className="text-white font-extrabold text-base md:text-lg">Channel Biography</h3>
              <p
                className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans font-normal"
                dangerouslySetInnerHTML={{ __html: anime.description || "No biography details available for this anime." }}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {anime.genres?.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-xs text-white/80 tracking-wide rounded-full font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>

            {/* Stat counts right panel */}
            <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-white/[0.08] md:pl-6 pt-6 md:pt-0 space-y-4">
              <h3 className="text-white font-extrabold text-base md:text-lg">Stats & Credentials</h3>
              <div className="space-y-3 pt-1 text-xs sm:text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                  <span className="text-gray-400">Total Popularity</span>
                  <span className="text-white font-bold">{anime.popularity.toLocaleString()} followers</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                  <span className="text-gray-400">Average Score</span>
                  <span className="text-white font-bold flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    {(anime.averageScore || 75) / 10} / 10 Avg
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                  <span className="text-gray-400">Format Entry</span>
                  <span className="text-white font-bold">{anime.format || "TV Show"}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                  <span className="text-gray-400">Releasing Info</span>
                  <span className="text-white font-bold">{anime.season || "Unknown"} {anime.seasonYear || ""}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                  <span className="text-gray-400">Primary Studio</span>
                  <span className="text-white font-bold hover:text-white/80 cursor-pointer transition-colors">@{channelHandle}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
