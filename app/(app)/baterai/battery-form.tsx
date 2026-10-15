"use client";

import { useActionState, useState } from "react";
import { z } from "zod";
import { BatteryCharging, ChevronDown, Gauge, NotebookPen } from "lucide-react";
import { saveBaterai } from "@/app/actions/baterai";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, buttonClass, inputClass, textareaClass } from "@/components/ui";
import { useUnsavedGuard } from "@/components/unsaved-guard";
import { cn } from "@/lib/format";
import { bateraiSchema, pick } from "@/lib/validation";
import { JENIS_KIMIA, KONDISI } from "@/lib/wilayah";

export type BatteryInitial = Partial<Record<
  "id" | "pemasokId" | "jenisKimia" | "merek" | "model" | "kapasitasAwalKwh" | "usiaTahun" | "kondisi" | "teganganNominalV" | "jumlahSiklus" | "catatan",
  string
>>;

const FIELDS = ["jenisKimia", "merek", "model", "kapasitasAwalKwh", "usiaTahun", "kondisi", "teganganNominalV", "jumlahSiklus", "catatan"];

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
  const [dirty, setDirty] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const { leave, dialog, lepas } = useUnsavedGuard(dirty);
  const v = { ...initial, ...state?.values } as Record<string, string | undefined>;
  const e = { ...state?.errors, ...clientErrors };
  const jumlahGalat = Object.values(clientErrors).filter(Boolean).length;
  const ubah = Boolean(initial.id);

  // Validasi di peramban memakai skema yang sama dengan server.
  function validasi(fd: FormData) {
    const errors: Record<string, string[] | undefined> = {};
    const parsed = bateraiSchema.safeParse(pick(fd, FIELDS));
    if (!parsed.success) Object.assign(errors, z.flattenError(parsed.error).fieldErrors);
    if (pemasokOptions && !fd.get("pemasokId")) errors.pemasokId = ["Pilih pemasok."];
    return errors;
  }

  const clear = (name: string) => {
    setDirty(true);
    if (clientErrors[name]) setClientErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const err = (name: string) => e[name];
  const angka = (name: string, satuan: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="relative">
      <input
        id={name}
        name={name}
        inputMode="decimal"
        defaultValue={v[name]}
        aria-invalid={Boolean(err(name))}
        onChange={() => clear(name)}
        className={cn(inputClass, "pr-16")}
        {...props}
      />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-400">{satuan}</span>
    </div>
  );
  const teks = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} defaultValue={v[name]} aria-invalid={Boolean(err(name))} onChange={() => clear(name)} className={inputClass} {...props} />
  );
  const pilih = (name: string, placeholder: string, options: readonly { value: string; label: string }[]) => (
    <div className="relative">
      <select
        id={name}
        name={name}
        defaultValue={v[name] ?? ""}
        aria-invalid={Boolean(err(name))}
        onChange={() => clear(name)}
        className={cn(inputClass, "appearance-none truncate pr-10")}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
    </div>
  );
  const opsi = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

  return (
    <form
      action={action}
      noValidate
      onSubmit={(ev) => {
        const fd = new FormData(ev.currentTarget);
        const errors = validasi(fd);
        if (Object.keys(errors).length) {
          ev.preventDefault();
          setClientErrors(errors);
          const first = ev.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`);
          first?.focus();
          return;
        }
        setClientErrors({});
        lepas();
      }}
    >
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state?.message && !jumlahGalat && (
        <Notice tone="danger" className="mb-4">
          {state.message}
        </Notice>
      )}
      {jumlahGalat > 0 && (
        <Notice tone="danger" className="mb-4" title="Formulir belum lengkap">
          Periksa {jumlahGalat} kolom yang ditandai merah. Semua kolom wajib diisi.
        </Notice>
      )}

      <Card className="!p-0">
        <Bagian icon={<BatteryCharging className="size-4" />} judul="Identitas baterai" keterangan="Asal dan jenis baterai.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pemasokOptions && (
              <Field label="Pemasok" htmlFor="pemasokId" error={err("pemasokId")} required className="sm:col-span-2">
                {pilih("pemasokId", "Pilih pemasok", pemasokOptions.map((p) => ({ value: p.id, label: p.nama })))}
              </Field>
            )}
            <Field label="Jenis kimia" htmlFor="jenisKimia" error={err("jenisKimia")} required>
              {pilih("jenisKimia", "Pilih jenis", opsi(JENIS_KIMIA))}
            </Field>
            <Field label="Kondisi fisik" htmlFor="kondisi" error={err("kondisi")} required>
              {pilih("kondisi", "Pilih kondisi", opsi(KONDISI))}
            </Field>
            <Field label="Merek" htmlFor="merek" error={err("merek")} required className={cn(pemasokOptions && "sm:col-span-2")}>
              {teks("merek", { placeholder: "mis. VoltaNusa", autoComplete: "off" })}
            </Field>
            <Field label="Model" htmlFor="model" error={err("model")} required className={cn(pemasokOptions && "sm:col-span-2")}>
              {teks("model", { placeholder: "mis. Bus Pack 50", autoComplete: "off" })}
            </Field>
          </div>
        </Bagian>

        <Bagian icon={<Gauge className="size-4" />} judul="Spesifikasi teknis" keterangan="Dipakai untuk penilaian kesehatan dan cek kompatibilitas inverter.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Kapasitas awal" htmlFor="kapasitasAwalKwh" error={err("kapasitasAwalKwh")} required hint="Saat baterai masih baru.">
              {angka("kapasitasAwalKwh", "kWh", { placeholder: "50" })}
            </Field>
            <Field label="Tegangan nominal" htmlFor="teganganNominalV" error={err("teganganNominalV")} required hint="Tertera di label paket.">
              {angka("teganganNominalV", "V", { placeholder: "51,2" })}
            </Field>
            <Field label="Usia pemakaian" htmlFor="usiaTahun" error={err("usiaTahun")} required hint="Sejak pertama dipakai.">
              {angka("usiaTahun", "tahun", { placeholder: "5" })}
            </Field>
            <Field label="Jumlah siklus" htmlFor="jumlahSiklus" error={err("jumlahSiklus")} required hint="Dari BMS atau catatan servis.">
              {angka("jumlahSiklus", "siklus", { placeholder: "1200", inputMode: "numeric" })}
            </Field>
          </div>
        </Bagian>

        <Bagian icon={<NotebookPen className="size-4" />} judul="Catatan" keterangan="Riwayat pemakaian dan kondisi fisik, sebagai bahan pertimbangan saat penilaian.">
          <Field label="Catatan riwayat baterai" htmlFor="catatan" error={err("catatan")} required>
            <textarea
              id="catatan"
              name="catatan"
              rows={3}
              defaultValue={v.catatan}
              aria-invalid={Boolean(err("catatan"))}
              onChange={() => clear("catatan")}
              className={cn(textareaClass, "min-h-24")}
              placeholder="mis. Bekas bus kota 4 tahun, sering fast charging, casing utuh tanpa penyok, belum pernah diperbaiki."
            />
          </Field>
        </Bagian>

        <div className="flex flex-col gap-3 border-t border-ink-100 bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-ink-500">
            <span className="text-flame-500">*</span> Semua kolom wajib diisi.{" "}
            {ubah ? "Perubahan langsung terlihat oleh pengelola desa." : "Setelah disimpan, baterai berstatus Belum dinilai sampai dinilai pengelola desa."}
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => leave(cancelHref)} className={buttonClass("ghost", "md")}>
              Batal
            </button>
            <SubmitButton pendingText="Menyimpan…">
              {ubah ? "Simpan perubahan" : "Simpan baterai"}
            </SubmitButton>
          </div>
        </div>
      </Card>
      {dialog}
    </form>
  );
}

function Bagian({ icon, judul, keterangan, children }: { icon: React.ReactNode; judul: string; keterangan: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-ink-100 px-5 py-5 last:border-0 sm:px-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-700">{icon}</span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">{judul}</h2>
          <p className="text-xs text-ink-500">{keterangan}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
