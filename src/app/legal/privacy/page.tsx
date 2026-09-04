"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Card, PageHeader } from "@/components/ui";
import { OPERATOR, PRIVACY_UPDATED, SUPERVISORY_AUTHORITY, operatorAddressLines, operatorComplete } from "@/lib/legal";
import { isSyncConfigured } from "@/lib/supabase";
import { pushConfigured } from "@/lib/push";
import { isStravaConfigured } from "@/lib/strava";

/*
  Privacy notice (Art. 13 GDPR).

  German wording on purpose — see the imprint page for why. Sections for optional services
  (sync, AI, push, Strava) render only when that service is actually configured on this
  deployment, so the notice describes what the app really does rather than a superset.
*/

export default function PrivacyPage() {
  const { data } = useStore();
  const t = useT();
  const complete = operatorComplete();
  const aiConfigured = true; // the coach route exists in every deployment; the key gates usage

  return (
    <div className="space-y-[14px]">
      <PageHeader
        kicker={t("Legal")}
        lead={t("Your")}
        title={t("privacy")}
        subtitle={`Stand: ${new Date(PRIVACY_UPDATED).toLocaleDateString("de-DE")}`}
      />

      {!complete && (
        <div className="flex gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--bad)_35%,transparent)] bg-[var(--bad-soft)] px-4 py-3.5">
          <AlertTriangle size={17} className="mt-px shrink-0 text-[var(--bad)]" />
          <div className="min-w-0 text-[12.5px] leading-[1.5]">
            <div className="font-semibold text-[var(--bad)]">Verantwortlicher fehlt</div>
            <p className="mt-1 text-[var(--text-muted)]">
              Trage die Betreiberdaten in <code className="text-[11.5px]">src/lib/legal.ts</code> ein.
            </p>
          </div>
        </div>
      )}

      {data.settings.language !== "de" && (
        <p className="text-[11.5px] leading-[1.5] text-[var(--text-faint)]">
          This privacy notice follows the GDPR and German law; the German wording is binding.
        </p>
      )}

      <Card>
        <S>1. Verantwortlicher</S>
        <P>Verantwortlich für die Datenverarbeitung in dieser Anwendung ist:</P>
        <address className="mt-2 not-italic text-[13px] leading-[1.7] text-[var(--text-muted)]">
          {operatorAddressLines().map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          <div>
            <a href={`mailto:${OPERATOR.email}`} className="area-text hover:underline">
              {OPERATOR.email}
            </a>
          </div>
        </address>
        <P className="mt-2">
          Ein Datenschutzbeauftragter ist nicht bestellt, da die Voraussetzungen des § 38 BDSG
          nicht vorliegen.
        </P>
      </Card>

      <Card>
        <S>2. Der Grundsatz: deine Daten bleiben auf deinem Gerät</S>
        <P>
          Life Dashboard ist so gebaut, dass alles, was du einträgst — Gewohnheiten, Schlaf,
          Training, Gewicht, Körpermaße, Stimmung, Tagebuch, Ziele, Finanzen — ausschließlich
          <strong className="text-[var(--text)]"> lokal in deinem Browser </strong>
          gespeichert wird (localStorage). Diese Daten werden nicht automatisch an uns übertragen.
        </P>
        <P className="mt-2">
          Deine Daten verlassen dein Gerät nur, wenn du eine der folgenden Funktionen{" "}
          <strong className="text-[var(--text)]">aktiv einschaltest</strong>: Cloud-Sync, KI-Coach,
          Push-Benachrichtigungen oder die Strava-Verbindung. Jede davon ist unten einzeln
          beschrieben und jederzeit abschaltbar.
        </P>
        <P className="mt-2">
          Rechtsgrundlage für die lokale Speicherung ist Art. 6 Abs. 1 lit. b DSGVO (Erfüllung des
          Nutzungsvertrags) sowie § 25 Abs. 2 Nr. 2 TDDDG, da die Speicherung für den vom Nutzer
          ausdrücklich gewünschten Dienst unbedingt erforderlich ist. Du löschst diese Daten
          jederzeit selbst über Einstellungen → Daten &amp; Backup → „Alles zurücksetzen“.
        </P>
      </Card>

      <Card>
        <S>3. Gesundheitsbezogene Daten (Art. 9 DSGVO)</S>
        <P>
          Ein Teil dessen, was du einträgst — Schlafzeiten, Gewicht, Körpermaße, Stimmung,
          Wohlbefinden, Trainingsdaten, Tagebuchtexte — sind besondere Kategorien
          personenbezogener Daten nach Art. 9 Abs. 1 DSGVO.
        </P>
        <P className="mt-2">
          Solange diese Daten dein Gerät nicht verlassen, findet keine Verarbeitung durch uns
          statt. Sobald du Cloud-Sync oder den KI-Coach einschaltest, verarbeiten wir sie
          ausschließlich auf Grundlage deiner{" "}
          <strong className="text-[var(--text)]">ausdrücklichen Einwilligung</strong> nach Art. 9
          Abs. 2 lit. a DSGVO. Diese Einwilligung holen wir getrennt vom übrigen Onboarding ein,
          und du kannst sie jederzeit mit Wirkung für die Zukunft widerrufen — in den
          Einstellungen unter „Datenschutz &amp; Einwilligungen“.
        </P>
      </Card>

      {isSyncConfigured && (
        <Card>
          <S>4. Konto und Cloud-Sync (optional)</S>
          <Kv k="Zweck" v="Damit du dieselben Daten auf Handy und Rechner hast." />
          <Kv
            k="Daten"
            v="E-Mail-Adresse und Passwort-Hash für das Konto; dein gesamter App-Datenbestand als verschlüsselt übertragener JSON-Datensatz."
          />
          <Kv
            k="Rechtsgrundlage"
            v="Art. 6 Abs. 1 lit. b DSGVO für das Konto; Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung) für die enthaltenen Gesundheitsdaten."
          />
          <Kv k="Auftragsverarbeiter" v="Supabase Inc., 970 Toa Payoh North, Singapur — Hosting in der EU-Region." />
          <Kv
            k="Speicherdauer"
            v="Bis zur Löschung deines Kontos. Löschst du das Konto in der App (Profil → Konto löschen), werden Konto und synchronisierte Daten unverzüglich und vollständig entfernt."
          />
          <Kv k="Drittlandtransfer" v="Bei EU-Hosting kein regelmäßiger Drittlandtransfer; für Support-Zugriffe bestehen Standardvertragsklauseln." />
        </Card>
      )}

      {aiConfigured && (
        <Card>
          <S>{isSyncConfigured ? "5" : "4"}. KI-Coach (optional, standardmäßig aus)</S>
          <P>
            Ist der KI-Coach eingeschaltet, senden wir für jede Anfrage eine Zusammenfassung deiner
            Daten an einen KI-Dienst, der daraus eine Antwort erzeugt.
          </P>
          <Kv k="Zweck" v="Textliche Einordnung deiner eigenen Daten und Vorschläge." />
          <Kv
            k="Daten"
            v="Abgeleitete Kennzahlen (Scores, Durchschnitte, Streaks, Trends), deine Antworten aus „Über dich“ sowie — nur wenn du zusätzlich „Coach darf mein Tagebuch lesen“ aktivierst — Tagebuchtexte, Stimmung und Tags."
          />
          <Kv k="Rechtsgrundlage" v="Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO — ausdrückliche, jederzeit widerrufbare Einwilligung." />
          <Kv k="Empfänger" v="Groq, Inc., 400 Castro St, Mountain View, CA 94041, USA." />
          <Kv
            k="Drittlandtransfer"
            v="Die Übermittlung erfolgt in die USA. Grundlage ist deine ausdrückliche Einwilligung nach Art. 49 Abs. 1 lit. a DSGVO in Verbindung mit den Standardvertragsklauseln der EU-Kommission. In den USA besteht kein mit der EU vergleichbares Datenschutzniveau; insbesondere können Behörden unter US-Recht auf Daten zugreifen, ohne dass dagegen ein der EU entsprechender Rechtsschutz besteht."
          />
          <Kv k="Speicherdauer" v="Anfragen werden zur Beantwortung verarbeitet und nicht zum Training von Modellen verwendet. Die Antwort wird lokal auf deinem Gerät zwischengespeichert." />
          <P className="mt-2 text-[var(--text-faint)]">
            Du erkennst KI-erzeugte Inhalte in der App an der Kennzeichnung „Coach“. Ausgaben
            können falsch sein und ersetzen keine fachliche Beratung.
          </P>
        </Card>
      )}

      {pushConfigured && (
        <Card>
          <S>{isSyncConfigured ? "6" : "5"}. Push-Benachrichtigungen (optional)</S>
          <Kv k="Zweck" v="Erinnerung an den Tages-Check-in und den Wochenrückblick." />
          <Kv k="Daten" v="Die Push-Adresse deines Browsers (Endpoint und Schlüssel), deine eingestellte Uhrzeit und Sprache." />
          <Kv k="Rechtsgrundlage" v="Art. 6 Abs. 1 lit. a DSGVO — Einwilligung, die du über die Browser-Abfrage erteilst." />
          <Kv k="Speicherdauer" v="Bis du Push in den Einstellungen ausschaltest oder die Benachrichtigungen im Browser entziehst." />
        </Card>
      )}

      {isStravaConfigured && (
        <Card>
          <S>{isSyncConfigured ? "7" : "6"}. Strava (optional)</S>
          <Kv k="Zweck" v="Import deiner Aktivitäten als Workouts." />
          <Kv k="Daten" v="Über OAuth: Zugriffstoken sowie Aktivitätsdaten (Sportart, Dauer, Distanz, Datum). Die Tokens liegen lokal auf deinem Gerät." />
          <Kv k="Rechtsgrundlage" v="Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO — Einwilligung durch die Verbindung." />
          <Kv k="Empfänger" v="Strava, Inc., San Francisco, USA — Drittlandtransfer auf Basis deiner Einwilligung." />
          <Kv k="Speicherdauer" v="Bis du die Verbindung in den Einstellungen trennst." />
        </Card>
      )}

      <Card>
        <S>{isSyncConfigured ? "8" : "7"}. Hosting und Server-Logs</S>
        <Kv k="Anbieter" v="Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA." />
        <Kv
          k="Daten"
          v="Beim Abruf der Anwendung fallen technisch notwendige Zugriffsdaten an: IP-Adresse, Zeitpunkt, aufgerufene Ressource, Referrer, Browser- und Gerätekennung."
        />
        <Kv k="Zweck" v="Auslieferung der Anwendung, Betriebssicherheit und Fehlersuche." />
        <Kv k="Rechtsgrundlage" v="Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse am sicheren und stabilen Betrieb." />
        <Kv k="Speicherdauer" v="Kurzfristig, in der Regel wenige Tage." />
        <Kv k="Drittlandtransfer" v="Auslieferung über EU-Standorte; für Zugriffe des Anbieters bestehen Standardvertragsklauseln." />
        <P className="mt-2">
          Die Anwendung setzt keine Tracking-Cookies und bindet keine Analyse- oder Werbedienste
          ein.
        </P>
      </Card>

      <Card>
        <S>{isSyncConfigured ? "9" : "8"}. Apple-Health-Import</S>
        <P>
          Wenn du eine Health-Exportdatei hochlädst, wird sie{" "}
          <strong className="text-[var(--text)]">vollständig auf deinem Gerät</strong> ausgewertet.
          Die Datei wird nicht übertragen und nicht gespeichert; nur die daraus erzeugten Einträge
          landen in deinem lokalen Datenbestand.
        </P>
      </Card>

      <Card>
        <S>{isSyncConfigured ? "10" : "9"}. Deine Rechte</S>
        <P>Dir stehen gegenüber dem Verantwortlichen folgende Rechte zu:</P>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-[1.6] text-[var(--text-muted)]">
          {[
            ["Auskunft", "Art. 15 DSGVO"],
            ["Berichtigung", "Art. 16 DSGVO"],
            ["Löschung", "Art. 17 DSGVO"],
            ["Einschränkung der Verarbeitung", "Art. 18 DSGVO"],
            ["Datenübertragbarkeit", "Art. 20 DSGVO"],
            ["Widerspruch gegen die Verarbeitung", "Art. 21 DSGVO"],
            ["Widerruf erteilter Einwilligungen", "Art. 7 Abs. 3 DSGVO"],
          ].map(([r, a]) => (
            <li key={r} className="flex gap-2">
              <span className="area-text">•</span>
              <span>
                <strong className="font-medium text-[var(--text)]">{r}</strong> — {a}
              </span>
            </li>
          ))}
        </ul>
        <P className="mt-3">
          Auskunft, Löschung und Export kannst du außerdem direkt in der App erledigen:
          Einstellungen → Daten &amp; Backup exportiert deinen vollständigen Datenbestand als JSON
          (Art. 20 DSGVO) und löscht ihn auf Wunsch vollständig. Ein bestehendes Konto löschst du
          unter Profil → Konto löschen.
        </P>
        <P className="mt-2">
          Ein Widerruf einer Einwilligung berührt nicht die Rechtmäßigkeit der bis dahin erfolgten
          Verarbeitung.
        </P>
      </Card>

      <Card>
        <S>{isSyncConfigured ? "11" : "10"}. Beschwerderecht bei der Aufsichtsbehörde</S>
        <P>
          Unabhängig davon steht dir nach Art. 77 DSGVO das Recht zu, dich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren — insbesondere in dem Mitgliedstaat deines
          Aufenthaltsorts, deines Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
        </P>
        <P className="mt-2 text-[var(--text-faint)]">
          {SUPERVISORY_AUTHORITY.hint} Eine Übersicht aller deutschen Aufsichtsbehörden findest du{" "}
          <a
            href={SUPERVISORY_AUTHORITY.url}
            target="_blank"
            rel="noopener noreferrer"
            className="area-text hover:underline"
          >
            hier
          </a>
          .
        </P>
      </Card>

      <Card>
        <S>{isSyncConfigured ? "12" : "11"}. Änderungen dieser Erklärung</S>
        <P>
          Wir passen diese Datenschutzerklärung an, wenn sich die Verarbeitung ändert. Ändert sich
          etwas Wesentliches an einer Verarbeitung, die auf deiner Einwilligung beruht, fragen wir
          sie erneut ab.
        </P>
      </Card>

      <p className="pb-4 text-center text-[11px] text-[var(--text-dim)]">
        <Link href="/legal/imprint" className="area-text hover:underline">
          {t("Imprint")}
        </Link>
      </p>
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <h2 className="slabel mb-2">{children}</h2>;
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[13px] leading-[1.65] text-[var(--text-muted)]${className ? ` ${className}` : ""}`}>
      {children}
    </p>
  );
}

/** One "Zweck / Rechtsgrundlage / Speicherdauer …" line — the shape Art. 13 asks for. */
function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="mt-2 flex flex-col gap-0.5 border-b border-[var(--surface-2)] pb-2 last:border-0">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
        {k}
      </span>
      <span className="text-[13px] leading-[1.6] text-[var(--text-muted)]">{v}</span>
    </div>
  );
}
