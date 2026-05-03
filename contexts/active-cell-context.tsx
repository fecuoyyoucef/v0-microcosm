"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface ActiveCellContextType {
  activeCellId: string | null
  setActiveCellId: (cellId: string | null) => void
  isInCell: (cellId: string) => boolean
}

const ActiveCellContext = createContext<ActiveCellContextType | undefined>(undefined)

export function ActiveCellProvider({ children }: { children: ReactNode }) {
  const [activeCellId, setActiveCellIdState] = useState<string | null>(null)

  const setActiveCellId = useCallback((cellId: string | null) => {
    setActiveCellIdState(cellId)
  }, [])

  const isInCell = useCallback((cellId: string) => {
    return activeCellId === cellId
  }, [activeCellId])

  return (
    <ActiveCellContext.Provider value={{ activeCellId, setActiveCellId, isInCell }}>
      {children}
    </ActiveCellContext.Provider>
  )
}

export function useActiveCell() {
  const context = useContext(ActiveCellContext)
  if (context === undefined) {
    throw new Error("useActiveCell must be used within an ActiveCellProvider")
  }
  return context
}
