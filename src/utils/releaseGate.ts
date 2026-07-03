/**
 * Global Hard Release Filtering (Release Gate)
 * This utility ensures that no unreleased content (anime, movies, TV series, seasons, episodes)
 * is ever shown in the application unless specifically requested (e.g., in a future Schedule page).
 */

// Basic check if a date string is in the past or today
export function isReleasedDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return true; // Empty string or null means unknown date, let it pass by default

  const releaseDate = new Date(dateStr);
  if (isNaN(releaseDate.getTime())) return true; // Invalid date format, let it pass
  
  const today = new Date();
  // Set today to end of day to be safe, so anything airing today is included
  today.setHours(23, 59, 59, 999);
  
  return releaseDate.getTime() <= today.getTime();
}

// Check if a timestamp is in the past
export function isReleasedTimestamp(timestamp: number | null | undefined): boolean {
  if (!timestamp) return true;
  return timestamp * 1000 <= Date.now();
}

/**
 * Validates if an anime is released based on status and dates
 */
export function isAnimeReleased(anime: any): boolean {
  if (!anime) return false;
  
  // AniList/Jikan statuses indicating unreleased
  const unreleasedStatuses = ["NOT_YET_RELEASED", "CANCELLED", "upcoming", "Upcoming"];
  if (anime.status && unreleasedStatuses.includes(anime.status)) {
    return false;
  }
  
  // For AniList, check startDate object
  if (anime.startDate) {
     const { year, month, day } = anime.startDate;
     if (year) {
       // If year is in the future, definitively not released
       const currentYear = new Date().getFullYear();
       if (year > currentYear) return false;

       // If current year, check month and day
       if (year === currentYear) {
         const m = month ? month - 1 : 0; // JS Date months are 0-indexed
         const d = day || 1;
         const releaseDate = new Date(year, m, d);
         // If release date is after today, reject
         if (releaseDate.getTime() > Date.now()) {
           return false;
         }
       }
     }
  }

  // Fallback for general Jikan/API date strings
  if (anime.aired?.from && !isReleasedDate(anime.aired.from)) {
    return false;
  }
  
  return true;
}

/**
 * Validates if a movie is released based on TMDB release_date
 */
export function isMovieReleased(movie: any): boolean {
  if (!movie) return false;
  if (!movie.release_date) return false;
  if (!isReleasedDate(movie.release_date)) return false;
  
  const unreleasedStatuses = ["Planned", "In Production", "Rumored", "Post Production", "Canceled"];
  if (movie.status && unreleasedStatuses.includes(movie.status)) return false;
  
  return true;
}

/**
 * Validates if a TV series is released based on TMDB first_air_date
 */
export function isSeriesReleased(series: any): boolean {
  if (!series) return false;
  if (!series.first_air_date) return false;
  if (!isReleasedDate(series.first_air_date)) return false;
  
  const unreleasedStatuses = ["Planned", "In Production", "Rumored", "Pilot", "Canceled"];
  if (series.status && unreleasedStatuses.includes(series.status)) return false;
  
  return true;
}

/**
 * Validates if a season is released based on TMDB air_date
 */
export function isSeasonReleased(season: any): boolean {
  if (!season) return false;
  if (!season.air_date) return false;
  if (!isReleasedDate(season.air_date)) return false;
  return true;
}

/**
 * Validates if an episode is released based on air_date or airingAt timestamp
 */
export function isEpisodeReleased(episode: any): boolean {
  if (!episode) return false;
  
  // Strict TMDB episode check
  if (episode.show_id || episode.production_code !== undefined) {
      if (!episode.air_date) return false;
  }
  
  if (episode.air_date && !isReleasedDate(episode.air_date)) {
    return false;
  }
  
  if (episode.aired && !isReleasedDate(episode.aired)) {
    return false;
  }
  
  if (episode.airingAt && !isReleasedTimestamp(episode.airingAt)) {
    return false;
  }
  
  return true;
}

// -----------------------------------------------------------------------------
// Filter Wrappers (To be applied immediately to API response arrays)
// -----------------------------------------------------------------------------

export function filterReleasedMovies(movies: any[]): any[] {
  if (!movies || !Array.isArray(movies)) return [];
  return movies.filter(isMovieReleased);
}

export function filterReleasedSeries(seriesList: any[]): any[] {
  if (!seriesList || !Array.isArray(seriesList)) return [];
  return seriesList.filter(isSeriesReleased);
}

export function filterReleasedAnime(animeList: any[]): any[] {
  if (!animeList || !Array.isArray(animeList)) return [];
  return animeList.filter(isAnimeReleased);
}

export function filterReleasedEpisodes(episodes: any[]): any[] {
  if (!episodes || !Array.isArray(episodes)) return [];
  return episodes.filter(isEpisodeReleased);
}

export function filterReleasedSeasons(seasons: any[]): any[] {
  if (!seasons || !Array.isArray(seasons)) return [];
  return seasons.filter(isSeasonReleased);
}
