import { createServiceClient } from "@/lib/supabase/server"

export async function updateUserResponsibility(userId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc("calculate_user_responsibility", {
    user_uuid: userId,
  })

  if (error) {
    console.error("Error calculating user responsibility:", error)
    return null
  }

  // Update the profile
  await supabase.from("profiles").update({ responsibility_score: data }).eq("id", userId)

  return data
}

export async function updateGroupResponsibility(groupId: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc("calculate_group_responsibility", {
    group_uuid: groupId,
  })

  if (error) {
    console.error("Error calculating group responsibility:", error)
    return null
  }

  // Update the group
  await supabase.from("groups").update({ responsibility_score: data }).eq("id", groupId)

  return data
}
