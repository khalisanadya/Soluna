"use client";

import { useActionState } from "react";
import { updateProfil } from "@/app/actions/profil";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass, textareaClass } from "@/components/ui";
import { PROVINSI } from "@/lib/wilayah";

export function ProfilForm({ initial }: { initial: Record<string, string> }) {
  const [state, action] = useActionState(updateProfil, undefined);
  const v = { ...initial, ...state?.values };
  const e = state?.errors ?? {};
  const input = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} defaultValue={v[name]} aria-invalid={Boolean(e[name])} className={inputClass} {...props} />
  );
  const provSelect = (name: string, required: boolean) => (
    <select id={name} name={name} defaultValue={v[name] ?? ""} className={inputClass} aria-invalid={Boolean(e[name])}>
      <option value="" disabled={required}>
        {required ? "Pilih provinsi" : "—"}
      </option>
      {PROVINSI.map((p) => (
        <option key={p}>{p}</option>
      ))}
    </select>
  );

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-3" noValidate>
      <div className="space-y-4 lg:col-span-2">
        {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
        <Card>
          <p className="eyebrow mb-4">Perusahaan</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama perusahaan" htmlFor="namaPerusahaan" error={e.namaPerusahaan}>
              {input("namaPerusahaan")}
            </Field>
            <Field label="Nama penanggung jawab" htmlFor="namaPenanggungJawab" error={e.namaPenanggungJawab}>
              {input("namaPenanggungJawab")}
            </Field>
            <Field label="Alamat" htmlFor="alamat" error={e.alamat} className="sm:col-span-2">
              {input("alamat")}
            </Field>
            <Field label="Kota/kabupaten" htmlFor="kota" error={e.kota}>
              {input("kota")}
            </Field>
            <Field label="Provinsi" htmlFor="provinsi" error={e.provinsi}>
              {provSelect("provinsi", true)}
            </Field>
            <Field label="Jenis baterai yang ditawarkan" htmlFor="jenisBaterai" optional hint="Mis. LFP, NMC">
              {input("jenisBaterai")}
            </Field>
            <Field label="Deskripsi" htmlFor="deskripsi" optional className="sm:col-span-2">
              <textarea id="deskripsi" name="deskripsi" defaultValue={v.deskripsi} className={textareaClass} />
            </Field>
          </div>
        </Card>
        <Card>
          <p className="eyebrow mb-1">Lokasi penyimpanan baterai</p>
          <p className="mb-4 text-sm text-ink-500">Isi bila berbeda dari alamat perusahaan.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Alamat penyimpanan" htmlFor="alamatPenyimpanan" optional className="sm:col-span-2">
              {input("alamatPenyimpanan")}
            </Field>
            <Field label="Kota/kabupaten" htmlFor="kotaPenyimpanan" optional>
              {input("kotaPenyimpanan")}
            </Field>
            <Field label="Provinsi" htmlFor="provinsiPenyimpanan" optional error={e.provinsiPenyimpanan}>
              {provSelect("provinsiPenyimpanan", false)}
            </Field>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <p className="eyebrow mb-4">Kontak</p>
          <div className="space-y-4">
            <Field label="Telepon" htmlFor="telepon" error={e.telepon}>
              {input("telepon", { type: "tel", inputMode: "tel" })}
            </Field>
            <Field label="Email perusahaan" htmlFor="emailPerusahaan" error={e.emailPerusahaan}>
              {input("emailPerusahaan", { type: "email" })}
            </Field>
          </div>
        </Card>
        <SubmitButton className="w-full" pendingText="Menyimpan…">
          Simpan profil
        </SubmitButton>
      </div>
    </form>
  );
}
