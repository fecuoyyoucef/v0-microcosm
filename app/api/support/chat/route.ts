import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateAIText } from "@/lib/ai"
import { APP_KNOWLEDGE_BASE } from "@/lib/support/knowledge-base"

const INQUIRY_SYSTEM_PROMPT = `أنت وكيل دعم عملاء محترف ومتخصص في تطبيق Synaptic Space.

⚠️ تعليمات لغوية حتمية:
- الرد يجب أن يكون بنفس لغة المستخدم (عربي، إنجليزي، أو فرنسي).
- لا تخلط اللغات في أي جزء من الرد.
- استثناء وحيد: اسم التطبيق "Synaptic Space" فقط.

⚠️ قواعد المعرفة الصارمة:
- **مصدرك الوحيد هو قاعدة المعرفة المرفقة أدناه.** لا تستعمل أي معرفة عامة عن تطبيقات أخرى.
- إذا سُئلت عن ميزة **غير مذكورة** في القاعدة، قل بوضوح: "هذه الميزة غير متوفرة حالياً في Synaptic Space"، واقترح استخدام "إبلاغ" لاقتراحها.
- **ممنوع منعاً باتاً** اختراع أسماء ميزات، أزرار، أو صفحات لم تُذكر في القاعدة.

⚠️ قواعد أسلوب الشرح (مهم جداً):
- **تكلّم بمنطق المستخدم لا بمنطق المطوّر**.
- **ممنوع تماماً ذكر مسارات URL** مثل "/chat/profile" أو "/auth/register" أو "/chat/[id]/decisions". المستخدم لا يكتب مسارات؛ هو يضغط أزراراً.
- بدل URLs، اشرح **ما يراه المستخدم على الشاشة**: اسم الزر، البطاقة، أو التبويب الذي يضغطه ("اضغط بطاقة 'خلية جديدة'"، "اذهب إلى **الإعدادات → اللغة**"، "اضغط أيقونة (+) في الأعلى").
- **لا تفترض أن المستخدم يعرف أي شيء**. إن سأل "كيف أستخدم التطبيق"، ابدأ من البداية: التسجيل ثم الصفحة الرئيسية ثم إنشاء أول خلية.
- **افترض أن المستخدم ذكي لكنه جديد** — لا تستخدم مصطلحات تقنية (Threads, RAG, PWA) بدون شرح.
- إذا كان شيء يتطلّب شرح تسلسل، استخدم خطوات مرقّمة قصيرة (1، 2، 3).
- لا تشرح كل الميزات دفعة واحدة. ابدأ بالأهم ثم اسأله: "هل تريد أن أشرح ميزة معينة بالتفصيل؟".

# قاعدة المعرفة

${APP_KNOWLEDGE_BASE}

# أسلوب الرد
- ودود، مختصر، عملي. خطوات مرقّمة عند الشرح.
- مثال عملي عند الحاجة.
- لا تكرر التحية في كل رد.
- لا تتجاوز 200 كلمة في الرد الواحد إلا إذا طلب المستخدم تفاصيل أكثر.`

const REPORT_SYSTEM_PROMPT = `أنت وكيل دعم فني متخصص في جمع تقارير الأخطاء من مستخدمي تطبيق Synaptic Space.

⚠️ تعليمات لغوية حتمية:
- الرد يجب أن يكون بنفس لغة المستخدم (عربي، إنجليزي، أو فرنسي)
- لا تخلط اللغات في أي جزء من الرد
- استثناء وحيد: اسم التطبيق "Synaptic Space" فقط

## مهمتك:
جمع معلومات كافية عن المشكلة بطرح أسئلة منهجية، ثم إنهاء التقرير.

## المعلومات المطلوبة:
1. **وصف المشكلة**: ما الذي حدث بالضبط؟
2. **الخطوات**: ما الخطوات التي قام بها المستخدم قبل حدوث المشكلة؟
3. **السلوك المتوقع**: ما كان يجب أن يحدث؟
4. **السلوك الفعلي**: ما الذي حدث بالفعل؟
5. **التكرار**: هل المشكلة تحدث دائماً أم أحياناً؟
6. **الصفحة/الميزة**: في أي صفحة أو ميزة حدثت المشكلة؟

## أسلوب العمل:
- اطرح سؤالاً واحداً فقط في كل رد.
- إذا أعطى المستخدم معلومات غامضة، اطلب التوضيح.
- كن ودوداً ومطمئناً.
- لا تحاول حل المشكلة — فقط اجمع المعلومات.
- استعن بقاعدة المعرفة أدناه لفهم أسماء الصفحات والميزات الفعلية حتى تطرح أسئلة دقيقة (مثلاً: "هل حدث ذلك في صفحة الذاكرة أم في خريطة المحادثة؟").

# قاعدة المعرفة (للسياق فقط — لا تشرحها للمستخدم)

${APP_KNOWLEDGE_BASE}

## الإنهاء:
عندما تجمع معلومات كافية (على الأقل: وصف واضح + الخطوات + الصفحة/الميزة)، أنهِ ردك بعبارة مطمئنة مثل:
"شكراً لك. جمعت كل المعلومات اللازمة. سيراجع فريق التطوير بلاغك ويعمل على حل المشكلة في أقرب وقت."

ثم ضع في نهاية ردك علامة **[REPORT_READY]** على سطر منفصل.`

