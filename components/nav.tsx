"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Battery,
  Building2,
  ChevronDown,
  CloudRain,
  HeartPulse,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PlugZap,
  Settings,
  SunMedium,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/format";
import { LogoutButton, WelcomeDialog } from "./session-dialogs";
import { Logo } from "./ui";

type Item = {
  href: string;
  label: string;
  short?: string;
  icon: React.ComponentType<{ className?: string }>;
};
type Group = { title: string; items: Item[] };

// Pengelola Sistem Desa (peran ADMIN di basis data).
const ADMIN: Group[] = [
  {
    title: "Ringkasan",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    title: "Baterai",
    items: [
      {
        href: "/baterai",
        label: "Data Baterai",
        short: "Baterai",
        icon: Battery,
      },
      {
        href: "/pencocokan",
        label: "Pencocokan Baterai",
        short: "Cocokkan",
        icon: ArrowLeftRight,
      },
      {
        href: "/siklus-hidup",
        label: "Pemantauan Baterai",
        short: "Pantau",
        icon: HeartPulse,
      },
      { href: "/pemasok", label: "Pemasok", icon: Users },
    ],
  },
  {
    title: "Perencanaan",
    items: [
      {
        href: "/perencana",
        label: "Perencana Desa",
        short: "Perencana",
        icon: SunMedium,
      },
      {
        href: "/ketahanan",
        label: "Ketahanan Desa",
        short: "Ketahanan",
        icon: CloudRain,
      },
      {
        href: "/kompatibilitas",
        label: "Kompatibilitas & Keselamatan",
        short: "Kompatibel",
        icon: PlugZap,
      },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      {
        href: "/pengaturan",
        label: "Parameter Sistem",
        short: "Parameter",
        icon: Settings,
      },
    ],
  },
];

const PEMASOK: Group[] = [
  {
    title: "Ringkasan",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    title: "Baterai",
    items: [
      {
        href: "/baterai",
        label: "Baterai Saya",
        short: "Baterai",
        icon: Battery,
      },
    ],
  },
  {
    title: "Akun",
    items: [
      {
        href: "/profil",
        label: "Profil Perusahaan",
        short: "Profil",
        icon: Building2,
      },
    ],
  },
];

// Dashboard pemasok memuat ringkasan baterai & profil: menu ikut bagian yang sedang terlihat saat digulir.
const BAGIAN_DASHBOARD = [
  { id: "baterai-saya", href: "/baterai" },
  { id: "profil-perusahaan", href: "/profil" },
];

const MOBILE_ADMIN = ["/dashboard", "/baterai", "/pencocokan", "/ketahanan"];
const MOBILE_PEMASOK = ["/dashboard", "/baterai", "/profil"];

function isActive(pathname: string, href: string, all: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // Jangan aktifkan /baterai bila ada item yang lebih spesifik (mis. /baterai/baru).
  return !all.some(
    (h) =>
      h !== href &&
      h.startsWith(href) &&
      (pathname === h || pathname.startsWith(h + "/")),
  );
}

