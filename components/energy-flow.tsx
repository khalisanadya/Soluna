import { BatteryCharging, Fuel, Home, Sun } from "lucide-react";
import { cn, num } from "@/lib/format";
import { ENERGY } from "./charts";

type Props = {
  suryaKwh: number;
  bebanKwh: number;
  bateraiKwh: number;
  socPersen: number;
  gensetKwh: number;
  /** Aliran eksplisit; bila kosong, dihitung sederhana dari surya dan beban. */
  suryaKeDesaKwh?: number;
  suryaKeBateraiKwh?: number;
  rumah?: number;
  satuan?: string;
  caption?: string;
  className?: string;
};

/**
 * Visual aliran daya (K-12): daya mengalir dalam warna sumbernya.
 * Ketebalan garis mengikuti besar aliran; garis abu-abu berarti tidak ada aliran.
 */
export function EnergyFlow({ suryaKwh, bebanKwh, bateraiKwh, socPersen, gensetKwh, suryaKeDesaKwh, suryaKeBateraiKwh, rumah, satuan = "kWh/hari", caption, className }: Props) {
  const max = Math.max(suryaKwh, bebanKwh, bateraiKwh, gensetKwh, 0.01);
  const w = (v: number) => (v > 0 ? 2.5 + (v / max) * 6 : 1.5);
  const suryaKeDesa = suryaKeDesaKwh ?? Math.min(suryaKwh, bebanKwh);
  const suryaKeBaterai = suryaKeBateraiKwh ?? Math.max(0, suryaKwh - bebanKwh);

  const flows = [
    { d: "M150 92 C 250 92, 300 130, 372 168", v: suryaKeDesa, c: ENERGY.surya, label: "Surya → Desa" },
    { d: "M120 120 C 120 170, 120 200, 120 238", v: suryaKeBaterai, c: ENERGY.surya, label: "Surya → Baterai" },
    { d: "M162 272 C 250 272, 300 240, 372 214", v: bateraiKwh, c: ENERGY.baterai, label: "Baterai → Desa" },
    { d: "M590 272 C 540 272, 520 240, 478 214", v: gensetKwh, c: ENERGY.genset, label: "Genset → Desa" },
  ];

  return (
    <div className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-b from-[#fbf3e4] to-[#f2f0e8] ring-1 ring-ink-200/60", className)}>
      <svg viewBox="0 0 720 340" className="block w-full" role="img" aria-label="Aliran energi desa">
        {/* matahari */}
        <circle cx="640" cy="58" r="30" fill="#ffd59c" opacity="0.6" />
        <circle cx="640" cy="58" r="18" fill="#fdba5e" />
        {/* tanah */}
        <ellipse cx="425" cy="250" rx="190" ry="40" fill="#e4ead8" />
        {flows.map((f) => (
          <g key={f.label}>
            <path d={f.d} fill="none" stroke="#dcd8ce" strokeWidth={w(f.v) + 2} strokeLinecap="round" opacity={0.6} />
            {f.v > 0 && (
              <path d={f.d} fill="none" stroke={f.c} strokeWidth={w(f.v)} strokeLinecap="round" strokeDasharray="10 14" className="animate-flow">
                <title>{`${f.label}: ${num(f.v)} ${satuan}`}</title>
              </path>
            )}
          </g>
        ))}
        {/* desa: rumah-rumah sederhana */}
        <g>
          {[
            [380, 168, 1],
            [440, 150, 1.15],
            [500, 172, 0.95],
            [410, 205, 0.9],
            [470, 200, 1.05],
          ].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
              <rect x="0" y="14" width="40" height="28" rx="3" fill="#fffdf8" stroke="#c9c6be" />
              <path d="M-4 16 L20 -2 L44 16 Z" fill={i === 1 ? "#2a2926" : "#5b5850"} />
              {i === 1 && <rect x="22" y="2" width="14" height="8" transform="skewX(-25)" fill="#2f6fde" opacity="0.8" />}
              <rect x="7" y="22" width="9" height="8" rx="1.5" fill={bebanKwh > 0 ? "#ffd59c" : "#e2e0da"} />
              <rect x="24" y="26" width="9" height="16" rx="1.5" fill="#a19d93" />
            </g>
          ))}
        </g>
      </svg>

      <FlowChip className="left-[3%] top-[8%]" icon={<Sun className="size-4" />} tone="sun" title="Surya" value={suryaKwh} unit={satuan} />
      <FlowChip
        className="bottom-[8%] left-[3%]"
        icon={<BatteryCharging className="size-4" />}
        tone="leaf"
        title={`Baterai ${num(socPersen, 0)}%`}
        value={bateraiKwh}
        unit={satuan}
      />
      <FlowChip className="right-[3%] bottom-[8%]" icon={<Fuel className="size-4" />} tone="flame" title="Genset" value={gensetKwh} unit={satuan} />
      <FlowChip
        className="top-[8%] left-1/2 -translate-x-1/2"
        icon={<Home className="size-4" />}
        tone="ink"
        title={rumah ? `Desa · ${rumah} rumah` : "Beban desa"}
        value={bebanKwh}
        unit={satuan}
      />
      {caption && (
        <p className="absolute right-3 bottom-1.5 hidden text-[0.65rem] text-ink-500 sm:block">{caption}</p>
      )}
    </div>
  );
}

function FlowChip({
  className,
  icon,
  tone,
  title,
  value,
  unit,
}: {
  className: string;
  icon: React.ReactNode;
  tone: "sun" | "leaf" | "flame" | "ink";
  title: string;
  value: number;
  unit: string;
}) {
  const tones = {
    sun: "bg-sun-100 text-sun-700",
    leaf: "bg-leaf-50 text-leaf-600",
    flame: "bg-flame-50 text-flame-600",
    ink: "bg-ink-100 text-ink-800",
  };
  return (
    <div className={cn("absolute flex items-center gap-2 rounded-2xl bg-white/90 py-1.5 pr-3 pl-1.5 shadow-soft ring-1 ring-ink-200/70 backdrop-blur sm:gap-2.5 sm:py-2 sm:pl-2", className)}>
      <span className={cn("grid size-7 place-items-center rounded-xl sm:size-9", tones[tone])}>{icon}</span>
      <span className="leading-tight">
        <span className="block text-[0.62rem] text-ink-500 sm:text-[0.7rem]">{title}</span>
        <span className="num block text-sm font-semibold text-ink-950 sm:text-base">
          {num(value, 1)}
          <span className="ml-0.5 text-[0.6rem] font-normal text-ink-500 sm:text-[0.65rem]">{unit}</span>
        </span>
      </span>
    </div>
  );
}
