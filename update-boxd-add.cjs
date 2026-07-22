const fs = require('fs');
let content = fs.readFileSync('src/boxd/BoxdAddTitleModal.tsx', 'utf-8');

// Add LazyImage import
content = content.replace(
  /import \{ X, Search, Loader2 \} from "lucide-react";/,
  `import { X, Search, Loader2 } from "lucide-react";\nimport LazyImage from "../components/LazyImage";`
);

// Add popular fetch methods
content = content.replace(
  /import \{ searchMovies, searchTV, TMDB_IMAGE_BASE_URL_W500 \} from "\.\.\/services\/tmdb";/,
  `import { searchMovies, searchTV, TMDB_IMAGE_BASE_URL_W500, getTrendingMovies, getTrendingTV } from "../services/tmdb";`
);

// Add state for recommendations
content = content.replace(
  /const \[results, setResults\] = useState<any\[\]>\(\[\]\);/,
  `const [results, setResults] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);`
);

// Add useEffect for fetching recommendations
const useEffectCode = `  useEffect(() => {
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
  }, [tab, query]);`;

content = content.replace(
  /const \[addingId, setAddingId\] = useState<string \| null>\(null\);/,
  `const [addingId, setAddingId] = useState<string | null>(null);\n\n${useEffectCode}`
);

// Replace img with LazyImage
content = content.replace(
  /<img \s*src=\{poster\} \s*alt=\{title\} \s*className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" \s*\/>/m,
  `<LazyImage 
                          src={poster} 
                          alt={title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />`
);

// Render recommendations when query is empty
const renderBlock = `          {loading && results.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl"></div>
              ))}
            </div>
          ) : results.length > 0 ? (`;

const newRenderBlock = `          {(loading || loadingRecs) && results.length === 0 && recommendations.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 rounded-xl"></div>
              ))}
            </div>
          ) : results.length > 0 || (query.trim().length <= 2 && recommendations.length > 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
              {(results.length > 0 ? results : recommendations).map(item => {
                const isAnime = tab === 'anime';
                const id = isAnime ? (item.idMal || item.id) : item.id;
                const boxdId = \`\${tab}_\${id}\`;
                const title = isAnime ? (item.title?.english || item.title?.romaji) : (item.title || item.name);
                const year = isAnime ? item.seasonYear : (item.release_date || item.first_air_date)?.substring(0, 4);
                const poster = isAnime 
                  ? (item.coverImage?.extraLarge || item.coverImage?.large) 
                  : (item.poster_path ? \`\${TMDB_IMAGE_BASE_URL_W500}\${item.poster_path}\` : null);
                
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
          ) : query.length > 2 ? (`;

// The file has two places to replace. First is the `results.map` block which we need to replace carefully.
// Instead of replacing the whole block, let's use a robust approach for rewriting the file.
