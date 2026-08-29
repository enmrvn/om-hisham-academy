"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signInAction, type AuthState } from "@/app/(auth)/actions";
import { Alert, Button, Field, Input } from "@/components/ui";

const initial: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "جارٍ التحقق…" : "تسجيل الدخول"}
    </Button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInAction, initial);
  const errors = state.errors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {errors._form && <Alert tone="error">{errors._form}</Alert>}

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

      <Field label="كلمة المرور" htmlFor="password" required error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
