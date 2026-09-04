"use client";

import { useEffect } from "react";

/*
  Last line of defence: a crash in the root layout itself, where error.tsx can't help because
  the layout it renders inside is the thing that failed. It has to bring its own <html> and
  <body>, and it can't rely on the app's CSS variables loading — hence the inline styles.
*/

const STORAGE_KEY = "life-dashboard:v1";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Life Dashboard failed to start:", error);
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
      /* nothing left to offer */
    }
  }

  const btn: React.CSSProperties = {
    borderRadius: 12,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    border: "1px solid #d7dbe2",
    background: "#fff",
    color: "#14161a",
    cursor: "pointer",
  };

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f6f7f9",
          color: "#14161a",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 19, margin: "0 0 8px" }}>Die App konnte nicht starten</h1>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5b6470", margin: "0 0 20px" }}>
            Deine Daten liegen unverändert auf diesem Gerät. Versuch es erneut — oder sichere sie
            zuerst als Datei.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={reset} style={{ ...btn, background: "#4f46e5", color: "#fff", borderColor: "#4f46e5" }}>
              Neu laden
            </button>
            <button onClick={exportData} style={btn}>
              Daten sichern
            </button>
          </div>
          {error.digest && (
            <p style={{ fontSize: 11, color: "#a3aab5", marginTop: 18 }}>Fehler-ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
