import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, Meal } from "@/lib/types";

export default async function MealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mealId = Number(id);
  if (!Number.isFinite(mealId)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .select("*")
    .eq("id", mealId)
    .single();

  if (error || !data) notFound();
  const meal = data as Meal;

  const steps = (meal.instructions ?? "")
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article className="flex flex-col gap-6">
      <Link href="/swipe" className="text-sm text-muted">
        ← Back to swiping
      </Link>

      <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-border">
        {meal.image_url && (
          <Image
            src={meal.image_url}
            alt={meal.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        )}
      </div>

      <header>
        <h1 className="text-3xl font-bold">{meal.name}</h1>
        <p className="mt-1 text-muted">
          {[meal.area, meal.category].filter(Boolean).join(" · ")}
        </p>
        {meal.tags && meal.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {meal.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Ingredients</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {meal.ingredients.map((ing: Ingredient, i: number) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
            >
              <span>{ing.name}</span>
              <span className="text-muted">{ing.measure}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Recipe</h2>
        <div className="space-y-3 text-sm leading-relaxed">
          {steps.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      </section>

      {meal.youtube_url && (
        <a
          href={meal.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-2.5 font-medium text-white"
        >
          ▶ Watch on YouTube
        </a>
      )}
    </article>
  );
}
