# HANDOFF — وثيقة تسليم المشروع

> هذه الوثيقة موجّهة للمبرمج الذي سيتولى تنقية الكود وإعداد طبقة الاختبارات.
> آخر تحديث: 2026-05-15

---

## 1. نظرة عامة

- **اسم المشروع:** v0-microcosm
- **الإطار:** Next.js 16.0.10 (App Router) + React 19.2 + TypeScript
- **التنسيق:** Tailwind CSS v4 + Radix UI + shadcn
- **مدير الحزم:** pnpm (يوجد `pnpm-lock.yaml`)
- **Node:** يفترض ≥ 20
- **اللغة الأساسية للواجهة:** العربية (RTL)

---

## 2. الأنظمة المتوازية (نقاط القرار الأهم)

المشروع يحتوي على **عدة أنظمة متوازية تؤدي نفس الوظيفة**. يجب توحيد كل مجموعة منها قبل الإصلاح الجدّي.

### 2.1 ثلاثة أنظمة مصادقة (Auth) تعمل في آن واحد

| النظام | الموقع | الاستخدام الحالي |
|---|---|---|
| **Supabase Auth** | `lib/supabase/{client,server,proxy}.ts` | مصادقة المستخدمين العاديين (إن ضُبطت env vars) |
| **Firebase Auth** | `lib/firebase-admin-server.ts`, `lib/firebase-push.ts` | مرتبط بالإشعارات الفورية (FCM) أساساً |
| **Custom Admin Auth** | `lib/admin-auth.ts` + cookie `admin_session` + bcryptjs | حماية لوحة الأدمن `/admin/*` |

**ملاحظة مهمة:** `lib/supabase/proxy.ts` يحتوي حالياً على guard يتخطى التحقق إذا كانت متغيرات Supabase مفقودة (أُضيف لتجنّب crash في v0 preview).

**قرار مطلوب من صاحب المشروع:** هل نوحّد على Supabase Auth بالكامل، أم نُبقي على Custom Admin لمنطقة `/admin` و Supabase للباقي؟ Firebase يُحتفظ به للإشعارات فقط.

### 2.2 نظاما AI Agents

| النظام | الموقع | API Routes |
|---|---|---|
| **Standard Agents** | `lib/ai-agents/chief-agent.ts` + `chief-agent-enhanced.ts` | `app/api/ai-agents/{chat,decide,execute,...}` |
| **Kimi Agents** | `lib/ai-agents/chief-agent-kimi.ts` + `kimi-client.ts` | `app/api/ai-agents/kimi/{chat,decide,moderate,analyze-error,...}` |

كلاهما **قيد الاستخدام الفعلي**. ملفات التوثيق المرتبطة:
- `lib/ai-agents/KIMI_AGENT_GUIDE.md`
- `lib/ai-agents/GROQ_USAGE.md`
- `lib/ai-agents/README.md`

### 2.3 مكتبتا Groq مكرّرتان

```
"@ai-sdk/groq": "2.0.33"     ← الموصى بها (AI SDK)
"groq-sdk": "0.37.0"          ← مكرّرة، يُفضّل حذفها
```

### 2.4 مجلدات contexts مكررة

```
/contexts/                  ← يحتوي: active-cell-context, feature-flags-context
/lib/contexts/              ← يحتوي: scroll-context, tutorial-context
```

يجب دمجهما في موقع واحد (الموصى به: `/contexts/` في الجذر).

### 2.5 ملفات `-server.ts` مقابل العادية

تمييز ضعيف بين السيرفر والعميل:

```
lib/features-server.ts
lib/feature-registry.ts          + feature-registry-server.ts
lib/notifications.ts             + notifications-server.ts + notifications/preferences.ts
lib/system-settings.ts           + system-settings-server.ts
lib/firebase-admin-server.ts
```

**الموصى به:** فصل واضح بإحدى الطريقتين:
- (أ) مجلدات `lib/server/` و `lib/client/` و `lib/shared/`
- (ب) استخدام package `server-only` على كل ملف سيرفر

