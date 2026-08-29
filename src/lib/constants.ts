import type {
  CourseCategory,
  Difficulty,
  QuestionType,
} from "@/lib/types";

/** بيانات المدربة — تظهر في التذييل والصفحة الرئيسية. */
export const TUTOR = {
  name: "المدربة / أم هشام",
  shortName: "أم هشام",
  phone: "0531643142",
  whatsapp: "https://wa.me/966531643142",
  tagline: "مع أم هشام، نفهم الفكرة قبل أن نحل السؤال",
} as const;

export const CATEGORY_LABELS: Record<CourseCategory, string> = {
  qudurat: "القدرات",
  tahsili: "التحصيلي",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  mixed: "متنوع",
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "اختيار من متعدد",
  quantitative_comparison: "مقارنة كمية",
  true_false: "صح أو خطأ",
  short_answer: "إجابة قصيرة",
};

/** الخيارات الأربعة الثابتة لأسئلة المقارنة الكمية. */
export const QC_CHOICES = [
  "أ) القيمة الأولى أكبر",
  "ب) القيمة الثانية أكبر",
  "ج) القيمتان متساويتان",
  "د) المعطيات غير كافية",
] as const;

export const TRUE_FALSE_CHOICES = ["صح", "خطأ"] as const;

/** أقصى عدد صفحات يُرسل إلى Claude في طلب توليد واحد. */
export const MAX_PAGES_PER_GENERATION = 40;

/** أقصى عدد أسئلة في الاختبار الواحد. */
export const MAX_QUESTIONS_PER_QUIZ = 30;

/** ألوان بطاقات الملفات. */
export const ACCENTS: Record<
  string,
  { bar: string; chip: string; ring: string }
> = {
  navy: {
    bar: "bg-navy-600",
    chip: "bg-navy-100 text-navy-700",
    ring: "group-hover:border-navy-300",
  },
  teal: {
    bar: "bg-teal-500",
    chip: "bg-teal-100 text-teal-700",
    ring: "group-hover:border-teal-300",
  },
  lavender: {
    bar: "bg-lavender-500",
    chip: "bg-lavender-100 text-lavender-700",
    ring: "group-hover:border-lavender-300",
  },
  beige: {
    bar: "bg-beige-500",
    chip: "bg-beige-200 text-beige-800",
    ring: "group-hover:border-beige-400",
  },
};

export function accentOf(name: string | null | undefined) {
  return ACCENTS[name ?? "navy"] ?? ACCENTS.navy;
}
