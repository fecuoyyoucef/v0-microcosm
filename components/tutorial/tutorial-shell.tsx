"use client"
import { TutorialOverlay } from "./tutorial-overlay"
import { TutorialTooltip } from "./tutorial-tooltip"

export function TutorialShell() {
  return (
    <>
      <TutorialOverlay />
      <TutorialTooltip />
    </>
  )
}
