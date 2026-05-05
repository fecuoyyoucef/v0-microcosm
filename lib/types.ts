export type MessageLayer = "upper" | "standard" | "shadow"

export type UpperLayerPermission = "all" | "admin_only" | "selected_members"

export type GroupType = "primary" | "secondary"

export type BackgroundStyle = "neural_mesh" | "neural_network" | "matrix_code" | "neuron_cell" | "none"

export type CellCategory = "project" | "discussion"

export type TranslationLanguage = "ar" | "en" | "fr" | "es" | "de" | "tr" | "auto"

export interface GroupSettings {
  upper_layer_permission: UpperLayerPermission
  upper_layer_members?: string[]
  allow_notebook: boolean
  allow_mindmap: boolean
  allow_smart_summary: boolean
  privacy_type?: "open" | "private"
  show_in_recommendations?: boolean
  /** Default target language for the in-cell "ترجمة" action. "auto" = detect (Arabic→English, otherwise→Arabic) */
  translation_language?: TranslationLanguage
}

export interface SupervisorPermissions {
  can_delete_messages: boolean
  can_remove_members: boolean
  can_edit_settings: boolean
}

export interface Profile {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  max_members: number
  created_by: string
  created_at: string
  updated_at: string
  settings?: GroupSettings
  // Hierarchical fields
  parent_group_id: string | null
  group_type: GroupType
  background_style?: BackgroundStyle
  cell_category?: CellCategory
  goal?: string | null
  responsibility_score?: number
  progress_score?: number
  last_activity_date?: string
  metrics_last_calculated?: string | null
  // Virtual fields (populated by queries)
  member_count?: number
  secondary_groups?: Group[]
  parent_group?: Group | null
}

export interface GroupSupervisor {
  id: string
  group_id: string
  user_id: string
  assigned_by: string
  permissions: SupervisorPermissions
  created_at: string
  profile?: Profile | null
}

export interface GroupJoinRequest {
  id: string
  group_id: string
  user_id: string
  status: "pending" | "approved" | "rejected" | "redirected"
  redirected_to: string | null
  created_at: string
  processed_at: string | null
  processed_by: string | null
  profile?: Profile | null
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: "admin" | "member"
  joined_at: string
  profile?: Profile | null
}

export interface Message {
  id: string
  group_id: string
  sender_id: string
  content: string
  layer: MessageLayer
  node_id: string | null
  reply_to: string | null
  visible_to: string[] | null
  created_at: string
  updated_at: string
  sender?: Profile | null
  is_pinned?: boolean
  pinned_by?: string | null
  pinned_at?: string | null
  attachment_url?: string | null
  attachment_type?: "image" | "file" | null
  attachments?: Array<{
    url: string
    type: string
    name: string
    size: number
  }> | null
  reply_to_message?: {
    content: string
    sender?: { display_name: string }
  } | null
  reply_preview?: {
    id: string
    content: string
    user_name: string
  } | null
  reactions?: Array<{
    id: string
    user_id: string
    reaction: string
  }>
  read_count?: number
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  reaction: string
  created_at: string
}

export interface MessageWithReactions extends Message {
  reactions?: MessageReaction[]
}

export type NodeType = "primary" | "secondary"

export interface ConversationNode {
  id: string
  group_id: string
  parent_id: string | null
  title: string
  description: string | null
  color: string
  icon: string
  node_type: NodeType
  sort_order: number
  is_default: boolean
  position_x: number
  position_y: number
  created_by: string
  created_at: string
  updated_at: string
  messages_count?: number
  children?: ConversationNode[]
}

