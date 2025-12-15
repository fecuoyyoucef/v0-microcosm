import { createClient } from "@/lib/supabase/server"

export async function checkFeatureServer(featureKey: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase.from("feature_flags").select("is_enabled").eq("feature_key", featureKey).single()

  return data?.is_enabled ?? false
}
