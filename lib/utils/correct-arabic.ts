export async function handleCorrectArabic(text: string): Promise<string | null> {
  try {
    const response = await fetch("/api/ai/correct-arabic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })

    if (response.ok) {
      const { corrected } = await response.json()
      return corrected
    }
    return null
  } catch (error) {
    console.error("Correction error:", error)
    return null
  }
}
