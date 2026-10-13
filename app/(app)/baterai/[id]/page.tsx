import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, FileText, ImageIcon, Pencil, ScrollText, Trash2 } from "lucide-react";
import { deleteBerkas } from "@/app/actions/baterai";
import { TrendLine } from "@/components/charts";
import { ButtonLink, Card, EmptyState, GradeBadge, IlustrasiTag, KeyValue, Notice, PageHeader, Progress, SectionTitle, gradeTone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { getBateraiForUser } from "@/lib/data";
import { num, tanggal } from "@/lib/format";
import type { Grade, HasilPenilaian } from "@/lib/types";
import { UploadForm } from "./upload-form";

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
        eyebrow={<>Baterai {b.ilustrasi && <IlustrasiTag />}</>}
        title={
          <span className="flex items-center gap-3">
            <span className="num">{b.kode}</span>
            <GradeBadge grade={b.gradeTerakhir} />
          </span>
        }
        description={`${b.merek} ${b.model} · ${b.jenisKimia} · ${num(b.kapasitasAwalKwh)} kWh`}
        actions={
          <>
            <ButtonLink href={`/baterai/${b.id}/ubah`} variant="secondary">
              <Pencil className="size-4" /> Ubah
            </ButtonLink>
            {latest && (
              <ButtonLink href={`/penilaian/${latest.id}`} variant="secondary">
                <ScrollText className="size-4" /> Paspor
              </ButtonLink>
            )}
            {isAdmin && (
              <ButtonLink href={`/penilaian/baru?baterai=${b.id}`}>
                <ClipboardCheck className="size-4" /> {latest ? "Nilai ulang" : "Nilai baterai"}
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
                  <p className="text-xs text-ink-500">Sisa umur</p>
                  <p className="num mt-1 text-2xl">
                    {num(latest.sisaUmurBawah)}–{num(latest.sisaUmurAtas)}
                    <span className="ml-1 text-sm text-ink-500">thn</span>
                  </p>
                  <p className="text-xs text-ink-500">tengah {num(latest.sisaUmurTengah)} tahun</p>
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
                  {isAdmin ? "Nilai baterai ini untuk menerbitkan paspor baterai." : "Pengelola desa akan menilai baterai ini. Status akan berubah setelah penilaian."}
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
                ["Jumlah siklus", b.jumlahSiklus !== null ? num(b.jumlahSiklus, 0) : "—"],
                ["Kondisi", b.kondisi],
                ["Didaftarkan", tanggal(b.createdAt)],
              ]}
            />
            {b.catatan && <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm text-ink-600">{b.catatan}</p>}
          </Card>

          {isAdmin && (
            <Card>
              <SectionTitle title="Pemasok" action={<Link href={`/pemasok/${b.pemasok.id}`} className="text-sm font-semibold text-sun-700 hover:underline">Profil</Link>} />
              <p className="font-semibold">{b.pemasok.namaPerusahaan}</p>
              <p className="text-sm text-ink-600">{b.pemasok.namaPenanggungJawab}</p>
              <p className="mt-2 text-sm text-ink-500">
                {b.pemasok.telepon} · {b.pemasok.emailPerusahaan}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                Penyimpanan: {b.pemasok.kotaPenyimpanan ? `${b.pemasok.kotaPenyimpanan}, ${b.pemasok.provinsiPenyimpanan}` : `${b.pemasok.kota}, ${b.pemasok.provinsi}`}
              </p>
            </Card>
          )}

          <Card>
            <SectionTitle title="Foto & dokumen" hint={`${b.berkas.length} berkas`} />
            {b.berkas.length > 0 && (
              <ul className="mb-4 space-y-2">
                {b.berkas.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-xl bg-ink-50 p-2 pr-3">
                    {f.jenis === "FOTO" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/berkas/${f.id}`} alt={f.namaBerkas} className="size-11 rounded-lg object-cover" />
                    ) : (
                      <span className="grid size-11 place-items-center rounded-lg bg-surface text-ink-500">
                        <FileText className="size-5" />
                      </span>
                    )}
                    <a href={`/api/berkas/${f.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                      {f.namaBerkas}
                      <span className="block text-xs font-normal text-ink-500">
                        {f.jenis === "FOTO" ? <ImageIcon className="mr-1 inline size-3" /> : null}
                        {num(f.ukuran / 1024, 0)} KB
                      </span>
                    </a>
                    <form action={deleteBerkas}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-flame-50 hover:text-flame-600" aria-label={`Hapus ${f.namaBerkas}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <UploadForm bateraiId={b.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
