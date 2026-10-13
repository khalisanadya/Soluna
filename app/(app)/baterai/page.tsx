import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BatteryCharging, ChevronRight, Plus, Search } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, IlustrasiTag, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { bateraiScope } from "@/lib/data";
import { num } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JENIS_KIMIA } from "@/lib/wilayah";

export const metadata: Metadata = { title: "Baterai" };

export default async function BateraiPage({ searchParams }: PageProps<"/baterai">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = sp.status === "DINILAI" || sp.status === "BELUM_DINILAI" ? sp.status : "";
  const grade = typeof sp.grade === "string" && ["A", "B", "C", "D"].includes(sp.grade) ? sp.grade : "";
  const kimia = typeof sp.kimia === "string" ? sp.kimia : "";
  const pemasokId = user.peran === "ADMIN" && typeof sp.pemasok === "string" ? sp.pemasok : "";

  const where: Prisma.BateraiWhereInput = {
    ...bateraiScope(user),
    ...(status ? { status } : {}),
    ...(grade ? { gradeTerakhir: grade } : {}),
    ...(kimia ? { jenisKimia: kimia } : {}),
    ...(pemasokId ? { pemasokId } : {}),
    ...(q
      ? {
          OR: [
            { kode: { contains: q, mode: "insensitive" } },
            { merek: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { pemasok: { namaPerusahaan: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, pemasok] = await Promise.all([
    prisma.baterai.findMany({ where, orderBy: { kode: "asc" }, include: { pemasok: { select: { id: true, namaPerusahaan: true } } } }),
    user.peran === "ADMIN" ? prisma.pemasok.findMany({ orderBy: { namaPerusahaan: "asc" }, select: { id: true, namaPerusahaan: true } }) : [],
  ]);
  const filtered = Boolean(q || status || grade || kimia || pemasokId);
  const isAdmin = user.peran === "ADMIN";

  return (
    <>
      <PageHeader
        eyebrow="Aset"
        title={isAdmin ? "Daftar baterai" : "Baterai saya"}
        description={isAdmin ? "Semua baterai bekas yang ditawarkan pemasok. Pilih baterai untuk dinilai." : "Baterai yang Anda daftarkan beserta status penilaiannya."}
        actions={
          <ButtonLink href="/baterai/baru">
            <Plus className="size-4" /> Tambah baterai
          </ButtonLink>
        }
      />

      <form className="mb-4 grid gap-2 rounded-[var(--radius-card)] bg-surface p-3 shadow-soft ring-1 ring-ink-200/60 sm:grid-cols-2 lg:flex lg:items-center" role="search">
        <label className="relative lg:flex-1">
          <span className="sr-only">Cari baterai</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" />
          <input name="q" defaultValue={q} placeholder="Cari kode, merek, model, pemasok…" className={`${inputClass} pl-10`} />
        </label>
        <select name="status" defaultValue={status} className={`${inputClass} lg:w-40`} aria-label="Status">
          <option value="">Semua status</option>
          <option value="DINILAI">Sudah dinilai</option>
          <option value="BELUM_DINILAI">Belum dinilai</option>
        </select>
        <select name="grade" defaultValue={grade} className={`${inputClass} lg:w-32`} aria-label="Grade">
          <option value="">Semua grade</option>
          {["A", "B", "C", "D"].map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        <select name="kimia" defaultValue={kimia} className={`${inputClass} lg:w-32`} aria-label="Jenis kimia">
          <option value="">Semua kimia</option>
          {JENIS_KIMIA.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        {isAdmin && (
          <select name="pemasok" defaultValue={pemasokId} className={`${inputClass} lg:w-52`} aria-label="Pemasok">
            <option value="">Semua pemasok</option>
            {pemasok.map((p) => (
              <option key={p.id} value={p.id}>
                {p.namaPerusahaan}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button className={buttonClass("dark", "md", "flex-1 lg:flex-none")}>Terapkan</button>
          {filtered && (
            <Link href="/baterai" className={buttonClass("ghost", "md")}>
              Reset
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BatteryCharging className="size-5" />}
          title={filtered ? "Tidak ada baterai yang cocok" : "Belum ada baterai"}
          description={filtered ? "Ubah kata kunci atau filter." : "Tambahkan baterai pensiun pertama."}
          action={!filtered && <ButtonLink href="/baterai/baru">Tambah baterai</ButtonLink>}
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-ink-500">{rows.length} baterai</p>
          {/* Desktop: tabel */}
          <Card className="hidden overflow-hidden p-0 sm:p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Kode</th>
                  <th className="px-3 py-3 font-medium">Baterai</th>
                  {isAdmin && <th className="px-3 py-3 font-medium">Pemasok</th>}
                  <th className="px-3 py-3 text-right font-medium">Kapasitas</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-right font-medium">SoH</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((b) => (
                  <tr key={b.id} className="group hover:bg-ink-50/70">
                    <td className="px-5 py-3">
                      <Link href={`/baterai/${b.id}`} className="num font-semibold hover:underline">
                        {b.kode}
                      </Link>
                      {b.ilustrasi && <IlustrasiTag className="ml-2" />}
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium">
                        {b.merek} {b.model}
                      </span>
                      <span className="text-xs text-ink-500">
                        {b.jenisKimia} · {b.usiaTahun !== null ? `${num(b.usiaTahun)} tahun` : "usia tidak diketahui"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="max-w-48 truncate px-3 py-3 text-ink-600">
                        <Link href={`/pemasok/${b.pemasok.id}`} className="hover:underline">
                          {b.pemasok.namaPerusahaan}
                        </Link>
                      </td>
                    )}
                    <td className="num px-3 py-3 text-right">{num(b.kapasitasAwalKwh)} kWh</td>
                    <td className="px-3 py-3">
                      <GradeBadge grade={b.gradeTerakhir} size="sm" />
                    </td>
                    <td className="num px-3 py-3 text-right">{b.sohTerakhir !== null ? `${num(b.sohTerakhir)}%` : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin ? (
                        <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} size="sm" variant={b.status === "DINILAI" ? "secondary" : "dark"}>
                          {b.status === "DINILAI" ? "Nilai ulang" : "Nilai"}
                        </ButtonLink>
                      ) : (
                        <Link href={`/baterai/${b.id}`} className="text-ink-400 group-hover:text-ink-900">
                          <ChevronRight className="ml-auto size-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Ponsel: kartu */}
          <ul className="space-y-2 md:hidden">
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/baterai/${b.id}`} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-soft ring-1 ring-ink-200/60">
                  <GradeBadge grade={b.gradeTerakhir} />
                  <span className="min-w-0 flex-1">
                    <span className="num block text-sm font-semibold">{b.kode}</span>
                    <span className="block truncate text-sm text-ink-600">
                      {b.merek} {b.model} · {num(b.kapasitasAwalKwh)} kWh
                    </span>
                    {isAdmin && <span className="block truncate text-xs text-ink-500">{b.pemasok.namaPerusahaan}</span>}
                  </span>
                  {b.status === "DINILAI" ? <Badge tone="leaf">{num(b.sohTerakhir)}%</Badge> : <Badge tone="sun">Menunggu</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
