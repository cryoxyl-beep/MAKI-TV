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
      <div className="w-full min-h-screen select-none bg-transparent relative">
        {/* Hero Atmosphere Shimmer */}
        <div className="absolute top-0 left-0 right-0 h-[480px] z-0 overflow-hidden pointer-events-none shimmer-bone opacity-20" />
        
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            
            {/* LEFT COLUMN */}
            <div className="w-full md:w-[220px] lg:w-[260px] flex-shrink-0 flex flex-col gap-6 relative">
              <div className="w-48 sm:w-full mx-auto md:mx-0">
                <div className="aspect-[2/3] rounded-xl shimmer-bone border border-white/[0.1] shadow-2xl" />
                <div className="mt-4 flex flex-col gap-2">
                  <div className="w-full py-2.5 h-[42px] shimmer-bone rounded-lg border border-white/[0.05]" />
                </div>
                <div className="mt-6 flex flex-col gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="h-3 shimmer-bone rounded w-16" />
                      <div className="h-3.5 shimmer-bone rounded w-24" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="h-4 shimmer-bone rounded w-24 mb-4" />
              <div className="h-10 sm:h-12 shimmer-bone rounded w-[300px] sm:w-[500px] lg:w-[600px] mb-6" />
              
              <div className="flex flex-wrap gap-2 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 w-16 flex-shrink-0 shimmer-bone rounded bg-white/[0.06] border border-white/[0.08]" />
                ))}
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-[160px] rounded-full shimmer-bone flex-shrink-0 border border-transparent" />
                <div className="w-12 h-12 rounded-full shimmer-bone flex-shrink-0 border border-white/5" />
              </div>

              <div className="mb-8 max-w-4xl space-y-2">
                <div className="h-4 shimmer-bone rounded w-full" />
                <div className="h-4 shimmer-bone rounded w-11/12" />
                <div className="h-4 shimmer-bone rounded w-10/12" />
                <div className="h-4 shimmer-bone rounded w-[150px] mt-4" />
              </div>

              <div className="flex items-center gap-6 sm:gap-8 border-b border-white/[0.08] mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="pb-3 w-16 sm:w-20">
                    <div className="h-4 shimmer-bone rounded w-full" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 pb-10">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-xl">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden shimmer-bone border border-white/[0.05]" />
                    <div className="px-1 mt-0.5">
                      <div className="h-4 shimmer-bone rounded w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. WATCH VIEWPORT MULTI-PANEL SKELETON (Used on video watch loads)
  if (type === "watch") {
    return (
      <div className="w-full bg-[#0f0f0f] pb-20 pt-14 select-none z-10 relative text-[#f1f1f1] min-h-screen">
        {/* Header Breadcrumbs area shimmer */}
        <div className="h-14 w-full absolute top-0 shimmer-bone opacity-10" />

        {/* MAIN ROW 1: Player & Up Next Side-by-side */}
        <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pt-6 flex flex-col lg:flex-row gap-6 lg:items-stretch">
          {/* Left: Player */}
          <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
            <div className="w-full aspect-video shimmer-bone rounded-none sm:rounded-2xl border border-white/5" />
          </div>
          {/* Right: Up Next Sidebar */}
          <div className="w-full lg:w-[29%] min-w-0 flex flex-col bg-[#121214] border border-white/5 rounded-2xl p-4 min-h-[400px]">
            <div className="flex flex-col pb-3 border-b border-white/[0.05] gap-2">
              <div className="h-4 shimmer-bone rounded w-1/3" />
              <div className="h-3 shimmer-bone rounded w-2/3" />
              <div className="flex gap-2 mt-2">
                <div className="h-[34px] flex-1 shimmer-bone rounded-lg" />
                <div className="h-[34px] w-8 flex-shrink-0 shimmer-bone rounded-lg" />
                <div className="h-[34px] w-8 flex-shrink-0 shimmer-bone rounded-lg" />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="w-[120px] aspect-video shimmer-bone rounded-md flex-shrink-0" />
                  <div className="flex-1 py-1 space-y-3">
                    <div className="h-3.5 w-3/4 shimmer-bone rounded" />
                    <div className="h-3 w-1/2 shimmer-bone rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* MAIN ROW 2: Episode Controls, Info */}
        <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pb-20 flex flex-col lg:flex-row gap-6 items-start mt-6">
          <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
            <div className="flex flex-wrap items-center justify-between mt-1 pb-2 border-b border-white/[0.05] gap-4">
              <div className="flex gap-4">
                <div className="w-[80px] h-[18px] shimmer-bone rounded" />
                <div className="w-[80px] h-[18px] shimmer-bone rounded" />
              </div>
              <div className="w-[150px] h-[18px] shimmer-bone rounded" />
            </div>
            
            <div className="mt-6 flex flex-col gap-3 pb-8 w-full">
              <div className="h-[46px] w-full rounded-lg shimmer-bone" />
              <div className="h-7 w-[250px] shimmer-bone rounded mt-2" />

              <div className="flex flex-col xl:flex-row xl:items-center justify-between py-1 gap-4 mt-2">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full shimmer-bone flex-shrink-0" />
                  <div className="h-5 w-[200px] shimmer-bone rounded" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-9 w-[100px] rounded-full shimmer-bone" />
                  <div className="h-9 w-[140px] rounded-full shimmer-bone" />
                  <div className="h-9 w-[100px] rounded-full shimmer-bone" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
