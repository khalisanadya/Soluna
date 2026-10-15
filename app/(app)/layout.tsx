import { Suspense } from "react";
import { AppNav, LiveDot, NavSkeleton } from "@/components/nav";
import { requireUser } from "@/lib/auth";
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
        sub: user.peran === "ADMIN" ? "Pengelola Sistem Desa" : (user.namaPerusahaan ?? "Pemasok"),
      }}
    />
  );
}

async function StatusPills() {
  const ok = await engineHealth();
  return (
    <div className="flex items-center gap-2">
      <LiveDot ok={ok} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="group/app min-h-dvh">
      <Suspense fallback={<NavSkeleton />}>
        <NavLoader />
      </Suspense>
      {/* Bilah atas pemasok (data-topnav) menggantikan sidebar, jadi jarak kiri dihapus. */}
      <div className="md:pl-20 lg:pl-64 group-has-[[data-topnav]]/app:md:!pl-0 print:!pl-0">
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
