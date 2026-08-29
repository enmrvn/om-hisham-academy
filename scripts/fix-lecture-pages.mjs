#!/usr/bin/env node
/**
 * يعيد توزيع نطاقات صفحات المحاضرات بناءً على **عدد الصفحات الحقيقي**
 * لكل ملف PDF كما هو مخزّن في courses.page_count.
 *
 * لماذا؟ نطاقات seed.sql كانت مبنية على تقدير خاطئ لعدد الصفحات.
 * هذا السكربت يقسّم كل ملف بالتساوي على محاضراته الخمس.
 *
 * الاستخدام:  node scripts/fix-lecture-pages.mjs
 *
 * ملاحظة: هذه القسمة بالتساوي تقدير أوّلي. بعد فتح كل ملف في العارض،
 * عدّلي بدايات المحاضرات يدويًا من: لوحة المدربة ▸ إدارة الملفات ▸ تعديل.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

async function loadEnv() {
  const file = path.join(projectRoot, ".env.local");
  if (!existsSync(file)) {
    console.error("✗ لم يُعثر على .env.local");
    process.exit(1);
  }
  const text = await readFile(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

await loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: courses, error } = await supabase
  .from("courses")
  .select("id, title, page_count, lecture_count")
  .order("sort_order");

if (error) {
  console.error(`✗ ${error.message}`);
  process.exit(1);
}

let updated = 0;
let skipped = 0;

for (const course of courses ?? []) {
  if (!course.page_count) {
    console.log(`  ⚠ تخطّي «${course.title}» — لا يوجد عدد صفحات (ارفعي الـ PDF أولًا).`);
    skipped += 1;
    continue;
  }

  const { data: lectures } = await supabase
    .from("lectures")
    .select("id, lecture_number, title")
    .eq("course_id", course.id)
    .order("lecture_number");

  const list = lectures ?? [];
  if (list.length === 0) continue;

  const total = course.page_count;
  const per = Math.floor(total / list.length);
  const remainder = total % list.length;

  console.log(`\n  ${course.title}`);
  console.log(`  إجمالي الصفحات: ${total} — ${list.length} محاضرات`);

  let cursor = 1;
  for (let i = 0; i < list.length; i++) {
    // نوزّع الباقي على المحاضرات الأولى حتى لا تضيع صفحات
    const size = per + (i < remainder ? 1 : 0);
    const start = cursor;
    const end = i === list.length - 1 ? total : cursor + size - 1;
    cursor = end + 1;

    const { error: upErr } = await supabase
      .from("lectures")
      .update({ start_page: start, end_page: end })
      .eq("id", list[i].id);

    if (upErr) {
      console.log(`    ✗ المحاضرة ${list[i].lecture_number}: ${upErr.message}`);
      continue;
    }

    console.log(
      `    ${String(list[i].lecture_number).padStart(2)}. ص ${String(start).padStart(3)}–${String(end).padStart(3)}  (${end - start + 1} صفحة)  ${list[i].title}`,
    );
    updated += 1;
  }
}

console.log(`\n▸ حُدّثت ${updated} محاضرة.${skipped ? `  تُخطّي ${skipped} ملف بلا PDF.` : ""}\n`);
