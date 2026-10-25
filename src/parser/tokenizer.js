import { END_MARKER } from '../constants.js';

/**
 * Tokenizes an input string into a list of terminal tokens.
 * Supports:
 * - Space-separated tokens (e.g., 'id + id * id' or 'a a b')
 * - Unspaced tokens when grammar terminals are provided (e.g., 'id+id*id' or 'aab')
 * - Multi-character terminals like 'id', 'num', '==', etc.
 * - Appends $ (END_MARKER) at the end.
 *
 * @param {string} input - The input string to tokenize
 * @param {Set<string>|Array<string>} [grammarTerminals] - Optional set of grammar terminals
 * @returns {string[]} List of tokens ending with $
 */
export function tokenize(input, grammarTerminals = null) {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return [END_MARKER];
  }

  const rawChunks = trimmed.split(/\s+/).filter(t => t.length > 0);

  // If no grammar terminals provided, use standard whitespace splitting
  if (!grammarTerminals || grammarTerminals.size === 0) {
    const tokens = [...rawChunks];
    if (tokens[tokens.length - 1] !== END_MARKER) {
      tokens.push(END_MARKER);
    }
    return tokens;
  }

  const termSet = grammarTerminals instanceof Set ? grammarTerminals : new Set(grammarTerminals);
  // Sort known terminals (excluding $) by length descending for maximal munch
  const sortedTerms = [...termSet].filter(t => t !== END_MARKER).sort((a, b) => b.length - a.length);

  const tokens = [];

  for (const chunk of rawChunks) {
    if (termSet.has(chunk)) {
      tokens.push(chunk);
      continue;
    }

    // Maximal munch to split unspaced chunk using grammar terminals
    let p = 0;
    while (p < chunk.length) {
      let matched = false;
      for (const term of sortedTerms) {
        if (chunk.startsWith(term, p)) {
          tokens.push(term);
          p += term.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Fallback: emit single character
        tokens.push(chunk[p]);
        p += 1;
      }
    }
  }

  if (tokens[tokens.length - 1] !== END_MARKER) {
    tokens.push(END_MARKER);
  }

  return tokens;
}
