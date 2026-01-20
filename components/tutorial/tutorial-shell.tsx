"use client"
import { TutorialOverlay } from "./tutorial-overlay"
import React from "react"

import { TutorialTooltip } from "./tutorial-tooltip"

interface TutorialShellProps {
  children: React.ReactNode
}

export function TutorialShell({ children }: TutorialShellProps) {
  return (
    <>
      <TutorialOverlay />
      <TutorialTooltip />
      {children}
    </>
  )
}
