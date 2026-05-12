"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface FeatureFlag {
  id: string
  feature_key: string
  feature_name: string
  feature_name_ar: string
  description: string | null
  description_ar: string | null
  category: "ai" | "core" | "ui" | "admin" | "experimental"
  version: string
  is_enabled: boolean
  requires_admin: boolean
  dependencies: string[] | null
  metadata: Record<string, any> | null
  added_date: string
  updated_at: string
}

interface UseFeatureFlagsOptions {
  /**
   * Whether to enable real-time subscriptions
   * @default true
   */
  realtime?: boolean
  /**
   * Filter by category
   */
  category?: FeatureFlag["category"]
  /**
   * Filter by specific feature keys
   */
  keys?: string[]
}

interface UseFeatureFlagsReturn {
  flags: FeatureFlag[]
  loading: boolean
  error: Error | null
  isEnabled: (key: string) => boolean
  getFlag: (key: string) => FeatureFlag | undefined
  refetch: () => Promise<void>
}

/**
 * Hook for accessing feature flags with real-time updates
 * 
 * @example
 * ```tsx
 * const { isEnabled, flags, loading } = useFeatureFlags()
 * 
 * if (isEnabled('ai_features_enabled')) {
 *   // Show AI features
 * }
 * ```
 */
export function useFeatureFlags(options: UseFeatureFlagsOptions = {}): UseFeatureFlagsReturn {
  const { realtime = true, category, keys } = options
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchFlags = useCallback(async () => {
    try {
      const supabase = createClient()
      // استخدام feature_registry كمصدر رئيسي للميزات
      let query = supabase.from("feature_registry").select("*")

      if (category) {
        query = query.eq("category", category)
      }

      if (keys && keys.length > 0) {
        query = query.in("feature_key", keys)
      }

      const { data, error: fetchError } = await query.order("category").order("feature_name")

      if (fetchError) throw fetchError

      setFlags(data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching feature flags:", err)
      setError(err instanceof Error ? err : new Error("Failed to fetch feature flags"))
    } finally {
      setLoading(false)
    }
  }, [category, keys])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel("feature_registry_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "feature_registry",
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newFlag = payload.new as FeatureFlag
              // Apply filters
              if (category && newFlag.category !== category) return
              if (keys && keys.length > 0 && !keys.includes(newFlag.feature_key)) return

              setFlags((prev) => [...prev, newFlag])
            } else if (payload.eventType === "UPDATE") {
              const updatedFlag = payload.new as FeatureFlag
              setFlags((prev) =>
                prev.map((flag) =>
                  flag.id === updatedFlag.id ? updatedFlag : flag
                )
              )
            } else if (payload.eventType === "DELETE") {
              const deletedFlag = payload.old as { id: string }
              setFlags((prev) => prev.filter((flag) => flag.id !== deletedFlag.id))
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [realtime, category, keys])

  const isEnabled = useCallback(
    (key: string): boolean => {
      const flag = flags.find((f) => f.feature_key === key)
      if (!flag) return false

      // Check dependencies
      if (flag.dependencies && flag.dependencies.length > 0) {
        const allDependenciesEnabled = flag.dependencies.every((depKey) => {
          const depFlag = flags.find((f) => f.feature_key === depKey)
          return depFlag?.is_enabled ?? false
        })
        if (!allDependenciesEnabled) return false
      }

      return flag.is_enabled
    },
    [flags]
  )

  const getFlag = useCallback(
    (key: string): FeatureFlag | undefined => {
      return flags.find((f) => f.feature_key === key)
    },
    [flags]
  )

  return {
    flags,
    loading,
    error,
    isEnabled,
    getFlag,
    refetch: fetchFlags,
  }
}

/**
 * Hook for checking a single feature flag with real-time updates
 * 
 * @example
 * ```tsx
 * const isAIEnabled = useFeatureFlag('ai_features_enabled')
 * ```
 */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlags({ keys: [key] })
  return isEnabled(key)
}

/**
 * Hook for admin feature flag management with real-time updates
 */
export function useAdminFeatureFlags() {
  const { flags, loading, error, refetch } = useFeatureFlags()
  const [updating, setUpdating] = useState<string | null>(null)

  const toggleFlag = useCallback(async (featureKey: string, currentValue: boolean): Promise<boolean> => {
    setUpdating(featureKey)
    try {
      const supabase = createClient()
      // تحديث feature_registry مباشرة
      const { error: updateError } = await supabase
        .from("feature_registry")
        .update({ 
          is_enabled: !currentValue,
          updated_at: new Date().toISOString()
        })
        .eq("feature_key", featureKey)

      if (updateError) throw updateError

      // Real-time will update the state automatically
      return true
    } catch (err) {
      console.error("Error toggling feature flag:", err)
      return false
    } finally {
      setUpdating(null)
    }
  }, [])

  const updateFlag = useCallback(async (
    featureKey: string, 
    updates: Partial<Pick<FeatureFlag, "is_enabled" | "metadata">>
  ): Promise<boolean> => {
    setUpdating(featureKey)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("feature_registry")
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq("feature_key", featureKey)

      if (updateError) throw updateError

      return true
    } catch (err) {
      console.error("Error updating feature flag:", err)
      return false
    } finally {
      setUpdating(null)
    }
  }, [])

  const syncFlags = useCallback(async (): Promise<{ added: number; updated: number }> => {
    try {
      const res = await fetch("/api/admin/features", { method: "PUT" })
      if (!res.ok) throw new Error("Failed to sync features")
      const data = await res.json()
      // Real-time will update the state automatically
      return { added: data.added, updated: data.updated }
    } catch (err) {
      console.error("Error syncing feature flags:", err)
      throw err
    }
  }, [])

  // Stats
  const stats = {
    total: flags.length,
    enabled: flags.filter((f) => f.is_enabled).length,
    byCategory: {
      ai: flags.filter((f) => f.category === "ai"),
      core: flags.filter((f) => f.category === "core"),
      ui: flags.filter((f) => f.category === "ui"),
      admin: flags.filter((f) => f.category === "admin"),
      experimental: flags.filter((f) => f.category === "experimental"),
    },
  }

  return {
    flags,
    loading,
    error,
    updating,
    stats,
    toggleFlag,
    updateFlag,
    syncFlags,
    refetch,
  }
}
