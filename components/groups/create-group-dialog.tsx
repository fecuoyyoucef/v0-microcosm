async function handleCreateGroup(groupData: any) {
  try {
    await fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityType: "group_created",
        metadata: { group_name: groupData.name },
      }),
    })
  } catch (error) {
    console.error("[v0] Failed to track group creation:", error)
  }
}
