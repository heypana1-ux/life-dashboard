# Life Dashboard

A personal operating system for your habits, focus, sleep, reflection and goals —
inspired by a blend of Apple Health, Whoop, Notion and modern finance dashboards, with a
long-term RPG-style progression (Life Score + ELO rating).

This is a **working application** with real, persistent data — not a gallery of
half-finished screens. Every button does something; the few things not yet built are called
out honestly in the Roadmap below rather than faked.

## What works today

| Area | Status |
| --- | --- |
| **Onboarding** | Pick your areas, set targets, choose demo or clean start, EN/DE language |
| **Dashboard** | Live Life Score ring, per-category scores with trends, ELO rating, streak, today's goals, data-driven insights, personalized greeting |
| **Today** | Check off habits, log reduce-habit slips, full daily check-in (productivity/mood/energy/satisfaction/discipline + notes), live projected score |
| **Habits** | Full CRUD — build & reduce habits, daily / X-per-week / specific-weekday schedules, priority, difficulty, severity, 30-day adherence, per-habit streaks + GitHub-style heatmap |
| **Morning** | A "good morning" screen: greeting, last night's sleep + sleep score, today's goals, Life Rating & streak |
| **Training** | Detailed workout logging — exercises, sets, reps, weight, distance, pulse, intensity/performance/fun/energy, weekly volume chart |
| **Sleep** | Manual logging, duration & regularity stats, 30-night trend, a data-based personal sleep-duration estimate |
| **Calendar** | Month timeline coloured by daily Life Score; tap a day to see everything logged (sleep, training, habits, review, journal, score) |
| **Experiments** | Test a hypothesis against your own data (e.g. "bed before midnight → more productive?") — compares the metric between condition-met and not, always framed as correlation, never proof |
| **Finances** | Net worth (assets/liabilities), portfolio/depot (holdings, P/L, allocation, concentration), budget (income/expenses, savings rate), net-worth history; modular market-data layer (manual prices, live provider pluggable later) |
| **Statistics** | Interactive Life Score / ELO / category charts over 7D–All-time, weekday breakdown, correlation insights |
| **Reports** | Automatic weekly & monthly Life Reports with metrics + narrative highlights, exportable as a shareable image |
| **Journal** | Book-style entries (one page per day), photos, location, weather, tags, search, prev/next navigation — private, local-only |
| **Projects** | Kanban boards for learning topics and creative projects (idea → done) |
| **Goals** | Long-term goals with deadlines, milestones, auto-computed progress, and linked habits showing their adherence |
| **Achievements** | Auto-computed achievements (streaks, totals, milestones) and personal records |
| **Settings** | Profile (name, age, height, weight + trend, BMI), enable/disable areas, adjust score weights (auto-normalized), sleep target, theme, **language (English / German)**, **local reminders**, demo data, JSON export/import, full reset |

Dark and light themes are fully supported (system-aware), and the entire UI is available in **English and German**.

### Data safety

Data lives only in this browser (localStorage). A **backup reminder** nudges you to export a
JSON backup when you haven't in a while, the store keeps a rolling "last-good" copy against
corruption, and Settings offers one-click export/import. **Reminders** are local-only: they
fire while the app is open (no backend), so they can't push to a closed app — real background
push would require a server and is intentionally out of scope for now.

## How the score works (transparent by design)

- **Category scores (0–100)** are computed per enabled area from that area's data:
  - Habit-driven areas: weighted adherence to habits due that day. Build habits count
    `done?1:0` (weighted by priority); reduce habits count `avoided?1:0` (weighted by
    severity). Weekly-target build habits are scored over a rolling 7-day window, so a
    planned rest day is never punished as a missed session.
  - **Sleep**: duration vs. your personal target (shortfall penalized more than surplus)
    blended with your quality rating.
  - **Reflection**: the average of your daily check-in metrics.
- **Life Score** is the weight-normalized average of the areas that have data that day.
  Disabling an area automatically redistributes its weight to the others.
- A reduce-habit slip only dents its own area's average (bounded by that area's weight), so
  one bad day never wrecks the score.
- **Life Rating (ELO)** starts at 1000 and moves each day relative to your own trailing
  average — great days climb, weak days slide, and it gets harder to keep rising as your
  baseline improves.

Insights and the sleep estimate are always framed as **associations from your own logs**,
never as causal or medical claims, and stay silent until there's enough data.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a token-based design system (light/dark)
- **Recharts** for charts, **lucide-react** for icons
- Persistence via a typed store (`src/lib/store.tsx`) backed by `localStorage`. The store is
  the single mutation surface, so the backend can later be swapped for a real database
  (e.g. Supabase/Postgres) without touching the UI.

### Privacy

Everything is stored **locally in your browser**. No accounts, no servers, nothing is sent
anywhere. This is deliberate for the sensitive data involved (journal, habits, health).

## Project structure

```
src/
  app/                 # routes: dashboard, today, habits, sleep, statistics, journal, goals, settings
  components/          # AppShell, Onboarding, UI primitives, charts, ScoreRing, habit rows/forms
  lib/
    types.ts           # flexible, extensible data model
    store.tsx          # persistence layer (localStorage; swappable)
    score.ts           # transparent Life Score + ELO engine
    insights.ts        # data-driven correlations (never causal claims)
    demo.ts            # 45-day correlated demo data (clearable)
    useDerived.ts      # memoized analytics hook
    defaults.ts, date.ts, habitView.ts
```

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

## Roadmap (designed into the model, not yet built)

- **Live market data** — the market-data layer is modular; a real quote provider can be
  dropped in behind the same interface. Prices are entered manually until then (no API key
  required to use the app).
- **AI insights** — the insight engine is rule-based today; an LLM pass over the same
  structured data can be added once an API key/backend is available.
- **Cloud sync & background push notifications** — both need a small backend; kept out of
  scope for now (data safety is covered locally via backups; reminders fire while the app is
  open).
- **Health integrations** (Apple Health, Whoop, Oura…) remain future work.

The data model was built to grow across years of daily use, so new life areas can be added
without breaking existing history.
