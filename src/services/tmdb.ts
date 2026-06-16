export const TMDB_API_KEY = (import.meta as any).env.VITE_TMDB_API_KEY || "YOUR_TMDB_API_KEY"; // Ensure your TMDB API Key is in VITE_TMDB_API_KEY
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original";
export const TMDB_IMAGE_BASE_URL_W500 = "https://image.tmdb.org/t/p/w500";

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  adult: boolean;
  logo_path?: string | null;
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  status: string;
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  genre_ids: number[];
  logo_path?: string | null;
}

export interface TMDBTVDetails extends TMDBTVShow {
  genres: { id: number; name: string }[];
  status: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  seasons: TMDBSeason[];
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
  recommendations?: TMDBResponse<TMDBTVShow>;
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string | null;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number | null;
}

export interface TMDBSeasonDetails extends TMDBSeason {
  episodes: TMDBEpisode[];
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

const fetchFromTMDB = async <T>(endpoint: string, params: Record<string, string> = {}): Promise<T> => {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    ...params,
  });
  
  const response = await fetch(`${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export interface TMDBLogoImage {
  file_path: string;
  iso_639_1: string | null;
  aspect_ratio?: number;
  height?: number;
  width?: number;
}

export interface TMDBImagesResponse {
  logos: TMDBLogoImage[];
}

const logoCache: Record<string, Promise<string | null> | string | null> = {};

export const extractBestLogo = (logos: TMDBLogoImage[]): TMDBLogoImage | null => {
  if (!logos || logos.length === 0) return null;
  return (
    logos.find(l => l.iso_639_1 === "en" && l.file_path && l.file_path.toLowerCase().endsWith(".png")) ||
    logos.find(l => l.file_path && l.file_path.toLowerCase().endsWith(".png")) ||
    logos[0] ||
    null
  );
};

export const getLogoPath = async (type: 'movie' | 'tv', id: number): Promise<string | null> => {
  const cacheKey = `${type}_${id}`;
  if (cacheKey in logoCache) {
    const cachedVal = logoCache[cacheKey];
    if (cachedVal instanceof Promise) {
      return cachedVal;
    }
    return cachedVal;
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetchFromTMDB<TMDBImagesResponse>(`/${type}/${id}/images`, { include_image_language: 'en,null' });
      const logo = extractBestLogo(response?.logos || []);
      return logo ? `https://image.tmdb.org/t/p/original${logo.file_path}` : null;
    } catch (error) {
      console.error(`Failed to fetch logo for ${type} ${id}:`, error);
      return null;
    }
  })();

  logoCache[cacheKey] = fetchPromise;
  
  const result = await fetchPromise;
  logoCache[cacheKey] = result;
  return result;
};

export const getTrendingMovies = () => fetchFromTMDB<TMDBResponse<TMDBMovie>>('/trending/movie/day');
export const getPopularMovies = () => fetchFromTMDB<TMDBResponse<TMDBMovie>>('/movie/popular');
export const getTopRatedMovies = () => fetchFromTMDB<TMDBResponse<TMDBMovie>>('/movie/top_rated');
export const getUpcomingMovies = () => fetchFromTMDB<TMDBResponse<TMDBMovie>>('/movie/upcoming');
export const searchMovies = (query: string) => fetchFromTMDB<TMDBResponse<TMDBMovie>>('/search/movie', { query });

export const getMovieDetails = async (id: number): Promise<TMDBMovieDetails> => {
  const details = await fetchFromTMDB<TMDBMovieDetails>(`/movie/${id}`, { append_to_response: 'credits,recommendations' });
  const logoUrl = await getLogoPath('movie', id);
  details.logo_path = logoUrl;
  return details;
};

export const getTrendingTV = () => fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/trending/tv/day');
export const getPopularTV = () => fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/tv/popular');
export const getTopRatedTV = () => fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/tv/top_rated');
export const getAiringThisWeekTV = () => fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/tv/on_the_air');
export const searchTV = (query: string) => fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/search/tv', { query });

export const getTVDetails = async (id: number): Promise<TMDBTVDetails> => {
  const details = await fetchFromTMDB<TMDBTVDetails>(`/tv/${id}`, { append_to_response: 'credits,recommendations' });
  const logoUrl = await getLogoPath('tv', id);
  details.logo_path = logoUrl;
  return details;
};

export const getTVSeasonDetails = (seriesId: number, seasonNumber: number) => fetchFromTMDB<TMDBSeasonDetails>(`/tv/${seriesId}/season/${seasonNumber}`);
