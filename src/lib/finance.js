export const currencyOptions = [
  ['PHP', 'Philippine Peso (₱)'],
  ['USD', 'US Dollar ($)'],
  ['EUR', 'Euro (€)'],
  ['GBP', 'British Pound (£)'],
  ['JPY', 'Japanese Yen (¥)'],
  ['SGD', 'Singapore Dollar (S$)'],
  ['AUD', 'Australian Dollar (A$)'],
  ['CAD', 'Canadian Dollar (C$)'],
]

export const defaultCategories = [
  'Housing',
  'Food',
  'Transportation',
  'Utilities',
  'Health',
  'Personal',
  'Entertainment',
  'Shopping',
  'Education',
  'Family',
  'Debt Payment',
  'Savings',
  'Other',
]

export function formatMoney(value, currency = 'PHP') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }
}

export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const toISO = (d) => d.toISOString().slice(0, 10)
  return { start: toISO(start), end: toISO(end) }
}

export function monthLabel() {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date())
}

export function paymentsRemaining(balance, payment) {
  const b = Number(balance || 0)
  const p = Number(payment || 0)
  if (b <= 0) return 0
  if (p <= 0) return null
  return Math.ceil(b / p)
}

export function payoffLabel(balance, payment, frequency = 'monthly') {
  const count = paymentsRemaining(balance, payment)
  if (count === null) return 'Set a payment amount'
  if (count === 0) return 'Paid off'
  const d = new Date()
  if (frequency === 'weekly') d.setDate(d.getDate() + count * 7)
  else if (frequency === 'biweekly') d.setDate(d.getDate() + count * 14)
  else d.setMonth(d.getMonth() + count)
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d)
}

export function clampProgress(current, target) {
  if (!Number(target)) return 0
  return Math.max(0, Math.min(100, (Number(current || 0) / Number(target)) * 100))
}
