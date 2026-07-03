/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Landmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { saveUnifiedWatchState, getUnifiedWatchState } from "../utils";
import { getFribbEntryByAnilist } from "../services/fribb";
import { useSettings } from "../hooks/useSettings";

import { MediaPlayer, MediaProvider, Track } from "@vidstack/react";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";

const hlsCache: Record<string, string> = {};
const hlsSubCache: Record<string, string | null> = {};

function extractSubtitleUrl(stream: any): string | null {
  if (!stream?.embed) return null;
  try {
    const url = new URL(stream.embed);
    return (
      url.searchParams.get("sub") ||
      url.searchParams.get("caption_1")
    );
  } catch {
    return null;
  }
}

interface VideoPlayerProps {
  animeId: number;
  anilistId?: number;
  episodeNumber: number;
  seasonNumber: number;
  animeTitle: string;
  onProgressUpdate: (percentage: number, currentTime?: number, duration?: number) => void;
  savedProgress?: number;
  selectedProvider: string;
  audioLanguage?: "sub" | "dub";
  onAudioLanguageChange?: (lang: "sub" | "dub") => void;
  tmdbId: number;
  mediaType: "tv" | "movie";
  onNextEpisode: () => void;
  onProviderChange?: (provider: string) => void;
  englishTitle?: string;
  romajiTitle?: string;
  synonyms?: string[];
  isAnime?: boolean;
  hasNextEpisode?: boolean;
  nextEpisodeTitle?: string;
  onNavigateToChannel?: () => void;
}

