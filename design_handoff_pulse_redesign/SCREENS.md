# Screens — „Pulse" Redesign

Jede ID existiert im Prototyp zweimal: **Dark** links, **Light** rechts.
Reihenfolge unten = empfohlene Umsetzungsreihenfolge (oben die größten Layout-Änderungen).

| ID | Screen | Area-Farbe | Repo-Datei |
| --- | --- | --- | --- |
| 2a | Dashboard | Core violett | `src/app/page.tsx` |
| 3a | Today | Core violett | `src/app/today/page.tsx` |
| 3b | Habits | Core violett | `src/app/habits/page.tsx` |
| 3c | Statistics | Cyan | `src/app/statistics/page.tsx` |
| 3d | Analysis | Blau | `src/app/analysis/page.tsx` |
| 3e | Calendar | Core violett | `src/app/calendar/page.tsx` |
| 3f | Goals | Lime | `src/app/goals/page.tsx` |
| 3g | Health | Rosé | `src/app/health/page.tsx` |
| 3h | Journal | Fuchsia | `src/app/journal/page.tsx` |
| 3i–3k | Training · Workouts / Plans / Progress | Orange | `src/app/training/page.tsx` |
| 3l–3n | Finances · Overview / Portfolio / Budget | Teal | `src/app/finances/page.tsx` |
| 3o | Coach | Core violett | `src/app/coach/page.tsx`, `src/components/Coach.tsx` |
| 3p–3q | Settings · Tracking / Konto & Daten | Slate | `src/app/settings/page.tsx` |
| 3r | Morning | Core violett | `src/app/morning/page.tsx` |
| 3s | Focus | Emerald | `src/app/focus/page.tsx` |
| 3t | Sleep | Indigo | `src/app/sleep/page.tsx` |
| 3u | Correlations | Blau | `src/app/correlations/page.tsx` |
| 3v | Wheel of Life | Violett | `src/app/wheel/page.tsx`, `src/lib/wheel.ts` |
| 3w | Vision Board | Pink | `src/app/vision/page.tsx` |
| 3x | Projects | Sky | `src/app/projects/page.tsx` |
| 3y | Reports | Zinc | `src/app/reports/page.tsx` |
| 3z | Achievements | Gold | `src/app/achievements/page.tsx` |
| 3aa | Experiments | Sky | `src/app/experiments/page.tsx` |
| 3ab | Reward shop | Gold | `src/app/rewards/page.tsx` |
| 3ac | Scoreboard | Gold | `src/app/scoreboard/page.tsx` |
| 3ad | Profile | Slate | `src/app/profile/page.tsx` |
| 3ae | Character | Slate | `src/app/avatar/page.tsx` |
| 3af | About you | Slate | `src/app/about/page.tsx` |
| 3ag | More-Menü | Icon-Kacheln je Bereich | `src/lib/nav.tsx` (SECTIONS) |

## Gemeinsames Seitengerüst (gilt für alle Screens)
1. **Header** `padding: 22px 22px 0`: Kicker (11 px, uppercase, 0.14em, `--text-faint`) mit einer
   echten Zahl aus den Daten, darunter Headline 27 px/600 mit **einem** Wort als Gradient-Text
   (`.area-title`). Optional rechts eine Aktion (Pill oder 32–34 px Icon-Button).
2. **Optional: Hinweis-/Insight-Karte** als `.area-soft` mit 1 px `rgba(area, .22)`.
3. **Fokuszone**: die wichtigste Metrik der Seite groß (58–62 px), direkt auf dem Seitenhintergrund
   ohne Karte, mit Hairline-Metriken darunter.
4. **Karten** `margin: 14px 18px 0`, Radius 24 px, Polster 18 px, Section-Label oben links,
   optional Badge/Link rechts.
5. **Fußnote** 10.5 px `--text-dim` unter datengetriebenen Aussagen — die Disclaimer aus dem Repo
   („Correlation, not causation", „not a medical recommendation" …) bleiben wörtlich erhalten.
6. **Bottom-Nav** schwebend, aktiver Slot als `.area-soft`-Kachel; Seiten außerhalb der vier
   gepinnten Routen markieren „More" als aktiv.

## Screen-spezifische Hinweise
- **3c Statistics / 3d Analysis / 3u Correlations**: Charts weiter über `src/components/charts`.
  Neu: Grid-Linien 1 px `--border`, Punkte `fill-opacity .55`, Regressionslinie `--area-a` gestrichelt
  `5 4`, r-Wert als Section-Right-Badge.
- **3v Wheel**: Radar mit 4 Ringen (10/7.5/5/2.5), Achslinien 1 px `--border`, Vorcheck als
  gestrichelte Kontur `--text-faint`, aktuelle Fläche `--area-a` bei `fill-opacity .22`.
  „Feeling vs data" zeigt zwei Balken pro Dimension (feel = `--text-faint`, data = Area-Verlauf).
- **3x Projects**: Kanban horizontal scrollbar, Spaltenbreite 224 px, Spalten-Container
  `--surface-2` mit Radius 20 px, Karten `--surface` + 1 px `--border`, Move-Pfeile links/rechts.
- **3z Achievements / 3ab Rewards / 3ac Scoreboard**: Level-Banner und Punktestand als `.area-grad`;
  Claim-Pills ebenfalls `.area-grad`, erledigte Claims als `--good`-Tint-Badge. Fortschritts-Tracks
  `rgba(area, .12)`, erledigte Balken `--good`.
- **3ad Profile / 3ae Character / 3af About**: Slate-Bereich — Verläufe bleiben dezent, Akzent trägt
  hier vor allem Struktur (Avatar-Kachel, Toggle, aktive Chips).
- **3ag More**: 2-Spalten-Grid, Eintrag = 36 px Icon-Kachel (`.area-soft` der Zielseite) + Label
  12.5 px + Statuszeile 10.5 px `--text-faint`; Gruppen `Daily / Insights / Areas / System` exakt
  aus `SECTIONS`.

## Kontrast-Checkliste vor dem Merge
Für jede gefüllte Fläche prüfen: Tinte gegen **beide** Gradient-Stops ≥ 4.5:1 (Text < 18 px).
Diese Klasse Fehler ist im Prototyp dreimal aufgetreten — die Tabelle in der README ist das Ergebnis.
