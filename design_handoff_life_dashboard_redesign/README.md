# Handoff: Life Dashboard – UI Redesign (alle 16 Screens)

## Overview
Frisches Redesign der bestehenden **Life Dashboard** Next.js-App. Gleiche Design-DNA wie
das aktuelle Repo (Indigo-Akzent, Geist, Token-Farbsystem), aber neue Layouts, klarere
Hierarchie, überarbeitete Karten/Abstände und ein Dark/Light-fähiges Farbsystem. Alle 16
App-Screens sind abgedeckt.

Repo, für das dieses Handoff gedacht ist: `heypana1-ux/life-dashboard`,
Branch `claude/life-dashboard-app-5pe9h1`.

## About the Design Files
Die Datei in diesem Paket (`Life Dashboard.dc.html`) ist eine **Design-Referenz in HTML** —
ein Prototyp, der Aussehen und Verhalten zeigt, **kein** Produktionscode zum Kopieren.
Aufgabe ist, dieses Design in der **bestehenden Umgebung der App nachzubauen**: Next.js +
React + Tailwind (mit CSS-Custom-Properties als Tokens), unter Wiederverwendung der
vorhandenen Komponenten in `src/components/ui.tsx`, `ScoreRing.tsx`, `charts.tsx`, des
Stores (`src/lib/store.ts`) und der i18n-Helfer (`src/lib/i18n.ts`).

**Wichtig:** Die App hat bereits volle Logik (Store, Score-Berechnung, i18n, echte Daten).
Der Prototyp nutzt Demo-Daten und ein paar lokale States. Beim Einbau bleibt die echte
Logik erhalten — nur **Markup/Styling** der jeweiligen `page.tsx` wird an das neue Layout
angepasst. Keine Datenmodelle ändern.

## Fidelity
**High-fidelity.** Farben, Typo, Radien, Abstände sind final gemeint. Pixelnah nachbauen
mit den vorhandenen Tailwind-Klassen/Tokens der App. Wo der Prototyp Inline-Styles nutzt
(`var(--surface)` etc.), gibt es im Repo bereits die passenden CSS-Variablen in
`globals.css` — diese verwenden, keine neuen Farben erfinden.

## Design Tokens
Bereits im Repo (`src/app/globals.css`) vorhanden und 1:1 vom Prototyp genutzt. Zur
Kontrolle die im Prototyp verwendeten Werte:

**Light**
- bg `#f6f7f9` · surface `#ffffff` · surface-2 `#f1f3f5` · surface-3 `#e9ecef`
- border `#e2e5ea` · text `#14161a` · muted `#5b6470` · faint `#8a929e`
- good `#16a34a` · warn `#d97706` · bad `#dc2626` · info `#0ea5e9`
- ring-track `#e6e8ec` · accent-soft `#eef0fe`
- shadow: `0 1px 2px rgba(16,18,22,.04), 0 4px 16px rgba(16,18,22,.06)`

**Dark**
- bg `#0a0b0e` · surface `#14161b` · surface-2 `#1b1e25` · surface-3 `#23272f`
- border `#262a32` · text `#eef1f5` · muted `#9aa3b0` · faint `#6b7482`
- good `#34d399` · warn `#fbbf24` · bad `#f87171` · info `#38bdf8`
- ring-track `#262a32` · accent-soft `#1e1e42`
- shadow: `0 1px 2px rgba(0,0,0,.3), 0 8px 30px rgba(0,0,0,.35)`

