"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">لا يوجد اتصال بالإنترنت</h1>
          <p className="text-muted-foreground">يبدو أنك غير متصل بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.</p>
        </div>

        <Button onClick={() => window.location.reload()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </Button>

        <p className="text-xs text-muted-foreground">Synaptic Space - تطبيق المحادثة الذكي</p>
      </div>
    </div>
  )
}
