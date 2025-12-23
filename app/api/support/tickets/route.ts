import { systemMonitor } from "@/lib/ai-agents/monitoring"

export async function POST(request: Request) {
  const ticket = await request.json() // Declare the ticket variable

  if (ticket && ticket.category === "report") {
    systemMonitor.monitorReport(ticket.id).catch(console.error)
  }
}
