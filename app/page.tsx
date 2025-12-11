import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageSquare, Map, BookOpen, Brain, Users, Layers, Sparkles } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">محادثات</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost">تسجيل الدخول</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>ابدأ مجاناً</Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 px-6 pt-20 pb-32 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>تجربة محادثة جديدة كلياً</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 text-balance">
            أعد تعريف طريقة
            <span className="text-primary"> تواصلك </span>
            مع مجموعتك
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty">
            تطبيق محادثة مصمم للمجموعات الصغيرة، يجمع بين الطبقات الزمنية والخريطة الذهنية والمفكرة الجماعية والذاكرة
            الذكية في تجربة واحدة متكاملة.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8">
                ابدأ الآن
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                اكتشف المزيد
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">أربع ميزات تغيّر كل شيء</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              كل ميزة صُممت لتحل مشكلة حقيقية في التواصل الجماعي
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1: Temporal Layers */}
            <div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-upper-layer/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-upper-layer/20 flex items-center justify-center mb-6">
                <Layers className="w-7 h-7 text-upper-layer" />
              </div>
              <h3 className="text-2xl font-bold mb-3">الخيط الزمني المتحوّل</h3>
              <p className="text-muted-foreground mb-6">
                ثلاث طبقات متوازية للرسائل: طبقة علوية للرسائل المهمة، طبقة عادية للحديث اليومي، وطبقة ظل للأفكار
                الجانبية والملاحظات الشخصية.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-upper-layer/20 text-upper-layer">مهم</span>
                <span className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary">عادي</span>
                <span className="px-3 py-1 rounded-full text-xs bg-shadow-layer/20 text-shadow-layer">ظل</span>
              </div>
            </div>

            {/* Feature 2: Mind Map */}
            <div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                <Map className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">مخطط المحادثة الذكي</h3>
              <p className="text-muted-foreground mb-6">
                حوّل محادثاتك الخطية إلى خريطة ذهنية تفاعلية. تابع تشعّب المواضيع والأفكار بصرياً، واربط الرسائل بالعقد
                المناسبة.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-primary/20 text-primary">تلقائي</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">يدوي</span>
              </div>
            </div>

            {/* Feature 3: Shared Notebook */}
            <div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-emerald-500/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6">
                <BookOpen className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">المفكرة الجماعية</h3>
              <p className="text-muted-foreground mb-6">
                مساحة مشتركة منفصلة للكتابة التراكمية والتخطيط. صفحات نصية، قوائم، جداول، لوحات رسم، ومجمّع روابط - كلها
                بتحرير تزامني فوري.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-500">تزامن فوري</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                  تاريخ كامل
                </span>
              </div>
            </div>

            {/* Feature 4: AI Memory */}
            <div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-violet-500/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-violet-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">الذاكرة المشتركة</h3>
              <p className="text-muted-foreground mb-6">
                ذكاء اصطناعي يراقب محادثاتك ويُنشئ ملخصات يومية ذكية. يحفظ القرارات والأفكار ويذكّرك بالمواضيع المشابهة
                والذكريات القديمة.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-violet-500/20 text-violet-500">ملخصات يومية</span>
                <span className="px-3 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">بحث دلالي</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Groups Section */}
      <section className="py-24 px-6 bg-card/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-8">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">مصمم للمجموعات الصغيرة</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
            حتى 10 أشخاص في المجموعة الواحدة، لضمان جودة التواصل والحفاظ على خصوصية الحوارات
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="text-lg px-8">
              أنشئ مجموعتك الأولى
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">محادثات</span>
          </div>
          <p className="text-sm text-muted-foreground">جميع الحقوق محفوظة 2025</p>
        </div>
      </footer>
    </div>
  )
}
