/**
 * Chief Agent Configuration
 */

export const CHIEF_AGENT_CONFIG = {
  // GitHub Integration
  github: {
    owner: process.env.GITHUB_OWNER || "your-username",
    repo: process.env.GITHUB_REPO || "microcosm",
    token: process.env.GITHUB_TOKEN, // Optional for public repos
  },

  // AI Models
  models: {
    analysis: "anthropic/claude-sonnet-4.5", // For deep code analysis
    chat: "xai/grok-beta", // For general conversation
    moderation: "anthropic/claude-sonnet-4.5", // For content moderation
  },

  // Thresholds
  thresholds: {
    confidence: 0.85, // Minimum confidence to auto-execute
    criticalSeverity: ["critical", "high"], // Auto-notify admin
    maxTicketsPerAnalysis: 10, // Max tickets to analyze at once
  },

  // Analysis Settings
  analysis: {
    maxCodeSnippets: 10, // Max code snippets to show
    maxSearchResults: 20, // Max GitHub search results
    recentChangeDays: 7, // Consider changes in last N days as "recent"
  },

  // Auto-execution
  autoExecute: {
    delete_message: true, // Can auto-delete messages
    warn_user: true, // Can auto-warn users
    hide_content: true, // Can auto-hide content
    ban_user: false, // Requires manual approval
    delete_cell: false, // Requires manual approval
    freeze_cell: false, // Requires manual approval
  },
}

export function getGitHubConfig() {
  return CHIEF_AGENT_CONFIG.github
}

export function getAnalysisModel() {
  return CHIEF_AGENT_CONFIG.models.analysis
}

export function getChatModel() {
  return CHIEF_AGENT_CONFIG.models.chat
}

export function shouldAutoExecute(actionType: string): boolean {
  return CHIEF_AGENT_CONFIG.autoExecute[actionType as keyof typeof CHIEF_AGENT_CONFIG.autoExecute] ?? false
}
