import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Tv } from "lucide-react";
import { TMDBTVDetails, getTVDetails, TMDB_IMAGE_BASE_URL } from "../../services/tmdb";
import LazyImage from "../LazyImage";

export default function SeriesWatch() {
  const { tmdbId, season, episode } = useParams();
  const [series, setSeries] = useState<TMDBTVDetails | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/series/show/${series.id}`}>
          <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-white">{series.name}</h1>
          <span className="text-xs text-white/50">Season {season} • Episode {episode} • Series Universe</span>
        </div>
      </div>

      {/* Placeholder Player container */}
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center p-8">
          
          {series.backdrop_path && (
            <div className="absolute inset-0 z-0">
               <LazyImage
                 src={`${TMDB_IMAGE_BASE_URL}${series.backdrop_path}`}
                 alt="Backdrop"
                 className="w-full h-full object-cover opacity-20 blur-md scale-105"
               />
            </div>
          )}

          <div className="relative z-10 flex flex-col items-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center text-emerald-400">
               <Tv className="w-8 h-8" />
             </div>
             <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Streaming Integration Pending</h2>
             <p className="text-sm md:text-base text-white/50 max-w-lg">
               The series streaming feature is currently under construction. Future updates will bring seamless player integrations based on the TMDB ID ({series.id}), Season ({season}), and Episode ({episode}).
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
