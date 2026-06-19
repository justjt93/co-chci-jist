import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in Client Components / the browser.
 * @supabase/ssr stores the session in cookies, so the server can read it too.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
