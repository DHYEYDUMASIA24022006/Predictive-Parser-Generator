import { END_MARKER } from '../constants.js';
import { getTableTerminals, isLL1 } from '../parser/parsingTable.js';

const ParsingTableView = ({ grammar, table }) => {
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

  return (
    <div className="section fade-in">
      {/* LL(1) status banner */}
      <div className={`ll1-banner ${ll1 ? 'is-ll1' : 'not-ll1'}`}>
        <span className="ll1-icon">{ll1 ? '✅' : '⚠️'}</span>
        <div>
          <div>{ll1 ? 'Grammar is LL(1)' : 'Grammar is NOT LL(1)'}</div>
          {!ll1 && (
            <div style={{ fontSize: '0.8rem', fontWeight: 400, marginTop: '0.2rem', opacity: 0.85 }}>
              Conflicts detected in the parsing table (highlighted in red). This grammar cannot be parsed by a deterministic LL(1) parser without modification.
            </div>
          )}
        </div>
      </div>

      {/* Parsing Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="icon">📊</span>
            LL(1) Predictive Parsing Table
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-blue">M[NT, terminal]</span>
            {!ll1 && <span className="badge badge-red">⚠ Conflicts</span>}
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
