"use client"

import { motion, AnimatePresence } from "framer-motion"

interface TypingIndicatorProps {
  userNames: string[]
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null

  const displayText =
    userNames.length === 1
      ? `${userNames[0]} يكتب...`
      : userNames.length === 2
        ? `${userNames[0]} و ${userNames[1]} يكتبان...`
        : `${userNames.length} أشخاص يكتبون...`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="px-4 py-2 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, delay: 0 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, delay: 0.2 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, delay: 0.4 }}
              className="w-2 h-2 bg-primary rounded-full"
            />
          </div>
          <span>{displayText}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
