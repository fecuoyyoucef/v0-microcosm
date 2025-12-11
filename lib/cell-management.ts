import { createClient } from "@/lib/supabase/client"
import type { Group, GroupSupervisor, GroupJoinRequest } from "@/lib/types"

// Constants for cell limits
export const PRIMARY_CELL_LIMIT = 15
export const SECONDARY_CELL_LIMIT = 20

/**
 * Check if a cell is full
 */
export async function isCellFull(
  groupId: string,
): Promise<{ isFull: boolean; currentCount: number; maxMembers: number }> {
  const supabase = createClient()

  const { data: group } = await supabase.from("groups").select("max_members, group_type").eq("id", groupId).single()

  const { count } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)

  const maxMembers =
    group?.max_members || (group?.group_type === "secondary" ? SECONDARY_CELL_LIMIT : PRIMARY_CELL_LIMIT)

  return {
    isFull: (count || 0) >= maxMembers,
    currentCount: count || 0,
    maxMembers,
  }
}

/**
 * Get available secondary cells for a primary cell
 */
export async function getAvailableSecondaryCells(primaryGroupId: string): Promise<Group[]> {
  const supabase = createClient()

  const { data: secondaryCells } = await supabase
    .from("groups")
    .select("*, group_members(count)")
    .eq("parent_group_id", primaryGroupId)
    .eq("group_type", "secondary")

  if (!secondaryCells) return []

  // Filter cells that are not full
  const availableCells: Group[] = []
  for (const cell of secondaryCells) {
    const memberCount = (cell as any).group_members?.[0]?.count || 0
    if (memberCount < (cell.max_members || SECONDARY_CELL_LIMIT)) {
      availableCells.push({
        ...cell,
        member_count: memberCount,
      })
    }
  }

  return availableCells
}

/**
 * Create a secondary cell from a primary cell
 */
export async function createSecondaryCell(
  primaryGroupId: string,
  name: string,
  supervisorId: string,
  createdBy: string,
): Promise<{ success: boolean; group?: Group; error?: string }> {
  const supabase = createClient()

  // Verify user is admin of primary cell
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", primaryGroupId)
    .eq("user_id", createdBy)
    .single()

  if (!membership || membership.role !== "admin") {
    return { success: false, error: "Only primary cell admin can create secondary cells" }
  }

  // Get primary cell info
  const { data: primaryCell } = await supabase.from("groups").select("*").eq("id", primaryGroupId).single()

  if (!primaryCell || primaryCell.group_type !== "primary") {
    return { success: false, error: "Invalid primary cell" }
  }

  // Create secondary cell
  const { data: newCell, error: createError } = await supabase
    .from("groups")
    .insert({
      name: name || `${primaryCell.name} - فرعية`,
      description: `خلية فرعية من ${primaryCell.name}`,
      parent_group_id: primaryGroupId,
      group_type: "secondary",
      max_members: SECONDARY_CELL_LIMIT,
      created_by: createdBy,
      settings: primaryCell.settings,
    })
    .select()
    .single()

  if (createError) {
    return { success: false, error: createError.message }
  }

  // Add supervisor as member with admin role
  await supabase.from("group_members").insert({
    group_id: newCell.id,
    user_id: supervisorId,
    role: "admin",
  })

  // Add to supervisors table
  await supabase.from("group_supervisors").insert({
    group_id: newCell.id,
    user_id: supervisorId,
    assigned_by: createdBy,
    permissions: {
      can_delete_messages: true,
      can_remove_members: true,
      can_edit_settings: false,
    },
  })

  // Notify the supervisor
  await supabase.from("notifications").insert({
    user_id: supervisorId,
    type: "secondary_created",
    title: "تم تعيينك مشرفاً",
    body: `تم تعيينك كمشرف على الخلية الفرعية "${newCell.name}"`,
    group_id: newCell.id,
    sender_id: createdBy,
    data: { primary_group_id: primaryGroupId },
  })

  return { success: true, group: newCell }
}

/**
 * Handle join request when cell is full
 */
