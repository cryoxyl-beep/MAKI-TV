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
  getEpisodeProgress,
  getUnifiedWatchState,
  isWatchLater,
  toggleWatchLater
} from "../utils";
import { useLibrary } from "../hooks/useLibrary";
import LazyImage from "./LazyImage";
import VideoPlayer from "./VideoPlayer";
import SkeletonLoader from "./SkeletonLoader";
import { Share2, Bookmark, Play, ChevronLeft, ChevronRight, CheckSquare, Square, ChevronDown, Grid, List, Search } from "lucide-react";

interface WatchPageProps {
  animeId: number;
  seasonNumber: number;
  episodeNumber: number;
  onNavigateToChannel: (id: number) => void;
  onNavigateToEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
}

interface JikanEpisode {
  mal_id: number;
  url: string;
  title: string;
  title_japanese: string;
  title_romanji: string;
  aired: string;
  score: number;
  filler: boolean;
  recap: boolean;
  forum_url: string;
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
    return localStorage.getItem("makitv_selected_provider") || "megaplay";
  });

  const { isSubscribed, toggleSubscription, currentUser } = useLibrary();

  // Floating continue/session resume prompt trigger
  const [resumeSession, setResumeSession] = useState<{
    season: number;
    episode: number;
    provider: string;
  } | null>(null);

  // Likes and share interaction trackers
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [savedBookmark, setSavedBookmark] = useState(false);
  
  // Jikan State
  const [episodesMap, setEpisodesMap] = useState<Record<number, JikanEpisode[]>>({});
  const [episodeDescription, setEpisodeDescription] = useState<string | null>(null);
  const [currentRange, setCurrentRange] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");

  useEffect(() => {
    setSavedBookmark(isWatchLater(animeId, seasonNumber, episodeNumber));
  }, [animeId, seasonNumber, episodeNumber]);

  const episodesCount = anime?.episodes || 12;
  const isLongRunning = episodesCount >= 100;
  
  // Set initial range based on current episode
  useEffect(() => {
    if (isLongRunning) {
      setCurrentRange(Math.ceil(episodeNumber / 100) || 1);
    } else {
      setCurrentRange(1);
    }
  }, [episodeNumber, isLongRunning]);

  useEffect(() => {
    let mounted = true;
    async function loadWatchAnime() {
      setIsLoading(true);
      try {
        const data = await fetchAnimeDetails(animeId);
        if (data && mounted) {
          setAnime(data);

          // Load target TMDB maps
          const mapped = await getTMDBMapping(data);
          if (mounted) {
            setTmdbId(mapped.tmdbId);
            setMediaType(mapped.type);
          }

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
        if (mounted) setIsLoading(false);
      }
    }
    loadWatchAnime();
    return () => { mounted = false; };
  }, [animeId, seasonNumber, episodeNumber]);

  // Fetch Jikan episodes list
  useEffect(() => {
    let mounted = true;
    async function fetchEpisodesPage(page: number) {
      if (episodesMap[page]) return; // Already fetched
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/episodes?page=${page}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.data) {
            setEpisodesMap(prev => ({ ...prev, [page]: data.data }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch episodes list", e);
      }
    }
    fetchEpisodesPage(currentRange);
    return () => { mounted = false; };
  }, [animeId, currentRange, episodesMap]);

  // Fetch Jikan episode details
  useEffect(() => {
    let mounted = true;
    async function fetchEpisodeDetails() {
      try {
        setEpisodeDescription(null);
        const res = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/episodes/${episodeNumber}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.data?.synopsis) {
            setEpisodeDescription(data.data.synopsis);
          }
        }
      } catch (e) {
        console.error("Failed to fetch episode details", e);
      }
    }
    fetchEpisodeDetails();
    return () => { mounted = false; };
  }, [animeId, episodeNumber]);

  useEffect(() => {
    if (anime) {
      const titleVal = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series";
      document.title = `${titleVal} • Miyoro`;
    }
  }, [anime]);

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
    if (episodeNumber < episodesCount) {
      onNavigateToEpisode(animeId, seasonNumber, episodeNumber + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (episodeNumber > 1) {
      onNavigateToEpisode(animeId, seasonNumber, episodeNumber - 1);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleToggleWatchLater = async () => {
    if (anime) {
      const mainTitle = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Anime";
      const banner = anime.bannerImage;
      const avatar = anime.coverImage.medium || anime.coverImage.large;
      const isNowSaved = toggleWatchLater({
        animeId: anime.id,
        animeTitle: mainTitle,
        seasonNumber: seasonNumber,
        episodeNumber: episodeNumber,
        bannerImage: banner,
        coverImage: avatar,
      });
      setSavedBookmark(isNowSaved);
      
      // Also sync with library hook if subscribed behavior matches
      await toggleSubscription(anime);
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
  
  const avatar = anime.coverImage.medium || anime.coverImage.large || "";
  const studioName = anime.studios?.nodes?.[0]?.name || anime.format || "Official Studio";

  const currentEpData = episodesMap[currentRange]?.find(e => e.mal_id === episodeNumber);
  const currentEpTitle = currentEpData?.title || "";

  return (
    <div className="w-full bg-transparent pb-20 select-none z-10 relative animate-fade-in text-[#f1f1f1]">
      
      {/* =============== RESUME PREVIOUS SESSION HUD ALERT =============== */}
      {resumeSession && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-[#121214] border border-white/10 hover:border-white/20 px-4 py-3.5 rounded-xl flex items-center justify-between gap-4 animate-fade-in shadow-xl select-none">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
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
                className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md"
              >
                Resume Play
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============== MAIN TWO-COLUMN VIEWPORT LISTS =============== */}
      <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-12 gap-8 leading-relaxed">
        
        {/* LEFT COLUMN: Player, Details, and Info Panels */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          
          <VideoPlayer
            animeId={anime.id}
            episodeNumber={episodeNumber}
            seasonNumber={seasonNumber}
            animeTitle={mainTitle}
            englishTitle={anime.title.english}
            romajiTitle={anime.title.romaji}
            synonyms={anime.synonyms || []}
            onProgressUpdate={handleProgressUpdate}
            savedProgress={getEpisodeProgress(anime.id, seasonNumber, episodeNumber)}
            selectedProvider={selectedProvider}
            tmdbId={tmdbId}
            mediaType={mediaType}
            onNextEpisode={handleNextEpisode}
            onProviderChange={handleSelectProvider}
          />

          {/* Player Navigation & Controls */}
          <div className="flex items-center justify-between mt-4 text-sm flex-wrap gap-4 select-none pb-2">
            {/* Left: Auto Switchers */}
            <div className="flex items-center gap-6">
              {(selectedProvider === "megaplay" || selectedProvider === "origami") && (
                <>
                  <button className="flex items-center gap-2 text-white hover:text-white transition-colors cursor-pointer group font-semibold text-xs uppercase tracking-wider">
                    <CheckSquare className="w-4 h-4 text-white" />
                    Auto Skip
                  </button>
                  <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer group font-semibold text-xs uppercase tracking-wider">
                    <Square className="w-4 h-4" />
                    Auto Next
                  </button>
                </>
              )}
            </div>

            {/* Right: Prev / Next */}
            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={handlePrevEpisode}
                disabled={episodeNumber <= 1}
                className={`text-xs font-semibold uppercase tracking-widest flex items-center gap-1 ${episodeNumber <= 1 ? "text-white/20 cursor-not-allowed" : "text-white/60 hover:text-white cursor-pointer transition-colors"}`}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-white/40 text-xs font-semibold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                Episode {episodeNumber} / {episodesCount}
              </span>
              <button
                onClick={handleNextEpisode}
                disabled={episodeNumber >= episodesCount}
                className={`text-xs font-semibold uppercase tracking-widest flex items-center gap-1 ${episodeNumber >= episodesCount ? "text-white/20 cursor-not-allowed" : "text-white/60 hover:text-white cursor-pointer transition-colors"}`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Episode Info */}
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <h1 className="text-white text-xl sm:text-2xl font-bold font-sans tracking-tight leading-tight">
              S{seasonNumber}E{episodeNumber}{currentEpTitle ? `: ${currentEpTitle}` : ""}
            </h1>
            {episodeDescription && (
              <p className="mt-3 text-white/60 text-sm leading-relaxed font-sans font-normal max-w-4xl line-clamp-3 hover:line-clamp-none transition-all">
                {episodeDescription}
              </p>
            )}
          </div>

          {/* Interactions: Watch Later & Share */}
          <div className="flex items-center gap-3 mt-4 text-xs sm:text-sm">
            <button onClick={handleToggleWatchLater} className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors cursor-pointer font-semibold ${savedBookmark ? "bg-white text-black border-white" : "bg-white/[0.04] text-white border-white/10 hover:bg-white/[0.08]"}`}>
              <Bookmark className={`w-4 h-4 ${savedBookmark ? "fill-black" : ""}`} />
              {savedBookmark ? "Saved to Library" : "Watch Later"}
            </button>
            <button onClick={handleShare} className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 rounded-lg flex items-center gap-2 transition-colors cursor-pointer font-semibold">
              <Share2 className="w-4 h-4" />
              {copiedNotification ? "Copied!" : "Share"}
            </button>
          </div>

          {/* ================= SERVER SELECTOR SYSTEM ================= */}
          <div className="mt-8 space-y-6">
            {/* Primary Servers */}
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase text-white/40 font-bold tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                Primary Servers
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { id: "megaplay", name: "MegaPlay", tags: ["S-SUB", "DUB"] },
                  { id: "origami", name: "Origami", tags: ["S-SUB", "DUB"] }
                ].map(provider => {
                  const isActive = selectedProvider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleSelectProvider(provider.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer select-none group outline-none ${isActive ? "bg-white/10 border-white/20 shadow-lg shadow-white/5" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10"}`}
                    >
                       <span className={`text-sm font-bold tracking-wide transition-colors ${isActive ? "text-white" : "text-white/60 group-hover:text-white/90"}`}>
                         {provider.name}
                       </span>
                       <div className="flex gap-1.5">
                         {provider.tags.map(tag => (
                           <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/50"}`}>{tag}</span>
                         ))}
                       </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fallback Servers */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] uppercase text-white/30 font-bold tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Fallback Servers
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "cinesrc", name: "Taberu", tags: ["EMBED", "S-SUB"] },
                  { id: "vidfast", name: "Matsuri", tags: ["EMBED", "S-SUB"] },
                  { id: "movies111", name: "Onigiri", tags: ["EMBED", "S-SUB"] }
                ].map(provider => {
                  const isActive = selectedProvider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleSelectProvider(provider.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer select-none group outline-none ${isActive ? "bg-white/10 border-white/20 shadow-lg" : "bg-white/[0.015] border-white/[0.03] hover:bg-white/[0.04] hover:border-white/5"}`}
                    >
                       <span className={`text-xs font-semibold tracking-wide transition-colors ${isActive ? "text-white" : "text-white/40 group-hover:text-white/80"}`}>
                         {provider.name}
                       </span>
                       <div className="flex gap-1">
                         {provider.tags.map(tag => (
                           <span key={tag} className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${isActive ? "bg-white/10 text-white/70" : "bg-white/5 text-white/30"}`}>{tag}</span>
                         ))}
                       </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Anime Information Block (Compact) */}
          <div 
            onClick={() => onNavigateToChannel(anime.id)}
            className="mt-10 flex items-center gap-4 py-3 bg-white/[0.02] px-4 rounded-xl border border-white/[0.05] justify-between cursor-pointer hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
               <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-black/40 border border-white/5 shadow-inner">
                  <LazyImage src={avatar} alt={mainTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
               </div>
               <div className="min-w-0">
                  <h3 className="text-white text-sm font-bold truncate group-hover:text-white transition-colors">
                    {mainTitle}
                  </h3>
                  <span className="text-xs text-white/40 font-medium block truncate">
                    {studioName}
                  </span>
               </div>
            </div>
          </div>

        </div>

        {/* =============== RIGHT COLUMN: INTEGRATED EPISODE QUEUE SIDEBAR =============== */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-white/[0.05] gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-white text-base font-bold font-sans tracking-tight">
                  Episodes
                </h3>
                {isLongRunning && (
                  <div className="relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-white/80 transition-colors cursor-pointer"
                    >
                      {(currentRange - 1) * 100 + 1}-{Math.min(currentRange * 100, episodesCount)}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 max-h-64 overflow-y-auto w-32 bg-[#121214] border border-white/10 rounded-xl shadow-xl z-50 custom-scrollbar">
                        {[...Array(Math.ceil(episodesCount / 100))].map((_, idx) => {
                          const page = idx + 1;
                          const pStart = (page - 1) * 100 + 1;
                          const pEnd = Math.min(page * 100, episodesCount);
                          return (
                            <button
                              key={page}
                              onClick={() => { setCurrentRange(page); setIsDropdownOpen(false); setEpisodeSearchQuery(""); }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer ${currentRange === page ? "text-white bg-white/10" : "text-white/60"}`}
                            >
                              {pStart}-{pEnd}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center w-full sm:w-auto gap-2">
                {isLongRunning ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                      <input
                        type="text"
                        placeholder="Search num or title..."
                        className="w-full sm:w-40 bg-white/5 hover:bg-white/10 border-none outline-none text-xs text-white rounded-lg pl-8 pr-3 py-1.5 transition-colors placeholder:text-white/30 font-medium"
                        value={episodeSearchQuery}
                        onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-shrink-0 items-center bg-white/5 rounded-lg p-0.5">
                       <button 
                         onClick={() => setViewMode("list")}
                         className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "list" ? "bg-white/20 text-white" : "text-white/40 hover:text-white/80"}`}
                       >
                         <List className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => setViewMode("grid")}
                         className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === "grid" ? "bg-white/20 text-white" : "text-white/40 hover:text-white/80"}`}
                       >
                         <Grid className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-white/40 font-semibold bg-white/5 px-2 py-1 rounded-md">
                    {episodesCount} available
                  </span>
                )}
              </div>
            </div>

          {/* Scrollable Playlist Queue Container */}
          <div className="flex flex-col gap-1 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const currentRangeStart = (currentRange - 1) * 100 + 1;
              const currentRangeEnd = Math.min(currentRange * 100, episodesCount);
              const currentRangeCount = isLongRunning ? Math.max(0, currentRangeEnd - currentRangeStart + 1) : episodesCount;
              
              let episodesToRender = [...Array(currentRangeCount)].map((_, idx) => isLongRunning ? currentRangeStart + idx : idx + 1);

              if (episodeSearchQuery.trim() !== "") {
                const query = episodeSearchQuery.toLowerCase();
                episodesToRender = episodesToRender.filter((epNum) => {
                  const epData = episodesMap[currentRange]?.find(e => e.mal_id === epNum);
                  const epTitle = epData?.title?.toLowerCase() || "";
                  return epNum.toString().includes(query) || epTitle.includes(query);
                });
              }

              if (viewMode === "grid" && isLongRunning) {
                return (
                  <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
                     {episodesToRender.map(epNum => {
                       const isActive = epNum === episodeNumber;
                       const progressVal = getEpisodeProgress(anime.id, seasonNumber, epNum);
                       const epData = episodesMap[currentRange]?.find(e => e.mal_id === epNum);
                       
                       let badgeClasses = "";
                       if (epData?.filler) badgeClasses = "bg-[#9bc2e6]/20 text-[#9bc2e6] border-[#9bc2e6]/30";
                       else if (epData?.recap) badgeClasses = "bg-[#ffb7b2]/20 text-[#ffb7b2] border-[#ffb7b2]/30";

                       return (
                         <button
                           key={epNum}
                           onClick={() => onNavigateToEpisode(anime.id, seasonNumber, epNum)}
                           className={`relative flex items-center justify-center aspect-square rounded-lg text-sm font-bold transition-all border cursor-pointer ${
                             isActive ? "bg-white text-black border-white" :
                             badgeClasses ? `${badgeClasses} hover:bg-white/10` :
                             "bg-white/[0.03] text-white/80 border-white/5 hover:bg-white/10"
                           }`}
                         >
                           {epNum}
                           {progressVal > 0 && !isActive && (
                             <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-lg overflow-hidden">
                               <div className="bg-white/60 h-full" style={{ width: `${progressVal}%` }} />
                             </div>
                           )}
                         </button>
                       );
                     })}
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-1">
                  {episodesToRender.map((epNum) => {
                    const isActive = epNum === episodeNumber;
                    const progressVal = getEpisodeProgress(anime.id, seasonNumber, epNum);
                    
                    const epData = episodesMap[currentRange]?.find(e => e.mal_id === epNum);
                    const epTitleStr = epData?.title || "";
                    
                    let badge = null;
                    if (epData?.recap) {
                      badge = <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ffb7b2]/10 text-[#ffb7b2] border border-[#ffb7b2]/20 tracking-wider">Special</span>;
                    } else if (epData?.filler) {
                      badge = <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#9bc2e6]/10 text-[#9bc2e6] border border-[#9bc2e6]/20 tracking-wider">Filler</span>;
                    }

                    return (
                      <div
                        key={epNum}
                        onClick={() => onNavigateToEpisode(anime.id, seasonNumber, epNum)}
                        className={`flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200 group relative border ${
                          isActive
                            ? "bg-white/[0.08] border-white/10 shadow-lg"
                            : "bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="relative w-[110px] aspect-video bg-black/40 rounded-lg overflow-hidden flex-shrink-0 border border-white/5">
                            <LazyImage
                              src={anime.coverImage.medium || anime.coverImage.large}
                              alt={`Episode ${epNum}`}
                              className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}
                              referrerPolicy="no-referrer"
                            />
                            {isActive && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Play className="w-6 h-6 fill-white stroke-none drop-shadow-md" />
                              </div>
                            )}
                            {progressVal > 0 && !isActive && (
                               <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                 <div className="bg-white/80 h-full" style={{ width: `${progressVal}%` }} />
                               </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                            <div className="flex items-center gap-2 mb-1">
                              {badge}
                              <span className="text-[11px] text-white/40 font-medium select-none">
                                {isActive ? "Now Playing" : progressVal > 0 ? `${Math.round(progressVal)}% Watched` : "Not Watched"}
                              </span>
                            </div>
                            <h4 className={`text-sm font-bold truncate transition-colors leading-tight ${isActive ? "text-white" : "text-white/80 group-hover:text-white"}`}>
                               S{seasonNumber}E{epNum}{epTitleStr ? ` — ${epTitleStr}` : ""}
                            </h4>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
