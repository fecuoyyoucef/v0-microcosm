import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAllFeatures, syncFeatures, updateFeatureStatus } from "@/lib/feature-registry-server"

// GET - جلب جميع الميزات
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const features = await getAllFeatures()
    return NextResponse.json({ features })
  } catch (error) {
    console.error("Features fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 })
  }
}

// POST - تحديث ميزة
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { feature_key, is_enabled } = await request.json()

    if (!feature_key || is_enabled === undefined) {
      return NextResponse.json({ error: "Feature key and status are required" }, { status: 400 })
    }

    const success = await updateFeatureStatus(feature_key, is_enabled)

    if (!success) {
      return NextResponse.json({ error: "Failed to update feature" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Feature update error:", error)
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 })
  }
}

// PUT - مزامنة الميزات (اكتشاف الجديدة)
export async function PUT(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncFeatures()
    return NextResponse.json({ success: true, added: result.added, updated: result.updated })
  } catch (error) {
    console.error("Feature sync error:", error)
    return NextResponse.json({ error: "Failed to sync features" }, { status: 500 })
  }
}
