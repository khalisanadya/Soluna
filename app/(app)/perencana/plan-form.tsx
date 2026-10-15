"use client";

import { useActionState, useState } from "react";
import { BatteryCharging, ChevronDown, Fuel, Home, SlidersHorizontal } from "lucide-react";
import { runPlan } from "@/app/actions/perencana";
import { Pilih } from "@/components/filter-kit";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { useUnsavedGuard } from "@/components/unsaved-guard";
import { cn } from "@/lib/format";
import { RENCANA_FIELDS, pick, validasiRencana } from "@/lib/validation";

export type PlanDefaults = Record<
  "psh" | "pr" | "efisiensi" | "dod" | "hariCadangan" | "wpPanel" | "kapasitasPaket" | "sohPaket" | "hargaSolarMin" | "hargaSolarMaks",
  number
>;

// Kolom teknis yang dilipat; bila salah satunya bermasalah, bagian ini dibuka otomatis.
const TEKNIS = ["psh", "pr", "efisiensi", "dod", "wpPanel"];

export function PlanForm({ lokasi, baterai, defaults }: { lokasi: { nama: string; psh: number }[]; baterai: { id: string; label: string }[]; defaults: PlanDefaults }) {
  const [state, action] = useActionState(runPlan, undefined);
  const [dirty, setDirty] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string[] | undefined>>({});
  const { leave, dialog, lepas } = useUnsavedGuard(dirty);
  const v: Record<string, string | undefined> = state?.values ?? {};
  const e = { ...state?.errors, ...clientErrors };
  const jumlahGalat = Object.values(clientErrors).filter(Boolean).length;
  const err = (name: string) => e[name];

  const [sumber, setSumber] = useState<"bawaan" | "baterai">((v.sumberPaket as "baterai") ?? "bawaan");
  const [lok, setLok] = useState(v.lokasi ?? "Bawaan");
  const pshLokasi = (nama: string) => lokasi.find((l) => l.nama === nama)?.psh ?? defaults.psh;
  const [psh, setPsh] = useState(v.psh ?? String(pshLokasi(lok)));
  const [teknisBuka, setTeknisBuka] = useState(false);
  const buka = teknisBuka || TEKNIS.some((k) => e[k]);

  const clear = (name: string) => {
    setDirty(true);
    if (clientErrors[name]) setClientErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const isian = (name: string, satuan: string | null, bawaan: string | number | undefined, props: React.ComponentProps<"input"> = {}) => (
    <div className="relative">
      <input
        id={name}
        name={name}
        inputMode="decimal"
        defaultValue={v[name] ?? (bawaan === undefined ? "" : String(bawaan))}
        aria-invalid={Boolean(err(name))}
        onChange={() => clear(name)}
        className={cn(inputClass, satuan && "pr-16")}
        {...props}
      />
      {satuan && <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-400">{satuan}</span>}
    </div>
  );

  return (
    <form
      action={action}
      noValidate
      onChange={() => setDirty(true)}
      onSubmit={(ev) => {
        const form = ev.currentTarget;
        const r = validasiRencana(pick(new FormData(form), RENCANA_FIELDS));
        if (!r.ok) {
          ev.preventDefault();
          setClientErrors(r.errors);
          if (TEKNIS.some((k) => r.errors[k])) setTeknisBuka(true);
          const first = Object.keys(r.errors)[0];
          requestAnimationFrame(() => form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus());
          return;
        }
        setClientErrors({});
        lepas();
      }}
    >
      {state?.message && !jumlahGalat && (
        <Notice tone="danger" className="mb-4" title="Perencanaan belum dapat dihitung">
          {state.message}
        </Notice>
      )}
      {jumlahGalat > 0 && (
        <Notice tone="danger" className="mb-4" title="Formulir belum lengkap">
          Periksa {jumlahGalat} kolom yang ditandai merah. Semua kolom wajib diisi.
        </Notice>
      )}

      <Card className="!p-0">
        <Bagian icon={<Home className="size-4" />} judul="Profil desa" keterangan="Jumlah rumah dan pola pemakaian listrik.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama desa" htmlFor="namaDesa" error={err("namaDesa")} required>
              {isian("namaDesa", null, undefined, { inputMode: "text", placeholder: "mis. Desa Sukamaju", autoComplete: "off" })}
            </Field>
            <Field label="Nama rencana" htmlFor="nama" error={err("nama")} required>
              {isian("nama", null, undefined, { inputMode: "text", placeholder: "mis. Rencana tahap 1", autoComplete: "off" })}
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Jumlah rumah" htmlFor="jumlahRumah" error={err("jumlahRumah")} required>
              {isian("jumlahRumah", "rumah", undefined, { inputMode: "numeric", placeholder: "50" })}
            </Field>
            <Field label="Konsumsi per rumah" htmlFor="konsumsi" error={err("konsumsi")} required hint="Lampu, ponsel, kipas ±1.">
              {isian("konsumsi", "kWh/hari", undefined, { placeholder: "1" })}
            </Field>
            <Field label="Pemakaian malam" htmlFor="porsiMalam" error={err("porsiMalam")} required hint="Setelah matahari terbenam.">
              {isian("porsiMalam", "%", undefined, { placeholder: "60" })}
            </Field>
            <Field label="Lokasi" htmlFor="lokasi" error={err("lokasi")} required hint="Menentukan jam matahari.">
              <Pilih
                id="lokasi"
                name="lokasi"
                value={lok}
                onChange={(ev) => {
                  setLok(ev.target.value);
                  setPsh(String(pshLokasi(ev.target.value)));
                  clear("lokasi");
                }}
              >
                {lokasi.map((l) => (
                  <option key={l.nama} value={l.nama}>
                    {l.nama}
                  </option>
                ))}
              </Pilih>
            </Field>
          </div>
        </Bagian>

        <Bagian icon={<BatteryCharging className="size-4" />} judul="Paket baterai" keterangan="Sumber baterai dan cadangan saat cuaca mendung.">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Sumber paket baterai">
            {[
              { k: "bawaan" as const, t: "Profil paket", d: "Isi kapasitas dan SoH paket sendiri" },
              { k: "baterai" as const, t: "Baterai yang sudah dinilai", d: `${baterai.length} baterai grade A–C tersedia` },
            ].map((o) => (
              <label key={o.k} className={cn("cursor-pointer rounded-xl px-4 py-3 ring-1 transition", sumber === o.k ? "bg-ink-900 text-white ring-ink-900" : "ring-ink-200 hover:bg-ink-50")}>
                <input
                  type="radio"
                  name="sumberPaket"
                  value={o.k}
                  checked={sumber === o.k}
                  onChange={() => {
                    setSumber(o.k);
                    setClientErrors((p) => ({ ...p, kapasitasPaket: undefined, sohPaket: undefined, bateraiId: undefined }));
                  }}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{o.t}</span>
                <span className={cn("text-xs", sumber === o.k ? "text-ink-300" : "text-ink-500")}>{o.d}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {sumber === "baterai" ? (
              <Field label="Baterai" htmlFor="bateraiId" error={err("bateraiId")} required className="sm:col-span-2">
                <Pilih id="bateraiId" name="bateraiId" defaultValue={v.bateraiId ?? ""} aria-invalid={Boolean(err("bateraiId"))} onChange={() => clear("bateraiId")}>
                  <option value="" disabled>
                    Pilih baterai
                  </option>
                  {baterai.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </Pilih>
              </Field>
            ) : (
              <>
                <Field label="Kapasitas per paket" htmlFor="kapasitasPaket" error={err("kapasitasPaket")} required>
                  {isian("kapasitasPaket", "kWh", defaults.kapasitasPaket)}
                </Field>
                <Field label="SoH paket" htmlFor="sohPaket" error={err("sohPaket")} required hint="Kapasitas sisa baterai.">
                  {isian("sohPaket", "%", defaults.sohPaket)}
                </Field>
              </>
            )}
            <Field label="Hari cadangan" htmlFor="hariCadangan" error={err("hariCadangan")} required hint="Untuk hari mendung berturut-turut.">
              {isian("hariCadangan", "hari", defaults.hariCadangan, { inputMode: "numeric" })}
            </Field>
          </div>
        </Bagian>

        <Bagian icon={<Fuel className="size-4" />} judul="Perbandingan biaya" keterangan="Harga solar di desa untuk membandingkan biaya dengan genset diesel.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Harga solar terendah" htmlFor="hargaSolarMin" error={err("hargaSolarMin")} required>
              {isian("hargaSolarMin", "Rp/liter", defaults.hargaSolarMin, { inputMode: "numeric" })}
            </Field>
            <Field label="Harga solar tertinggi" htmlFor="hargaSolarMaks" error={err("hargaSolarMaks")} required hint="Termasuk ongkos angkut ke desa.">
              {isian("hargaSolarMaks", "Rp/liter", defaults.hargaSolarMaks, { inputMode: "numeric" })}
            </Field>
            <Field label="Periode perbandingan" htmlFor="periode" error={err("periode")} required>
              <Pilih id="periode" name="periode" defaultValue={v.periode ?? "30"}>
                <option value="30">Per bulan</option>
                <option value="365">Per tahun</option>
              </Pilih>
            </Field>
          </div>
        </Bagian>

        <section className="border-b border-ink-100">
          <button type="button" onClick={() => setTeknisBuka(!buka)} aria-expanded={buka} className="flex w-full items-center gap-3 px-5 py-4 text-left sm:px-6">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-600">
              <SlidersHorizontal className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink-900">Parameter teknis</span>
              <span className="block truncate text-xs text-ink-500">Sudah terisi nilai standar; ubah bila ada data lapangan.</span>
            </span>
            <ChevronDown className={cn("size-5 shrink-0 text-ink-400 transition", buka && "rotate-180")} />
          </button>
          {/* Tetap dirender saat tertutup agar nilainya ikut terkirim. */}
          <div className={cn("grid gap-4 px-5 pb-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-5", !buka && "hidden")}>
            <Field label="Jam matahari efektif" htmlFor="psh" error={err("psh")} required hint="Ikut lokasi.">
              <div className="relative">
                <input
                  id="psh"
                  name="psh"
                  inputMode="decimal"
                  value={psh}
                  onChange={(ev) => {
                    setPsh(ev.target.value);
                    clear("psh");
                  }}
                  aria-invalid={Boolean(err("psh"))}
                  className={cn(inputClass, "pr-16")}
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-ink-400">jam</span>
              </div>
            </Field>
            <Field label="Rasio kinerja panel" htmlFor="pr" error={err("pr")} required>
              {isian("pr", "%", defaults.pr)}
            </Field>
            <Field label="Efisiensi konversi" htmlFor="efisiensi" error={err("efisiensi")} required>
              {isian("efisiensi", "%", defaults.efisiensi)}
            </Field>
            <Field label="Batas pengosongan" htmlFor="dod" error={err("dod")} required>
              {isian("dod", "%", defaults.dod)}
            </Field>
            <Field label="Kapasitas per panel" htmlFor="wpPanel" error={err("wpPanel")} required>
              {isian("wpPanel", "Wp", defaults.wpPanel, { inputMode: "numeric" })}
            </Field>
          </div>
        </section>

        <div className="flex flex-col gap-3 bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-ink-500">
            <span className="text-flame-500">*</span> Semua kolom wajib diisi. Hasil rencana tersimpan otomatis.
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => leave("/dashboard")} className={buttonClass("ghost", "md")}>
              Batal
            </button>
            <SubmitButton pendingText="Menghitung…">Hitung rancangan</SubmitButton>
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
