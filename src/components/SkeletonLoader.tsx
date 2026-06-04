/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface SkeletonLoaderProps {
  type?: "grid" | "list" | "channel" | "watch" | "shelf" | "sidebar";
}

export default function SkeletonLoader({ type = "grid" }: SkeletonLoaderProps) {
  // 1. HORIZONTAL CAROUSEL SHELF SKELETON (Used in Home Trending shelf & DiscoveryShelf rows)
  if (type === "shelf") {
    return (
      <div className="flex flex-col gap-4 relative w-full overflow-hidden select-none mb-8">
        {/* Shelf header shimmer */}
        <div className="px-4 md:px-6 flex flex-col gap-1.5">
          <div className="h-6 shimmer-bone rounded-md w-48" />
          <div className="h-3.5 shimmer-bone rounded-md w-32" />
        </div>

        {/* Scrolling items row matches AnimeCard 200px dimensions perfectly */}
        <div className="flex overflow-x-auto gap-5 px-4 md:px-6 pb-6 pt-2" style={{ scrollbarWidth: "none" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[200px] flex flex-col">
              <div className="relative w-[200px] aspect-[2/3] rounded-[20px] shimmer-bone border border-white/[0.04] shadow-sm flex-shrink-0" />
              <div className="mt-3.5 space-y-2">
                <div className="h-3.5 shimmer-bone rounded w-11/12" />
                <div className="h-3 shimmer-bone rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. PORTRAIT GRID SKELETON (Used for Categories, Search initial loads, or library grids)
  if (type === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 px-4 md:px-6 w-full select-none">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex flex-col">
            <div className="relative aspect-[2/3] w-full rounded-[20px] shimmer-bone border border-white/[0.04] shadow-sm" />
            <div className="mt-3.5 space-y-2">
              <div className="h-3.5 shimmer-bone rounded w-11/12" />
              <div className="h-3 shimmer-bone rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 3. SEARCH RESULTS LIST SKELETON (Used in search result lists)
  if (type === "list") {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4 flex flex-col gap-2 select-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row gap-5 md:gap-6 py-4 px-2 sm:px-4 rounded-xl"
          >
            {/* Left Thumbnail Aspect Video matches AnimeCard list scale */}
            <div className="w-full sm:w-[260px] md:w-[300px] aspect-video shimmer-bone rounded-lg flex-shrink-0 border border-white/[0.02]" />
            
            {/* Right details placeholders */}
            <div className="flex-1 flex flex-col pt-1 space-y-4 min-w-0 justify-start">
              <div className="h-5 shimmer-bone rounded-md w-3/4" />
              <div className="flex items-center gap-2 pt-0.5">
                <div className="h-3.5 shimmer-bone rounded w-24" />
                <div className="h-3.5 shimmer-bone rounded w-16" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 shimmer-bone rounded w-full" />
                <div className="h-3 shimmer-bone rounded w-11/12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 4. WATCH SIDEBAR RECOMMENDED LIST SKELETON (Used on watch lists sideload)
  if (type === "sidebar") {
    return (
      <div className="space-y-4 select-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 bg-[#0d0d11]/30 p-2.5 rounded-xl border border-transparent">
            {/* Thumbnail aspect video match */}
            <div className="w-36 h-20 shimmer-bone rounded-xl flex-shrink-0 border border-white/[0.05]" />
            {/* Content metadata */}
            <div className="flex-1 space-y-2 py-0.5 min-w-0 flex flex-col justify-center">
              <div className="h-3.5 shimmer-bone rounded w-5/6" />
              <div className="h-2.5 shimmer-bone rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 5. CHANNEL LAYOUT SKELETON (Used on premium channel page details fetch)
  if (type === "channel") {
    return (
      <div className="w-full select-none bg-transparent">
        {/* Banner shimmer - matches banner aspect/heights */}
        <div className="w-full h-40 sm:h-56 md:h-64 shimmer-bone relative border-b border-white/[0.05]" />
        
        {/* Channel details header */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-5 items-start mt-[-24px] relative z-10">
          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full shimmer-bone ring-4 ring-[#09090b] flex-shrink-0" />
          <div className="flex-1 space-y-3 pt-4">
            <div className="h-7 shimmer-bone rounded-md w-1/3" />
            <div className="h-4 shimmer-bone rounded-md w-1/4" />
            <div className="h-3.5 shimmer-bone rounded w-1/2" />
          </div>
          <div className="w-28 h-9 shimmer-bone rounded-full mt-4 self-end md:self-center" />
        </div>

        {/* Tab system shimmer */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 border-b border-white/[0.05] flex gap-8 py-3">
          <div className="w-20 h-6 shimmer-bone rounded-md" />
          <div className="w-20 h-6 shimmer-bone rounded-md" />
        </div>

        {/* Body content shimmer - Episode grids */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-2xl space-y-3">
                <div className="aspect-video w-full rounded-xl shimmer-bone" />
                <div className="space-y-2">
                  <div className="h-3.5 shimmer-bone rounded w-5/6" />
                  <div className="h-3 shimmer-bone rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 6. WATCH VIEWPORT MULTI-PANEL SKELETON (Used on video watch loads)
  if (type === "watch") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 select-none bg-transparent">
        {/* Left player column */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="w-full aspect-video shimmer-bone rounded-2xl border border-white/[0.05]" />
          <div className="space-y-1.5 mt-2">
            <div className="h-3.5 shimmer-bone rounded-md w-[200px]" />
            <div className="h-6 shimmer-bone rounded-md w-11/12" />
          </div>
          {/* Controls / Subscribe area */}
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-5 pt-1.5">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-full shimmer-bone" />
              <div className="space-y-1.5">
                <div className="h-3.5 shimmer-bone rounded w-24" />
                <div className="h-2.5 shimmer-bone rounded w-16" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 shimmer-bone rounded-full w-20" />
              <div className="h-9 shimmer-bone rounded-full w-24" />
            </div>
          </div>
          {/* Below fields - Description mock */}
          <div className="bg-white/[0.02] rounded-xl p-4 space-y-2.5 border border-white/[0.03]">
            <div className="h-3.5 shimmer-bone rounded w-1/4" />
            <div className="h-3 shimmer-bone rounded w-11/12" />
            <div className="h-3 shimmer-bone rounded w-5/6" />
          </div>
        </div>

        {/* Right sidebar column - Episode selection grid */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="h-5 shimmer-bone rounded w-1/3 mb-2" />
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 gap-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-square shimmer-bone rounded-lg flex items-center justify-center border border-white/[0.05]" />
            ))}
          </div>

          <div className="h-5 shimmer-bone rounded w-1/2 mt-4 mb-2" />
          {/* Recommended list skeletons */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3 bg-[#0d0d11]/20 p-2 rounded-xl border border-white/[0.02]">
              <div className="w-24 aspect-video shimmer-bone rounded-lg" />
              <div className="flex-1 space-y-2 flex flex-col justify-center">
                <div className="h-3 shimmer-bone rounded w-5/6" />
                <div className="h-2 shimmer-bone rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
