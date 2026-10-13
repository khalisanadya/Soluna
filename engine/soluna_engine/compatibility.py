"""Modul C — Kompatibilitas dan Keselamatan (versi ringan, aturan if-else).

Hasil selalu indikatif, bukan sertifikasi (C-5). Pemeriksaan BMS dan perangkat
pengaman dicatat sebagai pengembangan lanjutan (C-4).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from .config import MODEL_VERSION, fmt

LAYAK = "layak"
PENYESUAIAN = "perlu_penyesuaian"
TIDAK = "tidak_layak"
_RANK = {LAYAK: 0, PENYESUAIAN: 1, TIDAK: 2}
LABEL = {LAYAK: "Layak", PENYESUAIAN: "Perlu Penyesuaian", TIDAK: "Tidak Layak"}


class CompatibilityInput(BaseModel):
    tegangan_baterai_v: float = Field(gt=0)
    tegangan_inverter_nominal_v: float = Field(gt=0)
    tegangan_inverter_min_v: float = Field(gt=0)
    tegangan_inverter_maks_v: float = Field(gt=0)
    daya_inverter_kw: float | None = Field(default=None, gt=0)
    daya_puncak_kw: float | None = Field(default=None, gt=0)
    grade: str | None = None
    soh: float | None = Field(default=None, ge=0, le=100)
    jumlah_paket: int | None = Field(default=None, gt=0)
    kapasitas_paket_kwh: float | None = Field(default=None, gt=0)


def check(data: CompatibilityInput, cfg: dict[str, Any]) -> dict[str, Any]:
    tol = cfg["kompatibilitas"]["toleransi_nominal_persen"] / 100
    hasil: list[dict[str, Any]] = []
    v = data.tegangan_baterai_v
    vmin, vmaks, vnom = data.tegangan_inverter_min_v, data.tegangan_inverter_maks_v, data.tegangan_inverter_nominal_v

    if vmin >= vmaks:
        hasil.append({"nama": "Data inverter", "status": TIDAK,
                      "alasan": "Tegangan minimum inverter harus lebih kecil dari tegangan maksimum."})
    elif vmin <= v <= vmaks:
        selisih = abs(v - vnom) / vnom
        if selisih <= tol:
            hasil.append({"nama": "Tegangan", "status": LAYAK,
                          "alasan": f"Tegangan baterai {fmt(v)} V berada dalam rentang inverter {fmt(vmin)}–{fmt(vmaks)} V "
                                    f"dan dekat tegangan nominal {fmt(vnom)} V (selisih {fmt(selisih * 100, 1)}%)."})
        else:
            hasil.append({"nama": "Tegangan", "status": PENYESUAIAN,
                          "alasan": f"Tegangan {fmt(v)} V masih dalam rentang {fmt(vmin)}–{fmt(vmaks)} V, tetapi selisih "
                                    f"{fmt(selisih * 100, 1)}% dari nominal {fmt(vnom)} V melebihi toleransi {fmt(tol * 100)}%. "
                                    "Sesuaikan parameter pengisian dan batas tegangan di inverter."})
    elif v < vmin:
        n = max(2, round(vnom / v))
        if vmin <= n * v <= vmaks:
            hasil.append({"nama": "Tegangan", "status": PENYESUAIAN,
                          "alasan": f"Tegangan {fmt(v)} V di bawah minimum inverter {fmt(vmin)} V. Rangkai {n} paket secara seri "
                                    f"menjadi {fmt(n * v)} V agar masuk rentang."})
        else:
            hasil.append({"nama": "Tegangan", "status": TIDAK,
                          "alasan": f"Tegangan {fmt(v)} V di bawah minimum inverter {fmt(vmin)} V dan rangkaian seri tidak "
                                    "menghasilkan tegangan yang sesuai. Pilih inverter lain."})
    else:
        hasil.append({"nama": "Tegangan", "status": TIDAK,
                      "alasan": f"Tegangan {fmt(v)} V melebihi batas maksimum inverter {fmt(vmaks)} V. Risiko kerusakan inverter; "
                                "gunakan inverter bertegangan tinggi atau susun ulang modul."})

    if data.daya_inverter_kw and data.daya_puncak_kw:
        if data.daya_inverter_kw >= data.daya_puncak_kw:
            hasil.append({"nama": "Daya inverter", "status": LAYAK,
                          "alasan": f"Daya inverter {fmt(data.daya_inverter_kw)} kW mencukupi daya puncak {fmt(data.daya_puncak_kw)} kW."})
        else:
            hasil.append({"nama": "Daya inverter", "status": PENYESUAIAN,
                          "alasan": f"Daya inverter {fmt(data.daya_inverter_kw)} kW lebih kecil dari daya puncak "
                                    f"{fmt(data.daya_puncak_kw)} kW. Gunakan inverter lebih besar atau kurangi beban puncak."})

    if data.daya_puncak_kw and data.jumlah_paket and data.kapasitas_paket_kwh:
        soh = (data.soh if data.soh is not None else cfg["profil_paket"]["soh"] * 100) / 100
        daya_baterai = data.jumlah_paket * data.kapasitas_paket_kwh * soh * cfg["profil_paket"]["c_rate_maks"]
        ok = daya_baterai >= data.daya_puncak_kw
        hasil.append({"nama": "Daya keluaran baterai", "status": LAYAK if ok else PENYESUAIAN,
                      "alasan": f"Daya keluaran baterai sekitar {fmt(daya_baterai)} kW "
                                f"{'mencukupi' if ok else 'tidak mencukupi'} daya puncak {fmt(data.daya_puncak_kw)} kW."})

    if data.grade:
        g = data.grade.upper()
        if g == "D":
            hasil.append({"nama": "Kondisi baterai", "status": TIDAK,
                          "alasan": "Baterai grade D tidak dipasang ulang dan diarahkan ke jalur daur ulang."})
        elif g == "C":
            hasil.append({"nama": "Kondisi baterai", "status": PENYESUAIAN,
                          "alasan": "Baterai grade C hanya dipakai pada tingkat sel; perlu perakitan ulang sebelum dipasang."})
        elif g == "B":
            hasil.append({"nama": "Kondisi baterai", "status": PENYESUAIAN,
                          "alasan": "Baterai grade B dipakai pada tingkat modul; periksa keseimbangan modul sebelum dipasang."})
        else:
            hasil.append({"nama": "Kondisi baterai", "status": LAYAK, "alasan": "Baterai grade A dapat dipakai ulang langsung."})

    status = max((h["status"] for h in hasil), key=lambda s: _RANK[s], default=LAYAK)
    for h in hasil:
        h["label"] = LABEL[h["status"]]

    return {
        "status": status,
        "label": LABEL[status],
        "pemeriksaan": hasil,
        "catatan": "Hasil indikatif, bukan sertifikasi. Pemeriksaan BMS dan perangkat pengaman adalah pengembangan lanjutan.",
        "versi_model": MODEL_VERSION,
    }
