import { monitorNewMessage } from "@/lib/agents/monitor"

export async function POST(request: Request) {
  const newMessage = await request.json()

  if (newMessage?.id) {
    // Fire and forget — the runtime handles its own errors.
    void monitorNewMessage(newMessage.id)
  }

  return new Response(null, { status: 204 })
}
