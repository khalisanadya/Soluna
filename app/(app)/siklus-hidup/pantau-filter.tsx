"use client";

import { Loader2, Search, X } from "lucide-react";
import { Pilih, useFilterUrl } from "@/components/filter-kit";
import { inputClass } from "@/components/ui";
import { cn } from "@/lib/format";

const URUTAN = [
  { k: "", label: "Paling mendesak" },
  { k: "soh", label: "SoH terendah" },
  { k: "ganti", label: "Jadwal ganti terdekat" },
  { k: "kode", label: "Kode A–Z" },
] as const;

/* Cari dan urutkan daftar pemantauan. Nilai dibaca dari URL; mengubahnya kembali ke halaman 1
   dan melepas baterai terpilih agar detail mengikuti baris pertama hasil baru. */
export function PantauFilter() {
  const { get, apply, pending, query } = useFilterUrl((q) => q.delete("baterai"));
  const cari = get("q");

  return (
    <form
      key={query}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="relative min-w-0 flex-1">
        {pending ? (
          <Loader2 className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 animate-spin text-ink-400" />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
        )}
        <input
          name="q"
          type="search"
          defaultValue={cari}
          aria-label="Cari baterai"
          placeholder="Cari kode, merek, model, atau pemasok — tekan Enter"
          className={cn(inputClass, "h-10 pr-9 pl-10 text-sm")}
        />
        {cari && (
          <button
            type="button"
            onClick={() => apply({ q: "" })}
            aria-label="Hapus pencarian"
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="sm:w-56">
        <Pilih aria-label="Urutkan" value={get("urut")} onChange={(e) => apply({ urut: e.target.value })} className="h-10 text-sm">
          {URUTAN.map((u) => (
            <option key={u.k} value={u.k}>
              Urut: {u.label}
            </option>
          ))}
        </Pilih>
      </div>
    </form>
  );
}
