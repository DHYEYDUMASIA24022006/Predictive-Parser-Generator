import { useState } from 'react';
import { exampleGrammars } from '../data/exampleGrammars.js';

const GrammarEditor = ({
  grammarText,
  onGrammarChange,
  grammar,
  errors,
  onParse,
}) => {
  const [showExamples, setShowExamples] = useState(false);

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
            <button className="btn btn-primary" onClick={onParse}>
              ⚡ Parse Grammar
            </button>
          </div>
        </div>

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

        <div>
          <label className="input-label">Productions (one per line, use | for alternatives, ε for epsilon)</label>
          <textarea
            className="grammar-textarea"
            value={grammarText}
            onChange={e => onGrammarChange(e.target.value)}
            spellCheck={false}
            placeholder={"E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id"}
          />
        </div>

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
