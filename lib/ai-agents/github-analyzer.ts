import { Octokit } from "@octokit/rest"

export interface GitHubConfig {
  owner: string
  repo: string
  token?: string // Optional for public repos
}

export class GitHubAnalyzer {
  private octokit: Octokit
  private config: GitHubConfig

  constructor(config: GitHubConfig) {
    this.config = config
    this.octokit = new Octokit({
      auth: config.token,
    })
  }

  /**
   * Search for code patterns in the repository
   */
  async searchCode(query: string): Promise<any[]> {
    try {
      const response = await this.octokit.rest.search.code({
        q: `${query} repo:${this.config.owner}/${this.config.repo}`,
        per_page: 20,
      })
      return response.data.items
    } catch (error) {
      console.error("[GitHub] Search failed:", error)
      return []
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(path: string, ref = "main"): Promise<string | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path,
        ref,
      })

      if ("content" in response.data) {
        return Buffer.from(response.data.content, "base64").toString("utf-8")
      }
      return null
    } catch (error) {
      console.error("[GitHub] Get file failed:", error)
      return null
    }
  }

  /**
   * Search for error patterns in code
   */
  async findErrorSource(
    errorMessage: string,
    stackTrace?: string,
  ): Promise<{
    possibleFiles: string[]
    codeSnippets: Array<{ file: string; content: string; lineNumber: number }>
    analysis: string
  }> {
    // Extract function names or key terms from error
    const keywords = this.extractKeywords(errorMessage, stackTrace)

    const results: Array<{ file: string; content: string; lineNumber: number }> = []
    const possibleFiles = new Set<string>()

    // Search for each keyword
    for (const keyword of keywords) {
      const searchResults = await this.searchCode(keyword)

      for (const item of searchResults) {
        possibleFiles.add(item.path)

        // Get file content
        const content = await this.getFileContent(item.path)
        if (content) {
          // Find relevant lines
          const lines = content.split("\n")
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(keyword.toLowerCase())) {
              results.push({
                file: item.path,
                content: line.trim(),
                lineNumber: index + 1,
              })
            }
          })
        }
      }
    }

    return {
      possibleFiles: Array.from(possibleFiles),
      codeSnippets: results.slice(0, 10), // Limit to top 10
      analysis: `Found ${results.length} potential matches across ${possibleFiles.size} files`,
    }
  }

  /**
   * Extract keywords from error message and stack trace
   */
  private extractKeywords(errorMessage: string, stackTrace?: string): string[] {
    const keywords = new Set<string>()

    // Extract from error message
    const errorWords = errorMessage.match(/\b[A-Z][a-zA-Z]+\b/g) || []
    errorWords.forEach((word) => keywords.add(word))

    // Extract file names from stack trace
    if (stackTrace) {
      const fileMatches = stackTrace.match(/[\w-]+\.(ts|tsx|js|jsx)/g) || []
      fileMatches.forEach((file) => keywords.add(file.replace(/\.(ts|tsx|js|jsx)$/, "")))

      // Extract function names
      const functionMatches = stackTrace.match(/at\s+(\w+)/g) || []
      functionMatches.forEach((match) => {
        const funcName = match.replace("at ", "")
        if (funcName.length > 3) keywords.add(funcName)
      })
    }

    return Array.from(keywords).slice(0, 5) // Top 5 keywords
  }

  /**
   * Get recent commits related to a file or pattern
   */
  async getRecentCommits(path?: string, since?: Date): Promise<any[]> {
    try {
      const options: any = {
        owner: this.config.owner,
        repo: this.config.repo,
        per_page: 20,
      }

      if (path) options.path = path
      if (since) options.since = since.toISOString()

      const response = await this.octokit.rest.repos.listCommits(options)
      return response.data
    } catch (error) {
      console.error("[GitHub] Get commits failed:", error)
      return []
    }
  }

  /**
   * Analyze if error was recently introduced
   */
  async wasRecentlyChanged(filePath: string, days = 7): Promise<boolean> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const commits = await this.getRecentCommits(filePath, since)
    return commits.length > 0
  }
}
