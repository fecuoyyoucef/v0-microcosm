export async function moderateContent(content: string): Promise<{ isAppropriate: boolean; reason?: string }> {
  // Extreme keywords only - very permissive
  const extremeKeywords = [
    // Add only truly harmful content patterns
    "قتل",
    "اغتيال",
    "تفجير",
    "إرهاب",
  ]

  const lowerContent = content.toLowerCase()

  for (const keyword of extremeKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      return {
        isAppropriate: false,
        reason: `المحتوى يحتوي على كلمات خطيرة: ${keyword}`,
      }
    }
  }

  // Everything else is appropriate
  return { isAppropriate: true }
}
