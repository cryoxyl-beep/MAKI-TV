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
  englishTitle?: string;
  romajiTitle?: string;
  synonyms?: string[];
}

interface AniPubCacheEntry {
  anipubId: number;
  details: {
    local: {
      link: string;
      ep: Array<{ link: string }>;
    };
  };
}

function getSakuraCache(animeId: number): AniPubCacheEntry | null {
  try {
    const raw = localStorage.getItem("makitv_sakura_unified_cache");
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[animeId] || null;
  } catch (e) {
    return null;
  }
}

function setSakuraCache(animeId: number, entry: AniPubCacheEntry) {
  try {
    const raw = localStorage.getItem("makitv_sakura_unified_cache");
    const cache = raw ? JSON.parse(raw) : {};
    cache[animeId] = entry;
    localStorage.setItem("makitv_sakura_unified_cache", JSON.stringify(cache));
  } catch (e) {
    console.error("Failed to write Sakura AniPub cache", e);
  }
}

function extractSrc(link: string): string {
  if (!link) return "";
  let cleaned = link.replace(/src=/gi, "").trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}

async function fetchAniPub(url: string) {
  console.log(`[AniPub API Request] URL: ${url}`);
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error: any) {
    console.error(`[AniPub Network Error] URL: ${url}, Error: ${error?.message || error}`);
    throw error;
  }

  const status = response.status;
  const contentType = response.headers.get("content-type") || "";
  console.log(`[AniPub Response Code] URL: ${url}, Status: ${status}, Content-Type: ${contentType}`);

  if (!response.ok || !contentType.toLowerCase().includes("application/json")) {
    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch (_) {}
    const bodySample = bodyText.substring(0, 500);
    console.error(`[AniPub Validation Fail] URL: ${url}, Status: ${status}, Content-Type: ${contentType}, First 500 characters: ${bodySample}`);
    throw new Error(`AniPub request failure. Status: ${status}, ContentType: ${contentType}`);
  }

  return response.json();
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
  englishTitle,
  romajiTitle,
  synonyms,
}: VideoPlayerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sakura embed resolution states
  const [sakuraEmbedUrl, setSakuraEmbedUrl] = useState<string>("");
  const [sakuraLoading, setSakuraLoading] = useState<boolean>(false);

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
        const cached = getSakuraCache(animeId);
        let details = cached?.details;
        let anipubId = cached?.anipubId;

        if (!details) {
          let resolvedId: number | null = null;

          // STEP 1: Attempt direct match with English Title
          if (englishTitle) {
            try {
              const findUrl = `https://anipub.xyz/api/find/${encodeURIComponent(englishTitle)}`;
              const data = await fetchAniPub(findUrl);
              if (data && data.exist === true && data.id !== undefined) {
                resolvedId = Number(data.id);
              }
            } catch (e) {
              console.warn("AniPub find english failed:", e);
            }
          }

          // STEP 2: Romaji Fallback
          if (resolvedId === null && romajiTitle) {
            try {
              const findUrl = `https://anipub.xyz/api/find/${encodeURIComponent(romajiTitle)}`;
              const data = await fetchAniPub(findUrl);
              if (data && data.exist === true && data.id !== undefined) {
                resolvedId = Number(data.id);
              }
            } catch (e) {
              console.warn("AniPub find romaji failed:", e);
            }
          }

          // STEP 3: Synonym Fallback
          if (resolvedId === null && synonyms && synonyms.length > 0) {
            for (const synonym of synonyms) {
              if (!synonym) continue;
              try {
                const findUrl = `https://anipub.xyz/api/find/${encodeURIComponent(synonym)}`;
                const data = await fetchAniPub(findUrl);
                if (data && data.exist === true && data.id !== undefined) {
                  resolvedId = Number(data.id);
                  break;
                }
              } catch (e) {
                console.warn(`AniPub find synonym '${synonym}' failed:`, e);
              }
            }
          }

          // STEP 4: Search Fallback
          if (resolvedId === null) {
            const queryForSearch = englishTitle || animeTitle || romajiTitle || "";
            if (queryForSearch) {
              try {
                const searchUrl = `https://anipub.xyz/api/search/${encodeURIComponent(queryForSearch)}`;
                const results = await fetchAniPub(searchUrl);
                const list = Array.isArray(results) ? results : (results.data || results.results || []);
                if (list && list.length > 0) {
                  const matched = list[0];
                  const rawId = matched.Id !== undefined ? matched.Id : matched.id;
                  if (rawId !== undefined) {
                    resolvedId = Number(rawId);
                  }
                }
              } catch (e) {
                console.warn("AniPub search fallback failed:", e);
              }
            }
          }

          if (resolvedId === null) {
            throw new Error("Unable to resolve AniPub ID across all find and search strategies.");
          }

          anipubId = resolvedId;

          // STEP 5: FETCH EPISODE DATA
          const detailsUrl = `https://anipub.xyz/v1/api/details/${anipubId}`;
          const detailsData = await fetchAniPub(detailsUrl);
          
          if (!detailsData || !detailsData.local) {
            throw new Error(`AniPub payload has missing local properties: ${JSON.stringify(detailsData)}`);
          }

          details = detailsData;

          // Save to cache
          setSakuraCache(animeId, {
            anipubId: anipubId!,
            details: detailsData
          });
        }

        // STEP 6: EPISODE MAPPING
        const local = details.local;
        let rawLink = "";
        if (episodeNumber === 1) {
          rawLink = local.link || "";
        } else {
          const epArray = local.ep || [];
          const index = episodeNumber - 2;
          if (epArray[index] && epArray[index].link) {
            rawLink = epArray[index].link;
          } else {
            throw new Error(`Episode index ${index} out of bounds or lacks a playable link for episode ${episodeNumber}.`);
          }
        }

        if (!rawLink) {
          throw new Error(`No link returned for episode ${episodeNumber}`);
        }

        // STEP 7: SANITIZE URL
        const cleanedUrl = extractSrc(rawLink);
        if (!cleanedUrl) {
          throw new Error("Sanitization produced empty URL");
        }

        if (active) {
          setSakuraEmbedUrl(cleanedUrl);
          setSakuraLoading(false);
          setIframeLoading(false);
        }

      } catch (err: any) {
        console.error("Sakura Stream pipeline failed. Executing silent failover...", err);
        if (active) {
          setSakuraLoading(false);
          if (onProviderChange) {
            onProviderChange("cinesrc"); // Failover gracefully to Taberu (cinesrc)
          }
        }
      }
    }

    resolveSakura();

    return () => {
      active = false;
    };
  }, [selectedProvider, animeId, episodeNumber, animeTitle, englishTitle, romajiTitle, synonyms, onProviderChange]);

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
            allow="autoplay; fullscreen; picture-in-picture"
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
