"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Applies the chosen theme to <html> as the `.dark` class. Reacts to system changes. */
export function ThemeApplier() {
  const { data, ready } = useStore();
  const theme = data.settings.theme;
  const accent = data.settings.accent ?? "calm";
  const density = data.settings.density ?? "cozy";

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-density", density);
  }, [density, ready]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const apply = () => {
      const dark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, ready]);

  return null;
}
