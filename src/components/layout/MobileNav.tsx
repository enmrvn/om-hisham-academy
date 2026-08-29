"use client";

import Link from "next/link";
import { useState } from "react";
import SignOutButton from "@/components/layout/SignOutButton";

export default function MobileNav({
  links,
  isAuthed,
}: {
  links: { href: string; label: string }[];
  isAuthed: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-navy-200 text-navy-700"
      >
        <span aria-hidden className="text-lg">{open ? "✕" : "☰"}</span>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-navy-100 bg-white p-4 shadow-lg">
          <nav className="flex flex-col gap-1" aria-label="التنقل للجوال">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mt-3 border-t border-navy-100 pt-3">
            {isAuthed ? (
              <SignOutButton full />
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-navy-200 text-sm font-medium text-navy-700"
                >
                  دخول
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-navy-700 text-sm font-medium text-white"
                >
                  إنشاء حساب
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
