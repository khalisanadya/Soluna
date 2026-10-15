"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileWarning } from "lucide-react";
import { dialogClass } from "./session-dialogs";
import { buttonClass } from "./ui";

/**
 * Konfirmasi setiap kali pengguna keluar dari formulir yang belum disimpan.
 * - Tombol Batal (`leave(href)`), klik tautan internal (menu, logo), dan tombol Back peramban:
 *   dialog konfirmasi SOLUNA.
 * - Menutup atau memuat ulang tab: peringatan bawaan peramban, hanya bila sudah ada isian
 *   (peramban tidak mengizinkan dialog kustom di sini).
 * Panggil `lepas()` saat formulir dikirim agar navigasi setelah menyimpan tidak ditahan.
 */
export function useUnsavedGuard(dirty: boolean) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [tujuan, setTujuan] = useState<{ href: string } | { back: true } | null>(null);
  const aktif = useRef(true);
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    aktif.current = true;
    const tanya = (t: { href: string } | { back: true }) => {
      setTujuan(t);
      if (!ref.current?.open) ref.current?.showModal();
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!aktif.current || !dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    // Fase capture: dijalankan sebelum <Link> Next.js menavigasi.
    const onClick = (e: MouseEvent) => {
      if (!aktif.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      tanya({ href: url.pathname + url.search + url.hash });
    };

    // Tombol Back: sisipkan satu entri riwayat berisi halaman yang sama. Back hanya kembali ke
    // entri itu (halaman tidak berganti), lalu dialog ditampilkan dan entri penjaga dipasang lagi.
    const penanda = { ...(history.state ?? {}), __formGuard: true };
    if (!history.state?.__formGuard) history.pushState(penanda, "", location.href);
    const onPopState = (e: PopStateEvent) => {
      if (!aktif.current || e.state?.__formGuard) return;
      e.stopImmediatePropagation();
      history.pushState(penanda, "", location.href);
      tanya({ back: true });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState, true);
    return () => {
      aktif.current = false;
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, []);

  const leave = useCallback((href: string) => {
    setTujuan({ href });
    ref.current?.showModal();
  }, []);

  const keluar = () => {
    aktif.current = false;
    ref.current?.close();
    if (!tujuan) return;
    // Back: lewati entri penjaga dan halaman formulir sekaligus.
    if ("back" in tujuan) history.go(-2);
    else router.push(tujuan.href);
  };

  const dialog = (
    <dialog ref={ref} className={dialogClass} aria-labelledby="judul-keluar-form" onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
      <div className="p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sun-100 text-sun-700">
          <FileWarning className="size-6" />
        </span>
        <h2 id="judul-keluar-form" className="mt-4 text-xl font-bold tracking-tight text-ink-950">
          {dirty ? "Keluar tanpa menyimpan?" : "Keluar dari formulir?"}
        </h2>
        <p className="mt-2 text-sm text-ink-600">
          {dirty ? "Data yang sudah Anda isi belum disimpan dan akan hilang." : "Formulir ini belum disimpan. Anda dapat kembali mengisinya kapan saja."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => ref.current?.close()} className={buttonClass("secondary", "md")} autoFocus>
            Lanjut mengisi
          </button>
          <button type="button" onClick={keluar} className={buttonClass(dirty ? "danger" : "dark", "md")}>
            Ya, keluar
          </button>
        </div>
      </div>
    </dialog>
  );

  return { leave, dialog, lepas: () => (aktif.current = false) };
}