export default function VideoPlayer({
  animeId,
  anilistId,
  episodeNumber,
  seasonNumber,
  animeTitle,
  onProgressUpdate,
  savedProgress,
  selectedProvider,
  audioLanguage = "sub",
  onAudioLanguageChange,
  tmdbId,
  mediaType,
  onNextEpisode,
  onProviderChange,
  englishTitle,
  romajiTitle,
  synonyms,
  isAnime = true,
  hasNextEpisode = false,
  nextEpisodeTitle,
  onNavigateToChannel,
}: VideoPlayerProps) {
  const { settings } = useSettings();
  const autoNextEnabled = settings.playback.autoPlayNext;

  const [showAutoNextOverlay, setShowAutoNextOverlay] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(10);
  const [countdownCancelled, setCountdownCancelled] = useState(false);

  useEffect(() => {
    setShowAutoNextOverlay(false);
    setCountdownCancelled(false);
    setAutoNextCountdown(10);
  }, [animeId, seasonNumber, episodeNumber, anilistId]);

  useEffect(() => {
    let t: any;
    if (showAutoNextOverlay && hasNextEpisode && !countdownCancelled) {
      if (autoNextCountdown > 0) {
        t = setTimeout(() => setAutoNextCountdown(prev => prev - 1), 1000);
      } else {
        setShowAutoNextOverlay(false);
        onNextEpisode();
      }
    }
    return () => clearTimeout(t);
  }, [showAutoNextOverlay, autoNextCountdown, hasNextEpisode, countdownCancelled, onNextEpisode]);

  const handlePlayerProgress = (rawCur: number, rawDur: number, percentFallback?: number) => {
    const cur = Number(rawCur) || 0;
    const dur = Number(rawDur) || 0;
    const percent = percentFallback !== undefined ? Number(percentFallback) : parseFloat(((cur / dur) * 100).toFixed(1));
    
    const remaining = dur - cur;
    if (remaining <= 15 && !showAutoNextOverlay && !countdownCancelled) {
      if (hasNextEpisode && autoNextEnabled) {
        setShowAutoNextOverlay(true);
        setAutoNextCountdown(10);
      } else if (!hasNextEpisode) {
        setShowAutoNextOverlay(true);
      }
    }

    onProgressUpdate(percent, cur, dur);

    if (isAnime) {
      saveUnifiedWatchState({
        anilistId: animeId,
        tmdbId: tmdbId,
        title: animeTitle,
        provider: selectedProvider,
        progress: { watched: cur, duration: dur },
        last_season_watched: seasonNumber,
        last_episode_watched: episodeNumber,
        percentage: percent,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handlePlayerEnded = () => {
    if (autoNextEnabled && hasNextEpisode && !countdownCancelled) {
       onNextEpisode();
    }
  };

  const [iframeLoading, setIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const [megaplayLoadError, setMegaplayLoadError] = useState<boolean>(false);
  const [origamiLoadError, setOrigamiLoadError] = useState<boolean>(false);
  const [vidnestLoadError, setVidnestLoadError] = useState<boolean>(false);
  const [animepaheLoadError, setAnimepaheLoadError] = useState<boolean>(false);
  
  const [dynamicEmbedUrl, setDynamicEmbedUrl] = useState<string>("");
  const [dynamicEmbedError, setDynamicEmbedError] = useState<boolean>(false);

  const [nativeHlsUrl, setNativeHlsUrl] = useState<string>("");
  const [nativeSubtitleUrl, setNativeSubtitleUrl] = useState<string | null>(null);
  const [nativeHlsError, setNativeHlsError] = useState<boolean>(false);

  useEffect(() => {
    if (selectedProvider === "animegg" && dynamicEmbedUrl) {
    }
  }, [selectedProvider, dynamicEmbedUrl]);

  // loading and watchdog state tracking refs
  const watchdogTimerRef = useRef<any>(null);
  const watchdogCancelledRef = useRef<boolean>(false);
  const hasReceivedFirstEventRef = useRef<boolean>(false);

  const handleLanguageChange = (lang: "sub" | "dub") => {
    if (onAudioLanguageChange) {
      onAudioLanguageChange(lang);
    }
    setIframeLoading(true);
    setMegaplayLoadError(false);
    setOrigamiLoadError(false);
  };

  const handleIframeLoad = () => {
    if (selectedProvider === "megaplay" || selectedProvider === "origami") {
      const isOrigami = selectedProvider === "origami";
      if (!watchdogCancelledRef.current) {
        watchdogCancelledRef.current = true;
      }
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    }
    setIframeLoading(false);
    setMegaplayLoadError(false);
    setOrigamiLoadError(false);
    setVidnestLoadError(false);
    setAnimepaheLoadError(false);
  };

  // Trigger loading screen reset when any major state changes
  useEffect(() => {
    setIframeLoading(true);
    setMegaplayLoadError(false);
    setOrigamiLoadError(false);
    setVidnestLoadError(false);
    setAnimepaheLoadError(false);
    // Removed 4-second safety threshold fallback as per requirements to use real events
  }, [animeId, episodeNumber, seasonNumber, selectedProvider, tmdbId]);

  // MegaPlay and Origami loading and fallback watchdog effect loop
  useEffect(() => {
    if (selectedProvider === "megaplay" || selectedProvider === "origami") {
      const isOrigami = selectedProvider === "origami";
      if (isOrigami) {
        setOrigamiLoadError(false);
      } else {
        setMegaplayLoadError(false);
      }
      setIframeLoading(true);
      watchdogCancelledRef.current = false;
      hasReceivedFirstEventRef.current = false;

      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }

      watchdogTimerRef.current = setTimeout(() => {
        // Safe watchdog: If iframe has not loaded within 7 seconds, display a recovery card
        if (!watchdogCancelledRef.current) {
          if (isOrigami) {
            setOrigamiLoadError(true);
          } else {
            setMegaplayLoadError(true);
          }
          setIframeLoading(false);
        }
      }, 7000);

      return () => {
        if (watchdogTimerRef.current) {
          clearTimeout(watchdogTimerRef.current);
          watchdogTimerRef.current = null;
        }
      };
    }
  }, [animeId, episodeNumber, selectedProvider, audioLanguage]);

  // Dynamic Embed loading for new providers (Anineko and AnimeGG)
  useEffect(() => {
    let canceled = false;
    
    if (selectedProvider === "anineko" || selectedProvider === "animegg") {
      setIframeLoading(true);
      setDynamicEmbedError(false);
      setDynamicEmbedUrl("");

      const fetchEmbed = async () => {
        try {
          if (selectedProvider === "anineko") {
            const res = await fetch(`https://anivexa-api-nine.vercel.app/watch/anineko/${anilistId}/${audioLanguage}/anineko-${episodeNumber}`);
            if (!res.ok) throw new Error("Anineko failed to fetch");
            const data = await res.json();
            const stream = data.streams?.find((s: any) => s.embed?.startsWith("https://vibeplayer.site"));
            if (!stream && !canceled) {
              if (onProviderChange) {
                onProviderChange("animegg");
              } else {
                setDynamicEmbedError(true);
              }
              return;
            }
            if (!canceled && stream?.embed) {
               setDynamicEmbedUrl(stream.embed);
            }
          } else if (selectedProvider === "animegg") {
            const res = await fetch(`https://anivexa-api-nine.vercel.app/watch/animegg/${anilistId}/${audioLanguage}/animegg-${episodeNumber}`);
            if (!res.ok) throw new Error("AnimeGG failed to fetch");
            const data = await res.json();
            const stream = data.streams?.find((s: any) => s.type === "embed" && s.server === "Animegg-embed");
            if (!canceled && stream?.url) {
               setDynamicEmbedUrl(stream.url);
            } else if (!canceled) {
               if (onProviderChange) {
                 onProviderChange("megaplay");
               } else {
                 setDynamicEmbedError(true);
               }
            }
          }
        } catch (e) {
          if (!canceled) {
             if (selectedProvider === "anineko" && onProviderChange) {
                onProviderChange("animegg");
             } else if (selectedProvider === "animegg" && onProviderChange) {
                onProviderChange("megaplay");
             } else {
                setDynamicEmbedError(true);
             }
          }
        } finally {
          if (!canceled) {
             setIframeLoading(false);
          }
        }
      };
      
      if (anilistId) {
        fetchEmbed();
      } else {
        setDynamicEmbedError(true);
        setIframeLoading(false);
      }
    } else {
      setDynamicEmbedUrl("");
      setDynamicEmbedError(false);
    }
    
    return () => { canceled = true; };
  }, [selectedProvider, anilistId, episodeNumber, audioLanguage]);

  // Native HLS Fetching for Neko HD and AniDB HD
  useEffect(() => {
    let canceled = false;

    if (selectedProvider === "anineko-hd" || selectedProvider === "anidb-hd") {
      setIframeLoading(true);
      setNativeHlsError(false);
      setNativeHlsUrl("");
      setNativeSubtitleUrl(null);

      const fetchHls = async () => {
        try {
          const cacheKey = `${anilistId}-${episodeNumber}-${selectedProvider}`;
          if (hlsCache[cacheKey]) {
            if (!canceled) {
              setNativeHlsUrl(hlsCache[cacheKey]);
              setNativeSubtitleUrl(hlsSubCache[cacheKey] || null);
              setIframeLoading(false);
            }
            return;
          }

          if (selectedProvider === "anidb-hd") {
            const res = await fetch(`https://anivexa-api-nine.vercel.app/watch/anidbapp/${anilistId}/${audioLanguage}/anidbapp-${episodeNumber}`);
            if (!res.ok) throw new Error("AniDB failed");
            const data = await res.json();
            const stream = data.streams?.find((s: any) => s.type === "hls");
            if (!stream && !canceled) {
              setNativeHlsError(true);
              return;
            }
            if (!canceled && stream?.url) {
              hlsCache[cacheKey] = stream.url;
              setNativeHlsUrl(stream.url);
            }
          } else if (selectedProvider === "anineko-hd") {
            const res = await fetch(`https://anivexa-api-nine.vercel.app/watch/anineko/${anilistId}/${audioLanguage}/anineko-${episodeNumber}`);
            if (!res.ok) throw new Error("Anineko HD failed");
            const data = await res.json();
            
            let stream = data.streams?.find((s: any) => s.type === "hls" && s.url.includes("morning-credit-3bcc.vibevibe.workers.dev"));
            
            if (!stream) {
              const validHlsStreams = data.streams?.filter((s: any) => {
                if (s.type !== "hls") return false;
                if (s.url.includes("vibeplayer.site") || s.url.includes("playmogo") || s.url.includes("otakuhg") || s.url.includes("otakuvid")) return false;
                return true;
              }) || [];
              
              stream = validHlsStreams.find((s: any) => s.priority === 8) || validHlsStreams[0];
            }

            if (!stream && !canceled) {
              setNativeHlsError(true);
              return;
            }
            if (!canceled && stream?.url) {
              hlsCache[cacheKey] = stream.url;
              setNativeHlsUrl(stream.url);
              
              const subtitleUrl = extractSubtitleUrl(stream);
              hlsSubCache[cacheKey] = subtitleUrl;
              setNativeSubtitleUrl(subtitleUrl);
              
              if (process.env.NODE_ENV !== "production") {
                console.log("[NEKO SUBTITLE]", subtitleUrl);
              }
            }
          }
        } catch (e) {
          if (!canceled) {
            setNativeHlsError(true);
          }
        } finally {
          if (!canceled) {
            setIframeLoading(false);
          }
        }
      };

      if (anilistId) {
        fetchHls();
      } else {
        setNativeHlsError(true);
        setIframeLoading(false);
      }
    } else {
      setNativeHlsUrl("");
      setNativeSubtitleUrl(null);
      setNativeHlsError(false);
    }

    return () => { canceled = true; };
  }, [selectedProvider, anilistId, episodeNumber, audioLanguage]);

  // Construct standard Embed URLs for backup providers
  function getEmbedUrl(): string {
    if (!tmdbId) return "";

    // Resolve season and episode based on Fribb mapping for TMDB
    let mappedSeason = seasonNumber;
    let mappedEpisode = episodeNumber;
    
    // Dynamically retrieve Fribb entry to properly offset TMDB backup players
    // using the initializeFribbMapping/getFribbEntryByAnilist context.
    // The WatchPage handles the main offset locally but for embedUrl we need the Fribb entry here
    const fb = anilistId ? getFribbEntryByAnilist(anilistId) : null;
    if (fb && fb.season?.tmdb !== undefined) {
      mappedSeason = fb.season.tmdb;
    }
    if (fb && fb.episode_offset?.tmdb !== undefined && mappedSeason === 1) {
      // Typically TMDB groups them, so we just add the offset 
      mappedEpisode = episodeNumber + fb.episode_offset.tmdb;
    }

    if (mediaType === "movie") {
      switch (selectedProvider) {
        case "vidnest":
          return `https://vidnest.fun/movie/${tmdbId}`;
        case "cinesrc":
          return `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ffffff&autoplay=true&autonext=true&autoskip=true`;
        case "vidfast":
          return `https://vidfast.pro/movie/${tmdbId}?autoPlay=true&theme=FFFFFF`;
        case "movies111":
          return `https://111movies.net/movie/${tmdbId}`;
        default:
          return `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ffffff&autoplay=true&autonext=true&autoskip=true`;
      }
    } else {
      switch (selectedProvider) {
        case "vidnest":
          return `https://vidnest.fun/tv/${tmdbId}/${mappedSeason}/${mappedEpisode}`;
        case "cinesrc":
          return `https://cinesrc.st/embed/tv/${tmdbId}?s=${mappedSeason}&e=${mappedEpisode}&color=%23ffffff&autoplay=true&autonext=true&autoskip=true`;
        case "vidfast":
          return `https://vidfast.pro/tv/${tmdbId}/${mappedSeason}/${mappedEpisode}?autoPlay=true&theme=FFFFFF&nextButton=true&autoNext=true`;
        case "movies111":
          return `https://111movies.net/tv/${tmdbId}/${mappedSeason}/${mappedEpisode}`;
        default:
          return `https://cinesrc.st/embed/tv/${tmdbId}?s=${mappedSeason}&e=${mappedEpisode}&color=%23ffffff&autoplay=true&autonext=true&autoskip=true`;
      }
    }
  }

  // Global Window Message event listeners for CineSrc / VidFast events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || "";

      // 1. CineSrc events check
      if (origin.includes("cinesrc.st")) {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data) {
            const eventType = data.event || data.type;
            if (eventType === "cinesrc:timeupdate") {
              const cur = parseFloat(data.currentTime || data.time || 0);
              const dur = parseFloat(data.duration || 0);
              if (dur > 0) {
                handlePlayerProgress(cur, dur);
              }
            } else if (eventType === "cinesrc:nextepisode") {
              handlePlayerEnded();
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      // 2. VidFast and MegaPlay events check
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data) {
          const eventType = data.event || data.type;
          
          const isMegaPlayEvent = selectedProvider === "megaplay" && (
            eventType === "time" ||
            eventType === "complete" ||
            data.type === "watching-log"
          );

          const isOrigamiEvent = selectedProvider === "origami" && (
            eventType === "time" ||
            eventType === "complete" ||
            data.type === "watching-log" ||
            eventType === "error"
          );

          if (isMegaPlayEvent || isOrigamiEvent) {
            const providerName = selectedProvider === "origami" ? "Origami" : "MegaPlay";
            if (!hasReceivedFirstEventRef.current) {
              hasReceivedFirstEventRef.current = true;
            }
            if (!watchdogCancelledRef.current) {
              watchdogCancelledRef.current = true;
            }
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }
            if (selectedProvider === "origami") {
              if (eventType === "error") {
                setOrigamiLoadError(true);
              } else {
                setOrigamiLoadError(false);
              }
            } else {
              setMegaplayLoadError(false);
            }
            setIframeLoading(false);
          }
          
          if (eventType === "time") {
            // MegaPlay time updates
            const cur = parseFloat(data.time || 0);
            const dur = parseFloat(data.duration || 0);
            if (dur > 0) {
              const percent = data.percent !== undefined 
                ? parseFloat(data.percent) 
                : parseFloat(((cur / dur) * 100).toFixed(1));
              handlePlayerProgress(cur, dur, percent);
            }
          } else if (eventType === "complete") {
            // MegaPlay auto-advance
            handlePlayerEnded();
          } else if (data.type === "watching-log") {
            // MegaPlay watching-log updates
            const cur = parseFloat(data.currentTime || 0);
            const dur = parseFloat(data.duration || 0);
            if (dur > 0) {
              handlePlayerProgress(cur, dur);
            }
          } else if (eventType === "PLAYER_EVENT" || data.event === "PLAYER_EVENT") {
            const cur = parseFloat(data.currentTime || data.time || 0);
            const dur = parseFloat(data.duration || 0);
            
            if (dur > 0) {
              handlePlayerProgress(cur, dur);
            }
          } else if (eventType === "MEDIA_DATA" || data.mediaData) {
            const mediaObj = data.mediaData || data;
            const cur = parseFloat(mediaObj.currentTime || mediaObj.time || 0);
            const dur = parseFloat(mediaObj.duration || 0);
            if (dur > 0) {
              handlePlayerProgress(cur, dur);
            }
          }
        }
      } catch (e) {
        // ignore parsing error
      }
      
      // 3. VidNest events check
      if (origin.includes("vidnest.fun")) {
        try {
          const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          if (data && data.event) {
            const eventType = data.event;
            // Handle TIMEUPDATE
            if (eventType === "TIMEUPDATE" && data.time && data.duration) {
              const cur = parseFloat(data.time);
              const dur = parseFloat(data.duration);
              if (dur > 0) {
                handlePlayerProgress(cur, dur);
              }
            } else if (eventType === "ENDED") {
              handlePlayerEnded();
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    };
 
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [animeId, episodeNumber, seasonNumber, animeTitle, selectedProvider, tmdbId, onProgressUpdate, onNextEpisode]);
 
  const megaPlayUrl = selectedProvider === "megaplay"
    ? `https://animeplay.cfd/stream/mal/${animeId}/${episodeNumber}/${audioLanguage}`
    : "";
  const origamiUrl = selectedProvider === "origami"
    ? `https://megaplay.buzz/stream/mal/${animeId}/${episodeNumber}/${audioLanguage}`
    : "";
  const watchState = getUnifiedWatchState(animeId);
  const startAtSeconds = watchState?.last_season_watched === seasonNumber && watchState?.last_episode_watched === episodeNumber && watchState?.progress?.watched
      ? Math.floor(watchState.progress.watched)
      : 0;

  const vidnestUrl = selectedProvider === "vidnest"
    ? `https://vidnest.fun/anime/${anilistId}/${episodeNumber}/${audioLanguage}${startAtSeconds > 0 ? `?startAt=${startAtSeconds}` : ''}`
    : "";
  const animepaheUrl = selectedProvider === "animepahe"
    ? `https://vidnest.fun/animepahe/${anilistId}/${episodeNumber}/${audioLanguage}`
    : "";
  const embedUrl = getEmbedUrl();

  // Development Logging for Provider Resolution Pipeline Audit
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.group("[SEASON RESOLUTION AUDIT] Provider Request Pipeline");
      console.log("- Current anime title:", animeTitle);
      console.log("- Current MAL ID:", animeId);
      console.log("- Current AniList ID:", anilistId);
      console.log("- Current season number (UI):", seasonNumber);
      console.log("- Current episode number:", episodeNumber);
      console.log("- TMDB ID:", tmdbId);
      
      let payload = "";
      if (selectedProvider === "megaplay") payload = megaPlayUrl;
      else if (selectedProvider === "origami") payload = origamiUrl;
      else if (selectedProvider === "vidnest") payload = vidnestUrl;
      else if (selectedProvider === "animepahe") payload = animepaheUrl;
      else if (selectedProvider === "anineko" || selectedProvider === "animegg") payload = dynamicEmbedUrl || "Dynamic embed loading...";
      else payload = embedUrl;

      console.log("- Final provider request payload:", payload);
      console.groupEnd();
    }
  }, [animeTitle, animeId, anilistId, seasonNumber, episodeNumber, tmdbId, selectedProvider, megaPlayUrl, origamiUrl, vidnestUrl, animepaheUrl, dynamicEmbedUrl, embedUrl]);
 
  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-[#0a0a0c] overflow-hidden group select-none shadow-2xl md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.65)] transition-all duration-500 rounded-3xl"
    >
      {selectedProvider === "megaplay" ? (
        megaplayLoadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-400 z-10 gap-3 bg-[#0a0a0c]">
            <Landmark className="w-12 h-12 text-white/50 mb-2" />
            <h4 className="text-white text-sm font-bold">Kyou Server Connection Timeout</h4>
            <p className="text-xs text-gray-505 max-w-sm leading-relaxed">
              Premium Kyou stream timed out or was blocked. Switch language above or choose a fallback server like Taberu or Matsuri below.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => {
                  setMegaplayLoadError(false);
                  setIframeLoading(true);
                  handleLanguageChange(audioLanguage);
                }}
                className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Retry Stream
              </button>
              {onProviderChange && (
                <button
                  onClick={() => onProviderChange("cinesrc")}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg border border-white/10 cursor-pointer transition-colors"
                >
                  Use Backup (Taberu)
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <iframe
              src={megaPlayUrl}
              className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
              title={`MakiTV Player: ${animeTitle}`}
            />
          </motion.div>
        )
      ) : selectedProvider === "origami" ? (
        origamiLoadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-400 z-10 gap-3 bg-[#0a0a0c]">
            <Landmark className="w-12 h-12 text-white/50 mb-2" />
            <h4 className="text-white text-sm font-bold">Kami Connection Timeout / Error</h4>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              Premium Kami stream timed out or was blocked. Switch language above or choose a fallback server like Taberu or Matsuri below.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => {
                  setOrigamiLoadError(false);
                  setIframeLoading(true);
                  handleLanguageChange(audioLanguage);
                }}
                className="px-4 py-1.5 bg-white text-black hover:bg-gray-200 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Retry Stream
              </button>
              {onProviderChange && (
                <button
                  onClick={() => onProviderChange("cinesrc")}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-lg border border-white/10 cursor-pointer transition-colors"
                >
                  Use Backup (Taberu)
                </button>
              )}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <iframe
              src={origamiUrl}
              className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
              title={`MakiTV Player: ${animeTitle}`}
            />
          </motion.div>
        )
      ) : selectedProvider === "vidnest" && isAnime ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full"
        >
          <iframe
            src={vidnestUrl}
            className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            title={`Nest Player: ${animeTitle}`}
          />
        </motion.div>
      ) : selectedProvider === "animepahe" ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full"
        >
          <iframe
            src={animepaheUrl}
            className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
            title={`Miru Player: ${animeTitle}`}
          />
        </motion.div>
      ) : selectedProvider === "anineko-hd" || selectedProvider === "anidb-hd" ? (
        nativeHlsError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-400 z-10 gap-3 bg-[#0a0a0c]">
            <Landmark className="w-12 h-12 text-white/50 mb-2" />
            <h4 className="text-white text-sm font-bold">Unable to load stream.</h4>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              Try another server.
            </p>
          </div>
        ) : nativeHlsUrl ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full z-10"
          >
            <MediaPlayer
              src={{ src: nativeHlsUrl, type: "application/x-mpegurl" }}
              autoPlay
              playsInline
              className="w-full h-full"
              onTimeUpdate={(e: any) => {
                const target = e?.target as any;
                if (!target) return;
                
                let cur = 0;
                let dur = 0;

                if (target.state !== undefined) {
                  dur = Number(target.state.duration) || 0;
                  cur = Number(target.state.currentTime) || 0;
                } else {
                  dur = Number(target.duration) || 0;
                  cur = Number(target.currentTime) || 0;
                }

                if (typeof e?.detail === 'number') {
                  cur = Number(e.detail);
                }

                if (dur > 0 && !isNaN(cur) && !isNaN(dur)) {
                  handlePlayerProgress(cur, dur);
                }
              }}
              onEnded={handlePlayerEnded}
            >
              <MediaProvider>
                {nativeSubtitleUrl && (
                  <Track
                    src={nativeSubtitleUrl}
                    kind="subtitles"
                    label="English"
                    lang="en-US"
                    type="vtt"
                    default
                  />
                )}
              </MediaProvider>
              <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0c]" />
        )
      ) : selectedProvider === "anineko" || selectedProvider === "animegg" ? (
        dynamicEmbedError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-500 z-10 gap-2">
            <Landmark className="w-8 h-8 text-gray-600 mb-2" />
            <h4 className="text-white text-sm font-bold">Failed to resolve stream</h4>
            <span className="text-xs max-w-sm">
              Provider could not locate this localized episode stream. Use another proxy.
            </span>
          </div>
        ) : dynamicEmbedUrl ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <iframe
              src={dynamicEmbedUrl}
              className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
              allow="autoplay; fullscreen; encrypted-media"
              allowFullScreen
              onLoad={handleIframeLoad}
              title={`${selectedProvider === 'anineko' ? 'Neko' : 'GG'} Player: ${animeTitle}`}
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0c]" />
        )
      ) : embedUrl ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="w-full h-full"
        >
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="origin"
            allowFullScreen
            onLoad={() => setIframeLoading(false)}
            title={`MakiTV Player: ${animeTitle}`}
          />
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-[#0a0a0c]" />
      )}
 
      {/* Anime-themed Loading Experience */}
      <AnimatePresence>
        {(iframeLoading && !megaplayLoadError && !origamiLoadError && !dynamicEmbedError && !nativeHlsError) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-[#0a0a0c] z-20 pointer-events-none overflow-hidden"
          >
            <img 
              src="https://res.cloudinary.com/dgymbeaxk/image/upload/v1781102541/animesher.com_run-school-uniform-bread-1335779_mruzcm.gif"
              alt="Loading..."
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none transition-all"
              style={{ 
                top: '68%',
                width: 'clamp(200px, 40%, 280px)',
                height: 'auto'
              }}
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}

        {showAutoNextOverlay && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="absolute inset-0 bg-black/50 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 select-none pointer-events-auto"
          >
            {hasNextEpisode ? (
              <div className="flex flex-col items-center bg-[#121214]/90 border border-white/10 p-8 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] max-w-sm w-full backdrop-blur-xl text-center transition-all duration-300 transform scale-100">
                <span className="text-[11px] font-extrabold text-[#8b5cf6] uppercase tracking-[0.2em] mb-2 drop-shadow-sm">Next Episode</span>
                <span className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-3">Episode {episodeNumber + 1}</span>
                <h3 className="text-xl font-bold text-white mb-8 line-clamp-2">{nextEpisodeTitle || `Episode ${episodeNumber + 1}`}</h3>
                <div className="flex items-center justify-center gap-2 mb-8 text-white/80 text-sm font-medium">
                   Playing in <span className="text-white font-bold text-lg w-6 tabular-nums">{autoNextCountdown}</span>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => {
                      setShowAutoNextOverlay(false);
                      onNextEpisode();
                    }}
                    className="flex-1 px-4 py-3 bg-white text-black hover:bg-gray-200 text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    Play Now
                  </button>
                  <button
                    onClick={() => {
                      setCountdownCancelled(true);
                      setShowAutoNextOverlay(false);
                    }}
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center bg-[#121214]/90 border border-white/10 p-8 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] max-w-sm w-full backdrop-blur-xl text-center transition-all duration-300 transform scale-100">
                <span className="text-[11px] font-extrabold text-[#8b5cf6] uppercase tracking-[0.2em] mb-4">Complete</span>
                <h3 className="text-xl font-bold text-white mb-6">You've reached the final episode.</h3>
                {onNavigateToChannel && (
                  <button
                    onClick={onNavigateToChannel}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all active:scale-95 w-full focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {isAnime ? "Back To Channel" : "Back To Series"}
                  </button>
                )}
                <button
                   onClick={() => {
                     setCountdownCancelled(true);
                     setShowAutoNextOverlay(false);
                   }}
                   className="mt-4 text-xs text-white/50 hover:text-white transition-colors uppercase tracking-widest font-semibold focus:outline-none"
                >
                  Dismiss
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
