"use client"

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Meeting } from "@/lib/types"
import { MeetingAlarmOverlay } from "./meeting-alarm-overlay"

/**
 * Global meeting alarm system.
 *
 * Responsibilities (all client-side, works whenever the app is open — the
 * server/pg_cron path handles closed-app push separately):
 *  - Tracks scheduled/active meetings for every group the user belongs to.
 *  - 5 minutes before start it raises a full-screen alarm with a repeating
 *    tone: rings ~30s, stops; if unacknowledged, rings again after 5 min for
 *    ~30s, then stops for good.
 *  - The alarm stops the moment the user enters the cell (handled by the cell
 *    page calling acknowledge) or taps "دخول"/"إيقاف".
 *  - Surfaces the "meeting in progress" / "meeting ended" lifecycle so the
 *    in-cell banner can react.
 */

const REMINDER_LEAD_MS = 5 * 60 * 1000 // alarm starts 5 min before start
const RING_DURATION_MS = 30 * 1000 // each ring lasts 30s
const RING_GAP_MS = 5 * 60 * 1000 // 5 min between the two rings
const MAX_RINGS = 2

type ActiveAlarm = {
  meeting: Meeting
  groupName: string
}

type MeetingAlarmContextValue = {
  acknowledgeMeeting: (meetingId: string) => void
  acknowledgeMeetingsForGroup: (groupId: string) => void
}

const MeetingAlarmContext = createContext<MeetingAlarmContextValue | null>(null)

export function useMeetingAlarm() {
  const ctx = useContext(MeetingAlarmContext)
  if (!ctx) {
    // Non-fatal: callers outside the provider just get no-ops.
    return { acknowledgeMeeting: () => {}, acknowledgeMeetingsForGroup: () => {} }
  }
  return ctx
}

