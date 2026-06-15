import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Plus } from "lucide-react";
import {
  TMDBMovie,
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  TMDB_IMAGE_BASE_URL
} from "../../services/tmdb";
import MovieCard from "./MovieCard";
import LazyImage from "../LazyImage";
import { getMovieHistory, MovieHistoryItem } from "../../utils";

export default function MoviesHome() {
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [popular, setPopular] = useState<TMDBMovie[]>([]);
  const [topRated, setTopRated] = useState<TMDBMovie[]>([]);
  const [upcoming, setUpcoming] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [movieHistory, setMovieHistory] = useState<MovieHistoryItem[]>([]);

  // Use the first trending movie as the hero banner
  const heroMovie = trending.length > 0 ? trending[0] : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trendingData, popularData, topRatedData, upcomingData] = await Promise.all([
          getTrendingMovies(),
          getPopularMovies(),
          getTopRatedMovies(),
          getUpcomingMovies(),
        ]);
        setTrending(trendingData.results);
        setPopular(popularData.results);
        setTopRated(topRatedData.results);
        setUpcoming(upcomingData.results);
        setMovieHistory(getMovieHistory().slice(0, 10)); // up to 10 recents
      } catch (error) {
        console.error("Failed to fetch movies:", error);
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
      {heroMovie && (
        <div className="relative w-full aspect-[4/5] md:aspect-[2.5/1] overflow-hidden">
          <div className="absolute inset-0 bg-[#09090b]">
            <LazyImage
              src={`${TMDB_IMAGE_BASE_URL}${heroMovie.backdrop_path || heroMovie.poster_path}`}
              alt={heroMovie.title}
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
              {heroMovie.title}
            </motion.h1>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4 text-sm font-medium text-white/70"
            >
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">
                {heroMovie.release_date?.substring(0, 4)}
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                ★ {heroMovie.vote_average?.toFixed(1)}
              </span>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-white/60 text-sm md:text-base line-clamp-3 max-w-xl leading-relaxed drop-shadow-md"
            >
              {heroMovie.overview}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mt-2"
            >
              <Link to={`/movies/movie/${heroMovie.id}`}>
                <button className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-colors cursor-pointer">
                  <Play className="w-5 h-5 fill-current" />
                  View Details
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-10 mt-8 px-4 md:px-8">
        {movieHistory.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Continue Watching</h2>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
              {movieHistory.map((item) => (
                <Link key={item.tmdbId} to={`/movies/watch/${item.tmdbId}`} className="relative shrink-0 w-[240px] md:w-[280px] aspect-video rounded-xl overflow-hidden group cursor-pointer bg-white/5 border border-white/10">
                  <LazyImage 
                    src={item.backdropPath ? `${TMDB_IMAGE_BASE_URL}${item.backdropPath}` : (item.posterPath ? `${TMDB_IMAGE_BASE_URL}${item.posterPath}` : "")}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 w-full p-4 flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-white truncate drop-shadow-md">{item.title}</h3>
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-rose-500/90 text-white flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.5)]">
                      <Play className="w-5 h-5 fill-current ml-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <MovieSection title="Trending Now" movies={trending.slice(1)} />
        <MovieSection title="Popular Movies" movies={popular} />
        <MovieSection title="Top Rated" movies={topRated} />
        <MovieSection title="Upcoming Cinematic Releases" movies={upcoming} />
      </div>
    </div>
  );
}

function MovieSection({ title, movies }: { title: string; movies: TMDBMovie[] }) {
  if (!movies || movies.length === 0) return null;
  
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
