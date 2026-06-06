/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AniListAnime } from "../types";
import { formatAiringStatus } from "../services/anilist";
import { Star, Play, Tv } from "lucide-react";
import React, { useState } from "react";
import LazyImage from "./LazyImage";

interface AnimeCardProps {
  anime: AniListAnime;
  onClick: () => void;
  layout?: "grid" | "list" | "sidebar";
  index?: number;
}

export default function AnimeCard({ anime, onClick, layout = "grid", index = 0 }: AnimeCardProps) {
  const [isCardReady, setIsCardReady] = useState(false);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only apply on devices with hover capability
    if (window.matchMedia("(hover: none)").matches) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Max 2 degrees rotation
    const rotateX = ((centerY - y) / centerY) * 2;
    const rotateY = ((x - centerX) / centerX) * 2;
    
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const romaji = anime.title.romaji || "";
  const english = anime.title.english || "";
  const mainTitle = english || romaji || anime.title.userPreferred || "Untitled Anime";
  
  // Choose the best thumbnail. Banner image has custom 16:9 feel, but cover image is often higher quality.
  // For Youtube visual, 16:9 ratio is critical, so we use bannerImage if available, fallback to coverImage.
  const thumbnail = anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large || "";
  const avatar = anime.coverImage.medium || anime.coverImage.large || "";

  // Dynamic status/season detail
  const episodesCount = anime.episodes ? `${anime.episodes} eps` : "Ongoing";
  const studioName = anime.studios?.nodes?.[0]?.name || anime.format || "Anime Studio";
  const averageScore = anime.averageScore ? `★ ${anime.averageScore / 10}` : "★ 7.5";

  // Layout specific classes
  if (layout === "list") {
    // Search result list layout: Ultra-Clean Streaming Platform Row
    return (
      <div
        onClick={onClick}
        className="flex flex-col sm:flex-row gap-5 md:gap-6 py-4 px-2 sm:px-4 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-colors duration-200 group max-w-4xl"
      >
        {/* Large Thumbnail left */}
        <div className="relative w-full sm:w-[260px] md:w-[300px] aspect-video flex-shrink-0 bg-white/[0.02] rounded-lg overflow-hidden border border-white/[0.04]">
          <LazyImage
            src={thumbnail}
            alt={mainTitle}
            className="w-full h-full object-cover transition-transform duration-500 ease-out sm:group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
            onLoadComplete={() => setIsCardReady(true)}
          />
          {/* Action indicator on hover */}
          {isCardReady && (
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
              <div className="p-3 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
                <Play className="w-5 h-5 fill-white stroke-none" />
              </div>
            </div>
          )}
          {isCardReady && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded tracking-wide">
              {episodesCount}
            </span>
          )}
        </div>

        {/* Content right */}
        <div className="flex-1 flex flex-col pt-1 min-w-0 justify-start relative">
          <div className={`absolute top-1 left-0 right-0 space-y-4 animate-pulse pointer-events-none transition-opacity duration-300 ease-out ${isCardReady ? "opacity-0" : "opacity-100"}`}>
            <div className="h-5 bg-white/[0.06] rounded-md w-3/4" />
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-3.5 bg-white/[0.04] rounded w-24" />
              <div className="h-3.5 bg-white/[0.04] rounded w-16" />
            </div>
            <div className="space-y-2 pt-1.5">
              <div className="h-3 bg-white/[0.02] rounded w-full" />
              <div className="h-3 bg-white/[0.02] rounded w-11/12" />
            </div>
          </div>
          
          <div className={`flex flex-col min-w-0 transition-opacity duration-300 ease-out ${isCardReady ? "opacity-100" : "opacity-0"}`}>
            <h3 className="text-white text-base md:text-xl font-bold leading-tight group-hover:text-white transition-colors truncate font-sans">
              {mainTitle}
            </h3>
            
            <div className="flex flex-wrap items-center text-xs text-gray-400 gap-2 mt-2 font-medium">
              <span className="text-white/60">{studioName}</span>
              <span className="opacity-40">&bull;</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                {formatAiringStatus(anime.status)}
              </span>
              {anime.averageScore && (
                <>
                  <span className="opacity-40">&bull;</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-white/60 stroke-none" />
                    {(anime.averageScore / 10).toFixed(1)}
                  </span>
                </>
              )}
            </div>

            <p className="text-sm text-gray-400 mt-3 line-clamp-2 md:line-clamp-3 leading-relaxed font-normal"
               dangerouslySetInnerHTML={{ __html: anime.description || "No description available for this anime series." }}>
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {anime.genres?.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="text-[11px] text-gray-400 font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
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
            onLoadComplete={() => setIsCardReady(true)}
          />
          {isCardReady && (
            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 text-white text-[9px] font-bold rounded">
              {episodesCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center relative">
          <div className={`absolute inset-0 flex flex-col justify-center space-y-2 animate-pulse pointer-events-none transition-opacity duration-300 ease-out z-10 ${isCardReady ? "opacity-0" : "opacity-100"}`}>
            <div className="h-3.5 bg-white/[0.06] rounded w-11/12" />
            <div className="h-2.5 bg-white/[0.04] rounded w-2/3" />
          </div>
          
          <div className={`flex flex-col justify-center min-w-0 transition-opacity duration-300 ease-out ${isCardReady ? "opacity-100" : "opacity-0"}`}>
            <h4 className="text-white text-xs sm:text-sm font-bold leading-snug tracking-tight group-hover:text-[#ff6b35] transition-colors line-clamp-2 font-sans">
              {mainTitle}
            </h4>
            <span className="text-[10px] text-[#aaa] truncate mt-1 block font-medium">
              {studioName}
            </span>
            <span className="text-[9px] text-[#777] truncate block mt-0.5 font-mono">
              {anime.seasonYear || "TBA"}
            </span>
          </div>
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex flex-col cursor-pointer transition-all duration-300 ease-out sm:hover:-translate-y-[4px] active:scale-[0.97] group-hover/row:opacity-[0.85] sm:hover:!opacity-100 animate-fade-in`}
      style={{ 
        width: "200px", 
        animationDelay: `${index * 50}ms`, 
        animationFillMode: "both",
      }}
    >
      {/* SKELETON OVERLAY */}
      <div className={`absolute inset-0 z-50 flex flex-col pointer-events-none transition-opacity duration-300 ease-out ${isCardReady ? "opacity-0" : "opacity-100"} transform-gpu`}>
        <div className="relative w-[200px] flex-shrink-0 aspect-[2/3] rounded-[20px] shimmer-bone border border-white/[0.04] shadow-sm transform-gpu" style={{ transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` }} />
        <div className="mt-3.5 flex flex-col gap-1.5 z-0 px-1">
          <div className="space-y-2">
            <div className="h-4 bg-white/[0.06] rounded w-11/12" />
            <div className="h-3 bg-white/[0.03] rounded w-2/3" />
          </div>
        </div>
      </div>

      {/* ACTUAL CARD CONTENT */}
      <div className={`flex flex-col transition-opacity duration-300 ease-out ${isCardReady ? "opacity-100" : "opacity-0"}`}>
        {/* 2:3 Poster Container with Dark Liquid Glass */}
        <div 
          className="relative w-[200px] aspect-[2/3] rounded-[20px] overflow-hidden bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] shadow-lg sm:group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.8)] sm:group-hover:border-white/[0.2] transition-transform duration-100 ease-out z-10 isolate group/wrapper transform-gpu"
          style={{ transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)` }}
        >
          {/* Note: LazyImage's internal fade is fine; it will trigger onLoadComplete, fading in this wrapper */}
          <LazyImage
            src={poster}
            alt={mainTitle}
            className="w-full h-full object-cover transform sm:group-hover:scale-[1.04] transition-transform duration-300 ease-out"
            referrerPolicy="no-referrer"
            onLoadComplete={() => setIsCardReady(true)}
          />
          
          {/* Rating Badge (Floating Glass Pill) */}
          {anime.averageScore && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-md transition-transform duration-300 sm:group-hover:scale-[1.08] ease-out">
              <Star className="w-3.5 h-3.5 fill-[#ff6b35] stroke-none drop-shadow-md" />
              <span className="text-white text-xs font-bold tracking-tight">
                {(anime.averageScore / 10).toFixed(1)}
              </span>
            </div>
          )}

          {/* Watch Now Button (Glass Pill, visible on hover) */}
          <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.08] backdrop-blur-lg border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] transform scale-95 sm:group-hover:scale-100 transition-transform duration-300 ease-out">
              <Play className="w-4 h-4 text-white fill-white drop-shadow-lg" />
              <span className="text-white text-sm font-bold tracking-wide drop-shadow-md lg:block hidden">Watch Now</span>
            </div>
          </div>
          
          {/* Edge Glow / Soft Inner Highlight */}
          <div className="absolute inset-0 rounded-[20px] border border-white/[0.06] pointer-events-none group-hover:border-white/[0.15] transition-colors duration-300" />
          <div className="absolute inset-0 rounded-[20px] shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] pointer-events-none" />
        </div>

        {/* Info Section */}
        <div className="mt-3.5 flex flex-col gap-1.5 z-0 transition-transform duration-300 ease-out">
          <div className="flex flex-col gap-1.5 font-sans">
            <h3 className="text-[#f1f1f1] text-[15px] font-bold leading-snug tracking-tight line-clamp-2 group-hover:text-white transition-colors duration-300">
              {mainTitle}
            </h3>
            
            <div className="flex items-center text-[11px] sm:text-[12px] text-[#999] font-medium gap-2 mt-0.5 opacity-80 sm:group-hover:opacity-100 transform sm:group-hover:-translate-y-[4px] transition-all duration-300 ease-out">
              <span>{year}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="uppercase tracking-wider">{format}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{episodesCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
