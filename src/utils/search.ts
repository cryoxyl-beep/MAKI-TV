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
 * Super normalization: removes all spaces, punctuation, apostrophes for highly lenient matches.
 */
export function superNormalize(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/['’"“”‘`[:;*\_./\-\t]/g, "") // remove punctuation and apostrophes completely
    .replace(/\s+/g, "") // remove all whitespace
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
  const superNormalizedQuery = superNormalize(query);
  if (!normalizedQuery || !superNormalizedQuery) return 0;

  // Primary titles list (English, Romaji, UserPreferred, Native)
  const primaryTitles = Array.from(new Set(
    [
      anime.title.english,
      anime.title.romaji,
      anime.title.userPreferred,
      anime.title.native
    ]
    .map(t => t?.trim())
    .filter(Boolean)
  )) as string[];

  // All titles (including synonyms)
  const allSynonymsAndAlternate = Array.from(new Set(
    [
      ...(anime.synonyms || [])
    ]
    .map(t => t?.trim())
    .filter(Boolean)
  )) as string[];

  let maxScore = 0;

  // Let's check primary titles first
  for (const t of primaryTitles) {
    const normT = normalizeTitle(t);
    const superNormT = superNormalize(t);
    if (!normT || !superNormT) continue;

    // 1. Exact match on standard or super-normalized title
    if (normT === normalizedQuery || superNormT === superNormalizedQuery) {
      maxScore = Math.max(maxScore, 100);
      continue;
    }

    // 2. Starts-with match
    if (normT.startsWith(normalizedQuery) || superNormT.startsWith(superNormalizedQuery)) {
      maxScore = Math.max(maxScore, 90);
      continue;
    }

    // 3. Contains match
    if (normT.includes(normalizedQuery) || superNormT.includes(superNormalizedQuery)) {
      maxScore = Math.max(maxScore, 80);
      continue;
    }

    // 4. Fuzzy similarity match
    const distanceNorm = levenshteinDistance(superNormalizedQuery, superNormT);
    const maxLenNorm = Math.max(superNormalizedQuery.length, superNormT.length);
    if (maxLenNorm > 0) {
      const similarity = 1 - (distanceNorm / maxLenNorm);
      // High similarity threshold
      if (similarity >= 0.70) {
        const fuzzyScore = 50 + Math.floor(similarity * 25); // At least 67 points, max 75
        maxScore = Math.max(maxScore, fuzzyScore);
        continue;
      }
    }
  }

  // If no good match on primary titles, check synonyms/alt titles
  for (const t of allSynonymsAndAlternate) {
    const normT = normalizeTitle(t);
    const superNormT = superNormalize(t);
    if (!normT || !superNormT) continue;

    // Exact synonym match
    if (normT === normalizedQuery || superNormT === superNormalizedQuery) {
      maxScore = Math.max(maxScore, 75);
      continue;
    }

    // Starts with or contains synonym match
    if (normT.startsWith(normalizedQuery) || 
        superNormT.startsWith(superNormalizedQuery) || 
        normT.includes(normalizedQuery) || 
        superNormT.includes(superNormalizedQuery)) {
      maxScore = Math.max(maxScore, 70);
      continue;
    }

    // Fuzzy matching on synonym
    const distanceNorm = levenshteinDistance(superNormalizedQuery, superNormT);
    const maxLenNorm = Math.max(superNormalizedQuery.length, superNormT.length);
    if (maxLenNorm > 0) {
      const similarity = 1 - (distanceNorm / maxLenNorm);
      if (similarity >= 0.70) {
        const fuzzyScore = 50 + Math.floor(similarity * 15); // At least 60 points, max 65
        maxScore = Math.max(maxScore, fuzzyScore);
        continue;
      }
    }
  }

  return maxScore;
}

