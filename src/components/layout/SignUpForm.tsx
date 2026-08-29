"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUpAction, type AuthState } from "@/app/(auth)/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

const initial: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}
    </Button>
  );
}

export default function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initial);
  const errors = state.errors ?? {};

  if (state.success) {
    return (
      <Alert tone="success" title="تم إنشاء الحساب">
        {state.message}
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {errors._form && <Alert tone="error">{errors._form}</Alert>}

      <Field label="الاسم الكامل" htmlFor="full_name" required error={errors.full_name}>
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="مثال: نورة عبدالله المطيري"
          required
        />
      </Field>

      <Field label="البريد الإلكتروني" htmlFor="email" required error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder="name@example.com"
          required
        />
      </Field>

      <Field
        label="رقم الجوال"
        htmlFor="phone"
        error={errors.phone}
        hint="اختياري — يساعد المدربة على التواصل معك عند الحاجة."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="05XXXXXXXX"
        />
      </Field>

      <Field
        label="كلمة المرور"
        htmlFor="password"
        required
        error={errors.password}
        hint="٨ أحرف على الأقل."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="تأكيد كلمة المرور" htmlFor="confirm" required error={errors.confirm}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
