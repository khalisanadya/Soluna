"""Modul D — Siklus Hidup: jadwal penggantian, peringatan dini, tren SoH, jalur daur ulang.

Pemantauan memakai pembacaan SoH manual berkala, bukan telemetri real-time.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from pydantic import BaseModel, Field

from .config import MODEL_VERSION, fmt, r


class Bacaan(BaseModel):
    tanggal: date
    soh: float = Field(ge=0, le=100)


class BateraiSiklus(BaseModel):
    id: str
    kode: str
    soh_terakhir: float | None = Field(default=None, ge=0, le=100)
    grade: str | None = None
    sisa_umur_tengah: float | None = None
    tanggal_penilaian: date | None = None
    bacaan: list[Bacaan] = []


class LifecycleInput(BaseModel):
    baterai: list[BateraiSiklus]
    hari_ini: date | None = None


def _trend(readings: list[Bacaan]) -> float | None:
    """Kemiringan regresi linier SoH terhadap waktu (% per tahun)."""
    if len(readings) < 2:
        return None
    t0 = readings[0].tanggal
    xs = [(b.tanggal - t0).days / 365.25 for b in readings]
    ys = [b.soh for b in readings]
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:
        return None
    return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx


def analyze(data: LifecycleInput, cfg: dict[str, Any]) -> dict[str, Any]:
    sc = cfg["siklus_hidup"]
    ambang, margin, batas = sc["ambang_penggantian_soh"], sc["margin_peringatan_soh"], sc["batas_sisa_umur_tahun"]
    today = data.hari_ini or date.today()
    out = []

    for b in data.baterai:
        readings = sorted(b.bacaan, key=lambda x: x.tanggal)
        soh = readings[-1].soh if readings else b.soh_terakhir
        slope = _trend(readings)
        peringatan: list[str] = []

        jadwal: str | None = None
        dasar_jadwal = None
        if soh is not None and soh <= ambang:
            jadwal, dasar_jadwal = today.isoformat(), "SoH sudah di ambang penggantian"
        elif slope is not None and slope < 0 and soh is not None:
            years = (soh - ambang) / -slope
            jadwal = (readings[-1].tanggal + timedelta(days=round(years * 365.25))).isoformat()
            dasar_jadwal = f"tren SoH {fmt(slope, 2)}%/tahun dari {len(readings)} pembacaan"
        elif b.sisa_umur_tengah is not None and b.tanggal_penilaian:
            jadwal = (b.tanggal_penilaian + timedelta(days=round(b.sisa_umur_tengah * 365.25))).isoformat()
            dasar_jadwal = "estimasi sisa umur dari penilaian"

        sisa_tahun = None
        if jadwal:
            sisa_tahun = max(0.0, (date.fromisoformat(jadwal) - today).days / 365.25)

        if soh is None:
            status = "belum_dinilai"
        elif (b.grade or "").upper() == "D" or soh < ambang:
            status = "daur_ulang"
            peringatan.append(f"SoH {fmt(soh)}% di bawah ambang {fmt(ambang)}%: arahkan ke jalur daur ulang.")
        elif soh <= ambang + margin or (sisa_tahun is not None and sisa_tahun < batas):
            status = "perhatian"
            if soh <= ambang + margin:
                peringatan.append(f"SoH {fmt(soh)}% mendekati ambang penggantian {fmt(ambang)}%.")
            if sisa_tahun is not None and sisa_tahun < batas:
                peringatan.append(f"Perkiraan sisa umur {fmt(sisa_tahun, 1)} tahun, di bawah batas {fmt(batas)} tahun. Siapkan pengganti.")
        else:
            status = "normal"

        if slope is not None and slope < -8:
            peringatan.append(f"Penurunan SoH cepat ({fmt(slope, 1)}%/tahun). Periksa suhu dan pola pengisian.")

        out.append({
            "id": b.id,
            "kode": b.kode,
            "soh": r(soh),
            "tren_per_tahun": r(slope),
            "jadwal_penggantian": jadwal,
            "dasar_jadwal": dasar_jadwal,
            "sisa_tahun": r(sisa_tahun),
            "status": status,
            "peringatan": peringatan,
            "jalur_daur_ulang": status == "daur_ulang",
        })

    urut = {"daur_ulang": 0, "perhatian": 1, "normal": 2, "belum_dinilai": 3}
    out.sort(key=lambda x: (urut[x["status"]], x["jadwal_penggantian"] or "9999"))
    return {
        "baterai": out,
        "ringkasan": {k: sum(1 for x in out if x["status"] == k) for k in urut},
        "ambang": {"penggantian_soh": ambang, "margin_soh": margin, "batas_sisa_umur_tahun": batas},
        "versi_model": MODEL_VERSION,
    }
