import { useState } from 'react'

const cases = [
  { id: 'CASE-2026-014', title: 'Harbor District Network', status: 'Active', entities: 42, updated: '12 min ago' },
  { id: 'CASE-2026-009', title: 'Operation Nightfall', status: 'Review', entities: 18, updated: '2 hr ago' },
  { id: 'CASE-2025-127', title: 'Eastside Fraud Ring', status: 'Active', entities: 31, updated: 'Yesterday' }
]

const activity = [
  ['Document processed', 'Financial records.pdf', '8 min ago'],
  ['Entity linked', 'Arjun Mehta → Vehicle MH 12 AB 4421', '32 min ago'],
  ['Analyst note added', 'Harbor District Network', '1 hr ago']
]

export default function App() {
  const [activeCase, setActiveCase] = useState(cases[0])
  const [tab, setTab] = useState('Overview')
  const [notice, setNotice] = useState('')
  const upload = () => setNotice('Document upload is ready to connect to the backend API.')

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">⌘</span><span>Case<span>Mesh</span></span></div>
      <nav aria-label="Primary navigation">
        {['Dashboard', 'Cases', 'Network', 'Documents'].map((item) => <button className={item === 'Dashboard' ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setNotice(`${item} view selected.`)}><span>{item === 'Dashboard' ? '▦' : item === 'Cases' ? '◫' : item === 'Network' ? '⌘' : '▤'}</span>{item}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className="nav-item"><span>⚙</span>Settings</button><div className="user"><div className="avatar">NM</div><div><strong>Analyst</strong><small>Investigation unit</small></div></div></div>
    </aside>

    <section className="content">
      <header><div><p className="eyebrow">INVESTIGATION WORKSPACE</p><h1>Good morning, Analyst</h1><p className="subtle">Here’s what needs your attention today.</p></div><button className="primary" onClick={upload}>+ Upload document</button></header>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

      <section className="metrics" aria-label="Case metrics">
        <Metric label="Active cases" value="12" trend="+2 this week" />
        <Metric label="Entities mapped" value="287" trend="+18% this week" />
        <Metric label="Pending review" value="8" trend="3 high priority" alert />
        <Metric label="Documents processed" value="1,426" trend="94% classified" />
      </section>

      <section className="workspace-grid">
        <article className="panel cases-panel"><div className="panel-heading"><div><h2>Active cases</h2><p>Recent investigation activity</p></div><button className="text-button" onClick={() => setNotice('All cases view selected.')}>View all →</button></div>
          <div className="case-list">{cases.map((item) => <button className={`case-row ${activeCase.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setActiveCase(item)}><span className="case-icon">◫</span><span className="case-copy"><strong>{item.title}</strong><small>{item.id} · {item.entities} entities</small></span><span><b className={`badge ${item.status.toLowerCase()}`}>{item.status}</b><small>{item.updated}</small></span></button>)}</div>
        </article>
        <article className="panel network-panel"><div className="panel-heading"><div><h2>Network snapshot</h2><p>{activeCase.title}</p></div><button className="text-button" onClick={() => setTab('Network')}>Open graph →</button></div><Network /><div className="legend"><span><i className="person" />Person</span><span><i className="company" />Organization</span><span><i className="asset" />Asset</span></div></article>
      </section>

      <section className="bottom-grid"><article className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest updates across your cases</p></div></div><div className="activity-list">{activity.map(([title, detail, time]) => <div className="activity" key={detail}><span className="activity-dot" /><div><strong>{title}</strong><p>{detail}</p></div><time>{time}</time></div>)}</div></article>
      <article className="panel priority-panel"><div className="panel-heading"><div><h2>Priority queue</h2><p>Items requiring review</p></div><span className="queue-count">8</span></div><div className="priority"><b>Possible duplicate identity</b><p>Two records share biometric and phone metadata.</p><button className="text-button" onClick={() => setNotice('Opening identity review…')}>Review now →</button></div></article></section>
      <footer>CaseMesh · Secure investigation workspace · {tab}</footer>
    </section>
  </main>
}

function Metric({ label, value, trend, alert }) { return <article className="metric"><p>{label}</p><strong>{value}</strong><span className={alert ? 'alert-text' : ''}>{alert ? '● ' : '↗ '}{trend}</span></article> }

function Network() { return <div className="network" aria-label="Illustrative entity network"><svg viewBox="0 0 480 220" role="img"><path d="M92 106L191 63M92 106L197 164M191 63L310 103M197 164L310 103M310 103L393 61M310 103L403 166"/><path className="dim" d="M191 63L197 164M393 61L403 166"/><circle className="node person-node" cx="92" cy="106" r="23"/><circle className="node company-node" cx="191" cy="63" r="20"/><circle className="node asset-node" cx="197" cy="164" r="18"/><circle className="node person-node central" cx="310" cy="103" r="30"/><circle className="node company-node" cx="393" cy="61" r="18"/><circle className="node asset-node" cx="403" cy="166" r="20"/><text x="310" y="108">AM</text></svg></div> }
