"use client";

import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Cloud, CloudRain, Moon, Sun, X } from "lucide-react";
import { cn, num } from "@/lib/format";

/* =====================================================================================
   Simulasi ilustratif (BUKAN data real-time / perangkat nyata).
   Satu langkah = 20 menit waktu simulasi, dijalankan dipercepat (± 1,2 detik per langkah).
   Aturan:
   1. Surya dipakai lebih dulu untuk beban desa; sisanya mengisi baterai (maks. 5 kW).
   2. Kekurangan ditutup baterai.
   3. Bila SoC < 35% dan surya tidak cukup, beban kenyamanan dilepas; beban kritis tetap menyala.
   ===================================================================================== */

type Cuaca = "cerah" | "berawan" | "hujan" | "malam";

const CUACA: Record<Cuaca, { label: string; faktor: number; tint: number; icon: typeof Sun }> = {
  cerah: { label: "Cerah", faktor: 0.85, tint: 0, icon: Sun },
  berawan: { label: "Berawan", faktor: 0.38, tint: 0.12, icon: Cloud },
  hujan: { label: "Hujan", faktor: 0.12, tint: 0.24, icon: CloudRain },
  malam: { label: "Malam", faktor: 0, tint: 0.55, icon: Moon },
};

const PV_KWP = 10;
const BATERAI_KWH = 30;
const BEBAN_KRITIS = 1.6;
const BEBAN_NYAMAN = 2.4;
const GENSET_KW = 3.5;
const LADEN_MAKS = 5;
const JAM_PER_LANGKAH = 1 / 3;

type Sim = { cuaca: Cuaca; soc: number; genset: boolean };

type Aliran = {
  surya: number;
  suryaKeBeban: number;
  suryaKeBaterai: number;
  bateraiKeBeban: number;
  gensetKeBeban: number;
  gensetKeBaterai: number;
  beban: number;
  lepas: boolean;
  genset: boolean;
  netBaterai: number;
};

function hitung({ cuaca, soc, genset }: Sim): Aliran {
  const surya = PV_KWP * CUACA[cuaca].faktor;
  const lepas = soc < 35 && surya < BEBAN_KRITIS + BEBAN_NYAMAN;
  const beban = lepas ? BEBAN_KRITIS : BEBAN_KRITIS + BEBAN_NYAMAN;
  const suryaKeBeban = Math.min(surya, beban);
  const kurang = beban - suryaKeBeban;
  const surplus = surya - suryaKeBeban;

  // Ilustrasi hanya surya + baterai: tidak ada sumber cadangan lain.
  const on = genset && false;

  const gensetKeBeban = on ? Math.min(GENSET_KW, kurang) : 0;
  const ruangIsi = soc < 99.5 ? LADEN_MAKS : 0;
  const suryaKeBaterai = Math.min(surplus, ruangIsi);
  const gensetKeBaterai = on ? Math.min(GENSET_KW - gensetKeBeban, ruangIsi - suryaKeBaterai) : 0;
  const bateraiKeBeban = kurang - gensetKeBeban;
  return {
    surya,
    suryaKeBeban,
    suryaKeBaterai,
    bateraiKeBeban,
    gensetKeBeban,
    gensetKeBaterai,
    beban,
    lepas,
    genset: on,
    netBaterai: suryaKeBaterai + gensetKeBaterai - bateraiKeBeban,
  };
}

function reducer(s: Sim, a: { type: "tick" } | { type: "cuaca"; cuaca: Cuaca }): Sim {
  if (a.type === "cuaca") return { ...s, cuaca: a.cuaca };
  const f = hitung(s);
  const soc = Math.min(100, Math.max(5, s.soc + ((f.netBaterai * JAM_PER_LANGKAH) / BATERAI_KWH) * 100));
  return { ...s, soc, genset: f.genset };
}

/* =====================================================================================
   Proyeksi isometrik: koordinat tanah (x ke kanan-bawah, y ke kiri-bawah, z ke atas).
   ===================================================================================== */

const S = 1;
const OX = 400;
const OY = 150;
type V3 = [number, number, number?];
const P = ([x, y, z = 0]: V3): [number, number] => [OX + (x - y) * 0.866 * S, OY + (x + y) * 0.5 * S - z * S];
const pts = (...ps: V3[]) => ps.map((p) => P(p).map((n) => n.toFixed(1)).join(",")).join(" ");
const line = (...ps: V3[]) => "M" + ps.map((p) => P(p).map((n) => n.toFixed(1)).join(" ")).join(" L");
const lengthOf = (...ps: V3[]) =>
  ps.slice(1).reduce((sum, p, i) => {
    const [ax, ay] = P(ps[i]);
    const [bx, by] = P(p);
    return sum + Math.hypot(bx - ax, by - ay);
  }, 0);
const pct = ([x, y]: [number, number]) => ({ left: `${(x / 800) * 100}%`, top: `${(y / 580) * 100}%` });

/** Campurkan warna siang dengan biru malam sesuai cuaca, agar suasana berubah halus. */
function tint(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const night = [26, 34, 56];
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (night[i] - v) * k));
  return `rgb(${c.join(",")})`;
}

const ENERGI = { surya: "#fa9104", baterai: "#1f9165", genset: "#d9533b" } as const;

type Target = "matahari" | "panel" | "baterai" | "rumah";

type HoverHandlers = {
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
};

/* ---------- Tata letak tanah (satuan isometrik) ---------- */

