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
}

/**
 * A wrapper component that handles the tiered loading of episode thumbnails.
 * Follows the priority: TVDB -> TMDB -> Anivexa -> AniList Fallback
 */
export default function EpisodeThumbnailItem({
  animeId,
  season,
  episode,
  fallbackImages,
  alt,
  className,
  animeTitle
}: EpisodeThumbnailItemProps) {
  const [thumbnailSrc, setThumbnailSrc] = useState<string>("");

  useEffect(() => {
    let active = true;
    async function load() {
      // Check cache is built-in to service
      const src = await getEpisodeThumbnail({
        animeId,
        season,
        episode,
        fallbackImages,
        animeTitle
      });
      if (active && src) {
        setThumbnailSrc(src);
      }
    }
    load();
    return () => { active = false; };
  }, [animeId, season, episode, fallbackImages, animeTitle]);

  return (
    <LazyImage
      src={thumbnailSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
