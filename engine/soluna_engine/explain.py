"""Penjelasan hasil (AI-1 s.d. AI-4).

Model bahasa hanya merangkai kalimat; semua angka berasal dari JSON hasil hitungan.
Bila endpoint model bahasa (`SOLUNA_LLM_ENDPOINT`) dipasang, teksnya diperiksa:
setiap angka harus ada di JSON masukan (AI-3). Bila gagal atau model tidak tersedia,
penjelasan template dipakai sebagai cadangan (AI-4).
"""

from __future__ import annotations

import json
import os
import re
import urllib.request
from typing import Any, Literal

from pydantic import BaseModel

from .config import fmt

Jenis = Literal["penilaian", "perencanaan", "ketahanan", "kompatibilitas"]


class ExplainInput(BaseModel):
    jenis: Jenis
    hasil: dict[str, Any]


def _num(v: Any, digits: int = 1) -> str:
    if v is None:
        return "tidak terbatas"
    return fmt(float(v), digits)


def template(jenis: str, h: dict[str, Any]) -> str:
    if jenis == "penilaian":
        su = h["sisa_umur"]
        return (
            f"Baterai ini masih menyimpan {_num(h['soh'])}% dari kapasitas awalnya, sehingga masuk grade {h['grade']}. "
            f"Keputusan pemanfaatannya: {h['keputusan'].lower()}. "
            f"Perkiraan sisa umurnya {_num(su['bawah'])} sampai {_num(su['atas'])} tahun, dengan nilai tengah {_num(su['tengah'])} tahun. "
            f"Skor keyakinan {_num(h['keyakinan'])}% menunjukkan seberapa lengkap data yang dipakai."
        )
    if jenis == "perencanaan":
        s, ling, b = h["ringkasan"], h["lingkungan"], h["biaya"]
        return (
            f"Desa ini membutuhkan sekitar {_num(s['kebutuhan_harian_kwh'])} kWh listrik per hari, "
            f"dengan {_num(s['kebutuhan_malam_kwh'])} kWh dipakai pada malam hari. "
            f"Rancangannya memakai {s['jumlah_paket']} paket baterai dan panel surya {_num(s['kapasitas_panel_kwp'])} kWp "
            f"({s['jumlah_panel']} panel) dengan inverter {s['inverter_kw']} kW. "
            f"Dalam {ling['periode_hari']} hari, sistem ini menghemat sekitar {_num(ling['diesel_hemat_liter'])} liter diesel "
            f"dan menghindari {_num(ling['co2_dihindari_kg'])} kg CO₂."
        )
    if jenis == "ketahanan":
        sel = next(s for s in h["skenario"] if s["kunci"] == h["terpilih"])
        return (
            f"Pada skenario {sel['label'].lower()}, baterai menyimpan {_num(h['energi_tersedia_kwh'])} kWh energi yang bisa dipakai. "
            f"Tanpa pelepasan beban, desa bertahan sekitar {_num(sel['lama_bertahan_hari'])} hari. "
            f"Dengan pelepasan beban bertingkat, mulai dari beban kenyamanan, desa bertahan sekitar {_num(sel['lama_bertahan_pelepasan_hari'])} hari. "
            f"Genset masih diperlukan sekitar {_num(sel['jam_genset_pelepasan'])} jam selama {h['periode_hari']} hari simulasi."
        )
    if jenis == "kompatibilitas":
        alasan = " ".join(p["alasan"] for p in h["pemeriksaan"][:2])
        return f"Hasil pemeriksaan: {h['label'].lower()}. {alasan} Hasil ini indikatif dan bukan sertifikasi."
    raise ValueError(jenis)


_NUM_RE = re.compile(r"\d+(?:[.,]\d+)*")


def _collect_numbers(obj: Any, acc: set[float]) -> None:
    if isinstance(obj, bool):
        return
    if isinstance(obj, (int, float)):
        acc.add(round(float(obj), 1))
        acc.add(round(float(obj), 0))
    elif isinstance(obj, dict):
        for v in obj.values():
            _collect_numbers(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            _collect_numbers(v, acc)


def _parse_id(s: str) -> float | None:
    # Format Indonesia: titik ribuan, koma desimal.
    try:
        return float(s.replace(".", "").replace(",", "."))
    except ValueError:
        return None


def verify_numbers(text: str, hasil: dict[str, Any]) -> tuple[bool, list[str]]:
    """AI-3: setiap angka di penjelasan harus sama dengan angka di JSON masukan."""
    allowed: set[float] = set()
    _collect_numbers(hasil, allowed)
    # Angka persentase di JSON kadang berupa fraksi (0,8 → 80%).
    allowed |= {round(a * 100, 1) for a in list(allowed) if 0 < a <= 1}
    allowed |= {2.0}  # "CO₂"
    gagal = []
    for m in _NUM_RE.findall(text):
        v = _parse_id(m)
        if v is None or (round(v, 1) not in allowed and round(v, 0) not in allowed):
            gagal.append(m)
    return (not gagal, gagal)


def _llm(jenis: str, hasil: dict[str, Any]) -> str | None:
    endpoint = os.environ.get("SOLUNA_LLM_ENDPOINT")
    if not endpoint:
        return None
    prompt = (
        "Tulis penjelasan 3–4 kalimat dalam Bahasa Indonesia sederhana untuk pengelola desa. "
        "Jangan membuat angka baru; gunakan hanya angka yang ada di JSON.\n"
        f"Jenis: {jenis}\nJSON: {json.dumps(hasil, ensure_ascii=False)}"
    )
    req = urllib.request.Request(
        endpoint, data=json.dumps({"prompt": prompt}).encode(), headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read()).get("text")
    except Exception:
        return None


def explain(data: ExplainInput) -> dict[str, Any]:
    teks_model = _llm(data.jenis, data.hasil)
    if teks_model:
        ok, gagal = verify_numbers(teks_model, data.hasil)
        if ok:
            return {"teks": teks_model, "sumber": "model_bahasa", "cek_angka": "lolos", "angka_gagal": []}
        cadangan = template(data.jenis, data.hasil)
        return {"teks": cadangan, "sumber": "template", "cek_angka": "gagal_model_dibuang", "angka_gagal": gagal}

    teks = template(data.jenis, data.hasil)
    ok, gagal = verify_numbers(teks, data.hasil)
    return {"teks": teks, "sumber": "template", "cek_angka": "lolos" if ok else "gagal", "angka_gagal": gagal}
