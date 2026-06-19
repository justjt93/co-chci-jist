import Link from "next/link";
import Image from "next/image";
import type { Meal } from "@/lib/types";

export function MealCard({ meal }: { meal: Meal }) {
  return (
    <Link
      href={`/meal/${meal.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative aspect-square">
        {meal.image_url && (
          <Image
            src={meal.image_url}
            alt={meal.name}
            fill
            sizes="(max-width: 640px) 50vw, 280px"
            className="object-cover transition-transform group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-1 font-medium">{meal.name}</p>
        <p className="line-clamp-1 text-xs text-muted">
          {[meal.area, meal.category].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
