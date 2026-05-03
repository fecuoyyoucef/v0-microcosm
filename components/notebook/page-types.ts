import type { NotebookPageType } from "@/lib/types"

export interface PageTypeMeta {
  label: string
  description: string
  /** Tailwind classes for the icon container background tint */
  bgClass: string
  /** Tailwind classes for the icon foreground color */
  fgClass: string
  /** Tailwind classes for the colored ring used on selected sidebar item */
  ringClass: string
  /** Hex/oklch token name used for subtle accents */
  accent: "primary" | "accent" | "success"
}

export const PAGE_TYPE_META: Record<Exclude<NotebookPageType, "canvas">, PageTypeMeta> = {
  text: {
    label: "صفحة نصية",
    description: "أفكار وملاحظات نصية تُكتب بشكل تعاوني",
    bgClass: "bg-primary/10",
    fgClass: "text-primary",
    ringClass: "ring-primary/30",
    accent: "primary",
  },
  list: {
    label: "قائمة مهام",
    description: "عناصر قابلة للإنجاز مع تصويت جماعي",
    bgClass: "bg-success/10",
    fgClass: "text-success",
    ringClass: "ring-success/30",
    accent: "success",
  },
  table: {
    label: "جدول بيانات",
    description: "تنظيم البيانات في صفوف وأعمدة",
    bgClass: "bg-accent/15",
    fgClass: "text-accent-foreground",
    ringClass: "ring-accent/40",
    accent: "accent",
  },
  links: {
    label: "مجمّع روابط",
    description: "حفظ الروابط والمصادر المهمة",
    bgClass: "bg-primary/10",
    fgClass: "text-primary",
    ringClass: "ring-primary/30",
    accent: "primary",
  },
}
