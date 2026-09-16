import { useState } from 'react'
import { getCurrentUser } from '../services/authService'

const API_URL = 'http://127.0.0.1:8000'

export default function Login({ onLogin, onCreateAccount }) {
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

      const response = await fetch(
        `${API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Login failed'
        )
      }

      localStorage.setItem(
        'netra_token',
        data.access_token
      )

      // The login response only establishes the session. Resolve the profile
      // from the authenticated endpoint so the UI always uses backend data.
      const currentUser = await getCurrentUser()
      onLogin(currentUser)

    } catch (err) {
      localStorage.removeItem('netra_token')
      setError(
        err.message ||
        'Unable to connect to server.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-card">

        <div className="auth-logo">
          🔍
        </div>

        <h1>NETRA</h1>

        <p className="auth-subtitle">
          Criminal Network Intelligence
        </p>

        <form onSubmit={handleSubmit}>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="auth-field">
            <label>
              Username or Email
            </label>

            <input
              type="text"
              value={identifier}
              onChange={(e) =>
                setIdentifier(e.target.value)
              }
              placeholder="Enter username or email"
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label>
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Signing in...'
              : 'Sign In'}
          </button>

        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="auth-register">

          <span>
            Don't have an account?
          </span>

          <button
            type="button"
            onClick={onCreateAccount}
          >
            Create Account
          </button>

        </div>

      </div>

    </div>
  )
}
