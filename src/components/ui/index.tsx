import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------------------------------------------------------------------------
   مكوّنات واجهة قابلة لإعادة الاستخدام في كل صفحات المنصة.
   جميعها تدعم الاتجاه من اليمين إلى اليسار افتراضيًا.
--------------------------------------------------------------------------- */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ── الأزرار ─────────────────────────────────────────────────────────────── */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "danger"
  | "inverse";
type ButtonSize = "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-navy-700 text-white hover:bg-navy-800 focus-visible:outline-navy-500 shadow-sm",
  secondary:
    "bg-teal-600 text-white hover:bg-teal-700 focus-visible:outline-teal-500 shadow-sm",
  soft:
    "bg-lavender-100 text-navy-800 hover:bg-lavender-200 border border-lavender-200",
  ghost:
    "bg-transparent text-navy-700 hover:bg-navy-50 border border-navy-200",
  danger:
    "bg-white text-danger border border-danger/30 hover:bg-red-50",
  // للاستخدام فوق خلفية داكنة
  inverse:
    "bg-white text-navy-800 hover:bg-navy-50 focus-visible:outline-white shadow-sm",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-13 px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

/* ── البطاقات ────────────────────────────────────────────────────────────── */

/**
 * ملاحظة: `cn` مجرد دمج نصوص ولا يحل تعارض أدوات Tailwind،
 * لذلك الحشو (padding) يُتحكم فيه عبر `padded` لا عبر className.
 */
export function Card({
  className,
  padded = true,
  children,
  ...props
}: ComponentProps<"div"> & { padded?: boolean }) {
  return (
    <div className={cn("surface-card", padded && "p-6", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
      {eyebrow && (
        <p className="mb-2 text-sm font-medium tracking-wide text-teal-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h2>
      {description && (
        <p className="mt-3 leading-8 text-navy-500">{description}</p>
      )}
    </div>
  );
}

/* ── الشارات ─────────────────────────────────────────────────────────────── */

type BadgeTone = "navy" | "teal" | "lavender" | "beige" | "success" | "danger" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  navy: "bg-navy-100 text-navy-700",
  teal: "bg-teal-100 text-teal-700",
  lavender: "bg-lavender-100 text-lavender-700",
  beige: "bg-beige-200 text-beige-800",
  success: "bg-teal-100 text-teal-800",
  danger: "bg-red-50 text-red-800",
  neutral: "bg-navy-50 text-navy-500",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── شريط التقدّم ────────────────────────────────────────────────────────── */

export function ProgressBar({
  value,
  label,
  tone = "teal",
}: {
  value: number;
  label?: string;
  tone?: "teal" | "navy" | "lavender";
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const fill =
    tone === "navy" ? "bg-navy-600" : tone === "lavender" ? "bg-lavender-500" : "bg-teal-500";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-navy-500">
        <span>{label ?? "نسبة الإنجاز"}</span>
        <span className="font-medium text-navy-700">{safe}٪</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-navy-100"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "نسبة الإنجاز"}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", fill)}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

/* ── حقول الإدخال ────────────────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-navy-900 " +
  "placeholder:text-navy-300 transition-colors focus:border-teal-400 focus:outline-none " +
  "focus:ring-2 focus:ring-teal-100 disabled:bg-navy-50 disabled:text-navy-400";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-800">
        {label}
        {required && <span className="mr-1 text-danger">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-navy-400">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-24 leading-8", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(fieldBase, "appearance-none pl-10", className)} {...props}>
      {children}
    </select>
  );
}

/* ── الحالات: تنبيه، فراغ، تحميل ─────────────────────────────────────────── */

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "error" | "warning";
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    info: "bg-lavender-50 border-lavender-200 text-navy-800",
    success: "bg-teal-50 border-teal-200 text-teal-900",
    error: "bg-red-50 border-red-200 text-red-900",
    warning: "bg-beige-100 border-beige-300 text-beige-900",
  } as const;

  return (
    <div
      className={cn("rounded-xl border px-4 py-3 text-sm leading-7", tones[tone])}
      role={tone === "error" ? "alert" : "status"}
    >
      {title && <p className="mb-0.5 font-bold">{title}</p>}
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div
        aria-hidden
        className="flex h-14 w-14 items-center justify-center rounded-full bg-lavender-100 text-2xl text-lavender-600"
      >
        ⌯
      </div>
      <h3 className="text-lg font-bold text-navy-800">{title}</h3>
      {description && (
        <p className="max-w-md text-sm leading-7 text-navy-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "جارٍ التحميل…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-navy-500">
      <span
        aria-hidden
        className="h-5 w-5 animate-spin rounded-full border-2 border-navy-200 border-t-teal-500"
      />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="surface-card animate-pulse space-y-4 p-6">
      <div className="h-4 w-24 rounded bg-navy-100" />
      <div className="h-5 w-3/4 rounded bg-navy-100" />
      <div className="h-3 w-full rounded bg-navy-50" />
      <div className="h-3 w-5/6 rounded bg-navy-50" />
      <div className="h-2 w-full rounded-full bg-navy-100" />
    </div>
  );
}
