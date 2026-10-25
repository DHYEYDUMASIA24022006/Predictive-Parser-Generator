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

/** Collect all conflict cells and explanations */
export function getConflicts(table) {
  const conflicts = [];
  for (const [nt, row] of table.entries()) {
    for (const [term, entries] of row.entries()) {
      if (entries.length > 1 || entries[0]?.conflict) {
        conflicts.push({
          nt,
          terminal: term,
          productions: entries.map(e => e.production),
        });
      }
    }
  }
  return conflicts;
}

/**
 * Diagnoses why a grammar has conflicts in an LL(1) parser.
 * Identifies:
 * 1. Left recursion
 * 2. Common prefixes (requires left factoring)
 * 3. FIRST/FOLLOW set intersection
 */
export function diagnoseGrammarIssues(grammar, table, firstSets, followSets) {
  const issues = [];

  // 1. Direct left recursion check: A -> A α
  for (const prod of grammar.productions) {
    if (prod.rhs.length > 0 && prod.rhs[0] === prod.lhs) {
      issues.push({
        type: 'Left Recursion',
        title: `Left Recursion in '${prod.lhs}'`,
        description: `Production '${prod.lhs} → ${prod.rhs.join(' ')}' is directly left-recursive. LL(1) parsers cannot parse left-recursive grammars directly because expanding '${prod.lhs}' creates an infinite expansion or multiple table entries. Left recursion elimination is required.`,
      });
    }
  }

  // 2. Common prefixes check among alternatives of the same non-terminal
  for (const [lhs, alts] of grammar.productionMap.entries()) {
    if (alts.length <= 1) continue;
    for (let i = 0; i < alts.length; i++) {
      for (let j = i + 1; j < alts.length; j++) {
        const firstI = computeFirstOfSequence(alts[i], firstSets);
        const firstJ = computeFirstOfSequence(alts[j], firstSets);
        const intersection = [...firstI].filter(x => x !== EPSILON && firstJ.has(x));
        if (intersection.length > 0) {
          issues.push({
            type: 'Common Prefix / FIRST Conflict',
            title: `Common Prefix in '${lhs}'`,
            description: `Alternatives '${lhs} → ${alts[i].join(' ')}' and '${lhs} → ${alts[j].join(' ')}' both derive terminal '${intersection.join(', ')}'. The parser cannot determine which alternative to predict. Left factoring is required.`,
          });
        }
      }
    }
  }

  // 3. FIRST/FOLLOW intersection check for nullable non-terminals
  for (const nt of grammar.nonTerminals) {
    const first = firstSets.get(nt) ?? new Set();
    if (first.has(EPSILON)) {
      const follow = followSets.get(nt) ?? new Set();
      const overlap = [...first].filter(x => x !== EPSILON && follow.has(x));
      if (overlap.length > 0) {
        issues.push({
          type: 'FIRST/FOLLOW Conflict',
          title: `FIRST/FOLLOW Overlap in '${nt}'`,
          description: `Non-terminal '${nt}' can derive ε, and terminal '${overlap.join(', ')}' belongs to both FIRST(${nt}) and FOLLOW(${nt}). The parser cannot decide whether to expand or derive ε when seeing '${overlap.join(', ')}'.`,
        });
      }
    }
  }

  return issues;
}
