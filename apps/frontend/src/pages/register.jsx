import { useState } from 'react'

const API_URL = 'http://127.0.0.1:8000'

export default function Register({ onRegister, onBackToLogin }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    police_id: '',
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
    const state = form.state.trim()
    const department = form.department.trim()

    if (
      !username ||
      !email ||
      !form.password ||
      !police_id ||
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