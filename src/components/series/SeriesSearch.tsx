import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { TMDBTVShow, searchTV } from "../../services/tmdb";
import SeriesCard from "./SeriesCard";

export default function SeriesSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [results, setResults] = useState<TMDBTVShow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        const data = await searchTV(query);
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
         <h2 className="text-2xl font-bold text-white mb-2">Search the Series Universe</h2>
         <p className="text-white/50">Enter a TV show title to explore TMDB's vast library.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center pb-32 animate-fade-in text-white min-h-screen pt-4 md:pt-8 bg-[#09090b]">
      <div className="w-full max-w-[2000px] px-4 md:px-8 flex flex-col gap-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          Search Results for <span className="text-emerald-400">"{query}"</span>
        </h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 w-full">
            {Array.from({ length: 12 }).map((_, i) => (
               <div key={i} className="shimmer-bone w-full aspect-[2/3] rounded-xl" />
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 w-full">
            {results.map((show) => (
              <SeriesCard key={show.id} series={show} />
            ))}
          </div>
        ) : (
          <div className="w-full py-20 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-bold text-white mb-2">No Results Found</h2>
            <p className="text-white/50">We couldn't find any TV shows matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
