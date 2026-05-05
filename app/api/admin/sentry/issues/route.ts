import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { verifyAdmin } from "@/lib/admin-auth"

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "unresolved"
    const level = searchParams.get("level") || "all"

    console.log("[v0] Fetching Sentry issues with status:", status, "level:", level)

    const sentryOrg = process.env.SENTRY_ORG
    const sentryProject = process.env.SENTRY_PROJECT
    const sentryToken = process.env.SENTRY_AUTH_TOKEN

    if (sentryOrg && sentryProject && sentryToken) {
      console.log("[v0] Attempting to fetch from Sentry API...")
      try {
        let query = ""
        if (status !== "all") {
          query += `is:${status} `
        }
        if (level !== "all") {
          query += `level:${level} `
        }

        const sentryUrl = `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/?query=${encodeURIComponent(
          query,
        )}&statsPeriod=24h`

        const response = await fetch(sentryUrl, {
          headers: {
            Authorization: `Bearer ${sentryToken}`,
          },
        })

        if (response.ok) {
          const sentryIssues = await response.json()
          console.log("[v0] Sentry API returned", sentryIssues.length, "issues")

          const issues = sentryIssues.map((issue: any) => ({
            id: issue.id,
            title: issue.title || issue.metadata?.type || "Unknown Error",
            culprit: issue.culprit || "Unknown",
            level: issue.level || "error",
            status: issue.status,
            count: issue.count || "0",
            userCount: issue.userCount || 0,
            firstSeen: issue.firstSeen,
            lastSeen: issue.lastSeen,
            permalink: issue.permalink,
            metadata: issue.metadata,
          }))

          const stats = {
            total: issues.length,
            last24h: issues.filter((issue: any) => {
              const lastSeen = new Date(issue.lastSeen)
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
              return lastSeen > oneDayAgo
            }).length,
            resolved: issues.filter((issue: any) => issue.status === "resolved").length,
            unresolved: issues.filter((issue: any) => issue.status === "unresolved").length,
          }

          return NextResponse.json({ issues, stats })
        } else {
          console.log("[v0] Sentry API failed with status:", response.status)
        }
      } catch (sentryError) {
        console.error("[v0] Sentry API error, falling back to local data:", sentryError)
      }
    } else {
      console.log("[v0] Sentry env vars not configured, using local data")
    }

    console.log("[v0] Using local monitoring_events as fallback")
    const supabase = await createClient()

    const { data: events, error } = await supabase
      .from("monitoring_events")
      .select("*")
      .eq("event_type", "error")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[v0] Error fetching monitoring events:", error)
      return NextResponse.json(
        {
          issues: [],
          stats: { total: 0, last24h: 0, resolved: 0, unresolved: 0 },
        },
        { status: 200 },
      )
    }

    console.log("[v0] Found", events?.length || 0, "monitoring events")

    const errorGroups = new Map<string, any>()

    events?.forEach((event: any) => {
      const errorMessage = event.event_data?.error || event.event_data?.message || "Unknown Error"
      const key = errorMessage.substring(0, 100)

      if (errorGroups.has(key)) {
        const existing = errorGroups.get(key)
        existing.count++
        existing.userCount = new Set([...existing.users, event.user_id]).size
        existing.users.add(event.user_id)
        existing.lastSeen = event.created_at
      } else {
        errorGroups.set(key, {
          id: event.id,
          title: errorMessage,
          culprit: event.event_data?.location || "Unknown",
          level: event.event_data?.level || "error",
          status: "unresolved",
          count: 1,
          userCount: 1,
          users: new Set([event.user_id]),
          firstSeen: event.created_at,
          lastSeen: event.created_at,
          permalink: `/admin/errors`,
          metadata: event.event_data,
        })
      }
    })

    const issues = Array.from(errorGroups.values()).map((issue) => ({
      ...issue,
      users: undefined,
    }))

    let filteredIssues = issues
    if (level !== "all") {
      filteredIssues = filteredIssues.filter((issue) => issue.level === level)
    }

    const stats = {
      total: filteredIssues.length,
      last24h: filteredIssues.filter((issue: any) => {
        const lastSeen = new Date(issue.lastSeen)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return lastSeen > oneDayAgo
      }).length,
      resolved: 0,
      unresolved: filteredIssues.length,
    }

    console.log("[v0] Returning", filteredIssues.length, "issues with stats:", stats)

    return NextResponse.json({ issues: filteredIssues, stats })
  } catch (error) {
    console.error("[v0] Sentry issues API error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
