#!/usr/bin/env node
/**
 * رفع ملفات المحاضرات الأربعة إلى Supabase Storage وربطها بالمقررات.
 *
 * الاستخدام:
 *   1. ضعي ملفات الـ PDF في مجلد content-pdfs/ داخل المشروع
 *      (أو مرري مسار المجلد كوسيط أول).
 *   2. شغّلي:  npm run upload:pdfs
 *   3. أو مع مجلد مخصص:
 *        node scripts/upload-pdfs.mjs "C:/Users/…/المحاضرات المدربة ام هشام"
 *
 * السكربت يطابق كل ملف مع مقرره عبر أرقام المحاضرات في اسم الملف
 * (١ الى ٥ ، ٦ الى ١٠ ، …) ويحدّث pdf_path و page_count تلقائيًا.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

/* ── تحميل متغيرات البيئة من .env.local ─────────────────────────────────── */
async function loadEnv() {
  const file = path.join(projectRoot, ".env.local");
  if (!existsSync(file)) {
    console.error("✗ لم يُعثر على ملف .env.local — انسخي .env.example وأكملي القيم.");
    process.exit(1);
  }

  const text = await readFile(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

/* ── مطابقة اسم الملف مع slug المقرر ────────────────────────────────────── */
const AR_DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };

function toLatinDigits(text) {
  return text.replace(/[٠-٩]/g, (d) => AR_DIGITS[d] ?? d);
}

/** يستخرج أول رقمين من اسم الملف ← "1-5" ← slug "lectures-1-5" */
function slugFromFilename(filename) {
  const numbers = toLatinDigits(filename).match(/\d+/g);
  if (!numbers || numbers.length < 2) return null;
  return `lectures-${numbers[0]}-${numbers[1]}`;
}

/**
 * يرفع الملف مع إعادة محاولة تصاعدية.
 * أخطاء الشبكة العابرة شائعة مع الملفات الكبيرة، وإعادة المحاولة تحلّها
 * في الغالب دون تدخّل.
 */
async function uploadWithRetry(supabase, bucket, storagePath, buffer, attempts = 4) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!error) return null;
      lastError = error;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    // لا تعيد المحاولة على أخطاء واضحة لن تتغيّر بالإعادة
    const msg = String(lastError?.message ?? "");
    if (/exceeded the maximum allowed size|payload too large|413/i.test(msg)) {
      return lastError;
    }

    if (attempt < attempts) {
      const waitMs = 3000 * attempt;
      process.stdout.write(`إعادة المحاولة ${attempt}/${attempts - 1}… `);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  return lastError;
}

async function main() {
  await loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "course-files";

  if (!url || !key) {
    console.error(
      "✗ NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان في .env.local",
    );
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));

  const sourceDir = positional[0]
    ? path.resolve(positional[0])
    : path.join(projectRoot, "content-pdfs");

  if (!existsSync(sourceDir)) {
    console.error(`✗ المجلد غير موجود: ${sourceDir}`);
    console.error("  أنشئي مجلد content-pdfs/ وضعي الملفات فيه، أو مرري مسار المجلد كوسيط.");
    process.exit(1);
  }

  const files = (await readdir(sourceDir)).filter((f) =>
    f.toLowerCase().endsWith(".pdf"),
  );

  if (files.length === 0) {
    console.error(`✗ لا توجد ملفات PDF في: ${sourceDir}`);
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n▸ وُجد ${files.length} ملف PDF في ${sourceDir}\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const filename of files) {
    const slug = slugFromFilename(filename);

    if (!slug) {
      console.warn(`  ⚠ تخطّي «${filename}» — لم أتمكن من استنتاج أرقام المحاضرات من الاسم.`);
      continue;
    }

    const { data: course } = await supabase
      .from("courses")
      .select("id, title, pdf_path")
      .eq("slug", slug)
      .maybeSingle();

    if (!course) {
      console.warn(`  ⚠ تخطّي «${filename}» — لا يوجد مقرر بالمعرّف ${slug}. شغّلي seed.sql أولًا.`);
      continue;
    }

    const fullPath = path.join(sourceDir, filename);
    const buffer = await readFile(fullPath);
    const sizeMb = (buffer.byteLength / 1024 / 1024).toFixed(1);

    // تخطّي ما رُفع فعلًا بالحجم نفسه (إلا مع --force)،
    // حتى لا نعيد رفع عشرات الميجابايت بلا داعٍ عند إصلاح ملف واحد فاشل.
    if (course.pdf_path && !force) {
      const dir = course.pdf_path.split("/").slice(0, -1).join("/");
      const name = course.pdf_path.split("/").pop();
      const { data: existing } = await supabase.storage
        .from(bucket)
        .list(dir, { search: name, limit: 1 });

      const remoteSize = existing?.[0]?.metadata?.size;
      if (remoteSize === buffer.byteLength) {
        console.log(`  = ${course.title}\n    مرفوع مسبقًا بالحجم نفسه (${sizeMb}MB) — تخطّي.`);
        skipped += 1;
        continue;
      }
    }

    let pageCount = null;
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pageCount = doc.getPageCount();
    } catch (err) {
      console.warn(`  ⚠ تعذّرت قراءة عدد صفحات «${filename}»: ${err.message}`);
    }

    const storagePath = `courses/${course.id}/${slug}.pdf`;

    process.stdout.write(
      `  ↑ ${course.title}\n    ${filename} (${sizeMb}MB، ${pageCount ?? "?"} صفحة) … `,
    );

    // الرفع مع إعادة محاولة: ملفات ٣٠–٥٠ ميجابايت تسقط أحيانًا بخطأ
    // شبكة عابر ("fetch failed") قبل أن تصل إلى الخادم أصلًا.
    const uploadError = await uploadWithRetry(
      supabase,
      bucket,
      storagePath,
      buffer,
    );

    if (uploadError) {
      console.log("فشل");
      console.error(`    ✗ ${uploadError.message}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("courses")
      .update({ pdf_path: storagePath, page_count: pageCount })
      .eq("id", course.id);

    if (updateError) {
      console.log("رُفع لكن لم يُربط");
      console.error(`    ✗ ${updateError.message}`);
      continue;
    }

    console.log("تم ✓");
    uploaded += 1;
  }

  console.log(
    `\n▸ اكتمل الرفع: ${uploaded} رُفع، ${skipped} متخطّى، من ${files.length} ملف.\n`,
  );

  if (uploaded > 0) {
    console.log("الخطوة التالية: افتحي الموقع ▸ لوحة المدربة ▸ إدارة الملفات");
    console.log("وتأكدي من نطاقات صفحات كل محاضرة قبل استخدام «إنشاء اختبار ذكي».\n");
  }
}

main().catch((err) => {
  console.error("\n✗ خطأ غير متوقع:", err.message);
  process.exit(1);
});
