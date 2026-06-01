/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails } from "../services/anilist";
import { getTMDBMapping } from "../services/mapping";
import { 
  addToWatchHistory, 
  isSubscribed, 
  toggleSubscription, 
  getEpisodeProgress,
  getUnifiedWatchState
} from "../utils";
import VideoPlayer from "./VideoPlayer";
import SkeletonLoader from "./SkeletonLoader";
import { Share2, Bookmark, Layers, Play } from "lucide-react";

interface WatchPageProps {
  animeId: number;
  seasonNumber: number;
  episodeNumber: number;
  onNavigateToChannel: (id: number) => void;
  onNavigateToEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
}

export default function WatchPage({
  animeId,
  seasonNumber,
  episodeNumber,
  onNavigateToChannel,
  onNavigateToEpisode,
  onSubscriptionChanged,
}: WatchPageProps) {
  const [anime, setAnime] = useState<AniListAnime | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mapping States
  const [tmdbId, setTmdbId] = useState<number>(0);
  const [mediaType, setMediaType] = useState<"tv" | "movie">("tv");

  // Selected active server/provider
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem("makitv_selected_provider") || "cinesrc";
  });

  // Floating continue/session resume prompt trigger
  const [resumeSession, setResumeSession] = useState<{
    season: number;
    episode: number;
    provider: string;
  } | null>(null);

  // Likes and share interaction trackers
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [savedBookmark, setSavedBookmark] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    async function loadWatchAnime() {
      setIsLoading(true);
      try {
        const data = await fetchAnimeDetails(animeId);
        if (data) {
          setAnime(data);
          setSubscribed(isSubscribed(data.id));

          // Load target TMDB maps
          const mapped = await getTMDBMapping(data);
          setTmdbId(mapped.tmdbId);
          setMediaType(mapped.type);

          // Add this initial watching entry to history (0% progress initially or loaded from previous score)
          const lastPercentProgress = getEpisodeProgress(data.id, seasonNumber, episodeNumber);
          addToWatchHistory({
            animeId: data.id,
            animeTitle: data.title.english || data.title.romaji || data.title.userPreferred || "Untitled Series",
            episodeNumber,
            seasonNumber,
            progress: lastPercentProgress,
            duration: "23:45",
            bannerImage: data.bannerImage,
            coverImage: data.coverImage.large,
          });

          // Check if there is an active session in local storage we can offer to resume
          const lastWatchState = getUnifiedWatchState(data.id);
          if (
            lastWatchState && 
            (lastWatchState.last_season_watched !== seasonNumber || lastWatchState.last_episode_watched !== episodeNumber)
          ) {
            setResumeSession({
              season: lastWatchState.last_season_watched,
              episode: lastWatchState.last_episode_watched,
              provider: lastWatchState.provider,
            });
          } else {
            setResumeSession(null);
          }
        }
      } catch (err) {
        console.error("Error loading watch channel:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadWatchAnime();
  }, [animeId, seasonNumber, episodeNumber]);

  // Update history progress as the video moves
  const handleProgressUpdate = (percent: number) => {
    if (anime) {
      addToWatchHistory({
        animeId: anime.id,
        animeTitle: anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series",
        episodeNumber,
        seasonNumber,
        progress: percent,
        duration: "23:45",
        bannerImage: anime.bannerImage,
        coverImage: anime.coverImage.large,
      });
    }
  };

  const handleSelectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    localStorage.setItem("makitv_selected_provider", providerId);
  };

  const handleNextEpisode = () => {
    const totalEpisodes = anime?.episodes || 12;
    if (episodeNumber < totalEpisodes) {
      onNavigateToEpisode(animeId, seasonNumber, episodeNumber + 1);
    } else {
      onNavigateToEpisode(animeId, seasonNumber, 1);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleChannelSubscribeToggle = () => {
    if (anime) {
      const res = toggleSubscription(anime);
      setSubscribed(res);
      onSubscriptionChanged();
    }
  };

  if (isLoading) {
    return <SkeletonLoader type="watch" />;
  }

  if (!anime) {
    return (
      <div className="w-full text-center py-20 bg-transparent text-gray-400 select-none">
        <p>Watch details could not be found.</p>
      </div>
    );
  }

  const romaji = anime.title.romaji || "";
  const english = anime.title.english || "";
  const mainTitle = english || romaji || anime.title.userPreferred || "Untitled Anime";
  
  const episodesCount = anime.episodes || 12;
  const studioName = anime.studios?.nodes?.[0]?.name || "Independent Studio";
  const avatar = anime.coverImage.medium || anime.coverImage.large || "";

  return (
    <div className="w-full bg-transparent pb-20 select-none z-10 relative">
      
      {/* =============== RESUME PREVIOUS SESSION HUD ALERT =============== */}
      {resumeSession && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-[#121214] border border-[#ff6b35]/25 hover:border-[#ff6b35]/40 px-4 py-3.5 rounded-xl flex items-center justify-between gap-4 animate-fade-in shadow-xl select-none">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-[#ff6b35] animate-pulse" />
              <div className="text-xs sm:text-sm">
                <span className="text-[#aaa]">Continue watching? </span>
                <strong className="text-white">Season {resumeSession.season} • Episode {resumeSession.episode}</strong>
                <span className="text-[#aaa]"> is ready from where you left off.</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResumeSession(null)}
                className="text-gray-500 hover:text-white text-xs px-2.5 py-1"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  if (resumeSession.provider) {
                    handleSelectProvider(resumeSession.provider);
                  }
                  onNavigateToEpisode(anime.id, resumeSession.season, resumeSession.episode);
                  setResumeSession(null);
                }}
                className="px-4 py-1.5 bg-[#ff6b35] hover:bg-[#ff7e4e] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md shadow-[#ff6b35]/20"
              >
                Resume Play
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============== MAIN TWO-COLUMN VIEWPORT LISTS =============== */}
      <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 leading-relaxed">
        
        {/* LEFT COLUMN: Player, Details, and Info Panels */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          
          <VideoPlayer
            animeId={anime.id}
            episodeNumber={episodeNumber}
            seasonNumber={seasonNumber}
            animeTitle={mainTitle}
            onProgressUpdate={handleProgressUpdate}
            savedProgress={getEpisodeProgress(anime.id, seasonNumber, episodeNumber)}
            selectedProvider={selectedProvider}
            tmdbId={tmdbId}
            mediaType={mediaType}
            onNextEpisode={handleNextEpisode}
          />

          {/* Episode Title Row */}
          <div>
            <span className="text-xs uppercase text-[#ff6b35] font-bold tracking-widest block mb-0.5 animate-pulse">
              Playing Now: Season {seasonNumber} • Episode {episodeNumber}
            </span>
            <h1 className="text-white text-lg sm:text-xl font-bold font-sans tracking-tight leading-tight">
              {mainTitle} Episode {episodeNumber} - Official Premium Simulcast Source
            </h1>
          </div>

          {/* Interactions and metadata Row (Views, Likes, Share buttons) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center py-2 border-b border-white/[0.08] text-[#f1f1f1] select-none">
            <div className="text-xs sm:text-sm text-[#aaa] font-normal">
              <span>{anime.format || "TV"}</span>
              <span className="mx-2">•</span>
              <span>{anime.seasonYear || "Simulcast"}</span>
            </div>

            {/* Icons row */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <button
                onClick={handleShare}
                className="py-1.5 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-full hover:bg-white/[0.1] flex items-center gap-2 cursor-pointer transition-colors relative"
              >
                <Share2 className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{copiedNotification ? "Copied Link!" : "Share Link"}</span>
              </button>

              <button
                onClick={() => setSavedBookmark(!savedBookmark)}
                className={`py-1.5 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-full hover:bg-white/[0.1] flex items-center gap-2 cursor-pointer transition-colors ${
                  savedBookmark ? "text-[#ff6b35]" : "text-white"
                }`}
              >
                <Bookmark className={`w-4 h-4 ${savedBookmark ? "fill-[#ff6b35]" : ""}`} />
                <span className="font-semibold">{savedBookmark ? "Saved" : "Watch Later"}</span>
              </button>
            </div>
          </div>

          {/* ================= SERVER SELECTOR SYSTEM ================= */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4.5 space-y-3.5 shadow backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-pulse" />
              <h3 className="text-white text-xs font-bold uppercase tracking-wider text-gray-300">
                Primary Streaming Multiplex (Server Select)
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: "cinesrc", name: "Taberu", desc: "Sub & Dub" },
                { id: "vidfast", name: "Matsuri", desc: "Fast Dubs/Subs" },
                { id: "movies111", name: "Onigiri", desc: "Backup" },
              ].map((provider) => {
                const isActive = selectedProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => handleSelectProvider(provider.id)}
                    className={`px-4 py-3 rounded-xl text-left text-xs font-bold font-sans cursor-pointer flex flex-col items-start transition-all duration-200 select-none relative overflow-hidden group/btn ${
                      isActive
                        ? "bg-[#ff6b35]/15 border border-[#ff6b35]/40 text-white shadow shadow-[#ff6b35]/5"
                        : "bg-white/[0.03] border border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/[0.12]"
                    }`}
                  >
                    {/* Glowing active indicator dot */}
                    {isActive && (
                      <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#ff6b35]" />
                    )}
                    <span className={`text-[11px] uppercase tracking-wider ${isActive ? "text-[#ff6b35]" : "text-gray-300 group-hover/btn:text-white"}`}>
                      {provider.name}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1.5 group-hover/btn:text-gray-400 font-normal leading-relaxed block">
                      {provider.desc}
                    </span>
                    {isActive && (
                      <span className="absolute inset-0 bg-[#ff6b35]/[0.02] border-b-2 border-[#ff6b35] pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Publisher/Channel row profile connector */}
          <div className="flex items-center gap-4 py-3 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.06] px-4 rounded-2xl border border-white/[0.06] justify-between transition-all">
            <div
              onClick={() => onNavigateToChannel(anime.id)}
              className="flex gap-3 items-center cursor-pointer group min-w-0"
              title="Go to anime channel hub"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-black ring-1 ring-white/10 group-hover:scale-105 transition-transform shadow-inner">
                <img src={avatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white text-sm font-bold group-hover:text-[#ff6b35] transition-colors truncate">
                  {studioName}
                </h3>
                <span className="text-[11px] text-gray-400 font-medium block">
                  Official Anime Publisher
                </span>
              </div>
            </div>

            <button
              onClick={handleChannelSubscribeToggle}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                subscribed ? "bg-white/[0.08] border border-white/[0.1] text-white hover:bg-white/[0.12]" : "bg-white text-black hover:bg-[#ff6b35] hover:text-white"
              }`}
            >
              {subscribed ? "Subscribed" : "Subscribe Channel"}
            </button>
          </div>

          {/* Content Description Accordion */}
          <div className="bg-white/[0.02] backdrop-blur-md rounded-2xl border border-white/[0.06] p-5 space-y-2 select-none font-sans shadow-lg">
            <span className="text-white text-xs font-bold uppercase tracking-widest font-sans flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#ff6b35]" />
              Anime Synopsis Hub
            </span>
            <p
              className="text-[#bbb] text-xs sm:text-sm leading-relaxed font-sans font-normal"
              dangerouslySetInnerHTML={{ __html: anime.description || "No biography summary available for this item." }}
            />
            {anime.genres && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {anime.genres.slice(0, 5).map((genre) => (
                  <span key={genre} className="px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-400 rounded-full font-medium">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =============== RIGHT COLUMN: INTEGRATED EPISODE QUEUE SIDEBAR =============== */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
              <h3 className="text-white text-sm font-bold font-sans tracking-tight">
                Up Next Episodes
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">
              {episodeNumber} / {episodesCount}
            </span>
          </div>

          {/* Scrollable Playlist Queue Container */}
          <div className="flex flex-col gap-2 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
            {[...Array(episodesCount)].map((_, idx) => {
              const epNum = idx + 1;
              const isActive = epNum === episodeNumber;
              const progressVal = getEpisodeProgress(anime.id, seasonNumber, epNum);

              return (
                <div
                  key={epNum}
                  onClick={() => onNavigateToEpisode(anime.id, seasonNumber, epNum)}
                  className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 group relative border ${
                    isActive
                      ? "bg-[#ff6b35]/10 border-[#ff6b35]/40 text-white animate-fade-in"
                      : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08]"
                  }`}
                >
                  {/* Episode Thumbnail */}
                  <div className="relative w-24 aspect-video bg-black/40 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                    <img
                      src={anime.coverImage.medium || anime.coverImage.large}
                      alt={`${mainTitle} Episode ${epNum}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded">
                      EP {epNum}
                    </span>
                    
                    {isActive && (
                      <div className="absolute inset-0 bg-[#ff6b35]/20 flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white stroke-none animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Episode Metadata */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center font-sans">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-[#ff6b35]" : "text-gray-400"}`}>
                      {isActive ? "Now Playing" : `Up Next - Episode ${epNum}`}
                    </span>
                    <h4 className={`text-xs font-bold truncate transition-colors leading-snug mt-0.5 ${isActive ? "text-[#ff6b35]" : "text-white group-hover:text-[#ff6b35]"}`}>
                      Episode {epNum}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {progressVal > 0 ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <div className="w-12 bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="bg-[#ff6b35] h-full" style={{ width: `${progressVal}%` }} />
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono">{Math.round(progressVal)}% watched</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-sans">Ready to play</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
