/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";
import { formatAiringStatus, formatViews } from "../services/anilist";
import { Star, Play, Tv } from "lucide-react";

interface AnimeCardProps {
  anime: AniListAnime;
  onClick: () => void;
  layout?: "grid" | "list" | "sidebar";
  key?: any;
}

export default function AnimeCard({ anime, onClick, layout = "grid" }: AnimeCardProps) {
  const romaji = anime.title.romaji || "";
  const english = anime.title.english || "";
  const mainTitle = english || romaji || anime.title.userPreferred || "Untitled Anime";
  
  // Choose the best thumbnail. Banner image has custom 16:9 feel, but cover image is often higher quality.
  // For Youtube visual, 16:9 ratio is critical, so we use bannerImage if available, fallback to coverImage.
  const thumbnail = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large || "";
  const avatar = anime.coverImage.medium || anime.coverImage.large || "";

  // Dynamic status/season detail
  const episodesCount = anime.episodes ? `${anime.episodes} eps` : "Ongoing";
  const studioName = anime.studios?.nodes?.[0]?.name || "Independent Studio";
  const averageScore = anime.averageScore ? `★ ${anime.averageScore / 10}` : "★ 7.5";

  // Layout specific classes
  if (layout === "list") {
    // Search result list layout
    return (
      <div
        onClick={onClick}
        className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all duration-300 group max-w-4xl backdrop-blur-md"
      >
        {/* Large Thumbnail left */}
        <div className="relative w-full sm:w-[280px] md:w-[320px] aspect-video flex-shrink-0 bg-black/40 rounded-xl overflow-hidden shadow-md border border-white/5">
          <img
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          {/* Action indicator on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
            <div className="p-3 bg-[#ff6b35] rounded-full text-white shadow-lg shadow-[#ff6b35]/20 transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="w-5 h-5 fill-white stroke-none" />
            </div>
          </div>
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[11px] font-medium rounded tracking-wide">
            {episodesCount}
          </span>
          {averageScore && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 text-[#ff6b35] text-[11px] font-bold rounded flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-[#ff6b35] stroke-none" />
              <span>{(anime.averageScore || 75) / 10}</span>
            </span>
          )}
        </div>

        {/* Content right */}
        <div className="flex-1 flex flex-col pt-1.5 min-w-0">
          <h3 className="text-white text-md sm:text-lg font-semibold leading-snug group-hover:text-[#ff6b35] transition-colors truncate font-sans">
            {mainTitle}
          </h3>
          
          <div className="flex flex-wrap items-center text-xs text-[#aaa] gap-1.5 mt-1">
            <span className="hover:text-white transition-colors">{studioName}</span>
            <span>•</span>
            <span>{formatViews(anime.popularity)}</span>
            <span>•</span>
            <span>{formatAiringStatus(anime.status)}</span>
          </div>

          <p className="text-xs text-[#aaa] mt-3 line-clamp-2 md:line-clamp-3 leading-relaxed font-sans font-normal"
             dangerouslySetInnerHTML={{ __html: anime.description || "No description available for this anime series." }}>
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {anime.genres?.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.08] text-[10px] text-gray-400 font-medium rounded-full"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (layout === "sidebar") {
    // Watch Page suggestions sidebar layout
    return (
      <div
        onClick={onClick}
        className="flex gap-3 bg-white/[0.01] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] p-2.5 rounded-xl cursor-pointer transition-all duration-200 group backdrop-blur-sm"
      >
        <div className="relative w-36 h-20 flex-shrink-0 bg-black/40 rounded-lg overflow-hidden lg:h-20 border border-white/5">
          <img
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <span className="absolute bottom-1 right-1 px-1 bg-black/80 text-white text-[10px] font-medium rounded">
            {episodesCount}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-white text-xs sm:text-sm font-semibold leading-snug tracking-tight group-hover:text-[#ff6b35] transition-colors line-clamp-2 font-sans">
            {mainTitle}
          </h4>
          <span className="text-[11px] text-[#aaa] truncate mt-1 block">
            {studioName}
          </span>
          <span className="text-[10px] text-[#888] truncate block">
            {formatViews(anime.popularity)} • {anime.seasonYear || "TBA"}
          </span>
        </div>
      </div>
    );
  }

  // Standard HOMEPAGE Grid Layout (exact YouTube proportions)
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3.5 group cursor-pointer transition-all duration-300 select-none p-3.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] rounded-2xl overflow-hidden outline-none focus-within:ring-2 focus-within:ring-[#ff6b35] backdrop-blur-md shadow-lg"
    >
      {/* 16:9 Aspect ratio video card container */}
      <div className="relative aspect-video w-full bg-black/40 rounded-xl overflow-hidden shadow-inner border border-white/[0.06]">
        <img
          src={thumbnail}
          alt={mainTitle}
          className="w-full h-full object-cover group-hover:scale-[1.03] duration-300 ease-out transition-transform"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {/* Play Icon trigger overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          <div className="p-2.5 bg-[#ff6b35] rounded-full text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-4.5 h-4.5 fill-white stroke-none" />
          </div>
        </div>
        
        {/* Dynamic Duration equivalent & average score badge */}
        <span className="absolute bottom-2.5 right-2.5 px-1.5 py-0.5 bg-black/85 text-white text-[11px] font-semibold rounded tracking-wide leading-none select-none">
          {episodesCount}
        </span>

        {anime.averageScore && (
          <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 bg-black/80 text-[#ff6b35] text-[11px] font-bold rounded flex items-center gap-1 select-none leading-none">
            <Star className="w-3 h-3 fill-[#ff6b35] stroke-none" />
            <span>{(anime.averageScore / 10).toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* Row details with avatar & text column */}
      <div className="flex gap-3 px-1">
        {/* Circle avatar of the anime series channel */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full ring-1 ring-white/10 overflow-hidden bg-white/[0.06] hover:scale-105 transition-transform shadow-inner">
            <img
              src={avatar}
              alt={mainTitle}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex-1 min-w-0 flex flex-col justify-start">
          <h3 className="text-[#f1f1f1] text-[14px] leading-tight font-semibold tracking-tight line-clamp-2 font-sans group-hover:text-[#ff6b35] transition-colors">
            {mainTitle}
          </h3>
          
          <div className="text-xs text-[#aaa] mt-1 space-y-0.5 leading-snug">
            {/* Displaying studio as Channel name */}
            <span className="hover:text-white transition-colors block truncate font-medium">
              {studioName}
            </span>
            <div className="flex items-center text-[11px] text-[#888] gap-1 truncate font-normal">
              <span>{formatViews(anime.popularity)}</span>
              <span>•</span>
              <span>{anime.seasonYear || "TBA"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
