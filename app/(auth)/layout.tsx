import Link from "next/link";
import { BatteryCharging, CloudRain, SunMedium } from "lucide-react";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-ink-900 p-10 text-ink-50 lg:flex lg:flex-col">
        <Link href="/" className="[&_span]:text-white">
          <Logo size={34} />
        </Link>
        <div className="relative z-10 mt-auto max-w-md">
          <p className="eyebrow !text-sun-400">Energi desa · baterai kehidupan kedua</p>
          <h2 className="mt-4 text-4xl leading-[1.1] font-bold tracking-tight">Listrik yang terencana, dari baterai yang masih layak.</h2>
          <p className="mt-4 text-ink-300">
            Nilai baterai bekas kendaraan listrik, rancang sistem surya desa, dan uji ketahanan saat cuaca buruk — dalam satu
            platform.
          </p>
          <ul className="mt-8 grid grid-cols-3 gap-3 text-sm">
            {[
              { icon: BatteryCharging, t: "Penilaian baterai", c: "text-leaf-300" },
              { icon: SunMedium, t: "Perencana desa", c: "text-sun-400" },
              { icon: CloudRain, t: "Simulasi ketahanan", c: "text-sky-100" },
            ].map(({ icon: I, t, c }) => (
              <li key={t} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                <I className={`size-5 ${c}`} />
                <p className="mt-3 leading-snug text-ink-200">{t}</p>
              </li>
            ))}
          </ul>
        </div>
        {/* ornamen orbit matahari */}
        <div className="pointer-events-none absolute -top-40 -right-40 size-[34rem] rounded-full border border-white/5" />
        <div className="pointer-events-none absolute -top-24 -right-24 size-[24rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute top-16 right-16 size-24 rounded-full bg-sun-500/90 blur-[2px]" />
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="lg:hidden">
          <Logo size={30} />
        </Link>
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">{children}</div>
      </main>
    </div>
  );
}
