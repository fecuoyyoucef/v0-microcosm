export type MessageLayer = "upper" | "standard" | "shadow"

export type UpperLayerPermission = "all" | "admin_only" | "selected_members"

export type GroupType = "primary" | "secondary"

export interface GroupSettings {
  upper_layer_permission: UpperLayerPermission
  upper_layer_members?: string[]
  allow_notebook: boolean
  allow_mindmap: boolean
  allow_smart_summary: boolean
}

export interface SupervisorPermissions {
  can_delete_messages: boolean
  can_remove_members: boolean
  can_edit_settings: boolean
}

export interface Profile {
  id: string
  display_name: string
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

export interface ConversationNode {
  id: string
  group_id: string
  parent_id: string | null
  title: string
  description: string | null
  color: string
  position_x: number
  position_y: number
  created_by: string
  created_at: string
  updated_at: string
  messages_count?: number
  children?: ConversationNode[]
}

export type NotebookPageType = "text" | "list" | "table" | "canvas" | "links"

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