**Accent (Standardrichtung „Calm")**
- light: accent `#4f46e5`, gradient `linear-gradient(135deg,#4f46e5,#6366f1)`
- dark: accent `#7c7bff`, gradient `linear-gradient(135deg,#7c7bff,#a78bfa)`

Der Prototyp hat zusätzlich zwei alternative Akzent-Richtungen (Aurora, Mono) als reine
Design-Exploration — **nicht** zwingend einzubauen. Falls gewünscht, sind es nur andere
Werte für `accent` / `accent-soft` / `--grad`.

**Typografie:** Geist (bereits geladen). Titel 21px/600, Section-Labels 12px/600 uppercase
`letter-spacing:.06em` `color:faint`, Body 13–15px, große Zahlen 26–56px/700
`letter-spacing:-.02…-.03em`, Zahlen immer `tabular-nums`.

**Radien:** Karten 20px (kleine Tiles 16–18px), Buttons/Chips 10–13px, Pillen 6–8px.
**Spacing:** Screen-Padding 28px/32px, Karten-Padding 22px×24px, Grid-Gaps 14–18px.

## Global Shell (alle Screens)
- **Sidebar** links, 236px, `sticky`, `surface`-Hintergrund, rechte Border. Logo-Badge
  (34px, Gradient, `sparkles`-Icon) + Wortmarke. Nav = 16 Einträge, aktiver Eintrag
  `accent-soft`/`accent` + `font-weight:600`, sonst `muted`. Nav ist scrollbar
  (`overflow-y:auto`). Footer: `shield-check` + „Daten bleiben auf diesem Gerät".
  Entspricht `src/components/AppShell.tsx`.
- **Topbar** sticky: Titel + Untertitel links; rechts die App-Controls. Im Prototyp sitzen
  dort Stil-/Sprache-/Theme-Umschalter — in der echten App gehören Sprache & Theme in die
  **Settings** (existieren dort schon); in der Topbar reicht Titel/Untertitel bzw. die
  jeweilige Screen-Action (z.B. „+ Workout").
- Nav-Reihenfolge im Prototyp: Dashboard, Heute, Morgen, Gewohnheiten, Training, Schlaf,
  Kalender, Tagebuch, Ziele, Projekte, Experimente, Finanzen, Statistik, Berichte, Erfolge,
  Einstellungen.

Icons: lucide (im Repo vorhanden). Verwendete Namen u.a. `gauge, calendar-check, sunrise,
list-checks, dumbbell, moon, calendar-days, book-open, target, kanban-square, flask-conical,
wallet, bar-chart-3, file-text, award, settings, flame, trophy, trending-up, circle-check,
flag, check, search, download, upload, rotate-ccw, sun, monitor, chevron-left/right,
lightbulb, git-compare`.

## Screens / Views
Jeder Screen unten mappt auf genau eine `page.tsx`. Layout-Kurzbeschreibung; exakte
Werte/Spacing dem Prototyp entnehmen.

1. **Dashboard** → `src/app/page.tsx`
   Hero-Zeile 2 Spalten (1.15fr / 1fr): links Score-Ring-Karte (190px SVG-Ring, Gradient-
   Stroke, große Score-Zahl + Label, rechts zwei Delta-Kennzahlen „vs. gestern / 7-Tage-Ø");
   rechts 2×2 Stat-Tiles (Life Rating, Streak, 7-Tage-Ø, Heute). Darunter 2 Spalten
   (1.4fr/1fr): Kategorien-Karte (Meter + Sparkline pro Bereich) und Insights-Karte (Dot +
   Text). Ganz unten „Heutige Ziele" (2-spaltige Checkbox-Liste).

2. **Heute** → `src/app/today/page.tsx`
   2 Spalten (1.3fr/1fr): links Habit-Abhaken-Liste + „Täglicher Check-in" (5 Metriken,
   jeweils 1–10 Zellen-Selector); rechts sticky Karte „Projizierter Life Score" (große Zahl,
   Fortschrittsbalken, 3 Kennzahlen, „Tag speichern"-Button mit Gradient).

3. **Morgen** → `src/app/morning/page.tsx`
   Gradient-Begrüßungs-Banner (Datum, „Guten Morgen …", Zeile). Darunter 3 Tiles (Letzte
   Nacht/Schlaf, Life Rating, Streak). Dann „Fokus für heute" (Ziel-Checkliste).

4. **Gewohnheiten** → `src/app/habits/page.tsx`
   Liste von Habit-Zeilen: Icon-Badge (`accent-soft`), Name + Kind-Badge (Aufbauen/
   Reduzieren), Zeitplan + Adhärenz-%, 30er-Heatmap-Punktraster, Streak (flame + Zahl).

5. **Training** → `src/app/training/page.tsx`
   3 Mini-Stat-Tiles (Sessions/Woche, Gesamtzeit, Ø Leistung). „Volumen"-Balkendiagramm
   (8 Wochen, h). „Letzte Workouts"-Liste: Sport + Dauer-Badge + Leistungs-Badge, Datum,
   Meta-Zeile, optionale Übungs-Chips.

6. **Schlaf** → `src/app/sleep/page.tsx`
   4 Tiles (Letzte Nacht, Schlaf-Score, Ø Dauer, Regelmäßigkeit). 30-Nächte-Balkentrend
   (Farbe nach Ziel). Accent-soft Info-Box „persönliche Schlafschätzung".

7. **Kalender** → `src/app/calendar/page.tsx`
   Zentrierte Karte (max 760px): Monatskopf mit Prev/Next, 7-Spalten-Grid (Montag zuerst),
   jede Tageszelle `aspect-ratio:1` mit Score-Tönung (`color-mix(accent … , surface)`),
   Score-Dot, heutiger Tag mit Accent-Border, Zukunft ausgegraut. Legende Rough/Mixed/Strong.
   *(Prototyp öffnet keinen Tages-Detail-Modal — der existiert in der echten App und bleibt.)*

8. **Tagebuch** → `src/app/journal/page.tsx`
   2 Spalten (300px / 1fr): links Suche + Eintragsliste (Titel, Datum, Mood-Badge, aktiver
   Eintrag `accent-soft`); rechts „Buchseite" mit Kopf (Datum, Prev/Next, großer Titel) und
   Fließtext + Chips (Ort/Wetter/Tags).

9. **Ziele** → `src/app/goals/page.tsx`
   2-spaltiges Karten-Grid: Titel + Bereich-Badge, Beschreibung, Fortschrittsbalken (aus
   Meilensteinen berechnet), optionale Frist (`flag`), Meilenstein-Checkliste.

10. **Projekte** → `src/app/projects/page.tsx`
    Board-Umschalter (Kreativ/Lernen) + horizontales Kanban: Spalten mit Count-Badge und
    Karten (Titel + optionale Beschreibung) auf `surface-2`-Spaltenhintergrund.

11. **Experimente** → `src/app/experiments/page.tsx`
    2-spaltiges Karten-Grid: Titel + Hypothese, Badges (Metrik/Bedingung/Tage), Ergebnis-Box
    (mit/ohne-Mittelwerte) oder „nicht genug Daten", Korrelations-Hinweis.

12. **Finanzen** → `src/app/finances/page.tsx`
    Nettovermögen-Karte mit Flächen-/Linien-Chart + Delta; Assets/Liabilities-Tiles;
    Portfolio (gestapelter Balken + Positionsliste mit P/L); Budget-Karte (Einnahmen/Ausgaben/
    Sparquote + Balken).

13. **Statistik** → `src/app/statistics/page.tsx`
    Life-Score-Verlauf (Linien-/Flächen-Chart, Zeitraum-Umschalter 7D/30D/90D/All, Avg/Best/
    Low). Wochentag-Balken. Life-Rating-Tile + Korrelations-Box.

14. **Berichte** → `src/app/reports/page.tsx`
    Wöchentlich/Monatlich-Umschalter; „Life Report"-Karte (Ø-Score + Delta, Metrik-Tiles
    inkl. Nettovermögen); Highlights-Liste (datenbasiert-Badge).

15. **Erfolge** → `src/app/achievements/page.tsx`
    Achievement-Grid (freigeschaltet = Accent-Border/`accent-soft`, gesperrt = grau +
    Fortschrittsbalken + current/target). Darunter „Persönliche Rekorde"-Grid. Emoji-Icons
    wie in der bestehenden App.

16. **Einstellungen** → `src/app/settings/page.tsx`
    Karten: Darstellung (Hell/Dunkel/System), Sprache (DE/EN), Lebensbereiche & Gewichtung
    (Meter je Bereich, „auf 100% normiert"), Daten (Export/Import/Reset). In der echten App
    zusätzlich Profil, Schlafziel, Reminders (bestehen bereits) — Styling angleichen.

## Interactions & Behavior
- Nav wechselt Screen (in der App = Next.js-Routing, bereits vorhanden).
- Ziel-/Habit-Checkboxen: Toggle mit Häkchen + Durchstreichen erledigter Aufbau-Ziele.
- Check-in: 1–10 Zellen-Selector, aktive Zelle Gradient.
- Kalender Prev/Next: Monat blättern.
- Berichte / Projekte: Segment-Umschalter (aktiv = Accent-Fill).
- Transitions: Balken/Meter `width/height .5s ease`, Ring `stroke-dashoffset .7s
  cubic-bezier(.4,0,.2,1)`, Screen-Einblendung `fadeIn .35s` (opacity + translateY 8px),
  Nav-Hover `background .15s`.

## State Management
In der echten App **nichts Neues nötig** — Store und i18n existieren. Die Prototyp-States
(`theme`, `lang`, aktiver Screen, `reportPeriod`, `projectBoard`, `calOffset`,
`goalChecks`, `journalActive`) haben in der App bereits Entsprechungen (Settings/Store/
lokaler Screen-State). Nur dort andocken, nicht duplizieren.

## Assets
Keine externen Bilder. Icons via lucide (vorhanden). Fonts: Geist (vorhanden).
Emoji nur auf dem Erfolge-Screen (wie im Bestandscode).

## Files
- `Life Dashboard.dc.html` — vollständiger interaktiver Prototyp aller 16 Screens inkl.
  Dark/Light. Im Browser öffnen; über die linke Nav durch die Screens klicken, Theme oben
  rechts umschalten. Referenz für exakte Werte.
