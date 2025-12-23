"use client"

import { Suspense } from "react"
import ChiefAgentContent from "./chief-agent-content"

export default function ChiefAgentPage() {
  return (
    <Suspense fallback={null}>
      <ChiefAgentContent />
    </Suspense>
  )
}
