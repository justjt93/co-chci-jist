"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type SupabaseContextValue = {
  supabase: SupabaseClient;
  user: User | null;
  /** true until the initial session (anonymous or otherwise) is resolved */
  loading: boolean;
};

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

// Shared across mounts so React Strict Mode / concurrent renders can't kick off
// more than one anonymous sign-in at a time (which created duplicate guests).
let anonSignIn: Promise<void> | null = null;

async function ensureSession(supabase: SupabaseClient) {
  // Gate sign-in on the LOCAL session — using getUser() to decide *whether* to
  // sign in was the bug: a slow/blocked validation (common in the in-app
  // browsers messaging apps open links in) looked like "no session", so a
  // brand-new guest got created on top of the existing one (several identities).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    // Validate, but only discard the session when the server says it's truly
    // invalid (e.g. the user was deleted). Transient/network errors keep it,
    // so we never spawn duplicate guests.
    const { error } = await supabase.auth.getUser();
    if (!error) return;
    const status = (error as { status?: number }).status;
    if (status !== 401 && status !== 403) return;
    // else: session is invalid → fall through and create a fresh guest.
  }

  if (!anonSignIn) {
    anonSignIn = supabase.auth
      .signInAnonymously()
      .then(({ error }) => {
        if (error) console.error("Anonymous sign-in failed:", error.message);
      })
      .finally(() => {
        anonSignIn = null;
      });
  }
  await anonSignIn;
}

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    (async () => {
      await ensureSession(supabase);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (active) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // A sign-out should drop back into a fresh guest session.
      if (event === "SIGNED_OUT") {
        ensureSession(supabase);
      }
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const value = useMemo(
    () => ({ supabase, user, loading }),
    [supabase, user, loading],
  );

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used within <SupabaseProvider>");
  }
  return ctx;
}
