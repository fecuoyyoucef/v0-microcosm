import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

// GET - جلب جميع الميزات
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get("admin_session")

  if (!adminToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const { data: features, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("category", { ascending: true })
      .order("added_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ features: features || [] })
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

  const supabase = await createClient()

  try {
    const { feature_key, updates } = await request.json()

    if (!feature_key) {
      return NextResponse.json({ error: "Feature key is required" }, { status: 400 })
    }

    // الحصول على الحالة السابقة
    const { data: previousState } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("feature_key", feature_key)
      .single()

    // تحديث الميزة
    const { data: updatedFeature, error } = await supabase
      .from("feature_flags")
      .update(updates)
      .eq("feature_key", feature_key)
      .select()
      .single()

    if (error) throw error

    // حفظ في السجل
    await supabase.from("feature_flag_history").insert({
      feature_key,
      action: updates.is_enabled !== undefined ? (updates.is_enabled ? "enabled" : "disabled") : "updated",
      previous_state: previousState,
      new_state: updatedFeature,
      changed_by: "admin",
    })

    return NextResponse.json({ success: true, feature: updatedFeature })
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

  const supabase = await createClient()

  try {
    // قائمة الميزات المتوقعة (يمكن توليدها من الكود تلقائياً)
    const expectedFeatures = [
      { key: "ai_chat_assistant", name_ar: "المساعد الذكي", name_en: "AI Chat Assistant", category: "ai" },
      { key: "ai_content_moderation", name_ar: "فحص المحتوى", name_en: "Content Moderation", category: "ai" },
      // ... المزيد
    ]

    // الحصول على الميزات الموجودة
    const { data: existingFeatures } = await supabase.from("feature_flags").select("feature_key")

    const existingKeys = new Set(existingFeatures?.map((f) => f.feature_key) || [])

    // إضافة الميزات الجديدة
    const newFeatures = expectedFeatures.filter((f) => !existingKeys.has(f.key))

    if (newFeatures.length > 0) {
      const { error } = await supabase.from("feature_flags").insert(
        newFeatures.map((f) => ({
          feature_key: f.key,
          feature_name_ar: f.name_ar,
          feature_name_en: f.name_en,
          category: f.category,
          is_enabled: false, // الميزات الجديدة معطلة افتراضياً
        })),
      )

      if (error) throw error
    }

    return NextResponse.json({ success: true, added: newFeatures.length })
  } catch (error) {
    console.error("Feature sync error:", error)
    return NextResponse.json({ error: "Failed to sync features" }, { status: 500 })
  }
}
