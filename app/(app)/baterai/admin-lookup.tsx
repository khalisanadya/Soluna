import Link from "next/link";
import { Search, ShieldCheck } from "lucide-react";
import { daftarkanAsetBaterai, ubahStatusAsetBaterai } from "@/app/actions/aset-baterai";
import { Badge, Button, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const STATUS = {
  AKAN_DIBELI: "Akan dibeli",
  TERDAFTAR: "Terdaftar",
  DIGUNAKAN: "Digunakan di desa",
  TIDAK_TERSEDIA: "Tidak tersedia",
} as const;

export async function AdminBatteryLookup({ query, message }: { query: string; message?: string }) {
  const rows = query
    ? await prisma.baterai.findMany({
        where: { kode: { equals: query, mode: "insensitive" } },
        include: {
          pemasok: { select: { id: true, namaPerusahaan: true, namaPenanggungJawab: true } },
          penilaian: { orderBy: { createdAt: "desc" }, take: 1 },
          asetDesa: true,
        },
      })
    : [];
  const b = rows[0];
  const latest = b?.penilaian[0];
  const status = b?.asetDesa ? STATUS[b.asetDesa.status] : null;

  return (
    <>
      <PageHeader
        eyebrow="Aset desa"
        title="Tambah / Cari Baterai"
        description="Masukkan nomor seri untuk mengambil data baterai dan assessment dari database pemasok."
      />
      <Card className="mb-4">
        <form className="flex flex-col gap-3 sm:flex-row" role="search">
          <label className="sr-only" htmlFor="serial">Nomor Seri Baterai</label>
          <input id="serial" name="q" defaultValue={query} placeholder="Nomor Seri Baterai, mis. BAT-0001" className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm outline-none focus:border-sun-500 focus:ring-2 focus:ring-sun-200" />
          <Button type="submit"><Search className="size-4" /> Cari</Button>
        </form>
        <p className="mt-2 text-xs text-ink-500">Admin Desa tidak membuat data baru dari nomor seri dan tidak mengubah hasil assessment.</p>
      </Card>

      {message === "terdaftar" && <div className="mb-4 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-leaf-800">Baterai berhasil ditambahkan ke aset desa.</div>}
      {message === "tidak-ditemukan" && <div className="mb-4 rounded-xl bg-flame-50 px-4 py-3 text-sm text-flame-800">Baterai tidak ditemukan.</div>}

      {!query ? (
        <Card className="border-dashed"><EmptyState title="Cari nomor seri baterai" description="Data hanya akan muncul jika baterai sudah didaftarkan oleh pemasok." /></Card>
      ) : !b ? (
        <Card className="border-dashed"><EmptyState title="Baterai tidak ditemukan." description="Pastikan nomor seri sesuai data yang diberikan pemasok." /></Card>
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b border-ink-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-500">Nomor seri</p>
              <h2 className="num text-xl font-semibold">{b.kode}</h2>
              <p className="text-sm text-ink-600">{b.merek} {b.model} · {b.jenisKimia}</p>
            </div>
            <div className="flex items-center gap-2">
              {latest ? <Badge tone="leaf">Sudah dinilai</Badge> : <Badge tone="sun">Menunggu penilaian pemasok</Badge>}
              {status && <Badge tone="sky">{status}</Badge>}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Kapasitas" value={`${num(b.kapasitasAwalKwh)} kWh`} />
            <Info label="SoH" value={latest ? `${num(latest.soh)}%` : "Belum tersedia"} />
            <Info label="Grade" value={latest ? latest.grade : "Belum tersedia"} />
          </div>
          {latest && (
            <div className="mt-4 rounded-xl bg-ink-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-leaf-600" /> Paspor baterai dari pemasok (read-only)</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Info label="Confidence score" value={`${num(latest.keyakinan, 0)}%`} />
                <Info label="Status assessment" value="Selesai" />
                <Info label="Pemasok" value={b.pemasok.namaPerusahaan} />
              </div>
              <ButtonLink href={`/penilaian/${latest.id}`} variant="secondary" size="sm" className="mt-3">Lihat paspor lengkap</ButtonLink>
            </div>
          )}
          {!latest && <div className="mt-4 rounded-xl bg-sun-50 p-4 text-sm text-sun-900">Menunggu penilaian pemasok. Admin tetap dapat mendaftarkan baterai ini sebagai baterai yang akan dibeli atau digunakan.</div>}
          <div className="mt-4 flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-600">Pemasok: <Link href={`/pemasok/${b.pemasok.id}`} className="font-semibold hover:underline">{b.pemasok.namaPerusahaan}</Link></p>
            {b.asetDesa ? (
              <form action={ubahStatusAsetBaterai} className="flex items-center gap-2">
                <input type="hidden" name="bateraiId" value={b.id} />
                <select name="status" defaultValue={b.asetDesa.status} className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm">
                  {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <Button type="submit" variant="secondary" size="sm">Simpan status</Button>
              </form>
            ) : (
              <form action={daftarkanAsetBaterai}>
                <input type="hidden" name="bateraiId" value={b.id} />
                <input type="hidden" name="kode" value={b.kode} />
                <div className="flex items-center gap-2">
                  <select name="status" defaultValue="AKAN_DIBELI" className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm">
                    {Object.entries(STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <Button type="submit">Tambahkan ke aset desa</Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-ink-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}
