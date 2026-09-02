# Handoff: „Pulse" Redesign — Life Dashboard (Mobile, alle Seiten)

## Overview
Komplettes visuelles Redesign der Life-Dashboard-App im Stil „Pulse": ruhige, editoriale Flächen
statt Karten-Stapel, Hairline-Metriken, eine echte Fokuszone pro Seite, schwebende Bottom-Navigation
und ein **Farbakzent pro Bereich** (Area-Hue), der als weicher Verlauf auf allen interaktiven
Elementen wiederkehrt. 33 Screens, jeweils in Dark und Light.

Grundlage ist das bestehende Repo `heypana1-ux/life-dashboard`, Branch
`claude/life-dashboard-app-5pe9h1`, Verzeichnis `src/app`. Inhalte, Zahlen, Labels und Texte der
Mocks stammen 1:1 aus den echten Page-Dateien (siehe SCREENS.md).

## About the Design Files
Die Datei `Dashboard Mobile.dc.html` in diesem Bundle ist eine **Design-Referenz in HTML** —
ein Prototyp, der Aussehen und Verhalten zeigt, **kein Produktionscode zum Kopieren**. Aufgabe ist,
diese Designs in der bestehenden Umgebung des Repos zu **rekonstruieren**: Next.js App Router,
React, Tailwind v4 mit CSS-Variablen in `src/app/globals.css`, Komponenten in
`src/components/ui.tsx`, lucide-react Icons. Kein neues Framework, keine neue Styling-Ebene.

