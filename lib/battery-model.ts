import "server-only";

const MODEL_URL = process.env.NEXT_PUBLIC_API_URL;
const MODEL_API_KEY = process.env.BATTERY_API_KEY;

export type BatteryModelInput = {
  kapasitas_awal_kwh: number;
  kapasitas_aktual_kwh: number | null;
  usia_tahun: number | null;
  jumlah_siklus: number | null;
  hambatan_internal_mohm: number | null;
  jenis_kimia: string | null;
  kedalaman_pengosongan: number | null;
  frekuensi_pengisian_cepat: number | null;
  suhu_rata_c: number | null;
};

export type BatteryModelResult = {
  passport_version: string;
  grade: "A" | "B" | "C" | "D";
  grade_range: { worst_case: string; best_case: string };
  state_of_health_pct: { lower: number; mid: number; upper: number };
  remaining_life_cycles: { lower: number; mid: number; upper: number };
  interval_level: number;
  confidence: number;
  confidence_meaning: string;
  input_completeness: number;
  warnings: string[];
  model: { version: string; trained_at: string; dataset: string };
};

function isResult(value: unknown): value is BatteryModelResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<BatteryModelResult>;
  return (
    typeof result.grade === "string" &&
    !!result.state_of_health_pct &&
    typeof result.state_of_health_pct.mid === "number" &&
    !!result.remaining_life_cycles &&
    typeof result.remaining_life_cycles.mid === "number" &&
    typeof result.confidence === "number" &&
    typeof result.model?.version === "string"
  );
}

export async function assessWithTrainedModel(input: BatteryModelInput): Promise<BatteryModelResult> {
  if (!MODEL_URL || !MODEL_API_KEY) {
    throw new Error("Layanan model baterai belum dikonfigurasi. Isi NEXT_PUBLIC_API_URL dan BATTERY_API_KEY.");
  }

  let response: Response;
  try {
    response = await fetch(`${MODEL_URL.replace(/\/$/, "")}/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": MODEL_API_KEY },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("Layanan model baterai tidak dapat dihubungi.");
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : response.statusText;
    throw new Error(`Penilaian model gagal (${response.status}). ${detail}`);
  }
  if (!isResult(body)) throw new Error("Respons layanan model baterai tidak sesuai kontrak.");
  return body;
}
