import { systemMonitor } from "@/lib/ai-agents/monitoring"

export async function POST(request: Request) {
  const newMessage = await request.json() // Assuming newMessage is obtained from the request body

  if (newMessage) {
    // Run monitoring in background
    systemMonitor.monitorMessage(newMessage.id).catch(console.error)
  }
}
