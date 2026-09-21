import { useRef, useState } from 'react';

const NODE_RADIUS = 22;
const H_GAP = 64;
const V_GAP = 72;
const SVG_PADDING = 40;

function computeLayout(root) {
  // Compute leaf positions first, then center parents over children
  let leafIndex = 0;
  const positions = new Map();
  const edges = [];

  function measureLeaves(node) {
    if (node.children.length === 0) return 1;
    return node.children.reduce((sum, c) => sum + measureLeaves(c), 0);
  }

  function assignPositions(node, depth, startLeaf) {
    const y = SVG_PADDING + depth * V_GAP;

    if (node.children.length === 0) {
      const x = SVG_PADDING + startLeaf * H_GAP;
      leafIndex++;
      positions.set(node.id, { x, y });
      return { center: x };
    }

    let currentLeaf = startLeaf;
    const childCenters = [];
    for (const child of node.children) {
      const leaves = measureLeaves(child);
      const result = assignPositions(child, depth + 1, currentLeaf);
      childCenters.push(result.center);
      currentLeaf += leaves;
    }

    const centerX = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    positions.set(node.id, { x: centerX, y });
    return { center: centerX };
  }

  assignPositions(root, 0, 0);

  // Build edges
  function buildEdges(node) {
    const p = positions.get(node.id);
    for (const child of node.children) {
      const c = positions.get(child.id);
      edges.push({ x1: p.x, y1: p.y, x2: c.x, y2: c.y });
      buildEdges(child);
    }
  }
  buildEdges(root);

  // Compute SVG dimensions
  let maxX = 0;
  let maxY = 0;
  for (const { x, y } of positions.values()) {
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return {
    nodes: positions,
    edges,
    svgWidth: maxX + SVG_PADDING + NODE_RADIUS,
    svgHeight: maxY + SVG_PADDING + NODE_RADIUS,
  };
}

function getNodeColor(node) {
  if (node.isEpsilon) return { fill: '#3b1f6e', stroke: '#bc8cff', textColor: '#dcc8ff' };
  if (node.isTerminal) return { fill: '#1a4225', stroke: '#3fb950', textColor: '#7ee787' };
  return { fill: '#1f4b82', stroke: '#58a6ff', textColor: '#a5ccff' };
}

// Text that fits in a circle — truncate if too long
function fitLabel(label) {
  if (label.length <= 4) return label;
  return label.slice(0, 3) + '…';
}

// Render all nodes recursively
function renderTree(root, layout) {
  const elements = [];

  // Draw edges first (behind nodes)
  for (const edge of layout.edges) {
    elements.push(
      <line
        key={`edge-${edge.x1}-${edge.y1}-${edge.x2}-${edge.y2}`}
        x1={edge.x1}
        y1={edge.y1}
        x2={edge.x2}
        y2={edge.y2}
        stroke="#444c56"
        strokeWidth={1.5}
      />
    );
  }

  // Draw nodes
  function drawNode(node) {
    const pos = layout.nodes.get(node.id);
    if (!pos) return;
    const { fill, stroke, textColor } = getNodeColor(node);
    const label = node.symbol;

    elements.push(
      <g key={node.id} transform={`translate(${pos.x},${pos.y})`}>
        <circle
          r={NODE_RADIUS}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={textColor}
          fontSize={label.length <= 2 ? 13 : label.length <= 4 ? 11 : 9}
          fontFamily="'JetBrains Mono', monospace"
          fontWeight={600}
        >
          {label.length > 5 ? fitLabel(label) : label}
        </text>
      </g>
    );

    for (const child of node.children) {
      drawNode(child);
    }
  }

  drawNode(root);
  return elements;
}

// Textual tree representation using ASCII art
function buildTextTree(node, prefix = '', isLast = true) {
  const connector = isLast ? '└── ' : '├── ';
  const childPrefix = isLast ? '    ' : '│   ';
  let result = prefix + (prefix ? connector : '') + node.symbol + '\n';
  for (let i = 0; i < node.children.length; i++) {
    result += buildTextTree(node.children[i], prefix + (prefix ? childPrefix : ''), i === node.children.length - 1);
  }
  return result;
}

const ParseTreeView = ({ parseResult }) => {
  const [viewMode, setViewMode] = useState('svg');
  const svgRef = useRef(null);

  if (!parseResult || !parseResult.treeRoot) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">🌳</div>
        <div className="empty-title">No parse tree yet</div>
        <div className="empty-sub">Run the parser to generate a parse tree from the input string.</div>
      </div>
    );
  }

  if (!parseResult.accepted && !parseResult.treeRoot.children.length) {
    return (
      <div className="section fade-in">
        <div className="alert alert-error">
          <span className="alert-icon">❌</span>
          <div className="alert-content">
            <div className="alert-title">Parse failed — no tree to display</div>
            <div className="alert-body">{parseResult.error}</div>
          </div>
        </div>
      </div>
    );
  }

  const root = parseResult.treeRoot;
  const layout = computeLayout(root);
  const textTree = buildTextTree(root);

  return (
    <div className="section fade-in">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title"><span className="icon">🌳</span> Parse Tree</h2>
          <div className="btn-group">
            <button
              className={`btn btn-sm ${viewMode === 'svg' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('svg')}
            >
              🖼 Visual
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('text')}
            >
              📄 Text
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#1f4b82', border: '2px solid #58a6ff', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Non-terminal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#1a4225', border: '2px solid #3fb950', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Terminal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b1f6e', border: '2px solid #bc8cff', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Epsilon (ε)</span>
          </div>
        </div>

        {viewMode === 'svg' ? (
          <div className="tree-container" style={{ overflowX: 'auto', overflowY: 'auto', minHeight: '320px' }}>
            <svg
              ref={svgRef}
              width={layout.svgWidth}
              height={layout.svgHeight}
              style={{ display: 'block', minWidth: '100%' }}
            >
              {renderTree(root, layout)}
            </svg>
          </div>
        ) : (
          <div className="tree-container" style={{ padding: '1.5rem' }}>
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.88rem',
              color: 'var(--text-primary)',
              lineHeight: 1.7,
              margin: 0,
              whiteSpace: 'pre',
            }}>
              {textTree}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParseTreeView;
