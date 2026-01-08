"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface BottomNavContextType {
  isVisible: boolean
  setIsVisible: (visible: boolean) => void
  navHeight: number
}

const BottomNavContext = createContext<BottomNavContextType>({
  isVisible: true,
  setIsVisible: () => {},
  navHeight: 64,
})

export function useBottomNav() {
  return useContext(BottomNavContext)
}

export function BottomNavProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(true)
  const navHeight = 64 // ارتفاع الشريط السفلي

  return (
    <BottomNavContext.Provider value={{ isVisible, setIsVisible, navHeight }}>{children}</BottomNavContext.Provider>
  )
}
