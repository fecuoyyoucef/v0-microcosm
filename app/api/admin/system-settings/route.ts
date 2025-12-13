import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAllSystemSettings, setSystemSetting } from "@/lib/system-settings"

// GET - جلب جميع الإعدادات
export async function GET() {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
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
