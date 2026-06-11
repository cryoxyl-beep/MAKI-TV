/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { getEpisodeThumbnail } from "../services/thumbnails";
import LazyImage from "./LazyImage";

interface EpisodeThumbnailItemProps {
  animeId: number;
  season: number;
  episode: number;
  fallbackImages: string[];
  alt: string;
  className?: string;
  animeTitle?: string;
  tvdbThumbnailMap?: Record<string, string>;
}

/**
 * A wrapper component that handles the tiered loading of episode thumbnails.
 * Follows the priority: TVDB (from pre-fetched map) -> TMDB -> Anivexa -> AniList Fallback
 */
export default function EpisodeThumbnailItem({
  animeId,
  season,
  episode,
  fallbackImages,
  alt,
  className,
  animeTitle,
  tvdbThumbnailMap
}: EpisodeThumbnailItemProps) {
  const [thumbnailSrc, setThumbnailSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    async function load() {
      // Check if it's already in the parent-provided TVDB map
      if (tvdbThumbnailMap) {
        const tvdbUrl = tvdbThumbnailMap[`${season}_${episode}`];
        if (tvdbUrl) {
          setThumbnailSrc(tvdbUrl);
          return;
        }
      }

      // Fallback to sequential resolver (caches internally)
      const src = await getEpisodeThumbnail({
        animeId,
        season,
        episode,
        fallbackImages,
        animeTitle,
        tvdbThumbnailMap
      });
      if (active && src) {
        setThumbnailSrc(src);
      }
    }
    load();
    return () => { active = false; };
  }, [animeId, season, episode, fallbackImages, animeTitle, tvdbThumbnailMap]);

  return (
    <LazyImage
      src={thumbnailSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
