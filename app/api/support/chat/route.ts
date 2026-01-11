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

⚠️ تعليمات لغوية حتمية:
- الرد يجب أن يكون عربياً فصحياً فقط بلا استثناء
- لا تستخدم أي كلمات بلغات أخرى (إنجليزية، صينية، فرنسية، أو أي لغة أخرى)
- لا تخلط اللغات في أي جزء من الرد
- لا تكتب كلمات أجنبية حتى لو كانت أسماء تقنية
- استثناء وحيد: اسم التطبيق "Synaptic Space" فقط
- إذا احتجت لشرح مصطلح تقني، ترجمه للعربية الفصحى

# معلومات التطبيق الكاملة

## ما هو Synaptic Space؟
Synaptic Space هو تطبيق محادثة جماعية ذكي يعمل بالذكاء الاصطناعي، مصمم لتنظيم النقاشات الجماعية وتحسين التواصل والتعاون بين الأعضاء. التطبيق يدعم اللغة العربية والإنجليزية والفرنسية بشكل كامل.

## الميزات الأساسية:

### 1. الخلايا (مجموعات مصغرة)
- مجموعات منظمة لمواضيع محددة مثل المشاريع أو المناقشات أو فرق العمل
- لكل خلية هدف محدد وفئة (مشروع أو نقاش)
- الأعضاء لهم أدوار: مشرف، مراقب، عضو، ضيف
- يمكن الانضمام بدعوة أو بطلب

### 2. العقود والمحادثات (تنظيم النقاشات)
- تنظيم المحادثات داخل الخلايا إلى موضوعات حسب النوع
- أنواع الموضوعات: نقاش، سؤال، إعلان، فكرة، قرار
- لكل موضوع عنوان ووصف ورسائل مرتبطة
- نظام طبقات لتنظيم الردود

### 3. القرارات الجماعية (التصويت الديمقراطي)
- نظام تصويت ديمقراطي للقرارات المهمة
- حالات القرار: قيد الانتظار، مقبول، مرفوض
- التصويت: نعم، لا، امتناع
- عرض نتائج التصويت والإحصائيات

### 4. الألقاب والإنجازات (نظام النقاط)
- نظام نقاط متقدم يكافئ النشاط والمساهمة
- ألقاب مختلفة حسب الندرة: عادي، نادر، ملحمي، أسطوري
- أنواع الألقاب: المشاركة، القيادة، الجودة، الإبداع
- عرض الألقاب في الملف الشخصي

### 5. المساعد الذكي (مساعد ذكي بالذكاء الاصطناعي)
- مساعد ذكي مدعوم بالذكاء الاصطناعي يحلل المحادثات
- يقدم ملخصات وتوصيات وإجابات على الأسئلة
- يفهم السياق الكامل للمستخدم (الإحصائيات والخلايا والنشاط)
- متاح من شريط التطبيق أو صفحة مخصصة

### 6. البحث الذكي (بحث دلالي)
- بحث متقدم بالذكاء الاصطناعي في جميع المحادثات
- فهم المعنى وليس فقط الكلمات
- نتائج مرتبة حسب الصلة
- تصفية حسب الخلايا والتواريخ

### 7. الإشعارات الذكية (تنبيهات فورية)
- إشعارات فورية عبر الويب والهاتف
- أنواع الإشعارات: الإشارات، الردود، القرارات، الإعلانات
- إعدادات قابلة للتخصيص

### 8. لوحة التحكم (إدارة للمشرفين)
- لوحة تحكم شاملة للمشرفين
- إحصائيات متقدمة ورؤى
- إدارة المستخدمين والمحتوى
- نظام تذاكر الدعم

### 9. الملفات الشخصية (بيانات المستخدم)
- معلومات شخصية قابلة للتخصيص
- السيرة الذاتية والاهتمامات
- عرض الإحصائيات والإنجازات
- روابط الشبكات الاجتماعية

### 10. التفاعلات (الردود والتصويت)
- تفاعلات متنوعة على الرسائل (إعجاب، قلب، ضحك، تفاجؤ، احتفال)
- تصويت على القرارات
- إشارات للمستخدمين بأسمائهم
- ردود منظمة في طبقات

## المشاكل الشائعة وحلولها:

### مشاكل تسجيل الدخول:
- تأكد من صحة البريد الإلكتروني وكلمة المرور
- تحقق من البريد الإلكتروني لتفعيل الحساب
- استخدم خيار "نسيت كلمة المرور" إذا لزم الأمر

### مشاكل الإشعارات:
- تأكد من تفعيل الإشعارات في إعدادات المتصفح
- تحقق من إعدادات الإشعارات في التطبيق
- جرب تسجيل الخروج والدخول مرة أخرى

### مشاكل الخلايا:
- للانضمام لخلية تحتاج إلى دعوة أو الطلب للانضمام
- إذا لم ترَ خلية فأنت غير عضو فيها
- المشرفون فقط يمكنهم تعديل إعدادات الخلية

### مشاكل المحتوى:
- إذا لم تظهر رسالتك، حاول تحديث الصفحة
- تأكد من اتصالك بالإنترنت
- بعض المحتوى قد يكون محذوفاً أو مخفياً

## تعليمات المحادثة:

1. استخدم اللغة العربية الفصحى الواضحة فقط - منع قاطع لخلط الكلمات الأجنبية
2. كن ودوداً محترفاً ومفيداً
3. إذا سأل المستخدم عن ميزة موجودة اشرحها بالتفصيل
4. إذا سأل عن ميزة غير موجودة قل له بصراحة أنها غير متوفرة حالياً
5. لا توجه المستخدمين لصفحات غير موجودة
6. إذا واجه المستخدم مشكلة تقنية قدم الحلول المباشرة
7. إذا كانت مشكلة معقدة اقترح التواصل مع فريق التطوير
8. لا تخترع معلومات أو ميزات غير موجودة
9. كن دقيقاً في الإجابات وتجنب الغموض
10. استخدم أمثلة عملية عند الشرح

تذكر: أنت متخصص في دعم Synaptic Space فقط.`

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

    const cleanedResponse = text.replace(/<Thinking>[\s\S]*?<\/thinking>/gi, "").trim()

    console.log("[v0] Sending response to client")
    return NextResponse.json({
      response: cleanedResponse,
      conversationId: savedConversationId,
      issueDetected,
    })
  } catch (error) {
    console.error("[v0] Support chat error:", error)
    return NextResponse.json({ error: "Failed to process message" }, { status: 500 })
  }
}
