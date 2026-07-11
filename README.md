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
your PC. Sync goes through a **single serverless function on your own Vercel deployment**
([api/sync.js](api/sync.js)) backed by a Redis/KV store — no third-party database account,
and no secret ever lives on your phone (devices send only a *sync password*). Each day, meal
template, and your settings sync independently, so logging on your phone and your PC at the
same time doesn't clobber anything (newest edit of each record wins).

### 1 — Deploy the app to Vercel (once)

The repo is set up for Vercel: [vercel.json](vercel.json) runs `npm run build:web` (static
PWA into `dist/`) and exposes `api/sync.js` as a function.

```
npx vercel deploy --prod          # from the project root; links/creates the Vercel project
```

or connect the GitHub repo in the Vercel dashboard for automatic deploys on every push.

### 2 — Add the sync store + password (once, in the Vercel dashboard)

1. **Storage → Create Database → Redis** (Upstash) → connect it to this project. Vercel
   injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` automatically. (Free tier is plenty for a
   small JSON document.)
2. **Settings → Environment Variables →** add `SYNC_PASSWORD` = a password you choose.
3. **Redeploy** so the new env vars take effect (`npx vercel deploy --prod`, or click
   Redeploy in the dashboard).

That's the whole backend. The function refuses any request without the right `SYNC_PASSWORD`,
and the Redis token stays server-side.

### 3 — Connect your devices

- **Hosted app / phone:** open your Vercel URL in **Chrome on Android → ⋮ → Install app** for
  a full-screen, offline-capable icon. Then **Settings → Cloud sync**, enter your sync
  password, **Connect**. (The API is same-origin, so there's no URL to type.)
- **Desktop app:** in **Settings → Cloud sync**, enter your deployed URL *and* the sync
  password. The sidebar badge shows the live status (Local only / Syncing / Synced / Offline).

Every device that knows the password shares one dataset.

### How sync works / privacy

- Data lives in **your** Vercel project's Redis store; the endpoint is gated by your
  `SYNC_PASSWORD` and the store's token never leaves the server. The password is the only
  secret on a device (kept in `localStorage`), and it grants access to just this app's data.
- Local-first: every device keeps a full local copy and works offline; changes queue and push
  when back online (polling every 30s + on focus). The service worker caches the app shell so
  it opens without network.
- The merge logic is per-record last-write-wins with delete tombstones. The **client** side
  lives in [src/lib/sync.ts](src/lib/sync.ts) (tested in `src/lib/sync.test.ts`); the
  **server** merge + password gate lives in [api/sync.js](api/sync.js) (tested in
  `api/sync.test.js`). Run both suites with `npm test`.
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
