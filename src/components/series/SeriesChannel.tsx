import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Plus, Star, Calendar, Info, Layers, Tv } from "lucide-react";
import { TMDBTVDetails, TMDBSeasonDetails, getTVDetails, getTVSeasonDetails, TMDB_IMAGE_BASE_URL, TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import LazyImage from "../LazyImage";
import SeriesCard from "./SeriesCard";

export default function SeriesChannel() {
  const { tmdbId } = useParams();
  const [series, setSeries] = useState<TMDBTVDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonDetails, setSeasonDetails] = useState<TMDBSeasonDetails | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    const fetchSeries = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getTVDetails(parseInt(tmdbId, 10));
        setSeries(data);
        document.title = `${data.name} • Series`;
        
        // Find the first season that actually has episodes
        const initialSeason = data.seasons.find(s => s.season_number > 0) || data.seasons[0];
        if (initialSeason) {
            setSelectedSeason(initialSeason.season_number);
        }
      } catch (error) {
        console.error("Failed to fetch series details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, [tmdbId]);

  useEffect(() => {
     const fetchSeason = async () => {
        if (!tmdbId || selectedSeason === null) return;
        try {
            setSeasonLoading(true);
            const data = await getTVSeasonDetails(parseInt(tmdbId, 10), selectedSeason);
            setSeasonDetails(data);
        } catch (error) {
            console.error("Failed to fetch season details:", error);
        } finally {
            setSeasonLoading(false);
        }
     };
     fetchSeason();
  }, [tmdbId, selectedSeason]);

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

  if (!series) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <Info className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Series Not Found</h2>
        <p className="text-white/50">The TV show you requested could not be found or TMDB is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center pb-32 animate-fade-in text-white min-h-screen">
      <div className="w-full max-w-[2000px] flex flex-col">
        {/* Cinematic Backdrop Hero */}
        <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[#09090b] select-none">
          {series.backdrop_path ? (
            <img
              src={`${TMDB_IMAGE_BASE_URL}${series.backdrop_path}`}
              alt={`${series.name} Backdrop`}
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
                src={series.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${series.poster_path}` : ""}
                alt={`${series.name} Poster`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            {/* Quick Actions (Desktop) */}
            <div className="mt-6 flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 font-bold rounded-xl transition-colors cursor-pointer text-white">
                <Plus className="w-5 h-5" />
                Add to Library
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col pt-8 md:pt-32 pb-8">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tight drop-shadow-xl mb-4 leading-tight">
              {series.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-2 text-sm md:text-base font-medium text-white/70">
              <div className="flex items-center gap-2 text-emerald-400">
                <Star className="w-5 h-5 fill-emerald-400 stroke-emerald-400" />
                <span className="text-white font-bold">{series.vote_average?.toFixed(1)}</span>
                <span className="text-white/40 text-xs">TMDB</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{series.first_air_date?.substring(0, 4)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>{series.number_of_seasons} Seasons</span>
              </div>
              <div className="flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  <span>{series.number_of_episodes} Episodes</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-6">
              {series.genres?.map(g => (
                <span key={g.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold tracking-wide text-white/80">
                  {g.name}
                </span>
              ))}
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold tracking-wide">
                  {series.status}
              </span>
            </div>

            {/* Quick Actions (Mobile) */}
            <div className="md:hidden flex flex-col sm:flex-row gap-3 mt-8">
              <button className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white/5 border border-white/10 font-bold rounded-xl transition-colors cursor-pointer">
                <Plus className="w-5 h-5" />
                Library
              </button>
            </div>

            <div className="mt-8 md:mt-10 max-w-3xl">
              <h3 className="text-lg font-bold text-white mb-3">Overview</h3>
              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                {series.overview || "No overview available for this series."}
              </p>
            </div>

            {/* Seasons & Episodes Section */}
            <div className="mt-12 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
                    <h3 className="text-2xl font-bold text-white tracking-tight">Episodes</h3>
                    
                    {/* Season Selector */}
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
                        {series.seasons.map(season => (
                            <button
                                key={season.id}
                                onClick={() => setSelectedSeason(season.season_number)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors border cursor-pointer ${
                                    selectedSeason === season.season_number 
                                    ? "bg-white text-black border-white" 
                                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                {season.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Episodes List */}
                {seasonLoading ? (
                    <div className="flex flex-col gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                           <div key={i} className="shimmer-bone w-full h-32 rounded-2xl" />
                        ))}
                    </div>
                ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {seasonDetails.episodes.map((episode) => (
                            <div key={episode.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all group">
                                <div className="w-full md:w-64 aspect-video rounded-xl bg-black/40 overflow-hidden relative shrink-0">
                                    {episode.still_path ? (
                                        <LazyImage 
                                            src={`${TMDB_IMAGE_BASE_URL_W500}${episode.still_path}`}
                                            alt={episode.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs text-center p-2">
                                            No Image Available
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                    <Link to={`/series/watch/${series.id}/${episode.season_number}/${episode.episode_number}`}>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg">
                                                <Play className="w-5 h-5 ml-1" />
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded border border-white/10 text-[10px] font-bold">
                                        EP {episode.episode_number}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center gap-2 flex-1">
                                    <div className="flex justify-between items-start gap-4">
                                        <h4 className="font-bold text-white md:text-lg leading-tight line-clamp-2">
                                            {episode.episode_number}. {episode.name}
                                        </h4>
                                        {episode.runtime && (
                                            <span className="text-xs font-semibold text-white/40 shrink-0 border border-white/10 px-2 py-1 rounded-md">
                                                {episode.runtime}m
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-white/40">{episode.air_date}</span>
                                    <p className="text-sm text-white/60 line-clamp-2 md:line-clamp-3 leading-relaxed mt-1">
                                        {episode.overview || "No overview available."}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-white/50 border border-white/5 rounded-3xl bg-white/[0.02]">
                        No episodes found for this season.
                    </div>
                )}
            </div>

            {/* Recommendations segment */}
            {series.recommendations && series.recommendations.results.length > 0 && (
                <div className="mt-16">
                    <h3 className="text-2xl font-bold text-white tracking-tight mb-6">More Like This</h3>
                    <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                        {series.recommendations.results.map(rec => (
                            <SeriesCard key={rec.id} series={rec} />
                        ))}
                    </div>
                </div>
            )}

            {/* Cast Segment */}
            {series.credits && series.credits.cast && series.credits.cast.length > 0 && (
              <div className="mt-12">
                <h3 className="text-lg font-bold text-white mb-6">Top Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                  {series.credits.cast.slice(0, 10).map((actor) => (
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
