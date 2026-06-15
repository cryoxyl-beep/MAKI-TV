import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TMDBTVDetails, TMDBSeasonDetails, getTVDetails, getTVSeasonDetails, TMDB_IMAGE_BASE_URL_W500 } from "../../services/tmdb";
import { addToSeriesHistory, storage, getUnifiedHistory } from "../../utils";
import Header from "../Header";
import VideoPlayer from "../VideoPlayer";
import SkeletonLoader from "../SkeletonLoader";
import LazyImage from "../LazyImage";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { Play, ChevronLeft, ChevronRight, ChevronDown, Grid, List, Search, Info, Bookmark, Clock, Flag } from "lucide-react";
import { useSeriesData } from "../../hooks/useSeriesData";

const SERIES_PROVIDERS = [
  { id: "vidfast", label: "Matsuri" },
  { id: "movies111", label: "Onigiri" },
  { id: "cinesrc", label: "Taberu" }
];

export default function SeriesWatch() {
  const { tmdbId, season, episode } = useParams();
  const navigate = useNavigate();
  const { isInLibrary, toggleLibrary, isInWatchLater, toggleWatchLater } = useSeriesData();
  const seasonNum = parseInt(season || "1", 10);
  const episodeNum = parseInt(episode || "1", 10);

  const [series, setSeries] = useState<TMDBTVDetails | null>(null);
  const [seasonDetails, setSeasonDetails] = useState<TMDBSeasonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  const getSettings = () => storage.get<any>("miyoro_settings", null);
  const defaultProvider = getSettings()?.playback?.defaultServerSeries || "vidfast";
  const [selectedProvider, setSelectedProvider] = useState<string>(defaultProvider);
  
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false);
  const [isEpisodeDropdownOpen, setIsEpisodeDropdownOpen] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const episodeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tmdbId, season, episode]);

  const handleToggleBookmark = async () => {
    if (series) {
      await toggleLibrary(series as any);
    }
  };

  const handleToggleWatchLater = async () => {
    if (series) {
      await toggleWatchLater(series as any);
    }
  };

  useEffect(() => {
    const fetchSeries = async () => {
      if (!tmdbId) return;
      try {
        setLoading(true);
        const data = await getTVDetails(parseInt(tmdbId, 10));
        setSeries(data);
        document.title = `${data.name} S${seasonNum}E${episodeNum} - Miyoro`;
      } catch (error) {
        console.error("Failed to fetch series details:", error);
      }
    };
    fetchSeries();
  }, [tmdbId]);

  useEffect(() => {
    const fetchSeason = async () => {
      if (!tmdbId || !seasonNum) return;
      try {
        const sData = await getTVSeasonDetails(parseInt(tmdbId, 10), seasonNum);
        setSeasonDetails(sData);
        if (sData.episodes && sData.episodes.length > 24) {
          setViewMode("grid");
        } else {
          setViewMode("list");
        }
      } catch (error) {
        console.error("Failed to fetch season details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeason();
  }, [tmdbId, seasonNum]);

  useEffect(() => {
    if (!series) return;
    
    // Initial history write to register series watcher immediately
    const history = getUnifiedHistory();
    const existing = history.find((h: any) => 
      h.type === "series" && 
      (h.id === series.id || h.tmdbId === series.id) && 
      h.seasonNumber === seasonNum && 
      h.episodeNumber === episodeNum
    );
    const progress = existing ? existing.progress : 0;
    const duration = (existing && typeof existing.duration === "number") ? existing.duration : 0;
    const currentEp = seasonDetails?.episodes.find(e => e.episode_number === episodeNum);
    const resolvedThumbnail = currentEp?.still_path 
      ? `${TMDB_IMAGE_BASE_URL_W500}${currentEp.still_path}` 
      : undefined;

    addToSeriesHistory({
      tmdbId: series.id,
      title: series.name,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      provider: selectedProvider,
      progress,
      duration,
      posterPath: series.poster_path,
      backdropPath: series.backdrop_path,
      thumbnailUrl: resolvedThumbnail
    });
  }, [series, seasonDetails, seasonNum, episodeNum, selectedProvider]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (serverDropdownRef.current && !serverDropdownRef.current.contains(event.target as Node)) {
        setIsServerDropdownOpen(false);
      }
      if (episodeDropdownRef.current && !episodeDropdownRef.current.contains(event.target as Node)) {
        setIsEpisodeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProvider = (pid: string) => {
    setSelectedProvider(pid);
    storage.update("miyoro_settings", (prev: any) => ({ ...prev, playback: { ...prev?.playback, defaultServerSeries: pid } }), {});
    setIsServerDropdownOpen(false);
  };

  const handleNextEpisode = () => {
    if (!series || !seasonDetails) return;
    if (episodeNum < seasonDetails.episodes.length) {
      navigate(`/series/watch/${series.id}/${seasonNum}/${episodeNum + 1}`);
    } else {
      const nextSeasonData = series.seasons.find(s => s.season_number === seasonNum + 1);
      if (nextSeasonData && nextSeasonData.episode_count > 0) {
        navigate(`/series/watch/${series.id}/${seasonNum + 1}/1`);
      }
    }
  };

  const handlePrevEpisode = () => {
    if (episodeNum > 1) {
      navigate(`/series/watch/${series?.id}/${seasonNum}/${episodeNum - 1}`);
    }
  };

  const handleProgressUpdate = (percentage: number, currentTime?: number, duration?: number) => {
    if (!series) return;
    const currentEp = seasonDetails?.episodes.find(e => e.episode_number === episodeNum);
    const resolvedThumbnail = currentEp?.still_path 
      ? `${TMDB_IMAGE_BASE_URL_W500}${currentEp.still_path}` 
      : undefined;

    addToSeriesHistory({
      tmdbId: series.id,
      title: series.name,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      provider: selectedProvider,
      progress: percentage,
      duration: duration || 0,
      posterPath: series.poster_path,
      backdropPath: series.backdrop_path,
      thumbnailUrl: resolvedThumbnail
    });
  };

  if (loading || !series) {
    return <SkeletonLoader type="watch" />;
  }

  const episodes = seasonDetails?.episodes || [];
  const episodesToRender = episodes.filter(ep => {
    if (!episodeSearchQuery.trim()) return true;
    const query = episodeSearchQuery.toLowerCase();
    return ep.episode_number.toString().includes(query) || (ep.name && ep.name.toLowerCase().includes(query));
  });

  const currentEp = seasonDetails?.episodes.find(e => e.episode_number === episodeNum);
  const currentEpTitle = currentEp?.name || `Episode ${episodeNum}`;
  const accentColor = "#10b981";

  const hasNextEpisode = episodeNum < episodes.length || series.seasons.find(s => s.season_number === seasonNum + 1);
  const nextEpNum = episodeNum + 1;
  const upNextHeader = hasNextEpisode ? `Up Next - Episode ${nextEpNum}` : "Up Next";

  return (
    <div className="w-full bg-[#0f0f0f] pb-20 pt-14 select-none z-10 relative animate-fade-in text-[#f1f1f1] min-h-screen">
      <Header
        variant="slim"
        onSearch={() => navigate("/series")}
        onNavigateHome={() => navigate("/series")}
        breadcrumbs={[
          { label: "Home", onClick: () => navigate("/series"), color: accentColor },
          { label: series.name, onClick: () => navigate(`/series/show/${series.id}`), color: accentColor },
          { label: `S${seasonNum} E${episodeNum}` }
        ]}
      />

      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pt-6 flex flex-col lg:flex-row gap-6 lg:items-stretch">
        <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
          <VideoPlayer
            animeId={series.id}
            tmdbId={series.id}
            episodeNumber={episodeNum}
            seasonNumber={seasonNum}
            animeTitle={series.name}
            onProgressUpdate={handleProgressUpdate}
            selectedProvider={selectedProvider}
            mediaType="tv"
            onNextEpisode={handleNextEpisode}
            onProviderChange={handleSelectProvider}
            isAnime={false}
          />
        </div>

        <div className="w-full lg:w-[29%] min-w-0 flex flex-col bg-[#121214] border border-white/5 rounded-2xl p-4 overflow-hidden min-h-[400px] lg:min-h-0">
          <div className="flex flex-col pb-3 border-b border-white/[0.05] gap-2">
            <h3 className="text-white text-[15px] font-bold font-sans tracking-tight">
              {upNextHeader}
            </h3>
            <p className="text-white/50 text-[13px] truncate">
              Playing - Season {seasonNum} Ep {episodeNum} - {series.name}
            </p>
            
            <div className="flex items-center w-full gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search Episode"
                  className="w-full bg-white/5 hover:bg-white/10 border border-transparent focus:border-white/20 outline-none text-[13px] text-white rounded-lg pl-8 pr-3 py-1.5 transition-colors placeholder:text-white/40 font-medium"
                  value={episodeSearchQuery}
                  onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                 <div className="relative" ref={episodeDropdownRef}>
                   <button 
                     onClick={() => setIsEpisodeDropdownOpen(!isEpisodeDropdownOpen)}
                     className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 transition-colors cursor-pointer flex items-center justify-center w-8 h-8"
                   >
                     <List className="w-4 h-4" />
                   </button>
                   <AnimatePresence>
                     {isEpisodeDropdownOpen && (
                       <motion.div 
                         initial={{ opacity: 0, y: -5 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -5 }}
                         transition={{ duration: 0.15 }}
                         className="absolute top-full right-0 mt-2 max-h-64 overflow-y-auto w-32 bg-[#212121] border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] custom-scrollbar origin-top"
                       >
                         {series.seasons.filter(s => s.season_number > 0).map((s) => (
                           <button
                             key={s.id}
                             onClick={() => { navigate(`/series/watch/${series.id}/${s.season_number}/1`); setIsEpisodeDropdownOpen(false); setEpisodeSearchQuery(""); }}
                             className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer ${seasonNum === s.season_number ? "text-white bg-white/10" : "text-white/60"}`}
                           >
                             Season {s.season_number}
                           </button>
                         ))}
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
                 <button 
                   onClick={() => setViewMode(prev => prev === "list" ? "grid" : "list")}
                   className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 transition-colors cursor-pointer w-8 h-8 flex items-center justify-center"
                 >
                   <Grid className="w-4 h-4" />
                 </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 relative flex-1 min-h-0 mt-3">
             {viewMode === "grid" ? (
               <div className="absolute inset-0 pr-2">
                 <VirtuosoGrid
                   className="custom-scrollbar"
                   style={{ height: '100%', width: '100%' }}
                   data={episodesToRender}
                   overscan={50}
                   listClassName="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-4 pt-1 px-1"
                   itemContent={(index, ep) => {
                     const isActive = ep.episode_number === episodeNum;
                     return (
                       <button
                         key={ep.id}
                         onClick={() => navigate(`/series/watch/${series.id}/${seasonNum}/${ep.episode_number}`)}
                         className={`relative flex items-center justify-center h-10 w-full rounded-md text-sm font-semibold transition-all duration-200 ease-out border cursor-pointer select-none active:scale-95 ${
                           isActive ? "bg-[#10b981] text-white border-[#10b981] shadow-[0_4px_20px_rgba(16,185,129,0.4)] z-10" :
                           "bg-white/[0.03] text-white/70 border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10 hover:-translate-y-0.5 hover:shadow-md hover:brightness-110"
                         }`}
                       >
                         {ep.episode_number}
                       </button>
                     );
                   }}
                 />
               </div>
             ) : (
               <div className="absolute inset-0 pr-2">
                 <Virtuoso
                   className="custom-scrollbar"
                   style={{ height: '100%', width: '100%' }}
                   data={episodesToRender}
                   overscan={20}
                   itemContent={(index, ep) => {
                     const isActive = ep.episode_number === episodeNum;
                     return (
                       <div className="pb-2 transform-gpu will-change-transform">
                         <div
                           onClick={() => navigate(`/series/watch/${series.id}/${seasonNum}/${ep.episode_number}`)}
                           className={`flex flex-row gap-3 p-2 rounded-lg cursor-pointer transition-colors group relative border border-transparent ${
                             isActive ? "bg-white/10" : "hover:bg-white/5"
                           }`}
                         >
                           <div className="relative w-[120px] aspect-video bg-[#212121] rounded-md overflow-hidden flex-shrink-0">
                             {ep.still_path ? (
                               <LazyImage
                                 src={`${TMDB_IMAGE_BASE_URL_W500}${ep.still_path}`}
                                 alt={ep.name}
                                 className={`w-full h-full object-cover ${isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100 transition-opacity"}`}
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-[10px] text-white/20">No Image</div>
                             )}
                             {isActive && (
                               <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                                 <Play className="w-8 h-8 text-white drop-shadow-md" />
                               </div>
                             )}
                             <div className="absolute bottom-1 right-1 bg-[#121212]/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[11px] font-bold text-white tracking-wider flex items-center">
                               Ep {ep.episode_number}
                             </div>
                           </div>

                           <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                             <h4 className={`text-[14px] font-bold leading-tight line-clamp-2 ${isActive ? "text-white" : "text-white/90 group-hover:text-white"}`}>
                                {ep.name || `Episode ${ep.episode_number}`}
                             </h4>
                             <div className="text-[12px] text-white/50 font-medium mt-1 inline-flex items-center gap-1.5 flex-wrap">
                               <span>{ep.air_date ? new Date(ep.air_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Ep ${ep.episode_number}`}</span>
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                   }}
                 />
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-4 lg:px-6 pb-20 flex flex-col lg:flex-row gap-6 items-start mt-6">
        <div className="w-full lg:w-[71%] min-w-0 flex flex-col">
          <div className="flex items-center justify-between mt-1 text-sm flex-wrap gap-4 select-none pb-2 border-b border-white/[0.05]">
            <div className="flex items-center gap-6"></div>
            <div className="flex items-center gap-4 ml-auto">
              <button
                onClick={handlePrevEpisode}
                disabled={episodeNum <= 1}
                className={`text-xs font-semibold uppercase tracking-widest flex items-center gap-1 ${episodeNum <= 1 ? "text-white/20 cursor-not-allowed" : "text-white/60 hover:text-white cursor-pointer transition-colors"}`}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-white/40 text-xs font-semibold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                Episode {episodeNum} / {episodes.length}
              </span>
              <button
                onClick={handleNextEpisode}
                disabled={!hasNextEpisode}
                className={`text-xs font-semibold uppercase tracking-widest flex items-center gap-1 ${!hasNextEpisode ? "text-white/20 cursor-not-allowed" : "text-white/60 hover:text-white cursor-pointer transition-colors"}`}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 pb-8 w-full min-w-0">
            <div 
              className="border text-[13px] font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-300"
              style={{ backgroundColor: `${accentColor}12`, borderColor: `${accentColor}33`, color: accentColor }}
            >
              <Info className="w-4.5 h-4.5 shrink-0" />
              <span>If the current server doesn't work, feel free to try the other available servers.</span>
            </div>

            <h1 className="text-white text-xl sm:text-[22px] font-bold font-sans tracking-tight mt-1">
              {currentEpTitle || `Episode ${episodeNum}`}
            </h1>

            <div className="flex flex-col xl:flex-row xl:items-center justify-between py-1 gap-4">
              <div className="flex items-center gap-4">
                <div 
                  onClick={() => navigate(`/series/show/${series.id}`)}
                  className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-black/40 border border-white/5 cursor-pointer"
                >
                  {series.poster_path ? (
                    <LazyImage src={`${TMDB_IMAGE_BASE_URL_W500}${series.poster_path}`} alt={series.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  ) : <div className="w-full h-full bg-white/10" />}
                </div>
                
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <h3 
                      onClick={() => navigate(`/series/show/${series.id}`)}
                      className="text-white text-[16px] font-semibold truncate max-w-[220px] sm:max-w-[320px] cursor-pointer hover:text-white/80 transition-colors"
                    >
                      {series.name}
                    </h3>

                    <button 
                       onClick={handleToggleBookmark}
                       className="p-1.5 text-white/50 hover:text-white hover:scale-110 active:scale-95 transition-all duration-150"
                       title={isInLibrary(series.id) ? "Remove Bookmark" : "Bookmark Series"}
                    >
                      <Bookmark className="w-4.5 h-4.5" fill={isInLibrary(series.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap">
                <div className="relative flex-shrink-0 z-[100]" ref={serverDropdownRef}>
                  <button 
                    onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                    className="px-4 py-2 rounded-full flex items-center justify-between gap-2 transition-colors font-semibold text-[13px] bg-white/[0.08] text-white hover:bg-white/[0.12]"
                  >
                    <span>{SERIES_PROVIDERS.find(p => p.id === selectedProvider)?.label || "Server"}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isServerDropdownOpen ? 'rotate-180' : ''}`} />
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
                
                <button 
                  onClick={handleToggleWatchLater} 
                  className={`flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                    isInWatchLater(series.id) ? "bg-white text-black hover:bg-gray-200" : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
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
                {currentEp?.overview || "No description available."}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[29%] min-w-0 flex flex-col mt-6 lg:mt-0">
          <h2 className="text-white text-[15px] font-bold font-sans tracking-tight mb-4">Suggested</h2>
          <div className="flex flex-col gap-3">
            {series.recommendations?.results?.slice(0, 5).map(rec => (
              <div 
                key={rec.id}
                onClick={() => navigate(`/series/show/${rec.id}`)}
                className="group relative h-24 rounded-xl overflow-hidden cursor-pointer"
              >
                <LazyImage
                   src={rec.backdrop_path ? `${TMDB_IMAGE_BASE_URL_W500}${rec.backdrop_path}` : ""}
                   alt={rec.name}
                   className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.8] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-colors" />
                <div className="absolute inset-0 flex flex-col justify-center px-4">
                  <h4 className="text-white font-bold text-sm line-clamp-1 tracking-wide">{rec.name}</h4>
                  <p className="text-white/50 text-xs font-semibold mt-1 uppercase tracking-wider">
                    {rec.first_air_date?.substring(0, 4)} • Series
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
