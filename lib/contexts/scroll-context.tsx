"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface ScrollContextType {
  scrollDirection: "up" | "down"
  setScrollDirection: (direction: "up" | "down") => void
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined)

export function ScrollProvider({ children }: { children: ReactNode }) {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up")

  return <ScrollContext.Provider value={{ scrollDirection, setScrollDirection }}>{children}</ScrollContext.Provider>
}

export function useScrollDirection() {
  const context = useContext(ScrollContext)
  if (!context) {
    throw new Error("useScrollDirection must be used within ScrollProvider")
  }
  return context
}
