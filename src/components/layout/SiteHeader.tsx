import Link from "next/link";
import { TUTOR } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { LinkButton } from "@/components/ui";
import MobileNav from "@/components/layout/MobileNav";
import SignOutButton from "@/components/layout/SignOutButton";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/courses", label: "الملفات" },
  { href: "/quizzes", label: "الاختبارات" },
];

export default function SiteHeader({ profile }: { profile: Profile | null }) {
  const links = [
    ...NAV,
    ...(profile ? [{ href: "/dashboard", label: "لوحتي" }] : []),
    ...(profile?.role === "admin"
      ? [{ href: "/admin", label: "لوحة المدربة" }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        {/* الشعار */}
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-700 font-bold text-white"
          >
            أ.هـ
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-bold text-navy-900">
              {TUTOR.shortName}
            </span>
            <span className="block text-[0.7rem] text-navy-400">
              القدرات والتحصيلي
            </span>
          </span>
        </Link>

        {/* التنقل — سطح المكتب */}
        <nav className="mr-auto hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-navy-600 transition-colors hover:bg-navy-50 hover:text-navy-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mr-auto flex items-center gap-2 md:mr-0">
          {profile ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="max-w-32 truncate text-sm text-navy-500">
                {profile.full_name || "طالب"}
              </span>
              <SignOutButton />
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <LinkButton href="/login" variant="ghost" size="sm">
                دخول
              </LinkButton>
              <LinkButton href="/signup" variant="primary" size="sm">
                إنشاء حساب
              </LinkButton>
            </div>
          )}

          <MobileNav links={links} isAuthed={!!profile} />
        </div>
      </div>
    </header>
  );
}
