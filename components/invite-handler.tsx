"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Group } from "@/lib/types"

interface InviteHandlerProps {
  group: Group
  isLoggedIn: boolean
}

export function InviteHandler({ group, isLoggedIn }: InviteHandlerProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleJoin = async () => {
    setIsJoining(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/auth/login?redirect=/invite/${group.id}`)
        return
      }

      // التحقق من عدد الأعضاء
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id)

      if (count && count >= group.max_members) {
        setError("المجموعة ممتلئة")
        return
      }

      // الانضمام للمجموعة
      const { error: joinError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        role: "member",
      })

      if (joinError) {
        if (joinError.code === "23505") {
          // المستخدم عضو بالفعل
          router.push(`/chat/${group.id}`)
          return
        }
        throw joinError
      }

      router.push(`/chat/${group.id}`)
    } catch (err) {
      setError("حدث خطأ في الانضمام")
      console.error(err)
    } finally {
      setIsJoining(false)
    }
  }

  const getInviteRedirectUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/invite/${group.id}`
    }
    return `/invite/${group.id}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden">
              <Image
                src="/icons/app-logo.jpg"
                alt="Synaptic Space"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">دعوة للانضمام</CardTitle>
            <CardDescription>لقد تمت دعوتك للانضمام إلى مجموعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-secondary text-center">
              <p className="text-xl font-bold">{group.name}</p>
              {group.description && <p className="text-sm text-muted-foreground mt-2">{group.description}</p>}
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg text-center">{error}</p>}

            {isLoggedIn ? (
              <Button onClick={handleJoin} disabled={isJoining} className="w-full">
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الانضمام...
                  </>
                ) : (
                  "انضم للمجموعة"
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Link href={`/auth/login?redirect=${encodeURIComponent(getInviteRedirectUrl())}`}>
                  <Button className="w-full">تسجيل الدخول للانضمام</Button>
                </Link>
                <Link href={`/auth/sign-up?redirect=${encodeURIComponent(getInviteRedirectUrl())}`}>
                  <Button variant="outline" className="w-full bg-transparent">
                    إنشاء حساب جديد
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
