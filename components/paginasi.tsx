import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, num } from "@/lib/format";

/* Paginasi seragam untuk semua daftar data: 10 baris per halaman, nomor halaman di bawah tabel,
   dan keterangan jumlah ("Menampilkan 1–10 dari 12 baterai"). */

export const PER_HALAMAN = 10;

type SP = Record<string, string | string[] | undefined>;

/** Baca nomor halaman dari URL dan batasi ke rentang yang ada. */
export function bacaHalaman(sp: SP, total: number, param = "page") {
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const halaman = Math.min(jumlahHalaman, Math.max(1, Math.floor(Number(sp[param])) || 1));
  return { halaman, jumlahHalaman, skip: (halaman - 1) * PER_HALAMAN, take: PER_HALAMAN };
}

/** Potong daftar yang sudah ada di memori (mis. hasil mesin hitung) sesuai halaman. */
export function potong<T>(list: T[], sp: SP, param = "page") {
  const h = bacaHalaman(sp, list.length, param);
  return { ...h, rows: list.slice(h.skip, h.skip + h.take) };
}

function hrefDengan(basePath: string, sp: SP, param: string, page: number) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) q.set(k, v);
  if (page <= 1) q.delete(param);
  else q.set(param, String(page));
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** Nomor halaman yang ditampilkan: awal, akhir, dan sekitar halaman aktif. */
function nomorHalaman(aktif: number, total: number): (number | "…")[] {
  const urut = [...new Set([1, total, aktif - 1, aktif, aktif + 1])].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  urut.forEach((n, i) => {
    if (i > 0 && n - urut[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export function Paginasi({
  basePath,
  sp,
  halaman,
  total,
  tampil,
  satuan,
  param = "page",
  ringkas = false,
  className,
}: {
  basePath: string;
  sp: SP;
  halaman: number;
  total: number;
  /** Jumlah baris pada halaman ini. */
  tampil: number;
  /** Kata benda data, huruf kecil: "baterai", "penilaian", "pemasok", … */
  satuan: string;
  param?: string;
  /** Untuk kolom sempit (sidebar): keterangan dan nomor halaman ditumpuk. */
  ringkas?: boolean;
  className?: string;
}) {
  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const dari = (halaman - 1) * PER_HALAMAN + 1;
  const tombol = "grid h-9 min-w-9 place-items-center rounded-full px-3 text-sm font-medium transition-colors";
  const href = (n: number) => hrefDengan(basePath, sp, param, n);
  if (total === 0) return null;

  return (
    <nav aria-label={`Halaman daftar ${satuan}`} className={cn("mt-3 flex flex-col items-center justify-between gap-3 px-1", !ringkas && "sm:flex-row", className)}>
      <p className="text-sm text-ink-500">
        Menampilkan{" "}
        <span className="num font-medium text-ink-800">{jumlahHalaman === 1 ? num(tampil, 0) : `${num(dari, 0)}–${num(dari + tampil - 1, 0)}`}</span> dari{" "}
        <span className="num font-medium text-ink-800">{num(total, 0)}</span> {satuan}
      </p>
      {jumlahHalaman > 1 && (
        <div className="flex items-center gap-1">
          {halaman > 1 ? (
            <Link href={href(halaman - 1)} scroll={false} className={cn(tombol, "text-ink-700 hover:bg-ink-100")} aria-label="Halaman sebelumnya">
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className={cn(tombol, "text-ink-300")} aria-hidden="true">
              <ChevronLeft className="size-4" />
            </span>
          )}
          {nomorHalaman(halaman, jumlahHalaman).map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1 text-ink-400">
                …
              </span>
            ) : (
              <Link
                key={n}
                href={href(n)}
                scroll={false}
                aria-current={n === halaman ? "page" : undefined}
                className={cn(tombol, "num", n === halaman ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100")}
              >
                {n}
              </Link>
            ),
          )}
          {halaman < jumlahHalaman ? (
            <Link href={href(halaman + 1)} scroll={false} className={cn(tombol, "text-ink-700 hover:bg-ink-100")} aria-label="Halaman berikutnya">
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className={cn(tombol, "text-ink-300")} aria-hidden="true">
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