---

## 3. البنية الحالية للمجلدات

```
v0-project/
├── app/
│   ├── api/                    ← 22 مجلد API (تفاصيل أدناه)
│   ├── admin/                  ← لوحة الأدمن
│   ├── auth/                   ← صفحات المصادقة
│   └── ...
├── components/
│   ├── ui/                     ← shadcn components
│   ├── chat/, groups/, brand/  ← مكوّنات الأعمال
│   └── ...
├── contexts/                   ← ⚠️ مكرر مع lib/contexts/
├── lib/                        ← منطق العمل (مختلط server/client)
│   ├── ai-agents/              ← نظاما AI (standard + Kimi)
│   ├── supabase/
│   ├── contexts/               ← ⚠️ مكرر مع /contexts/
│   └── utils/
├── public/
│   ├── icons/                  ← أيقونات PWA (تم حذف نسخ jpg غير المستخدمة)
│   └── images/                 ← (تم حذف 1-5.webp غير المستخدمة)
├── scripts/                    ← 47 ملف SQL + 4 سكربتات (.mjs, .py)
└── styles/                     ← تم حذف globals.css المكرر؛ المجلد قد يكون فارغاً
```

### 3.1 خريطة `app/api/` (22 مجلد رئيسي)

```
admin/        - 19 endpoint للوحة الأدمن
ai/           - 16 endpoint لميزات AI العامة
ai-agents/    - 11 endpoint للوكلاء + kimi/ (6 endpoints فرعية)
activity/track
cron/         - generate-summaries, update-responsibility
debug/chat-page
firebase/     - config, vapid-key
generate-summary
groups/       - approve/reject/join-cell
legal/        - consent, documents
messages/     - 9 endpoints (delete, edit, pin, react, reply, ...)
monitoring/log
notifications/ - 4 endpoints
opendevin/tasks
profile/       - recalculate-titles, stats, titles
push/          - send, subscribe, test
support/       - chat, tickets
translate
user/delete-account
webhooks/github
```

---

## 4. قاعدة البيانات

### 4.1 ملفات SQL (47 ملف في `scripts/`)

**⚠️ ترقيمات مكررة (يجب إعادة ترقيمها):**

| الرقم | الملف الأول | الملف الثاني |
|---|---|---|
| 004 | `004_fix_rls_recursion.sql` | `004_user_survey_tables.sql` |
| 008 | `008_agent_chat_logs.sql` | `008_fix_rls_final.sql` |
| 028 | `028_feature_flags_and_suggestions.sql` | `028_feature_registry.sql` |

**⚠️ فجوات في الترقيم:** 006, 016, 030, 033, 038-044 مفقودة.

**ملفات بأسماء غير مرقّمة (يجب إدماجها في الترقيم):**
- `add-reply-preview.sql`
- `add_cell_classification_v1.sql`
- `add_group_background_v1.sql`
- `add_system_settings_v1.sql`
- `cleanup-old-fcm-tokens.sql`
- `create-agent-tables-v1.sql`
- `create-legal-documents-tables.sql`
- `create-opendevin-tables.sql`
- `fix-fcm-tokens-table.sql`

### 4.2 تنظيف سابق تم في الجلسات الأخيرة

- ✅ حُذف `scripts/030_push_subscriptions.sql` (مكرر مع 023، والكود يستخدم schema 023)
- ✅ الـ schema الفعلي لجدول `push_subscriptions`: أعمدة منفصلة (`endpoint`, `p256dh`, `auth`) — كما في `app/api/push/send/route.ts`

### 4.3 ما يحتاجه المبرمج

- لا توجد أداة migration حقيقية (لا Drizzle Kit، لا Prisma، لا sqlx).
- لا يوجد جدول `migrations` يتتبّع ما طُبِّق فعلاً.
- لا يوجد schema موحّد يعكس الحالة النهائية للقاعدة.
- **الموصى به:** تنصيب Drizzle Kit ودمج كل الـ SQL في schema واحد + سلسلة migrations نظيفة.

