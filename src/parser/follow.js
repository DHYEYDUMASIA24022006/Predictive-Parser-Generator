import { EPSILON, END_MARKER } from '../constants.js';
import { computeFirstOfSequence } from './first.js';

/**
 * Computes FOLLOW sets for all non-terminals.
 *
 * Rules:
 *  1. FOLLOW(S) contains $ (end marker) where S is start symbol
 *  2. For every production A → α B β:
 *       Add FIRST(β) - {ε} to FOLLOW(B)
 *  3. For every production A → α B β where ε ∈ FIRST(β)
 *     (or β is empty):
 *       Add FOLLOW(A) to FOLLOW(B)
 *  Iterate until no changes.
 */
export function computeFollow(grammar, firstSets) {
  const followSets = new Map();

  // Initialize with empty sets
  for (const nt of grammar.nonTerminals) {
    followSets.set(nt, new Set());
  }

  // Rule 1: add $ to FOLLOW of start symbol
  followSets.get(grammar.startSymbol).add(END_MARKER);

  // Iteratively apply rules 2 and 3
  let changed = true;
  while (changed) {
    changed = false;

    for (const prod of grammar.productions) {
      const { lhs, rhs } = prod;

      // Skip epsilon productions
      if (rhs.length === 1 && rhs[0] === EPSILON) continue;

      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];

        // Only apply to non-terminals
        if (!grammar.nonTerminals.has(B)) continue;

        const followB = followSets.get(B);
        const sizeBefore = followB.size;

        // β = symbols after B
        const beta = rhs.slice(i + 1);

        if (beta.length === 0) {
          // Rule 3: A → α B — add FOLLOW(A) to FOLLOW(B)
          const followA = followSets.get(lhs);
          if (followA) {
            for (const f of followA) followB.add(f);
          }
        } else {
          // Rule 2: compute FIRST(β)
          const firstBeta = computeFirstOfSequence(beta, firstSets);

          // Add FIRST(β) - {ε} to FOLLOW(B)
          for (const f of firstBeta) {
            if (f !== EPSILON) followB.add(f);
          }

          // Rule 3: if ε ∈ FIRST(β), add FOLLOW(A) to FOLLOW(B)
          if (firstBeta.has(EPSILON)) {
            const followA = followSets.get(lhs);
            if (followA) {
              for (const f of followA) followB.add(f);
            }
          }
        }

        if (followB.size > sizeBefore) changed = true;
      }
    }
  }

  return followSets;
}
