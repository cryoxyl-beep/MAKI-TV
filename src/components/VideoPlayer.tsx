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
  onProviderChange?: (provider: string) => void;
}

// "Sakura" (AniPub) Dynamic Streaming Pipeline
async function fetchSakuraEmbed(animeTitle: string, animeId: number, episodeNumber: number): Promise<string> {
  // Check if we already cached the resolved AniPub ID for this animeId
  const cachedIdKey = `makitv_sakura_cache_id_${animeId}`;
  let resolvedId = localStorage.getItem(cachedIdKey);

  if (!resolvedId) {
    const cleanTitle = animeTitle
      .replace(/\(.*\)/g, "")
      .replace(/Season \d+/gi, "")
      .replace(/Part \d+/gi, "")
      .replace(/:/g, "")
      .trim();

    const queryTerm = cleanTitle || animeTitle;
    const findUrl = `https://anipub.xyz/api/find/${encodeURIComponent(queryTerm)}`;
    
    let isFound = false;
    try {
      const findRes = await fetch(findUrl);
      if (findRes.ok) {
        const findJson = await findRes.json();
        if (findJson && findJson.exist === true && findJson.id) {
          resolvedId = String(findJson.id);
          isFound = true;
        }
      }
    } catch (e) {
      console.warn("AniPub find request encountered an error:", e);
    }

    if (!isFound) {
      const searchUrl = `https://anipub.xyz/api/search/${encodeURIComponent(queryTerm)}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        throw new Error(`AniPub search route failed with status: ${searchRes.status}`);
      }
      const searchJson = await searchRes.json();
      const results = Array.isArray(searchJson) ? searchJson : (searchJson.data || searchJson.results || []);
      if (results && results.length > 0) {
        const matched = results[0];
        if (matched.Id !== undefined) {
          resolvedId = String(matched.Id);
        } else if (matched.id !== undefined) {
          resolvedId = String(matched.id);
        } else {
          throw new Error("No usable ID found in matched AniPub search results.");
        }
      } else {
        throw new Error("No results returned for Sakura query.");
      }
    }

    if (resolvedId) {
      localStorage.setItem(cachedIdKey, resolvedId);
    } else {
      throw new Error("AniPub ID lookup returned an empty result.");
    }
  }

  // Check if we already have the cache for this specific episode link
  const cachedLinkKey = `makitv_sakura_cache_link_${resolvedId}_ep_${episodeNumber}`;
  let iframeUrl = localStorage.getItem(cachedLinkKey);

  if (!iframeUrl) {
    const detailsUrl = `https://anipub.xyz/v1/api/details/${resolvedId}`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      throw new Error(`AniPub details route failed with status: ${detailsRes.status}`);
    }
    const detailsJson = await detailsRes.json();
    const local = detailsJson.local;
    if (!local) {
      throw new Error("Target details response has no local properties block.");
    }

    let rawLink = "";
    if (episodeNumber === 1) {
      rawLink = local.link || "";
    } else {
      const epArray = local.ep || [];
      const index = episodeNumber - 2;
      if (epArray[index] && epArray[index].link) {
        rawLink = epArray[index].link;
      } else {
        throw new Error(`Episode index ${index} out of bound or lacks a playable link.`);
      }
    }

    if (!rawLink) {
      throw new Error(`AniPub mapping was unable to extract any stream location for Episode ${episodeNumber}.`);
    }

    // Isolate target iframe location string while stripping out src= prefix and any wrapping quotes
    let resolvedLink = rawLink.replace(/src=/gi, "").trim();
    if ((resolvedLink.startsWith('"') && resolvedLink.endsWith('"')) || (resolvedLink.startsWith("'") && resolvedLink.endsWith("'"))) {
      resolvedLink = resolvedLink.slice(1, -1);
    }

    iframeUrl = resolvedLink;
    if (iframeUrl) {
      localStorage.setItem(cachedLinkKey, iframeUrl);
    }
  }

  if (!iframeUrl) {
    throw new Error("Resolved Sakura link was determined to be empty.");
  }

  return iframeUrl;
}

