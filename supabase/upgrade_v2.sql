-- ============================================================
-- MY FINANCE PLANNER v2
-- Safe upgrade for the earlier schema. Run in Supabase SQL Editor.
-- Multi-user: every financial row belongs to auth.uid().
-- ============================================================

-- Existing tables: add fields used by the new customizable app.
alter table if exists public.financial_settings
  add column if not exists currency text not null default 'PHP',
  add column if not exists pay_frequency text not null default 'twice_monthly',
  add column if not exists payday_day_1 integer,
  add column if not exists payday_day_2 integer,
  add column if not exists monthly_savings_target numeric(12,2) not null default 0,
  add column if not exists onboarding_completed boolean not null default false;

alter table if exists public.expenses
  add column if not exists notes text;

alter table if exists public.debts
  add column if not exists interest_rate numeric(7,3) not null default 0,
  add column if not exists notes text;

alter table if exists public.savings_goals
  add column if not exists is_completed boolean not null default false;

alter table if exists public.paydays
  add column if not exists label text default 'Payday';

alter table if exists public.receivables
  add column if not exists notes text;

alter table if exists public.income
  add column if not exists is_recurring boolean not null default false,
  add column if not exists frequency text;

-- Custom categories: seeded per user during onboarding, then fully editable.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

-- Monthly category limits. Current UI treats each row as the user's active limit.
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(12,2) not null default 0 check (monthly_limit >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, category)
);

-- Savings contribution history.
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  contributed_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- Helpful constraints without making the upgrade destructive.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'financial_settings_currency_nonempty') then
    alter table public.financial_settings add constraint financial_settings_currency_nonempty check (length(currency) >= 3);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payday_day_1_valid') then
    alter table public.financial_settings add constraint payday_day_1_valid check (payday_day_1 is null or payday_day_1 between 1 and 31);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payday_day_2_valid') then
    alter table public.financial_settings add constraint payday_day_2_valid check (payday_day_2 is null or payday_day_2 between 1 and 31);
  end if;
end $$;

-- Indexes for user-scoped queries.
create index if not exists idx_income_user_date on public.income(user_id, income_date desc);
create index if not exists idx_spending_user_date on public.spending_transactions(user_id, spent_on desc);
create index if not exists idx_expenses_user on public.expenses(user_id);
create index if not exists idx_debts_user on public.debts(user_id);
create index if not exists idx_debt_payments_user on public.debt_payments(user_id, paid_on desc);
create index if not exists idx_goals_user on public.savings_goals(user_id);
create index if not exists idx_paydays_user_date on public.paydays(user_id, payday_date);
create index if not exists idx_receivables_user on public.receivables(user_id);
create index if not exists idx_categories_user on public.categories(user_id);
create index if not exists idx_budgets_user on public.budgets(user_id);
create index if not exists idx_goal_contrib_user on public.goal_contributions(user_id, contributed_on desc);

-- Row Level Security.
alter table public.profiles enable row level security;
alter table public.financial_settings enable row level security;
alter table public.income enable row level security;
alter table public.expenses enable row level security;
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.spending_transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.paydays enable row level security;
alter table public.receivables enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.goal_contributions enable row level security;

-- Re-create policies with stable names, so the script can be safely re-run.
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage own financial settings" on public.financial_settings;
create policy "Users manage own financial settings" on public.financial_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own income" on public.income;
create policy "Users manage own income" on public.income for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own expenses" on public.expenses;
create policy "Users manage own expenses" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own debts" on public.debts;
create policy "Users manage own debts" on public.debts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own debt payments" on public.debt_payments;
create policy "Users manage own debt payments" on public.debt_payments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own spending" on public.spending_transactions;
create policy "Users manage own spending" on public.spending_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own savings goals" on public.savings_goals;
create policy "Users manage own savings goals" on public.savings_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own paydays" on public.paydays;
create policy "Users manage own paydays" on public.paydays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own receivables" on public.receivables;
create policy "Users manage own receivables" on public.receivables for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own categories" on public.categories;
create policy "Users manage own categories" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own budgets" on public.budgets;
create policy "Users manage own budgets" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own goal contributions" on public.goal_contributions;
create policy "Users manage own goal contributions" on public.goal_contributions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Optional: automatically create a profile row for every future signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Existing users from the earlier version should see onboarding once,
-- unless they already have meaningful settings. You can manually mark any
-- existing account complete if desired:
-- update public.financial_settings set onboarding_completed = true where user_id = '<USER_UUID>';
