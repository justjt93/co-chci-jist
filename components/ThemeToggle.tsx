"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  // null until mounted, to avoid a hydration mismatch with the inline script.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light / dark theme"
      title="Toggle light / dark"
      className="flex h-8 w-8 items-center justify-center rounded-full text-base text-muted transition-colors hover:bg-card hover:text-foreground"
    >
      {dark === null ? "🌓" : dark ? "☀️" : "🌙"}
    </button>
  );
}
