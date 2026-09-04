"use client";

import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Card, PageHeader } from "@/components/ui";
import { OPERATOR, operatorAddressLines, operatorComplete } from "@/lib/legal";

/*
  Imprint (§ 5 DDG, the 2024 successor to § 5 TMG).

  The content is German on purpose: the duty comes from German law and the German wording is
  what's binding. Non-German users get a one-line note rather than a translation that could
  drift away from it.
*/

export default function ImprintPage() {
  const { data } = useStore();
  const t = useT();
  const complete = operatorComplete();
  const lines = operatorAddressLines();

  return (
    <div className="space-y-[14px]">
      <PageHeader kicker={t("Legal")} lead={t("Your")} title={t("imprint")} />

      {!complete && <IncompleteWarning />}

      {data.settings.language !== "de" && (
        <p className="text-[11.5px] leading-[1.5] text-[var(--text-faint)]">
          This imprint is required by German law (§ 5 DDG) and is legally binding in its German
          wording.
        </p>
      )}

      <Card>
        <H>Angaben gemäß § 5 DDG</H>
        <address className="not-italic text-[13px] leading-[1.7] text-[var(--text-muted)]">
          {lines.map((l, i) => (
            <div key={i} className={i === 0 ? "font-medium text-[var(--text)]" : undefined}>
              {l}
            </div>
          ))}
        </address>

        <H className="mt-5">Kontakt</H>
        <dl className="text-[13px] leading-[1.7] text-[var(--text-muted)]">
          <Row label="E-Mail">
            <a href={`mailto:${OPERATOR.email}`} className="area-text hover:underline">
              {OPERATOR.email}
            </a>
          </Row>
          {OPERATOR.phone && <Row label="Telefon">{OPERATOR.phone}</Row>}
        </dl>

        {(OPERATOR.vatId || OPERATOR.register || OPERATOR.smallBusiness) && (
          <>
            <H className="mt-5">Steuerliche Angaben</H>
            <dl className="text-[13px] leading-[1.7] text-[var(--text-muted)]">
              {OPERATOR.vatId && <Row label="USt-IdNr. (§ 27a UStG)">{OPERATOR.vatId}</Row>}
              {OPERATOR.register && <Row label="Registereintrag">{OPERATOR.register}</Row>}
              {OPERATOR.smallBusiness && !OPERATOR.vatId && (
                <p className="mt-1">
                  Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und daher auch nicht in
                  Rechnungen ausgewiesen (Kleinunternehmerregelung).
                </p>
              )}
            </dl>
          </>
        )}

        <H className="mt-5">Verantwortlich für den Inhalt</H>
        <p className="text-[13px] leading-[1.7] text-[var(--text-muted)]">
          {OPERATOR.representedBy || OPERATOR.name || "—"}
          {lines.length > 1 ? `, ${lines.slice(-3).join(", ")}` : ""}
        </p>

        <H className="mt-5">Streitschlichtung</H>
        <p className="text-[13px] leading-[1.65] text-[var(--text-muted)]">
          Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>

        <H className="mt-5">Haftung für Inhalte und Links</H>
        <p className="text-[13px] leading-[1.65] text-[var(--text-muted)]">
          Die Inhalte dieser Anwendung wurden mit Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte wird keine Gewähr übernommen. Für Inhalte
          externer Links ist ausschließlich deren Betreiber verantwortlich; zum Zeitpunkt der
          Verlinkung waren keine Rechtsverstöße erkennbar.
        </p>

        <H className="mt-5">Hinweis zu Gesundheitsinhalten</H>
        <p className="text-[13px] leading-[1.65] text-[var(--text-muted)]">
          Life Dashboard ist eine Anwendung zur Selbstbeobachtung und Motivation. Sie ist kein
          Medizinprodukt und dient nicht der Erkennung, Verhütung, Überwachung, Behandlung oder
          Linderung von Krankheiten. Auswertungen, Bewertungen und Hinweise der App — auch die des
          KI-Coaches — ersetzen keine ärztliche Diagnose oder Beratung.
        </p>
      </Card>
    </div>
  );
}

function IncompleteWarning() {
  return (
    <div className="flex gap-3 rounded-[18px] border border-[color-mix(in_srgb,var(--bad)_35%,transparent)] bg-[var(--bad-soft)] px-4 py-3.5">
      <AlertTriangle size={17} className="mt-px shrink-0 text-[var(--bad)]" />
      <div className="min-w-0 text-[12.5px] leading-[1.5]">
        <div className="font-semibold text-[var(--bad)]">Impressum unvollständig</div>
        <p className="mt-1 text-[var(--text-muted)]">
          Trage Name und ladungsfähige Anschrift in <code className="text-[11.5px]">src/lib/legal.ts</code>{" "}
          ein. Ohne diese Angaben darf die App nicht veröffentlicht werden — ein fehlendes oder
          unvollständiges Impressum ist abmahnfähig.
        </p>
      </div>
    </div>
  );
}

function H({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`slabel mb-1.5${className ? ` ${className}` : ""}`}>{children}</h2>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="text-[var(--text-faint)]">{label}:</dt>
      <dd>{children}</dd>
    </div>
  );
}
