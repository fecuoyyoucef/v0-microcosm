import Image from "next/image"
import { FileText, Download } from "lucide-react" // Assuming these are the icons used

const MessageItem = ({ message, currentUserId }) => {
  // Ensure message and currentUserId are declared or imported properly

  return (
    <div>
      {/* ... existing code ... */}

      {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
        <div className={`mt-2 space-y-2 ${message.sender_id === currentUserId ? "items-end" : "items-start"}`}>
          {message.attachments.map((attachment: any, index: number) => (
            <div key={index}>
              {attachment.type === "image" ? (
                <div className="relative rounded-lg overflow-hidden max-w-sm">
                  <Image
                    src={attachment.url || "/placeholder.svg"}
                    alt={attachment.name || "صورة"}
                    width={400}
                    height={300}
                    className="rounded-lg object-cover"
                  />
                </div>
              ) : (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted hover:bg-accent transition-colors"
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Download className="w-4 h-4 shrink-0" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ... existing code ... */}
    </div>
  )
}

export default MessageItem