const RUMAH_UTAMA = { x0: 120, y0: 150, x1: 240, y1: 250, H: 60, R: 36 };
const WARGA = [
  { id: "w1", x0: 30, y0: 60, x1: 80, y1: 106, H: 32, R: 22, atap: "#c56b4a" },
  { id: "w2", x0: 300, y0: 40, x1: 352, y1: 86, H: 34, R: 22, atap: "#4d4a46" },
  { id: "w3", x0: 40, y0: 270, x1: 92, y1: 316, H: 32, R: 22, atap: "#c56b4a" },
];
const BATERAI = { x0: 268, y0: 134, x1: 300, y1: 182, h: 52 };
const HUB = { x0: 268, y0: 214, x1: 286, y1: 230, h: 30 };
const POHON: V3[] = [
  [22, 24],
  [372, 128],
  [18, 200],
  [372, 250],
  [214, 338],
  [150, 334],
  [222, 52],
  [130, 30],
];

/* ---------- Jalur energi ---------- */

const JALUR = {
  suryaKeHub: [[230, 222, 70], [243, 222, 58], [243, 222, 0], [268, 222, 0]] as V3[],
  hubKeBaterai: [[277, 214, 0], [277, 182, 0]] as V3[],
  gensetKeHub: [[300, 311, 0], [282, 311, 0], [282, 230, 0]] as V3[],
  hubKeRumah: [[272, 230, 0], [272, 272, 0], [176, 272, 0], [176, 250, 0]] as V3[],
  hubKeW3: [[272, 230, 0], [272, 272, 0], [66, 272, 0], [66, 316, 0]] as V3[],
  hubKeW1: [[272, 230, 0], [272, 272, 0], [104, 272, 0], [104, 83, 0], [80, 83, 0]] as V3[],
  hubKeW2: [[286, 222, 0], [326, 222, 0], [326, 86, 0]] as V3[],
};

