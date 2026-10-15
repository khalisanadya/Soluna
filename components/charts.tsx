import { cn, num } from "@/lib/format";

/* Grafik SVG ringan tanpa pustaka tambahan. Tidak memakai hook, jadi dapat dipakai di
   Server maupun Client Component. Warna sumber energi: surya = sun, baterai = leaf,
   genset = flame, beban = ink. */

export const ENERGY = { surya: "#fa9104", baterai: "#1f9165", genset: "#d9533b", beban: "#2a2926" };

export function Donut({
  segments,
  size = 168,
  thickness = 22,
  center,
  label,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: React.ReactNode;
  label?: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const terisi = segments.filter((x) => x.value > 0).length;
  // Ujung membulat menjorok thickness/2 di kedua sisi: kurangi panjang garis agar jarak antarsegmen tetap terlihat.
  const jarak = terisi > 1 ? thickness + 4 : 0;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efeeea" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * c;
            if (s.value <= 0) return null;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={terisi > 1 ? `${Math.max(0.01, len - jarak)} ${c}` : `${c} ${c}`}
                strokeDashoffset={terisi > 1 ? -(offset + jarak / 2) : 0}
                strokeLinecap={terisi > 1 ? "round" : "butt"}
                className="transition-opacity hover:opacity-80"
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{center}</div>
    </div>
  );
}

