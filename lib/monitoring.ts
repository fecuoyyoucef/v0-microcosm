// نظام مراقبة الاستخدام لفترة التجريب

export async function logMonitoringEvent(
  eventType: string,
  eventData: Record<string, any>,
  groupId?: string,
  metadata?: Record<string, any>,
) {
  try {
    await fetch("/api/monitoring/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        event_data: eventData,
        group_id: groupId,
        metadata,
      }),
    })
  } catch (error) {
    console.error("Monitoring error:", error)
  }
}

// أمثلة للاستخدام:
// logMonitoringEvent('page_view', { page: '/chat' })
// logMonitoringEvent('feature_used', { feature: 'semantic_search', success: true })
// logMonitoringEvent('error', { error: 'Failed to send message', stack: error.stack })
// logMonitoringEvent('performance', { action: 'load_messages', duration: 1250 })
