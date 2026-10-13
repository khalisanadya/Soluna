import type { Metadata } from "next";
import { CheckCircle2, CircleX, FlaskConical } from "lucide-react";
import { activateConfig, resetConfig } from "@/app/actions/konfigurasi";
import { Badge, Card, Notice, PageHeader, SectionTitle, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { CONFIG_FIELDS, getPath } from "@/lib/config-fields";
import { callEngine } from "@/lib/engine";
import { num, tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type { HasilKetahanan, HasilPenilaian, HasilRencana } from "@/lib/types";
import { ConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  await requireAdmin();
  const [{ versi, data }, versions] = await Promise.all([
    getActiveConfig(),
    prisma.konfigurasi.findMany({ orderBy: { versi: "desc" }, take: 15, include: { dibuatOleh: { select: { nama: true } } } }),
  ]);
  const values: Record<string, string> = {};
  for (const f of CONFIG_FIELDS) {
    const v = getPath(data, f.path);
    if (typeof v === "number") values[f.name] = String(Math.round((f.percent ? v * 100 : v) * 1000) / 1000);
  }

  return (
    <>
      <PageHeader
        eyebrow="Lainnya"
        title="Pengaturan"
        description="Parameter hitung disimpan terpisah dari logika hitung dan berversi. Setiap hasil mencatat versi konfigurasi yang dipakai."
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <ConfigForm values={values} json={JSON.stringify(data, null, 2)} versi={versi} />
        <div className="space-y-4">
          <AcceptanceTest />
          <Card>
            <SectionTitle title="Versi konfigurasi" />
            <ul className="divide-y divide-ink-100">
              {versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="num w-9 font-semibold">v{v.versi}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{v.catatan ?? "Tanpa catatan"}</span>
                    <span className="block text-xs text-ink-500">
                      {tanggal(v.createdAt, true)}
                      {v.dibuatOleh ? ` · ${v.dibuatOleh.nama}` : ""}
                    </span>
                  </span>
                  {v.aktif ? (
                    <Badge tone="leaf">Aktif</Badge>
                  ) : (
                    <form action={activateConfig}>
                      <input type="hidden" name="versi" value={v.versi} />
                      <button className={buttonClass("secondary", "sm")}>Aktifkan</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            <form action={resetConfig} className="mt-3">
              <button className={buttonClass("ghost", "sm")}>Kembalikan ke nilai bawaan</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Test case penerimaan (bagian 6.1) dijalankan langsung terhadap mesin hitung. */
async function AcceptanceTest() {
  const [plan, res, res50, assess] = await Promise.all([
    callEngine<HasilRencana>("plan", {
      jumlah_rumah: 50,
      konsumsi_per_rumah_kwh: 1,
      porsi_malam: 0.6,
      efisiensi: 0.9,
      psh_jam: 4,
      pr: 0.75,
      dod: 0.8,
      hari_cadangan: 1,
      paket: { kapasitas_kwh: 50, soh: 0.7 },
    }),
    callEngine<HasilKetahanan>("resilience", { beban_harian_kwh: 50, jumlah_paket: 4, kapasitas_kwh: 50, soh: 0.7, dod: 0.8, efisiensi: 0.9, psh_jam: 4, pr: 0.75, kapasitas_panel_kwp: 16.7, skenario: "hujan_beberapa_hari", pelepasan_beban: false }),
    callEngine<HasilKetahanan>("resilience", { beban_harian_kwh: 50, jumlah_paket: 4, kapasitas_kwh: 50, soh: 0.7, dod: 0.8, efisiensi: 0.9, psh_jam: 4, pr: 0.75, kapasitas_panel_kwp: 16.7, skenario: "hujan_beberapa_hari", faktor_beban: 0.5, pelepasan_beban: false }),
    callEngine<HasilPenilaian>("assess", { kapasitas_awal_kwh: 50, kapasitas_aktual_kwh: 35 }),
  ]);
  if (!plan.ok || !res.ok || !res50.ok || !assess.ok) {
    return (
      <Notice tone="danger" title="Uji penerimaan tidak dapat dijalankan">
        Mesin hitung tidak dapat dihubungi.
      </Notice>
    );
  }
  const hujan = (h: HasilKetahanan) => h.skenario.find((s) => s.kunci === "hujan_beberapa_hari")!;
  const within = (v: number | null, e: number) => v !== null && Math.abs(v - e) <= e * 0.05;
  const rows: [string, string, number | string | null, boolean][] = [
    ["Kebutuhan malam", "≈ 33 kWh", plan.data.ringkasan.kebutuhan_malam_kwh, within(plan.data.ringkasan.kebutuhan_malam_kwh, 33)],
    ["Kapasitas terpakai/paket", "28 kWh", plan.data.ringkasan.kapasitas_terpakai_per_paket_kwh, within(plan.data.ringkasan.kapasitas_terpakai_per_paket_kwh, 28)],
    ["Paket siklus harian", "2", plan.data.ringkasan.paket_siklus_harian, plan.data.ringkasan.paket_siklus_harian === 2],
    ["Paket dengan cadangan", "≈ 4", plan.data.ringkasan.jumlah_paket, within(plan.data.ringkasan.jumlah_paket, 4)],
    ["Kapasitas panel", "≈ 17 kWp", plan.data.ringkasan.kapasitas_panel_kwp, within(plan.data.ringkasan.kapasitas_panel_kwp, 17)],
    ["Ketahanan beban penuh", "≈ 2 hari", hujan(res.data).lama_bertahan_hari, within(hujan(res.data).lama_bertahan_hari, 2)],
    ["Ketahanan beban 50%", "≈ 4 hari", hujan(res50.data).lama_bertahan_hari, within(hujan(res50.data).lama_bertahan_hari, 4)],
    ["Grade paket (SoH 70%)", "B", assess.data.grade, assess.data.grade === "B"],
  ];
  const lulus = rows.filter((r) => r[3]).length;
  return (
    <Card>
      <SectionTitle
        title={
          <span className="flex items-center gap-2">
            <FlaskConical className="size-4 text-sun-600" /> Uji penerimaan
          </span>
        }
        hint="Test case proposal, toleransi ±5%, dengan konfigurasi aktif"
        action={<Badge tone={lulus === rows.length ? "leaf" : "flame"}>{lulus}/{rows.length} lulus</Badge>}
      />
      <ul className="space-y-2 text-sm">
        {rows.map(([label, expected, actual, ok]) => (
          <li key={label} className="flex items-center gap-2">
            {ok ? <CheckCircle2 className="size-4 shrink-0 text-leaf-500" /> : <CircleX className="size-4 shrink-0 text-flame-500" />}
            <span className="flex-1 text-ink-600">{label}</span>
            <span className="num font-medium">{typeof actual === "number" ? num(actual, 2) : (actual ?? "∞")}</span>
            <span className="w-20 text-right text-xs text-ink-400">{expected}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">Uji otomatis yang sama dijalankan dengan pytest: npm run test:engine.</p>
    </Card>
  );
}
