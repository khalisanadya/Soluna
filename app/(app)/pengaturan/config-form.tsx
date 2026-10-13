"use client";

import { useActionState } from "react";
import { ChevronDown } from "lucide-react";
import { saveConfig } from "@/app/actions/konfigurasi";
import { SubmitButton } from "@/components/submit-button";
import { Card, Field, Notice, inputClass, textareaClass } from "@/components/ui";
import { CONFIG_FIELDS } from "@/lib/config-fields";

export function ConfigForm({ values, json, versi }: { values: Record<string, string>; json: string; versi: number }) {
  const [state, action] = useActionState(saveConfig, undefined);
  const e = state?.errors ?? {};
  const groups = [...new Set(CONFIG_FIELDS.map((f) => f.group))];
  return (
    <form action={action} className="space-y-4" noValidate key={versi}>
      {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <Card key={g}>
            <p className="eyebrow mb-4">{g}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CONFIG_FIELDS.filter((f) => f.group === g).map((f) => (
                <Field key={f.name} label={f.label} htmlFor={f.name} error={e[f.name]} hint={f.unit}>
                  <input id={f.name} name={f.name} inputMode="decimal" defaultValue={values[f.name]} className={inputClass} aria-invalid={Boolean(e[f.name])} />
                </Field>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <details className="group rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-ink-200/60">
        <summary className="flex cursor-pointer list-none items-center justify-between p-5 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-semibold">Konfigurasi lanjutan (JSON)</span>
            <span className="text-sm text-ink-500">Profil PSH lokasi, tingkat beban, harga komponen, model sisa umur. Nilai formulir di atas menimpa JSON.</span>
          </span>
          <ChevronDown className="size-5 text-ink-400 transition group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 sm:px-6">
          <textarea name="json" defaultValue={json} spellCheck={false} className={`${textareaClass} min-h-96 font-mono text-xs`} aria-invalid={Boolean(e.json)} />
          {e.json && <p className="mt-1 text-xs text-flame-600">{e.json[0]}</p>}
        </div>
      </details>
      <Card tone="muted" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Catatan perubahan" htmlFor="catatan" optional className="flex-1">
          <input id="catatan" name="catatan" className={inputClass} placeholder="Mis. kalibrasi harga diesel NTT 2026" />
        </Field>
        <SubmitButton pendingText="Memvalidasi…">Simpan sebagai v{versi + 1}</SubmitButton>
      </Card>
    </form>
  );
}
