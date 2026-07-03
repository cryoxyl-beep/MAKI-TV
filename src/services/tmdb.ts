import { filterReleasedMovies, filterReleasedSeries, isMovieReleased, isSeriesReleased, isSeasonReleased, isEpisodeReleased } from '../utils/releaseGate';

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
  original_language?: string;
}

export interface TMDBMovieDetails extends TMDBMovie {
  genres: { id: number; name: string }[];
  runtime: number;
  status: string;
  production_companies: { id: number; name: string; logo_path: string | null; origin_country: string }[];
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
  recommendations?: { results: TMDBMovie[] };
  similar?: { results: TMDBMovie[] };
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
  original_language?: string;
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
  recommendations?: { results: TMDBTVShow[] };
  similar?: { results: TMDBTVShow[] };
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

export const getTrendingMovies = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', {
    sort_by: 'popularity.desc',
    'release_date.lte': today,
  });
  data.results = filterReleasedMovies(data.results);
  return data;
};
export const getPopularMovies = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', {
    sort_by: 'popularity.desc',
    'release_date.lte': today,
  });
  data.results = filterReleasedMovies(data.results);
  return data;
};
export const getTopRatedMovies = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', {
    sort_by: 'vote_average.desc',
    'vote_count.gte': '300',
    'release_date.lte': today,
  });
  data.results = filterReleasedMovies(data.results);
  return data;
};
export const getUpcomingMovies = async () => {
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBMovie>>('/discover/movie', {
    sort_by: 'popularity.desc',
    'release_date.lte': today,
    'release_date.gte': lastMonth,
    with_release_type: '2|3|4|5|6'
  });
  data.results = filterReleasedMovies(data.results);
  return data;
};
export const searchMovies = async (query: string) => {
  const data = await fetchFromTMDB<TMDBResponse<TMDBMovie>>('/search/movie', { query });
  data.results = filterReleasedMovies(data.results);
  return data;
};

export const getMovieDetails = async (id: number): Promise<TMDBMovieDetails> => {
  const details = await fetchFromTMDB<TMDBMovieDetails>(`/movie/${id}`, { append_to_response: 'credits,recommendations' });
  
  if (!isMovieReleased(details)) {
    throw new Error("Movie is unreleased");
  }

  const logoUrl = await getLogoPath('movie', id);
  details.logo_path = logoUrl;
  
  if (details.recommendations?.results) {
    details.recommendations.results = filterReleasedMovies(details.recommendations.results);
  }
  if (details.similar?.results) {
    details.similar.results = filterReleasedMovies(details.similar.results);
  }
  
  return details;
};

export const getTrendingTV = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/discover/tv', {
    sort_by: 'popularity.desc',
    'first_air_date.lte': today,
  });
  data.results = filterReleasedSeries(data.results);
  return data;
};
export const getPopularTV = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/discover/tv', {
    sort_by: 'popularity.desc',
    'first_air_date.lte': today,
  });
  data.results = filterReleasedSeries(data.results);
  return data;
};
export const getTopRatedTV = async () => {
  const today = new Date().toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/discover/tv', {
    sort_by: 'vote_average.desc',
    'vote_count.gte': '300',
    'first_air_date.lte': today,
  });
  data.results = filterReleasedSeries(data.results);
  return data;
};
export const getAiringThisWeekTV = async () => {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const data = await fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/discover/tv', {
    sort_by: 'popularity.desc',
    'air_date.lte': nextWeek,
    'air_date.gte': today,
    'first_air_date.lte': today,
  });
  data.results = filterReleasedSeries(data.results);
  return data;
};
export const searchTV = async (query: string) => {
  const data = await fetchFromTMDB<TMDBResponse<TMDBTVShow>>('/search/tv', { query });
  data.results = filterReleasedSeries(data.results);
  return data;
};

export const getTVDetails = async (id: number): Promise<TMDBTVDetails> => {
  const details = await fetchFromTMDB<TMDBTVDetails>(`/tv/${id}`, { append_to_response: 'credits,recommendations' });
  
  if (!isSeriesReleased(details)) {
    throw new Error("Series is unreleased");
  }

  const logoUrl = await getLogoPath('tv', id);
  details.logo_path = logoUrl;
  
  if (details.recommendations?.results) {
    details.recommendations.results = filterReleasedSeries(details.recommendations.results);
  }
  if (details.similar?.results) {
    details.similar.results = filterReleasedSeries(details.similar.results);
  }
  if (details.seasons) {
    details.seasons = details.seasons.filter(isSeasonReleased);
  }
  
  return details;
};

export const getTVExternalIds = (id: number) => fetchFromTMDB<{ id: number; tvdb_id: number | null }>(`/tv/${id}/external_ids`);

export const getTVSeasonDetails = async (seriesId: number, seasonNumber: number) => {
  const data = await fetchFromTMDB<TMDBSeasonDetails>(`/tv/${seriesId}/season/${seasonNumber}`);
  if (data.episodes) {
    data.episodes = data.episodes.filter(isEpisodeReleased);
  }
  return data;
};
