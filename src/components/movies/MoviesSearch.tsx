import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { TMDBMovie, searchMovies } from "../../services/tmdb";
import MovieCard from "./MovieCard";
import SkeletonLoader from "../SkeletonLoader";

export default function MoviesSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        const data = await searchMovies(query);
        setResults(data.results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (!query) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8 text-white">
         <SearchIcon className="w-16 h-16 text-white/10 mb-4" />
         <h2 className="text-2xl font-bold text-white mb-2">Search the Cinematic Universe</h2>
         <p className="text-white/50">Enter a movie title to explore TMDB's vast library.</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 animate-fade-in text-white min-h-screen bg-transparent">
      <div className="px-4 md:px-6 pt-8 pb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Results for "{query}"
        </h2>
      </div>

      {loading ? (
        <div className="mt-8">
          <SkeletonLoader type="grid" />
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 px-4 md:px-6 w-full select-none group/row transition-opacity duration-300">
          {results.map((movie, index) => (
            <MovieCard key={movie.id} movie={movie} index={index} />
          ))}
        </div>
      ) : (
        <div className="w-full py-24 flex flex-col items-center justify-center text-center px-4">
          <span className="text-2xl mb-2">🔍</span>
          <div className="text-white font-bold text-lg">No Results Found</div>
          <p className="text-gray-400 text-xs mt-1 max-w-xs">
            We couldn't find any movies matching your search.
          </p>
        </div>
      )}
    </div>
  );
}
