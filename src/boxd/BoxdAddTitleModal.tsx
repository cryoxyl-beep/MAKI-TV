import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { X, Search, Loader2 } from "lucide-react";
import LazyImage from "../components/LazyImage";
import { searchMovies, searchTV, TMDB_IMAGE_BASE_URL_W500, getTrendingMovies, getTrendingTV } from "../services/tmdb";
import { fetchAnimeFeed } from "../services/anilist";
import { addTitle, BoxdTitle } from "../services/boxd";

interface BoxdAddTitleModalProps {
  groupId: string;
  user: User;
  onClose: () => void;
}

export default function BoxdAddTitleModal({ groupId, user, onClose }: BoxdAddTitleModalProps) {
  const [tab, setTab] = useState<'movie' | 'tv' | 'anime'>('movie');
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecs = async () => {
      setLoadingRecs(true);
      try {
        if (tab === 'movie') {
          const data = await getTrendingMovies();
          setRecommendations(data.results.slice(0, 12));
        } else if (tab === 'tv') {
          const data = await getTrendingTV();
          setRecommendations(data.results.slice(0, 12));
        } else if (tab === 'anime') {
          const data = await fetchAnimeFeed("TRENDING_DESC");
          setRecommendations(data.slice(0, 12));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRecs(false);
      }
    };
    if (query.trim().length <= 2) {
      fetchRecs();
    }
  }, [tab, query]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim().length > 2) {
        performSearch(query.trim());
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [query, tab]);

  const performSearch = async (q: string) => {
    setLoading(true);
    try {
      if (tab === 'movie') {
        const data = await searchMovies(q);
        setResults(data.results.slice(0, 12));
      } else if (tab === 'tv') {
        const data = await searchTV(q);
        setResults(data.results.slice(0, 12));
      } else if (tab === 'anime') {
        const data = await fetchAnimeFeed("", q, 1);
        setResults(data.slice(0, 12));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (item: any) => {
    const isAnime = tab === 'anime';
    const id = isAnime ? (item.idMal || item.id) : item.id;
    const boxdId = `${tab}_${id}`;
    
    setAddingId(boxdId);
    
    try {
      const newTitle: BoxdTitle = {
        id: boxdId,
        type: tab,
        externalId: id,
        title: isAnime ? (item.title?.english || item.title?.romaji || "Unknown Anime") : (item.title || item.name || "Unknown"),
        poster: isAnime 
          ? (item.coverImage?.extraLarge || item.coverImage?.large) 
          : (item.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${item.poster_path}` : ""),
        backdrop: isAnime
          ? (item.bannerImage || "")
          : (item.backdrop_path ? `${TMDB_IMAGE_BASE_URL_W500}${item.backdrop_path}` : ""),
        addedBy: user.uid,
        addedAt: null
      };
      
      await addTitle(groupId, newTitle);
      onClose();
    } catch (e) {
      console.error("Failed to add title", e);
      setAddingId(null);
    }
  };

  const displayList = results.length > 0 ? results : recommendations;
  const isLoading = loading || (query.length <= 2 && loadingRecs);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-300">
      <div className="w-full max-w-4xl bg-[#0a0a0c]/95 border border-white/10 rounded-3xl shadow-2xl flex flex-col h-[85vh] max-h-[800px] overflow-hidden relative">
        
        {/* Header & Search */}
        <div className="p-6 md:p-8 flex flex-col gap-6 relative z-10 border-b border-white/5 bg-[#0a0a0c]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight">Add to Boxd</h2>
            <button 
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative group">
            <Search className="w-6 h-6 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-white transition-colors" />
            <input 
              type="text"
              placeholder={`Search ${tab === 'movie' ? 'movies' : tab === 'tv' ? 'series' : 'anime'}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/10 transition-all duration-300"
              autoFocus
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(['movie', 'tv', 'anime'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setQuery(""); setResults([]); }}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  tab === t 
                    ? "bg-white text-black" 
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t === 'tv' ? 'Series' : t === 'movie' ? 'Movies' : 'Anime'}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 relative z-10">
          {isLoading && displayList.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl"></div>
              ))}
            </div>
          ) : displayList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
              {displayList.map(item => {
                const isAnime = tab === 'anime';
                const id = isAnime ? (item.idMal || item.id) : item.id;
                const boxdId = `${tab}_${id}`;
                const title = isAnime ? (item.title?.english || item.title?.romaji) : (item.title || item.name);
                const year = isAnime ? item.seasonYear : (item.release_date || item.first_air_date)?.substring(0, 4);
                const poster = isAnime 
                  ? (item.coverImage?.extraLarge || item.coverImage?.large) 
                  : (item.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${item.poster_path}` : null);
                
                return (
                  <div key={id} className="flex flex-col gap-3 group relative cursor-pointer" onClick={() => handleAdd(item)}>
                    <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-white/5 relative">
                      {poster ? (
                        <LazyImage 
                          src={poster} 
                          alt={title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-medium">No Image</div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        {addingId === boxdId ? (
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        ) : (
                          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-semibold text-sm border border-white/20">
                            Select
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm leading-tight line-clamp-2 group-hover:text-white/80 transition-colors">{title}</h4>
                      {year && <p className="text-xs text-white/50 mt-1">{year}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query.length > 2 ? (
            <div className="flex flex-col items-center justify-center h-full text-center pb-20">
              <Search className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/40 text-lg font-medium">No titles found for "{query}"</p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-center pb-20">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                 <Search className="w-8 h-8 text-white/20" />
               </div>
               <p className="text-white/40 text-lg font-medium">Search to add titles</p>
             </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
