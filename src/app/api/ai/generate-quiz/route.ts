import { NextResponse, type NextRequest } from "next/server";
import { generateQuizFromPdf } from "@/lib/anthropic";
import { MAX_PAGES_PER_GENERATION } from "@/lib/constants";
import { sampleRange, slicePdf } from "@/lib/pdf";
import { downloadPdf } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { extractComparisonValues } from "@/lib/grading";
import { fieldErrors, generateQuizSchema } from "@/lib/validation";

// التوليد قد يستغرق دقيقة أو أكثر مع ملفات ممسوحة ضوئيًا
export const maxDuration = 300;

/**
 * ★ مسار «إنشاء اختبار ذكي» — خادمي بالكامل.
 *
 * التسلسل:
 *   ١. التحقق أن الطالب المُرسِل هو المدربة (admin). غير ذلك ⟵ ٤٠٣.
 *   ٢. تحديد نطاق الصفحات المطلوب (الملف كله / محاضرة / نطاق يدوي).
 *   ٣. تنزيل الـ PDF من Supabase Storage بمفتاح الخدمة.
 *   ٤. قصّ **الصفحات المحددة فقط** بواسطة pdf-lib.
 *   ٥. إرسال الشريحة إلى Claude مع تعليمات صارمة بالأصالة.
 *   ٦. التحقق من الـ JSON العائد، ثم إعادته للمعاينة (بلا حفظ).
 *
 * 🔒 مفتاح Claude يُقرأ داخل الخادم فقط ولا يُرسل إلى المتصفح إطلاقًا.
 *    الأسئلة تُحفظ لاحقًا عبر إجراء منفصل بعد أن تراجعها المدربة وتعتمدها.
 */
