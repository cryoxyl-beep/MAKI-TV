import React, { useState, useEffect } from "react";
import LazyImage from "../LazyImage";
import { getSeriesEpisodeThumbnail } from "../../services/thumbnails";

interface SeriesEpisodeImageProps {
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  stillPath: string | null;
  seasonPosterPath: string | null;
  seriesBackdropPath: string | null;
  alt: string;
  className?: string;
}

export function SeriesEpisodeImage({
  tmdbId,
  seasonNumber,
  episodeNumber,
  stillPath,
  seasonPosterPath,
  seriesBackdropPath,
  alt,
  className = "",
}: SeriesEpisodeImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadThumbnail() {
      const url = await getSeriesEpisodeThumbnail({
        tmdbId,
        seasonNumber,
        episodeNumber,
        stillPath,
        seasonPosterPath,
        seriesBackdropPath,
      });

      if (isMounted) {
        setResolvedUrl(url);
      }
    }

    loadThumbnail();

    return () => {
      isMounted = false;
    };
  }, [tmdbId, seasonNumber, episodeNumber, stillPath, seasonPosterPath, seriesBackdropPath]);

  if (!resolvedUrl) {
    return <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center text-[10px] text-white/20">No Image</div>;
  }

  return (
    <LazyImage
      src={resolvedUrl}
      alt={alt}
      className={className}
    />
  );
}
