import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseMentions(text: string): string[] {
  const mentionPattern = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}
