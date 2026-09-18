import React, { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState('login')

  async function handleSubmit(event) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) throw error

        setMessage(
          'Account created. Check your email if Supabase asks you to confirm your account.'
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">₱</div>

          <div>
            <h1>My Finance Planner</h1>
            <p>Take control of your money.</p>
          </div>
        </div>

        <h2>
          {mode === 'login'
            ? 'Welcome back'
            : 'Create your account'}
        </h2>

        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to your financial dashboard.'
            : 'Create an account to start managing your finances.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength="6"
              required
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>

        {message && (
          <div className="auth-message">
            {message}
          </div>
        )}

        <button
          className="switch-button"
          type="button"
          onClick={() => {
            setMessage('')
            setMode(
              mode === 'login'
                ? 'signup'
                : 'login'
            )
          }}
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}