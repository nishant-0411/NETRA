import { useState } from 'react'

const API_URL = 'http://127.0.0.1:8000'

const POLICE_RANKS = [
  'Constable',
  'Head Constable',
  'Assistant Sub-Inspector (ASI)',
  'Sub-Inspector (SI)',
  'Inspector',
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

export default function Register({ onRegister, onBackToLogin }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    police_id: '',
    rank: '',
    state: '',
    department: '',
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
      setError('Please fill in all fields.')
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
              const field =
                item.loc?.[item.loc.length - 1] || 'field'
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

  return (
    <div className="login-page">
      <form
        className="login-form register-form"
        onSubmit={handleSubmit}
      >
        <div className="login-brand">
          🔍 NETRA
        </div>

        <p className="login-subtitle">
          Create Investigator Account
        </p>

        {error && (
          <div className="login-error">
            {error.split('\n').map((msg, index) => (
              <div key={index}>{msg}</div>
            ))}
          </div>
        )}

        <label>
          Username
          <input
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            placeholder="Enter username"
            autoFocus
            disabled={loading}
          />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter official email"
            disabled={loading}
          />
        </label>

        <label>
          Police ID
          <input
            name="police_id"
            type="text"
            value={form.police_id}
            onChange={handleChange}
            placeholder="Enter police ID"
            disabled={loading}
          />
        </label>

        <label>
          Police Rank
          <select
            name="rank"
            value={form.rank}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">Select rank</option>
            {POLICE_RANKS.map((rank) => (
              <option key={rank} value={rank}>{rank}</option>
            ))}
          </select>
        </label>

        <label>
          State
          <input
            name="state"
            type="text"
            value={form.state}
            onChange={handleChange}
            placeholder="Enter state"
            disabled={loading}
          />
        </label>

        <label>
          Department
          <input
            name="department"
            type="text"
            value={form.department}
            onChange={handleChange}
            placeholder="Enter department"
            disabled={loading}
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            disabled={loading}
          />
        </label>

        <button
          type="submit"
          className="login-btn"
          disabled={loading}
        >
          {loading
            ? 'Creating Account...'
            : 'Create Account'}
        </button>

        <div className="login-divider">
          <span>OR</span>
        </div>

        <div className="create-account">
          <span>Already have an account?</span>

          <button
            type="button"
            className="create-account-btn"
            onClick={onBackToLogin}
            disabled={loading}
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  )
}
