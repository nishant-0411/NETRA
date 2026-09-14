export default function DetailPanel({ detail, onClose, onExplore }) {
  if (!detail) return null

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <h3>{detail.title || 'Details'}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="detail-body">
        {/* NODE DETAIL */}
        {detail.type === 'node' && (
          <>
            <div className="detail-labels">
              {(detail.data.labels || []).map(l => (
                <span key={l} className={`tag tag-${l.toLowerCase()}`}>{l}</span>
              ))}
            </div>

            <table className="detail-table">
              <tbody>
                {Object.entries(detail.data.properties || {}).map(([k, v]) => (
                  <tr key={k}>
                    <td className="detail-key">{k}</td>
                    <td>{Array.isArray(v) ? v.join(', ') : String(v ?? '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {detail.data.connections && detail.data.connections.length > 0 && (
              <div className="detail-section">
                <h4>Connections ({detail.data.connections.length})</h4>
                <ul className="connection-list">
                  {detail.data.connections.slice(0, 20).map((c, i) => (
                    <li key={i}>
                      <span className="conn-type">{c.type}</span>
                      <span>{c.target_name || 'Unknown'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.data.properties?.suspect_score != null && (
              <div className="suspect-box">
                <strong>Suspect Score: {detail.data.properties.suspect_score}</strong>
                <p>{detail.data.properties.suspect_reason || 'No reason available.'}</p>
              </div>
            )}

            {onExplore && (
              <button className="explore-btn" onClick={() => onExplore(detail.nodeId)}>
                🔍 Explore Across Cases
              </button>
            )}
          </>
        )}

        {/* EDGE DETAIL */}
        {detail.type === 'edge' && (
          <>
            <div className="edge-info">
              <div className="edge-endpoint">
                <span className="edge-label">From</span>
                <strong>{detail.data.source?.name || 'Unknown'}</strong>
                <span className="edge-sublabel">{(detail.data.source?.labels || []).join(', ')}</span>
              </div>
              <div className="edge-arrow">→ {detail.data.type} →</div>
              <div className="edge-endpoint">
                <span className="edge-label">To</span>
                <strong>{detail.data.target?.name || 'Unknown'}</strong>
                <span className="edge-sublabel">{(detail.data.target?.labels || []).join(', ')}</span>
              </div>
            </div>

            {detail.data.properties && Object.keys(detail.data.properties).length > 0 && (
              <table className="detail-table">
                <tbody>
                  {Object.entries(detail.data.properties).map(([k, v]) => (
                    <tr key={k}>
                      <td className="detail-key">{k}</td>
                      <td>{String(v ?? '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* SUSPECT DETAIL */}
        {detail.type === 'suspect' && (
          <div className="suspect-detail">
            <div className="suspect-score-display">
              <div className="score-circle" style={{
                background: `conic-gradient(#e74c3c ${(detail.data.suspect_score || 0) * 360}deg, #eee 0deg)`
              }}>
                <span>{Math.round((detail.data.suspect_score || 0) * 100)}%</span>
              </div>
            </div>
            <h4>{detail.data.name}</h4>
            <p className="suspect-reason">{detail.data.suspect_reason}</p>
            <p className="suspect-connections">Connected to {detail.data.connections} entities</p>
          </div>
        )}

        {/* EXPLORE RESULTS */}
        {detail.type === 'explore' && (
          <>
            <p className="explore-summary">
              Found <strong>{(detail.data.related_nodes || []).length}</strong> related entities
              and <strong>{(detail.data.name_matches || []).length}</strong> name matches across cases.
            </p>
            {detail.data.related_nodes?.length > 0 && (
              <div className="detail-section">
                <h4>Related Entities</h4>
                <ul className="connection-list">
                  {detail.data.related_nodes.slice(0, 15).map((n, i) => (
                    <li key={i}>
                      <span className="conn-type">{(n.labels || []).join(', ')}</span>
                      <span>{n.properties?.name || 'Unknown'}</span>
                      {n.linked_cases?.length > 0 && (
                        <span className="linked-cases">Cases: {n.linked_cases.join(', ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detail.data.name_matches?.length > 0 && (
              <div className="detail-section">
                <h4>Name Matches</h4>
                <ul className="connection-list">
                  {detail.data.name_matches.slice(0, 10).map((n, i) => (
                    <li key={i}>
                      <span>{n.properties?.name || 'Unknown'}</span>
                      {n.linked_cases?.length > 0 && (
                        <span className="linked-cases">Cases: {n.linked_cases.join(', ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
