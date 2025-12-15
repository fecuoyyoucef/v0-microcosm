"use client"

import { useFeature } from "@/hooks/use-features"
import type { ReactNode } from "react"

interface FeatureGateProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeature(feature)

  if (!isEnabled) return <>{fallback}</>

  return <>{children}</>
}
