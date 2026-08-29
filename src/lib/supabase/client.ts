"use client";

import { createBrowserClient } from "@supabase/ssr";

/** عميل Supabase للمتصفح — يستخدم المفتاح العام فقط، وRLS هي خط الدفاع. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
