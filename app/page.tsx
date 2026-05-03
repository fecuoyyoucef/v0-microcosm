import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Layers, Network, BookOpen, Brain, Sparkles, Lock, Zap } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { NeuralMesh } from "@/components/brand/neural-mesh"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ===== Navigation ===== */}
      <nav className="sticky top-0 z-50 w-full glass">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo variant="wordmark" size={32} animated />
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" className="font-medium">
                تسجيل الدخول
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="font-medium shadow-synaptic-glow">ابدأ مجاناً</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero ===== */}
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <NeuralMesh density={20} speed={0.25} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="mx-auto max-w-5xl px-6 pt-24 pb-32 text-center">
          {/* Eyebrow */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur px-4 py-1.5 text-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-muted-foreground">منصة تواصل عربية من جيل جديد</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight text-balance">
            حيث تتشابك
            <br />
            <span className="synaptic-text-gradient">الأفكار والأرواح</span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-muted-foreground text-pretty">
            مساحة تواصل مصمّمة للمجموعات الصغيرة العميقة. ثلاث طبقات زمنية،
            خريطة ذهنية حيّة، ومفكّرة جماعية &mdash; كل ذلك في تجربة واحدة لا تشبه أي تطبيق آخر.
          </p>

          {/* CTAs */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/sign-up">
              <Button size="lg" className="h-12 px-8 text-base font-semibold shadow-synaptic-glow group">
                ابدأ رحلتك
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="ghost" className="h-12 px-8 text-base font-medium">
                اكتشف الميزات
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-success" />
              <span>تشفير كامل</span>
            </div>
            <div className="hidden sm:block h-1 w-1 rounded-full bg-border" />
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              <span>سرعة فورية</span>
            </div>
            <div className="hidden sm:block h-1 w-1 rounded-full bg-border" />
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span>ذكاء حقيقي</span>
            </div>
          </div>
        </div>
      </header>

      {/* ===== Signature feature: Temporal Layers ===== */}
      <section className="relative px-6 py-24" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">الميّزة الأساسية</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold leading-tight text-balance">
              ثلاث طبقات للحوار،
              <br />
              <span className="synaptic-text-gradient">خيط زمني واحد</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
              لا تكتفِ بتسلسل واحد للرسائل. اخلق نسيجاً متعدد الأبعاد للحوار يفصل المهم عن العادي عن الجانبي.
            </p>
          </div>

          {/* 3 layered cards */}
          <div className="relative grid gap-6 md:grid-cols-3">
            <LayerCard
              tier="upper"
              title="الطبقة العلوية"
              tagline="للحظات المهمة"
              description="رسائل القرارات والإعلانات والتذكيرات. تظهر بوضوح في خط الزمن وتُحفظ في أرشيف خاص."
              accentClass="text-accent"
              ringClass="ring-accent/30 hover:ring-accent/60"
              dotClass="bg-accent shadow-[0_0_20px_oklch(0.78_0.16_70_/_0.6)]"
            />
            <LayerCard
              tier="standard"
              title="الطبقة العادية"
              tagline="للحديث اليومي"
              description="الدردشة المعتادة بين الأصدقاء. سريعة، مرنة، وتُمحى تلقائياً بعد فترة لتحافظ على الخصوصية."
              accentClass="text-primary"
              ringClass="ring-primary/30 hover:ring-primary/60"
              dotClass="bg-primary shadow-[0_0_20px_oklch(0.55_0.13_195_/_0.6)]"
            />
            <LayerCard
              tier="shadow"
              title="طبقة الظل"
              tagline="للأفكار الجانبية"
              description="ملاحظاتك الشخصية والتأملات الخافتة. مرئية لك فقط، تُلتقط بسرعة وتُسترجع بسهولة."
              accentClass="text-muted-foreground"
              ringClass="ring-border hover:ring-foreground/30"
              dotClass="bg-shadow-layer"
            />
          </div>
        </div>
      </section>

      {/* ===== Three Pillars ===== */}
      <section className="px-6 py-24 bg-card/30">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">ثلاث ميزات إضافية</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold leading-tight">
              أكثر من مجرّد دردشة
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Network}
              title="الخريطة الذهنية"
              description="حوّل سلسلة الرسائل إلى شبكة بصرية تفاعلية. اربط الأفكار، اتبع تشعّب المواضيع، واكتشف العلاقات الخفيّة."
              gradient="from-primary/20 to-success/10"
            />
            <FeatureCard
              icon={BookOpen}
              title="المفكّرة الجماعية"
              description="مساحة تحرير تزامنية للمجموعة. صفحات، قوائم، جداول، ولوحات &mdash; كلّها بتعديل لحظي ومُسجَّل بالكامل."
              gradient="from-success/20 to-accent/10"
            />
            <FeatureCard
              icon={Brain}
              title="الذاكرة الذكية"
              description="ذكاء اصطناعي يلخّص يومياتكم، يحفظ القرارات الجماعية، ويذكّركم بالنقاشات المشابهة من الماضي."
              gradient="from-accent/20 to-primary/10"
            />
          </div>
        </div>
      </section>

      {/* ===== Differentiator: Why Small Groups ===== */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Logo size={72} animated className="mx-auto mb-8" />
          <h2 className="font-heading text-4xl md:text-5xl font-bold leading-tight text-balance">
            مصمّم لـ
            <span className="synaptic-text-gradient"> العشرة المقرّبين </span>
            لا للجماهير
          </h2>
          <p className="mt-8 text-lg md:text-xl leading-relaxed text-muted-foreground max-w-2xl mx-auto text-pretty">
            حدّ أقصى عشرة أشخاص في المجموعة الواحدة. لأن العمق لا يكون مع الكثرة، بل مع
            من تختارهم بعناية.
          </p>

          <div className="mt-12">
            <Link href="/auth/sign-up">
              <Button size="lg" className="h-14 px-10 text-base font-semibold shadow-synaptic-glow">
                أنشئ مجموعتك الأولى
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">مجاني تماماً &middot; بدون إعلانات &middot; خصوصية مطلقة</p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="wordmark" size={28} />
          <p className="text-sm text-muted-foreground">جميع الحقوق محفوظة &copy; Synaptic Space 2026</p>
        </div>
      </footer>
    </div>
  )
}

// ============== Sub-components ==============

function LayerCard({
  tier,
  title,
  tagline,
  description,
  accentClass,
  ringClass,
  dotClass,
}: {
  tier: string
  title: string
  tagline: string
  description: string
  accentClass: string
  ringClass: string
  dotClass: string
}) {
  return (
    <div
      className={`group relative flex flex-col rounded-3xl bg-card p-8 ring-1 ${ringClass} transition-all hover:-translate-y-1 shadow-synaptic`}
    >
      <div className="mb-6 flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${dotClass}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${accentClass}`}>{tier}</span>
      </div>
      <Layers className={`mb-6 h-8 w-8 ${accentClass}`} strokeWidth={1.5} />
      <h3 className="font-heading text-2xl font-bold mb-2">{title}</h3>
      <p className={`text-sm font-medium ${accentClass} mb-4`}>{tagline}</p>
      <p className="text-muted-foreground leading-relaxed text-pretty">{description}</p>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-card p-8 ring-1 ring-border hover:ring-primary/40 transition-all hover:-translate-y-1 shadow-synaptic">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <h3 className="font-heading text-2xl font-bold mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-pretty">{description}</p>
      </div>
    </div>
  )
}
