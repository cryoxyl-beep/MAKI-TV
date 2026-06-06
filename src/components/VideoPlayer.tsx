/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Landmark, RefreshCw } from "lucide-react";
import { saveUnifiedWatchState } from "../utils";

interface VideoPlayerProps {
  animeId: number;
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
      console.log(`[${isOrigami ? "Origami" : "MegaPlay"}] iframe loaded`);
      if (!watchdogCancelledRef.current) {
        console.log(`[${isOrigami ? "Origami" : "MegaPlay"}] watchdog cancelled`);
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
  };

  // Trigger loading screen reset when any major state changes
  useEffect(() => {
    setIframeLoading(true);
    setMegaplayLoadError(false);
    const timer = setTimeout(() => {
      setIframeLoading(false);
    }, 4000); // 4-second safety threshold fallback
    return () => clearTimeout(timer);
  }, [animeId, episodeNumber, seasonNumber, selectedProvider, tmdbId]);

  // MegaPlay and Origami loading and fallback watchdog effect loop
  useEffect(() => {
    if (selectedProvider === "megaplay" || selectedProvider === "origami") {
      const isOrigami = selectedProvider === "origami";
      console.log(`[${isOrigami ? "Origami" : "MegaPlay"}] iframe created`);
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

      console.log(`[${isOrigami ? "Origami" : "MegaPlay"}] watchdog started`);
      watchdogTimerRef.current = setTimeout(() => {
        // Safe watchdog: If iframe has not loaded within 7 seconds, display a recovery card
        if (!watchdogCancelledRef.current) {
          console.log(`[${isOrigami ? "Origami" : "MegaPlay"}] timeout card triggered`);
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
              console.log("CineSrc PostMessage: auto-advancing next episode");
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
              console.log(`[${providerName}] first player event received`);
              hasReceivedFirstEventRef.current = true;
            }
            if (!watchdogCancelledRef.current) {
              console.log(`[${providerName}] watchdog cancelled`);
              watchdogCancelledRef.current = true;
            }
            if (watchdogTimerRef.current) {
              clearTimeout(watchdogTimerRef.current);
              watchdogTimerRef.current = null;
            }
            if (selectedProvider === "origami") {
              if (eventType === "error") {
                console.log("[Origami] received error event, triggering error card");
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
            console.log("MegaPlay Auto-Next postMessage event triggered.");
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
  const embedUrl = getEmbedUrl();

  // Development Logging for MegaPlay and Origami Integration
  useEffect(() => {
    if (selectedProvider === "megaplay") {
      console.log(`[MegaPlay Integration Debug]`);
      console.log(`Current MAL ID: ${animeId}`);
      console.log(`Current Episode: ${episodeNumber}`);
      console.log(`Current Language: ${audioLanguage}`);
      console.log(`Generated MegaPlay URL: ${megaPlayUrl}`);
    } else if (selectedProvider === "origami") {
      console.log(`[Origami Integration Debug]`);
      console.log(`Current MAL ID: ${animeId}`);
      console.log(`Current Episode: ${episodeNumber}`);
      console.log(`Current Language: ${audioLanguage}`);
      console.log(`Generated Origami URL: ${origamiUrl}`);
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
            <h4 className="text-white text-sm font-bold">MegaPlay Server Connection Timeout</h4>
            <p className="text-xs text-gray-505 max-w-sm leading-relaxed">
              Premium MegaPlay stream timed out or was blocked. Switch language above or choose a fallback server like Taberu or Matsuri below.
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
          <>
            <iframe
              src={megaPlayUrl}
              className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
              title={`MakiTV Player: ${animeTitle}`}
            />
          </>
        )
      ) : selectedProvider === "origami" ? (
        origamiLoadError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-400 z-10 gap-3 bg-[#0a0a0c]">
            <Landmark className="w-12 h-12 text-white/50 mb-2" />
            <h4 className="text-white text-sm font-bold">Origami Connection Timeout / Error</h4>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              Premium Origami stream timed out or was blocked. Switch language above or choose a fallback server like Taberu or Matsuri below.
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
          <>
            <iframe
              src={origamiUrl}
              className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={handleIframeLoad}
              title={`MakiTV Player: ${animeTitle}`}
            />
          </>
        )
      ) : embedUrl ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="origin"
          allowFullScreen
          onLoad={() => setIframeLoading(false)}
          title={`MakiTV Player: ${animeTitle}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-500 z-10 gap-2">
          <Landmark className="w-8 h-8 text-gray-600 animate-pulse" />
          <span className="text-sm font-medium">Resolving stream pipeline mappings...</span>
        </div>
      )}
 
      {/* Loading Glass overlay */}
      {iframeLoading && (selectedProvider === "megaplay" ? !megaplayLoadError : selectedProvider === "origami" ? !origamiLoadError : !!embedUrl) && (
        <div className="absolute inset-0 bg-[#0a0a0c] flex flex-col items-center justify-center z-20 gap-3 pointer-events-none">
          <RefreshCw className="w-7 h-7 text-white/50 animate-spin" />
          <div className="text-center font-sans">
            <span className="text-[10px] uppercase text-white/40 font-bold tracking-widest block mb-0.5">
              Secure Proxy Stream
            </span>
            <span className="text-white text-xs font-semibold">
              Loading {selectedProvider === "megaplay" ? "MegaPlay" : selectedProvider === "origami" ? "Origami" : "source"} channel connection...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
