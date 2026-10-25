import { EPSILON } from './constants.js';
import { parseGrammar } from './grammarParser.js';

/**
 * Generates a unique prime-suffixed non-terminal name not already present in the grammar.
 * e.g., E -> E' (or E'' if E' is already taken)
 */
function getUniqueNonTerminal(base, existingNTs) {
  let candidate = `${base}'`;
  while (existingNTs.has(candidate)) {
    candidate += "'";
  }
  existingNTs.add(candidate);
  return candidate;
}

/**
 * Checks if a grammar has any immediate or indirect left recursion.
 */
export function hasLeftRecursion(grammar) {
  if (!grammar) return false;
  // 1. Immediate check: A -> A alpha
  for (const prod of grammar.productions) {
    if (prod.rhs.length > 0 && prod.rhs[0] === prod.lhs) {
      return true;
    }
  }

  // 2. Cycle / indirect check
  for (const nt of grammar.nonTerminals) {
    const visited = new Set();
    const queue = [nt];
    while (queue.length > 0) {
      const curr = queue.shift();
      const alts = grammar.productionMap.get(curr) ?? [];
      for (const alt of alts) {
        if (alt.length > 0 && grammar.nonTerminals.has(alt[0])) {
          if (alt[0] === nt) return true;
          if (!visited.has(alt[0])) {
            visited.add(alt[0]);
            queue.push(alt[0]);
          }
        }
      }
    }
  }

  return false;
}

/**
 * Eliminates immediate left recursion from all non-terminals in a grammar.
 *
 * General Method (Aho-Ullman / Dragon Book):
 * Given:
 *   A -> A alpha_1 | A alpha_2 | ... | A alpha_m | beta_1 | beta_2 | ... | beta_n
 * where no beta_i begins with A.
 *
 * Replace with:
 *   A  -> beta_1 A' | beta_2 A' | ... | beta_n A'
 *   A' -> alpha_1 A' | alpha_2 A' | ... | alpha_m A' | ε
 */
export function eliminateImmediateLeftRecursion(grammar) {
  const existingNTs = new Set(grammar.nonTerminals);
  const newProductionMap = new Map();
  let changed = false;
  const changes = [];

  for (const nt of grammar.nonTerminals) {
    const alts = grammar.productionMap.get(nt) ?? [];
    const leftRecursiveAlts = [];
    const nonLeftRecursiveAlts = [];

    for (const alt of alts) {
      if (alt.length > 0 && alt[0] === nt) {
        // A -> A alpha
        const alpha = alt.slice(1);
        leftRecursiveAlts.push(alpha.length === 0 ? [EPSILON] : alpha);
      } else {
        // A -> beta
        nonLeftRecursiveAlts.push(alt);
      }
    }

    if (leftRecursiveAlts.length === 0) {
      // No left recursion on this non-terminal
      newProductionMap.set(nt, alts);
      continue;
    }

    changed = true;
    const newNT = getUniqueNonTerminal(nt, existingNTs);
    changes.push({ nt, newNT, leftCount: leftRecursiveAlts.length });

    // A -> beta_1 A' | beta_2 A' | ...
    const newAltsForA = [];
    if (nonLeftRecursiveAlts.length === 0) {
      // Fallback if no beta exists (degenerate case)
      newAltsForA.push([newNT]);
    } else {
      for (const beta of nonLeftRecursiveAlts) {
        if (beta.length === 1 && beta[0] === EPSILON) {
          newAltsForA.push([newNT]);
        } else {
          newAltsForA.push([...beta, newNT]);
        }
      }
    }

    // A' -> alpha_1 A' | alpha_2 A' | ... | ε
    const newAltsForNewNT = [];
    for (const alpha of leftRecursiveAlts) {
      if (alpha.length === 1 && alpha[0] === EPSILON) {
        newAltsForNewNT.push([newNT]);
      } else {
        newAltsForNewNT.push([...alpha, newNT]);
      }
    }
    newAltsForNewNT.push([EPSILON]);

    newProductionMap.set(nt, newAltsForA);
    newProductionMap.set(newNT, newAltsForNewNT);
  }

  // Format back into grammar string
  const lines = [];
  for (const [lhs, alts] of newProductionMap.entries()) {
    const rhsString = alts.map(alt => alt.join(' ')).join(' | ');
    lines.push(`${lhs} → ${rhsString}`);
  }

  return {
    transformed: changed,
    text: lines.join('\n'),
    changes,
  };
}

