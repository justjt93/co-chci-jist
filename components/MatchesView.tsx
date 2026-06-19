"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/components/SupabaseProvider";
import { getActiveRoom, type ActiveRoom } from "@/lib/data";
import { MealCard } from "@/components/MealCard";
import type { Meal } from "@/lib/types";

export function MatchesView() {
  const { supabase, user, loading } = useSupabase();
  const [active, setActive] = useState<ActiveRoom | null>(null);
  const [matches, setMatches] = useState<Meal[]>([]);
  const [ready, setReady] = useState(false);
  const [pick, setPick] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let on = true;
    (async () => {
      const room = await getActiveRoom(supabase);
      if (!room) {
        if (on) setReady(true);
        return;
      }
      const { data, error } = await supabase.rpc("get_room_matches", {
        p_room_id: room.room.id,
      });
      if (!on) return;
      setActive(room);
      if (error) setError(error.message);
      else setMatches((data ?? []) as Meal[]);
      setReady(true);
    })();
    return () => {
      on = false;
    };
  }, [supabase, user]);

  const surprise = useCallback(() => {
    if (matches.length === 0) return;
    setPick(matches[Math.floor(Math.random() * matches.length)]);
  }, [matches]);

  if (loading || !ready) return <p className="text-muted">Loading…</p>;

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-muted">
        <p>You&apos;re not in a room yet.</p>
        <Link href="/room" className="mt-2 inline-block text-brand underline">
          Create or join a room →
        </Link>
      </div>
    );
  }

  const solo = active.members.length < 2;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>Room {active.room.code}:</span>
        {active.members.map((m) => (
          <span
            key={m.user_id}
            className="rounded-full border border-border px-2.5 py-0.5"
          >
            {m.display_name}
          </span>
        ))}
      </div>

      {solo && (
        <p className="rounded-lg bg-brand/10 px-4 py-2 text-sm">
          Invite your partner with your room code — for now these are just your
          own picks.
        </p>
      )}

      {error ? (
        <p className="text-sm text-pass">{error}</p>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-muted">
          No matches yet — keep swiping!{" "}
          <Link href="/swipe" className="text-brand underline">
            Back to the deck →
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <button
              onClick={surprise}
              className="w-full rounded-full bg-brand px-4 py-3 font-semibold text-white transition-transform active:scale-95"
            >
              🎲 Surprise me
            </button>
            {pick && (
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  {pick.image_url && (
                    <Image
                      src={pick.image_url}
                      alt={pick.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Tonight:
                  </p>
                  <p className="truncate text-lg font-bold">{pick.name}</p>
                  <Link
                    href={`/meal/${pick.id}`}
                    className="text-sm text-brand underline"
                  >
                    See recipe →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-muted">
            {matches.length} match{matches.length === 1 ? "" : "es"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {matches.map((m) => (
              <MealCard key={m.id} meal={m} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
