import Link from "next/link";
import { ArrowRight, BatteryCharging, CloudRain, PlugZap, Recycle, ShieldCheck, SunMedium } from "lucide-react";
import { EnergyFlow } from "@/components/energy-flow";
import { ButtonLink, Logo } from "@/components/ui";

const MODUL = [
  { k: "A", t: "Penilaian Baterai", d: "SoH, grade A–D, paspor baterai, rentang sisa umur, dan skor keyakinan.", icon: BatteryCharging, tone: "bg-leaf-50 text-leaf-600" },
  { k: "B", t: "Perencanaan & Ketahanan", d: "Jumlah paket, panel, inverter, biaya vs diesel, dan simulasi cuaca buruk.", icon: SunMedium, tone: "bg-sun-100 text-sun-700" },
  { k: "C", t: "Kompatibilitas", d: "Pemeriksaan tegangan baterai dan inverter: layak, perlu penyesuaian, tidak layak.", icon: PlugZap, tone: "bg-sky-50 text-sky-600" },
  { k: "D", t: "Siklus Hidup", d: "Jadwal penggantian, peringatan dini, tren SoH, dan jalur daur ulang.", icon: Recycle, tone: "bg-flame-50 text-flame-600" },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo size={32} />
        <nav className="flex items-center gap-2">
          <Link href="/masuk" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 sm:inline-block">
            Masuk
          </Link>
          <ButtonLink href="/daftar" size="sm" variant="dark">
            Daftar
          </ButtonLink>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid items-center gap-10 pt-6 pb-14 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-700 shadow-soft ring-1 ring-ink-200">
              <span className="size-1.5 rounded-full bg-sun-500" /> Baterai kehidupan kedua untuk desa terpencil
            </span>
            <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-bold tracking-tight text-ink-950 sm:text-6xl">
              Dari limbah
              <br />
              <span className="text-sun-600">jadi cerah.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-600">
              SOLUNA membantu pengelola desa menilai baterai bekas kendaraan listrik, merancang sistem surya, dan memastikan listrik
              kritis tetap menyala saat cuaca buruk.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/masuk" size="lg">
                Masuk ke aplikasi <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/daftar" size="lg" variant="secondary">
                Daftar sebagai pemasok
              </ButtonLink>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-ink-500">
              <ShieldCheck className="size-4 text-leaf-500" /> Semua angka dari rumus yang dapat diverifikasi — bukan dari AI.
            </p>
          </div>
          <div className="lg:scale-105 lg:origin-center">
            <EnergyFlow suryaKwh={50} suryaKeDesaKwh={20} suryaKeBateraiKwh={33.3} bebanKwh={50} bateraiKwh={30} gensetKwh={0} socPersen={86} rumah={50} />
          </div>
        </section>

        <section className="mb-16 overflow-hidden rounded-[2rem] bg-[#f3f6f4] px-6 py-10 ring-1 ring-ink-200/70 sm:px-10 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12 lg:px-14 lg:py-14">
          <div>
            <p className="eyebrow text-leaf-700">Terhubung dalam satu rencana</p>
            <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
              Dari baterai hingga listrik desa, semuanya saling terhubung.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-600">
              SOLUNA menyatukan penilaian baterai, perencanaan energi, pemeriksaan kompatibilitas, dan siklus hidup dalam satu alur
              yang mudah dipahami—agar setiap keputusan teknis tetap berpijak pada kebutuhan desa.
            </p>
          </div>

          <div className="relative mt-10 lg:mt-0">
            <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-0">
              {MODUL.map((m) => (
                <div key={m.k} className="relative flex flex-col items-center text-center">
                  <span className={`grid size-12 place-items-center rounded-2xl bg-white shadow-soft ring-1 ring-ink-200/70 ${m.tone}`}>
                    <m.icon className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink-800">{m.t}</p>
                  <span className="mt-3 hidden h-8 w-px bg-leaf-300 sm:block" />
                </div>
              ))}
            </div>
            <div className="mx-auto mt-8 flex max-w-xs items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-soft ring-1 ring-ink-200/70">
              <span className="grid size-10 place-items-center rounded-full bg-sun-100 text-sun-700">
                <SunMedium className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-ink-950">SOLUNA</p>
                <p className="text-sm text-ink-500">Satu rencana energi yang utuh</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 grid gap-4 rounded-[2rem] bg-ink-900 p-6 text-ink-50 sm:p-10 lg:grid-cols-3">
          {[
            { n: "01", t: "Nilai", d: "Pemasok mendaftarkan baterai pensiun. Admin menilai kesehatannya dan menerbitkan paspor baterai." },
            { n: "02", t: "Rancang", d: "Cocokkan baterai dengan kebutuhan desa: paket, panel, inverter, dan biaya dibanding genset." },
            { n: "03", t: "Bertahan", d: "Uji hari mendung dan hujan. Lepas beban kenyamanan lebih dulu agar beban kritis tetap menyala." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
              <p className="num text-sm text-sun-400">{s.n}</p>
              <p className="mt-3 text-xl font-semibold">{s.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{s.d}</p>
            </div>
          ))}
          <p className="flex items-center gap-2 text-xs text-ink-400 lg:col-span-3">
            <CloudRain className="size-4" /> Simulasi cuaca memakai faktor penurunan produksi yang ditetapkan, bukan prakiraan cuaca real-time.
          </p>
        </section>
      </main>
      <footer className="border-t border-ink-200 py-6 text-center text-xs text-ink-500">
        © {2026} SOLUNA · Hasil adalah estimasi indikatif dan tidak menggantikan pemeriksaan teknis baterai.
      </footer>
    </div>
  );
}