export default function VideoPlayer({
  animeId,
  episodeNumber,
  seasonNumber,
  animeTitle,
  onProgressUpdate,
  savedProgress,
  selectedProvider,
  tmdbId,
  mediaType,
  onNextEpisode,
  onProviderChange,
}: VideoPlayerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sakura Embed States & Refs
  const [sakuraEmbedUrl, setSakuraEmbedUrl] = useState<string>("");
  const [sakuraLoading, setSakuraLoading] = useState<boolean>(false);

  // Tracker for simulated player progression to avoid useEffect loop resets
  const currentSimulatedRef = useRef<{ animeId: number; season: number; episode: number; provider: string } | null>(null);
  const playedSecondsRef = useRef<number>(0);
  const savedProgressRef = useRef<number | undefined>(savedProgress);

  useEffect(() => {
    savedProgressRef.current = savedProgress;
  }, [savedProgress]);

  // Trigger loading screen reset when any major state changes
  useEffect(() => {
    setIframeLoading(true);
    const timer = setTimeout(() => {
      setIframeLoading(false);
    }, 4000); // 4-second safety threshold fallback
    return () => clearTimeout(timer);
  }, [animeId, episodeNumber, seasonNumber, selectedProvider, tmdbId]);

  // Active Sakura Stream resolver effect loop
  useEffect(() => {
    if (selectedProvider !== "sakura") {
      setSakuraEmbedUrl("");
      setSakuraLoading(false);
      return;
    }

    let active = true;
    async function resolveSakura() {
      setSakuraLoading(true);
      try {
        const embedUrl = await fetchSakuraEmbed(animeTitle, animeId, episodeNumber);
        if (active) {
          setSakuraEmbedUrl(embedUrl);
          setSakuraLoading(false);
          setIframeLoading(false);
        }
      } catch (err) {
        console.warn("Sakura Premium pipeline integration failed, executing silent fallback override...", err);
        if (active) {
          setSakuraLoading(false);
          if (onProviderChange) {
            onProviderChange("cinesrc"); // Seamlessly failover to Taberu
          }
        }
      }
    }

    resolveSakura();

    return () => {
      active = false;
    };
  }, [selectedProvider, animeTitle, episodeNumber, animeId, onProviderChange]);

  // Simulated playback progress sync timer for Sakura iframe
  useEffect(() => {
    if (selectedProvider === "sakura" && !iframeLoading && sakuraEmbedUrl) {
      const isNew = !currentSimulatedRef.current || 
        currentSimulatedRef.current.animeId !== animeId ||
        currentSimulatedRef.current.season !== seasonNumber ||
        currentSimulatedRef.current.episode !== episodeNumber ||
        currentSimulatedRef.current.provider !== selectedProvider;

      const duration = 1425; // 23 minutes 45 seconds

      if (isNew) {
        currentSimulatedRef.current = { animeId, season: seasonNumber, episode: episodeNumber, provider: selectedProvider };
        const initialPercent = savedProgressRef.current || 0;
        playedSecondsRef.current = (initialPercent / 100) * duration;
      }

      const interval = setInterval(() => {
        playedSecondsRef.current += 2;
        if (playedSecondsRef.current >= duration) {
          playedSecondsRef.current = duration;
          clearInterval(interval);
          onNextEpisode();
          return;
        }

        const percent = parseFloat(((playedSecondsRef.current / duration) * 100).toFixed(1));
        onProgressUpdate(percent);

        saveUnifiedWatchState({
          anilistId: animeId,
          tmdbId: tmdbId,
          title: animeTitle,
          provider: selectedProvider,
          progress: { watched: playedSecondsRef.current, duration },
          last_season_watched: seasonNumber,
          last_episode_watched: episodeNumber,
          percentage: percent,
          updatedAt: new Date().toISOString()
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [selectedProvider, iframeLoading, sakuraEmbedUrl, animeId, tmdbId, animeTitle, seasonNumber, episodeNumber, onProgressUpdate, onNextEpisode]);

  // Construct standard Embed URLs for backup providers
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
      {selectedProvider === "sakura" ? (
        sakuraEmbedUrl ? (
          <iframe
            src={sakuraEmbedUrl}
            className="w-full h-full border-0 absolute inset-0 z-10 pointer-events-auto"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="origin"
            allowFullScreen
            onLoad={() => setIframeLoading(false)}
            title={`MakiTV Player: ${animeTitle}`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-gray-500 z-10 gap-2">
            <RefreshCw className="w-8 h-8 text-[#ff6b35] animate-spin" />
            <span className="text-sm font-medium">Resolving raw streams from Sakura multiplexer...</span>
          </div>
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
      {iframeLoading && (selectedProvider === "sakura" ? sakuraLoading : !!embedUrl) && (
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
