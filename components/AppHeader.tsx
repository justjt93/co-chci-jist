"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";
import { ThemePicker } from "@/components/ThemePicker";

const NAV = [
  { href: "/swipe", label: "Swipe", icon: "🍽️" },
  { href: "/matches", label: "Matches", icon: "❤️" },
  { href: "/room", label: "Room", icon: "👥" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, loading } = useSupabase();

  const status = loading
    ? "…"
    : user && !user.is_anonymous
      ? (user.email ?? "Signed in")
      : "Guest";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          co chci jíst <span aria-hidden>🍽️</span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-card hover:text-foreground"
                  }`}
                >
                  <span aria-hidden className="mr-1">
                    {item.icon}
                  </span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <ThemePicker />
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-1 text-right text-[11px] text-muted">
        {status}
      </div>
    </header>
  );
}
