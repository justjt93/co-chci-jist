"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/SupabaseProvider";
import { getActiveRoom, type ActiveRoom } from "@/lib/data";

export function RoomManager() {
  const { supabase, user, loading } = useSupabase();
  const router = useRouter();
  const [active, setActive] = useState<ActiveRoom | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setActive(await getActiveRoom(supabase));
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  async function createRoom() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("create_room", {
      p_display_name: name || "Guest",
    });
    setBusy(false);
    if (error) return setError(error.message);
    await refresh();
  }

  async function joinRoom() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("join_room", {
      p_code: code.trim().toUpperCase(),
      p_display_name: name || "Guest",
    });
    setBusy(false);
    if (error)
      return setError(
        error.message.includes("room not found")
          ? "No room with that code."
          : error.message,
      );
    await refresh();
  }

  async function leaveRoom() {
    if (!active || !user) return;
    setBusy(true);
    await supabase
      .from("room_members")
      .delete()
      .match({ room_id: active.room.id, user_id: user.id });
    setBusy(false);
    setActive(null);
  }

  async function signInWithGoogle() {
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=/room`;
    if (user?.is_anonymous) {
      // Link Google to the existing guest so picks are kept (same user id).
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo },
      });
      if (!error) return; // browser is redirecting to Google
      // Fall back to a plain sign-in if manual linking is disabled or the
      // Google account is already attached to another user.
      const { error: e2 } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (e2) setError(e2.message);
    } else {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) setError(error.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  function copyLink() {
    if (!active) return;
    const url = `${window.location.origin}/room/join/${active.room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (loading || !ready) return <p className="text-muted">Loading…</p>;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Account</h2>
        {user && !user.is_anonymous ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted">
              Signed in as{" "}
              <span className="text-foreground">{user.email}</span> — your picks
              sync across devices.
            </p>
            <button
              onClick={signOut}
              className="rounded-full border border-border px-3 py-1.5"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-muted">
              You&apos;re a guest — your picks live on this device. Sign in with
              Google to keep them and use the app on your phone and laptop.
            </p>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 font-medium"
            >
              <span aria-hidden>🇬</span> Sign in with Google
            </button>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-pass/10 px-4 py-2 text-sm text-pass">
          {error}
        </p>
      )}

      {active ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Your room</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-brand px-4 py-2 font-mono text-xl font-bold tracking-widest text-white">
              {active.room.code}
            </span>
            <button
              onClick={copyLink}
              className="rounded-full border border-border px-3 py-2 text-sm"
            >
              {copied ? "Copied!" : "Copy invite link"}
            </button>
          </div>
          <p className="mt-4 text-sm text-muted">Members</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {active.members.map((m) => (
              <li
                key={m.user_id}
                className="rounded-full border border-border px-3 py-1 text-sm"
              >
                {m.display_name}
                {m.user_id === user?.id ? " (you)" : ""}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/matches"
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              See matches →
            </Link>
            <button
              onClick={leaveRoom}
              disabled={busy}
              className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50"
            >
              Leave room
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Create a room</h2>
            <p className="mt-1 text-sm text-muted">
              Start a room and share the link with your partner.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`mt-3 ${inputClass}`}
            />
            <button
              onClick={createRoom}
              disabled={busy}
              className="mt-3 w-full rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Create room
            </button>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">Join a room</h2>
            <p className="mt-1 text-sm text-muted">
              Enter the code your partner shared.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`mt-3 ${inputClass}`}
            />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Room code"
              className={`mt-2 font-mono tracking-widest ${inputClass}`}
            />
            <button
              onClick={joinRoom}
              disabled={busy || !code}
              className="mt-3 w-full rounded-full bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Join room
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
