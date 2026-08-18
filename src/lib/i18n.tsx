"use client";

import { useCallback } from "react";
import { useStore } from "./store";
import { Language } from "./types";

/*
  Lightweight i18n. The English string IS the key, so untranslated strings gracefully fall
  back to English. `t("...", { n: 3 })` interpolates {n}. Use useT() in client components.
*/

type Vars = Record<string, string | number>;

// German dictionary. Keys are the English source strings.
const DE: Record<string, string> = {
  // --- Nav ---
  Dashboard: "Dashboard",
  Today: "Heute",
  Habits: "Gewohnheiten",
  Sleep: "Schlaf",
  Statistics: "Statistik",
  Journal: "Tagebuch",
  Goals: "Ziele",
  Settings: "Einstellungen",
  Finances: "Finanzen",
  Training: "Training",
  Projects: "Projekte",
  Achievements: "Erfolge",
  Reports: "Berichte",
  Calendar: "Kalender",
  Morning: "Morgen",
  Experiments: "Experimente",
  More: "Mehr",
  "Your life, day by day — tap a day to see everything you logged.":
    "Dein Leben, Tag für Tag — tippe einen Tag an, um alles Eingetragene zu sehen.",
  "Nothing logged this day.": "An diesem Tag nichts eingetragen.",
  "Good morning": "Guten Morgen",
  "Good afternoon": "Guten Tag",
  "Good evening": "Guten Abend",
  "No sleep logged for last night.": "Für letzte Nacht kein Schlaf eingetragen.",
  "Set your intention for the day. Small, consistent steps compound.":
    "Setz dir dein Ziel für den Tag. Kleine, konstante Schritte summieren sich.",

  // --- Experiments ---
  "Test a hypothesis against your own data — correlation, not proof.":
    "Teste eine Hypothese an deinen eigenen Daten — Korrelation, kein Beweis.",
  "New experiment": "Neues Experiment",
  "No experiments yet": "Noch keine Experimente",
  'e.g. "When I go to bed before midnight, am I more productive the next day?"':
    'z. B. „Wenn ich vor Mitternacht schlafen gehe, bin ich am nächsten Tag produktiver?"',
  Hypothesis: "Hypothese",
  "Outcome metric": "Zielmetrik",
  Condition: "Bedingung",
  "Start from a template": "Mit Vorlage starten",
  "Start date": "Startdatum",
  "Duration (days)": "Dauer (Tage)",
  "Bedtime before…": "Zubettgehen vor…",
  "Sleep at least…": "Schlaf mindestens…",
  "On days I train": "An Trainingstagen",
  "A specific habit is done": "Eine bestimmte Gewohnheit ist erledigt",
  "Bedtime before": "Zubettgehen vor",
  "Sleep at least": "Schlaf mindestens",
  Habit: "Gewohnheit",
  "Bedtime before {time}": "Zubettgehen vor {time}",
  "Sleep ≥ {dur}": "Schlaf ≥ {dur}",
  higher: "höher",
  lower: "niedriger",
  With: "Mit",
  Without: "Ohne",
  "Not enough data yet ({met} vs {not} days). Keep logging.":
    "Noch nicht genug Daten ({met} vs. {not} Tage). Trage weiter ein.",
  "On days with the condition, {metric} was on average {pct} {dir}.":
    "An Tagen mit der Bedingung war {metric} im Schnitt {pct} {dir}.",
  "Observation from your own data — a correlation, not causation.":
    "Beobachtung aus deinen eigenen Daten — eine Korrelation, keine Kausalität.",
  "Life Dashboard": "Life Dashboard",
  "Data stays on this device.": "Daten bleiben auf diesem Gerät.",
  "Loading your dashboard…": "Dein Dashboard wird geladen…",

  // --- Common ---
  Save: "Speichern",
  "Save changes": "Änderungen speichern",
  Cancel: "Abbrechen",
  Delete: "Löschen",
  Edit: "Bearbeiten",
  Add: "Hinzufügen",
  Continue: "Weiter",
  Back: "Zurück",
  Create: "Erstellen",
  Done: "Erledigt",
  Optional: "Optional",
  Saved: "Gespeichert",
  "Saved ✓": "Gespeichert ✓",
  All: "Alle",
  New: "Neu",
  Name: "Name",
  Type: "Typ",
  Area: "Bereich",
  Priority: "Priorität",
  Color: "Farbe",
  Progress: "Fortschritt",
  Category: "Kategorie",
  Amount: "Betrag",
  Note: "Notiz",
  Date: "Datum",
  Title: "Titel",
  Description: "Beschreibung",
  Low: "Niedrig",
  Medium: "Mittel",
  High: "Hoch",
  today: "heute",
  "this week": "diese Woche",
  planned: "geplant",
  Planned: "Geplant",
  week: "Woche",
  month: "Monat",

  // --- Dashboard ---
  "Life Score today": "Life Score heute",
  "No data yet": "Noch keine Daten",
  "vs yesterday": "ggü. gestern",
  "vs 7-day avg": "ggü. 7-Tage-Schnitt",
  Categories: "Kategorien",
  "All stats →": "Alle Statistiken →",
  "Life Rating": "Life Rating",
  "Life Score": "Life Score",
  Streak: "Streak",
  Best: "Best",
  "7-day avg": "7-Tage-Schnitt",
  "days with activity": "Tage mit Aktivität",
  "goals done": "Ziele erledigt",
  "Today's goals": "Heutige Ziele",
  "Open →": "Öffnen →",
  "No habits scheduled today": "Heute keine Gewohnheiten geplant",
  "Add habits to start building your daily plan.":
    "Füge Gewohnheiten hinzu, um deinen Tagesplan aufzubauen.",
  "Add habits": "Gewohnheiten hinzufügen",
  Insights: "Insights",
  "Data-driven": "Datenbasiert",
  "Observations from your own logs. These are associations, not medical or causal claims.":
    "Beobachtungen aus deinen eigenen Daten. Das sind Zusammenhänge, keine medizinischen oder kausalen Aussagen.",
  "Log today": "Heute eintragen",
  Creativity: "Kreativität",
  Reflection: "Reflexion",
  Excellent: "Exzellent",
  Strong: "Stark",
  Solid: "Solide",
  Mixed: "Gemischt",
  Rough: "Schwach",

  // --- Today ---
  "Daily check-in": "Täglicher Check-in",
  "Edit day": "Tag bearbeiten",
  "Edit this day": "Diesen Tag bearbeiten",
  "Night of": "Nacht vom",
  Goals_section: "Ziele",
  "Watch-list": "Beobachtungsliste",
  Reduce: "Reduzieren",
  "Tap only if the behavior happened today. Avoided by default.":
    "Nur antippen, wenn das Verhalten heute auftrat. Standardmäßig vermieden.",
  Productivity: "Produktivität",
  Mood: "Stimmung",
  Energy: "Energie",
  Satisfaction: "Zufriedenheit",
  Discipline: "Disziplin",
  "Went well": "Lief gut",
  "Went badly": "Lief schlecht",
  "Better tomorrow": "Morgen besser",
  "Save check-in": "Check-in speichern",
  "Projected score": "Prognostizierter Score",
  "Updates live as you log. Categories with no data yet are excluded.":
    "Aktualisiert sich live beim Eintragen. Kategorien ohne Daten werden ausgeschlossen.",
  "Logged for last night.": "Für letzte Nacht eingetragen.",
  "Not logged for last night.": "Für letzte Nacht nicht eingetragen.",
  "Log sleep": "Schlaf eintragen",
  Avoided: "Vermieden",
  Occurred: "Aufgetreten",

  // --- Habits ---
  "Build good routines, reduce the ones you don't want.":
    "Baue gute Routinen auf, reduziere die unerwünschten.",
  "New habit": "Neue Gewohnheit",
  "Edit habit": "Gewohnheit bearbeiten",
  Build: "Aufbauen",
  "No habits yet": "Noch keine Gewohnheiten",
  Schedule: "Zeitplan",
  Daily: "Täglich",
  "Times / week": "Mal / Woche",
  "Specific days": "Bestimmte Tage",
  "Target minutes (optional)": "Zielminuten (optional)",
  "Target value": "Zielwert",
  Unit: "Einheit",
  Difficulty: "Schwierigkeit",
  "Create habit": "Gewohnheit erstellen",
  completed: "erledigt",
  avoided: "vermieden",
  "last 30 days": "letzte 30 Tage",
  "days / week": "Tage / Woche",
  "Show heatmap": "Heatmap zeigen",
  "Hide heatmap": "Heatmap ausblenden",
  "Current streak": "Aktueller Streak",
  adherence: "Adhärenz",
  "day streak": "Tage-Streak",
  "Create your first habit to start tracking. Habits can be daily, a number of times per week, or on specific weekdays.":
    "Erstelle deine erste Gewohnheit. Gewohnheiten können täglich, mehrmals pro Woche oder an bestimmten Wochentagen sein.",

  // --- Sleep ---
  "Manual sleep tracking, scores and your personal pattern.":
    "Manuelles Schlaf-Tracking, Scores und dein persönliches Muster.",
  "Last night": "Letzte Nacht",
  Logged: "Eingetragen",
  Bedtime: "Zubettgehen",
  "Wake time": "Aufwachen",
  "Fall-asleep (min)": "Einschlafen (Min)",
  Awakenings: "Aufwachphasen",
  Quality: "Qualität",
  "Morning energy": "Energie morgens",
  Duration: "Dauer",
  "Avg duration": "Ø Dauer",
  Target: "Ziel",
  "Bedtime var.": "Zubett-Varianz",
  regular: "regelmäßig",
  variable: "variabel",
  "Duration · last 30 nights": "Dauer · letzte 30 Nächte",
  "Personal pattern": "Persönliches Muster",
  "From your data": "Aus deinen Daten",
  "Log a few nights to see your trend.": "Trage ein paar Nächte ein, um deinen Trend zu sehen.",
  "Your best-rated mornings follow around {dur} of sleep (avg morning energy {energy}/10 in that range).":
    "Deine am besten bewerteten Morgen folgen auf etwa {dur} Schlaf (Ø Morgenenergie {energy}/10 in diesem Bereich).",
  "A data-based estimate from your own logs — not a medical recommendation.":
    "Eine datenbasierte Schätzung aus deinen eigenen Daten — keine medizinische Empfehlung.",
  "Not enough data yet for a reliable pattern. Keep logging — an estimate appears after ~10 nights.":
    "Noch nicht genug Daten für ein verlässliches Muster. Trage weiter ein — eine Schätzung erscheint nach ~10 Nächten.",

  // --- Statistics ---
  "Trends, ratings and correlations from your data.":
    "Trends, Ratings und Korrelationen aus deinen Daten.",
  "Life Rating (ELO)": "Life Rating (ELO)",
  Current: "Aktuell",
  "Personal best": "Persönliche Bestleistung",
  "30-day": "30 Tage",
  "90-day": "90 Tage",
  "All-time": "Insgesamt",
  "Life Score by weekday": "Life Score nach Wochentag",
  "What your data suggests": "Was deine Daten nahelegen",
  Correlations: "Korrelationen",
  "Associations observed in your logs — correlation, not causation.":
    "In deinen Daten beobachtete Zusammenhänge — Korrelation, keine Kausalität.",
  "Not enough data in this range yet.":
    "Noch nicht genug Daten in diesem Zeitraum.",
  avg: "Ø",

  // --- Journal ---
  "Private by default. Stored only on this device.":
    "Standardmäßig privat. Nur auf diesem Gerät gespeichert.",
  "New entry": "Neuer Eintrag",
  "Search entries…": "Einträge durchsuchen…",
  "No entries found.": "Keine Einträge gefunden.",
  Untitled: "Ohne Titel",
  "Open or start an entry": "Eintrag öffnen oder beginnen",
  "Your journal reads like a book — one page per day. Pick an entry on the left or start a new one.":
    "Dein Tagebuch liest sich wie ein Buch — eine Seite pro Tag. Wähle links einen Eintrag oder beginne einen neuen.",
  "Title your day…": "Benenne deinen Tag…",
  "Write freely…": "Schreib frei…",
  "Highlight of the day": "Highlight des Tages",
  "Mood (1–10)": "Stimmung (1–10)",
  Location: "Ort",
  Weather: "Wetter",
  "Tags (comma separated)": "Tags (kommagetrennt)",
  "Add photo": "Foto hinzufügen",

  // --- Goals ---
  "Longer-term outcomes, distinct from daily habits.":
    "Längerfristige Ziele, getrennt von täglichen Gewohnheiten.",
  "New goal": "Neues Ziel",
  "Edit goal": "Ziel bearbeiten",
  "No goals yet": "Noch keine Ziele",
  Deadline: "Frist",
  Milestones: "Meilensteine",
  "Add a milestone…": "Meilenstein hinzufügen…",
  "Create goal": "Ziel erstellen",
  "Linked habits": "Verknüpfte Gewohnheiten",
  "Habits that contribute to this goal.": "Gewohnheiten, die auf dieses Ziel einzahlen.",
  'A habit is "train 3× / week". A goal is "bench 80kg by December". Add milestones to track progress.':
    'Eine Gewohnheit ist "3× / Woche trainieren". Ein Ziel ist "80kg Bankdrücken bis Dezember". Füge Meilensteine hinzu, um den Fortschritt zu verfolgen.',
  Career: "Karriere",
  Personal: "Persönlich",

  // --- Settings ---
  "Tune what you track and how your score is computed.":
    "Passe an, was du trackst und wie dein Score berechnet wird.",
  "Account & sync": "Konto & Sync",
  "Sign in to keep the same data on your phone and PC.":
    "Melde dich an, um auf Handy und PC denselben Datenstand zu haben.",
  "Same data on all your devices.": "Gleicher Datenstand auf allen Geräten.",
  "Signed in as": "Angemeldet als",
  "Sign in": "Anmelden",
  "Sign out": "Abmelden",
  "Create account": "Konto erstellen",
  "Have an account? Sign in": "Schon ein Konto? Anmelden",
  "Account created — you can sign in now.": "Konto erstellt — du kannst dich jetzt anmelden.",
  Email: "E-Mail",
  Password: "Passwort",
  "Sync now": "Jetzt synchronisieren",
  "Syncing…": "Synchronisiere…",
  Synced: "Synchronisiert",
  "Sync error": "Sync-Fehler",
  Appearance: "Darstellung",
  Accent: "Akzentfarbe",
  Calm: "Calm",
  Aurora: "Aurora",
  Mono: "Mono",
  Light: "Hell",
  Dark: "Dunkel",
  System: "System",
  Language: "Sprache",
  English: "Englisch",
  German: "Deutsch",
  Profile: "Profil",
  "Used to personalize the app and enrich your stats. Optional and private.":
    "Wird zur Personalisierung und für reichhaltigere Statistiken genutzt. Optional und privat.",
  Age: "Alter",
  Sex: "Geschlecht",
  "Height (cm)": "Größe (cm)",
  "Current weight (kg)": "Aktuelles Gewicht (kg)",
  "Activity level": "Aktivitätslevel",
  BMI: "BMI",
  years: "Jahre",
  male: "männlich",
  female: "weiblich",
  other: "divers",
  prefer_not: "keine Angabe",
  sedentary: "wenig aktiv",
  light: "leicht aktiv",
  moderate: "moderat aktiv",
  active: "aktiv",
  athlete: "sehr aktiv",
  "Weight trend": "Gewichtsverlauf",
  "Log weight": "Gewicht eintragen",
  "Life areas & score weights": "Lebensbereiche & Score-Gewichte",
  "normalized to 100%": "auf 100% normalisiert",
  "manual only": "nur manuell",
  "Sleep target": "Schlafziel",
  hours: "Stunden",
  Data: "Daten",
  "Last backup": "Letztes Backup",
  "No backup yet": "Noch kein Backup",
  "1 day ago": "vor 1 Tag",
  "{n} days ago": "vor {n} Tagen",
  "Your data lives only in this browser. Export a backup regularly so you never lose it.":
    "Deine Daten liegen nur in diesem Browser. Exportiere regelmäßig ein Backup, damit du sie nie verlierst.",
  "Your data lives only in this browser. Export a backup so you don't lose it.":
    "Deine Daten liegen nur in diesem Browser. Exportiere ein Backup, damit du sie nicht verlierst.",
  "Back up now": "Jetzt sichern",
  Dismiss: "Schließen",
  // reminders
  Reminders: "Erinnerungen",
  "A daily nudge to log your day. Works only while the app is open (no background push).":
    "Ein täglicher Anstoß, deinen Tag einzutragen. Funktioniert nur, solange die App geöffnet ist (kein Hintergrund-Push).",
  "Notifications aren't supported here.": "Benachrichtigungen werden hier nicht unterstützt.",
  "Enable notifications": "Benachrichtigungen aktivieren",
  "Daily check-in reminder": "Tägliche Check-in-Erinnerung",
  "Reminder time": "Erinnerungszeit",
  "Include still-open habits": "Offene Gewohnheiten einbeziehen",
  "Life Dashboard — daily check-in": "Life Dashboard — täglicher Check-in",
  "{n} goals still open — take a minute to log your day.":
    "{n} Ziele noch offen — nimm dir kurz Zeit, deinen Tag einzutragen.",
  "Take a minute to log your day.": "Nimm dir kurz Zeit, deinen Tag einzutragen.",
  "Load demo data": "Demo-Daten laden",
  "Clear demo data": "Demo-Daten löschen",
  "Export JSON": "JSON exportieren",
  "Import JSON": "JSON importieren",
  "Reset everything": "Alles zurücksetzen",
  "This deletes all data and restarts onboarding.":
    "Das löscht alle Daten und startet das Onboarding neu.",
  "Confirm reset": "Zurücksetzen bestätigen",
  Roadmap: "Roadmap",
  "Life Dashboard · your data lives in this browser only.":
    "Life Dashboard · deine Daten leben nur in diesem Browser.",

  // --- Onboarding ---
  "Which areas matter to you?": "Welche Bereiche sind dir wichtig?",
  "About you": "Über dich",
  "Optional and private — used to personalize the app and your stats.":
    "Optional und privat — zur Personalisierung der App und deiner Statistiken.",
  "A few targets": "Ein paar Ziele",
  "Start with data?": "Mit Daten starten?",
  "Explore with demo data": "Mit Demo-Daten erkunden",
  "Recommended for a first look": "Empfohlen für den ersten Blick",
  "Start clean": "Sauber starten",
  "A handful of starter habits, no history":
    "Ein paar Start-Gewohnheiten, keine Historie",
  "Everything is stored locally in your browser. Nothing is sent anywhere.":
    "Alles wird lokal in deinem Browser gespeichert. Nichts wird irgendwohin gesendet.",
  "Pick what you want to track. You can change any of this later — turning an area off keeps your dashboard focused.":
    "Wähle, was du tracken möchtest. Du kannst das später jederzeit ändern — Bereiche auszuschalten hält dein Dashboard fokussiert.",
  "These seed your goals. Nothing here is a medical recommendation — just your own targets to measure against.":
    "Diese legen deine Ziele fest. Nichts davon ist eine medizinische Empfehlung — nur deine eigenen Richtwerte.",
  "Load 45 days of realistic demo data to explore charts, ELO and insights right away — or start clean with a few starter habits. Demo data can be cleared any time in Settings.":
    "Lade 45 Tage realistische Demo-Daten, um Charts, ELO und Insights sofort zu erkunden — oder starte sauber mit ein paar Start-Gewohnheiten. Demo-Daten lassen sich jederzeit in den Einstellungen löschen.",
  // area descriptions
  "Focus & deep work": "Fokus & konzentriertes Arbeiten",
  "Training & movement": "Training & Bewegung",
  "Rest & recovery": "Ruhe & Erholung",
  "Build & reduce behaviors": "Verhalten aufbauen & reduzieren",
  "Study & skills": "Lernen & Fähigkeiten",
  "Projects & making": "Projekte & Kreatives",
  "Daily check-ins & mood": "Tägliche Check-ins & Stimmung",
  "Net worth & spending": "Vermögen & Ausgaben",

  // --- Finances ---
  "Net worth, portfolio and budget. Values are entered manually.":
    "Nettovermögen, Depot und Budget. Werte werden manuell eingegeben.",
  "Net worth": "Nettovermögen",
  Assets: "Vermögen",
  Liabilities: "Schulden",
  "Investments value": "Wert Investments",
  Overview: "Übersicht",
  Portfolio: "Depot",
  Budget: "Haushaltsbuch",
  Accounts: "Konten",
  "Add account": "Konto hinzufügen",
  "Add liability": "Schuld hinzufügen",
  "Add holding": "Position hinzufügen",
  "Add transaction": "Buchung hinzufügen",
  "No accounts yet": "Noch keine Konten",
  "No holdings yet": "Noch keine Positionen",
  "No transactions yet": "Noch keine Buchungen",
  Ticker: "Ticker",
  Quantity: "Anzahl",
  "Buy price": "Kaufpreis",
  "Current price": "Aktueller Preis",
  "Monthly plan": "Sparplan / Monat",
  Value: "Wert",
  "Gain / Loss": "Gewinn / Verlust",
  Allocation: "Allokation",
  "Total value": "Gesamtwert",
  "Total invested": "Investiert gesamt",
  "Total gain": "Gesamtgewinn",
  "Monthly income": "Monatl. Einnahmen",
  "Monthly expenses": "Monatl. Ausgaben",
  "Savings rate": "Sparquote",
  Income: "Einnahmen",
  Expense: "Ausgabe",
  Expenses: "Ausgaben",
  "This month": "Dieser Monat",
  "Savings goals": "Sparziele",
  "Add goal": "Ziel hinzufügen",
  "Saved so far": "Bisher gespart",
  "Track a savings target like an emergency fund or a trip.": "Verfolge ein Sparziel wie einen Notgroschen oder eine Reise.",
  "This vs. last month": "Dieser vs. letzter Monat",
  "Fixed costs": "Fixkosten",
  "Add recurring expenses to see your monthly fixed costs.": "Füge wiederkehrende Ausgaben hinzu, um deine monatlichen Fixkosten zu sehen.",
  "Previous month": "Voriger Monat",
  "Next month": "Nächster Monat",
  Transactions: "Buchungen",
  "Edit transaction": "Buchung bearbeiten",
  "Expenses by category": "Ausgaben nach Kategorie",
  "Budget vs. actual": "Budget vs. Ist",
  "Set budgets": "Budgets festlegen",
  "Over budget": "Überzogen",
  "Total budgeted": "Budgetiert gesamt",
  spent: "ausgegeben",
  "Set a monthly limit per category to track how you're doing.":
    "Lege pro Kategorie ein Monatslimit fest, um zu sehen, wie du liegst.",
  "Monthly budgets": "Monatsbudgets",
  "Set a spending limit per category. You'll see how much of each you've used this month.":
    "Lege pro Kategorie ein Ausgabenlimit fest. Du siehst, wie viel du diesen Monat schon genutzt hast.",
  Limit: "Limit",
  Set: "Festlegen",
  Recurring: "Wiederkehrend",
  "Recurring transactions": "Wiederkehrende Buchungen",
  Manage: "Verwalten",
  Day: "Tag",
  "Day of month": "Tag im Monat",
  "Add rule": "Regel hinzufügen",
  Active: "Aktiv",
  Paused: "Pausiert",
  paused: "pausiert",
  "More options": "Mehr Optionen",
  "Add rent, salary or subscriptions to book them automatically each month.":
    "Füge Miete, Gehalt oder Abos hinzu, um sie automatisch jeden Monat zu buchen.",
  "These are booked automatically each month when their day arrives, while the app is open.":
    "Diese werden automatisch jeden Monat an ihrem Tag gebucht, solange die App geöffnet ist.",
  "Net worth over time": "Nettovermögen über Zeit",
  Balance: "Saldo",
  "Monthly payment": "Monatliche Rate",
  Currency: "Währung",
  "Market prices are entered manually. A live-data provider can be added later without changing this screen.":
    "Marktpreise werden manuell eingegeben. Ein Live-Daten-Anbieter kann später ohne Änderung dieses Bildschirms ergänzt werden.",
  "Information, not investment advice.":
    "Information, keine Anlageberatung.",
  Diversification: "Diversifikation",
  "Concentration risk": "Konzentrationsrisiko",
  "Well diversified": "Gut diversifiziert",
  "Concentrated — one position dominates":
    "Konzentriert — eine Position dominiert",

  // --- Training ---
  "Detailed workout logging with exercises, sets and metrics.":
    "Detailliertes Workout-Logging mit Übungen, Sätzen und Metriken.",
  "Log workout": "Workout eintragen",
  "New workout": "Neues Workout",
  "No workouts yet": "Noch keine Workouts",
  Sport: "Sport",
  "Duration (min)": "Dauer (Min)",
  Intensity: "Intensität",
  Performance: "Leistung",
  Fun: "Spaß",
  "Energy before": "Energie vorher",
  "Energy after": "Energie danach",
  "Distance (km)": "Distanz (km)",
  "Avg pulse": "Ø Puls",
  Exercises: "Übungen",
  "Add exercise": "Übung hinzufügen",
  // --- Multi-sport training ---
  "Quick start": "Schnellstart",
  "Choose sport": "Sportart wählen",
  "Search sports…": "Sportarten suchen …",
  Strength: "Kraft",
  Combat: "Kampfsport",
  "Workout suggestion": "Workout-Vorschlag",
  // --- Guided workout runner ---
  Finish: "Fertig",
  Rest: "Pause",
  Exercise: "Übung",
  target: "Ziel",
  "Log set": "Satz eintragen",
  "Start rest": "Pause starten",
  "Rest s": "Pause s",
  "How was it?": "Wie war's?",
  "Save workout": "Workout speichern",
  "Keep your {n}-day streak alive": "Halte deine {n}-Tage-Serie am Leben",
  "Log anything today so your streak doesn't reset.": "Trag heute irgendetwas ein, damit deine Serie nicht zurückgesetzt wird.",
  Recovery: "Erholung",
  Easy: "Locker",
  Aerobic: "Aerob",
  Threshold: "Schwelle",
  Maximum: "Maximal",
  "max HR": "max. HF",
  "Weekly distance goal": "Wöchentliches Distanzziel",
  "Set a weekly km target for your endurance training.": "Setze ein Wochen-km-Ziel für dein Ausdauertraining.",
  Activate: "Aktivieren",
  "Weekly distance": "Wochendistanz",
  Off: "Aus",
  "Weekly goal reached 🎉": "Wochenziel erreicht 🎉",
  "Default rest (seconds)": "Standard-Pause (Sekunden)",
  "Apply to all": "Auf alle anwenden",
  "Leave a rest empty for no pause (supersets).": "Pause leer lassen = keine Pause (Supersätze).",
  "Add your first exercise to begin.": "Füge deine erste Übung hinzu, um zu starten.",
  "Start timer": "Timer starten",
  Pace: "Tempo",
  Rounds: "Runden",
  rounds: "Runden",
  "min/km": "min/km",
  "Cardio progress": "Ausdauer-Fortschritt",
  "Best distance": "Beste Distanz",
  "Best pace": "Bestes Tempo",
  Total: "Gesamt",
  "Lower pace is faster.": "Niedrigeres Tempo = schneller.",
  "Log at least two sessions of this sport to see a trend.": "Trage mindestens zwei Einheiten dieser Sportart ein, um einen Trend zu sehen.",
  "Exercise name": "Übungsname",
  Sets: "Sätze",
  "Add set": "Satz hinzufügen",
  Reps: "Wdh.",
  "Weight (kg)": "Gewicht (kg)",
  Notes: "Notizen",
  "Sessions this week": "Einheiten diese Woche",
  "Total time": "Gesamtzeit",
  "Avg performance": "Ø Leistung",
  "Recent workouts": "Letzte Workouts",
  Volume: "Volumen",

  // --- Projects / boards ---
  "Track learning topics and creative projects from idea to done.":
    "Verfolge Lernthemen und kreative Projekte von der Idee bis fertig.",
  "New project": "Neues Projekt",
  Learning: "Lernen",
  Creative: "Kreativ",
  "No projects in this board yet": "Noch keine Projekte in diesem Board",
  "Move left": "Nach links",
  "Move right": "Nach rechts",
  Backlog: "Backlog",
  Review: "Wiederholung",
  Mastered: "Gemeistert",
  Idea: "Idee",
  Draft: "Entwurf",
  Recording: "Aufnahme",
  Mixing: "Mixing",

  // --- Achievements ---
  "Milestones and personal records from your data.":
    "Meilensteine und persönliche Rekorde aus deinen Daten.",
  Unlocked: "Freigeschaltet",
  Locked: "Gesperrt",
  "Personal records": "Persönliche Rekorde",
  "Keep logging to unlock more.":
    "Trage weiter ein, um mehr freizuschalten.",
  // achievement titles/descriptions
  "First steps": "Erste Schritte",
  "Log your first day": "Trage deinen ersten Tag ein",
  Consistent: "Konstant",
  "7-day activity streak": "7-Tage-Aktivitäts-Streak",
  Unstoppable: "Unaufhaltsam",
  "30-day activity streak": "30-Tage-Aktivitäts-Streak",
  "Peak day": "Spitzentag",
  "Reach a Life Score of 90": "Erreiche einen Life Score von 90",
  Rising: "Im Aufstieg",
  "Reach 1100 Life Rating": "Erreiche 1100 Life Rating",
  Elite: "Elite",
  "Reach 1300 Life Rating": "Erreiche 1300 Life Rating",
  "Getting strong": "Wird stark",
  "Log 10 workouts": "Trage 10 Workouts ein",
  "Iron discipline": "Eiserne Disziplin",
  "Log 50 workouts": "Trage 50 Workouts ein",
  Scholar: "Gelehrter",
  "Study 100 hours": "Lerne 100 Stunden",
  Chronicler: "Chronist",
  "Write 30 journal entries": "Schreibe 30 Tagebucheinträge",
  "Well rested": "Gut erholt",
  "Average 8h sleep over a week": "Ø 8h Schlaf über eine Woche",
  Saver: "Sparer",
  "Hit a 30% savings rate in a month": "Erreiche 30% Sparquote in einem Monat",
  "In the black": "In den schwarzen Zahlen",
  "Reach a positive net worth": "Erreiche ein positives Nettovermögen",
  "Goal getter": "Zielerreicher",
  "Complete a goal": "Schließe ein Ziel ab",
  // record labels
  "Highest Life Score": "Höchster Life Score",
  "Highest Life Rating": "Höchstes Life Rating",
  "Longest streak": "Längster Streak",
  "Best sleep week": "Beste Schlafwoche",
  "Highest monthly savings rate": "Höchste monatliche Sparquote",
  "Most workouts in a week": "Meiste Workouts in einer Woche",

  // --- Reports ---
  "Automatic summaries of your week and month.":
    "Automatische Zusammenfassungen deiner Woche und deines Monats.",
  Weekly: "Wöchentlich",
  Monthly: "Monatlich",
  "Life Report": "Life Report",
  "Share as image": "Als Bild teilen",
  "Best day": "Bester Tag",
  "Toughest day": "Härtester Tag",
  "Training sessions": "Trainingseinheiten",
  "Journal entries": "Tagebucheinträge",
  "vs previous": "ggü. vorher",
  "Not enough data for this period yet.":
    "Noch nicht genug Daten für diesen Zeitraum.",
  Highlights: "Highlights",
  "Your average Life Score improved {n} points versus the period before.":
    "Dein durchschnittlicher Life Score ist {n} Punkte besser als im Zeitraum davor.",
  "You trained {n} times — strong consistency.":
    "Du hast {n}-mal trainiert — starke Konstanz.",
  "Your sleep averaged {dur} this period.":
    "Dein Schlaf lag in diesem Zeitraum im Schnitt bei {dur}.",
  "Your best day scored {n}.": "Dein bester Tag erreichte {n}.",
  "Logged {n} days this period. Keep the momentum going.":
    "{n} Tage in diesem Zeitraum eingetragen. Bleib dran.",

  // --- Finance categories ---
  Bank: "Bank",
  Cash: "Bargeld",
  Investment: "Investment",
  Realestate: "Immobilie",
  Vehicle: "Fahrzeug",
  Other: "Sonstiges",
  Stock: "Aktie",
  Etf: "ETF",
  Fund: "Fonds",
  Crypto: "Krypto",
  Bond: "Anleihe",
  Groceries: "Lebensmittel",
  Restaurants: "Restaurants",
  Leisure: "Freizeit",
  Clothing: "Kleidung",
  Travel: "Reisen",
  Transport: "Mobilität",
  Subscriptions: "Abos",
  Insurance: "Versicherungen",
  Health: "Gesundheit",
  Investments: "Investments",
  Salary: "Gehalt",
  "Side income": "Nebeneinkommen",
  Gift: "Geschenk",
  Refund: "Erstattung",

  // --- Weekdays ---
  Monday: "Montag",
  Tuesday: "Dienstag",
  Wednesday: "Mittwoch",
  Thursday: "Donnerstag",
  Friday: "Freitag",
  Saturday: "Samstag",
  Sunday: "Sonntag",
  Mon: "Mo",
  Tue: "Di",
  Wed: "Mi",
  Thu: "Do",
  Fri: "Fr",
  Sat: "Sa",
  Sun: "So",

  // --- Insight templates (interpolated) ---
  "On nights you hit your sleep target, your rated productivity is about {pct}% higher.":
    "In Nächten, in denen du dein Schlafziel erreichst, ist deine bewertete Produktivität etwa {pct}% höher.",
  "Your productivity ratings don't rise with more sleep in this window — the pattern is weak so far.":
    "Deine Produktivitätswerte steigen in diesem Zeitraum nicht mit mehr Schlaf — das Muster ist bislang schwach.",
  "Your mood averages {diff} points higher (out of 10) on days you train.":
    "Deine Stimmung liegt an Trainingstagen im Schnitt {diff} Punkte höher (von 10).",
  "On days with a workout your Life Score is on average {diff} points higher.":
    "An Tagen mit Training ist dein Life Score im Schnitt {diff} Punkte höher.",
  "Your strongest days recently tend to be {a} and {b}.":
    "Deine stärksten Tage sind zuletzt meist {a} und {b}.",
  "{day}s show your reduce-habits about {pct}% above your average.":
    "An {day}en liegen deine Reduzier-Gewohnheiten etwa {pct}% über deinem Schnitt.",
  "Your 7-day Life Score is up {diff} points versus the week before — momentum is building.":
    "Dein 7-Tage-Life-Score ist {diff} Punkte höher als in der Vorwoche — der Schwung wächst.",
  "Your 7-day Life Score is down {diff} points versus the week before.":
    "Dein 7-Tage-Life-Score ist {diff} Punkte niedriger als in der Vorwoche.",
  "Not enough data yet for reliable insights. Keep logging — patterns appear after a couple of weeks.":
    "Noch nicht genug Daten für verlässliche Insights. Trage weiter ein — Muster zeigen sich nach ein paar Wochen.",

  // --- Experiments (retrospective) ---
  "last {n} days": "letzte {n} Tage",
  "Optional — a name is generated if you leave this empty.":
    "Optional — wenn leer, wird automatisch ein Name erzeugt.",
  "e.g. Sleep vs. productivity": "z. B. Schlaf vs. Produktivität",
  "Analyze the last N days": "Die letzten N Tage auswerten",
  "Looks back over your existing history, so results appear right away.":
    "Wertet deine bestehende Historie aus, dadurch erscheinen Ergebnisse sofort.",

  // --- Day-flow overlays ---
  "End of day": "Tagesabschluss",
  Skip: "Überspringen",
  "Did you reach today's goals?": "Hast du deine heutigen Ziele erreicht?",
  "Bad habits kept in check?": "Schlechte Gewohnheiten im Griff?",
  "How was your day?": "Wie war dein Tag?",
  "Your day at a glance": "Dein Tag auf einen Blick",
  "Compared to yesterday": "Vergleich zum Vortag",
  "One more journal note?": "Noch ein Tagebuch-Eintrag?",
  "Tick what you actually did. Nothing here overwrites earlier entries.":
    "Hak ab, was du wirklich gemacht hast. Nichts hier überschreibt frühere Einträge.",
  "No score for yesterday to compare against yet.":
    "Noch kein Score von gestern zum Vergleichen.",
  Yesterday: "Gestern",
  points: "Punkte",
  "Right on par with yesterday.": "Genau auf dem Niveau von gestern.",
  "A stronger day than yesterday — nice work.":
    "Ein stärkerer Tag als gestern — stark gemacht.",
  "A quieter day than yesterday. Tomorrow's a fresh start.":
    "Ein ruhigerer Tag als gestern. Morgen ist ein neuer Anfang.",
  "Optional — a sentence about today. Existing journal entries are untouched.":
    "Optional — ein Satz zum heutigen Tag. Bestehende Tagebuch-Einträge bleiben unangetastet.",
  "What's worth remembering about today?": "Was ist an heute erinnerungswürdig?",
  "Log last night's sleep, {name}.": "Trag den Schlaf der letzten Nacht ein, {name}.",
  "Log last night's sleep.": "Trag den Schlaf der letzten Nacht ein.",

  // --- Settings: daily routines & feedback ---
  "Daily routines": "Tägliche Abläufe",
  "Short guided screens that pop up once a day to help you log quickly. They never remove anything you already entered.":
    "Kurze geführte Screens, die einmal am Tag erscheinen, damit du schnell einträgst. Sie löschen nie etwas, das du schon eingetragen hast.",
  "End-of-day wrap-up": "Tagesabschluss",
  "Goals, check-in, day recap & journal.": "Ziele, Check-in, Tagesrückblick & Tagebuch.",
  From: "Von",
  Until: "Bis",
  "Good-morning sleep prompt": "Guten-Morgen-Schlaf-Abfrage",
  "Just logs last night's sleep.": "Trägt nur den Schlaf der letzten Nacht ein.",
  "Bugs & feedback": "Fehler & Feedback",
  "Hit a bug or have an idea? Send it straight to the developer — this opens your email app.":
    "Fehler entdeckt oder eine Idee? Schick es direkt an den Entwickler — das öffnet deine E-Mail-App.",
  "Idea / feedback": "Idee / Feedback",
  "Bug report": "Fehlerbericht",
  "What happened? What did you expect?": "Was ist passiert? Was hast du erwartet?",
  "What would make this better?": "Was würde es besser machen?",
  "Send email": "E-Mail senden",
  "Sent from Life Dashboard": "Gesendet aus Life Dashboard",

  // --- Recap animations ---
  "Weekly recap": "Wochenrückblick",
  "Monthly recap": "Monatsrückblick",
  "Average Life Score": "Durchschnittlicher Life Score",
  "Days logged": "Tage eingetragen",
  "Avg sleep": "Ø Schlaf",
  "Top area": "Top-Bereich",
  "Habit completion": "Gewohnheiten erfüllt",
  "Nice!": "Stark!",
  "Play recap": "Rückblick abspielen",
  "Weekly & monthly recap": "Wochen- & Monatsrückblick",
  "An animated summary on Sundays and the 1st.": "Eine animierte Zusammenfassung sonntags und am 1.",
  // --- Journal: mood heatmap, prompts, dictation, reflection ---
  "Mood over the year": "Stimmung übers Jahr",
  Shuffle: "Mischen",
  Dictate: "Diktieren",
  "Listening… tap to stop": "Höre zu … zum Stoppen tippen",
  "Coach reflection": "Coach-Reflexion",
  Reflect: "Reflektieren",
  "Save the entry, then get a short, kind reflection.": "Speichere den Eintrag und hol dir eine kurze, freundliche Reflexion.",
  "Let the AI coach reflect on your entries (needs journal access).": "Lass den KI-Coach über deine Einträge reflektieren (braucht Tagebuch-Zugriff).",
  "Let the coach read my journal": "Coach darf mein Tagebuch lesen",
  "Shares recent entries (text, mood, tags) so the coach can reflect on them. Off = only mood/tag summaries.":
    "Teilt aktuelle Einträge (Text, Stimmung, Tags), damit der Coach darüber reflektieren kann. Aus = nur Stimmungs-/Tag-Zusammenfassungen.",
  "What went well today, and why?": "Was lief heute gut, und warum?",
  "What drained you today, and what could soften it tomorrow?": "Was hat dich heute ausgelaugt, und was könnte es morgen abmildern?",
  "What are you grateful for right now?": "Wofür bist du gerade dankbar?",
  "What's one small win you can build on?": "Was ist ein kleiner Erfolg, auf dem du aufbauen kannst?",
  "What did you learn about yourself today?": "Was hast du heute über dich gelernt?",
  "What's taking up most of your headspace?": "Was beschäftigt dich am meisten?",
  "If today had a title, what would it be?": "Wenn der heutige Tag einen Titel hätte, welcher wäre es?",
  "What would make tomorrow a good day?": "Was würde morgen zu einem guten Tag machen?",
  "Who or what lifted your mood today?": "Wer oder was hat heute deine Stimmung gehoben?",
  "What's one thing you'd do differently?": "Was würdest du anders machen?",
  "What are you avoiding, and why?": "Was vermeidest du gerade, und warum?",
  "When did you feel most like yourself today?": "Wann hast du dich heute am meisten wie du selbst gefühlt?",
  "What's a worry you can let go of?": "Welche Sorge kannst du loslassen?",
  "What progress, however small, did you make toward a goal?": "Welchen – auch kleinen – Fortschritt hast du Richtung eines Ziels gemacht?",
  "What does your body need more of this week?": "Wovon braucht dein Körper diese Woche mehr?",
  // --- Guided weekly review ---
  "Weekly review": "Wochenreflexion",
  "Time for your weekly review": "Zeit für deine Wochenreflexion",
  "Take two minutes to reflect on your week.": "Nimm dir zwei Minuten, um über deine Woche nachzudenken.",
  "What went well this week?": "Was lief diese Woche gut?",
  "Wins, big or small. What are you proud of?": "Erfolge, groß oder klein. Worauf bist du stolz?",
  "e.g. Trained three times, stuck to my sleep routine…": "z. B. Dreimal trainiert, Schlafroutine durchgezogen …",
  "What was challenging?": "Was war herausfordernd?",
  "What got in the way, and what did you learn?": "Was kam dir in die Quere und was hast du gelernt?",
  "e.g. Skipped workouts when work got busy…": "z. B. Training ausgelassen, als es stressig wurde …",
  "How did the week feel overall?": "Wie hat sich die Woche insgesamt angefühlt?",
  "Your focus for next week": "Dein Fokus für nächste Woche",
  "One or two things you want to prioritise. You'll see this at your next review.":
    "Ein, zwei Dinge, die du priorisieren willst. Du siehst sie bei deiner nächsten Reflexion.",
  "e.g. Protect my mornings, one more workout…": "z. B. Morgen schützen, ein Training mehr …",
  "Finish review": "Reflexion abschließen",
  "Last week's focus:": "Fokus letzte Woche:",
  Meh: "Naja",
  Okay: "Okay",
  Good: "Gut",
  Great: "Super",
  "Start review": "Reflexion starten",
  "Edit review": "Reflexion bearbeiten",
  "A guided two-minute reflection on your week. Do it any time, or wait for the Sunday nudge.":
    "Eine geführte Zwei-Minuten-Reflexion über deine Woche. Jederzeit oder mit dem Sonntags-Hinweis.",
  "Week of {d}": "Woche vom {d}",
  "Focus:": "Fokus:",
  // --- AI coach ---
  Coach: "Coach",
  Send: "Senden",
  "AI coach": "KI-Coach",
  "Your AI coach": "Dein KI-Coach",
  "Open coach": "Coach öffnen",
  "Enable AI coach": "KI-Coach aktivieren",
  "Your data, interpreted. Ask anything.": "Deine Daten, interpretiert. Frag alles.",
  "Ask about your week, your patterns and what to focus on. Your app analyses the numbers first — the coach only interprets the results.":
    "Frag nach deiner Woche, deinen Mustern und worauf du dich konzentrieren solltest. Deine App wertet die Zahlen zuerst aus — der Coach interpretiert nur die Ergebnisse.",
  "Only derived summaries are sent (scores, trends, habit names, the engine's findings) — never your journal text, health notes or finance amounts. You can turn this off any time in Settings.":
    "Es werden nur abgeleitete Zusammenfassungen gesendet (Scores, Trends, Gewohnheitsnamen, die Erkenntnisse der Engine) — niemals dein Tagebuchtext, Gesundheitsnotizen oder Finanzbeträge. Du kannst das jederzeit in den Einstellungen abschalten.",
  "A chat that interprets your data. Only derived summaries are sent — never your journal, health notes or finance amounts.":
    "Ein Chat, der deine Daten interpretiert. Es werden nur abgeleitete Zusammenfassungen gesendet — niemals dein Tagebuch, Gesundheitsnotizen oder Finanzbeträge.",
  "Needs a free Groq API key set as GROQ_API_KEY in your Vercel project. The key stays on the server and is never exposed in the app.":
    "Benötigt einen kostenlosen Groq-API-Key als GROQ_API_KEY in deinem Vercel-Projekt. Der Key bleibt auf dem Server und wird nie in der App sichtbar.",
  "One-time setup": "Einmalige Einrichtung",
  "The coach needs a free Groq API key, stored securely on the server (never in the app).":
    "Der Coach braucht einen kostenlosen Groq-API-Key, sicher auf dem Server gespeichert (nie in der App).",
  "Create a free key at console.groq.com → API Keys.": "Erstelle einen kostenlosen Key auf console.groq.com → API Keys.",
  "In Vercel → your project → Settings → Environment Variables, add GROQ_API_KEY with that value.":
    "In Vercel → dein Projekt → Settings → Environment Variables GROQ_API_KEY mit diesem Wert hinzufügen.",
  "Redeploy the project, then tap Re-check below.": "Projekt neu deployen, dann unten auf Erneut prüfen tippen.",
  "Re-check": "Erneut prüfen",
  // --- About you questionnaire ---
  "Answer at your own pace — the more the coach knows, the better its advice.":
    "Beantworte in deinem Tempo — je mehr der Coach weiß, desto besser sein Rat.",
  "These answers stay on your device (and sync if you enabled it). They're only shared with the AI coach when it's turned on, so it can tailor its advice to you.":
    "Diese Antworten bleiben auf deinem Gerät (und synchronisieren, falls aktiviert). Sie werden nur an den KI-Coach weitergegeben, wenn er eingeschaltet ist, damit er seinen Rat auf dich zuschneiden kann.",
  "You can edit any of this any time.": "Du kannst all das jederzeit ändern.",
  Later: "Später",
  "Tell your coach about you": "Erzähl deinem Coach von dir",
  "Optional — answer what you like now, or do it later under 'About you'. It helps the AI coach give advice that fits you.":
    "Optional — beantworte jetzt, was du magst, oder später unter Über dich. Es hilft dem KI-Coach, dir passenden Rat zu geben.",
  "Your answer…": "Deine Antwort …",
  "Goals & motivation": "Ziele & Motivation",
  "Training & body": "Training & Körper",
  "Work & focus": "Arbeit & Fokus",
  "Mind & mood": "Kopf & Stimmung",
  "What's your current situation?": "Was ist deine aktuelle Situation?",
  Pupil: "Schüler:in",
  Student: "Student:in",
  Working: "Berufstätig",
  "Self-employed": "Selbstständig",
  "Between things": "Dazwischen",
  Retired: "Im Ruhestand",
  "What do you do (job, studies, field)?": "Was machst du (Beruf, Studium, Bereich)?",
  "e.g. Second-year CS student, part-time barista": "z. B. Informatik im 2. Jahr, nebenbei Barista",
  "How would you describe yourself in a few words?": "Wie würdest du dich in wenigen Worten beschreiben?",
  "Anything going on right now the coach should factor in?": "Gibt es gerade etwas, das der Coach berücksichtigen sollte?",
  "e.g. Recovering from surgery — no training for 2 weeks; big exam next Friday":
    "z. B. Nach OP — 2 Wochen kein Training; große Prüfung nächsten Freitag",
  "What are you most trying to improve right now?": "Was möchtest du gerade am meisten verbessern?",
  "What does a great week look like for you?": "Wie sieht für dich eine großartige Woche aus?",
  "What tends to hold you back?": "Was hält dich oft zurück?",
  "What's your training background and current routine?": "Was ist dein Trainingshintergrund und deine aktuelle Routine?",
  "What are your fitness goals?": "Was sind deine Fitnessziele?",
  "Any injuries or physical limitations to keep in mind?": "Verletzungen oder körperliche Einschränkungen, die man beachten sollte?",
  "Any health conditions or things that affect your energy?": "Gesundheitliche Themen oder Dinge, die deine Energie beeinflussen?",
  "How is your sleep usually?": "Wie ist dein Schlaf normalerweise?",
  "How would you describe your eating habits?": "Wie würdest du deine Essgewohnheiten beschreiben?",
  "What are your work or study commitments like?": "Wie sehen deine Arbeits- oder Studienverpflichtungen aus?",
  "When and where do you focus best?": "Wann und wo kannst du dich am besten konzentrieren?",
  "How are your stress and mood lately?": "Wie sind Stress und Stimmung in letzter Zeit?",
  "What helps you feel your best?": "Was hilft dir, dich am besten zu fühlen?",
  // --- Inline AI insight ---
  "AI summary": "KI-Zusammenfassung",
  "AI interpretation": "KI-Deutung",
  Regenerate: "Neu erzeugen",
  Generate: "Erzeugen",
  "Try again": "Erneut versuchen",
  "Turn on the AI coach for a personal take on this.": "Aktiviere den KI-Coach für eine persönliche Einschätzung dazu.",
  "Get a personalised read on this from your coach.": "Hol dir eine persönliche Einschätzung von deinem Coach.",
  // --- Character / avatar ---
  Character: "Charakter",
  "Build your look and unlock cosmetics as you level up.": "Gestalte deinen Look und schalte Cosmetics beim Aufsteigen frei.",
  Randomize: "Zufällig",
  Skin: "Haut",
  Hair: "Haare",
  "Hair colour": "Haarfarbe",
  Face: "Gesicht",
  Shirt: "Shirt",
  Hat: "Hut",
  Glasses: "Brille",
  "Lvl {n}": "Lvl {n}",
  Bald: "Glatze",
  Short: "Kurz",
  Buzz: "Stoppel",
  Long: "Lang",
  Curly: "Lockig",
  "Top bun": "Dutt",
  Afro: "Afro",
  Mohawk: "Irokese",
  Happy: "Fröhlich",
  Neutral: "Neutral",
  Cool: "Cool",
  Wink: "Zwinkern",
  "No hat": "Kein Hut",
  Cap: "Cap",
  Beanie: "Mütze",
  "Party hat": "Partyhut",
  Crown: "Krone",
  Sunglasses: "Sonnenbrille",
  // --- Rewards ---
  Rewards: "Belohnungen",
  Apply: "Anwenden",
  "Level {n}": "Level {n}",
  "Unlock accent themes as you level up. Purely cosmetic.": "Schalte Akzent-Themes beim Aufsteigen frei. Rein kosmetisch.",
  Sunset: "Sonnenuntergang",
  Forest: "Wald",
  Rose: "Rosé",
  Centurion: "Zenturio",
  "Log 100 workouts": "100 Workouts eintragen",
  Storyteller: "Geschichtenerzähler",
  "Write 100 journal entries": "100 Tagebuch-Einträge schreiben",
  Century: "Hundert",
  "100-day activity streak": "100-Tage-Aktivitätsserie",
  Reflective: "Nachdenklich",
  "Complete 4 weekly reviews": "4 Wochenreflexionen abschließen",
  // --- Gamification: level & challenges ---
  Level: "Level",
  "total XP": "Gesamt-XP",
  "XP to level {n}": "XP bis Level {n}",
  Beginner: "Anfänger",
  Builder: "Aufbauer",
  Committed: "Engagiert",
  Veteran: "Veteran",
  Master: "Meister",
  "This week's challenges": "Challenges dieser Woche",
  "All challenges done this week 🎉": "Alle Challenges diese Woche geschafft 🎉",
  done: "erledigt",
  "Train {n}× this week": "{n}× trainieren diese Woche",
  "Log all 7 days": "Alle 7 Tage eintragen",
  "Average {h}h sleep": "Ø {h} h Schlaf",
  "Hit {n}% of your habits": "{n}% deiner Gewohnheiten schaffen",
  "Write 3 journal entries": "3 Tagebuch-Einträge schreiben",
  "Check in on 5 days": "An 5 Tagen einchecken",
  "Complete a challenge, then claim it for {n} XP.": "Schließe eine Challenge ab und sichere dir {n} XP.",
  "Claim {n} XP": "{n} XP sichern",
  // --- Daily quests ---
  "Today's quests": "Heutige Quests",
  "Small daily tasks — claim each for {n} points.": "Kleine Tagesaufgaben – sichere dir je {n} Punkte.",
  "Claim {n} pts": "{n} Pkt sichern",
  "Complete {n} habits today": "Erledige heute {n} Gewohnheiten",
  "Complete every habit today": "Erledige heute alle Gewohnheiten",
  "Do today's check-in": "Mach heute deinen Check-in",
  "Log your sleep": "Trag deinen Schlaf ein",
  "Write a journal entry": "Schreib einen Tagebuch-Eintrag",
  "Log a workout": "Trag ein Training ein",
  "Finish your morning focus": "Schließe deinen Morgen-Fokus ab",
  "Avoid your watch-list today": "Vermeide heute deine Beobachtungsliste",
  // --- Cosmetics / reward shop ---
  Cosmetics: "Kosmetik",
  "Unlock accent themes by leveling up or buying them in the Reward shop. Purely cosmetic.":
    "Schalte Akzent-Themes durch Aufsteigen frei oder kaufe sie im Belohnungsshop. Rein kosmetisch.",
  "Spend points on accent themes. Purely cosmetic — they never touch your data or score.":
    "Gib Punkte für Akzent-Themes aus. Rein kosmetisch – sie beeinflussen weder deine Daten noch deinen Score.",
  Owned: "Freigeschaltet",
  Buy: "Kaufen",
  Ocean: "Ozean",
  Mint: "Minze",
  Gold: "Gold",
  Grape: "Traube",
  Crimson: "Karmesin",
  Midnight: "Mitternacht",
  // --- Score-ring skins ---
  "Score-ring skins": "Score-Ring-Skins",
  "Restyle the big Life Score ring on your dashboard. Purely cosmetic.":
    "Gib dem großen Life-Score-Ring auf deinem Dashboard einen neuen Look. Rein kosmetisch.",
  Classic: "Klassisch",
  Ember: "Glut",
  Neon: "Neon",
  Prism: "Prisma",
  // --- Titles & badges ---
  Titles: "Titel",
  "Wear a title next to your level. Purely cosmetic.": "Trag einen Titel neben deinem Level. Rein kosmetisch.",
  "Clear title": "Titel entfernen",
  Badges: "Abzeichen",
  "Pin an emoji badge next to your level. Purely cosmetic.": "Hefte ein Emoji-Abzeichen neben dein Level. Rein kosmetisch.",
  "Clear badge": "Abzeichen entfernen",
  "Rising Star": "Aufsteiger",
  "Early Bird": "Frühaufsteher",
  "Night Owl": "Nachteule",
  "Iron-Willed": "Eiserner Wille",
  "Zen Master": "Zen-Meister",
  Relentless: "Unerbittlich",
  "The Machine": "Die Maschine",
  "Living Legend": "Lebende Legende",
  Flame: "Flamme",
  Star: "Stern",
  Bolt: "Blitz",
  Sparkle: "Funkeln",
  Rocket: "Rakete",
  Trophy: "Trophäe",
  Diamond: "Diamant",
  // --- Dashboard activity ---
  Activity: "Aktivität",
  "Calendar →": "Kalender →",
  "Logged (no score)": "Eingetragen (kein Score)",
  // --- Density ---
  Density: "Dichte",
  Cozy: "Gemütlich",
  Compact: "Kompakt",
  // --- Nav pinning ---
  "Pin to bar": "An Leiste anheften",
  Unpin: "Lösen",
  "Tap the star to pin a page to the bottom bar.": "Tippe den Stern, um eine Seite an die untere Leiste anzuheften.",
  // --- Command palette / quick add ---
  "Quick add": "Schnell erfassen",
  "Search or jump to…": "Suchen oder springen …",
  "No matches.": "Keine Treffer.",
  "Undo": "Rückgängig",
  "Mark done": "Als erledigt markieren",
  Go: "Öffnen",
  "Coach briefing": "Coach-Briefing",
  "Plan my day": "Meinen Tag planen",
  "Planning…": "Plane …",
  "Ask me anything about your data.": "Frag mich alles über deine Daten.",
  "Ask your coach…": "Frag deinen Coach …",
  "AI can be wrong. Interprets your data, not medical or financial advice.":
    "KI kann sich irren. Interpretiert deine Daten, keine medizinische oder finanzielle Beratung.",
  "How is my week going?": "Wie läuft meine Woche?",
  "Why was my score lower recently?": "Warum war mein Score zuletzt niedriger?",
  "What should I prioritise tomorrow?": "Was sollte ich morgen priorisieren?",
  "Which habits help me the most?": "Welche Gewohnheiten helfen mir am meisten?",
  "What negative patterns do you see?": "Welche negativen Muster erkennst du?",
  "The AI coach isn't set up yet. Add your Groq API key (see setup below).":
    "Der KI-Coach ist noch nicht eingerichtet. Füge deinen Groq-API-Key hinzu (siehe Einrichtung unten).",
  "The free AI limit was hit for now — try again in a minute.":
    "Das kostenlose KI-Limit ist vorerst erreicht — versuch es in einer Minute erneut.",
  "The AI provider returned an error. Try again shortly.": "Der KI-Anbieter hat einen Fehler gemeldet. Versuch es gleich nochmal.",
  "Couldn't reach the AI service. Check your connection and try again.":
    "Der KI-Dienst war nicht erreichbar. Prüfe deine Verbindung und versuch es erneut.",
  "The AI didn't return an answer — try rephrasing.": "Die KI hat keine Antwort geliefert — formulier es anders.",
  "Something went wrong with that request.": "Bei dieser Anfrage ist etwas schiefgelaufen.",

  // --- Analysis ---
  Analysis: "Analyse",
  "Everything you log, cross-analysed — patterns, connections and suggestions.":
    "Alles, was du einträgst, kategorienübergreifend ausgewertet — Muster, Zusammenhänge und Vorschläge.",
  "Overall read": "Gesamtbild",
  "vs last week": "ggü. letzter Woche",
  Recommendations: "Empfehlungen",
  "What's working": "Was gut läuft",
  Connections: "Zusammenhänge",
  "Watch-outs": "Worauf achten",
  "Not enough to analyse yet": "Noch zu wenig zum Auswerten",
  "Keep logging days, sleep and workouts — connections appear after a week or two.":
    "Trage weiter Tage, Schlaf und Workouts ein — Zusammenhänge zeigen sich nach ein bis zwei Wochen.",
  "Observations from your own data — associations, not medical or causal advice.":
    "Beobachtungen aus deinen eigenen Daten — Zusammenhänge, keine medizinische oder kausale Beratung.",
  Steady: "Solide",
  Building: "Im Aufbau",
  "Sleep ↔ productivity": "Schlaf ↔ Produktivität",
  "More sleep isn't lifting your productivity in this window — the link is weak so far.":
    "Mehr Schlaf hebt deine Produktivität in diesem Zeitraum nicht — der Zusammenhang ist bisher schwach.",
  "Sleep ↔ mood": "Schlaf ↔ Stimmung",
  "Your mood averages {diff} points higher (out of 10) after hitting your sleep target.":
    "Deine Stimmung ist im Schnitt {diff} Punkte höher (von 10), wenn du dein Schlafziel erreichst.",
  "Training ↔ Life Score": "Training ↔ Life Score",
  "On days you train, your Life Score is on average {diff} points higher.":
    "An Tagen, an denen du trainierst, ist dein Life Score im Schnitt {diff} Punkte höher.",
  "Training ↔ mood": "Training ↔ Stimmung",
  "Your mood runs {diff}/10 higher on training days.":
    "Deine Stimmung ist an Trainingstagen {diff}/10 höher.",
  "Slip days ↔ mood": "Ausrutscher ↔ Stimmung",
  "On days you slip on a reduce-habit, your mood is about {diff}/10 lower.":
    "An Tagen mit einem Ausrutscher bei einer Reduzier-Gewohnheit ist deine Stimmung rund {diff}/10 niedriger.",
  "Journaling ↔ mood": "Tagebuch ↔ Stimmung",
  "Days you journal tend to come with a {diff}/10 higher mood.":
    "Tage mit Tagebuch-Eintrag gehen mit einer {diff}/10 höheren Stimmung einher.",
  "Your biggest lever": "Dein größter Hebel",
  "Days you do “{name}” average {diff} Life-Score points higher than days you don't — protect this one.":
    "Tage mit „{name}“ haben im Schnitt {diff} Life-Score-Punkte mehr als Tage ohne — halt daran fest.",
  "Strongest area": "Stärkster Bereich",
  "{area} is your strongest area lately, averaging {m}/100.":
    "{area} ist zuletzt dein stärkster Bereich mit Ø {m}/100.",
  "Area to lift": "Bereich mit Potenzial",
  "{area} is trailing at {m}/100 — a small, specific habit here would move your overall score most.":
    "{area} hinkt bei {m}/100 hinterher — eine kleine, konkrete Gewohnheit hier würde deinen Gesamt-Score am meisten heben.",
  "{area} is climbing": "{area} steigt",
  "{area} is up {d} points versus the previous week.": "{area} ist {d} Punkte höher als in der Vorwoche.",
  "{area} is slipping": "{area} fällt",
  "{area} dropped {d} points versus the previous week.": "{area} ist {d} Punkte niedriger als in der Vorwoche.",
  "Low adherence": "Niedrige Einhaltung",
  "“{name}” is only at {pct}% lately. Either shrink the goal so it's easy to win, or schedule a fixed time for it.":
    "„{name}“ liegt zuletzt nur bei {pct}%. Verkleinere entweder das Ziel, damit es leicht zu schaffen ist, oder plane eine feste Zeit dafür ein.",
  "Sleep is short": "Schlaf ist knapp",
  "You're averaging {avg} vs your {target} target — about {debt} min short a night. Going to bed {debt} min earlier is the easiest fix.":
    "Du liegst im Schnitt bei {avg} statt deinem Ziel von {target} — etwa {debt} Min pro Nacht zu wenig. {debt} Min früher ins Bett ist die einfachste Lösung.",
  "Irregular bedtime": "Unregelmäßige Schlafenszeit",
  "Your bedtime swings by ±{sd} min. A more regular schedule usually improves sleep quality more than total hours.":
    "Deine Schlafenszeit schwankt um ±{sd} Min. Ein regelmäßigerer Rhythmus verbessert die Schlafqualität meist mehr als die reine Stundenzahl.",
  "Weekday rhythm": "Wochen-Rhythmus",
  "{best} are your strongest days and {worst} your weakest ({gap} points apart). Plan demanding things for {best}.":
    "{best} sind deine stärksten und {worst} deine schwächsten Tage ({gap} Punkte Unterschied). Plane Anspruchsvolles für {best}.",
  "Consistent logging": "Konstantes Eintragen",
  "You've logged {n} days in a row — consistency is what makes all of this analysis sharper.":
    "Du hast {n} Tage in Folge eingetragen — Konstanz macht diese ganze Analyse schärfer.",
  "Log a week or two of days and this analysis fills in with cross-connections and suggestions.":
    "Trage ein bis zwei Wochen ein, dann füllt sich diese Analyse mit Querverbindungen und Vorschlägen.",
  "trending up": "steigend",
  "trending down": "fallend",
  "holding steady": "stabil",
  "Your 7-day score is {score} ({trend}).": "Dein 7-Tage-Score liegt bei {score} ({trend}).",
  "Working for you: {s}": "Das läuft für dich: {s}",
  "Focus next: {w}": "Als Nächstes im Fokus: {w}",

  // --- Analysis (deeper generators) ---
  strong: "stark",
  trained: "trainiert",
  "slept enough": "genug geschlafen",
  journaled: "Tagebuch geschrieben",
  "Sleep → next day": "Schlaf → nächster Tag",
  "After a night hitting your sleep target, the next day's productivity runs about {pct}% higher.":
    "Nach einer Nacht mit erreichtem Schlafziel ist die Produktivität am Folgetag rund {pct}% höher.",
  "Sleep quality ↔ energy": "Schlafqualität ↔ Energie",
  "On nights you rate sleep 7+/10, your energy the next morning is {diff}/10 higher.":
    "In Nächten mit Schlafqualität 7+/10 ist deine Energie am nächsten Morgen {diff}/10 höher.",
  "Morning energy ↔ day": "Morgenenergie ↔ Tag",
  "Days you wake up with 7+/10 energy end with a Life Score about {diff} points higher.":
    "Tage, an denen du mit 7+/10 Energie aufwachst, enden mit einem rund {diff} Punkte höheren Life Score.",
  "Training → next-day energy": "Training → Energie am Folgetag",
  "The day after you train, your energy is {diff}/10 higher.":
    "Am Tag nach dem Training ist deine Energie {diff}/10 höher.",
  "Your winning combo": "Deine Gewinner-Kombi",
  "Days with both enough sleep and a workout beat days with neither by {diff} Life-Score points. Stacking these two is your strongest routine.":
    "Tage mit genug Schlaf UND Training liegen {diff} Life-Score-Punkte über Tagen mit keinem von beidem. Diese Kombi ist deine stärkste Routine.",
  "Weekend vs weekday": "Wochenende vs. Wochentag",
  "Your weekends score {diff} points higher than weekdays — the structure of your days off is working.":
    "Deine Wochenenden liegen {diff} Punkte über den Wochentagen — die Struktur deiner freien Tage funktioniert.",
  "Your weekends score {diff} points lower than weekdays — they might need a little more structure.":
    "Deine Wochenenden liegen {diff} Punkte unter den Wochentagen — etwas mehr Struktur könnte helfen.",
  "{a} and {b} rise and fall together in your data ({strength} link) — lifting one tends to lift the other.":
    "{a} und {b} steigen und fallen in deinen Daten gemeinsam ({strength} Zusammenhang) — hebst du eines, hebt sich meist auch das andere.",
  "When your {a} is high, your {b} tends to be lower ({strength} link) — worth watching the trade-off.":
    "Wenn dein {a} hoch ist, ist dein {b} tendenziell niedriger ({strength} Zusammenhang) — der Trade-off lohnt einen Blick.",
  "Costliest habit": "Teuerste Gewohnheit",
  "“{name}” days come with a {diff}/10 mood drop — the reduce-habit worth tackling first.":
    "„{name}“-Tage gehen mit einem Stimmungsabfall von {diff}/10 einher — die Reduzier-Gewohnheit, die du zuerst angehen solltest.",
  "What your best days share": "Was deine besten Tage gemeinsam haben",
  "On your top days you {label} {top}% of the time — versus {base}% overall. That's your highest-leverage routine.":
    "An deinen besten Tagen hast du zu {top}% {label} — gegenüber {base}% insgesamt. Das ist deine wirkungsvollste Routine.",
  "A weak weekday": "Ein schwacher Wochentag",
  "{day}s show your reduce-habits about {pct}% above your average — plan a countermeasure for that day.":
    "An {day}en liegen deine Reduzier-Gewohnheiten rund {pct}% über deinem Schnitt — plane für den Tag eine Gegenmaßnahme.",

  // --- Health area ---
  "Wellbeing & symptoms": "Wohlbefinden & Beschwerden",
  Form: "Formular",
  Questions: "Fragen",
  "Health is tracked and correlated with the rest of your data, but never counts toward your Life Score.":
    "Gesundheit wird getrackt und mit deinen übrigen Daten verknüpft, zählt aber nie zum Life Score.",
  "Daily health check": "Täglicher Gesundheits-Check",
  Symptoms: "Beschwerden",
  "Felt sick today": "Heute krank gefühlt",
  "Water (glasses)": "Wasser (Gläser)",
  // --- Health deepening: recovery, meds, cycle ---
  None: "Keine",
  Enable: "Aktivieren",
  "Turn off": "Ausschalten",
  day: "Tag",
  days: "Tage",
  Heavy: "Stark",
  "Recovery day": "Ruhetag",
  "Recovery days don't break your streaks — rest up.": "Ruhetage brechen deine Serien nicht — erhol dich.",
  "Menstrual flow": "Menstruationsstärke",
  Water: "Wasser",
  "Set a daily water goal to track your glasses.": "Setze ein tägliches Wasserziel, um deine Gläser zu tracken.",
  glasses: "Gläser",
  "Daily goal reached 🎉": "Tagesziel erreicht 🎉",
  "Tap the level, or None.": "Tippe die Stärke an oder Keine.",
  "Normal day": "Normaler Tag",
  "Medications & supplements": "Medikamente & Nahrungsergänzung",
  "Tap what you took": "Tippe an, was du genommen hast",
  "e.g. Vitamin D, Iron…": "z. B. Vitamin D, Eisen …",
  "Add the medications or supplements you take, then tick them off each day in your health check.":
    "Füge deine Medikamente oder Nahrungsergänzungen hinzu und hake sie täglich im Gesundheits-Check ab.",
  "Last 14 days · filled = taken.": "Letzte 14 Tage · gefüllt = genommen.",
  "Cycle tracking": "Zyklus-Tracking",
  "Track your menstrual cycle to log flow and see an estimated next period. Off by default.":
    "Verfolge deinen Menstruationszyklus, um die Stärke einzutragen und die nächste Periode zu schätzen. Standardmäßig aus.",
  Cycle: "Zyklus",
  "Log your flow on the days it happens to start seeing predictions here.":
    "Trage die Stärke an den Tagen ein, an denen sie auftritt, um hier Vorhersagen zu sehen.",
  "Cycle day": "Zyklustag",
  "Avg length": "Ø Länge",
  "Next (est.)": "Nächste (geschätzt)",
  "Last period": "Letzte Periode",
  "Recent periods": "Letzte Perioden",
  "in {n} days": "in {n} Tagen",
  "Estimates from your logs — not medical advice.": "Schätzungen aus deinen Einträgen — keine medizinische Beratung.",
  "Overall wellbeing": "Allgemeines Wohlbefinden",
  "Wellbeing · last 30 days": "Wohlbefinden · letzte 30 Tage",
  Wellbeing: "Wohlbefinden",
  "Log a few days to see your wellbeing trend.": "Trage ein paar Tage ein, um deinen Wohlbefinden-Trend zu sehen.",
  "How do you feel today?": "Wie fühlst du dich heute?",
  "Any symptoms?": "Irgendwelche Beschwerden?",
  "Were you sick today?": "Warst du heute krank?",
  "Anything to note?": "Etwas zu notieren?",
  "Tap to add · tap again for stronger.": "Tippen zum Hinzufügen · nochmal tippen für stärker.",
  "No, fine": "Nein, alles gut",
  "Yes, sick": "Ja, krank",
  // symptoms
  Headache: "Kopfschmerzen",
  "Stomach ache": "Bauchschmerzen",
  "Sore throat": "Halsschmerzen",
  Congestion: "Verstopfte Nase",
  Nausea: "Übelkeit",
  Dizziness: "Schwindel",
  "Back pain": "Rückenschmerzen",
  "Muscle soreness": "Muskelkater",
  Fatigue: "Erschöpfung",
  Cough: "Husten",
  Fever: "Fieber",
  Cramps: "Krämpfe",
  Mild: "leicht",
  Moderate: "mittel",
  // health analysis
  "Wellbeing ↔ your day": "Wohlbefinden ↔ dein Tag",
  "On days you feel well (7+/10), your Life Score is about {diff} points higher.":
    "An Tagen mit gutem Wohlbefinden (7+/10) ist dein Life Score rund {diff} Punkte höher.",
  "Symptoms ↔ productivity": "Beschwerden ↔ Produktivität",
  "On days with symptoms, your productivity runs about {pct}% lower.":
    "An Tagen mit Beschwerden ist deine Produktivität rund {pct}% niedriger.",
  "Sleep ↔ symptoms": "Schlaf ↔ Beschwerden",
  "After nights you hit your sleep target, you log fewer symptoms on average.":
    "Nach Nächten mit erreichtem Schlafziel trägst du im Schnitt weniger Beschwerden ein.",
  "Feeling well": "Gutes Wohlbefinden",

  // --- Streak protection / rest days ---
  "Streak protection": "Streak-Schutz",
  "Rest days and a grace window keep a good streak alive when you take a break or forget to log.":
    "Ruhetage und ein Kulanzfenster halten eine gute Serie am Leben, wenn du pausierst oder das Eintragen vergisst.",
  "Grace days": "Kulanztage",
  "Missed days a streak tolerates before it breaks.": "Verpasste Tage, die eine Serie verkraftet, bevor sie reißt.",
  "Rest days (e.g. vacation)": "Ruhetage (z. B. Urlaub)",
  "Until (optional)": "Bis (optional)",

  // --- Morning focus ---
  "Today's focus": "Fokus für heute",
  "Pick up to three things that would make today a win.": "Wähle bis zu drei Dinge, die den Tag zum Erfolg machen.",
  Focus: "Fokus",
  "up to +2 score": "bis zu +2 Punkte",
  optional: "optional",

  // --- Correlation explorer ---
  "Correlation explorer": "Korrelations-Explorer",
  "Pick any two things you track and see how they move together.":
    "Wähle zwei beliebige Werte und sieh, wie sie zusammenhängen.",
  Horizontal: "Horizontal",
  Vertical: "Vertikal",
  "Not enough overlapping days for these two yet.": "Noch zu wenige gemeinsame Tage für diese beiden.",
  "Sleep (h)": "Schlaf (h)",
  "Sleep quality": "Schlafqualität",
  weak: "schwacher",
  "little to no": "kaum ein",
  "Little to no relationship between {a} and {b}.": "Kaum ein Zusammenhang zwischen {a} und {b}.",
  "{strength} positive link — higher {a} tends to go with higher {b}.":
    "{strength} positiver Zusammenhang — höheres {a} geht meist mit höherem {b} einher.",
  "{strength} inverse link — higher {a} tends to go with lower {b}.":
    "{strength} gegenläufiger Zusammenhang — höheres {a} geht meist mit niedrigerem {b} einher.",

  // --- Suggested experiments ---
  "Suggested for you": "Für dich vorgeschlagen",
  "Based on what you already track — start one with a tap.": "Basierend auf dem, was du schon trackst — mit einem Tipp starten.",
  Start: "Starten",
  "Before midnight = more productive?": "Vor Mitternacht = produktiver?",
  "More sleep = better mood?": "Mehr Schlaf = bessere Stimmung?",
  "Training lifts my day": "Training hebt meinen Tag",
  "Going to bed before 00:00 makes me more productive.": "Vor 00:00 ins Bett macht mich produktiver.",
  "≥7:30 of sleep lifts my mood.": "≥7:30 Schlaf hebt meine Stimmung.",
  "My Life Score is higher on days I train.": "Mein Life Score ist an Trainingstagen höher.",
  "Training ↔ my sleep": "Training ↔ mein Schlaf",
  "I sleep better on days I train.": "Ich schlafe an Trainingstagen besser.",

  // --- Training records ---
  "Best estimated one-rep max per exercise.": "Bester geschätzter 1RM pro Übung.",
  "New PR": "Neuer Rekord",

  // --- Goal deadlines ---
  overdue: "überfällig",
  "due today": "heute fällig",
  "{n} days left": "noch {n} Tage",

  "Showing one category — tap it again to show all.": "Zeigt eine Kategorie — nochmal tippen zeigt wieder alle.",

  // --- Mini tour ---
  "Welcome to Life Dashboard": "Willkommen bei Life Dashboard",
  "A private place to track your habits, sport, sleep, mood and more — and see how it all connects. Here's the 30-second tour.":
    "Ein privater Ort für Gewohnheiten, Sport, Schlaf, Stimmung und mehr — und um zu sehen, wie alles zusammenhängt. Hier die 30-Sekunden-Tour.",
  "Log your day": "Trag deinen Tag ein",
  "“Today” is where you tick off habits and do a quick check-in. Missed a day? You can go back and edit any date.":
    "Unter „Heute“ hakst du Gewohnheiten ab und machst einen kurzen Check-in. Tag verpasst? Du kannst jeden Tag nachträglich bearbeiten.",
  "Habits & goals": "Gewohnheiten & Ziele",
  "Build good habits and reduce bad ones — daily, weekly or a number of times per day. Goals hold longer-term milestones with deadlines.":
    "Baue gute Gewohnheiten auf und reduziere schlechte — täglich, wöchentlich oder mehrmals am Tag. Ziele halten längerfristige Meilensteine mit Fristen.",
  "Areas you choose": "Bereiche nach deiner Wahl",
  "Turn areas on or off in Settings — training, sleep, learning, finances, health… Only what matters to you counts toward your Life Score.":
    "Schalte Bereiche in den Einstellungen an/aus — Training, Schlaf, Lernen, Finanzen, Gesundheit… Nur was dir wichtig ist, zählt zum Life Score.",
  "Statistics & Analysis": "Statistik & Analyse",
  "See your trends, and let the Analysis tab surface connections in your data — what lifts your score and what drags it down.":
    "Sieh deine Trends, und lass den Analyse-Tab Zusammenhänge aufdecken — was deinen Score hebt und was ihn runterzieht.",
  "Stay motivated": "Bleib motiviert",
  "Streaks, achievements, animated recaps and an optional scoreboard keep it fun. Everything stays on your device unless you turn on sync.":
    "Serien, Erfolge, animierte Rückblicke und eine optionale Rangliste halten es spannend. Alles bleibt auf deinem Gerät, solange du Sync nicht aktivierst.",
  "Let's go": "Los geht's",
  Next: "Weiter",
  "Show the tour again": "Tour erneut zeigen",

  // --- Body metrics ---
  "Body metrics": "Körpermetrik",
  "Weight today (kg)": "Gewicht heute (kg)",
  Latest: "Aktuell",
  "Set your height in Settings → Profile to see your BMI.": "Trag deine Größe unter Einstellungen → Profil ein, um deinen BMI zu sehen.",
  "Weight · last 90 days": "Gewicht · letzte 90 Tage",
  Underweight: "Untergewicht",
  Normal: "Normal",
  Overweight: "Übergewicht",
  Obese: "Adipositas",

  // --- Templates ---
  "Habit templates": "Gewohnheits-Vorlagen",
  "Add a ready-made habit, then tweak it any way you like.": "Füge eine fertige Gewohnheit hinzu und passe sie beliebig an.",
  "Goal templates": "Ziel-Vorlagen",
  Close: "Schließen",
  "Sport & body": "Sport & Körper",
  "Productivity & mind": "Produktivität & Geist",
  "Cardio / Run": "Cardio / Laufen",
  "10,000 steps": "10.000 Schritte",
  "Stretch / mobility": "Dehnen / Mobilität",
  "Deep work block": "Deep-Work-Block",
  Read: "Lesen",
  "Study / learn a skill": "Lernen / Skill üben",
  Meditate: "Meditieren",
  "Plan tomorrow": "Morgen planen",
  "Drink water": "Wasser trinken",
  "Vitamins / supplements": "Vitamine / Supplements",
  Skincare: "Hautpflege",
  "No fast food": "Kein Fast Food",
  "Excessive social media": "Zu viel Social Media",
  "Late-night screens": "Bildschirm spät abends",
  "Snacking / sweets": "Snacken / Süßes",
  "Strength Training": "Krafttraining",
  "Bench press bodyweight": "Bankdrücken Körpergewicht",
  "Run a 5K": "5 km laufen",
  "Read 12 books this year": "Dieses Jahr 12 Bücher lesen",
  "Save an emergency fund": "Notgroschen aufbauen",
  "Finish a creative project": "Ein kreatives Projekt abschließen",
  // --- Habit library (expanded catalog) ---
  Library: "Bibliothek",
  "Habit library": "Gewohnheits-Bibliothek",
  "Search habits…": "Gewohnheiten suchen…",
  "Sleep & recovery": "Schlaf & Erholung",
  "Health & nutrition": "Gesundheit & Ernährung",
  "Mindfulness & mood": "Achtsamkeit & Stimmung",
  "Money & life": "Geld & Leben",
  Yoga: "Yoga",
  "Walk outside": "Draußen spazieren",
  "Cold shower": "Kalt duschen",
  "Good posture check": "Auf Haltung achten",
  "Learn a language": "Sprache lernen",
  "Single-task, no multitasking": "Fokus statt Multitasking",
  "Practice an instrument": "Instrument üben",
  "Write / create": "Schreiben / erschaffen",
  "In bed by 23:00": "Um 23:00 im Bett",
  "No screens 30 min before bed": "30 Min vor dem Schlafen ohne Bildschirm",
  "Morning sunlight": "Morgens Tageslicht",
  "Wind-down routine": "Abend-Routine zum Runterkommen",
  "Eat vegetables": "Gemüse essen",
  "Cook at home": "Zu Hause kochen",
  Floss: "Zahnseide",
  "Gratitude — 3 good things": "Dankbarkeit – 3 gute Dinge",
  "Breathing exercise": "Atemübung",
  "Time in nature": "Zeit in der Natur",
  "Track expenses": "Ausgaben erfassen",
  "Review budget weekly": "Budget wöchentlich prüfen",
  "Tidy for 10 minutes": "10 Minuten aufräumen",
  "Reach out to a friend": "Bei einem Freund melden",
  Alcohol: "Alkohol",
  "Smoking / vaping": "Rauchen / Vapen",
  "Caffeine after 2pm": "Koffein nach 14 Uhr",
  Doomscrolling: "Doomscrolling",
  Procrastination: "Aufschieben",

  // --- Navigation / search ---
  "Jump to…": "Springe zu…",
  "Search pages…": "Seiten suchen…",
  "Nothing found.": "Nichts gefunden.",
  Areas: "Bereiche",

  // --- Analysis: drivers + more generators + recap highlights ---
  "What drives your score": "Was deinen Score treibt",
  "Average Life-Score difference on days with vs. without each factor.":
    "Durchschnittlicher Life-Score-Unterschied an Tagen mit vs. ohne den jeweiligen Faktor.",
  "Lifts your score": "Hebt deinen Score",
  "Weighs it down": "Zieht ihn runter",
  "Sleep ≥ target": "Schlaf ≥ Ziel",
  "Early bedtime": "Früh ins Bett",
  "Good sleep quality": "Gute Schlafqualität",
  Journaling: "Tagebuch",
  "Early bedtime → next day": "Früh ins Bett → nächster Tag",
  "After an early night (before 00:30), your next-day productivity is about {pct}% higher — even at the same sleep length.":
    "Nach einer frühen Nacht (vor 00:30) ist deine Produktivität am Folgetag rund {pct}% höher — selbst bei gleicher Schlafdauer.",
  "Sleep regularity ↔ energy": "Schlaf-Regelmäßigkeit ↔ Energie",
  "On nights close to your usual bedtime, your energy is {diff}/10 higher — regularity beats the odd long night.":
    "In Nächten nahe deiner üblichen Schlafenszeit ist deine Energie {diff}/10 höher — Regelmäßigkeit schlägt die einzelne lange Nacht.",
  "Training rhythm ↔ mood": "Trainings-Rhythmus ↔ Stimmung",
  "In weeks with 3+ workouts, your average mood is about {pct}% higher than in lighter weeks — the rhythm matters more than any single session.":
    "In Wochen mit 3+ Workouts ist deine Ø-Stimmung rund {pct}% höher als in leichteren Wochen — der Rhythmus zählt mehr als die einzelne Einheit.",
  "Training lifts your energy": "Training hebt deine Energie",
  "Your energy rises {lift}/10 on average from before to after a workout.":
    "Deine Energie steigt im Schnitt um {lift}/10 von vor zu nach dem Training.",
  "Readiness ↔ performance": "Bereitschaft ↔ Leistung",
  "When you feel ready (energy 7+ before training), your session performance is {d}/10 better.":
    "Wenn du dich bereit fühlst (Energie 7+ vor dem Training), ist deine Leistung {d}/10 besser.",
  "A strong workout colours the day": "Ein starkes Training färbt den Tag",
  "After a strong training session (8+/10), you rate the whole day {diff}/10 more satisfying.":
    "Nach einem starken Training (8+/10) bewertest du den ganzen Tag {diff}/10 zufriedener.",
  "Rest days ↔ performance": "Ruhetage ↔ Leistung",
  "Workouts after a rest day are {d}/10 stronger than back-to-back sessions.":
    "Workouts nach einem Ruhetag sind {d}/10 stärker als Einheiten am Stück.",
  "Your back-to-back sessions actually outperform post-rest ones by {d}/10.":
    "Deine Einheiten am Stück sind sogar {d}/10 besser als die nach einem Ruhetag.",
  "Training ↔ that night's sleep": "Training ↔ Schlaf der Nacht",
  "On days you train, you rate that night's sleep {diff}/10 better.":
    "An Tagen mit Training bewertest du den Schlaf der Nacht {diff}/10 besser.",
  "On training days, that night's sleep quality is {diff}/10 lower — watch late or very intense sessions.":
    "An Trainingstagen ist die Schlafqualität der Nacht {diff}/10 niedriger — achte auf späte oder sehr intensive Einheiten.",
  "Journaling → next day": "Tagebuch → nächster Tag",
  "The day after you journal, your mood tends to be {diff}/10 higher.":
    "Am Tag nach einem Tagebuch-Eintrag ist deine Stimmung tendenziell {diff}/10 höher.",
  "Plan fewer, finish more": "Weniger planen, mehr schaffen",
  "On days you schedule more goals your completion falls to {many}% (vs {few}% on lighter days) — fewer, focused goals may serve you better.":
    "An Tagen mit mehr geplanten Zielen fällt deine Erledigungsquote auf {many}% (ggü. {few}% an leichteren Tagen) — weniger, fokussierte Ziele könnten besser sein.",
  "Your keystone habit": "Deine Schlüssel-Gewohnheit",
  "On days you do “{name}”, you complete {pct}% more of your other habits too — it pulls the rest of your day up.":
    "An Tagen mit „{name}“ erledigst du auch {pct}% mehr deiner anderen Gewohnheiten — sie zieht den Rest deines Tages mit hoch.",
  "You bounce back": "Du kommst zurück",
  "The day after a rough day, you tend to score {d} points above your average — a real rebound.":
    "Am Tag nach einem schwachen Tag liegst du meist {d} Punkte über deinem Schnitt — ein echter Rebound.",
  "Watch the downward pull": "Achte auf den Abwärtssog",
  "A rough day tends to be followed by another below-average one ({d} points). A small reset ritual could break the chain.":
    "Auf einen schwachen Tag folgt oft ein weiterer unterdurchschnittlicher ({d} Punkte). Ein kleines Reset-Ritual könnte die Kette brechen.",
  "Score up {n} vs the previous period.": "Score {n} über der Vorperiode.",
  "Score down {n} vs the previous period.": "Score {n} unter der Vorperiode.",
  "Habits strong at {p}%.": "Gewohnheiten stark mit {p}%.",
  "Habit completion dipped to {p}%.": "Gewohnheiten-Quote auf {p}% gefallen.",
  "{n} workouts logged.": "{n} Workouts eingetragen.",
  "Logged every single day.": "Jeden Tag eingetragen.",
  "Sleep ran short of your target.": "Schlaf lag unter deinem Ziel.",

  // --- Exercise picker ---
  "Choose exercise": "Übung wählen",
  "Search exercises…": "Übungen suchen…",
  "Start typing to search.": "Tippe, um zu suchen.",
  Use: "Nutze",

  // --- Training module ---
  "Plan workouts, log sets and track strength progress.":
    "Plane Workouts, tracke Sätze und deinen Kraftfortschritt.",
  Workouts: "Workouts",
  Plans: "Pläne",
  "Your plans": "Deine Pläne",
  "New plan": "Neuer Plan",
  "Edit plan": "Plan bearbeiten",
  "Plan name": "Plan-Name",
  "Create a plan (e.g. Push / Pull / Legs) so you can start a workout in one tap.":
    "Erstelle einen Plan (z. B. Push / Pull / Legs), um ein Workout mit einem Tipp zu starten.",
  "No exercises yet": "Noch keine Übungen",
  "Start workout": "Workout starten",
  Templates: "Vorlagen",
  "Add a ready-made split, then customise it.": "Füge einen fertigen Split hinzu und passe ihn an.",
  "Exercise progress": "Übungs-Fortschritt",
  "Estimated 1RM": "Geschätztes 1RM",
  "Log this exercise on at least two days to see a trend.":
    "Trage diese Übung an mindestens zwei Tagen ein, um einen Trend zu sehen.",
  "Volume by muscle group": "Volumen nach Muskelgruppe",
  "No sets logged in the last 30 days.": "In den letzten 30 Tagen keine Sätze eingetragen.",
  sets: "Sätze",
  "No progress data yet": "Noch keine Fortschrittsdaten",
  "Log a few workouts with weights and reps to see your strength trend per exercise and muscle group.":
    "Trage ein paar Workouts mit Gewicht und Wiederholungen ein, um deinen Kraft-Trend pro Übung und Muskelgruppe zu sehen.",
  "Edit workout": "Workout bearbeiten",
  Actual: "Ist",
  reps: "Wdh",
  "Remove set": "Satz entfernen",
  // muscle groups
  Chest: "Brust",
  "Back / Lats": "Rücken",
  Shoulders: "Schultern",
  Biceps: "Bizeps",
  Triceps: "Trizeps",
  Quads: "Quadrizeps",
  Hamstrings: "Beinbeuger",
  Glutes: "Gesäß",
  Calves: "Waden",
  Core: "Core",
  Forearms: "Unterarme",
  Traps: "Trapez",
  "Full body": "Ganzkörper",
  Cardio: "Cardio",

  // --- Scoreboard ---
  Scoreboard: "Rangliste",
  "Compare your Life Score with others.": "Vergleiche deinen Life Score mit anderen.",
  "Cloud sync required": "Cloud-Sync erforderlich",
  "The scoreboard needs the Supabase setup so scores can be shared. Set it up in Settings first.":
    "Die Rangliste braucht das Supabase-Setup, damit Scores geteilt werden können. Richte es zuerst in den Einstellungen ein.",
  "Open Settings": "Einstellungen öffnen",
  "Sign in to compete": "Zum Mitmachen anmelden",
  "Sign in with your account in Settings, then publish your scores here.":
    "Melde dich mit deinem Konto in den Einstellungen an und veröffentliche dann hier deine Scores.",
  "Your entry": "Dein Eintrag",
  "Display name": "Anzeigename",
  "How others see you": "Wie andere dich sehen",
  "Global ranking": "Globale Rangliste",
  "Update my scores": "Meine Scores aktualisieren",
  "Publish my scores": "Meine Scores veröffentlichen",
  "Publishing your current 7-day average": "Veröffentlicht deinen aktuellen 7-Tage-Schnitt",
  Overall: "Gesamt",
  "Your scores are live.": "Deine Scores sind live.",
  Leagues: "Ligen",
  "Create a league and share its code, or join one with a friend's code.":
    "Erstelle eine Liga und teile ihren Code, oder tritt mit dem Code eines Freundes bei.",
  "New league name": "Name der neuen Liga",
  "Join code": "Beitritts-Code",
  Join: "Beitreten",
  "League created. Share the code: {code}": "Liga erstellt. Teile den Code: {code}",
  "Joined {name}.": "„{name}“ beigetreten.",
  "No league found for that code.": "Keine Liga für diesen Code gefunden.",
  Global: "Global",
  Refresh: "Aktualisieren",
  "Loading…": "Lädt…",
  "No one on the global board yet. Turn on “Global ranking” above and publish.":
    "Noch niemand in der globalen Rangliste. Aktiviere oben „Globale Rangliste“ und veröffentliche.",
  "No scores in this league yet. Share the code so friends can join and publish.":
    "Noch keine Scores in dieser Liga. Teile den Code, damit Freunde beitreten und veröffentlichen.",
  You: "Du",
  "Your rank": "Dein Rang",
  of: "von",

  // --- Habit daily target ---
  "Daily target (optional)": "Tagesziel (optional)",
  "No target": "Kein Ziel",
  "Times per day": "Mal pro Tag",
  Minutes: "Minuten",
  "Custom value": "Eigener Wert",
  "Fewer than the target counts partially; more gives a small bonus.":
    "Weniger als das Ziel zählt anteilig; mehr gibt einen kleinen Bonus.",
  "e.g. 30": "z. B. 30",
  "per day": "pro Tag",
  Less: "Weniger",

  // --- Strava ---
  "Connect Strava to import your runs, rides and workouts automatically.":
    "Verbinde Strava, um deine Läufe, Radtouren und Workouts automatisch zu importieren.",
  "Connect Strava": "Strava verbinden",
  Connected: "Verbunden",
  "Your Strava activities show up as workouts.": "Deine Strava-Aktivitäten erscheinen als Workouts.",
  "Last activity synced": "Letzte synchronisierte Aktivität",
  Disconnect: "Trennen",
  "Connected. Imported {n} activities.": "Verbunden. {n} Aktivitäten importiert.",
  "Synced. {n} new activities ({skipped} already imported).":
    "Synchronisiert. {n} neue Aktivitäten ({skipped} schon importiert).",
  "Strava connection was cancelled.": "Strava-Verbindung wurde abgebrochen.",

  // --- Apple Health import ---
  "Apple Health import": "Apple-Health-Import",
  "Bring in sleep, weight and workouts from Apple Health. On your iPhone: Health app → your photo → “Export All Health Data”, unzip it, then upload the export.xml here.":
    "Hol dir Schlaf, Gewicht und Workouts aus Apple Health. Auf dem iPhone: Health-App → dein Foto → „Alle Gesundheitsdaten exportieren“, entpacken, dann die export.xml hier hochladen.",
  "Everything is parsed on your device. Existing days are never overwritten. (Apple has no live web sync — this is a manual import.)":
    "Alles wird auf deinem Gerät verarbeitet. Bestehende Tage werden nie überschrieben. (Apple bietet keinen Live-Web-Sync — das ist ein manueller Import.)",
  "Choose export.xml": "export.xml auswählen",
  "Importing…": "Importiere…",
  "Please unzip the export first and upload export.xml.":
    "Bitte entpacke den Export zuerst und lade die export.xml hoch.",
  "That doesn't look like an Apple Health export.xml.":
    "Das sieht nicht nach einer Apple-Health-export.xml aus.",
  "Imported {sleep} nights, {weight} weigh-ins, {workouts} workouts ({skipped} already present).":
    "{sleep} Nächte, {weight} Gewichtseinträge, {workouts} Workouts importiert ({skipped} schon vorhanden).",
  "Could not read that file. On very large exports, try again on a computer.":
    "Datei konnte nicht gelesen werden. Bei sehr großen Exporten versuch es an einem Computer.",

  // --- Custom experiments ---
  "My own condition": "Eigene Bedingung",
  "Or start from a template": "Oder mit einer Vorlage starten",
  "Name your condition": "Benenne deine Bedingung",
  "You mark the days it was true — then compare your metric on those days vs. the rest.":
    "Du markierst die Tage, an denen sie zutraf — dann wird deine Metrik an diesen Tagen mit den übrigen verglichen.",
  "e.g. Nose healed · Meditated · No coffee": "z. B. Nase geheilt · Meditiert · Kein Kaffee",
  "Days “{label}” was true": "Tage, an denen „{label}“ zutraf",
  "Today ✓": "Heute ✓",
  "Mark today": "Heute markieren",
  condition: "Bedingung",

  // --- Onboarding account step ---
  "Sync across your devices": "Über deine Geräte synchronisieren",
  "Create an account to keep the same data on your phone and PC. Optional — you can also do this later in Settings.":
    "Erstelle ein Konto, um dieselben Daten auf Handy und PC zu haben. Optional — du kannst das auch später in den Einstellungen machen.",
  "Skip for now": "Erstmal überspringen",

  // --- Dashboard: anomalies + customization ---
  "Heads up": "Auffälligkeiten",
  "Nothing unusual — your recent numbers are close to your norm.":
    "Nichts Ungewöhnliches — deine letzten Werte liegen nah an deinem Normalbereich.",
  // --- Early warning & prediction (forecast) ---
  "Your Life Score has dropped {n} days running (around {recent} now vs {baseline} lately). A small reset today can stop the slide.":
    "Dein Life Score ist {n} Tage in Folge gefallen (aktuell um {recent} statt zuletzt {baseline}). Ein kleiner Neustart heute kann die Talfahrt stoppen.",
  "The last couple of days are running about {n} points below your recent baseline ({recent} vs {baseline}). Worth a gentle course-correct.":
    "Die letzten Tage liegen rund {n} Punkte unter deinem jüngsten Schnitt ({recent} statt {baseline}). Ein sanftes Gegensteuern lohnt sich.",
  "Heads up — a dip is forming": "Achtung – eine Talfahrt bahnt sich an",
  "Your score has slipped {n} days running. A small win today can turn it around.":
    "Dein Score ist {n} Tage in Folge gefallen. Ein kleiner Erfolg heute kann das drehen.",
  "The last days are running {n} points below your usual. Worth a gentle reset.":
    "Die letzten Tage liegen {n} Punkte unter deinem Üblichen. Ein sanfter Neustart lohnt sich.",
  "Tomorrow, likely around": "Morgen voraussichtlich um",
  // --- Habit momentum warning ---
  "Losing momentum": "Verliert an Schwung",
  "These were going well but have cooled off this week — a good moment to recommit before the streak breaks.":
    "Diese liefen gut, sind diese Woche aber abgeflaut – ein guter Moment, um dranzubleiben, bevor die Serie reißt.",
  "{recent}% this week vs {prior}% before": "{recent}% diese Woche vs. {prior}% davor",
  "Habit losing steam": "Gewohnheit verliert an Schwung",
  "“{name}” has cooled to {recent}% this week (from {prior}%). Recommit before the streak breaks.":
    "„{name}“ ist diese Woche auf {recent}% abgefallen (von {prior}%). Bleib dran, bevor die Serie reißt.",
  // --- Weekly narrative (auto-written recap) ---
  "Your week in words": "Deine Woche in Worten",
  "Auto-written": "Automatisch verfasst",
  "Log a few more days and a written weekly recap will appear here.":
    "Erfasse ein paar Tage mehr, dann erscheint hier ein geschriebener Wochenrückblick.",
  "This week your Life Score averaged {a} ({trend}).": "Diese Woche lag dein Life Score im Schnitt bei {a} ({trend}).",
  "up from {p}": "gestiegen von {p}",
  "down from {p}": "gefallen von {p}",
  "about steady": "etwa stabil",
  "Your standout day was {day} ({date}) at {score}.": "Dein stärkster Tag war {day} ({date}) mit {score}.",
  "{n} workout(s)": "{n} Training(s)",
  "~{h}h average sleep": "~{h} h Schlaf im Schnitt",
  "{pct}% of habits done": "{pct}% der Gewohnheiten erledigt",
  "Along the way: {list}.": "Nebenbei: {list}.",
  "Next week: {tip}": "Nächste Woche: {tip}",
  // --- Monthly State of You ---
  "Weekly check-in": "Wöchentlicher Check-in",
  "Reply to your coach": "Deinem Coach antworten",
  // --- AI quick logging ---
  "Quick log": "Schnell-Eintrag",
  "Type or speak your day in plain words — e.g. “slept 7h, mood 8, did meditation, ran 30 min”. The AI turns it into entries.":
    "Tippe oder sprich deinen Tag in einfachen Worten – z. B. „7h geschlafen, Stimmung 8, meditiert, 30 min gelaufen“. Die KI macht daraus Einträge.",
  "What happened today?": "Was ist heute passiert?",
  "Log it": "Eintragen",
  "Reading…": "Lese…",
  "Logged for today": "Für heute eingetragen",
  "Everything is dated today. Applying overwrites today's values for these entries.":
    "Alles wird auf heute datiert. Übernehmen überschreibt die heutigen Werte für diese Einträge.",
  "Quick note": "Kurznotiz",
  "Check-in": "Check-in",
  Weight: "Gewicht",
  "Not done": "Nicht erledigt",
  "The AI isn't set up yet. Add your Groq API key in the coach setup.":
    "Die KI ist noch nicht eingerichtet. Füge deinen Groq-API-Key im Coach-Setup hinzu.",
  "Couldn't read anything to log — try rephrasing.": "Konnte nichts zum Eintragen erkennen – formuliere es anders.",
  "I couldn't find anything loggable in that — try naming a habit, your sleep, mood, a workout, water or weight.":
    "Ich konnte darin nichts Eintragbares finden – nenne z. B. eine Gewohnheit, deinen Schlaf, deine Stimmung, ein Training, Wasser oder Gewicht.",
  "State of You": "Dein Zustand",
  "Made with Life Dashboard": "Erstellt mit Life Dashboard",
  "Log a few more days this month and your State of You will appear here.":
    "Erfasse diesen Monat ein paar Tage mehr, dann erscheint hier dein Zustand.",
  "{month}: your Life Score averaged {a} across {n} logged days ({trend}).":
    "{month}: Dein Life Score lag im Schnitt bei {a} über {n} erfasste Tage ({trend}).",
  "up from {p} last month": "gestiegen von {p} im Vormonat",
  "down from {p} last month": "gefallen von {p} im Vormonat",
  "Most improved: {area}, up {d} points on last month.":
    "Am meisten verbessert: {area}, {d} Punkte mehr als im Vormonat.",
  "{n} workouts": "{n} Trainings",
  "{n} journal entries": "{n} Tagebuch-Einträge",
  "The month in numbers: {list}.": "Der Monat in Zahlen: {list}.",
  "Your most consistent habit was “{name}” ({n} days).": "Deine beständigste Gewohnheit war „{name}“ ({n} Tage).",
  "Going into next month: {tip}": "Für den nächsten Monat: {tip}",
  // --- Mood & energy trend ---
  "Mood & energy": "Stimmung & Energie",
  "From your daily check-ins (1-10), over the selected range.":
    "Aus deinen täglichen Check-ins (1–10), über den gewählten Zeitraum.",
  now: "jetzt",
  usual: "üblich",
  "Last 7 days vs the 3 weeks before. Descriptive only — not a medical assessment.":
    "Letzte 7 Tage vs. die 3 Wochen davor. Nur beschreibend — keine medizinische Bewertung.",
  Customize: "Anpassen",
  "Hidden cards": "Ausgeblendete Karten",
  "Move up": "Nach oben",
  "Move down": "Nach unten",
  Hide: "Ausblenden",

  // --- Habit stacking / routines ---
  "Routine (optional)": "Routine (optional)",
  'Group habits into a routine, e.g. "Evening routine", to do them together.':
    "Fasse Gewohnheiten zu einer Routine zusammen, z. B. „Abendroutine“, um sie gemeinsam zu erledigen.",
  "e.g. Evening routine": "z. B. Abendroutine",
  Routines: "Routinen",
  "not today": "nicht heute",
  "All done today 🎉": "Heute alles erledigt 🎉",
  "Complete all today": "Alle heute erledigen",

  // --- Body measurements ---
  "Track circumferences (cm). Sites linked to a muscle show your recent training on it side by side.":
    "Miss Umfänge (cm). Stellen mit Muskelbezug zeigen dein aktuelles Training dazu direkt daneben.",
  Site: "Stelle",
  "Measurement (cm)": "Maß (cm)",
  "No measurements yet. Pick a site and log your first one.":
    "Noch keine Maße. Wähle eine Stelle und trag dein erstes ein.",
  "kg (30d)": "kg (30 T.)",
  "no training logged (30d)": "kein Training erfasst (30 T.)",
  Neck: "Nacken",
  Waist: "Taille",
  Hips: "Hüfte",
  "Biceps (flexed)": "Bizeps (angespannt)",
  Forearm: "Unterarm",
  Thigh: "Oberschenkel",
  Calf: "Wade",

  // --- Wheel of Life ---
  "Wheel of Life": "Lebensrad",
  "Rate 8 areas of your life 1–10 to see your balance and how it shifts over time.":
    "Bewerte 8 Lebensbereiche von 1–10, um deine Balance und ihre Entwicklung zu sehen.",
  "New check-in": "Neuer Check-in",
  "Update today": "Heute aktualisieren",
  "Your wheel": "Dein Rad",
  "Avg {n}": "Ø {n}",
  "Dashed = previous check-in ({d})": "Gestrichelt = vorheriger Check-in ({d})",
  "Update today's check-in": "Heutigen Check-in aktualisieren",
  "Be honest — this is a private snapshot, not a test.":
    "Sei ehrlich — das ist eine private Momentaufnahme, kein Test.",
  "Coach: your balance": "Coach: deine Balance",
  "How it feels": "Wie es sich anfühlt",
  "Data wheel": "Datenrad",
  "Feeling vs data": "Gefühl vs. Daten",
  feel: "Gefühl",
  data: "Daten",
  "Solid = from your data · dashed = how you feel": "Durchgezogen = aus deinen Daten · gestrichelt = dein Gefühl",
  "Scored 1–10 from your last 30 days of data.": "Von 1–10 bewertet aus deinen letzten 30 Tagen Daten.",
  "Data covers only measurable areas (relationships and home stay feeling-only). A gap isn't wrong — it's worth a look.":
    "Daten decken nur messbare Bereiche ab (Beziehungen und Zuhause bleiben Gefühlssache). Eine Lücke ist nicht falsch — aber einen Blick wert.",
  "Log a bit more (habits, sleep, training, finances…) to unlock the data wheel.":
    "Trag etwas mehr ein (Gewohnheiten, Schlaf, Training, Finanzen…), um das Datenrad freizuschalten.",
  "Do your first check-in below to see your wheel.": "Mach unten deinen ersten Check-in, um dein Rad zu sehen.",

  // --- Feature hints, empty states, animations, focus, correlations ---
  "Got it": "Verstanden",
  "Make this dashboard yours": "Mach dieses Dashboard zu deinem",
  "Tap Customize to reorder or hide cards. The new Heads up card flags anything unusual in your recent data — tap it to jump to the details.":
    "Tippe auf Anpassen, um Karten umzusortieren oder auszublenden. Die neue Auffälligkeiten-Karte zeigt Ungewöhnliches in deinen letzten Daten — tippe drauf für die Details.",
  "This week's focus": "Fokus dieser Woche",
  "Set an intention in your weekly review.": "Setz dir im Wochenrückblick ein Vorhaben.",
  'Rate how your life feels, then switch to "From your data" to see the same areas scored from what you\'ve logged — and where gut feeling and numbers differ.':
    "Bewerte, wie sich dein Leben anfühlt, und wechsle dann zu „Aus deinen Daten“, um dieselben Bereiche aus deinen Einträgen bewertet zu sehen — und wo Bauchgefühl und Zahlen auseinandergehen.",
  "No wheel yet": "Noch kein Rad",
  "Data wheel locked": "Datenrad gesperrt",
  "Ask your wheel": "Frag dein Rad",
  "Stack habits into routines": "Gewohnheiten zu Routinen bündeln",
  'Give related habits the same routine name (in the habit editor) — e.g. "Evening routine" — to group them and complete them together.':
    "Gib zusammengehörigen Gewohnheiten denselben Routine-Namen (im Editor) — z. B. „Abendroutine“ — um sie zu gruppieren und gemeinsam zu erledigen.",
  "Life Score on days you do this": "Life Score an Tagen, an denen du das machst",
  "Track body measurements": "Körpermaße verfolgen",
  "Log circumferences like biceps or waist. Sites tied to a muscle show your recent training on it right next to the number.":
    "Trag Umfänge wie Bizeps oder Taille ein. Stellen mit Muskelbezug zeigen dein aktuelles Training direkt neben der Zahl.",
  "No measurements yet": "Noch keine Maße",
  "Pick a site above and log your first one.": "Wähl oben eine Stelle und trag dein erstes Maß ein.",
  "No subscriptions tracked": "Keine Abos erfasst",
  "This day is already logged — edit and save to update it.": "Dieser Tag ist bereits eingetragen — bearbeiten und speichern, um ihn zu aktualisieren.",
  Update: "Aktualisieren",

  // --- Habit importance weighting ---
  Importance: "Wichtigkeit",
  "How much finishing this counts toward your Life Score. Higher = it moves your score more.":
    "Wie stark das Erledigen in deinen Life Score einfließt. Höher = bewegt deinen Score mehr.",
  "Nice to have": "Nice to have",
  Essential: "Essenziell",
  "Key habit": "Kern-Gewohnheit",

  // --- Slip triggers ---
  "What triggered it? (optional)": "Was war der Auslöser? (optional)",
  "Noticing your triggers helps you and the coach spot patterns.":
    "Auslöser zu erkennen hilft dir und dem Coach, Muster zu finden.",
  Stress: "Stress",
  Boredom: "Langeweile",
  Tiredness: "Müdigkeit",
  Hunger: "Hunger",
  Craving: "Verlangen",
  Emotions: "Emotionen",

  // --- Reward shop ---
  "Reward shop": "Belohnungs-Shop",
  "Earn points by living well, then cash them in for rewards you set yourself.":
    "Sammle Punkte durch gutes Leben und löse sie gegen selbst gewählte Belohnungen ein.",
  "How points work": "So funktionieren Punkte",
  "You earn points for being active: every habit you complete, workout, check-in, sleep log and journal entry adds points, plus a small bonus for a good day. The more you do, the faster they add up. Spend them on your own rewards or on cosmetics.":
    "Du bekommst Punkte fürs Aktivsein: jede erledigte Gewohnheit, jedes Training, jeder Check-in, Schlaf-Eintrag und Tagebuch-Eintrag bringt Punkte, plus ein kleiner Bonus für einen guten Tag. Je mehr du machst, desto schneller sammeln sie sich. Gib sie für eigene Belohnungen oder Kosmetik aus.",
  "points to spend": "Punkte zum Ausgeben",
  Earned: "Gesammelt",
  "~{n} pts / day": "~{n} Pkt / Tag",
  "Your rewards": "Deine Belohnungen",
  "No rewards yet": "Noch keine Belohnungen",
  "Add one below or pick a template to get started.": "Füge unten eine hinzu oder wähle eine Vorlage.",
  pts: "Pkt",
  "~{n} days away": "~noch {n} Tage",
  "keep logging to earn points": "weiter eintragen, um Punkte zu sammeln",
  Redeem: "Einlösen",
  "Add a reward": "Belohnung hinzufügen",
  Emoji: "Emoji",
  "e.g. Spa afternoon": "z. B. Spa-Nachmittag",
  "Cost (pts)": "Kosten (Pkt)",
  Ideas: "Ideen",
  Redeemed: "Eingelöst",
  "Favourite coffee": "Lieblingskaffee",
  "Favourite meal": "Lieblingsessen",
  "Gaming evening": "Zock-Abend",
  "Movie night": "Filmabend",
  "New book": "Neues Buch",
  "Lazy morning": "Fauler Morgen",
  "Small treat": "Kleine Belohnung",
  "A full day off": "Ein ganzer freier Tag",

  // --- Best self ---
  "Your best self": "Dein bestes Ich",
  "At your best 🎉": "Auf Bestform 🎉",
  "{n} to go": "noch {n}",
  "Now (30-day avg)": "Jetzt (30-Tage-Ø)",
  "Your best ever": "Dein bisher Bestes",
  "ended {d}": "endete {d}",
  "You're matching or beating your best 30-day stretch. Keep it up.":
    "Du erreichst oder übertriffst deine beste 30-Tage-Phase. Weiter so.",
  "Compared with your own peak — not anyone else's.": "Verglichen mit deinem eigenen Höchststand — nicht mit anderen.",

  // --- Weekday patterns ---
  "Your week at a glance": "Deine Woche auf einen Blick",
  "On average, {best} is your strongest day and {worst} your toughest.":
    "Im Schnitt ist {best} dein stärkster und {worst} dein schwächster Tag.",
  "Average Life Score per weekday, from all your logged days.":
    "Durchschnittlicher Life Score pro Wochentag, aus allen erfassten Tagen.",
  "How you feel by weekday": "Wie du dich pro Wochentag fühlst",
  "Your {metric} varies most across the week — highest on {best}, lowest on {worst}.":
    "Deine {metric} schwankt am stärksten über die Woche – am höchsten {best}, am niedrigsten {worst}.",
  "Average of each check-in metric per weekday (1-10).":
    "Durchschnitt jeder Check-in-Kennzahl pro Wochentag (1–10).",
  "More daily check-ins will sharpen this.": "Mehr tägliche Check-ins schärfen das.",
  "What your week says": "Was deine Woche verrät",
  "Looking at how my mood and energy vary by weekday in my check-in data, tell me which days I tend to feel best and worst, and give one practical suggestion for planning my week. Keep it to 2-3 sentences.":
    "Schau dir anhand meiner Check-in-Daten an, wie Stimmung und Energie über die Wochentage schwanken, sag mir, an welchen Tagen ich mich am besten und am schlechtesten fühle, und gib einen praktischen Tipp für meine Wochenplanung. Halte es bei 2–3 Sätzen.",

  // --- What-if simulator ---
  "What if you slept…": "Was wäre, wenn du schläfst…",
  Beta: "Beta",
  "Drag to see how sleeping more or less has tracked with your outcomes — modelled from your own data.":
    "Zieh den Regler, um zu sehen, wie mehr oder weniger Schlaf mit deinen Werten zusammenhing — aus deinen eigenen Daten modelliert.",
  "your avg {n}h": "dein Ø {n}h",
  "A rough projection from correlation in your data — not a guarantee.":
    "Eine grobe Hochrechnung aus Korrelationen in deinen Daten — keine Garantie.",
  "Health & fitness": "Gesundheit & Fitness",
  "Career & work": "Karriere & Arbeit",
  Money: "Geld",
  Relationships: "Beziehungen",
  "Personal growth": "Persönliches Wachstum",
  "Fun & recreation": "Spaß & Erholung",
  "Home & environment": "Zuhause & Umfeld",
  "Meaning & purpose": "Sinn & Ziel",
  Social: "Sozial",
  Growth: "Wachstum",
  Home: "Zuhause",
  Meaning: "Sinn",

  // --- Subscription audit ---
  "Subscription audit": "Abo-Check",
  "Add recurring expenses (Netflix, gym, insurance…) to see what they cost you per year.":
    "Füge wiederkehrende Ausgaben hinzu (Netflix, Fitnessstudio, Versicherung…), um zu sehen, was sie dich pro Jahr kosten.",
  "Active / month": "Aktiv / Monat",
  "Active / year": "Aktiv / Jahr",
  mo: "Mon.",
  yr: "Jahr",
  Cancelled: "Gekündigt",
  "Tip: mark a subscription Cancelled to remove it from your totals without deleting the rule.":
    "Tipp: Markiere ein Abo als gekündigt, um es aus den Summen zu nehmen, ohne die Regel zu löschen.",

  // --- Year in review (Wrapped) ---
  "Year in review": "Jahresrückblick",
  "Your year in review": "Dein Jahresrückblick",
  "{n} days logged": "{n} Tage erfasst",
  "Best day {d} · {n}": "Bester Tag {d} · {n}",
  "Longest streak (days)": "Längste Serie (Tage)",
  "Consistency compounds.": "Beständigkeit summiert sich.",
  "Your top habit": "Deine Top-Gewohnheit",
  "Done {n} times": "{n}-mal erledigt",
  "Your strongest area": "Dein stärkster Bereich",
  "Your best month": "Dein bester Monat",
  "Average sleep": "Durchschnittlicher Schlaf",
  "Avg sleep {d}": "Ø Schlaf {d}",
  "Where you finished": "Wo du gelandet bist",
  "{xp} XP · {a} achievements": "{xp} XP · {a} Erfolge",
  Wrapped: "Rückblick",
  Previous: "Zurück",

  // --- AI goal breakdown ---
  "Break it down with AI": "Mit KI aufschlüsseln",
  "Let the coach suggest milestones and habits for this goal.":
    "Lass den Coach Meilensteine und Gewohnheiten für dieses Ziel vorschlagen.",
  "Turn this goal into a concrete, personal plan.":
    "Mach aus diesem Ziel einen konkreten, persönlichen Plan.",
  "Suggest a plan": "Plan vorschlagen",
  "Thinking…": "Denkt nach…",
  "The AI coach isn't set up yet.": "Der KI-Coach ist noch nicht eingerichtet.",
  "Couldn't build a plan right now — try again.":
    "Konnte gerade keinen Plan erstellen — versuch es nochmal.",
  "Suggested milestones": "Vorgeschlagene Meilensteine",
  "Add all": "Alle hinzufügen",
  "Suggested habits": "Vorgeschlagene Gewohnheiten",
  "Start over": "Von vorn",
  "AI suggestions — review before adding.": "KI-Vorschläge — vor dem Hinzufügen prüfen.",
};

const DICTS: Record<Language, Record<string, string>> = { en: {}, de: DE };

export function translate(lang: Language, key: string, vars?: Vars): string {
  const dict = DICTS[lang] ?? {};
  let out = dict[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return out;
}

export function useT() {
  const { data } = useStore();
  const lang = data.settings.language;
  return useCallback((key: string, vars?: Vars) => translate(lang, key, vars), [lang]);
}

export function useLang(): Language {
  const { data } = useStore();
  return data.settings.language;
}
