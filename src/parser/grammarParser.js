import { EPSILON, END_MARKER } from '../constants.js';

/**
 * Parses a grammar text into a Grammar object.
 *
 * Format:
 *   NT -> sym1 sym2 ... | sym3 sym4 ...
 *
 * Multiple productions for the same NT can appear on one line separated by |,
 * or on multiple lines.
 * ε (epsilon) can be written as: ε, epsilon, eps, or just left empty after |.
 */
export function parseGrammar(text) {
  const errors = [];
  const lines = text.split('\n');
  const rawProductions = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    // Support both -> and →
    const arrowMatch = line.match(/^([A-Za-z][A-Za-z0-9']*)\s*(?:->|→)\s*(.+)$/);
    if (!arrowMatch) {
      if (line.length > 0) {
        errors.push({ line: i + 1, message: `Invalid production format (missing '->'): "${line}"` });
      }
      continue;
    }

    const lhs = arrowMatch[1].trim();
    const rhsText = arrowMatch[2].trim();

    // Split by | to get individual alternatives
    const alternatives = rhsText.split('|').map(alt => {
      const tokens = alt.trim().split(/\s+/).filter(t => t.length > 0);
      if (tokens.length === 0) return [EPSILON];
      return tokens.map(t => {
        if (t === 'epsilon' || t === 'eps' || t === 'ε' || t === 'EPSILON') return EPSILON;
        return t;
      });
    });

    rawProductions.push({ lhs, rhs: alternatives, lineNum: i + 1 });
  }

  if (rawProductions.length === 0) {
    errors.push({ line: 0, message: 'No valid productions found.' });
    return { grammar: null, errors };
  }

  // The start symbol is the LHS of the first production
  const startSymbol = rawProductions[0].lhs;

  // Collect all non-terminals (any LHS)
  const nonTerminals = new Set();
  for (const { lhs } of rawProductions) {
    nonTerminals.add(lhs);
  }

  // Build flat production list
  const productions = [];
  const productionMap = new Map();

  for (const { lhs, rhs } of rawProductions) {
    if (!productionMap.has(lhs)) productionMap.set(lhs, []);
    for (const alt of rhs) {
      productions.push({ lhs, rhs: alt });
      productionMap.get(lhs).push(alt);
    }
  }

  // Terminals = all symbols that are NOT non-terminals and NOT ε
  const terminals = new Set();
  for (const prod of productions) {
    for (const sym of prod.rhs) {
      if (sym !== EPSILON && !nonTerminals.has(sym)) {
        terminals.add(sym);
      }
    }
  }
  terminals.add(END_MARKER);

  // Validate: check that every non-terminal used on RHS is defined
  for (const prod of productions) {
    for (const sym of prod.rhs) {
      if (sym !== EPSILON && nonTerminals.has(sym) && !productionMap.has(sym)) {
        errors.push({
          line: 0,
          message: `Non-terminal '${sym}' used in production '${prod.lhs} -> ${prod.rhs.join(' ')}' but never defined.`
        });
      }
    }
  }

  const grammar = {
    nonTerminals,
    terminals,
    startSymbol,
    productions,
    productionMap,
  };

  return { grammar, errors };
}

/** Format a production for display */
export function formatProduction(prod) {
  return `${prod.lhs} → ${prod.rhs.join(' ')}`;
}
