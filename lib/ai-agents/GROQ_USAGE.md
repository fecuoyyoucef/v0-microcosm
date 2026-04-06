// استخدام الوكيل الذكي مع Groq

import { ChiefAgent } from "@/lib/ai-agents/chief-agent-kimi"

// إنشاء وكيل جديد
const agent = new ChiefAgent()

// مثال 1: محادثة بسيطة
const response = await agent.chat("احكي لي عن النظام")
console.log(response.response)
console.log(response.executionTime) // الوقت بالملي ثانية

// مثال 2: محادثة مع context
const response2 = await agent.chat("كم عدد المستخدمين؟", {
  database: {
    connection: "supabase"
  }
})

// مثال 3: طلب الوكيل لتنفيذ أداة
// الوكيل سيحدد بنفسه الأدوات المطلوبة ويستخدمها
const response3 = await agent.chat("استخرج قائمة بأحدث 10 مستخدمين")
// سيستخدم الوكيل تلقائياً query_database

// مثال 4: streaming (للتطبيقات التفاعلية)
for await (const chunk of agent.streamChat("حلل النظام لي")) {
  process.stdout.write(chunk)
}

// النموذج المستخدم
// ✅ llama-3.1-405b-reasoning (primary)
// ✅ mixtral-8x7b-32768 (fallback)
// 
// السرعة: <100ms usually
// المميزات: 
// - أقوى نموذج مجاني
// - function calling
// - multimodal reasoning
// - مجاني بلا حدود
