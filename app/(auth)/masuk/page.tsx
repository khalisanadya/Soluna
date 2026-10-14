import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

// Akun demo hanya ditampilkan di lingkungan pengembangan, atau bila diaktifkan eksplisit
// (SHOW_DEMO_ACCOUNTS=true) untuk keperluan uji coba. Akun ini berasal dari prisma/seed.mts.
const DEMO = [
  { peran: "Admin desa", email: "admin@soluna.test", password: "soluna123" },
  { peran: "Pemasok", email: "armada@soluna.test", password: "soluna123" },
];

export default function MasukPage() {
  const showDemo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "true";
  return (
    <div className="mx-auto w-full max-w-md animate-rise" data-layar-tetap>
      <p className="eyebrow">Selamat datang kembali</p>
      <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-ink-950">Masuk ke SOLUNA</h1>
      <p className="mt-2 text-ink-600">Untuk pengelola listrik desa dan pemasok baterai bekas.</p>
      <LoginForm demo={showDemo ? DEMO : []} />
    </div>
  );
}
