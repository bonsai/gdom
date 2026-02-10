/**
 * Semantic Similarity Module
 * Provides simple text similarity calculation for field matching
 */

/**
 * Calculate similarity between two strings
 * Uses character overlap ratio as a simple similarity metric
 * 
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns Similarity score between 0 and 1 (1 = identical)
 * 
 * @example
 * similarity("プロジェクト概要", "プロジェクトの概要") // ~0.85
 * similarity("予算", "スケジュール") // ~0.2
 */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  
  const lowerA = a.toLowerCase();
  const lowerB = b.toLowerCase();
  
  // Exact match
  if (lowerA === lowerB) return 1.0;
  
  // Character overlap method
  let matches = 0;
  const shorterLength = Math.min(lowerA.length, lowerB.length);
  
  // Count common characters
  const charsA = new Set(lowerA);
  const charsB = new Set(lowerB);
  
  for (const ch of charsA) {
    if (charsB.has(ch)) {
      matches++;
    }
  }
  
  // Normalize by the length of the longer string
  const maxLength = Math.max(lowerA.length, lowerB.length);
  if (maxLength === 0) return 0;
  
  return matches / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 * Provides more accurate similarity for typos and variations
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (lower is more similar)
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first row and column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
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

  return matrix[b.length][a.length];
}

/**
 * Advanced similarity using Levenshtein distance
 * Returns normalized score between 0 and 1
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
export function advancedSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}
