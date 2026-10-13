"""Konfigurasi SOLUNA: nilai bawaan + penggabungan dengan konfigurasi aktif dari basis data.

Parameter disimpan terpisah dari logika hitung (SYS-1). Mesin hitung tidak menyimpan
state; konfigurasi aktif dikirim oleh aplikasi web pada setiap permintaan.
"""

from __future__ import annotations

import copy
import json
import math
from pathlib import Path
from typing import Any

MODEL_VERSION = "soluna-engine-0.1 / sisa-umur-empiris-0.1"

_DEFAULT_PATH = Path(__file__).with_name("default_config.json")


def default_config() -> dict[str, Any]:
    with _DEFAULT_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def merge_config(override: dict[str, Any] | None) -> dict[str, Any]:
    """Gabungkan konfigurasi aktif di atas nilai bawaan (deep merge)."""
    base = default_config()
    if not override:
        return base

    def _merge(dst: dict[str, Any], src: dict[str, Any]) -> None:
        for key, value in src.items():
            if isinstance(value, dict) and isinstance(dst.get(key), dict):
                _merge(dst[key], value)
            else:
                dst[key] = copy.deepcopy(value)

    _merge(base, override)
    return base


def ceil(x: float) -> int:
    # Toleransi kecil agar 2.0000000001 tidak dibulatkan menjadi 3.
    return int(math.ceil(x - 1e-9))


def r(x: float | None, digits: int = 2) -> float | None:
    if x is None:
        return None
    if math.isinf(x):
        return x
    return round(x, digits)


def step(label: str, rumus: str, substitusi: str, hasil: float | int | str | None, satuan: str = "") -> dict[str, Any]:
    """Satu baris 'Detail Perhitungan' yang dapat dilihat pengguna (NF-9)."""
    return {"label": label, "rumus": rumus, "substitusi": substitusi, "hasil": hasil, "satuan": satuan}


def fmt(x: float, digits: int = 2) -> str:
    """Format angka gaya Indonesia (koma desimal) untuk teks substitusi."""
    if math.isinf(x):
        return "tak terbatas"
    s = f"{x:,.{digits}f}"
    s = s.replace(",", "_").replace(".", ",").replace("_", ".")
    if "," in s:
        s = s.rstrip("0").rstrip(",")
    return s
