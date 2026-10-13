import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, Warehouse } from "lucide-react";
import { Badge, ButtonLink, Card, EmptyState, GradeBadge, KeyValue, PageHeader, SectionTitle } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Detail Pemasok" };

export default async function DetailPemasokPage({ params }: PageProps<"/pemasok/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const p = await prisma.pemasok.findUnique({ where: { id }, include: { baterai: { orderBy: { kode: "asc" } }, user: { select: { username: true, createdAt: true } } } });
  if (!p) notFound();
  const jenis = [...new Set(p.baterai.map((b) => b.jenisKimia))];

  return (
    <>
      <PageHeader
        eyebrow="Pemasok"
        title={p.namaPerusahaan}
        description={`Penanggung jawab: ${p.namaPenanggungJawab}`}
        actions={
          <>
            <ButtonLink href={`tel:${p.telepon}`} variant="secondary">
              <Phone className="size-4" /> Telepon
            </ButtonLink>
            <ButtonLink href={`mailto:${p.emailPerusahaan}`} variant="dark">
              <Mail className="size-4" /> Email
            </ButtonLink>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card>
            <SectionTitle title="Profil & kontak" />
            {p.deskripsi && <p className="mb-3 text-sm leading-relaxed text-ink-600">{p.deskripsi}</p>}
            <KeyValue
              items={[
                ["Penanggung jawab", p.namaPenanggungJawab],
                ["Telepon", p.telepon],
                ["Email", p.emailPerusahaan],
                ["Alamat", p.alamat],
                ["Kota/kabupaten", p.kota],
                ["Provinsi", p.provinsi],
                ["Jenis baterai", p.jenisBaterai || jenis.join(", ") || "—"],
                ["Terdaftar", tanggal(p.createdAt)],
              ]}
            />
          </Card>
          <Card tone="muted">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Warehouse className="size-4 text-ink-500" /> Lokasi penyimpanan baterai
            </p>
            <p className="mt-2 text-sm text-ink-600">
              {p.alamatPenyimpanan ? `${p.alamatPenyimpanan}, ${p.kotaPenyimpanan ?? ""}, ${p.provinsiPenyimpanan ?? ""}` : "Sama dengan alamat perusahaan."}
            </p>
          </Card>
        </div>
        <Card className="lg:col-span-2">
          <SectionTitle title="Baterai dari pemasok ini" hint={`${p.baterai.length} baterai terdaftar`} />
          {p.baterai.length ? (
            <ul className="divide-y divide-ink-100">
              {p.baterai.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-3">
                  <GradeBadge grade={b.gradeTerakhir} />
                  <Link href={`/baterai/${b.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="num block text-sm font-semibold">{b.kode}</span>
                    <span className="block truncate text-sm text-ink-500">
                      {b.merek} {b.model} · {b.jenisKimia} · {num(b.kapasitasAwalKwh)} kWh
                    </span>
                  </Link>
                  {b.status === "DINILAI" ? <Badge tone="leaf">SoH {num(b.sohTerakhir)}%</Badge> : <Badge tone="sun">Belum dinilai</Badge>}
                  <ButtonLink href={`/penilaian/baru?baterai=${b.id}`} size="sm" variant={b.status === "DINILAI" ? "secondary" : "dark"}>
                    {b.status === "DINILAI" ? "Nilai ulang" : "Nilai"}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Belum ada baterai" className="py-8" />
          )}
        </Card>
      </div>
    </>
  );
}
