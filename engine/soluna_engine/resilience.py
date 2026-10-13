"""Modul B2 — Ketahanan Desa.

Lama bertahan, jam genset, dan pelepasan beban bertingkat dihitung dengan rumus
deterministik (bagian 5). Simulasi per jam hanya ilustrasi visual (K-11, K-12);
sistem tidak mengendalikan beban nyata.
"""

from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, Field

from .config import MODEL_VERSION, fmt, r, step

Prioritas = Literal["hemat_diesel", "ketahanan_maksimum", "umur_baterai_maksimum"]

PRIORITAS_LABEL = {
    "hemat_diesel": "Hemat diesel",
    "ketahanan_maksimum": "Ketahanan maksimum",
    "umur_baterai_maksimum": "Umur baterai maksimum",
}


class ResilienceInput(BaseModel):
    beban_harian_kwh: float = Field(gt=0)
    jumlah_paket: int = Field(gt=0, le=1000)
    kapasitas_kwh: float = Field(gt=0)
    soh: float = Field(gt=0, le=1)
    kapasitas_panel_kwp: float = Field(ge=0)
    psh_jam: float | None = Field(default=None, gt=0, le=12)
    pr: float | None = Field(default=None, gt=0, le=1)
    efisiensi: float | None = Field(default=None, gt=0, le=1)
    porsi_malam: float = Field(default=0.6, ge=0, le=1)
    prioritas: Prioritas = "hemat_diesel"
    dod: float | None = Field(default=None, gt=0, le=1)
    skenario: str = "hujan_beberapa_hari"
    faktor_beban: float = Field(default=1.0, gt=0, le=1)
    pelepasan_beban: bool = True
    periode_hari: int | None = Field(default=None, gt=0, le=14)


def _effective_dod(data: ResilienceInput, cfg: dict[str, Any]) -> tuple[float, str]:
    if data.dod is not None:
        return data.dod, "DoD diisi manual."
    dod = cfg["dod_prioritas"][data.prioritas]
    alasan = f"DoD mode {PRIORITAS_LABEL[data.prioritas]}: {fmt(dod * 100)}%."
    if data.prioritas == "umur_baterai_maksimum" and data.soh * 100 < cfg["ambang_soh_rendah"]:
        dod = max(0.3, dod - cfg["dod_pengurangan_soh_rendah"])
        alasan += (
            f" SoH {fmt(data.soh * 100)}% di bawah {fmt(cfg['ambang_soh_rendah'])}%, "
            f"batas diperketat menjadi {fmt(dod * 100)}% untuk melindungi baterai."
        )
    return dod, alasan


def _days(energy: float, eta: float, load: float, prod: float) -> float:
    net = load - prod
    if net <= 1e-9:
        return math.inf
    return energy * eta / net


def _staged_days(energy: float, eta: float, loads: dict[str, float], prod: float, thr: dict[str, float]) -> float:
    """Pelepasan bertingkat: penuh → tanpa kenyamanan (di bawah ambang) → kritis saja."""
    t_k, t_p = thr["kenyamanan"], thr["penting"]
    segments = [
        (1 - t_k, loads["penuh"]),
        (t_k - t_p, loads["tanpa_kenyamanan"]),
        (t_p, loads["kritis_saja"]),
    ]
    total = 0.0
    for frac, load in segments:
        d = _days(energy * frac, eta, load, prod)
        if math.isinf(d):
            return math.inf
        total += d
    return total


def _genset_hours(load: float, energy: float, eta: float, prod: float, period: float, genset_kw: float) -> float:
    deficit = max(0.0, load * period - energy * eta - prod * period)
    return deficit / genset_kw


