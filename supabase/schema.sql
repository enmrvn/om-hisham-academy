-- ===========================================================================
-- منصة المدربة أم هشام — مخطط قاعدة البيانات
-- ---------------------------------------------------------------------------
-- شغّل هذا الملف بالكامل مرة واحدة في:
--   Supabase Dashboard ▸ SQL Editor ▸ New query ▸ الصق ▸ Run
--
-- الملف آمن لإعادة التشغيل (idempotent): يستخدم IF NOT EXISTS و DROP POLICY IF EXISTS.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 0) أنواع مخصّصة
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role       as enum ('student', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.course_category as enum ('qudurat', 'tahsili');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.difficulty      as enum ('easy', 'medium', 'hard', 'mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_type   as enum (
    'multiple_choice',
    'quantitative_comparison',
    'true_false',
    'short_answer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quiz_source     as enum ('manual', 'ai');
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------------
-- 1) profiles — ملف الطالب / المدربة
--    مرتبط واحدًا لواحد بـ auth.users، ويُنشأ تلقائيًا عبر trigger.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        public.user_role not null default 'student',
  grade_level text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- 2) courses — الملفات / المقررات (كل ملف PDF = مقرر)
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  description    text,
  category       public.course_category not null default 'qudurat',
  -- مسار الملف داخل Supabase Storage (bucket: course-files)
  pdf_path       text,
  page_count     integer,
  lecture_count  integer not null default 5,
  -- لون البطاقة: navy | teal | lavender | beige
  accent         text not null default 'navy',
  sort_order     integer not null default 0,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists courses_category_idx on public.courses (category);
create index if not exists courses_sort_idx     on public.courses (sort_order);


-- ---------------------------------------------------------------------------
-- 3) lectures — المحاضرات (خمس محاضرات لكل ملف)
--    start_page / end_page تحدد نطاق الصفحات داخل ملف الـ PDF،
--    وتستخدمها ميزة «إنشاء اختبار ذكي» لقص الصفحات المطلوبة فقط.
-- ---------------------------------------------------------------------------
create table if not exists public.lectures (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  lecture_number integer not null,
  title          text not null,
  summary        text,
  start_page     integer,
  end_page       integer,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (course_id, lecture_number)
);

create index if not exists lectures_course_idx on public.lectures (course_id, lecture_number);


-- ---------------------------------------------------------------------------
-- 4) quizzes — الاختبارات (يدوية أو مولّدة بالذكاء الاصطناعي)
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid references public.courses  (id) on delete cascade,
  lecture_id         uuid references public.lectures (id) on delete set null,
  title              text not null,
  description        text,
  difficulty         public.difficulty not null default 'mixed',
  time_limit_minutes integer,
  source             public.quiz_source not null default 'manual',
  is_published       boolean not null default false,
  -- بيانات التوليد (نطاق الصفحات، النموذج المستخدم…) لأغراض المراجعة
  generation_meta    jsonb not null default '{}'::jsonb,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists quizzes_course_idx    on public.quizzes (course_id);
create index if not exists quizzes_lecture_idx   on public.quizzes (lecture_id);
create index if not exists quizzes_published_idx on public.quizzes (is_published);


-- ---------------------------------------------------------------------------
-- 5) quiz_questions — أسئلة الاختبار
--    ⚠️ ملاحظة أمنية: سياسات RLS تمنع الطلاب من قراءة هذا الجدول مباشرة،
--    لأنه يحتوي على الإجابة الصحيحة. الطلاب يحصلون على الأسئلة عبر
--    مسار خادمي (/api/quizzes/[id]/questions) يحذف الإجابات قبل الإرسال.
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes (id) on delete cascade,
  position       integer not null default 0,
  question       text not null,
  question_type  public.question_type not null default 'multiple_choice',
  -- مصفوفة نصية: ["أ) …","ب) …","ج) …","د) …"]
  choices        jsonb not null default '[]'::jsonb,
  correct_answer text not null,
  explanation    text,
  difficulty     public.difficulty not null default 'medium',
  related_topic  text,
  -- خاصة بأسئلة المقارنة الكمية (تُستخرج من نص السؤال عند التوليد)
  value_one      text,
  value_two      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);


