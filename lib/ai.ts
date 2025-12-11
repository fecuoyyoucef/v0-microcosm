const XAI_API_URL = "https://api.x.ai/v1/chat/completions"

function getApiKey(): string {
  const apiKey = process.env.XAI_API_KEY || ""
  // تنظيف المفتاح من أي أحرف غير مرئية
  return apiKey.replace(/[\r\n\t\s]/g, "")
}

export async function generateAIText(prompt: string): Promise<string> {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error("XAI_API_KEY غير موجود")
  }

  const response = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-1212",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("AI API Error:", response.status, errorText)
    throw new Error(`خطأ في API: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

export async function generateAIStream(prompt: string): Promise<ReadableStream> {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error("XAI_API_KEY غير موجود")
  }

  const response = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-2-1212",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`خطأ في API: ${response.status}`)
  }

  return response.body
}
