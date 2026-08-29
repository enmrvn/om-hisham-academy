import { LinkButton, Card, SectionTitle, Badge } from "@/components/ui";
import CourseCard from "@/components/courses/CourseCard";
import { TUTOR } from "@/lib/constants";
import { getCourses, getMyProgressMap } from "@/lib/queries";
import { getProfile } from "@/lib/supabase/server";

const BENEFITS = [
  {
    title: "شرح مبسّط",
    body: "نفكّك الفكرة إلى أجزاء صغيرة، ونبني عليها خطوة بخطوة حتى تصبح بديهية.",
    icon: "◇",
    tone: "navy" as const,
  },
  {
    title: "محاضرات منظمة",
    body: "عشرون محاضرة مرتّبة بتسلسل مدروس، لا قفز ولا فجوات بين درس وآخر.",
    icon: "▤",
    tone: "teal" as const,
  },
  {
    title: "تدريبات متنوعة",
    body: "اختيار من متعدد، مقارنات كمية، صح وخطأ، وإجابات قصيرة تشبه الاختبار الحقيقي.",
    icon: "✎",
    tone: "lavender" as const,
  },
  {
    title: "اختبارات إلكترونية",
    body: "تصحيح فوري وشرح مكتوب لكل سؤال — لماذا هذه الإجابة، ولماذا ليست تلك.",
    icon: "◉",
    tone: "beige" as const,
  },
  {
    title: "متابعة للتقدّم",
    body: "ترى نسبة إنجازك في كل ملف، وأفضل درجاتك، وما ينبغي أن تراجعه تاليًا.",
    icon: "↗",
    tone: "teal" as const,
  },
];

const iconTones = {
  navy: "bg-navy-100 text-navy-700",
  teal: "bg-teal-100 text-teal-700",
  lavender: "bg-lavender-100 text-lavender-700",
  beige: "bg-beige-200 text-beige-800",
};

