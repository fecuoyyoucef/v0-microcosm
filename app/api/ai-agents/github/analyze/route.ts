import { type NextRequest, NextResponse } from "next/server"
import {
  analyzeRepository,
  analyzeIssueForCodeLocation,
  findRelatedCode,
  getFileContent,
} from "@/lib/ai-agents/github-agent"
import { createServiceClient } from "@/lib/supabase/server"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: admin } = await supabase.from("admins").select("role").eq("user_id", user.id).single()

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { ticketId, issueBody, errorMessage } = await request.json()

    // Analyze repository structure
    const repoAnalysis = await analyzeRepository()

    // Extract suspected files from issue
    const { suspectedFiles } = await analyzeIssueForCodeLocation(issueBody || errorMessage)

    // Find related code
    const keywords = extractKeywords(issueBody || errorMessage)
    const relatedCode = await findRelatedCode(keywords)

    // Read suspected files
    const fileContents = await Promise.all(
      suspectedFiles.slice(0, 5).map(async (path) => ({
        path,
        content: await getFileContent(path),
      })),
    )

    // AI Analysis
    const { text: analysis } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      prompt: `
You are Chief Agent, an intelligent code analyzer for Synaptic Space.

REPOSITORY INFO:
- Name: ${repoAnalysis.repository.full_name}
- Language: ${repoAnalysis.repository.language}
- Recent Commits: ${repoAnalysis.recentCommits.length}

USER ISSUE/ERROR:
${issueBody || errorMessage}

SUSPECTED FILES:
${fileContents.map((f) => `\n### ${f.path}\n\`\`\`\n${f.content?.slice(0, 1000)}\n\`\`\``).join("\n")}

RELATED CODE LOCATIONS:
${relatedCode
  .slice(0, 5)
  .map((c) => `- ${c.path} (${c.repository.full_name})`)
  .join("\n")}

Analyze this issue and provide:
1. Root cause analysis
2. Affected components
3. Suggested fix with code examples
4. Confidence level (0-100)
5. Priority (low/medium/high/critical)
      `.trim(),
    })

    // Store analysis
    await supabase.from("agent_analyses").insert({
      ticket_id: ticketId,
      analysis,
      suspected_files: suspectedFiles,
      confidence: extractConfidence(analysis),
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      analysis,
      suspectedFiles,
      relatedCode: relatedCode.slice(0, 10),
      repoInfo: {
        totalCommits: repoAnalysis.recentCommits.length,
        branches: repoAnalysis.branches.length,
        releases: repoAnalysis.releases.length,
      },
    })
  } catch (error) {
    console.error("Error analyzing issue:", error)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || []
  return [...new Set(words)].slice(0, 10)
}

function extractConfidence(analysis: string): number {
  const match = analysis.match(/confidence.*?(\d+)/i)
  return match ? Number.parseInt(match[1]) : 50
}