export function VillageScene({ className }: { className?: string }) {
  const [sim, dispatch] = useReducer(reducer, { cuaca: "cerah", soc: 68, genset: false });
  const f = useMemo(() => hitung(sim), [sim]);
  const [hover, setHover] = useState<Target | null>(null);
  const [pinned, setPinned] = useState<Target | null>(null);
  const [rumahHover, setRumahHover] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const visible = useRef(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 800, h: 580 });
  const active = pinned ?? hover;
  const k = CUACA[sim.cuaca].tint;
  const malam = sim.cuaca === "malam";

  // Jalankan simulasi hanya saat ilustrasi terlihat; jeda animasi SVG di luar layar.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (e.isIntersecting) svgRef.current?.unpauseAnimations();
      else svgRef.current?.pauseAnimations();
    });
    io.observe(el);
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    if (stageRef.current) ro.observe(stageRef.current);
    const id = window.setInterval(() => {
      if (visible.current && !document.hidden) dispatch({ type: "tick" });
    }, 1200);
    return () => {
      io.disconnect();
      ro.disconnect();
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPinned(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (t: Target) => setPinned((p) => (p === t ? null : t));
  const hoverProps = (t: Target): HoverHandlers & { style: React.CSSProperties } => ({
    onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && setHover(t),
    onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && setHover((h) => (h === t ? null : h)),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      pick(t);
    },
    style: { cursor: "pointer" },
  });

  const info = describe(active, sim, f);
  // Rumah yang sedang disorot kursor terangkat sendiri; bila dipilih lewat label, semua rumah terangkat.
  const houseLifted = (id: string) => (rumahHover ? rumahHover === id : active === "rumah");
  const anchor = active === "rumah" && rumahHover ? RUMAH_ANCHOR[rumahHover] : active ? ANCHOR[active] : null;
  const bateraiMode = f.netBaterai > 0.05 ? "mengisi" : f.netBaterai < -0.05 ? "memasok" : "siaga";

  // Warna titik pada jalur menuju rumah mengikuti campuran sumber yang sedang memasok.
  const sumberBeban = [
    f.suryaKeBeban > 0.05 && ENERGI.surya,
    f.bateraiKeBeban > 0.05 && ENERGI.baterai,
    f.gensetKeBeban > 0.05 && ENERGI.genset,
  ].filter(Boolean) as string[];

  const flows: { key: string; path: V3[]; kw: number; colors: string[] }[] = [
    { key: "pv", path: JALUR.suryaKeHub, kw: f.surya, colors: [ENERGI.surya] },
    {
      key: "bat",
      path: f.netBaterai >= 0 ? JALUR.hubKeBaterai : [...JALUR.hubKeBaterai].reverse(),
      kw: Math.abs(f.netBaterai),
      colors: f.netBaterai >= 0 ? [f.gensetKeBaterai > f.suryaKeBaterai ? ENERGI.genset : ENERGI.surya] : [ENERGI.baterai],
    },
    { key: "rumah", path: JALUR.hubKeRumah, kw: f.beban, colors: sumberBeban },
    { key: "w1", path: JALUR.hubKeW1, kw: f.beban * 0.6, colors: sumberBeban },
    { key: "w2", path: JALUR.hubKeW2, kw: f.beban * 0.6, colors: sumberBeban },
    { key: "w3", path: JALUR.hubKeW3, kw: f.beban * 0.6, colors: sumberBeban },
  ];

  const glow = (t: Target) => (active === t ? "drop-shadow(0 10px 14px rgb(28 27 25 / 0.28))" : "drop-shadow(0 0 0 transparent)");
  const lift = (on: boolean, s = 1.035) => ({ transform: on ? `translateY(-5px) scale(${s})` : "none", transition: "transform 300ms cubic-bezier(.2,.8,.2,1), filter 300ms" });

  return (
    <div ref={rootRef} className={cn("relative overflow-hidden rounded-[2rem] ring-1 ring-ink-200/70", className)}>
      {/* Langit: lapisan per cuaca, berganti dengan transisi opasitas */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fbf1df] to-[#f3f1ea]" aria-hidden="true" />
      {(["berawan", "hujan", "malam"] as const).map((c) => (
        <div
          key={c}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 bg-gradient-to-b transition-opacity duration-1000",
            c === "berawan" && "from-[#e9ebe8] to-[#f1f0ea]",
            c === "hujan" && "from-[#cfd6dc] to-[#e6e8e6]",
            c === "malam" && "from-[#141b2e] to-[#2b3550]",
            sim.cuaca === c ? "opacity-100" : "opacity-0",
          )}
        />
      ))}

      {/* Kontrol cuaca */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
        <div role="radiogroup" aria-label="Kondisi cuaca simulasi" className="flex rounded-full bg-white/85 p-1 shadow-soft ring-1 ring-ink-200/70 backdrop-blur">
          {(Object.keys(CUACA) as Cuaca[]).map((c) => {
            const I = CUACA[c].icon;
            const on = sim.cuaca === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => dispatch({ type: "cuaca", cuaca: c })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition duration-200 sm:px-3",
                  on ? "bg-ink-950 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-950",
                )}
              >
                <I className={cn("size-3.5", on && c === "cerah" && "text-sun-400")} />
                <span className="sr-only">{CUACA[c].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div ref={stageRef} className="relative -mt-2 sm:-mt-14" onClick={() => setPinned(null)}>
        <svg
          ref={svgRef}
          viewBox="0 0 800 580"
          className="relative block h-auto w-full select-none"
          role="img"
          aria-label={`Ilustrasi sistem energi desa, cuaca ${CUACA[sim.cuaca].label.toLowerCase()}: surya ${num(f.surya)} kW, baterai ${num(sim.soc, 0)}%, beban desa ${num(f.beban)} kW.`}
        >
          <defs>
            <radialGradient id="vs-sun" cx="0.4" cy="0.35">
              <stop offset="0" stopColor="#fff3c4" />
              <stop offset="0.55" stopColor="#ffc24d" />
              <stop offset="1" stopColor="#fa9104" />
            </radialGradient>
            <radialGradient id="vs-halo">
              <stop offset="0" stopColor="#ffd27a" stopOpacity="0.7" />
              <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
            </radialGradient>
            <filter id="vs-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* ---------- Langit: matahari / bulan, awan, hujan ---------- */}
          <g {...hoverProps("matahari")} aria-hidden="true">
            <g style={{ opacity: malam ? 0 : sim.cuaca === "hujan" ? 0.25 : sim.cuaca === "berawan" ? 0.7 : 1, transition: "opacity 1s" }}>
              <circle cx="690" cy="92" r="70" fill="url(#vs-halo)" className="origin-self animate-glow" />
              <g className="origin-self animate-spin-slow" stroke="#ffb340" strokeWidth="3" strokeLinecap="round" opacity="0.55">
                {Array.from({ length: 12 }, (_, i) => {
                  // Dibulatkan: Math.sin/cos bisa beda di digit terakhir antara server dan browser (hydration).
                  const a = (i * Math.PI) / 6;
                  const r = (v: number) => Math.round(v * 100) / 100;
                  return <line key={i} x1={r(690 + Math.cos(a) * 44)} y1={r(92 + Math.sin(a) * 44)} x2={r(690 + Math.cos(a) * 56)} y2={r(92 + Math.sin(a) * 56)} />;
                })}
              </g>
              <circle cx="690" cy="92" r="32" fill="url(#vs-sun)" style={{ transform: active === "matahari" ? "scale(1.08)" : "none", transition: "transform .3s" }} className="origin-self" />
            </g>
            <g style={{ opacity: malam ? 1 : 0, transition: "opacity 1s" }}>
              <circle cx="680" cy="92" r="24" fill="#f4efd9" />
              <circle cx="692" cy="84" r="22" fill="#232c45" />
              {[
                [560, 60],
                [610, 130],
                [740, 160],
                [520, 120],
                [470, 50],
                [760, 50],
                [640, 40],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 2 ? 1.4 : 2} fill="#fff" className="animate-pulse-soft" style={{ animationDelay: `${i * 0.4}s` }} />
              ))}
            </g>
            {/* bidang klik matahari yang cukup besar */}
            <circle cx="690" cy="92" r="48" fill="transparent" />
          </g>

          <g aria-hidden="true" style={{ opacity: sim.cuaca === "cerah" ? 0.0 : malam ? 0.25 : 1, transition: "opacity 1s" }}>
            <g className="animate-drift">
              <CloudShape x={600} y={110} s={1.1} fill={sim.cuaca === "hujan" ? "#aab4bd" : "#ffffff"} />
              <CloudShape x={470} y={70} s={0.8} fill={sim.cuaca === "hujan" ? "#b9c2c9" : "#fbfbf8"} />
            </g>
            <g className="animate-drift" style={{ animationDelay: "-4s", animationDuration: "12s" }}>
              <CloudShape x={720} y={150} s={0.7} fill={sim.cuaca === "hujan" ? "#9fa9b3" : "#f7f7f3"} />
            </g>
          </g>
          {sim.cuaca === "hujan" && !reduced && (
            <g aria-hidden="true" stroke="#6f87a0" strokeWidth="1.6" strokeLinecap="round">
              {Array.from({ length: 48 }, (_, i) => {
                const x = 40 + ((i * 97) % 760);
                const y = 90 + ((i * 61) % 420);
                return <line key={i} x1={x} y1={y} x2={x - 4} y2={y + 12} className="animate-rain" style={{ animationDelay: `${(i % 9) * 0.1}s` }} />;
              })}
            </g>
          )}

          {/* ---------- Tanah ---------- */}
          <g aria-hidden="true">
            <polygon points={pts([0, 400, 0], [400, 400, 0], [400, 400, -18], [0, 400, -18])} style={{ fill: tint("#cdb48c", k), transition: "fill 1s" }} />
            <polygon points={pts([400, 0, 0], [400, 400, 0], [400, 400, -18], [400, 0, -18])} style={{ fill: tint("#dcc7a3", k), transition: "fill 1s" }} />
            <polygon points={pts([0, 0, 0], [400, 0, 0], [400, 400, 0], [0, 400, 0])} style={{ fill: tint("#b7d78a", k), transition: "fill 1s" }} />
            {/* garis rumput */}
            {Array.from({ length: 9 }, (_, i) => (
              <polygon key={i} points={pts([i * 44 + 4, 0, 0], [i * 44 + 22, 0, 0], [i * 44 + 22, 360, 0], [i * 44 + 4, 360, 0])} style={{ fill: tint("#c3df99", k), transition: "fill 1s" }} />
            ))}
            {/* jalan desa */}
            <polygon points={pts([0, 362, 0], [400, 362, 0], [400, 400, 0], [0, 400, 0])} style={{ fill: tint("#dcd5c6", k), transition: "fill 1s" }} />
            <path d={line([0, 381, 0], [400, 381, 0])} stroke={tint("#f6f2e8", k)} strokeWidth="2" strokeDasharray="10 10" fill="none" />
            {/* jalan setapak ke pintu rumah utama */}
            <polygon points={pts([166, 250, 0], [186, 250, 0], [186, 362, 0], [166, 362, 0])} style={{ fill: tint("#e3dccd", k), transition: "fill 1s" }} />
          </g>

          {/* ---------- Kabel di tanah (dasar) ---------- */}
          <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {Object.values(JALUR).map((p, i) => (
              <path key={i} d={line(...p)} stroke={tint("#ddd5c3", k)} strokeWidth="5" opacity="0.9" />
            ))}
          </g>

          {/* ---------- Bangunan (urut dari belakang ke depan) ---------- */}
          <HouseShape {...WARGA[0]} k={k} lit={windowsLit(f, "warga")} hovered={houseLifted("w1")} onHover={setRumahHover} props={hoverProps("rumah")} filter={glow("rumah")} />

          {/* Rumah utama (balai desa) dengan panel surya di atap */}
          <g
            {...hoverProps("rumah")}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") {
                setHover("rumah");
                setRumahHover("utama");
              }
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") {
                setHover((h) => (h === "rumah" ? null : h));
                setRumahHover(null);
              }
            }}
            className="origin-self"
            style={{ ...lift(houseLifted("utama") || active === "panel", 1.02), filter: glow(active === "panel" ? "panel" : "rumah"), cursor: "pointer" }}
          >
            <MainHouse k={k} lit={windowsLit(f, "utama")} />
            <g
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") {
                  e.stopPropagation();
                  setHover("panel");
                }
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "mouse") setHover((h) => (h === "panel" ? "rumah" : h));
              }}
              onClick={(e) => {
                e.stopPropagation();
                pick("panel");
              }}
            >
              <SolarPanels k={k} output={f.surya / PV_KWP} highlight={active === "panel"} reduced={reduced} />
            </g>
          </g>

          {/* Kabel turun dari panel di dinding (di atas rumah utama) */}
          <path d={line(...JALUR.suryaKeHub.slice(0, 3))} stroke={tint("#d6cdb9", k)} strokeWidth="4" fill="none" strokeLinecap="round" aria-hidden="true" />

          <HouseShape {...WARGA[2]} k={k} lit={windowsLit(f, "warga")} hovered={houseLifted("w3")} onHover={setRumahHover} props={hoverProps("rumah")} filter={glow("rumah")} />
          <HouseShape {...WARGA[1]} k={k} lit={windowsLit(f, "warga")} hovered={houseLifted("w2")} onHover={setRumahHover} props={hoverProps("rumah")} filter={glow("rumah")} />

          {/* Baterai */}
          <g {...hoverProps("baterai")} className="origin-self" style={{ ...lift(active === "baterai", 1.06), filter: glow("baterai"), cursor: "pointer" }}>
            <BatteryShape k={k} soc={sim.soc} mode={bateraiMode} />
          </g>

          {/* Inverter / panel distribusi */}
          <Box {...HUB} top="#ffffff" left="#d9d6cf" right="#f3f1eb" k={k} />
          <polygon points={pts([272, 230, 12], [282, 230, 12], [282, 230, 22], [272, 230, 22])} fill={f.surya + Math.abs(f.netBaterai) + (f.genset ? 1 : 0) > 0 ? "#1f9165" : "#a19d93"} />

          {/* Pohon */}
          {POHON.filter(([x, y]) => x + y < 300).map((p, i) => (
            <Tree key={`a${i}`} at={p} k={k} i={i} />
          ))}

          {POHON.filter(([x, y]) => x + y >= 300).map((p, i) => (
            <Tree key={`b${i}`} at={p} k={k} i={i + 3} />
          ))}

          {/* ---------- Aliran energi: titik cahaya bergerak di atas jalur ---------- */}
          <g aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: "none" }}>
            {flows.map((fl) =>
              fl.kw > 0.05 && fl.colors.length > 0 ? (
                <FlowPath key={fl.key + fl.colors.join() + (fl.path === JALUR.hubKeBaterai ? "in" : "out")} path={fl.path} kw={fl.kw} colors={fl.colors} reduced={reduced} />
              ) : null,
            )}
          </g>
        </svg>

      </div>
      <p className="sr-only" aria-live="polite">
        Cuaca simulasi: {CUACA[sim.cuaca].label}.
      </p>
    </div>
  );
}

