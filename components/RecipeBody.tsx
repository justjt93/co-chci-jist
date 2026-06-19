import type { Ingredient, Meal } from "@/lib/types";
import { parseSteps } from "@/lib/recipe";

/** Ingredients + numbered recipe steps + YouTube link. Used by the meal page and the swipe modal. */
export function RecipeBody({ meal }: { meal: Meal }) {
  const steps = parseSteps(meal.instructions);

  return (
    <div className="flex flex-col gap-6">
      {meal.ingredients.length > 0 && (
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
      )}

      {steps.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Recipe</h2>
          <ol className="flex flex-col gap-3 text-sm leading-relaxed">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

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
    </div>
  );
}
