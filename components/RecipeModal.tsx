"use client";

import Image from "next/image";
import { useEffect } from "react";
import type { Meal } from "@/lib/types";
import { RecipeBody } from "@/components/RecipeBody";

export function RecipeModal({
  meal,
  onClose,
}: {
  meal: Meal;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meal.name}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl"
      >
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-lg shadow backdrop-blur"
        >
          ✕
        </button>

        <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-2xl">
          {meal.image_url && (
            <Image
              src={meal.image_url}
              alt={meal.name}
              fill
              sizes="(max-width: 512px) 100vw, 512px"
              className="object-cover"
            />
          )}
        </div>

        <h2 className="text-2xl font-bold">{meal.name}</h2>
        <p className="mt-1 text-muted">
          {[meal.area, meal.category].filter(Boolean).join(" · ")}
        </p>

        <div className="mt-4">
          <RecipeBody meal={meal} />
        </div>
      </div>
    </div>
  );
}
