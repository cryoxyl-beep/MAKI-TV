/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Landmark } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { saveUnifiedWatchState, getUnifiedWatchState } from "../utils";

interface VideoPlayerProps {
  animeId: number;
  anilistId?: number;
  episodeNumber: number;
  seasonNumber: number;
  animeTitle: string;
  onProgressUpdate: (percentage: number) => void;
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
}: VideoPlayerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const [megaplayLoadError, setMegaplayLoadError] = useState<boolean>(false);
  const [origamiLoadError, setOrigamiLoadError] = useState<boolean>(false);
  const [vidnestLoadError, setVidnestLoadError] = useState<boolean>(false);
  const [animepaheLoadError, setAnimepaheLoadError] = useState<boolean>(false);
  
  const [dynamicEmbedUrl, setDynamicEmbedUrl] = useState<string>("");
  const [dynamicEmbedError, setDynamicEmbedError] = useState<boolean>(false);


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

  // Construct standard Embed URLs for backup providers
  function getEmbedUrl(): string {
    if (!tmdbId) return "";

    if (mediaType === "movie") {
      switch (selectedProvider) {
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
        case "cinesrc":
          return `https://cinesrc.st/embed/tv/${tmdbId}?s=${seasonNumber}&e=${episodeNumber}&color=%23ffffff&autoplay=true&autonext=true&autoskip=true`;
        case "vidfast":
          return `https://vidfast.pro/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?autoPlay=true&theme=FFFFFF&nextButton=true&autoNext=true`;
        case "movies111":
          return `https://111movies.net/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`;
        default:
          return `https://cinesrc.st/embed/tv/${tmdbId}?s=${seasonNumber}&e=${episodeNumber}&color=%23ffffff&autoplay=true&autonext=true&autoskip=true`;
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
                const percent = parseFloat(((cur / dur) * 100).toFixed(1));
                onProgressUpdate(percent);
                
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
            } else if (eventType === "cinesrc:nextepisode") {
              onNextEpisode();
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
              onProgressUpdate(percent);
              
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
          } else if (eventType === "complete") {
            // MegaPlay auto-advance
            onNextEpisode();
          } else if (data.type === "watching-log") {
            // MegaPlay watching-log updates
            const cur = parseFloat(data.currentTime || 0);
            const dur = parseFloat(data.duration || 0);
            if (dur > 0) {
              const percent = parseFloat(((cur / dur) * 100).toFixed(1));
              onProgressUpdate(percent);
              
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
          } else if (eventType === "PLAYER_EVENT" || data.event === "PLAYER_EVENT") {
            const cur = parseFloat(data.currentTime || data.time || 0);
            const dur = parseFloat(data.duration || 0);
            
            if (dur > 0) {
              const percent = parseFloat(((cur / dur) * 100).toFixed(1));
              onProgressUpdate(percent);
              
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
          } else if (eventType === "MEDIA_DATA" || data.mediaData) {
            const mediaObj = data.mediaData || data;
            const cur = parseFloat(mediaObj.currentTime || mediaObj.time || 0);
            const dur = parseFloat(mediaObj.duration || 0);
            if (dur > 0) {
              const percent = parseFloat(((cur / dur) * 100).toFixed(1));
              onProgressUpdate(percent);
              
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
                const percent = parseFloat(((cur / dur) * 100).toFixed(1));
                onProgressUpdate(percent);
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
            } else if (eventType === "ENDED") {
              onNextEpisode();
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

  // Development Logging for MegaPlay and Origami Integration
  useEffect(() => {
    if (selectedProvider === "megaplay") {
    } else if (selectedProvider === "origami") {
    }
  }, [selectedProvider, animeId, episodeNumber, audioLanguage, megaPlayUrl, origamiUrl]);
 
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
      ) : selectedProvider === "vidnest" ? (
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
            title={`Haya Player: ${animeTitle}`}
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
        {(iframeLoading && !megaplayLoadError && !origamiLoadError && !dynamicEmbedError) && (
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
      </AnimatePresence>
    </div>
  );
}
