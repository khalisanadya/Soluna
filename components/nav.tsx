"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Battery,
  PackagePlus as BatteryPlus,
  Building2,
  ClipboardCheck,
  CloudRain,
  History,
  LayoutGrid,
  LogOut,
  MoreHorizontal,
  PlugZap,
  Recycle,
  Settings,
  SunMedium,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/format";
import { LogoutButton, WelcomeDialog } from "./session-dialogs";
import { Logo } from "./ui";

type Item = { href: string; label: string; short?: string; icon: React.ComponentType<{ className?: string }> };
type Group = { title: string; items: Item[] };

// Pengelola Sistem Desa (peran ADMIN di basis data).
const ADMIN: Group[] = [
  { title: "Ringkasan", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }] },
  {
    title: "Baterai",
    items: [
      { href: "/baterai", label: "Data Baterai", short: "Baterai", icon: Battery },
      { href: "/penilaian", label: "Penilaian Baterai", short: "Penilaian", icon: ClipboardCheck },
      { href: "/pencocokan", label: "Pencocokan Baterai", short: "Cocokkan", icon: ArrowLeftRight },
      { href: "/pemasok", label: "Pemasok", icon: Users },
    ],
  },
  {
    title: "Perencanaan",
    items: [
      { href: "/perencana", label: "Perencana Desa", short: "Perencana", icon: SunMedium },
      { href: "/ketahanan", label: "Ketahanan Desa", short: "Ketahanan", icon: CloudRain },
      { href: "/kompatibilitas", label: "Kompatibilitas & Keselamatan", short: "Kompatibel", icon: PlugZap },
    ],
  },
  {
    title: "Pemantauan",
    items: [
      { href: "/siklus-hidup", label: "Siklus Hidup & Perawatan", short: "Siklus", icon: Recycle },
      { href: "/riwayat", label: "Riwayat", icon: History },
    ],
  },
  { title: "Pengaturan", items: [{ href: "/pengaturan", label: "Parameter Sistem", short: "Parameter", icon: Settings }] },
];

const PEMASOK: Group[] = [
  { title: "Ringkasan", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid }] },
  {
    title: "Baterai",
    items: [
      { href: "/baterai", label: "Baterai Saya", short: "Baterai", icon: Battery },
      { href: "/baterai/baru", label: "Tambah Baterai", short: "Tambah", icon: BatteryPlus },
    ],
  },
  { title: "Akun", items: [{ href: "/profil", label: "Profil Perusahaan", short: "Profil", icon: Building2 }] },
];

const MOBILE_ADMIN = ["/dashboard", "/baterai", "/penilaian", "/ketahanan"];
const MOBILE_PEMASOK = ["/dashboard", "/baterai", "/baterai/baru", "/profil"];

function isActive(pathname: string, href: string, all: string[]) {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // Jangan aktifkan /baterai bila ada item yang lebih spesifik (mis. /baterai/baru).
  return !all.some((h) => h !== href && h.startsWith(href) && (pathname === h || pathname.startsWith(h + "/")));
}

export type NavUser = { nama: string; peran: "ADMIN" | "PEMASOK"; sub: string };

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const groups = user.peran === "ADMIN" ? ADMIN : PEMASOK;
  const items = groups.flatMap((g) => g.items);
  const hrefs = items.map((i) => i.href);
  const mobile = (user.peran === "ADMIN" ? MOBILE_ADMIN : MOBILE_PEMASOK).map((h) => items.find((i) => i.href === h)!);
  const initials = user.nama
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <WelcomeDialog nama={user.nama} peran={user.peran} />
      {/* Desktop: sidebar berlabel */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden print:!hidden w-64 flex-col border-r border-ink-200/70 bg-canvas px-4 py-5 lg:flex">
        <Link href="/dashboard" className="px-2">
          <Logo size={30} />
        </Link>
        <nav className="mt-8 flex-1 space-y-6 overflow-y-auto" aria-label="Navigasi utama">
          {groups.map((g) => (
            <div key={g.title}>
              {g.title !== "Ringkasan" && <p className="eyebrow mb-2 px-3">{g.title}</p>}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(pathname, it.href, hrefs);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active ? "bg-ink-900 text-white shadow-soft" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                        )}
                      >
                        <it.icon className={cn("size-[1.1rem]", active ? "text-sun-400" : "text-ink-400")} />
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
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sun-500 text-xs font-bold text-ink-950">{initials}</span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold">{user.nama}</span>
            <span className="block truncate text-xs text-ink-500">{user.sub}</span>
          </span>
          <LogoutButton className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-900">
            <LogOut className="size-4" />
          </LogoutButton>
        </div>
      </aside>

      {/* Tablet: rel ikon dengan label kecil */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden print:!hidden w-20 flex-col items-center border-r border-ink-200/70 bg-canvas py-5 md:flex lg:hidden">
        <Link href="/dashboard" aria-label="SOLUNA">
          <Logo size={30} withText={false} />
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto" aria-label="Navigasi utama">
          {items.map((it) => {
            const active = isActive(pathname, it.href, hrefs);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 rounded-xl py-2 text-[0.62rem] font-medium",
                  active ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100",
                )}
              >
                <it.icon className={cn("size-5", active ? "text-sun-400" : "")} />
                {it.short ?? it.label}
              </Link>
            );
          })}
        </nav>
        <LogoutButton className="grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-ink-100">
          <LogOut className="size-5" />
        </LogoutButton>
      </aside>

      {/* Ponsel: bilah atas + tab bawah */}
      <header className="sticky top-0 z-30 flex print:hidden items-center justify-between border-b border-ink-200/70 bg-canvas/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard">
          <Logo size={26} />
        </Link>
        <span className="grid size-8 place-items-center rounded-full bg-sun-500 text-[0.7rem] font-bold text-ink-950" title={user.nama}>
          {initials}
        </span>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid print:hidden grid-cols-5 border-t border-ink-200 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navigasi ponsel"
      >
        {mobile.map((it) => {
          const active = isActive(pathname, it.href, hrefs);
          return (
            <Link key={it.href} href={it.href} className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium", active ? "text-ink-950" : "text-ink-400")}>
              <span className={cn("grid h-7 w-12 place-items-center rounded-full", active && "bg-sun-100 text-sun-700")}>
                <it.icon className="size-5" />
              </span>
              {it.short ?? it.label}
            </Link>
          );
        })}
        <button onClick={() => setSheet(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium text-ink-400">
          <span className="grid h-7 w-12 place-items-center rounded-full">
            <MoreHorizontal className="size-5" />
          </span>
          Lainnya
        </button>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu lainnya">
          <button className="absolute inset-0 bg-ink-950/40" onClick={() => setSheet(false)} aria-label="Tutup menu" />
          <div className="animate-rise absolute inset-x-0 bottom-0 rounded-t-[1.75rem] bg-surface p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="leading-tight">
                <p className="font-semibold">{user.nama}</p>
                <p className="text-xs text-ink-500">{user.sub}</p>
              </div>
              <button onClick={() => setSheet(false)} className="grid size-9 place-items-center rounded-full bg-ink-100" aria-label="Tutup">
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
                    isActive(pathname, it.href, hrefs) ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-700",
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
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-ink-200/70 bg-canvas px-6 py-5 lg:block">
        <Logo size={30} />
      </aside>
      <aside className="fixed inset-y-0 left-0 hidden w-20 border-r border-ink-200/70 bg-canvas py-5 md:flex md:justify-center lg:hidden">
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
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1", ok ? "bg-leaf-50 text-leaf-700 ring-leaf-100" : "bg-flame-50 text-flame-600 ring-flame-100")}
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
