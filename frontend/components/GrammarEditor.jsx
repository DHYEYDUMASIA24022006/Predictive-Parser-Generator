import { useState, useRef } from 'react';
import { exampleGrammars } from '../data/exampleGrammars.js';

const SAMPLE_GRAMMAR_TEXT = `S → aA | b\nA → aS | ε`;

const GrammarEditor = ({
  grammarText,
  onGrammarChange,
  grammar,
  errors,
  onParse,
  onEliminateLR,
  onLeftFactor,
}) => {
  const [showExamples, setShowExamples] = useState(false);
  const [copiedEps, setCopiedEps] = useState(false);
  const [copiedArrow, setCopiedArrow] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [loadNotice, setLoadNotice] = useState(false);
  const [transformNotice, setTransformNotice] = useState(null);
  const textareaRef = useRef(null);

  /**
   * Inserts a symbol at the current cursor position or replaces current selection.
   * Preserves text before and after, then positions cursor right after the inserted text.
   */
  const handleInsertSymbol = (sym) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onGrammarChange(grammarText + sym);
      return;
    }
    const start = textarea.selectionStart ?? grammarText.length;
    const end = textarea.selectionEnd ?? grammarText.length;
    const nextText = grammarText.slice(0, start) + sym + grammarText.slice(end);
    onGrammarChange(nextText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + sym.length, start + sym.length);
    }, 0);
  };

  const handleCopySymbol = (sym, type) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(sym);
    }
    if (type === 'epsilon') {
      setCopiedEps(true);
      setTimeout(() => setCopiedEps(false), 2000);
    } else if (type === 'arrow') {
      setCopiedArrow(true);
      setTimeout(() => setCopiedArrow(false), 2000);
    }
  };

  const handleCopySample = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SAMPLE_GRAMMAR_TEXT);
    }
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const handleLoadSample = () => {
    onGrammarChange(SAMPLE_GRAMMAR_TEXT);
    setLoadNotice(true);
    setTimeout(() => setLoadNotice(false), 3000);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTriggerEliminateLR = () => {
    if (!onEliminateLR) return;
    const res = onEliminateLR();
    if (res.transformed) {
      setTransformNotice({
        type: 'success',
        message: `✓ Left recursion eliminated! Added ${res.changes.map(c => c.newNT).join(', ')}. Grammar parsed successfully.`,
      });
    } else {
      setTransformNotice({
        type: 'info',
        message: 'ℹ️ No left recursion found in current grammar.',
      });
    }
    setTimeout(() => setTransformNotice(null), 4000);
  };

  const handleTriggerLeftFactor = () => {
    if (!onLeftFactor) return;
    const res = onLeftFactor();
    if (res.transformed) {
      setTransformNotice({
        type: 'success',
        message: `✓ Common prefixes left-factored! Added ${res.changes.map(c => c.newNT).join(', ')}. Grammar parsed successfully.`,
      });
    } else {
      setTransformNotice({
        type: 'info',
        message: 'ℹ️ No common prefixes requiring left factoring found.',
      });
    }
    setTimeout(() => setTransformNotice(null), 4000);
  };

  return (
    <div className="section fade-in">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="icon">📝</span>
            Grammar Editor
          </h2>
          <div className="btn-group">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExamples(v => !v)}
            >
              📚 {showExamples ? 'Hide Examples' : 'Load Example'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTriggerEliminateLR}
              title="Eliminate Left Recursion (General Method)"
            >
              🔄 Eliminate Left Recursion
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleTriggerLeftFactor}
              title="Apply Left Factoring (Remove Common Prefixes)"
            >
              🎯 Left Factor
            </button>
            <button className="btn btn-primary" onClick={onParse}>
              ⚡ Parse Grammar
            </button>
          </div>
        </div>

        {transformNotice && (
          <div className={`alert ${transformNotice.type === 'success' ? 'alert-success' : 'alert-info'}`} style={{ marginBottom: '1rem' }}>
            <span className="alert-icon">{transformNotice.type === 'success' ? '✅' : 'ℹ️'}</span>
            <div className="alert-content">
              <div className="alert-body">{transformNotice.message}</div>
            </div>
          </div>
        )}

        {showExamples && (
          <div className="example-picker" style={{ marginBottom: '1.25rem' }}>
            {exampleGrammars.map(eg => (
              <button
                key={eg.name}
                className="example-card"
                onClick={() => {
                  onGrammarChange(eg.grammar);
                  setShowExamples(false);
                }}
              >
                <div className="example-card-name">
                  {eg.isLL1
                    ? <span className="badge badge-green" style={{ marginRight: '0.4rem' }}>LL(1)</span>
                    : <span className="badge badge-red" style={{ marginRight: '0.4rem' }}>Not LL(1)</span>
                  }
                  {eg.name}
                </div>
                <div className="example-card-desc">{eg.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* 1. Sample Grammar Display Above Input Box */}
        <div className="sample-grammar-container">
          <div className="sample-grammar-header">
            <div className="sample-grammar-title-group">
              <span className="badge badge-blue">Syntax Guide</span>
              <span className="sample-grammar-heading">Example Grammar</span>
            </div>
            <div className="btn-group">
              <button
                type="button"
                className={`btn btn-secondary btn-sm ${copiedSample ? 'copied' : ''}`}
                onClick={handleCopySample}
                title="Copy sample grammar to clipboard"
              >
                {copiedSample ? '✓ Copied' : '📋 Copy Example'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLoadSample}
                title="Load this example into the grammar editor"
              >
                📥 Load Example
              </button>
            </div>
          </div>

          <div className="sample-grammar-box">
            <div className="sample-grammar-code">
              <div><span className="sample-nt">S</span> <span className="sample-arrow">→</span> <span className="sample-term">a</span><span className="sample-nt">A</span> <span className="sample-pipe">|</span> <span className="sample-term">b</span></div>
              <div><span className="sample-nt">A</span> <span className="sample-arrow">→</span> <span className="sample-term">a</span><span className="sample-nt">S</span> <span className="sample-pipe">|</span> <span className="sample-eps">ε</span></div>
            </div>
          </div>

          <div className="sample-grammar-instructions">
            Enter one production per line. Use <span className="code-chip">→</span> to separate the left-hand side from the right-hand side. Use <span className="code-chip">|</span> to specify multiple alternatives. Use <span className="code-chip">ε</span> for an empty production.
          </div>

          {loadNotice && (
            <div className="sample-loaded-toast">
              ✓ Sample grammar loaded into editor! Click <strong>Parse Grammar</strong> to analyze.
            </div>
          )}
        </div>

        <div>
          <label className="input-label" style={{ marginTop: '1rem' }}>
            Productions (one per line, use | for alternatives, ε for epsilon)
          </label>

          {/* 2. Symbol Helper Bar with Insert Arrow and Insert Epsilon */}
          <div className="symbol-helper-bar">
            <div className="symbol-box-left">
              {/* Arrow insertion control */}
              <button
                type="button"
                className="arrow-chip-btn"
                onClick={() => handleInsertSymbol('→')}
                title="Insert production arrow (→) at cursor position into editor"
              >
                <span className="arrow-symbol">→</span>
                <span className="arrow-label">Insert Arrow (→)</span>
              </button>
              <button
                type="button"
                className={`copy-chip-btn ${copiedArrow ? 'copied' : ''}`}
                onClick={() => handleCopySymbol('→', 'arrow')}
                title="Copy → to clipboard"
              >
                {copiedArrow ? '✓ Copied →' : '📋 Copy →'}
              </button>

              <span className="symbol-divider" />

              {/* Epsilon insertion control */}
              <button
                type="button"
                className="epsilon-chip-btn"
                onClick={() => handleInsertSymbol('ε')}
                title="Insert ε at cursor position into editor"
              >
                <span className="epsilon-symbol">ε</span>
                <span className="epsilon-label">Insert ε</span>
              </button>
              <button
                type="button"
                className={`copy-chip-btn ${copiedEps ? 'copied' : ''}`}
                onClick={() => handleCopySymbol('ε', 'epsilon')}
                title="Copy ε to clipboard"
              >
                {copiedEps ? '✓ Copied ε' : '📋 Copy ε'}
              </button>
            </div>

            <div className="symbol-box-right">
              <span>Required Arrow: <code className="mono-tag">→</code> | Epsilon: <code className="mono-tag">ε</code> <code className="mono-tag">eps</code> <code className="mono-tag">epsilon</code></span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className="grammar-textarea"
            value={grammarText}
            onChange={e => onGrammarChange(e.target.value)}
            spellCheck={false}
            placeholder={"S → aA | b\nA → aS | ε"}
          />
        </div>

        {/* Errors display */}
        {errors && errors.length > 0 && (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {errors.map((err, i) => (
              <div key={i} className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                <div className="alert-content">
                  {err.line > 0 && <div className="alert-title">Line {err.line}</div>}
                  <div className="alert-body">{err.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warnings display (e.g. unreachable non-terminals) */}
        {grammar?.warnings && grammar.warnings.length > 0 && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {grammar.warnings.map((warn, i) => (
              <div key={i} className="alert alert-warning">
                <span className="alert-icon">ℹ️</span>
                <div className="alert-content">
                  <div className="alert-title">Grammar Notice</div>
                  <div className="alert-body">{warn}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {grammar && (
        <div className="grid-3">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><span className="icon">🔤</span> Non-Terminals</h3>
              <span className="badge badge-purple">{grammar.nonTerminals.size}</span>
            </div>
            <div className="symbols-grid">
              {[...grammar.nonTerminals].map(nt => (
                <span key={nt} className="badge badge-blue" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {nt}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><span className="icon">🔡</span> Terminals</h3>
              <span className="badge badge-purple">
                {[...grammar.terminals].filter(t => t !== '$').length}
              </span>
            </div>
            <div className="symbols-grid">
              {[...grammar.terminals].filter(t => t !== '$').map(t => (
                <span key={t} className="badge badge-orange" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><span className="icon">🎯</span> Start Symbol</h3>
            </div>
            <span className="badge badge-green" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', padding: '0.4rem 0.9rem' }}>
              {grammar.startSymbol}
            </span>
          </div>
        </div>
      )}

      {grammar && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><span className="icon">📋</span> Productions</h3>
            <span className="badge badge-muted">{grammar.productions.length} productions</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Non-Terminal</th>
                  <th>Production</th>
                </tr>
              </thead>
              <tbody>
                {grammar.productions.map((prod, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{prod.lhs}</td>
                    <td>
                      <span style={{ color: 'var(--text-muted)' }}>→ </span>
                      {prod.rhs.map((sym, j) => (
                        <span key={j}>
                          {j > 0 && ' '}
                          <span style={{
                            color: sym === 'ε' ? 'var(--purple)' :
                              grammar.nonTerminals.has(sym) ? 'var(--accent)' : 'var(--orange)'
                          }}>
                            {sym}
                          </span>
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrammarEditor;
