/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAnimeFeed } from "../services/anilist";
import { AniListAnime } from "../types";
import AnimeCard from "./AnimeCard";
import CategoryChips from "./CategoryChips";
import SkeletonLoader from "./SkeletonLoader";
import { RefreshCw, Play } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";

interface HomeFeedProps {
  onSelectAnime: (id: number) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export default function HomeFeed({
  onSelectAnime,
  searchQuery = "",
  onClearSearch,
}: HomeFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [animeList, setAnimeList] = useState<AniListAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    setAnimeList([]);
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
      const data = await fetchAnimeFeed(activeCategory, activeSearch, pageNum);

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setAnimeList((prev) => [...prev, ...data]);
        // If data is less than standard batch, it might be the end
        if (data.length < 25) setHasMore(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load feed");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [showTrailerIndex, setShowTrailerIndex] = useState<number | null>(null);
  const [randomOffsets, setRandomOffsets] = useState<Record<number, number>>(
    {},
  );

  // Extract top 8 for the banner
  const bannerAnimes =
    !searchQuery && selectedCategory === "All" ? animeList.slice(0, 8) : [];
  const feedAnimes =
    !searchQuery && selectedCategory === "All" ? animeList.slice(8) : animeList;

  useEffect(() => {
    if (bannerAnimes.length > 0) {
      console.log("--- HERO SWIPER TRAILER DATA ---");
      bannerAnimes.forEach((anime) => {
        const title = anime.title.english || anime.title.romaji || anime.title.userPreferred;
        console.log(`Title: ${title} | Trailer ID: ${anime.trailer?.id || "NONE"} | Site: ${anime.trailer?.site || "NONE"}`);
      });
      
      const offsets: Record<number, number> = {};
      bannerAnimes.forEach((anime) => {
        if (offsets[anime.id] === undefined) {
          // Netflix style random offset 5-40s
          offsets[anime.id] = Math.floor(Math.random() * 36) + 5;
        }
      });
      setRandomOffsets((prev) => ({ ...prev, ...offsets }));
    }
  }, [animeList]);

  const activeAnimeId = bannerAnimes[activeSlideIndex]?.id;

  // Handle Netflix-style 2s delayed trailer pop-in and randomize offset every visit
  useEffect(() => {
    setShowTrailerIndex(null); // Hide trailer immediately when slide changes

    if (activeAnimeId) {
      // Randomize offset each time the slide becomes active to prevent repetitive hero experiences
      setRandomOffsets((prev) => ({
        ...prev,
        [activeAnimeId]: Math.floor(Math.random() * 36) + 5,
      }));
    }

    const timer = setTimeout(() => {
      setShowTrailerIndex(activeSlideIndex);
    }, 2000);

    return () => clearTimeout(timer);
  }, [activeSlideIndex, activeAnimeId]);

  return (
    <div className="w-full min-h-screen bg-transparent pb-20">
      {/* Hero Banner with Swiper */}
      {!searchQuery &&
        selectedCategory === "All" &&
        bannerAnimes.length > 0 && (
          <div className="px-4 md:px-6 mb-6">
            <Swiper
              modules={[Autoplay, EffectFade]}
              effect="fade"
              autoplay={{ delay: 14000, disableOnInteraction: false }}
              loop={true}
              onSlideChange={(swiper) => setActiveSlideIndex(swiper.realIndex)}
              className="w-full h-48 md:h-[400px] rounded-2xl overflow-hidden relative group border border-white/[0.08] shadow-2xl shadow-black/50"
            >
              {bannerAnimes.map((recommendedAnime, idx) => {
                const animeTitle =
                  recommendedAnime.title.english ||
                  recommendedAnime.title.romaji;
                const isActiveSlide = activeSlideIndex === idx;
                const isTrailerVisible = showTrailerIndex === idx;
                const startSeconds =
                  randomOffsets[recommendedAnime.id] !== undefined
                    ? randomOffsets[recommendedAnime.id]
                    : 10;

                return (
                  <SwiperSlide key={recommendedAnime.id}>
                    <div
                      onClick={() => onSelectAnime(recommendedAnime.id)}
                      className="w-full h-full cursor-pointer relative bg-black/20"
                    >
                      {/* Fallback Banner Image (always in DOM, visible originally) */}
                      <img
                        src={
                          recommendedAnime.bannerImage ||
                          recommendedAnime.coverImage.extraLarge ||
                          recommendedAnime.coverImage.large
                        }
                        alt="Hero Feed Anime"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75 bg-gradient-to-tr from-[#ff6b35]/20 to-[#ffa585]/1"
                        referrerPolicy="no-referrer"
                      />

                      {/* Netflix-style Cinematic Trailer */}
                      {isActiveSlide && recommendedAnime.trailer?.id && (
                        <div
                          className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 ${isTrailerVisible ? "opacity-100" : "opacity-0"}`}
                        >
                          <div className="absolute inset-0 bg-black" />
                          <iframe
                            src={`https://www.youtube.com/embed/${recommendedAnime.trailer.id}?autoplay=1&mute=1&controls=0&loop=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&playsinline=1&start=${startSeconds}`}
                            title="Anime Trailer"
                            className="w-full h-[150%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none scale-[1.35] brightness-[0.55] border-none"
                            allow="autoplay; encrypted-media"
                          />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent flex flex-col justify-end p-6 md:p-10 pointer-events-none">
                        <div className="pointer-events-auto">
                          <span className="text-xs md:text-sm uppercase text-[#ff6b35] font-bold tracking-widest mb-2 flex items-center gap-1.5 leading-none">
                            <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-ping opacity-80" />
                            Recommended Today
                          </span>

                          <h2 className="text-white text-2xl md:text-5xl font-black tracking-tight font-sans drop-shadow leading-tight line-clamp-1 max-w-4xl group-hover:text-[#ff6b35] transition-colors mb-3">
                            {animeTitle}
                          </h2>

                          <div className="mt-4 flex items-center gap-4">
                            <button className="px-6 py-2 md:py-3 bg-[#ff6b35] hover:bg-[#ff7e4e] text-white text-sm md:text-base font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-[#ff6b35]/20 cursor-pointer transition-all hover:scale-105">
                              <Play className="w-4 h-4 md:w-5 md:h-5 fill-white stroke-none" />
                              <span>Enter Channel</span>
                            </button>
                            <span className="text-xs md:text-sm text-gray-300 font-mono tracking-wider hidden md:block">
                              {recommendedAnime.genres?.slice(0, 3).join(" • ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}

      {/* Category Horizontal scroll chips line (moved below banner and centralized) */}
      {!searchQuery && (
        <div className="flex justify-center mb-6">
          <CategoryChips
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
            }}
          />
        </div>
      )}

      {/* Dynamic Header details when query is running */}
      {searchQuery && (
        <div className="px-4 md:px-6 pt-3 pb-4 border-b border-[#222] flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Search results for</span>
            <span className="text-white font-bold text-base bg-[#222] px-3 py-1 rounded-full">
              "{searchQuery}"
            </span>
          </div>
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="text-xs text-[#ff6b35] hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Grid or List flow for HOMEPAGE recommendations */}
      <div
        className={
          searchQuery
            ? "max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-5"
            : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 px-4 md:px-6"
        }
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
                onClick={() => onSelectAnime(anime.id)}
                layout={searchQuery ? "list" : "grid"}
              />
            </div>
          );
        })}
      </div>

      {/* Initial load shimmer */}
      {isLoading && (
        <div className="mt-8 px-4 md:px-6">
          <SkeletonLoader type={searchQuery ? "list" : "grid"} />
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
          <div className="text-white font-bold text-lg">No anime found</div>
          <p className="text-gray-400 text-xs mt-1 max-w-xs">
            We couldn't find any results matching your request. Try searching
            another term or choosing other categories!
          </p>
        </div>
      )}
    </div>
  );
}
