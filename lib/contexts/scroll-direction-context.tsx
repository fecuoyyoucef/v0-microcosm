"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type ScrollDirection = "up" | "down"

interface ScrollDirectionContextType {
  scrollDirection: ScrollDirection
  setScrollDirection: (direction: ScrollDirection) => void
}

const ScrollDirectionContext = createContext<ScrollDirectionContextType | undefined>(undefined)

export function ScrollDirectionProvider({ children }: { children: ReactNode }) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>("up")

  return (
    <ScrollDirectionContext.Provider value={{ scrollDirection, setScrollDirection }}>
      {children}
    </ScrollDirectionContext.Provider>
  )
}

export function useScrollDirection() {
  const context = useContext(ScrollDirectionContext)
  if (context === undefined) {
    throw new Error("useScrollDirection must be used within a ScrollDirectionProvider")
  }
  return context
}
