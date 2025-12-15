"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface FeaturesContextType {
  features: Map<string, boolean>
  isEnabled: (key: string) => boolean
  isLoading: boolean
  refresh: () => void
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined)

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Map<string, boolean>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchFeatures = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("feature_flags").select("feature_key, is_enabled")

      if (error) throw error

      const featureMap = new Map<string, boolean>()
      data?.forEach((f) => {
        featureMap.set(f.feature_key, f.is_enabled)
      })

      setFeatures(featureMap)
    } catch (error) {
      console.error("Error fetching features:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchFeatures()

    const channel = supabase
      .channel("features-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feature_flags",
        },
        () => {
          fetchFeatures()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeatures, supabase])

  const isEnabled = useCallback(
    (key: string): boolean => {
      return features.get(key) ?? false
    },
    [features],
  )

  const refresh = useCallback(() => {
    fetchFeatures()
  }, [fetchFeatures])

  return (
    <FeaturesContext.Provider value={{ features, isEnabled, isLoading, refresh }}>{children}</FeaturesContext.Provider>
  )
}

export function useFeaturesContext() {
  const context = useContext(FeaturesContext)
  if (!context) {
    throw new Error("useFeaturesContext must be used within FeaturesProvider")
  }
  return context
}
