"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, PartyPopper, Sun } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { SubmitButton } from "./submit-button";
import { buttonClass } from "./ui";
import { cn } from "@/lib/format";
import { SAMBUTAN_COOKIE } from "@/lib/flash";

const dialogClass =
  "m-auto w-[calc(100%-2rem)] max-w-sm rounded-[1.75rem] bg-surface p-0 text-ink-900 shadow-lift ring-1 ring-ink-200/70 backdrop:bg-ink-950/45 backdrop:backdrop-blur-[2px] open:animate-rise";

/* ---------- Konfirmasi keluar ---------- */

export function LogoutButton({ className, children, label = "Keluar" }: { className?: string; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={className} aria-label={label} title={label}>
        {children}
      </button>
      <dialog
        ref={ref}
        className={dialogClass}
        aria-labelledby="judul-keluar"
        // Klik di luar kotak (pada backdrop) menutup dialog.
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      >
        <div className="relative overflow-hidden rounded-[1.75rem]">
          <div className="relative bg-ink-950 px-6 pt-7 pb-8 text-center text-white">
            <div className="pointer-events-none absolute -top-16 -left-10 size-44 rounded-full bg-sun-500/25 blur-2xl" aria-hidden="true" />
            <span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-sun-500 text-ink-950">
              <LogOut className="size-6" />
            </span>
            <h2 id="judul-keluar" className="relative mt-5 text-2xl font-bold tracking-tight">
              Yakin ingin keluar?
            </h2>
            <p className="relative mt-2 text-sm text-ink-300">Sesi Anda di SOLUNA akan diakhiri.</p>
          </div>
          <div className="bg-canvas p-6">
           
            <form action={logout} className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => ref.current?.close()} className={buttonClass("secondary", "md")} autoFocus>
                Batal
              </button>
              <SubmitButton variant="primary" pendingText="Keluar…">
                Ya, keluar
              </SubmitButton>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

/* ---------- Sambutan setelah masuk / daftar ---------- */

const SAMBUTAN_MS = 3000;

function readFlash(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${SAMBUTAN_COOKIE}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function WelcomeDialog({ nama, peran }: { nama: string; peran: "ADMIN" | "PEMASOK" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [jenis, setJenis] = useState<"masuk" | "baru">("masuk");

  useEffect(() => {
    const flash = readFlash();
    if (!flash) return;
    let timer: number | undefined;
    // Buka pada frame berikutnya, setelah halaman tujuan selesai tampil.
    const id = requestAnimationFrame(() => {
      // Hapus cookie agar sambutan hanya muncul sekali.
      document.cookie = `${SAMBUTAN_COOKIE}=; Max-Age=0; path=/`;
      setJenis(flash === "baru" ? "baru" : "masuk");
      ref.current?.showModal();
      // Tutup otomatis setelah 3 detik; tetap bisa ditutup lebih cepat lewat tombol/Esc.
      timer = window.setTimeout(() => ref.current?.close(), SAMBUTAN_MS);
    });
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(timer);
    };
  }, []);

  const baru = jenis === "baru";
  const depan = nama.split(" ")[0];
  return (
    <dialog ref={ref} className={dialogClass} aria-labelledby="judul-sambutan" onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
      <div className="relative overflow-hidden rounded-[1.75rem]">
        <div className="relative bg-ink-950 px-6 pt-8 pb-10 text-center text-white">
          <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-sun-500/25 blur-2xl" aria-hidden="true" />
          <span className={cn("relative mx-auto grid size-14 place-items-center rounded-2xl", baru ? "bg-zest-300 text-ink-950" : "bg-sun-500 text-ink-950")}>
            {baru ? <PartyPopper className="size-6" /> : <Sun className="size-6" />}
          </span>
          <h2 id="judul-sambutan" className="relative mt-5 text-2xl font-bold tracking-tight">
            {baru ? "Akun berhasil dibuat!" : `Selamat datang, ${depan}!`}
          </h2>
          <p className="relative mt-2 text-sm text-ink-300">
            {baru
              ? `Selamat bergabung di SOLUNA, ${depan}.`
              : peran === "ADMIN"
                ? "Siap merencanakan listrik desa hari ini?"
                : "Siap menyalurkan baterai untuk desa hari ini?"}
          </p>
        </div>
        <div className="bg-canvas p-6">
          <p className="text-center text-sm text-ink-600">
            {peran === "ADMIN"
              ? "Mulai dengan menilai baterai dari pemasok, lalu rancang dan uji ketahanan energi desa."
              : "Mulai dengan mendaftarkan baterai bekas Anda agar bisa dinilai oleh admin desa."}
          </p>
          <button type="button" onClick={() => ref.current?.close()} className={buttonClass("primary", "md", "mt-5 w-full")} autoFocus>
            Mulai
          </button>
        </div>
      </div>
    </dialog>
  );
}