Die Mocks sind mit Inline-Styles gebaut, weil sie in einer Design-Umgebung entstanden sind —
im Repo gehören dieselben Werte in Tokens und Utility-Klassen (siehe „Design Tokens").

## Fidelity
**High-fidelity.** Farben, Radien, Typo, Abstände und Zustände sind final und exakt. Die UI soll
pixelgenau nachgebaut werden — mit den bestehenden Komponenten (`Card`, `SectionTitle`, `StatTile`,
`Chip`, `Button`, `Badge`) und Tokens, nicht mit neuen Ad-hoc-Styles.

## Implementation order (wichtig)
Ungefähr die Hälfte des Redesigns steckt in Tokens. In dieser Reihenfolge arbeiten:

1. **`src/app/globals.css`** — Area-Accent-Tokens, Ink-Regel, Radien, Section-Label, Tile/Card-Metriken.
2. **`src/lib/areaStyle.ts`** — Area-Hues auf Verlaufspaare erweitern (statt einzelner Volltonfarbe).
3. **`src/components/ui.tsx`** — `Card`, `SectionTitle`, `StatTile`, `Chip`, `Button`, `Badge` auf die
   neuen Metriken ziehen. Danach ziehen die meisten Seiten automatisch mit.
4. **Bottom-Nav / Layout** — schwebende Pill statt fester Leiste.
5. **Seiten einzeln** — Reihenfolge in SCREENS.md, oben die mit den größten Layout-Änderungen.

## Screens / Views
Vollständige Liste mit Zweck, Layout, Komponenten und Repo-Datei: **SCREENS.md**.
Jeder Screen liegt im Prototyp unter seiner ID (`3a`–`3ag`) und ist über die Farb-Legende am
Anfang der Datei anspringbar (`#3c`, `#3ab` …). Jede ID existiert zweimal: Dark links, Light rechts.

## Design Tokens

### Basis (unverändert aus dem Repo — bitte nicht neu erfinden)
Light: `--bg #f6f7f9`, `--surface #ffffff`, `--surface-2 #f1f3f5`, `--border #e2e5ea`,
`--text #14161a`, `--text-muted #5b6470`, `--text-faint #8a929e`,
`--good #16a34a`, `--warn #d97706`, `--bad #dc2626`.
Dark: `--bg #0a0b0e`, `--surface #14161b`, `--surface-2 #1b1e25`, `--border #262a32`,
`--text #eef1f5`, `--text-muted #9aa3b0`, `--text-faint #6b7482`,
`--good #34d399`, `--warn #fbbf24`, `--bad #f87171`.

Zusätzlich im Prototyp verwendet (bitte als Token ergänzen):
`--text-dim`: Light `#a3aab5`, Dark `#4d545f` — für Platzhalter, deaktivierte Labels, Fußnoten.

### Area-Accents (neu — Kern des Redesigns)
Pro Bereich **ein** Verlaufspaar je Modus. Regel, die zwingend eingehalten werden muss:
**der hellere Stop des Paares muss gegen die gewählte Tinte ≥ 4.5:1 liefern.**
Praktisch heißt das: in Dark das hellere Paar + dunkle Tinte, in Light das dunklere Paar + Weiß.

| Bereich | Dark A → B | Dark Ink | Light A → B | Light Ink |
| --- | --- | --- | --- | --- |
| Core (Dashboard, Today, Morning, Habits, Calendar, Coach) | `#7c7bff` → `#a78bfa` | `#0a0b0e` * | `#4f46e5` → `#6366f1` | `#ffffff` |
| Focus | `#34d399` → `#6ee7b7` | `#04140e` | `#059669` → `#10b981` | `#04140e` |
| Sleep | `#818cf8` → `#a5b4fc` | `#0a0b1a` | `#4338ca` → `#4f46e5` | `#ffffff` |
| Statistics | `#22d3ee` → `#67e8f9` | `#0a0b0e` | `#0891b2` → `#06b6d4` | `#0a0b0e` |
| Analysis, Correlations | `#60a5fa` → `#93c5fd` | `#0a0b0e` | `#2563eb` → `#3b82f6` | `#ffffff` |
| Wheel of Life | `#a855f7` → `#c084fc` | `#14061f` | `#6d28d9` → `#7c3aed` | `#ffffff` |
| Goals | `#a3e635` → `#bef264` | `#0a0b0e` | `#65a30d` → `#84cc16` | `#0a0b0e` |
| Health | `#fb7185` → `#fda4af` | `#0a0b0e` | `#e11d48` → `#f43f5e` | `#ffffff` |
| Journal | `#e879f9` → `#f0abfc` | `#0a0b0e` | `#a21caf` → `#c026d3` | `#ffffff` |
| Training | `#fb923c` → `#fdba74` | `#0a0b0e` | `#ea580c` → `#f97316` | `#0a0b0e` |
| Finances | `#2dd4bf` → `#5eead4` | `#0a0b0e` | `#0d9488` → `#14b8a6` | `#0a0b0e` |
| Vision Board | `#f472b6` → `#f9a8d4` | `#1f0714` | `#be185d` → `#db2777` | `#ffffff` |
| Projects, Experiments | `#38bdf8` → `#7dd3fc` | `#041520` | `#0369a1` → `#0284c7` | `#ffffff` |
| Reports | `#a1a1aa` → `#d4d4d8` | `#101012` | `#52525b` → `#71717a` | `#ffffff` |
| Achievements, Rewards, Scoreboard | `#f59e0b` → `#fcd34d` | `#1a1204` | `#92400e` → `#b45309` | `#ffffff` |
| Profile, Character, About, Settings | `#475569` → `#64748b` | `#ffffff` | `#475569` → `#64748b` | `#ffffff` |

\* Ausnahme Core/Dark: Weiß ist auf `#7c7bff` noch ausreichend (4.0:1 nur am hellen Stop) — im
Prototyp trägt das Coach-Briefing dunkle Tinte, kleine Pills tragen Weiß. Wenn du eine Regel willst:
dunkle Tinte, sobald der Textblock größer als eine Pill ist.

### Soft-Tiles (Icon-Kacheln, aktive Nav-Pill, Insight-Karten)
Jeder Bereich hat zusätzlich ein „weiches" Paar für Flächen hinter Akzenttext:
Dark ≈ 12–18 % Sättigung des Hue auf `#0f1116` (Beispiele: Core `#27275e`→`#191934`,
Training `#452712`→`#2a170a`, Finanzen `#0f3a37`→`#0a2725`),
Light die 50/25-Tints (Core `#e0dffd`→`#f4f4fe`, Training `#ffedd5`→`#fff7ed`,
Finanzen `#ccfbf1`→`#f0fdfa`). Text darauf: der ATXT-Wert des Bereichs
(Dark = hellerer Stop, Light = ein Schritt dunkler als A).

### CSS-Patch (Vorschlag für `globals.css`)
Die Area-Farbe wird pro Seite gesetzt, nicht global. Empfehlung: im App-Layout aus dem Pathname
ein `data-area`-Attribut auf den Page-Wrapper schreiben, dann:

```css
/* ein Block pro Bereich; Werte aus der Tabelle oben */
[data-area="training"] {
  --area-a: #ea580c;
  --area-b: #f97316;
  --area-ink: #0a0b0e;
  --area-soft-a: #ffedd5;
  --area-soft-b: #fff7ed;
  --area-text: #c2410c;
}
.dark [data-area="training"] {
  --area-a: #fb923c;
  --area-b: #fdba74;
  --area-ink: #0a0b0e;
  --area-soft-a: #452712;
  --area-soft-b: #2a170a;
  --area-text: #fdba74;
}

/* Verlaufsflächen */
.area-grad { background: linear-gradient(135deg, var(--area-a), var(--area-b)); color: var(--area-ink); }
.area-soft { background: linear-gradient(135deg, var(--area-soft-a), var(--area-soft-b)); color: var(--area-text); }
.area-text { color: var(--area-text); }
/* Gradient-Headline */
.area-title { background: linear-gradient(135deg, var(--area-a), var(--area-b));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
```

Fallback: ohne `data-area` erben `--area-*` die bestehenden `--grad-a/--grad-b/--accent`-Werte,
damit die Accent-Kosmetik aus dem Reward-Shop weiter funktioniert.

### Metriken (aus den Mocks gemessen)
- **Frame**: 390 px Breite, Inhalt endet ~86 px über der Nav-Pill.
- **Radien**: Karte 24 px, Tile/Sekundärkarte 20 px, Innenflächen 15–17 px, Buttons 12–14 px,
  Chips/Badges 999 px, Icon-Kachel 13 px, Nav-Pill 22 px, aktive Nav-Kachel 16 px.
- **Abstände**: Seitenrand Karten 18 px, Header/Copy 22 px, vertikal zwischen Karten 14 px,
  Kartenpolster 18 px, Zeilen in Listen 11 px oben/unten mit 1 px Hairline dazwischen.
- **Typo** (Geist): Headline 27 px/600/-0.03em; Metrik groß 58–62 px/700/-0.045em;
  Metrik mittel 20–23 px/700/-0.03em; Body 13 px/1.5; Listenzeile 12.5–13 px;
  Sekundär 11.5 px; Fußnote 10.5 px/1.5; Section-Label 11 px/600/uppercase/0.12em/`--text-faint`;
  Kicker über der Headline 11 px/600/uppercase/0.14em. Zahlen immer `font-variant-numeric: tabular-nums`.
- **Schatten**: Karten in Light `0 1px 2px rgba(16,18,22,.04), 0 4px 16px rgba(16,18,22,.06)`;
  Nav-Pill Dark `0 12px 40px rgba(0,0,0,.55)`, Light `0 12px 40px rgba(16,18,22,.12)`.
- **Bottom-Nav**: schwebend, `left/right: 14px`, `bottom: 16px`, Polster 6 px, Blur 14 px,
  Hintergrund Dark `rgba(20,22,27,.92)`, Light `rgba(255,255,255,.94)`; 5 Slots
  (4 gepinnte Seiten + „More"), aktiver Slot als `.area-soft`-Kachel.

## Interactions & Behavior
Die Mocks sind statisch; Verhalten bleibt wie im Repo implementiert. Neu bzw. präzisiert:
- **Aktive Zustände** nutzen `.area-soft` (Chips, Nav, ausgewählte Optionen) statt Volltonfarbe.
- **Primäre Buttons** `.area-grad`; sekundär `.area-soft`; tertiär 1 px `--border` + `--text-muted`;
  deaktiviert `--text-dim` ohne Fläche.
- **Fortschritt/Meter**: Track `--surface-2` (5–7 px), Füllung `linear-gradient(90deg, var(--area-a), var(--area-b))`.
- **Gesperrte Inhalte** (Achievements, Character): `opacity .55`, Lock-Icon 10–11 px, Emoji
  zusätzlich `filter: grayscale(1)`.
- **Semantik bleibt semantisch**: Score-/Trend-Farben weiter `--good/--warn/--bad`, nie die Area-Farbe.
- Bestehende Animationen (`fadeIn`, `checkPop`, `sheet-up`, Swipe-Slides) unverändert übernehmen.

## State Management
Keine neuen States. Zwei Ergänzungen:
1. `data-area` pro Route (Ableitung aus `NAV` in `src/lib/nav.tsx` — Mapping siehe Tabelle).
2. „More"-Sheet (Screen `3ag`) rendert die `SECTIONS` aus `src/lib/nav.tsx` als 2-Spalten-Grid mit
   Icon-Kachel in der Area-Farbe plus einer Statuszeile pro Eintrag (Zahl aus dem jeweiligen Store).

## Assets
Keine Bilddateien. Alle Icons sind lucide-react (im Repo vorhanden) — im Prototyp als Inline-SVG mit
`stroke-width: 2`, Größen 10–19 px (Nav 19, Karten-Icon 15–17, Inline 12–14).
Vision-Board-Karten zeigen ohne Nutzerbild eine Area-Verlaufsfläche mit Sparkles-Icon (wie im Repo).
Emoji (Quests, Achievements, Reward-Items, Weekly-Review-Ratings) kommen aus den Repo-Daten und
bleiben erhalten.

## Files
- `Dashboard Mobile.dc.html` — der Prototyp, alle 33 Screens, Dark + Light. Im Browser öffnen;
  die Farb-Legende oben verlinkt jeden Screen.
- `SCREENS.md` — Screen-für-Screen-Beschreibung mit Repo-Datei und Area-Farbe.
- `github.md` — Repo, Branch, Screen-Map, Sync-Stand.