export type NavUser = { nama: string; peran: "ADMIN" | "PEMASOK"; sub: string };

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  // Bilah atas pemasok: solid di posisi teratas, menjadi kaca transparan setelah halaman digulir.
  const [digulir, setDigulir] = useState(false);
  useEffect(() => {
    const cek = () => setDigulir(window.scrollY > 8);
    cek();
    window.addEventListener("scroll", cek, { passive: true });
    return () => window.removeEventListener("scroll", cek);
  }, []);
  const spy = user.peran === "PEMASOK" && pathname === "/dashboard";
  const [bagian, setBagian] = useState("/dashboard");
  useEffect(() => {
    if (!spy) return;
    const cek = () => {
      // Bagian aktif: bagian terakhir yang judulnya sudah melewati 40% tinggi layar; di dasar halaman, bagian terakhir.
      const dasar = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let aktif = "/dashboard";
      for (const b of BAGIAN_DASHBOARD) {
        const el = document.getElementById(b.id);
        if (el && (dasar || el.getBoundingClientRect().top <= window.innerHeight * 0.4)) aktif = b.href;
      }
      setBagian(aktif);
    };
    cek();
    window.addEventListener("scroll", cek, { passive: true });
    window.addEventListener("resize", cek);
    return () => {
      window.removeEventListener("scroll", cek);
      window.removeEventListener("resize", cek);
    };
  }, [spy]);
  const groups = user.peran === "ADMIN" ? ADMIN : PEMASOK;
  const items = groups.flatMap((g) => g.items);
  const hrefs = items.map((i) => i.href);
  const aktif = (href: string) => (spy ? href === bagian : isActive(pathname, href, hrefs));
  const mobile = (user.peran === "ADMIN" ? MOBILE_ADMIN : MOBILE_PEMASOK).map(
    (h) => items.find((i) => i.href === h)!,
  );
  const initials = user.nama
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  // Pemasok hanya punya beberapa menu: di tablet/desktop memakai bilah atas, bukan sidebar.
  const topNav = user.peran === "PEMASOK";

  return (
    <>
      <WelcomeDialog nama={user.nama} peran={user.peran} />
      {topNav ? (
        /* Tablet & desktop (pemasok): bilah atas dengan menu di tengah. data-topnav dipakai layout untuk menghapus jarak sidebar. */
        <header
          data-topnav
          className={cn(
            "sticky top-0 z-30 hidden border-b transition-[background-color,border-color,box-shadow] duration-300 print:!hidden md:block",
            digulir
              ? "border-ink-200/50 bg-surface/60 shadow-[0_8px_24px_-20px_rgb(28_27_25/0.25)] backdrop-blur-xl backdrop-saturate-150"
              : "border-transparent bg-canvas",
          )}
        >
          <div className="mx-auto grid h-16 w-full max-w-[1320px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 lg:px-10">
            <Link href="/dashboard" className="justify-self-start">
              <Logo size={28} />
            </Link>
            <nav
              className="flex items-center gap-1 rounded-full bg-ink-100/80 p-1 ring-1 ring-ink-200/50"
              aria-label="Navigasi utama"
            >
              {items.map((it) => {
                const active = aktif(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      active
                        ? "bg-surface font-semibold text-ink-950 shadow-soft ring-1 ring-ink-200/60"
                        : "text-ink-500 hover:bg-white/60 hover:text-ink-900",
                    )}
                  >
                    <it.icon
                      className={cn(
                        "size-4",
                        active ? "text-sun-600" : "text-ink-400",
                      )}
                    />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
            <MenuPengguna user={user} initials={initials} />
          </div>
        </header>
      ) : (
        <>
          {/* Desktop: sidebar berlabel */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden print:!hidden w-64 flex-col border-r border-ink-200 bg-sidebar px-4 py-5 lg:flex">
            <Link href="/dashboard" className="px-2">
              <Logo size={30} />
            </Link>
            <nav
              className="-mx-1 mt-8 flex-1 space-y-6 overflow-y-auto px-1 [scrollbar-color:var(--color-ink-300)_transparent] [scrollbar-width:thin]"
              aria-label="Navigasi utama"
            >
              {groups.map((g) => (
                <div key={g.title}>
                  {g.title !== "Ringkasan" && (
                    <p className="eyebrow mb-2 px-3">{g.title}</p>
                  )}
                  <ul className="space-y-0.5">
                    {g.items.map((it) => {
                      const active = aktif(it.href);
                      return (
                        <li key={it.href}>
                          <Link
                            href={it.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                              active
                                ? "bg-ink-900 text-white shadow-soft"
                                : "text-ink-600 hover:bg-white/70 hover:text-ink-900",
                            )}
                          >
                            <it.icon
                              className={cn(
                                "size-[1.1rem]",
                                active ? "text-sun-400" : "text-ink-400",
                              )}
                            />
                            {it.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft ring-1 ring-ink-200/60">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun-500 text-xs font-bold text-ink-950">
                {initials}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold">
                  {user.nama}
                </span>
                <span className="block truncate text-xs text-ink-500">
                  {user.sub}
                </span>
              </span>
              <LogoutButton className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-900">
                <LogOut className="size-4" />
              </LogoutButton>
            </div>
          </aside>

          {/* Tablet: rel ikon dengan label kecil */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden print:!hidden w-20 flex-col items-center border-r border-ink-200 bg-sidebar py-5 md:flex lg:hidden">
            <Link href="/dashboard" aria-label="SOLUNA">
              <Logo size={30} withText={false} />
            </Link>
            <nav
              className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto [scrollbar-width:none]"
              aria-label="Navigasi utama"
            >
              {items.map((it) => {
                const active = aktif(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[0.62rem] font-medium",
                      active
                        ? "bg-ink-900 text-white"
                        : "text-ink-500 hover:bg-white/70",
                    )}
                  >
                    <it.icon
                      className={cn("size-5", active ? "text-sun-400" : "")}
                    />
                    {it.short ?? it.label}
                  </Link>
                );
              })}
            </nav>
            <LogoutButton className="grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-ink-100">
              <LogOut className="size-5" />
            </LogoutButton>
          </aside>
        </>
      )}

      {/* Ponsel: bilah atas + tab bawah */}
      <header className="sticky top-0 z-30 flex print:hidden items-center justify-between border-b border-ink-200 bg-sidebar/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard">
          <Logo size={26} />
        </Link>
        <span
          className="grid size-8 place-items-center rounded-full bg-sun-500 text-[0.7rem] font-bold text-ink-950"
          title={user.nama}
        >
          {initials}
        </span>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid print:hidden border-t border-ink-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{
          gridTemplateColumns: `repeat(${mobile.length + 1}, minmax(0, 1fr))`,
        }}
        aria-label="Navigasi ponsel"
      >
        {mobile.map((it) => {
          const active = aktif(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium",
                active ? "text-ink-950" : "text-ink-400",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-12 place-items-center rounded-full",
                  active && "bg-sun-100 text-sun-700",
                )}
              >
                <it.icon className="size-5" />
              </span>
              {it.short ?? it.label}
            </Link>
          );
        })}
        <button
          onClick={() => setSheet(true)}
          className="flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium text-ink-400"
        >
          <span className="grid h-7 w-12 place-items-center rounded-full">
            <MoreHorizontal className="size-5" />
          </span>
          Lainnya
        </button>
      </nav>

      {sheet && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu lainnya"
        >
          <button
            className="absolute inset-0 bg-ink-950/40"
            onClick={() => setSheet(false)}
            aria-label="Tutup menu"
          />
          <div className="animate-rise absolute inset-x-0 bottom-0 rounded-t-[1.75rem] bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="leading-tight">
                <p className="font-semibold">{user.nama}</p>
                <p className="text-xs text-ink-500">{user.sub}</p>
              </div>
              <button
                onClick={() => setSheet(false)}
                className="grid size-9 place-items-center rounded-full bg-ink-100"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setSheet(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium",
                    aktif(it.href)
                      ? "bg-ink-900 text-white"
                      : "bg-ink-50 text-ink-700",
                  )}
                >
                  <it.icon className="size-5" />
                  {it.short ?? it.label}
                </Link>
              ))}
            </div>
            <LogoutButton className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink-100 text-sm font-semibold text-ink-800">
              <LogOut className="size-4" /> Keluar
            </LogoutButton>
          </div>
        </div>
      )}
    </>
  );
}

