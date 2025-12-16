// Mention parser utility
export interface MentionMatch {
  username: string
  start: number
  end: number
  userId?: string
}

export function parseMentions(text: string): MentionMatch[] {
  const mentionRegex = /@(\w+)/g
  const matches: MentionMatch[] = []
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    matches.push({
      username: match[1],
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return matches
}

export function highlightMentions(text: string, currentUsername?: string): string {
  const mentionRegex = /@(\w+)/g

  return text.replace(mentionRegex, (match, username) => {
    const isCurrentUser = username === currentUsername
    const className = isCurrentUser ? "mention-self" : "mention"
    return `<span class="${className}" data-username="${username}">${match}</span>`
  })
}

export async function resolveMentions(
  text: string,
  groupMembers: Array<{ username: string | null; user_id: string }>,
): Promise<{ text: string; mentionedUsers: string[] }> {
  const mentions = parseMentions(text)
  const mentionedUsers: string[] = []

  mentions.forEach((mention) => {
    const member = groupMembers.find((m) => m.username?.toLowerCase() === mention.username.toLowerCase())
    if (member) {
      mentionedUsers.push(member.user_id)
    }
  })

  return { text, mentionedUsers }
}
