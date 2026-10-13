import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Recycle, Timer } from "lucide-react";
import { TrendLine } from "@/components/charts";
import { Badge, Card, Disclaimer, EmptyState, GradeBadge, Notice, PageHeader, SectionTitle, Stat, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { callEngine } from "@/lib/engine";
import { bulanTahun, cn, num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilSiklus, StatusSiklus } from "@/lib/types";
import { ReadingForm } from "./reading-form";

export const metadata: Metadata = { title: "Siklus Hidup" };

const STATUS: Record<StatusSiklus, { label: string; tone: "flame" | "amber" | "leaf" | "neutral" }> = {
  daur_ulang: { label: "Daur ulang", tone: "flame" },
  perhatian: { label: "Perlu perhatian", tone: "amber" },
  normal: { label: "Normal", tone: "leaf" },
  belum_dinilai: { label: "Belum dinilai", tone: "neutral" },
};

export default async function SiklusHidupPage({ searchParams }: PageProps<"/siklus-hidup">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "riwayat" ? "riwayat" : "jadwal";
  const [baterai, { data: cfg }] = await Promise.all([
    prisma.baterai.findMany({
      where: { status: "DINILAI" },
      orderBy: { kode: "asc" },
      include: { bacaanSoh: { orderBy: { tanggal: "asc" } }, penilaian: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    getActiveConfig(),
  ]);

  const res = await callEngine<HasilSiklus>("lifecycle", {
    baterai: baterai.map((b) => ({
      id: b.id,
      kode: b.kode,
      soh_terakhir: b.sohTerakhir,
      grade: b.gradeTerakhir,
      sisa_umur_tengah: b.penilaian[0]?.sisaUmurTengah,
      tanggal_penilaian: b.penilaian[0]?.createdAt.toISOString().slice(0, 10),
      bacaan: b.bacaanSoh.map((r) => ({ tanggal: r.tanggal.toISOString().slice(0, 10), soh: r.soh })),
    })),
  });
  const byId = new Map(baterai.map((b) => [b.id, b]));
  const selectedId = typeof sp.baterai === "string" && byId.has(sp.baterai) ? sp.baterai : baterai[0]?.id;
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const ambang = cfg.siklus_hidup.ambang_penggantian_soh;

  return (
    <>
      <PageHeader
        eyebrow="Modul D · Siklus hidup"
        title="Siklus hidup baterai"
        description="Jadwal penggantian, peringatan dini, tren SoH dari pembacaan berkala, dan jalur daur ulang. Pemantauan memakai input manual, bukan telemetri real-time."
      />
      {!res.ok ? (
        <Notice tone="danger" title="Analisis siklus hidup gagal">
          {res.error}
        </Notice>
      ) : baterai.length === 0 ? (
        <EmptyState title="Belum ada baterai yang dinilai" description="Nilai baterai di Modul A untuk mulai memantau siklus hidupnya." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat label="Daur ulang" value={res.data.ringkasan.daur_ulang} icon={<Recycle className="size-4" />} accent="flame" hint={`SoH < ${ambang}% atau grade D`} />
            <Stat label="Perlu perhatian" value={res.data.ringkasan.perhatian} icon={<AlertTriangle className="size-4" />} accent="sun" hint={`SoH ≤ ${ambang + cfg.siklus_hidup.margin_peringatan_soh}% atau sisa < ${cfg.siklus_hidup.batas_sisa_umur_tahun} th`} />
            <Stat label="Normal" value={res.data.ringkasan.normal} icon={<CheckCircle2 className="size-4" />} accent="leaf" />
            <Stat label="Ambang penggantian" value={ambang} unit="% SoH" icon={<Timer className="size-4" />} accent="ink" hint="Dari konfigurasi" />
          </div>

          <div className="my-5 flex gap-2" role="tablist">
            {[
              { k: "jadwal", t: "Jadwal & peringatan" },
              { k: "riwayat", t: "Riwayat SoH" },
            ].map((t) => (
              <Link key={t.k} role="tab" aria-selected={tab === t.k} href={`/siklus-hidup?tab=${t.k}${selectedId ? `&baterai=${selectedId}` : ""}`} className={buttonClass(tab === t.k ? "dark" : "secondary", "sm")}>
                {t.t}
              </Link>
            ))}
          </div>

          {tab === "jadwal" ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="overflow-x-auto lg:col-span-2">
                <SectionTitle title="Jadwal penggantian" hint="Dari tren SoH berkala, atau estimasi sisa umur penilaian" />
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs text-ink-500">
                    <tr className="border-b border-ink-100">
                      <th className="py-2 pr-3 font-medium">Baterai</th>
                      <th className="px-3 py-2 text-right font-medium">SoH</th>
                      <th className="px-3 py-2 text-right font-medium">Tren</th>
                      <th className="px-3 py-2 font-medium">Ganti sekitar</th>
                      <th className="py-2 pl-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {res.data.baterai.map((r) => {
                      const b = byId.get(r.id)!;
                      return (
                        <tr key={r.id}>
                          <td className="py-3 pr-3">
                            <Link href={`/siklus-hidup?tab=riwayat&baterai=${r.id}`} className="flex items-center gap-2 hover:underline">
                              <GradeBadge grade={b.gradeTerakhir} size="sm" />
                              <span className="num font-semibold">{r.kode}</span>
                            </Link>
                            <span className="text-xs text-ink-500">
                              {b.merek} {b.model}
                            </span>
                          </td>
                          <td className="num px-3 py-3 text-right">{num(r.soh)}%</td>
                          <td className={cn("num px-3 py-3 text-right", (r.tren_per_tahun ?? 0) < -8 && "text-flame-600")}>{r.tren_per_tahun !== null ? `${num(r.tren_per_tahun, 1)}%/th` : "—"}</td>
                          <td className="px-3 py-3">
                            <span className="font-medium">{r.status === "daur_ulang" ? "Sekarang" : bulanTahun(r.jadwal_penggantian)}</span>
                            {r.dasar_jadwal && <span className="block text-xs text-ink-500">{r.dasar_jadwal}</span>}
                          </td>
                          <td className="py-3 pl-3">
                            <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
              <div className="space-y-4">
                <Card>
                  <SectionTitle title="Peringatan dini" />
                  {res.data.baterai.some((r) => r.peringatan.length) ? (
                    <ul className="space-y-3">
                      {res.data.baterai
                        .filter((r) => r.peringatan.length)
                        .map((r) => (
                          <li key={r.id} className={cn("rounded-2xl p-3 text-sm ring-1", r.status === "daur_ulang" ? "bg-flame-50 ring-flame-100" : "bg-amber-50 ring-amber-100")}>
                            <Link href={`/baterai/${r.id}`} className="num font-semibold hover:underline">
                              {r.kode}
                            </Link>
                            <ul className="mt-1 space-y-1 text-ink-700">
                              {r.peringatan.map((w) => (
                                <li key={w}>{w}</li>
                              ))}
                            </ul>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-500">Tidak ada peringatan.</p>
                  )}
                </Card>
                <Card tone="ink">
                  <p className="flex items-center gap-2 font-semibold">
                    <Recycle className="size-4 text-sun-400" /> Jalur daur ulang
                  </p>
                  <p className="mt-2 text-sm text-ink-300">Baterai grade D atau di bawah ambang tidak dipasang ulang. Status paspornya diarahkan ke daur ulang.</p>
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {res.data.baterai
                      .filter((r) => r.jalur_daur_ulang)
                      .map((r) => (
                        <li key={r.id} className="flex justify-between">
                          <Link href={`/baterai/${r.id}`} className="num hover:underline">
                            {r.kode}
                          </Link>
                          <span className="num text-ink-400">{num(r.soh)}%</span>
                        </li>
                      ))}
                  </ul>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Tren SoH {selected && <span className="num">{selected.kode}</span>}</h2>
                    <p className="text-sm text-ink-500">Area kuning: zona peringatan · garis merah: ambang penggantian</p>
                  </div>
                  <form className="flex gap-2">
                    <input type="hidden" name="tab" value="riwayat" />
                    <select name="baterai" defaultValue={selectedId} className="h-9 rounded-full bg-surface px-3 text-sm ring-1 ring-ink-200">
                      {baterai.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.kode} · {b.merek} {b.model}
                        </option>
                      ))}
                    </select>
                    <button className={buttonClass("dark", "sm")}>Lihat</button>
                  </form>
                </div>
                {selected && selected.bacaanSoh.length ? (
                  <>
                    <TrendLine points={selected.bacaanSoh.map((r) => ({ x: r.tanggal.toISOString(), y: r.soh }))} threshold={ambang} warn={ambang + cfg.siklus_hidup.margin_peringatan_soh} height={220} />
                    <ul className="mt-4 divide-y divide-ink-100 text-sm">
                      {[...selected.bacaanSoh].reverse().map((r) => (
                        <li key={r.id} className="flex items-center justify-between py-2">
                          <span className="flex items-center gap-2">
                            <CalendarClock className="size-4 text-ink-400" /> {tanggal(r.tanggal)}
                            <Badge tone={r.sumber === "PENILAIAN" ? "sky" : "neutral"}>{r.sumber === "PENILAIAN" ? "Penilaian" : "Manual"}</Badge>
                          </span>
                          <span className="num font-medium">{num(r.soh)}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <EmptyState title="Belum ada pembacaan" className="py-8" />
                )}
              </Card>
              <ReadingForm baterai={baterai.map((b) => ({ id: b.id, label: `${b.kode} · ${b.merek} ${b.model}` }))} selectedId={selectedId} />
            </div>
          )}
          <Disclaimer className="mt-6" />
        </>
      )}
    </>
  );
}
