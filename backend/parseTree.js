let nodeIdCounter = 0;

export function createNode(symbol, isTerminal, isEpsilon = false) {
  return {
    id: `node-${nodeIdCounter++}`,
    symbol,
    children: [],
    isTerminal,
    isEpsilon,
    matched: false,
  };
}

export function resetNodeCounter() {
  nodeIdCounter = 0;
}

const H_SPACING = 60;
const V_SPACING = 70;

export function layoutTree(root) {
  const layout = new Map();
  let xCounter = 0;

  function dfs(node, depth) {
    if (node.children.length === 0) {
      const x = xCounter * H_SPACING;
      xCounter++;
      layout.set(node.id, { node, x, y: depth * V_SPACING, subtreeWidth: H_SPACING });
      return x;
    }

    const childCenters = [];
    for (const child of node.children) {
      childCenters.push(dfs(child, depth + 1));
    }

    const x = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    layout.set(node.id, { node, x, y: depth * V_SPACING, subtreeWidth: H_SPACING * node.children.length });
    return x;
  }

  dfs(root, 0);
  return layout;
}
