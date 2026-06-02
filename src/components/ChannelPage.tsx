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
    async function loadChannel() {
      setIsLoading(true);
      try {
        const data = await fetchAnimeDetails(animeId);
        if (data) {
          setAnime(data);
          setSubscribed(isSubscribed(data.id));
          setEpisodesPage(1); // Reset page on anime change
        }
      } catch (err) {
        console.error("Error loading channel:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadChannel();
  }, [animeId]);

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
    <div className="w-full bg-transparent pb-20 select-none z-10 relative">
      
      {/* =============== TOP CHANNEL HERO BANNER =============== */}
      <div className="w-full h-40 sm:h-56 md:h-64 relative overflow-hidden bg-black/20">
        {banner ? (
          <img
            src={banner}
            alt={mainTitle}
            className="w-full h-full object-cover brightness-[0.75]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-[#ff6b35]/20 to-[#ffa585]/1" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-black/20" />
      </div>

      {/* =============== CHANNEL HEADER CONTAINER =============== */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex flex-col md:flex-row gap-5 items-start relative -mt-6 z-10">
        
        {/* Large circular avatar */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-black/40 ring-4 ring-white/[0.08] flex-shrink-0 shadow-2xl relative group">
          <img
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
            <span className="text-white hover:text-[#ff6b35] transition-colors font-semibold">
              @{channelHandle}
            </span>
            <span className="text-gray-600">•</span>
            {anime.averageScore && (
              <span className="text-[#ff6b35] font-bold flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-[#ff6b35] stroke-none" />
                {(anime.averageScore / 10).toFixed(1)} Rating
              </span>
            )}
            <span className="text-gray-600">•</span>
            <span>{formatPopularity(anime.popularity)}</span>
            <span className="text-gray-600">•</span>
            <span className="px-1.5 py-0.2 bg-white/[0.06] border border-white/[0.08] text-[10px] text-gray-300 font-medium rounded">
              {formatAiringStatus(anime.status)}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-400 mt-2 line-clamp-1 max-w-xl font-normal leading-relaxed">
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
                : "bg-white text-black hover:bg-[#ff6b35] hover:text-white"
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
                  isActive ? "text-white font-bold" : "text-[#aaa] hover:text-white"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#ff6b35]" : "text-gray-400"}`} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#ff6b35] rounded-t-full" />
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
                <div className="flex flex-wrap gap-1.5 items-center bg-[#0d0d11] rounded-lg p-1 border border-white/5 shadow-md">
                  {Array.from({ length: Math.ceil(episodesCount / 50) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setEpisodesPage(i + 1)}
                      className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all cursor-pointer ${
                        episodesPage === i + 1 
                          ? "bg-[#ff6b35] text-white" 
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
                      className="bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.1] rounded-2xl overflow-hidden p-3 transition-all cursor-pointer group flex flex-col gap-3 min-w-0 shadow-lg"
                    >
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 shadow shrink-0">
                        <img
                          src={banner || profileAvatar}
                          alt={`Ep ${episodeNum}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all bg-opacity-70">
                          <Play className="w-8 h-8 fill-white stroke-none transform scale-90 group-hover:scale-100 transition-all duration-300" />
                        </div>
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">23:45</span>
                        {watchProgress > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                            <div style={{ width: `${watchProgress}%` }} className="bg-[#ff6b35] h-full" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-grow min-w-0 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                            Episode {startIndex + listIndex + 1}
                          </span>
                          <h4 className="text-white text-xs lg:text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-[#ff6b35] transition-colors">
                            {mainTitle.replace(/Season \d+/gi, "").trim()} - Ep {episodeNum}
                          </h4>
                        </div>
                        <p className="text-[10px] lg:text-xs text-gray-400 mt-2 line-clamp-1 font-mono">
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-[#0d0d11] p-6 rounded-2xl border border-white/[0.05] animate-fade-in font-sans shadow-lg">
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
                    className="px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-xs text-[#ff6b35] rounded-full font-medium"
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
                  <span className="text-[#ff6b35] font-bold">{(anime.averageScore || 75) / 10} / 10 Avg</span>
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
                  <span className="text-white font-bold hover:text-[#ff6b35] cursor-pointer transition-colors">@{channelHandle}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
