"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RefreshCw, Search, Layers, Sparkles, Settings2, Beaker, Shield, Check, X, Wifi, WifiOff } from "lucide-react"
import { toast } from "react-toastify"
import { useAdminFeatureFlags } from "@/hooks/use-feature-flags"

const categoryConfig = {
  ai: { label: "الذكاء الاصطناعي", icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/10" },
  core: { label: "الميزات الأساسية", icon: Settings2, color: "text-blue-400", bg: "bg-blue-500/10" },
  ui: { label: "واجهة المستخدم", icon: Layers, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  experimental: { label: "تجريبية", icon: Beaker, color: "text-amber-400", bg: "bg-amber-500/10" },
  admin: { label: "إدارية", icon: Shield, color: "text-rose-400", bg: "bg-rose-500/10" },
}

export default function FeaturesPage() {
  const router = useRouter()
  const { flags, loading, updating, stats, toggleFlag, syncFlags } = useAdminFeatureFlags()
  const [syncing, setSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [isRealtime, setIsRealtime] = useState(true)

  const handleSync = async () => {
    setSyncing(true)
    try {
      // استخدام POST للمزامنة مع route sync
      const res = await fetch("/api/admin/features/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")
      const result = await res.json()
      toast.success(`تمت المزامنة: ${result.added} جديدة، ${result.updated} محدثة`)
      // تحديث القائمة بعد المزامنة
      window.location.reload()
    } catch {
      toast.error("فشلت المزامنة")
    } finally {
      setSyncing(false)
    }
  }

  const handleToggle = async (featureKey: string, currentValue: boolean) => {
    const success = await toggleFlag(featureKey, currentValue)
    if (success) {
      toast.success(!currentValue ? "تم تفعيل الميزة" : "تم تعطيل الميزة")
    } else {
      toast.error("فشل تحديث الميزة")
    }
  }

  const filteredFeatures = flags.filter((f) => {
    const matchesSearch =
      f.feature_name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description_ar?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = activeCategory === "all" || f.category === activeCategory

    return matchesSearch && matchesCategory
  })

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            إدارة الميزات
            {isRealtime ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 gap-1">
                <Wifi className="w-3 h-3" />
                مباشر
              </Badge>
            ) : (
              <Badge className="bg-slate-500/20 text-slate-400 border-0 gap-1">
                <WifiOff className="w-3 h-3" />
                غير متصل
              </Badge>
            )}
          </h1>
          <p className="text-slate-400">
            {stats.enabled} من {stats.total} ميزة مفعلة
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white">
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          مزامنة الميزات
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(categoryConfig).map(([key, config]) => {
          const categoryFlags = stats.byCategory[key as keyof typeof stats.byCategory] || []
          const count = categoryFlags.length
          const enabled = categoryFlags.filter((f) => f.is_enabled).length
          return (
            <Card
              key={key}
              className={`bg-slate-900/50 border-slate-800 cursor-pointer transition-colors ${activeCategory === key ? "ring-2 ring-cyan-500" : ""}`}
              onClick={() => setActiveCategory(activeCategory === key ? "all" : key)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center`}>
                    <config.icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{config.label}</p>
                    <p className="text-lg font-bold text-white">
                      {enabled}/{count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث في الميزات..."
          className="pr-10 bg-slate-900/50 border-slate-800 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Features List */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y divide-slate-800">
              {filteredFeatures.map((feature) => {
                const config = categoryConfig[feature.category as keyof typeof categoryConfig]
                const isUpdating = updating === feature.feature_key
                return (
                  <div
                    key={feature.id}
                    className={`flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors ${isUpdating ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                        <config.icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{feature.feature_name_ar}</h3>
                          <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">
                            v{feature.version}
                          </Badge>
                          {feature.requires_admin && (
                            <Badge className="text-xs bg-rose-500/20 text-rose-400 border-0">مالك فقط</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-1">{feature.description_ar}</p>
                        {feature.dependencies && feature.dependencies.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">يعتمد على: {feature.dependencies.join("، ")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {feature.is_enabled ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            مفعل
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            معطل
                          </span>
                        )}
                      </div>
                      <Switch
                        checked={feature.is_enabled}
                        onCheckedChange={() => handleToggle(feature.feature_key, feature.is_enabled)}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
