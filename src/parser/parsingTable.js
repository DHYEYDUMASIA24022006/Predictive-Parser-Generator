import { EPSILON, END_MARKER } from '../constants.js';
import { computeFirstOfSequence } from './first.js';

/**
 * Builds the LL(1) predictive parsing table.
 *
 * For each production A → α:
 *   For each terminal a in FIRST(α):
 *     Add A → α to M[A, a]
 *   If ε ∈ FIRST(α):
 *     For each terminal b in FOLLOW(A) (including $):
 *       Add A → α to M[A, b]
 *
 * If a cell already has an entry, we have an LL(1) conflict.
 */
export function buildParsingTable(grammar, firstSets, followSets) {
  const table = new Map();

  // Initialize table
  for (const nt of grammar.nonTerminals) {
    table.set(nt, new Map());
  }

  for (const prod of grammar.productions) {
    const { lhs, rhs } = prod;
    const row = table.get(lhs);

    // FIRST(rhs)
    const firstOfRhs = computeFirstOfSequence(rhs, firstSets);

    // For each terminal in FIRST(rhs) (excluding ε)
    for (const terminal of firstOfRhs) {
      if (terminal === EPSILON) continue;
      addToTable(row, terminal, prod);
    }

    // If ε ∈ FIRST(rhs), for each b in FOLLOW(lhs)
    if (firstOfRhs.has(EPSILON)) {
      const followOfLhs = followSets.get(lhs) ?? new Set();
      for (const terminal of followOfLhs) {
        addToTable(row, terminal, prod);
      }
    }
  }

  return table;
}

function addToTable(row, terminal, prod) {
  if (!row.has(terminal)) {
    row.set(terminal, [{ production: prod }]);
  } else {
    // Conflict: multiple productions for same (NT, terminal)
    const existing = row.get(terminal);
    // Avoid exact duplicate
    const alreadyHas = existing.some(
      e => e.production.lhs === prod.lhs && e.production.rhs.join(' ') === prod.rhs.join(' ')
    );
    if (!alreadyHas) {
      existing.push({ production: prod, conflict: true });
      // Mark all existing entries as conflicts
      for (const e of existing) e.conflict = true;
      row.set(terminal, existing);
    }
  }
}

/** Returns true if the grammar is LL(1) (no conflicts in table) */
export function isLL1(table) {
  for (const row of table.values()) {
    for (const entries of row.values()) {
      if (entries.length > 1) return false;
      if (entries[0]?.conflict) return false;
    }
  }
  return true;
}

/** Collect all terminals that appear in the table (column headers) */
export function getTableTerminals(table, allTerminals) {
  const seen = new Set();
  for (const row of table.values()) {
    for (const t of row.keys()) seen.add(t);
  }
  // Sort: regular terminals first, then $
  return [...allTerminals].filter(t => seen.has(t)).sort((a, b) => {
    if (a === END_MARKER) return 1;
    if (b === END_MARKER) return -1;
    return a.localeCompare(b);
  });
}
