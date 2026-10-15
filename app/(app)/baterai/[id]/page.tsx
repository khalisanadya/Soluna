import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Pencil, ScrollText } from "lucide-react";
import { TrendLine } from "@/components/charts";
import { ButtonLink, Card, EmptyState, GradeBadge, KeyValue, Notice, PageHeader, Progress, SectionTitle, gradeTone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { getBateraiForUser } from "@/lib/data";
import { num, tanggal, tanpaPenandaIlustrasi } from "@/lib/format";
import type { Grade, HasilPenilaian } from "@/lib/types";

export const metadata: Metadata = { title: "Detail Baterai" };

export default async function DetailBateraiPage({ params, searchParams }: PageProps<"/baterai/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const b = await getBateraiForUser(user, id);
  const { data: cfg } = await getActiveConfig();
  const isAdmin = user.peran === "ADMIN";
  const latest = b.penilaian[0];
  const hasil = latest?.hasil as HasilPenilaian | undefined;
  const ambang = cfg.siklus_hidup.ambang_penggantian_soh;

  return (
    <>
      <PageHeader
        eyebrow="Baterai"
        title={
          <span className="flex items-center gap-3">
            <span className="num">{b.kode}</span>
            <GradeBadge grade={b.gradeTerakhir} />
          </span>
        }
        description={`${b.merek} ${b.model} · ${b.jenisKimia} · ${num(b.kapasitasAwalKwh)} kWh`}
        actions={
          <>
            {!isAdmin && <ButtonLink href={`/baterai/${b.id}/ubah`} variant="secondary"><Pencil className="size-4" /> Ubah</ButtonLink>}
            {latest && (
              <ButtonLink href={`/penilaian/${latest.id}`} variant="secondary">
                <ScrollText className="size-4" /> Paspor
              </ButtonLink>
            )}
            {!isAdmin && (
              <ButtonLink href={`/penilaian/baru?baterai=${b.id}`}>
                <ClipboardCheck className="size-4" /> {latest ? "Nilai ulang baterai" : "Nilai baterai"}
              </ButtonLink>
            )}
          </>
        }
      />
      {sp.tersimpan && <Notice tone="success" className="mb-4">Data baterai tersimpan.</Notice>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* PSK-7: status penilaian */}
          {latest && hasil ? (
            <Card className="grid gap-6 sm:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-4 sm:flex-col sm:items-start">
                <GradeBadge grade={latest.grade} size="lg" />
                <div>
                  <p className="text-sm font-semibold">{gradeTone[latest.grade as Grade].label}</p>
                  <p className="text-xs text-ink-500">{latest.keputusan}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-ink-500">SoH</p>
                  <p className="num mt-1 text-2xl">{num(latest.soh)}%</p>
                  <Progress value={latest.soh} className="mt-2" color={gradeTone[latest.grade as Grade].bg} />
                </div>
                <div>
                  <p className="text-xs text-ink-500">Keyakinan</p>
                  <p className="num mt-1 text-2xl">{num(latest.keyakinan, 0)}%</p>
                  <p className="text-xs text-ink-500">dinilai {tanggal(latest.createdAt)}</p>
                </div>
              </div>
              {hasil.jalur_daur_ulang && (
                <Notice tone="danger" className="sm:col-span-2" title="Diarahkan ke jalur daur ulang">
                  SoH di bawah ambang penggantian {ambang}%. Baterai tidak dipasang ulang.
                </Notice>
              )}
            </Card>
          ) : (
            <Card tone="muted" className="flex items-center gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-sun-100 text-sun-700">
                <ClipboardCheck className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Belum dinilai</p>
                <p className="text-sm text-ink-600">
                  {isAdmin ? "Menunggu penilaian pemasok. Admin Desa hanya dapat melihat data ini." : "Assessment pemasok akan menerbitkan paspor baterai. Status akan berubah setelah penilaian."}
                </p>
              </div>
            </Card>
          )}

          <Card>
            <SectionTitle title="Riwayat SoH" hint={`Garis merah: ambang penggantian ${ambang}%`} />
            {b.bacaanSoh.length ? (
              <TrendLine points={b.bacaanSoh.map((r) => ({ x: r.tanggal.toISOString(), y: r.soh }))} threshold={ambang} warn={ambang + cfg.siklus_hidup.margin_peringatan_soh} />
            ) : (
              <EmptyState title="Belum ada pembacaan SoH" className="py-8" />
            )}
          </Card>

          <Card>
            <SectionTitle title="Riwayat penilaian" />
            {b.penilaian.length ? (
              <ul className="divide-y divide-ink-100">
                {b.penilaian.map((p) => (
                  <li key={p.id}>
                    <Link href={`/penilaian/${p.id}`} className="flex items-center gap-3 py-3 hover:bg-ink-50 sm:px-2">
                      <GradeBadge grade={p.grade} size="sm" />
                      <span className="flex-1 text-sm">
                        SoH <span className="num font-semibold">{num(p.soh)}%</span> · keyakinan {num(p.keyakinan, 0)}%
                      </span>
                      <span className="text-xs text-ink-500">
                        {tanggal(p.createdAt, true)} · {p.penilai.nama}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Belum ada penilaian.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionTitle title="Spesifikasi" />
            <KeyValue
              items={[
                ["Jenis kimia", b.jenisKimia],
                ["Kapasitas awal", `${num(b.kapasitasAwalKwh)} kWh`],
                ["Tegangan nominal", b.teganganNominalV ? `${num(b.teganganNominalV)} V` : "—"],
                ["Usia pemakaian", b.usiaTahun !== null ? `${num(b.usiaTahun)} tahun` : "—"],
                ["Kondisi", b.kondisi],
                ["Didaftarkan", tanggal(b.createdAt)],
              ]}
            />
            {b.catatan && !b.catatan.toLowerCase().includes("data ilustrasi") && <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">{b.catatan}</p>}
          </Card>

          {isAdmin && (
            <Card>
              <SectionTitle title="Pemasok" action={<Link href={`/pemasok/${b.pemasok.id}`} className="text-sm font-semibold text-sun-700 hover:underline">Profil</Link>} />
              <p className="font-semibold">{tanpaPenandaIlustrasi(b.pemasok.namaPerusahaan)}</p>
              <p className="text-sm text-ink-600">{b.pemasok.namaPenanggungJawab}</p>
              <p className="mt-2 text-sm text-ink-500">
                {b.pemasok.telepon} · {b.pemasok.emailPerusahaan}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Penyimpanan: {b.pemasok.kotaPenyimpanan ? `${b.pemasok.kotaPenyimpanan}, ${b.pemasok.provinsiPenyimpanan}` : `${b.pemasok.kota}, ${b.pemasok.provinsi}`}
              </p>
            </Card>
          )}

        </div>
      </div>
    </>
  );
}