export function NavSkeleton() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-200 bg-sidebar px-6 py-5 lg:block">
        <Logo size={30} />
      </aside>
      <aside className="fixed inset-y-0 left-0 hidden w-20 border-r border-ink-200 bg-sidebar py-5 md:flex md:justify-center lg:hidden">
        <Logo size={30} withText={false} />
      </aside>
      <header className="flex items-center border-b border-ink-200/70 px-4 py-3 md:hidden">
        <Logo size={26} />
      </header>
    </>
  );
}

export function LiveDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        ok
          ? "bg-leaf-50 text-leaf-700 ring-leaf-100"
          : "bg-flame-50 text-flame-600 ring-flame-100",
      )}
      title={
        ok
          ? "Layanan hitung berjalan: penilaian, perencanaan, simulasi, dan pemeriksaan dapat dijalankan."
          : "Layanan hitung tidak dapat dihubungi: penilaian, perencanaan, simulasi, dan pemeriksaan tidak dapat dijalankan. Data tersimpan tetap dapat dilihat."
      }
    >
      <Activity className="size-3.5" />
      Mesin hitung {ok ? "aktif" : "tidak aktif"}
    </span>
  );
}

/** Blok pengguna di bilah atas: klik untuk membuka menu berisi tombol "Keluar". */
function MenuPengguna({ user, initials }: { user: NavUser; initials: string }) {
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    // Dialog konfirmasi keluar berada di dalam ref, jadi kliknya tidak menutup menu.
    const luar = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setBuka(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && setBuka(false);
    document.addEventListener("pointerdown", luar);
    document.addEventListener("keydown", esc);
    // Halaman digulir → menu ditutup (kecuali dialog konfirmasi keluar sedang terbuka).
    const gulir = () => !document.querySelector("dialog[open]") && setBuka(false);
    window.addEventListener("scroll", gulir, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", luar);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", gulir);
    };
  }, [buka]);

  return (
    <div ref={ref} className="relative justify-self-end">
      <button
        type="button"
        onClick={() => setBuka((x) => !x)}
        aria-haspopup="menu"
        aria-expanded={buka}
        className={cn(
          "flex items-center gap-2 rounded-full p-1 text-left transition-colors hover:bg-ink-100 xl:pr-3",
          buka && "bg-ink-100",
        )}
      >
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-sun-500 text-xs font-bold text-ink-950"
          title={user.nama}
        >
          {initials}
        </span>
        <span className="hidden max-w-40 min-w-0 leading-tight xl:block">
          <span className="block truncate text-sm font-semibold">
            {user.nama}
          </span>
          <span className="block truncate text-xs text-ink-500">
            {user.sub}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "hidden size-4 shrink-0 text-ink-400 transition-transform xl:block",
            buka && "rotate-180",
          )}
        />
      </button>
      {buka && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 w-56 rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-ink-200/60"
        >
          <div className="px-3 py-2 xl:hidden">
            <p className="truncate text-sm font-semibold">{user.nama}</p>
            <p className="truncate text-xs text-ink-500">{user.sub}</p>
          </div>
          <LogoutButton className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-flame-600 hover:bg-flame-50">
            <LogOut className="size-4" />
            Keluar
          </LogoutButton>
        </div>
      )}
    </div>
  );
}
