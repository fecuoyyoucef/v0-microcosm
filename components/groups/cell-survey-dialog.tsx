"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CellSurveyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  onComplete: () => void
}

const INTERESTS_CATEGORIES = {
  tech: {
    name: "التقنية والابتكار",
    items: [
      "الذكاء الاصطناعي وتعلم الآلة",
      "تطوير الويب",
      "الأمن السيبراني",
      "البلوك تشين",
      "علم البيانات",
      "إنترنت الأشياء",
      "الحوسبة السحابية",
      "تطوير التطبيقات",
      "الواقع الافتراضي",
    ],
  },
  academic: {
    name: "الفكرية والأكاديمية",
    items: [
      "الفلسفة والمنطق",
      "علم النفس",
      "التاريخ والحضارات",
      "العلوم السياسية",
      "الاقتصاد والتمويل",
      "اللغويات والترجمة",
      "العلوم الطبيعية",
      "علم الاجتماع",
      "النقد الأدبي",
    ],
  },
  creative: {
    name: "الإبداعية والفنية",
    items: [
      "الأدب والشعر",
      "التصوير الفوتوغرافي",
      "التصميم الجرافيكي",
      "الإلقاء والإنتاج الصوتي",
      "الفنون البصرية",
      "صناعة المحتوى",
      "الخط العربي",
      "السينما",
    ],
  },
  personal: {
    name: "التنمية الشخصية",
    items: [
      "القيادة والإدارة",
      "ريادة الأعمال",
      "الصحة النفسية",
      "الإنتاجية",
      "تعلم اللغات",
      "المهارات الناعمة",
      "التخطيط المالي",
      "التوجيه المهني",
    ],
  },
  lifestyle: {
    name: "نمط الحياة",
    items: [
      "الطبخ الاحترافي",
      "اللياقة البدنية",
      "السفر والاستكشاف",
      "الألعاب الاستراتيجية",
      "الزراعة المستدامة",
      "جمع التحف",
      "الحرف اليدوية",
      "علم الفلك",
    ],
  },
}

export function CellSurveyDialog({ open, onOpenChange, groupId, onComplete }: CellSurveyDialogProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Survey state
  const [discussionStyle, setDiscussionStyle] = useState("")
  const [expertiseLevel, setExpertiseLevel] = useState("")
  const [primaryGoal, setPrimaryGoal] = useState("")
  const [interactionStyle, setInteractionStyle] = useState("")
  const [idealMember, setIdealMember] = useState("")
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const handleInterestToggle = (interest: string) => {
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await supabase.from("cell_surveys").insert({
        group_id: groupId,
        created_by: user.id, // Added missing created_by field
        discussion_style: discussionStyle,
        expertise_level: expertiseLevel,
        primary_goal: primaryGoal,
        interaction_style: interactionStyle,
        ideal_member_description: idealMember,
        target_interests: selectedInterests,
      })

      if (error) throw error

      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving cell survey:", error)
      alert("حدث خطأ أثناء حفظ الاستبيان")
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return discussionStyle && expertiseLevel
      case 2:
        return primaryGoal && interactionStyle
      case 3:
        return idealMember.trim().length > 0
      case 4:
        return selectedInterests.length > 0
      default:
        return false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">استبيان الخلية</DialogTitle>
          <DialogDescription>ساعدنا في فهم نوع الأعضاء المثاليين لخليتك ({step} من 4)</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-1">
          <div className="space-y-6 py-4">
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">نوع النقاش المفضل</Label>
                  <RadioGroup value={discussionStyle} onValueChange={setDiscussionStyle}>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="formal" id="formal" />
                      <Label htmlFor="formal" className="cursor-pointer flex-1">
                        رسمي - نقاش أكاديمي منظم
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="casual" id="casual" />
                      <Label htmlFor="casual" className="cursor-pointer flex-1">
                        غير رسمي - محادثة ودية
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="mixed" id="mixed" />
                      <Label htmlFor="mixed" className="cursor-pointer flex-1">
                        مختلط - حسب الموضوع
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">المستوى المطلوب</Label>
                  <RadioGroup value={expertiseLevel} onValueChange={setExpertiseLevel}>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <Label htmlFor="beginner" className="cursor-pointer flex-1">
                        مبتدئ - للمتعلمين الجدد
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <Label htmlFor="intermediate" className="cursor-pointer flex-1">
                        متوسط - لديهم خبرة أساسية
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="advanced" id="advanced" />
                      <Label htmlFor="advanced" className="cursor-pointer flex-1">
                        متقدم - خبراء ومحترفون
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="mixed" id="mixed-level" />
                      <Label htmlFor="mixed-level" className="cursor-pointer flex-1">
                        جميع المستويات
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="goal" className="text-base font-semibold">
                    ما هو الهدف الأساسي لهذه الخلية؟
                  </Label>
                  <Textarea
                    id="goal"
                    value={primaryGoal}
                    onChange={(e) => setPrimaryGoal(e.target.value)}
                    placeholder="مثال: تطوير مهارات البرمجة معاً، مناقشة كتب الفلسفة، بناء مشروع مشترك..."
                    className="min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">أسلوب التفاعل المفضل</Label>
                  <RadioGroup value={interactionStyle} onValueChange={setInteractionStyle}>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="collaborative" id="collaborative" />
                      <Label htmlFor="collaborative" className="cursor-pointer flex-1">
                        تعاوني - نعمل معاً لبناء شيء
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="debate" id="debate" />
                      <Label htmlFor="debate" className="cursor-pointer flex-1">
                        نقاش وجدال - تبادل وجهات النظر
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="brainstorming" id="brainstorming" />
                      <Label htmlFor="brainstorming" className="cursor-pointer flex-1">
                        عصف ذهني - توليد أفكار جديدة
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary">
                      <RadioGroupItem value="structured" id="structured" />
                      <Label htmlFor="structured" className="cursor-pointer flex-1">
                        منظم - جدول أعمال واضح
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Label htmlFor="ideal" className="text-base font-semibold">
                  صف العضو المثالي لهذه الخلية
                </Label>
                <Textarea
                  id="ideal"
                  value={idealMember}
                  onChange={(e) => setIdealMember(e.target.value)}
                  placeholder="مثال: شخص لديه شغف بالتعلم، منفتح على الأفكار الجديدة، يحترم الآراء المختلفة، ملتزم بالمشاركة الفعالة..."
                  className="min-h-[150px] resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  سيساعدنا هذا في اقتراح أعضاء مناسبين وتصفية طلبات الانضمام
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  اختر الاهتمامات المستهدفة ({selectedInterests.length} محددة)
                </Label>
                <p className="text-sm text-muted-foreground">اختر المواضيع التي يجب أن يهتم بها الأعضاء المحتملون</p>

                {Object.entries(INTERESTS_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="space-y-2">
                    <h3 className="font-semibold text-sm text-primary">{category.name}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {category.items.map((interest) => (
                        <div
                          key={interest}
                          className="flex items-center space-x-2 space-x-reverse p-2 rounded-lg hover:bg-secondary"
                        >
                          <Checkbox
                            id={interest}
                            checked={selectedInterests.includes(interest)}
                            onCheckedChange={() => handleInterestToggle(interest)}
                          />
                          <Label htmlFor={interest} className="cursor-pointer text-sm flex-1">
                            {interest}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
              السابق
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          <div className="flex-1" />

          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              التالي
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              إنهاء الاستبيان
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
