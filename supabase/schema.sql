create extension if not exists "pgcrypto";

create table if not exists public.financial_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 monthly_income numeric(12,2) not null default 29437.14,
 payday_15 numeric(12,2) not null default 14918.57,
 payday_30 numeric(12,2) not null default 14518.57,
 savings_goal numeric(12,2) not null default 100000,
 current_cash numeric(12,2) not null default 2875.22,
 created_at timestamptz default now(),
 updated_at timestamptz default now()
);

create table if not exists public.debts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 original_balance numeric(12,2) default 0,
 remaining_balance numeric(12,2) default 0,
 payment_amount numeric(12,2) default 0,
 frequency text default 'monthly',
 due_day integer,
 payments_remaining integer,
 active boolean default true,
 notes text,
 created_at timestamptz default now()
);

create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null,
 amount numeric(12,2) not null default 0,
 payday text check (payday in ('15','30','both')) default '30',
 category text default 'other',
 recurring boolean default true,
 created_at timestamptz default now()
);

create table if not exists public.receivables (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 person text not null,
 amount numeric(12,2) not null default 0,
 notes text,
 paid boolean default false,
 created_at timestamptz default now()
);

create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 transaction_date date not null default current_date,
 description text not null,
 amount numeric(12,2) not null,
 category text default 'other',
 type text check (type in ('income','expense','debt_payment','saving')) default 'expense',
 created_at timestamptz default now()
);

alter table public.financial_settings enable row level security;
alter table public.debts enable row level security;
alter table public.expenses enable row level security;
alter table public.receivables enable row level security;
alter table public.transactions enable row level security;

do $$ begin create policy "own settings" on public.financial_settings for all using (auth.uid()=user_id) with check (auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own debts" on public.debts for all using (auth.uid()=user_id) with check (auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own expenses" on public.expenses for all using (auth.uid()=user_id) with check (auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own receivables" on public.receivables for all using (auth.uid()=user_id) with check (auth.uid()=user_id); exception when duplicate_object then null; end $$;
do $$ begin create policy "own transactions" on public.transactions for all using (auth.uid()=user_id) with check (auth.uid()=user_id); exception when duplicate_object then null; end $$;
