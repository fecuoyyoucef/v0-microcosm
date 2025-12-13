import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "unresolved"
    const level = searchParams.get("level") || "all"

    const sentryOrg = process.env.SENTRY_ORG
    const sentryProject = process.env.SENTRY_PROJECT
    const sentryToken = process.env.SENTRY_AUTH_TOKEN

    if (!sentryOrg || !sentryProject || !sentryToken) {
      return NextResponse.json(
        {
          issues: [],
          stats: { total: 0, last24h: 0, resolved: 0, unresolved: 0 },
          error: "Sentry not configured",
        },
        { status: 200 },
      )
    }

    // Build Sentry API query
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

    if (!response.ok) {
      console.error("Sentry API error:", await response.text())
      return NextResponse.json(
        {
          issues: [],
          stats: { total: 0, last24h: 0, resolved: 0, unresolved: 0 },
          error: "Failed to fetch from Sentry",
        },
        { status: 200 },
      )
    }

    const sentryIssues = await response.json()

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
  } catch (error) {
    console.error("Sentry issues API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
