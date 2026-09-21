import { END_MARKER } from '../constants.js';

/**
 * Tokenizes an input string into a list of terminal tokens.
 * Supports multi-character terminals like 'id', '+', '*', etc.
 * Appends $ at the end.
 */
export function tokenize(input) {
  const tokens = input
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0);

  if (tokens[tokens.length - 1] !== END_MARKER) {
    tokens.push(END_MARKER);
  }

  return tokens;
}
