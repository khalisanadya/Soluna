"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { runCompatibility } from "@/app/actions/kompatibilitas";
import { ExplanationCard } from "@/components/calc";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, Disclaimer, Field, Notice, inputClass } from "@/components/ui";
import { cn } from "@/lib/format";
import type { StatusKompat } from "@/lib/types";

const PRESET = [
  { t: "Inverter 24 V", nominal: 24, min: 20, maks: 30 },
  { t: "Inverter 48 V", nominal: 48, min: 40, maks: 60 },
  { t: "Tegangan tinggi", nominal: 350, min: 150, maks: 500 },
];

const STYLE: Record<StatusKompat, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string }> = {
  layak: { icon: CheckCircle2, bg: "bg-leaf-500", text: "text-leaf-600" },
  perlu_penyesuaian: { icon: CircleAlert, bg: "bg-amber-500", text: "text-amber-600" },
  tidak_layak: { icon: CircleX, bg: "bg-flame-500", text: "text-flame-600" },
};

export function CompatForm({ initial, konteks }: { initial: Record<string, string>; konteks: string | null }) {
  const [state, action] = useActionState(runCompatibility, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const v = { ...initial, ...state?.values };
  const e = state?.errors ?? {};
  const field = (name: string, label: string, opts: { hint?: string; optional?: boolean; placeholder?: string } = {}) => (
    <Field label={label} htmlFor={name} error={e[name]} hint={opts.hint} optional={opts.optional}>
      <input id={name} name={name} inputMode="decimal" defaultValue={v[name]} placeholder={opts.placeholder} aria-invalid={Boolean(e[name])} className={inputClass} />
    </Field>
  );
  const applyPreset = (p: (typeof PRESET)[number]) => {
    const f = formRef.current;
    if (!f) return;
    (f.elements.namedItem("vNominal") as HTMLInputElement).value = String(p.nominal);
    (f.elements.namedItem("vMin") as HTMLInputElement).value = String(p.min);
    (f.elements.namedItem("vMaks") as HTMLInputElement).value = String(p.maks);
  };
  const h = state?.hasil;

  return (
    <div className="space-y-4">
      <form ref={formRef} action={action} className="grid gap-4 lg:grid-cols-2" noValidate>
        {v.bateraiId && <input type="hidden" name="bateraiId" value={v.bateraiId} />}
        {v.rencanaId && <input type="hidden" name="rencanaId" value={v.rencanaId} />}
        {konteks && (
          <Notice tone="info" className="lg:col-span-2">
            Data terisi dari {konteks}. Hasil pemeriksaan akan tampil di {v.bateraiId ? "paspor baterai" : "hasil perencanaan"}.
          </Notice>
        )}
        {state?.message && (
          <Notice tone="danger" className="lg:col-span-2">
            {state.message}
          </Notice>
        )}
        <Card>
          <p className="eyebrow mb-4">Baterai</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("vBaterai", "Tegangan nominal baterai (V)", { placeholder: "51,2" })}
            <Field label="Grade" htmlFor="grade" optional>
              <select id="grade" name="grade" defaultValue={v.grade ?? ""} className={inputClass}>
                <option value="">Tidak diketahui</option>
                {["A", "B", "C", "D"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </Field>
            {field("soh", "SoH (%)", { optional: true })}
            {field("kapasitas", "Kapasitas per paket (kWh)", { optional: true })}
            {field("paket", "Jumlah paket", { optional: true })}
          </div>
        </Card>
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">Inverter</p>
            <div className="flex flex-wrap gap-1">
              {PRESET.map((p) => (
                <button type="button" key={p.t} onClick={() => applyPreset(p)} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-200">
                  {p.t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {field("vNominal", "Nominal DC (V)")}
            {field("vMin", "Minimum (V)")}
            {field("vMaks", "Maksimum (V)")}
            {field("kwInverter", "Daya inverter (kW)", { optional: true })}
            {field("kwPuncak", "Daya puncak beban (kW)", { optional: true })}
          </div>
        </Card>
        <div className="lg:col-span-2">
          <SubmitButton size="lg" pendingText="Memeriksa…">
            Periksa kompatibilitas
          </SubmitButton>
        </div>
      </form>

      {h && (
        <div className="animate-rise grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <div className="flex items-center gap-4">
              {(() => {
                const S = STYLE[h.status];
                return (
                  <span className={cn("grid size-14 place-items-center rounded-2xl text-white", S.bg)}>
                    <S.icon className="size-7" />
                  </span>
                );
              })()}
              <div>
                <p className="text-xs text-ink-500">Status (indikatif)</p>
                <p className={cn("text-2xl font-bold", STYLE[h.status].text)}>{h.label}</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {h.pemeriksaan.map((p) => {
                const S = STYLE[p.status];
                return (
                  <li key={p.nama} className="flex gap-3 rounded-2xl bg-ink-50 p-3 text-sm">
                    <S.icon className={cn("mt-0.5 size-5 shrink-0", S.text)} />
                    <span>
                      <span className="flex items-center gap-2 font-semibold">
                        {p.nama} <Badge tone={p.status === "layak" ? "leaf" : p.status === "tidak_layak" ? "flame" : "amber"}>{p.label}</Badge>
                      </span>
                      <span className="mt-1 block text-ink-600">{p.alasan}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-ink-500">{h.catatan}</p>
          </Card>
          <div className="space-y-4">
            <ExplanationCard penjelasan={state?.penjelasan} />
            <Disclaimer />
          </div>
        </div>
      )}
    </div>
  );
}
