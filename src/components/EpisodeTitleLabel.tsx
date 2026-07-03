import { filterReleasedEpisodes } from "../utils/releaseGate";
import { useState, useEffect } from "react";
import { safeSetItem } from "../lib/cacheManager";

// Global in-memory cache to prevent flickering on clean re-renders
const inMemoryTitleCache: Record<string, string> = {};

export function useEpisodeTitle(animeId: number, episodeNumber: number, fallback: string) {
  const cacheMapKey = `${animeId}_${episodeNumber}`;
  const [title, setTitle] = useState(() => {
    return inMemoryTitleCache[cacheMapKey] || fallback;
  });

  useEffect(() => {
    if (inMemoryTitleCache[cacheMapKey]) {
      setTitle(inMemoryTitleCache[cacheMapKey]);
      return;
    }

    let mounted = true;
    
    async function load() {
      // First check cache
      const cacheKey = `jikan_episodes_${animeId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
            const ep = parsed.data.find((e: any) => e.mal_id === episodeNumber);
            if (ep && ep.title) {
              inMemoryTitleCache[cacheMapKey] = ep.title;
              if (mounted) {
                setTitle(ep.title);
              }
            }
            return;
          }
        } catch (e) {}
      }

      // Fetch from Jikan API (with basic 429 backoff)
      try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/episodes`);
        if (!response.ok) {
          if (response.status === 429) {
             return;
          }
          throw new Error("Failed to fetch episodes");
        }
        
        const json = await response.json();
        if (json.data) { json.data = filterReleasedEpisodes(json.data); }
        if (json.data) {
          safeSetItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            data: json.data,
          }));
          
          const ep = json.data.find((e: any) => e.mal_id === episodeNumber);
          if (ep && ep.title) {
            inMemoryTitleCache[cacheMapKey] = ep.title;
            if (mounted) {
              setTitle(ep.title);
            }
          }
        }
      } catch (err) {
        // Silently fail and use fallback
      }
    }
    
    load();
    
    return () => { mounted = false; };
  }, [animeId, episodeNumber, cacheMapKey]);

  return title;
}

export function EpisodeTitleLabel({ animeId, seasonNumber, episodeNumber, asFallback = false }: { animeId: number, seasonNumber: number, episodeNumber: number, asFallback?: boolean }) {
  const title = useEpisodeTitle(animeId, episodeNumber, "");
  
  const formattedDefault = `S${seasonNumber}E${episodeNumber}`;
  
  if (title) {
    return <>{formattedDefault}: {title}</>;
  }
  
  return <>{formattedDefault}</>;
}
