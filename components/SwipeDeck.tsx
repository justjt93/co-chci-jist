"use client";

import Link from "next/link";
import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "motion/react";
import { useSupabase } from "@/components/SupabaseProvider";
import { RecipeModal } from "@/components/RecipeModal";
import type { Choice, Meal } from "@/lib/types";

type CardHandle = { decide: (choice: Choice) => void };

const SwipeCard = forwardRef<
  CardHandle,
  { meal: Meal; draggable: boolean; onDecided: (choice: Choice) => void }
>(function SwipeCard({ meal, draggable, onDecided }, ref) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-16, 16]);
  const eatOpacity = useTransform(x, [40, 150], [0, 1]);
  const passOpacity = useTransform(x, [-150, -40], [1, 0]);

  const fling = useCallback(
    (choice: Choice) => {
      const target = choice === "eat" ? 800 : -800;
      animate(x, target, { duration: 0.32, ease: "easeOut" }).then(() =>
        onDecided(choice),
      );
    },
    [x, onDecided],
  );

  useImperativeHandle(ref, () => ({ decide: fling }), [fling]);

  return (
    <motion.div
      style={{ x, rotate }}
      drag={draggable ? "x" : false}
      dragElastic={0.7}
      dragSnapToOrigin={false}
      onDragEnd={(_, info: PanInfo) => {
        if (info.offset.x > 120) fling("eat");
        else if (info.offset.x < -120) fling("pass");
        else animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
      }}
      className="absolute inset-0 select-none-touch overflow-hidden rounded-3xl border border-border bg-card shadow-lg"
    >
      <div className="relative h-full w-full">
        {meal.image_url && (
          <Image
            src={meal.image_url}
            alt={meal.name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 400px"
            className="pointer-events-none object-cover"
            draggable={false}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <motion.div
          style={{ opacity: eatOpacity }}
          className="pointer-events-none absolute left-5 top-5 rotate-[-12deg] rounded-lg border-4 border-eat px-3 py-1 text-2xl font-extrabold uppercase tracking-wider text-eat"
        >
          Eat
        </motion.div>
        <motion.div
          style={{ opacity: passOpacity }}
          className="pointer-events-none absolute right-5 top-5 rotate-[12deg] rounded-lg border-4 border-pass px-3 py-1 text-2xl font-extrabold uppercase tracking-wider text-pass"
        >
          Pass
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h2 className="text-2xl font-bold drop-shadow">{meal.name}</h2>
          <p className="mt-1 text-sm text-white/85">
            {[meal.area, meal.category].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export function SwipeDeck() {
  const { supabase, user, loading } = useSupabase();
  const [queue, setQueue] = useState<Meal[]>([]);
  const [history, setHistory] = useState<{ meal: Meal; choice: Choice }[]>([]);
  const [initialised, setInitialised] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipeMeal, setRecipeMeal] = useState<Meal | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [starterRemaining, setStarterRemaining] = useState<number | null>(null);
  const [starterDismissed, setStarterDismissed] = useState(false);

  const topRef = useRef<CardHandle>(null);
  const fetchingRef = useRef(false);
  const actedIdsRef = useRef<Set<number>>(new Set());
  const queueRef = useRef<Meal[]>([]);
  queueRef.current = queue;
  const recipeOpenRef = useRef(false);
  recipeOpenRef.current = recipeMeal !== null;
  const hadStartersRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !user) return;
    fetchingRef.current = true;
    const { data, error } = await supabase.rpc("get_unrated_meals", {
      p_limit: 20,
    });
    fetchingRef.current = false;
    setInitialised(true);
    if (error) {
      setError(error.message);
      return;
    }
    const batch = (data ?? []) as Meal[];
    if (batch.length === 0) {
      setExhausted(true);
      return;
    }
    setQueue((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      actedIdsRef.current.forEach((id) => seen.add(id));
      return [...prev, ...batch.filter((m) => !seen.has(m.id))];
    });
  }, [supabase, user]);

  // Initial load + top up when the queue runs low.
  useEffect(() => {
    if (!user || exhausted) return;
    if (queue.length <= 5) loadMore();
  }, [user, queue.length, exhausted, loadMore]);

  // Warm the browser cache for upcoming cards so their image is ready by the
  // time the card is promoted to the top (no pop-in on swipe).
  useEffect(() => {
    queue.slice(1, 6).forEach((m) => {
      if (m.image_url) {
        const img = new window.Image();
        img.src = m.image_url;
      }
    });
  }, [queue]);

  // Counts: total unrated + unrated starter-pack meals (for the counter/nudge).
  useEffect(() => {
    if (!user) return;
    let on = true;
    (async () => {
      const [meals, prefs] = await Promise.all([
        supabase.from("meals").select("*", { count: "exact", head: true }),
        supabase.from("preferences").select("*", { count: "exact", head: true }),
      ]);
      if (on && meals.count != null) {
        setRemaining(Math.max(0, meals.count - (prefs.count ?? 0)));
      }
      // Starter count (no-op if migration 0002 isn't applied yet).
      const { data, error } = await supabase.rpc("count_unrated_starters");
      if (on && !error) {
        const n = (data as number) ?? 0;
        if (n > 0) hadStartersRef.current = true;
        setStarterRemaining(n);
      }
    })();
    return () => {
      on = false;
    };
  }, [supabase, user]);

  const persist = useCallback(
    async (meal: Meal, choice: Choice) => {
      if (!user) return;
      const { error } = await supabase
        .from("preferences")
        .upsert(
          { user_id: user.id, meal_id: meal.id, choice },
          { onConflict: "user_id,meal_id" },
        );
      if (error) setError(error.message);
    },
    [supabase, user],
  );

  const handleDecided = useCallback(
    (choice: Choice) => {
      const top = queueRef.current[0];
      if (!top) return;
      actedIdsRef.current.add(top.id);
      setHistory((h) => [...h, { meal: top, choice }]);
      setQueue((q) => q.slice(1));
      setRemaining((r) => (r != null ? Math.max(0, r - 1) : r));
      if (top.is_starter)
        setStarterRemaining((r) => (r != null ? Math.max(0, r - 1) : r));
      persist(top, choice);
    },
    [persist],
  );

  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || !user) return;
    setHistory((h) => h.slice(0, -1));
    actedIdsRef.current.delete(last.meal.id);
    setExhausted(false);
    setQueue((q) => [last.meal, ...q]);
    setRemaining((r) => (r != null ? r + 1 : r));
    if (last.meal.is_starter)
      setStarterRemaining((r) => (r != null ? r + 1 : r));
    await supabase
      .from("preferences")
      .delete()
      .match({ user_id: user.id, meal_id: last.meal.id });
  }, [history, supabase, user]);

  // Keyboard shortcuts: ← = pass, → = eat (disabled while the recipe is open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (recipeOpenRef.current) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        topRef.current?.decide("eat");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        topRef.current?.decide("pass");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading || !initialised) {
    return <DeckMessage>Loading meals…</DeckMessage>;
  }
  if (error) {
    return (
      <DeckMessage>
        Something went wrong: {error}
        <br />
        <span className="text-xs">
          Is the database seeded and are anonymous sign-ins enabled?
        </span>
      </DeckMessage>
    );
  }
  if (!user) {
    return <DeckMessage>Couldn&apos;t start a guest session.</DeckMessage>;
  }

  const top = queue[0];
  const inStarterRound =
    starterRemaining != null && starterRemaining > 0 && !starterDismissed;
  const showMilestone =
    starterRemaining === 0 && hadStartersRef.current && !starterDismissed;

  const counterLabel = inStarterRound
    ? `🍟 Starter picks · ${starterRemaining} left`
    : remaining != null && remaining > 0
      ? `${remaining} left to swipe`
      : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full max-w-sm flex-col gap-2">
        {counterLabel && (
          <p className="self-end text-xs tabular-nums text-muted">
            {counterLabel}
          </p>
        )}
        <div className="relative aspect-[3/4] w-full">
          {showMilestone ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-lg font-semibold">
                🎉 You&apos;ve swiped the starter set!
              </p>
              <p className="text-sm text-muted">
                See what you both want, or keep going through the rest.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-3">
                <Link
                  href="/matches"
                  className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white"
                >
                  See matches →
                </Link>
                <button
                  onClick={() => setStarterDismissed(true)}
                  className="rounded-full border border-border px-4 py-2 text-sm"
                >
                  Keep swiping
                </button>
              </div>
            </div>
          ) : queue.length === 0 ? (
            <DeckMessage>
              🎉 You&apos;ve been through every meal!
              <br />
              <Link href="/matches" className="text-brand underline">
                See your matches →
              </Link>
            </DeckMessage>
          ) : (
            queue.slice(0, 3).map((meal, i) => {
              const isTop = i === 0;
              return (
                <div
                  key={meal.id}
                  className="absolute inset-0 transition-transform duration-300 ease-out"
                  style={{
                    zIndex: 10 - i,
                    transform: `scale(${1 - i * 0.04}) translateY(${i * 12}px)`,
                    pointerEvents: isTop ? "auto" : "none",
                  }}
                >
                  <SwipeCard
                    ref={isTop ? topRef : undefined}
                    meal={meal}
                    draggable={isTop}
                    onDecided={handleDecided}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {top && !showMilestone && (
        <>
          <div className="flex items-center justify-center gap-5">
            <div className="group relative">
              <button
                aria-label="Pass"
                title="Pass (←)"
                onClick={() => topRef.current?.decide("pass")}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-pass bg-card text-2xl text-pass shadow transition-transform active:scale-90"
              >
                ✕
              </button>
              <Tooltip>Pass (←)</Tooltip>
            </div>
            <div className="group relative">
              <button
                aria-label="Undo"
                title="Undo last"
                onClick={undo}
                disabled={history.length === 0}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-lg shadow disabled:opacity-30"
              >
                ↶
              </button>
              <Tooltip>Undo last</Tooltip>
            </div>
            <div className="group relative">
              <button
                aria-label="Eat"
                title="Eat (→)"
                onClick={() => topRef.current?.decide("eat")}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-eat bg-card text-2xl text-eat shadow transition-transform active:scale-90"
              >
                ♥
              </button>
              <Tooltip>Eat (→)</Tooltip>
            </div>
          </div>
          <p className="text-xs text-muted">
            Tip: use ← / → keys, or swipe / drag the card.
          </p>
          <button
            onClick={() => setRecipeMeal(top)}
            className="text-sm text-muted underline underline-offset-4"
          >
            View recipe ↗
          </button>
        </>
      )}

      {recipeMeal && (
        <RecipeModal meal={recipeMeal} onClose={() => setRecipeMeal(null)} />
      )}
    </div>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
      {children}
    </span>
  );
}

function DeckMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-3xl border border-dashed border-border bg-card p-6 text-center text-muted">
      <p>{children}</p>
    </div>
  );
}
