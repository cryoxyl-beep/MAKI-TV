import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { X, Search, Loader2 } from "lucide-react";
import { searchMovies, searchTV, TMDB_IMAGE_BASE_URL_W500 } from "../services/tmdb";
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
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Simple debounce for search
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
        setResults(data.results.slice(0, 10));
      } else if (tab === 'tv') {
        const data = await searchTV(q);
        setResults(data.results.slice(0, 10));
      } else if (tab === 'anime') {
        // anilist search
        const data = await fetchAnimeFeed(`search:"${q}"`, "", 1);
        setResults(data.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (item: any) => {
    const isAnime = tab === 'anime';
    const id = isAnime ? item.id : item.id;
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
      onClose(); // close after adding
    } catch (e) {
      console.error("Failed to add title", e);
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0d0d11] border border-white/10 rounded-3xl shadow-2xl flex flex-col h-[80vh] max-h-[700px] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center gap-4 relative">
          <Search className="w-5 h-5 text-white/40 absolute left-8 md:left-10" />
          <input 
            type="text"
            placeholder={`Search ${tab === 'movie' ? 'movies' : tab === 'tv' ? 'TV shows' : 'anime'}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-full py-3 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-[#ff6b35] transition-colors"
            autoFocus
          />
          <button 
            onClick={onClose}
            className="absolute right-6 md:right-8 p-2 text-white/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 md:px-6 pt-4 border-b border-white/5 gap-6">
          {(['movie', 'tv', 'anime'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setQuery(""); setResults([]); }}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${
                tab === t ? "text-[#ff6b35]" : "text-white/40 hover:text-white/80"
              }`}
            >
              {t === 'tv' ? 'Series' : t}
              {tab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6b35] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading && results.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#ff6b35]" /></div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-3">
              {results.map(item => {
                const isAnime = tab === 'anime';
                const id = item.id;
                const boxdId = `${tab}_${id}`;
                const title = isAnime ? (item.title?.english || item.title?.romaji) : (item.title || item.name);
                const year = isAnime ? item.seasonYear : (item.release_date || item.first_air_date)?.substring(0, 4);
                const poster = isAnime 
                  ? (item.coverImage?.medium || item.coverImage?.large) 
                  : (item.poster_path ? `${TMDB_IMAGE_BASE_URL_W500}${item.poster_path}` : null);
                
                return (
                  <div key={id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                    <div className="w-12 h-16 rounded-md bg-white/5 overflow-hidden flex-shrink-0">
                      {poster ? (
                        <img src={poster} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">No Img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate">{title}</h4>
                      <p className="text-sm text-white/40">{year}</p>
                    </div>
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={addingId === boxdId}
                      className="px-4 py-1.5 bg-white/10 hover:bg-[#ff6b35] text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      {addingId === boxdId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : query.length > 2 ? (
            <div className="text-center py-10 text-white/40">No results found.</div>
          ) : (
            <div className="text-center py-10 text-white/20">Type to search...</div>
          )}
        </div>
        
      </div>
    </div>
  );
}
