import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ROOT = path.join(process.cwd(), "storage", "uploads");

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_TYPES: Record<string, "FOTO" | "DOKUMEN"> = {
  "image/jpeg": "FOTO",
  "image/png": "FOTO",
  "image/webp": "FOTO",
  "application/pdf": "DOKUMEN",
};

/** Berkas disimpan di luar /public dan hanya disajikan lewat /api/berkas setelah cek akses. */
export async function saveUpload(file: File): Promise<string> {
  await mkdir(ROOT, { recursive: true });
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(ROOT, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export function readUpload(lokasi: string) {
  return readFile(path.join(ROOT, path.basename(lokasi)));
}

export async function deleteUpload(lokasi: string) {
  await unlink(path.join(ROOT, path.basename(lokasi))).catch(() => undefined);
}