/**
 * Eliminates both immediate and indirect left recursion using Dragon Book Algorithm 4.19.
 */
export function eliminateLeftRecursion(grammarText) {
  const { grammar } = parseGrammar(grammarText);
  if (!grammar) return { transformed: false, text: grammarText, changes: [] };

  // Collect ordered non-terminals
  const nts = [...grammar.nonTerminals];
  const prodMap = new Map();
  for (const [lhs, alts] of grammar.productionMap.entries()) {
    // deep copy
    prodMap.set(lhs, alts.map(alt => [...alt]));
  }
  const existingNTs = new Set(grammar.nonTerminals);
  let anyChange = false;
  const changes = [];

  // Algorithm 4.19
  for (let i = 0; i < nts.length; i++) {
    const Ai = nts[i];

    for (let j = 0; j < i; j++) {
      const Aj = nts[j];
      const currentAlts = prodMap.get(Ai) ?? [];
      const updatedAlts = [];

      for (const alt of currentAlts) {
        if (alt.length > 0 && alt[0] === Aj) {
          anyChange = true;
          const gamma = alt.slice(1);
          const ajAlts = prodMap.get(Aj) ?? [];
          for (const delta of ajAlts) {
            if (delta.length === 1 && delta[0] === EPSILON) {
              updatedAlts.push(gamma.length === 0 ? [EPSILON] : [...gamma]);
            } else {
              updatedAlts.push([...delta, ...gamma]);
            }
          }
        } else {
          updatedAlts.push(alt);
        }
      }
      prodMap.set(Ai, updatedAlts);
    }

    // Eliminate immediate left recursion on Ai
    const alts = prodMap.get(Ai) ?? [];
    const leftAlts = [];
    const nonLeftAlts = [];

    for (const alt of alts) {
      if (alt.length > 0 && alt[0] === Ai) {
        leftAlts.push(alt.slice(1));
      } else {
        nonLeftAlts.push(alt);
      }
    }

    if (leftAlts.length > 0) {
      anyChange = true;
      const newNT = getUniqueNonTerminal(Ai, existingNTs);
      changes.push({ nt: Ai, newNT, leftCount: leftAlts.length });

      const newAltsForAi = [];
      if (nonLeftAlts.length === 0) {
        newAltsForAi.push([newNT]);
      } else {
        for (const beta of nonLeftAlts) {
          if (beta.length === 1 && beta[0] === EPSILON) {
            newAltsForAi.push([newNT]);
          } else {
            newAltsForAi.push([...beta, newNT]);
          }
        }
      }

      const newAltsForNewNT = [];
      for (const alpha of leftAlts) {
        if (alpha.length === 0 || (alpha.length === 1 && alpha[0] === EPSILON)) {
          newAltsForNewNT.push([newNT]);
        } else {
          newAltsForNewNT.push([...alpha, newNT]);
        }
      }
      newAltsForNewNT.push([EPSILON]);

      prodMap.set(Ai, newAltsForAi);
      prodMap.set(newNT, newAltsForNewNT);
    }
  }

  const lines = [];
  for (const [lhs, alts] of prodMap.entries()) {
    const rhsString = alts.map(alt => alt.join(' ')).join(' | ');
    lines.push(`${lhs} → ${rhsString}`);
  }

  return {
    transformed: anyChange,
    text: lines.join('\n'),
    changes,
  };
}

/**
 * Checks if a grammar requires left factoring (contains alternatives with common prefixes).
 */
