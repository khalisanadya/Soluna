import type { Metadata } from "next";
import { LayarTetap } from "@/components/layar-tetap";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <div className="mx-auto w-full max-w-md animate-rise">
      <LayarTetap />
      <p className="eyebrow">Selamat datang kembali</p>
      <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-ink-950">Masuk ke SOLUNA</h1>
      <p className="mt-2 text-ink-600">Untuk pengelola listrik desa dan pemasok baterai bekas.</p>
      <LoginForm />
    </div>
  );
}
