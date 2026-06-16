import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Plus, Star, Calendar, Clock, Info, Check } from "lucide-react";
import {
  TMDBMovieDetails,
  getMovieDetails,
  TMDB_IMAGE_BASE_URL,
  TMDB_IMAGE_BASE_URL_W500,
} from "../../services/tmdb";
import LazyImage from "../LazyImage";
import SkeletonLoader from "../SkeletonLoader";
import { storage } from "../../utils";
import { useMoviesData } from "../../hooks/useMoviesData";

export default function MovieChannel() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const { isInLibrary, toggleLibrary } = useMoviesData();
  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getMovieDetails(parseInt(tmdbId, 10));
        setMovie(data);
        document.title = `${data.title} - Miyoro`;
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
      <div className="w-full h-full min-h-screen animate-fade-in relative z-20">
        <SkeletonLoader type="channel" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-6 -mt-[56px]">
        <Info className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Movie Not Found</h2>
        <p className="text-white/50">
          The movie you requested could not be found or TMDB is unavailable.
        </p>
      </div>
    );
  }

  const subscribed = isInLibrary(movie.id);

  return (
    <div className="fixed inset-0 z-10 w-full bg-[#09090b] select-none font-sans overflow-hidden">
      {/* =============== HERO ATMOSPHERE =============== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {movie.backdrop_path ? (
          <img
            src={`${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}`}
            alt={movie.title}
            className="w-full h-full object-cover opacity-30 object-top animate-fade-in duration-500"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/50 to-transparent" />
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center pt-14 pb-4 px-4 sm:px-8 lg:px-16 overflow-y-auto sm:overflow-hidden">
        <div className="w-full max-w-[1200px] flex flex-col sm:flex-row gap-8 lg:gap-14 items-center sm:items-stretch py-8">
          {/* =============== LEFT COLUMN: POSTER =============== */}
          <div className="w-[200px] sm:w-[240px] lg:w-[320px] flex-shrink-0 flex flex-col justify-center animate-fade-in">
            <div className="w-full aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group-hover:border-white/20 transition-all duration-500 transform lg:hover:scale-[1.02]">
              <LazyImage
                src={
                  movie.poster_path
                    ? `${TMDB_IMAGE_BASE_URL_W500}${movie.poster_path}`
                    : ""
                }
                alt={movie.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* =============== RIGHT COLUMN: INFO & METADATA =============== */}
          <div
            className="flex-1 min-w-0 flex flex-col justify-center h-full max-h-[85vh] animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="flex flex-col gap-1 overflow-y-auto scrollbar-hide pb-6 pt-4 px-6 -mx-6">
              {/* Year & Genres */}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                {movie.release_date && (
                  <span className="text-white/80 font-bold text-sm tracking-wider">
                    {movie.release_date.substring(0, 4)}
                  </span>
                )}
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                {movie.genres?.slice(0, 3).map((g) => (
                  <span
                    key={g.id}
                    className="text-white/60 text-sm font-semibold tracking-wide"
                  >
                    {g.name}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight leading-[1.1] drop-shadow-lg">
                {movie.title}
              </h1>

              {/* Main Action Buttons */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => navigate(`/movies/watch/${movie.id}`)}
                  className="px-8 py-3.5 bg-white text-black hover:bg-gray-200 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                >
                  <Play className="w-5 h-5 fill-black mr-2.5" />
                  <span className="font-bold tracking-wide text-[15px]">
                    Play Now
                  </span>
                </button>

                <button
                  onClick={async () => {
                    await toggleLibrary(movie as any);
                  }}
                  className={`px-8 py-3.5 rounded-full backdrop-blur-md border border-white/10 hover:border-white/20 flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-lg ${subscribed ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/90"}`}
                >
                  {subscribed ? (
                    <Check className="w-5 h-5 mr-2.5" />
                  ) : (
                    <Plus className="w-5 h-5 mr-2.5" />
                  )}
                  <span className="font-bold tracking-wide text-[15px]">
                    {subscribed ? "In Library" : "Add to Library"}
                  </span>
                </button>
              </div>

              {/* Description */}
              <p className="text-white/70 text-[15px] sm:text-base leading-relaxed font-medium mb-8 max-w-3xl line-clamp-4 lg:line-clamp-5 drop-shadow-md">
                {movie.overview || "No synopsis available."}
              </p>

              {/* Vertical Metadata List (Replaces Tabs) */}
              <div className="flex flex-col gap-3.5">
                {movie.vote_average && movie.vote_average > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-white/40 uppercase tracking-widest w-24">
                      Score
                    </span>
                    <span className="flex items-center text-white font-bold">
                      <Star className="w-4 h-4 fill-[#ff6b35] text-[#ff6b35] mr-1.5" />
                      {movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-white/40 uppercase tracking-widest w-24">
                    Runtime
                  </span>
                  <span className="flex items-center text-white font-bold">
                    <Clock className="w-4 h-4 text-white/60 mr-1.5" />
                    {movie.runtime} mins
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-white/40 uppercase tracking-widest w-24">
                    Release
                  </span>
                  <span className="flex items-center text-white font-bold">
                    <Calendar className="w-4 h-4 text-white/60 mr-1.5" />
                    {movie.release_date}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-bold text-white/40 uppercase tracking-widest w-24">
                    Status
                  </span>
                  <span className="text-white font-bold">
                    {movie.status || "Released"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
