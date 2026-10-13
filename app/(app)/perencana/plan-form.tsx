"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import { runPlan } from "@/app/actions/perencana";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass } from "@/components/ui";
import { cn } from "@/lib/format";

type Defaults = Record<"psh" | "pr" | "efisiensi" | "dod" | "hariCadangan" | "wpPanel" | "kapasitasPaket" | "sohPaket", number>;

export function PlanForm({
  lokasi,
  perangkat,
  baterai,
  defaults,
}: {
  lokasi: { nama: string; psh: number }[];
  perangkat: { nama: string; tingkat: string }[];
  baterai: { id: string; label: string }[];
  defaults: Defaults;
}) {
  const [state, action] = useActionState(runPlan, undefined);
  const v = state?.values ?? {};
  const e = state?.errors ?? {};
  const [sumber, setSumber] = useState<"bawaan" | "baterai">((v.sumberPaket as "baterai") ?? "bawaan");
  const [lok, setLok] = useState(v.lokasi ?? "Bawaan");
  const pshLokasi = lokasi.find((l) => l.nama === lok)?.psh ?? defaults.psh;
  const beban = v.jenisBeban ? v.jenisBeban.split("|") : perangkat.map((p) => p.nama);

  const num = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input id={name} name={name} inputMode="decimal" defaultValue={v[name]} aria-invalid={Boolean(e[name])} className={inputClass} {...props} />
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message && <Notice tone="danger" title="Perencanaan belum dapat dihitung">{state.message}</Notice>}
      <Card>
        <p className="eyebrow mb-4">1 · Profil desa</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama desa" htmlFor="namaDesa" error={e.namaDesa}>
            {num("namaDesa", { inputMode: "text", placeholder: "Desa Sukamaju" })}
          </Field>
          <Field label="Nama rencana" htmlFor="nama" optional>
            {num("nama", { inputMode: "text", placeholder: "Rencana tahap 1" })}
          </Field>
          <Field label="Jumlah rumah" htmlFor="jumlahRumah" error={e.jumlahRumah}>
            {num("jumlahRumah", { inputMode: "numeric", placeholder: "50" })}
          </Field>
          <Field label="Konsumsi per rumah (kWh/hari)" htmlFor="konsumsi" error={e.konsumsi} hint="Penerangan, ponsel, kipas: sekitar 1 kWh/hari.">
            {num("konsumsi", { placeholder: "1" })}
          </Field>
          <Field label="Pemakaian malam (%)" htmlFor="porsiMalam" error={e.porsiMalam} hint="Bagian energi yang dipakai setelah matahari terbenam.">
            {num("porsiMalam", { placeholder: "60" })}
          </Field>
          <Field label="Lokasi (faktor penyinaran)" htmlFor="lokasi" hint={`PSH bawaan lokasi ini: ${pshLokasi} jam/hari`}>
            <select id="lokasi" name="lokasi" value={lok} onChange={(ev) => setLok(ev.target.value)} className={inputClass}>
              {lokasi.map((l) => (
                <option key={l.nama} value={l.nama}>
                  {l.nama} — {l.psh} jam
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-ink-800">Jenis beban</legend>
          <div className="flex flex-wrap gap-2">
            {perangkat.map((p) => (
              <label key={p.nama} className="cursor-pointer">
                <input type="checkbox" name="jenisBeban" value={p.nama} defaultChecked={beban.includes(p.nama)} className="peer sr-only" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-sm text-ink-600 ring-1 ring-transparent transition peer-checked:bg-ink-900 peer-checked:text-white peer-focus-visible:ring-sun-500">
                  {p.nama}
                  <span className="text-[0.65rem] opacity-60">{p.tingkat}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card>
        <p className="eyebrow mb-4">2 · Paket baterai</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { k: "bawaan" as const, t: "Profil paket bawaan", d: "Kapasitas dan SoH dari konfigurasi" },
            { k: "baterai" as const, t: "Baterai yang sudah dinilai", d: `${baterai.length} baterai grade A–C tersedia` },
          ].map((o) => (
            <label key={o.k} className={cn("cursor-pointer rounded-2xl p-4 ring-1 transition", sumber === o.k ? "bg-ink-900 text-white ring-ink-900" : "ring-ink-200 hover:ring-ink-300")}>
              <input type="radio" name="sumberPaket" value={o.k} checked={sumber === o.k} onChange={() => setSumber(o.k)} className="sr-only" />
              <span className="block text-sm font-semibold">{o.t}</span>
              <span className={cn("text-xs", sumber === o.k ? "text-ink-300" : "text-ink-500")}>{o.d}</span>
            </label>
          ))}
        </div>
        {sumber === "baterai" ? (
          <Field label="Pilih baterai sebagai paket" htmlFor="bateraiId" error={e.bateraiId} className="mt-4" hint="SoH hasil Modul A dipakai langsung dalam rumus (P-12).">
            <select id="bateraiId" name="bateraiId" defaultValue={v.bateraiId ?? ""} className={inputClass} aria-invalid={Boolean(e.bateraiId)}>
              <option value="" disabled>
                Pilih baterai…
              </option>
              {baterai.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Kapasitas per paket (kWh)" htmlFor="kapasitasPaket" error={e.kapasitasPaket} optional>
              {num("kapasitasPaket", { placeholder: String(defaults.kapasitasPaket) })}
            </Field>
            <Field label="SoH paket (%)" htmlFor="sohPaket" error={e.sohPaket} optional>
              {num("sohPaket", { placeholder: String(defaults.sohPaket) })}
            </Field>
          </div>
        )}
      </Card>

      <details className="group rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-ink-200/60" open={Object.keys(e).some((k) => ["psh", "pr", "efisiensi", "dod", "hariCadangan", "wpPanel"].includes(k))}>
        <summary className="flex cursor-pointer list-none items-center justify-between p-5 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="eyebrow block">3 · Parameter teknis (opsional)</span>
            <span className="text-sm text-ink-500">Kosongkan untuk memakai nilai bawaan dari konfigurasi.</span>
          </span>
          <ChevronDown className="size-5 text-ink-400 transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-4 px-5 pb-6 sm:grid-cols-3 sm:px-6">
          <Field label="PSH (jam)" htmlFor="psh" error={e.psh}>
            {num("psh", { placeholder: String(pshLokasi) })}
          </Field>
          <Field label="Performance ratio (%)" htmlFor="pr" error={e.pr}>
            {num("pr", { placeholder: String(defaults.pr) })}
          </Field>
          <Field label="Efisiensi η (%)" htmlFor="efisiensi" error={e.efisiensi}>
            {num("efisiensi", { placeholder: String(defaults.efisiensi) })}
          </Field>
          <Field label="DoD (%)" htmlFor="dod" error={e.dod}>
            {num("dod", { placeholder: String(defaults.dod) })}
          </Field>
          <Field label="Hari cadangan mendung" htmlFor="hariCadangan" error={e.hariCadangan}>
            {num("hariCadangan", { inputMode: "numeric", placeholder: String(defaults.hariCadangan) })}
          </Field>
          <Field label="Kapasitas per panel (Wp)" htmlFor="wpPanel" error={e.wpPanel}>
            {num("wpPanel", { inputMode: "numeric", placeholder: String(defaults.wpPanel) })}
          </Field>
          <Field label="Periode perbandingan (hari)" htmlFor="periode">
            <select id="periode" name="periode" defaultValue={v.periode ?? "30"} className={inputClass}>
              <option value="30">30 hari (bulanan)</option>
              <option value="365">365 hari (tahunan)</option>
            </select>
          </Field>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="lg" pendingText="Menghitung rancangan…">
          Hitung rancangan
        </SubmitButton>
        <p className="text-xs text-ink-500">Semua keluaran adalah rumus deterministik (bagian 5 dokumen kebutuhan).</p>
      </div>
    </form>
  );
}
