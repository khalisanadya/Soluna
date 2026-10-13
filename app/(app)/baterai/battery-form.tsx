"use client";

import { useActionState } from "react";
import { saveBaterai } from "@/app/actions/baterai";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card, Field, Notice, inputClass, textareaClass } from "@/components/ui";
import { JENIS_KIMIA, KONDISI } from "@/lib/wilayah";

export type BatteryInitial = Partial<Record<
  "id" | "pemasokId" | "jenisKimia" | "merek" | "model" | "kapasitasAwalKwh" | "usiaTahun" | "kondisi" | "teganganNominalV" | "jumlahSiklus" | "catatan",
  string
>>;

export function BatteryForm({
  initial = {},
  pemasokOptions,
  cancelHref,
}: {
  initial?: BatteryInitial;
  pemasokOptions?: { id: string; nama: string }[];
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveBaterai, undefined);
  const v = { ...initial, ...state?.values } as Record<string, string | undefined>;
  const e = state?.errors ?? {};
  const num = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} inputMode="decimal" defaultValue={v[name]} aria-invalid={Boolean(e[name])} className={inputClass} {...props} />
  );

  return (
    <form action={action} className="grid gap-4 lg:grid-cols-3" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-4 lg:col-span-2">
        {state?.message && <Notice tone="danger">{state.message}</Notice>}
        <Card>
          <p className="eyebrow mb-4">Identitas baterai</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {pemasokOptions && (
              <Field label="Pemasok" htmlFor="pemasokId" error={e.pemasokId} className="sm:col-span-2">
                <select id="pemasokId" name="pemasokId" defaultValue={v.pemasokId ?? ""} className={inputClass} aria-invalid={Boolean(e.pemasokId)}>
                  <option value="" disabled>
                    Pilih pemasok
                  </option>
                  {pemasokOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Merek" htmlFor="merek" error={e.merek}>
              <input id="merek" name="merek" defaultValue={v.merek} className={inputClass} aria-invalid={Boolean(e.merek)} />
            </Field>
            <Field label="Model" htmlFor="model" error={e.model}>
              <input id="model" name="model" defaultValue={v.model} className={inputClass} aria-invalid={Boolean(e.model)} />
            </Field>
            <Field label="Jenis kimia" htmlFor="jenisKimia" error={e.jenisKimia} hint="LFP lebih tahan lama untuk penyimpanan stasioner.">
              <select id="jenisKimia" name="jenisKimia" defaultValue={v.jenisKimia ?? ""} className={inputClass} aria-invalid={Boolean(e.jenisKimia)}>
                <option value="" disabled>
                  Pilih jenis kimia
                </option>
                {JENIS_KIMIA.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Kondisi" htmlFor="kondisi" error={e.kondisi}>
              <select id="kondisi" name="kondisi" defaultValue={v.kondisi ?? ""} className={inputClass} aria-invalid={Boolean(e.kondisi)}>
                <option value="" disabled>
                  Pilih kondisi
                </option>
                {KONDISI.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
        <Card>
          <p className="eyebrow mb-4">Spesifikasi</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kapasitas awal (kWh)" htmlFor="kapasitasAwalKwh" error={e.kapasitasAwalKwh} hint="Kapasitas saat baterai masih baru.">
              {num("kapasitasAwalKwh", { placeholder: "50" })}
            </Field>
            <Field label="Usia pemakaian (tahun)" htmlFor="usiaTahun" error={e.usiaTahun} optional>
              {num("usiaTahun", { placeholder: "5" })}
            </Field>
            <Field label="Tegangan nominal (V)" htmlFor="teganganNominalV" error={e.teganganNominalV} optional hint="Dipakai untuk cek kompatibilitas inverter.">
              {num("teganganNominalV", { placeholder: "51,2" })}
            </Field>
            <Field label="Jumlah siklus" htmlFor="jumlahSiklus" error={e.jumlahSiklus} optional>
              {num("jumlahSiklus", { placeholder: "1200", inputMode: "numeric" })}
            </Field>
            <Field label="Catatan" htmlFor="catatan" optional className="sm:col-span-2">
              <textarea id="catatan" name="catatan" defaultValue={v.catatan} className={textareaClass} placeholder="Riwayat pemakaian, kerusakan, atau informasi lain." />
            </Field>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <p className="eyebrow mb-4">Foto & dokumen</p>
          <Field label="Unggah berkas" htmlFor="berkas" error={e.berkas} optional hint="JPG, PNG, WEBP, atau PDF. Maks. 4 MB per berkas.">
            <input
              id="berkas"
              name="berkas"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-full file:border-0 file:bg-ink-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-ink-800"
            />
          </Field>
        </Card>
        <Card tone="muted">
          <p className="text-sm text-ink-600">
            Setelah disimpan, baterai berstatus <strong>Belum dinilai</strong>. Pengelola desa akan menilai kesehatannya dan
            menerbitkan paspor baterai.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <SubmitButton pendingText="Menyimpan…">Simpan baterai</SubmitButton>
            <ButtonLink href={cancelHref} variant="ghost">
              Batal
            </ButtonLink>
          </div>
        </Card>
      </div>
    </form>
  );
}
