import "server-only";
import { getActiveConfig } from "./config";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8000";

export type EngineResult<T> =
  | { ok: true; data: T; versiKonfigurasi: number; versiModel: string }
  | { ok: false; error: string };

// Semua angka penting berasal dari layanan hitung Python (FastAPI), bukan dari UI.
export async function callEngine<T extends { versi_model?: string }>(
  endpoint: "assess" | "plan" | "resilience" | "compatibility" | "lifecycle" | "match",
  input: unknown,
): Promise<EngineResult<T>> {
  const { versi, data: config } = await getActiveConfig();
  let res: Response;
  try {
    res = await fetch(`${ENGINE_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, config }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return {
      ok: false,
      error: "Mesin hitung tidak dapat dihubungi. Pastikan layanan FastAPI berjalan (npm run engine).",
    };
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = Array.isArray(body?.detail)
      ? body.detail.map((d: { loc?: string[]; msg?: string }) => `${d.loc?.slice(-1)[0] ?? "data"}: ${d.msg}`).join("; ")
      : res.statusText;
    return { ok: false, error: `Perhitungan gagal (${res.status}). ${detail}` };
  }
  const data = (await res.json()) as T;
  return { ok: true, data, versiKonfigurasi: versi, versiModel: data.versi_model ?? "tidak diketahui" };
}

export async function explainResult(
  jenis: "penilaian" | "perencanaan" | "ketahanan" | "kompatibilitas",
  hasil: unknown,
): Promise<Penjelasan | null> {
  try {
    const res = await fetch(`${ENGINE_URL}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { jenis, hasil } }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? ((await res.json()) as Penjelasan) : null;
  } catch {
    return null;
  }
}

export async function engineHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export type Penjelasan = { teks: string; sumber: "template" | "model_bahasa"; cek_angka: string; angka_gagal: string[] };