export function hasCommonPrefixes(grammar) {
  if (!grammar) return false;
  for (const alts of grammar.productionMap.values()) {
    if (alts.length <= 1) continue;
    for (let i = 0; i < alts.length; i++) {
      for (let j = i + 1; j < alts.length; j++) {
        if (alts[i].length > 0 && alts[j].length > 0 && alts[i][0] === alts[j][0] && alts[i][0] !== EPSILON) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Applies Left Factoring to a grammar.
 *
 * General Method (Aho-Ullman / Dragon Book):
 * When two or more productions of a non-terminal begin with the same prefix:
 *   A -> alpha beta_1 | alpha beta_2 | ... | alpha beta_n | gamma
 *
 * Replace with:
 *   A  -> alpha A' | gamma
 *   A' -> beta_1 | beta_2 | ... | beta_n
 * (if any beta_i is empty, it becomes ε)
 *
 * Iterates until no non-terminal has alternatives with a common prefix.
 */
export function applyLeftFactoring(grammarText) {
  const { grammar } = parseGrammar(grammarText);
  if (!grammar) return { transformed: false, text: grammarText, changes: [] };

  const existingNTs = new Set(grammar.nonTerminals);
  const prodMap = new Map();
  for (const [lhs, alts] of grammar.productionMap.entries()) {
    prodMap.set(lhs, alts.map(alt => [...alt]));
  }

  let totalChanged = false;
  const changes = [];

  let keepFactoring = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50;

  while (keepFactoring && iterations < MAX_ITERATIONS) {
    keepFactoring = false;
    iterations++;

    for (const [lhs, alts] of [...prodMap.entries()]) {
      if (alts.length <= 1) continue;

      // Find the longest common prefix among any pair of alternatives
      let bestPrefix = null;

      for (let i = 0; i < alts.length; i++) {
        for (let j = i + 1; j < alts.length; j++) {
          const prefix = getCommonPrefix(alts[i], alts[j]);
          if (prefix.length > 0 && prefix[0] !== EPSILON) {
            if (!bestPrefix || prefix.length > bestPrefix.length) {
              bestPrefix = prefix;
            }
          }
        }
      }

      if (!bestPrefix || bestPrefix.length === 0) continue;

      // Find all alternatives sharing this bestPrefix
      const matchingAlts = [];
      const nonMatchingAlts = [];

      for (const alt of alts) {
        if (startsWithPrefix(alt, bestPrefix)) {
          const remainder = alt.slice(bestPrefix.length);
          matchingAlts.push(remainder.length === 0 ? [EPSILON] : remainder);
        } else {
          nonMatchingAlts.push(alt);
        }
      }

      if (matchingAlts.length >= 2) {
        totalChanged = true;
        keepFactoring = true;

        const newNT = getUniqueNonTerminal(lhs, existingNTs);
        changes.push({
          lhs,
          newNT,
          prefix: bestPrefix.join(' '),
          count: matchingAlts.length,
        });

        // A -> alpha A' | gamma
        const newAltsForA = [
          [...bestPrefix, newNT],
          ...nonMatchingAlts,
        ];

        // A' -> beta_1 | beta_2 | ...
        prodMap.set(lhs, newAltsForA);
        prodMap.set(newNT, matchingAlts);
        break; // re-run outer loop to handle further factors
      }
    }
  }

  const lines = [];
  for (const [lhs, alts] of prodMap.entries()) {
    const rhsString = alts.map(alt => alt.join(' ')).join(' | ');
    lines.push(`${lhs} → ${rhsString}`);
  }

  return {
    transformed: totalChanged,
    text: lines.join('\n'),
    changes,
  };
}

function getCommonPrefix(a, b) {
  const prefix = [];
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) {
      prefix.push(a[i]);
    } else {
      break;
    }
  }
  return prefix;
}

function startsWithPrefix(alt, prefix) {
  if (alt.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (alt[i] !== prefix[i]) return false;
  }
  return true;
}