-- ---------------------------------------------------------------------------
-- 6) quiz_attempts — محاولات الطلاب
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  quiz_id          uuid not null references public.quizzes  (id) on delete cascade,
  student_id       uuid not null references public.profiles (id) on delete cascade,
  course_id        uuid references public.courses (id) on delete set null,
  score            numeric(5,2) not null default 0,   -- نسبة مئوية 0–100
  correct_count    integer not null default 0,
  total_count      integer not null default 0,
  duration_seconds integer,
  -- [{ question_id, answer, is_correct }]
  answers          jsonb not null default '[]'::jsonb,
  completed_at     timestamptz not null default now()
);

create index if not exists attempts_student_idx on public.quiz_attempts (student_id, completed_at desc);
create index if not exists attempts_quiz_idx    on public.quiz_attempts (quiz_id);


-- ---------------------------------------------------------------------------
-- 7) student_progress — تقدّم الطالب على مستوى المحاضرة
--    نسبة تقدّم الملف تُحسب = عدد المحاضرات المكتملة ÷ عدد محاضرات الملف
-- ---------------------------------------------------------------------------
create table if not exists public.student_progress (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles (id) on delete cascade,
  course_id      uuid not null references public.courses  (id) on delete cascade,
  lecture_id     uuid not null references public.lectures (id) on delete cascade,
  is_completed   boolean not null default false,
  last_viewed_at timestamptz not null default now(),
  unique (student_id, lecture_id)
);

create index if not exists progress_student_idx on public.student_progress (student_id, last_viewed_at desc);
create index if not exists progress_course_idx  on public.student_progress (student_id, course_id);


-- ---------------------------------------------------------------------------
-- 8) دوال مساعدة
-- ---------------------------------------------------------------------------

-- جدول إعدادات بسيط (يخزّن بريد المدربة لترقيتها تلقائيًا عند التسجيل)
create table if not exists public.app_settings (
  key   text primary key,
  value text
);

-- هل المستخدم الحالي مدربة (admin)؟
-- security definer لتفادي التكرار اللانهائي في سياسات جدول profiles.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- إنشاء ملف تعريف تلقائيًا عند تسجيل مستخدم جديد.
-- إذا كان البريد مطابقًا لـ ADMIN_EMAIL المخزّن في app_settings يصبح admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_email text;
begin
  select value into admin_email from public.app_settings where key = 'admin_email';

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case
      when admin_email is not null
       and lower(new.email) = lower(admin_email) then 'admin'::public.user_role
      else 'student'::public.user_role
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- تحديث updated_at تلقائيًا
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','courses','lectures','quizzes','quiz_questions']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;


-- ---------------------------------------------------------------------------
-- 9) عرض مجمّع لتقدّم الطالب في كل ملف
-- ---------------------------------------------------------------------------
create or replace view public.course_progress_view
with (security_invoker = true) as
select
  sp.student_id,
  sp.course_id,
  count(*) filter (where sp.is_completed)              as completed_lectures,
  c.lecture_count                                       as total_lectures,
  least(100, round(
    (count(*) filter (where sp.is_completed))::numeric
      / greatest(c.lecture_count, 1) * 100
  ))::int                                               as progress_percent,
  max(sp.last_viewed_at)                                as last_viewed_at
from public.student_progress sp
join public.courses c on c.id = sp.course_id
group by sp.student_id, sp.course_id, c.lecture_count;


-- ===========================================================================
-- 10) Row Level Security
-- ===========================================================================
alter table public.profiles         enable row level security;
alter table public.courses          enable row level security;
alter table public.lectures         enable row level security;
alter table public.quizzes          enable row level security;
alter table public.quiz_questions   enable row level security;
alter table public.quiz_attempts    enable row level security;
alter table public.student_progress enable row level security;
alter table public.app_settings     enable row level security;

