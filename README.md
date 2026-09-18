# My Finance Planner v2

A multi-user personal finance planner built with React, Vite, Supabase, and Netlify.

## What is implemented

- Email/password authentication and password recovery
- First-login onboarding per user
- Multiple currencies
- Current cash and monthly income settings
- Custom pay schedule and payday planner
- Income + spending transaction ledger
- Recurring expense tracker
- Debt balances, payment history, payments remaining, payoff estimate
- Multiple savings goals and contribution history
- Receivables / money owed to the user
- Custom spending categories
- Monthly category budgets
- Monthly report and category spending breakdown
- JSON data export
- Light/dark mode
- Responsive desktop/mobile UI
- Supabase Row Level Security for every finance table

Nothing is hard-coded to one person's finances. Every row is owned by the authenticated `user_id`.

## Upgrade your existing project

### 1. Database

You already have the original tables, so in Supabase open **SQL Editor → New query**, paste the contents of:

`supabase/upgrade_v2.sql`

and click **Run**.

Do not use `fresh_schema.sql` on the existing project.

### 2. Environment variables

Keep these locally in `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Add the same names and values to Netlify Environment Variables.

### 3. Replace the app files

Copy these files/folders into your existing repository, replacing the older versions:

- `src/`
- `package.json`
- `vite.config.js`
- `index.html`
- `netlify.toml`
- `.gitignore`

Keep your own `.env.local`; do not upload it to GitHub.

### 4. Install and test

```bash
npm install
npm run dev
```

Open the localhost URL Vite prints.

### 5. Push to GitHub

```bash
git add .
git commit -m "Build multi-user finance planner v2"
git push
```

Netlify should redeploy automatically.

## Supabase Auth URLs

For the deployed site, configure Supabase **Authentication → URL Configuration**:

- Site URL: `https://myfinanceplanner.netlify.app`
- Redirect URL: `https://myfinanceplanner.netlify.app/**`
- Local redirect: `http://localhost:5173/**`

If you later change the Netlify domain, update these URLs.

## Important security notes

- Browser code uses only the Supabase publishable key.
- Never expose a service-role / secret key in Vite or Netlify frontend variables.
- RLS policies in `upgrade_v2.sql` restrict each user to their own data.
