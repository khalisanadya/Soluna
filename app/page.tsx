import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  CloudRain,
  ClipboardCheck,
  Gauge,
  PlugZap,
  Recycle,
  ShieldCheck,
  SunMedium,
  Users,
} from "lucide-react";
import { RevealObserver } from "@/components/reveal-observer";
import { SiteNav } from "@/components/site-nav";
import { ButtonLink, Logo } from "@/components/ui";
import { VillageScene } from "@/components/village-scene";
import { cn } from "@/lib/format";

const FITUR = [
  {
    t: "Penilaian Baterai",
    q: "Seberapa sehat baterai ini?",
    d: "Ukur kesehatan (SoH) baterai bekas dan terbitkan paspor dengan grade A–D.",
    poin: ["SoH & grade A–D", "Paspor baterai", "Skor keyakinan"],
    icon: BatteryCharging,
    card: "bg-surface ring-1 ring-ink-200/70",
    badge: "bg-leaf-50 text-leaf-600",
    chip: "bg-ink-100 text-ink-700",
    text: "text-ink-600",
  },
  {
    t: "Perencanaan & Ketahanan",
    q: "Cukupkah untuk desa?",
    d: "Hitung paket baterai, panel, dan inverter, lalu uji saat mendung atau hujan.",
    poin: ["Biaya per rumah", "Simulasi cuaca", "Prioritas beban"],
    icon: SunMedium,
    card: "bg-zest-300 ring-1 ring-zest-400",
    badge: "bg-ink-950 text-zest-300",
    chip: "bg-white/60 text-ink-800",
    text: "text-ink-800",
  },
  {
    t: "Kompatibilitas",
    q: "Cocok dengan inverter?",
    d: "Periksa tegangan baterai dan inverter sebelum dipasang.",
    poin: ["Layak", "Perlu penyesuaian", "Tidak layak"],
    icon: PlugZap,
    card: "bg-ink-950 text-white ring-1 ring-ink-900",
    badge: "bg-sun-500 text-ink-950",
    chip: "bg-white/10 text-ink-200",
    text: "text-ink-300",
  },
  {
    t: "Siklus Hidup Baterai",
    q: "Kapan harus diganti?",
    d: "Pantau tren SoH, dapatkan peringatan dini, dan rencanakan daur ulang.",
    poin: ["Jadwal penggantian", "Peringatan dini", "Jalur daur ulang"],
    icon: Recycle,
    card: "bg-surface ring-1 ring-ink-200/70",
    badge: "bg-sun-100 text-sun-700",
    chip: "bg-ink-100 text-ink-700",
    text: "text-ink-600",
  },
];

const ANGKA = [
  { n: "4", u: "modul", d: "Penilaian, perencanaan, kompatibilitas, dan siklus hidup dalam satu alur." },
  { n: "A–D", u: "grade", d: "Kondisi baterai diringkas jadi grade yang mudah dibaca pengelola desa." },
  { n: "3", u: "skenario cuaca", d: "Normal, mendung panjang, dan hujan beberapa hari." },
  { n: "3", u: "tingkat beban", d: "Kritis, penting, dan kenyamanan — dilepas bertahap saat cadangan menipis." },
];

