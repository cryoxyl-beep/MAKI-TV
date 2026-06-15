import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Plus, Bookmark } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Autoplay, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";

import {
  TMDBMovie,
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  TMDB_IMAGE_BASE_URL,
} from "../../services/tmdb";
import MovieCard from "./MovieCard";
import LazyImage from "../LazyImage";
import ShelfScroller from "../ShelfScroller";
import { getMovieHistory, MovieHistoryItem, storage } from "../../utils";

// Simple local library for movies
function isMovieInLibrary(id: number) {
  const lib = storage.get<number[]>("movie_library_ids", []);
  return lib.includes(id);
}
function toggleMovieLibrary(id: number) {
  let lib = storage.get<number[]>("movie_library_ids", []);
  if (lib.includes(id)) {
    lib = lib.filter((x) => x !== id);
  } else {
    lib.push(id);
  }
  storage.set("movie_library_ids", lib);
}

const HeroNavDot: React.FC<{
  isActive: boolean;
  onClick: () => void;
  progress: number;
}> = ({ isActive, onClick, progress }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isActive
    ? circumference - progress * circumference
    : circumference;

  return (
    <button
      onClick={onClick}
      className="relative w-9 h-9 flex items-center justify-center group flex-shrink-0 cursor-pointer pointer-events-auto transition-transform duration-300 hover:scale-110"
    >
      <div
        className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? "bg-white scale-125 shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-pulse" : "bg-white/40 group-hover:bg-white/80"}`}
      />

      {isActive && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-md"
          viewBox="0 0 32 32"
        >
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          <circle
            cx="16"
            cy="16"
            r={radius}
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-none"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
};

export default function MoviesHome() {
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [popular, setPopular] = useState<TMDBMovie[]>([]);
  const [topRated, setTopRated] = useState<TMDBMovie[]>([]);
  const [upcoming, setUpcoming] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [movieHistory, setMovieHistory] = useState<MovieHistoryItem[]>([]);
  const navigate = useNavigate();
  const [libraryUpdateKey, setLibraryUpdateKey] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, popularData, topRatedData, upcomingData] =
          await Promise.all([
            getTrendingMovies(),
            getPopularMovies(),
            getTopRatedMovies(),
            getUpcomingMovies(),
          ]);
        setTrending(trendingData.results);
        setPopular(popularData.results);
        setTopRated(topRatedData.results);
        setUpcoming(upcomingData.results);
        setMovieHistory(getMovieHistory().slice(0, 10));
      } catch (error) {
        console.error("Failed to fetch movies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && isHeroReady) {
      setSplashFading(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, isHeroReady]);

  const heroMovies = trending.slice(0, 6);

  return (
    <>
      {showSplash && (
        <div
          className={`fixed inset-0 z-[100] bg-black flex items-center justify-center pointer-events-none transition-opacity duration-700 ease-out ${splashFading ? "opacity-0" : "opacity-100"}`}
        >
          <div className="flex flex-col items-center justify-center animate-pulse">
            <span className="text-4xl md:text-5xl font-black tracking-wider bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent opacity-90 transition-opacity">
              miyoro
            </span>
          </div>
        </div>
      )}

      <div
        className={`w-full flex flex-col pb-20 transition-opacity duration-700 ease-out text-white ${showSplash && !splashFading ? "opacity-0" : "opacity-100"}`}
      >
        {/* Premium Hero Banner Style */}
        {heroMovies.length > 0 && (
          <div className="w-full relative -mt-[56px] mb-8 group/hero">
            <div className="absolute top-[80px] bottom-[20%] right-4 md:right-6 lg:right-10 z-30 flex flex-col justify-center items-center gap-2 md:gap-3 pointer-events-none opacity-100 transition-opacity duration-500">
              {heroMovies.map((movie, idx) => (
                <HeroNavDot
                  key={`dot-${movie.id}`}
                  isActive={activeSlideIndex === idx}
                  progress={activeSlideIndex === idx ? slideProgress : 0}
                  onClick={() => swiperInstance?.slideTo(idx)}
                />
              ))}
            </div>
            <Swiper
              modules={[EffectFade, Autoplay, Pagination]}
              effect="fade"
              loop={false}
              autoplay={{ delay: 6000, disableOnInteraction: false }}
              pagination={false}
              onSwiper={setSwiperInstance}
              onSlideChange={(swiper) => {
                setActiveSlideIndex(swiper.activeIndex);
                setSlideProgress(0);
              }}
              onAutoplayTimeLeft={(s, time, progress) => {
                setSlideProgress(1 - progress);
              }}
              className="w-full h-[65vh] md:h-[75vh] relative min-h-[500px]"
              allowTouchMove={true}
            >
              {heroMovies.map((movie, idx) => {
                const backdrop = `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path || movie.poster_path}`;
                const subscribed = isMovieInLibrary(movie.id);

                return (
                  <SwiperSlide key={movie.id}>
                    <div className="w-full h-full relative overflow-hidden bg-[#09090b]">
                      <img
                        src={backdrop}
                        alt={movie.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-100"
                        style={{ transform: "scale(1.08)" }}
                        onLoad={() => {
                          if (idx === 0) setIsHeroReady(true);
                        }}
                        loading={idx === 0 ? "eager" : "lazy"}
                      />

                      {/* Dark gradients for text readability */}
                      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/40" />
                      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-black/90 via-black/40 to-transparent w-full md:w-[65%]" />
                      <div className="absolute inset-0 pointer-events-none z-10 top-auto h-2/3 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />

                      <div className="absolute inset-0 z-20 flex flex-col justify-end px-6 md:px-10 lg:px-14 py-8 lg:py-12 pb-12 md:pb-16 pointer-events-none wrapper">
                        <div className="w-full h-full flex flex-col justify-end pointer-events-auto">
                          <div className="max-w-3xl lg:max-w-4xl flex flex-col items-start gap-2">
                            <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight font-sans drop-shadow leading-tight line-clamp-2 px-1 mb-2">
                              {movie.title}
                            </h2>

                            <div className="flex flex-col gap-2 px-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-sm font-semibold text-white/90 drop-shadow-md tracking-widest uppercase">
                                {movie.release_date?.substring(0, 4)} • ★{" "}
                                {movie.vote_average?.toFixed(1)} •{" "}
                                {movie.original_language?.toUpperCase()}
                              </div>
                            </div>

                            {movie.overview && (
                              <p className="text-white/80 max-w-2xl text-[13px] md:text-sm line-clamp-2 lg:line-clamp-3 leading-relaxed drop-shadow-lg mix-blend-lighten px-1 mt-1">
                                {movie.overview}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-3 md:mt-5 px-1">
                              <button
                                onClick={() =>
                                  navigate(`/movies/watch/${movie.id}`)
                                }
                                className="px-6 py-2.5 md:px-8 md:py-3 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[20px] border border-white/[0.15] text-white font-bold rounded-md flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                              >
                                <Play className="w-5 h-5 fill-white stroke-none group-hover:scale-105 transition-transform" />
                                <span className="tracking-wide text-sm md:text-base">
                                  Play Now
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  toggleMovieLibrary(movie.id);
                                  setLibraryUpdateKey((prev) => prev + 1);
                                }}
                                className={`px-6 py-2.5 md:px-8 md:py-3 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[20px] border ${subscribed ? "border-white/[0.4]" : "border-white/[0.15]"} text-white font-bold rounded-md flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group`}
                              >
                                <Bookmark
                                  className={`w-5 h-5 transition-transform group-hover:scale-105 ${subscribed ? "fill-white text-white" : "text-white"}`}
                                />
                                <span className="tracking-wide text-sm md:text-base">
                                  {subscribed ? "In Library" : "Add to Library"}
                                </span>
                              </button>
                            </div>
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

        {/* Sections */}
        <div className="flex flex-col gap-10 mt-2 px-0 py-0">
          {movieHistory.length > 0 && (
            <div className="flex flex-col gap-4 relative isolate mb-4 animate-fade-in">
              <div className="px-4 md:px-6 flex flex-col">
                <h2 className="text-xl md:text-2xl font-bold text-[#f1f1f1] tracking-tight">
                  Continue Watching
                </h2>
              </div>
              <ShelfScroller>
                {movieHistory.map((item) => (
                  <Link
                    key={item.tmdbId}
                    to={`/movies/watch/${item.tmdbId}`}
                    className="relative shrink-0 w-[240px] md:w-[280px] aspect-video rounded-xl overflow-hidden group cursor-pointer bg-white/5 border border-white/10"
                  >
                    <LazyImage
                      src={
                        item.backdropPath
                          ? `${TMDB_IMAGE_BASE_URL}${item.backdropPath}`
                          : item.posterPath
                            ? `${TMDB_IMAGE_BASE_URL}${item.posterPath}`
                            : ""
                      }
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col gap-2 pointer-events-none">
                      <h3 className="text-sm font-bold text-white truncate drop-shadow-md">
                        {item.title}
                      </h3>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.progress))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.5)]">
                        <Play className="w-5 h-5 fill-current ml-1" />
                      </div>
                    </div>
                  </Link>
                ))}
              </ShelfScroller>
            </div>
          )}

          <MovieSection
            title="Trending Now"
            subtitle="Most watched this week"
            movies={trending.slice(6)}
          />
          <MovieSection
            title="New Releases"
            subtitle="Fresh from this season"
            movies={upcoming}
          />
          <MovieSection
            title="Popular Movies"
            subtitle="Current fan favorites"
            movies={popular}
          />
          <MovieSection
            title="Top Rated"
            subtitle="Highest rated movies of all time"
            movies={topRated}
          />
        </div>
      </div>
    </>
  );
}

function MovieSection({
  title,
  subtitle,
  movies,
}: {
  title: string;
  subtitle?: string;
  movies: TMDBMovie[];
}) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 relative isolate mb-8 animate-fade-in">
      <div className="px-4 md:px-6 flex flex-col">
        <h2 className="text-xl md:text-2xl font-bold text-[#f1f1f1] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13px] text-gray-400 font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <ShelfScroller>
        {movies.map((movie, index) => (
          <div key={`${movie.id}-${index}`} className="snap-start shrink-0">
            <MovieCard movie={movie} index={index} />
          </div>
        ))}
      </ShelfScroller>
    </div>
  );
}
