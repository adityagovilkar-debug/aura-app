# AURA · Health Deck

A local-first health tracking dashboard: calories, meals, water, workouts, weight — with a
futuristic dark UI, charts, weekly reports, and a calendar that flags missed days.

## Running it

```
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # desktop production build into dist/ (relative paths)
npm run build:web  # installable PWA build into dist/ (root paths, service worker)
npm run preview    # serve the desktop build locally
npm run app        # run the desktop (Electron) shell against the last build
npm run dist       # build the Windows installer into release/
npm test           # run the sync conflict-resolution unit tests
```

Requires Node.js (LTS). With no cloud configured the app runs entirely on your machine —
there is no backend. Cloud sync (below) is optional and uses your own Supabase project.

## Desktop app / installer

`npm run dist` produces **`release/AURA Health Setup <version>.exe`** — a self-contained
NSIS installer you can copy to any 64-bit Windows machine. It installs per-user (no admin
needed) to `%LOCALAPPDATA%\Programs\AURA Health`, creates a **desktop shortcut** and
**Start Menu entry**, and registers an uninstaller in Windows Settings → Apps.

Notes:

- The installer is unsigned, so on a new machine Windows SmartScreen may warn —
  click **More info → Run anyway**.
- The desktop app and a browser tab are **separate storage origins**: data logged in one
  does not appear in the other. Use Settings → Export / Import backup to move data between
  them (or between machines).
- Fonts are bundled (`@fontsource/*`), so the app is fully offline.
- The Electron shell is just [electron/main.cjs](electron/main.cjs); the entire app remains
  the static web build in `dist/`. If `npm run dist` ever fails with an EPERM rename while
  extracting Electron, the config already pins `electronDist` to `node_modules/electron/dist`
  to avoid it (run `node node_modules/electron/install.js` once if that folder is missing).
- [scripts/smoke-check.mjs](scripts/smoke-check.mjs) verifies a packaged build rendered:
  start the exe with `--remote-debugging-port=9223`, then `node scripts/smoke-check.mjs 9223`.

## Phone (Android) + cloud sync

AURA can run on your Android phone as an **installable web app (PWA)** that shares data with
your PC through **your own free Supabase project**. Editing works on both — each day, meal
template, and your settings sync independently, so logging on your phone and your PC at the
same time doesn't clobber anything (newest edit of each record wins).

### 1 — Create the Supabase project (once)

