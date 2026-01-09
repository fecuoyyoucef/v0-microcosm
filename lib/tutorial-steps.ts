export type TutorialStep = {
  id: string
  title: string
  description: string
  targetSelector: string
  position?: "top" | "bottom" | "left" | "right"
  action?: string
  highlightPadding?: number
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "مرحباً بك في Synaptic Space",
    description: "تطبيق محادثة جماعية مبتكر يساعدك على التعاون مع فريقك بذكاء. دعنا نتعلم كيفية استخدامه!",
    targetSelector: "body",
    position: "bottom",
  },
  {
    id: "sidebar",
    title: "الشريط الجانبي",
    description: "هنا تجد جميع خياراتك: الصفحة الرئيسية، الإشعارات، المساعد الذكي، والإعدادات.",
    targetSelector: "aside",
    position: "right",
    highlightPadding: 10,
  },
  {
    id: "cells-section",
    title: "الخلايا",
    description: "كل خلية هي مساحة عمل منفصلة حيث يمكن لفريقك التعاون والنقاش. اضغط على خلية للدخول إليها.",
    targetSelector: "[data-tutorial='cells-section']",
    position: "right",
    highlightPadding: 8,
  },
  {
    id: "new-cell-button",
    title: "إنشاء خلية جديدة",
    description: "انقر هنا لإنشاء خلية جديدة. ستحتاج إلى إجابة بعض الأسئلة البسيطة.",
    targetSelector: "[data-tutorial='new-cell-button']",
    position: "right",
    highlightPadding: 6,
  },
  {
    id: "messages",
    title: "الرسائل",
    description: "أرسل رسائل، ناقش الأفكار، وشارك الملفات مع فريقك هنا.",
    targetSelector: "[data-tutorial='messages-area']",
    position: "left",
    highlightPadding: 10,
  },
  {
    id: "message-input",
    title: "حقل الإدخال",
    description: "اكتب رسالتك هنا واضغط Enter أو انقر زر الإرسال.",
    targetSelector: "[data-tutorial='message-input']",
    position: "top",
    highlightPadding: 8,
  },
  {
    id: "achievements",
    title: "الإنجازات والقرارات",
    description: "هنا يمكنك تتبع الإنجازات والقرارات المهمة التي تم اتخاذها في الخلية.",
    targetSelector: "[data-tutorial='achievements-tab']",
    position: "left",
    highlightPadding: 6,
  },
  {
    id: "assistant",
    title: "المساعد الذكي",
    description: "احصل على ملخصات ذكية واقتراحات من المساعد الذكي الذي يفهم محادثاتك.",
    targetSelector: "[data-tutorial='assistant-link']",
    position: "right",
    highlightPadding: 8,
  },
  {
    id: "complete",
    title: "تم! 🎉",
    description: "أنت الآن جاهز لاستخدام Synaptic Space. ابدأ بإنشاء خلية جديدة والتعاون مع فريقك!",
    targetSelector: "body",
    position: "bottom",
  },
]

export const getTutorialStep = (stepId: string): TutorialStep | undefined => {
  return TUTORIAL_STEPS.find((step) => step.id === stepId)
}
