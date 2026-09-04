"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button, Card, SectionTitle } from "@/components/ui";

/*
  Account & data deletion.

  Art. 17 GDPR gives the user the right to erasure, and both app stores now require that an app
  with accounts can delete the account from inside the app. Two separate things live here,
  because they really are separate:

    - Deleting the cloud account removes the synced copy and the login. It deliberately does
      NOT touch this device unless asked, so signing up again isn't a data-loss event.
    - Deleting local data wipes this browser and restarts onboarding.

  Both offer an export first: erasing someone's history without offering the copy they are
  entitled to under Art. 20 would be a poor trade.
*/

export function DangerZone() {
  const { data, sync, resetAll } = useStore();
  const t = useT();
  const [confirm, setConfirm] = useState<null | "account" | "local">(null);
  const [alsoLocal, setAlsoLocal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `life-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    setBusy(true);
    setErr(null);
    const res = await sync.deleteAccount();
    setBusy(false);
    if (res.error) {
      setErr(
        res.error === "not_configured"
          ? t("Account deletion isn't set up on the server yet.")
          : t("Couldn't delete the account. Try again, or write to us."),
      );
      return;
    }
    if (alsoLocal) resetAll();
    else setConfirm(null);
  }

  return (
    <Card>
      <SectionTitle right={<TriangleAlert size={16} className="text-[var(--bad)]" />}>
        {t("Account & data")}
      </SectionTitle>

      <p className="mb-3 text-[12.5px] leading-[1.55] text-[var(--text-muted)]">
        {t("You can take your data with you or delete it at any time. Export gives you everything as a JSON file.")}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={exportData}>
          <Download size={15} /> {t("Export my data")}
        </Button>
        <Link
          href="/legal/privacy"
          className="inline-flex items-center gap-1.5 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-2)]"
        >
          <ShieldCheck size={15} /> {t("Privacy")}
        </Link>
      </div>

      {/* Cloud account */}
      {sync.configured && sync.email && (
        <div className="mt-4 border-t border-[var(--border)] pt-3.5">
          <div className="text-[13px] font-medium">{t("Delete account")}</div>
          <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[var(--text-muted)]">
            {t("Permanently removes {email} and everything synced to it. This cannot be undone.", {
              email: sync.email,
            })}
          </p>

          {confirm !== "account" ? (
            <Button variant="ghost" size="sm" className="mt-2 text-[var(--bad)]" onClick={() => setConfirm("account")}>
              <Trash2 size={15} /> {t("Delete account")}
            </Button>
          ) : (
            <div className="mt-2.5 rounded-[14px] border border-[color-mix(in_srgb,var(--bad)_35%,transparent)] bg-[var(--bad-soft)] p-3">
              <p className="text-[12.5px] font-medium">{t("Delete this account permanently?")}</p>
              <label className="mt-2 flex items-start gap-2 text-[12px] text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={alsoLocal}
                  onChange={(e) => setAlsoLocal(e.target.checked)}
                  className="mt-0.5 accent-[var(--bad)]"
                />
                {t("Also erase the data on this device")}
              </label>
              {err && <p className="mt-2 text-[12px] text-[var(--bad)]">{err}</p>}
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={deleteAccount} disabled={busy}>
                  {busy ? t("Deleting…") : t("Yes, delete permanently")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setConfirm(null); setErr(null); }} disabled={busy}>
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Local data */}
      <div className="mt-4 border-t border-[var(--border)] pt-3.5">
        <div className="text-[13px] font-medium">{t("Erase data on this device")}</div>
        <p className="mt-0.5 text-[11.5px] leading-[1.5] text-[var(--text-muted)]">
          {sync.email
            ? t("Clears this browser and restarts onboarding. Your synced copy stays until you delete the account.")
            : t("Clears this browser and restarts onboarding. Since nothing is synced, this deletes everything.")}
        </p>
        {confirm !== "local" ? (
          <Button variant="ghost" size="sm" className="mt-2 text-[var(--bad)]" onClick={() => setConfirm("local")}>
            <Trash2 size={15} /> {t("Erase everything")}
          </Button>
        ) : (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-[var(--text-muted)]">{t("This cannot be undone.")}</span>
            <Button variant="danger" size="sm" onClick={resetAll}>
              {t("Yes, erase")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>
              {t("Cancel")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
