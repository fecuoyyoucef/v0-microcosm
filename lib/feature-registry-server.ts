import { createClient } from "@/lib/supabase/server"
import { FEATURE_DEFINITIONS, type Feature } from "./feature-registry"

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
    const { data: existing } = await supabase
      .from("feature_registry")
      .select("*")
      .eq("feature_key", feature.feature_key)
      .single()

    if (!existing) {
      const { error } = await supabase.from("feature_registry").insert(feature)

      if (!error) {
        added++
        console.log(`[Feature Registry] Added new feature: ${feature.feature_key}`)
      }
    } else {
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
  const timestamp = new Date().toISOString()

  // 1. تحديث feature_registry (المصدر الرئيسي)
  const { error } = await supabase
    .from("feature_registry")
    .update({ is_enabled: isEnabled, updated_at: timestamp })
    .eq("feature_key", featureKey)

  if (error) {
    console.error(`[Feature Registry] Error updating ${featureKey}:`, error)
    return false
  }

  // 2. مزامنة مع feature_flags (الجدول الذي يقرأه التطبيق + Realtime)
  const { error: flagsError } = await supabase
    .from("feature_flags")
    .upsert({
      feature_key: featureKey,
      is_enabled: isEnabled,
      updated_at: timestamp,
    }, {
      onConflict: "feature_key"
    })

  if (flagsError) {
    console.error(`[Feature Registry] Error syncing to feature_flags:`, flagsError)
    // لا نرجع false لأن التحديث الأساسي نجح
  }

  // 3. مزامنة مع system_settings (للتوافق مع الكود القديم)
  await supabase.from("system_settings").upsert({
    key: featureKey,
    value: { value: isEnabled },
    description: `Auto-synced from feature registry`,
    updated_at: timestamp,
  })

  return true
}
