"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import {
  BadgeCheck,
  Battery,
  BatteryCharging,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  Eraser,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  SunMedium,
  UserRound,
  Warehouse,
  Zap,
} from "lucide-react";
import { updateProfil } from "@/app/actions/profil";
import {
  RegionSelect,
  guardAction,
  useFocusServerError,
} from "@/components/form-kit";
import {
  Card,
  Field,
  Notice,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/ui";
import { useUnsavedGuard } from "@/components/unsaved-guard";
import { cn, num, tanggal } from "@/lib/format";
import { cocokkanKabupatenKota } from "@/lib/wilayah";

const guardedUpdate = guardAction(updateProfil);
const URUTAN = [
  "namaPerusahaan",
  "namaPenanggungJawab",
  "alamat",
  "provinsi",
  "kota",
  "alamatPenyimpanan",
  "provinsiPenyimpanan",
  "kotaPenyimpanan",
  "telepon",
  "emailPerusahaan",
];

type Ringkasan = {
  total: number;
  dinilai: number;
  kapasitasKwh: number;
  bergabung: string;
};

/** Profil perusahaan: tampil baca-saja, baru dapat diubah setelah menekan "Ubah profil". */
export function ProfilPerusahaan({
  initial,
  ringkasan,
}: {
  initial: Record<string, string>;
  ringkasan: Ringkasan;
}) {
  const [ubah, setUbah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  if (ubah) {
    return (
      <ProfilForm
        initial={initial}
        onSelesai={(msg) => {
          setUbah(false);
          setPesan(msg ?? null);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const v = initial;
  const mulaiUbah = () => {
    setPesan(null);
    setUbah(true);
  };
  const jenis = v.jenisBaterai
    .split(/[,;/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const wilayah = (kota: string, provinsi: string) =>
    [kota, provinsi].filter(Boolean).join(", ");
  const adaPenyimpanan = Boolean(v.alamatPenyimpanan || v.kotaPenyimpanan);
  // Inisial tanpa bentuk badan usaha (PT/CV/UD) dan keterangan dalam kurung.
  const inisial = v.namaPerusahaan
    .replace(/\(.*?\)/g, "")
    .split(" ")
    .filter((s) => /^[a-z0-9]/i.test(s) && !/^(pt|cv|ud)\.?$/i.test(s))
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4">
      {pesan && <Notice tone="success">{pesan}</Notice>}

      {/* Sampul perusahaan */}
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-sun-100/70 blur-3xl"
          aria-hidden="true"
        />
        <SunMedium
          className="pointer-events-none absolute -top-6 -right-6 size-36 text-sun-200/60"
          strokeWidth={1}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sun-400 to-sun-600 text-xl font-bold text-white shadow-soft">
            {inisial || <Building2 className="size-7" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
                {v.namaPerusahaan || "—"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-0.5 text-xs font-semibold text-leaf-700 ring-1 ring-leaf-100">
                <BadgeCheck className="size-3.5" /> Pemasok terdaftar
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-600">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4 text-ink-400" />{" "}
                {v.namaPenanggungJawab || "—"}
              </span>
              {wilayah(v.kota, v.provinsi) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-ink-400" />{" "}
                  {wilayah(v.kota, v.provinsi)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-ink-400" /> Bergabung{" "}
                {tanggal(ringkasan.bergabung)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={mulaiUbah}
            className={buttonClass(
              "dark",
              "md",
              "shrink-0 self-start sm:self-center",
            )}
          >
            <Pencil className="size-4" /> Ubah profil
          </button>
        </div>
      </Card>

      {/* Ringkasan baterai */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Angka
          icon={<Battery className="size-4" />}
          label="Baterai terdaftar"
          nilai={String(ringkasan.total)}
          warna="bg-ink-100 text-ink-700"
        />
        <Angka
          icon={<ClipboardCheck className="size-4" />}
          label="Sudah dinilai"
          nilai={String(ringkasan.dinilai)}
          warna="bg-leaf-50 text-leaf-600"
        />
        <Angka
          icon={<Clock3 className="size-4" />}
          label="Menunggu penilaian"
          nilai={String(ringkasan.total - ringkasan.dinilai)}
          warna="bg-sun-100 text-sun-700"
        />
        <Angka
          icon={<Zap className="size-4" />}
          label="Total kapasitas"
          nilai={`${num(ringkasan.kapasitasKwh)} kWh`}
          warna="bg-sky-50 text-sky-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Judul
            icon={<Building2 className="size-4" />}
            teks="Tentang perusahaan"
          />
          {v.deskripsi ? (
            <p className="text-[0.95rem] leading-relaxed whitespace-pre-line text-ink-700">
              {v.deskripsi}
            </p>
          ) : (
            <Kosong
              teks="Belum ada deskripsi. Ceritakan singkat usaha Anda agar pengelola desa lebih mengenal perusahaan Anda."
              onUbah={mulaiUbah}
            />
          )}
          <div className="mt-5 border-t border-ink-100 pt-4">
            <p className="eyebrow mb-2.5">Jenis baterai yang ditawarkan</p>
            {jenis.length ? (
              <div className="flex flex-wrap gap-2">
                {jenis.map((j) => (
                  <span
                    key={j}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sun-50 px-3 py-1 text-sm font-semibold text-sun-800 ring-1 ring-sun-200"
                  >
                    <BatteryCharging className="size-3.5" /> {j}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">Belum diisi.</p>
            )}
          </div>
        </Card>

        <Card>
          <Judul icon={<Phone className="size-4" />} teks="Kontak" />
          <div className="space-y-2">
            <Kontak
              icon={<UserRound className="size-4" />}
              label="Penanggung jawab"
              nilai={v.namaPenanggungJawab}
            />
            <Kontak
              href={
                v.telepon ? `tel:${v.telepon.replace(/[\s-]/g, "")}` : undefined
              }
              icon={<Phone className="size-4" />}
              label="Telepon"
              nilai={v.telepon}
            />
            <Kontak
              href={
                v.emailPerusahaan ? `mailto:${v.emailPerusahaan}` : undefined
              }
              icon={<Mail className="size-4" />}
              label="Email"
              nilai={v.emailPerusahaan}
            />
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <Judul icon={<MapPin className="size-4" />} teks="Lokasi" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Lokasi
              icon={<Building2 className="size-4" />}
              judul="Kantor perusahaan"
              alamat={v.alamat}
              wilayah={wilayah(v.kota, v.provinsi)}
            />
            {adaPenyimpanan ? (
              <Lokasi
                icon={<Warehouse className="size-4" />}
                judul="Gudang penyimpanan"
                alamat={v.alamatPenyimpanan}
                wilayah={wilayah(v.kotaPenyimpanan, v.provinsiPenyimpanan)}
              />
            ) : (
              <div className="flex flex-col justify-center rounded-2xl border border-dashed border-ink-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                  <Warehouse className="size-4 text-ink-400" /> Gudang
                  penyimpanan
                </p>
                <p className="mt-1 text-sm text-ink-500">
                  Sama dengan alamat kantor.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Judul({ icon, teks }: { icon: React.ReactNode; teks: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-700">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-ink-900">{teks}</h3>
    </div>
  );
}

function Angka({
  icon,
  label,
  nilai,
  warna,
}: {
  icon: React.ReactNode;
  label: string;
  nilai: string;
  warna: string;
}) {
  return (
    <Card className="!p-4">
      <span className={cn("grid size-8 place-items-center rounded-xl", warna)}>
        {icon}
      </span>
      <p className="num mt-3 text-2xl font-semibold text-ink-950">{nilai}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </Card>
  );
}

function Lokasi({
  icon,
  judul,
  alamat,
  wilayah,
}: {
  icon: React.ReactNode;
  judul: string;
  alamat: string;
  wilayah: string;
}) {
  return (
    <div className="rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-100">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <span className="text-sun-600">{icon}</span> {judul}
      </p>
      <p className="mt-2 text-sm break-words text-ink-700">{alamat || "—"}</p>
      {wilayah && <p className="mt-0.5 text-xs text-ink-500">{wilayah}</p>}
    </div>
  );
}

function Kontak({
  href,
  icon,
  label,
  nilai,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  nilai: string;
}) {
  const isi = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-ink-600 ring-1 ring-ink-200 transition-colors group-hover:bg-sun-500 group-hover:text-ink-950 group-hover:ring-sun-500">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-ink-500">{label}</span>
        <span className="block truncate text-sm font-medium text-ink-900">
          {nilai || "—"}
        </span>
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl bg-ink-50 p-3 transition-colors hover:bg-sun-50"
    >
      {isi}
    </a>
  ) : (
    <div className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
      {isi}
    </div>
  );
}

function Kosong({ teks, onUbah }: { teks: string; onUbah: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 p-4 text-sm text-ink-500">
      {teks}{" "}
      <button
        type="button"
        onClick={onUbah}
        className="font-semibold text-sun-700 hover:underline"
      >
        Tambahkan
      </button>
    </div>
  );
}

function ProfilForm({
  initial,
  onSelesai,
}: {
  initial: Record<string, string>;
  onSelesai: (pesan?: string) => void;
}) {
  const [state, action, pending] = useActionState(guardedUpdate, undefined);
  const [dirty, setDirty] = useState(false);
  const { leave, dialog, lepas } = useUnsavedGuard(dirty);
  const v = { ...initial, ...state?.values };
  const e = state?.errors ?? {};
  useFocusServerError(state, URUTAN);
  // Wilayah dikendalikan agar kabupaten/kota selalu mengikuti provinsi terpilih.
  // Nama kota lama ("Surabaya") dicocokkan ke nama resmi ("Kota Surabaya") bila tidak ambigu.
  const [wilayah, setWilayah] = useState(() => ({
    provinsi: initial.provinsi ?? "",
    kota: cocokkanKabupatenKota(initial.provinsi, initial.kota),
    provinsiPenyimpanan: initial.provinsiPenyimpanan ?? "",
    kotaPenyimpanan: cocokkanKabupatenKota(
      initial.provinsiPenyimpanan,
      initial.kotaPenyimpanan,
    ),
  }));
  const setW = (k: keyof typeof wilayah) => (value: string) =>
    setWilayah((w) => ({ ...w, [k]: value }));
  const input = (name: string, props: React.ComponentProps<"input"> = {}) => (
    <input
      id={name}
      name={name}
      defaultValue={v[name]}
      aria-invalid={Boolean(e[name])}
      className={inputClass}
      {...props}
    />
  );

  // Tersimpan: lepaskan penjaga formulir lalu kembali ke tampilan profil.
  useEffect(() => {
    if (state?.ok) {
      lepas();
      onSelesai(state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        if (pending) return;
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
      onChange={() => setDirty(true)}
      noValidate
    >
      {state?.message && !state.ok && (
        <Notice tone="danger" className="mb-4">
          {state.message}
        </Notice>
      )}
      <Card className="overflow-hidden !p-0">
        <Bagian
          icon={<Building2 className="size-4" />}
          judul="Perusahaan"
          keterangan="Identitas yang dilihat pengelola desa."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nama perusahaan"
              htmlFor="namaPerusahaan"
              error={e.namaPerusahaan}
              required
            >
              {input("namaPerusahaan")}
            </Field>
            <Field
              label="Nama penanggung jawab"
              htmlFor="namaPenanggungJawab"
              error={e.namaPenanggungJawab}
              required
            >
              {input("namaPenanggungJawab")}
            </Field>
            <Field
              label="Jenis baterai yang ditawarkan"
              htmlFor="jenisBaterai"
              optional
              hint="Pisahkan dengan koma, mis. LFP, NMC"
              className="sm:col-span-2"
            >
              {input("jenisBaterai")}
            </Field>
            <Field
              label="Deskripsi"
              htmlFor="deskripsi"
              optional
              className="sm:col-span-2"
            >
              <textarea
                id="deskripsi"
                name="deskripsi"
                defaultValue={v.deskripsi}
                rows={3}
                className={textareaClass}
              />
            </Field>
          </div>
        </Bagian>

        <Bagian
          icon={<Phone className="size-4" />}
          judul="Kontak"
          keterangan="Dipakai pengelola desa untuk menghubungi Anda."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telepon" htmlFor="telepon" error={e.telepon} required>
              {input("telepon", { type: "tel", inputMode: "tel" })}
            </Field>
            <Field
              label="Email perusahaan"
              htmlFor="emailPerusahaan"
              error={e.emailPerusahaan}
              required
            >
              {input("emailPerusahaan", { type: "email" })}
            </Field>
          </div>
        </Bagian>

        <Bagian
          icon={<MapPin className="size-4" />}
          judul="Alamat perusahaan"
          keterangan="Alamat kantor atau usaha."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Alamat"
              htmlFor="alamat"
              error={e.alamat}
              required
              className="sm:col-span-2"
            >
              {input("alamat")}
            </Field>
            <RegionSelect
              provinsiName="provinsi"
              kotaName="kota"
              provinsi={wilayah.provinsi}
              kota={wilayah.kota}
              onProvinsi={setW("provinsi")}
              onKota={setW("kota")}
              provinsiError={e.provinsi?.[0]}
              kotaError={e.kota?.[0]}
              required
            />
          </div>
        </Bagian>

        <Bagian
          icon={<Warehouse className="size-4" />}
          judul="Lokasi penyimpanan baterai"
          keterangan="Opsional. Isi bila berbeda dari alamat perusahaan."
          aksi={
            <button
              type="button"
              onClick={() => {
                const alamat = document.getElementById(
                  "alamatPenyimpanan",
                ) as HTMLInputElement | null;
                if (alamat) alamat.value = "";
                setWilayah((w) => ({
                  ...w,
                  provinsiPenyimpanan: "",
                  kotaPenyimpanan: "",
                }));
                setDirty(true);
              }}
              className={buttonClass("ghost", "sm", "shrink-0 text-ink-500")}
            >
              <Eraser className="size-4" /> Kosongkan
            </button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Alamat penyimpanan"
              htmlFor="alamatPenyimpanan"
              error={e.alamatPenyimpanan}
              optional
              className="sm:col-span-2"
            >
              {input("alamatPenyimpanan")}
            </Field>
            <RegionSelect
              provinsiName="provinsiPenyimpanan"
              kotaName="kotaPenyimpanan"
              provinsi={wilayah.provinsiPenyimpanan}
              kota={wilayah.kotaPenyimpanan}
              onProvinsi={setW("provinsiPenyimpanan")}
              onKota={setW("kotaPenyimpanan")}
              provinsiError={e.provinsiPenyimpanan?.[0]}
              kotaError={e.kotaPenyimpanan?.[0]}
            />
          </div>
        </Bagian>

        <div className="flex flex-col gap-3 bg-canvas/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-ink-500">
            <span className="text-flame-500">*</span> Kolom wajib diisi.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => leave(() => onSelesai())}
              className={buttonClass("ghost", "md")}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className={buttonClass("primary", "md")}
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {pending ? "Menyimpan…" : "Simpan profil"}
            </button>
          </div>
        </div>
      </Card>
      {dialog}
    </form>
  );
}

function Bagian({
  icon,
  judul,
  keterangan,
  aksi,
  children,
}: {
  icon: React.ReactNode;
  judul: string;
  keterangan: string;
  aksi?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-ink-100 px-5 py-5 sm:px-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-700">
          {icon}
        </span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-ink-900">{judul}</h2>
          <p className="text-xs text-ink-500">{keterangan}</p>
        </div>
        {aksi}
      </div>
      {children}
    </section>
  );
}
