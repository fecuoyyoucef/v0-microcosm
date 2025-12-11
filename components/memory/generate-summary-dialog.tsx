"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Sparkles, CheckCircle } from "lucide-react"
import { format, subDays } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface GenerateSummaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
}

export function GenerateSummaryDialog({ open, onOpenChange, groupId }: GenerateSummaryDialogProps) {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1))
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          date: format(date, "yyyy-MM-dd"),
        }),
      })

      if (!response.ok) {
        throw new Error("فشل في إنشاء الملخص")
      }

      setIsComplete(true)
      setTimeout(() => {
        onOpenChange(false)
        setIsComplete(false)
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            إنشاء ملخص ذكي
          </DialogTitle>
          <DialogDescription>سيقوم الذكاء الاصطناعي بتحليل محادثات اليوم المحدد وإنشاء ملخص شامل</DialogDescription>
        </DialogHeader>

        {isComplete ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <p className="font-medium">تم إنشاء الملخص بنجاح!</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>اختر التاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-right bg-transparent")}>
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(date, "EEEE d MMMM yyyy", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(d) => d > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium mb-2">ماذا سيتضمن الملخص؟</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>- القرارات المتخذة</li>
                <li>- الأفكار الرئيسية</li>
                <li>- المواضيع المطروحة</li>
                <li>- الروابط المشاركة</li>
                <li>- النقاط المعلقة</li>
                <li>- أبرز المساهمين</li>
              </ul>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري التحليل والإنشاء...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  إنشاء الملخص
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
