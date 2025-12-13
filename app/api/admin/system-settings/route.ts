import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAllSystemSettings, setSystemSetting, getSystemSetting } from "@/lib/system-settings-server"

// GET - جلب الإعدادات (جميعها أو إعداد واحد)
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")

  try {
    if (key) {
      const value = await getSystemSetting(key as any)
      return NextResponse.json({ value })
    }

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await getAllSystemSettings()
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// POST - تحديث إعداد
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { key, value } = await request.json()

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }

    const success = await setSystemSetting(key, value)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
