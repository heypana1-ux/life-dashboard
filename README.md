# Life Dashboard

A personal operating system for your habits, focus, sleep, reflection and goals —
inspired by a blend of Apple Health, Whoop, Notion and modern finance dashboards, with a
long-term RPG-style progression (Life Score + ELO rating).

This repository is **Phase 1: a solid, working core** with real, persistent data — not a
gallery of half-finished screens. Every button does something; features that are designed
into the data model but not yet built are listed honestly on the **Settings → Roadmap**
screen rather than faked.

## What works today

| Area | Status |
| --- | --- |
| **Onboarding** | Pick your areas, set targets, choose demo or clean start |
| **Dashboard** | Live Life Score ring, per-category scores with trends, ELO rating, streak, today's goals, data-driven insights |
| **Today** | Check off habits, log reduce-habit slips, full daily check-in (productivity/mood/energy/satisfaction/discipline + notes), live projected score |
| **Habits** | Full CRUD — build & reduce habits, daily / X-per-week / specific-weekday schedules, priority, difficulty, severity, 30-day adherence |
| **Sleep** | Manual logging, duration & regularity stats, 30-night trend, a data-based personal sleep-duration estimate |
| **Statistics** | Interactive Life Score / ELO / category charts over 7D–All-time, weekday breakdown, correlation insights |
| **Journal** | Book-style entries (one page per day), search, prev/next navigation, mood & highlights — private, local-only |
| **Goals** | Long-term goals with deadlines, milestones and auto-computed progress |
| **Settings** | Enable/disable areas, adjust score weights (auto-normalized), sleep target, theme, demo data, JSON export/import, full reset |

Dark and light themes are fully supported (system-aware).

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

Finances (net worth, portfolio, budget) · live market data (modular API, mock until
configured) · detailed workout/exercise logging · learning & creative project boards ·
weekly & monthly reports · achievements & records · Life Experiments (self A/B tests) ·
AI insights over the structured data · health integrations (Apple Health, Whoop, Oura…).

The data model was built to grow across years of daily use, so new life areas can be added
without breaking existing history.
