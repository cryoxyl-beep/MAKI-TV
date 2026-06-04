import { AniListAnime } from "../types";

// Rules: Lowercase, ignore punctuation [:;*\_./-], ignore repeated spaces.
export function normalizeTitle(title: string): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/[:;*\_./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Check if it is a valid fuzzy match based on query length rules
 */
function isFuzzyMatch(normalizedQuery: string, normalizedTitleSub: string): boolean {
  const queryLen = normalizedQuery.length;
  if (queryLen <= 3) return false;

  const distance = levenshteinDistance(normalizedQuery, normalizedTitleSub);
  
  if (queryLen >= 4 && queryLen <= 6 && distance <= 1) return true;
  if (queryLen >= 7 && distance <= 2) return true;

  return false;
}

export function rankSearchMatch(anime: AniListAnime, query: string): number {
  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery) return 0;

  const titles = [
    anime.title.english,
    anime.title.romaji,
    anime.title.native,
    anime.title.userPreferred,
    ...(anime.synonyms || [])
  ].filter(Boolean) as string[];

  let maxScore = 0;

  for (const t of titles) {
    const normT = normalizeTitle(t);
    if (!normT) continue;

    // Rank 100: Exact title match
    if (normT === normalizedQuery) {
      return 100; // Fast exit
    }

    // Rank 80: Title starts with query
    if (normT.startsWith(normalizedQuery + " ") || normT.startsWith(normalizedQuery)) {
      maxScore = Math.max(maxScore, 80);
      continue;
    }

    // Rank 60: Query appears inside title
    if (normT.includes(" " + normalizedQuery + " ") || 
        normT.endsWith(" " + normalizedQuery) || 
        normT.includes(normalizedQuery)) {
      maxScore = Math.max(maxScore, 60);
      continue;
    }

    // Fuzzy matching
    // Let's check if any word in the title fuzzy matches the query, or if the whole title fuzzy matches the query.
    // Whole title fuzzy match:
    if (isFuzzyMatch(normalizedQuery, normT)) {
      // It's a valid fuzzy match.
      maxScore = Math.max(maxScore, 55); // high fuzzy
    } else {
      // What if query "oshii no ko" and title "oshi no ko"?
      // Let's do a substring check for fuzzy distance. Since that's expensive, we can check whole string.
      // If titles are multi-word, we can check prefix or word-by-word.
       // Actually, we can just do whole string first.
    }
  }

  // To properly handle "oshi" matching "oshi no ko" if it was misspelled?
  // If the query is "oshii" and the title is "oshi no ko".
  // The user might type "oshii" -> startsWith("oshii no ko") wouldn't work.
  // We can do fuzzy match on title prefixes of similar length.
  if (maxScore < 60) {
    for (const t of titles) {
      const normT = normalizeTitle(t);
      if (!normT) continue;
      
      const wordsQuery = normalizedQuery.split(" ");
      const wordsT = normT.split(" ");

      // Fuzzy prefix match:
      // Compare `normalizedQuery` with `normT.substring(0, normalizedQuery.length)`
      const prefixT = normT.substring(0, normalizedQuery.length);
      if (isFuzzyMatch(normalizedQuery, prefixT)) {
        maxScore = Math.max(maxScore, 50); 
      }
      
      // Fuzzy substring match... (maybe overkill?)
    }
  }

  return maxScore;
}
