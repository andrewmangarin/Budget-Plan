import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { currencyOptions, defaultCategories, formatMoney } from '../lib/finance'

const steps = ['Basics', 'Income', 'Budget', 'First goal']

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: user?.user_metadata?.full_name || '',
    currency: 'PHP',
    current_cash: '',
    monthly_income: '',
    pay_frequency: 'twice_monthly',
    payday_day_1: '15',
    payday_day_2: '30',
    daily_allowance: '',
    monthly_savings_target: '',
    goal_name: 'Emergency Fund',
    goal_target: '',
  })

  const monthlyRoom = useMemo(() => {
    const income = Number(form.monthly_income || 0)
    const savings = Number(form.monthly_savings_target || 0)
    return Math.max(0, income - savings)
  }, [form.monthly_income, form.monthly_savings_target])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function next() {
    setError('')
    if (step === 0 && !form.full_name.trim()) return setError('Please add your name.')
    if (step === 1 && Number(form.monthly_income || 0) < 0) return setError('Income cannot be negative.')
    setStep((s) => Math.min(steps.length - 1, s + 1))
  }

  async function finish() {
    setSaving(true)
    setError('')
    try {
      const userId = user.id
      const income = Number(form.monthly_income || 0)
      const p1 = form.pay_frequency === 'twice_monthly' ? income / 2 : income
      const p2 = form.pay_frequency === 'twice_monthly' ? income / 2 : 0

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: form.full_name.trim(),
      })
      if (profileError) throw profileError

      const { error: settingsError } = await supabase.from('financial_settings').upsert({
        user_id: userId,
        currency: form.currency,
        current_cash: Number(form.current_cash || 0),
        monthly_income: income,
        payday_15_amount: p1,
        payday_end_month_amount: p2,
        pay_frequency: form.pay_frequency,
        payday_day_1: form.payday_day_1 ? Number(form.payday_day_1) : null,
        payday_day_2: form.payday_day_2 ? Number(form.payday_day_2) : null,
        daily_allowance: Number(form.daily_allowance || 0),
        monthly_savings_target: Number(form.monthly_savings_target || 0),
        onboarding_completed: true,
      }, { onConflict: 'user_id' })
      if (settingsError) throw settingsError

      const { data: existingCategories, error: categoryCheckError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      if (categoryCheckError) throw categoryCheckError
      if (!existingCategories?.length) {
        const { error: categoryError } = await supabase.from('categories').insert(
          defaultCategories.map((name) => ({ user_id: userId, name }))
        )
        if (categoryError) throw categoryError
      }

      if (Number(form.goal_target || 0) > 0) {
        const { error: goalError } = await supabase.from('savings_goals').insert({
          user_id: userId,
          name: form.goal_name.trim() || 'Savings Goal',
          target_amount: Number(form.goal_target),
          current_amount: 0,
        })
        if (goalError) throw goalError
      }

      onComplete()
    } catch (e) {
      setError(e.message || 'Could not save your setup.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <div className="onboarding-head">
          <div>
            <p className="eyebrow">PERSONAL SETUP</p>
            <h1>Build a plan around your life.</h1>
            <p className="muted">Nothing here is shared with other users. You can change every setting later.</p>
          </div>
          <div className="step-count">{step + 1}/{steps.length}</div>
        </div>

        <div className="stepper">
          {steps.map((label, index) => (
            <div key={label} className={`step ${index <= step ? 'active' : ''}`}>
              <span>{index + 1}</span><small>{label}</small>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="form-grid two">
            <label>What should we call you?<input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="Your name" /></label>
            <label>Currency<select value={form.currency} onChange={(e) => update('currency', e.target.value)}>{currencyOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label>Current available cash<input type="number" min="0" step="0.01" value={form.current_cash} onChange={(e) => update('current_cash', e.target.value)} placeholder="0.00" /></label>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid two">
            <label>Typical monthly income<input type="number" min="0" step="0.01" value={form.monthly_income} onChange={(e) => update('monthly_income', e.target.value)} placeholder="0.00" /></label>
            <label>How are you paid?<select value={form.pay_frequency} onChange={(e) => update('pay_frequency', e.target.value)}><option value="monthly">Monthly</option><option value="twice_monthly">Twice a month</option><option value="biweekly">Every two weeks</option><option value="weekly">Weekly</option><option value="custom">Custom</option></select></label>
            {(form.pay_frequency === 'monthly' || form.pay_frequency === 'twice_monthly') && <label>Primary payday (day of month)<input type="number" min="1" max="31" value={form.payday_day_1} onChange={(e) => update('payday_day_1', e.target.value)} /></label>}
            {form.pay_frequency === 'twice_monthly' && <label>Second payday<input type="number" min="1" max="31" value={form.payday_day_2} onChange={(e) => update('payday_day_2', e.target.value)} /></label>}
          </div>
        )}

        {step === 2 && (
          <div className="form-grid two">
            <label>Daily spending guide<input type="number" min="0" step="0.01" value={form.daily_allowance} onChange={(e) => update('daily_allowance', e.target.value)} placeholder="Optional" /></label>
            <label>Monthly savings target<input type="number" min="0" step="0.01" value={form.monthly_savings_target} onChange={(e) => update('monthly_savings_target', e.target.value)} placeholder="Optional" /></label>
            <div className="insight-card span-two"><span>Estimated room after planned savings</span><strong>{formatMoney(monthlyRoom, form.currency)}</strong><small>You’ll add recurring bills, debts, and category budgets next.</small></div>
          </div>
        )}

        {step === 3 && (
          <div className="form-grid two">
            <label>First savings goal<input value={form.goal_name} onChange={(e) => update('goal_name', e.target.value)} placeholder="Emergency Fund" /></label>
            <label>Target amount<input type="number" min="0" step="0.01" value={form.goal_target} onChange={(e) => update('goal_target', e.target.value)} placeholder="Optional" /></label>
            <div className="info-box span-two">You can create as many goals as you want later: emergency fund, travel, home, education, business, vehicle, or anything else.</div>
          </div>
        )}

        {error && <div className="notice error">{error}</div>}
        <div className="onboarding-actions">
          <button className="secondary-btn" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
          {step < steps.length - 1 ? <button className="primary-btn" onClick={next}>Continue</button> : <button className="primary-btn" disabled={saving} onClick={finish}>{saving ? 'Building your plan…' : 'Open my dashboard'}</button>}
        </div>
      </section>
    </main>
  )
}
