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
  TMDBTVShow,
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getAiringThisWeekTV,
  TMDB_IMAGE_BASE_URL,
  TMDB_IMAGE_BASE_URL_W500,
} from "../../services/tmdb";
import SeriesCard from "./SeriesCard";
import LazyImage from "../LazyImage";
import ShelfScroller from "../ShelfScroller";
import { getSeriesHistory, SeriesHistoryItem, storage } from "../../utils";
import { useSeriesData } from "../../hooks/useSeriesData";

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

export default function SeriesHome() {
  const { isInLibrary, toggleLibrary } = useSeriesData();
  const [trending, setTrending] = useState<TMDBTVShow[]>([]);
  const [popular, setPopular] = useState<TMDBTVShow[]>([]);
  const [topRated, setTopRated] = useState<TMDBTVShow[]>([]);
  const [airing, setAiring] = useState<TMDBTVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [seriesHistory, setSeriesHistory] = useState<SeriesHistoryItem[]>([]);
  const navigate = useNavigate();
  const [libraryUpdateKey, setLibraryUpdateKey] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [slideProgress, setSlideProgress] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, popularData, topRatedData, airingData] =
          await Promise.all([
            getTrendingTV(),
            getPopularTV(),
            getTopRatedTV(),
            getAiringThisWeekTV(),
          ]);
        setTrending(trendingData.results);
        setPopular(popularData.results);
        setTopRated(topRatedData.results);
        setAiring(airingData.results);
        setSeriesHistory(getSeriesHistory().slice(0, 10)); // up to 10 recent
      } catch (error) {
        console.error("Failed to fetch series:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && (!trending.length || isHeroReady)) {
      setSplashFading(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, isHeroReady, trending.length]);

  const heroSeries = trending.slice(0, 6);

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
        {heroSeries.length > 0 && (
          <div className="w-full relative -mt-[56px] mb-8 group/hero">
            <div className="absolute top-[80px] bottom-[20%] right-4 md:right-6 lg:right-10 z-30 flex flex-col justify-center items-center gap-2 md:gap-3 pointer-events-none opacity-100 transition-opacity duration-500">
              {heroSeries.map((series, idx) => (
                <HeroNavDot
                  key={`dot-${series.id}`}
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
              {heroSeries.map((series, idx) => {
                const backdrop = `${TMDB_IMAGE_BASE_URL}${series.backdrop_path || series.poster_path}`;
                const subscribed = isInLibrary(series.id);

                return (
                  <SwiperSlide key={series.id}>
                    <div className="w-full h-full relative overflow-hidden bg-[#09090b]">
                      <img
                        src={backdrop}
                        alt={series.name}
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
                              {series.name}
                            </h2>

                            <div className="flex flex-col gap-2 px-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-sm font-semibold text-white/90 drop-shadow-md tracking-widest uppercase">
                                {series.first_air_date?.substring(0, 4)} • ★{" "}
                                {series.vote_average?.toFixed(1)} •{" "}
                                {series.original_language?.toUpperCase()}
                              </div>
                            </div>

                            {series.overview && (
                              <p className="text-white/80 max-w-2xl text-[13px] md:text-sm line-clamp-2 lg:line-clamp-3 leading-relaxed drop-shadow-lg mix-blend-lighten px-1 mt-1">
                                {series.overview}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-3 md:mt-5 px-1">
                              <button
                                onClick={() =>
                                  navigate(`/series/watch/${series.id}/1/1`)
                                }
                                className="px-6 py-2.5 md:px-8 md:py-3 bg-white/[0.08] hover:bg-white/[0.12] backdrop-blur-[20px] border border-white/[0.15] text-white font-bold rounded-md flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                              >
                                <Play className="w-5 h-5 fill-white stroke-none group-hover:scale-105 transition-transform" />
                                <span className="tracking-wide text-sm md:text-base">
                                  Play Now
                                </span>
                              </button>

                              <button
                                onClick={async () => {
                                  await toggleLibrary(series as any);
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
          {seriesHistory.length > 0 && (
            <div className="flex flex-col gap-4 relative isolate mb-8 animate-fade-in group/history">
              <div className="px-4 md:px-6 flex flex-col">
                <h2 className="text-2xl font-bold text-[#f1f1f1] tracking-tight">
                  Continue Watching
                </h2>
                <p className="text-[13px] text-gray-400 font-medium mt-0.5">Resume where you left off</p>
              </div>
              <ShelfScroller>
                {seriesHistory.map((item, idx) => (
                  <Link
                    key={`${item.id}-${item.seasonNumber}-${item.episodeNumber}-${idx}`}
                    to={`/series/watch/${item.id}/${item.seasonNumber}/${item.episodeNumber}`}
                    className="snap-start shrink-0 w-64 md:w-72 flex flex-col gap-2 cursor-pointer group"
                  >
                    {/* Thumbnail Wrapper */}
                    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/5 group-hover:border-white/20 transition-all duration-300">
                      <LazyImage
                        src={
                          item.thumbnailUrl ||
                          (item.posterImage
                            ? (item.posterImage.startsWith('http') ? item.posterImage : `${TMDB_IMAGE_BASE_URL}${item.posterImage.replace(`${TMDB_IMAGE_BASE_URL_W500}`, "")}`)
                            : item.thumbnail
                              ? (item.thumbnail.startsWith('http') ? item.thumbnail : `${TMDB_IMAGE_BASE_URL}${item.thumbnail.replace(`${TMDB_IMAGE_BASE_URL_W500}`, "")}`)
                              : item.backdropImage
                                ? (item.backdropImage.startsWith('http') ? item.backdropImage : `${TMDB_IMAGE_BASE_URL}${item.backdropImage.replace(`${TMDB_IMAGE_BASE_URL_W500}`, "")}`)
                                : "")
                        }
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Dark Overlay on Hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 pointer-events-none">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-full shadow-2xl transform scale-90 group-hover:scale-100 transition-all duration-300">
                          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Episode Badge */}
                      {item.episodeNumber && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest z-10">
                          EP {item.episodeNumber}
                        </div>
                      )}

                      {/* Progress Bar */}
                      {item.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                          <div
                            style={{ width: `${item.progress}%` }}
                            className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] h-full transition-all duration-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col px-1">
                      <h3 className="text-white font-bold text-sm leading-tight truncate group-hover:text-gray-200 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 text-xs font-medium mt-1">
                        Season {item.seasonNumber} • Episode {item.episodeNumber}
                      </p>
                    </div>
                  </Link>
                ))}
              </ShelfScroller>
            </div>
          )}

          <SeriesSection
            title="Trending Series"
            subtitle="Most watched this week"
            series={trending.slice(6)}
          />
          <SeriesSection
            title="Airing This Week"
            subtitle="Fresh from this season"
            series={airing}
          />
          <SeriesSection
            title="Popular Series"
            subtitle="Current fan favorites"
            series={popular}
          />
          <SeriesSection
            title="Top Rated"
            subtitle="Highest rated series of all time"
            series={topRated}
          />
        </div>
      </div>
    </>
  );
}

function SeriesSection({
  title,
  subtitle,
  series,
}: {
  title: string;
  subtitle?: string;
  series: TMDBTVShow[];
}) {
  if (!series || series.length === 0) return null;

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
        {series.map((show, index) => (
          <div key={`${show.id}-${index}`} className="snap-start shrink-0">
            <SeriesCard series={show} index={index} />
          </div>
        ))}
      </ShelfScroller>
    </div>
  );
}
