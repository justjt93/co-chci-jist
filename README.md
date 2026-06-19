# co chci jíst 🍽️

A tiny app for couples: each of you swipes through meals (Tinder-style) keeping
the ones you'd happily eat. Pair up in a **room**, see the meals you **both**
want, and hit **Surprise me** to let it pick dinner. Every meal has a photo,
ingredients, and a recipe.

- **Swipe** right to eat / left to pass (or use the buttons; undo supported).
- **Room** — create one, share the link, your partner joins.
- **Matches** — meals everyone in the room marked "eat".
- **No login required.** Optionally sign in with Google to sync across devices.
- **~669 meals** seeded automatically from [TheMealDB](https://www.themealdb.com) — no manual data entry.

## Stack

- **Next.js 16** (App Router) + **React 19** + **Tailwind CSS v4**
- **Supabase** — Postgres + Auth (anonymous + Google). RLS keeps each person's picks private.
- **Motion** (Framer Motion) for the swipe deck
- Deploys on **Vercel**

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) → **New project** (free tier is plenty).
Once it's ready, open **Project Settings → API** and note:

- Project URL
- `anon` / publishable key
- `service_role` secret (used only by the seed script)

### 3. Create the schema

In the Supabase dashboard → **SQL Editor**, run each file in
[`supabase/migrations/`](supabase/migrations) in order:
1. `0001_init.sql` — tables, RLS policies, room/matching functions.
2. `0002_starter_ordering.sql` — shared meal order + a curated "starter pack" so partners find matches fast.

> Prefer the CLI? `npx supabase link` then `npx supabase db push`.

### 4. Enable Anonymous sign-ins

Dashboard → **Authentication → Sign In / Providers** → enable **Anonymous sign-ins**.
This is what lets the app work without a login.

### 5. (Optional) Google login

Only needed if you want to sync picks across devices.

1. Create an OAuth client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (Authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).
2. Dashboard → **Authentication → Providers → Google** → paste the client ID + secret.
3. Dashboard → **Authentication → URL Configuration** → add your site URLs
   (`http://localhost:3000` and your Vercel URL) to the redirect allow-list.
4. (For upgrading a guest in place) **Authentication → Providers** → make sure
   **Manual linking** is enabled.

### 6. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY   # seed only, never shipped to the browser
```

### 7. Seed the meals

```bash
npm run seed
```

Pulls every meal from TheMealDB and upserts ~669 rows into the `meals` table.
Re-runnable any time.

### 8. Run it

```bash
npm run dev
```

Open http://localhost:3000.

---

## Deploy to Vercel (personal account)

> ⚠️ This repo's git identity is currently your **company** email. For a personal
> project, set a personal email **before committing** so the history isn't tied
> to work:
>
> ```bash
> git config user.email "you@personal.example"
> git config user.name  "Your Name"
> ```

1. Create a repo under your **personal** GitHub account and push to it.
2. On [vercel.com](https://vercel.com), **Import** that repo (also signed in with your personal account).
3. Add the three environment variables (same as `.env.local`) in the Vercel project settings.
4. Deploy. Then add the deployed URL to Supabase **Authentication → URL Configuration**
   (and to the Google OAuth redirect list if you enabled Google).

The seed script runs locally against your Supabase project, so you don't need to
seed on Vercel — the data already lives in Supabase.

---

## How it works

- **Meals** live in one `meals` table (photo URL, ingredients as JSON, instructions, etc.),
  seeded from TheMealDB. Images are hot-linked from TheMealDB's CDN.
- **Preferences** are per-user (`eat` / `pass`) and reused across any room you're in.
- **Rooms** connect two (or more) people. `create_room` / `join_room` are
  `SECURITY DEFINER` functions; a short code is the shared secret.
- **Matches** come from `get_room_matches(room_id)` — meals every member marked
  `eat`. It's `SECURITY DEFINER` and gated on membership, so a partner's raw
  choices are never exposed, only the agreed-upon meals.
- **Auth**: on first visit you get an anonymous Supabase session. "Sign in with
  Google" uses `linkIdentity` to attach Google to that same user, so your
  existing picks carry over and become available on any device.

## Project structure

```
app/                      routes (home, swipe, matches, room, meal/[id], auth/*)
components/               SupabaseProvider, AppHeader, SwipeDeck, MatchesView, RoomManager, …
lib/supabase/             browser + server clients, session proxy helper
lib/data.ts, lib/types.ts shared data helpers and types
proxy.ts                  refreshes the auth session (Next 16 "proxy" convention)
scripts/seed.ts           TheMealDB → meals importer  (npm run seed)
supabase/migrations/      schema + RLS + functions
```

## Credits

Recipe data & images from [TheMealDB](https://www.themealdb.com). Free for
development/education; if you grow this beyond personal use, consider their
supporter API key.
