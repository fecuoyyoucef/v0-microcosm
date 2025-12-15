"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface FeatureFlag {
  feature_key: string
  is_enabled: boolean
}

let cachedFeatures: Map<string, boolean> | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useFeatures() {
  const [features, setFeatures] = useState<Map<string, boolean>>(cachedFeatures || new Map())
  const [isLoading, setIsLoading] = useState(!cachedFeatures)
  const supabase = createClient()

  const fetchFeatures = useCallback(async () => {
    // Check cache first
    if (cachedFeatures && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setFeatures(cachedFeatures)
      setIsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.from("feature_flags").select("feature_key, is_enabled")

      if (error) throw error

      const featureMap = new Map<string, boolean>()
      data?.forEach((f: FeatureFlag) => {
        featureMap.set(f.feature_key, f.is_enabled)
      })

      cachedFeatures = featureMap
      cacheTimestamp = Date.now()
      setFeatures(featureMap)
    } catch (error) {
      console.error("Error fetching features:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchFeatures()

    // Subscribe to real-time updates
    const channel = supabase
      .channel("feature-flags-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feature_flags",
        },
        () => {
          // Invalidate cache and refetch
          cachedFeatures = null
          fetchFeatures()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeatures, supabase])

  const isEnabled = useCallback(
    (featureKey: string): boolean => {
      return features.get(featureKey) ?? false
    },
    [features],
  )

  const refresh = useCallback(() => {
    cachedFeatures = null
    fetchFeatures()
  }, [fetchFeatures])

  return { features, isEnabled, isLoading, refresh }
}

export function useFeature(featureKey: string): boolean {
  const { isEnabled } = useFeatures()
  return isEnabled(featureKey)
}

// Utility to check feature on server side
export async function checkFeatureServer(featureKey: string): Promise<boolean> {
  const { createClient } = await import("@/lib/supabase/server")
  const supabase = await createClient()

  const { data } = await supabase.from("feature_flags").select("is_enabled").eq("feature_key", featureKey).single()

  return data?.is_enabled ?? false
}
