"use client"

// Arabic translations
export const translations = {
  ar: {
    goTo: "انتقل إلى",
    home: "الرئيسية",
    notifications: "الإشعارات",
    assistant: "المساعد الذكي",
    achievements: "الإنجازات",
    cells: "الخلايا",
    noCells: "لا توجد خلايا",
    newCell: "خلية جديدة",
    joinByInvite: "الانضمام عبر رابط الدعوة",
    admin: "الإدارة",
    settings: "الإعدادات",
    help: "المساعدة",
    signOut: "تسجيل الخروج",
    searchPlaceholder: "ابحث...",
    noResults: "لم يتم العثور على نتائج",
    invalidInviteLink: "رابط دعوة غير صحيح",
    joining: "جاري الانضمام...",
    join: "انضم",
    joinByInviteDescription: "الصق رابط الدعوة الذي تلقيته",
    inviteLinkPlaceholder: "الصق رابط الدعوة هنا",
  },
}

export function useTranslations() {
  return {
    t: translations.ar,
  }
}
