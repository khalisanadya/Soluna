import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BatteryCharging, Check, ChevronDown, ChevronRight, CloudRain, Cpu, Fuel, Leaf, PanelsTopLeft, Trash2, Wallet, Zap } from "lucide-react";
import { deletePlan } from "@/app/actions/perencana";
import { Badge, ButtonLink, Card, IlustrasiTag, Notice, SectionTitle, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { cn, num, rupiah, rupiahShort } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKetahanan, HasilKompatibilitas, HasilRencana } from "@/lib/types";

export const metadata: Metadata = { title: "Hasil Perencanaan" };

export default async function HasilRencanaPage({ params, searchParams }: PageProps<"/perencana/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const r = await prisma.rencanaDesa.findUnique({
    where: { id },
    include: {
      cekKompat: { orderBy: { createdAt: "desc" }, take: 1 },
      simulasi: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!r) notFound();
  const h = r.hasil as unknown as HasilRencana;
  const m = r.masukan as { jumlah_rumah: number; konsumsi_per_rumah_kwh: number; porsi_malam: number; lokasi?: string };
  const s = h.ringkasan;
  const p = h.parameter;
  const b = h.biaya;
  const per = b.periode_hari === 365 ? "tahun" : "bulan";
  const maxBiaya = Math.max(b.diesel_per_rumah.tinggi, b.sistem_per_rumah.tinggi);
  const kompat = r.cekKompat[0]?.hasil as HasilKompatibilitas | undefined;
  const sim = r.simulasi[0]?.hasil as HasilKetahanan | undefined;
  const hujan = sim?.skenario.find((x) => x.kunci === "hujan_beberapa_hari") ?? sim?.skenario.at(-1);
  const hemat = { rendah: b.diesel_per_rumah.rendah - b.sistem_per_rumah.tinggi, tinggi: b.diesel_per_rumah.tinggi - b.sistem_per_rumah.rendah };
  const gagal = h.pemeriksaan.filter((c) => !c.lulus);
  const wilayah = !m.lokasi || m.lokasi === "Bawaan" ? "Wilayah umum" : m.lokasi;

  // Kesimpulan biaya dalam satu kalimat.
  const putusan =
    hemat.rendah >= 0
      ? { tone: "bg-leaf-500/15 text-leaf-200", teks: `Lebih hemat ${rupiahShort(hemat.rendah)}–${rupiahShort(hemat.tinggi)} per rumah / ${per} dibanding genset` }
      : hemat.tinggi <= 0
        ? { tone: "bg-flame-500/15 text-flame-100", teks: `Lebih mahal ${rupiahShort(-hemat.tinggi)}–${rupiahShort(-hemat.rendah)} per rumah / ${per} dibanding genset` }
        : { tone: "bg-white/10 text-ink-100", teks: `Biayanya setara genset, tergantung harga (selisih −${rupiahShort(-hemat.rendah)} s.d. +${rupiahShort(hemat.tinggi)} per rumah / ${per})` };

  const langkah = [
    { href: `/pencocokan?rencana=${r.id}`, judul: "Cocokkan baterai", ket: "Pilih baterai yang sesuai", selesai: false },
    { href: `/kompatibilitas?rencana=${r.id}`, judul: "Cek kompatibilitas", ket: kompat ? kompat.label : "Wajib sebelum dipasang", selesai: Boolean(kompat) },
    {
      href: `/ketahanan?rencana=${r.id}`,
      judul: "Simulasi ketahanan",
      ket: hujan ? `Hujan: ${hujan.lama_bertahan_pelepasan_hari === null ? "aman" : `bertahan ${num(hujan.lama_bertahan_pelepasan_hari)} hari`}` : "Uji saat mendung & hujan",
      selesai: Boolean(sim),
    },
  ];

  return (
    <>
      <Link href="/perencana" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" /> Semua rencana
      </Link>

      {sp.baru && (
        <Notice tone="success" className="mb-4" title="Rencana tersimpan">
          Lanjutkan ke langkah berikutnya di sebelah kanan.
        </Notice>
      )}
      {gagal.length > 0 && (
        <Notice tone="danger" className="mb-4" title="Rancangan belum mencukupi">
          {gagal.map((c) => c.keterangan).join(" ")}
        </Notice>
      )}

      {/* Sorotan: rekomendasi sistem */}
      <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-ink-900 p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-sun-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-sun-400 uppercase">
              Rekomendasi sistem {r.ilustrasi && <IlustrasiTag className="border-white/30 text-ink-300" />}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{r.namaDesa}</h1>
            <p className="mt-1 text-sm text-ink-300">
              {r.nama} · {num(m.jumlah_rumah, 0)} rumah · {wilayah}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="text-xs text-ink-400">Kebutuhan listrik</span>
            <span className="num text-3xl font-semibold">
              {num(s.kebutuhan_harian_kwh)} <span className="text-base font-normal text-ink-400">kWh/hari</span>
            </span>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 lg:grid-cols-4">
          <Angka icon={<PanelsTopLeft className="size-5" />} warna="bg-sun-500 text-ink-950" label="Panel surya" nilai={`${s.jumlah_panel}`} satuan="panel" ket={`${num(s.kapasitas_panel_terpasang_kwp)} kWp`} />
          <Angka icon={<BatteryCharging className="size-5" />} warna="bg-leaf-500 text-white" label="Baterai" nilai={`${s.jumlah_paket}`} satuan="paket" ket={`${num(s.energi_tersedia_kwh)} kWh siap pakai`} />
          <Angka icon={<Cpu className="size-5" />} warna="bg-sky-500 text-white" label="Inverter" nilai={`${s.inverter_kw}`} satuan="kW" ket={`Beban puncak ${num(s.daya_puncak_kw)} kW`} />
          <Angka icon={<Wallet className="size-5" />} warna="bg-white text-ink-900" label="Investasi" nilai={rupiahShort(b.investasi.rendah)} satuan="" ket={`hingga ${rupiahShort(b.investasi.tinggi)}`} />
        </div>

        <p className={cn("relative mt-4 inline-flex rounded-full px-3.5 py-1.5 text-sm font-medium", putusan.tone)}>{putusan.teks}</p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Biaya */}
          <Card>
            <SectionTitle title={`Biaya listrik per rumah / ${per}`} />
            <div className="space-y-5">
              {[
                { l: "Surya + baterai", r: b.sistem_per_rumah, c: "bg-leaf-500", t: "bg-leaf-100", icon: <Zap className="size-4 text-leaf-600" /> },
                { l: "Genset diesel", r: b.diesel_per_rumah, c: "bg-flame-500", t: "bg-flame-100", icon: <Fuel className="size-4 text-flame-500" /> },
              ].map((x) => (
                <div key={x.l}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      {x.icon} {x.l}
                    </span>
                    <span className="num font-semibold">
                      {rupiahShort(x.r.rendah)} – {rupiahShort(x.r.tinggi)}
                    </span>
                  </div>
                  <div className={`relative h-3 rounded-full ${x.t}`}>
                    <div className={`absolute h-3 rounded-full ${x.c}`} style={{ left: `${(x.r.rendah / maxBiaya) * 100}%`, width: `${Math.max(1.5, ((x.r.tinggi - x.r.rendah) / maxBiaya) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4 text-sm">
              <span className="text-ink-500">Iuran perawatan per rumah</span>
              <span className="num font-semibold">
                {rupiahShort(b.iuran_perawatan_per_rumah_bulan.rendah)} – {rupiahShort(b.iuran_perawatan_per_rumah_bulan.tinggi)} / bulan
              </span>
            </div>
          </Card>

          {/* Perbandingan tujuan */}
          {h.perbandingan_prioritas && (
            <Card>
              <SectionTitle title="Bila tujuannya berbeda" />
              <div className="grid gap-3 sm:grid-cols-3">
                {h.perbandingan_prioritas.map((x) => (
                  <div key={x.kunci} className={cn("rounded-2xl p-4 transition", x.terpilih ? "bg-sun-50 ring-2 ring-sun-400" : "bg-ink-50/60 ring-1 ring-ink-200")}>
                    <p className="flex items-center justify-between gap-2 text-sm font-medium text-ink-900">
                      {x.label}
                      {x.terpilih && <Badge tone="sun">Dipilih</Badge>}
                    </p>
                    <p className="num mt-3 text-3xl font-semibold text-ink-950">
                      {x.jumlah_paket} <span className="text-sm font-normal text-ink-500">paket</span>
                    </p>
                    <p className="num mt-0.5 text-xs text-ink-500">{num(x.energi_tersedia_kwh)} kWh siap pakai</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Alasan (tersembunyi secara bawaan) */}
          <details className="group rounded-[var(--radius-card)] bg-surface shadow-soft ring-1 ring-ink-200/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink-900 sm:px-6 [&::-webkit-details-marker]:hidden">
              Lihat alasan rekomendasi
              <ChevronDown className="size-4 text-ink-400 transition group-open:rotate-180" />
            </summary>
            <ul className="space-y-3 px-5 pb-5 text-sm text-ink-600 sm:px-6">
              <Alasan icon={<PanelsTopLeft className="size-4" />}>
                Panel menghasilkan ±{num(s.produksi_surya_harian_kwh ?? s.kebutuhan_harian_kwh)} kWh/hari dengan matahari ±{num(p.psh_jam)} jam, cukup untuk kebutuhan {num(s.kebutuhan_harian_kwh)} kWh.
              </Alasan>
              <Alasan icon={<BatteryCharging className="size-4" />}>
                Malam butuh ±{num(s.kebutuhan_malam_kwh)} kWh. Tiap paket dipakai {num(s.kapasitas_terpakai_per_paket_kwh)} kWh, jadi {s.paket_siklus_harian} paket per malam
                {p.hari_cadangan ? ` + cadangan ${p.hari_cadangan} hari` : ""}.
              </Alasan>
              <Alasan icon={<Cpu className="size-4" />}>Beban tertinggi ±{num(s.daya_puncak_kw)} kW; inverter {s.inverter_kw} kW adalah ukuran standar terdekat dengan cadangan aman.</Alasan>
            </ul>
          </details>
        </div>

        <div className="space-y-4">
          {/* Langkah berikutnya */}
          <Card>
            <SectionTitle title="Langkah berikutnya" />
            <ol className="relative -mx-2 space-y-1">
              {langkah.map((l, i) => (
                <li key={l.judul}>
                  <Link href={l.href} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50">
                    <span
                      className={cn(
                        "num grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                        l.selesai ? "bg-leaf-500 text-white" : "bg-sun-100 text-sun-800",
                      )}
                    >
                      {l.selesai ? <Check className="size-4" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink-900">{l.judul}</span>
                      <span className="block truncate text-xs text-ink-500">{l.ket}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-500" />
                  </Link>
                </li>
              ))}
            </ol>
            <ButtonLink href={`/ketahanan?rencana=${r.id}`} className="mt-4 w-full">
              <CloudRain className="size-4" /> Simulasi ketahanan
            </ButtonLink>
          </Card>

          {/* Dampak */}
          <Card className="!bg-leaf-50 !shadow-none !ring-leaf-100">
            <SectionTitle title={`Dampak per ${per}`} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="grid size-9 place-items-center rounded-xl bg-white text-flame-500 shadow-soft">
                  <Fuel className="size-4" />
                </span>
                <p className="num mt-2 text-2xl font-semibold text-ink-950">
                  {num(h.lingkungan.diesel_hemat_liter, 0)} <span className="text-sm font-normal text-ink-500">liter</span>
                </p>
                <p className="text-xs text-ink-600">solar dihemat</p>
              </div>
              <div>
                <span className="grid size-9 place-items-center rounded-xl bg-white text-leaf-600 shadow-soft">
                  <Leaf className="size-4" />
                </span>
                <p className="num mt-2 text-2xl font-semibold text-ink-950">
                  {num(h.lingkungan.co2_dihindari_kg, 0)} <span className="text-sm font-normal text-ink-500">kg</span>
                </p>
                <p className="text-xs text-ink-600">CO₂ dihindari</p>
              </div>
            </div>
          </Card>

          {/* Data yang dipakai */}
          <Card>
            <SectionTitle title="Data yang dipakai" />
            <dl className="divide-y divide-ink-100 text-sm">
              {(
                [
                  ["Pemakaian", `${num(m.konsumsi_per_rumah_kwh)} kWh/rumah · ${num(m.porsi_malam * 100, 0)}% malam`],
                  ["Baterai", `${num(p.kapasitas_paket_kwh)} kWh · SoH ${num(p.soh_paket * 100, 0)}%`],
                  ...(p.prioritas_label ? [["Tujuan", p.prioritas_label]] : []),
                  ["Cadangan", p.hari_cadangan ? `${p.hari_cadangan} hari` : "Tidak ada"],
                  ...(p.harga_diesel_rendah ? [["Solar", `${rupiah(p.harga_diesel_rendah)}–${rupiah(p.harga_diesel_tinggi)}`]] : []),
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 first:pt-0 last:pb-0">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="num text-right font-medium text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ink-400">Semua angka adalah estimasi.</p>
          </Card>

          <form action={deletePlan} className="text-right">
            <input type="hidden" name="id" value={r.id} />
            <button className={buttonClass("ghost", "sm", "text-flame-600")}>
              <Trash2 className="size-4" /> Hapus rencana
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function Angka({ icon, warna, label, nilai, satuan, ket }: { icon: React.ReactNode; warna: string; label: string; nilai: string; satuan: string; ket: string }) {
  return (
    <div className="bg-ink-900/60 p-4 sm:p-5">
      <span className={cn("grid size-10 place-items-center rounded-xl", warna)}>{icon}</span>
      <p className="mt-3 text-xs text-ink-400">{label}</p>
      <p className="num mt-0.5 text-2xl font-semibold">
        {nilai} {satuan && <span className="text-sm font-normal text-ink-400">{satuan}</span>}
      </p>
      <p className="num mt-0.5 truncate text-xs text-ink-300">{ket}</p>
    </div>
  );
}

function Alasan({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600">{icon}</span>
      <span className="num pt-1.5 leading-relaxed">{children}</span>
    </li>
  );
}
