"use client"

import { useState, useCallback } from "react"

export interface OptimisticUpdate<T> {
  id: string
  data: T
  status: "pending" | "success" | "error"
}

export function useOptimisticUpdates<T extends { id: string }>() {
  const [items, setItems] = useState<T[]>([])
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map())

  const addOptimistic = useCallback((tempId: string, data: T) => {
    setPendingUpdates((prev) => {
      const newMap = new Map(prev)
      newMap.set(tempId, { id: tempId, data, status: "pending" })
      return newMap
    })
    setItems((prev) => [...prev, data])
  }, [])

  const confirmOptimistic = useCallback((tempId: string, realData: T) => {
    setPendingUpdates((prev) => {
      const newMap = new Map(prev)
      newMap.delete(tempId)
      return newMap
    })
    setItems((prev) => prev.map((item) => (item.id === tempId ? realData : item)))
  }, [])

  const rejectOptimistic = useCallback((tempId: string) => {
    setPendingUpdates((prev) => {
      const newMap = new Map(prev)
      const update = newMap.get(tempId)
      if (update) {
        newMap.set(tempId, { ...update, status: "error" })
      }
      return newMap
    })
    setItems((prev) => prev.filter((item) => item.id !== tempId))
  }, [])

  const setData = useCallback((data: T[]) => {
    setItems(data)
  }, [])

  return {
    items,
    setData,
    addOptimistic,
    confirmOptimistic,
    rejectOptimistic,
    pendingUpdates,
  }
}
