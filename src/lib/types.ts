// أنواع قاعدة البيانات المشتركة بين الخادم والواجهة.

export type UserRole = "student" | "admin";
export type CourseCategory = "qudurat" | "tahsili";
export type Difficulty = "easy" | "medium" | "hard" | "mixed";
export type QuizSource = "manual" | "ai";
export type QuestionType =
  | "multiple_choice"
  | "quantitative_comparison"
  | "true_false"
  | "short_answer";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  grade_level: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: CourseCategory;
  pdf_path: string | null;
  page_count: number | null;
  lecture_count: number;
  accent: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

export interface Lecture {
  id: string;
  course_id: string;
  lecture_number: number;
  title: string;
  summary: string | null;
  start_page: number | null;
  end_page: number | null;
}

export interface Quiz {
  id: string;
  course_id: string | null;
  lecture_id: string | null;
  title: string;
  description: string | null;
  difficulty: Difficulty;
  time_limit_minutes: number | null;
  source: QuizSource;
  is_published: boolean;
  generation_meta: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  position: number;
  question: string;
  question_type: QuestionType;
  choices: string[];
  correct_answer: string;
  explanation: string | null;
  difficulty: Difficulty;
  related_topic: string | null;
  value_one: string | null;
  value_two: string | null;
}

/** نسخة السؤال التي تُرسل إلى الطالب — بلا إجابة ولا شرح. */
export type PublicQuestion = Omit<
  QuizQuestion,
  "correct_answer" | "explanation" | "quiz_id"
>;

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  course_id: string | null;
  score: number;
  correct_count: number;
  total_count: number;
  duration_seconds: number | null;
  answers: AttemptAnswer[];
  completed_at: string;
}

export interface AttemptAnswer {
  question_id: string;
  answer: string;
  is_correct: boolean;
}

export interface StudentProgress {
  id: string;
  student_id: string;
  course_id: string;
  lecture_id: string;
  is_completed: boolean;
  last_viewed_at: string;
}

export interface CourseProgress {
  student_id: string;
  course_id: string;
  completed_lectures: number;
  total_lectures: number;
  progress_percent: number;
  last_viewed_at: string;
}

/** نتيجة التصحيح المرسلة للطالب بعد التسليم. */
export interface GradedQuestion {
  question_id: string;
  question: string;
  question_type: QuestionType;
  choices: string[];
  value_one: string | null;
  value_two: string | null;
  student_answer: string;
  correct_answer: string;
  explanation: string | null;
  related_topic: string | null;
  is_correct: boolean;
}

export interface QuizResult {
  attempt_id: string | null;
  score: number;
  correct_count: number;
  total_count: number;
  best_score: number | null;
  questions: GradedQuestion[];
}

/** سؤال قيد التحرير في لوحة المدربة (قبل الحفظ في قاعدة البيانات). */
export interface EditableQuestion {
  /** معرّف محلي مؤقّت للسحب والترتيب — ليس معرّف قاعدة بيانات. */
  key: string;
  question: string;
  question_type: QuestionType;
  choices: string[];
  correct_answer: string;
  explanation: string;
  difficulty: Exclude<Difficulty, "mixed">;
  related_topic: string;
}

/** استجابة مسار التوليد الذكي. */
export interface GenerationResult {
  title: string;
  questions: Omit<EditableQuestion, "key">[];
  meta: {
    course_id: string;
    lecture_id: string | null;
    scope: "whole" | "lecture" | "pages";
    scope_label: string;
    pages_from: number;
    pages_to: number;
    pages_sent: number;
    trimmed: boolean;
    model: string;
    requested_count: number;
    difficulty: Difficulty;
    question_type: string;
    time_limit_minutes: number | null;
    generated_at: string;
  };
}
