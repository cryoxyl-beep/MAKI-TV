/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails } from "../services/anilist";
import { getTMDBMapping } from "../services/mapping";
import { initializeFribbMapping, getAniListId } from "../services/fribb";
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
import Header from "./Header";
import { Share2, Bookmark, Play, ChevronLeft, ChevronRight, CheckSquare, Square, ChevronDown, Grid, List, Search, Info, Check, Heart, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";

import RecommendationsList from "./RecommendationsList";

interface WatchPageProps {
  animeId: number;
  seasonNumber: number;
  episodeNumber: number;
  onNavigateToChannel: (id: number) => void;
  onNavigateToEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  onSubscriptionChanged: () => void;
  onSearch?: (query: string) => void;
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
  onSearch,
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
  
  const [audioLanguage, setAudioLanguage] = useState<"sub" | "dub">(() => {
    return (localStorage.getItem("makitv_megaplay_language") as "sub" | "dub") || "sub";
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
  
  useEffect(() => {
    if (anime) {
      if (!anime.anilistId && ["vidnest", "animepahe", "anineko", "animegg"].includes(selectedProvider)) {
        console.warn("Missing AniList mapping for MAL ID:", anime.id, "- disabling AniList-based providers");
        setSelectedProvider("megaplay");
      }
    }
  }, [anime, selectedProvider]);

  // Jikan State
  const [episodesMap, setEpisodesMap] = useState<Record<number, JikanEpisode[]>>({});
  const [episodeDescription, setEpisodeDescription] = useState<string | null>(null);
  const [currentRange, setCurrentRange] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isEpisodeDropdownOpen, setIsEpisodeDropdownOpen] = useState(false);
  const [isAudioDropdownOpen, setIsAudioDropdownOpen] = useState(false);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");

  const [anivexaEpisodes, setAnivexaEpisodes] = useState<any[]>([]);
  const [isAnivexaLoading, setIsAnivexaLoading] = useState(true);

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

  const audioDropdownRef = useRef<HTMLDivElement>(null);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const episodeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (audioDropdownRef.current && !audioDropdownRef.current.contains(event.target as Node)) {
        setIsAudioDropdownOpen(false);
      }
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
      if (episodeDropdownRef.current && !episodeDropdownRef.current.contains(event.target as Node)) {
        setIsEpisodeDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        const [data] = await Promise.all([
          fetchAnimeDetails(animeId),
          initializeFribbMapping()
        ]);
        
        if (data && mounted) {
          // Attempt to patch anilistId if missing (e.g. from local storage cache)
          if (!data.anilistId) {
            data.anilistId = getAniListId(data.id) ?? undefined;
          }
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
  const currentAnivexaEp = anivexaEpisodes.find(e => e.number === episodeNumber);
  
  const currentEpTitle = currentAnivexaEp?.title || currentEpData?.title || "";
  const currentEpDesc = currentAnivexaEp?.description || episodeDescription;
  const currentEpAired = currentAnivexaEp?.airDate || currentEpData?.aired;

  return (
    <div className="w-full bg-[#0f0f0f] pb-20 select-none z-10 relative animate-fade-in text-[#f1f1f1] min-h-screen">
      {/* =============== BREADCRUMB BAR =============== */}
      <div className="sticky top-0 left-0 right-0 h-12 bg-[#0f0f0f]/90 backdrop-blur-md z-[100] border-b border-white/[0.05] flex items-center px-4 lg:px-6">
        <div className="flex items-center gap-2 text-[13px] font-medium font-sans">
          <button onClick={() => window.location.hash = "/"} className="text-white/60 hover:text-white transition-colors cursor-pointer">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          <button onClick={() => onNavigateToChannel(animeId)} className="text-white/60 hover:text-white transition-colors cursor-pointer truncate max-w-[200px] sm:max-w-[300px]">
             {mainTitle}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-white/40" />
          <span className="text-white truncate lg:max-w-none max-w-[150px]">
             {currentEpTitle || `Episode ${episodeNumber}`}
          </span>
        </div>
      </div>
      
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
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Player, Details, and Info Panels */}
        <div className="w-full lg:w-[71%] flex flex-col min-w-0">
          
          <VideoPlayer
            animeId={anime.id}
            anilistId={anime.anilistId}
            episodeNumber={episodeNumber}
            seasonNumber={seasonNumber}
            animeTitle={mainTitle}
            englishTitle={anime.title.english}
            romajiTitle={anime.title.romaji}
            synonyms={anime.synonyms || []}
            onProgressUpdate={handleProgressUpdate}
            savedProgress={getEpisodeProgress(anime.id, seasonNumber, episodeNumber)}
            selectedProvider={selectedProvider}
            audioLanguage={audioLanguage}
            onAudioLanguageChange={(lang) => {
              setAudioLanguage(lang);
              localStorage.setItem("makitv_megaplay_language", lang);
            }}
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
          <div className="mt-2 flex flex-col gap-3 pb-8">
            {/* Orange Warning Banner */}
            <div className="bg-[#ff6b35]/10 border border-[#ff6b35]/20 text-[#ff6b35] text-[13px] font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>If the current server doesn't work, feel free to try the other available servers.</span>
            </div>

            {/* Current Episode Title */}
            <h1 className="text-white text-xl sm:text-[22px] font-bold font-sans tracking-tight mt-1">
              {currentEpTitle || `Episode ${episodeNumber}`}
            </h1>

            {/* Series / Creator Info Row */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between py-1 gap-4">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => onNavigateToChannel(anime.id)}
                  className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-black/40 border border-white/5 cursor-pointer"
                >
                  <LazyImage src={avatar} alt={mainTitle} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
                <div className="flex flex-col justify-center">
                  <h3 
                    onClick={() => onNavigateToChannel(anime.id)}
                    className="text-white text-[16px] font-bold truncate max-w-[250px] sm:max-w-[350px] cursor-pointer hover:text-white/80 transition-colors"
                  >
                    {mainTitle}
                  </h3>
                  {anime.popularity && (
                    <span className="text-[13px] text-white/50 block truncate">
                      {anime.popularity.toLocaleString()} users
                    </span>
                  )}
                </div>
                
                <button 
                   onClick={() => toggleSubscription(anime.id)}
                   className={`ml-2 px-4 py-2 rounded-full font-bold text-[13px] transition-colors whitespace-nowrap ${isSubscribed(animeId) ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-black hover:bg-gray-200"}`}
                >
                  {isSubscribed(animeId) ? "In Library" : "Add to Library"}
                </button>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
                {/* Like Button (Visual Only for spec match) */}
                <button className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  <Heart className="w-4 h-4" /> Like
                </button>

                <div className="relative flex-shrink-0 z-[100]" ref={audioDropdownRef}>
                  <button 
                    onClick={() => {
                      setIsAudioDropdownOpen(!isAudioDropdownOpen);
                      setIsServerDropdownOpen(false);
                    }}
                    disabled={!["megaplay", "origami", "vidnest", "animepahe", "anineko", "animegg"].includes(selectedProvider)}
                    className={`px-4 py-2 rounded-full flex items-center justify-between gap-2 transition-colors font-semibold text-[13px] ${!["megaplay", "origami", "vidnest", "animepahe", "anineko", "animegg"].includes(selectedProvider) ? "opacity-50 cursor-not-allowed bg-white/[0.02] text-white/40" : "bg-white/[0.08] text-white hover:bg-white/[0.12]"}`}
                  >
                    <span>{audioLanguage === "sub" ? "Sub" : "Dub"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAudioDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isAudioDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 sm:left-auto sm:right-0 top-full mt-2 w-32 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] origin-top overflow-hidden"
                      >
                        <div className="flex flex-col py-1">
                          <button
                            onClick={() => {
                              setAudioLanguage("sub");
                              localStorage.setItem("makitv_megaplay_language", "sub");
                              setIsAudioDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-[13px] font-semibold text-left hover:bg-white/10 transition-colors cursor-pointer ${audioLanguage === "sub" ? "text-white bg-white/5" : "text-white/60"}`}
                          >
                            Sub
                          </button>
                          <button
                            onClick={() => {
                              setAudioLanguage("dub");
                              localStorage.setItem("makitv_megaplay_language", "dub");
                              setIsAudioDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-[13px] font-semibold text-left hover:bg-white/10 transition-colors cursor-pointer ${audioLanguage === "dub" ? "text-white bg-white/5" : "text-white/60"}`}
                          >
                            Dub
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative flex-shrink-0 z-[100]" ref={serverDropdownRef}>
                  <button 
                    onClick={() => {
                      setIsServerDropdownOpen(!isServerDropdownOpen);
                      setIsAudioDropdownOpen(false);
                    }}
                    className="px-4 py-2 rounded-full flex items-center justify-between gap-2 transition-colors font-semibold text-[13px] bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  >
                    <span>
                      {selectedProvider === "megaplay" ? "Kyou" :
                       selectedProvider === "origami" ? "Kami" :
                       selectedProvider === "vidnest" ? "Haya" :
                       selectedProvider === "animepahe" ? "Miru" :
                       selectedProvider === "cinesrc" ? "Taberu" :
                       selectedProvider === "vidfast" ? "Matsuri" :
                       selectedProvider === "movies111" ? "Onigiri" :
                       selectedProvider === "anineko" ? "Neko" :
                       selectedProvider === "animegg" ? "GG" : "Server"}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isServerDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 sm:left-auto sm:right-0 top-full mt-2 w-40 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] origin-top overflow-hidden"
                      >
                        <div className="flex flex-col py-1">
                          {[
                            ...(anime?.anilistId ? [
                              { id: "anineko", label: "Neko", subtitle: "[S-SUB] [DUB]" },
                              { id: "animegg", label: "GG", subtitle: "[S-SUB] [DUB]" }
                            ] : []),
                            { id: "megaplay", label: "Kyou", subtitle: "[S-SUB] [DUB]" },
                            { id: "origami", label: "Kami", subtitle: "[S-SUB] [DUB]" },
                            ...(anime?.anilistId ? [
                              { id: "vidnest", label: "Haya", subtitle: "[S-SUB] [DUB]" },
                              { id: "animepahe", label: "Miru", subtitle: "[S-SUB] [DUB]" }
                            ] : [])
                          ].map(provider => (
                            <button
                              key={provider.id}
                              onClick={() => {
                                handleSelectProvider(provider.id);
                                setIsServerDropdownOpen(false);
                                if (!["megaplay", "origami", "vidnest", "animepahe", "anineko", "animegg"].includes(provider.id)) {
                                  setAudioLanguage("sub");
                                  localStorage.setItem("makitv_megaplay_language", "sub");
                                }
                              }}
                              className={`px-4 py-2 flex flex-col items-start hover:bg-white/10 transition-colors cursor-pointer ${selectedProvider === provider.id ? "bg-white/5" : ""}`}
                            >
                              <span className={`text-[13px] font-semibold ${selectedProvider === provider.id ? "text-white" : "text-white/80"}`}>{provider.label}</span>
                              <span className="text-[10px] text-white/40 font-mono mt-0.5">{provider.subtitle}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={handleShare} className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <button className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </div>
            </div>

            {/* Episode Description Card */}
            <div className="mt-3 bg-white/[0.05] hover:bg-white/[0.08] transition-colors rounded-xl p-4 border border-white/5">
              <div className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-white mb-2">
                {currentEpAired && (
                  <span>Aired {new Date(currentEpAired).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                )}
              </div>
              
              <p className="text-[14px] text-white/90 leading-relaxed font-medium">
                <span className="font-bold text-white mr-2 block mb-1">Episode {episodeNumber}</span>
                {currentEpDesc ? currentEpDesc : "No official synopsis available for this episode."}
              </p>
            </div>
            
          </div>
        </div>

        {/* =============== RIGHT COLUMN: INTEGRATED EPISODE QUEUE SIDEBAR =============== */}
        <div className="w-full lg:w-[29%] flex flex-col gap-4 lg:sticky lg:top-[60px] lg:h-[calc(100vh-80px)] pr-2 pb-10">
            <div className="flex flex-col pb-3 border-b border-white/[0.05] gap-2">
              <h3 className="text-white text-[15px] font-bold font-sans tracking-tight">
                Up Next - {currentEpTitle || `Episode ${episodeNumber}`}
              </h3>
              <p className="text-white/50 text-[13px] truncate">
                Playing - Episode {episodeNumber} - {mainTitle}
              </p>
              
              <div className="flex items-center w-full gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search Episode"
                    className="w-full bg-white/5 hover:bg-white/10 border border-transparent focus:border-white/20 outline-none text-[13px] text-white rounded-lg pl-8 pr-3 py-1.5 transition-colors placeholder:text-white/40 font-medium"
                    value={episodeSearchQuery}
                    onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                   {isLongRunning && (
                     <div className="relative" ref={episodeDropdownRef}>
                       <button 
                         onClick={() => setIsEpisodeDropdownOpen(!isEpisodeDropdownOpen)}
                         className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 transition-colors cursor-pointer flex items-center justify-center w-8 h-8"
                       >
                         <List className="w-4 h-4" />
                       </button>
                       <AnimatePresence>
                         {isEpisodeDropdownOpen && (
                           <motion.div 
                             initial={{ opacity: 0, y: -5 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0, y: -5 }}
                             transition={{ duration: 0.15 }}
                             className="absolute top-full right-0 mt-2 max-h-64 overflow-y-auto w-32 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] custom-scrollbar origin-top"
                           >
                             {[...Array(Math.ceil(episodesCount / 100))].map((_, idx) => {
                               const page = idx + 1;
                               const pStart = (page - 1) * 100 + 1;
                               const pEnd = Math.min(page * 100, episodesCount);
                               return (
                                 <button
                                   key={page}
                                   onClick={() => { setCurrentRange(page); setIsEpisodeDropdownOpen(false); setEpisodeSearchQuery(""); }}
                                   className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer ${currentRange === page ? "text-white bg-white/10" : "text-white/60"}`}
                                 >
                                   {pStart}-{pEnd}
                                 </button>
                               );
                             })}
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   )}
                   <button className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 transition-colors cursor-pointer w-8 h-8 flex items-center justify-center">
                     <Grid className="w-4 h-4" />
                   </button>
                </div>
              </div>
            </div>

          {/* Scrollable Playlist Queue Container */}
          <div className="flex flex-col gap-1 relative flex-1 min-h-[400px] lg:min-h-0">
            <AnimatePresence mode="wait">
              {(() => {
                if (!episodesMap[currentRange]) {
                  return (
                    <motion.div
                      key="skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex flex-col gap-2"
                    >
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse">
                          <div className="w-[110px] aspect-video bg-white/10 rounded-lg flex-shrink-0" />
                          <div className="flex-1 py-1">
                            <div className="h-4 w-1/3 bg-white/10 rounded mb-3" />
                            <div className="h-3 w-1/2 bg-white/10 rounded" />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  );
                }

                const currentRangeStart = (currentRange - 1) * 100 + 1;
                const currentRangeEnd = Math.min(currentRange * 100, episodesCount);
                const currentRangeCount = isLongRunning ? Math.max(0, currentRangeEnd - currentRangeStart + 1) : episodesCount;
                
                let episodesToRender = [...Array(currentRangeCount)].map((_, idx) => isLongRunning ? currentRangeStart + idx : idx + 1);

                if (episodeSearchQuery.trim() !== "") {
                  const query = episodeSearchQuery.toLowerCase();
                  episodesToRender = episodesToRender.filter((epNum) => {
                    const epData = episodesMap[currentRange]?.find(e => e.mal_id === epNum);
                    const anivexaEp = anivexaEpisodes.find(e => e.number === epNum);
                    const epTitle = (anivexaEp?.title || epData?.title || "").toLowerCase();
                    return epNum.toString().includes(query) || epTitle.includes(query);
                  });
                }

                if (viewMode === "grid" && isLongRunning) {
                  return (
                    <motion.div
                      key="grid-view"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 pr-2"
                    >
                      <VirtuosoGrid
                        className="custom-scrollbar"
                        style={{ height: '100%', width: '100%' }}
                        data={episodesToRender}
                        listClassName="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-4 pt-1 px-1"
                        itemContent={(index, epNum) => {
                          const isActive = epNum === episodeNumber;
                          const progressVal = getEpisodeProgress(anime.id, seasonNumber, epNum);
                          const epData = episodesMap[currentRange]?.find(e => e.mal_id === epNum);
                          
                          let badgeClasses = "";
                          if (epData?.filler) badgeClasses = "bg-[#9bc2e6]/10 text-[#9bc2e6] border-[#9bc2e6]/20";
                          else if (epData?.recap) badgeClasses = "bg-[#ffb7b2]/10 text-[#ffb7b2] border-[#ffb7b2]/20";

                          return (
                            <button
                              key={epNum}
                              onClick={() => onNavigateToEpisode(anime.id, seasonNumber, epNum)}
                              className={`relative flex items-center justify-center h-10 w-full rounded-md text-sm font-semibold transition-all duration-200 ease-out border cursor-pointer select-none active:scale-95 ${
                                isActive ? "bg-[#8b5cf6] text-white border-[#8b5cf6] shadow-[0_4px_20px_rgba(139,92,246,0.4)] z-10" :
                                badgeClasses ? `${badgeClasses} hover:bg-white/10 hover:-translate-y-0.5 hover:shadow-md hover:brightness-110` :
                                progressVal > 0 ? "bg-white/10 text-white/90 border-white/10 hover:bg-white/[0.15] hover:-translate-y-0.5 hover:shadow-md hover:brightness-110" :
                                "bg-white/[0.03] text-white/70 border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10 hover:-translate-y-0.5 hover:shadow-md hover:brightness-110"
                              }`}
                            >
                              {epNum}
                              {progressVal > 0 && !isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 rounded-b-md overflow-hidden opacity-80">
                                  <div className="bg-[#8b5cf6] h-full" style={{ width: `${progressVal}%` }} />
                                </div>
                              )}
                            </button>
                          );
                        }}
                      />
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key="list-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 pr-2"
                  >
                    <Virtuoso
                      className="custom-scrollbar"
                      style={{ height: '100%', width: '100%' }}
                      data={episodesToRender}
                      itemContent={(index, epNum) => {
                        const isActive = epNum === episodeNumber;
                        const progressVal = getEpisodeProgress(anime.id, seasonNumber, epNum);
                        
                        const epData = episodesMap[currentRange]?.find(e => e.mal_id === epNum);
                        const anivexaEp = anivexaEpisodes.find(e => e.number === epNum);
                        const epTitleStr = anivexaEp?.title || epData?.title || "";
                        const epImage = anivexaEp?.image || (isAnivexaLoading ? "" : (anime.coverImage.medium || anime.coverImage.large));
                        const epAired = anivexaEp?.airDate || epData?.aired;
                        
                        let badge = null;
                        if (epData?.recap) {
                          badge = <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ffb7b2]/10 text-[#ffb7b2] border border-[#ffb7b2]/20 tracking-wider">Special</span>;
                        } else if (epData?.filler) {
                          badge = <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#9bc2e6]/10 text-[#9bc2e6] border border-[#9bc2e6]/20 tracking-wider">Filler</span>;
                        }

                        return (
                          <div 
                            className="pb-2"
                          >
                            <div
                              onClick={() => onNavigateToEpisode(anime.id, seasonNumber, epNum)}
                              className={`flex flex-row gap-3 p-2 rounded-lg cursor-pointer transition-colors group relative border border-transparent ${
                                isActive
                                  ? "bg-white/10"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div className="relative w-[120px] aspect-video bg-[#212121] rounded-md overflow-hidden flex-shrink-0">
                                <LazyImage
                                  src={epImage}
                                  alt={`Episode ${epNum}`}
                                  className={`w-full h-full object-cover ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100 transition-opacity"}`}
                                  referrerPolicy="no-referrer"
                                />
                                {isActive && (
                                  <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                                    <Play className="w-8 h-8 text-white drop-shadow-md" />
                                  </div>
                                )}
                                <div className="absolute bottom-1 right-1 bg-[#121212]/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-bold text-white tracking-wider flex items-center">
                                  Ep {epNum}
                                </div>
                                {progressVal > 0 && !isActive && (
                                   <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                     <div className="bg-[#8b5cf6] h-full" style={{ width: `${progressVal}%` }} />
                                   </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                                <h4 className={`text-[14px] font-bold leading-tight line-clamp-2 ${isActive ? "text-white" : "text-white/90 group-hover:text-white"}`}>
                                   {epTitleStr ? epTitleStr : `${mainTitle} Episode ${epNum}`}
                                </h4>
                                <div className="text-[12px] text-white/50 font-medium mt-1 inline-flex items-center gap-1.5 flex-wrap">
                                  {badge}
                                  <span>{epAired ? new Date(epAired).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : `Episode ${epNum}`}</span>
                                  {progressVal > 0 && (
                                    <>
                                      <span className="text-white/30">•</span>
                                      <span className="text-[#8b5cf6]/80">{Math.round(progressVal)}% Watched</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>

          {/* Recommendations Component */}
          {anime?.anilistId && (
            <RecommendationsList anilistId={anime.anilistId} onNavigateToChannel={onNavigateToChannel} />
          )}
        </div>

      </div>
    </div>
  );
}