/* =====================================================================================
   Konten penjelasan per komponen
   ===================================================================================== */

type Info = { title: string; tone: string; rows: [string, string][]; note: string };

function describe(t: Target | null, sim: Sim, f: Aliran): Info | null {
  if (!t) return null;
  const tersimpan = (sim.soc / 100) * BATERAI_KWH;
  switch (t) {
    case "matahari":
      return {
        title: `Cuaca: ${CUACA[sim.cuaca].label}`,
        tone: ENERGI.surya,
        rows: [
          ["Produksi panel", `${Math.round(CUACA[sim.cuaca].faktor * 100)}% kapasitas`],
          ["Daya surya", `${num(f.surya)} kW`],
        ],
        note: "Faktor cuaca adalah asumsi simulasi, bukan prakiraan cuaca.",
      };
    case "panel":
      return {
        title: `Panel surya · ${PV_KWP} kWp`,
        tone: ENERGI.surya,
        rows: [
          ["Menghasilkan", `${num(f.surya)} kW`],
          ["Ke rumah", `${num(f.suryaKeBeban)} kW`],
          ["Ke baterai", `${num(f.suryaKeBaterai)} kW`],
        ],
        note: f.surya > 0 ? "Energi gratis dari atap, dipakai lebih dulu sebelum baterai." : "Tidak ada produksi surya saat malam.",
      };
    case "baterai":
      return {
        title: `Baterai bekas EV · ${BATERAI_KWH} kWh`,
        tone: ENERGI.baterai,
        rows: [
          ["Kapasitas terisi", `${num(sim.soc, 0)}%`],
          ["Energi tersimpan", `${num(tersimpan)} kWh`],
          ["Status", f.netBaterai > 0.05 ? `Mengisi ${num(f.netBaterai)} kW` : f.netBaterai < -0.05 ? `Memasok ${num(-f.netBaterai)} kW` : "Siaga"],
          ["Kondisi (contoh)", "SoH 78% · Grade B"],
        ],
        note: "Baterai kehidupan kedua yang sudah dinilai SOLUNA. Cadangan minimum 20%.",
      };
    case "rumah":
      return {
        title: "Rumah & balai desa",
        tone: "#3f3d38",
        rows: [
          ["Beban kritis", `${num(BEBAN_KRITIS)} kW · penerangan, pendingin obat, komunikasi`],
          ["Beban kenyamanan", f.lepas ? "Dilepas sementara" : `${num(BEBAN_NYAMAN)} kW · TV, kipas`],
          ["Total sekarang", `${num(f.beban)} kW`],
        ],
        note: f.lepas
          ? "Baterai di bawah 35%: beban kenyamanan dilepas agar beban kritis tetap menyala."
          : "Jendela menyala berarti rumah mendapat listrik.",
      };
  }
}