export interface NotebookPage {
  id: string
  group_id: string
  title: string
  page_type: NotebookPageType
  content: Record<string, unknown>
  is_locked: boolean
  locked_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface NotebookContribution {
  id: string
  page_id: string
  user_id: string
  content: Record<string, unknown>
  position: number
  created_at: string
  contributor?: Profile
}

export interface DailySummary {
  id: string
  group_id: string
  summary_date: string
  decisions: Array<{ text: string; by?: string }>
  ideas: Array<{ text: string; by: string; discussed_by?: string[] }>
  topics: Array<{ title: string; summary: string }>
  links: Array<{ url: string; description: string }>
  pending_items: string[]
  contributors: Array<{ name: string; note: string }>
  raw_message_count: number
  created_at: string
}

export interface MemoryTrigger {
  id: string
  group_id: string
  trigger_type: "anniversary" | "similar_topic" | "related_idea"
  related_summary_id: string | null
  content: string
  trigger_date: string | null
  created_at: string
}

export interface GroupStatistics {
  totalMessages: number
  upperMessages: number
  standardMessages: number
  shadowMessages: number
  memberStats: Array<{
    userId: string
    displayName: string
    messageCount: number
  }>
  lastActivity: string | null
}

export interface CollectiveMemory {
  id: string
  group_id: string
  summary_date: string
  summary: string
  highlights: string[]
  topics: string[]
  decisions: string[]
  message_count: number
  generated_at: string
  created_at: string
}

export interface Decision {
  id: string
  group_id: string
  title: string
  description: string | null
  ai_summary: string | null
  status: "voting" | "closed" | "cancelled"
  created_by: string
  voting_ends_at: string
  created_at: string
  closed_at: string | null
  creator?: Profile
  votes?: DecisionVote[]
}

export interface DecisionVote {
  id: string
  decision_id: string
  user_id: string
  vote: "agree" | "disagree" | "neutral"
  created_at: string
}

export interface DecisionResults {
  agree: number
  disagree: number
  neutral: number
  total: number
}

export type NotebookPageType = "text" | "list" | "table" | "canvas" | "links"

export interface NodeSummary {
  id: string
  node_id: string
  group_id: string
  summary: string
  key_points: string[]
  decisions: string[]
  questions: string[]
  discussions: string[]
  message_count: number
  sub_nodes_summary: Array<{
    node_title: string
    summary: string
    message_count: number
  }>
  generated_at: string
  created_at: string
}

export type NotificationType =
  | "new_message"
  | "mention"
  | "reaction"
  | "group_invite"
  | "group_join"
  | "group_leave"
  | "decision_created"
  | "decision_closed"
  | "memory_generated"
  | "system"
  | "join_request" // Added new notification types
  | "secondary_created"

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>
  group_id: string | null
  sender_id: string | null
  message_id: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  sender?: Profile | null
  group?: Group | null
}

// إضافة أنواع نظام الوكلاء الذكاء

export type AgentType =
  | "chief"
  | "content_guardian"
  | "user_manager"
  | "system_monitor"
  | "analytics"
  | "community_manager"

export type AgentStatus = "active" | "paused" | "disabled"

export type ActionStatus = "active" | "undone" | "overridden" | "failed"

export type OwnerDecision = "approve" | "undo" | "override"

export type ErrorSeverity = "low" | "medium" | "high" | "critical"

export type ErrorReportStatus = "pending" | "investigating" | "fixed" | "wont_fix"

export type ScheduleType = "once" | "hourly" | "daily" | "weekly"

export interface AIAgent {
  id: string
  agent_name: string
  agent_type: AgentType
  description: string | null
  capabilities: string[]
  permissions: Record<string, boolean>
  status: AgentStatus
  confidence_threshold: number
  parent_agent_id: string | null
  model_config: {
    model: string
    temperature: number
    max_tokens: number
  }
  created_at: string
  updated_at: string
}

export interface AgentAction {
  id: string
  agent_id: string
  action_type: string
  target_type: string
  target_id: string | null
  reasoning: string
  confidence: number
  snapshot_before: Record<string, unknown> | null
  snapshot_after: Record<string, unknown> | null
  status: ActionStatus
  undo_data: Record<string, unknown> | null
  created_at: string
  undone_at: string | null
  undone_by: string | null
  agent?: AIAgent
}

export interface OwnerDecisionRecord {
  id: string
  action_id: string
  decision: OwnerDecision
  reason: string | null
  created_at: string
}

export interface AgentLearning {
  id: string
  agent_id: string
  scenario_type: string
  context_data: Record<string, unknown>
  action_taken: string
  owner_feedback: "approved" | "undone" | "overridden" | null
  learning_points: Record<string, unknown> | null
  created_at: string
}

export interface AgentStatusRecord {
  id: string
  agent_id: string
  is_active: boolean
  last_action_at: string | null
  actions_today: number
  actions_this_week: number
  accuracy_rate: number | null
  total_undos: number
  updated_at: string
}

export interface V0ErrorReport {
  id: string
  agent_id: string
  severity: ErrorSeverity
  error_type: string
  error_message: string
  stack_trace: string | null
  context_data: Record<string, unknown> | null
  attempted_fixes: Array<{
    fix_description: string
    timestamp: string
    success: boolean
  }>
  status: ErrorReportStatus
  v0_response: Record<string, unknown> | null
  created_at: string
  resolved_at: string | null
}

export interface AgentScheduledAction {
  id: string
  agent_id: string
  action_type: string
  schedule_type: ScheduleType
  schedule_config: Record<string, unknown>
  next_run_at: string
  last_run_at: string | null
  is_active: boolean
  created_at: string
}
