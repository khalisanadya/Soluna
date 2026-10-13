import { Compass } from "lucide-react";
import { ButtonLink, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center">
        <Logo size={34} />
        <span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl bg-sun-100 text-sun-700">
          <Compass className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-ink-600">Data yang Anda cari mungkin sudah dihapus atau Anda tidak memiliki akses.</p>
        <ButtonLink href="/dashboard" className="mt-6" variant="dark">
          Kembali ke dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