// Titik jangkar tooltip (koordinat viewBox) dan sisi tampilnya, dipilih agar tidak menutupi komponen.
type Side = "left" | "right" | "above";
type Anchor = { at: [number, number]; side: Side };
const ANCHOR: Record<Target, Anchor> = {
  matahari: { at: [632, 92], side: "left" },
  panel: { at: P([196, 150, 92]), side: "left" },
  baterai: { at: P([284, 134, 58]), side: "above" },
  rumah: { at: P([120, 250, 60]), side: "left" },
};
const RUMAH_ANCHOR: Record<string, Anchor> = {
  utama: ANCHOR.rumah,
  w1: { at: P([30, 83, 50]), side: "left" },
  w2: { at: P([326, 40, 56]), side: "above" },
  w3: { at: P([66, 270, 56]), side: "above" },
};

function InfoBody({ info }: { info: Info }) {
  return (
    <>
      <p className="flex items-center gap-2 font-semibold text-ink-950">
        <span className="size-2 rounded-full" style={{ background: info.tone }} />
        {info.title}
      </p>
      <dl className="mt-2 space-y-1">
        {info.rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink-500">{k}</dt>
            <dd className="num text-right font-medium text-ink-900">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 leading-snug text-ink-500">{info.note}</p>
    </>
  );
}

/** Tooltip diletakkan di samping/atas komponen (bukan menimpanya) dan dijepit agar tetap di dalam kartu. */
function Tooltip({ anchor, box, info, pinned, onClose }: { anchor: Anchor; box: { w: number; h: number }; info: Info; pinned: boolean; onClose: () => void }) {
  const W = 240;
  const GAP = 16;
  const ax = (anchor.at[0] / 800) * box.w;
  const ay = (anchor.at[1] / 580) * box.h;
  let side = anchor.side;
  if (side === "right" && ax + GAP + W > box.w - 8) side = "left";
  if (side === "left" && ax - GAP - W < 8) side = "right";
  const clampX = (x: number) => Math.max(8, Math.min(box.w - W - 8, x));
  const pos =
    side === "above"
      ? { left: clampX(ax - W / 2), top: Math.max(8, ay - GAP), transform: "translateY(-100%)" }
      : { left: clampX(side === "right" ? ax + GAP : ax - GAP - W), top: Math.max(84, Math.min(box.h - 84, ay)), transform: "translateY(-50%)" };
  return (
    <div className={cn("absolute z-30 hidden sm:block", pinned ? "pointer-events-auto" : "pointer-events-none")} style={{ ...pos, width: W }} onClick={(e) => e.stopPropagation()}>
      <div className="relative animate-rise rounded-2xl bg-white/95 p-3.5 text-xs shadow-lift ring-1 ring-ink-200/80 backdrop-blur" role="status">
      {pinned && (
        <button type="button" onClick={onClose} aria-label="Tutup detail" className="absolute top-2 right-2 grid size-6 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-900">
          <X className="size-3.5" />
        </button>
      )}
      <InfoBody info={info} />
      </div>
    </div>
  );
}

function Chip({
  at,
  t,
  active,
  onPick,
  onHover,
  icon,
  tone,
  label,
  value,
  sub,
}: {
  at: [number, number];
  t: Target;
  active: Target | null;
  onPick: (t: Target) => void;
  onHover: (t: Target | null) => void;
  icon: ReactNode;
  tone: "sun" | "leaf" | "ink" | "flame";
  label: string;
  value: string;
  sub: string;
}) {
  const tones = { sun: "bg-sun-100 text-sun-700", leaf: "bg-leaf-50 text-leaf-600", ink: "bg-ink-100 text-ink-800", flame: "bg-flame-50 text-flame-600" };
  const on = active === t;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPick(t);
      }}
      onMouseEnter={() => onHover(t)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(t)}
      onBlur={() => onHover(null)}
      aria-pressed={on}
      aria-label={`${label}: ${value}, ${sub}. Tampilkan detail.`}
      className={cn(
        "pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl bg-white/92 py-1.5 pr-3 pl-1.5 text-left shadow-soft ring-1 backdrop-blur transition duration-200 hover:-translate-y-[calc(50%+2px)] hover:shadow-lift lg:gap-2.5 lg:py-2 lg:pl-2",
        on ? "ring-2 ring-ink-950" : "ring-ink-200/70",
      )}
      style={pct(at)}
    >
      <span className={cn("grid size-7 place-items-center rounded-xl lg:size-9", tones[tone])}>{icon}</span>
      <span className="leading-tight">
        <span className="block text-[0.62rem] text-ink-500 lg:text-[0.68rem]">{label}</span>
        <span className="num block text-sm font-semibold text-ink-950 lg:text-[0.95rem]">{value}</span>
        <span className="hidden text-[0.6rem] text-ink-400 xl:block">{sub}</span>
      </span>
    </button>
  );
}

