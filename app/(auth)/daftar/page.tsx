import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-rise">
      <p className="eyebrow">Buat akun</p>
      <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight text-ink-950">Daftar ke SOLUNA</h1>
      <p className="mt-2 text-ink-600">
        Pendaftaran khusus pemasok baterai: operator armada, bengkel, atau produsen yang menyalurkan baterai bekas kendaraan listrik untuk desa.
      </p>
      <RegisterForm />
    </div>
  );
}
