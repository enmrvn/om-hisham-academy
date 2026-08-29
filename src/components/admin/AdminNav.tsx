"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

const TABS = [
  { href: "/admin", label: "نظرة عامة", exact: true },
  { href: "/admin/courses", label: "إدارة الملفات" },
  { href: "/admin/ai-quiz", label: "إنشاء اختبار ذكي", highlight: true },
  { href: "/admin/quizzes", label: "الاختبارات" },
  { href: "/admin/analytics", label: "التحليلات" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="thin-scrollbar flex gap-2 overflow-x-auto border-b border-navy-100 pb-3"
      aria-label="أقسام لوحة المدربة"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-navy-700 text-white"
                : tab.highlight
                  ? "bg-lavender-100 text-lavender-800 hover:bg-lavender-200"
                  : "text-navy-600 hover:bg-navy-50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
