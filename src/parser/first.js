import { EPSILON } from '../constants.js';

/**
 * Computes FIRST sets for all non-terminals in the grammar.
 *
 * FIRST(X):
 *   - If X is a terminal: FIRST(X) = {X}
 *   - If X is a non-terminal:
 *       For each production X → Y1 Y2 ... Yk:
 *         Add FIRST(Y1) - {ε} to FIRST(X)
 *         If ε ∈ FIRST(Y1), add FIRST(Y2) - {ε}, etc.
 *         If ε ∈ FIRST(Yi) for all i, add ε to FIRST(X)
 *   - If X → ε is a production: add ε to FIRST(X)
 */
export function computeFirst(grammar) {
  const firstSets = new Map();

  // Initialize all non-terminals with empty sets
  for (const nt of grammar.nonTerminals) {
    firstSets.set(nt, new Set());
  }

  // Initialize terminals with themselves
  for (const t of grammar.terminals) {
    firstSets.set(t, new Set([t]));
  }
  // ε maps to {ε}
  firstSets.set(EPSILON, new Set([EPSILON]));

  // Iteratively compute FIRST sets until no changes
  let changed = true;
  while (changed) {
    changed = false;

    for (const prod of grammar.productions) {
      const { lhs, rhs } = prod;
      const firstOfLhs = firstSets.get(lhs);

      const sizeBefore = firstOfLhs.size;
      addFirstOfSequence(rhs, firstSets, firstOfLhs);

      if (firstOfLhs.size > sizeBefore) changed = true;
    }
  }

  return firstSets;
}

/**
 * Computes FIRST of a sequence of symbols (e.g., the RHS of a production).
 * Adds results to `target`.
 */
export function computeFirstOfSequence(symbols, firstSets) {
  const result = new Set();
  addFirstOfSequence(symbols, firstSets, result);
  return result;
}

function addFirstOfSequence(symbols, firstSets, target) {
  if (symbols.length === 0) {
    target.add(EPSILON);
    return;
  }

  if (symbols[0] === EPSILON) {
    // Production is X → ε
    target.add(EPSILON);
    return;
  }

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const firstOfSym = firstSets.get(sym);

    if (!firstOfSym) {
      // Unknown symbol – treat as terminal
      target.add(sym);
      return;
    }

    // Add all of FIRST(sym) except ε to target
    for (const f of firstOfSym) {
      if (f !== EPSILON) target.add(f);
    }

    // If ε is NOT in FIRST(sym), stop
    if (!firstOfSym.has(EPSILON)) return;

    // ε ∈ FIRST(sym), continue to next symbol
    if (i === symbols.length - 1) {
      // All symbols can derive ε, so add ε to target
      target.add(EPSILON);
    }
  }
}
