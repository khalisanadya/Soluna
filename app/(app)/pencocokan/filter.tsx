"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Kolom, Pilih, useFilterUrl } from "@/components/filter-kit";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/format";
import type { StatusCocok } from "@/lib/types";

const STATUS: { k: StatusCocok | ""; t: string; dot?: string }[] = [
  { k: "", t: "Semua" },
  { k: "direkomendasikan", t: "Direkomendasikan", dot: "bg-leaf-500" },
  { k: "perlu_penyesuaian", t: "Perlu penyesuaian", dot: "bg-amber-500" },
  {
    k: "tidak_direkomendasikan",
    t: "Tidak direkomendasikan",
    dot: "bg-flame-500",
  },
  { k: "belum_dinilai", t: "Belum dinilai", dot: "bg-ink-400" },
];

/** Filter Pencocokan: rencana desa, pencarian, grade, dan status (dengan jumlah per status). */
export function PencocokanFilter({
  rencana,
  terpilihId,
  jumlah,
  saran,
}: {
  rencana: { id: string; label: string }[];
  terpilihId: string;
  jumlah: Record<StatusCocok | "semua", number> | null;
  /** Pilihan pencarian: kode baterai, merek/model, dan pemasok. */
  saran: { kode: string[]; merek: string[]; pemasok: string[] };
}) {
  const { get, apply, select, pending, pathname, query } = useFilterUrl();
  const status = get("status");
  const filtered = ["q", "grade", "status"].some((k) => get(k));

  return (
    <form
      key={query}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply({
          q: String(new FormData(e.currentTarget).get("q") ?? "").trim(),
        });
      }}
      className="mb-4 space-y-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-soft ring-1 ring-ink-200/60"
    >
      <Kolom label="Rencana desa" htmlFor="filter-rencana">
        <Pilih
          id="filter-rencana"
          name="rencana"
          value={terpilihId}
          // Pilihan kosong = reset: rencana dan semua filter dikosongkan.
          onChange={(e) =>
            apply(
              e.target.value
                ? { rencana: e.target.value }
                : { rencana: "", q: "", grade: "", status: "" },
            )
          }
        >
          <option value="">— Pilih rencana desa —</option>
          {rencana.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Pilih>
      </Kolom>

      {jumlah && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Kolom
              label="Cari baterai"
              htmlFor="filter-q"
              className="min-w-0 flex-1"
            >
              {/* Pilihan pertama "Semua baterai" mengosongkan pencarian (reset). */}
              <Pilih
                id="filter-q"
                name="q"
                value={get("q")}
                onChange={(e) => apply({ q: e.target.value })}
              >
                <option value="">Semua baterai</option>
                <optgroup label="Kode baterai">
                  {saran.kode.map((x) => (
                    <option key={`k-${x}`} value={x}>
                      {x}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Merek / model">
                  {saran.merek.map((x) => (
                    <option key={`m-${x}`} value={x}>
                      {x}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Pemasok">
                  {saran.pemasok.map((x) => (
                    <option key={`p-${x}`} value={x}>
                      {x}
                    </option>
                  ))}
                </optgroup>
              </Pilih>
            </Kolom>
            <Kolom label="Grade" htmlFor="filter-grade" className="sm:w-44">
              <Pilih id="filter-grade" {...select("grade")}>
                <option value="">Semua grade</option>
                {["A", "B", "C", "D"].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </Pilih>
            </Kolom>
            <div className="flex items-center gap-2">
              {pending && (
                <Loader2 className="size-4 animate-spin text-ink-400" />
              )}
              {filtered && (
                <Link
                  href={`${pathname}?rencana=${terpilihId}`}
                  replace
                  scroll={false}
                  className={buttonClass("ghost", "md")}
                >
                  Reset
                </Link>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-600">
              Status pencocokan
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Status pencocokan"
            >
              {STATUS.map((s) => {
                const aktif = status === s.k;
                const n = s.k ? jumlah[s.k] : jumlah.semua;
                return (
                  <button
                    key={s.k || "semua"}
                    type="button"
                    role="radio"
                    aria-checked={aktif}
                    onClick={() => apply({ status: s.k })}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors",
                      aktif
                        ? "bg-ink-900 text-white ring-ink-900"
                        : "bg-surface text-ink-700 ring-ink-200 hover:bg-ink-50",
                    )}
                  >
                    {s.dot && (
                      <span
                        className={cn("size-2 rounded-full", s.dot)}
                        aria-hidden="true"
                      />
                    )}
                    {s.t}
                    <span
                      className={cn(
                        "num rounded-full px-1.5 text-xs",
                        aktif ? "bg-white/15" : "bg-ink-100 text-ink-600",
                      )}
                    >
                      {n}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </form>
  );
}
