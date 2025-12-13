import { createClient } from "@/lib/supabase/server"

export type SystemSettingKey =
  | "cell_classification_enabled"
  | "cell_metrics_enabled"
  | "ai_features_enabled"
  | "max_group_members"
  | "maintenance_mode"

// Cache للإعدادات (تُحدّث كل 5 دقائق)
const settingsCache: { [key: string]: { value: any; timestamp: number } } = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getSystemSetting(key: SystemSettingKey): Promise<any> {
  // تحقق من الـ cache
  const cached = settingsCache[key]
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("system_settings").select("value").eq("key", key).single()

    if (error || !data) {
      // قيم افتراضية
      const defaults: Record<SystemSettingKey, any> = {
        cell_classification_enabled: false,
        cell_metrics_enabled: false,
        ai_features_enabled: true,
        max_group_members: 100,
        maintenance_mode: false,
      }
      return defaults[key]
    }

    const value =
      typeof data.value === "string"
        ? data.value === "true"
          ? true
          : data.value === "false"
            ? false
            : data.value
        : data.value

    // حفظ في الـ cache
    settingsCache[key] = { value, timestamp: Date.now() }

    return value
  } catch {
    const defaults: Record<SystemSettingKey, any> = {
      cell_classification_enabled: false,
      cell_metrics_enabled: false,
      ai_features_enabled: true,
      max_group_members: 100,
      maintenance_mode: false,
    }
    return defaults[key]
  }
}

export async function setSystemSetting(key: SystemSettingKey, value: any, adminId?: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("system_settings").upsert(
      {
        key,
        value: value, // تخزين مباشر
        updated_by: adminId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    )

    if (!error) {
      // تحديث الـ cache
      settingsCache[key] = { value, timestamp: Date.now() }
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function getAllSystemSettings(): Promise<Record<string, any>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("system_settings").select("key, value, description, updated_at")

    if (error || !data) return {}

    const settings: Record<string, any> = {}
    data.forEach((item) => {
      const value =
        typeof item.value === "string"
          ? item.value === "true"
            ? true
            : item.value === "false"
              ? false
              : item.value
          : item.value
      settings[item.key] = {
        value,
        description: item.description,
        updated_at: item.updated_at,
      }
    })

    return settings
  } catch {
    return {}
  }
}