export async function handleJoinRequest(
  groupId: string,
  userId: string,
): Promise<{ success: boolean; action: "joined" | "requested" | "redirected"; redirectedTo?: string; error?: string }> {
  const supabase = createClient()

  const { isFull, currentCount, maxMembers } = await isCellFull(groupId)

  // Get group info
  const { data: group } = await supabase.from("groups").select("*, parent_group_id").eq("id", groupId).single()

  if (!group) {
    return { success: false, action: "requested", error: "Cell not found" }
  }

  // If not full, join directly
  if (!isFull) {
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: userId,
      role: "member",
    })

    if (error) {
      return { success: false, action: "requested", error: error.message }
    }

    return { success: true, action: "joined" }
  }

  // Cell is full - check for available secondary cells
  const primaryId = group.group_type === "primary" ? groupId : group.parent_group_id

  if (primaryId) {
    const availableCells = await getAvailableSecondaryCells(primaryId)

    if (availableCells.length > 0) {
      // Redirect to first available secondary cell
      const targetCell = availableCells[0]

      const { error } = await supabase.from("group_members").insert({
        group_id: targetCell.id,
        user_id: userId,
        role: "member",
      })

      if (!error) {
        // Create join request record for tracking
        await supabase.from("group_join_requests").insert({
          group_id: groupId,
          user_id: userId,
          status: "redirected",
          redirected_to: targetCell.id,
          processed_at: new Date().toISOString(),
        })

        return { success: true, action: "redirected", redirectedTo: targetCell.id }
      }
    }
  }

  // No available cells - create pending request
  const { error } = await supabase.from("group_join_requests").insert({
    group_id: groupId,
    user_id: userId,
    status: "pending",
  })

  if (error) {
    return { success: false, action: "requested", error: error.message }
  }

  // Notify admin
  const { data: admin } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group.group_type === "primary" ? groupId : group.parent_group_id!)
    .eq("role", "admin")
    .single()

  if (admin) {
    const { data: userProfile } = await supabase.from("profiles").select("display_name").eq("id", userId).single()

    await supabase.from("notifications").insert({
      user_id: admin.user_id,
      type: "join_request",
      title: "طلب انضمام جديد",
      body: `${userProfile?.display_name || "مستخدم"} يريد الانضمام إلى "${group.name}" (الخلية ممتلئة)`,
      group_id: groupId,
      sender_id: userId,
      data: { request_type: "overflow" },
    })
  }

  return { success: true, action: "requested" }
}

/**
 * Get all cells in a hierarchy (primary + all secondary)
 */
export async function getCellHierarchy(primaryGroupId: string): Promise<{
  primary: Group | null
  secondary: Group[]
  totalMembers: number
}> {
  const supabase = createClient()

  // Get primary cell
  const { data: primary } = await supabase
    .from("groups")
    .select("*")
    .eq("id", primaryGroupId)
    .eq("group_type", "primary")
    .single()

  if (!primary) {
    return { primary: null, secondary: [], totalMembers: 0 }
  }

  // Get secondary cells
  const { data: secondary } = await supabase
    .from("groups")
    .select("*")
    .eq("parent_group_id", primaryGroupId)
    .eq("group_type", "secondary")

  // Count total members
  const { count: primaryCount } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", primaryGroupId)

  let totalMembers = primaryCount || 0

  if (secondary) {
    for (const cell of secondary) {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", cell.id)
      totalMembers += count || 0
    }
  }

  return {
    primary,
    secondary: secondary || [],
    totalMembers,
  }
}

/**
 * Get supervisors for a cell
 */
export async function getCellSupervisors(groupId: string): Promise<GroupSupervisor[]> {
  const supabase = createClient()

  const { data: supervisors } = await supabase.from("group_supervisors").select("*").eq("group_id", groupId)

  if (!supervisors) return []

  // Get profiles
  const userIds = supervisors.map((s) => s.user_id)
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds)

  return supervisors.map((s) => ({
    ...s,
    profile: profiles?.find((p) => p.id === s.user_id) || null,
  }))
}

/**
 * Get pending join requests for a cell
 */
export async function getPendingJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
  const supabase = createClient()

  const { data: requests } = await supabase
    .from("group_join_requests")
    .select("*")
    .eq("group_id", groupId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (!requests) return []

  // Get profiles
  const userIds = requests.map((r) => r.user_id)
  const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds)

  return requests.map((r) => ({
    ...r,
    profile: profiles?.find((p) => p.id === r.user_id) || null,
  }))
}
