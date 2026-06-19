/**
 * Seed the `meals` table from TheMealDB.
 *
 *   npm run seed
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * The service-role key bypasses RLS, so this must only ever run locally / in CI,
 * never in the browser. Re-runnable (upsert on id).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// supabase-js builds a realtime client on construction, which needs a global
// WebSocket. Node < 22 doesn't have one, so polyfill it for this script.
const g = globalThis as { WebSocket?: unknown };
if (!g.WebSocket) g.WebSocket = WebSocket;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type RawMeal = Record<string, string | null>;

const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

function parseIngredients(meal: RawMeal) {
  const out: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? "").trim();
    const measure = (meal[`strMeasure${i}`] ?? "").trim();
    if (name) out.push({ name, measure });
  }
  return out;
}

async function main() {
  const byId = new Map<number, Record<string, unknown>>();

  process.stdout.write("Fetching TheMealDB ");
  for (const letter of LETTERS) {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`,
    );
    if (!res.ok) {
      console.warn(`\n  letter "${letter}": HTTP ${res.status}, skipping`);
      continue;
    }
    const json = (await res.json()) as { meals: RawMeal[] | null };
    for (const m of json.meals ?? []) {
      const id = Number(m.idMeal);
      if (!id || byId.has(id)) continue;
      byId.set(id, {
        id,
        name: m.strMeal,
        category: m.strCategory || null,
        area: m.strArea || null,
        instructions: m.strInstructions || null,
        image_url: m.strMealThumb || null,
        youtube_url: m.strYoutube || null,
        tags: m.strTags
          ? m.strTags.split(",").map((t) => t.trim()).filter(Boolean)
          : null,
        ingredients: parseIngredients(m),
        source: "themealdb",
      });
    }
    process.stdout.write(".");
  }

  const rows = [...byId.values()];
  console.log(`\nFetched ${rows.length} unique meals. Upserting…`);

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("meals")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("Upsert error:", error.message);
      process.exit(1);
    }
    console.log(`  upserted ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
  }

  const { count, error } = await supabase
    .from("meals")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error("Count error:", error.message);
    process.exit(1);
  }
  console.log(`Done. meals table now has ${count} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
