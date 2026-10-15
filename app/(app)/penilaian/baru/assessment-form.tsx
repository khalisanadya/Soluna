"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { BatteryCharging, Gauge, History } from "lucide-react";
import { runAssessment } from "@/app/actions/penilaian";
import { Pilih } from "@/components/filter-kit";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { useUnsavedGuard } from "@/components/unsaved-guard";
import { cn } from "@/lib/format";
import { PENILAIAN_FIELDS, penilaianSchema, pick } from "@/lib/validation";
import { JENIS_KIMIA } from "@/lib/wilayah";

type Values = Record<string, string>;
type Terpilih = { kode: string; nama: string; pemasok: string; kondisi: string; dinilai: boolean };

export function AssessmentForm({ daftar, initial, terpilih }: { daftar: { id: string; label: string }[]; initial: Values; terpilih: Terpilih | null }) {
  const router = useRouter();
  const [state, action] = useActionState(runAssessment, undefined);
  const [dirty, setDirty] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const { leave, dialog, lepas } = useUnsavedGuard(dirty);
  const v: Values = { ...initial, ...state?.values };
  const e = { ...state?.errors, ...clientErrors };
  const jumlahGalat = Object.values(clientErrors).filter(Boolean).length;
  const err = (name: string) => e[name];

  const clear = (name: string) => {
    setDirty(true);
    if (clientErrors[name]) setClientErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const angka = (name: string, satuan: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="relative">
      <input
        id={name}
        name={name}
        inputMode="decimal"
        defaultValue={v[name]}
        aria-invalid={Boolean(err(name))}
        onChange={() => clear(name)}
        disabled={!terpilih}
        className={cn(inputClass, "pr-14 disabled:cursor-not-allowed disabled:bg-ink-50")}
        {...props}
      />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-400">{satuan}</span>
    </div>
  );

  return (
    <form
      action={action}
      noValidate
      onSubmit={(ev) => {
        const parsed = penilaianSchema.safeParse(pick(new FormData(ev.currentTarget), PENILAIAN_FIELDS));
        if (!parsed.success) {
          ev.preventDefault();
          const errors = z.flattenError(parsed.error).fieldErrors;
          setClientErrors(errors);
          ev.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus();
          return;
        }
        setClientErrors({});
        lepas();
      }}
    >
      {state?.message && !jumlahGalat && (
        <Notice tone="danger" className="mb-4" title="Penilaian belum dapat dihitung">
          {state.message}
        </Notice>
      )}
      {jumlahGalat > 0 && (
        <Notice tone="danger" className="mb-4" title="Formulir belum lengkap">
          Periksa {jumlahGalat} kolom yang ditandai merah. Semua kolom wajib diisi.
        </Notice>
      )}

      <Notice tone="info" className="mb-4" title="Hasil dihitung model baterai terlatih">
        Formulir ini hanya menerima data uji dari pemasok. Aplikasi tidak menghitung atau mengisi sisa umur secara manual; hasil SoH, grade, confidence, sisa umur, dan paspor diambil dari layanan model yang dikonfigurasi melalui ENV.
      </Notice>
      <Card className="!p-0">
        <Bagian icon={<BatteryCharging className="size-4" />} judul="Baterai" keterangan="Data dari pemasok terisi otomatis setelah baterai dipilih.">
          <Field label="Baterai yang dinilai" htmlFor="bateraiId" error={err("bateraiId")} required>
            <Pilih
              id="bateraiId"
              name="bateraiId"
              defaultValue={v.bateraiId ?? ""}
              aria-invalid={Boolean(err("bateraiId"))}
              onChange={(ev) => {
                const href = `/penilaian/baru?baterai=${ev.target.value}`;
                // Ganti baterai memuat ulang data; konfirmasi bila isian sudah diubah.
                if (dirty) {
                  ev.target.value = v.bateraiId ?? "";
                  leave(href);
                } else router.replace(href);
              }}
            >
              <option value="" disabled>
                Pilih baterai
              </option>
              {daftar.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </Pilih>
          </Field>
          {terpilih && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-ink-50 px-4 py-3 text-sm sm:grid-cols-4">
              {[
                ["Kode", terpilih.kode],
                ["Baterai", terpilih.nama],
                ["Pemasok", terpilih.pemasok],
                ["Kondisi fisik", terpilih.kondisi],
              ].map(([k, val]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-ink-500">{k}</dt>
                  <dd className="truncate font-medium text-ink-900" title={val}>
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {terpilih?.dinilai && <p className="mt-2 text-xs text-ink-500">Baterai ini sudah pernah dinilai; isian memakai data penilaian terakhir dan akan diterbitkan sebagai paspor baru.</p>}
        </Bagian>

          <Bagian icon={<Gauge className="size-4" />} judul="Hasil pengukuran" keterangan="Dari uji kapasitas dan pembacaan BMS.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Kapasitas awal" htmlFor="kapasitasAwal" error={err("kapasitasAwal")} required hint="Saat baterai masih baru.">
                {angka("kapasitasAwal", "kWh", { placeholder: "50" })}
              </Field>
              <Field label="Kapasitas aktual" htmlFor="kapasitasAktual" error={err("kapasitasAktual")} required hint="Hasil uji kapasitas.">
                {angka("kapasitasAktual", "kWh", { placeholder: "35" })}
              </Field>
              <Field label="Hambatan internal" htmlFor="hambatan" error={err("hambatan")} required hint="Pembacaan alat uji.">
                {angka("hambatan", "mΩ", { placeholder: "45" })}
              </Field>
              <Field label="Jumlah siklus" htmlFor="siklus" error={err("siklus")} required hint="Dari BMS.">
                {angka("siklus", "siklus", { placeholder: "1200", inputMode: "numeric" })}
              </Field>
            </div>
          </Bagian>

          <Bagian icon={<History className="size-4" />} judul="Riwayat pemakaian" keterangan="Memengaruhi perkiraan sisa umur baterai.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Jenis kimia" htmlFor="kimia" error={err("kimia")} required>
                <Pilih id="kimia" name="kimia" defaultValue={v.kimia ?? ""} aria-invalid={Boolean(err("kimia"))} onChange={() => clear("kimia")} disabled={!terpilih}>
                  <option value="" disabled>
                    Pilih jenis
                  </option>
                  {JENIS_KIMIA.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </Pilih>
              </Field>
              <Field label="Usia pemakaian" htmlFor="usia" error={err("usia")} required>
                {angka("usia", "tahun", { placeholder: "6" })}
              </Field>
              <Field label="Kedalaman pengosongan" htmlFor="dod" error={err("dod")} required hint="Rata-rata per siklus.">
                {angka("dod", "%", { placeholder: "80" })}
              </Field>
              <Field label="Pengisian cepat" htmlFor="pengisianCepat" error={err("pengisianCepat")} required hint="Porsi dari semua pengisian.">
                {angka("pengisianCepat", "%", { placeholder: "30" })}
              </Field>
              <Field label="Suhu rata-rata" htmlFor="suhu" error={err("suhu")} required hint="Suhu kerja baterai.">
                {angka("suhu", "°C", { placeholder: "32" })}
              </Field>
            </div>
          </Bagian>

        <div className="flex flex-col gap-3 border-t border-ink-100 bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-ink-500">
            <span className="text-flame-500">*</span> Semua kolom wajib diisi. Hasil langsung diterbitkan sebagai paspor baterai.
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => leave("/penilaian")} className={buttonClass("ghost", "md")}>
              Batal
            </button>
            <SubmitButton pendingText="Menghitung…" disabled={!terpilih}>
              Hitung & terbitkan paspor
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
    <section className="border-b border-ink-100 px-5 py-5 sm:px-6">
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
