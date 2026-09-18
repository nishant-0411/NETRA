import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

const INVESTIGATOR_RANKS = [
  'Constable',
  'Head Constable',
  'Assistant Sub-Inspector (ASI)',
  'Sub-Inspector (SI)',
  'Inspector',
]

const SUPERVISOR_RANKS = [
  'Station House Officer (SHO)',
  'Assistant Commissioner of Police (ACP)',
  'Deputy Superintendent of Police (DSP)',
  'Additional Superintendent of Police (Addl. SP)',
  'Superintendent of Police (SP)',
  'Deputy Commissioner of Police (DCP)',
  'Additional Commissioner of Police (Addl. CP)',
  'Commissioner of Police (CP)',
  'Deputy Inspector General (DIG)',
  'Inspector General (IG)',
  'Additional Director General of Police (ADGP)',
  'Director General of Police (DGP)',
]

export default function Register({ defaultRole = 'investigator', onRegister, onBackToLogin }) {
  const [role, setRole] = useState(defaultRole || 'investigator')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    police_id: '',
    rank: '',
    state: '',
    department: '',
    supervisor_passcode: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const username = form.username.trim()
    const email = form.email.trim()
    const police_id = form.police_id.trim()
    const rank = form.rank.trim()
    const state = form.state.trim()
    const department = form.department.trim()

    if (
      !username ||
      !email ||
      !form.password ||
      !police_id ||
      !rank ||
      !state ||
      !department
    ) {
      setError('Please fill in all required official details.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password: form.password,
          police_id,
          rank,
          state,
          department,
          role,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        let message = 'Registration failed.'

        if (typeof data.detail === 'string') {
          message = data.detail
        } else if (Array.isArray(data.detail)) {
          message = data.detail
            .map((item) => {
              const field = item.loc?.[item.loc.length - 1] || 'field'
              return `${field}: ${item.msg}`
            })
            .join('\n')
        } else if (data.detail) {
          message = JSON.stringify(data.detail)
        }

        throw new Error(message)
      }

      onRegister({
        username: data.username || username,
        email: data.email || email,
        police_id: data.police_id || police_id,
        rank: data.rank || rank,
        state: data.state || state,
        department: data.department || department,
        role,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to server.'
      )
    } finally {
      setLoading(false)
    }
  }

  const isSupervisor = role === 'supervisor'
  const rankOptions = isSupervisor ? SUPERVISOR_RANKS : INVESTIGATOR_RANKS

  return (
    <div className="auth-page">
      <form className="login-form register-form" onSubmit={handleSubmit}>
        <button
          type="button"
          onClick={onBackToLogin}
          className="back-portal-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>

        <div className="auth-logo" style={{ background: isSupervisor ? '#261B16' : '#8C532B' }}>
          {isSupervisor ? '🛡️' : '🔍'}
        </div>

        <h1>NETRA</h1>
        <p className="login-subtitle">
          {isSupervisor ? 'Supervisor & Station Head Official ID Registration' : 'Investigator Official ID Registration'}
        </p>

        {/* Portal / Role Toggle Header */}
        <div className="portal-tabs">
          <button
            type="button"
            className={`portal-tab-btn ${!isSupervisor ? 'active-portal-investigator' : ''}`}
            onClick={() => {
              setRole('investigator')
              setForm(prev => ({ ...prev, rank: '' }))
              setError('')
            }}
          >
            <span>🔍 Investigator ID Format</span>
          </button>

          <button
            type="button"
            className={`portal-tab-btn ${isSupervisor ? 'active-portal-supervisor' : ''}`}
            onClick={() => {
              setRole('supervisor')
              setForm(prev => ({ ...prev, rank: '' }))
              setError('')
            }}
          >
            <span>🛡️ Supervisor ID Format</span>
          </button>
        </div>

        {error && (
          <div className="login-error">
            {error.split('\n').map((msg, index) => (
              <div key={index}>{msg}</div>
            ))}
          </div>
        )}

        <div className="auth-field">
          <label>
            {isSupervisor ? 'Supervisor Full Name' : 'Investigator Username'}
          </label>
          <input
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder={isSupervisor ? 'e.g. Commander Nishant Khatkar' : 'e.g. Officer Mihir Rawat'}
            autoFocus
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label>
            Official Police Email
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder={isSupervisor ? 'supervisor@police.gov.in' : 'officer@police.gov.in'}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label>
            {isSupervisor ? 'Supervisor Badge / Police ID' : 'Investigator Police ID'}
          </label>
          <input
            name="police_id"
            type="text"
            value={form.police_id}
            onChange={handleChange}
            placeholder={isSupervisor ? 'e.g. SUP-9001' : 'e.g. OFF-1024'}
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label>
            {isSupervisor ? 'High-Command Rank' : 'Investigator Rank'}
          </label>
          <select
            name="rank"
            value={form.rank}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">-- Select Rank --</option>
            {rankOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="auth-field">
          <label>
            State / Jurisdiction
          </label>
          <input
            name="state"
            type="text"
            value={form.state}
            onChange={handleChange}
            placeholder="e.g. Delhi NCR / Maharashtra"
            disabled={loading}
          />
        </div>

        <div className="auth-field">
          <label>
            Police Station / Command Zone
          </label>
          <input
            name="department"
            type="text"
            value={form.department}
            onChange={handleChange}
            placeholder="e.g. Central Police Station / Cyber Command"
            disabled={loading}
          />
        </div>

        {/* Spacing for Password Label */}
        <div className="auth-field" style={{ marginTop: '16px' }}>
          <label style={{ marginTop: '14px' }}>
            Account Password
          </label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="login-btn"
          disabled={loading}
          style={{ background: isSupervisor ? '#261B16' : '#8C532B' }}
        >
          {loading
            ? 'Creating Official ID...'
            : isSupervisor
            ? 'Create Supervisor Account'
            : 'Create Investigator Account'}
        </button>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <div className="create-account">
          <span>Already registered?</span>
          <button
            type="button"
            onClick={onBackToLogin}
          >
            Sign In to NETRA
          </button>
        </div>
      </form>
    </div>
  )
}
