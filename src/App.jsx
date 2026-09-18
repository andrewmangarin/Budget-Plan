import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './Auth'
import Dashboard from './Dashboard'
import Onboarding from './components/Onboarding'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [setupDone, setSetupDone] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session) checkSetup(data.session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (nextSession) checkSetup(nextSession.user.id)
      else setSetupDone(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkSetup(userId) {
    setCheckingSetup(true)
    const { data, error } = await supabase
      .from('financial_settings')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .maybeSingle()
    setSetupDone(!error && data?.onboarding_completed === true)
    setCheckingSetup(false)
  }

  async function updatePassword(e) {
    e.preventDefault()
    setMessage('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setMessage(error.message)
    else {
      setMessage('Password updated. You can continue to your dashboard.')
      setRecovery(false)
      setNewPassword('')
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading || (session && checkingSetup)) {
    return <div className="loading-page"><div className="spinner" />Loading…</div>
  }

  if (!session) return <Auth />

  if (recovery) {
    return <main className="auth-shell single"><section className="auth-panel"><div className="auth-card"><p className="eyebrow">NEW PASSWORD</p><h2>Secure your account</h2><p className="muted">Choose a new password for your finance planner.</p><form className="stack-form" onSubmit={updatePassword}><label>New password<input type="password" minLength={6} value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required /></label><button className="primary-btn wide">Update password</button></form>{message&&<div className="notice">{message}</div>}</div></section></main>
  }

  if (!setupDone) {
    return <Onboarding user={session.user} onComplete={() => checkSetup(session.user.id)} />
  }

  return <Dashboard user={session.user} onSignOut={signOut} />
}