export function MeetingAlarmProvider({
  userId,
  children,
}: {
  userId: string | null
  children: React.ReactNode
}) {
  const supabase = createClient()
  const router = useRouter()

  // All upcoming/active meetings the user should be alerted about.
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [groupNames, setGroupNames] = useState<Record<string, string>>({})
  // The meeting currently sounding the alarm (null = silent).
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null)

  // Per-meeting scheduling bookkeeping so we never double-schedule.
  const ringTimersRef = useRef<Record<string, number[]>>({})
  const acknowledgedRef = useRef<Set<string>>(new Set())

  // ----- Web Audio alarm tone (no asset needed) -----
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringStopRef = useRef<(() => void) | null>(null)

  const stopTone = useCallback(() => {
    if (ringStopRef.current) {
      ringStopRef.current()
      ringStopRef.current = null
    }
  }, [])

  const playTone = useCallback(
    (durationMs: number) => {
      try {
        if (typeof window === "undefined") return
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        const ctx = audioCtxRef.current || new Ctx()
        audioCtxRef.current = ctx
        if (ctx.state === "suspended") ctx.resume().catch(() => {})

        let stopped = false
        let beepTimer: number | undefined

        // A repeating two-tone "beep-beep" for an alarm-clock feel.
        const beep = () => {
          if (stopped) return
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = "square"
          osc.frequency.value = 880
          gain.gain.setValueAtTime(0.0001, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 0.36)
          beepTimer = window.setTimeout(beep, 700)
        }
        beep()

        const autoStop = window.setTimeout(() => {
          stopped = true
          if (beepTimer) clearTimeout(beepTimer)
        }, durationMs)

        ringStopRef.current = () => {
          stopped = true
          if (beepTimer) clearTimeout(beepTimer)
          clearTimeout(autoStop)
        }
      } catch {
        // Audio is best-effort; the visual overlay still shows.
      }
    },
    [],
  )

  // ----- Load meetings for the user's groups -----
  const loadMeetings = useCallback(async () => {
    if (!userId) return
    // Groups the user belongs to.
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, groups(name)")
      .eq("user_id", userId)

    const groupIds = (memberships ?? []).map((m: any) => m.group_id)
    const names: Record<string, string> = {}
    ;(memberships ?? []).forEach((m: any) => {
      names[m.group_id] = m.groups?.name ?? "خلية"
    })
    setGroupNames(names)
    if (groupIds.length === 0) {
      setMeetings([])
      return
    }

    // Only meetings that are still relevant (not ended/cancelled) and in a
    // sensible time window (from now-ish into the future).
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .in("group_id", groupIds)
      .in("status", ["scheduled", "active"])
      .order("starts_at", { ascending: true })

    setMeetings((data as Meeting[]) ?? [])
  }, [supabase, userId])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  // ----- Realtime: react to new/updated meetings instantly -----
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`meeting-alarms-${userId}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        loadMeetings()
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "meeting_alarm_state", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { meeting_id: string }
          // Another device acknowledged — stop ringing here too.
          acknowledgedRef.current.add(row.meeting_id)
          setActiveAlarm((cur) => (cur?.meeting.id === row.meeting_id ? null : cur))
          stopTone()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId, loadMeetings, stopTone])

  // ----- Schedule the local ring timers for each meeting -----
  const clearMeetingTimers = useCallback((meetingId: string) => {
    const timers = ringTimersRef.current[meetingId]
    if (timers) {
      timers.forEach((t) => clearTimeout(t))
      delete ringTimersRef.current[meetingId]
    }
  }, [])

  const triggerRing = useCallback(
    (meeting: Meeting, groupName: string) => {
      if (acknowledgedRef.current.has(meeting.id)) return
      setActiveAlarm({ meeting, groupName })
      playTone(RING_DURATION_MS)
    },
    [playTone],
  )

  useEffect(() => {
    const now = Date.now()

    meetings.forEach((meeting) => {
      if (meeting.status === "cancelled" || meeting.status === "ended") return
      if (acknowledgedRef.current.has(meeting.id)) return
      if (ringTimersRef.current[meeting.id]) return // already scheduled

      const startMs = new Date(meeting.starts_at).getTime()
      const firstRingAt = startMs - REMINDER_LEAD_MS
      const groupName = groupNames[meeting.group_id] ?? "خلية"

      const timers: number[] = []
      for (let i = 0; i < MAX_RINGS; i++) {
        const ringAt = firstRingAt + i * RING_GAP_MS
        const delay = ringAt - now
        // Fire rings that are in the future, or a "just missed" first ring
        // within the lead window (e.g. app opened 2 min before start).
        if (delay > -RING_DURATION_MS) {
          const t = window.setTimeout(
            () => triggerRing(meeting, groupName),
            Math.max(0, delay),
          )
          timers.push(t)
        }
      }
      if (timers.length > 0) {
        ringTimersRef.current[meeting.id] = timers
      }
    })

    // Clean up timers for meetings no longer in the list.
    const liveIds = new Set(meetings.map((m) => m.id))
    Object.keys(ringTimersRef.current).forEach((id) => {
      if (!liveIds.has(id)) clearMeetingTimers(id)
    })
  }, [meetings, groupNames, triggerRing, clearMeetingTimers])

  // ----- Acknowledge (enter cell / tap dismiss) -----
  const acknowledgeMeeting = useCallback(
    (meetingId: string) => {
      acknowledgedRef.current.add(meetingId)
      clearMeetingTimers(meetingId)
      stopTone()
      setActiveAlarm((cur) => (cur?.meeting.id === meetingId ? null : cur))
      // Persist so other devices stop too (best-effort).
      fetch(`/api/meetings/${meetingId}/ack`, { method: "POST", credentials: "include" }).catch(() => {})
    },
    [clearMeetingTimers, stopTone],
  )

  const handleEnter = useCallback(
    (meeting: Meeting) => {
      acknowledgeMeeting(meeting.id)
      router.push(`/chat/${meeting.group_id}`)
    },
    [acknowledgeMeeting, router],
  )

  // Silence every (tracked) meeting alarm for a group — called when the user
  // opens that cell, so arriving from the push notification stops the alarm.
  const acknowledgeMeetingsForGroup = useCallback(
    (groupId: string) => {
      meetings.forEach((m) => {
        if (m.group_id === groupId && !acknowledgedRef.current.has(m.id)) {
          acknowledgeMeeting(m.id)
        }
      })
    },
    [meetings, acknowledgeMeeting],
  )

  return (
    <MeetingAlarmContext.Provider value={{ acknowledgeMeeting, acknowledgeMeetingsForGroup }}>
      {children}
      {activeAlarm && (
        <MeetingAlarmOverlay
          meeting={activeAlarm.meeting}
          groupName={activeAlarm.groupName}
          onEnter={() => handleEnter(activeAlarm.meeting)}
          onDismiss={() => acknowledgeMeeting(activeAlarm.meeting.id)}
        />
      )}
    </MeetingAlarmContext.Provider>
  )
}
