import type { Metadata, Viewport } from "next";
import { Tajawal, Amiri } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import SetupNotice from "@/components/layout/SetupNotice";
import { getProfile } from "@/lib/supabase/server";

// خط تجوّل للعناوين وعناصر الواجهة
const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
  display: "swap",
});

// خط أميري للنصوص التعليمية الطويلة والشروح الرياضية
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "المدربة أم هشام | تأسيس القدرات والتحصيلي",
    template: "%s | المدربة أم هشام",
  },
  description:
    "منصة تعليمية لتأسيس طلاب القدرات والتحصيلي مع المدربة أم هشام: شرح مبسّط، محاضرات منظمة، تدريبات متنوعة، واختبارات إلكترونية مع متابعة للتقدم.",
  keywords: ["القدرات", "التحصيلي", "قياس", "أم هشام", "تأسيس", "اختبارات"],
  authors: [{ name: "المدربة أم هشام" }],
};

export const viewport: Viewport = {
  themeColor: "#1e2a3d",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${amiri.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <SetupNotice />
        <SiteHeader profile={profile} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
