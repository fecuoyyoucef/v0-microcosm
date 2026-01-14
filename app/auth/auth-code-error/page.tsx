import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMessage = searchParams.error

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle>خطأ في التحقق</CardTitle>
          <CardDescription>انتهت صلاحية رابط التحقق أو أنه غير صالح</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            قد يكون رابط التحقق قد انتهت صلاحيته أو تم استخدامه مسبقاً. يرجى المحاولة مرة أخرى أو طلب رابط جديد.
          </p>

          {errorMessage && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs text-destructive font-mono break-words">{errorMessage}</p>
            </div>
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
