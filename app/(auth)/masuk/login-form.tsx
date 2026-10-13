"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, inputClass } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state?.message && <Notice tone="danger">{state.message}</Notice>}
      <Field label="Nama pengguna atau email" htmlFor="identitas">
        <input
          id="identitas"
          name="identitas"
          autoComplete="username"
          className={inputClass}
          defaultValue={state?.values?.identitas}
          required
          autoFocus
        />
      </Field>
      <Field label="Kata sandi" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Memeriksa…">
        Masuk
      </SubmitButton>
    </form>
  );
}
