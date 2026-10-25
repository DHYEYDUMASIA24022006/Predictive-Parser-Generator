import { parseGrammar } from '../grammarParser.js';
import { computeFirst } from '../first.js';
import { computeFollow } from '../follow.js';
import { buildParsingTable, isLL1 } from '../parsingTable.js';
import { tokenize } from '../tokenizer.js';
import { runPredictiveParser } from '../predictiveParser.js';

console.log('Testing grammar parsing and algorithms...\n');

let failed = 0;
let passed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details}`);
    failed++;
  }
}

// Case 1: Simple grammars
console.log('Test 1: Simple grammars (S → aA | b, A → a | b)');
{
  const text = `S → aA | b\nA → a | b`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'No errors in simple grammar');
  assert(grammar?.nonTerminals.has('S') && grammar?.nonTerminals.has('A'), 'Non-terminals S and A identified');
  assert(grammar?.terminals.has('a') && grammar?.terminals.has('b'), 'Terminals a and b identified');

  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);

  assert(first.get('S').has('a') && first.get('S').has('b'), 'FIRST(S) = {a, b}');
  assert(follow.get('S').has('$'), 'FOLLOW(S) has $');
  assert(isLL1(table), 'Grammar is LL(1)');
}

// Case 2: Epsilon productions
console.log('\nTest 2: Epsilon productions (S → AB, A → a | ε, B → b | ε)');
{
  const text = `S → AB\nA → a | ε\nB → b | ε`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'No errors in epsilon grammar');
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);

  assert(first.get('A').has('ε'), 'FIRST(A) has ε');
  assert(first.get('B').has('ε'), 'FIRST(B) has ε');
  assert(first.get('S').has('ε'), 'FIRST(S) has ε');
  assert(first.get('S').has('a') && first.get('S').has('b'), 'FIRST(S) has a and b');
  assert(follow.get('A').has('b') && follow.get('A').has('$'), 'FOLLOW(A) has b and $');
  assert(isLL1(table), 'Grammar is LL(1)');
}

// Case 3: Left-recursive grammars
console.log('\nTest 3: Left-recursive grammars (E → E+T | T, T → T*F | F, F → (E) | id)');
{
  const text = `E → E+T | T\nT → T*F | F\nF → (E) | id`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'No parse errors in left-recursive grammar');
  assert(grammar?.terminals.has('id') && grammar?.terminals.has('+') && grammar?.terminals.has('*'), 'Tokens id, +, * detected');
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);
  assert(!isLL1(table), 'Left-recursive grammar is correctly detected as NOT LL(1)');
}

// Case 4: Right-recursive grammars
console.log('\nTest 4: Right-recursive grammars (S → aS | b)');
{
  const text = `S → aS | b`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'Right-recursive grammar parsed without errors');
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);
  assert(isLL1(table), 'Right-recursive grammar is LL(1)');
}

// Case 5: Grammars with multiple alternatives
console.log('\nTest 5: Grammars with multiple alternatives (S → aA | bB | c, A → a | ε, B → b | ε)');
{
  const text = `S → aA | bB | c\nA → a | ε\nB → b | ε`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'Grammar with multiple alternatives parsed without errors');
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);
  assert(isLL1(table), 'Grammar is LL(1)');
}

// Case 6: Grammars with common prefixes
console.log('\nTest 6: Grammars with common prefixes (S → abA | abB | c)');
{
  const text = `S → abA | abB | c\nA → a\nB → b`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'Common prefix grammar parsed without errors');
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);
  assert(!isLL1(table), 'Common prefix grammar correctly detected as NOT LL(1)');
}

// Case 7: Grammars with multi-character terminals
console.log('\nTest 7: Multi-character terminals (E → E + T | T, T → id)');
{
  const text = `E → E + T | T\nT → id`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'Parsed multi-char terminal grammar');
  assert(grammar?.terminals.has('id'), 'Terminal "id" preserved as atomic token');
}

// Case 8: Multi-character non-terminals (Expr, Term, Factor)
console.log('\nTest 8: Multi-character non-terminals (Expr → Term ExprPrime)');
{
  const text = `Expr → Term ExprPrime\nExprPrime → + Term ExprPrime | ε\nTerm → Factor TermPrime\nTermPrime → * Factor TermPrime | ε\nFactor → ( Expr ) | id`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'Parsed multi-char non-terminal grammar');
  assert(grammar?.nonTerminals.has('Expr') && grammar?.nonTerminals.has('ExprPrime'), 'Multi-character NTs recognized');
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);
  assert(isLL1(table), 'Grammar is LL(1)');
}

// Case 9: Strict single arrow enforcement (only '→' is accepted, others rejected)
console.log('\nTest 9: Strict single arrow enforcement (only "→" is supported)');
{
  const validArrow = parseGrammar(`S → a`);
  assert(validArrow.errors.length === 0, 'Only Unicode arrow "→" is accepted');

  const asciiArrow = parseGrammar(`S -> a`);
  assert(asciiArrow.errors.length > 0 && asciiArrow.errors[0].message.includes("Only the '→' arrow is supported"), 'ASCII "->" is rejected with helpful error');

  const longArrow = parseGrammar(`S ⟶ a`);
  assert(longArrow.errors.length > 0 && longArrow.errors[0].message.includes("Only the '→' arrow is supported"), 'Long arrow "⟶" is rejected with helpful error');

  const bnfArrow = parseGrammar(`S ::= a`);
  assert(bnfArrow.errors.length > 0 && bnfArrow.errors[0].message.includes("Only the '→' arrow is supported"), 'BNF "::=" is rejected with helpful error');
}

// Case 10: Epsilon representations (ε, eps, epsilon)
console.log('\nTest 10: Epsilon representations (ε, eps, epsilon)');
{
  const text = `A → ε\nB → eps\nC → epsilon\nD → EPSILON\nE →`;
  const { grammar, errors } = parseGrammar(text);
  assert(errors.length === 0, 'All epsilon representations parsed without error');
  assert(grammar?.productionMap.get('A')[0][0] === 'ε', 'ε normalized');
  assert(grammar?.productionMap.get('B')[0][0] === 'ε', 'eps normalized');
  assert(grammar?.productionMap.get('C')[0][0] === 'ε', 'epsilon normalized');
  assert(grammar?.productionMap.get('D')[0][0] === 'ε', 'EPSILON normalized');
  assert(grammar?.productionMap.get('E')[0][0] === 'ε', 'empty RHS normalized to ε');
}

// Case 11: Malformed productions error reporting
console.log('\nTest 11: Error handling for malformed input');
{
  const missingArrow = parseGrammar('S aA');
  assert(missingArrow.errors.length > 0 && missingArrow.errors[0].line === 1, 'Missing arrow detected with line number');

  const emptyLhs = parseGrammar('→ aA');
  assert(emptyLhs.errors.length > 0 && emptyLhs.errors[0].line === 1, 'Empty LHS detected with line number');

  const invalidEpsilon = parseGrammar('S → a ε');
  assert(invalidEpsilon.errors.length > 0, 'Invalid epsilon usage detected with line number');
}

// Case 12: Tokenizer with terminals
console.log('\nTest 12: Tokenizer with grammar terminals');
{
  const terminals = new Set(['id', '+', '*', '(', ')', '$']);
  const tokens1 = tokenize('id + id * id', terminals);
  assert(tokens1.join(' ') === 'id + id * id $', 'Space-separated expression tokenized correctly');

  const tokens2 = tokenize('id+id*id', terminals);
  assert(tokens2.join(' ') === 'id + id * id $', 'Unspaced expression tokenized correctly');

  const abTerms = new Set(['a', 'b', '$']);
  const tokens3 = tokenize('aab', abTerms);
  assert(tokens3.join(' ') === 'a a b $', 'Unspaced aab tokenized to [a, a, b, $]');
}

// Case 13: Predictive parsing of sample grammar
console.log('\nTest 13: Predictive parser execution on sample grammar (S → aA | b, A → aS | ε)');
{
  const text = `S → aA | b\nA → aS | ε`;
  const { grammar } = parseGrammar(text);
  const first = computeFirst(grammar);
  const follow = computeFollow(grammar, first);
  const table = buildParsingTable(grammar, first, follow);

  // Parse 'b' (0 a's + b)
  const res1 = runPredictiveParser(grammar, table, tokenize('b', grammar.terminals));
  assert(res1.accepted === true, 'Sample grammar accepts "b"');
  assert(res1.treeRoot.children.length === 1, 'Parse tree generated for "b"');

  // Parse 'a' (S -> a A -> a ε = a)
  const res2 = runPredictiveParser(grammar, table, tokenize('a', grammar.terminals));
  assert(res2.accepted === true, 'Sample grammar accepts "a" (S → a A → a ε)');

  // Parse 'a a b' (S -> a A -> a a S -> a a b)
  const res3 = runPredictiveParser(grammar, table, tokenize('a a b', grammar.terminals));
  assert(res3.accepted === true, 'Sample grammar accepts "a a b"');

  // Parse 'a b' (invalid: A only derives a S or ε, FOLLOW(A) = {$})
  const res4 = runPredictiveParser(grammar, table, tokenize('a b', grammar.terminals));
  assert(res4.accepted === false, 'Invalid input "a b" is rejected with clear error');
}

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

