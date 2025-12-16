import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function createBrowserClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables. Please check your .env file.")
  }

  client = createSupabaseBrowserClient(url, key)
  return client
}

// Keep the old function for backward compatibility
export function createClient() {
  return createBrowserClient()
}
