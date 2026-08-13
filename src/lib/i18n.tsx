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
