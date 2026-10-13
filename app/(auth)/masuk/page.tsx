import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function MasukPage() {
  return (
    <div>
      <p className="eyebrow">Selamat datang kembali</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Masuk ke SOLUNA</h1>
      <p className="mt-2 text-ink-600">Untuk pengelola listrik desa dan pemasok baterai bekas.</p>
      <LoginForm />
      <p className="mt-6 text-sm text-ink-600">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-sun-700 hover:underline">
          Daftar sekarang
        </Link>
      </p>
      <div className="mt-10 rounded-2xl bg-ink-100/70 p-4 text-sm ring-1 ring-ink-200">
        <p className="font-semibold text-ink-800">Akun demo (ilustrasi)</p>
        <ul className="mt-2 space-y-1 text-ink-600">
          <li>
            Admin: <code className="num rounded bg-surface px-1.5 py-0.5">admin</code> /{" "}
            <code className="num rounded bg-surface px-1.5 py-0.5">soluna123</code>
          </li>
          <li>
            Pemasok: <code className="num rounded bg-surface px-1.5 py-0.5">armada</code> /{" "}
            <code className="num rounded bg-surface px-1.5 py-0.5">soluna123</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
