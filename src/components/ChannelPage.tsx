/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails, formatAiringStatus, formatPopularity } from "../services/anilist";
import { buildSeasonsList, toggleSubscription, isSubscribed, getEpisodeProgress } from "../utils";
import SkeletonLoader from "./SkeletonLoader";
import { Check, Star, Play, CircleDot, Info, Layers, UserPlus, Youtube } from "lucide-react";

interface ChannelPageProps {
  animeId: number;
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
}

export default function ChannelPage({ animeId, onWatchEpisode, onSubscriptionChanged }: ChannelPageProps) {
  const [anime, setAnime] = useState<AniListAnime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "playlists" | "about">("playlists");
  const [subscribed, setSubscribed] = useState(false);
  
  // Seasons and episode configurations
  const [seasons, setSeasons] = useState<ReturnType<typeof buildSeasonsList>>([]);
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(-1); // -1 specifies no specific playlist is active, we just show the selection view
  const [episodesPage, setEpisodesPage] = useState(1);


  useEffect(() => {
    async function loadChannel() {
      setIsLoading(true);
      try {
        const data = await fetchAnimeDetails(animeId);
        if (data) {
          setAnime(data);
          setSubscribed(isSubscribed(data.id));
          const compiledSeasons = buildSeasonsList(data);
          setSeasons(compiledSeasons);
          
          // Default to the season representing the active current anime
          const currentIdx = compiledSeasons.findIndex((s) => s.animeId === data.id);
          setActiveSeasonIndex(currentIdx !== -1 ? currentIdx : 0);
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

  // Current active season details
  const activeSeason = seasons[activeSeasonIndex] || {
    seasonNumber: 1,
    episodesCount: anime.episodes || 12,
    title: mainTitle,
    coverImage: profileAvatar,
    bannerImage: banner,
    animeId: anime.id,
  };

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
            { id: "playlists" as const, label: "Playlists", icon: Layers },
            { id: "all" as const, label: "Home feed", icon: Youtube },
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
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        
        {/* TAB 1: ALL tab (Home profile content) */}
        {activeTab === "all" && (
          <div className="space-y-8 animate-fade-in">
            {/* Spotlight Banner style card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#0d0d11] border border-white/[0.05] p-5 rounded-2xl items-center shadow-md">
              <div className="md:col-span-4 aspect-video bg-black rounded-xl overflow-hidden relative shadow-lg">
                <img
                  src={banner || profileAvatar}
                  alt={mainTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => onWatchEpisode(activeSeason.animeId, activeSeason.seasonNumber, 1)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/20 transition-all cursor-pointer group"
                >
                  <div className="p-3 bg-[#ff6b35] rounded-full text-white shadow-xl group-hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 fill-white stroke-none" />
                  </div>
                </button>
              </div>
              <div className="md:col-span-8 space-y-2">
                <span className="text-[10px] md:text-xs font-bold text-[#ff6b35] uppercase tracking-widest leading-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35]" />
                  Channel Trailer Spotlight
                </span>
                <h3 className="text-white font-extrabold text-base md:text-xl font-sans">
                  Watch {mainTitle} Season 1 • Episode 1 free
                </h3>
                <p
                  className="text-gray-400 text-xs md:text-sm font-sans leading-relaxed line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: anime.description || "" }}
                />
              </div>
            </div>

            {/* Other seasons cards */}
            <div className="space-y-4">
              <h3 className="text-white font-bold text-lg">Other Seasons & Spin-offs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {seasons.map((season, idx) => (
                  <div
                    key={season.animeId}
                    className="flex p-3 rounded-2xl bg-[#0d0d11] hover:bg-[#15151c] border border-white/[0.04] hover:border-white/[0.08] items-center gap-3.5 transition-all cursor-pointer group shadow"
                    onClick={() => {
                      // find this season index and set it, then switch to seasons tab
                      setActiveSeasonIndex(idx);
                      setActiveTab("seasons");
                    }}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black shadow">
                      <img
                        src={season.coverImage}
                        alt={season.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] uppercase text-[#ff6b35] font-semibold tracking-wider">
                        Season {season.seasonNumber}
                      </span>
                      <h4 className="text-white text-xs sm:text-sm font-bold truncate">
                        {season.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {season.episodesCount} episode entries
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Community posts */}
            <div className="border-t border-white/[0.08] pt-6 space-y-4">
              <h3 className="text-white font-bold text-lg">Channel Feed Updates</h3>
              <div className="space-y-3.5">
                {[
                  { days: "2 days ago", post: `The production committee has officially confirmed we will be launching subtitles sync loops for Season ${seasons.length > 1 ? "2" : "1"} later! Standard MakiTV quality only is expected.`, hearts: "14.2K" },
                  { days: "1 week ago", post: `Thank you for supporting ${mainTitle} channel! Toggle subscriptions to get customized notification bells inside your visual drawers.`, hearts: "8.5K" }
                ].map((post, i) => (
                  <div key={i} className="bg-[#0d0d11] border border-white/[0.05] p-4 rounded-xl space-y-2 shadow">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden">
                        <img src={profileAvatar} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-white text-xs font-bold">@{channelHandle}</span>
                      <span className="text-gray-500 text-[10px]">{post.days}</span>
                    </div>
                    <p className="text-xs text-gray-300 font-sans leading-relaxed">
                      {post.post}
                    </p>
                    <div className="flex items-center text-xs text-[#ff6b35] font-bold gap-1 pt-1 select-none">
                      <span>♥</span>
                      <span>{post.hearts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PLAYLISTS TAB */}
        {activeTab === "playlists" && (
          <div className="animate-fade-in">
            {activeSeasonIndex === -1 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
                  <h3 className="text-white text-base md:text-lg font-bold tracking-tight">
                    Created Playlists
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {seasons.map((season, idx) => (
                    <div
                      key={season.animeId}
                      onClick={() => {
                        setActiveSeasonIndex(idx);
                        setEpisodesPage(1);
                      }}
                      className="group cursor-pointer space-y-2.5 flex flex-col"
                    >
                      <div className="relative aspect-video w-full bg-black/40 rounded-xl overflow-hidden shadow border border-white/[0.06]">
                        <img
                          src={season.bannerImage || season.coverImage}
                          alt={season.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 fill-white stroke-none drop-shadow-md" />
                        </div>
                        <div className="absolute right-2 bottom-2 bg-black/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Layers className="w-3 h-3 text-white" />
                          <span className="text-[10px] text-white font-bold">{season.episodesCount}</span>
                        </div>
                      </div>
                      <div className="px-1">
                        <h4 className="text-white text-sm font-semibold tracking-tight leading-tight line-clamp-2 group-hover:text-[#ff6b35] transition-colors pb-0.5">
                          {season.title}
                        </h4>
                        <span className="text-[11px] text-gray-400 font-medium pb-2">View full playlist</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start relative">
                {/* LEFT PANEL: Playlist Details (Sticky) */}
                <div className="w-full md:w-[320px] lg:w-[360px] flex-shrink-0 md:sticky md:top-28 space-y-4 bg-[#0d0d11] p-4 lg:p-5 rounded-2xl border border-white/[0.05] shadow-xl">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/50 border border-white/10 shadow-lg group">
                    <img
                      src={activeSeason.bannerImage || activeSeason.coverImage}
                      alt={activeSeason.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer group-hover:bg-black/20 transition-all" onClick={() => onWatchEpisode(activeSeason.animeId, activeSeason.seasonNumber, 1)}>
                       <div className="p-3 bg-[#ff6b35]/90 rounded-full hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-white stroke-none" />
                       </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-white text-xl lg:text-2xl font-extrabold tracking-tight leading-tight">
                      {activeSeason.title}
                    </h2>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      {activeSeason.role || "Season"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-gray-300 border-y border-white/[0.08] py-3">
                    <p className="flex justify-between">
                      <span className="text-gray-500">Episodes</span>
                      <span className="font-semibold text-white">{activeSeason.episodesCount} total</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-500">Aired Year</span>
                      <span className="font-semibold text-white">{anime.seasonYear || activeSeason.seasonNumber * 2000 || "Unknown"}</span>
                    </p>
                    {activeSeason.popularity && (
                      <p className="flex justify-between">
                        <span className="text-gray-500">Rating</span>
                        <span className="text-[#ff6b35] font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#ff6b35] stroke-none" />
                          {(activeSeason.popularity / 1000).toFixed(1)}k
                        </span>
                      </p>
                    )}
                  </div>
                  
                  <p className="text-xs lg:text-sm text-gray-400 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-2">
                    {anime.description?.replace(/<[^>]+>/g, '') || "No description available."}
                  </p>
                  
                  <button onClick={() => setActiveSeasonIndex(-1)} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-full text-xs font-bold transition-colors">
                    Back to all Playlists
                  </button>
                </div>

                {/* RIGHT PANEL: Scrolable Episodes */}
                <div className="flex-1 min-w-0 flex flex-col space-y-4 mb-10 w-full">
                  <div className="flex items-center justify-between">
                     <h3 className="text-white text-lg font-bold">Videos</h3>
                     
                     {activeSeason.episodesCount > 50 && (
                        <div className="flex gap-2 items-center bg-[#0d0d11] rounded-lg p-1 border border-white/5 shadow-md">
                           {Array.from({ length: Math.ceil(activeSeason.episodesCount / 50) }).map((_, i) => (
                             <button
                               key={i}
                               onClick={() => setEpisodesPage(i + 1)}
                               className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${episodesPage === i + 1 ? "bg-[#ff6b35] text-white" : "text-gray-400 hover:text-white"}`}
                             >
                               {i * 50 + 1}-{Math.min((i + 1) * 50, activeSeason.episodesCount)}
                             </button>
                           ))}
                        </div>
                     )}
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {(() => {
                      const startIndex = (episodesPage - 1) * 50;
                      const endIndex = Math.min(startIndex + 50, activeSeason.episodesCount);
                      const eps = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i + 1);

                      return eps.map((episodeNum, listIndex) => {
                        const watchProgress = getEpisodeProgress(activeSeason.animeId, activeSeason.seasonNumber, episodeNum);
                        
                        return (
                          <div
                            key={episodeNum}
                            onClick={() => onWatchEpisode(activeSeason.animeId, activeSeason.seasonNumber, episodeNum)}
                            className="flex gap-3 lg:gap-4 p-2 lg:p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer group items-center"
                          >
                            <div className="text-gray-500 font-bold text-xs lg:text-sm w-4 lg:w-6 text-center">{startIndex + listIndex + 1}</div>
                            
                            <div className="relative w-28 lg:w-40 aspect-video rounded-lg overflow-hidden bg-black/40 shadow shrink-0">
                              <img
                                src={activeSeason.bannerImage || activeSeason.coverImage}
                                alt={`Ep ${episodeNum}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all bg-opacity-70">
                                <Play className="w-5 h-5 fill-white stroke-none" />
                              </div>
                              <span className="absolute bottom-1 right-1 px-1 bg-black/80 text-white text-[9px] font-bold rounded">23:45</span>
                              {watchProgress > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                  <div style={{ width: `${watchProgress}%` }} className="bg-[#ff6b35] h-full" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <h4 className="text-white text-xs lg:text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-[#ff6b35] transition-colors">
                                {activeSeason.title.replace(/Season \d+/gi, "").trim()} - Episode {episodeNum}
                              </h4>
                              <p className="text-[10px] lg:text-xs text-gray-400 mt-1 line-clamp-1">
                                {watchProgress > 0 ? `Resume at ${Math.round(watchProgress)}%` : "Not watched yet"}
                              </p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ABOUT TAB (Descriptive fields) */}
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
                  <span className="text-white font-bold">TV Show</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.06]">
                  <span className="text-gray-400">Releasing Info</span>
                  <span className="text-white font-bold">{anime.season} {anime.seasonYear}</span>
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
