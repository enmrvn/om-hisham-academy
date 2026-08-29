import { z } from "zod";
import { MAX_PAGES_PER_GENERATION, MAX_QUESTIONS_PER_QUIZ } from "@/lib/constants";

/* ---------------------------------------------------------------------------
   مخططات التحقق — تستخدم على الخادم والواجهة معًا.
   رسائل الخطأ بالعربية لتظهر مباشرة للمستخدم.
--------------------------------------------------------------------------- */

export const signUpSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(3, "الاسم قصير جدًا — اكتب اسمك الثلاثي.")
      .max(80, "الاسم طويل جدًا."),
    email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح."),
    phone: z
      .string()
      .trim()
      .regex(/^0?5\d{8}$/, "رقم الجوال يجب أن يبدأ بـ 05 ويتكوّن من ١٠ أرقام.")
      .or(z.literal("")),
    password: z
      .string()
      .min(8, "كلمة المرور يجب ألا تقل عن ٨ أحرف.")
      .max(72, "كلمة المرور طويلة جدًا."),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirm"],
  });

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("البريد الإلكتروني غير صحيح."),
  password: z.string().min(1, "أدخل كلمة المرور."),
});

export const courseSchema = z.object({
  title: z.string().trim().min(4, "عنوان الملف مطلوب.").max(160),
  description: z.string().trim().max(1200).optional().or(z.literal("")),
  category: z.enum(["qudurat", "tahsili"], {
    message: "اختر التصنيف: القدرات أو التحصيلي.",
  }),
  accent: z.enum(["navy", "teal", "lavender", "beige"]).default("navy"),
  is_published: z.boolean().default(true),
  lectures: z
    .array(
      z.object({
        title: z.string().trim().min(3, "عنوان المحاضرة مطلوب.").max(160),
        summary: z.string().trim().max(600).optional().or(z.literal("")),
        start_page: z.coerce.number().int().min(1).optional().nullable(),
        end_page: z.coerce.number().int().min(1).optional().nullable(),
      }),
    )
    .length(5, "كل ملف يجب أن يحتوي على خمس محاضرات."),
});

/** مدخلات نموذج «إنشاء اختبار ذكي». */
export const generateQuizSchema = z
  .object({
    course_id: z.string().uuid("اختر ملفًا."),
    // scope: whole | lecture | pages
    scope: z.enum(["whole", "lecture", "pages"]),
    lecture_id: z.string().uuid().optional().nullable(),
    start_page: z.coerce.number().int().min(1).optional().nullable(),
    end_page: z.coerce.number().int().min(1).optional().nullable(),
    question_count: z.coerce
      .number()
      .int()
      .min(3, "أقل عدد للأسئلة هو ٣.")
      .max(MAX_QUESTIONS_PER_QUIZ, `أقصى عدد للأسئلة هو ${MAX_QUESTIONS_PER_QUIZ}.`),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
    question_type: z.enum([
      "multiple_choice",
      "quantitative_comparison",
      "true_false",
      "short_answer",
      "mixed",
    ]),
    time_limit_minutes: z.coerce
      .number()
      .int()
      .min(1)
      .max(180)
      .optional()
      .nullable(),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    if (d.scope === "lecture" && !d.lecture_id) {
      ctx.addIssue({
        code: "custom",
        path: ["lecture_id"],
        message: "اختاري المحاضرة المطلوبة.",
      });
    }
    if (d.scope === "pages") {
      if (!d.start_page || !d.end_page) {
        ctx.addIssue({
          code: "custom",
          path: ["start_page"],
          message: "حددي صفحة البداية وصفحة النهاية.",
        });
      } else if (d.end_page < d.start_page) {
        ctx.addIssue({
          code: "custom",
          path: ["end_page"],
          message: "صفحة النهاية يجب أن تكون بعد صفحة البداية.",
        });
      } else if (d.end_page - d.start_page + 1 > MAX_PAGES_PER_GENERATION) {
        ctx.addIssue({
          code: "custom",
          path: ["end_page"],
          message: `أقصى نطاق في المرة الواحدة ${MAX_PAGES_PER_GENERATION} صفحة. قسّمي النطاق على أكثر من اختبار.`,
        });
      }
    }
  });

export type GenerateQuizInput = z.infer<typeof generateQuizSchema>;

/** شكل السؤال الذي يعيده Claude — يُطابق العقد المتفق عليه حرفيًا. */
export const aiQuestionSchema = z.object({
  question: z.string().min(1),
  question_type: z.enum([
    "multiple_choice",
    "quantitative_comparison",
    "true_false",
    "short_answer",
  ]),
  choices: z.array(z.string()).default([]),
  correct_answer: z.string().min(1),
  explanation: z.string().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]),
  related_topic: z.string().default(""),
});

export const aiQuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(aiQuestionSchema).min(1),
});

export type AiQuestion = z.infer<typeof aiQuestionSchema>;
export type AiQuiz = z.infer<typeof aiQuizSchema>;

/** سؤال أثناء التحرير في لوحة المدربة (قبل الحفظ). */
export const editableQuestionSchema = z.object({
  question: z.string().trim().min(5, "نص السؤال مطلوب."),
  question_type: z.enum([
    "multiple_choice",
    "quantitative_comparison",
    "true_false",
    "short_answer",
  ]),
  choices: z.array(z.string().trim()),
  correct_answer: z.string().trim().min(1, "حددي الإجابة الصحيحة."),
  explanation: z.string().trim().min(1, "الشرح مطلوب — هو أهم ما يستفيد منه الطالب."),
  difficulty: z.enum(["easy", "medium", "hard"]),
  related_topic: z.string().trim().default(""),
});

export const saveQuizSchema = z.object({
  quiz_id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid().nullable(),
  lecture_id: z.string().uuid().nullable(),
  title: z.string().trim().min(4, "عنوان الاختبار مطلوب."),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  time_limit_minutes: z.coerce.number().int().min(1).max(180).nullable(),
  is_published: z.boolean(),
  source: z.enum(["manual", "ai"]),
  questions: z.array(editableQuestionSchema).min(1, "أضيفي سؤالًا واحدًا على الأقل."),
});

export type SaveQuizInput = z.infer<typeof saveQuizSchema>;

/** يحوّل أخطاء zod إلى خريطة { اسم الحقل: رسالة } لعرضها في النموذج. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
