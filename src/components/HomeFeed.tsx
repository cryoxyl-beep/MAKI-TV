/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { fetchAnimeFeed } from "../services/anilist";
import { AniListAnime } from "../types";
import AnimeCard from "./AnimeCard";
import CategoryChips from "./CategoryChips";
import SkeletonLoader from "./SkeletonLoader";
import { RefreshCw, Play } from "lucide-react";


interface HomeFeedProps {
  onSelectAnime: (id: number) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export default function HomeFeed({ onSelectAnime, searchQuery = "", onClearSearch }: HomeFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [animeList, setAnimeList] = useState<AniListAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load feed content whenever category or search query changes
  useEffect(() => {
    async function loadFeed() {
      setIsLoading(true);
      setError(null);
      try {
        // If searchQuery exists, prioritize search, but keep Category active if chosen
        const activeSearch = searchQuery ? searchQuery : undefined;
        const activeCategory = selectedCategory;
        const data = await fetchAnimeFeed(activeCategory, activeSearch);
        setAnimeList(data);
      } catch (err: any) {
        setError(err.message || "Failed to load feed");
      } finally {
        setIsLoading(false);
      }
    }
    loadFeed();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="w-full min-h-screen bg-transparent pb-20">
      
      {/* Category Horizontal scroll chips line (hidden when search query is active to mirror Youtube search behaviors) */}
      {!searchQuery && (
        <CategoryChips
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
          }}
        />
      )}

      {/* Hero Banner only on Desktop Homepage for absolute premium feel, hidden when searching */}
      {!searchQuery && selectedCategory === "All" && animeList.length > 0 && (() => {
        const recommendedAnime = animeList[0];
        const animeTitle = recommendedAnime.title.english || recommendedAnime.title.romaji;
        
        return (
          <div className="px-4 md:px-6 mb-6">
            <div 
              onClick={() => onSelectAnime(recommendedAnime.id)}
              className="w-full h-48 md:h-72 rounded-2xl overflow-hidden relative group cursor-pointer border border-white/[0.08] shadow-2xl shadow-black/50"
            >
              {/* Banner image with overlay covers */}
              <img 
                src={recommendedAnime.bannerImage || recommendedAnime.coverImage.extraLarge} 
                alt="Hero Feed Anime"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-75"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8">
                <span className="text-xs md:text-sm uppercase text-[#ff6b35] font-bold tracking-widest mb-1.5 flex items-center gap-1.5 leading-none">
                  <span className="w-2 h-2 rounded-full bg-[#ff6b35] animate-ping" />
                  #1 Recommended Today
                </span>
                
                <h2 className="text-white text-xl md:text-3xl font-extrabold tracking-tight font-sans drop-shadow leading-tight line-clamp-1 max-w-2xl group-hover:text-[#ff6b35] transition-colors mb-2">
                  {animeTitle}
                </h2>

                <div className="mt-4 flex items-center gap-3">
                  <button className="px-5 py-2 md:py-2.5 bg-[#ff6b35] hover:bg-[#ff7e4e] text-white text-xs md:text-sm font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-[#ff6b35]/20 cursor-pointer">
                    <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                    <span>Enter Channel</span>
                  </button>
                  <span className="text-xs text-gray-400 font-mono tracking-wider hidden md:block">
                    {recommendedAnime.genres?.slice(0, 3).join(" • ")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dynamic Header details when query is running */}
      {searchQuery && (
        <div className="px-4 md:px-6 pt-3 pb-4 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Search results for</span>
            <span className="text-white font-bold text-base bg-[#222] px-3 py-1 rounded-full">"{searchQuery}"</span>
          </div>
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className="text-xs text-[#ff6b35] hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Shimmer loaders if active */}
      {isLoading ? (
        <SkeletonLoader type={searchQuery ? "list" : "grid"} />
      ) : error ? (
        <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="text-[#ff6b35] font-bold text-lg mb-2">Oops! Something went wrong</div>
          <p className="text-gray-400 text-sm max-w-sm mb-6">{error}</p>
          <button
            onClick={() => setSelectedCategory(selectedCategory)}
            className="flex items-center gap-2 px-4 py-2 bg-[#272727] text-white text-sm font-semibold rounded-lg hover:bg-white hover:text-black transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      ) : animeList.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-24 px-4 text-center">
          <span className="text-2xl mb-2">🔍</span>
          <div className="text-white font-bold text-lg">No anime found</div>
          <p className="text-gray-400 text-xs mt-1 max-w-xs">
            We couldn't find any results matching your request. Try searching another term or choosing other categories!
          </p>
        </div>
      ) : searchQuery ? (
        /* Vertical list recommendations for SEARCH matches */
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-5">
          {animeList.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              onClick={() => onSelectAnime(anime.id)}
              layout="list"
            />
          ))}
        </div>
      ) : (
        /* Grid flow for HOMEPAGE recommendations */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 px-4 md:px-6 mt-4">
          {animeList.map((anime) => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              onClick={() => onSelectAnime(anime.id)}
              layout="grid"
            />
          ))}
        </div>
      )}
    </div>
  );
}