/* =====================================================================================
   Bentuk-bentuk SVG
   ===================================================================================== */

function windowsLit(f: Aliran, siapa: "utama" | "warga"): number {
  if (f.beban <= 0) return 0;
  // Balai desa memikul beban kritis: tetap terang. Rumah warga meredup saat kenyamanan dilepas.
  return siapa === "utama" ? 1 : f.lepas ? 0.35 : 1;
}

function Box({ x0, y0, x1, y1, h, z = 0, top, left, right, k }: { x0: number; y0: number; x1: number; y1: number; h: number; z?: number; top: string; left: string; right: string; k: number }) {
  const st = (c: string) => ({ fill: tint(c, k), transition: "fill 1s" });
  return (
    <g>
      <polygon points={pts([x0, y1, z], [x1, y1, z], [x1, y1, z + h], [x0, y1, z + h])} style={st(left)} />
      <polygon points={pts([x1, y0, z], [x1, y1, z], [x1, y1, z + h], [x1, y0, z + h])} style={st(right)} />
      <polygon points={pts([x0, y0, z + h], [x1, y0, z + h], [x1, y1, z + h], [x0, y1, z + h])} style={st(top)} />
    </g>
  );
}

/** Jendela pada sisi kiri (y = konstan) atau sisi kanan (x = konstan). */
function Win({ face, at, a, b, z0, z1, lit, k }: { face: "left" | "right"; at: number; a: number; b: number; z0: number; z1: number; lit: number; k: number }) {
  const p =
    face === "left"
      ? pts([a, at, z0], [b, at, z0], [b, at, z1], [a, at, z1])
      : pts([at, a, z0], [at, b, z0], [at, b, z1], [at, a, z1]);
  const on = lit > 0;
  return (
    <g>
      <polygon points={p} style={{ fill: on ? "#ffcf73" : tint("#c9d3d9", k), opacity: on ? 0.55 + lit * 0.45 : 1, transition: "fill .6s, opacity .6s" }} stroke={tint("#e9e1d1", k)} strokeWidth="1.5" />
      {on && k > 0.3 && <polygon points={p} fill="#ffcf73" filter="url(#vs-soft)" opacity={0.8 * lit} />}
    </g>
  );
}

function roofFaces(x0: number, y0: number, x1: number, y1: number, H: number, R: number, ov = 6) {
  const xm = (x0 + x1) / 2;
  const half = (x1 - x0) / 2;
  const drop = (R * ov) / half;
  return {
    left: pts([x0 - ov, y0 - ov, H - drop], [x0 - ov, y1 + ov, H - drop], [xm, y1 + ov, H + R], [xm, y0 - ov, H + R]),
    right: pts([xm, y0 - ov, H + R], [xm, y1 + ov, H + R], [x1 + ov, y1 + ov, H - drop], [x1 + ov, y0 - ov, H - drop]),
    edge: pts([x0 - ov, y1 + ov, H - drop], [xm, y1 + ov, H + R], [x1 + ov, y1 + ov, H - drop]),
    ridge: line([xm, y0 - ov, H + R], [xm, y1 + ov, H + R]),
  };
}

