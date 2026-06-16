import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, Plus, Star, Calendar, Info, Layers, Tv, Check } from "lucide-react";
import { TMDBTVDetails, TMDBSeasonDetails, getTVDetails, getTVSeasonDetails, TMDB_IMAGE_BASE_URL, TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import LazyImage from "../LazyImage";
import { storage } from "../../utils";
import { motion, AnimatePresence } from "framer-motion";
import SkeletonLoader from "../SkeletonLoader";
import { useSeriesData } from "../../hooks/useSeriesData";

export default function SeriesChannel() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();
  const { isInLibrary, toggleLibrary } = useSeriesData();
  const [series, setSeries] = useState<TMDBTVDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonDetails, setSeasonDetails] = useState<TMDBSeasonDetails | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchSeries = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getTVDetails(parseInt(tmdbId, 10));
        setSeries(data);
        document.title = `${data.name} - Miyoro`;
        
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
      <div className="w-full h-full min-h-screen animate-fade-in relative z-20">
        <SkeletonLoader type="channel" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-6 -mt-[56px]">
        <Info className="w-12 h-12 text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Series Not Found</h2>
        <p className="text-white/50">The TV show you requested could not be found or TMDB is unavailable.</p>
      </div>
    );
  }

  const subscribed = isInLibrary(series.id);

  return (
    <div className="relative z-10 w-full bg-[#09090b] min-h-screen select-none pb-20 font-sans group/page -mt-[56px]">
      
      {/* =============== HERO ATMOSPHERE =============== */}
      <div className="absolute top-0 left-0 right-0 h-[480px] z-0 overflow-hidden pointer-events-none">
        {series.backdrop_path ? (
          <LazyImage
            src={`${TMDB_IMAGE_BASE_URL}${series.backdrop_path}`}
            alt={series.name}
            className="w-full h-full object-cover opacity-20 object-top"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/50 to-transparent" />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
          
          {/* =============== LEFT COLUMN: POSTER & METADATA =============== */}
          <div className="w-full md:w-[220px] lg:w-[260px] flex-shrink-0 flex flex-col gap-6 relative">
            <div className="w-48 sm:w-full mx-auto md:mx-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-white/[0.05] border border-white/[0.1]">
                <LazyImage
                  src={series.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${series.poster_path}` : ""}
                  alt={series.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Sidebar Action Buttons */}
              <div className="mt-4 flex flex-col gap-2">
                {/* Reserved for actions */}
              </div>

              {/* Sidebar Metadata */}
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Format</h4>
                  <p className="text-white text-sm font-medium">TV Series</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Status</h4>
                  <p className="text-green-500 text-sm font-bold uppercase">{series.status}</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">First Aired</h4>
                  <p className="text-white text-sm font-medium">{series.first_air_date}</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Seasons</h4>
                  <p className="text-white text-sm font-medium">{series.number_of_seasons} Seasons</p>
                </div>
                <div>
                  <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Episodes</h4>
                  <p className="text-white text-sm font-medium">{series.number_of_episodes} Episodes</p>
                </div>
                {series.vote_average && series.vote_average > 0 && (
                  <div>
                    <h4 className="text-white/60 text-xs uppercase font-bold mb-1">Score</h4>
                    <p className="text-white text-sm font-medium flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      {series.vote_average.toFixed(1)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =============== RIGHT COLUMN: INFO & EPISODES =============== */}
          <div className="flex-1 min-w-0 flex flex-col">
            
            {/* Top info */}
            {series.first_air_date && (
              <div className="text-white/60 text-sm uppercase tracking-widest font-semibold mb-2">
                {series.first_air_date.substring(0, 4)}
              </div>
            )}
            
            {series.logo_path && !logoError ? (
              <motion.img
                src={series.logo_path}
                alt={series.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-h-[120px] w-auto object-contain mb-4 drop-shadow-2xl self-start"
                onError={() => setLogoError(true)}
              />
            ) : (
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                {series.name}
              </h1>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {series.genres?.map(g => (
                <span key={g.id} className="px-3 py-1 bg-white/[0.06] border border-white/[0.08] text-white/90 text-xs font-bold rounded">
                  {g.name}
                </span>
              ))}
            </div>

            {/* Main Action Buttons */}
            <div className="flex items-center gap-3 mb-6">
              <button 
                onClick={() => navigate(`/series/watch/${series.id}/${selectedSeason}/1`)}
                className="h-12 px-8 bg-white text-black hover:bg-gray-200 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-black mr-2.5" />
                <span className="font-bold tracking-wide">Play Now</span>
              </button>
              
              <button 
                onClick={async () => {
                  await toggleLibrary(series as any);
                }}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 flex items-center justify-center transition-all text-white active:scale-95 cursor-pointer"
                title={subscribed ? "Remove from Library" : "Add to Library"}
              >
                {subscribed ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>

            {/* Description */}
            <div className="mb-8 max-w-4xl">
              <p 
                className={`text-gray-300 text-sm md:text-base leading-relaxed font-sans ${descriptionExpanded ? "" : "line-clamp-3"}`}
                dangerouslySetInnerHTML={{ __html: series.overview || "No synopsis available." }}
              />
              {series.overview && series.overview.length > 200 && (
                <button 
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="text-white/50 hover:text-white mt-1.5 text-xs font-bold tracking-wider transition-colors uppercase cursor-pointer"
                >
                  {descriptionExpanded ? "Show Less" : "+ More"}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 sm:gap-8 border-b border-white/[0.08] mb-6 overflow-x-auto scrollbar-hide">
              <button className="pb-3 text-white text-sm sm:text-base font-bold border-b-2 border-white whitespace-nowrap">
                Episodes
              </button>
              <button className="pb-3 text-white/50 hover:text-white/80 text-sm sm:text-base font-semibold border-b-2 border-transparent transition-colors whitespace-nowrap">
                Characters
              </button>
              <button className="pb-3 text-white/50 hover:text-white/80 text-sm sm:text-base font-semibold border-b-2 border-transparent transition-colors whitespace-nowrap">
                Related
              </button>
              <button className="pb-3 text-white/50 hover:text-white/80 text-sm sm:text-base font-semibold border-b-2 border-transparent transition-colors whitespace-nowrap">
                More like this
              </button>
            </div>

            {/* Episodes Controls */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="bg-white/5 px-3 py-1.5 rounded text-xs font-bold text-white/70 tracking-wide">
                {series.number_of_episodes} Episodes
              </div>
              
              {series.seasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center bg-white/[0.02] rounded-lg p-1 border border-white/5">
                  {series.seasons.map(season => (
                    <button
                      key={season.id}
                      onClick={() => setSelectedSeason(season.season_number)}
                      className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-md transition-all ${
                        selectedSeason === season.season_number
                          ? "bg-white text-black shadow-sm" 
                          : "text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {season.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episode Grid */}
            {seasonLoading ? (
               <div className="py-20 flex justify-center w-full">
                 <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
               </div>
            ) : seasonDetails && seasonDetails.episodes && seasonDetails.episodes.length > 0 ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 pb-10">
                 {seasonDetails.episodes.map((episode, listIndex) => (
                   <motion.div
                     key={episode.id}
                     initial={{ opacity: 0, y: 16 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, amount: 0.1 }}
                     transition={{ duration: 0.4, ease: "easeOut", delay: Math.min(listIndex * 0.05, 0.3) }}
                     onClick={() => navigate(`/series/watch/${series.id}/${selectedSeason}/${episode.episode_number}`)}
                     className="group cursor-pointer flex flex-col gap-2 rounded-xl transition-all"
                   >
                     <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.05] group-hover:border-white/[0.2] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all">
                       {episode.still_path ? (
                         <LazyImage
                           src={`${TMDB_IMAGE_BASE_URL_W500}${episode.still_path}`}
                           alt={episode.name}
                           className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 pointer-events-none"
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">No Image</div>
                       )}
                       
                       {/* Gradient overlay for text */}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                       
                       {/* Play Icon hover effect */}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                         <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center transform scale-90 group-hover:scale-100 transition-all shadow-lg">
                           <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                         </div>
                       </div>

                       {/* Labels on thumbnail */}
                       <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-white text-black text-[10px] font-bold rounded uppercase">
                         Ep {episode.episode_number}
                       </div>
                       
                       {episode.runtime && (
                         <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white/90 text-[10px] font-bold rounded backdrop-blur-sm">
                           {episode.runtime}m
                         </div>
                       )}
                     </div>
                     
                     <div className="px-1 mt-0.5">
                       <h4 className="text-white/90 text-sm font-semibold tracking-tight leading-snug line-clamp-2 group-hover:text-white transition-colors">
                         {episode.name}
                       </h4>
                     </div>
                   </motion.div>
                 ))}
               </div>
            ) : (
               <div className="py-20 text-center text-white/50 w-full">
                 No episodes found for this season.
               </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
