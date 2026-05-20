"use client"

/**
 * Lightweight notification sound system built on the Web Audio API.
 *
 * - Zero asset files: every tone is synthesized from sine waves on demand,
 *   so the bundle stays tiny and the sounds are always available offline.
 * - Single shared AudioContext, lazily created on the first play() so we
 *   don't trip Chrome/Safari autoplay restrictions on initial page load.
 * - Each preset has a deliberately different timbre (frequency + duration +
 *   harmonics) so users can tell them apart without looking at the screen.
 *
 * Usage:
 *   import { playNotificationSound } from "@/lib/sounds/notification-sounds"
 *   playNotificationSound("message")
 */

export type NotificationSoundKind =
  /** Regular incoming chat message — short, soft. */
  | "message"
  /** @mention or direct reply — slightly higher, double tap. */
  | "mention"
  /** Vote/decision/achievement — pleasant rising chime. */
  | "decision"
  /** System events: role change, join, kick, etc. */
  | "system"
  /** Urgent: owner/admin announcement, critical alert. */
  | "urgent"

interface ToneStep {
  /** Frequency in Hz. */
  freq: number
  /** Step duration in seconds. */
  duration: number
  /** Peak gain (0..1). Defaults to 0.18. */
  gain?: number
  /** Delay before this step starts, in seconds. Defaults to 0 (right after the previous step). */
  delay?: number
  /** Oscillator type. Defaults to "sine" for a soft UI feel. */
  type?: OscillatorType
}

const PRESETS: Record<NotificationSoundKind, ToneStep[]> = {
  // Single soft "ping" — bubble-like.
  message: [{ freq: 880, duration: 0.18, gain: 0.16 }],

  // Two quick taps, second one higher — clearly an alert.
  mention: [
    { freq: 880, duration: 0.12, gain: 0.18 },
    { freq: 1175, duration: 0.16, gain: 0.18, delay: 0.04 },
  ],

  // Rising 3-note arpeggio — feels like an achievement.
  decision: [
    { freq: 660, duration: 0.12, gain: 0.16 },
    { freq: 880, duration: 0.12, gain: 0.16, delay: 0.02 },
    { freq: 1175, duration: 0.22, gain: 0.18, delay: 0.02 },
  ],

  // Lower, more formal two-tone — official system event.
  system: [
    { freq: 523, duration: 0.18, gain: 0.18 },
    { freq: 392, duration: 0.28, gain: 0.18, delay: 0.05 },
  ],

  // Triangle wave with a slight bend — distinctive, gets attention without being harsh.
  urgent: [
    { freq: 988, duration: 0.18, gain: 0.22, type: "triangle" },
    { freq: 740, duration: 0.18, gain: 0.22, type: "triangle", delay: 0.04 },
    { freq: 988, duration: 0.32, gain: 0.22, type: "triangle", delay: 0.04 },
  ],
}

let ctx: AudioContext | null = null

/** Resolve (and lazily create) the shared AudioContext. Returns null on the server. */
function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (ctx) return ctx
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

const STORAGE_KEY = "notification-sounds-enabled"

/** True by default. Persists per-browser via localStorage. */
export function areSoundsEnabled(): boolean {
  if (typeof window === "undefined") return false
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === null ? true : raw === "1"
}

export function setSoundsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0")
}

/**
 * Play a preset sound. Silently no-ops on the server, when the user has
 * disabled sounds, or when the browser blocks audio (e.g. before any user
 * interaction has occurred on the page).
 */
export function playNotificationSound(kind: NotificationSoundKind) {
  if (!areSoundsEnabled()) return
  const audio = getContext()
  if (!audio) return

  // Some browsers suspend the context until a user gesture; resume() is a no-op
  // when already running and rejects silently otherwise.
  if (audio.state === "suspended") {
    audio.resume().catch(() => {})
  }

  const steps = PRESETS[kind]
  let cursor = audio.currentTime

  for (const step of steps) {
    cursor += step.delay ?? 0

    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = step.type ?? "sine"
    osc.frequency.setValueAtTime(step.freq, cursor)

    const peak = step.gain ?? 0.18
    // Quick attack + exponential decay — the standard UI "blip" envelope.
    gain.gain.setValueAtTime(0.0001, cursor)
    gain.gain.exponentialRampToValueAtTime(peak, cursor + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, cursor + step.duration)

    osc.connect(gain)
    gain.connect(audio.destination)

    osc.start(cursor)
    osc.stop(cursor + step.duration + 0.02)

    cursor += step.duration
  }
}
