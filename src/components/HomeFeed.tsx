/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAnimeFeed, fetchNewReleases } from "../services/anilist";
import { AniListAnime } from "../types";
import AnimeCard from "./AnimeCard";
import CategoryChips from "./CategoryChips";
import SkeletonLoader from "./SkeletonLoader";
import DiscoveryShelf from "./DiscoveryShelf";
import { RefreshCw, Play } from "lucide-react";
import PremiumHero from "./PremiumHero";
import { rankSearchMatch } from "../utils/search";
import ShelfScroller from "./ShelfScroller";
import WatchHistory from "./WatchHistory";

interface HomeFeedProps {
  onSelectAnime: (id: number) => void;
  onWatchEpisode: (animeId: number, seasonNumber: number, episodeNumber: number) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export default function HomeFeed({
  onSelectAnime,
  onWatchEpisode,
  searchQuery = "",
  onClearSearch,
}: HomeFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [animeList, setAnimeList] = useState<AniListAnime[]>([]);
  const [newReleases, setNewReleases] = useState<AniListAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewReleasesLoading, setIsNewReleasesLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastAnimeElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingMore || !hasMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingMore, hasMore],
  );

  // Initial load
  useEffect(() => {
    // Keep stale results on screen while loading to prevent flashes, only wipe if moving away completely from content
    if (!searchQuery && selectedCategory === "All") {
      setAnimeList([]);
      
      // Also load new releases specifically for the shelf
      setIsNewReleasesLoading(true);
      fetchNewReleases(1).then(data => {
        setNewReleases(data);
        setIsNewReleasesLoading(false);
      }).catch(() => setIsNewReleasesLoading(false));
    }
    setPage(1);
    setHasMore(true);
    loadFeed(1, true);
  }, [selectedCategory, searchQuery]);

  // Load more
  useEffect(() => {
    if (page > 1) {
      loadFeed(page, false);
    }
  }, [page]);

  async function loadFeed(pageNum: number, isInitial: boolean) {
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }
    setError(null);
    try {
      const activeSearch = searchQuery ? searchQuery : undefined;
      const activeCategory = selectedCategory;
      let data = await fetchAnimeFeed(activeCategory, activeSearch, pageNum);

      if (activeSearch) {
        // Enforce Search Relevance Requirements
        data = data
          .map((anime) => ({ anime, score: rankSearchMatch(anime, activeSearch) }))
          .filter((item) => item.score >= 50)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.anime);
        
        if (isInitial) {
          data = data.slice(0, 20); // Cap at 20
        } else {
          data = []; // Do not fetch more for searches
        }
        // Force end of pagination on search matches
        setHasMore(false);
      } else {
        // If data is less than standard batch, it might be the end
        if (data.length < 25) setHasMore(false);
      }

      if (data.length === 0) {
        if (isInitial) {
          setAnimeList([]); // Clear stale results if new query yields nothing
        }
      } else {
        if (isInitial) {
          setAnimeList(data); // Overwrite stale results instantly
        } else {
          setAnimeList((prev) => [...prev, ...data]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load feed");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }

    const handleCardClick = useCallback((id: number) => {
    onSelectAnime(id);
  }, [onSelectAnime]);

  // All fetched animes are feedAnimes now
  const feedAnimes = animeList;

  return (
    <div className="w-full min-h-screen bg-transparent pb-20">
      {/* Premium Hero Banner */}
      {!searchQuery && selectedCategory === "All" && (
        <>
          <PremiumHero onSelectAnime={onSelectAnime} />
          <WatchHistory onWatchEpisode={onWatchEpisode} />
        </>
      )}

      {/* Dynamic Header details when query is running */}
      {searchQuery && (
        <div className="px-4 md:px-6 pt-8 pb-4">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Results for "{searchQuery}"
          </h2>
        </div>
      )}

      {/* Grid or List flow for HOMEPAGE recommendations */}
      {selectedCategory === "All" && !searchQuery ? (
        <div className="flex flex-col gap-1 w-full bg-transparent pt-6 relative isolate">
          {/* New Releases shelf */}
          {isNewReleasesLoading ? (
            <SkeletonLoader type="shelf" />
          ) : (
            newReleases.length > 0 && (
              <div className="flex flex-col gap-4 relative isolate mb-8 animate-fade-in">
                <div className="px-4 md:px-6 flex flex-col">
                  <h2 className="text-2xl font-bold text-[#f1f1f1] tracking-tight">New Releases</h2>
                  <p className="text-[13px] text-gray-400 font-medium mt-0.5">Fresh from this season</p>
                </div>
                <ShelfScroller>
                  {newReleases.slice(0, 15).map((anime, index) => {
                    return (
                      <div key={`${anime.id}-${index}`} className="snap-start shrink-0">
                        <AnimeCard anime={anime} onClick={() => handleCardClick(anime.id)} layout="grid" index={index} />
                      </div>
                    );
                  })}
                </ShelfScroller>
              </div>
            )
          )}

          {/* Trending Now shelf (using already fetched feedAnimes) */}
          {isLoading ? (
            <SkeletonLoader type="shelf" />
          ) : (
            <div className="flex flex-col gap-4 relative isolate mb-8 animate-fade-in">
              <div className="px-4 md:px-6 flex flex-col">
                <h2 className="text-2xl font-bold text-[#f1f1f1] tracking-tight">Trending Now</h2>
                <p className="text-[13px] text-gray-400 font-medium mt-0.5">Most watched this week</p>
              </div>
              <ShelfScroller>
                {feedAnimes.slice(0, 15).map((anime, index) => {
                  const isLastElement = index === Math.min(feedAnimes.length - 1, 14);
                  return (
                    <div key={`${anime.id}-${index}`} ref={isLastElement ? lastAnimeElementRef : null} className="snap-start shrink-0">
                      <AnimeCard anime={anime} onClick={() => handleCardClick(anime.id)} layout="grid" index={index} />
                    </div>
                  );
                })}
              </ShelfScroller>
            </div>
          )}

          <DiscoveryShelf title="Popular This Season" subtitle="Current fan favorites" category="Currently Airing" onSelectAnime={onSelectAnime} />
          <DiscoveryShelf title="Top Rated" subtitle="Highest rated anime of all time" category="Most Watched" onSelectAnime={onSelectAnime} />
          <DiscoveryShelf title="Action Packed" subtitle="Adrenaline-fueled adventures" category="Action" onSelectAnime={onSelectAnime} />
          <DiscoveryShelf title="Romance" subtitle="Heartwarming love stories" category="Romance" onSelectAnime={onSelectAnime} />
          <DiscoveryShelf title="Fantasy Worlds" subtitle="Epic magical journeys" category="Fantasy" onSelectAnime={onSelectAnime} />
          <DiscoveryShelf title="Drama & Suspense" subtitle="Emotional and gripping storytelling" category="Drama" onSelectAnime={onSelectAnime} />
        </div>
      ) : (
        feedAnimes.length > 0 && (
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 px-4 md:px-6 w-full select-none group/row ${isLoading ? "opacity-30 pointer-events-none" : "animate-fade-in"} transition-opacity duration-300`}
          >
            {feedAnimes.map((anime, index) => {
              const isLastElement = index === feedAnimes.length - 1;
              return (
                <div
                  ref={isLastElement ? lastAnimeElementRef : null}
                  key={`${anime.id}-${index}`}
                >
                  <AnimeCard
                    anime={anime}
                    onClick={() => handleCardClick(anime.id)}
                    layout="grid"
                    index={index}
                  />
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Initial load shimmer for non-homepage grids/lists */}
      {isLoading && feedAnimes.length === 0 && (selectedCategory !== "All" || searchQuery) && (
        <div className="mt-8 px-4 md:px-6">
          <SkeletonLoader type="grid" />
        </div>
      )}

      {/* Infinite scrolling shimmer */}
      {isFetchingMore && (
        <div className="py-10 px-4 md:px-6 flex justify-center">
          <RefreshCw className="w-6 h-6 text-[#ff6b35] animate-spin" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="text-[#ff6b35] font-bold text-lg mb-2">
            Oops! Something went wrong
          </div>
          <p className="text-gray-400 text-sm max-w-sm mb-6">{error}</p>
          <button
            onClick={() => loadFeed(page, true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#272727] text-white text-sm font-semibold rounded-lg hover:bg-white hover:text-black transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && animeList.length === 0 && (
        <div className="w-full flex flex-col items-center justify-center py-24 px-4 text-center">
          <span className="text-2xl mb-2">🔍</span>
          <div className="text-white font-bold text-lg">No matching anime found</div>
          <p className="text-gray-400 text-xs mt-1 max-w-xs">
            Try a different spelling or modifying your search.
          </p>
        </div>
      )}
    </div>
  );
}
