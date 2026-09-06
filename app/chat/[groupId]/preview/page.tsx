import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { CellPreviewContent } from "@/components/groups/cell-preview-content"

export default async function CellPreviewPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // جلب بيانات الخلية
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, avatar_url, cell_category, goal, max_members, created_at")
    .eq("id", groupId)
    .maybeSingle()

  if (!group) {
    notFound()
  }

  // هل المستخدم عضو بالفعل؟
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membership) {
    redirect(`/chat/${groupId}`)
  }

  // عدد الأعضاء
  const { count: memberCount } = await supabase
    .from("group_members")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId)

  // هل أكمل المستخدم استبيانه؟
  const { data: survey } = await supabase
    .from("user_surveys")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  return (
    <div className="flex-1 overflow-auto">
      <CellPreviewContent
        userId={user.id}
        hasSurvey={!!survey}
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          avatarUrl: group.avatar_url,
          cellCategory: group.cell_category,
          goal: group.goal,
          maxMembers: group.max_members,
          memberCount: memberCount || 0,
        }}
      />
    </div>
  )
}
