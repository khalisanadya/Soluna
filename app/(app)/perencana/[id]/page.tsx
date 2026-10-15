import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, BatteryCharging, CheckCircle2, ChevronRight, CircleX, CloudRain, Cpu, Fuel, Leaf, PanelsTopLeft, PlugZap, Trash2, Zap } from "lucide-react";
import { deletePlan } from "@/app/actions/perencana";
import { PrintButton } from "@/components/print-button";
import { Badge, ButtonLink, Card, IlustrasiTag, KeyValue, Notice, PageHeader, SectionTitle, Stat, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { cn, num, rupiah, rupiahShort, tanggal } from "@/lib/format";
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
      dibuatOleh: { select: { nama: true } },
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
  const per = b.periode_hari === 30 ? "bulan" : b.periode_hari === 365 ? "tahun" : `${b.periode_hari} hari`;
  const maxBiaya = Math.max(b.diesel_per_rumah.tinggi, b.sistem_per_rumah.tinggi);
  const kompat = r.cekKompat[0]?.hasil as HasilKompatibilitas | undefined;
  const sim = r.simulasi[0]?.hasil as HasilKetahanan | undefined;
  const hujan = sim?.skenario.find((x) => x.kunci === "hujan_beberapa_hari") ?? sim?.skenario.at(-1);
  const hemat = { rendah: b.diesel_per_rumah.rendah - b.sistem_per_rumah.tinggi, tinggi: b.diesel_per_rumah.tinggi - b.sistem_per_rumah.rendah };
  const gagal = h.pemeriksaan.filter((c) => !c.lulus);

  return (
    <>
      <PageHeader
        eyebrow={<>Perencanaan {r.ilustrasi && <IlustrasiTag />}</>}
        title={r.namaDesa}
        description={`${r.nama} · ${num(m.jumlah_rumah, 0)} rumah · ${num(m.konsumsi_per_rumah_kwh)} kWh/rumah/hari${m.lokasi ? ` · ${m.lokasi}` : ""}`}
        actions={
          <>
            <PrintButton label="Cetak" />
            <ButtonLink href={`/ketahanan?rencana=${r.id}`} className="print:hidden">
              <CloudRain className="size-4" /> Simulasi ketahanan
            </ButtonLink>
          </>
        }
      />
      {sp.baru && (
        <Notice tone="success" className="mb-4 print:hidden" title="Rencana tersimpan">
          Lanjutkan dengan mencocokkan baterai, memeriksa kompatibilitas, dan menguji ketahanan saat cuaca buruk.
        </Notice>
      )}

      {/* Rancangan sistem */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Kebutuhan listrik" value={num(s.kebutuhan_harian_kwh)} unit="kWh/hari" icon={<Zap className="size-4" />} accent="ink" hint={`${num(s.kebutuhan_malam_kwh)} kWh dipakai malam hari`} />
        <Stat
          label="Baterai"
          value={s.jumlah_paket}
          unit="paket"
          icon={<BatteryCharging className="size-4" />}
          accent="leaf"
          hint={`${num(s.energi_tersedia_kwh)} kWh dapat dipakai`}
        />
        <Stat
          label="Panel surya"
          value={s.jumlah_panel}
          unit="panel"
          icon={<PanelsTopLeft className="size-4" />}
          accent="sun"
          hint={s.produksi_surya_harian_kwh !== undefined ? `${num(s.kapasitas_panel_terpasang_kwp)} kWp · ±${num(s.produksi_surya_harian_kwh)} kWh/hari` : `${num(s.kapasitas_panel_terpasang_kwp)} kWp terpasang`}
        />
        <Stat label="Inverter" value={s.inverter_kw} unit="kW" icon={<Cpu className="size-4" />} accent="sky" hint={`Beban puncak ${num(s.daya_puncak_kw)} kW`} />
      </div>

      {gagal.length > 0 && (
        <Notice tone="danger" className="mt-4" title="Rancangan belum memenuhi kebutuhan">
          <ul className="list-disc pl-4">
            {gagal.map((c) => (
              <li key={c.nama}>{c.keterangan}</li>
            ))}
          </ul>
        </Notice>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Biaya per rumah vs diesel */}
          <Card>
            <SectionTitle
              title="Biaya per rumah dibanding genset diesel"
              hint={`Per ${per}${p.harga_diesel_rendah ? ` · solar ${rupiah(p.harga_diesel_rendah)}–${rupiah(p.harga_diesel_tinggi)}/liter` : ""}`}
            />
            <div className="space-y-5">
              {[
                { l: "Sistem surya + baterai", r: b.sistem_per_rumah, c: "bg-leaf-500", t: "bg-leaf-100" },
                { l: "Genset diesel", r: b.diesel_per_rumah, c: "bg-flame-500", t: "bg-flame-100" },
              ].map((x) => (
                <div key={x.l}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{x.l}</span>
                    <span className="num font-semibold">
                      {rupiah(x.r.rendah)} – {rupiah(x.r.tinggi)}
                    </span>
                  </div>
                  <div className={`relative h-3 rounded-full ${x.t}`}>
                    <div className={`absolute h-3 rounded-full ${x.c}`} style={{ left: `${(x.r.rendah / maxBiaya) * 100}%`, width: `${Math.max(1.5, ((x.r.tinggi - x.r.rendah) / maxBiaya) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Kotak
                label={`${hemat.rendah >= 0 ? "Hemat" : hemat.tinggi <= 0 ? "Lebih mahal" : "Selisih"} per rumah / ${per}`}
                nilai={
                  hemat.tinggi <= 0
                    ? `${rupiahShort(-hemat.tinggi)} – ${rupiahShort(-hemat.rendah)}`
                    : hemat.rendah >= 0
                      ? `${rupiahShort(hemat.rendah)} – ${rupiahShort(hemat.tinggi)}`
                      : `−${rupiahShort(-hemat.rendah)} s.d. +${rupiahShort(hemat.tinggi)}`
                }
                tone={hemat.rendah >= 0 ? "bg-leaf-50" : hemat.tinggi <= 0 ? "bg-flame-50" : "bg-ink-50"}
              />
              <Kotak label="Investasi sistem" nilai={`${rupiahShort(b.investasi.rendah)} – ${rupiahShort(b.investasi.tinggi)}`} />
              <Kotak label="Iuran perawatan / rumah / bulan" nilai={`${rupiahShort(b.iuran_perawatan_per_rumah_bulan.rendah)} – ${rupiahShort(b.iuran_perawatan_per_rumah_bulan.tinggi)}`} />
            </div>
          </Card>

          {/* Dampak */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Stat label={`Solar dihemat / ${per}`} value={num(h.lingkungan.diesel_hemat_liter, 0)} unit="liter" icon={<Fuel className="size-4" />} accent="flame" />
            <Stat label={`CO₂ dihindari / ${per}`} value={num(h.lingkungan.co2_dihindari_kg, 0)} unit="kg" icon={<Leaf className="size-4" />} accent="leaf" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Langkah berikutnya */}
          <Card className="print:hidden">
            <SectionTitle title="Langkah berikutnya" />
            <ul className="-mx-2 space-y-1">
              <Langkah href={`/pencocokan?rencana=${r.id}`} icon={<ArrowLeftRight className="size-4" />} judul="Cocokkan baterai" ket="Pilih baterai yang sesuai rencana ini" />
              <Langkah
                href={`/kompatibilitas?rencana=${r.id}`}
                icon={<PlugZap className="size-4" />}
                judul="Cek kompatibilitas"
                ket={kompat ? "Sudah diperiksa" : "Wajib sebelum pemasangan"}
                status={kompat && <Badge tone={kompat.status === "layak" ? "leaf" : kompat.status === "tidak_layak" ? "flame" : "amber"}>{kompat.label}</Badge>}
              />
              <Langkah
                href={`/ketahanan?rencana=${r.id}`}
                icon={<CloudRain className="size-4" />}
                judul="Simulasi ketahanan"
                ket={hujan ? `Hujan: bertahan ${hujan.lama_bertahan_pelepasan_hari === null ? "tak terbatas" : `${num(hujan.lama_bertahan_pelepasan_hari)} hari`}` : "Uji saat mendung dan hujan"}
              />
            </ul>
          </Card>

          <Card>
            <SectionTitle title="Dasar perhitungan" />
            <KeyValue
              items={[
                ["Paket baterai", p.nama_paket],
                ["Kapasitas × SoH", `${num(p.kapasitas_paket_kwh)} kWh × ${num(p.soh_paket * 100, 0)}%`],
                ["Cadangan mendung", `${p.hari_cadangan} hari`],
                ["Pemakaian malam", `${num(m.porsi_malam * 100, 0)}%`],
                ["Jam matahari efektif", `${num(p.psh_jam)} jam`],
                ["Batas pengosongan", `${num(p.dod * 100, 0)}%`],
                ["Dibuat", `${tanggal(r.createdAt)} · ${r.dibuatOleh.nama}`],
              ]}
            />
          </Card>

          <form action={deletePlan} className="print:hidden">
            <input type="hidden" name="id" value={r.id} />
            <button className={buttonClass("ghost", "sm", "text-flame-600")}>
              <Trash2 className="size-4" /> Hapus rencana
            </button>
          </form>
        </div>
      </div>
      <p className="mt-6 flex items-start gap-2 text-xs text-ink-500">
        {gagal.length ? <CircleX className="size-4 shrink-0 text-flame-500" /> : <CheckCircle2 className="size-4 shrink-0 text-leaf-500" />}
        Hasil ini estimasi berdasarkan isian dan parameter harga; sesuaikan dengan harga setempat sebelum pengadaan.
      </p>
    </>
  );
}

function Kotak({ label, nilai, tone = "bg-ink-50" }: { label: string; nilai: string; tone?: string }) {
  return (
    <div className={cn("rounded-2xl p-4", tone)}>
      <p className="text-xs text-ink-500">{label}</p>
      <p className="num mt-1 font-semibold">{nilai}</p>
    </div>
  );
}

function Langkah({ href, icon, judul, ket, status }: { href: string; icon: React.ReactNode; judul: string; ket: string; status?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-700">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink-900">{judul}</span>
          <span className="block truncate text-xs text-ink-500">{ket}</span>
        </span>
        {status ?? <ChevronRight className="size-4 shrink-0 text-ink-400" />}
      </Link>
    </li>
  );
}