function HouseShape({
  id,
  x0,
  y0,
  x1,
  y1,
  H,
  R,
  atap,
  k,
  lit,
  hovered,
  onHover,
  props,
  filter,
}: (typeof WARGA)[number] & {
  k: number;
  lit: number;
  hovered: boolean;
  onHover: (id: string | null) => void;
  props: HoverHandlers;
  filter: string;
}) {
  const xm = (x0 + x1) / 2;
  const roof = roofFaces(x0, y0, x1, y1, H, R, 4);
  const st = (c: string) => ({ fill: tint(c, k), transition: "fill 1s" });
  const p = props;
  return (
    <g
      onPointerEnter={(e) => {
        p.onPointerEnter(e);
        if (e.pointerType === "mouse") onHover(id);
      }}
      onPointerLeave={(e) => {
        p.onPointerLeave(e);
        if (e.pointerType === "mouse") onHover(null);
      }}
      onClick={p.onClick}
      className="origin-self"
      style={{ transform: hovered ? "translateY(-5px) scale(1.05)" : "none", transition: "transform 300ms cubic-bezier(.2,.8,.2,1), filter 300ms", filter, cursor: "pointer" }}
    >
      <polygon points={pts([x0, y1, 0], [x1, y1, 0], [x1, y1, H], [xm, y1, H + R], [x0, y1, H])} style={st("#efe5d3")} />
      <polygon points={pts([x1, y0, 0], [x1, y1, 0], [x1, y1, H], [x1, y0, H])} style={st("#faf5ea")} />
      <polygon points={roof.left} style={st(shade(atap, -0.18))} />
      <polygon points={roof.right} style={st(atap)} />
      <polyline points={roof.edge} fill="none" stroke={tint(shade(atap, -0.35), k)} strokeWidth="2" />
      <Win face="left" at={y1} a={x0 + 8} b={x0 + 20} z0={12} z1={24} lit={lit} k={k} />
      <polygon points={pts([x1 - 20, y1, 0], [x1 - 9, y1, 0], [x1 - 9, y1, 20], [x1 - 20, y1, 20])} style={st("#8a6a4a")} />
      <Win face="right" at={x1} a={y0 + 10} b={y0 + 22} z0={12} z1={24} lit={lit} k={k} />
      <Win face="right" at={x1} a={y1 - 20} b={y1 - 8} z0={12} z1={24} lit={lit > 0.5 ? lit : 0} k={k} />
    </g>
  );
}

function MainHouse({ k, lit }: { k: number; lit: number }) {
  const { x0, y0, x1, y1, H, R } = RUMAH_UTAMA;
  const xm = (x0 + x1) / 2;
  const roof = roofFaces(x0, y0, x1, y1, H, R, 8);
  const st = (c: string) => ({ fill: tint(c, k), transition: "fill 1s" });
  return (
    <g>
      {/* dinding */}
      <polygon points={pts([x0, y1, 0], [x1, y1, 0], [x1, y1, H], [xm, y1, H + R], [x0, y1, H])} style={st("#eee3cf")} />
      <polygon points={pts([x1, y0, 0], [x1, y1, 0], [x1, y1, H], [x1, y0, H])} style={st("#fbf6ec")} />
      {/* fondasi */}
      <polygon points={pts([x0, y1, 0], [x1, y1, 0], [x1, y1, 5], [x0, y1, 5])} style={st("#d6c9b2")} />
      <polygon points={pts([x1, y0, 0], [x1, y1, 0], [x1, y1, 5], [x1, y0, 5])} style={st("#e4d8c3")} />
      {/* jendela sisi depan-kiri: dua lantai */}
      <Win face="left" at={y1} a={x0 + 12} b={x0 + 34} z0={14} z1={32} lit={lit} k={k} />
      <Win face="left" at={y1} a={x0 + 76} b={x0 + 104} z0={14} z1={32} lit={lit} k={k} />
      <Win face="left" at={y1} a={xm - 10} b={xm + 10} z0={44} z1={58} lit={lit} k={k} />
      {/* pintu + kanopi */}
      <polygon points={pts([x0 + 46, y1, 0], [x0 + 64, y1, 0], [x0 + 64, y1, 30], [x0 + 46, y1, 30])} style={st("#8a5a3c")} />
      <polygon points={pts([x0 + 42, y1, 33], [x0 + 68, y1, 33], [x0 + 68, y1 + 10, 30], [x0 + 42, y1 + 10, 30])} style={st("#5b5753")} />
      {/* jendela sisi kanan */}
      <Win face="right" at={x1} a={y0 + 12} b={y0 + 36} z0={14} z1={34} lit={lit} k={k} />
      <Win face="right" at={x1} a={y0 + 54} b={y0 + 78} z0={14} z1={34} lit={lit} k={k} />
      <Win face="right" at={x1} a={y0 + 12} b={y0 + 36} z0={42} z1={54} lit={lit} k={k} />
      <Win face="right" at={x1} a={y0 + 54} b={y0 + 78} z0={42} z1={54} lit={lit} k={k} />
      {/* atap */}
      <polygon points={roof.left} style={st("#3f3c39")} />
      <polygon points={roof.right} style={st("#57534e")} />
      <polyline points={roof.edge} fill="none" stroke={tint("#2a2926", k)} strokeWidth="3" strokeLinejoin="round" />
      <path d={roof.ridge} stroke={tint("#2a2926", k)} strokeWidth="3" />
    </g>
  );
}

