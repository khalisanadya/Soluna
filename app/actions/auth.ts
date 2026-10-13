"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { akunSchema, formValues, pick, profilPemasokSchema, type FormState } from "@/lib/validation";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const identitas = String(fd.get("identitas") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!identitas || !password) {
    return { message: "Isi nama pengguna atau email, dan kata sandi.", values: formValues(fd) };
  }
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: { equals: identitas, mode: "insensitive" } }, { email: identitas }] },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { message: "Nama pengguna atau kata sandi salah.", values: formValues(fd) };
  }
  await createSession(user.id, user.peran);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/masuk");
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const peran = fd.get("peran") === "ADMIN" ? "ADMIN" : "PEMASOK";
  const values = formValues(fd);

  const akun = akunSchema.safeParse(pick(fd, ["username", "password", "email"]));
  const errors: Record<string, string[]> = {};
  if (!akun.success) Object.assign(errors, z.flattenError(akun.error).fieldErrors);
  if (fd.get("password") !== fd.get("konfirmasi")) errors.konfirmasi = ["Konfirmasi kata sandi tidak sama."];

  let profil: z.infer<typeof profilPemasokSchema> | null = null;
  let namaAdmin = "";
  if (peran === "PEMASOK") {
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
  } else {
    namaAdmin = String(fd.get("nama") ?? "").trim();
    if (!namaAdmin) errors.nama = ["Nama wajib diisi."];
    // Bila ADMIN_INVITE_CODE diatur, pendaftaran admin memerlukan kode undangan.
    const kode = process.env.ADMIN_INVITE_CODE;
    if (kode && fd.get("kodeAdmin") !== kode) errors.kodeAdmin = ["Kode admin tidak valid."];
  }

  if (Object.keys(errors).length || !akun.success) {
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
      errors: exists.email === email ? { email: ["Email sudah terdaftar."] } : { username: ["Nama pengguna sudah dipakai."] },
      message: "Akun sudah ada.",
    };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      peran,
      nama: profil ? profil.namaPenanggungJawab : namaAdmin,
      ...(profil ? { pemasok: { create: profil } } : {}),
    },
  });
  await createSession(user.id, user.peran);
  redirect("/dashboard");
}
