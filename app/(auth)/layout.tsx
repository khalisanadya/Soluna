import Link from "next/link";
import { ArrowLeft, BatteryCharging, CloudRain, SunMedium } from "lucide-react";
import { Logo } from "@/components/ui";

const POIN = [
  { icon: BatteryCharging, t: "Penilaian baterai", d: "SoH, grade A–D, dan paspor baterai.", c: "bg-leaf-500/15 text-leaf-300" },
  { icon: SunMedium, t: "Perencanaan desa", d: "Paket baterai, panel, dan inverter.", c: "bg-sun-500/15 text-sun-300" },
  { icon: CloudRain, t: "Simulasi ketahanan", d: "Uji hari mendung dan hujan.", c: "bg-zest-300/15 text-zest-200" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-ink-950 text-ink-50 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:p-10 xl:p-12">
        <Link href="/" className="relative z-10 w-fit rounded-lg [&_span]:text-white" aria-label="SOLUNA — kembali ke beranda">
          <Logo size={34} />
        </Link>

        {/* Ornamen: matahari dengan orbit, hanya dekoratif. */}
        <div className="pointer-events-none absolute -top-36 -right-36 size-[32rem] rounded-full border border-white/[0.06]" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-16 -right-16 size-[22rem] rounded-full border border-white/10" aria-hidden="true" />
        <div className="pointer-events-none absolute top-20 right-20 size-28 [@media(max-height:820px)]:hidden" aria-hidden="true">
          <div className="absolute inset-0 animate-glow rounded-full bg-sun-500/40 blur-2xl" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-sun-300 to-sun-500" />
        </div>

        <div className="relative z-10 mt-auto max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-zest-200 ring-1 ring-white/10">
            <span className="size-1.5 rounded-full bg-zest-300" /> Baterai kehidupan kedua untuk desa
          </p>
          <h2 className="mt-5 text-[2.35rem] leading-[1.08] font-bold tracking-tight text-balance">
            Listrik yang terencana, dari baterai yang masih <span className="text-sun-400">layak.</span>
          </h2>
          <p className="mt-4 leading-relaxed text-ink-300">
            Nilai baterai bekas kendaraan listrik, rancang sistem surya desa, dan uji ketahanannya saat cuaca buruk — dalam satu
            platform.
          </p>
          <ul className="mt-8 space-y-3">
            {POIN.map(({ icon: I, t, d, c }) => (
              <li key={t} className="flex items-center gap-3.5 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/[0.07]">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${c}`}>
                  <I className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t}</span>
                  <span className="block text-xs text-ink-400">{d}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-ink-500">Hasil SOLUNA adalah estimasi indikatif dan tidak menggantikan pemeriksaan teknis baterai.</p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col px-5 py-5 sm:px-10 lg:px-14 lg:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="rounded-lg lg:hidden" aria-label="SOLUNA — kembali ke beranda">
            <Logo size={30} />
          </Link>
          <Link
            href="/"
            className="group ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-950"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Kembali ke Beranda
          </Link>
        </div>
        <div className="mx-auto flex w-full flex-1 flex-col justify-center py-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