def _hourly(
    data: ResilienceInput,
    cfg: dict[str, Any],
    energy: float,
    eta: float,
    loads: dict[str, float],
    prod_daily: float,
    period: int,
    shedding: bool,
) -> dict[str, Any]:
    """Simulasi per jam (ilustrasi) untuk grafik dan log 'Apa yang Dilakukan Sistem'."""
    thr = cfg["ambang_pelepasan"]
    genset_kw = cfg["diesel"]["daya_genset_kw"]
    sun_hours = list(range(6, 18))
    weights = [math.sin(math.pi * (h - 6 + 0.5) / 12) for h in sun_hours]
    wsum = sum(weights)

    soc = energy
    jam, surya, beban, soc_pct, genset, tingkat = [], [], [], [], [], []
    log: list[dict[str, Any]] = []
    level = "penuh"
    flags = {"k50": False, "k25": False, "habis": False}
    genset_on = False
    disuplai_sistem = 0.0
    total_genset_kwh = 0.0

    def waktu(i: int) -> str:
        return f"Hari {i // 24 + 1}, {i % 24:02d}:00"

    for i in range(period * 24):
        h = i % 24
        pv = prod_daily * weights[sun_hours.index(h)] / wsum if h in sun_hours else 0.0
        frac = soc / energy if energy > 0 else 0
        new_level = "penuh"
        if shedding:
            if frac <= thr["penting"]:
                new_level = "kritis_saja"
            elif frac <= thr["kenyamanan"]:
                new_level = "tanpa_kenyamanan"
        if new_level != level:
            if new_level == "tanpa_kenyamanan":
                log.append({"jam": i, "waktu": waktu(i), "jenis": "tunda",
                            "pesan": f"Cadangan {fmt(frac * 100, 0)}%: beban Kenyamanan (televisi, kipas) ditunda."})
            elif new_level == "kritis_saja":
                log.append({"jam": i, "waktu": waktu(i), "jenis": "tunda",
                            "pesan": f"Cadangan {fmt(frac * 100, 0)}%: beban Penting (pompa air, pengisian daya) ditunda. Hanya beban Kritis menyala."})
            else:
                log.append({"jam": i, "waktu": waktu(i), "jenis": "pulih",
                            "pesan": "Cadangan pulih dari produksi surya: semua beban dinyalakan kembali."})
            level = new_level

        is_night = h >= 18 or h < 6
        share = data.porsi_malam / 12 if is_night else (1 - data.porsi_malam) / 12
        load_h = loads[level] * share

        net = pv - load_h
        g = 0.0
        if net >= 0:
            soc = min(energy, soc + net * eta)
            disuplai_sistem += load_h
        else:
            need = -net / eta
            if soc >= need:
                soc -= need
                disuplai_sistem += load_h
            else:
                delivered = soc * eta
                soc = 0.0
                g = -net - delivered
                disuplai_sistem += load_h - g

        if g > 0 and not genset_on:
            log.append({"jam": i, "waktu": waktu(i), "jenis": "genset",
                        "pesan": f"Baterai habis: genset menyala untuk menutup kekurangan {fmt(g)} kWh/jam."})
            genset_on = True
        elif g == 0 and genset_on:
            log.append({"jam": i, "waktu": waktu(i), "jenis": "genset", "pesan": "Genset dimatikan, sistem kembali ke surya dan baterai."})
            genset_on = False
        total_genset_kwh += g

        pct = soc / energy * 100 if energy > 0 else 0
        if pct <= 50 and not flags["k50"]:
            flags["k50"] = True
            log.append({"jam": i, "waktu": waktu(i), "jenis": "peringatan", "pesan": "Peringatan: cadangan baterai di bawah 50%."})
        if pct <= 25 and not flags["k25"]:
            flags["k25"] = True
            log.append({"jam": i, "waktu": waktu(i), "jenis": "peringatan", "pesan": "Peringatan: cadangan baterai di bawah 25%."})

        jam.append(i)
        surya.append(r(pv, 3))
        beban.append(r(load_h, 3))
        soc_pct.append(r(pct, 1))
        genset.append(r(g, 3))
        tingkat.append(level)

    liter = disuplai_sistem / cfg["diesel"]["kwh_per_liter"]
    log.append({"jam": period * 24 - 1, "waktu": waktu(period * 24 - 1), "jenis": "hemat",
                "pesan": f"Selama {period} hari, surya dan baterai menyuplai {fmt(disuplai_sistem)} kWh: setara {fmt(liter)} liter diesel dihemat."})

    return {
        "jam": jam, "surya_kwh": surya, "beban_kwh": beban, "soc_persen": soc_pct, "genset_kwh": genset, "tingkat": tingkat,
        "log": log, "genset_total_kwh": r(total_genset_kwh), "jam_genset": r(total_genset_kwh / genset_kw),
        "diesel_hemat_liter": r(liter),
        "catatan": "Simulasi per jam adalah ilustrasi. Sistem tidak mengendalikan beban nyata.",
    }


