/**
 * Chief Agent Configuration - Kimi-K2 Agentic System
 */

// ============================
// AI Models Configuration
// ============================

export const AI_MODELS = {
  // Primary Agentic Model - Kimi-K2-Instruct (Full Agent Capabilities)
  PRIMARY: process.env.HF_PRIMARY_MODEL || "moonshotai/Kimi-K2-Instruct-0905",
  
  // Fallback Model for Complex Reasoning
  FALLBACK: process.env.HF_FALLBACK_MODEL || "Qwen/QwQ-32B-Preview",
  
  // Fast Model for Simple Tasks
  FAST: process.env.HF_FAST_MODEL || "meta-llama/Llama-3.3-70B-Instruct",
}

export const AI_CONFIG = {
  temperature: 0.2, // Lower for more deterministic decisions
  maxTokens: 8000, // Kimi-K2 supports up to 32K context
  streamEnabled: true,
  topP: 0.9,
  frequencyPenalty: 0,
  presencePenalty: 0,
}

// ============================
// Chief Agent Configuration
// ============================

export const CHIEF_AGENT_CONFIG = {
  // GitHub Integration
  github: {
    owner: process.env.GITHUB_OWNER || "your-username",
    repo: process.env.GITHUB_REPO || "microcosm",
    token: process.env.GITHUB_TOKEN,
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  },

  // Agent Models Assignment
  models: {
    chief: AI_MODELS.PRIMARY, // Main decision-making agent
    analysis: AI_MODELS.PRIMARY, // Code and error analysis
    chat: AI_MODELS.PRIMARY, // User interactions
    moderation: AI_MODELS.FAST, // Content moderation (faster)
    fallback: AI_MODELS.FALLBACK, // When primary fails
  },

  // Thresholds
  thresholds: {
    confidence: 0.85, // Minimum confidence to auto-execute
    criticalSeverity: ["critical", "high"], // Auto-notify admin
    maxTicketsPerAnalysis: 10, // Max tickets to analyze at once
    maxRetries: 3, // Max retry attempts for failed operations
    retryDelayMs: 1000, // Delay between retries
  },

  // Analysis Settings
  analysis: {
    maxCodeSnippets: 10, // Max code snippets to show
    maxSearchResults: 20, // Max GitHub search results
    recentChangeDays: 7, // Consider changes in last N days as "recent"
    maxFileSize: 1024 * 1024, // Max file size to analyze (1MB)
  },

  // Auto-execution Settings
  autoExecute: {
    delete_message: true, // Can auto-delete messages
    warn_user: true, // Can auto-warn users
    hide_content: true, // Can auto-hide content
    create_github_issue: true, // Can auto-create issues
    comment_on_issue: true, // Can auto-comment
    ban_user: false, // Requires manual approval
    delete_cell: false, // Requires manual approval
    freeze_cell: false, // Requires manual approval
    merge_pr: false, // Requires manual approval
    delete_file: false, // Requires manual approval
  },

  // Tools Configuration
  tools: {
    enabled: true,
    maxToolCalls: 10, // Max tool calls per request
    timeout: 30000, // Tool execution timeout (30s)
  },

  // Approval System
  approval: {
    enabled: true,
    highRiskActions: [
      "ban_user",
      "delete_cell",
      "freeze_cell",
      "merge_pr",
      "delete_file",
      "update_production_config",
    ],
    notifyOwnerFor: ["critical", "high"],
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
