import { CustomerSupportChat } from "@/components/support/customer-support-chat"

export default function SupportAgentPage() {
  return (
    <html style={{ height: "100%", margin: 0, padding: 0 }}>
      <body style={{ height: "100%", margin: 0, padding: 0, overflow: "hidden" }}>
        <CustomerSupportChat />
      </body>
    </html>
  )
}
