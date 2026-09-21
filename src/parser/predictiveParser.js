import { EPSILON, END_MARKER } from '../constants.js';
import { createNode, resetNodeCounter } from './parseTree.js';
import { formatProduction } from './grammarParser.js';

/**
 * Runs the full LL(1) predictive parsing algorithm.
 * Returns all steps and the resulting parse tree.
 *
 * Stack is represented as an array with top at the END of the array.
 */
export function runPredictiveParser(grammar, table, tokens) {
  resetNodeCounter();

  const steps = [];
  const stack = [END_MARKER, grammar.startSymbol];
  const input = [...tokens];

  // Build parse tree root
  const treeRoot = createNode(grammar.startSymbol, false);

  // Stack of tree nodes (parallel to parsing stack)
  const nodeStack = [null, treeRoot]; // null for $

  let stepNum = 0;
  let inputPos = 0;

  const MAX_STEPS = 500; // safety guard

  while (stack.length > 0 && stepNum < MAX_STEPS) {
    const top = stack[stack.length - 1];
    const currentToken = input[inputPos] ?? END_MARKER;

    const stackSnapshot = [...stack];
    const inputSnapshot = input.slice(inputPos);

    if (top === END_MARKER) {
      if (currentToken === END_MARKER) {
        steps.push({
          step: ++stepNum,
          stack: stackSnapshot,
          input: inputSnapshot,
          action: 'Accept',
          isAccept: true,
        });
        return { steps, treeRoot, accepted: true };
      } else {
        steps.push({
          step: ++stepNum,
          stack: stackSnapshot,
          input: inputSnapshot,
          action: `Error: expected end of input but got '${currentToken}'`,
          isError: true,
        });
        return { steps, treeRoot, accepted: false, error: `Expected end of input, got '${currentToken}'` };
      }
    }

    if (grammar.terminals.has(top) || top === END_MARKER) {
      // Terminal on stack top
      if (top === currentToken) {
        // Match
        stack.pop();
        const matchedNode = nodeStack.pop();
        if (matchedNode) matchedNode.matched = true;
        steps.push({
          step: ++stepNum,
          stack: stackSnapshot,
          input: inputSnapshot,
          action: `Match '${top}'`,
        });
        inputPos++;
      } else {
        steps.push({
          step: ++stepNum,
          stack: stackSnapshot,
          input: inputSnapshot,
          action: `Error: expected '${top}' but got '${currentToken}'`,
          isError: true,
        });
        return {
          steps, treeRoot, accepted: false,
          error: `Terminal mismatch at step ${stepNum}: expected '${top}', got '${currentToken}'`
        };
      }
    } else if (grammar.nonTerminals.has(top)) {
      // Non-terminal on stack top
      const row = table.get(top);
      if (!row) {
        steps.push({
          step: ++stepNum,
          stack: stackSnapshot,
          input: inputSnapshot,
          action: `Error: no table row for non-terminal '${top}'`,
          isError: true,
        });
        return { steps, treeRoot, accepted: false, error: `No table row for '${top}'` };
      }

      const entries = row.get(currentToken);
      if (!entries || entries.length === 0) {
        // Error: no entry in table
        const expected = [...row.keys()].join(', ');
        steps.push({
          step: ++stepNum,
          stack: stackSnapshot,
          input: inputSnapshot,
          action: `Error: no production for (${top}, ${currentToken}). Expected: ${expected || 'nothing'}`,
          isError: true,
        });
        return {
          steps, treeRoot, accepted: false,
          error: `No production for (${top}, ${currentToken}). Expected one of: ${expected}`
        };
      }

      // Use first entry (if conflict, we still use first — table was built with conflict detection)
      const prod = entries[0].production;

      // Pop stack top (the non-terminal)
      stack.pop();
      const parentNode = nodeStack.pop();

      steps.push({
        step: ++stepNum,
        stack: stackSnapshot,
        input: inputSnapshot,
        action: formatProduction(prod),
      });

      if (prod.rhs.length === 1 && prod.rhs[0] === EPSILON) {
        // Push ε node as child
        if (parentNode) {
          const epsilonChild = createNode(EPSILON, true, true);
          parentNode.children.push(epsilonChild);
        }
        // Don't push anything onto the parsing stack
      } else {
        // Push RHS in reverse order onto stack and node stack
        const childNodes = prod.rhs.map(sym =>
          createNode(sym, grammar.terminals.has(sym) || !grammar.nonTerminals.has(sym))
        );

        if (parentNode) {
          for (const child of childNodes) {
            parentNode.children.push(child);
          }
        }

        for (let i = prod.rhs.length - 1; i >= 0; i--) {
          stack.push(prod.rhs[i]);
          nodeStack.push(childNodes[i]);
        }
      }
    } else {
      // Unknown symbol on stack
      steps.push({
        step: ++stepNum,
        stack: stackSnapshot,
        input: inputSnapshot,
        action: `Error: unknown symbol '${top}' on stack`,
        isError: true,
      });
      return { steps, treeRoot, accepted: false, error: `Unknown symbol '${top}' on stack` };
    }
  }

  if (stepNum >= MAX_STEPS) {
    return {
      steps, treeRoot, accepted: false,
      error: 'Parser exceeded maximum steps. Possible infinite loop in grammar.'
    };
  }

  return { steps, treeRoot, accepted: false };
}
