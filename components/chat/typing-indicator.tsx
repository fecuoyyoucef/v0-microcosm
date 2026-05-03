"use client"

import { motion, AnimatePresence } from "framer-motion"

interface TypingIndicatorProps {
  userNames: string[]
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null

  const displayText =
    userNames.length === 1
      ? `${userNames[0]} يكتب`
      : userNames.length === 2
        ? `${userNames[0]} و ${userNames[1]} يكتبان`
        : `${userNames.length} أشخاص يكتبون`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="px-4 py-2 flex items-end gap-2"
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
        <span className="text-[11px] text-muted-foreground/80 mb-1">{displayText}</span>
      </motion.div>
    </AnimatePresence>
  )
}
