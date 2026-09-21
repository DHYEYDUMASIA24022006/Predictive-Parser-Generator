# Predictive Parser Generator

An interactive **LL(1) Predictive Parser Generator** web application for compiler design education. Built with **React + Vite + JavaScript**.

## ✨ Features

- **Grammar Editor** — Enter any context-free grammar in BNF-like notation
- **FIRST Sets** — Dynamically computed using the iterative fixed-point algorithm
- **FOLLOW Sets** — Dynamically computed with all three FOLLOW rules
- **LL(1) Parsing Table** — Automatically generated with conflict detection
- **Step-by-Step Parser** — Full stack-based LL(1) predictive parser with navigation controls
- **Parse Tree Visualization** — SVG-rendered tree built from the actual parsing process
- **Example Grammars** — Including both LL(1) and non-LL(1) examples

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## 🏗️ Project Structure

```
src/
├── constants.js            # Core constants (EPSILON, END_MARKER)
├── parser/
│   ├── grammarParser.js    # Grammar text → Grammar object
│   ├── first.js            # FIRST set algorithm
│   ├── follow.js           # FOLLOW set algorithm
│   ├── parsingTable.js     # LL(1) parsing table generator
│   ├── predictiveParser.js # Stack-based LL(1) parser engine
│   ├── tokenizer.js        # Input string tokenizer
│   └── parseTree.js        # Parse tree node creation & layout
├── data/
│   └── exampleGrammars.js  # Pre-loaded example grammars
└── components/
    ├── Pipeline.jsx         # Top pipeline progress indicator
    ├── GrammarEditor.jsx    # Grammar input tab
    ├── FirstFollowTable.jsx # FIRST & FOLLOW display tab
    ├── ParsingTableView.jsx # LL(1) table display tab
    ├── ParserSteps.jsx      # Step-by-step parser tab
    └── ParseTreeView.jsx    # Parse tree visualization tab
```

## 🔬 Algorithms Explained

### FIRST Sets

**FIRST(X)** is the set of terminals that can appear as the first symbol of any string derived from X.

**Algorithm** (iterative fixed-point):

For each non-terminal A and each production A → Y₁ Y₂ ... Yₖ:
1. Add FIRST(Y₁) − {ε} to FIRST(A)
2. If ε ∈ FIRST(Y₁), add FIRST(Y₂) − {ε}, and so on
3. If ε ∈ FIRST(Yᵢ) for all i from 1 to k, add ε to FIRST(A)
4. If A → ε is a production, add ε to FIRST(A)

Repeat until no changes occur (fixed point reached).

**Example** (arithmetic grammar):
```
FIRST(F) = { (, id }
FIRST(T') = { *, ε }
FIRST(T) = { (, id }
FIRST(E') = { +, ε }
FIRST(E) = { (, id }
```

---

### FOLLOW Sets

**FOLLOW(A)** is the set of terminals that can appear immediately to the right of A in any sentential form.

**Algorithm** (iterative fixed-point):

1. Add `$` to FOLLOW(start symbol)
2. For every production B → α A β:
   - Add FIRST(β) − {ε} to FOLLOW(A)
   - If ε ∈ FIRST(β), add FOLLOW(B) to FOLLOW(A)
3. For every production B → α A (A is at the end):
   - Add FOLLOW(B) to FOLLOW(A)

Repeat until no changes occur.

**Example** (arithmetic grammar):
```
FOLLOW(E)  = { ), $ }
FOLLOW(E') = { ), $ }
FOLLOW(T)  = { +, ), $ }
FOLLOW(T') = { +, ), $ }
FOLLOW(F)  = { *, +, ), $ }
```

---

### LL(1) Parsing Table

The predictive parsing table M[A, a] is built as follows:

For each production **A → α**:

1. For each terminal **a** in FIRST(α): add A → α to M[A, a]
2. If **ε ∈ FIRST(α)**: for each terminal **b** in FOLLOW(A): add A → α to M[A, b]

If any cell M[A, a] receives **more than one production**, there is an **LL(1) conflict** and the grammar is **not LL(1)**.

**Example cell** M[E, id] = `E → T E'` because `id ∈ FIRST(T E') = FIRST(T)`.

---

### LL(1) Predictive Parsing

The parser uses a **stack** and the **parsing table** to parse input:

**Initial state:** Stack = `[$ S]` (top = S), Input = `w $`

**Algorithm:**

```
while stack not empty:
  top = stack.top
  a = current input token

  if top == a (terminal match):
    pop stack, advance input
  elif top is non-terminal:
    if M[top, a] = A → β:
      pop A from stack
      push β in reverse order
    else:
      ERROR
  elif top == $:
    if a == $: ACCEPT
    else: ERROR
```

Each step is recorded with the full stack, input, and action for display.

---

### Parse Tree Construction

The parse tree is built **simultaneously** with parsing:
- Each non-terminal node is created when it's pushed onto the stack
- When a production A → α is applied, the RHS symbols α become children of A
- Terminal nodes are marked as "matched" when consumed from input
- ε productions create an ε leaf child

The tree is laid out using a leaf-centered layout algorithm:
- Leaf nodes are spaced evenly horizontally
- Parent nodes are centered over their children
- Rendered as an SVG with circles and edges

---

## 🎛️ Usage

1. **Enter Grammar** — Type your grammar in the editor (or load an example)
2. **Parse Grammar** — Click "Parse Grammar" to compute FIRST/FOLLOW/Table
3. **Explore** — Use tabs to see FIRST & FOLLOW sets, the parsing table, etc.
4. **Run Parser** — Go to Parser tab, enter an input string, click "Run Parser"
5. **Step Through** — Use Prev/Next/AutoPlay to walk through each parsing step
6. **View Tree** — Switch to Parse Tree tab to see the visual derivation tree

## 📝 Grammar Format

```
NT -> sym1 sym2 | sym3 sym4
NT -> ε
```

- Non-terminals: identifiers starting with an uppercase letter (e.g., `E`, `E'`, `Stmt`)
- Terminals: any other token (e.g., `id`, `+`, `*`, `(`, `)`)
- Alternatives: separated by `|`
- Epsilon: use `ε`, `epsilon`, or `eps`
- The **first production's LHS** is taken as the start symbol
- Comments: lines starting with `//` or `#` are ignored

## 🧪 Example Grammar (Default)

```
E -> T E'
E' -> + T E' | ε
T -> F T'
T' -> * F T' | ε
F -> ( E ) | id
```

Default input: `id + id * id`

Expected parse steps: 18 steps, resulting in `Accept`.

## ⚠️ Non-LL(1) Detection

Load the "Left Recursive" example to see conflict detection. The parsing table will highlight conflicting cells in red, and the LL(1) status banner will show "Grammar is NOT LL(1)".

## 🛠️ Build

```bash
npm run build
```

Output goes to `dist/`. Zero build errors, zero console errors.

## 📚 References

- Aho, Lam, Sethi, Ullman — *Compilers: Principles, Techniques, and Tools* (Dragon Book), 2nd Edition
- Chapter 4: Syntax Analysis — LL(1) grammars, predictive parsing
