import React, { useState } from 'react'
import { supabase } from './lib/supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (data.session) {
          setMessage('Account created. You are signed in.')
        } else {
          setMessage('Account created. Check your email and use the newest confirmation link.')
        }
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage('Password reset email sent. Check your inbox.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setIsError(true)
      setMessage(error.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="brand-mark">₱</div>
        <p className="eyebrow">MY FINANCE PLANNER</p>
        <h1>A clearer plan for every peso, dollar, or euro.</h1>
        <p className="auth-hero-copy">
          Build a personal plan around your own income, pay schedule, goals, debts, and spending. Your data stays separated from every other account.
        </p>
        <div className="auth-points">
          <span>Private account data</span>
          <span>Custom pay schedules</span>
          <span>Debt & goal projections</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">{mode === 'signup' ? 'CREATE ACCOUNT' : mode === 'reset' ? 'RESET PASSWORD' : 'WELCOME BACK'}</p>
          <h2>{mode === 'signup' ? 'Start your financial plan' : mode === 'reset' ? 'Recover your account' : 'Sign in'}</h2>
          <p className="muted">
            {mode === 'signup'
              ? 'You will customize your own currency, income, paydays, budget, debts, and goals after signup.'
              : mode === 'reset'
              ? 'Enter your email and we’ll send a password reset link.'
              : 'Continue to your private finance dashboard.'}
          </p>

          <form className="stack-form" onSubmit={submit}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </label>
            {mode !== 'reset' && (
              <label>
                Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required />
              </label>
            )}
            <button className="primary-btn wide" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
            </button>
          </form>

          {message && <div className={`notice ${isError ? 'error' : 'success'}`}>{message}</div>}

          <div className="auth-actions">
            {mode === 'login' && <button className="text-btn" onClick={() => setMode('reset')}>Forgot password?</button>}
            <button className="text-btn" onClick={() => { setMessage(''); setIsError(false); setMode(mode === 'signup' ? 'login' : 'signup') }}>
              {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
            {mode === 'reset' && <button className="text-btn" onClick={() => setMode('login')}>Back to sign in</button>}
          </div>
        </div>
      </section>
    </main>
  )
}
