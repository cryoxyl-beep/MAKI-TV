import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Tv, ChevronDown, Server } from "lucide-react";
import { TMDBTVDetails, getTVDetails, TMDB_IMAGE_BASE_URL } from "../../services/tmdb";
import { motion, AnimatePresence } from "motion/react";
import VideoPlayer from "../VideoPlayer";
import { addToSeriesHistory, storage } from "../../utils";

const SERIES_PROVIDERS = [
  { id: "cinesrc", label: "Taberu" },
  { id: "vidfast", label: "Matsuri" },
  { id: "movies111", label: "Onigiri" }
];

export default function SeriesWatch() {
  const { tmdbId, season, episode } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState<TMDBTVDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Read default provider from settings
  const getSettings = () => storage.get<any>("miyoro_settings", null);
  const defaultProvider = getSettings()?.playback?.defaultServerSeries || "cinesrc";

  const [selectedProvider, setSelectedProvider] = useState<string>(defaultProvider);
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const serverDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSeries = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getTVDetails(parseInt(tmdbId, 10));
        setSeries(data);
        document.title = `Watching ${data.name} S${season}E${episode} • Series`;
      } catch (error) {
        console.error("Failed to fetch series details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, [tmdbId, season, episode]);

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

  const handleNextEpisode = () => {
    if (!series || !season || !episode) return;
    const currentSeasonNum = parseInt(season, 10);
    const currentEpisodeNum = parseInt(episode, 10);

    const currentSeasonData = series.seasons.find(s => s.season_number === currentSeasonNum);
    
    if (currentSeasonData && currentEpisodeNum < currentSeasonData.episode_count) {
      // Go to next episode in same season
      navigate(`/series/watch/${series.id}/${currentSeasonNum}/${currentEpisodeNum + 1}`);
    } else {
      // Try to go to next season episode 1
      const nextSeasonData = series.seasons.find(s => s.season_number === currentSeasonNum + 1);
      if (nextSeasonData && nextSeasonData.episode_count > 0) {
        navigate(`/series/watch/${series.id}/${currentSeasonNum + 1}/1`);
      } else {
        // No more episodes
      }
    }
  };

  const handleProgressUpdate = (percentage: number, currentTime?: number, duration?: number) => {
    addToSeriesHistory({
      tmdbId: series!.id,
      title: series!.name,
      seasonNumber: parseInt(season || "1", 10),
      episodeNumber: parseInt(episode || "1", 10),
      provider: selectedProvider,
      progress: percentage,
      duration: duration || 0,
      posterPath: series!.poster_path,
      backdropPath: series!.backdrop_path
    });
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

  if (!series) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-white/50">
        Series not found.
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#09090b] flex flex-col text-white pb-32 animate-fade-in relative z-10 p-4 md:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link to={`/series/show/${series.id}`}>
            <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white line-clamp-1">{series.name}</h1>
            <span className="text-xs text-white/50">Season {season} • Episode {episode} • Series Universe</span>
          </div>
        </div>

        {/* Server Dropdown */}
        <div className="relative flex-shrink-0 z-[100]" ref={serverDropdownRef}>
          <button 
            onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
            className="px-4 py-2 rounded-full flex items-center justify-between gap-2 transition-colors font-semibold text-[13px] bg-white/[0.08] text-white hover:bg-white/[0.12]"
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>
              {SERIES_PROVIDERS.find(p => p.id === selectedProvider)?.label || "Server"}
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
                  {SERIES_PROVIDERS.map(provider => (
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
          animeId={series.id}
          tmdbId={series.id}
          episodeNumber={parseInt(episode || "1", 10)}
          seasonNumber={parseInt(season || "1", 10)}
          animeTitle={series.name}
          onProgressUpdate={handleProgressUpdate}
          selectedProvider={selectedProvider}
          mediaType="tv"
          onNextEpisode={handleNextEpisode}
          onProviderChange={handleSelectProvider}
          isAnime={false}
        />
      </div>
    </div>
  );
}
