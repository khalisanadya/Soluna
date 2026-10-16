"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Card, GradeBadge, SectionTitle, gradeTone } from "@/components/ui";
import { cn } from "@/lib/format";
import type { Grade } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D"];
const BELUM_HEX = "#c9c6be"; // ink-300: netral, bukan warna grade

const SIZE = 184;
const TEBAL = 22;
const R_LUAR = SIZE / 2 - 4; // sisakan ruang untuk segmen yang membesar saat disorot
const R_DALAM = R_LUAR - TEBAL;

type Segmen = { key: string; label: string; ket: string; value: number; color: string; href: string };

/** Busur donat dari sudut a0 ke a1 (radian, 0 = arah jam 12, searah jarum jam). */
function busur(a0: number, a1: number, rL: number, rD: number): string {
  const c = SIZE / 2;
  const titik = (a: number, r: number) => `${c + r * Math.sin(a)} ${c - r * Math.cos(a)}`;
  // Lingkaran penuh tidak bisa digambar satu busur: belah dua.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) return busur(a0, a0 + Math.PI, rL, rD) + busur(a0 + Math.PI, a1, rL, rD);
  const besar = a1 - a0 > Math.PI ? 1 : 0;
  return `M${titik(a0, rL)}A${rL} ${rL} 0 ${besar} 1 ${titik(a1, rL)}L${titik(a1, rD)}A${rD} ${rD} 0 ${besar} 0 ${titik(a0, rD)}Z`;
}

export function GradeDistribution({ counts }: { counts: Record<Grade | "belum", number> }) {
  const dinilai = counts.A + counts.B + counts.C + counts.D;
  const total = dinilai + counts.belum;
  const persen = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const segmen: Segmen[] = [
    ...GRADES.map((g) => ({ key: g, label: `Grade ${g}`, ket: gradeTone[g].label, value: counts[g], color: gradeTone[g].hex, href: `/baterai?grade=${g}` })),
    { key: "belum", label: "Belum dinilai", ket: "Menunggu penilaian", value: counts.belum, color: BELUM_HEX, href: "/baterai?status=BELUM_DINILAI" },
  ];

  const wadah = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState<string | null>(null);
  const [tip, setTip] = useState<{ key: string; x: number; y: number } | null>(null);

  const ikuti = (key: string, ev: React.PointerEvent) => {
    const box = wadah.current?.getBoundingClientRect();
    if (!box) return;
    setAktif(key);
    setTip({ key, x: ev.clientX - box.left, y: ev.clientY - box.top });
  };
  const lepas = () => {
    setAktif(null);
    setTip(null);
  };

  // Susun sudut tiap segmen.
  let sudut = 0;
  const busurList = segmen
    .filter((s) => s.value > 0)
    .map((s) => {
      const a0 = sudut;
      sudut += (s.value / total) * Math.PI * 2;
      return { ...s, a0, a1: sudut };
    });

  const s = tip && segmen.find((x) => x.key === tip.key);

  return (
    <Card className="flex flex-col">
      <SectionTitle title="Distribusi grade" hint="Kondisi semua baterai yang Anda daftarkan" />

      <div ref={wadah} className="relative mx-auto py-2" style={{ width: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Distribusi grade baterai" className="overflow-visible">
          <path d={busur(0, Math.PI * 2, R_LUAR, R_DALAM)} fill="#efeeea" />
          {busurList.map((b) => {
            const sorot = aktif === b.key;
            return (
              <path
                key={b.key}
                d={busur(b.a0, b.a1, sorot ? R_LUAR + 4 : R_LUAR, R_DALAM)}
                fill={b.color}
                // Celah 2px warna permukaan antarsegmen.
                stroke="var(--color-surface)"
                strokeWidth={busurList.length > 1 ? 2 : 0}
                strokeLinejoin="round"
                tabIndex={0}
                aria-label={`${b.label}: ${b.value} baterai (${persen(b.value)}%)`}
                className={cn("cursor-pointer outline-none transition-opacity duration-150", aktif && !sorot && "opacity-30")}
                onPointerEnter={(ev) => ikuti(b.key, ev)}
                onPointerMove={(ev) => ikuti(b.key, ev)}
                onPointerLeave={lepas}
                onFocus={() => {
                  // Papan ketik: tooltip di tengah busur.
                  const a = (b.a0 + b.a1) / 2;
                  const r = (R_LUAR + R_DALAM) / 2;
                  setAktif(b.key);
                  setTip({ key: b.key, x: SIZE / 2 + r * Math.sin(a), y: 8 + SIZE / 2 - r * Math.cos(a) });
                }}
                onBlur={lepas}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="num text-[2rem] leading-none font-semibold text-ink-950">{total}</p>
            <p className="mt-1.5 text-xs text-ink-500">baterai · {dinilai} dinilai</p>
          </div>
        </div>

        {/* Tooltip mengikuti kursor: angka lebih menonjol daripada label. */}
        {tip && s && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 w-max rounded-xl bg-ink-900 px-3 py-2 text-white shadow-lift"
            style={{
              left: tip.x,
              top: tip.y,
              transform: `translate(${tip.x > SIZE / 2 ? "calc(-100% - 12px)" : "12px"}, calc(-100% - 8px))`,
            }}
          >
            <p className="num text-base leading-tight font-semibold">
              {s.value} <span className="text-xs font-normal text-ink-300">baterai · {persen(s.value)}%</span>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-300">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
              {s.label} · {s.ket}
            </p>
          </div>
        )}
      </div>

      <ul className="mt-4 space-y-0.5">
        {segmen.map((x) => (
          <li key={x.key} className={cn(x.key === "belum" && "mt-1 border-t border-ink-100 pt-1")}>
            <Link
              href={x.href}
              title={`Lihat baterai ${x.label.toLowerCase()}`}
              onPointerEnter={() => setAktif(x.key)}
              onPointerLeave={() => setAktif(null)}
              onFocus={() => setAktif(x.key)}
              onBlur={() => setAktif(null)}
              className={cn(
                "-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-[background-color,opacity] duration-150 hover:bg-ink-50",
                aktif && aktif !== x.key && "opacity-50",
              )}
            >
              {x.key === "belum" ? (
                <span className="size-6 shrink-0 rounded-md border border-dashed border-ink-300 bg-ink-50" aria-hidden="true" />
              ) : (
                <GradeBadge grade={x.key} size="sm" />
              )}
              <span className="min-w-0 flex-1 truncate text-ink-700">{x.key === "belum" ? x.label : x.ket}</span>
              <span className="num font-medium text-ink-900">{x.value}</span>
              <span className="num w-10 text-right text-xs text-ink-400">{persen(x.value)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
