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
          <img
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
            loading="lazy"
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
          <img
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
            referrerPolicy="no-referrer"
            loading="lazy"
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

  // Standard HOMEPAGE Grid Layout: Premium Dark Card
  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-3.5 group cursor-pointer transition-all duration-300 select-none p-3.5 bg-[#0d0d11]/80 hover:bg-[#15151c] border border-white/[0.04] hover:border-[#ff6b35]/30 rounded-2xl overflow-hidden shadow-md hover:shadow-xl outline-none focus-within:ring-2 focus-within:ring-[#ff6b35]/50 relative hover:scale-[1.005]"
    >
      {/* 16:9 Aspect ratio video card container */}
      <div className="relative aspect-video w-full bg-black/40 rounded-2xl overflow-hidden border border-white/[0.04]">
        <img
          src={thumbnail}
          alt={mainTitle}
          className="w-full h-full object-cover group-hover:scale-[1.03] duration-500 ease-out transition-transform"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        {/* Play Icon trigger overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-350">
          <div className="p-2.5 bg-[#ff6b35] rounded-full text-white shadow-xl shadow-[#ff6b35]/30 transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-4.5 h-4.5 fill-white stroke-none" />
          </div>
        </div>
        
        {/* Dynamic Duration equivalent & average score badge */}
        <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/85 text-white text-[10px] font-semibold rounded-md tracking-wider uppercase select-none">
          {episodesCount}
        </span>

        {anime.averageScore && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/80 text-[#ff6b35] text-[10px] font-bold rounded-md flex items-center gap-1.5 select-none leading-none shadow">
            <Star className="w-3 h-3 fill-[#ff6b35] stroke-none" />
            <span>{(anime.averageScore / 10).toFixed(1)}</span>
          </span>
        )}
      </div>

      {/* Row details with avatar & text column */}
      <div className="flex gap-3 px-1">
        {/* Circle avatar of the anime series channel */}
        <div className="flex-shrink-0">
          <div className="w-9 h-9 rounded-full ring-1 ring-white/10 overflow-hidden bg-white/[0.05] hover:scale-105 transition-all duration-300 shadow-inner">
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
          <h3 className="text-[#f1f1f1] text-[14px] leading-tight font-bold tracking-tight line-clamp-2 font-sans group-hover:text-[#ff6b35] transition-colors">
            {mainTitle}
          </h3>
          
          <div className="text-xs text-[#aaa] mt-1.5 space-y-0.5 leading-snug">
            {/* Displaying studio as Channel name */}
            <span className="hover:text-white transition-colors block truncate font-medium">
              @{channelHandle}
            </span>
            <div className="flex items-center text-[10px] text-[#888] gap-1 truncate font-mono">
              <span>{formatViews(anime.popularity)}</span>
              <span className="opacity-40">•</span>
              <span>{anime.seasonYear || "TBA"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
