"use client";

import { useActionState } from "react";
import { addSohReading } from "@/app/actions/siklus";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass } from "@/components/ui";

export function ReadingForm({ baterai, selectedId }: { baterai: { id: string; label: string }[]; selectedId?: string }) {
  const [state, action] = useActionState(addSohReading, undefined);
  const v = state?.values ?? {};
  const e = state?.errors ?? {};
  return (
    <Card>
      <p className="font-semibold">Tambah pembacaan SoH</p>
      <p className="mb-4 text-sm text-ink-500">Masukkan hasil pengukuran berkala. Tren dan jadwal penggantian diperbarui otomatis.</p>
      <form action={action} className="space-y-4" noValidate>
        {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
        <Field label="Baterai" htmlFor="r-bat" error={e.bateraiId}>
          <select id="r-bat" name="bateraiId" defaultValue={v.bateraiId ?? selectedId ?? ""} className={inputClass}>
            {baterai.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SoH (%)" htmlFor="r-soh" error={e.soh}>
            <input id="r-soh" name="soh" inputMode="decimal" defaultValue={v.soh} className={inputClass} aria-invalid={Boolean(e.soh)} />
          </Field>
          <Field label="Tanggal" htmlFor="r-tgl" error={e.tanggal}>
            <input id="r-tgl" name="tanggal" type="date" defaultValue={v.tanggal} className={inputClass} />
          </Field>
        </div>
        <Field label="Catatan" htmlFor="r-cat" optional>
          <input id="r-cat" name="catatan" defaultValue={v.catatan} className={inputClass} placeholder="Mis. uji kapasitas oleh teknisi desa" />
        </Field>
        <SubmitButton pendingText="Menyimpan…">Simpan pembacaan</SubmitButton>
      </form>
    </Card>
  );
}
