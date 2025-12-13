export type SystemSettingKey =
  | "cell_classification_enabled"
  | "cell_metrics_enabled"
  | "ai_features_enabled"
  | "max_group_members"
  | "maintenance_mode"

export async function getSystemSetting(key: SystemSettingKey): Promise<any> {
  try {
    const response = await fetch(`/api/admin/system-settings?key=${key}`)
    if (!response.ok) {
      return getDefaultValue(key)
    }
    const data = await response.json()
    return data.value
  } catch {
    return getDefaultValue(key)
  }
}

export async function getAllSystemSettings(): Promise<Record<string, any>> {
  try {
    const response = await fetch("/api/admin/system-settings")
    if (!response.ok) {
      return {}
    }
    const data = await response.json()
    return data.settings || {}
  } catch {
    return {}
  }
}

export async function setSystemSetting(key: SystemSettingKey, value: any): Promise<boolean> {
  try {
    const response = await fetch("/api/admin/system-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, value }),
    })
    return response.ok
  } catch {
    return false
  }
}

function getDefaultValue(key: SystemSettingKey): any {
  const defaults: Record<SystemSettingKey, any> = {
    cell_classification_enabled: false,
    cell_metrics_enabled: false,
    ai_features_enabled: true,
    max_group_members: 100,
    maintenance_mode: false,
  }
  return defaults[key]
}

export function useSystemSettingValue(settings: Record<string, any>, key: SystemSettingKey): boolean {
  return settings[key]?.value === true
}
