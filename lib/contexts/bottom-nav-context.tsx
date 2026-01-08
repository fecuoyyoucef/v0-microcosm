"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface BottomNavContextType {
  bottomNavHeight: number
  isBottomNavVisible: boolean
}

const BottomNavContext = createContext<BottomNavContextType>({
  bottomNavHeight: 96, // 24 * 4 = 96px (h-24)
  isBottomNavVisible: true,
})

export function BottomNavProvider({ children }: { children: ReactNode }) {
  const [bottomNavHeight, setBottomNavHeight] = useState(96)
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true)

  useEffect(() => {
    // Listen to custom events from app-shell
    const handleNavStateChange = (e: CustomEvent) => {
      setBottomNavHeight(e.detail.height)
      setIsBottomNavVisible(e.detail.visible)
    }

    window.addEventListener("bottomNavStateChange" as any, handleNavStateChange)
    return () => window.removeEventListener("bottomNavStateChange" as any, handleNavStateChange)
  }, [])

  return (
    <BottomNavContext.Provider value={{ bottomNavHeight, isBottomNavVisible }}>{children}</BottomNavContext.Provider>
  )
}

export const useBottomNav = () => useContext(BottomNavContext)
