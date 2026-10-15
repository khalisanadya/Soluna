"""Modul B1 — Perencana Desa. Seluruh keluaran adalah rumus deterministik (bagian 5)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from .config import MODEL_VERSION, ceil, fmt, r, step


class PaketInput(BaseModel):
    kapasitas_kwh: float | None = Field(default=None, gt=0)
    soh: float | None = Field(default=None, gt=0, le=1)  # fraksi, 0,7 = 70%
    tegangan_nominal_v: float | None = Field(default=None, gt=0)
    sumber: Literal["bawaan", "baterai"] = "bawaan"
    nama: str | None = None


class PlanInput(BaseModel):
    jumlah_rumah: int = Field(gt=0, le=100_000)
    konsumsi_per_rumah_kwh: float = Field(gt=0, le=100)
    porsi_malam: float = Field(ge=0, le=1)
    jenis_beban: list[str] = []
    lokasi: str | None = None
    psh_jam: float | None = Field(default=None, gt=0, le=12)
    pr: float | None = Field(default=None, gt=0, le=1)
    efisiensi: float | None = Field(default=None, gt=0, le=1)
    dod: float | None = Field(default=None, gt=0, le=1)
    hari_cadangan: int | None = Field(default=None, ge=0, le=10)
    kapasitas_per_panel_wp: float | None = Field(default=None, gt=0)
    paket: PaketInput = PaketInput()
    periode_hari: int = Field(default=30, gt=0, le=366)


def ukuran_paket(e_malam: float, kap: float, soh: float, dod: float, hari_cadangan: int) -> tuple[float, int, int]:
    """Rumus ukuran paket (laporan bagian 8), dipakai Perencana dan Pencocokan.

    C_pakai = kapasitas × SoH × DoD; N_siklus = ceil(E_malam / C_pakai);
    N_paket = N_siklus × (1 + hari cadangan).
    """
    c_pakai = kap * soh * dod
    n_siklus = ceil(e_malam / c_pakai)
    return c_pakai, n_siklus, n_siklus * (1 + hari_cadangan)


def plan(data: PlanInput, cfg: dict[str, Any]) -> dict[str, Any]:
    bawaan: list[str] = []

    def pick(value, default, label):
        if value is None:
            bawaan.append(label)
            return default
        return value

    psh_default = cfg["lokasi_psh"].get(data.lokasi or "", cfg["surya"]["psh_jam"])
    psh = pick(data.psh_jam, psh_default, "PSH (dari lokasi)" if data.lokasi in cfg["lokasi_psh"] else "PSH")
    pr = pick(data.pr, cfg["surya"]["pr"], "PR")
    eta = pick(data.efisiensi, cfg["efisiensi"], "Efisiensi")
    dod = pick(data.dod, cfg["dod"], "DoD")
    hari_cadangan = pick(data.hari_cadangan, cfg["hari_cadangan"], "Hari cadangan")
    wp_panel = pick(data.kapasitas_per_panel_wp, cfg["surya"]["kapasitas_per_panel_wp"], "Kapasitas per panel")
    kap = pick(data.paket.kapasitas_kwh, cfg["profil_paket"]["kapasitas_kwh"], "Kapasitas paket")
    soh = pick(data.paket.soh, cfg["profil_paket"]["soh"], "SoH paket")
    c_rate = cfg["profil_paket"]["c_rate_maks"]

    L: list[dict[str, Any]] = []

    e_harian = data.jumlah_rumah * data.konsumsi_per_rumah_kwh
    L.append(step("Kebutuhan harian", "E_harian = jumlah rumah × konsumsi per rumah",
                  f"{data.jumlah_rumah} × {fmt(data.konsumsi_per_rumah_kwh)}", r(e_harian), "kWh"))

    e_malam = e_harian * data.porsi_malam / eta
    L.append(step("Kebutuhan malam", "E_malam = E_harian × porsi malam / η",
                  f"{fmt(e_harian)} × {fmt(data.porsi_malam)} / {fmt(eta)}", r(e_malam), "kWh"))

    c_pakai, n_siklus, n_paket = ukuran_paket(e_malam, kap, soh, dod, hari_cadangan)
    L.append(step("Kapasitas terpakai per paket", "C_pakai = kapasitas × SoH × DoD",
                  f"{fmt(kap)} × {fmt(soh)} × {fmt(dod)}", r(c_pakai), "kWh"))

    L.append(step("Paket untuk siklus harian", "N_siklus = ceil(E_malam / C_pakai)",
                  f"ceil({fmt(e_malam)} / {fmt(c_pakai)})", n_siklus, "paket"))

    L.append(step("Paket dengan cadangan", "N_paket = N_siklus × (1 + hari cadangan)",
                  f"{n_siklus} × (1 + {hari_cadangan})", n_paket, "paket"))

    p_panel = e_harian / (psh * pr)
    L.append(step("Kapasitas panel", "P_panel = E_harian / (PSH × PR)",
                  f"{fmt(e_harian)} / ({fmt(psh)} × {fmt(pr)})", r(p_panel), "kWp"))

    jumlah_panel = ceil(p_panel * 1000 / wp_panel)
    kwp_terpasang = jumlah_panel * wp_panel / 1000
    L.append(step("Jumlah panel", "ceil(P_panel / kapasitas per panel)",
                  f"ceil({fmt(p_panel)} kWp / {fmt(wp_panel / 1000, 3)} kWp)", jumlah_panel, "panel"))

    produksi_surya = kwp_terpasang * psh * pr
    L.append(step("Estimasi produksi surya", "kWp terpasang × PSH × PR",
                  f"{fmt(kwp_terpasang)} × {fmt(psh)} × {fmt(pr)}", r(produksi_surya), "kWh/hari"))

    e_tersedia = n_paket * kap * soh * dod
    L.append(step("Energi baterai tersedia", "E_tersedia = N_paket × kapasitas × SoH × DoD",
                  f"{n_paket} × {fmt(kap)} × {fmt(soh)} × {fmt(dod)}", r(e_tersedia), "kWh"))

    # P-6: pemeriksaan energi (kWh) dan daya puncak (kW).
    daya_puncak = e_harian / 24 * cfg["faktor_beban_puncak"]
    L.append(step("Daya puncak", "E_harian / 24 × faktor beban puncak",
                  f"{fmt(e_harian)} / 24 × {fmt(cfg['faktor_beban_puncak'])}", r(daya_puncak), "kW"))
    kebutuhan_inverter = daya_puncak * cfg["faktor_keamanan_inverter"]
    ukuran = sorted(cfg["ukuran_inverter_kw"])
    inverter_kw = next((s for s in ukuran if s >= kebutuhan_inverter), ceil(kebutuhan_inverter))
    L.append(step("Rekomendasi inverter", "ukuran standar ≥ daya puncak × faktor keamanan",
                  f"{fmt(daya_puncak)} × {fmt(cfg['faktor_keamanan_inverter'])} = {fmt(kebutuhan_inverter)} kW", inverter_kw, "kW"))
    daya_baterai = n_paket * kap * soh * c_rate
    cek_energi = n_siklus * c_pakai >= e_malam - 1e-9
    cek_daya = daya_baterai >= daya_puncak
    pemeriksaan = [
        {
            "nama": "Kapasitas energi",
            "lulus": cek_energi,
            "keterangan": f"Kapasitas terpakai {n_siklus} paket siklus harian ({fmt(n_siklus * c_pakai)} kWh) "
            f"{'mencukupi' if cek_energi else 'tidak mencukupi'} kebutuhan malam {fmt(e_malam)} kWh.",
        },
        {
            "nama": "Daya puncak baterai",
            "lulus": cek_daya,
            "keterangan": f"Daya keluaran baterai {fmt(daya_baterai)} kW (C-rate {fmt(c_rate)}) "
            f"{'mencukupi' if cek_daya else 'tidak mencukupi'} daya puncak {fmt(daya_puncak)} kW.",
        },
        {
            "nama": "Batas pengosongan",
            "lulus": True,
            "keterangan": f"Baterai hanya dikosongkan sampai {fmt(dod * 100)}% dari kapasitas sehatnya (DoD).",
        },
    ]

    # P-8, P-9: diesel dan CO2 per periode.
    d = cfg["diesel"]
    energi_periode = e_harian * data.periode_hari
    liter = energi_periode / d["kwh_per_liter"]
    co2_kg = liter * d["faktor_emisi_kg_per_liter"]
    L.append(step("Diesel dihemat per periode", "energi disuplai sistem / kWh per liter",
                  f"{fmt(energi_periode)} / {fmt(d['kwh_per_liter'])}", r(liter), "liter"))
    L.append(step("CO₂ dihindari per periode", "liter diesel hemat × faktor emisi",
                  f"{fmt(liter)} × {fmt(d['faktor_emisi_kg_per_liter'])}", r(co2_kg), "kg"))

    # P-10: biaya per rumah dibanding diesel (rentang rendah–tinggi).
    pp = cfg["profil_paket"]
    s = cfg["surya"]

    def biaya_sistem(level: str) -> float:
        baterai = n_paket * kap * pp[f"harga_per_kwh_{level}"]
        panel = kwp_terpasang * s[f"harga_per_kwp_{level}"]
        inverter = inverter_kw * cfg["harga_inverter_per_kw"]
        return (baterai + panel + inverter) * (1 + cfg["biaya_lain_persen"])

    investasi = {"rendah": biaya_sistem("rendah"), "tinggi": biaya_sistem("tinggi")}
    faktor_periode = data.periode_hari / 365

    def biaya_per_rumah(level: str) -> float:
        tahunan = investasi[level] / cfg["umur_sistem_tahun"] + investasi[level] * cfg["perawatan_persen_per_tahun"]
        return tahunan * faktor_periode / data.jumlah_rumah

    sistem_per_rumah = {"rendah": biaya_per_rumah("rendah"), "tinggi": biaya_per_rumah("tinggi")}
    diesel_per_rumah = {
        "rendah": liter * d["harga_per_liter_rendah"] / data.jumlah_rumah,
        "tinggi": liter * d["harga_per_liter_tinggi"] / data.jumlah_rumah,
    }
    L.append(step("Biaya sistem per rumah per periode",
                  "(investasi / umur sistem + perawatan tahunan) × (periode / 365) / jumlah rumah",
                  f"investasi Rp{fmt(investasi['rendah'], 0)}–Rp{fmt(investasi['tinggi'], 0)}, umur {cfg['umur_sistem_tahun']} tahun",
                  f"Rp{fmt(sistem_per_rumah['rendah'], 0)}–Rp{fmt(sistem_per_rumah['tinggi'], 0)}", "per rumah"))
    L.append(step("Biaya diesel per rumah per periode", "(liter × harga diesel) / jumlah rumah",
                  f"{fmt(liter)} × Rp{fmt(d['harga_per_liter_rendah'], 0)}–Rp{fmt(d['harga_per_liter_tinggi'], 0)} / {data.jumlah_rumah}",
                  f"Rp{fmt(diesel_per_rumah['rendah'], 0)}–Rp{fmt(diesel_per_rumah['tinggi'], 0)}", "per rumah"))

    # D-5 (Could): iuran perawatan per rumah per bulan.
    iuran = {
        lvl: (investasi[lvl] * cfg["perawatan_persen_per_tahun"] + n_paket * kap * pp[f"harga_per_kwh_{lvl}"] / cfg["umur_sistem_tahun"])
        / 12
        / data.jumlah_rumah
        for lvl in ("rendah", "tinggi")
    }

    return {
        "ringkasan": {
            "kebutuhan_harian_kwh": r(e_harian),
            "kebutuhan_malam_kwh": r(e_malam),
            "kapasitas_terpakai_per_paket_kwh": r(c_pakai),
            "paket_siklus_harian": n_siklus,
            "jumlah_paket": n_paket,
            "kapasitas_baterai_total_kwh": r(n_paket * kap),
            "energi_tersedia_kwh": r(e_tersedia),
            "kapasitas_panel_kwp": r(p_panel),
            "kapasitas_panel_terpasang_kwp": r(kwp_terpasang),
            "jumlah_panel": jumlah_panel,
            "produksi_surya_harian_kwh": r(produksi_surya),
            "daya_puncak_kw": r(daya_puncak),
            "inverter_kw": inverter_kw,
        },
        "parameter": {
            "psh_jam": psh, "pr": pr, "efisiensi": eta, "dod": dod, "hari_cadangan": hari_cadangan,
            "kapasitas_per_panel_wp": wp_panel, "kapasitas_paket_kwh": kap, "soh_paket": soh,
            "periode_hari": data.periode_hari, "nama_paket": data.paket.nama or cfg["profil_paket"]["nama"],
            "sumber_paket": data.paket.sumber,
        },
        "pemeriksaan": pemeriksaan,
        "lingkungan": {"diesel_hemat_liter": r(liter), "co2_dihindari_kg": r(co2_kg), "periode_hari": data.periode_hari},
        "biaya": {
            "investasi": {k: r(v, 0) for k, v in investasi.items()},
            "sistem_per_rumah": {k: r(v, 0) for k, v in sistem_per_rumah.items()},
            "diesel_per_rumah": {k: r(v, 0) for k, v in diesel_per_rumah.items()},
            "iuran_perawatan_per_rumah_bulan": {k: r(v, 0) for k, v in iuran.items()},
            "periode_hari": data.periode_hari,
        },
        "nilai_bawaan": bawaan,
        "langkah": L,
        "versi_model": MODEL_VERSION,
    }
