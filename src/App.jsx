import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './Auth'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="dashboard-placeholder">
      <div className="dashboard-topbar">
        <div>
          <h1>My Finance Planner</h1>
          <p>{session.user.email}</p>
        </div>

        <button
          className="signout-button"
          onClick={signOut}
        >
          Sign Out
        </button>
      </div>

      <div className="welcome-card">
        <h2>You're connected 🎉</h2>

        <p>
          Your account is logged in and connected
          to Supabase.
        </p>

        <p>
          Next we'll build your actual financial
          dashboard.
        </p>
      </div>
    </div>
  )
}