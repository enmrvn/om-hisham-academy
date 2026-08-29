#!/usr/bin/env node
/**
 * ترقية حساب إلى صلاحية المدربة (admin).
 *
 * الاستخدام:
 *   node scripts/make-admin.mjs teacher@example.com
 *   npm run seed:admin -- teacher@example.com
 *
 * إن لم يُمرَّر بريد، يُستخدم ADMIN_EMAIL من .env.local
 *
 * ملاحظة: يجب أن يكون الحساب مُنشأً مسبقًا عبر صفحة «إنشاء حساب».
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
    console.error("✗ لم يُعثر على ملف .env.local");
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

async function main() {
  await loadEnv();

  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!email) {
    console.error("✗ مرري البريد الإلكتروني:  node scripts/make-admin.mjs you@example.com");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("✗ NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // خزّني البريد ليُرقّى تلقائيًا أي حساب يُنشأ به لاحقًا
  await supabase
    .from("app_settings")
    .upsert({ key: "admin_email", value: email }, { onConflict: "key" });

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("email", email)
    .select("id, email, full_name, role")
    .maybeSingle();

  if (error) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }

  if (!profile) {
    console.log(`\n⚠ لا يوجد حساب بالبريد ${email} بعد.`);
    console.log("  سجّلي حسابًا بهذا البريد من صفحة /signup، وسيُرقّى تلقائيًا");
    console.log("  لأنني خزّنت البريد في إعدادات النظام الآن.\n");
    return;
  }

  console.log(`\n✓ تمت ترقية الحساب إلى صلاحية المدربة:`);
  console.log(`  ${profile.full_name || "(بلا اسم)"} — ${profile.email}\n`);
  console.log("  افتحي /admin لتظهر لك لوحة المدربة.\n");
}

main().catch((err) => {
  console.error("\n✗ خطأ:", err.message);
  process.exit(1);
});