export default async function HomePage() {
  const [courses, progress, profile] = await Promise.all([
    getCourses(),
    getMyProgressMap(),
    getProfile(),
  ]);

  return (
    <>
      {/* ── القسم الافتتاحي ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-navy-100 bg-gradient-to-b from-white via-beige-50 to-beige-50">
        {/* زخرفة هادئة جدًا */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-lavender-100/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-teal-100/50 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center animate-rise">
            <Badge tone="lavender" className="mb-6">
              أكثر من ٢٠ عامًا في تأسيس طلاب القدرات والتحصيلي
            </Badge>

            <h1 className="text-3xl font-extrabold leading-[1.6] text-navy-900 sm:text-4xl md:text-[2.75rem]">
              «{TUTOR.tagline}»
            </h1>

            <p className="prose-arabic mx-auto mt-7 max-w-2xl">
              اختبارا <strong>القدرات</strong> و<strong>التحصيلي</strong> لا يقيسان
              حفظك، بل يقيسان طريقة تفكيرك تحت الوقت. لذلك نبدأ هنا من الفكرة
              نفسها: نفهم لماذا تعمل القاعدة، ثم نتدرّب عليها بأسئلة متدرّجة، ثم
              نقيس مستوانا باختبارات إلكترونية تُصحَّح فورًا وتشرح لك كل إجابة.
              التأسيس أولًا، والسرعة تأتي بعده وحدها.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href={profile ? "/dashboard" : "/signup"} size="lg">
                ابدأ التعلم
              </LinkButton>
              <LinkButton href="/courses" variant="soft" size="lg">
                استعرض الملفات
              </LinkButton>
              <LinkButton href="/quizzes" variant="ghost" size="lg">
                اختبر نفسك
              </LinkButton>
            </div>

            <p className="mt-8 text-sm text-navy-400">
              {TUTOR.name} · <span dir="ltr">{TUTOR.phone}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── ماذا تجد هنا ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionTitle
          centered
          eyebrow="ماذا تجد في المنصة"
          title="خمسة أشياء تصنع الفرق"
          description="كل عنصر هنا موجود لسبب واحد: أن تدخل قاعة الاختبار وأنت مطمئن."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="transition-shadow hover:shadow-md">
              <div
                aria-hidden
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-lg ${iconTones[b.tone]}`}
              >
                {b.icon}
              </div>
              <h3 className="mb-2 text-lg font-bold text-navy-900">{b.title}</h3>
              <p className="text-sm leading-7 text-navy-500">{b.body}</p>
            </Card>
          ))}

          <Card className="flex flex-col justify-center bg-navy-700 text-white">
            <p className="text-sm leading-8 text-navy-100">
              كل ما سبق مجتمعًا في مسار واحد واضح، تبدأه اليوم وتتابعه بالترتيب.
            </p>
            <LinkButton
              href="/courses"
              size="sm"
              variant="inverse"
              className="mt-5 w-fit"
            >
              ابدأ من الملف الأول
            </LinkButton>
          </Card>
        </div>
      </section>

      {/* ── الملفات ────────────────────────────────────────────────────── */}
      <section className="border-y border-navy-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionTitle
            eyebrow="المحتوى التعليمي"
            title="ملفات المحاضرات"
            description="عشرون محاضرة موزّعة على أربعة ملفات، مرتّبة من الأسهل إلى الأصعب. ابدأ بالملف الأول ولا تتجاوزه."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={progress[course.id]?.progress_percent ?? 0}
                isAuthed={!!profile}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <LinkButton href="/courses" variant="ghost">
              عرض كل الملفات مع خيارات التصفية
            </LinkButton>
          </div>
        </div>
      </section>

      {/* ── رسالة طمأنة ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 py-20">
        <div className="surface-card overflow-hidden p-0">
          <div className="h-1.5 w-full bg-gradient-to-l from-teal-400 via-lavender-400 to-navy-500" />
          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-navy-900">
              إن كنت تظن أنك «ضعيف في الرياضيات» — اقرأ هذا أولًا
            </h2>

            <div className="prose-arabic mt-6 space-y-5">
              <p>
                في عشرين عامًا من التدريس، لم أقابل طالبًا واحدًا عاجزًا عن فهم
                القدرات. قابلت طلابًا بدأوا من نقطة متأخرة، وقابلت طلابًا فاتهم
                أساس صغير في الصف السادس فبنوا فوقه سنوات من الحيرة. الفرق بين
                الطالب الذي يرتفع مستواه والطالب الذي يبقى في مكانه ليس الذكاء،
                بل أن يعود خطوة إلى الوراء ويصلح الأساس بدل أن يحفظ حلولًا لا
                يفهمها.
              </p>
              <p>
                لن أطلب منك أن تحل مئة سؤال في اليوم. سأطلب منك شيئًا واحدًا:
                <strong> لا تنتقل من فكرة حتى تشعر أنك تستطيع شرحها لغيرك</strong>.
                إن أخطأت في سؤال فهذه فرصة لا خسارة؛ اقرأ الشرح، افهم أين انحرف
                تفكيرك، ثم أعد المحاولة. الدرجة سترتفع وحدها.
              </p>
              <p>
                خذ وقتك، وكن صبورًا مع نفسك. أنا معك في كل محاضرة، وإن استعصى
                عليك شيء فتواصل معي مباشرة.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-navy-100 pt-6">
              <div className="flex-1">
                <p className="font-bold text-navy-900">{TUTOR.name}</p>
                <a
                  href={`tel:${TUTOR.phone}`}
                  dir="ltr"
                  className="text-sm text-navy-500 hover:text-teal-600"
                >
                  {TUTOR.phone}
                </a>
              </div>
              <LinkButton href={profile ? "/courses" : "/signup"} variant="secondary">
                {profile ? "تابع من حيث توقفت" : "أنشئ حسابك الآن"}
              </LinkButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
