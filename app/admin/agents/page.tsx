"use client"

import { Suspense } from "react"
import AgentsContent from "./agents-content"

export default function AgentsPage() {
  return (
    <Suspense fallback={null}>
      <AgentsContent />
    </Suspense>
  )
}