---

## 5. متغيرات البيئة (Environment Variables)

### 5.1 المطلوبة (Required)

```bash
# Supabase (مطلوبة إن أُبقي على Supabase Auth)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Firebase (مطلوبة للإشعارات)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Admin Auth
ADMIN_PASSWORD_HASH=          # bcrypt hash، يُولَّد بـ scripts/hash-admin-password.mjs
ADMIN_SESSION_SECRET=

# AI (Groq / xAI / HuggingFace)
GROQ_API_KEY=
XAI_API_KEY=
HUGGINGFACE_API_KEY=
AI_GATEWAY_API_KEY=

# Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# GitHub Integration (للـ AI Agents)
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=
```

### 5.2 المشكلة الحالية

- **لا يوجد env validation عند startup.** الأخطاء تظهر في runtime (كما حدث مع Supabase URL).
- **الموصى به بقوة:** إضافة `@t3-oss/env-nextjs` + Zod للتحقق من كل المتغيرات في build time.

---

## 6. الحزم (Dependencies) — مشاكل حالية

### 6.1 إصدارات `"latest"` (قنبلة موقوتة)

7 حزم بإصدار `"latest"` يجب تثبيتها على إصدار محدد:

```json
"@emotion/is-prop-valid": "latest"
"@huggingface/inference": "latest"
"@supabase/ssr": "latest"
"@supabase/supabase-js": "latest"
"@vercel/analytics": "latest"
"date-fns": "latest"
"next-themes": "latest"
"use-debounce": "latest"
```

### 6.2 حزم مكرّرة وظيفياً

- `@ai-sdk/groq` + `groq-sdk` (احذف الثانية)

### 6.3 حزم مفقودة (موصى بإضافتها)

- `vitest` + `@testing-library/react` (اختبارات)
- `@playwright/test` (E2E)
- `prettier` + `eslint-config-prettier`
- `husky` + `lint-staged`
- `@t3-oss/env-nextjs` (env validation)
- `server-only` (حماية تسرّب كود السيرفر)
- `drizzle-orm` + `drizzle-kit` (migrations) — اختياري

---

## 7. ما تم تنظيفه في الجلسات السابقة

تم حذف **31 ملفاً ميتاً** عبر 3 جلسات:

### جلسة 1 (14 ملف)
- `lib/ai-agents/chief-agent.old.ts`
- `components/chat/create-group-dialog.tsx`
- `components/groups/create-group-dialog.tsx`
- `components/background/neural-mesh.tsx`
- `lib/ai-agents/monitoring-kimi.ts`
- `styles/globals.css`
- `FEATURES_STATUS.md`, `MESSAGING_FEATURES.md`
- `docs/CHAT_PAGE_FIXES_SUMMARY.md`
- `docs/CHAT_PAGE_TROUBLESHOOTING.md`
- `docs/ISSUE_722_DETAILED_COMPARISON.md`
- `docs/ISSUE_722_ROOT_CAUSE_ANALYSIS.md`
- `docs/KIMI_AGENT_SYSTEM_STATUS.md`
- `lib/ai-agents/MIGRATION_NOTES.md`

### جلسة 2 (17 ملف)
- 11 ملف `public/icons/*.jpg` (تم الإبقاء على `app-logo.jpg` لأنه مستخدم في 6 ملفات)
- `scripts/030_push_subscriptions.sql` (مكرر مع 023)
- `public/images/{1,2,3,4,5}.webp`

### جلسة 3
- إضافة guard في `lib/supabase/proxy.ts` لمنع crash عند غياب env vars

---

## 8. خارطة الطريق المقترحة

### المرحلة 1 — الأساسيات (قبل أي شيء آخر)
- [ ] تثبيت 7 حزم `"latest"` على إصدارات محددة
- [ ] إضافة Env validation بـ `@t3-oss/env-nextjs`
- [ ] إضافة Prettier + Husky + lint-staged + commitlint
- [ ] إعداد `.github/workflows/ci.yml` (typecheck + lint + build)

