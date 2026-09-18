-- For a brand-new Supabase project only.
-- If you already created the original tables, run upgrade_v2.sql instead.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);
create table public.financial_settings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  monthly_income numeric(12,2) default 0, payday_15_amount numeric(12,2) default 0, payday_end_month_amount numeric(12,2) default 0,
  current_cash numeric(12,2) default 0, daily_allowance numeric(12,2) default 0, currency text default 'PHP', pay_frequency text default 'twice_monthly',
  payday_day_1 integer, payday_day_2 integer, monthly_savings_target numeric(12,2) default 0, onboarding_completed boolean default false, created_at timestamptz default now()
);
create table public.income (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, source text not null, amount numeric(12,2) not null default 0, income_date date default current_date, notes text, is_recurring boolean default false, frequency text, created_at timestamptz default now());
create table public.expenses (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, category text, amount numeric(12,2) not null default 0, frequency text default 'monthly', due_day integer, is_active boolean default true, notes text, created_at timestamptz default now());
create table public.debts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, original_balance numeric(12,2) default 0, remaining_balance numeric(12,2) default 0, payment_amount numeric(12,2) default 0, frequency text default 'monthly', due_date date, interest_rate numeric(7,3) default 0, notes text, is_paid boolean default false, created_at timestamptz default now());
create table public.debt_payments (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, debt_id uuid not null references public.debts(id) on delete cascade, amount numeric(12,2) not null default 0, paid_on date default current_date, notes text, created_at timestamptz default now());
create table public.spending_transactions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, category text not null, description text, amount numeric(12,2) not null default 0, spent_on date default current_date, created_at timestamptz default now());
create table public.savings_goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, target_amount numeric(12,2) not null default 0, current_amount numeric(12,2) default 0, target_date date, is_completed boolean default false, created_at timestamptz default now());
create table public.paydays (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, payday_date date not null, expected_amount numeric(12,2) default 0, actual_amount numeric(12,2), status text default 'upcoming', label text default 'Payday', created_at timestamptz default now());
create table public.receivables (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, person_name text not null, amount numeric(12,2) not null default 0, due_date date, is_received boolean default false, notes text, created_at timestamptz default now());
create table public.categories (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, created_at timestamptz default now(), unique(user_id,name));
create table public.budgets (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, category text not null, monthly_limit numeric(12,2) not null default 0, created_at timestamptz default now(), updated_at timestamptz default now(), unique(user_id,category));
create table public.goal_contributions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, goal_id uuid not null references public.savings_goals(id) on delete cascade, amount numeric(12,2) not null check(amount>0), contributed_on date default current_date, notes text, created_at timestamptz default now());

-- Apply security, policies, indexes, and signup trigger from upgrade_v2.sql next.
