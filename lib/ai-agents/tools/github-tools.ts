/**
 * GitHub Tools Implementation
 * 
 * Provides tools for interacting with GitHub repository
 */

import { Octokit } from "@octokit/rest"
import { CHIEF_AGENT_CONFIG } from "../config"
import type { ToolResult } from "../types"

export class GitHubTools {
  private octokit: Octokit
  private owner: string
  private repo: string

  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN environment variable is required")
    }

    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })

    this.owner = CHIEF_AGENT_CONFIG.github.owner
    this.repo = CHIEF_AGENT_CONFIG.github.repo
  }

  /**
   * Read a file from the repository
   */
  async readFile(path: string, ref = "main"): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      })

      if ("content" in data && data.type === "file") {
        const content = Buffer.from(data.content, "base64").toString("utf-8")
        return {
          success: true,
          data: {
            path,
            content,
            sha: data.sha,
            size: data.size,
            url: data.html_url,
          },
        }
      }

      return {
        success: false,
        error: "Path is not a file or content not available",
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`,
      }
    }
  }

  /**
   * Search for code in the repository
   */
  async searchCode(query: string, extension?: string): Promise<ToolResult> {
    try {
      let searchQuery = `${query} repo:${this.owner}/${this.repo}`
      if (extension) {
        searchQuery += ` extension:${extension}`
      }

      const { data } = await this.octokit.search.code({
        q: searchQuery,
        per_page: 20,
      })

      return {
        success: true,
        data: {
          total_count: data.total_count,
          items: data.items.map((item) => ({
            path: item.path,
            name: item.name,
            url: item.html_url,
            score: item.score,
          })),
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to search code: ${error.message}`,
      }
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path = ""): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      })

      if (Array.isArray(data)) {
        return {
          success: true,
          data: {
            path,
            files: data.map((item) => ({
              name: item.name,
              path: item.path,
              type: item.type,
              size: item.size,
              url: item.html_url,
            })),
          },
        }
      }

      return {
        success: false,
        error: "Path is not a directory",
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list files: ${error.message}`,
      }
    }
  }

  /**
   * Create a new issue
   */
  async createIssue(params: {
    title: string
    body: string
    labels?: string[]
    assignees?: string[]
  }): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        ...params,
      })

      return {
        success: true,
        data: {
          number: data.number,
          id: data.id,
          url: data.html_url,
          title: data.title,
          state: data.state,
          created_at: data.created_at,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create issue: ${error.message}`,
      }
    }
  }

  /**
   * Comment on an issue
   */
  async commentOnIssue(
    issue_number: number,
    comment: string
  ): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number,
        body: comment,
      })

      return {
        success: true,
        data: {
          comment_id: data.id,
          url: data.html_url,
          created_at: data.created_at,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to comment on issue: ${error.message}`,
      }
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(
    issue_number: number,
    comment?: string
  ): Promise<ToolResult> {
    try {
      // Add comment if provided
      if (comment) {
        await this.commentOnIssue(issue_number, comment)
      }

      // Close the issue
      const { data } = await this.octokit.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number,
        state: "closed",
      })

      return {
        success: true,
        data: {
          number: data.number,
          state: data.state,
          closed_at: data.closed_at,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to close issue: ${error.message}`,
      }
    }
  }

  /**
   * Create a pull request
   */
  async createPullRequest(params: {
    title: string
    body: string
    head: string
    base: string
  }): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.pulls.create({
        owner: this.owner,
        repo: this.repo,
        ...params,
      })

      return {
        success: true,
        data: {
          number: data.number,
          id: data.id,
          url: data.html_url,
          title: data.title,
          state: data.state,
          created_at: data.created_at,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to create PR: ${error.message}`,
      }
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(path?: string, limit = 50): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.repos.listCommits({
        owner: this.owner,
        repo: this.repo,
        path,
        per_page: limit,
      })

      return {
        success: true,
        data: {
          total: data.length,
          commits: data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: commit.commit.author?.name,
            email: commit.commit.author?.email,
            date: commit.commit.author?.date,
            url: commit.html_url,
          })),
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get commit history: ${error.message}`,
      }
    }
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.dependabot.listAlertsForRepo({
        owner: this.owner,
        repo: this.repo,
        state: "open",
      })

      return {
        success: true,
        data: {
          total: data.length,
          alerts: data.map((alert) => ({
            number: alert.number,
            state: alert.state,
            severity: alert.security_vulnerability.severity,
            package: alert.security_vulnerability.package.name,
            summary: alert.security_advisory.summary,
            description: alert.security_advisory.description,
            url: alert.html_url,
          })),
        },
      }
    } catch (error: any) {
      // If dependabot is not enabled or no permission
      if (error.status === 404) {
        return {
          success: true,
          data: {
            total: 0,
            alerts: [],
            message: "No security alerts or Dependabot not enabled",
          },
        }
      }

      return {
        success: false,
        error: `Failed to get security alerts: ${error.message}`,
      }
    }
  }

  /**
   * Update a file (for automated fixes)
   */
  async updateFile(params: {
    path: string
    content: string
    message: string
    sha: string
    branch?: string
  }): Promise<ToolResult> {
    try {
      const { data } = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: params.path,
        message: params.message,
        content: Buffer.from(params.content).toString("base64"),
        sha: params.sha,
        branch: params.branch || "main",
      })

      return {
        success: true,
        data: {
          commit_sha: data.commit.sha,
          url: data.content?.html_url,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to update file: ${error.message}`,
      }
    }
  }

  /**
   * Search for similar issues
   */
  async searchIssues(query: string, state: "open" | "closed" | "all" = "all"): Promise<ToolResult> {
    try {
      const searchQuery = `${query} repo:${this.owner}/${this.repo} type:issue state:${state}`

      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: searchQuery,
        per_page: 10,
      })

      return {
        success: true,
        data: {
          total_count: data.total_count,
          issues: data.items.map((item) => ({
            number: item.number,
            title: item.title,
            state: item.state,
            url: item.html_url,
            created_at: item.created_at,
            updated_at: item.updated_at,
            labels: item.labels?.map((label) => 
              typeof label === 'string' ? label : label.name
            ),
          })),
        },
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to search issues: ${error.message}`,
      }
    }
  }
}

// Export singleton instance
let githubToolsInstance: GitHubTools | null = null

export function getGitHubTools(): GitHubTools {
  if (!githubToolsInstance) {
    githubToolsInstance = new GitHubTools()
  }
  return githubToolsInstance
}
