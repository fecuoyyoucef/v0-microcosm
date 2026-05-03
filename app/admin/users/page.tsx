"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Mail, Calendar, RefreshCw } from "lucide-react"

interface User {
  id: string
  display_name: string
  username: string
  email: string
  avatar_url: string | null
  created_at: string
  total_points: number
  responsibility_score: number
  groups_count?: number
  messages_count?: number
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [updatingScores, setUpdatingScores] = useState(false)
  const [scoreUpdateMessage, setScoreUpdateMessage] = useState("")

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed to fetch users")
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Users error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchUsers()
    setRefreshing(false)
  }

  const handleUpdateResponsibilityScores = async () => {
    setUpdatingScores(true)
    setScoreUpdateMessage("جاري حساب معايير المسؤولية...")
    try {
      const res = await fetch("/api/cron/update-responsibility", {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("فشل تحديث المعايير")
      }

      const data = await res.json()
      setScoreUpdateMessage("✅ تم تحديث معايير المسؤولية بنجاح")

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await fetchUsers()
    } catch (error) {
      console.error("Score update error:", error)
      setScoreUpdateMessage("❌ خطأ في تحديث المعايير")
    } finally {
      setUpdatingScores(false)
      setTimeout(() => setScoreUpdateMessage(""), 3000)
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المستخدمين</h1>
          <p className="text-slate-400">{users.length} مستخدم مسجل</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateResponsibilityScores}
            disabled={updatingScores}
            className="gap-2 bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
            title="حساب معايير المسؤولية لجميع المستخدمين والخلايا"
          >
            <RefreshCw className={`w-4 h-4 ${updatingScores ? "animate-spin" : ""}`} />
            حساب المسؤولية
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Score Update Message */}
      {scoreUpdateMessage && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm">
          {scoreUpdateMessage}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو البريد..."
          className="pr-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Users List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-y-auto overflow-x-auto h-[calc(100vh-280px)]">
            <div className="min-w-[600px] divide-y divide-slate-800">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-blue-500/20 text-blue-400">
                        {user.display_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{user.display_name || "مستخدم"}</h3>
                        {user.username && <span className="text-sm text-slate-400">@{user.username}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(user.created_at).toLocaleDateString("ar-SA")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 pl-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 whitespace-nowrap">
                        {user.total_points || 0} نقطة
                      </Badge>
                      <Badge variant="outline" className="border-blue-500/50 text-blue-400 whitespace-nowrap">
                        {user.responsibility_score || 0}% مسؤولية
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem className="text-white hover:bg-slate-700">عرض الملف الشخصي</DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-slate-700">إرسال إشعار</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">تعليق الحساب</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
