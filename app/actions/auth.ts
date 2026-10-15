"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SAMBUTAN_COOKIE } from "@/lib/flash";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { akunSchema, formValues, loginSchema, pick, profilPemasokSchema, type FormState } from "@/lib/validation";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  // Validasi server tetap berjalan walau klien sudah memeriksa formulir.
  const parsed = loginSchema.safeParse({ email: fd.get("email") ?? undefined, password: fd.get("password") ?? undefined });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, message: "Periksa kembali email dan kata sandi.", values: formValues(fd) };
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // Pesan sama untuk email tak terdaftar dan kata sandi salah agar tidak membocorkan akun yang ada.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { message: "Email atau kata sandi salah. Periksa kembali lalu coba lagi.", values: { email } };
  }
  await createSession(user.id, user.peran);
  await setSambutan("masuk");
  redirect(safeNext(fd.get("lanjut")));
}

/** Pop-up sambutan sekali tampil setelah masuk/daftar (dibaca dan dihapus oleh WelcomeDialog di klien). */
async function setSambutan(jenis: "masuk" | "baru") {
  (await cookies()).set(SAMBUTAN_COOKIE, jenis, { path: "/", maxAge: 60, sameSite: "lax" });
}

/** Hanya path internal ("/x"), bukan "//domain" atau URL penuh, untuk mencegah open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/dashboard";
}

export async function logout() {
  await deleteSession();
  // Setelah keluar (admin maupun pemasok), kembali ke halaman awal SOLUNA.
  redirect("/");
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  // Pendaftaran mandiri hanya untuk pemasok. Akun pengelola sistem desa (ADMIN) tidak dapat dibuat dari sini.
  const values = formValues(fd);

  // Kata sandi tidak melalui pick() agar tidak di-trim atau diubah (mis. "12,5" → "12.5").
  const akun = akunSchema.safeParse({ ...pick(fd, ["username", "email"]), password: fd.get("password") ?? undefined });
  const errors: Record<string, string[]> = {};
  if (!akun.success) Object.assign(errors, z.flattenError(akun.error).fieldErrors);
  if (fd.get("password") !== fd.get("konfirmasi")) errors.konfirmasi = ["Konfirmasi kata sandi tidak sama."];

  let profil: z.infer<typeof profilPemasokSchema> | null = null;
  {
    const parsed = profilPemasokSchema.safeParse({
      ...pick(fd, [
        "namaPenanggungJawab",
        "namaPerusahaan",
        "alamat",
        "kota",
        "provinsi",
        "telepon",
        "deskripsi",
        "jenisBaterai",
        "alamatPenyimpanan",
        "kotaPenyimpanan",
        "provinsiPenyimpanan",
      ]),
      emailPerusahaan: fd.get("email"),
    });
    if (!parsed.success) Object.assign(errors, z.flattenError(parsed.error).fieldErrors);
    else profil = parsed.data;
  }

  if (Object.keys(errors).length || !akun.success || !profil) {
    return { errors, values, message: "Periksa kembali isian yang ditandai." };
  }

  const { username, password, email } = akun.data;
  const exists = await prisma.user.findFirst({
    where: { OR: [{ username: { equals: username, mode: "insensitive" } }, { email }] },
    select: { username: true, email: true },
  });
  if (exists) {
    return {
      values,
      errors:
        exists.email === email
          ? { email: ["Email ini sudah terdaftar. Silakan masuk dengan akun tersebut."] }
          : { username: ["Nama pengguna sudah dipakai. Coba nama lain."] },
      message: exists.email === email ? "Email sudah terdaftar." : "Nama pengguna sudah dipakai.",
    };
  }

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        peran: "PEMASOK",
        nama: profil.namaPenanggungJawab,
        pemasok: { create: profil },
      },
    });
  } catch (err) {
    // Batasan unik di database tetap menjadi penjaga terakhir bila dua pendaftaran berlangsung bersamaan.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { values, errors: { email: ["Email atau nama pengguna sudah terdaftar."] }, message: "Akun sudah ada." };
    }
    throw err;
  }
  await createSession(user.id, user.peran);
  await setSambutan("baru");
  redirect("/dashboard");
}
