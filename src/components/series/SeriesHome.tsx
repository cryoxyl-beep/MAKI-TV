import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Plus } from "lucide-react";
import {
  TMDBTVShow,
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getAiringThisWeekTV,
  TMDB_IMAGE_BASE_URL
} from "../../services/tmdb";
import SeriesCard from "./SeriesCard";
import LazyImage from "../LazyImage";

export default function SeriesHome() {
  const [trending, setTrending] = useState<TMDBTVShow[]>([]);
  const [popular, setPopular] = useState<TMDBTVShow[]>([]);
  const [topRated, setTopRated] = useState<TMDBTVShow[]>([]);
  const [airing, setAiring] = useState<TMDBTVShow[]>([]);
  const [loading, setLoading] = useState(true);

  // Use the first trending show as the hero banner
  const heroSeries = trending.length > 0 ? trending[0] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, popularData, topRatedData, airingData] = await Promise.all([
          getTrendingTV(),
          getPopularTV(),
          getTopRatedTV(),
          getAiringThisWeekTV(),
        ]);
        setTrending(trendingData.results);
        setPopular(popularData.results);
        setTopRated(topRatedData.results);
        setAiring(airingData.results);
      } catch (error) {
        console.error("Failed to fetch series:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-8 p-4 md:p-8 pt-20">
        <div className="shimmer-bone w-full aspect-video md:aspect-[2.5/1] rounded-3xl" />
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer-bone w-[160px] md:w-[200px] aspect-[2/3] rounded-xl shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col pb-20 animate-fade-in text-white">
      {/* Hero Banner */}
      {heroSeries && (
        <div className="relative w-full aspect-[4/5] md:aspect-[2.5/1] overflow-hidden">
          <div className="absolute inset-0 bg-[#09090b]">
            <LazyImage
              src={`${TMDB_IMAGE_BASE_URL}${heroSeries.backdrop_path || heroSeries.poster_path}`}
              alt={heroSeries.name}
              className="w-full h-full object-cover opacity-60"
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent md:w-2/3" />
          
          <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:w-2/3 flex flex-col gap-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-xl"
            >
              {heroSeries.name}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4 text-sm font-medium text-white/70"
            >
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">
                {heroSeries.first_air_date?.substring(0, 4)}
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                ★ {heroSeries.vote_average?.toFixed(1)}
              </span>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-sm md:text-base line-clamp-3 max-w-xl leading-relaxed drop-shadow-md"
            >
              {heroSeries.overview}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mt-2"
            >
              <Link to={`/series/show/${heroSeries.id}`}>
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors cursor-pointer">
                  <Play className="w-5 h-5 fill-current" />
                  View Details
                </button>
              </Link>
              <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold backdrop-blur-md transition-colors cursor-pointer border border-white/10">
                <Plus className="w-5 h-5" />
                Library
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-10 mt-8 px-4 md:px-8">
        <SeriesSection title="Trending Series" series={trending.slice(1)} />
        <SeriesSection title="Popular Series" series={popular} />
        <SeriesSection title="Top Rated" series={topRated} />
        <SeriesSection title="Airing This Week" series={airing} />
      </div>
    </div>
  );
}

function SeriesSection({ title, series }: { title: string; series: TMDBTVShow[] }) {
  if (!series || series.length === 0) return null;
  
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {series.map((show) => (
          <SeriesCard key={show.id} series={show} />
        ))}
      </div>
    </div>
  );
}
