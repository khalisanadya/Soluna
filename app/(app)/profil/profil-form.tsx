"use client";

import { startTransition, useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { updateProfil } from "@/app/actions/profil";
import { RegionSelect, guardAction, useFocusServerError } from "@/components/form-kit";
import { Card, Field, Notice, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { cocokkanKabupatenKota } from "@/lib/wilayah";

const guardedUpdate = guardAction(updateProfil);
const URUTAN = ["namaPerusahaan", "namaPenanggungJawab", "alamat", "provinsi", "kota", "alamatPenyimpanan", "provinsiPenyimpanan", "kotaPenyimpanan", "telepon", "emailPerusahaan"];

export function ProfilForm({ initial }: { initial: Record<string, string> }) {
  const [state, action, pending] = useActionState(guardedUpdate, undefined);
  const v = { ...initial, ...state?.values };
  const e = state?.errors ?? {};
  useFocusServerError(state, URUTAN);
  // Wilayah dikendalikan agar kabupaten/kota selalu mengikuti provinsi terpilih.
  // Nama kota lama ("Surabaya") dicocokkan ke nama resmi ("Kota Surabaya") bila tidak ambigu.
  const [wilayah, setWilayah] = useState(() => ({
    provinsi: initial.provinsi ?? "",
    kota: cocokkanKabupatenKota(initial.provinsi, initial.kota),
    provinsiPenyimpanan: initial.provinsiPenyimpanan ?? "",
    kotaPenyimpanan: cocokkanKabupatenKota(initial.provinsiPenyimpanan, initial.kotaPenyimpanan),
  }));
  const setW = (k: keyof typeof wilayah) => (value: string) => setWilayah((w) => ({ ...w, [k]: value }));
  const input = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} defaultValue={v[name]} aria-invalid={Boolean(e[name])} className={inputClass} {...props} />
  );

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (pending) return;
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-4 lg:grid-cols-3"
      noValidate
    >
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
            <RegionSelect
              provinsiName="provinsi"
              kotaName="kota"
              provinsi={wilayah.provinsi}
              kota={wilayah.kota}
              onProvinsi={setW("provinsi")}
              onKota={setW("kota")}
              provinsiError={e.provinsi?.[0]}
              kotaError={e.kota?.[0]}
              required
            />
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
            <RegionSelect
              provinsiName="provinsiPenyimpanan"
              kotaName="kotaPenyimpanan"
              provinsi={wilayah.provinsiPenyimpanan}
              kota={wilayah.kotaPenyimpanan}
              onProvinsi={setW("provinsiPenyimpanan")}
              onKota={setW("kotaPenyimpanan")}
              provinsiError={e.provinsiPenyimpanan?.[0]}
              kotaError={e.kotaPenyimpanan?.[0]}
            />
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
        <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass("primary", "md", "w-full")}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {pending ? "Menyimpan…" : "Simpan profil"}
        </button>
      </div>
    </form>
  );
}
