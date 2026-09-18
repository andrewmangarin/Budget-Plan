import React, { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, ArrowLeftRight, CalendarDays, CreditCard, Repeat2, Target,
  HandCoins, BarChart3, Settings, Plus, LogOut, Wallet, TrendingUp, Receipt,
  PiggyBank, Menu, Sun, Moon, Trash2, CheckCircle2, ChevronRight, Download,
  Tags, CircleDollarSign, RefreshCw
} from 'lucide-react'
import { supabase } from './lib/supabaseClient'
import { clampProgress, currentMonthRange, formatDate, formatMoney, monthLabel, payoffLabel, paymentsRemaining, defaultCategories } from './lib/finance'
import Modal from './components/Modal'
import ProgressBar from './components/ProgressBar'

const navItems = [
  ['overview', 'Overview', LayoutDashboard],
  ['transactions', 'Transactions', ArrowLeftRight],
  ['paydays', 'Payday Planner', CalendarDays],
  ['debts', 'Debts', CreditCard],
  ['recurring', 'Recurring', Repeat2],
  ['goals', 'Savings & Goals', Target],
  ['receivables', 'Receivables', HandCoins],
  ['budgets', 'Budgets', Tags],
  ['reports', 'Reports', BarChart3],
  ['settings', 'Settings', Settings],
]

const emptyForms = {
  transaction: { type: 'expense', amount: '', category: 'Food', description: '', date: new Date().toISOString().slice(0, 10) },
  recurring: { name: '', category: 'Housing', amount: '', frequency: 'monthly', due_day: '', notes: '' },
  debt: { name: '', original_balance: '', remaining_balance: '', payment_amount: '', frequency: 'monthly', due_date: '', interest_rate: '', notes: '' },
  goal: { name: '', target_amount: '', current_amount: '', target_date: '' },
  receivable: { person_name: '', amount: '', due_date: '', notes: '' },
  payday: { label: 'Payday', payday_date: new Date().toISOString().slice(0, 10), expected_amount: '' },
  budget: { category: 'Food', monthly_limit: '' },
  category: { name: '' },
}

