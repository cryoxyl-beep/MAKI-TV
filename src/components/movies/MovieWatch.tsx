import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TMDBMovieDetails,
  getMovieDetails,
  TMDB_IMAGE_BASE_URL_W500,
} from "../../services/tmdb";
import { addToMovieHistory, storage, getUnifiedHistory } from "../../utils";
import Header from "../Header";
import VideoPlayer from "../VideoPlayer";
import SkeletonLoader from "../SkeletonLoader";
import LazyImage from "../LazyImage";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Info, Bookmark, Clock, Flag } from "lucide-react";
import { useMoviesData } from "../../hooks/useMoviesData";

const MOVIE_PROVIDERS = [
  { id: "vidfast", label: "Matsuri" },
  { id: "movies111", label: "Onigiri" },
  { id: "cinesrc", label: "Taberu" },
];

export default function MovieWatch() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const { isInLibrary, toggleLibrary, isInWatchLater, toggleWatchLater } = useMoviesData();

  const [movie, setMovie] = useState<TMDBMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const getSettings = () => storage.get<any>("miyoro_settings", null);
  const defaultProvider =
    getSettings()?.playback?.defaultServerMovies || "vidfast";
  const [selectedProvider, setSelectedProvider] =
    useState<string>(defaultProvider);

  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tmdbId]);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getMovieDetails(parseInt(tmdbId, 10));
        setMovie(data);
        document.title = `${data.title} - Miyoro`;
        
        // Initial history write to register movie watcher immediately
        const history = getUnifiedHistory();
        const existing = history.find((h: any) => h.type === "movie" && (h.id === data.id || h.tmdbId === data.id));
        const progress = existing ? existing.progress : 0;
        const duration = (existing && typeof existing.duration === "number") ? existing.duration : 0;
        addToMovieHistory({
          tmdbId: data.id,
          title: data.title,
          provider: selectedProvider,
          progress,
          duration,
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
        });
      } catch (error) {
        console.error("Failed to fetch movie details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [tmdbId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        serverDropdownRef.current &&
        !serverDropdownRef.current.contains(event.target as Node)
      ) {
        setIsServerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleBookmark = async () => {
    if (movie) {
      await toggleLibrary(movie as any);
    }
  };

  const handleToggleWatchLater = async () => {
    if (movie) {
      await toggleWatchLater(movie as any);
    }
  };

  const handleSelectProvider = (pid: string) => {
    setSelectedProvider(pid);
    storage.update("miyoro_settings", (prev: any) => ({
      ...prev,
      playback: { ...prev?.playback, defaultServerMovies: pid },
    }), {});
    setIsServerDropdownOpen(false);
  };

  const handleProgressUpdate = (
    percentage: number,
    currentTime?: number,
    duration?: number,
  ) => {
    if (!movie) return;
    addToMovieHistory({
      tmdbId: movie.id,
      title: movie.title,
      provider: selectedProvider,
      progress: percentage,
      duration: duration || 0,
      posterPath: movie.poster_path,
      backdropPath: movie.backdrop_path,
    });
  };

  if (loading || !movie) {
    return <SkeletonLoader type="watch" />;
  }

  const accentColor = "#f43f5e"; // Rose

  return (
    <div className="w-full bg-[#0f0f0f] pb-20 pt-14 select-none z-10 relative animate-fade-in text-[#f1f1f1] min-h-screen">
      <Header
        variant="slim"
        onSearch={() => navigate("/movies")}
        onNavigateHome={() => navigate("/movies")}
        breadcrumbs={[
          {
            label: "Movies",
            onClick: () => navigate("/movies"),
            color: accentColor,
          },
          {
            label: movie.title,
            onClick: () => navigate(`/movies/movie/${movie.id}`),
            color: accentColor,
          },
          { label: "Watch" },
        ]}
      />

      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pt-6 flex flex-col lg:flex-row gap-6 lg:items-start pb-20">
        <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
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

          <div className="mt-4 flex flex-col gap-3 pb-8 w-full min-w-0">
            <div
              className="border text-[13px] font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-300"
              style={{
                backgroundColor: `${accentColor}12`,
                borderColor: `${accentColor}33`,
                color: accentColor,
              }}
            >
              <Info className="w-4.5 h-4.5 shrink-0" />
              <span>
                If the current server doesn't work, feel free to try the other
                available servers.
              </span>
            </div>

            <h1 className="text-white text-xl sm:text-[22px] font-bold font-sans tracking-tight mt-1">
              {movie.title}
            </h1>

            <div className="flex flex-col xl:flex-row xl:items-center justify-between py-1 gap-4">
              <div className="flex items-center gap-4">
                <div
                  onClick={() => navigate(`/movies/movie/${movie.id}`)}
                  className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-black/40 border border-white/5 cursor-pointer"
                >
                  {movie.poster_path ? (
                    <LazyImage
                      src={`${TMDB_IMAGE_BASE_URL_W500}${movie.poster_path}`}
                      alt={movie.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                </div>

                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => navigate(`/movies/movie/${movie.id}`)}
                      className="text-white text-[16px] font-semibold truncate max-w-[220px] sm:max-w-[320px] cursor-pointer hover:text-white/80 transition-colors"
                    >
                      {movie.title}
                    </h3>

                    <button
                      onClick={handleToggleBookmark}
                      className="p-1.5 text-white/50 hover:text-white hover:scale-110 active:scale-95 transition-all duration-150"
                      title={
                        movie && isInLibrary(movie.id) ? "Remove Bookmark" : "Bookmark Movie"
                      }
                    >
                      <Bookmark
                        className="w-4.5 h-4.5"
                        fill={movie && isInLibrary(movie.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
                <div
                  className="relative flex-shrink-0 z-[100]"
                  ref={serverDropdownRef}
                >
                  <button
                    onClick={() =>
                      setIsServerDropdownOpen(!isServerDropdownOpen)
                    }
                    className="px-4 py-2 rounded-full flex items-center justify-between gap-2 transition-colors font-semibold text-[13px] bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  >
                    <span>
                      {MOVIE_PROVIDERS.find((p) => p.id === selectedProvider)
                        ?.label || "Server"}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ${isServerDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {isServerDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-32 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] origin-top overflow-hidden"
                      >
                        <div className="flex flex-col py-1">
                          {MOVIE_PROVIDERS.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => handleSelectProvider(provider.id)}
                              className={`px-4 py-2.5 text-left hover:bg-white/10 transition-colors cursor-pointer ${selectedProvider === provider.id ? "bg-white/5 text-white" : "text-white/60 hover:text-white"}`}
                            >
                              <span className="text-[13px] font-semibold">
                                {provider.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleToggleWatchLater}
                  className={`flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                    isInWatchLater(movie.id)
                      ? "bg-white text-black hover:bg-gray-200"
                      : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  }`}
                >
                  <Clock className="w-4 h-4" fill="none" />
                  Watch Later
                </button>

                <button className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap">
                  <Flag className="w-4 h-4" /> Report
                </button>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mt-2">
              <p className="text-white/70 text-[13px] font-medium leading-relaxed font-sans">
                {movie.overview || "No description available."}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[29%] min-w-0 flex flex-col bg-[#121214] border border-white/5 rounded-2xl p-4 overflow-hidden min-h-[400px] lg:min-h-0">
          <div className="flex flex-col pb-3 border-b border-white/[0.05] gap-2 mb-3">
            <h3 className="text-white text-[15px] font-bold font-sans tracking-tight">
              Suggested
            </h3>
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {movie.recommendations?.results?.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                onClick={() => navigate(`/movies/watch/${rec.id}`)}
                className="group relative h-28 rounded-xl overflow-hidden cursor-pointer flex-shrink-0"
              >
                <LazyImage
                  src={
                    rec.backdrop_path
                      ? `${TMDB_IMAGE_BASE_URL_W500}${rec.backdrop_path}`
                      : ""
                  }
                  alt={rec.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.8] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-colors" />
                <div className="absolute inset-0 flex flex-col justify-center px-4">
                  <h4 className="text-white font-bold text-sm line-clamp-1 tracking-wide">
                    {rec.title}
                  </h4>
                  <p className="text-white/50 text-xs font-semibold mt-1 uppercase tracking-wider">
                    {rec.release_date?.substring(0, 4)} • Movie
                  </p>
                </div>
              </div>
            ))}
            {(!movie.recommendations ||
              !movie.recommendations.results ||
              movie.recommendations.results.length === 0) && (
              <div className="py-10 text-center text-white/40 text-sm">
                No suggested movies.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
