"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { CellCategory } from "@/lib/types"

export function CreateGroupDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  // Form data
  const [cellCategory, setCellCategory] = useState<CellCategory>("discussion")
  const [goal, setGoal] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 1) {
      // Validate first step
      if (!cellCategory || !goal.trim()) {
        return
      }
      setStep(2)
      return
    }

    // Final submission
    if (!name.trim()) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          cell_category: cellCategory,
          goal: goal.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("فشل في إنشاء الخلية")
      }

      const data = await response.json()
      setOpen(false)
      setStep(1)
      setName("")
      setDescription("")
      setCellCategory("discussion")
      setGoal("")
      router.push(`/chat/${data.id}`)
    } catch (error) {
      console.error("Error creating group:", error)
      alert("حدث خطأ أثناء إنشاء الخلية")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleCancel = () => {
    setOpen(false)
    setStep(1)
    setName("")
    setDescription("")
    setCellCategory("discussion")
    setGoal("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="rounded-full h-14 w-14">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle>إنشاء خلية جديدة</DialogTitle>
                <DialogDescription>حدد نوع وهدف الخلية</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label>نوع الخلية</Label>
                  <RadioGroup
                    value={cellCategory}
                    onValueChange={(value) => setCellCategory(value as CellCategory)}
                    className="space-y-3"
                  >
                    <div className="flex items-start space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="project" id="project" className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="project" className="font-semibold cursor-pointer">
                          خلية مشروع
                        </Label>
                        <p className="text-sm text-muted-foreground">للعمل على مشروع محدد بأهداف واضحة وقابلة للقياس</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2 space-x-reverse border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="discussion" id="discussion" className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="discussion" className="font-semibold cursor-pointer">
                          خلية حوار
                        </Label>
                        <p className="text-sm text-muted-foreground">لتبادل الأفكار والخبرات والنقاش حول موضوع معين</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">{cellCategory === "project" ? "ما هو المشروع؟" : "ما هو موضوع الحوار؟"}</Label>
                  <Textarea
                    id="goal"
                    placeholder={
                      cellCategory === "project"
                        ? "مثال: تطوير تطبيق ويب لإدارة المهام"
                        : "مثال: مناقشة تقنيات البرمجة الحديثة"
                    }
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">اشرح بإيجاز الهدف الرئيسي من هذه الخلية</p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={!cellCategory || !goal.trim()}>
                  التالي
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>معلومات الخلية</DialogTitle>
                <DialogDescription>أدخل اسم ووصف الخلية</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الخلية</Label>
                  <Input
                    id="name"
                    placeholder="اسم الخلية"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">الوصف (اختياري)</Label>
                  <Textarea
                    id="description"
                    placeholder="وصف مختصر للخلية..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  رجوع
                </Button>
                <Button type="submit" disabled={loading || !name.trim()}>
                  {loading ? "جارٍ الإنشاء..." : "إنشاء الخلية"}
                </Button>
              </DialogFooter>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
