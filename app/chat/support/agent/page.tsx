import { SupportAgentChat } from "@/components/support/support-agent-chat"

export default function SupportAgentPage() {
  return (
    // This ensures the page fits within the iframe container
    <div className="h-full w-full overflow-hidden bg-background">
      <SupportAgentChat />
    </div>
  )
}
