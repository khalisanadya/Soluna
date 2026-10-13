"""Modul A — Penilaian Baterai.

SoH, grade, dan skor keyakinan: rumus/aturan deterministik (A-2, A-3, A-7).
Rentang sisa umur: model empiris sementara (A-6). Tim tidak melatih model ML di
lingkup ini, jadi modul `estimate_remaining_life` adalah pengganti yang transparan
dan dapat ditukar dengan model hasil pelatihan tanpa mengubah antarmuka.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from pydantic import BaseModel, Field

from .config import MODEL_VERSION, fmt, r, step


class AssessmentInput(BaseModel):
    kapasitas_awal_kwh: float = Field(gt=0)
    kapasitas_aktual_kwh: float | None = Field(default=None, ge=0)
    usia_tahun: float | None = Field(default=None, ge=0)
    jumlah_siklus: int | None = Field(default=None, ge=0)
    hambatan_internal_mohm: float | None = Field(default=None, ge=0)
    jenis_kimia: str | None = None
    kedalaman_pengosongan: float | None = Field(default=None, ge=0, le=1)
    frekuensi_pengisian_cepat: float | None = Field(default=None, ge=0, le=1)
    suhu_rata_c: float | None = Field(default=None, ge=-20, le=80)
    tanggal_penilaian: date | None = None


def grade_for(soh: float, cfg: dict[str, Any]) -> str:
    """Batas bawah masuk grade lebih tinggi: SoH 70% = B (A-3)."""
    g = cfg["grade"]
    if soh >= g["A"]:
        return "A"
    if soh >= g["B"]:
        return "B"
    if soh >= g["C"]:
        return "C"
    return "D"


def grade_range_text(grade: str, cfg: dict[str, Any]) -> str:
    g = cfg["grade"]
    return {
        "A": f"{fmt(g['A'])}–100%",
        "B": f"{fmt(g['B'])} sampai < {fmt(g['A'])}%",
        "C": f"{fmt(g['C'])} sampai < {fmt(g['B'])}%",
        "D": f"< {fmt(g['C'])}%",
    }[grade]


# Bobot kelengkapan data untuk skor keyakinan (A-7, M-2).
_FIELD_WEIGHTS = {
    "kapasitas_aktual_kwh": 0.30,
    "usia_tahun": 0.15,
    "jumlah_siklus": 0.12,
    "hambatan_internal_mohm": 0.10,
    "jenis_kimia": 0.09,
    "kedalaman_pengosongan": 0.08,
    "frekuensi_pengisian_cepat": 0.08,
    "suhu_rata_c": 0.08,
}

_FIELD_LABELS = {
    "kapasitas_aktual_kwh": "Kapasitas aktual",
    "usia_tahun": "Usia pemakaian",
    "jumlah_siklus": "Jumlah siklus",
    "hambatan_internal_mohm": "Hambatan internal",
    "jenis_kimia": "Jenis kimia",
    "kedalaman_pengosongan": "Kedalaman pengosongan",
    "frekuensi_pengisian_cepat": "Frekuensi pengisian cepat",
    "suhu_rata_c": "Suhu rata-rata",
}


def estimate_remaining_life(
    soh: float, data: AssessmentInput, cfg: dict[str, Any], missing_optional: int
) -> dict[str, Any]:
    """Model empiris v0.1: laju penurunan SoH per tahun, disesuaikan faktor stres.

    Keluaran: rentang sisa umur (bawah, tengah, atas) dalam tahun sampai SoH mencapai
    ambang penggantian.
    """
    m = cfg["model_sisa_umur"]
    eol = cfg["siklus_hidup"]["ambang_penggantian_soh"]
    kimia = (data.jenis_kimia or "Lainnya").upper()
    faktor_kimia = m["faktor_kimia"].get(kimia, m["faktor_kimia"]["Lainnya"])

    if data.usia_tahun and data.usia_tahun > 0 and soh < 100:
        laju_teramati = (100 - soh) / data.usia_tahun
        sumber_laju = "teramati"
    else:
        laju_teramati = m["laju_bawaan_per_tahun"] * faktor_kimia
        sumber_laju = "bawaan"

    stres = 1.0
    faktor_stres = []
    if data.suhu_rata_c is not None and data.suhu_rata_c > 35:
        stres *= 1.2
        faktor_stres.append("suhu tinggi ×1,2")
    if data.frekuensi_pengisian_cepat is not None and data.frekuensi_pengisian_cepat > 0.5:
        stres *= 1.1
        faktor_stres.append("pengisian cepat sering ×1,1")
    if data.kedalaman_pengosongan is not None and data.kedalaman_pengosongan > 0.8:
        stres *= 1.1
        faktor_stres.append("pengosongan dalam ×1,1")

    laju = max(m["laju_minimum_per_tahun"], laju_teramati * m["faktor_pemakaian_stasioner"] * stres)
    tengah = max(0.0, (soh - eol) / laju)

    # Ketidakpastian melebar ketika data opsional kosong.
    u = min(0.6, 0.2 + 0.06 * missing_optional + (0.1 if sumber_laju == "bawaan" else 0))
    bawah = tengah * (1 - u)
    atas = tengah * (1 + u)

    langkah = [
        step(
            "Laju penurunan teramati",
            "(100 − SoH) / usia" if sumber_laju == "teramati" else "laju bawaan × faktor kimia",
            f"(100 − {fmt(soh)}) / {fmt(data.usia_tahun or 0)}"
            if sumber_laju == "teramati"
            else f"{fmt(m['laju_bawaan_per_tahun'])} × {fmt(faktor_kimia)}",
            r(laju_teramati),
            "%/tahun",
        ),
        step(
            "Laju pemakaian stasioner",
            "max(laju minimum, laju teramati × faktor stasioner × faktor stres)",
            f"max({fmt(m['laju_minimum_per_tahun'])}; {fmt(laju_teramati)} × {fmt(m['faktor_pemakaian_stasioner'])} × {fmt(stres)})",
            r(laju),
            "%/tahun",
        ),
        step(
            "Sisa umur (tengah)",
            "(SoH − ambang penggantian) / laju",
            f"({fmt(soh)} − {fmt(eol)}) / {fmt(laju)}",
            r(tengah),
            "tahun",
        ),
        step(
            "Rentang sisa umur",
            "tengah × (1 ∓ ketidakpastian)",
            f"{fmt(tengah)} × (1 ∓ {fmt(u)})",
            f"{fmt(bawah, 1)}–{fmt(atas, 1)}",
            "tahun",
        ),
    ]

    return {
        "bawah": r(bawah),
        "tengah": r(tengah),
        "atas": r(atas),
        "ketidakpastian": r(u),
        "laju_per_tahun": r(laju),
        "sumber_laju": sumber_laju,
        "faktor_stres": faktor_stres,
        "langkah": langkah,
    }


def assess(data: AssessmentInput, cfg: dict[str, Any]) -> dict[str, Any]:
    nilai_bawaan: list[str] = []
    langkah: list[dict[str, Any]] = []

    # A-2: SoH deterministik. M-1: bila kapasitas aktual kosong, pakai estimasi bawaan.
    if data.kapasitas_aktual_kwh is not None:
        soh = data.kapasitas_aktual_kwh / data.kapasitas_awal_kwh * 100
        langkah.append(
            step(
                "State of Health (SoH)",
                "kapasitas aktual / kapasitas awal × 100",
                f"{fmt(data.kapasitas_aktual_kwh)} / {fmt(data.kapasitas_awal_kwh)} × 100",
                r(soh),
                "%",
            )
        )
    else:
        soh = cfg["profil_paket"]["soh"] * 100
        nilai_bawaan.append("kapasitas_aktual_kwh")
        langkah.append(
            step(
                "State of Health (SoH) — estimasi bawaan",
                "SoH profil paket bawaan (kapasitas aktual tidak diisi)",
                f"{fmt(cfg['profil_paket']['soh'])} × 100",
                r(soh),
                "%",
            )
        )
    soh = min(soh, 100.0)

    # A-3, A-4
    grade = grade_for(soh, cfg)
    keputusan = cfg["keputusan"][grade]
    langkah.append(step("Grade", f"SoH {fmt(soh)}% berada pada rentang {grade_range_text(grade, cfg)}", "", grade))
    langkah.append(step("Keputusan pemanfaatan", f"aturan grade {grade}", "", keputusan))

    missing = [k for k in _FIELD_WEIGHTS if getattr(data, k) is None]
    for k in missing:
        if k not in nilai_bawaan:
            nilai_bawaan.append(k)
    missing_optional = len([k for k in missing if k != "kapasitas_aktual_kwh"])

    # A-6
    umur = estimate_remaining_life(soh, data, cfg, missing_optional)

    # A-7: keyakinan = kelengkapan data (60%) + kepastian model (40%).
    kelengkapan = sum(w for k, w in _FIELD_WEIGHTS.items() if getattr(data, k) is not None)
    keyakinan = (0.6 * kelengkapan + 0.4 * (1 - umur["ketidakpastian"])) * 100
    langkah.append(
        step(
            "Skor keyakinan",
            "(0,6 × kelengkapan data + 0,4 × (1 − ketidakpastian model)) × 100",
            f"(0,6 × {fmt(kelengkapan)} + 0,4 × (1 − {fmt(umur['ketidakpastian'])})) × 100",
            r(keyakinan, 1),
            "%",
        )
    )

    # A-8
    hari_ini = data.tanggal_penilaian or date.today()

    def plus_years(years: float) -> str:
        return (hari_ini + timedelta(days=round(years * 365.25))).isoformat()

    penggantian = {
        "tengah": plus_years(umur["tengah"]),
        "paling_cepat": plus_years(umur["bawah"]),
        "paling_lambat": plus_years(umur["atas"]),
        "segera": umur["tengah"] <= 0,
    }

    status_daur_ulang = grade == "D" or soh < cfg["siklus_hidup"]["ambang_penggantian_soh"]

    return {
        "soh": r(soh),
        "grade": grade,
        "rentang_grade": grade_range_text(grade, cfg),
        "keputusan": keputusan,
        "sisa_umur": {k: umur[k] for k in ("bawah", "tengah", "atas", "ketidakpastian", "laju_per_tahun", "sumber_laju", "faktor_stres")},
        "keyakinan": r(keyakinan, 1),
        "kelengkapan_data": r(kelengkapan * 100, 1),
        "penggantian": penggantian,
        "jalur_daur_ulang": status_daur_ulang,
        "nilai_bawaan": [_FIELD_LABELS[k] for k in nilai_bawaan],
        "langkah": langkah + umur["langkah"],
        "tanggal_penilaian": hari_ini.isoformat(),
        "kerangka": "Kerangka penilaian mengacu pada UL 1974 (indikatif, bukan sertifikasi).",
        "versi_model": MODEL_VERSION,
    }
