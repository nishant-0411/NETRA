import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import NetworkGraph from './components/NetworkGraph'
import DetailPanel from './components/DetailPanel'
import ChatBox from './components/ChatBox'
import { fetchCaseGraph, fetchFullGraph, fetchNodeDetail, fetchEdgeDetail, fetchSuspects, exploreNode, uploadDocument } from './services/api'

const DEMO_CASES = [
  { id: 'CASE-0007', title: 'Case 0007' },
  { id: 'CASE-0008', title: 'Case 0008' },
  { id: 'CASE-0009', title: 'Case 0009' },
]

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('netra_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (u) => {
    setUser(u)
    localStorage.setItem('netra_user', JSON.stringify(u))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('netra_user')
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function Dashboard({ user, onLogout }) {
  const [activeCase, setActiveCase] = useState(DEMO_CASES[0])
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [showChat, setShowChat] = useState(false)
  const [notice, setNotice] = useState('')
  const [suspects, setSuspects] = useState([])

  // Load graph when case changes
  useEffect(() => {
    loadGraph()
    loadSuspects()
  }, [activeCase])

  const loadGraph = async () => {
    setLoading(true)
    try {
      const data = await fetchCaseGraph(activeCase.id)
      if (data.nodes.length === 0) {
        // Fallback to full graph if case-specific returns empty
        const full = await fetchFullGraph()
        setGraphData(full)
      } else {
        setGraphData(data)
      }
    } catch {
      // If backend is down, show empty graph
      setGraphData({ nodes: [], edges: [] })
    } finally {
      setLoading(false)
    }
  }

  const loadSuspects = async () => {
    try {
      const data = await fetchSuspects(activeCase.id)
      setSuspects(data.suspects || [])
    } catch {
      setSuspects([])
    }
  }

  const handleNodeClick = async (node) => {
    try {
      const data = await fetchNodeDetail(node.id)
      setDetail({
        type: 'node',
        title: node.name || 'Entity Detail',
        nodeId: node.id,
        data,
      })
    } catch {
      setDetail({
        type: 'node',
        title: node.name || 'Entity Detail',
        nodeId: node.id,
        data: { labels: node.labels, properties: node.properties, connections: [] },
      })
    }
  }

  const handleEdgeClick = async (link) => {
    try {
      const data = await fetchEdgeDetail(link.id)
      setDetail({ type: 'edge', title: `${data.type} Relationship`, data })
    } catch {
      setDetail({
        type: 'edge',
        title: link.type || 'Relationship',
        data: { type: link.type, properties: link.properties || {}, source: {}, target: {} },
      })
    }
  }

  const handleExplore = async (nodeId) => {
    setNotice('🔍 Scanning across all cases...')
    try {
      const data = await exploreNode(nodeId)
      setDetail({ type: 'explore', title: 'Cross-Case Exploration', data })
      setNotice('')
    } catch (err) {
      setNotice(`Explore failed: ${err.message}`)
    }
  }

  const handleSuspectClick = (s) => {
    setDetail({
      type: 'suspect',
      title: `Suspect: ${s.name}`,
      data: s,
    })
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setNotice('Uploading...')
    try {
      await uploadDocument(file, activeCase.id, { uploaded_by: user.username })
      setNotice('✅ Document uploaded and processed.')
      loadGraph()
    } catch (err) {
      setNotice(`Upload failed: ${err.message}`)
    }
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">🔍 NETRA</div>

        <div className="sidebar-section">
          <div className="sidebar-label">Cases</div>
          {DEMO_CASES.map(c => (
            <button
              key={c.id}
              className={`sidebar-item ${activeCase.id === c.id ? 'active' : ''}`}
              onClick={() => setActiveCase(c)}
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="user-info">
            <span>👤 {user.username}</span>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div>
            <h1>{activeCase.title}</h1>
            <span className="case-id">{activeCase.id}</span>
          </div>
          <div className="topbar-actions">
            <label className="upload-btn">
              📎 Upload Document
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={handleUpload} hidden />
            </label>
            <button className="chat-toggle" onClick={() => setShowChat(!showChat)}>
              💬 Chat
            </button>
          </div>
        </header>

        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice('')}>✕</button>
          </div>
        )}

        {/* Graph + Detail Layout */}
        <div className="workspace">
          <div className={`graph-area ${detail ? 'with-panel' : ''}`}>
            {loading ? (
              <div className="loading">Loading graph...</div>
            ) : graphData.nodes.length === 0 ? (
              <div className="empty-state">
                <p>No graph data for this case yet.</p>
                <p>Upload a document to start building the network.</p>
              </div>
            ) : (
              <NetworkGraph
                graphData={graphData}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                onExplore={handleExplore}
              />
            )}

            {/* Legend */}
            <div className="graph-legend">
              <span><i style={{ background: '#4a7fd4' }} /> Person</span>
              <span><i style={{ background: '#e67e22' }} /> Phone</span>
              <span><i style={{ background: '#27ae60' }} /> Vehicle</span>
              <span><i style={{ background: '#9b59b6' }} /> Account</span>
              <span><i style={{ background: '#e74c3c' }} /> Location</span>
            </div>
          </div>

          {/* Detail Panel */}
          {detail && (
            <DetailPanel
              detail={detail}
              onClose={() => setDetail(null)}
              onExplore={handleExplore}
            />
          )}
        </div>

        {/* Suspects Bar */}
        {suspects.length > 0 && (
          <div className="suspects-bar">
            <h3>Suspects ({suspects.length})</h3>
            <div className="suspects-list">
              {suspects.map((s, i) => (
                <button key={i} className="suspect-chip" onClick={() => handleSuspectClick(s)}>
                  <span className="suspect-name">{s.name}</span>
                  <span className="suspect-score">{Math.round((s.suspect_score || 0) * 100)}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Persistent Chat */}
        {showChat && (
          <ChatBox chatHistory={chatHistory} setChatHistory={setChatHistory} />
        )}
      </main>
    </div>
  )
}
