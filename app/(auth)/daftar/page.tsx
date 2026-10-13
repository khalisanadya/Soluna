import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <div>
      <p className="eyebrow">Buat akun</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Daftar ke SOLUNA</h1>
      <p className="mt-2 text-ink-600">Pilih peran Anda. Pemasok menyalurkan baterai bekas; admin mengelola listrik desa.</p>
      <RegisterForm adminCodeRequired={Boolean(process.env.ADMIN_INVITE_CODE)} />
      <p className="mt-6 text-sm text-ink-600">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-sun-700 hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
