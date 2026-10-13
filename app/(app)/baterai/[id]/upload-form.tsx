"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { uploadBerkas } from "@/app/actions/baterai";
import { SubmitButton } from "@/components/submit-button";
import { Notice } from "@/components/ui";

export function UploadForm({ bateraiId }: { bateraiId: string }) {
  const [state, action] = useActionState(uploadBerkas, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bateraiId" value={bateraiId} />
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-300 bg-ink-50 px-4 py-6 text-center text-sm text-ink-600 hover:border-sun-400">
        <Upload className="size-5 text-ink-400" />
        <span>Pilih foto atau dokumen (JPG, PNG, WEBP, PDF · maks. 4 MB)</span>
        <input
          name="berkas"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="w-full max-w-xs text-xs file:mr-2 file:rounded-full file:border-0 file:bg-ink-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        />
      </label>
      {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
      <SubmitButton size="sm" variant="dark" pendingText="Mengunggah…">
        Unggah
      </SubmitButton>
    </form>
  );
}
