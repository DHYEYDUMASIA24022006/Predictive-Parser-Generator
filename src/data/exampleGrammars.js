export const exampleGrammars = [
  {
    name: 'Arithmetic Expressions (LL(1))',
    description: 'Classic expression grammar for arithmetic with + and * operators. Left-recursion eliminated.',
    isLL1: true,
    grammar: `E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id`,
    input: 'id + id * id',
  },
  {
    name: 'Simple Statement Grammar',
    description: 'Grammar for simple if-then-else and assignment statements.',
    isLL1: true,
    grammar: `S -> if E then S S' | a
S' -> else S | ε
E -> b`,
    input: 'if b then a else a',
  },
  {
    name: 'Balanced Parentheses',
    description: 'Grammar that generates balanced parentheses (with optional inner expressions).',
    isLL1: true,
    grammar: `S -> ( S ) S | ε`,
    input: '( ( ) )',
  },
  {
    name: 'Non-LL(1): Left Recursive',
    description: 'This grammar has left recursion. It is NOT LL(1) and will show conflicts.',
    isLL1: false,
    grammar: `E -> E + T | T
T -> T * F | F
F -> ( E ) | id`,
    input: 'id + id * id',
  },
  {
    name: 'Non-LL(1): Ambiguous Grammar',
    description: 'Dangling-else style ambiguity. Common FIRST/FOLLOW conflict.',
    isLL1: false,
    grammar: `S -> i E t S S' | a
S' -> e S | e S e S | ε
E -> b`,
    input: 'i b t a e a',
  },
];
