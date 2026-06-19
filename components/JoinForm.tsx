"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";

export function JoinForm({ code }: { code: string }) {
  const { supabase, user, loading } = useSupabase();
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join() {
    if (!user) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("join_room", {
      p_code: code,
      p_display_name: name || "Guest",
    });
    setBusy(false);
    if (error)
      return setError(
        error.message.includes("room not found")
          ? "No room with that code."
          : error.message,
      );
    router.push("/matches");
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="text-xl font-semibold">Join room</h1>
      <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand">
        {code}
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <button
        onClick={join}
        disabled={busy || loading || !user}
        className="mt-3 w-full rounded-full bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join this room"}
      </button>
      {error && <p className="mt-3 text-sm text-pass">{error}</p>}
    </div>
  );
}
