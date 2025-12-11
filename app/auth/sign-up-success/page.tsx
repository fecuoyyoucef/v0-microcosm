import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mail, CheckCircle, AlertTriangle } from "lucide-react"
import Image from "next/image"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 mb-4">
            <Image
              src="/icons/icon-96x96.png"
              alt="Synaptic Space"
              width={72}
              height={72}
              className="rounded-2xl shadow-lg"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Synaptic Space
            </h1>
          </Link>
        </div>

        <Card className="border-border bg-card text-center">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">شكراً لتسجيلك!</CardTitle>
            <CardDescription>تم إنشاء حسابك بنجاح</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
              <Mail className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-right">
                تم إرسال رابط التأكيد إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد لتفعيل حسابك.
              </p>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-right space-y-2">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">لم تجد الرسالة؟</p>
                <p className="text-xs text-muted-foreground">
                  قد تكون رسالة التحقق في مجلد <strong>الرسائل غير المرغوب فيها (Spam)</strong>
                </p>
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p>
                    <strong>Gmail:</strong> تحقق من تبويب "الرسائل غير المرغوب فيها" أو "Spam"
                  </p>
                  <p>
                    <strong>Outlook:</strong> تحقق من مجلد "Junk Email"
                  </p>
                  <p>
                    <strong>Yahoo:</strong> تحقق من مجلد "Spam"
                  </p>
                </div>
              </div>
            </div>

            <Link href="/auth/login">
              <Button variant="outline" className="w-full bg-transparent mt-4">
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
