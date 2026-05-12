"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useFeatureFlags, type FeatureFlag } from "@/hooks/use-feature-flags"

interface FeatureFlagsContextValue {
  flags: FeatureFlag[]
  loading: boolean
  error: Error | null
  isEnabled: (key: string) => boolean
  getFlag: (key: string) => FeatureFlag | undefined
  refetch: () => Promise<void>
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null)

interface FeatureFlagsProviderProps {
  children: ReactNode
  /**
   * Whether to enable real-time subscriptions
   * @default true
   */
  realtime?: boolean
}

/**
 * Provider component for feature flags with real-time updates
 * 
 * @example
 * ```tsx
 * // In your layout or app wrapper
 * <FeatureFlagsProvider>
 *   <App />
 * </FeatureFlagsProvider>
 * 
 * // In any component
 * const { isEnabled } = useFeatureFlagsContext()
 * if (isEnabled('ai_features_enabled')) {
 *   // Show AI features
 * }
 * ```
 */
export function FeatureFlagsProvider({ children, realtime = true }: FeatureFlagsProviderProps) {
  const featureFlags = useFeatureFlags({ realtime })

  return (
    <FeatureFlagsContext.Provider value={featureFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

/**
 * Hook to access feature flags from context
 * Must be used within a FeatureFlagsProvider
 */
export function useFeatureFlagsContext(): FeatureFlagsContextValue {
  const context = useContext(FeatureFlagsContext)
  
  if (!context) {
    throw new Error("useFeatureFlagsContext must be used within a FeatureFlagsProvider")
  }
  
  return context
}

/**
 * Component that conditionally renders children based on a feature flag
 * 
 * @example
 * ```tsx
 * <FeatureGate flag="ai_features_enabled">
 *   <AIFeatures />
 * </FeatureGate>
 * 
 * <FeatureGate flag="experimental_feature" fallback={<ComingSoon />}>
 *   <ExperimentalFeature />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isEnabled, loading } = useFeatureFlagsContext()

  // While loading, don't render anything (or show fallback)
  if (loading) return fallback

  return isEnabled(flag) ? children : fallback
}