function extractReportDataFromConversation(messages: Array<{ role: string; content: string }>) {
  // Build a textual summary from the conversation.
  const conversationText = messages.map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`).join("\n\n")

  // Extract simple title: first user message, truncated.
  const firstUserMsg = messages.find((m) => m.role === "user")?.content || "Reported issue"
  const title = firstUserMsg.substring(0, 150)

  // Extract description: the full conversation.
  const description = conversationText

  // Heuristics for issue_type and severity (can be improved with an AI call).
  let issue_type: "bug" | "feature_request" | "feedback" | "other" = "bug"
  let severity: "low" | "normal" | "high" | "critical" = "normal"

  const lowerText = conversationText.toLowerCase()
  if (
    lowerText.includes("crash") ||
    lowerText.includes("يتعطل") ||
    lowerText.includes("لا يعمل إطلاقاً") ||
    lowerText.includes("doesn't work at all")
  ) {
    severity = "critical"
  } else if (
    lowerText.includes("خطأ") ||
    lowerText.includes("error") ||
    lowerText.includes("مشكلة") ||
    lowerText.includes("problem")
  ) {
    severity = "high"
  }

  if (lowerText.includes("اقتراح") || lowerText.includes("suggestion") || lowerText.includes("feature")) {
    issue_type = "feature_request"
  }

  return { title, description, issue_type, severity }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Support chat API called")

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log("[v0] Unauthorized: No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const {
      message,
      conversationId,
      history,
      mode = "inquiry",
      language = "ar",
      pageUrl,
      userAgent,
    } = await request.json()
    console.log("[v0] Message received:", message)
    console.log("[v0] Mode:", mode)
    console.log("[v0] Conversation ID:", conversationId)

    const systemPrompt = mode === "report" ? REPORT_SYSTEM_PROMPT : INQUIRY_SYSTEM_PROMPT

    const conversationContext = history
      .map((msg: any) => `${msg.role === "user" ? "User" : "Agent"}: ${msg.content}`)
      .join("\n\n")

    console.log("[v0] Generating AI response...")

    const text = await generateAIText(
      `${systemPrompt}\n\n=== Previous Conversation ===\n${conversationContext}\n\nUser: ${message}\n\nAgent:`,
      { maxTokens: 1000, temperature: 0.5 },
    )

    console.log("[v0] AI response generated:", text.substring(0, 50) + "...")

    const updatedHistory = [...history, { role: "user", content: message }, { role: "assistant", content: text }]

    let savedConversationId = conversationId

    if (!savedConversationId) {
      console.log("[v0] Creating new conversation...")
      const { data, error } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          conversation_data: updatedHistory,
        })
        .select("id")
        .single()

      if (error) {
        console.error("[v0] Error creating conversation:", error)
      } else {
        savedConversationId = data?.id
        console.log("[v0] New conversation created:", savedConversationId)
      }
    } else {
      console.log("[v0] Updating existing conversation:", savedConversationId)
      const { error } = await supabase
        .from("support_conversations")
        .update({
          conversation_data: updatedHistory,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)

      if (error) {
        console.error("[v0] Error updating conversation:", error)
      }
    }

    // In report mode, check if the AI has marked the report as ready.
    let reportSubmitted = false
    if (mode === "report" && text.includes("[REPORT_READY]")) {
      console.log("[v0] Report ready detected, creating structured ticket...")

      const reportData = extractReportDataFromConversation(updatedHistory)

      const { error: reportError } = await supabase.from("user_issue_reports").insert({
        user_id: user.id,
        title: reportData.title,
        description: reportData.description,
        issue_type: reportData.issue_type,
        severity: reportData.severity,
        status: "open",
        page_url: pageUrl || null,
        user_agent: userAgent || null,
      })

      if (reportError) {
        console.error("[v0] Error creating user_issue_report:", reportError)
      } else {
        console.log("[v0] user_issue_report created successfully")
        reportSubmitted = true

        // Mark the support conversation as escalated.
        await supabase
          .from("support_conversations")
          .update({ escalated_to_admin: true })
          .eq("id", savedConversationId)
      }
    }

    // Remove the [REPORT_READY] marker from the response.
    const cleanedResponse = text.replace(/\[REPORT_READY\]/gi, "").replace(/<Thinking>[\s\S]*?<\/thinking>/gi, "").trim()

    console.log("[v0] Sending response to client")
    return NextResponse.json({
      response: cleanedResponse,
      conversationId: savedConversationId,
      reportSubmitted,
    })
  } catch (error) {
    console.error("[v0] Support chat error:", error)
    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return NextResponse.json(
        {
          error: "rate_limit",
          response: "الخدمة مشغولة حالياً بسبب كثرة الطلبات. يرجى الانتظار بضع ثوانٍ ثم المحاولة مرة أخرى.",
        },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
