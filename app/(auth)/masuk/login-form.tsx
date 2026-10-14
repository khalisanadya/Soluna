"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { login } from "@/app/actions/auth";
import { PasswordInput, focusField, guardAction, useFocusServerError, useFormFields, zodError } from "@/components/form-kit";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { emailSchema } from "@/lib/validation";

const FIELDS = ["email", "password"] as const;
type Name = (typeof FIELDS)[number];

const guardedLogin = guardAction(login);

function validate(name: Name, v: Record<Name, string>) {
  if (name === "email") return zodError(emailSchema, v.email);
  if (name === "password") return v.password ? undefined : "Kata sandi wajib diisi.";
}

export function LoginForm({ demo }: { demo: { peran: string; email: string; password: string }[] }) {
  const [state, action, pending] = useActionState(guardedLogin, undefined);
  const f = useFormFields<Name>({ email: "", password: "" }, validate, state);
  useFocusServerError(state, FIELDS);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return; // cegah kirim ganda
    const invalid = f.checkAll(FIELDS);
    if (invalid) return focusField(invalid);
    const fd = new FormData(e.currentTarget);
    fd.set("email", f.values.email.trim());
    // Halaman tujuan setelah masuk (?lanjut= dari proxy). Server tetap memvalidasinya.
    const lanjut = new URLSearchParams(window.location.search).get("lanjut");
    if (lanjut) fd.set("lanjut", lanjut);
    startTransition(() => action(fd));
  }

  const failed = state?.message && !state.errors;

  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate aria-describedby={state?.message ? "login-pesan" : undefined}>
        {state?.message && (
          <div id="login-pesan">
            <Notice tone="danger" title={failed ? "Gagal masuk" : undefined}>
              {state.message}
            </Notice>
          </div>
        )}

        <Field label="Alamat email" htmlFor="email" error={f.error("email")} required>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="nama@email.com"
            value={f.values.email}
            onChange={(e) => f.set("email", e.target.value)}
            onBlur={() => f.blur("email")}
            aria-required
            {...f.aria("email")}
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field label="Kata sandi" htmlFor="password" error={f.error("password")} required>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={f.values.password}
            onChange={(e) => f.set("password", e.target.value)}
            onBlur={() => f.blur("password")}
            aria-required
            {...f.aria("password")}
          />
        </Field>

        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "lg", "group w-full")}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Memeriksa…
            </>
          ) : (
            <>
              Masuk <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-sm">
        <p className="text-ink-600">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-semibold text-sun-700 underline-offset-4 hover:underline">
            Daftar sekarang.
          </Link>
        </p>
      </div>

      {demo.length > 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-ink-300 p-3.5 text-sm">
          <p className="text-xs text-ink-500"><span className="font-semibold text-ink-800">Akun demo</span> · kata sandi <code className="num">{demo[0].password}</code> · klik untuk mengisi</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {demo.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  f.set("email", d.email);
                  f.set("password", d.password);
                }}
                className="rounded-xl bg-ink-100/70 px-3 py-2 text-left transition hover:bg-ink-100 hover:ring-1 hover:ring-ink-300"
              >
                <span className="block text-xs text-ink-500">{d.peran}</span>
                <span className="num block truncate font-medium text-ink-900">{d.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
