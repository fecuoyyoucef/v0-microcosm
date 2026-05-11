"use client"

import { motion } from "framer-motion"

interface TypingIndicatorProps {
  userNames: string[]
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  const displayText =
    userNames.length === 1
      ? `${userNames[0]} يكتب...`
      : userNames.length === 2
        ? `${userNames[0]} و ${userNames[1]} يكتبان...`
        : userNames.length > 2
          ? `${userNames.length} أشخاص يكتبون...`
          : null

  // Always render a fixed-height container to prevent layout shift
  return (
    <div className="h-10 px-4 flex items-center">
      <div
        className={`flex items-center gap-2 transition-opacity duration-200 ${
          userNames.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Telegram-style typing bubble */}
        <div className="bg-muted text-muted-foreground rounded-2xl rounded-br-md px-3 py-2 flex items-center gap-1.5 shadow-sm">
          <span className="flex gap-1">
            <motion.span
              animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, delay: 0, ease: "easeInOut" }}
              className="w-1.5 h-1.5 bg-current rounded-full"
            />
            <motion.span
              animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, delay: 0.18, ease: "easeInOut" }}
              className="w-1.5 h-1.5 bg-current rounded-full"
            />
            <motion.span
              animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, delay: 0.36, ease: "easeInOut" }}
              className="w-1.5 h-1.5 bg-current rounded-full"
            />
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/80">{displayText}</span>
      </div>
    </div>
  )
}
