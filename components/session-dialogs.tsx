"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, PartyPopper, Sun, X } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { SubmitButton } from "./submit-button";
import { buttonClass } from "./ui";
import { cn } from "@/lib/format";
import { SAMBUTAN_COOKIE } from "@/lib/flash";

export const dialogClass =
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

/* Notifikasi kecil di pojok kanan atas, menutup sendiri setelah 3 detik. */
export function WelcomeDialog({ nama, peran }: { nama: string; peran: "ADMIN" | "PEMASOK" }) {
  const [jenis, setJenis] = useState<"masuk" | "baru" | null>(null);

  useEffect(() => {
    const flash = readFlash();
    if (!flash) return;
    // Cookie dihapus di dalam callback (bukan langsung) agar efek yang dijalankan ulang
    // oleh Strict Mode masih bisa membacanya; sambutan tetap hanya muncul sekali.
    const id = requestAnimationFrame(() => {
      document.cookie = `${SAMBUTAN_COOKIE}=; Max-Age=0; path=/`;
      setJenis(flash === "baru" ? "baru" : "masuk");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!jenis) return;
    const timer = window.setTimeout(() => setJenis(null), SAMBUTAN_MS);
    return () => window.clearTimeout(timer);
  }, [jenis]);

  if (!jenis) return null;
  const baru = jenis === "baru";
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 left-4 z-50 ml-auto max-w-sm animate-drop overflow-hidden rounded-2xl bg-surface text-ink-900 shadow-lift ring-1 ring-sun-300/70 sm:top-5 sm:right-6"
    >
      <div className="flex items-center gap-3.5 p-4 pr-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", baru ? "bg-zest-300 text-ink-950" : "bg-sun-500 text-ink-950")}>
          {baru ? <PartyPopper className="size-5" /> : <Sun className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-sun-600 uppercase">
            {baru ? "Akun berhasil dibuat" : peran === "ADMIN" ? "Pengelola Sistem Desa" : "Pemasok"}
          </p>
          <p className="mt-0.5 leading-snug">
            <span className="font-bold">{baru ? "Selamat bergabung," : "Selamat datang,"}</span> {nama}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setJenis(null)}
          className="grid size-8 shrink-0 place-items-center self-start rounded-full text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>
      </div>
      <div
        className="h-1 origin-left animate-countdown bg-gradient-to-r from-sun-400 to-zest-300"
        style={{ "--durasi": `${SAMBUTAN_MS}ms` } as React.CSSProperties}
        aria-hidden="true"
      />
    </div>
  );
}
