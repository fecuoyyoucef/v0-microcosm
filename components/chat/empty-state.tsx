"use client"

import { useState } from "react"
import { MessageSquare, Users, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"

export function EmptyState() {
  const [isOpen, setIsOpen] = useState(false)
  const [inviteLink, setInviteLink] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleJoinWithLink = () => {
    setError(null)

    if (!inviteLink.trim()) {
      setError("الرجاء إدخال رابط الدعوة")
      return
    }

    try {
      // Extract group ID from invite link
      const url = new URL(inviteLink.trim())
      const pathParts = url.pathname.split("/")
      const inviteIndex = pathParts.indexOf("invite")

      if (inviteIndex !== -1 && pathParts[inviteIndex + 1]) {
        const groupId = pathParts[inviteIndex + 1]
        setIsOpen(false)
        router.push(`/invite/${groupId}`)
      } else {
        setError("رابط الدعوة غير صالح")
      }
    } catch {
      // If not a valid URL, try treating it as just the group ID
      if (inviteLink.trim().match(/^[0-9a-f-]{36}$/i)) {
        setIsOpen(false)
        router.push(`/invite/${inviteLink.trim()}`)
      } else {
        setError("رابط الدعوة غير صالح")
      }
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-3">مرحباً بك في محادثات</h2>
        <p className="text-muted-foreground mb-6">
          ابدأ بإنشاء مجموعة جديدة من القائمة الجانبية أو انتظر دعوة من صديق للانضمام لمجموعة موجودة.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="w-4 h-4 ml-2" />
                انضم بدعوة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>الانضمام بدعوة</DialogTitle>
                <DialogDescription>أدخل رابط الدعوة الذي حصلت عليه من صديقك</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
                <div className="space-y-2">
                  <Label htmlFor="inviteLink">رابط الدعوة</Label>
                  <div className="flex gap-2">
                    <Input
                      id="inviteLink"
                      value={inviteLink}
                      onChange={(e) => setInviteLink(e.target.value)}
                      placeholder="https://example.com/invite/..."
                      className="bg-background"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">الصق رابط الدعوة كاملاً هنا</p>
                </div>
                <Button onClick={handleJoinWithLink} className="w-full">
                  <Link2 className="w-4 h-4 ml-2" />
                  انضم الآن
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
