"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Check, Download, Share, SquarePlus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { pushConfigured } from "@/lib/push";

const PROMO_ID = "app-push-promo";

/** One-time, dismissible banner announcing the installable app + push. Tap → Settings. */
export function AppPromoBanner() {
  const { data, updateSettings, ready } = useStore();
  const t = useT();
  if (!ready) return null;
  const seen = data.settings.hintsSeen?.includes(PROMO_ID);
  const pushOn = !!data.settings.reminders?.push;
  // Only when push is actually available on this deployment, not yet enabled, and not dismissed.
  if (!pushConfigured || seen || pushOn) return null;

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateSettings({ hintsSeen: [...(data.settings.hintsSeen ?? []), PROMO_ID] });
  }

  return (
    <Link
      href="/settings#reminders"
      className="grad mb-[18px] flex items-center gap-3 rounded-2xl p-3.5 text-white shadow-[var(--shadow)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <BellRing size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{t("Life Dashboard is now an app")}</div>
        <div className="text-xs text-white/85">{t("Install it and get reminders as push notifications. Tap to set it up.")}</div>
      </div>
      <button onClick={dismiss} aria-label={t("Dismiss")} className="shrink-0 rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white">
        <X size={18} />
      </button>
    </Link>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// The browser's install prompt event, stashed until the user taps Install.
let deferredPrompt: any = null;

/** Registers the service worker, auto-refreshes on update, and captures the install prompt. */
export function PWARegister() {
  useEffect(() => {
    let refreshing = false;
    if ("serviceWorker" in navigator) {
      // If a page was controlled by an old worker and a new one takes over, reload once so the
      // user always sees the latest version instead of a stale cached shell.
      const hadController = !!navigator.serviceWorker.controller;
      const onControllerChange = () => {
        if (refreshing || !hadController) return;
        refreshing = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
          // Check for a fresh service worker whenever the app regains focus.
          const onVis = () => document.visibilityState === "visible" && reg.update().catch(() => {});
          document.addEventListener("visibilitychange", onVis);
        })
        .catch(() => {});
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

  // Styled as a Settings card (22px radius, 16/17px padding), since that's where it lives.
  return (
    <section className="card rounded-[22px] px-[17px] py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="slabel">{t("Install the app")}</h2>
        <Download size={16} className="text-[var(--text-faint)]" />
      </div>
      {installed ? (
        <p className="flex items-center gap-2 text-[12.5px] text-[var(--good)]">
          <Check size={15} /> {t("Installed — you're running the app.")}
        </p>
      ) : (
        <>
          <p className="text-[12.5px] leading-[1.45] text-[var(--text-muted)]">
            {t("Add Life Dashboard to your home screen to open it full-screen like a normal app, and to use it offline.")}
          </p>
          {canInstall ? (
            <button
              onClick={install}
              className="area-grad mt-2.5 inline-flex items-center gap-1.5 rounded-[12px] px-[13px] py-[9px] text-[12px] font-semibold transition hover:opacity-90 active:scale-[.98]"
            >
              <Download size={14} /> {t("Install app")}
            </button>
          ) : (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-[14px] bg-[var(--surface-2)] px-[13px] py-3 text-[11.5px] leading-[1.45] text-[var(--text-muted)]">
              {isIOS ? (
                <>
                  <Share size={15} className="area-text mt-px shrink-0" />
                  <span>{t("In Safari, tap the Share button, then “Add to Home Screen”.")}</span>
                </>
              ) : (
                <>
                  <SquarePlus size={15} className="area-text mt-px shrink-0" />
                  <span>{t("Open your browser menu and choose “Install app” or “Add to Home screen”.")}</span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
