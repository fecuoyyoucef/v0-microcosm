import { monitorNewTicket } from "@/lib/agents/monitor"

export async function POST(request: Request) {
  const ticket = await request.json()

  if (ticket?.id) {
    void monitorNewTicket(ticket.id)
  }

  return new Response(null, { status: 204 })
}