def simulate(data: ResilienceInput, cfg: dict[str, Any]) -> dict[str, Any]:
    bawaan: list[str] = []
    eta = data.efisiensi if data.efisiensi is not None else (bawaan.append("Efisiensi") or cfg["efisiensi"])
    psh = data.psh_jam if data.psh_jam is not None else (bawaan.append("PSH") or cfg["surya"]["psh_jam"])
    pr = data.pr if data.pr is not None else (bawaan.append("PR") or cfg["surya"]["pr"])
    period = data.periode_hari or cfg["periode_simulasi_hari"]
    genset_kw = cfg["diesel"]["daya_genset_kw"]
    tb = cfg["tingkat_beban"]
    thr = cfg["ambang_pelepasan"]

    dod, alasan_dod = _effective_dod(data, cfg)
    L: list[dict[str, Any]] = []

    energy = data.jumlah_paket * data.kapasitas_kwh * data.soh * dod
    L.append(step("Energi baterai tersedia", "jumlah paket × kapasitas × SoH × batas pengosongan",
                  f"{data.jumlah_paket} × {fmt(data.kapasitas_kwh)} × {fmt(data.soh)} × {fmt(dod)}", r(energy), "kWh"))

    load = data.beban_harian_kwh * data.faktor_beban
    if data.faktor_beban < 1:
        L.append(step("Beban rata-rata", "beban harian × faktor beban",
                      f"{fmt(data.beban_harian_kwh)} × {fmt(data.faktor_beban)}", r(load), "kWh/hari"))
    loads = {
        "penuh": load,
        "tanpa_kenyamanan": load * (tb["kritis"]["porsi"] + tb["penting"]["porsi"]),
        "kritis_saja": load * tb["kritis"]["porsi"],
    }
    produksi_normal = data.kapasitas_panel_kwp * psh * pr
    L.append(step("Produksi panel (normal)", "kWp × PSH × PR",
                  f"{fmt(data.kapasitas_panel_kwp)} × {fmt(psh)} × {fmt(pr)}", r(produksi_normal), "kWh/hari"))

    skenario_hasil = []
    for key, sc in cfg["skenario_cuaca"].items():
        prod = produksi_normal * sc["faktor"]
        tanpa = _days(energy, eta, load, prod)
        dengan = _staged_days(energy, eta, loads, prod, thr)
        per_tingkat = {k: _days(energy, eta, v, prod) for k, v in loads.items()}
        jam_tanpa = _genset_hours(load, energy, eta, prod, period, genset_kw)
        if dengan >= period:
            jam_dengan = 0.0
        else:
            jam_dengan = (period - dengan) * max(0.0, loads["kritis_saja"] - prod) / genset_kw
        skenario_hasil.append({
            "kunci": key,
            "label": sc["label"],
            "faktor_produksi": sc["faktor"],
            "produksi_panel_kwh": r(produksi_normal * sc["faktor"]),
            "lama_bertahan_hari": r(tanpa),
            "lama_bertahan_pelepasan_hari": r(dengan),
            "lama_per_tingkat_hari": {k: r(v) for k, v in per_tingkat.items()},
            "jam_genset": r(jam_tanpa, 1),
            "jam_genset_pelepasan": r(jam_dengan, 1),
            "cukup": tanpa >= period,
            "cukup_pelepasan": dengan >= period,
        })

    terpilih = next((s for s in skenario_hasil if s["kunci"] == data.skenario), skenario_hasil[-1])
    prod_sel = terpilih["produksi_panel_kwh"]
    L.append(step(f"Produksi panel ({terpilih['label']})", "produksi normal × faktor skenario",
                  f"{fmt(produksi_normal)} × {fmt(terpilih['faktor_produksi'])}", prod_sel, "kWh/hari"))
    L.append(step("Lama bertahan (tanpa pelepasan)", "E_tersedia × η / (beban harian − produksi panel)",
                  f"{fmt(energy)} × {fmt(eta)} / ({fmt(load)} − {fmt(prod_sel)})",
                  terpilih["lama_bertahan_hari"] if not math.isinf(terpilih["lama_bertahan_hari"]) else "tidak terbatas", "hari"))
    L.append(step("Lama bertahan (pelepasan bertingkat)",
                  f"Σ energi segmen × η / (beban segmen − produksi); Kenyamanan dilepas di {fmt(thr['kenyamanan'] * 100)}%, Penting di {fmt(thr['penting'] * 100)}%",
                  f"beban {fmt(loads['penuh'])} → {fmt(loads['tanpa_kenyamanan'])} → {fmt(loads['kritis_saja'])} kWh/hari",
                  terpilih["lama_bertahan_pelepasan_hari"] if not math.isinf(terpilih["lama_bertahan_pelepasan_hari"]) else "tidak terbatas", "hari"))
    L.append(step("Jam genset", "max(0, beban periode − E_tersedia × η − produksi panel) / daya genset",
                  f"max(0; {fmt(load)} × {period} − {fmt(energy)} × {fmt(eta)} − {fmt(prod_sel)} × {period}) / {fmt(genset_kw)}",
                  terpilih["jam_genset"], "jam"))

    peringatan = []
    if not (terpilih["cukup_pelepasan"] if data.pelepasan_beban else terpilih["cukup"]):
        d = terpilih["lama_bertahan_pelepasan_hari"] if data.pelepasan_beban else terpilih["lama_bertahan_hari"]
        peringatan.append(
            f"Energi tidak cukup untuk {period} hari pada skenario {terpilih['label'].lower()}: "
            f"baterai bertahan sekitar {fmt(d, 1)} hari. Siapkan genset sekitar "
            f"{fmt(terpilih['jam_genset_pelepasan'] if data.pelepasan_beban else terpilih['jam_genset'], 1)} jam."
        )

    hourly = _hourly(data, cfg, energy, eta, loads, prod_sel, period, data.pelepasan_beban)

    return {
        "dod_efektif": dod,
        "alasan_dod": alasan_dod,
        "prioritas": data.prioritas,
        "prioritas_label": PRIORITAS_LABEL[data.prioritas],
        "energi_tersedia_kwh": r(energy),
        "beban_kwh": {k: r(v) for k, v in loads.items()},
        "produksi_normal_kwh": r(produksi_normal),
        "periode_hari": period,
        "skenario": skenario_hasil,
        "terpilih": terpilih["kunci"],
        "peringatan": peringatan,
        "tingkat_beban": [
            {"kunci": k, "label": v["label"], "porsi": v["porsi"], "perangkat": v["perangkat"], "penjelasan": v["penjelasan"],
             "beban_kwh": r(load * v["porsi"])}
            for k, v in tb.items()
        ],
        "ambang_pelepasan": thr,
        "per_jam": hourly,
        "nilai_bawaan": bawaan,
        "langkah": L,
        "versi_model": MODEL_VERSION,
    }
