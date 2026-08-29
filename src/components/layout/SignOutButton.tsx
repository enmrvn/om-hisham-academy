"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/components/ui";

export default function SignOutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
    setBusy(false);
  }

  const loading = busy || pending;

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className={cn(
        "h-9 rounded-lg border border-navy-200 px-3 text-sm text-navy-600 transition-colors hover:bg-navy-50 disabled:opacity-50",
        full && "h-11 w-full",
      )}
    >
      {loading ? "جارٍ الخروج…" : "تسجيل الخروج"}
    </button>
  );
}
