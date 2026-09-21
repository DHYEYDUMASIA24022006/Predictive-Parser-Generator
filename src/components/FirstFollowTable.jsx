import { EPSILON, END_MARKER } from '../constants.js';

function sortedSet(s) {
  // Sort: ε last, $ last
  return [...s].sort((a, b) => {
    if (a === EPSILON) return 1;
    if (b === EPSILON) return -1;
    if (a === END_MARKER) return 1;
    if (b === END_MARKER) return -1;
    return a.localeCompare(b);
  });
}

const FirstFollowTable = ({ grammar, firstSets, followSets }) => {
  if (!grammar || !firstSets || !followSets) {
    return (
      <div className="empty-state fade-in">
        <div className="empty-icon">🔢</div>
        <div className="empty-title">No grammar parsed yet</div>
        <div className="empty-sub">Go to the Grammar tab, enter a grammar, and click "Parse Grammar".</div>
      </div>
    );
  }

  const nts = [...grammar.nonTerminals];

  return (
    <div className="section fade-in">
      {/* FIRST & FOLLOW combined table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <span className="icon">🔢</span>
            FIRST & FOLLOW Sets
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-blue">FIRST</span>
            <span className="badge badge-green">FOLLOW</span>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Non-Terminal</th>
                <th>FIRST Set</th>
                <th>FOLLOW Set</th>
              </tr>
            </thead>
            <tbody>
              {nts.map(nt => {
                const first = firstSets.get(nt) ?? new Set();
                const follow = followSets.get(nt) ?? new Set();
                return (
                  <tr key={nt}>
                    <td className="nt-cell">{nt}</td>
                    <td>
                      <div className="set-display">
                        {'{'}
                        {sortedSet(first).map((sym, i) => (
                          <span key={sym} style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                            {i > 0 && <span style={{ color: 'var(--text-muted)' }}>,&nbsp;</span>}
                            <span style={{
                              color: sym === EPSILON ? 'var(--purple)' : 'var(--orange)',
                              fontWeight: 600,
                            }}>
                              {sym}
                            </span>
                          </span>
                        ))}
                        {'}'}
                      </div>
                    </td>
                    <td>
                      <div className="set-display">
                        {'{'}
                        {sortedSet(follow).map((sym, i) => (
                          <span key={sym} style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                            {i > 0 && <span style={{ color: 'var(--text-muted)' }}>,&nbsp;</span>}
                            <span style={{
                              color: sym === END_MARKER ? 'var(--yellow)' : 'var(--accent)',
                              fontWeight: 600,
                            }}>
                              {sym}
                            </span>
                          </span>
                        ))}
                        {'}'}
                      </div>
                    </td>
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

export default FirstFollowTable;
