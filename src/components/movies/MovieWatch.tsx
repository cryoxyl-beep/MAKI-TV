import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Film, ChevronDown, Server } from "lucide-react";
import { TMDBMovieDetails, getMovieDetails, TMDB_IMAGE_BASE_URL } from "../../services/tmdb";
import { motion, AnimatePresence } from "motion/react";
import VideoPlayer from "../VideoPlayer";
import { addToMovieHistory, storage } from "../../utils";

const MOVIE_PROVIDERS = [
  { id: "cinesrc", label: "Taberu" },
  { id: "vidfast", label: "Matsuri" },
  { id: "movies111", label: "Onigiri" }
];

export default function MovieWatch() {
  const { tmdbId } = useParams();
  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Read default provider from settings
  const getSettings = () => storage.get<any>("miyoro_settings", null);
  const defaultProvider = getSettings()?.playback?.defaultServerMovies || "cinesrc";

  const [selectedProvider, setSelectedProvider] = useState<string>(defaultProvider);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getMovieDetails(parseInt(tmdbId, 10));
        setMovie(data);
        document.title = `Watching ${data.title} • Movies`;
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [tmdbId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
    };
    if (isServerDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isServerDropdownOpen]);

  const handleSelectProvider = (pid: string) => {
    setSelectedProvider(pid);
    setIsServerDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#09090b] flex flex-col p-4 md:p-8 pt-20 gap-6">
        <div className="shimmer-bone w-full aspect-video md:aspect-[21/9] rounded-2xl" />
        <div className="shimmer-bone w-1/3 h-8 rounded-lg" />
        <div className="shimmer-bone w-1/4 h-4 rounded-md" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white/50">
        Movie not found.
      </div>
    );
  }

  const handleProgressUpdate = (percentage: number, currentTime?: number, duration?: number) => {
    addToMovieHistory({
      tmdbId: movie.id,
      title: movie.title,
      provider: selectedProvider,
      progress: percentage,
      duration: duration || 0,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b] flex flex-col text-white pb-32 animate-fade-in relative z-10 p-4 md:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to={`/movies/movie/${movie.id}`}>
            <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white line-clamp-1">{movie.title}</h1>
            <span className="text-xs text-white/50">{movie.release_date?.substring(0, 4)} • {movie.runtime} min • Movies Universe</span>
          </div>
        </div>

        {/* Server Dropdown */}
        <div className="relative flex-shrink-0 z-[100]" ref={serverDropdownRef}>
          <button 
            onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
            className="px-4 py-2 rounded-full flex items-center justify-between gap-2 transition-colors font-semibold text-[13px] bg-white/[0.08] text-white hover:bg-white/[0.12]"
          >
            <Server className="w-4 h-4 text-rose-400" />
            <span>
              {MOVIE_PROVIDERS.find(p => p.id === selectedProvider)?.label || "Server"}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isServerDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 sm:left-auto sm:right-0 bottom-full sm:bottom-auto sm:top-full mb-2 sm:mb-0 sm:mt-2 w-32 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] origin-top overflow-hidden"
              >
                <div className="flex flex-col py-1">
                  {MOVIE_PROVIDERS.map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => handleSelectProvider(provider.id)}
                      className={`px-4 py-2.5 text-left hover:bg-white/10 transition-colors cursor-pointer ${selectedProvider === provider.id ? "bg-white/5 text-white" : "text-white/60 hover:text-white"}`}
                    >
                      <span className="text-[13px] font-semibold">{provider.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Player container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
        <VideoPlayer
          animeId={movie.id}
          tmdbId={movie.id}
          episodeNumber={1}
          seasonNumber={1}
          animeTitle={movie.title}
          onProgressUpdate={handleProgressUpdate}
          selectedProvider={selectedProvider}
          mediaType="movie"
          onNextEpisode={() => {}}
          onProviderChange={handleSelectProvider}
          isAnime={false}
        />
      </div>
    </div>
  );
}
