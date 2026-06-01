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
  tmdbId: number;
  mediaType: "tv" | "movie";
  onNextEpisode: () => void;
}

export default function VideoPlayer({
  animeId,
  episodeNumber,
  seasonNumber,
  animeTitle,
  onProgressUpdate,
  selectedProvider,
  tmdbId,
  mediaType,
  onNextEpisode,
}: VideoPlayerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger loading screen reset when any major state changes
  useEffect(() => {
    setIframeLoading(true);
    const timer = setTimeout(() => {
      setIframeLoading(false);
    }, 4000); // 4-second safety threshold fallback
    return () => clearTimeout(timer);
  }, [animeId, episodeNumber, seasonNumber, selectedProvider, tmdbId]);

  // Construct standard Embed URLs
  function getEmbedUrl(): string {
    if (!tmdbId) return "";

    if (mediaType === "movie") {
      switch (selectedProvider) {
        case "cinesrc":
          return `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ff6b35&autoplay=true&autonext=true&autoskip=true`;
        case "vidfast":
          return `https://vidfast.pro/movie/${tmdbId}?autoPlay=true&theme=FF6B35`;
        case "movies111":
          return `https://111movies.net/movie/${tmdbId}`;
        default:
          return `https://cinesrc.st/embed/movie/${tmdbId}?color=%23ff6b35&autoplay=true&autonext=true&autoskip=true`;
      }
    } else {
      switch (selectedProvider) {
        case "cinesrc":
          return `https://cinesrc.st/embed/tv/${tmdbId}?s=${seasonNumber}&e=${episodeNumber}&color=%23ff6b35&autoplay=true&autonext=true&autoskip=true`;
        case "vidfast":
          return `https://vidfast.pro/tv/${tmdbId}/${seasonNumber}/${episodeNumber}?autoPlay=true&theme=FF6B35&nextButton=true&autoNext=true`;
        case "movies111":
          return `https://111movies.net/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`;
        default:
          return `https://cinesrc.st/embed/tv/${tmdbId}?s=${seasonNumber}&e=${episodeNumber}&color=%23ff6b35&autoplay=true&autonext=true&autoskip=true`;
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

      // 2. VidFast events check (event name is: PLAYER_EVENT or MEDIA_DATA)
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data) {
          const eventType = data.event || data.type;
          
          if (eventType === "PLAYER_EVENT" || data.event === "PLAYER_EVENT") {
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

  const embedUrl = getEmbedUrl();

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-[#0a0a0c] overflow-hidden group select-none shadow-2xl transition-all duration-300 rounded-2xl border border-white/[0.06]"
    >
      {/* Target Iframe Stream Layer */}
      {embedUrl ? (
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
      {iframeLoading && embedUrl && (
        <div className="absolute inset-0 bg-[#0a0a0c] flex flex-col items-center justify-center z-20 gap-3 pointer-events-none">
          <RefreshCw className="w-7 h-7 text-[#ff6b35] animate-spin" />
          <div className="text-center font-sans">
            <span className="text-[10px] uppercase text-[#ff6b35] font-bold tracking-widest block mb-0.5">
              Secure Proxy Stream
            </span>
            <span className="text-white text-xs font-semibold">
              Loading source channel connection...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
