"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { ArrowRight, Building2, Check, LoaderCircle, ShieldCheck as ShieldUser } from "lucide-react";
import { register } from "@/app/actions/auth";
import { PasswordInput, RegionSelect, focusField, guardAction, useFocusServerError, useFormFields, zodError } from "@/components/form-kit";
import { Field, Notice, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { cn } from "@/lib/format";
import { PASSWORD_MIN, emailSchema, passwordSchema, teleponSchema, usernameSchema, wajib } from "@/lib/validation";
import { isKabupatenKotaDi } from "@/lib/wilayah";

type Peran = "PEMASOK" | "ADMIN";
type Name =
  | "namaPenanggungJawab"
  | "namaPerusahaan"
  | "telepon"
  | "provinsi"
  | "kota"
  | "alamat"
  | "alamatPenyimpanan"
  | "provinsiPenyimpanan"
  | "kotaPenyimpanan"
  | "deskripsi"
  | "nama"
  | "kodeAdmin"
  | "email"
  | "username"
  | "password"
  | "konfirmasi";

const EMPTY = Object.fromEntries(
  (
    [
      "namaPenanggungJawab",
      "namaPerusahaan",
      "telepon",
      "provinsi",
      "kota",
      "alamat",
      "alamatPenyimpanan",
      "provinsiPenyimpanan",
      "kotaPenyimpanan",
      "deskripsi",
      "nama",
      "kodeAdmin",
      "email",
      "username",
      "password",
      "konfirmasi",
    ] as const
  ).map((k) => [k, ""]),
) as Record<Name, string>;

const guardedRegister = guardAction(register);

/** Urutan kolom sesuai tampilan, untuk validasi menyeluruh dan fokus ke galat pertama. */
function visibleFields(peran: Peran, lokasiBeda: boolean, adminCode: boolean): Name[] {
  const akun: Name[] = ["email", "username", "password", "konfirmasi"];
  if (peran === "ADMIN") return ["nama", ...(adminCode ? (["kodeAdmin"] as Name[]) : []), ...akun];
  return [
    "namaPenanggungJawab",
    "namaPerusahaan",
    "telepon",
    "provinsi",
    "kota",
    "alamat",
    ...(lokasiBeda ? (["alamatPenyimpanan", "provinsiPenyimpanan", "kotaPenyimpanan"] as Name[]) : []),
    ...akun,
  ];
}

function validate(name: Name, v: Record<Name, string>): string | undefined {
  switch (name) {
    case "namaPenanggungJawab":
    case "nama":
      return zodError(wajib("Nama lengkap"), v[name]);
    case "namaPerusahaan":
      return zodError(wajib("Nama perusahaan"), v[name]);
    case "telepon":
      return zodError(teleponSchema, v.telepon);
    case "alamat":
      return zodError(wajib("Alamat lengkap"), v.alamat);
    case "alamatPenyimpanan":
      return zodError(wajib("Alamat penyimpanan"), v.alamatPenyimpanan);
    case "provinsi":
    case "provinsiPenyimpanan":
      return v[name] ? undefined : "Pilih provinsi.";
    case "kota":
      if (!v.provinsi) return "Pilih provinsi terlebih dahulu.";
      return isKabupatenKotaDi(v.provinsi, v.kota) ? undefined : "Pilih kabupaten/kota dari daftar.";
    case "kotaPenyimpanan":
      if (!v.provinsiPenyimpanan) return "Pilih provinsi terlebih dahulu.";
      return isKabupatenKotaDi(v.provinsiPenyimpanan, v.kotaPenyimpanan) ? undefined : "Pilih kabupaten/kota dari daftar.";
    case "kodeAdmin":
      return v.kodeAdmin.trim() ? undefined : "Kode undangan pengelola wajib diisi.";
    case "email":
      return zodError(emailSchema, v.email);
    case "username":
      return zodError(usernameSchema, v.username);
    case "password":
      return zodError(passwordSchema, v.password);
    case "konfirmasi":
      if (!v.konfirmasi) return "Ulangi kata sandi Anda.";
      return v.konfirmasi === v.password ? undefined : "Konfirmasi kata sandi tidak sama.";
  }
}

export function RegisterForm({ adminCodeRequired }: { adminCodeRequired: boolean }) {
  const [state, action, pending] = useActionState(guardedRegister, undefined);
  const [peran, setPeran] = useState<Peran>("PEMASOK");
  const [lokasiBeda, setLokasiBeda] = useState(false);
  const f = useFormFields<Name>(EMPTY, validate, state);
  const fields = visibleFields(peran, lokasiBeda, adminCodeRequired);
  useFocusServerError(state, fields);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return; // cegah pendaftaran ganda
    const invalid = f.checkAll(fields);
    if (invalid) return focusField(invalid);
    startTransition(() => action(new FormData(e.currentTarget)));
  }

  const text = (name: Name, label: string, props: React.ComponentProps<"input"> = {}, extra: { hint?: string; className?: string } = {}) => (
    <Field label={label} htmlFor={name} error={f.error(name)} required hint={extra.hint} className={extra.className}>
      <input
        id={name}
        name={name}
        value={f.values[name]}
        onChange={(e) => f.set(name, e.target.value)}
        onBlur={() => f.blur(name)}
        aria-required
        {...f.aria(name)}
        className={inputClass}
        {...props}
      />
    </Field>
  );

  const emailTaken = state?.errors?.email?.[0]?.includes("sudah terdaftar");
  const pwLong = f.values.password.length >= PASSWORD_MIN;
  const pwMatch = f.values.konfirmasi !== "" && f.values.konfirmasi === f.values.password;

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-8" noValidate>
        {state?.message && (
          <Notice tone="danger" title={state.message}>
            {emailTaken ? (
              <>
                Email ini sudah memiliki akun.{" "}
                <Link href="/masuk" className="font-semibold text-sun-700 underline underline-offset-4">
                  Masuk dengan email tersebut
                </Link>
                .
              </>
            ) : state.errors ? (
              "Periksa kolom yang ditandai merah di bawah."
            ) : null}
          </Notice>
        )}

        <Step n={1} title="Daftar sebagai">
          <fieldset>
            <legend className="sr-only">Peran akun</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { k: "PEMASOK" as const, t: "Pemasok baterai", d: "Operator armada, bengkel, produsen", icon: Building2 },
                { k: "ADMIN" as const, t: "Pengelola Sistem Desa", d: "BUMDes, koperasi, petugas teknis", icon: ShieldUser },
              ].map((o) => {
                const active = peran === o.k;
                return (
                  <label
                    key={o.k}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-3 rounded-2xl p-4 ring-1 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sun-500",
                      active ? "bg-ink-950 text-white ring-ink-950 shadow-lift" : "bg-surface ring-ink-200 hover:-translate-y-0.5 hover:ring-ink-300",
                    )}
                  >
                    <input type="radio" name="peran" value={o.k} checked={active} onChange={() => setPeran(o.k)} className="sr-only" />
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", active ? "bg-sun-500 text-ink-950" : "bg-ink-100 text-ink-500")}>
                      <o.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{o.t}</span>
                      <span className={cn("block text-xs", active ? "text-ink-300" : "text-ink-500")}>{o.d}</span>
                    </span>
                    {active && <Check className="absolute top-3 right-3 size-4 text-sun-400" aria-hidden="true" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Step>

        {peran === "PEMASOK" ? (
          <>
            <Step n={2} title="Data diri & perusahaan">
              <div className="grid gap-4 sm:grid-cols-2">
                {text("namaPenanggungJawab", "Nama lengkap", { autoComplete: "name", placeholder: "Nama penanggung jawab" })}
                {text("namaPerusahaan", "Nama perusahaan", { autoComplete: "organization" })}
                {text(
                  "telepon",
                  "Nomor telepon",
                  {
                    type: "tel",
                    inputMode: "tel",
                    autoComplete: "tel",
                    placeholder: "081234567890",
                    // Hanya angka, +, spasi, dan tanda hubung yang diterima.
                    onChange: (e) => f.set("telepon", e.target.value.replace(/[^\d+\s-]/g, "")),
                  },
                 
                )}
              </div>
            </Step>

            <Step n={3} title="Alamat perusahaan">
              <div className="grid gap-4 sm:grid-cols-2">
                <RegionSelect
                  provinsiName="provinsi"
                  kotaName="kota"
                  provinsi={f.values.provinsi}
                  kota={f.values.kota}
                  onProvinsi={(v) => f.set("provinsi", v)}
                  onKota={(v) => f.set("kota", v)}
                  onBlur={(n) => f.blur(n as Name)}
                  provinsiError={f.error("provinsi")}
                  kotaError={f.error("kota")}
                  required
                />
                {text("alamat", "Alamat lengkap", { autoComplete: "street-address", placeholder: "Jalan, nomor, RT/RW, kelurahan, kecamatan" }, { className: "sm:col-span-2" })}
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
                <input type="checkbox" checked={lokasiBeda} onChange={(ev) => setLokasiBeda(ev.target.checked)} className="mt-0.5 size-4 accent-sun-500" />
                Lokasi penyimpanan baterai berbeda dari alamat perusahaan
              </label>
              {lokasiBeda && (
                <div className="mt-4 grid animate-rise gap-4 rounded-2xl bg-ink-100/60 p-4 ring-1 ring-ink-200/70 sm:grid-cols-2">
                  <RegionSelect
                    provinsiName="provinsiPenyimpanan"
                    kotaName="kotaPenyimpanan"
                    provinsi={f.values.provinsiPenyimpanan}
                    kota={f.values.kotaPenyimpanan}
                    onProvinsi={(v) => f.set("provinsiPenyimpanan", v)}
                    onKota={(v) => f.set("kotaPenyimpanan", v)}
                    onBlur={(n) => f.blur(n as Name)}
                    provinsiError={f.error("provinsiPenyimpanan")}
                    kotaError={f.error("kotaPenyimpanan")}
                    labelProvinsi="Provinsi penyimpanan"
                    labelKota="Kabupaten/kota penyimpanan"
                    required
                  />
                  {text("alamatPenyimpanan", "Alamat penyimpanan", { placeholder: "Gudang atau lokasi baterai" }, { className: "sm:col-span-2" })}
                </div>
              )}
              <Field label="Deskripsi singkat" htmlFor="deskripsi" optional className="mt-4">
                <textarea
                  id="deskripsi"
                  name="deskripsi"
                  value={f.values.deskripsi}
                  onChange={(e) => f.set("deskripsi", e.target.value)}
                  className={textareaClass}
                  placeholder="Mis. operator armada bus listrik dengan baterai pensiun LFP."
                />
              </Field>
            </Step>
          </>
        ) : (
          <Step n={2} title="Data pengelola">
            <div className="grid gap-4 sm:grid-cols-2">
              {text("nama", "Nama lengkap", { autoComplete: "name" }, { className: adminCodeRequired ? "" : "sm:col-span-2" })}
              {adminCodeRequired && text("kodeAdmin", "Kode undangan pengelola", { autoComplete: "off" }, { hint: "Diberikan oleh pengelola SOLUNA." })}
            </div>
          </Step>
        )}

        <Step n={peran === "PEMASOK" ? 4 : 3} title="Akun">
          <div className="grid gap-4 sm:grid-cols-2">
            {text("email", "Alamat email", { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false, placeholder: "nama@email.com" })}
            {text("username", "Nama pengguna", { autoComplete: "username", autoCapitalize: "none", spellCheck: false })}
            <Field label="Kata sandi" htmlFor="password" error={f.error("password")} required>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={f.values.password}
                onChange={(e) => f.set("password", e.target.value)}
                onBlur={() => f.blur("password")}
                aria-required
                {...f.aria("password")}
              />
            </Field>
            <Field label="Konfirmasi kata sandi" htmlFor="konfirmasi" error={f.error("konfirmasi")} required>
              <PasswordInput
                id="konfirmasi"
                name="konfirmasi"
                autoComplete="new-password"
                placeholder="••••••••"
                value={f.values.konfirmasi}
                onChange={(e) => f.set("konfirmasi", e.target.value)}
                onBlur={() => f.blur("konfirmasi")}
                aria-required
                {...f.aria("konfirmasi")}
              />
            </Field>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-label="Ketentuan kata sandi">
            <Rule ok={pwLong}>Minimal {PASSWORD_MIN} karakter</Rule>
            <Rule ok={pwMatch}>Konfirmasi sama dengan kata sandi</Rule>
          </ul>
        </Step>

        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "lg", "group w-full")}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Mendaftarkan…
            </>
          ) : (
            <>
              Buat akun <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="text-ink-600">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-sun-700 underline-offset-4 hover:underline">
            Masuk di sini.
          </Link>
        </p>
      </div>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`langkah-${n}`}>
      <h2 id={`langkah-${n}`} className="mb-4 flex items-center gap-3 text-sm font-semibold text-ink-900">
        <span className="num grid size-6 place-items-center rounded-full bg-ink-950 text-[0.7rem] text-white">{n}</span>
        {title}
        <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
      </h2>
      {children}
    </section>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5 transition-colors", ok ? "text-leaf-600" : "text-ink-500")}>
      <span className={cn("grid size-4 place-items-center rounded-full transition-colors", ok ? "bg-leaf-500 text-white" : "bg-ink-200")}>
        {ok && <Check className="size-3" strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}
