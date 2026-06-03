/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";
import { formatAiringStatus, formatViews } from "../services/anilist";
import { Star, Play, Tv } from "lucide-react";
import { useState } from "react";
import LazyImage from "./LazyImage";

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
  const channelHandle = mainTitle.split(" ")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "anime";
  const averageScore = anime.averageScore ? `★ ${anime.averageScore / 10}` : "★ 7.5";

  // Layout specific classes
  if (layout === "list") {
    // Search result list layout: Premium Dark Card
    return (
      <div
        onClick={onClick}
        className="flex flex-col sm:flex-row gap-5 p-4.5 rounded-2xl bg-[#0d0d11] hover:bg-[#15151c] border border-white/[0.04] hover:border-[#ff6b35]/30 cursor-pointer transition-all duration-300 group max-w-4xl shadow-md hover:shadow-xl hover:scale-[1.005]"
      >
        {/* Large Thumbnail left */}
        <div className="relative w-full sm:w-[280px] md:w-[320px] aspect-video flex-shrink-0 bg-black/40 rounded-xl overflow-hidden border border-white/[0.05] shadow-inner">
          <LazyImage
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
          {/* Action indicator on hover */}
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <div className="p-3 bg-[#ff6b35] rounded-full text-white shadow-xl shadow-[#ff6b35]/25 transform scale-90 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 fill-white stroke-none" />
            </div>
          </div>
          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/80 text-white text-[10px] font-semibold rounded-md tracking-wider uppercase">
            {episodesCount}
          </span>
          {averageScore && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/80 text-[#ff6b35] text-[10px] font-bold rounded-md flex items-center gap-1.5 shadow-sm">
              <Star className="w-3 h-3 fill-[#ff6b35] stroke-none" />
              <span>{(anime.averageScore || 75) / 10}</span>
            </span>
          )}
        </div>

        {/* Content right */}
        <div className="flex-1 flex flex-col pt-1 min-w-0">
          <h3 className="text-white text-base sm:text-lg font-bold leading-snug group-hover:text-[#ff6b35] transition-colors truncate font-sans">
            {mainTitle}
          </h3>
          
          <div className="flex flex-wrap items-center text-xs text-[#aaa] gap-1.5 mt-1.5">
            <span className="hover:text-white transition-colors">@{channelHandle}</span>
            <span className="opacity-40">•</span>
            <span>{formatViews(anime.popularity)}</span>
            <span className="opacity-40">•</span>
            <span className="text-[10px] uppercase font-bold text-gray-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.05]">
              {formatAiringStatus(anime.status)}
            </span>
          </div>

          <p className="text-xs text-[#aaa] mt-3.5 line-clamp-2 md:line-clamp-3 leading-relaxed font-sans font-normal"
             dangerouslySetInnerHTML={{ __html: anime.description || "No description available for this anime series." }}>
          </p>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {anime.genres?.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.05] text-[10px] text-gray-400 font-medium rounded-full hover:bg-[#ff6b35]/10 hover:text-white transition-colors"
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
        className="flex gap-3 bg-[#0d0d11]/50 hover:bg-[#15151c] border border-transparent hover:border-white/[0.05] p-2.5 rounded-xl cursor-pointer transition-all duration-300 group hover:shadow-lg"
      >
        <div className="relative w-36 h-20 flex-shrink-0 bg-black/40 rounded-xl overflow-hidden lg:h-20 border border-white/[0.05]">
          <LazyImage
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
          />
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded">
            {episodesCount}
          </span>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-white text-xs sm:text-sm font-bold leading-snug tracking-tight group-hover:text-[#ff6b35] transition-colors line-clamp-2 font-sans">
            {mainTitle}
          </h4>
          <span className="text-[10px] text-[#aaa] truncate mt-1 block font-medium">
            @{channelHandle}
          </span>
          <span className="text-[9px] text-[#777] truncate block mt-0.5 font-mono">
            {formatViews(anime.popularity)} • {anime.seasonYear || "TBA"}
          </span>
        </div>
      </div>
    );
  }

  // Standard HOMEPAGE Premium Portrait Card Layout
  const poster = anime.coverImage.extraLarge || anime.coverImage.large || anime.bannerImage || "";
  const year = anime.seasonYear || "TBA";
  const format = anime.format || "TV";

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-all duration-250 ease-out sm:hover:-translate-y-[6px]"
      style={{ width: "200px" }}
    >
      {/* 2:3 Poster Container with Dark Liquid Glass */}
      <div className="relative w-[200px] aspect-[2/3] rounded-[20px] overflow-hidden bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-lg sm:group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.8)] sm:group-hover:border-white/[0.2] transition-all duration-250 ease-out z-10 isolate">
        <LazyImage
          src={poster}
          alt={mainTitle}
          className="w-full h-full object-cover transform sm:group-hover:scale-[1.03] transition-transform duration-250 ease-out"
          referrerPolicy="no-referrer"
        />
        
        {/* Rating Badge (Floating Glass Pill) */}
        {anime.averageScore && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-md">
            <Star className="w-3.5 h-3.5 fill-[#ff6b35] stroke-none drop-shadow-md" />
            <span className="text-white text-xs font-bold tracking-tight">
              {(anime.averageScore / 10).toFixed(1)}
            </span>
          </div>
        )}

        {/* Watch Now Button (Glass Pill, visible on hover) */}
        <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity duration-250 bg-black/40 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] backdrop-blur-lg border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] transform translate-y-4 sm:group-hover:translate-y-0 transition-transform duration-250 ease-out">
            <Play className="w-4 h-4 text-white fill-white drop-shadow-lg" />
            <span className="text-white text-sm font-bold tracking-wide drop-shadow-md lg:block hidden">Watch Now</span>
          </div>
        </div>
        
        {/* Edge Glow / Soft Inner Highlight */}
        <div className="absolute inset-0 rounded-[20px] border border-white/[0.06] pointer-events-none group-hover:border-white/[0.15] transition-colors duration-250" />
        <div className="absolute inset-0 rounded-[20px] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] pointer-events-none" />
      </div>

      {/* Info Section */}
      <div className="mt-3.5 flex flex-col gap-1.5 z-0">
        <h3 className="text-[#f1f1f1] text-[15px] font-bold leading-snug tracking-tight line-clamp-2 font-sans group-hover:text-white transition-colors">
          {mainTitle}
        </h3>
        
        <div className="flex items-center text-[11px] sm:text-[12px] text-[#999] font-medium gap-2 mt-0.5">
          <span>{year}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="uppercase tracking-wider">{format}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>{episodesCount}</span>
        </div>
      </div>
    </div>
  );
}
