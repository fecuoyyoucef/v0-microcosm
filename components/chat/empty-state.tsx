"use client"

import { useState } from "react"
import { MessageSquareText, Users, Link2, Plus } from "lucide-react"
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
      <div className="text-center max-w-sm">
        {/* Brand icon block */}
        <div className="relative w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 shadow-synaptic-glow">
          <MessageSquareText className="w-9 h-9 text-primary" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent ring-4 ring-background" />
        </div>

        <h2 className="text-2xl font-bold mb-2 tracking-tight">ابدأ خليتك الأولى</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          أنشئ خلية جديدة لك ولأصدقائك، أو انضم إلى خلية موجودة عبر رابط دعوة.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Button className="w-full sm:w-auto h-11 rounded-xl gap-2 shadow-synaptic-glow">
            <Plus className="w-4 h-4" />
            خلية جديدة
          </Button>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto h-11 rounded-xl gap-2">
                <Users className="w-4 h-4" />
                انضم بدعوة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>الانضمام بدعوة</DialogTitle>
                <DialogDescription>أدخل رابط الدعوة الذي حصلت عليه من صديقك</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="inviteLink">رابط الدعوة</Label>
                  <Input
                    id="inviteLink"
                    value={inviteLink}
                    onChange={(e) => setInviteLink(e.target.value)}
                    placeholder="https://..."
                    className="bg-background rounded-xl"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">الصق رابط الدعوة كاملاً هنا</p>
                </div>
                <Button onClick={handleJoinWithLink} className="w-full h-11 rounded-xl gap-2">
                  <Link2 className="w-4 h-4" />
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
