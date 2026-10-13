import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BatteryCharging, CheckCircle2, CircleX, CloudRain, Cpu, Fuel, Leaf, PanelsTopLeft, PlugZap, Trash2, Zap } from "lucide-react";
import { deletePlan } from "@/app/actions/perencana";
import { CalcDetail, DefaultsUsed, ExplanationCard } from "@/components/calc";
import { EnergyFlow } from "@/components/energy-flow";
import { PrintButton } from "@/components/print-button";
import { Badge, ButtonLink, Card, Disclaimer, IlustrasiTag, KeyValue, Notice, PageHeader, SectionTitle, Stat, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import type { Penjelasan } from "@/lib/engine";
import { num, rupiah, rupiahShort, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKompatibilitas, HasilRencana } from "@/lib/types";

export const metadata: Metadata = { title: "Hasil Perencanaan" };

export default async function HasilRencanaPage({ params, searchParams }: PageProps<"/perencana/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const r = await prisma.rencanaDesa.findUnique({
    where: { id },
    include: { dibuatOleh: { select: { nama: true } }, cekKompat: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!r) notFound();
  const h = r.hasil as unknown as HasilRencana;
  const m = r.masukan as { jumlah_rumah: number; konsumsi_per_rumah_kwh: number; porsi_malam: number; jenis_beban: string[]; lokasi?: string };
  const s = h.ringkasan;
  const b = h.biaya;
  const per = b.periode_hari === 30 ? "bulan" : `${b.periode_hari} hari`;
  const maxBiaya = Math.max(b.diesel_per_rumah.tinggi, b.sistem_per_rumah.tinggi);
  const kompat = r.cekKompat[0]?.hasil as HasilKompatibilitas | undefined;
  const hemat = { rendah: b.diesel_per_rumah.rendah - b.sistem_per_rumah.tinggi, tinggi: b.diesel_per_rumah.tinggi - b.sistem_per_rumah.rendah };

  return (
    <>
      <PageHeader
        eyebrow={<>Modul B · Hasil perencanaan {r.ilustrasi && <IlustrasiTag />}</>}
        title={r.namaDesa}
        description={`${r.nama} · ${m.jumlah_rumah} rumah × ${num(m.konsumsi_per_rumah_kwh)} kWh/hari · ${num(m.porsi_malam * 100, 0)}% malam${m.lokasi ? ` · ${m.lokasi}` : ""}`}
        actions={
          <>
            <PrintButton label="Laporan ringkas" />
            <ButtonLink href={`/kompatibilitas?rencana=${r.id}`} variant="secondary" className="print:hidden">
              <PlugZap className="size-4" /> Kompatibilitas
            </ButtonLink>
            <ButtonLink href={`/ketahanan?rencana=${r.id}`} className="print:hidden">
              <CloudRain className="size-4" /> Simulasi ketahanan
            </ButtonLink>
          </>
        }
      />
      {sp.baru && <Notice tone="success" className="mb-4 print:hidden">Rencana tersimpan. Lanjutkan ke simulasi ketahanan untuk menguji cuaca buruk.</Notice>}

      {/* P-7 ringkasan */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Kebutuhan harian" value={num(s.kebutuhan_harian_kwh)} unit="kWh" icon={<Zap className="size-4" />} accent="ink" hint={`Malam ${num(s.kebutuhan_malam_kwh)} kWh (termasuk rugi konversi)`} />
        <Stat
          label="Paket baterai"
          value={s.jumlah_paket}
          unit="paket"
          icon={<BatteryCharging className="size-4" />}
          accent="leaf"
          hint={`${s.paket_siklus_harian} siklus harian + cadangan ${h.parameter.hari_cadangan} hari · ${num(s.kapasitas_terpakai_per_paket_kwh)} kWh terpakai/paket`}
        />
        <Stat label="Panel surya" value={num(s.kapasitas_panel_kwp)} unit="kWp" icon={<PanelsTopLeft className="size-4" />} accent="sun" hint={`${s.jumlah_panel} panel × ${h.parameter.kapasitas_per_panel_wp} Wp (${num(s.kapasitas_panel_terpasang_kwp)} kWp terpasang)`} />
        <Stat label="Inverter" value={s.inverter_kw} unit="kW" icon={<Cpu className="size-4" />} accent="sky" hint={`Daya puncak ${num(s.daya_puncak_kw)} kW`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <EnergyFlow
            suryaKwh={s.kapasitas_panel_terpasang_kwp * h.parameter.psh_jam * h.parameter.pr}
            suryaKeDesaKwh={s.kebutuhan_harian_kwh - s.kebutuhan_malam_kwh * h.parameter.efisiensi}
            suryaKeBateraiKwh={s.kebutuhan_malam_kwh}
            bebanKwh={s.kebutuhan_harian_kwh}
            bateraiKwh={s.kebutuhan_malam_kwh * h.parameter.efisiensi}
            gensetKwh={0}
            socPersen={100}
            rumah={m.jumlah_rumah}
            caption="Aliran energi rata-rata pada hari cerah"
          />

          {/* P-10 biaya per rumah vs diesel */}
          <Card>
            <SectionTitle title="Biaya per rumah dibanding genset diesel" hint={`Per ${per}, rentang harga rendah–tinggi dari konfigurasi`} />
            <div className="space-y-5">
              {[
                { l: "Sistem SOLUNA (surya + baterai)", r: b.sistem_per_rumah, c: "bg-leaf-500", t: "bg-leaf-100" },
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
              <div className={`rounded-2xl p-4 ${hemat.rendah >= 0 ? "bg-leaf-50" : hemat.tinggi <= 0 ? "bg-flame-50" : "bg-ink-50"}`}>
                <p className="text-xs text-ink-500">
                  {hemat.rendah >= 0 ? "Hemat per rumah" : hemat.tinggi <= 0 ? "Sistem lebih mahal per rumah" : "Selisih per rumah (bergantung harga)"} / {per}
                </p>
                <p className="num mt-1 font-semibold">
                  {hemat.tinggi <= 0
                    ? `${rupiahShort(-hemat.tinggi)} – ${rupiahShort(-hemat.rendah)}`
                    : hemat.rendah >= 0
                      ? `${rupiahShort(hemat.rendah)} – ${rupiahShort(hemat.tinggi)}`
                      : `−${rupiahShort(-hemat.rendah)} s.d. +${rupiahShort(hemat.tinggi)}`}
                </p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-4">
                <p className="text-xs text-ink-500">Investasi sistem</p>
                <p className="num mt-1 font-semibold">
                  {rupiahShort(b.investasi.rendah)} – {rupiahShort(b.investasi.tinggi)}
                </p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-4">
                <p className="text-xs text-ink-500">Iuran perawatan / rumah / bulan</p>
                <p className="num mt-1 font-semibold">
                  {rupiahShort(b.iuran_perawatan_per_rumah_bulan.rendah)} – {rupiahShort(b.iuran_perawatan_per_rumah_bulan.tinggi)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-500">Harga baterai bekas, panel, inverter, dan diesel adalah parameter konfigurasi (ilustrasi) dan perlu disesuaikan dengan harga setempat.</p>
          </Card>

          <ExplanationCard penjelasan={r.penjelasan as Penjelasan | null} />
          <DefaultsUsed items={h.nilai_bawaan} />
          <CalcDetail steps={h.langkah} />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat label={`Diesel dihemat / ${per}`} value={num(h.lingkungan.diesel_hemat_liter, 0)} unit="liter" icon={<Fuel className="size-4" />} accent="flame" />
            <Stat label={`CO₂ dihindari / ${per}`} value={num(h.lingkungan.co2_dihindari_kg, 0)} unit="kg" icon={<Leaf className="size-4" />} accent="leaf" />
          </div>

          {/* P-6 pemeriksaan */}
          <Card>
            <SectionTitle title="Pemeriksaan rancangan" hint="Energi, daya puncak, batas pengosongan" />
            <ul className="space-y-3">
              {h.pemeriksaan.map((c) => (
                <li key={c.nama} className="flex gap-3 text-sm">
                  {c.lulus ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-leaf-500" /> : <CircleX className="mt-0.5 size-5 shrink-0 text-flame-500" />}
                  <span>
                    <span className="font-semibold">{c.nama}</span>
                    <span className="block text-ink-600">{c.keterangan}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-50 p-3 text-sm">
              <span className="text-ink-600">Kompatibilitas</span>
              {kompat ? (
                <Badge tone={kompat.status === "layak" ? "leaf" : kompat.status === "tidak_layak" ? "flame" : "amber"}>{kompat.label}</Badge>
              ) : (
                <a href={`/kompatibilitas?rencana=${r.id}`} className="font-semibold text-sun-700 hover:underline">
                  Cek sekarang
                </a>
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Parameter yang dipakai" />
            <KeyValue
              items={[
                ["Paket", h.parameter.nama_paket],
                ["Kapasitas paket", `${num(h.parameter.kapasitas_paket_kwh)} kWh`],
                ["SoH paket", `${num(h.parameter.soh_paket * 100)}%`],
                ["PSH", `${num(h.parameter.psh_jam)} jam`],
                ["PR", `${num(h.parameter.pr * 100)}%`],
                ["Efisiensi η", `${num(h.parameter.efisiensi * 100)}%`],
                ["DoD", `${num(h.parameter.dod * 100)}%`],
                ["Jenis beban", m.jenis_beban.join(", ") || "—"],
                ["Versi konfigurasi / model", `v${r.versiKonfigurasi} · ${r.versiModel}`],
                ["Dibuat", `${tanggal(r.createdAt, true)} · ${r.dibuatOleh.nama}`],
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
      <Disclaimer className="mt-6" />
    </>
  );
}
