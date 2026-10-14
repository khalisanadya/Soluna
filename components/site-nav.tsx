"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/format";
import { ButtonLink, Logo } from "./ui";

const LINKS = [
  { href: "#simulasi", t: "Simulasi" },
  { href: "#fitur", t: "Fitur" },
  { href: "#cara-kerja", t: "Cara kerja" },
];

function useScrolled() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("scroll", cb, { passive: true });
      return () => window.removeEventListener("scroll", cb);
    },
    () => window.scrollY > 8,
    () => false,
  );
}

export function SiteNav() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        scrolled || open ? "bg-canvas/85 shadow-[0_1px_0_rgb(28_27_25/0.08)] backdrop-blur-md" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem]">
        <Link href="/" className="rounded-lg" aria-label="SOLUNA — beranda">
          <Logo size={30} />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 rounded-full bg-white/60 p-1 ring-1 ring-ink-200/70 backdrop-blur md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-1.5 text-sm font-medium text-ink-600 transition hover:bg-white hover:text-ink-950 hover:shadow-soft">
              {l.t}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/masuk" variant="ghost" size="sm">
            Masuk
          </ButtonLink>
          <ButtonLink href="/daftar" variant="dark" size="sm">
            Daftar
          </ButtonLink>
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-full text-ink-900 ring-1 ring-ink-200 transition hover:bg-white md:hidden"
          aria-expanded={open}
          aria-controls="menu-ponsel"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div id="menu-ponsel" className="animate-rise border-t border-ink-200/70 px-4 pt-2 pb-5 md:hidden">
          <nav aria-label="Navigasi ponsel" className="flex flex-col">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium text-ink-800 transition hover:bg-white">
                {l.t}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ButtonLink href="/masuk" variant="secondary" onClick={() => setOpen(false)}>
              Masuk
            </ButtonLink>
            <ButtonLink href="/daftar" variant="dark" onClick={() => setOpen(false)}>
              Daftar
            </ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
