import type { SupabaseClient } from "@supabase/supabase-js"
import { generateAIText } from "@/lib/ai"

/**
 * Generate (or refresh) the daily collective_memory summary for a single
 * group. Idempotent: short-circuits if a summary already exists for the
 * current UTC date, so it's safe to call on every memory-page visit.
 *
 * This is the single source of truth used by:
 *  - the nightly Vercel cron (`/api/cron/generate-summaries`)
 *  - the lazy on-visit trigger (`/app/chat/[groupId]/memory/page.tsx`)
 *
 * Why a lazy trigger? Vercel crons run only on production deployments and
 * only at the scheduled UTC time. Without an on-visit fallback the feature
 * appears broken in dev, in preview, and on freshly deployed projects until
 * midnight UTC passes. The lazy path makes it work everywhere.
 */
export type SummaryResult =
  | { status: "already_exists"; groupId: string }
  | { status: "no_messages"; groupId: string }
  | { status: "success"; groupId: string; messageCount: number }
  | { status: "save_error"; groupId: string; error: string }
  | { status: "ai_error"; groupId: string; error: string }

export async function generateDailySummaryForGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<SummaryResult> {
  const today = new Date().toISOString().split("T")[0]
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Idempotency guard: if today's summary already exists we never touch the
  // AI provider again. This also protects against accidental concurrent
  // generation when many users open the memory page at once.
  const { data: existing } = await supabase
    .from("collective_memory")
    .select("id")
    .eq("group_id", groupId)
    .eq("summary_date", today)
    .maybeSingle()

  if (existing) {
    return { status: "already_exists", groupId }
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("content, sender_id, layer")
    .eq("group_id", groupId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })

  if (!messages || messages.length === 0) {
    return { status: "no_messages", groupId }
  }

  // Resolve sender names so the LLM sees who said what — important for
  // generating attributable highlights and decisions.
  const senderIds = [...new Set(messages.map((m) => m.sender_id))]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", senderIds)
  const nameById = new Map(profiles?.map((p) => [p.id, p.display_name]) || [])

  const transcript = messages
    .map((m) => `[${nameById.get(m.sender_id) || "مستخدم"}]: ${m.content}`)
    .join("\n")

  let aiText: string
  try {
    aiText = await generateAIText(
      `لخص المحادثة التالية وأبرز النقاط المهمة والقرارات. أرجع الإجابة بصيغة JSON بالشكل التالي:
{
  "summary": "ملخص المحادثة",
  "highlights": ["نقطة 1", "نقطة 2"],
  "topics": ["موضوع 1", "موضوع 2"],
  "decisions": ["قرار 1"]
}

المحادثة:
${transcript}`,
    )
  } catch (e) {
    return {
      status: "ai_error",
      groupId,
      error: e instanceof Error ? e.message : "AI error",
    }
  }

  let parsed = {
    summary: aiText,
    highlights: [] as string[],
    topics: [] as string[],
    decisions: [] as string[],
  }
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    // The model returned plain text — keep it as the summary, leave the
    // structured fields empty so the UI still shows something useful.
  }

  const { error: saveError } = await supabase.from("collective_memory").upsert(
    {
      group_id: groupId,
      summary_date: today,
      summary: parsed.summary,
      highlights: parsed.highlights,
      topics: parsed.topics,
      decisions: parsed.decisions,
      message_count: messages.length,
      generated_at: new Date().toISOString(),
      auto_generated: true,
    },
    { onConflict: "group_id,summary_date" },
  )

  if (saveError) {
    return { status: "save_error", groupId, error: saveError.message }
  }

  return { status: "success", groupId, messageCount: messages.length }
}