const LANGKAH = [
  {
    n: "01",
    t: "Nilai",
    who: "Pemasok & pengelola",
    d: "Pemasok mendaftarkan baterai bekas. Pengelola sistem desa menilai kondisinya dan menerbitkan paspor baterai.",
    icon: ClipboardCheck,
  },
  {
    n: "02",
    t: "Rancang",
    who: "Sistem SOLUNA",
    d: "Sistem mencocokkan baterai dengan kebutuhan energi desa: paket, panel, inverter, dan biaya.",
    icon: Gauge,
  },
  {
    n: "03",
    t: "Bertahan",
    who: "Pengelola Sistem Desa",
    d: "Simulasi menguji ketahanan saat mendung atau hujan, agar beban kritis tetap menyala.",
    icon: ShieldCheck,
  },
];

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <SiteNav />
      <RevealObserver />

      <main>
        {/* ---------- Hero ---------- */}
        <section id="simulasi" className="mx-auto grid max-w-7xl scroll-mt-20 items-center gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-12 lg:pt-12 lg:pb-24">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-ink-700 shadow-soft ring-1 ring-ink-200">
              <span className="size-1.5 rounded-full bg-sun-500" /> Baterai kehidupan kedua untuk desa terpencil
            </span>
            <h1 className="mt-6 text-[2.75rem] leading-[1.02] font-bold tracking-[-0.03em] text-ink-950 sm:text-6xl xl:text-[4.25rem]">
              Dari limbah
              <br />
              jadi{" "}
              <span className="relative inline-block text-sun-500">
                cerah.
                <svg viewBox="0 0 200 14" className="absolute -bottom-1.5 left-0 h-3 w-full" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 10 C 50 2, 120 2, 198 8" stroke="var(--color-zest-300)" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-600">
              SOLUNA menghubungkan assessment baterai dari pemasok dengan perencanaan sistem surya desa dan ketahanan energi
              untuk kebutuhan penting tetap tersedia saat cuaca buruk.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/masuk" size="lg" className="group">
                Masuk ke aplikasi <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink href="/daftar" size="lg" variant="secondary" className="hover:ring-ink-300">
                Daftar sebagai pemasok
              </ButtonLink>
            </div>
            <ul className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-ink-200 pt-6 text-sm">
              {[
                { icon: BatteryCharging, t: "Grade A–D", c: "text-leaf-600" },
                { icon: CloudRain, t: "Uji cuaca buruk", c: "text-sky-600" },
                { icon: SunMedium, t: "Biaya per rumah", c: "text-sun-600" },
              ].map(({ icon: I, t, c }) => (
                <li key={t} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                  <I className={cn("size-4 shrink-0", c)} />
                  <span className="font-medium text-ink-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-rise [animation-delay:120ms]">
            <VillageScene className="shadow-lift" />
          </div>
        </section>

        {/* ---------- Angka ringkas ---------- */}
        <section aria-label="SOLUNA dalam angka" className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {ANGKA.map((a, i) => (
              <div key={a.u} className="reveal rounded-3xl bg-surface p-5 shadow-soft ring-1 ring-ink-200/60 sm:p-6" style={{ "--reveal-delay": `${i * 80}ms` } as React.CSSProperties}>
                <p className="num text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl">{a.n}</p>
                <p className="mt-1 text-sm font-semibold text-sun-700">{a.u}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">{a.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Fitur ---------- */}
        <section id="fitur" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
          <div className="reveal flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow text-sun-700!">Fitur SOLUNA</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-950 text-balance sm:text-[2.6rem] sm:leading-[1.1]">
                Empat pertanyaan penting, dijawab dalam satu platform.
              </h2>
            </div>
            <p className="max-w-sm text-ink-600">Setiap modul menjawab satu keputusan nyata pengelola desa — tanpa harus membaca laporan teknis yang panjang.</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FITUR.map((m, i) => (
              <article
                key={m.t}
                className={cn("reveal group relative flex flex-col rounded-[1.75rem] p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift", m.card)}
                style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
              >
                <div className="flex items-start justify-between">
                  <span className={cn("grid size-12 place-items-center rounded-2xl", m.badge)}>
                    <m.icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-5 opacity-30 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-80" aria-hidden="true" />
                </div>
                <p className={cn("mt-8 text-sm font-medium", m.text)}>{m.q}</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{m.t}</h3>
                <p className={cn("mt-3 text-sm leading-relaxed", m.text)}>{m.d}</p>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-6">
                  {m.poin.map((p) => (
                    <li key={p} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", m.chip)}>
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- Cara kerja ---------- */}
        <section id="cara-kerja" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-6 py-14 text-white sm:px-10 lg:px-14 lg:py-20">
            <div className="pointer-events-none absolute -top-40 -right-32 size-[28rem] rounded-full bg-sun-500/15 blur-3xl" aria-hidden="true" />
            <div className="reveal relative max-w-2xl">
              <p className="eyebrow text-zest-300!">Cara kerja</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-[2.6rem] sm:leading-[1.1]">Nilai, rancang, lalu pastikan desa tetap bertahan.</h2>
            </div>

            <ol className="relative mt-12 grid gap-4 lg:grid-cols-3 lg:gap-6">
              {LANGKAH.map((s, i) => (
                <li
                  key={s.n}
                  className="reveal group relative rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 transition duration-300 hover:bg-white/[0.07] hover:ring-white/20 sm:p-7"
                  style={{ "--reveal-delay": `${i * 140}ms` } as React.CSSProperties}
                >
                  <div className="flex items-center gap-4">
                    <span className="relative grid size-12 place-items-center rounded-2xl bg-sun-500 text-ink-950 transition-transform duration-300 group-hover:scale-105">
                      <s.icon className="size-5" />
                    </span>
                    <span className="num text-sm text-ink-400">Langkah {s.n}</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold">{s.t}</h3>
                  <p className="mt-2 leading-relaxed text-ink-300">{s.d}</p>
                  <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-ink-300 ring-1 ring-white/10">
                    <Users className="size-3.5" /> {s.who}
                  </p>
                </li>
              ))}
            </ol>
            <p className="relative mt-8 flex items-start gap-2 text-xs text-ink-400">
              <CloudRain className="mt-px size-4 shrink-0" /> Simulasi cuaca memakai faktor penurunan produksi yang ditetapkan, bukan prakiraan cuaca real-time.
            </p>
          </div>
        </section>

        {/* ---------- Ajakan ---------- */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="reveal relative flex flex-col items-start gap-8 overflow-hidden rounded-[2rem] bg-zest-300 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div className="pointer-events-none absolute -right-10 -bottom-24 size-72 rounded-full bg-white/30 blur-2xl" aria-hidden="true" />
            <div className="relative max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight text-ink-950 text-balance sm:text-4xl">Punya baterai bekas kendaraan listrik?</h2>
              <p className="mt-3 text-ink-800">Daftarkan sebagai pemasok dan bantu desa terpencil mendapat listrik yang lebih andal.</p>
            </div>
            <div className="relative flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink href="/daftar" size="lg" variant="dark" className="group">
                Daftar sebagai pemasok <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </ButtonLink>
              <ButtonLink href="/masuk" size="lg" variant="secondary" className="ring-ink-950/10">
                Masuk
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-ink-200 bg-surface/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo size={30} />
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Platform untuk menilai baterai bekas kendaraan listrik, merancang sistem surya desa, dan menguji ketahanan energinya.
            </p>
          </div>
          <nav aria-label="Navigasi footer">
            <p className="eyebrow">Jelajahi</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ["#simulasi", "Simulasi energi"],
                ["#fitur", "Fitur"],
                ["#cara-kerja", "Cara kerja"],
              ].map(([h, t]) => (
                <li key={h}>
                  <a href={h} className="text-ink-700 transition hover:text-sun-700">
                    {t}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Akun">
            <p className="eyebrow">Akun</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/masuk" className="text-ink-700 transition hover:text-sun-700">
                  Masuk
                </Link>
              </li>
              <li>
                <Link href="/daftar" className="text-ink-700 transition hover:text-sun-700">
                  Daftar sebagai pemasok
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-ink-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© 2026 SOLUNA</p>
            <p>Hasil perhitungan SOLUNA adalah estimasi indikatif dan tidak menggantikan pemeriksaan teknis baterai.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