function SolarPanels({ k, output, highlight, reduced }: { k: number; output: number; highlight: boolean; reduced: boolean }) {
  const { x0, y0, x1, y1, H, R } = RUMAH_UTAMA;
  const xm = (x0 + x1) / 2;
  // Titik pada bidang atap kanan: u sepanjang y, v dari tepi atap (x1, H) ke bubungan (xm, H+R).
  const at = (u: number, v: number): V3 => [x1 + (xm - x1) * v, y0 + (y1 - y0) * u, H + R * v + 0.6];
  const cols = 5;
  const rows = 2;
  const cells: { p: string; i: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const u0 = 0.05 + c * (0.9 / cols) + 0.008;
      const u1 = 0.05 + (c + 1) * (0.9 / cols) - 0.008;
      const v0 = 0.12 + r * 0.38 + 0.015;
      const v1 = 0.12 + (r + 1) * 0.38 - 0.015;
      cells.push({ p: pts(at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)), i: r * cols + c });
    }
  return (
    <g>
      {cells.map(({ p, i }) => (
        <g key={i}>
          <polygon
            points={p}
            style={{ fill: tint(highlight ? "#2d4473" : "#22335a", k), transition: "fill .4s" }}
            stroke={highlight ? "#fa9104" : tint("#7f93bd", k)}
            strokeWidth={highlight ? 1.6 : 0.9}
          />
          {/* kilau = indikasi panel sedang menghasilkan; makin redup saat mendung */}
          {output > 0 && !reduced && (
            <polygon points={p} fill="#fff6d8" className="animate-glint" style={{ animationDelay: `${((i % cols) + Math.floor(i / cols)) * 0.22}s`, opacity: 0 }} fillOpacity={0.3 + output * 0.7} />
          )}
        </g>
      ))}
    </g>
  );
}

function BatteryShape({ k, soc, mode }: { k: number; soc: number; mode: "mengisi" | "memasok" | "siaga" }) {
  const { x0, y0, x1, y1, h } = BATERAI;
  const fillH = 8 + (h - 16) * (soc / 100);
  const color = soc < 25 ? "#d9533b" : soc < 45 ? "#e0a21b" : "#e1ee5e";
  return (
    <g>
      <polygon points={pts([x0 - 3, y0 - 3, 0], [x1 + 3, y0 - 3, 0], [x1 + 3, y1 + 3, 0], [x0 - 3, y1 + 3, 0])} fill={tint("#a7c47f", k)} />
      <Box x0={x0} y0={y0} x1={x1} y1={y1} h={h} top="#63c99a" left="#17805a" right="#1f9a6a" k={k} />
      {/* modul pada sisi kiri */}
      {[0, 1, 2].map((i) => (
        <polygon key={i} points={pts([x0 + 4, y1, 8 + i * 14], [x1 - 4, y1, 8 + i * 14], [x1 - 4, y1, 18 + i * 14], [x0 + 4, y1, 18 + i * 14])} fill="rgb(255 255 255 / 0.12)" />
      ))}
      {/* indikator kapasitas pada sisi kanan */}
      <polygon points={pts([x1, y0 + 14, 8], [x1, y0 + 30, 8], [x1, y0 + 30, h - 8], [x1, y0 + 14, h - 8])} fill="rgb(0 0 0 / 0.28)" />
      <polygon points={pts([x1, y0 + 15, 9], [x1, y0 + 29, 9], [x1, y0 + 29, fillH], [x1, y0 + 15, fillH])} fill={color} style={{ transition: "all .8s" }} />
      {/* LED status */}
      <circle cx={P([x1, y0 + 40, h - 8])[0]} cy={P([x1, y0 + 40, h - 8])[1]} r="2.6" fill={mode === "mengisi" ? "#e1ee5e" : mode === "memasok" ? "#ffcf73" : "#cfd6dc"} className={mode !== "siaga" ? "animate-pulse-soft" : undefined} />
    </g>
  );
}

function Tree({ at, k, i }: { at: V3; k: number; i: number }) {
  const [x, y] = P(at);
  const s = 0.85 + ((i * 37) % 30) / 100;
  return (
    <g aria-hidden="true">
      <ellipse cx={x} cy={y} rx={10 * s} ry={4.5 * s} fill="rgb(0 0 0 / 0.08)" />
      <rect x={x - 1.8} y={y - 20 * s} width="3.6" height={20 * s} rx="1.5" style={{ fill: tint("#8a6a4a", k), transition: "fill 1s" }} />
      <circle cx={x} cy={y - 28 * s} r={13 * s} style={{ fill: tint("#4f9a4c", k), transition: "fill 1s" }} />
      <circle cx={x - 4 * s} cy={y - 32 * s} r={8 * s} style={{ fill: tint("#7cbf5f", k), transition: "fill 1s" }} />
    </g>
  );
}

function CloudShape({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} style={{ fill, transition: "fill 1s" }}>
      <ellipse cx="0" cy="0" rx="46" ry="16" />
      <circle cx="-16" cy="-10" r="18" />
      <circle cx="12" cy="-16" r="22" />
    </g>
  );
}

/** Jalur aliran: garis berwarna sumber + titik cahaya yang bergerak (atau garis statis bila gerak dikurangi). */
function FlowPath({ path, kw, colors, reduced }: { path: V3[]; kw: number; colors: string[]; reduced: boolean }) {
  const d = line(...path);
  const len = lengthOf(...path);
  const width = 2 + Math.min(3, kw * 0.45);
  if (reduced) {
    return <path d={d} stroke={colors[0]} strokeWidth={width} opacity="0.85" strokeDasharray="6 6" />;
  }
  const speed = 46 + Math.min(40, kw * 6); // px per detik
  const dur = len / speed;
  const count = Math.max(2, Math.round(len / 30));
  return (
    <g>
      <path d={d} stroke={colors[0]} strokeWidth={width} opacity="0.28" />
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} r={width * 0.95} fill={colors[i % colors.length]}>
          <animateMotion dur={`${dur.toFixed(2)}s`} begin={`${(-(i * dur) / count).toFixed(2)}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </g>
  );
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v + v * amt))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}
