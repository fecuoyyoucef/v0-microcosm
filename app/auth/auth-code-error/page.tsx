import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowRight, Info } from "lucide-react"
import Link from "next/link"

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { error?: string; details?: string }
}) {
  const errorMessage = searchParams.error
  const errorDetails = searchParams.details

  const isOAuthError = errorMessage?.includes("oauth") || errorMessage?.includes("OAuth")
  const isMissingCode = errorMessage === "missing_code"

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>خطأ في التحقق</CardTitle>
          <CardDescription>
            {isOAuthError
              ? "مشكلة في تسجيل الدخول عبر جوجل"
              : isMissingCode
                ? "فشل الاتصال بخادم المصادقة"
                : "انتهت صلاحية رابط التحقق أو أنه غير صالح"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOAuthError ? (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex gap-2 items-start">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  <p className="font-medium mb-1">تسجيل الدخول عبر جوجل غير متاح حالياً</p>
                  <p className="text-xs opacity-90">
                    يرجى المحاولة لاحقاً أو استخدام البريد الإلكتروني وكلمة المرور للدخول
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              قد يكون رابط التحقق قد انتهت صلاحيته أو تم استخدامه مسبقاً. يرجى المحاولة مرة أخرى أو طلب رابط جديد.
            </p>
          )}

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs text-destructive font-mono break-words">{errorMessage}</p>
            </div>
          )}

          {errorDetails && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground">تفاصيل تقنية</summary>
              <p className="mt-2 p-2 bg-muted rounded font-mono break-words">{errorDetails}</p>
            </details>
          )}

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                تسجيل الدخول
                <ArrowRight className="w-4 h-4 mr-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/auth/sign-up">إنشاء حساب جديد</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
