import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Plus, Star, Calendar, Clock, Info } from "lucide-react";
import { TMDBMovieDetails, getMovieDetails, TMDB_IMAGE_BASE_URL, TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import LazyImage from "../LazyImage";

export default function MovieChannel() {
  const { tmdbId } = useParams();
  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getMovieDetails(parseInt(tmdbId, 10));
        setMovie(data);
        document.title = `${data.title} • Movies`;
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [tmdbId]);

  if (loading) {
    return (
      <div className="w-full h-full p-4 md:p-8 pt-20 flex flex-col gap-8">
        <div className="shimmer-bone w-full aspect-[21/9] rounded-3xl" />
        <div className="flex gap-8">
          <div className="shimmer-bone hidden md:block w-[250px] aspect-[2/3] rounded-2xl shrink-0" />
          <div className="flex-1 space-y-4">
            <div className="shimmer-bone w-2/3 h-12 rounded-lg" />
            <div className="shimmer-bone w-1/3 h-6 rounded-md" />
            <div className="shimmer-bone w-full h-32 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Info className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Movie Not Found</h2>
        <p className="text-white/50">The movie you requested could not be found or TMDB is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center pb-32 animate-fade-in text-white min-h-screen">
      <div className="w-full max-w-[2000px] flex flex-col">
        {/* Cinematic Backdrop Hero */}
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[#09090b] select-none">
          {movie.backdrop_path ? (
            <img
              src={`${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}`}
              alt={`${movie.title} Backdrop`}
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
             <div className="w-full h-full bg-white/5" />
          )}

          {/* Epic Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-transparent to-[#09090b]/40 hidden md:block" />
        </div>

        {/* Content Section */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 -mt-32 md:-mt-64 flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Poster (Desktop) */}
          <div className="hidden md:block w-[280px] lg:w-[320px] shrink-0">
            <div className="w-full aspect-[2/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 group bg-[#09090b]">
              <LazyImage
                src={movie.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${movie.poster_path}` : ""}
                alt={`${movie.title} Poster`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            {/* Quick Actions (Desktop) */}
            <div className="mt-6 flex flex-col gap-3">
              <Link to={`/movies/watch/${movie.id}`}>
                <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-colors cursor-pointer group">
                  <Play className="w-5 h-5 fill-current" />
                  Watch Movie
                </button>
              </Link>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-xl transition-colors cursor-pointer text-white">
                <Plus className="w-5 h-5" />
                Add to Library
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col pt-8 md:pt-32 pb-8">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tight drop-shadow-xl mb-4 leading-tight">
              {movie.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2 text-sm md:text-base font-medium text-white/70">
              <div className="flex items-center gap-2 text-rose-400">
                <Star className="w-5 h-5 fill-rose-400 stroke-rose-400" />
                <span className="text-white font-bold">{movie.vote_average?.toFixed(1)}</span>
                <span className="text-white/40 text-xs">TMDB</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{movie.release_date?.substring(0, 4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{movie.runtime} min</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {movie.genres?.map(g => (
                <span key={g.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold tracking-wide text-white/80">
                  {g.name}
                </span>
              ))}
            </div>

            {/* Quick Actions (Mobile) */}
            <div className="md:hidden flex flex-col sm:flex-row gap-3 mt-8">
              <Link to={`/movies/watch/${movie.id}`} className="w-full sm:w-auto flex-1">
                <button className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black hover:bg-gray-200 font-bold rounded-xl transition-colors cursor-pointer">
                  <Play className="w-5 h-5 fill-current" />
                  Watch Movie
                </button>
              </Link>
              <button className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 border border-white/10 font-bold rounded-xl transition-colors cursor-pointer">
                <Plus className="w-5 h-5" />
                Library
              </button>
            </div>

            <div className="mt-8 md:mt-10 max-w-3xl">
              <h3 className="text-lg font-bold text-white mb-3">Overview</h3>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                {movie.overview || "No overview available for this movie."}
              </p>
            </div>

            {/* Cast Segment */}
            {movie.credits && movie.credits.cast && movie.credits.cast.length > 0 && (
              <div className="mt-12">
                <h3 className="text-lg font-bold text-white mb-6">Top Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {movie.credits.cast.slice(0, 10).map((actor) => (
                    <div key={actor.id} className="flex flex-col gap-2 w-[100px] md:w-[120px] shrink-0">
                      <div className="w-full aspect-square rounded-full overflow-hidden bg-white/5 border border-white/10">
                        {actor.profile_path ? (
                          <LazyImage
                            src={`${TMDB_IMAGE_BASE_URL_W500}${actor.profile_path}`}
                            alt={actor.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/20">No Image</div>
                        )}
                      </div>
                      <div className="text-center px-1">
                        <p className="text-sm font-semibold text-white/90 truncate">{actor.name}</p>
                        <p className="text-xs text-white/50 truncate">{actor.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
