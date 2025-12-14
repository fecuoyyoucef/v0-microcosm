// نظام سجل الميزات - يكتشف الميزات تلقائياً ويتيح التحكم الديناميكي
import { createClient } from "@/lib/supabase/server"

export interface Feature {
  id: string
  feature_key: string
  feature_name: string
  feature_name_ar: string
  description?: string
  description_ar?: string
  category: "ai" | "core" | "ui" | "admin" | "experimental"
  version: string
  added_date: string
  is_enabled: boolean
  requires_admin: boolean
  dependencies?: string[]
  metadata?: Record<string, any>
  updated_at: string
}

export const FEATURE_DEFINITIONS: Omit<Feature, "id" | "added_date" | "updated_at">[] = [
  {
    feature_key: "cell_classification_enabled",
    feature_name: "Cell Classification",
    feature_name_ar: "تصنيف الخلايا",
    description: "Categorize cells by type",
    description_ar: "تصنيف الخلايا حسب النوع",
    category: "core",
    version: "1.0.0",
    is_enabled: false,
    requires_admin: false,
  },
  {
    feature_key: "cell_criteria_enabled",
    feature_name: "Cell Criteria",
    feature_name_ar: "معايير الخلايا",
    description: "Set join requirements for cells",
    description_ar: "تحديد معايير الانضمام للخلايا",
    category: "core",
    version: "1.0.0",
    is_enabled: false,
    requires_admin: false,
  },
  {
    feature_key: "synaptic_matching_enabled",
    feature_name: "Synaptic Matching",
    feature_name_ar: "المطابقة المشبكية",
    description: "AI-powered cell suggestions",
    description_ar: "اقتراحات الخلايا بالذكاء الاصطناعي",
    category: "ai",
    version: "1.2.0",
    is_enabled: false,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "ai_features_enabled",
    feature_name: "AI Features",
    feature_name_ar: "ميزات الذكاء الاصطناعي",
    description: "Enable all AI services",
    description_ar: "تفعيل جميع خدمات الذكاء الاصطناعي",
    category: "ai",
    version: "1.0.0",
    is_enabled: true,
    requires_admin: false,
  },
  {
    feature_key: "content_moderation_enabled",
    feature_name: "Content Moderation",
    feature_name_ar: "فحص المحتوى",
    description: "Auto-check messages before sending",
    description_ar: "فحص الرسائل تلقائياً قبل الإرسال",
    category: "ai",
    version: "1.3.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "semantic_search_enabled",
    feature_name: "Semantic Search",
    feature_name_ar: "البحث الدلالي",
    description: "AI-powered advanced search",
    description_ar: "بحث متقدم بالذكاء الاصطناعي",
    category: "ai",
    version: "1.3.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "push_notifications_enabled",
    feature_name: "Push Notifications",
    feature_name_ar: "الإشعارات الفورية",
    description: "Web push notifications",
    description_ar: "إشعارات الويب الفورية",
    category: "core",
    version: "1.0.0",
    is_enabled: true,
    requires_admin: false,
  },
  {
    feature_key: "animated_backgrounds_enabled",
    feature_name: "Animated Backgrounds",
    feature_name_ar: "الخلفيات المتحركة",
    description: "Neural mesh backgrounds",
    description_ar: "خلفيات الشبكة العصبية",
    category: "ui",
    version: "1.1.0",
    is_enabled: true,
    requires_admin: false,
  },
  {
    feature_key: "arabic_correction_enabled",
    feature_name: "Arabic Correction",
    feature_name_ar: "تصحيح العربية",
    description: "AI grammar checker for Arabic",
    description_ar: "مصحح نحوي ذكي للعربية",
    category: "ai",
    version: "1.4.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "auto_translation_enabled",
    feature_name: "Auto Translation",
    feature_name_ar: "الترجمة التلقائية",
    description: "AI message translation",
    description_ar: "ترجمة الرسائل بالذكاء الاصطناعي",
    category: "ai",
    version: "1.4.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "message_classification_enabled",
    feature_name: "Message Classification",
    feature_name_ar: "تصنيف الرسائل",
    description: "Auto-classify and extract tasks",
    description_ar: "تصنيف واستخراج المهام تلقائياً",
    category: "ai",
    version: "1.4.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "discussion_quality_enabled",
    feature_name: "Discussion Quality",
    feature_name_ar: "جودة النقاش",
    description: "AI assessment of conversation quality",
    description_ar: "تقييم جودة المحادثات بالذكاء الاصطناعي",
    category: "ai",
    version: "1.4.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "smart_recommendations_enabled",
    feature_name: "Smart Recommendations",
    feature_name_ar: "التوصيات الذكية",
    description: "AI content recommendations",
    description_ar: "توصيات المحتوى الذكية",
    category: "ai",
    version: "1.4.0",
    is_enabled: true,
    requires_admin: false,
    dependencies: ["ai_features_enabled"],
  },
  {
    feature_key: "cell_metrics_enabled",
    feature_name: "Cell Metrics",
    feature_name_ar: "مقاييس الخلايا",
    description: "Show cell analytics",
    description_ar: "عرض تحليلات الخلايا",
    category: "core",
    version: "1.0.0",
    is_enabled: false,
    requires_admin: false,
  },
]

export async function getAllFeatures(): Promise<Feature[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("feature_registry")
    .select("*")
    .order("category", { ascending: true })
    .order("feature_name", { ascending: true })

  if (error) {
    console.error("[Feature Registry] Error fetching features:", error)
    return []
  }

  return data || []
}

export async function syncFeatures(): Promise<{ added: number; updated: number }> {
  const supabase = await createClient()
  let added = 0
  let updated = 0

  for (const feature of FEATURE_DEFINITIONS) {
    // محاولة جلب الميزة من قاعدة البيانات
    const { data: existing } = await supabase
      .from("feature_registry")
      .select("*")
      .eq("feature_key", feature.feature_key)
      .single()

    if (!existing) {
      // إضافة ميزة جديدة
      const { error } = await supabase.from("feature_registry").insert(feature)

      if (!error) {
        added++
        console.log(`[Feature Registry] Added new feature: ${feature.feature_key}`)
      }
    } else {
      // تحديث الوصف والإصدار إذا تغير
      if (existing.version !== feature.version || existing.description !== feature.description) {
        const { error } = await supabase
          .from("feature_registry")
          .update({
            version: feature.version,
            description: feature.description,
            description_ar: feature.description_ar,
          })
          .eq("feature_key", feature.feature_key)

        if (!error) {
          updated++
          console.log(`[Feature Registry] Updated feature: ${feature.feature_key}`)
        }
      }
    }
  }

  return { added, updated }
}

export async function updateFeatureStatus(featureKey: string, isEnabled: boolean): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("feature_registry")
    .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
    .eq("feature_key", featureKey)

  if (error) {
    console.error(`[Feature Registry] Error updating ${featureKey}:`, error)
    return false
  }

  // تحديث في system_settings أيضاً للتوافق مع النظام القديم
  await supabase.from("system_settings").upsert({
    key: featureKey,
    value: { value: isEnabled },
    description: `Auto-synced from feature registry`,
    updated_at: new Date().toISOString(),
  })

  return true
}