### المرحلة 2 — اختبارات (Testing Layer)
- [ ] تنصيب Vitest + React Testing Library + Playwright
- [ ] كتابة اختبارات unit لـ:
  - `lib/admin-auth.ts`
  - `lib/supabase/proxy.ts`
  - `lib/ai-agents/chief-agent.ts`
  - `lib/utils/correct-arabic.ts`
- [ ] كتابة اختبارات integration لـ API routes الحرجة:
  - `app/api/admin/login/route.ts`
  - `app/api/push/send/route.ts`
  - `app/api/messages/send-with-mentions/route.ts`
- [ ] كتابة اختبار E2E واحد على الأقل لمسار تسجيل الدخول

### المرحلة 3 — التوحيد
- [ ] قرار نظام المصادقة الموحّد (Supabase vs Custom)
- [ ] قرار نظام AI Agents الموحّد (Standard vs Kimi vs دمجهما)
- [ ] حذف `groq-sdk` (الإبقاء على `@ai-sdk/groq`)
- [ ] دمج `/contexts/` و `/lib/contexts/`
- [ ] فصل واضح بين server/client في `lib/`

### المرحلة 4 — قاعدة البيانات
- [ ] إعادة ترقيم SQL المكرر (004, 008, 028)
- [ ] دمج الملفات غير المرقّمة في السلسلة
- [ ] تنصيب Drizzle Kit + كتابة schema موحّد
- [ ] إنشاء migration history table

### المرحلة 5 — طبقة Domain
- [ ] إنشاء `lib/services/` (منطق العمل)
- [ ] إنشاء `lib/repositories/` (الوصول للبيانات)
- [ ] تنحيف `app/api/*` لتصبح طبقة رفيعة

### المرحلة 6 — Observability
- [ ] ربط Sentry (موجود endpoint `/api/admin/sentry/issues` لكن غير مكتمل)
- [ ] إضافة structured logging
- [ ] إضافة health check endpoint

---

## 9. ملفات مهمة للمراجعة

| الملف | لماذا مهم |
|---|---|
| `lib/admin-auth.ts` | منطق المصادقة المخصص الكامل |
| `lib/supabase/proxy.ts` | يحتوي guard مؤقت لـ env vars |
| `lib/ai-agents/chief-agent.ts` | عقل النظام الرئيسي للوكلاء |
| `lib/ai-agents/chief-agent-kimi.ts` | النظام الموازي |
| `lib/types.ts` | كل الأنواع في ملف واحد (يحتاج تجزئة) |
| `app/api/push/send/route.ts` | يحدد schema الفعلي لـ push_subscriptions |
| `scripts/hash-admin-password.mjs` | لتوليد `ADMIN_PASSWORD_HASH` |

---

## 10. تعليمات Git

- **Branch الرئيسي:** `main`
- **Branch الحالي للعمل:** `v0/fecuoy192837-*` (تُولَّد تلقائياً من v0)
- **القاعدة:** لا commits مباشرة على `main`، فقط عبر PRs.
- لكل مهمة في خارطة الطريق: branch + PR منفصل.

---

## 11. نقاط تواصل / أسئلة مفتوحة

أسئلة يجب أن يحصل المبرمج على إجابات لها من صاحب المشروع قبل البدء:

1. **Auth:** هل نوحّد على Supabase أم نُبقي على Custom Admin؟
2. **AI Agents:** هل نُبقي على نظام Kimi أم ندمجه في Standard؟
3. **Firebase:** هل نُبقي عليه للإشعارات فقط أم نستبدله بـ Supabase Realtime + Web Push؟
4. **Migrations:** هل نتبنى Drizzle، أم نبقى على SQL خام مع أداة tracking بسيطة؟
5. **i18n:** المشروع عربي حالياً — هل سيدعم لغات أخرى لاحقاً؟ (يؤثر على بنية `lib/translations.ts`)

---

**نهاية الوثيقة.**
