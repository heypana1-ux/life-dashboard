"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share, SquarePlus } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Card, SectionTitle, Button } from "@/components/ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
// The browser's install prompt event, stashed until the user taps Install.
let deferredPrompt: any = null;

/** Registers the service worker and captures the install prompt. Mount once. */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: any) => {
      e.preventDefault();
      deferredPrompt = e;
      window.dispatchEvent(new Event("pwa-installable"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

/** Settings card: install the app, with platform-appropriate guidance. */
export function InstallAppCard() {
  const t = useT();
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setInstalled(standalone);
    setCanInstall(!!deferredPrompt);
    const ua = navigator.userAgent || "";
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
  }

  return (
    <Card>
      <SectionTitle right={<Download size={16} className="text-[var(--text-faint)]" />}>{t("Install the app")}</SectionTitle>
      {installed ? (
        <p className="flex items-center gap-2 text-sm text-[var(--good)]">
          <Check size={16} /> {t("Installed — you're running the app.")}
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {t("Add Life Dashboard to your home screen to open it full-screen like a normal app, and to use it offline.")}
          </p>
          {canInstall ? (
            <Button onClick={install}>
              <Download size={16} /> {t("Install app")}
            </Button>
          ) : isIOS ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-[var(--text-muted)]">
              <Share size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <span>{t("In Safari, tap the Share button, then “Add to Home Screen”.")}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-[var(--text-muted)]">
              <SquarePlus size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <span>{t("Open your browser menu and choose “Install app” or “Add to Home screen”.")}</span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
