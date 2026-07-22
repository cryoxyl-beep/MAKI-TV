import { fetchJikan } from "../services/fetchUtils";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAnimeFeed } from "../services/anilist";
import { AniListAnime } from "../types";
import AnimeCard from "./AnimeCard";
import SkeletonLoader from "./SkeletonLoader";
import { RefreshCw, Flame, ChevronLeft, ChevronRight } from "lucide-react";

interface Genre {
  mal_id: number;
  name: string;
}

interface BrowseFeedProps {
  onSelectAnime: (id: number) => void;
}

const DEFAULT_GENRES: Genre[] = [
  { mal_id: 1, name: "Action" },
  { mal_id: 2, name: "Adventure" },
  { mal_id: 4, name: "Comedy" },
  { mal_id: 8, name: "Drama" },
  { mal_id: 10, name: "Fantasy" },
  { mal_id: 22, name: "Romance" },
  { mal_id: 24, name: "Sci-Fi" },
  { mal_id: 36, name: "Slice of Life" },
  { mal_id: 37, name: "Supernatural" },
  { mal_id: 7, name: "Mystery" },
  { mal_id: 30, name: "Sports" },
  { mal_id: 14, name: "Horror" },
  { mal_id: 41, name: "Suspense" },
  { mal_id: 44, name: "Award Winning" },
  { mal_id: 45, name: "Gourmet" },
];

export default function BrowseFeed({ onSelectAnime }: BrowseFeedProps) {
  const [genres, setGenres] = useState<Genre[]>(DEFAULT_GENRES);
  const [selectedGenreId, setSelectedGenreId] = useState<number | "trending">("trending");
  const [animeList, setAnimeList] = useState<AniListAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch genres on mount
  useEffect(() => {
    fetchJikan("https://api.jikan.moe/v4/genres/anime")
      .then(data => {
        if (data && data.data) {
          setGenres(data.data);
        }
      })
      .catch(() => {});
  }, []);

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

  // Reset and fetch when genre changes
  useEffect(() => {
    setAnimeList([]);
    setPage(1);
    setHasMore(true);
    loadFeed(1, true, selectedGenreId);
  }, [selectedGenreId]);

  // Load more pages
  useEffect(() => {
    if (page > 1) {
      loadFeed(page, false, selectedGenreId);
    }
  }, [page]);

  async function loadFeed(pageNum: number, isInitial: boolean, genreId: number | "trending") {
    if (isInitial) setIsLoading(true);
    else setIsFetchingMore(true);

    try {
      const categoryParam = genreId === "trending" ? "Trending" : `id:${genreId}`;
      let data = await fetchAnimeFeed(categoryParam, "", pageNum);
      data = data.filter(anime => anime.status !== "Not yet aired");
      
      if (data.length < 25) setHasMore(false);

      if (isInitial) {
        setAnimeList(data);
      } else {
        setAnimeList((prev) => [...prev, ...data]);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 250;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Genres Scroller */}
      {genres.length > 0 && (
        <div className="relative w-full bg-transparent py-4 px-4 md:px-6 flex items-center group select-none z-10">
          <button
            onClick={() => scroll("left")}
            className="absolute left-1 z-20 p-1.5 bg-[#0a0a0c]/80 backdrop-blur-md hover:bg-white/[0.15] rounded-full border border-white/[0.08] text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2.5 overflow-x-auto overflow-y-hidden scrollbar-none scroll-smooth w-full flex-nowrap pr-12 sm:pr-0"
          >
            <button
              onClick={() => setSelectedGenreId("trending")}
              className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                selectedGenreId === "trending"
                  ? "bg-white text-black font-semibold shadow-lg shadow-white/5 border border-white"
                  : "bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.12] hover:border-white/[0.15]"
              }`}
            >
              All Trending
            </button>
            {genres.map((genre) => {
              const isActive = selectedGenreId === genre.mal_id;
              return (
                <button
                  key={genre.mal_id}
                  onClick={() => setSelectedGenreId(genre.mal_id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] ${
                    isActive
                      ? "bg-white text-black font-semibold shadow-lg shadow-white/5 border border-white"
                      : "bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.12] hover:border-white/[0.15]"
                  }`}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scroll("right")}
            className="absolute right-1 z-20 p-1.5 bg-[#0a0a0c]/80 backdrop-blur-md hover:bg-white/[0.15] rounded-full border border-white/[0.08] text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid Content */}
      <div className="pt-2">
        {isLoading && animeList.length === 0 ? (
          <div className="mt-4 px-4 md:px-6">
            <SkeletonLoader type="grid" />
          </div>
        ) : (
          animeList.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 px-4 md:px-6 w-full select-none group/row animate-fade-in transition-opacity duration-300">
              {animeList.map((anime, index) => {
                const isLastElement = index === animeList.length - 1;
                return (
                  <div ref={isLastElement ? lastAnimeElementRef : null} key={`${anime.id}-${index}`}>
                    <AnimeCard anime={anime} onClick={() => onSelectAnime(anime.id)} layout="grid" index={index} />
                  </div>
                );
              })}
            </div>
          )
        )}

        {isFetchingMore && (
          <div className="py-10 px-4 md:px-6 flex justify-center">
            <RefreshCw className="w-6 h-6 text-[#ff6b35] animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
