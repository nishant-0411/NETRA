import { useState } from 'react'
import { getCurrentUser } from '../services/authService'
import { ShieldCheck, Search, ArrowLeft, ChevronRight } from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000'

export default function Login({ onLogin, onCreateAccount }) {
  const [selectedPortal, setSelectedPortal] = useState(null) // null | 'investigator' | 'supervisor'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!identifier.trim() || !password) {
      setError('Enter your username/email and password.')
      return
    }

    setLoading(true)

    try {
      const body = new URLSearchParams()
      body.append('username', identifier.trim())
      body.append('password', password)

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      localStorage.setItem('netra_token', data.access_token)

      // Resolve user profile from backend
      const currentUser = await getCurrentUser()

      // Role check if Supervisor portal is selected
      const userRole = (currentUser.role || '').toLowerCase()
      const userRank = currentUser.rank || ''
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
      const isUserSupervisor = userRole === 'supervisor' || SUPERVISOR_RANKS.includes(userRank)

      if (selectedPortal === 'supervisor' && !isUserSupervisor) {
        throw new Error('Access Denied: Your account is registered as an Investigator. Please log in through the Investigator Portal.')
      }

      localStorage.setItem('netra_portal_mode', selectedPortal)
      onLogin(currentUser, selectedPortal)

    } catch (err) {
      localStorage.removeItem('netra_token')
      setError(err.message || 'Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  // Initial Portal Selection Landing Screen (Side-by-Side Cards)
  if (!selectedPortal) {
    return (
      <div className="auth-page">
        <div className="portal-landing-container">
          <div className="auth-logo">
            🔍
          </div>
          <h1 className="text-3xl font-extrabold text-[#2B211C] tracking-wider">PROJECT NETRA</h1>
          <p className="login-subtitle">
            Police CCTNS & ICJS Intelligence Command System
          </p>

          <div className="portal-cards-grid">
            {/* Investigator Portal Card */}
            <div
              className="portal-choice-card"
              onClick={() => setSelectedPortal('investigator')}
            >
              <div>
                <div className="portal-card-icon portal-icon-investigator">
                  🔍
                </div>
                <div className="portal-card-title">Investigator Portal</div>
                <div className="portal-card-desc">
                  Login here to access criminal network relationship graphs, case dossiers, evidence vault, and AI copilot.
                </div>
              </div>
              <button className="auth-submit flex items-center justify-center gap-2">
                <span>Access Investigator Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Supervisor / Head Portal Card */}
            <div
              className="portal-choice-card"
              onClick={() => setSelectedPortal('supervisor')}
            >
              <div>
                <div className="portal-card-icon portal-icon-supervisor">
                  🛡️
                </div>
                <div className="portal-card-title">Supervisor / Head Portal</div>
                <div className="portal-card-desc">
                  Login here to manage police station officers, allocate unassigned cases, transfer dossiers, and monitor station workload.
                </div>
              </div>
              <button className="auth-submit flex items-center justify-center gap-2" style={{ background: '#261B16' }}>
                <span>Access Supervisor Portal</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Selected Login Form Screen
  return (
    <div className="auth-page">
      <div className="auth-card">
        <button
          type="button"
          onClick={() => {
            setSelectedPortal(null)
            setError('')
          }}
          className="back-portal-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Select Different Portal</span>
        </button>

        <div className="auth-logo" style={{ background: selectedPortal === 'supervisor' ? '#261B16' : '#8C532B' }}>
          {selectedPortal === 'supervisor' ? '🛡️' : '🔍'}
        </div>

        <h1>NETRA</h1>
        <p className="auth-subtitle">
          {selectedPortal === 'supervisor' ? 'Station Head & Supervisor Management Portal' : 'Investigator Intelligence Portal'}
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="auth-field">
            <label>
              Username or Official Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={selectedPortal === 'supervisor' ? "Supervisor Username or Email" : "Investigator Username or Email"}
              autoFocus
            />
          </div>

          <div className="auth-field" style={{ marginTop: '16px' }}>
            <label style={{ marginTop: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
            style={{ background: selectedPortal === 'supervisor' ? '#261B16' : '#8C532B' }}
          >
            {loading ? 'Authenticating...' : selectedPortal === 'supervisor' ? 'Sign In as Supervisor' : 'Sign In as Investigator'}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="auth-register">
          <span>
            Need a new official ID?
          </span>
          <button
            type="button"
            onClick={() => onCreateAccount(selectedPortal)}
          >
            Create {selectedPortal === 'supervisor' ? 'Supervisor Account' : 'Investigator Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
