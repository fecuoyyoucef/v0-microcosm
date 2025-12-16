/**
 * Messaging utilities for Synaptic Space
 * Comprehensive helper functions for the messaging system
 */

/**
 * Parse mentions from message content
 * Returns array of mentioned user IDs
 */
export function parseMentions(
  content: string,
  members: Array<{ user_id: string; profile?: { username?: string; display_name?: string } }>,
): string[] {
  const mentionPattern = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionPattern.exec(content)) !== null) {
    const username = match[1].toLowerCase()

    const member = members.find((m) => {
      const memberUsername = m.profile?.username?.toLowerCase()
      const memberDisplayName = m.profile?.display_name?.replace(/\s+/g, "").toLowerCase()
      return memberUsername === username || memberDisplayName === username
    })

    if (member && !mentions.includes(member.user_id)) {
      mentions.push(member.user_id)
    }
  }

  return mentions
}

/**
 * Check if message mentions current user
 */
export function isMentioningUser(
  content: string,
  userId: string,
  members: Array<{ user_id: string; profile?: { username?: string; display_name?: string } }>,
): boolean {
  const mentionedUsers = parseMentions(content, members)
  return mentionedUsers.includes(userId)
}

/**
 * Format message content with mention highlights
 * For display purposes
 */
export function highlightMentions(
  content: string,
  currentUserId: string,
  members: Array<{ user_id: string; profile?: { username?: string; display_name?: string } }>,
): string {
  const mentionPattern = /@(\w+)/g

  return content.replace(mentionPattern, (match, username) => {
    const member = members.find((m) => {
      const memberUsername = m.profile?.username?.toLowerCase()
      const memberDisplayName = m.profile?.display_name?.replace(/\s+/g, "").toLowerCase()
      return memberUsername === username.toLowerCase() || memberDisplayName === username.toLowerCase()
    })

    const isMentioningCurrentUser = member?.user_id === currentUserId
    const className = isMentioningCurrentUser ? "mention-highlight mention-current-user" : "mention-highlight"

    return `<span class="${className}">@${username}</span>`
  })
}

/**
 * Get notification title for different message types
 */
export function getNotificationTitle(
  type: "message" | "mention" | "reply" | "reaction",
  senderName: string,
  groupName?: string,
): string {
  switch (type) {
    case "mention":
      return `${senderName} mentioned you${groupName ? ` in ${groupName}` : ""}`
    case "reply":
      return `${senderName} replied to your message${groupName ? ` in ${groupName}` : ""}`
    case "reaction":
      return `${senderName} reacted to your message${groupName ? ` in ${groupName}` : ""}`
    case "message":
    default:
      return `${senderName}${groupName ? ` in ${groupName}` : ""}`
  }
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" }
  }

  if (content.length > 5000) {
    return { valid: false, error: "Message is too long (max 5000 characters)" }
  }

  return { valid: true }
}

/**
 * Extract mentioned usernames from content
 */
export function extractMentionedUsernames(content: string): string[] {
  const mentionPattern = /@(\w+)/g
  const usernames: string[] = []
  let match

  while ((match = mentionPattern.exec(content)) !== null) {
    if (!usernames.includes(match[1])) {
      usernames.push(match[1])
    }
  }

  return usernames
}

/**
 * Check if user has permission to send in layer
 */
export function canSendInLayer(
  layer: "upper" | "standard" | "shadow",
  userRole: "admin" | "member",
  groupSettings?: { upper_layer_permission?: "all" | "admin_only" },
): boolean {
  if (layer === "standard" || layer === "shadow") {
    return true
  }

  if (layer === "upper") {
    if (!groupSettings) return true
    if (groupSettings.upper_layer_permission === "all") return true
    if (groupSettings.upper_layer_permission === "admin_only") return userRole === "admin"
  }

  return true
}
