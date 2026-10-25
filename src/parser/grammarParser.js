import { EPSILON, END_MARKER } from '../constants.js';

/** Only 1 type of arrow is supported across the application: Unicode arrow → */
export const ARROW = '→';

/** Alternative arrow patterns used to detect and give helpful error messages if students use other arrows */
const DISALLOWED_ARROWS_REGEX = /(?:->|⟶|=>|⇒|::=)/;

/** Epsilon representations recognized */
export const EPSILON_VARIANTS = new Set(['ε', 'epsilon', 'eps', 'EPSILON', 'Epsilon', '^']);

/** Multi-character terminal keywords recognized when tokenizing unspaced productions */
const KNOWN_KEYWORDS = ['id', 'num', 'if', 'then', 'else', 'true', 'false', 'int', 'float'];

/** Multi-character operators */
const MULTI_CHAR_OPS = ['==', '!=', '<=', '>=', '&&', '||'];

function isValidIdentifier(s) {
  return /^[A-Za-z][A-Za-z0-9_']*$/.test(s);
}

/**
 * Sub-tokenizes an unspaced or space-separated chunk into symbols.
 * Declared non-terminals and known multi-character keywords are preserved atomically.
 */
function subTokenizeChunk(chunk, declaredNonTerminals) {
  // If exact match for a declared non-terminal
  if (declaredNonTerminals.has(chunk)) {
    return [chunk];
  }

  // If exact match for epsilon keyword
  if (EPSILON_VARIANTS.has(chunk)) {
    return [EPSILON];
  }

  // If exact match for a known keyword terminal
  if (KNOWN_KEYWORDS.includes(chunk)) {
    return [chunk];
  }

  // Single character
  if (chunk.length <= 1) {
    return [chunk];
  }

  // Decompose compound unspaced string (e.g. 'aA', 'AB', 'E+T', 'T*F', '(E)', 'abA')
  // Sort non-terminals by length descending so longer ones match first (e.g. E' before E, Expr before E)
  const sortedNTs = [...declaredNonTerminals].sort((a, b) => b.length - a.length);
  const sortedKeywords = [...KNOWN_KEYWORDS].sort((a, b) => b.length - a.length);

  const subTokens = [];
  let p = 0;

  while (p < chunk.length) {
    // 1. Check epsilon variants
    let matchedEps = false;
    for (const eps of EPSILON_VARIANTS) {
      if (chunk.startsWith(eps, p)) {
        subTokens.push(EPSILON);
        p += eps.length;
        matchedEps = true;
        break;
      }
    }
    if (matchedEps) continue;

    // 2. Check declared non-terminals (longest match first)
    let matchedNT = false;
    for (const nt of sortedNTs) {
      if (chunk.startsWith(nt, p)) {
        subTokens.push(nt);
        p += nt.length;
        matchedNT = true;
        break;
      }
    }
    if (matchedNT) continue;

    // 3. Check known multi-char keyword terminals
    let matchedKw = false;
    for (const kw of sortedKeywords) {
      if (chunk.startsWith(kw, p)) {
        subTokens.push(kw);
        p += kw.length;
        matchedKw = true;
        break;
      }
    }
    if (matchedKw) continue;

    // 4. Check multi-char operators
    let matchedOp = false;
    for (const op of MULTI_CHAR_OPS) {
      if (chunk.startsWith(op, p)) {
        subTokens.push(op);
        p += op.length;
        matchedOp = true;
        break;
      }
    }
    if (matchedOp) continue;

    // 5. Default: single character terminal/symbol
    subTokens.push(chunk[p]);
    p += 1;
  }

  return subTokens;
}

/**
 * Tokenizes a single right-hand side alternative string into grammar symbols.
 */
export function tokenizeAlternative(altText, declaredNonTerminals) {
  const trimmed = altText.trim();
  if (trimmed.length === 0) {
    return [EPSILON];
  }

  if (EPSILON_VARIANTS.has(trimmed)) {
    return [EPSILON];
  }

  const chunks = trimmed.split(/\s+/).filter(c => c.length > 0);
  const symbols = [];

  for (const chunk of chunks) {
    const sub = subTokenizeChunk(chunk, declaredNonTerminals);
    symbols.push(...sub);
  }

  return symbols.length === 0 ? [EPSILON] : symbols;
}

/**
 * Parses a grammar text into a Grammar object with strict arrow validation.
 *
 * Rules:
 * - Only 1 arrow symbol is allowed: →
 * - Space-separated and unspaced symbol notations: S → aA | b, E → E+T | T
 * - Epsilon representations: ε, epsilon, eps, EPSILON, ^, and empty RHS
 * - Multi-character terminals (e.g. id, num) and non-terminals (e.g. Expr, Term, E')
 * - Full validation with helpful error messages and line numbers
 */
export function parseGrammar(text) {
  const errors = [];
  const warnings = [];
  const lines = text.split('\n');

  // PASS 1: Identify all declared LHS non-terminals across lines using arrow →
  const declaredNonTerminals = new Set();
  let firstLhs = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    const arrowIndex = line.indexOf(ARROW);
    if (arrowIndex !== -1) {
      const lhsRaw = line.slice(0, arrowIndex).trim();
      if (isValidIdentifier(lhsRaw)) {
        declaredNonTerminals.add(lhsRaw);
        if (!firstLhs) firstLhs = lhsRaw;
      }
    }
  }

  // PASS 2: Parse and validate each line
  const rawProductions = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    const arrowIndex = line.indexOf(ARROW);
    if (arrowIndex === -1) {
      const otherArrowMatch = line.match(DISALLOWED_ARROWS_REGEX);
      if (otherArrowMatch) {
        errors.push({
          line: lineNum,
          message: `Invalid arrow '${otherArrowMatch[0]}'. Only the '→' arrow is supported. Click the "Insert Arrow (→)" button or use '→'.`,
        });
      } else {
        errors.push({
          line: lineNum,
          message: `Missing production arrow ('→') in: "${line}". Use '→' to separate LHS from RHS.`,
        });
      }
      continue;
    }

    const lhsRaw = line.slice(0, arrowIndex).trim();
    const rhsRaw = line.slice(arrowIndex + ARROW.length).trim();

    // Validate LHS
    if (lhsRaw.length === 0) {
      errors.push({
        line: lineNum,
        message: `Production is missing a left-hand side non-terminal before '→'.`,
      });
      continue;
    }

    if (/\s/.test(lhsRaw)) {
      errors.push({
        line: lineNum,
        message: `Left-hand side '${lhsRaw}' contains spaces. LHS must be a single non-terminal symbol.`,
      });
      continue;
    }

    if (!isValidIdentifier(lhsRaw)) {
      errors.push({
        line: lineNum,
        message: `Invalid non-terminal '${lhsRaw}' on left-hand side. Non-terminals must start with a letter and contain only letters, numbers, underscores, or primes (').`,
      });
      continue;
    }

    const lhs = lhsRaw;

    // Parse RHS alternatives separated by |
    let alternatives = [];
    if (rhsRaw.length === 0) {
      // Empty RHS (e.g. A → )
      alternatives.push([EPSILON]);
    } else {
      const altStrings = rhsRaw.split('|');
      for (const altStr of altStrings) {
        const symbols = tokenizeAlternative(altStr, declaredNonTerminals);

        // Validate epsilon usage
        if (symbols.length > 1 && symbols.includes(EPSILON)) {
          errors.push({
            line: lineNum,
            message: `Invalid epsilon usage in '${altStr.trim()}': Epsilon ('ε') represents the empty string and cannot be combined with other symbols.`,
          });
        }

        // Validate reserved end marker $
        if (symbols.includes(END_MARKER)) {
          errors.push({
            line: lineNum,
            message: `Reserved symbol '${END_MARKER}' (end-of-input marker) cannot be used as a grammar symbol.`,
          });
        }

        alternatives.push(symbols);
      }
    }

    rawProductions.push({ lhs, rhs: alternatives, lineNum });
  }

  if (rawProductions.length === 0) {
    if (errors.length === 0) {
      errors.push({ line: 0, message: 'No valid productions found. Please enter a grammar.' });
    }
    return { grammar: null, errors, warnings };
  }

  if (errors.length > 0) {
    return { grammar: null, errors, warnings };
  }

  // The start symbol is the LHS of the first production
  const startSymbol = firstLhs || rawProductions[0].lhs;

  // Non-terminals = all symbols that appear as LHS
  const nonTerminals = new Set();
  for (const { lhs } of rawProductions) {
    nonTerminals.add(lhs);
  }

  // Build flat production list and production map
  const productions = [];
  const productionMap = new Map();

  for (const { lhs, rhs } of rawProductions) {
    if (!productionMap.has(lhs)) productionMap.set(lhs, []);
    for (const alt of rhs) {
      productions.push({ lhs, rhs: alt });
      productionMap.get(lhs).push(alt);
    }
  }

  // Terminals = all symbols on RHS that are NOT non-terminals and NOT ε
  const terminals = new Set();
  for (const prod of productions) {
    for (const sym of prod.rhs) {
      if (sym !== EPSILON && !nonTerminals.has(sym)) {
        terminals.add(sym);
      }
    }
  }
  terminals.add(END_MARKER);

  // Check unreachable non-terminals from startSymbol
  const reachable = new Set([startSymbol]);
  const queue = [startSymbol];
  while (queue.length > 0) {
    const current = queue.shift();
    const alts = productionMap.get(current) ?? [];
    for (const alt of alts) {
      for (const sym of alt) {
        if (nonTerminals.has(sym) && !reachable.has(sym)) {
          reachable.add(sym);
          queue.push(sym);
        }
      }
    }
  }

  for (const nt of nonTerminals) {
    if (!reachable.has(nt)) {
      warnings.push(`Non-terminal '${nt}' is unreachable from start symbol '${startSymbol}'.`);
    }
  }

  // Check non-generating non-terminals
  const generating = new Set();
  let genChanged = true;
  while (genChanged) {
    genChanged = false;
    for (const prod of productions) {
      if (generating.has(prod.lhs)) continue;
      const allGeneratingOrTerminal = prod.rhs.every(
        sym => sym === EPSILON || terminals.has(sym) || generating.has(sym)
      );
      if (allGeneratingOrTerminal) {
        generating.add(prod.lhs);
        genChanged = true;
      }
    }
  }

  for (const nt of nonTerminals) {
    if (!generating.has(nt)) {
      warnings.push(`Non-terminal '${nt}' cannot derive any terminal string (non-generating).`);
    }
  }

  const grammar = {
    nonTerminals,
    terminals,
    startSymbol,
    productions,
    productionMap,
    warnings,
  };

  return { grammar, errors, warnings };
}

/** Format a production for display */
export function formatProduction(prod) {
  return `${prod.lhs} → ${prod.rhs.join(' ')}`;
}
