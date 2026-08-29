import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { QC_CHOICES } from "@/lib/constants";
import { aiQuizSchema, type AiQuiz } from "@/lib/validation";
import type { Difficulty } from "@/lib/types";

/* ---------------------------------------------------------------------------
   تكامل Claude — يعمل على الخادم حصرًا.
   المفتاح ANTHROPIC_API_KEY لا يُقرأ إلا هنا، ولا يصل إلى المتصفح أبدًا.
--------------------------------------------------------------------------- */

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "مفتاح ANTHROPIC_API_KEY غير موجود. أضفه إلى ملف .env.local ثم أعد تشغيل الخادم.",
    );
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

/** مخطط JSON الصارم الذي يجب أن يلتزم به النموذج حرفيًا. */
const QUIZ_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "questions"],
  properties: {
    title: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "question",
          "question_type",
          "choices",
          "correct_answer",
          "explanation",
          "difficulty",
          "related_topic",
        ],
        properties: {
          question: { type: "string" },
          question_type: {
            type: "string",
            enum: [
              "multiple_choice",
              "quantitative_comparison",
              "true_false",
              "short_answer",
            ],
          },
          choices: { type: "array", items: { type: "string" } },
          correct_answer: { type: "string" },
          explanation: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          related_topic: { type: "string" },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `أنت مساعد للمدربة «أم هشام»، وهي مدربة سعودية لديها أكثر من عشرين عامًا من الخبرة في تأسيس طلاب اختباري القدرات العامة والتحصيلي.

مهمتك: قراءة صفحات المحاضرة المرفقة، ثم تأليف أسئلة تدريبية عربية **أصلية تمامًا**.

قواعد ملزمة:

١. الأصالة — هذه أهم قاعدة على الإطلاق:
   • لا تنسخ أي سؤال موجود في الصفحات المرفقة، ولا تعِد صياغته بتغيير كلمة أو رقم.
   • لا تقتبس جملًا حرفية من الملف.
   • استخرج **المفهوم** أو **القاعدة** من الصفحات، ثم ابنِ عليها سؤالًا جديدًا بأرقام وسياق مختلفين.
   • إن كان في الصفحات مثال محلول، فالسؤال الذي تكتبه يجب أن يختلف عنه في المعطيات وطريقة الطرح.

٢. الالتزام بالمحتوى:
   • لا تسأل عن أي فكرة غير موجودة في الصفحات المرفقة.
   • إن كانت الصفحات صورًا ممسوحة ضوئيًا، اقرأها بصريًا واستخرج المفاهيم منها.
   • إن تعذّرت قراءة الصفحات أو كانت خالية من محتوى تعليمي، أعِد مصفوفة أسئلة فارغة بدل اختلاق محتوى.

٣. اللغة والأسلوب:
   • عربية فصيحة واضحة، بأسلوب المدربة: هادئ، مباشر، محترم لعقل الطالب.
   • استخدم الأرقام الهندية (٠١٢٣٤٥٦٧٨٩) في نصوص الأسئلة والخيارات.
   • تجنّب الحشو والمقدمات الطويلة.

٤. الشرح (explanation) — هو أهم جزء في السؤال:
   • اشرح **لماذا** الإجابة صحيحة، خطوة بخطوة، لا أن تعلن الإجابة فقط.
   • حين يكون الخطأ شائعًا، نبّه إليه صراحة: «انتبه: كثير من الطلاب يخطئون هنا لأنهم…».
   • اجعل الشرح مفهومًا لطالب يرى الفكرة لأول مرة.

٥. أنواع الأسئلة:
   • multiple_choice — أربعة خيارات بالصيغة: "أ) …" و"ب) …" و"ج) …" و"د) …". يجب أن تكون المشتتات معقولة وناتجة عن أخطاء تفكير واقعية، لا خيارات عشوائية. الحقل correct_answer يساوي نص الخيار الصحيح كاملًا مع حرفه.
   • true_false — الحقل choices يساوي ["صح","خطأ"] بالضبط، و correct_answer إما "صح" أو "خطأ".
   • short_answer — الحقل choices مصفوفة فارغة []، و correct_answer إجابة قصيرة جدًا (رقم أو كلمة أو نسبة). لا تطلب إجابة مقالية.
   • quantitative_comparison — التزم بهذا القالب حرفيًا:
       - نص السؤال (question) يبدأ بالمعطيات إن وُجدت، ثم سطران بالضبط:
           القيمة الأولى: <التعبير الأول>
           القيمة الثانية: <التعبير الثاني>
       - الحقل choices يساوي بالضبط:
           ["${QC_CHOICES[0]}","${QC_CHOICES[1]}","${QC_CHOICES[2]}","${QC_CHOICES[3]}"]
       - الحقل correct_answer يساوي أحد هذه الخيارات الأربعة بنصه الكامل.
       - لا تستخدم "المعطيات غير كافية" إلا إذا كانت المقارنة تنقلب فعلًا باختلاف قيمة متغيّر (مثل إشارة عدد مجهول). إن كانت المقارنة محسومة رياضيًا فاختر الجواب المحسوم.

٦. الإخراج:
   • أعِد JSON صالحًا يطابق المخطط المطلوب تمامًا. لا نص قبله ولا بعده ولا تعليقات.
   • related_topic اسم الدرس أو الفكرة بالعربية (مثل: «التناسب العكسي»).`;

export interface GenerateParams {
  pdfBytes: Uint8Array;
  courseTitle: string;
  scopeLabel: string;
  questionCount: number;
  difficulty: Difficulty;
  questionType:
    | "multiple_choice"
    | "quantitative_comparison"
    | "true_false"
    | "short_answer"
    | "mixed";
  notes?: string;
}

const TYPE_INSTRUCTION: Record<GenerateParams["questionType"], string> = {
  multiple_choice: "اجعل كل الأسئلة من نوع multiple_choice.",
  quantitative_comparison:
    "اجعل كل الأسئلة من نوع quantitative_comparison بالقالب المحدد أعلاه.",
  true_false: "اجعل كل الأسئلة من نوع true_false.",
  short_answer: "اجعل كل الأسئلة من نوع short_answer.",
  mixed:
    "نوّع بين الأنواع الأربعة بحيث لا يقل كل نوع مناسب للمحتوى عن سؤال واحد، مع ترجيح الاختيار من متعدد.",
};

const DIFFICULTY_INSTRUCTION: Record<Difficulty, string> = {
  easy: "اجعل مستوى كل الأسئلة سهلًا (difficulty = easy): تطبيق مباشر للقاعدة بخطوة واحدة.",
  medium:
    "اجعل مستوى كل الأسئلة متوسطًا (difficulty = medium): خطوتان أو ثلاث خطوات للحل.",
  hard: "اجعل مستوى كل الأسئلة صعبًا (difficulty = hard): يتطلب ربط أكثر من فكرة أو الانتباه لفخ شائع.",
  mixed:
    "وزّع المستويات: نحو ثلث سهل، وثلث متوسط، وثلث صعب، ورتّبها تصاعديًا من الأسهل إلى الأصعب.",
};

/**
 * يولّد اختبارًا من صفحات PDF محددة.
 *
 * الملف يُرسل بصيغة document/base64 وليس نصًا مستخرجًا، لأن ملفات المدربة
 * صور ممسوحة ضوئيًا بلا طبقة نص — والنموذج يقرأ الصفحات بصريًا.
 */
export async function generateQuizFromPdf(
  params: GenerateParams,
): Promise<AiQuiz> {
  const {
    pdfBytes,
    courseTitle,
    scopeLabel,
    questionCount,
    difficulty,
    questionType,
    notes,
  } = params;

  const base64 = Buffer.from(pdfBytes).toString("base64");

  const userInstruction = [
    `الملف: ${courseTitle}`,
    `النطاق المطلوب: ${scopeLabel}`,
    "",
    `اقرأ الصفحات المرفقة، ثم ألّف ${questionCount} سؤالًا أصليًا مبنيًا على مفاهيمها.`,
    DIFFICULTY_INSTRUCTION[difficulty],
    TYPE_INSTRUCTION[questionType],
    notes ? `\nملاحظات إضافية من المدربة:\n${notes}` : "",
    "",
    `اجعل عنوان الاختبار (title) عربيًا قصيرًا يصف موضوع الصفحات، لا اسم الملف.`,
    `أعِد ${questionCount} سؤالًا بالضبط، ما لم تكن الصفحات لا تكفي — عندها أعِد ما تستطيع تأليفه بصدق.`,
  ]
    .filter(Boolean)
    .join("\n");

  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: QUIZ_JSON_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: userInstruction },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      "رفض النموذج توليد الأسئلة لهذه الصفحات. جرّبي نطاقًا آخر من الملف.",
    );
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("لم يُرجع النموذج أي محتوى. حاولي مرة أخرى.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    // احتياط: التقاط أول كائن JSON داخل النص إن أضاف النموذج شيئًا حوله
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("رد النموذج لم يكن بصيغة JSON صالحة. أعيدي المحاولة.");
    }
    raw = JSON.parse(match[0]);
  }

  const parsed = aiQuizSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `رد النموذج لم يطابق الصيغة المطلوبة: ${parsed.error.issues[0]?.message ?? "خطأ في البنية"}`,
    );
  }

  if (parsed.data.questions.length === 0) {
    throw new Error(
      "لم يتمكن النموذج من استخراج محتوى تعليمي من هذه الصفحات. جرّبي نطاق صفحات آخر يحتوي على شرح ودروس.",
    );
  }

  return parsed.data;
}
