"use client";

import { useEffect } from "react";
import { AlertTriangle, Download, RotateCw } from "lucide-react";

/*
  Route-level error boundary.

  In a browser a crashed page is an F5 away from fixed. Installed from a store there is no
  address bar and no reload button — a white screen is where the session ends and the uninstall
  begins. So: say what happened, offer a reload, and above all offer the data export, read
  straight from localStorage rather than through the store that may be what crashed.

  Deliberately not translated: the i18n provider lives inside the tree that just failed.
*/

const STORAGE_KEY = "life-dashboard:v1";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Life Dashboard crashed:", error);
  }, [error]);

  function exportData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `life-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* if even this fails there is nothing left to offer */
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bad-soft)] text-[var(--bad)]">
          <AlertTriangle size={22} />
        </div>
        <h1 className="mt-4 text-lg font-semibold">Da ist etwas schiefgelaufen</h1>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-muted)]">
          Diese Seite konnte nicht geladen werden. Deine Daten sind nicht betroffen — sie liegen
          weiterhin auf diesem Gerät. Lade neu, oder sichere sie vorher.
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="area-grad inline-flex items-center gap-1.5 rounded-[12px] px-4 py-2.5 text-sm font-semibold"
          >
            <RotateCw size={15} /> Neu laden
          </button>
          <button
            onClick={exportData}
            className="inline-flex items-center gap-1.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            <Download size={15} /> Daten sichern
          </button>
        </div>

        <button
          // A hard navigation on purpose: a client-side one would re-enter the tree that just
          // threw, which tends to land straight back on this screen.
          onClick={() => window.location.assign("/")}
          className="mt-4 text-[12px] text-[var(--text-faint)] hover:underline"
        >
          Zurück zum Dashboard
        </button>

        {error.digest && (
          <p className="mt-4 font-mono text-[10.5px] text-[var(--text-dim)]">Fehler-ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
