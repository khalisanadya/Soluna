"use client";

import { useActionState, useState } from "react";
import { Building2, ShieldCheck as ShieldUser } from "lucide-react";
import { register } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, inputClass, textareaClass } from "@/components/ui";
import { cn } from "@/lib/format";
import { PROVINSI } from "@/lib/wilayah";

export function RegisterForm({ adminCodeRequired }: { adminCodeRequired: boolean }) {
  const [state, action] = useActionState(register, undefined);
  const [peran, setPeran] = useState<"PEMASOK" | "ADMIN">((state?.values?.peran as "ADMIN") ?? "PEMASOK");
  const [lokasiBeda, setLokasiBeda] = useState(Boolean(state?.values?.alamatPenyimpanan));
  const v = state?.values ?? {};
  const e = state?.errors ?? {};

  const input = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} defaultValue={v[name]} aria-invalid={Boolean(e[name])} className={inputClass} {...props} />
  );

  return (
    <form action={action} className="mt-8 space-y-6" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">Daftar sebagai</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "PEMASOK" as const, t: "Pemasok baterai", d: "Operator armada, bengkel, produsen", icon: Building2 },
            { k: "ADMIN" as const, t: "Admin desa", d: "BUMDes, koperasi, petugas teknis", icon: ShieldUser },
          ].map((o) => (
            <label
              key={o.k}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-2xl p-4 ring-1 transition",
                peran === o.k ? "bg-ink-900 text-white ring-ink-900" : "bg-surface ring-ink-200 hover:ring-ink-300",
              )}
            >
              <input type="radio" name="peran" value={o.k} checked={peran === o.k} onChange={() => setPeran(o.k)} className="sr-only" />
              <o.icon className={cn("size-5", peran === o.k ? "text-sun-400" : "text-ink-400")} />
              <span className="mt-1 text-sm font-semibold">{o.t}</span>
              <span className={cn("text-xs", peran === o.k ? "text-ink-300" : "text-ink-500")}>{o.d}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state?.message && <Notice tone="danger">{state.message}</Notice>}

      {peran === "PEMASOK" ? (
        <section className="space-y-4">
          <p className="eyebrow">Data perusahaan</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama penanggung jawab" htmlFor="namaPenanggungJawab" error={e.namaPenanggungJawab}>
              {input("namaPenanggungJawab", { autoComplete: "name" })}
            </Field>
            <Field label="Nama perusahaan" htmlFor="namaPerusahaan" error={e.namaPerusahaan}>
              {input("namaPerusahaan", { autoComplete: "organization" })}
            </Field>
          </div>
          <Field label="Alamat" htmlFor="alamat" error={e.alamat}>
            {input("alamat", { autoComplete: "street-address" })}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kota/kabupaten" htmlFor="kota" error={e.kota}>
              {input("kota")}
            </Field>
            <Field label="Provinsi" htmlFor="provinsi" error={e.provinsi}>
              <select id="provinsi" name="provinsi" defaultValue={v.provinsi ?? ""} aria-invalid={Boolean(e.provinsi)} className={inputClass}>
                <option value="" disabled>
                  Pilih provinsi
                </option>
                {PROVINSI.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Telepon" htmlFor="telepon" error={e.telepon} hint="Contoh: 081234567890">
            {input("telepon", { type: "tel", autoComplete: "tel", inputMode: "tel" })}
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={lokasiBeda} onChange={(ev) => setLokasiBeda(ev.target.checked)} className="size-4 accent-sun-500" />
            Lokasi penyimpanan baterai berbeda dari alamat perusahaan
          </label>
          {lokasiBeda && (
            <div className="space-y-4 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100">
              <Field label="Alamat penyimpanan" htmlFor="alamatPenyimpanan" error={e.alamatPenyimpanan}>
                {input("alamatPenyimpanan")}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kota/kabupaten" htmlFor="kotaPenyimpanan">
                  {input("kotaPenyimpanan")}
                </Field>
                <Field label="Provinsi" htmlFor="provinsiPenyimpanan" error={e.provinsiPenyimpanan}>
                  <select id="provinsiPenyimpanan" name="provinsiPenyimpanan" defaultValue={v.provinsiPenyimpanan ?? ""} className={inputClass}>
                    <option value="">Pilih provinsi</option>
                    {PROVINSI.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          )}
          <Field label="Deskripsi singkat" htmlFor="deskripsi" optional>
            <textarea id="deskripsi" name="deskripsi" defaultValue={v.deskripsi} className={textareaClass} placeholder="Mis. operator armada bus listrik dengan baterai pensiun LFP." />
          </Field>
        </section>
      ) : (
        <section className="space-y-4">
          <p className="eyebrow">Data admin</p>
          <Field label="Nama lengkap" htmlFor="nama" error={e.nama}>
            {input("nama", { autoComplete: "name" })}
          </Field>
          {adminCodeRequired && (
            <Field label="Kode admin" htmlFor="kodeAdmin" error={e.kodeAdmin} hint="Diberikan oleh pengelola SOLUNA.">
              <input id="kodeAdmin" name="kodeAdmin" className={inputClass} aria-invalid={Boolean(e.kodeAdmin)} />
            </Field>
          )}
        </section>
      )}

      <section className="space-y-4">
        <p className="eyebrow">Akun</p>
        <Field label="Email" htmlFor="email" error={e.email}>
          {input("email", { type: "email", autoComplete: "email" })}
        </Field>
        <Field label="Nama pengguna" htmlFor="username" error={e.username}>
          {input("username", { autoComplete: "username" })}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kata sandi" htmlFor="password" error={e.password} hint="Minimal 8 karakter.">
            <input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(e.password)} className={inputClass} />
          </Field>
          <Field label="Ulangi kata sandi" htmlFor="konfirmasi" error={e.konfirmasi}>
            <input id="konfirmasi" name="konfirmasi" type="password" autoComplete="new-password" aria-invalid={Boolean(e.konfirmasi)} className={inputClass} />
          </Field>
        </div>
      </section>

      <SubmitButton size="lg" className="w-full" pendingText="Mendaftarkan…">
        Buat akun
      </SubmitButton>
    </form>
  );
}
