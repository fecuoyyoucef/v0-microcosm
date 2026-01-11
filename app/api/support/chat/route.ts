import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAIModel } from "@/lib/ai"
import { generateText } from "ai"

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

    const { message, conversationId, history } = await request.json()
    console.log("[v0] Message received:", message)
    console.log("[v0] Conversation ID:", conversationId)
    console.log("[v0] History length:", history?.length)

    const systemPrompt = `أنت وكيل دعم عملاء محترف ومتخصص في تطبيق Synaptic Space - منصة محادثات جماعية ذكية مبتكرة.

# معلومات التطبيق الكاملة

## ما هو Synaptic Space؟
Synaptic Space هو تطبيق محادثة جماعية ذكي يعمل بالذكاء الاصطناعي، مصمم لتنظيم النقاشات الجماعية وتحسين التواصل والتعاون بين الأعضاء. التطبيق يدعم اللغة العربية، الإنجليزية، والفرنسية بشكل كامل.

## الميزات الأساسية:

### 1. الخلايا (Cells)
- مجموعات مصغرة ومنظمة لمواضيع محددة (مشاريع، مناقشات، فرق عمل)
- كل خلية لها هدف محدد ووصف وفئة (project أو discussion)
- الأعضاء لهم أدوار: admin, moderator, member, viewer
- يمكن للأعضاء الانضمام بدعوة أو طلب

### 2. العقد والمحادثات (Conversation Nodes)
- تنظيم المحادثات داخل الخلايا إلى عقد (nodes) حسب الموضوع
- أنواع العقد: discussion, question, announcement, idea, decision
- كل عقدة لها عنوان، وصف، ورسائل مرتبطة
- نظام طبقات لتنظيم الردود والنقاشات

### 3. القرارات الجماعية (Decisions)
- نظام تصويت ديمقراطي للقرارات المهمة
- حالات القرار: pending, approved, rejected
- التصويت: yes, no, abstain
- عرض نتائج التصويت والإحصائيات

### 4. الألقاب والإنجازات (Titles & Achievements)
- نظام نقاط متقدم يكافئ النشاط والمساهمة
- ألقاب مختلفة حسب الندرة: common, rare, epic, legendary
- أنواع الألقاب: participation, leadership, quality, creativity
- عرض الألقاب في الملف الشخصي

### 5. المساعد الذكي (AI Assistant)
- مساعد ذكي مدعوم بـ AI يحلل المحادثات
- يقدم ملخصات، توصيات، وإجابات على الأسئلة
- يفهم السياق الكامل للمستخدم (إحصائيات، خلايا، نشاط)
- متاح من الشريط السفلي أو صفحة مخصصة

### 6. البحث الدلالي (Semantic Search)
- بحث متقدم بالذكاء الاصطناعي في جميع المحادثات
- فهم المعنى وليس فقط الكلمات
- نتائج مرتبة حسب الصلة
- تصفية حسب الخلايا والتواريخ

### 7. الإشعارات الذكية (Smart Notifications)
- إشعارات فورية عبر الويب والموبايل
- أنواع: mentions, replies, decisions, announcements
- إعدادات قابلة للتخصيص

### 8. نظام الإدارة (Admin Dashboard)
- لوحة تحكم شاملة للمشرفين
- إحصائيات متقدمة ورؤى
- إدارة المستخدمين والمحتوى
- نظام تذاكر الدعم

### 9. الملفات الشخصية (Profiles)
- معلومات شخصية قابلة للتخصيص
- السيرة الذاتية والاهتمامات
- عرض الإحصائيات والإنجازات
- روابط الشبكات الاجتماعية

### 10. التصويت والتفاعل (Reactions & Voting)
- تفاعلات متنوعة على الرسائل (👍❤️😂😮🎉)
- تصويت على القرارات
- إشارات للمستخدمين (@username)
- ردود منظمة في طبقات

## المشاكل الشائعة وحلولها:

### مشاكل تسجيل الدخول:
- تأكد من صحة البريد الإلكتروني وكلمة المرور
- تحقق من البريد الإلكتروني لتفعيل الحساب
- استخدم "نسيت كلمة المرور" إذا لزم الأمر

### مشاكل الإشعارات:
- تأكد من تفعيل الإشعارات في إعدادات المتصفح
- تحقق من إعدادات الإشعارات في التطبيق
- جرب تسجيل الخروج والدخول مرة أخرى

### مشاكل الخلايا:
- للانضمام لخلية، تحتاج دعوة أو الطلب للانضمام
- إذا لم تستطع رؤية خلية، قد لا تكون عضواً فيها
- المشرفون فقط يمكنهم تعديل إعدادات الخلية

### مشاكل المحتوى:
- إذا لم تظهر رسالتك، حاول تحديث الصفحة
- تأكد من اتصالك بالإنترنت
- بعض المحتوى قد يكون محذوفاً أو مخفياً

## تعليمات المحادثة:

1. استخدم اللغة العربية الفصحى الواضحة فقط - لا تخلط كلمات أجنبية
2. كن ودوداً، محترفاً، ومفيداً
3. إذا سأل المستخدم عن ميزة موجودة، اشرحها بالتفصيل
4. إذا سأل عن ميزة غير موجودة، أخبره بصراحة أنها غير متوفرة حالياً
5. لا توجه المستخدمين لصفحات أو أقسام غير موجودة
6. إذا واجه المستخدم مشكلة تقنية، قدم الحلول المباشرة
7. إذا كانت مشكلة معقدة، اقترح التواصل مع فريق التطوير
8. لا تخترع معلومات أو ميزات غير موجودة
9. كن دقيقاً في الإجابات وتجنب الغموض
10. استخدم أمثلة عملية عند الشرح

تذكر: أنت لست مساعد عام، بل وكيل دعم متخصص في Synaptic Space فقط.`

    const conversationContext = history
      .map((msg: any) => `${msg.role === "user" ? "المستخدم" : "الوكيل"}: ${msg.content}`)
      .join("\n")

    console.log("[v0] Generating AI response...")

    const { text } = await generateText({
      model: getAIModel(),
      prompt: `${systemPrompt}\n\nالمحادثة السابقة:\n${conversationContext}\n\nالمستخدم: ${message}\n\nالوكيل:`,
    })

    console.log("[v0] AI response generated:", text.substring(0, 50) + "...")

    let savedConversationId = conversationId

    if (!savedConversationId) {
      console.log("[v0] Creating new conversation...")
      const { data, error } = await supabase
        .from("support_conversations")
        .insert({
          user_id: user.id,
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
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
          conversation_data: [...history, { role: "user", content: message }, { role: "assistant", content: text }],
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)

      if (error) {
        console.error("[v0] Error updating conversation:", error)
      }
    }

    const issueKeywords = ["خطأ", "مشكلة", "لا يعمل", "عطل", "bug", "error", "broken"]
    const issueDetected = issueKeywords.some((keyword) => message.toLowerCase().includes(keyword))

    if (issueDetected) {
      console.log("[v0] Issue detected in message")
      await supabase
        .from("support_conversations")
        .update({
          issue_detected: message,
        })
        .eq("id", savedConversationId)
    }

    console.log("[v0] Sending response to client")
    return NextResponse.json({
      response: text,
      conversationId: savedConversationId,
      issueDetected,
    })
  } catch (error) {
    console.error("[v0] Support chat error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
