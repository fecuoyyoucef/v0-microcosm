import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

const model = google("gemini-2.5-flash")

const proposalSchema = z.object({
  topics: z.array(z.object({
    title: z.string().min(3).max(120),
    description: z.string().max(500),
    topicKey: z.string().regex(/^[a-z0-9-]{3,80}$/),
    importance: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    parentTopicKey: z.string().nullable(),
    messageIndexes: z.array(z.number().int().nonnegative()).min(1).max(80),
  })).max(20),
})

type MessageRow = { id: string; sender_id: string; content: string; created_at: string; node_id: string | null }
type ExistingNode = { id: string; title: string; description: string | null; parent_id: string | null; auto_topic_key: string | null; auto_status: string }

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
}

export async function organizeGroupTopics(supabase: SupabaseClient, groupId: string, actorId: string) {
  const { data: group } = await (supabase.from("groups") as any).select("id, name, goal, auto_topic_nodes_enabled").eq("id", groupId).single()
  if (!group || group.auto_topic_nodes_enabled === false) return { status: "skipped", groupId, reason: "disabled" }

  const { data: messages, error: messagesError } = await (supabase.from("messages") as any)
    .select("id, sender_id, content, created_at, node_id")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(240)
  if (messagesError) throw messagesError

  const eligible = (messages as MessageRow[]).filter((message) => {
    const text = message.content.trim()
    return text.length >= 35 && !/^([😂🤣ههههههه\s.!؟?])+$/u.test(text)
  }).reverse()
  if (eligible.length < 10) return { status: "skipped", groupId, reason: "not-enough-effective-messages", processed: eligible.length }

  const { data: existing } = await (supabase.from("conversation_nodes") as any)
    .select("id, title, description, parent_id, auto_topic_key, auto_status")
    .eq("group_id", groupId)
    .neq("auto_status", "rejected")
    .limit(100)

  const transcript = eligible.map((message, index) => `[${index}] ${message.content}`).join("\n")
  const existingText = ((existing || []) as ExistingNode[]).map((node) => `${node.id} | ${node.title} | ${node.description || ""}`).join("\n")
  const result = await generateObject({
    model,
    schema: proposalSchema,
    temperature: 0.1,
    system: `أنت منظم مواضيع لمفكرة وخريطة محادثة عربية. استخرج مواضيع مهمة فقط، لا تنشئ عقدة للمزاح أو التحية أو الرسائل القصيرة أو التكرار. الموضوع الجديد يحتاج 10 رسائل فعالة مترابطة على الأقل. اربط الموضوع بعقدة موجودة إن كان نفس الموضوع، واستخدم parentTopicKey فقط لتدرج واضح بحد أقصى أب وابن. لا تعتبر الوعد أو السؤال المنفرد موضوعاً مستقلاً. topicKey ثابت ومختصر بالإنجليزية الصغيرة والشرطات، ويجب أن يكون متسقاً للموضوع نفسه. أعد JSON مطابقاً للمخطط.`,
    prompt: `اسم الخلية: ${group.name}\nهدفها: ${group.goal || "غير محدد"}\n\nالعقد الموجودة:\n${existingText || "لا توجد"}\n\nالرسائل الجديدة:\n${transcript}`,
  })

  let created = 0
  let linked = 0
  const keyToId = new Map<string, string>()
  for (const node of (existing || []) as ExistingNode[]) if (node.auto_topic_key) keyToId.set(node.auto_topic_key, node.id)

  for (const topic of result.object.topics) {
    const indexes = [...new Set(topic.messageIndexes)].filter((index) => index >= 0 && index < eligible.length)
    if (indexes.length < 10 || topic.importance < 55 || topic.confidence < 55) continue
    const topicKey = normalizeKey(topic.topicKey)
    if (!topicKey) continue
    let nodeId = keyToId.get(topicKey)
    if (!nodeId) {
      const parentId = topic.parentTopicKey ? keyToId.get(normalizeKey(topic.parentTopicKey)) || null : null
      const { data: inserted, error } = await (supabase.from("conversation_nodes") as any).insert({
        group_id: groupId,
        parent_id: parentId,
        title: topic.title,
        description: topic.description,
        node_type: parentId ? "secondary" : "primary",
        icon: "folder",
        color: parentId ? "#8B5CF6" : "#3B82F6",
        created_by: actorId,
        auto_status: "pending",
        auto_topic_key: topicKey,
        ai_confidence: topic.confidence / 100,
        source_message_ids: indexes.map((index) => eligible[index].id),
        temporary_until: new Date(Date.now() + 7 * 86400000).toISOString(),
        auto_updated_at: new Date().toISOString(),
      }).select("id").single()
      if (error) {
        if (error.code === "23505") continue
        throw error
      }
      nodeId = inserted.id as string
      keyToId.set(topicKey, nodeId)
      created++
    }
    const ids = indexes.map((index) => eligible[index].id)
    const { error: linkError } = await (supabase.from("messages") as any).update({ node_id: nodeId }).in("id", ids).is("node_id", null)
    if (linkError) throw linkError
    linked += ids.length
  }

  await (supabase.from("auto_node_runs") as any).insert({ group_id: groupId, processed_message_count: eligible.length, created_node_count: created, linked_message_count: linked, status: "success" })
  return { status: "success", groupId, processed: eligible.length, created, linked }
}
