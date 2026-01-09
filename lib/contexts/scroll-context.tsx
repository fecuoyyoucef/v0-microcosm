"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type ScrollDirection = "up" | "down"

interface ScrollContextType {
  scrollDirection: ScrollDirection
  setScrollDirection: (direction: ScrollDirection) => void
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined)

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>("up")

  return <ScrollContext.Provider value={{ scrollDirection, setScrollDirection }}>{children}</ScrollContext.Provider>
}

export function useScroll() {
  const context = useContext(ScrollContext)
  if (context === undefined) {
    throw new Error("useScroll must be used within a ScrollProvider")
  }
  return context
}
