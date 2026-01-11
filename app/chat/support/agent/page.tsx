import { SupportChat } from "@/components/support/support-chat"

export default function SupportAgentPage() {
  return (
    <html style={{ height: "100%", margin: 0, padding: 0 }}>
      <body style={{ height: "100%", margin: 0, padding: 0 }}>
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <SupportChat />
        </div>
      </body>
    </html>
  )
}