export default function Dashboard({ user, onSignOut }) {
  const [active, setActive] = useState('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('finance-theme') || 'light')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForms.transaction)
  const [data, setData] = useState({
    profile: null, settings: null, income: [], spending: [], expenses: [], debts: [], debtPayments: [], goals: [], goalContributions: [], paydays: [], receivables: [], categories: [], budgets: []
  })

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('finance-theme', theme) }, [theme])
  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true); setError('')
    try {
      const userId = user.id
      const [profileR, settingsR, incomeR, spendingR, expensesR, debtsR, debtPaymentsR, goalsR, goalContribR, paydaysR, receivablesR, categoriesR, budgetsR] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('financial_settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('income').select('*').eq('user_id', userId).order('income_date', { ascending: false }),
        supabase.from('spending_transactions').select('*').eq('user_id', userId).order('spent_on', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('debts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('debt_payments').select('*').eq('user_id', userId).order('paid_on', { ascending: false }),
        supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('goal_contributions').select('*').eq('user_id', userId).order('contributed_on', { ascending: false }),
        supabase.from('paydays').select('*').eq('user_id', userId).order('payday_date', { ascending: true }),
        supabase.from('receivables').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('categories').select('*').eq('user_id', userId).order('name'),
        supabase.from('budgets').select('*').eq('user_id', userId).order('category'),
      ])
      const results = [profileR, settingsR, incomeR, spendingR, expensesR, debtsR, debtPaymentsR, goalsR, goalContribR, paydaysR, receivablesR, categoriesR, budgetsR]
      const firstError = results.find((r) => r.error)?.error
      if (firstError) throw firstError
      setData({
        profile: profileR.data, settings: settingsR.data, income: incomeR.data || [], spending: spendingR.data || [], expenses: expensesR.data || [], debts: debtsR.data || [], debtPayments: debtPaymentsR.data || [], goals: goalsR.data || [], goalContributions: goalContribR.data || [], paydays: paydaysR.data || [], receivables: receivablesR.data || [], categories: categoriesR.data || [], budgets: budgetsR.data || [],
      })
    } catch (e) { setError(e.message || 'Could not load your finance data.') }
    finally { setLoading(false) }
  }

  const currency = data.settings?.currency || 'PHP'
  const categories = data.categories.length ? data.categories.map((c) => c.name) : defaultCategories
  const month = currentMonthRange()
  const monthIncome = useMemo(() => data.income.filter((x) => x.income_date >= month.start && x.income_date <= month.end).reduce((s, x) => s + Number(x.amount || 0), 0), [data.income])
  const monthSpend = useMemo(() => data.spending.filter((x) => x.spent_on >= month.start && x.spent_on <= month.end).reduce((s, x) => s + Number(x.amount || 0), 0), [data.spending])
  const recurringMonthly = useMemo(() => data.expenses.filter((x) => x.is_active !== false).reduce((s, x) => s + monthlyEquivalent(x.amount, x.frequency), 0), [data.expenses])
  const totalDebt = useMemo(() => data.debts.reduce((s, x) => s + Number(x.remaining_balance || 0), 0), [data.debts])
  const totalReceivable = useMemo(() => data.receivables.filter((x) => !x.is_received).reduce((s, x) => s + Number(x.amount || 0), 0), [data.receivables])
  const totalSavings = useMemo(() => data.goals.reduce((s, x) => s + Number(x.current_amount || 0), 0), [data.goals])
  const totalSavingsTargets = useMemo(() => data.goals.reduce((s, x) => s + Number(x.target_amount || 0), 0), [data.goals])
  const expectedIncome = Number(data.settings?.monthly_income || 0)
  const plannedDebtPayments = useMemo(() => data.debts.filter((x) => !x.is_paid).reduce((s, x) => s + monthlyEquivalent(x.payment_amount, x.frequency), 0), [data.debts])
  const plannedSavings = Number(data.settings?.monthly_savings_target || 0)
  const remainingPlan = expectedIncome - recurringMonthly - plannedDebtPayments - plannedSavings

  const categorySpend = useMemo(() => {
    const map = {}
    data.spending.filter((x) => x.spent_on >= month.start && x.spent_on <= month.end).forEach((x) => { map[x.category || 'Other'] = (map[x.category || 'Other'] || 0) + Number(x.amount || 0) })
    return Object.entries(map).sort((a,b) => b[1] - a[1])
  }, [data.spending])

  function openModal(type, seed = {}) {
    setForm({ ...(emptyForms[type] || {}), ...seed })
    setModal(type)
  }
  function updateForm(key, value) { setForm((p) => ({ ...p, [key]: value })) }

  async function saveModal(e) {
    e?.preventDefault(); setBusy(true); setError('')
    try {
      const user_id = user.id
      if (modal === 'transaction') {
        if (form.type === 'income') {
          const { error } = await supabase.from('income').insert({ user_id, source: form.description || 'Income', amount: num(form.amount), income_date: form.date, notes: form.category })
          if (error) throw error
        } else {
          const { error } = await supabase.from('spending_transactions').insert({ user_id, category: form.category || 'Other', description: form.description, amount: num(form.amount), spent_on: form.date })
          if (error) throw error
        }
      } else if (modal === 'recurring') {
        const payload = { user_id, name: form.name, category: form.category, amount: num(form.amount), frequency: form.frequency, due_day: form.due_day ? Number(form.due_day) : null, notes: form.notes, is_active: true }
        const { error } = form.id ? await supabase.from('expenses').update(payload).eq('id', form.id) : await supabase.from('expenses').insert(payload)
        if (error) throw error
      } else if (modal === 'debt') {
        const original = num(form.original_balance)
        const payload = { user_id, name: form.name, original_balance: original, remaining_balance: form.remaining_balance === '' ? original : num(form.remaining_balance), payment_amount: num(form.payment_amount), frequency: form.frequency, due_date: form.due_date || null, interest_rate: num(form.interest_rate), notes: form.notes, is_paid: false }
        const { error } = form.id ? await supabase.from('debts').update(payload).eq('id', form.id) : await supabase.from('debts').insert(payload)
        if (error) throw error
      } else if (modal === 'goal') {
        const payload = { user_id, name: form.name, target_amount: num(form.target_amount), current_amount: num(form.current_amount), target_date: form.target_date || null }
        const { error } = form.id ? await supabase.from('savings_goals').update(payload).eq('id', form.id) : await supabase.from('savings_goals').insert(payload)
        if (error) throw error
      } else if (modal === 'receivable') {
        const payload = { user_id, person_name: form.person_name, amount: num(form.amount), due_date: form.due_date || null, notes: form.notes, is_received: false }
        const { error } = form.id ? await supabase.from('receivables').update(payload).eq('id', form.id) : await supabase.from('receivables').insert(payload)
        if (error) throw error
      } else if (modal === 'payday') {
        const { error } = await supabase.from('paydays').insert({ user_id, label: form.label || 'Payday', payday_date: form.payday_date, expected_amount: num(form.expected_amount), status: 'upcoming' })
        if (error) throw error
      } else if (modal === 'budget') {
        const { error } = await supabase.from('budgets').upsert({ user_id, category: form.category, monthly_limit: num(form.monthly_limit) }, { onConflict: 'user_id,category' })
        if (error) throw error
      } else if (modal === 'category') {
        const { error } = await supabase.from('categories').insert({ user_id, name: form.name.trim() })
        if (error) throw error
      }
      setModal(null); await loadAll()
    } catch (e2) { setError(e2.message || 'Could not save.') }
    finally { setBusy(false) }
  }

  async function remove(table, id) {
    if (!window.confirm('Delete this item?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return setError(error.message)
    await loadAll()
  }

  async function debtPayment(debt) {
    const raw = window.prompt(`Payment amount for ${debt.name}`, debt.payment_amount || '')
    if (raw === null) return
    const amount = num(raw); if (amount <= 0) return
    setBusy(true)
    try {
      const remaining = Math.max(0, Number(debt.remaining_balance || 0) - amount)
      const { error: pError } = await supabase.from('debt_payments').insert({ user_id: user.id, debt_id: debt.id, amount, paid_on: new Date().toISOString().slice(0,10) })
      if (pError) throw pError
      const { error: dError } = await supabase.from('debts').update({ remaining_balance: remaining, is_paid: remaining <= 0 }).eq('id', debt.id)
      if (dError) throw dError
      await loadAll()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function goalContribution(goal) {
    const raw = window.prompt(`Contribution to ${goal.name}`, '')
    if (raw === null) return
    const amount = num(raw); if (amount <= 0) return
    setBusy(true)
    try {
      const next = Number(goal.current_amount || 0) + amount
      const { error: cError } = await supabase.from('goal_contributions').insert({ user_id: user.id, goal_id: goal.id, amount, contributed_on: new Date().toISOString().slice(0,10) })
      if (cError) throw cError
      const { error: gError } = await supabase.from('savings_goals').update({ current_amount: next, is_completed: next >= Number(goal.target_amount || 0) }).eq('id', goal.id)
      if (gError) throw gError
      await loadAll()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function markReceived(item) {
    const { error } = await supabase.from('receivables').update({ is_received: !item.is_received }).eq('id', item.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function markPayday(item) {
    const status = item.status === 'received' ? 'upcoming' : 'received'
    const { error } = await supabase.from('paydays').update({ status, actual_amount: status === 'received' ? Number(item.expected_amount || 0) : null }).eq('id', item.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function generatePaydays() {
    const s = data.settings; if (!s) return
    const entries = []; const today = new Date()
    const push = (d, amount, label) => { if (d >= today) entries.push({ user_id: user.id, payday_date: d.toISOString().slice(0,10), expected_amount: amount, status: 'upcoming', label }) }
    for (let i=0; i<4; i++) {
      const base = new Date(today.getFullYear(), today.getMonth()+i, 1)
      if (s.pay_frequency === 'twice_monthly') {
        push(safeDay(base, s.payday_day_1 || 15), Number(s.monthly_income||0)/2, 'Payday 1')
        push(safeDay(base, s.payday_day_2 || 30), Number(s.monthly_income||0)/2, 'Payday 2')
      } else if (s.pay_frequency === 'monthly') {
        push(safeDay(base, s.payday_day_1 || 30), Number(s.monthly_income||0), 'Monthly payday')
      }
    }
    if (!entries.length) return setError('Automatic generation currently supports monthly and twice-monthly schedules. Add custom paydays manually for weekly or custom plans.')
    const { error } = await supabase.from('paydays').insert(entries)
    if (error) setError(error.message); else await loadAll()
  }

  async function saveSettings(e) {
    e.preventDefault(); setBusy(true)
    const fd = new FormData(e.currentTarget)
    const payload = {
      currency: fd.get('currency'), current_cash: num(fd.get('current_cash')), monthly_income: num(fd.get('monthly_income')),
      daily_allowance: num(fd.get('daily_allowance')), monthly_savings_target: num(fd.get('monthly_savings_target')),
      pay_frequency: fd.get('pay_frequency'), payday_day_1: fd.get('payday_day_1') ? Number(fd.get('payday_day_1')) : null, payday_day_2: fd.get('payday_day_2') ? Number(fd.get('payday_day_2')) : null,
    }
    try {
      const { error: pError } = await supabase.from('profiles').upsert({ id: user.id, full_name: fd.get('full_name') })
      if (pError) throw pError
      const { error: sError } = await supabase.from('financial_settings').update(payload).eq('user_id', user.id)
      if (sError) throw sError
      await loadAll()
    } catch (e2) { setError(e2.message) } finally { setBusy(false) }
  }

  function exportData() {
    const safe = { exported_at: new Date().toISOString(), profile: data.profile, settings: data.settings, income: data.income, spending: data.spending, recurring_expenses: data.expenses, debts: data.debts, debt_payments: data.debtPayments, savings_goals: data.goals, goal_contributions: data.goalContributions, paydays: data.paydays, receivables: data.receivables, categories: data.categories, budgets: data.budgets }
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`finance-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url)
  }

  const pageTitle = navItems.find(([id]) => id === active)?.[1] || 'Overview'
  if (loading) return <div className="loading-page"><div className="spinner" />Loading your plan…</div>

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand"><div className="brand-mark small">₱</div><div><strong>My Finance</strong><span>Planner</span></div></div>
        <nav>{navItems.map(([id,label,Icon]) => <button key={id} className={active===id?'active':''} onClick={()=>{setActive(id);setMobileOpen(false)}}><Icon size={18}/><span>{label}</span></button>)}</nav>
        <div className="sidebar-foot"><button onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}<span>{theme==='light'?'Dark mode':'Light mode'}</span></button><button onClick={onSignOut}><LogOut size={18}/><span>Sign out</span></button></div>
      </aside>
      {mobileOpen && <div className="sidebar-scrim" onClick={()=>setMobileOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={22}/></button><div><p className="eyebrow">{monthLabel().toUpperCase()}</p><h1>{pageTitle}</h1></div></div>
          <div className="topbar-right"><div className="user-chip"><span>{(data.profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}</span><div><strong>{data.profile?.full_name || 'My account'}</strong><small>{user.email}</small></div></div><button className="primary-btn compact" onClick={()=>openModal('transaction')}><Plus size={17}/> Add</button></div>
        </header>

        {error && <div className="notice error page-notice">{error}<button onClick={()=>setError('')}>×</button></div>}

        {active === 'overview' && <Overview currency={currency} settings={data.settings} totals={{monthIncome,monthSpend,totalDebt,totalReceivable,totalSavings,totalSavingsTargets,remainingPlan,recurringMonthly,plannedDebtPayments}} goals={data.goals} paydays={data.paydays} expenses={data.expenses} debts={data.debts} onAdd={()=>openModal('transaction')} onNavigate={setActive} />}
        {active === 'transactions' && <Transactions currency={currency} income={data.income} spending={data.spending} onAdd={()=>openModal('transaction')} onDelete={remove} />}
        {active === 'paydays' && <Paydays currency={currency} paydays={data.paydays} onAdd={()=>openModal('payday')} onGenerate={generatePaydays} onMark={markPayday} onDelete={remove} />}
        {active === 'debts' && <Debts currency={currency} debts={data.debts} onAdd={()=>openModal('debt')} onEdit={(x)=>openModal('debt',x)} onPay={debtPayment} onDelete={remove} />}
        {active === 'recurring' && <Recurring currency={currency} items={data.expenses} onAdd={()=>openModal('recurring')} onEdit={(x)=>openModal('recurring',x)} onDelete={remove} />}
        {active === 'goals' && <Goals currency={currency} goals={data.goals} onAdd={()=>openModal('goal')} onEdit={(x)=>openModal('goal',x)} onContribute={goalContribution} onDelete={remove} />}
        {active === 'receivables' && <Receivables currency={currency} items={data.receivables} onAdd={()=>openModal('receivable')} onEdit={(x)=>openModal('receivable',x)} onMark={markReceived} onDelete={remove} />}
        {active === 'budgets' && <Budgets currency={currency} budgets={data.budgets} categorySpend={categorySpend} categories={categories} onAdd={()=>openModal('budget')} onCategory={()=>openModal('category')} onDelete={remove} />}
        {active === 'reports' && <Reports currency={currency} monthIncome={monthIncome} monthSpend={monthSpend} recurringMonthly={recurringMonthly} plannedDebtPayments={plannedDebtPayments} plannedSavings={plannedSavings} categorySpend={categorySpend} budgets={data.budgets} />}
        {active === 'settings' && <SettingsPage profile={data.profile} settings={data.settings} onSave={saveSettings} busy={busy} onExport={exportData} />}
      </main>

      <FinanceModal modal={modal} form={form} update={updateForm} categories={categories} currency={currency} busy={busy} close={()=>setModal(null)} save={saveModal} />
    </div>
  )
}

function Overview({ currency, settings, totals, goals, paydays, expenses, debts, onAdd, onNavigate }) {
  const upcomingPaydays = paydays.filter((x)=>x.status !== 'received' && new Date(`${x.payday_date}T00:00:00`) >= new Date(new Date().toDateString())).slice(0,3)
  const due = [...expenses.filter(x=>x.is_active!==false).map(x=>({name:x.name, amount:x.amount, due:x.due_day?`Day ${x.due_day}`:'Recurring', type:'Bill'})), ...debts.filter(x=>!x.is_paid).map(x=>({name:x.name, amount:x.payment_amount, due:x.due_date?formatDate(x.due_date):x.frequency, type:'Debt'}))].slice(0,5)
  return <div className="page-grid">
    <section className="hero-balance"><div><p className="eyebrow">CURRENT AVAILABLE CASH</p><h2>{formatMoney(settings?.current_cash, currency)}</h2><p>Keep this updated in Settings when your real-world balance changes.</p></div><button className="secondary-btn light" onClick={()=>onNavigate('settings')}>Update balance <ChevronRight size={16}/></button></section>
    <div className="metric-grid">
      <Metric icon={TrendingUp} label="Income this month" value={formatMoney(totals.monthIncome, currency)} hint={`Plan: ${formatMoney(settings?.monthly_income, currency)}`} />
      <Metric icon={Receipt} label="Spent this month" value={formatMoney(totals.monthSpend, currency)} hint="Recorded transactions" />
      <Metric icon={CreditCard} label="Remaining debt" value={formatMoney(totals.totalDebt, currency)} hint={`Planned payments ${formatMoney(totals.plannedDebtPayments, currency)}/mo`} />
      <Metric icon={HandCoins} label="Owed to you" value={formatMoney(totals.totalReceivable, currency)} hint="Open receivables" />
      <Metric icon={PiggyBank} label="Saved toward goals" value={formatMoney(totals.totalSavings, currency)} hint={`Targets ${formatMoney(totals.totalSavingsTargets, currency)}`} />
      <Metric icon={Wallet} label="Plan room" value={formatMoney(totals.remainingPlan, currency)} hint="After bills, debt & planned savings" tone={totals.remainingPlan < 0 ? 'warn' : ''} />
    </div>
    <section className="panel span-8"><div className="section-head"><div><p className="eyebrow">GOALS</p><h3>Progress that stays visible</h3></div><button className="text-btn" onClick={()=>onNavigate('goals')}>View all</button></div>{goals.length ? <div className="goal-list compact-list">{goals.slice(0,4).map(g=><div className="goal-row" key={g.id}><div className="row-between"><strong>{g.name}</strong><span>{Math.round(clampProgress(g.current_amount,g.target_amount))}%</span></div><ProgressBar value={clampProgress(g.current_amount,g.target_amount)}/><small>{formatMoney(g.current_amount,currency)} of {formatMoney(g.target_amount,currency)}</small></div>)}</div>:<Empty title="No savings goals yet" text="Create a goal for an emergency fund, travel, home, business, or anything important." action="Create goal" onClick={()=>onNavigate('goals')}/>}</section>
    <section className="panel span-4"><div className="section-head"><div><p className="eyebrow">NEXT PAYDAYS</p><h3>Money coming in</h3></div></div>{upcomingPaydays.length?upcomingPaydays.map(p=><div className="mini-row" key={p.id}><div><strong>{p.label||'Payday'}</strong><small>{formatDate(p.payday_date)}</small></div><b>{formatMoney(p.expected_amount,currency)}</b></div>):<Empty title="No upcoming paydays" text="Add them manually or generate them from your pay schedule."/>}</section>
    <section className="panel span-8"><div className="section-head"><div><p className="eyebrow">OBLIGATIONS</p><h3>Recurring bills & debt payments</h3></div><button className="text-btn" onClick={()=>onNavigate('recurring')}>Manage</button></div>{due.length?due.map((x,i)=><div className="mini-row" key={`${x.name}-${i}`}><div><strong>{x.name}</strong><small>{x.type} · {x.due}</small></div><b>{formatMoney(x.amount,currency)}</b></div>):<Empty title="Nothing planned yet" text="Add recurring expenses and debts to see your real monthly commitments."/>}</section>
    <section className="panel span-4 quick-panel"><p className="eyebrow">QUICK ACTION</p><h3>Record money as it moves</h3><p className="muted">Add income or spending immediately so your monthly report stays useful.</p><button className="primary-btn wide" onClick={onAdd}><Plus size={17}/> Add transaction</button></section>
  </div>
}

function Transactions({ currency, income, spending, onAdd, onDelete }) {
  const combined=[...income.map(x=>({...x,_type:'income',date:x.income_date,title:x.source})),...spending.map(x=>({...x,_type:'expense',date:x.spent_on,title:x.description||x.category}))].sort((a,b)=>String(b.date).localeCompare(String(a.date)))
  return <section className="panel full"><div className="section-head"><div><p className="eyebrow">LEDGER</p><h3>Income & spending</h3></div><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Add transaction</button></div>{combined.length?<div className="table-list">{combined.map(x=><div className="transaction-row" key={`${x._type}-${x.id}`}><div className={`transaction-icon ${x._type}`}>{x._type==='income'?'+':'−'}</div><div className="transaction-main"><strong>{x.title}</strong><small>{x._type==='income'?(x.notes||'Income'):(x.category||'Expense')} · {formatDate(x.date)}</small></div><b className={x._type}>{x._type==='income'?'+':'−'}{formatMoney(x.amount,currency)}</b><button className="icon-btn danger" onClick={()=>onDelete(x._type==='income'?'income':'spending_transactions',x.id)}><Trash2 size={16}/></button></div>)}</div>:<Empty title="No transactions yet" text="Add income and expenses to start your monthly cash-flow history." action="Add transaction" onClick={onAdd}/>}</section>
}

function Paydays({ currency, paydays, onAdd, onGenerate, onMark, onDelete }) {
  return <section className="panel full"><div className="section-head"><div><p className="eyebrow">PAYDAY PLANNER</p><h3>Plan cash before it arrives</h3></div><div className="head-actions"><button className="secondary-btn" onClick={onGenerate}><RefreshCw size={16}/> Generate</button><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Add payday</button></div></div>{paydays.length?<div className="card-list">{paydays.map(p=><article className={`item-card ${p.status==='received'?'completed':''}`} key={p.id}><div><span className="pill">{p.status||'upcoming'}</span><h4>{p.label||'Payday'}</h4><p>{formatDate(p.payday_date)}</p></div><div className="item-amount"><strong>{formatMoney(p.actual_amount??p.expected_amount,currency)}</strong><small>expected {formatMoney(p.expected_amount,currency)}</small></div><div className="item-actions"><button className="secondary-btn compact" onClick={()=>onMark(p)}><CheckCircle2 size={15}/>{p.status==='received'?'Undo':'Received'}</button><button className="icon-btn danger" onClick={()=>onDelete('paydays',p.id)}><Trash2 size={16}/></button></div></article>)}</div>:<Empty title="No paydays yet" text="Add a payday or generate upcoming dates from your monthly/twice-monthly schedule." action="Add payday" onClick={onAdd}/>}</section>
}

function Debts({ currency, debts, onAdd, onEdit, onPay, onDelete }) {
  return <section className="panel full"><div className="section-head"><div><p className="eyebrow">DEBT TRACKER</p><h3>See the finish line</h3></div><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Add debt</button></div>{debts.length?<div className="card-grid">{debts.map(d=>{const progress=d.original_balance?100-(Number(d.remaining_balance||0)/Number(d.original_balance))*100:0;return <article className="detail-card" key={d.id}><div className="row-between"><span className={`pill ${d.is_paid?'success':''}`}>{d.is_paid?'Paid':'Active'}</span><button className="icon-btn danger" onClick={()=>onDelete('debts',d.id)}><Trash2 size={15}/></button></div><h4>{d.name}</h4><strong className="big-amount">{formatMoney(d.remaining_balance,currency)}</strong><p className="muted">remaining of {formatMoney(d.original_balance,currency)}</p><ProgressBar value={progress}/><div className="split-stats"><span><small>Payment</small><b>{formatMoney(d.payment_amount,currency)}</b></span><span><small>Payments left</small><b>{paymentsRemaining(d.remaining_balance,d.payment_amount)??'—'}</b></span><span><small>Projected</small><b>{payoffLabel(d.remaining_balance,d.payment_amount,d.frequency)}</b></span></div><div className="card-actions"><button className="secondary-btn compact" onClick={()=>onEdit(d)}>Edit</button>{!d.is_paid&&<button className="primary-btn compact" onClick={()=>onPay(d)}>Record payment</button>}</div></article>})}</div>:<Empty title="No debts added" text="Track loans, installments, cards, or money you need to repay." action="Add debt" onClick={onAdd}/>}</section>
}

function Recurring({ currency, items, onAdd, onEdit, onDelete }) { return <section className="panel full"><div className="section-head"><div><p className="eyebrow">RECURRING EXPENSES</p><h3>Know your fixed commitments</h3></div><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Add recurring</button></div>{items.length?<div className="table-list">{items.map(x=><div className="list-row" key={x.id}><div><strong>{x.name}</strong><small>{x.category||'Expense'} · {x.frequency} {x.due_day?`· due day ${x.due_day}`:''}</small></div><b>{formatMoney(x.amount,currency)}</b><div className="row-actions"><button className="text-btn" onClick={()=>onEdit(x)}>Edit</button><button className="icon-btn danger" onClick={()=>onDelete('expenses',x.id)}><Trash2 size={16}/></button></div></div>)}</div>:<Empty title="No recurring expenses" text="Add rent, utilities, subscriptions, family support, insurance, and other repeating commitments." action="Add recurring expense" onClick={onAdd}/>}</section> }

function Goals({ currency, goals, onAdd, onEdit, onContribute, onDelete }) { return <section className="panel full"><div className="section-head"><div><p className="eyebrow">SAVINGS & GOALS</p><h3>Give every goal a target</h3></div><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Add goal</button></div>{goals.length?<div className="card-grid">{goals.map(g=><article className="detail-card" key={g.id}><div className="row-between"><span className={`pill ${g.is_completed?'success':''}`}>{g.is_completed?'Completed':g.target_date?formatDate(g.target_date):'No deadline'}</span><button className="icon-btn danger" onClick={()=>onDelete('savings_goals',g.id)}><Trash2 size={15}/></button></div><h4>{g.name}</h4><strong className="big-amount">{formatMoney(g.current_amount,currency)}</strong><p className="muted">of {formatMoney(g.target_amount,currency)}</p><ProgressBar value={clampProgress(g.current_amount,g.target_amount)}/><div className="row-between progress-caption"><small>{Math.round(clampProgress(g.current_amount,g.target_amount))}% complete</small><small>{formatMoney(Math.max(0,Number(g.target_amount||0)-Number(g.current_amount||0)),currency)} to go</small></div><div className="card-actions"><button className="secondary-btn compact" onClick={()=>onEdit(g)}>Edit</button><button className="primary-btn compact" onClick={()=>onContribute(g)}>Add contribution</button></div></article>)}</div>:<Empty title="No savings goals" text="Create goals for your emergency fund, travel, home, education, business, or purchases." action="Add goal" onClick={onAdd}/>}</section> }

function Receivables({ currency, items, onAdd, onEdit, onMark, onDelete }) { return <section className="panel full"><div className="section-head"><div><p className="eyebrow">RECEIVABLES</p><h3>Money owed to you</h3></div><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Add receivable</button></div>{items.length?<div className="table-list">{items.map(x=><div className={`list-row ${x.is_received?'dimmed':''}`} key={x.id}><div><strong>{x.person_name}</strong><small>{x.is_received?'Received':x.due_date?`Due ${formatDate(x.due_date)}`:'No due date'}{x.notes?` · ${x.notes}`:''}</small></div><b>{formatMoney(x.amount,currency)}</b><div className="row-actions"><button className="secondary-btn compact" onClick={()=>onMark(x)}>{x.is_received?'Reopen':'Mark received'}</button><button className="text-btn" onClick={()=>onEdit(x)}>Edit</button><button className="icon-btn danger" onClick={()=>onDelete('receivables',x.id)}><Trash2 size={16}/></button></div></div>)}</div>:<Empty title="No receivables" text="Track money friends, family, clients, or anyone else owes you." action="Add receivable" onClick={onAdd}/>}</section> }

function Budgets({ currency, budgets, categorySpend, categories, onAdd, onCategory, onDelete }) {
  const spendMap=Object.fromEntries(categorySpend)
  return <section className="panel full"><div className="section-head"><div><p className="eyebrow">CATEGORY BUDGETS</p><h3>Set limits without locking yourself in</h3></div><div className="head-actions"><button className="secondary-btn" onClick={onCategory}><Plus size={16}/> Category</button><button className="primary-btn compact" onClick={onAdd}><Plus size={16}/> Budget</button></div></div>{budgets.length?<div className="budget-list">{budgets.map(b=>{const spent=spendMap[b.category]||0;const pct=b.monthly_limit?spent/Number(b.monthly_limit)*100:0;return <div className="budget-row" key={b.id}><div className="row-between"><div><strong>{b.category}</strong><small>{formatMoney(spent,currency)} spent</small></div><div className="budget-right"><b>{formatMoney(b.monthly_limit,currency)}</b><button className="icon-btn danger" onClick={()=>onDelete('budgets',b.id)}><Trash2 size={15}/></button></div></div><ProgressBar value={pct}/><div className="row-between progress-caption"><small>{Math.round(pct)}% used</small><small>{formatMoney(Number(b.monthly_limit||0)-spent,currency)} remaining</small></div></div>})}</div>:<Empty title="No category budgets" text="Set monthly limits for food, transport, shopping, entertainment, or your own categories." action="Create budget" onClick={onAdd}/>}<div className="category-chips">{categories.map(c=><span key={c}>{c}</span>)}</div></section>
}

function Reports({ currency, monthIncome, monthSpend, recurringMonthly, plannedDebtPayments, plannedSavings, categorySpend, budgets }) {
  const planned=recurringMonthly+plannedDebtPayments+plannedSavings; const cashFlow=monthIncome-monthSpend
  const max=Math.max(1,...categorySpend.map(([,v])=>v))
  return <div className="page-grid"><div className="metric-grid span-12"><Metric icon={TrendingUp} label="Recorded income" value={formatMoney(monthIncome,currency)} hint="This month"/><Metric icon={Receipt} label="Recorded spending" value={formatMoney(monthSpend,currency)} hint="This month"/><Metric icon={CircleDollarSign} label="Recorded cash flow" value={formatMoney(cashFlow,currency)} hint={cashFlow>=0?'Positive':'Negative'} tone={cashFlow<0?'warn':''}/><Metric icon={CalendarDays} label="Planned commitments" value={formatMoney(planned,currency)} hint="Bills + debt + planned savings"/></div><section className="panel span-7"><div className="section-head"><div><p className="eyebrow">SPENDING MIX</p><h3>Where money went this month</h3></div></div>{categorySpend.length?categorySpend.map(([cat,val])=><div className="bar-row" key={cat}><div className="row-between"><span>{cat}</span><b>{formatMoney(val,currency)}</b></div><div className="bar-track"><div style={{width:`${val/max*100}%`}}/></div></div>):<Empty title="No spending to analyze" text="Record expenses and this report will build itself."/>}</section><section className="panel span-5"><div className="section-head"><div><p className="eyebrow">BUDGET CHECK</p><h3>Limits vs actual</h3></div></div>{budgets.length?budgets.map(b=>{const actual=Object.fromEntries(categorySpend)[b.category]||0;return <div className="mini-row" key={b.id}><div><strong>{b.category}</strong><small>{Math.round((actual/Math.max(1,Number(b.monthly_limit)))*100)}% used</small></div><b>{formatMoney(actual,currency)} / {formatMoney(b.monthly_limit,currency)}</b></div>}):<Empty title="No budgets yet" text="Create category budgets to compare limits with actual spending."/>}</section></div>
}

function SettingsPage({ profile, settings, onSave, busy, onExport }) {
  return <div className="page-grid"><section className="panel span-8"><div className="section-head"><div><p className="eyebrow">PLAN SETTINGS</p><h3>Make the planner fit your life</h3></div></div><form className="form-grid two" onSubmit={onSave}><label>Name<input name="full_name" defaultValue={profile?.full_name||''}/></label><label>Currency<select name="currency" defaultValue={settings?.currency||'PHP'}><option value="PHP">PHP — Philippine Peso</option><option value="USD">USD — US Dollar</option><option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option><option value="JPY">JPY — Japanese Yen</option><option value="SGD">SGD — Singapore Dollar</option><option value="AUD">AUD — Australian Dollar</option><option value="CAD">CAD — Canadian Dollar</option></select></label><label>Current available cash<input name="current_cash" type="number" step="0.01" defaultValue={settings?.current_cash||0}/></label><label>Typical monthly income<input name="monthly_income" type="number" step="0.01" defaultValue={settings?.monthly_income||0}/></label><label>Daily spending guide<input name="daily_allowance" type="number" step="0.01" defaultValue={settings?.daily_allowance||0}/></label><label>Monthly savings target<input name="monthly_savings_target" type="number" step="0.01" defaultValue={settings?.monthly_savings_target||0}/></label><label>Pay frequency<select name="pay_frequency" defaultValue={settings?.pay_frequency||'twice_monthly'}><option value="monthly">Monthly</option><option value="twice_monthly">Twice monthly</option><option value="biweekly">Biweekly</option><option value="weekly">Weekly</option><option value="custom">Custom</option></select></label><label>Primary payday<input name="payday_day_1" type="number" min="1" max="31" defaultValue={settings?.payday_day_1||''}/></label><label>Second payday<input name="payday_day_2" type="number" min="1" max="31" defaultValue={settings?.payday_day_2||''}/></label><div className="span-two"><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Save settings'}</button></div></form></section><section className="panel span-4"><div className="section-head"><div><p className="eyebrow">YOUR DATA</p><h3>Portable by design</h3></div></div><p className="muted">Export a JSON backup containing the financial records visible to your signed-in account.</p><button className="secondary-btn wide" onClick={onExport}><Download size={16}/> Export my data</button><div className="info-box">Privacy is enforced in Supabase with Row Level Security. Each finance row is tied to the authenticated user ID.</div></section></div>
}

function FinanceModal({ modal, form, update, categories, currency, busy, close, save }) {
  if (!modal) return null
  const titles={transaction:'Add transaction',recurring:form.id?'Edit recurring expense':'Add recurring expense',debt:form.id?'Edit debt':'Add debt',goal:form.id?'Edit goal':'Add savings goal',receivable:form.id?'Edit receivable':'Add receivable',payday:'Add payday',budget:'Set category budget',category:'Add custom category'}
  return <Modal open title={titles[modal]} subtitle="Saved privately to the signed-in account." onClose={close}><form className="form-grid two modal-form" onSubmit={save}>
    {modal==='transaction'&&<><label>Type<select value={form.type} onChange={e=>update('type',e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Amount ({currency})<input type="number" step="0.01" min="0" value={form.amount} onChange={e=>update('amount',e.target.value)} required/></label>{form.type==='expense'&&<label>Category<CategorySelect categories={categories} value={form.category} onChange={v=>update('category',v)}/></label>}<label>{form.type==='income'?'Source':'Description'}<input value={form.description} onChange={e=>update('description',e.target.value)} placeholder={form.type==='income'?'Salary, freelance…':'Lunch, fuel…'}/></label><label>Date<input type="date" value={form.date} onChange={e=>update('date',e.target.value)} required/></label></>}
    {modal==='recurring'&&<><label>Name<input value={form.name} onChange={e=>update('name',e.target.value)} required/></label><label>Category<CategorySelect categories={categories} value={form.category} onChange={v=>update('category',v)}/></label><label>Amount<input type="number" step="0.01" min="0" value={form.amount} onChange={e=>update('amount',e.target.value)} required/></label><label>Frequency<select value={form.frequency} onChange={e=>update('frequency',e.target.value)}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label><label>Due day<input type="number" min="1" max="31" value={form.due_day||''} onChange={e=>update('due_day',e.target.value)}/></label><label>Notes<input value={form.notes||''} onChange={e=>update('notes',e.target.value)}/></label></>}
    {modal==='debt'&&<><label>Name<input value={form.name} onChange={e=>update('name',e.target.value)} required/></label><label>Original balance<input type="number" step="0.01" min="0" value={form.original_balance} onChange={e=>update('original_balance',e.target.value)} required/></label><label>Remaining balance<input type="number" step="0.01" min="0" value={form.remaining_balance} onChange={e=>update('remaining_balance',e.target.value)} placeholder="Defaults to original balance"/></label><label>Regular payment<input type="number" step="0.01" min="0" value={form.payment_amount} onChange={e=>update('payment_amount',e.target.value)}/></label><label>Frequency<select value={form.frequency} onChange={e=>update('frequency',e.target.value)}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option></select></label><label>Next due date<input type="date" value={form.due_date||''} onChange={e=>update('due_date',e.target.value)}/></label><label>Interest rate %<input type="number" step="0.01" min="0" value={form.interest_rate||''} onChange={e=>update('interest_rate',e.target.value)}/></label><label>Notes<input value={form.notes||''} onChange={e=>update('notes',e.target.value)}/></label></>}
    {modal==='goal'&&<><label>Goal name<input value={form.name} onChange={e=>update('name',e.target.value)} required/></label><label>Target amount<input type="number" step="0.01" min="0" value={form.target_amount} onChange={e=>update('target_amount',e.target.value)} required/></label><label>Current saved amount<input type="number" step="0.01" min="0" value={form.current_amount||''} onChange={e=>update('current_amount',e.target.value)}/></label><label>Target date<input type="date" value={form.target_date||''} onChange={e=>update('target_date',e.target.value)}/></label></>}
    {modal==='receivable'&&<><label>Person / source<input value={form.person_name} onChange={e=>update('person_name',e.target.value)} required/></label><label>Amount<input type="number" step="0.01" min="0" value={form.amount} onChange={e=>update('amount',e.target.value)} required/></label><label>Due date<input type="date" value={form.due_date||''} onChange={e=>update('due_date',e.target.value)}/></label><label>Notes<input value={form.notes||''} onChange={e=>update('notes',e.target.value)}/></label></>}
    {modal==='payday'&&<><label>Label<input value={form.label} onChange={e=>update('label',e.target.value)}/></label><label>Date<input type="date" value={form.payday_date} onChange={e=>update('payday_date',e.target.value)} required/></label><label>Expected amount<input type="number" step="0.01" min="0" value={form.expected_amount} onChange={e=>update('expected_amount',e.target.value)} required/></label></>}
    {modal==='budget'&&<><label>Category<CategorySelect categories={categories} value={form.category} onChange={v=>update('category',v)}/></label><label>Monthly limit<input type="number" step="0.01" min="0" value={form.monthly_limit} onChange={e=>update('monthly_limit',e.target.value)} required/></label></>}
    {modal==='category'&&<label className="span-two">Category name<input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Pets, Giving, Hobbies…" required/></label>}
    <div className="modal-actions span-two"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Save'}</button></div>
  </form></Modal>
}

function CategorySelect({categories,value,onChange}) { return <select value={value||categories[0]||'Other'} onChange={e=>onChange(e.target.value)}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select> }
function Metric({icon:Icon,label,value,hint,tone=''}) { return <article className={`metric-card ${tone}`}><div className="metric-icon"><Icon size={19}/></div><div><p>{label}</p><strong>{value}</strong><small>{hint}</small></div></article> }
function Empty({title,text,action,onClick}) { return <div className="empty"><div className="empty-icon"><PiggyBank size={24}/></div><strong>{title}</strong><p>{text}</p>{action&&<button className="secondary-btn compact" onClick={onClick}>{action}</button>}</div> }
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function monthlyEquivalent(amount, frequency='monthly'){const n=Number(amount||0); if(frequency==='weekly')return n*52/12;if(frequency==='biweekly')return n*26/12;if(frequency==='quarterly')return n/3;if(frequency==='yearly')return n/12;return n}
function safeDay(base,day){const y=base.getFullYear(),m=base.getMonth();const last=new Date(y,m+1,0).getDate();return new Date(y,m,Math.min(Number(day||1),last))}
