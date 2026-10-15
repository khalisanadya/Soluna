import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, CloudRain, PlugZap, SunMedium } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { Paginasi, bacaHalaman } from "@/components/paginasi";
import { requireAdmin } from "@/lib/auth";
import { days, num, rentangUmur, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKetahanan, HasilKompatibilitas, HasilRencana } from "@/lib/types";

export const metadata: Metadata = { title: "Riwayat" };

type Item = { id: string; jenis: string; waktu: Date; judul: string; detail: string; href?: string; versi?: string; icon: React.ComponentType<{ className?: string }>; tone: string };

const FILTER = [
  { k: "", t: "Semua" },
  { k: "penilaian", t: "Penilaian" },
  { k: "rencana", t: "Perencanaan" },
  { k: "simulasi", t: "Ketahanan" },
  { k: "kompatibilitas", t: "Kompatibilitas" },
  { k: "bacaan", t: "Pembacaan SoH" },
];

export default async function RiwayatPage({ searchParams }: PageProps<"/riwayat">) {
  await requireAdmin();
  const sp = await searchParams;
  const f = typeof sp.jenis === "string" ? sp.jenis : "";
  const ambil = (k: string) => !f || f === k;
  const whereBacaan = { sumber: "MANUAL" as const };
  // Hitung total dulu, lalu ambil cukup baris dari tiap sumber untuk halaman yang diminta.
  const jumlah = await Promise.all([
    ambil("penilaian") ? prisma.penilaian.count() : 0,
    ambil("rencana") ? prisma.rencanaDesa.count() : 0,
    ambil("simulasi") ? prisma.simulasiKetahanan.count() : 0,
    ambil("kompatibilitas") ? prisma.cekKompatibilitas.count() : 0,
    ambil("bacaan") ? prisma.bacaanSoh.count({ where: whereBacaan }) : 0,
  ]);
  const total = jumlah.reduce((a, b) => a + b, 0);
  const { halaman, skip, take: perHalaman } = bacaHalaman(sp, total);
  const take = skip + perHalaman;
  const [penilaian, rencana, simulasi, kompat, bacaan] = await Promise.all([
    ambil("penilaian") ? prisma.penilaian.findMany({ orderBy: { createdAt: "desc" }, take, include: { baterai: { select: { kode: true } } } }) : [],
    ambil("rencana") ? prisma.rencanaDesa.findMany({ orderBy: { createdAt: "desc" }, take }) : [],
    ambil("simulasi") ? prisma.simulasiKetahanan.findMany({ orderBy: { createdAt: "desc" }, take, include: { rencana: { select: { id: true } } } }) : [],
    ambil("kompatibilitas") ? prisma.cekKompatibilitas.findMany({ orderBy: { createdAt: "desc" }, take, include: { baterai: { select: { kode: true, id: true } } } }) : [],
    ambil("bacaan") ? prisma.bacaanSoh.findMany({ where: whereBacaan, orderBy: { createdAt: "desc" }, take, include: { baterai: { select: { kode: true, id: true } } } }) : [],
  ]);

  const items: Item[] = [
    ...penilaian.map((p) => ({
      id: p.id,
      jenis: "Penilaian",
      waktu: p.createdAt,
      judul: `${p.baterai.kode} → grade ${p.grade}`,
      detail: `SoH ${num(p.soh)}% · sisa umur ${rentangUmur(p.sisaUmurBawah, p.sisaUmurAtas)} · keyakinan ${num(p.keyakinan, 0)}%`,
      href: `/penilaian/${p.id}`,
      versi: `v${p.versiKonfigurasi}`,
      icon: ClipboardCheck,
      tone: "bg-leaf-50 text-leaf-600",
    })),
    ...rencana.map((r) => {
      const h = r.hasil as unknown as HasilRencana;
      return {
        id: r.id,
        jenis: "Perencanaan",
        waktu: r.createdAt,
        judul: `${r.namaDesa} — ${r.nama}`,
        detail: `${h.ringkasan.jumlah_paket} paket · ${num(h.ringkasan.kapasitas_panel_kwp)} kWp · diesel hemat ${num(h.lingkungan.diesel_hemat_liter, 0)} L/${h.lingkungan.periode_hari} hari`,
        href: `/perencana/${r.id}`,
        versi: `v${r.versiKonfigurasi}`,
        icon: SunMedium,
        tone: "bg-sun-100 text-sun-700",
      };
    }),
    ...simulasi.map((s) => {
      const h = s.hasil as unknown as HasilKetahanan;
      const sel = h.skenario.find((x) => x.kunci === h.terpilih);
      return {
        id: s.id,
        jenis: "Ketahanan",
        waktu: s.createdAt,
        judul: s.nama,
        detail: `${sel?.label ?? ""} · ${h.prioritas_label} · bertahan ${days(sel?.lama_bertahan_pelepasan_hari)} (dengan pelepasan)`,
        href: s.rencana ? `/ketahanan?rencana=${s.rencana.id}` : "/ketahanan",
        versi: `v${s.versiKonfigurasi}`,
        icon: CloudRain,
        tone: "bg-sky-50 text-sky-600",
      };
    }),
    ...kompat.map((k) => {
      const h = k.hasil as unknown as HasilKompatibilitas;
      return {
        id: k.id,
        jenis: "Kompatibilitas",
        waktu: k.createdAt,
        judul: `${k.baterai?.kode ?? "Pemeriksaan manual"} → ${h.label}`,
        detail: h.pemeriksaan[0]?.alasan ?? "",
        href: k.baterai ? `/baterai/${k.baterai.id}` : undefined,
        versi: `v${k.versiKonfigurasi}`,
        icon: PlugZap,
        tone: "bg-ink-100 text-ink-700",
      };
    }),
    ...bacaan.map((b) => ({
      id: b.id,
      jenis: "Pembacaan SoH",
      waktu: b.createdAt,
      judul: `${b.baterai.kode}: SoH ${num(b.soh)}%`,
      detail: `Diukur ${tanggal(b.tanggal)}${b.catatan ? ` · ${b.catatan}` : ""}`,
      href: `/siklus-hidup?tab=riwayat&baterai=${b.baterai.id}`,
      icon: CalendarClock,
      tone: "bg-flame-50 text-flame-600",
    })),
  ]
    .sort((a, b) => +b.waktu - +a.waktu)
    .slice(skip, skip + perHalaman);

  return (
    <>
      <PageHeader eyebrow="Pemantauan" title="Riwayat" description="Semua hasil tersimpan beserta versi konfigurasi yang dipakai, agar setiap angka dapat ditelusuri ulang." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER.map((x) => (
          <Link key={x.k || "semua"} href={x.k ? `/riwayat?jenis=${x.k}` : "/riwayat"} className={buttonClass(f === x.k ? "dark" : "secondary", "sm")}>
            {x.t}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Belum ada riwayat" />
      ) : (
        <>
        <Card className="p-3 sm:p-4">
          <ul className="divide-y divide-ink-100">
            {items.map((it) => {
              const body = (
                <>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${it.tone}`}>
                    <it.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{it.judul}</span>
                      <Badge>{it.jenis}</Badge>
                      {it.versi && <span className="text-xs text-ink-400">konfigurasi {it.versi}</span>}
                    </span>
                    <span className="block truncate text-sm text-ink-500">{it.detail}</span>
                  </span>
                  <span className="hidden text-right text-xs whitespace-nowrap text-ink-500 sm:block">{tanggal(it.waktu, true)}</span>
                </>
              );
              return (
                <li key={`${it.jenis}-${it.id}`}>
                  {it.href ? (
                    <Link href={it.href} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 p-2">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
        <Paginasi basePath="/riwayat" sp={sp} halaman={halaman} total={total} tampil={items.length} satuan="riwayat" />
        </>
      )}
    </>
  );
}
