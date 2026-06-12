/**
 * طبقة بحث عربية ذكية.
 *
 * المشكلة التي تحلّها: البحث الحرفي (ilike على الجملة كاملة) كان يفشل دائماً
 * لأنه يبحث عن النص الكامل للسؤال داخل الرسالة. هنا نقوم بـ:
 *  1) تطبيع الحروف العربية (إزالة التشكيل، توحيد الألف/الهمزة/الياء/التاء المربوطة).
 *  2) إزالة كلمات التوقف (stop words) التي لا تحمل معنى بحثياً.
 *  3) تفكيك الجملة إلى كلمات مفتاحية للبحث بـ OR بدل المطابقة الحرفية.
 *  4) توليد متغيرات إملائية لكل كلمة (همزات مختلفة) لرفع نسبة التطابق.
 *
 * كل هذا يعمل دون أي تعديل على قاعدة البيانات، ويحلّ السبب الجذري للبدائية.
 */

/** كلمات توقف عربية شائعة لا تفيد في البحث. */
const AR_STOP_WORDS = new Set([
  "في",
  "من",
  "على",
  "عن",
  "إلى",
  "الى",
  "مع",
  "هذا",
  "هذه",
  "ذلك",
  "التي",
  "الذي",
  "الذين",
  "ما",
  "ماذا",
  "ماذا؟",
  "كيف",
  "متى",
  "أين",
  "اين",
  "لماذا",
  "هل",
  "أو",
  "او",
  "ثم",
  "كل",
  "بعض",
  "قد",
  "كان",
  "كانت",
  "يكون",
  "أن",
  "ان",
  "إن",
  "أي",
  "اي",
  "عند",
  "لدى",
  "حول",
  "أهم",
  "اهم",
  "أكثر",
  "اكثر",
  "آخر",
  "اخر",
  "الأخيرة",
  "الاخيرة",
  "الأخير",
  "الاخير",
  "يوجد",
  "توجد",
  "إذا",
  "اذا",
  "ابحث",
  "إبحث",
  "ابحثي",
  "ابحث",
  "رسائلي",
  "رسائل",
  "رسالتي",
  "بحث",
  "اعطني",
  "أعطني",
  "أعطيني",
  "اريد",
  "أريد",
  "لخص",
  "لخّص",
  "اخبرني",
  "أخبرني",
])

/**
 * تطبيع نص عربي:
 * - إزالة التشكيل والتطويل.
 * - توحيد الهمزات (أ إ آ ء ئ ؤ) إلى ا/و/ي حسب السياق المبسّط.
 * - توحيد التاء المربوطة (ة) إلى هاء، والياء (ى) إلى ي.
 */
export function normalizeArabic(input: string): string {
  if (!input) return ""
  return (
    input
      .toString()
      // إزالة التشكيل (الفتحة، الضمة، الكسرة، الشدة، السكون، التنوين...)
      .replace(/[\u064B-\u065F\u0670]/g, "")
      // إزالة التطويل (ـ)
      .replace(/\u0640/g, "")
      // توحيد الألف بأنواعها
      .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
      // الهمزة على الواو/الياء/المفردة
      .replace(/[\u0624]/g, "\u0648")
      .replace(/[\u0626]/g, "\u064A")
      .replace(/[\u0621]/g, "")
      // الألف المقصورة → ياء
      .replace(/\u0649/g, "\u064A")
      // التاء المربوطة → هاء
      .replace(/\u0629/g, "\u0647")
      .toLowerCase()
      .trim()
  )
}

/**
 * استخراج الكلمات المفتاحية من جملة بحث:
 * - تطبيع.
 * - تقسيم على المسافات وعلامات الترقيم.
 * - إزالة كلمات التوقف والكلمات القصيرة جداً.
 * يعيد مصفوفة كلمات فريدة. إن لم يتبقَّ شيء (سؤال كله كلمات توقف)
 * يعيد الكلمات الأصلية المطبّعة كحلّ أخير.
 */
export function extractKeywords(query: string): string[] {
  const normalized = normalizeArabic(query)
  const rawTokens = normalized
    .split(/[\s،.؟?!"'«»()\-_/\\]+/u)
    .map((t) => t.trim())
    .filter(Boolean)

  const meaningful = rawTokens.filter((t) => t.length >= 2 && !AR_STOP_WORDS.has(t) && !AR_STOP_WORDS.has(normalizeArabic(t)))

  const source = meaningful.length > 0 ? meaningful : rawTokens.filter((t) => t.length >= 2)
  // إزالة التكرار مع الحفاظ على الترتيب
  return Array.from(new Set(source)).slice(0, 8)
}

/**
 * هل النص (بعد تطبيعه) يطابق أياً من الكلمات المفتاحية؟
 * يُستخدم لإعادة الترتيب/التصفية على جانب التطبيق بعد جلب مرشحين من القاعدة.
 */
export function matchesKeywords(content: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const normalizedContent = normalizeArabic(content)
  return keywords.some((kw) => normalizedContent.includes(kw))
}

/**
 * عدد الكلمات المفتاحية المطابِقة في النص — لاستخدامه في ترتيب النتائج
 * من الأكثر صلة إلى الأقل.
 */
export function relevanceScore(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0
  const normalizedContent = normalizeArabic(content)
  return keywords.reduce((score, kw) => (normalizedContent.includes(kw) ? score + 1 : score), 0)
}
