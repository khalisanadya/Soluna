import { Suspense } from "react";
import { AppNav, LiveDot, NavSkeleton } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { getActiveConfig } from "@/lib/config";
import { engineHealth } from "@/lib/engine";

// Area terautentikasi: setiap halaman membaca sesi dan basis data per permintaan,
// jadi navigasi boleh menunggu server (skeleton dari loading.tsx tetap tampil).
export const instant = false;

async function NavLoader() {
  const user = await requireUser();
  return (
    <AppNav
      user={{
        nama: user.nama,
        peran: user.peran,
        sub: user.peran === "ADMIN" ? "Admin desa" : (user.namaPerusahaan ?? "Pemasok"),
      }}
    />
  );
}

async function StatusPills() {
  const [ok, config] = await Promise.all([engineHealth(), getActiveConfig()]);
  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-ink-200 sm:inline">
        Konfigurasi v{config.versi}
      </span>
      <LiveDot ok={ok} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<NavSkeleton />}>
        <NavLoader />
      </Suspense>
      <div className="md:pl-20 lg:pl-64 print:!pl-0">
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-4 pb-28 sm:px-6 md:pb-12 lg:px-10 lg:pt-6">
          <div className="mb-2 flex h-8 items-center justify-end print:hidden">
            <Suspense fallback={null}>
              <StatusPills />
            </Suspense>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
