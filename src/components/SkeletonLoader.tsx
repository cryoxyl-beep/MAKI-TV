/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shimmer loader styles that mirror YouTube's exact proportions with Frosted Glass
export default function SkeletonLoader({ type = "grid" }: { type?: "grid" | "list" | "channel" | "watch" }) {
  if (type === "list") {
    return (
      <div className="flex flex-col gap-4 max-w-4xl px-4 md:px-0">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] animate-pulse">
            <div className="w-full sm:w-[280px] md:w-[320px] aspect-video bg-white/[0.04] rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-3.5 pt-1">
              <div className="h-5 bg-white/[0.04] rounded-md w-2/3" />
              <div className="flex gap-2">
                <div className="h-3.5 bg-white/[0.04] rounded w-1/4" />
                <div className="h-3.5 bg-white/[0.04] rounded w-1/5" />
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-white/[0.04] rounded w-full" />
                <div className="h-3 bg-white/[0.04] rounded w-5/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "channel") {
    return (
      <div className="w-full animate-pulse">
        {/* Banner shimmer */}
        <div className="w-full h-44 sm:h-56 md:h-64 bg-white/[0.02] relative border-b border-white/[0.08]" />
        
        {/* Channel details header */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row gap-5 items-start">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/[0.04] flex-shrink-0 border border-white/[0.08]" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="h-7 bg-white/[0.04] rounded-md w-1/3" />
            <div className="h-4 bg-white/[0.04] rounded-md w-1/4" />
            <div className="h-3.5 bg-white/[0.04] rounded w-1/2" />
          </div>
          <div className="w-28 h-9 bg-white/[0.04] rounded-full mt-2" />
        </div>

        {/* Tab system shimmer */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 border-b border-white/[0.08] flex gap-8">
          <div className="w-16 h-8 bg-white/[0.02] rounded-t-lg" />
          <div className="w-16 h-8 bg-white/[0.02] rounded-t-lg" />
          <div className="w-16 h-8 bg-white/[0.02] rounded-t-lg" />
        </div>
      </div>
    );
  }

  if (type === "watch") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
        {/* Left player column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="w-full aspect-video bg-white/[0.04] rounded-2xl" />
          <div className="h-6 bg-white/[0.04] rounded-md w-3/4" />
          <div className="flex items-center gap-4 justify-between border-b border-white/[0.08] pb-4">
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-white/[0.04]" />
              <div className="space-y-2">
                <div className="h-3.5 bg-white/[0.04] rounded w-20" />
                <div className="h-3 bg-white/[0.04] rounded w-28" />
              </div>
            </div>
            <div className="h-8 bg-white/[0.04] rounded-full w-24" />
          </div>
        </div>

        {/* Right sidebar column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="h-4 bg-white/[0.04] rounded w-1/3 mb-2" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-32 h-18 bg-white/[0.04] rounded-lg flex-shrink-0" />
              <div className="flex-grow space-y-2">
                <div className="h-3.5 bg-white/[0.04] rounded w-5/6" />
                <div className="h-3 bg-white/[0.04] rounded w-1/2" />
                <div className="h-2.5 bg-white/[0.04] rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard recommendation grid (grid)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 px-4 py-4 w-full">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col gap-3.5 p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-2xl animate-pulse">
          <div className="relative aspect-video w-full bg-white/[0.04] rounded-xl" />
          <div className="flex gap-3 pt-1">
            <div className="w-9 h-9 rounded-full bg-white/[0.04]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/[0.04] rounded w-4/5" />
              <div className="h-3.5 bg-white/[0.04] rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