-- ── profiles ───────────────────────────────────────────────────────────────
drop policy if exists profiles_select_own    on public.profiles;
drop policy if exists profiles_select_admin  on public.profiles;
drop policy if exists profiles_update_own    on public.profiles;
drop policy if exists profiles_insert_own    on public.profiles;
drop policy if exists profiles_update_admin  on public.profiles;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());

-- الطالب يعدّل بياناته لكن لا يستطيع ترقية نفسه إلى admin
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'student');

create policy profiles_update_admin on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ── courses ────────────────────────────────────────────────────────────────
drop policy if exists courses_select_all   on public.courses;
drop policy if exists courses_write_admin  on public.courses;

create policy courses_select_all on public.courses
  for select using (is_published or public.is_admin());

create policy courses_write_admin on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- ── lectures ───────────────────────────────────────────────────────────────
drop policy if exists lectures_select_all  on public.lectures;
drop policy if exists lectures_write_admin on public.lectures;

create policy lectures_select_all on public.lectures
  for select using (
    public.is_admin() or exists (
      select 1 from public.courses c
      where c.id = lectures.course_id and c.is_published
    )
  );

create policy lectures_write_admin on public.lectures
  for all using (public.is_admin()) with check (public.is_admin());

-- ── quizzes ────────────────────────────────────────────────────────────────
drop policy if exists quizzes_select_published on public.quizzes;
drop policy if exists quizzes_write_admin      on public.quizzes;

create policy quizzes_select_published on public.quizzes
  for select using (is_published or public.is_admin());

create policy quizzes_write_admin on public.quizzes
  for all using (public.is_admin()) with check (public.is_admin());

-- ── quiz_questions ─────────────────────────────────────────────────────────
-- 🔒 المدربة فقط. الطلاب لا يقرؤون هذا الجدول إطلاقًا بمفتاح المتصفح،
--    لأنه يحتوي على correct_answer. تصل إليهم الأسئلة عبر مسار خادمي منقّح.
drop policy if exists questions_admin_only on public.quiz_questions;

create policy questions_admin_only on public.quiz_questions
  for all using (public.is_admin()) with check (public.is_admin());

-- ── quiz_attempts ──────────────────────────────────────────────────────────
drop policy if exists attempts_select_own   on public.quiz_attempts;
drop policy if exists attempts_insert_own   on public.quiz_attempts;
drop policy if exists attempts_select_admin on public.quiz_attempts;

create policy attempts_select_own on public.quiz_attempts
  for select using (student_id = auth.uid());

create policy attempts_insert_own on public.quiz_attempts
  for insert with check (student_id = auth.uid());

create policy attempts_select_admin on public.quiz_attempts
  for select using (public.is_admin());

-- ── student_progress ───────────────────────────────────────────────────────
drop policy if exists progress_own         on public.student_progress;
drop policy if exists progress_select_admin on public.student_progress;

create policy progress_own on public.student_progress
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy progress_select_admin on public.student_progress
  for select using (public.is_admin());

-- ── app_settings ───────────────────────────────────────────────────────────
drop policy if exists settings_admin_only on public.app_settings;
create policy settings_admin_only on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());


-- ===========================================================================
-- 11) التخزين — مجلد ملفات المحاضرات
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', false)
on conflict (id) do nothing;

drop policy if exists course_files_read  on storage.objects;
drop policy if exists course_files_write on storage.objects;

-- أي مستخدم مسجّل يستطيع قراءة ملفات المحاضرات
create policy course_files_read on storage.objects
  for select to authenticated
  using (bucket_id = 'course-files');

-- الرفع والتعديل والحذف: المدربة فقط
create policy course_files_write on storage.objects
  for all to authenticated
  using (bucket_id = 'course-files' and public.is_admin())
  with check (bucket_id = 'course-files' and public.is_admin());
