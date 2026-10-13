"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { runAssessment } from "@/app/actions/penilaian";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass } from "@/components/ui";
import { JENIS_KIMIA } from "@/lib/wilayah";

type Values = Record<string, string>;

export function AssessmentForm({
  daftar,
  initial,
  terpilih,
}: {
  daftar: { id: string; label: string }[];
  initial: Values;
  terpilih: { kode: string; nama: string; pemasok: string; kondisi: string; kapasitas: string } | null;
}) {
  const router = useRouter();
  const [state, action] = useActionState(runAssessment, undefined);
  const v: Values = { ...initial, ...state?.values };
  const e = state?.errors ?? {};
  const num = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} inputMode="decimal" defaultValue={v[name]} aria-invalid={Boolean(e[name])} className={inputClass} {...props} />
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Notice tone="danger" title="Penilaian belum dapat dihitung">{state.message}</Notice>}
      <Card>
        <p className="eyebrow mb-4">1 · Pilih baterai</p>
        <Field label="Baterai" htmlFor="bateraiId" error={e.bateraiId} hint="Memilih baterai mengisi otomatis data dari pemasok (ADM-4).">
          <select
            id="bateraiId"
            name="bateraiId"
            defaultValue={v.bateraiId ?? ""}
            onChange={(ev) => router.push(`/penilaian/baru?baterai=${ev.target.value}`)}
            className={inputClass}
            aria-invalid={Boolean(e.bateraiId)}
          >
            <option value="" disabled>
              Pilih baterai…
            </option>
            {daftar.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        {terpilih && (
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-ink-50 p-4 text-sm ring-1 ring-ink-100 sm:grid-cols-4">
            <div>
              <p className="text-xs text-ink-500">Kode</p>
              <p className="num font-semibold">{terpilih.kode}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Baterai</p>
              <p className="font-medium">{terpilih.nama}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Pemasok</p>
              <p className="truncate font-medium">{terpilih.pemasok}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500">Kondisi</p>
              <p className="font-medium">{terpilih.kondisi}</p>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <p className="eyebrow mb-4">2 · Data kapasitas</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kapasitas awal (kWh)" htmlFor="kapasitasAwal" error={e.kapasitasAwal}>
            {num("kapasitasAwal", { placeholder: "50" })}
          </Field>
          <Field label="Kapasitas aktual (kWh)" htmlFor="kapasitasAktual" error={e.kapasitasAktual} hint="Hasil uji kapasitas. Kosong = estimasi bawaan (keyakinan turun).">
            {num("kapasitasAktual", { placeholder: "35" })}
          </Field>
          <Field label="Jenis kimia" htmlFor="kimia" optional>
            <select id="kimia" name="kimia" defaultValue={v.kimia ?? ""} className={inputClass}>
              <option value="">Tidak diketahui</option>
              {JENIS_KIMIA.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </Field>
          <Field label="Usia pemakaian (tahun)" htmlFor="usia" error={e.usia} optional>
            {num("usia", { placeholder: "6" })}
          </Field>
          <Field label="Jumlah siklus" htmlFor="siklus" error={e.siklus} optional>
            {num("siklus", { placeholder: "1200", inputMode: "numeric" })}
          </Field>
          <Field label="Hambatan internal (mΩ)" htmlFor="hambatan" error={e.hambatan} optional>
            {num("hambatan", { placeholder: "45" })}
          </Field>
        </div>
      </Card>

      <Card>
        <p className="eyebrow mb-1">3 · Riwayat pemakaian</p>
        <p className="mb-4 text-sm text-ink-500">Isi bila tersedia. Data ini memengaruhi rentang sisa umur dan skor keyakinan.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kedalaman pengosongan (%)" htmlFor="dod" error={e.dod} optional>
            {num("dod", { placeholder: "80" })}
          </Field>
          <Field label="Pengisian cepat (% dari pengisian)" htmlFor="pengisianCepat" error={e.pengisianCepat} optional>
            {num("pengisianCepat", { placeholder: "30" })}
          </Field>
          <Field label="Suhu rata-rata (°C)" htmlFor="suhu" error={e.suhu} optional>
            {num("suhu", { placeholder: "32" })}
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="lg" pendingText="Menghitung…">
          Hitung & terbitkan paspor
        </SubmitButton>
        <p className="text-xs text-ink-500">Perhitungan dilakukan oleh mesin hitung SOLUNA (deterministik).</p>
      </div>
    </form>
  );
}
