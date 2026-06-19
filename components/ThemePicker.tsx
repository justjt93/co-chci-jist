"use client";

import { useEffect, useRef, useState } from "react";

const THEMES = [
  { id: "light", label: "Light", icon: "☀️" },
  { id: "dark", label: "Dark", icon: "🌙" },
  { id: "mcdonalds", label: "McDonald's", icon: "🍟" },
];

export function ThemePicker() {
  const [theme, setTheme] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "mcdonalds");
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function pick(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("theme", id);
    } catch {}
    setTheme(id);
    setOpen(false);
  }

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[2];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Choose theme"
        title="Theme"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-base text-muted transition-colors hover:bg-card hover:text-foreground"
      >
        {theme === null ? "🎨" : current.icon}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
          <p className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted">
            Theme
          </p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background ${
                t.id === theme ? "font-semibold text-brand" : "text-foreground"
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === theme && <span className="ml-auto text-brand">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