export async function POST(request: NextRequest) {
  // ── ١) الصلاحية ────────────────────────────────────────────────────────
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 });
  }
  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "هذه الميزة متاحة للمدربة فقط." },
      { status: 403 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "مفتاح Claude غير مُعدّ. أضيفي ANTHROPIC_API_KEY إلى ملف .env.local ثم أعيدي تشغيل الخادم.",
      },
      { status: 500 },
    );
  }

  // ── ٢) التحقق من المدخلات ──────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const parsed = generateQuizSchema.safeParse(body);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return NextResponse.json(
      { error: Object.values(errors)[0] ?? "بيانات غير صحيحة.", errors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const admin = createAdminClient();

  // ── ٣) الملف والمحاضرة ─────────────────────────────────────────────────
  const { data: course } = await admin
    .from("courses")
    .select("id, title, pdf_path, page_count")
    .eq("id", input.course_id)
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: "الملف غير موجود." }, { status: 404 });
  }
  if (!course.pdf_path) {
    return NextResponse.json(
      {
        error:
          "لا يوجد ملف PDF مرفوع لهذا المقرر. ارفعيه أولًا من «إدارة الملفات» أو عبر أمر npm run upload:pdfs.",
      },
      { status: 400 },
    );
  }

  let scopeLabel = "الملف كامل";
  let from = 1;
  let to = course.page_count ?? MAX_PAGES_PER_GENERATION;
  let lectureId: string | null = null;

  if (input.scope === "lecture") {
    const { data: lecture } = await admin
      .from("lectures")
      .select("id, title, lecture_number, start_page, end_page")
      .eq("id", input.lecture_id!)
      .eq("course_id", course.id)
      .maybeSingle();

    if (!lecture) {
      return NextResponse.json(
        { error: "المحاضرة المختارة غير موجودة في هذا الملف." },
        { status: 404 },
      );
    }
    if (!lecture.start_page || !lecture.end_page) {
      return NextResponse.json(
        {
          error:
            "لم تُحدَّد صفحات هذه المحاضرة بعد. حدّديها من «إدارة الملفات ▸ تعديل» ثم أعيدي المحاولة.",
        },
        { status: 400 },
      );
    }

    lectureId = lecture.id;
    from = lecture.start_page;
    to = lecture.end_page;
    scopeLabel = `المحاضرة ${lecture.lecture_number}: ${lecture.title} (الصفحات ${from}–${to})`;
  } else if (input.scope === "pages") {
    from = input.start_page!;
    to = input.end_page!;
    scopeLabel = `الصفحات ${from}–${to}`;
  }

  // نافذة لا تتجاوز الحد الأقصى، وإلا تجاوزنا حجم الطلب المسموح
  const window = sampleRange(from, to, MAX_PAGES_PER_GENERATION);
  const trimmed = window.from !== from || window.to !== to;
  if (trimmed) {
    scopeLabel += ` — عيّنة من الصفحات ${window.from}–${window.to}`;
  }

  // ── ٤) تنزيل الملف وقصّ الصفحات ────────────────────────────────────────
  let sliced: Awaited<ReturnType<typeof slicePdf>>;
  try {
    const full = await downloadPdf(course.pdf_path);
    sliced = await slicePdf(full, window.from, window.to);
  } catch (err) {
    console.error("generate-quiz: قصّ الملف فشل:", err);
    return NextResponse.json(
      { error: "تعذّر قراءة ملف الـ PDF. تأكدي من رفعه بشكل صحيح." },
      { status: 500 },
    );
  }

  // حد Claude للطلب الواحد ٣٢ ميجابايت، وbase64 يضخّم الحجم نحو ٣٣٪
  const approxRequestMb = (sliced.bytes.byteLength * 1.34) / (1024 * 1024);
  if (approxRequestMb > 30) {
    return NextResponse.json(
      {
        error: `نطاق الصفحات كبير جدًا (${approxRequestMb.toFixed(1)} ميجابايت بعد التحويل). قلّصي النطاق إلى عدد أقل من الصفحات.`,
      },
      { status: 413 },
    );
  }

  // ── ٥) التوليد ─────────────────────────────────────────────────────────
  try {
    const quiz = await generateQuizFromPdf({
      pdfBytes: sliced.bytes,
      courseTitle: course.title,
      scopeLabel,
      questionCount: input.question_count,
      difficulty: input.difficulty,
      questionType: input.question_type,
      notes: input.notes || undefined,
    });

    // استخراج قيمتي المقارنة الكمية لعرضهما في صندوقين منفصلين
    const questions = quiz.questions.map((q) => {
      const values =
        q.question_type === "quantitative_comparison"
          ? extractComparisonValues(q.question)
          : null;
      return {
        ...q,
        value_one: values?.one ?? null,
        value_two: values?.two ?? null,
      };
    });

    return NextResponse.json({
      title: quiz.title,
      questions,
      meta: {
        course_id: course.id,
        lecture_id: lectureId,
        scope: input.scope,
        scope_label: scopeLabel,
        pages_from: window.from,
        pages_to: window.to,
        pages_sent: sliced.pageCount,
        trimmed,
        model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
        requested_count: input.question_count,
        difficulty: input.difficulty,
        question_type: input.question_type,
        time_limit_minutes: input.time_limit_minutes ?? null,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "تعذّر توليد الاختبار.";
    console.error("generate-quiz:", message);

    // أخطاء الاتصال الشائعة بصيغة مفهومة
    const friendly = /401|invalid.*api.?key|authentication/i.test(message)
      ? "مفتاح Claude غير صحيح أو منتهي. تحقّقي من ANTHROPIC_API_KEY."
      : /rate.?limit|429/i.test(message)
        ? "تم تجاوز حد الطلبات لدى Claude. انتظري دقيقة ثم أعيدي المحاولة."
        : /timeout|ETIMEDOUT|ECONNRESET/i.test(message)
          ? "انتهت مهلة الاتصال — النطاق ربما كبير. جرّبي عدد صفحات أقل."
          : message;

    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}
