"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getSuggestedCells, getUserCellCompatibility } from "@/lib/synaptic-matching"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Sparkles } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function SynapticMatchingTestPage() {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    runTests()
  }, [])

  const runTests = async () => {
    setLoading(true)
    const testResults: any = {
      systemEnabled: false,
      userSurveys: 0,
      cellSurveys: 0,
      suggestedCells: [],
      errors: [],
    }

    try {
      // الحصول على المستخدم الحالي
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        testResults.errors.push("لا يوجد مستخدم مسجل دخول")
        setResults(testResults)
        setLoading(false)
        return
      }
      setCurrentUser(user)

      // فحص إعدادات النظام
      const { data: setting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "synaptic_matching_enabled")
        .single()

      testResults.systemEnabled = setting?.value === "true" || setting?.value === true

      // عدد استبيانات المستخدمين
      const { count: userSurveysCount } = await supabase
        .from("user_surveys")
        .select("*", { count: "exact", head: true })

      testResults.userSurveys = userSurveysCount || 0

      // عدد استبيانات الخلايا
      const { count: cellSurveysCount } = await supabase
        .from("cell_surveys")
        .select("*", { count: "exact", head: true })

      testResults.cellSurveys = cellSurveysCount || 0

      // استبيان المستخدم الحالي
      const { data: userSurvey } = await supabase.from("user_surveys").select("*").eq("user_id", user.id).single()

      testResults.userSurvey = userSurvey

      // جلب الخلايا المقترحة
      if (userSurvey) {
        const suggested = await getSuggestedCells(user.id, 5)
        testResults.suggestedCells = suggested

        // اختبار توافق محدد مع أول خلية
        if (suggested.length > 0) {
          const compatibility = await getUserCellCompatibility(user.id, suggested[0].groupId)
          testResults.compatibilityTest = compatibility
        }
      }

      // جلب مطابقات محفوظة
      const { data: savedMatches } = await supabase
        .from("synaptic_matches")
        .select("*")
        .eq("user_id", user.id)
        .order("calculated_at", { ascending: false })
        .limit(5)

      testResults.savedMatches = savedMatches || []
    } catch (error: any) {
      console.error("[v0] Test error:", error)
      testResults.errors.push(error.message)
    }

    setResults(testResults)
    setLoading(false)
  }

  const enableSystem = async () => {
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert({ key: "synaptic_matching_enabled", value: true, description: "تفعيل نظام المطابقة المشبكية" })

      if (error) throw error

      alert("تم تفعيل النظام بنجاح")
      runTests()
    } catch (error: any) {
      alert("خطأ: " + error.message)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">اختبار نظام المطابقة المشبكية</h1>
          <p className="text-muted-foreground">فحص شامل لنظام Synaptic Matching</p>
        </div>
        <Button onClick={runTests} variant="outline">
          <Sparkles className="w-4 h-4 ml-2" />
          إعادة الاختبار
        </Button>
      </div>

      {/* حالة النظام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {results.systemEnabled ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>النظام مفعّل</span>
            <Badge variant={results.systemEnabled ? "default" : "destructive"}>
              {results.systemEnabled ? "نعم" : "لا"}
            </Badge>
          </div>

          {!results.systemEnabled && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                النظام غير مفعل. لتفعيله، اضغط على الزر أدناه.
                <Button onClick={enableSystem} size="sm" className="mt-2">
                  تفعيل النظام
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <span>عدد استبيانات المستخدمين</span>
            <Badge variant="secondary">{results.userSurveys}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>عدد استبيانات الخلايا</span>
            <Badge variant="secondary">{results.cellSurveys}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* استبيان المستخدم الحالي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {results.userSurvey ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            استبيان المستخدم الحالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.userSurvey ? (
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">الاهتمامات:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {results.userSurvey.interests?.map((interest: string) => (
                    <Badge key={interest} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">المستوى:</span>
                <span className="ml-2">{results.userSurvey.expertise_level || "غير محدد"}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">الهدف:</span>
                <p className="text-sm mt-1">{results.userSurvey.goal || "غير محدد"}</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                لم تكمل الاستبيان بعد.{" "}
                <Button variant="link" className="p-0 h-auto">
                  انتقل للاستبيان
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* الخلايا المقترحة */}
      <Card>
        <CardHeader>
          <CardTitle>الخلايا المقترحة ({results.suggestedCells.length})</CardTitle>
          <CardDescription>أفضل 5 خلايا متوافقة مع ملفك الشخصي</CardDescription>
        </CardHeader>
        <CardContent>
          {results.suggestedCells.length > 0 ? (
            <div className="space-y-3">
              {results.suggestedCells.map((cell: any) => (
                <div key={cell.groupId} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cell.groupName}</p>
                      <p className="text-sm text-muted-foreground">{cell.memberCount} عضو</p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl font-bold text-primary">{cell.compatibilityScore}%</span>
                      <p className="text-xs text-muted-foreground">توافق</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">الاهتمامات</span>
                      <Progress value={cell.interestsScore} className="h-1 mt-1" />
                    </div>
                    <div>
                      <span className="text-muted-foreground">المستوى</span>
                      <Progress value={cell.levelScore} className="h-1 mt-1" />
                    </div>
                    <div>
                      <span className="text-muted-foreground">الأهداف</span>
                      <Progress value={cell.goalScore} className="h-1 mt-1" />
                    </div>
                    <div>
                      <span className="text-muted-foreground">الأسلوب</span>
                      <Progress value={cell.styleScore} className="h-1 mt-1" />
                    </div>
                  </div>

                  {cell.sharedInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cell.sharedInterests.map((interest: string) => (
                        <Badge key={interest} variant="secondary" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                لا توجد خلايا مقترحة. قد تحتاج لإكمال الاستبيان أو قد تكون انضممت لجميع الخلايا المتاحة.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* اختبار التوافق */}
      {results.compatibilityTest && (
        <Card>
          <CardHeader>
            <CardTitle>اختبار التوافق التفصيلي</CardTitle>
            <CardDescription>تحليل توافقك مع أول خلية مقترحة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-primary">{results.compatibilityTest.score}%</span>
              <p className="text-muted-foreground">درجة التوافق الإجمالية</p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>الاهتمامات المشتركة</span>
                  <span className="font-medium">{Math.round(results.compatibilityTest.details.interests.score)}%</span>
                </div>
                <Progress value={results.compatibilityTest.details.interests.score} className="h-2" />
                {results.compatibilityTest.details.interests.shared.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {results.compatibilityTest.details.interests.shared.map((interest: string) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>توافق المستوى</span>
                  <span className="font-medium">{Math.round(results.compatibilityTest.details.level)}%</span>
                </div>
                <Progress value={results.compatibilityTest.details.level} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>توافق الأهداف</span>
                  <span className="font-medium">{Math.round(results.compatibilityTest.details.goal)}%</span>
                </div>
                <Progress value={results.compatibilityTest.details.goal} className="h-2" />
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>توافق الأسلوب</span>
                  <span className="font-medium">{Math.round(results.compatibilityTest.details.style)}%</span>
                </div>
                <Progress value={results.compatibilityTest.details.style} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* المطابقات المحفوظة */}
      <Card>
        <CardHeader>
          <CardTitle>المطابقات المحفوظة</CardTitle>
          <CardDescription>آخر 5 مطابقات محسوبة</CardDescription>
        </CardHeader>
        <CardContent>
          {results.savedMatches.length > 0 ? (
            <div className="space-y-2">
              {results.savedMatches.map((match: any) => (
                <div key={match.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">خلية: {match.group_id.substring(0, 8)}...</span>
                  <div className="flex items-center gap-2">
                    <Badge>{Math.round(match.compatibility_score)}%</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(match.calculated_at).toLocaleDateString("ar")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>لا توجد مطابقات محفوظة حتى الآن</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* الأخطاء */}
      {results.errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>
            <p className="font-medium mb-2">حدثت أخطاء أثناء الاختبار:</p>
            <ul className="list-disc list-inside space-y-1">
              {results.errors.map((error: string, index: number) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
