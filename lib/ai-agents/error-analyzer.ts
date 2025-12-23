import { GitHubAnalyzer } from "./github-analyzer"
import { createServiceClient } from "@/lib/supabase/server"
import { generateText } from "ai"

export interface ErrorAnalysisResult {
  errorId: string
  summary: string
  possibleCauses: string[]
  affectedFiles: string[]
  codeSnippets: Array<{ file: string; content: string; line: number }>
  severity: "low" | "medium" | "high" | "critical"
  suggestedFixes: string[]
  confidence: number
  recentChanges: boolean
}

export class ErrorAnalyzer {
  private githubAnalyzer: GitHubAnalyzer

  constructor(githubConfig: { owner: string; repo: string; token?: string }) {
    this.githubAnalyzer = new GitHubAnalyzer(githubConfig)
  }

  /**
   * Analyze a support ticket error using AI and GitHub code search
   */
  async analyzeTicketError(ticketId: string): Promise<ErrorAnalysisResult | null> {
    const supabase = createServiceClient()

    // Get ticket details
    const { data: ticket } = await supabase.from("support_tickets").select("*").eq("id", ticketId).single()

    if (!ticket) return null

    // Search for error in GitHub
    const errorSource = await this.githubAnalyzer.findErrorSource(ticket.subject, ticket.description)

    // Use AI to analyze the error with code context
    const aiAnalysis = await this.analyzeWithAI(ticket, errorSource)

    // Check if files were recently changed
    const recentChanges = await Promise.all(
      errorSource.possibleFiles.map((file) => this.githubAnalyzer.wasRecentlyChanged(file, 7)),
    )

    return {
      errorId: ticketId,
      summary: aiAnalysis.summary,
      possibleCauses: aiAnalysis.causes,
      affectedFiles: errorSource.possibleFiles,
      codeSnippets: errorSource.codeSnippets,
      severity: aiAnalysis.severity,
      suggestedFixes: aiAnalysis.fixes,
      confidence: aiAnalysis.confidence,
      recentChanges: recentChanges.some((changed) => changed),
    }
  }

  /**
   * Use advanced AI model to analyze error with code context
   */
  private async analyzeWithAI(
    ticket: any,
    errorSource: any,
  ): Promise<{
    summary: string
    causes: string[]
    severity: "low" | "medium" | "high" | "critical"
    fixes: string[]
    confidence: number
  }> {
    const codeContext = errorSource.codeSnippets
      .map((snippet: any) => `File: ${snippet.file}:${snippet.lineNumber}\n${snippet.content}`)
      .join("\n\n")

    const prompt = `أنت محلل أخطاء خبير. قم بتحليل الخطأ التالي:

**الخطأ المُبلّغ:**
${ticket.subject}

**التفاصيل:**
${ticket.description}

**الكود المشتبه به:**
${codeContext || "لم يتم العثور على كود مشتبه به"}

**الملفات المحتملة:**
${errorSource.possibleFiles.join(", ")}

قم بتحليل:
1. ملخص المشكلة (سطر واحد)
2. الأسباب المحتملة (3-5 أسباب)
3. مستوى الخطورة (low/medium/high/critical)
4. الحلول المقترحة (3-5 حلول)
5. مستوى الثقة في التحليل (0-100%)

أجب بصيغة JSON فقط:
{
  "summary": "...",
  "causes": ["...", "..."],
  "severity": "...",
  "fixes": ["...", "..."],
  "confidence": 85
}`

    try {
      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4.5", // Using advanced AI model
        prompt,
        temperature: 0.3,
      })

      // Parse AI response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      // Fallback if parsing fails
      return {
        summary: "فشل تحليل الخطأ",
        causes: ["غير معروف"],
        severity: "medium",
        fixes: ["يتطلب مراجعة يدوية"],
        confidence: 0,
      }
    } catch (error) {
      console.error("[ErrorAnalyzer] AI analysis failed:", error)
      return {
        summary: "فشل تحليل الخطأ",
        causes: ["خطأ في الاتصال بـ AI"],
        severity: "medium",
        fixes: ["يتطلب مراجعة يدوية"],
        confidence: 0,
      }
    }
  }

  /**
   * Analyze multiple tickets and find patterns
   */
  async analyzeErrorPatterns(ticketIds: string[]): Promise<{
    commonErrors: Array<{ pattern: string; count: number; files: string[] }>
    criticalIssues: ErrorAnalysisResult[]
    recommendations: string[]
  }> {
    const analyses = await Promise.all(ticketIds.map((id) => this.analyzeTicketError(id)))

    const validAnalyses = analyses.filter((a) => a !== null) as ErrorAnalysisResult[]

    // Find common patterns
    const fileFrequency = new Map<string, number>()
    validAnalyses.forEach((analysis) => {
      analysis.affectedFiles.forEach((file) => {
        fileFrequency.set(file, (fileFrequency.get(file) || 0) + 1)
      })
    })

    const commonErrors = Array.from(fileFrequency.entries())
      .filter(([_, count]) => count > 1)
      .map(([file, count]) => ({
        pattern: file,
        count,
        files: [file],
      }))

    const criticalIssues = validAnalyses.filter((a) => a.severity === "critical" || a.severity === "high")

    return {
      commonErrors,
      criticalIssues,
      recommendations: this.generateRecommendations(validAnalyses),
    }
  }

  private generateRecommendations(analyses: ErrorAnalysisResult[]): string[] {
    const recommendations: string[] = []

    // Check for high-frequency errors
    const highConfidence = analyses.filter((a) => a.confidence > 80)
    if (highConfidence.length > 3) {
      recommendations.push("يوجد أخطاء متكررة بثقة عالية - يُنصح بإصلاحها بأولوية")
    }

    // Check for recent changes
    const recentIssues = analyses.filter((a) => a.recentChanges)
    if (recentIssues.length > 2) {
      recommendations.push("أخطاء مرتبطة بتغييرات حديثة - راجع الـ commits الأخيرة")
    }

    // Check for critical issues
    const critical = analyses.filter((a) => a.severity === "critical")
    if (critical.length > 0) {
      recommendations.push(`⚠️ ${critical.length} أخطاء حرجة تتطلب تدخل فوري`)
    }

    return recommendations
  }
}
