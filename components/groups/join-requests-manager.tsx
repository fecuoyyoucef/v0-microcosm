"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Check, X } from "lucide-react"

interface JoinRequest {
  id: string
  user_id: string
  group_id: string
  status: string
  created_at: string
  profiles: {
    id: string
    display_name: string
    avatar_url: string | null
    bio: string | null
  }
}

interface JoinRequestsManagerProps {
  groupId: string
  initialRequests: JoinRequest[]
}

export function JoinRequestsManager({ groupId, initialRequests }: JoinRequestsManagerProps) {
  const [requests, setRequests] = useState<JoinRequest[]>(initialRequests)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleApprove = async (requestId: string, userId: string) => {
    setProcessingId(requestId)
    try {
      const response = await fetch("/api/groups/approve-join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, groupId, userId }),
      })

      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        alert("تم قبول الطلب بنجاح!")
      } else {
        alert("فشل في قبول الطلب")
      }
    } catch (error) {
      console.error("Approval error:", error)
      alert("حدث خطأ في معالجة الطلب")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const response = await fetch("/api/groups/reject-join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })

      if (response.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        alert("تم رفض الطلب")
      } else {
        alert("فشل في رفض الطلب")
      }
    } catch (error) {
      console.error("Rejection error:", error)
      alert("حدث خطأ في معالجة الطلب")
    } finally {
      setProcessingId(null)
    }
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">لا توجد طلبات انضمام معلقة حالياً</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={request.profiles.avatar_url || ""} alt={request.profiles.display_name} />
                <AvatarFallback>{request.profiles.display_name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="font-medium">{request.profiles.display_name}</p>
                <p className="text-sm text-muted-foreground">{request.profiles.bio || "لا توجد سيرة ذاتية"}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  تقدم بالطلب: {new Date(request.created_at).toLocaleDateString("ar-EG")}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(request.id, request.user_id)}
                  disabled={processingId === request.id}
                  className="gap-2"
                >
                  {processingId === request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  قبول
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  className="gap-2"
                >
                  {processingId === request.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  رفض
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
