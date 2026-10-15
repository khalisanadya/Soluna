"""Pencocokan baterai dengan rencana desa.

Tidak ada rumus baru. Pencocokan menggabungkan aturan yang sudah ada:
- ukuran paket dari Perencana (laporan bagian 8): C_pakai, N_siklus, N_paket;
- pemeriksaan daya puncak baterai dari Perencana (P-6, C-rate);
- keputusan pemanfaatan per grade (Modul A): A dipakai ulang langsung, B tingkat modul,
  C tingkat sel, D didaur ulang;
- ambang penggantian SoH dari Siklus Hidup (Modul D);
- status kompatibilitas terakhir yang tersimpan (Modul C). Pemeriksaan kompatibilitas
  wajib sebelum pemasangan (laporan bagian 14), jadi baterai yang belum diperiksa
  tidak dapat berstatus "Direkomendasikan".
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from .config import MODEL_VERSION, fmt, r
from .planner import ukuran_paket

DIREKOMENDASIKAN = "direkomendasikan"
PENYESUAIAN = "perlu_penyesuaian"
TIDAK = "tidak_direkomendasikan"
BELUM = "belum_dinilai"
LABEL = {
    DIREKOMENDASIKAN: "Direkomendasikan",
    PENYESUAIAN: "Perlu penyesuaian",
    TIDAK: "Tidak direkomendasikan",
    BELUM: "Belum dinilai",
}
_RANK = {DIREKOMENDASIKAN: 0, PENYESUAIAN: 1, TIDAK: 2}


class KebutuhanRencana(BaseModel):
    kebutuhan_malam_kwh: float = Field(gt=0)
    daya_puncak_kw: float = Field(gt=0)
    dod: float = Field(gt=0, le=1)
    hari_cadangan: int = Field(ge=0, le=10)


class BateraiKandidat(BaseModel):
    id: str
    kode: str
    kapasitas_kwh: float = Field(gt=0)
    soh: float | None = Field(default=None, ge=0, le=100)  # persen
    grade: str | None = None
    status_kompatibilitas: Literal["layak", "perlu_penyesuaian", "tidak_layak"] | None = None


class MatchInput(BaseModel):
    rencana: KebutuhanRencana
    baterai: list[BateraiKandidat]


def _cocokkan(b: BateraiKandidat, k: KebutuhanRencana, cfg: dict[str, Any]) -> dict[str, Any]:
    if b.soh is None or not b.grade:
        return {
            "id": b.id, "kode": b.kode, "status": BELUM, "label": LABEL[BELUM],
            "alasan": ["Baterai belum dinilai, jadi SoH dan grade belum diketahui. Nilai dulu di Modul A."],
            "keputusan": None, "kapasitas_terpakai_kwh": None, "paket_siklus_harian": None, "jumlah_paket": None,
            "daya_baterai_kw": None, "daur_ulang": False,
        }

    grade = b.grade.upper()
    ambang = cfg["siklus_hidup"]["ambang_penggantian_soh"]
    keputusan = cfg["keputusan"].get(grade)
    temuan: list[tuple[str, str]] = []

    daur_ulang = grade == "D" or b.soh < ambang
    if grade == "D":
        temuan.append((TIDAK, "Grade D: baterai diarahkan ke jalur daur ulang dan tidak dipasang ulang."))
    elif b.soh < ambang:
        temuan.append((TIDAK, f"SoH {fmt(b.soh)}% di bawah ambang penggantian {fmt(ambang)}%: arahkan ke daur ulang."))
    elif grade == "C":
        temuan.append((PENYESUAIAN, "Grade C hanya dipakai pada tingkat sel, jadi perlu perakitan ulang sebelum dipasang."))
    elif grade == "B":
        temuan.append((PENYESUAIAN, "Grade B dipakai pada tingkat modul. Periksa keseimbangan modul sebelum dipasang."))
    else:
        temuan.append((DIREKOMENDASIKAN, "Grade A dapat dipakai ulang langsung."))

    soh = b.soh / 100
    c_pakai, n_siklus, n_paket = ukuran_paket(k.kebutuhan_malam_kwh, b.kapasitas_kwh, soh, k.dod, k.hari_cadangan)
    daya = n_paket * b.kapasitas_kwh * soh * cfg["profil_paket"]["c_rate_maks"]
    if not daur_ulang:
        if daya >= k.daya_puncak_kw:
            temuan.append((DIREKOMENDASIKAN, f"Dengan {n_paket} paket, daya keluaran sekitar {fmt(daya)} kW mencukupi daya puncak {fmt(k.daya_puncak_kw)} kW."))
        else:
            temuan.append((PENYESUAIAN, f"Dengan {n_paket} paket, daya keluaran hanya sekitar {fmt(daya)} kW, di bawah daya puncak {fmt(k.daya_puncak_kw)} kW."))

        if b.status_kompatibilitas is None:
            temuan.append((PENYESUAIAN, "Belum diperiksa di Modul Kompatibilitas. Pemeriksaan ini wajib sebelum pemasangan."))
        elif b.status_kompatibilitas == "tidak_layak":
            temuan.append((TIDAK, "Pemeriksaan kompatibilitas terakhir: Tidak Layak."))
        elif b.status_kompatibilitas == "perlu_penyesuaian":
            temuan.append((PENYESUAIAN, "Pemeriksaan kompatibilitas terakhir: Perlu Penyesuaian."))
        else:
            temuan.append((DIREKOMENDASIKAN, "Pemeriksaan kompatibilitas terakhir: Layak."))

    status = max((t[0] for t in temuan), key=lambda s: _RANK[s])
    return {
        "id": b.id,
        "kode": b.kode,
        "status": status,
        "label": LABEL[status],
        "alasan": [t[1] for t in temuan],
        "keputusan": keputusan,
        "kapasitas_terpakai_kwh": r(c_pakai),
        "paket_siklus_harian": n_siklus,
        "jumlah_paket": n_paket,
        "daya_baterai_kw": r(daya),
        "daur_ulang": daur_ulang,
    }


def match(data: MatchInput, cfg: dict[str, Any]) -> dict[str, Any]:
    hasil = [_cocokkan(b, data.rencana, cfg) for b in data.baterai]
    urut = {DIREKOMENDASIKAN: 0, PENYESUAIAN: 1, TIDAK: 2, BELUM: 3}
    hasil.sort(key=lambda x: (urut[x["status"]], x["jumlah_paket"] or 0, x["kode"]))
    return {
        "baterai": hasil,
        "ringkasan": {k: sum(1 for x in hasil if x["status"] == k) for k in urut},
        "catatan": "Hasil indikatif. Jumlah paket memakai rumus Perencana dengan kebutuhan malam, DoD, dan hari cadangan dari rencana terpilih.",
        "versi_model": MODEL_VERSION,
    }