/** Garis tren SoH dengan garis ambang penggantian. */
export function TrendLine({
  points,
  threshold,
  warn,
  height = 180,
  className,
}: {
  points: { x: string; y: number }[];
  threshold?: number;
  warn?: number;
  height?: number;
  className?: string;
}) {
  const W = 560;
  const H = height;
  const pad = { l: 36, r: 12, t: 12, b: 26 };
  if (points.length === 0) return null;
  const xs = points.map((p) => new Date(p.x).getTime());
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) === minX ? minX + 1 : Math.max(...xs);
  const ys = points.map((p) => p.y).concat(threshold ?? []);
  const minY = Math.max(0, Math.floor((Math.min(...ys) - 5) / 10) * 10);
  const maxY = Math.min(100, Math.ceil((Math.max(...ys) + 3) / 10) * 10);
  const sx = (x: number) => pad.l + ((x - minX) / (maxX - minX)) * (W - pad.l - pad.r);
  const sy = (y: number) => pad.t + (1 - (y - minY) / (maxY - minY || 1)) * (H - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${sx(new Date(p.x).getTime())},${sy(p.y)}`).join(" ");
  const ticks = [minY, (minY + maxY) / 2, maxY];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label="Tren SoH">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="#efeeea" />
          <text x={pad.l - 6} y={sy(t) + 4} textAnchor="end" className="fill-ink-400 font-mono text-[10px]">
            {num(t, 0)}
          </text>
        </g>
      ))}
      {warn !== undefined && warn > minY && (
        <rect x={pad.l} width={W - pad.l - pad.r} y={sy(Math.min(warn, maxY))} height={Math.max(0, sy(threshold ?? minY) - sy(Math.min(warn, maxY)))} fill="#fdf8e4" />
      )}
      {threshold !== undefined && threshold >= minY && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={sy(threshold)} y2={sy(threshold)} stroke="#d9533b" strokeDasharray="4 4" />
          <text x={W - pad.r} y={sy(threshold) - 5} textAnchor="end" className="fill-flame-600 text-[10px] font-semibold">
            Ambang ganti {threshold}%
          </text>
        </g>
      )}
      <path d={d} fill="none" stroke="#1f9165" strokeWidth={2.5} strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={sx(new Date(p.x).getTime())} cy={sy(p.y)} r={4} fill="#fff" stroke="#1f9165" strokeWidth={2} />
          <title>{`${new Date(p.x).toLocaleDateString("id-ID")}: ${num(p.y)}%`}</title>
        </g>
      ))}
      <text x={pad.l} y={H - 6} className="fill-ink-400 text-[10px]">
        {new Date(minX).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
      </text>
      <text x={W - pad.r} y={H - 6} textAnchor="end" className="fill-ink-400 text-[10px]">
        {new Date(maxX).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
      </text>
    </svg>
  );
}

/** Grafik per jam: area surya, garis beban, area genset, garis cadangan baterai (sumbu kanan). */
export function HourlyChart({
  surya,
  beban,
  genset,
  soc,
  height = 220,
}: {
  surya: number[];
  beban: number[];
  genset: number[];
  soc: number[];
  height?: number;
}) {
  const W = 760;
  const H = height;
  const pad = { l: 34, r: 38, t: 14, b: 28 };
  const n = surya.length;
  const maxE = Math.max(0.1, ...surya, ...beban, ...genset) * 1.15;
  const sx = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (W - pad.l - pad.r);
  const sy = (v: number) => pad.t + (1 - v / maxE) * (H - pad.t - pad.b);
  const sp = (p: number) => pad.t + (1 - p / 100) * (H - pad.t - pad.b);
  const line = (arr: number[], f: (v: number) => number) => arr.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${f(v).toFixed(1)}`).join(" ");
  const area = (arr: number[]) => `${line(arr, sy)} L${sx(n - 1)},${sy(0)} L${sx(0)},${sy(0)} Z`;
  const days = Math.ceil(n / 24);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Perkiraan energi per jam">
      <defs>
        <linearGradient id="g-surya" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={ENERGY.surya} stopOpacity="0.45" />
          <stop offset="1" stopColor={ENERGY.surya} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={sy(maxE * t)} y2={sy(maxE * t)} stroke="#efeeea" />
          <text x={pad.l - 6} y={sy(maxE * t) + 3} textAnchor="end" className="fill-ink-400 font-mono text-[9px]">
            {num(maxE * t, 1)}
          </text>
          <text x={W - pad.r + 6} y={sp(t * 100) + 3} className="fill-leaf-600 font-mono text-[9px]">
            {t * 100}%
          </text>
        </g>
      ))}
      {Array.from({ length: days }, (_, d) =>
        [0, 6, 12, 18].map((h) => {
          const i = d * 24 + h;
          if (i >= n) return null;
          return (
            <g key={`${d}-${h}`}>
              <line x1={sx(i)} x2={sx(i)} y1={pad.t} y2={H - pad.b} stroke={h === 0 ? "#e2e0da" : "#f7f7f5"} />
              <text x={sx(i)} y={H - 10} textAnchor="middle" className="fill-ink-400 font-mono text-[9px]">
                {h === 0 ? `H${d + 1}` : `${String(h).padStart(2, "0")}:00`}
              </text>
            </g>
          );
        }),
      )}
      <path d={area(surya)} fill="url(#g-surya)" />
      <path d={line(surya, sy)} fill="none" stroke={ENERGY.surya} strokeWidth={1.5} />
      {genset.some((g) => g > 0) && <path d={area(genset)} fill={ENERGY.genset} fillOpacity={0.35} />}
      <path d={line(beban, sy)} fill="none" stroke={ENERGY.beban} strokeWidth={1.5} strokeDasharray="3 3" />
      <path d={line(soc, sp)} fill="none" stroke={ENERGY.baterai} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-600">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: it.dashed ? `repeating-linear-gradient(90deg, ${it.color} 0 3px, transparent 3px 6px)` : it.color, height: it.dashed ? 2 : 6 }}
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** Batang horizontal sederhana (lama bertahan, distribusi). */
export function BarRow({
  label,
  value,
  max,
  display,
  color = "bg-leaf-500",
  muted,
}: {
  label: React.ReactNode;
  value: number | null;
  max: number;
  display: React.ReactNode;
  color?: string;
  muted?: boolean;
}) {
  const pct = value === null ? 100 : Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm">
      <span className={cn("truncate", muted ? "text-ink-400" : "text-ink-600")}>{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", color, value === null && "bg-[repeating-linear-gradient(45deg,var(--color-leaf-500)_0_6px,var(--color-leaf-400)_6px_12px)]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="num min-w-[4.5rem] text-right font-medium whitespace-nowrap text-ink-900">{display}</span>
    </div>
  );
}
