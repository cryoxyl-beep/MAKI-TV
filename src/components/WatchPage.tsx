/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { AniListAnime } from "../types";
import { fetchAnimeDetails } from "../services/anilist";
import { getTMDBMapping } from "../services/mapping";
import { getLogoPath } from "../services/tmdb";
import { getAniListId, getFribbEntryByAnilist, initializeFribbMapping } from "../services/fribb";
import EpisodeThumbnailItem from "./EpisodeThumbnailItem";
import { getTVDBSeriesManifest, getEpisodeThumbnail } from "../services/thumbnails";
import { 
  addToWatchHistory, 
  getEpisodeProgress,
  getWatchHistory,
  getUnifiedWatchState,
  isWatchLater,
  toggleWatchLater
} from "../utils";
import { safeSetItem } from "../lib/cacheManager";
import { useLibrary } from "../hooks/useLibrary";
import LazyImage from "./LazyImage";
import VideoPlayer from "./VideoPlayer";
import SkeletonLoader from "./SkeletonLoader";
import Header from "./Header";
import { Share2, Bookmark, Play, ChevronLeft, ChevronRight, CheckSquare, Square, ChevronDown, Grid, List, Search, Info, Check, Heart, Flag, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";

import RecommendationsList from "./RecommendationsList";
import { useSettings } from "../hooks/useSettings";

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
  const { settings } = useSettings();
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  
  // Mapping States
  const [tmdbId, setTmdbId] = useState<number>(0);
  const [mediaType, setMediaType] = useState<"tv" | "movie">("tv");

  // Selected active server/provider
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem("makitv_selected_provider") || settings.playback.defaultServer;
  });
  
  const [audioLanguage, setAudioLanguage] = useState<"sub" | "dub">(() => {
    const raw = localStorage.getItem("makitv_megaplay_language");
    if (raw === "sub" || raw === "dub") return raw;
    if (settings.playback.defaultAudio === "Japanese") return "sub";
    if (settings.playback.defaultAudio === "English Dub") return "dub";
    return "sub";
  });

  const [tvdbThumbnailMap, setTvdbThumbnailMap] = useState<Record<string, string>>({});
  const [currentEpisodeThumbnail, setCurrentEpisodeThumbnail] = useState<string | undefined>(undefined);

  const { isSubscribed, toggleSubscription, currentUser } = useLibrary();

  // Floating continue/session resume prompt trigger
  const [resumeSession, setResumeSession] = useState<{
    season: number;
    episode: number;
    provider: string;
  } | null>(null);

  // Likes and share interaction trackers
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isWatchLaterState, setIsWatchLaterState] = useState(false);

  useEffect(() => {
    if (anime) {
      if (!anime.anilistId && ["vidnest", "animepahe", "anineko", "animegg"].includes(selectedProvider)) {
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
               safeSetItem(cacheKey, JSON.stringify({
                 timestamp: Date.now(),
                 data: data.anineko.episodes.sub
               }));
             } catch (err) {}
           }
        }
      } catch (e) {
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
    setIsBookmarked(isSubscribed(animeId));
  }, [animeId, anime, isSubscribed]);

  useEffect(() => {
    setIsWatchLaterState(isWatchLater(animeId, seasonNumber, episodeNumber));
  }, [animeId, seasonNumber, episodeNumber]);

  const episodesCount = anime?.episodes || 12;
  const isLongRunning = episodesCount >= 100;

  // Optimization: Memoize watch progress map to avoid repetitive localStorage hits during scroll
  const progressMap = useMemo(() => {
    if (!anime) return {};
    const map: Record<string, number> = {};
    const watchHistory = getWatchHistory();
    watchHistory.forEach(item => {
      if (item.id === anime.id) {
        map[`${item.seasonNumber}-${item.episodeNumber}`] = item.progress;
      }
    });
    return map;
  }, [anime, animeId]);

  const episodesToRender = useMemo(() => {
    if (!anime) return [];
    const currentRangeStart = (currentRange - 1) * 100 + 1;
    const currentRangeEnd = Math.min(currentRange * 100, episodesCount);
    const currentRangeCount = isLongRunning ? Math.max(0, currentRangeEnd - currentRangeStart + 1) : episodesCount;
    
    let eps = Array.from({ length: currentRangeCount }, (_, idx) => isLongRunning ? currentRangeStart + idx : idx + 1);

    if (episodeSearchQuery.trim() !== "") {
      const query = episodeSearchQuery.toLowerCase();
      eps = eps.filter((epNum) => {
        const epData = episodesMap[currentRange]?.find(e => Number(e.mal_id) === Number(epNum)) || episodesMap[currentRange]?.[(epNum - 1) % 100];
        const anivexaEp = anivexaEpisodes.find(e => Number(e.number) === Number(epNum)) || anivexaEpisodes[epNum - 1];
        const epTitle = (epData?.title || anivexaEp?.title || "").toLowerCase();
        return epNum.toString().includes(query) || epTitle.includes(query);
      });
    }
    return eps;
  }, [anime, currentRange, episodesCount, isLongRunning, episodeSearchQuery, episodesMap, anivexaEpisodes]);
  
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
      setLogoUrl(null);
      setLogoError(false);
      setIsLogoLoading(true);
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

          // Start mapping and logo lookup asynchronously so it does not block the video player loading!
          getTMDBMapping(data).then(async (mapped) => {
            if (mounted) {
              if (mapped) {
                setTmdbId(mapped.tmdbId);
                setMediaType(mapped.type);
                try {
                  const fetchedLogo = await getLogoPath(mapped.type, mapped.tmdbId);
                  if (mounted) {
                    setLogoUrl(fetchedLogo);
                    setLogoError(false);
                  }
                } catch (err) {
                  console.error("Failed to load anime logo on WatchPage:", err);
                }
              }
              setIsLogoLoading(false);
            }
          }).catch(err => {
            console.error("Failed getTMDBMapping on WatchPage:", err);
            if (mounted) {
              setIsLogoLoading(false);
            }
          });

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
      }
    }
    fetchEpisodeDetails();
    return () => { mounted = false; };
  }, [animeId, episodeNumber]);

  useEffect(() => {
    if (anime) {
      const titleVal = anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series";
      document.title = `${titleVal} - Miyoro`;
    }
  }, [anime]);

  useEffect(() => {
    let mounted = true;
    async function resolveThumbnail() {
      if (!anime) return;
      const src = await getEpisodeThumbnail({
        animeId: anime.anilistId || anime.id,
        season: seasonNumber,
        episode: episodeNumber,
        fallbackImages: [anime.bannerImage || "", anime.coverImage?.extraLarge || "", anime.coverImage?.large || ""],
        animeTitle: anime.title.english || anime.title.romaji,
        tvdbThumbnailMap
      });
      if (mounted && src) {
        setCurrentEpisodeThumbnail(src);
        
        // Also immediately update history with the thumbnail if we already have it
        const lastPercentProgress = getEpisodeProgress(anime.id, seasonNumber, episodeNumber);
        addToWatchHistory({
          animeId: anime.id,
          animeTitle: anime.title.english || anime.title.romaji || anime.title.userPreferred || "Untitled Series",
          episodeNumber,
          seasonNumber,
          progress: lastPercentProgress,
          duration: "23:45",
          bannerImage: anime.bannerImage,
          coverImage: anime.coverImage.large,
          thumbnailUrl: src
        });
      }
    }
    resolveThumbnail();
    return () => { mounted = false; };
  }, [anime, seasonNumber, episodeNumber, tvdbThumbnailMap]);

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
        thumbnailUrl: currentEpisodeThumbnail
      });
    }
  };

  const handleSelectProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    safeSetItem("makitv_selected_provider", providerId);
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
      setIsWatchLaterState(isNowSaved);
    }
  };

  const handleToggleBookmark = async () => {
    if (anime) {
      await toggleSubscription(anime);
      setIsBookmarked(!isBookmarked);
      if (onSubscriptionChanged) onSubscriptionChanged();
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

  const currentEpData = episodesMap[currentRange]?.find(e => Number(e.mal_id) === Number(episodeNumber)) || episodesMap[currentRange]?.[Number(episodeNumber) - 1];
  const currentAnivexaEp = anivexaEpisodes.find(e => Number(e.number) === Number(episodeNumber)) || anivexaEpisodes[Number(episodeNumber) - 1];
  
  const currentEpTitle = currentEpData?.title || currentAnivexaEp?.title || "";
  const currentEpDesc = currentAnivexaEp?.description || episodeDescription;
  const currentEpAired = currentEpData?.aired || currentAnivexaEp?.airDate;
  const accentColor = anime?.coverImage?.color || "#38bdf8";

  // Calculate next episode title for "Up Next" header
  const nextEpNum = Number(episodeNumber) + 1;
  const targetRange = Math.max(1, Math.ceil(nextEpNum / 100));
  const nextEpData = episodesMap[targetRange]?.find(e => Number(e.mal_id) === nextEpNum) || episodesMap[targetRange]?.[(nextEpNum - 1) % 100];
  const nextAnivexaEp = anivexaEpisodes.find(e => Number(e.number) === nextEpNum) || anivexaEpisodes[nextEpNum - 1];
  const nextEpTitle = nextEpData?.title || nextAnivexaEp?.title || "";
  const hasNextEpisode = nextEpNum <= (anime.episodes || 9999);
  
  const upNextHeader = hasNextEpisode 
    ? `Up Next - ${nextEpTitle ? nextEpTitle : `Episode ${nextEpNum}`}` 
    : "Up Next";

  return (
    <div className="w-full bg-[#0f0f0f] pb-20 pt-14 select-none z-10 relative animate-fade-in text-[#f1f1f1] min-h-screen">
      {/* =============== HEADER WITH INTEGRATED BREADCRUMBS =============== */}
      <Header
        variant="slim"
        onSearch={onSearch}
        onNavigateHome={() => window.location.hash = "/"}
        breadcrumbs={[
          { label: "Home", onClick: () => window.location.hash = "/", color: accentColor },
          { label: mainTitle, onClick: () => onNavigateToChannel(animeId), color: accentColor },
          { label: currentEpTitle || `Episode ${episodeNumber}` }
        ]}
      />
      
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
      {/* =============== MAIN VIEWPORT =============== */}
      {/* =============== ROW 1 (Player & Up Next Side-by-side with Equal Height) =============== */}
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pt-6 flex flex-col lg:flex-row gap-6 lg:items-stretch">
        
        {/* LEFT COLUMN: Player */}
        <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
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
              safeSetItem("makitv_megaplay_language", lang);
            }}
            tmdbId={tmdbId}
            mediaType={mediaType}
            onNextEpisode={handleNextEpisode}
            onProviderChange={handleSelectProvider}
          />
        </div>

        {/* RIGHT COLUMN: Up Next Sidebar (stretches to exact player height natively) */}
        <div className="w-full lg:w-[29%] min-w-0 flex flex-col bg-[#121214] border border-white/5 rounded-2xl p-4 overflow-hidden min-h-[400px] lg:min-h-0">
          <div className="flex flex-col pb-3 border-b border-white/[0.05] gap-2">
            <h3 className="text-white text-[15px] font-bold font-sans tracking-tight">
              {upNextHeader}
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

          {/* Scrollable Playlist Queue Container (flex-growable but height constrained to parent) */}
          <div className="flex flex-col gap-1 relative flex-1 min-h-0 mt-3">
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
                    const epData = episodesMap[currentRange]?.find(e => Number(e.mal_id) === Number(epNum)) || episodesMap[currentRange]?.[(epNum - 1) % 100];
                    const anivexaEp = anivexaEpisodes.find(e => Number(e.number) === Number(epNum)) || anivexaEpisodes[epNum - 1];
                    const epTitle = (epData?.title || anivexaEp?.title || "").toLowerCase();
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
                        overscan={50}
                        listClassName="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-4 pt-1 px-1"
                        itemContent={(index, epNum) => {
                          const isActive = epNum === episodeNumber;
                          const progressVal = progressMap[`${seasonNumber}-${epNum}`] || 0;
                          const epData = episodesMap[currentRange]?.find(e => Number(e.mal_id) === Number(epNum)) || episodesMap[currentRange]?.[(epNum - 1) % 100];
                          
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
                      overscan={20}
                      increaseViewportBy={500}
                      itemContent={(index, epNum) => {
                        const isActive = epNum === episodeNumber;
                        const progressVal = progressMap[`${seasonNumber}-${epNum}`] || 0;
                        
                        const epData = episodesMap[currentRange]?.find(e => Number(e.mal_id) === Number(epNum)) || episodesMap[currentRange]?.[(epNum - 1) % 100];
                        const anivexaEp = anivexaEpisodes.find(e => Number(e.number) === Number(epNum)) || anivexaEpisodes[epNum - 1];
                        const epTitleStr = epData?.title || anivexaEp?.title || "";
                        const epAired = epData?.aired || anivexaEp?.airDate;
                        
                        let badge = null;
                        if (epData?.recap) {
                          badge = <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#ffb7b2]/10 text-[#ffb7b2] border border-[#ffb7b2]/20 tracking-wider">Special</span>;
                        } else if (epData?.filler) {
                          badge = <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#9bc2e6]/10 text-[#9bc2e6] border border-[#9bc2e6]/20 tracking-wider">Filler</span>;
                        }

                        return (
                          <div className="pb-2 transform-gpu will-change-transform">
                            <div
                              onClick={() => onNavigateToEpisode(anime.id, seasonNumber, epNum)}
                              className={`flex flex-row gap-3 p-2 rounded-lg cursor-pointer transition-colors group relative border border-transparent ${
                                isActive
                                  ? "bg-white/10"
                                  : "hover:bg-white/5"
                              }`}
                            >
                              <div className="relative w-[120px] aspect-video bg-[#212121] rounded-md overflow-hidden flex-shrink-0">
                                <EpisodeThumbnailItem
                                  animeId={anime.anilistId || anime.id}
                                  season={seasonNumber}
                                  episode={epNum}
                                  fallbackImages={[anime.bannerImage || "", anime.coverImage?.extraLarge || "", anime.coverImage?.large || ""]}
                                  animeTitle={anime.title.english || anime.title.romaji}
                                  tvdbThumbnailMap={tvdbThumbnailMap}
                                  alt={`Episode ${epNum}`}
                                  className={`w-full h-full object-cover ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100 transition-opacity"}`}
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
                                  <span>{epAired ? new Date(epAired).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Episode ${epNum}`}</span>
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
        </div>
      </div>

      {/* =============== ROW 2: Episode Controls, Info & More Like This =============== */}
      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pb-20 flex flex-col lg:flex-row gap-6 items-start mt-6">
        
        {/* LEFT COLUMN: Episode Controls & Info */}
        <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
          
          {/* Player Navigation & Controls */}
          <div className="flex items-center justify-between mt-1 text-sm flex-wrap gap-4 select-none pb-2 border-b border-white/[0.05]">
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

          {/* Episode Info Panel */}
          <div className="mt-6 flex flex-col gap-3 pb-8 w-full min-w-0">
            {/* Warning Banner */}
            <div 
              className="border text-[13px] font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-300"
              style={{
                backgroundColor: `${accentColor}12`, // ~7% opacity
                borderColor: `${accentColor}33`,     // 20% opacity
                color: accentColor
              }}
            >
              <Info className="w-4.5 h-4.5 shrink-0" />
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
                  <div className="flex items-center gap-2">
                    {isLogoLoading ? (
                      <div className="h-[28px] w-[140px] bg-white/5 rounded animate-pulse" />
                    ) : logoUrl && !logoError ? (
                      <motion.img
                        src={logoUrl}
                        alt={mainTitle}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="max-h-[60px] w-auto object-contain cursor-pointer"
                        onClick={() => onNavigateToChannel(anime.id)}
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <h3 
                        onClick={() => onNavigateToChannel(anime.id)}
                        className="text-white text-[16px] font-semibold truncate max-w-[220px] sm:max-w-[320px] cursor-pointer hover:text-white/80 transition-colors"
                      >
                        {mainTitle}
                      </h3>
                    )}
                    
                    {/* Compact Bookmark Button (Outline/Fill) */}
                    <button 
                       onClick={handleToggleBookmark}
                       className="p-1.5 text-white/50 hover:text-white hover:scale-110 active:scale-95 transition-all duration-150"
                       title={isBookmarked ? "Remove Bookmark" : "Bookmark Anime"}
                    >
                      <Bookmark className="w-4.5 h-4.5" fill={isBookmarked ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">

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
                              safeSetItem("makitv_megaplay_language", "sub");
                              setIsAudioDropdownOpen(false);
                            }}
                            className={`px-4 py-2.5 text-[13px] font-semibold text-left hover:bg-white/10 transition-colors cursor-pointer ${audioLanguage === "sub" ? "text-white bg-white/5" : "text-white/60"}`}
                          >
                            Sub
                          </button>
                          <button
                            onClick={() => {
                              setAudioLanguage("dub");
                              safeSetItem("makitv_megaplay_language", "dub");
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
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 sm:left-auto sm:right-0 bottom-full mb-2 w-28 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] origin-bottom overflow-hidden"
                      >
                        <div className="flex flex-col py-1">
                          {[
                            ...(anime?.anilistId ? [
                              { id: "anineko", label: "Neko" },
                              { id: "animegg", label: "GG" }
                            ] : []),
                            { id: "megaplay", label: "Kyou" },
                            { id: "origami", label: "Kami" },
                            ...(anime?.anilistId ? [
                              { id: "vidnest", label: "Haya" },
                              { id: "animepahe", label: "Miru" }
                            ] : [])
                          ].map(provider => (
                            <button
                              key={provider.id}
                              onClick={() => {
                                handleSelectProvider(provider.id);
                                setIsServerDropdownOpen(false);
                                if (!["megaplay", "origami", "vidnest", "animepahe", "anineko", "animegg"].includes(provider.id)) {
                                  setAudioLanguage("sub");
                                  safeSetItem("makitv_megaplay_language", "sub");
                                }
                              }}
                              className={`px-4 py-2.5 text-left hover:bg-white/10 transition-colors cursor-pointer ${selectedProvider === provider.id ? "bg-white/5 text-white" : "text-white/60 hover:text-white"}`}
                            >
                              <span className="text-[13px] font-semibold">{provider.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Watch Later Clock button with non-filled outline-colored clock icon */}
                <button 
                  onClick={handleToggleWatchLater} 
                  className={`flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                    isWatchLaterState 
                      ? "bg-white text-black hover:bg-gray-200" 
                      : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  }`}
                >
                  <Clock className="w-4 h-4" fill="none" /> 
                  Watch Later
                </button>

                <button className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </div>
            </div>

            {/* Episode Description Card */}
            {currentEpDesc && (
              <div className="mt-3 bg-white/[0.05] rounded-xl p-5 border border-white/5">
                <p className="text-[14px] text-white/90 leading-relaxed font-medium">
                  {currentEpDesc}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: More Like This (Sits directly underneath Up Next in visual alignment) */}
        <div className="w-full lg:w-[29%] min-w-0 flex flex-col">
          {anime?.anilistId && (
            <RecommendationsList anilistId={anime.anilistId} onNavigateToChannel={onNavigateToChannel} limit={3} />
          )}
        </div>

      </div>
    </div>
  );
}