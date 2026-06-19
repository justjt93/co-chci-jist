"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { getActiveRoom, type ActiveRoom } from "@/lib/data";

export default function HomePage() {
  const { supabase, user, loading } = useSupabase();
  const [active, setActive] = useState<ActiveRoom | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let on = true;
    (async () => {
      const room = await getActiveRoom(supabase);
      const { count } = await supabase
        .from("preferences")
        .select("*", { count: "exact", head: true })
        .eq("choice", "eat");
      if (on) {
        setActive(room);
        setLikeCount(count ?? 0);
      }
    })();
    return () => {
      on = false;
    };
  }, [supabase, user]);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-3xl bg-gradient-to-br from-brand to-brand-strong p-8 text-white shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">What do you want to eat?</h1>
        <p className="mt-2 max-w-prose text-white/90">
          Swipe through meals and keep the ones you&apos;d happily eat. Pair up
          with your partner, and we&apos;ll show what you both want — then pick
          dinner for you.
        </p>
        <Link
          href="/swipe"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-black shadow transition-transform active:scale-95"
        >
          Start swiping →
        </Link>
        {likeCount !== null && likeCount > 0 && (
          <p className="mt-3 text-sm text-white/80">
            You&apos;ve liked {likeCount} meal{likeCount === 1 ? "" : "s"} so far.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Compare with your partner</h2>
        {loading ? (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        ) : active ? (
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-muted">
              You&apos;re in room{" "}
              <span className="font-mono font-semibold text-foreground">
                {active.room.code}
              </span>{" "}
              with {active.members.length} member
              {active.members.length === 1 ? "" : "s"}.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/matches"
                className="rounded-full bg-brand px-4 py-2 font-medium text-white"
              >
                See matches
              </Link>
              <Link
                href="/room"
                className="rounded-full border border-border px-4 py-2 font-medium"
              >
                Manage room
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-muted">
              Create a room and share the link with your partner to start
              matching.
            </p>
            <Link
              href="/room"
              className="inline-block rounded-full bg-brand px-4 py-2 font-medium text-white"
            >
              Create or join a room
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
