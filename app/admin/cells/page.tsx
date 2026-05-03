"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Users, MessageSquare, Calendar, RefreshCw, FolderOpen } from "lucide-react"

interface Cell {
  id: string
  name: string
  description: string | null
  avatar_url: string | null
  created_at: string
  members_count: number
  messages_count: number
  created_by_name?: string
}

export default function CellsPage() {
  const router = useRouter()
  const [cells, setCells] = useState<Cell[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchCells()
  }, [])

  const fetchCells = async () => {
    try {
      const res = await fetch("/api/admin/cells")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin/login")
          return
        }
        throw new Error("Failed to fetch cells")
      }
      const data = await res.json()
      setCells(data.cells || [])
    } catch (error) {
      console.error("Cells error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCells()
    setRefreshing(false)
  }

  const filteredCells = cells.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getGroupColor = (name: string) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-emerald-600",
      "from-violet-500 to-violet-600",
      "from-amber-500 to-amber-600",
      "from-rose-500 to-rose-600",
      "from-cyan-500 to-cyan-600",
    ]
    return colors[name.charCodeAt(0) % colors.length]
  }

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
          <h1 className="text-2xl font-bold text-white">الخلايا</h1>
          <p className="text-slate-400">{cells.length} خلية</p>
        </div>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الخلايا..."
          className="pr-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">إجمالي الخلايا</p>
              <p className="text-xl font-bold text-white">{cells.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">إجمالي الأعضاء</p>
              <p className="text-xl font-bold text-white">
                {cells.reduce((sum, c) => sum + (c.members_count || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">إجمالي الرسائل</p>
              <p className="text-xl font-bold text-white">
                {cells.reduce((sum, c) => sum + (c.messages_count || 0), 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cells List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-y-auto overflow-x-auto h-[calc(100vh-380px)]">
            <div className="min-w-[600px] divide-y divide-slate-800">
              {filteredCells.map((cell) => (
                <div
                  key={cell.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${getGroupColor(cell.name)} flex items-center justify-center text-white font-bold`}
                    >
                      {cell.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-white">{cell.name}</h3>
                      <p className="text-sm text-slate-400 line-clamp-1">{cell.description || "بدون وصف"}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(cell.created_at).toLocaleDateString("ar-SA")}
                        </span>
                        {cell.created_by_name && <span>بواسطة {cell.created_by_name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 pl-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-blue-500/50 text-blue-400 whitespace-nowrap">
                        <Users className="w-3 h-3 ml-1" />
                        {cell.members_count || 0}
                      </Badge>
                      <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 whitespace-nowrap">
                        <MessageSquare className="w-3 h-3 ml-1" />
                        {cell.messages_count || 0}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                        <DropdownMenuItem className="text-white hover:bg-slate-700">عرض التفاصيل</DropdownMenuItem>
                        <DropdownMenuItem className="text-white hover:bg-slate-700">إدارة الأعضاء</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 hover:bg-red-500/10">حذف الخلية</DropdownMenuItem>
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
