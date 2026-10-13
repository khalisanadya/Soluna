"use client";

import { RotateCcw, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui";

// NF-3: pesan kesalahan bila pemuatan atau perhitungan gagal.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-surface px-6 py-16 text-center shadow-soft ring-1 ring-ink-200/60">
      <span className="grid size-14 place-items-center rounded-2xl bg-flame-50 text-flame-600">
        <ServerCrash className="size-6" />
      </span>
      <h1 className="mt-5 text-xl font-bold">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-md text-sm text-ink-600">
        Halaman ini gagal dimuat. Periksa koneksi basis data dan layanan mesin hitung, lalu coba lagi.
      </p>
      {error.digest && <p className="num mt-2 text-xs text-ink-400">Kode: {error.digest}</p>}
      <Button onClick={reset} className="mt-6" variant="dark">
        <RotateCcw className="size-4" /> Coba lagi
      </Button>
    </div>
  );
}
