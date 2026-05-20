/**
 * Schema introspection helper.
 *
 * Agents that touch the database need to know which tables actually exist —
 * otherwise they hallucinate names (we've seen them invent Arabic tables
 * like "بلاغات" or English ones like "activity_log"). We expose a small,
 * cached helper that returns the public-schema table list, then inject
 * that list into agent system prompts at runtime.
 */

import { createServiceClient } from "@/lib/supabase/server"

let cachedTables: string[] | null = null
let cachedAt = 0
const TTL_MS = 5 * 60_000 // 5 minutes is plenty — schema rarely changes.

export async function listPublicTables(): Promise<string[]> {
  const now = Date.now()
  if (cachedTables && now - cachedAt < TTL_MS) return cachedTables

  try {
    const supabase = createServiceClient()
    // information_schema lookups via PostgREST aren't allowed by default,
    // so we use a single SELECT on a curated view if available, otherwise
    // fall back to a hardcoded list. Easiest: rely on a SQL RPC.
    const { data, error } = await supabase.rpc("list_public_tables")
    if (error || !Array.isArray(data)) {
      console.error("[agents/schema] list_public_tables RPC failed:", error?.message)
      return cachedTables ?? []
    }
    cachedTables = (data as Array<{ table_name: string }>).map((r) => r.table_name)
    cachedAt = now
    return cachedTables
  } catch (err) {
    console.error("[agents/schema] listPublicTables crashed:", err)
    return cachedTables ?? []
  }
}

/**
 * Return a system-prompt fragment listing every available public table.
 * Used by chief/analyst/support so the model never invents table names.
 *
 * NOTE: We intentionally render the list as a single comma-separated line
 * instead of a bulleted list. The bullet form was costing us ~600 input
 * tokens on every Groq call (and we have ~80 tables); the inline form
 * fits in ~150 tokens with no loss of information for the model.
 */
export async function schemaPromptFragment(): Promise<string> {
  const tables = await listPublicTables()
  if (tables.length === 0) return ""
  return [
    "[الجداول المتاحة]",
    `استخدم فقط أحد هذه الأسماء مع database_*: ${tables.join(", ")}.`,
    "إن لم يكن الجدول المطلوب موجوداً، أبلغ المستخدم بدل اختراع اسم.",
  ].join("\n")
}

/** Find tables whose name contains the given substring — used for "did you mean?" suggestions. */
export async function suggestTables(needle: string, max = 5): Promise<string[]> {
  const tables = await listPublicTables()
  const lower = needle.toLowerCase()
  return tables.filter((t) => t.toLowerCase().includes(lower)).slice(0, max)
}