1. Sign up at [supabase.com](https://supabase.com) and create a free project.
2. Open **SQL Editor → New query**, paste the contents of
   [supabase/schema.sql](supabase/schema.sql), and run it. This creates the `aura_records`
   table, locks it to each signed-in user (row-level security), and turns on realtime.
3. (Recommended for a frictionless login) **Authentication → Sign In / Providers → Email**:
   turn **off** "Confirm email" so email + password works without a confirmation click.
4. In **Project Settings → API**, copy the **Project URL** and the **anon / public** key.

### 2 — Connect each device

In **Settings → Cloud sync · phone access**: paste the URL + anon key, click **Connect
project**, then **Create account** (first device) or **Sign in** (every other device) with
the *same* email and password. The sidebar badge shows the live status
(Local only / Syncing / Synced / Offline).

### 3 — Put it on the phone

The phone loads the app from a URL, so host the web build on any static HTTPS host
(install-to-home-screen requires HTTPS; `localhost` is the only HTTP exception):

```
npm run build:web        # outputs dist/ with manifest + service worker
```

Deploy `dist/` to a free host — e.g. drag the folder onto [Netlify Drop](https://app.netlify.com/drop),
or `vercel deploy dist`, or GitHub Pages. Then on the phone:

1. Open the deployed URL in **Chrome on Android**.
2. Menu **⋮ → Install app** (or "Add to Home screen"). You get an AURA icon that opens
   full-screen and works offline.
3. Open it, go to **Settings → Cloud sync**, enter the same Supabase URL/key, and sign in.

Your PC (desktop app *or* the same hosted URL) and your phone now share one dataset.

### How sync works / privacy

- Data lives in **your** Supabase project; row-level security means only your signed-in
  account can read it. The anon key is safe to ship in the client (that's its purpose).
- Local-first: every device keeps a full local copy and works offline; changes queue and
  push when back online. The service worker caches the app shell so it opens without network.
- Conflict model and merge logic live in [src/lib/sync.ts](src/lib/sync.ts) and are covered
  by [src/lib/sync.test.ts](src/lib/sync.test.ts) (`npm test`). Sync is per-record
  last-write-wins; deletes use tombstones so a removed meal can't be resurrected by a stale
  device.
- The portable JSON export/import still works as an offline alternative or extra backup.

## Features

- **Dashboard** — calorie / water / exercise progress rings, net calories, today's macro donut,
  7-day intake and hydration charts, today's activity timeline, and a logging streak.
- **Daily log** — log meals per slot (breakfast / lunch / dinner / snack), one-tap water
  presets plus custom amounts, workouts with type / duration / calories burned / notes,
  and optional daily weight + notes. Navigate days with arrows or the calendar.
- **Calendar** — month view; each day is colour-coded: within limit (green), over limit
  (amber), **missed** (red), today (cyan). Click any day to open its log.
- **Meal library** — save meals with full nutrition (kcal, protein, carbs, fat, fiber, sugar),
  serving descriptions, and free-form tags. Search and tag-filter, then reuse them when logging.
  Custom meals logged on a day can be saved to the library in one tick.
- **Weekly reports** — week-by-week stats with deltas vs the previous week, daily intake vs
  limit, stacked macros, hydration, workout burn, and a 30-day weight trend.
- **Settings** — daily calorie limit, water goal, exercise goal, macro goals, water preset
  buttons, JSON export / import, and a full reset.

## Data & portability

All state is **one versioned JSON document** persisted to `localStorage`
(key `aura-health-data-v1`). The schema lives in [src/types.ts](src/types.ts) and the whole
persistence layer in [src/lib/storage.ts](src/lib/storage.ts) — swap that one module to move
to a file, SQLite, or a server later. **Settings → Export backup** downloads the document as
plain JSON; **Import backup** restores it (with confirmation).

> localStorage is per-browser-profile. Export a backup before clearing browser data or
> switching machines.

## Architecture

```
src/
  types.ts               data model (AppData, DayLog, MealTemplate, …)
  lib/
    storage.ts           load/save/export/import + seed data (the only persistence code)
    dates.ts             YYYY-MM-DD day-key helpers, week/month math
    stats.ts             day totals, day status (missed/within/over), streaks, summaries
  state/
    AppContext.tsx       single React context: app data + all mutations + navigation
  components/
    Sidebar.tsx          navigation shell
    ui/                  ProgressRing, Modal, icons, chart theme
    forms/               meal / template / exercise modals, shared field components
    views/               Dashboard, DailyLog, CalendarView, Library, Reports, SettingsView
```

Conventions that keep it extensible:

- Days are addressed by local-timezone keys (`"2026-06-12"`); `lib/dates.ts` is the only
  place that computes them.
- All derived numbers (totals, statuses, streaks, weekly summaries) live in `lib/stats.ts` —
  views never aggregate raw entries themselves.
- All writes go through the mutation helpers in `AppContext`; components never touch
  `localStorage` directly.
- To add a new view: create it under `components/views/`, add a `View` union member in
  `AppContext.tsx`, and register it in `App.tsx` + `Sidebar.tsx`.
- To add a tracked quantity (e.g. sleep): extend `DayLog` in `types.ts`, add mutations in
  `AppContext`, fold it into `dayTotals` / `summarize`, and render it where you want it.
  Old saved documents keep working — `storage.ts` fills missing fields with defaults.

Charts are [Recharts](https://recharts.org); shared styling is in
[src/components/ui/chartTheme.ts](src/components/ui/chartTheme.ts).
