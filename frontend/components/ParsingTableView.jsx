import { useState } from 'react';
import { END_MARKER } from '../../backend/constants.js';
import { getTableTerminals, isLL1, getConflicts, diagnoseGrammarIssues } from '../../backend/parsingTable.js';

const ParsingTableView = ({
  grammar,
  table,
  firstSets,
  followSets,
  onEliminateLR,
  onLeftFactor,
  revisedGrammarText,
  transformations = [],
  onRevertOriginal,
  onApplyRevisedToEditor,
}) => {
  const [copiedRevised, setCopiedRevised] = useState(false);

  const handleCopyRevised = () => {
    if (navigator.clipboard && revisedGrammarText) {
      navigator.clipboard.writeText(revisedGrammarText);
      setCopiedRevised(true);
      setTimeout(() => setCopiedRevised(false), 2000);
    }
  };

  const renderRevisedLine = (line, idx) => {
    const arrowMatch = line.match(/^([^→-]+)(?:→|->)(.*)$/);
    if (!arrowMatch) {
      return (
        <div key={idx} className="revised-code-line">
          {line}
        </div>
      );
    }
    const lhs = arrowMatch[1].trim();
    const rawRhs = arrowMatch[2].trim();
    const alternatives = rawRhs.split('|').map(alt => alt.trim());

    return (
      <div key={idx} className="revised-code-line">
        <span className="sample-nt">{lhs}</span>
        <span className="sample-arrow"> → </span>
        <span className="revised-rhs-group">
          {alternatives.map((alt, altIdx) => {
            const symbols = alt.split(/\s+/).filter(Boolean);
            return (
              <span key={altIdx}>
                {altIdx > 0 && <span className="sample-pipe"> | </span>}
                {symbols.map((sym, symIdx) => {
                  const isNt = grammar?.nonTerminals?.has(sym);
                  const isEps = sym === 'ε' || sym === 'eps' || sym === 'epsilon';
                  const cls = isEps ? 'sample-eps' : isNt ? 'sample-nt' : 'sample-term';
                  return (
                    <span key={symIdx}>
                      {symIdx > 0 && ' '}
                      <span className={cls}>{sym}</span>
                    </span>
                  );
                })}
              </span>
            );
          })}
        </span>
      </div>
    );
  };

  if (!grammar || !table) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">📊</div>
        <div className="empty-title">No parsing table yet</div>
        <div className="empty-sub">Parse a grammar first to generate the LL(1) parsing table.</div>
      </div>
    );
  }

  const ll1 = isLL1(table);
  const terminals = getTableTerminals(table, grammar.terminals);
  const nts = [...grammar.nonTerminals];
  const conflicts = !ll1 ? getConflicts(table) : [];
  const issues = (!ll1 && firstSets && followSets) ? diagnoseGrammarIssues(grammar, table, firstSets, followSets) : [];

  return (
    <div className="section fade-in">
      {/* LL(1) status banner */}
      <div className={`ll1-banner ${ll1 ? 'is-ll1' : 'not-ll1'}`}>
        <span className="ll1-icon">{ll1 ? '✅' : '⚠️'}</span>
        <div>
          <div>{ll1 ? 'Grammar is LL(1)' : 'Grammar is NOT LL(1)'}</div>
          {!ll1 && (
            <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: '0.2rem', opacity: 0.85 }}>
              Conflicts detected in the parsing table ({conflicts.length} conflict cell{conflicts.length === 1 ? '' : 's'}). This grammar cannot be parsed deterministically by an LL(1) predictive parser.
            </div>
          )}
        </div>
      </div>

      {/* Revised Grammar Box */}
      {revisedGrammarText && (
        <div className="card revised-grammar-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="icon" style={{ fontSize: '1.25rem' }}>🔄</span>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>
                  Revised Grammar (LL(1) Transformed)
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Original grammar remains preserved in the Grammar Editor input box
                </div>
              </div>
            </div>
            <div className="btn-group" style={{ flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-secondary btn-sm ${copiedRevised ? 'copied' : ''}`}
                onClick={handleCopyRevised}
                title="Copy revised grammar to clipboard"
              >
                {copiedRevised ? '✓ Copied' : '📋 Copy Revised Grammar'}
              </button>
              {onApplyRevisedToEditor && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onApplyRevisedToEditor}
                  title="Load this revised grammar into the Grammar Editor input box"
                >
                  📥 Load into Editor
                </button>
              )}
              {onRevertOriginal && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onRevertOriginal}
                  title="Revert parsing table to the original grammar"
                >
                  ↺ Revert to Original
                </button>
              )}
            </div>
          </div>

          <div className="revised-grammar-notice">
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>💡</span>
            <div>
              <strong>Original grammar retained in editor.</strong> The predictive parsing table below is generated using this revised LL(1) grammar.
            </div>
          </div>

          {transformations && transformations.length > 0 && (
            <div className="revised-grammar-badge-bar">
              {transformations.map((t, idx) => (
                <span key={idx} className="badge badge-purple" style={{ fontSize: '0.8rem' }}>
                  ✓ {t.label}
                  {t.changes?.length > 0 && (
                    <span style={{ opacity: 0.9, marginLeft: '0.35rem' }}>
                      (created {t.changes.map(c => c.newNT).filter(Boolean).join(', ')})
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          <div className="sample-grammar-box" style={{ margin: 0 }}>
            <div className="sample-grammar-code">
              {revisedGrammarText.split('\n').filter(l => l.trim().length > 0).map(renderRevisedLine)}
            </div>
          </div>
        </div>
      )}

      {/* Non-LL(1) Conflict Analysis Card */}
      {!ll1 && (
        <div className="card" style={{ borderColor: 'rgba(248, 81, 73, 0.4)' }}>
          <div className="card-header">
            <h3 className="card-title" style={{ color: 'var(--red)' }}>
              <span className="icon">🔍</span>
              Conflict Analysis & Mathematical Limitations
            </h3>
            <div className="btn-group">
              {issues.some(i => i.type.includes('Left Recursion')) && onEliminateLR && (
                <button className="btn btn-primary btn-sm" onClick={onEliminateLR} title="Eliminate Left Recursion using General Method">
                  🔄 Fix: Eliminate Left Recursion
                </button>
              )}
              {issues.some(i => i.type.includes('Common Prefix')) && onLeftFactor && (
                <button className="btn btn-primary btn-sm" onClick={onLeftFactor} title="Apply Left Factoring to remove common prefixes">
                  🎯 Fix: Apply Left Factoring
                </button>
              )}
              <span className="badge badge-red">{conflicts.length} Table Conflict{conflicts.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {issues.length > 0 ? (
              issues.map((issue, idx) => (
                <div key={idx} className="alert alert-error" style={{ background: 'var(--bg-elevated)' }}>
                  <span className="alert-icon">⚡</span>
                  <div className="alert-content">
                    <div className="alert-title">{issue.title} ({issue.type})</div>
                    <div className="alert-body" style={{ color: 'var(--text-secondary)' }}>
                      {issue.description}
                    </div>
                    {issue.type.includes('Left Recursion') && onEliminateLR && (
                      <button className="btn btn-green btn-sm" onClick={onEliminateLR} style={{ marginTop: '0.6rem' }}>
                        🔄 Eliminate Left Recursion
                      </button>
                    )}
                    {issue.type.includes('Common Prefix') && onLeftFactor && (
                      <button className="btn btn-green btn-sm" onClick={onLeftFactor} style={{ marginTop: '0.6rem' }}>
                        🎯 Apply Left Factoring
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="alert alert-error" style={{ background: 'var(--bg-elevated)' }}>
                <span className="alert-icon">⚡</span>
                <div className="alert-content">
                  <div className="alert-title">Parsing Table Conflicts</div>
                  <div className="alert-body">
                    Multiple productions map to the same (Non-Terminal, Lookahead Terminal) cells.
                  </div>
                </div>
              </div>
            )}

            {/* Conflicting Cells Breakdown */}
            <div style={{ marginTop: '0.5rem' }}>
              <div className="input-label">Conflicting Table Cells:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {conflicts.map((c, i) => (
                  <div key={i} className="conflict-detail-row">
                    <span className="conflict-cell-tag">M[{c.nt}, {c.terminal}]</span>
                    <span style={{ color: 'var(--text-muted)' }}>contains {c.productions.length} productions:</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {c.productions.map((p, j) => (
                        <span key={j} className="badge badge-red" style={{ fontFamily: 'var(--font-mono)' }}>
                          {p.lhs} → {p.rhs.join(' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Parsing Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="icon">📊</span>
            LL(1) Predictive Parsing Table
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">M[NT, terminal]</span>
            {!ll1 && <span className="badge badge-red">⚠ Conflicts Highlighted</span>}
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>NT \ Input</th>
                {terminals.map(t => (
                  <th key={t} style={{
                    color: t === END_MARKER ? 'var(--yellow)' : 'var(--orange)',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nts.map(nt => {
                const row = table.get(nt);
                return (
                  <tr key={nt}>
                    <td className="nt-cell">{nt}</td>
                    {terminals.map(t => {
                      const entries = row?.get(t);
                      if (!entries || entries.length === 0) {
                        return <td key={t} className="empty-cell">—</td>;
                      }
                      const isConflict = entries.length > 1 || entries[0]?.conflict;
                      return (
                        <td key={t} className={isConflict ? 'conflict-cell' : 'prod-cell'}>
                          {entries.map((entry, i) => (
                            <div key={i} style={{ marginBottom: i < entries.length - 1 ? '0.4rem' : 0 }}>
                              {isConflict && (
                                <span style={{ color: 'var(--red)', fontSize: '0.7rem', marginRight: '0.3rem' }}>⚠</span>
                              )}
                              <span style={{ color: 'var(--accent)' }}>{entry.production.lhs}</span>
                              <span style={{ color: 'var(--text-muted)' }}> → </span>
                              {entry.production.rhs.map((sym, j) => (
                                <span key={j}>
                                   {j > 0 && ' '}
                                  <span style={{
                                    color: sym === 'ε' ? 'var(--purple)' :
                                      (grammar.nonTerminals.has(sym) ? 'var(--accent)' : 'var(--orange)')
                                  }}>
                                    {sym}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ParsingTableView;
