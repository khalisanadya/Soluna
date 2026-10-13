"""Test case penerimaan dari proposal (bagian 6.1). Toleransi "sekitar": ±5%."""

import pytest
from fastapi.testclient import TestClient

from main import app
from soluna_engine.assessment import AssessmentInput, assess, grade_for
from soluna_engine.config import default_config
from soluna_engine.explain import explain, ExplainInput, verify_numbers
from soluna_engine.planner import PaketInput, PlanInput, plan
from soluna_engine.resilience import ResilienceInput, simulate

CFG = default_config()
TOL = 0.05


def approx(expected):
    return pytest.approx(expected, rel=TOL)


@pytest.fixture(scope="module")
def rencana():
    return plan(
        PlanInput(
            jumlah_rumah=50,
            konsumsi_per_rumah_kwh=1,
            porsi_malam=0.6,
            efisiensi=0.9,
            psh_jam=4,
            pr=0.75,
            dod=0.8,
            hari_cadangan=1,
            paket=PaketInput(kapasitas_kwh=50, soh=0.7),
        ),
        CFG,
    )


def test_kebutuhan_malam(rencana):
    assert rencana["ringkasan"]["kebutuhan_malam_kwh"] == approx(33)


def test_kapasitas_terpakai_per_paket(rencana):
    assert rencana["ringkasan"]["kapasitas_terpakai_per_paket_kwh"] == approx(28)


def test_paket_siklus_harian(rencana):
    assert rencana["ringkasan"]["paket_siklus_harian"] == 2


def test_paket_dengan_cadangan(rencana):
    assert rencana["ringkasan"]["jumlah_paket"] == approx(4)


def test_kapasitas_panel(rencana):
    assert rencana["ringkasan"]["kapasitas_panel_kwp"] == approx(17)


def test_energi_tersedia(rencana):
    assert rencana["ringkasan"]["energi_tersedia_kwh"] == approx(112)


def _ketahanan(faktor_beban: float):
    return simulate(
        ResilienceInput(
            beban_harian_kwh=50,
            jumlah_paket=4,
            kapasitas_kwh=50,
            soh=0.7,
            dod=0.8,
            efisiensi=0.9,
            psh_jam=4,
            pr=0.75,
            kapasitas_panel_kwp=16.7,
            skenario="hujan_beberapa_hari",  # hujan berat: produksi panel = 0
            faktor_beban=faktor_beban,
            pelepasan_beban=False,
        ),
        CFG,
    )


def _hujan(hasil):
    return next(s for s in hasil["skenario"] if s["kunci"] == "hujan_beberapa_hari")


def test_ketahanan_beban_penuh():
    s = _hujan(_ketahanan(1.0))
    assert s["produksi_panel_kwh"] == 0
    assert s["lama_bertahan_hari"] == approx(2)


def test_ketahanan_beban_turun_50():
    # 4 × 28 × 0,9 / 25
    assert _hujan(_ketahanan(0.5))["lama_bertahan_hari"] == approx(4)


def test_grade_paket_b():
    hasil = assess(AssessmentInput(kapasitas_awal_kwh=50, kapasitas_aktual_kwh=35), CFG)
    assert hasil["soh"] == pytest.approx(70)
    assert hasil["grade"] == "B"
    assert hasil["keputusan"] == "Dipakai pada tingkat modul"


# --- Uji pendukung ---------------------------------------------------------


@pytest.mark.parametrize(
    "soh,grade", [(100, "A"), (80, "A"), (79.99, "B"), (70, "B"), (69.9, "C"), (60, "C"), (59.9, "D"), (0, "D")]
)
def test_batas_grade(soh, grade):
    assert grade_for(soh, CFG) == grade


def test_pelepasan_beban_menambah_lama_bertahan():
    base = simulate(ResilienceInput(beban_harian_kwh=50, jumlah_paket=4, kapasitas_kwh=50, soh=0.7,
                                    kapasitas_panel_kwp=0, pelepasan_beban=True), CFG)
    s = _hujan(base)
    assert s["lama_bertahan_pelepasan_hari"] > s["lama_bertahan_hari"]
    lv = s["lama_per_tingkat_hari"]
    assert lv["kritis_saja"] > lv["tanpa_kenyamanan"] > lv["penuh"]


def test_mode_umur_baterai_memperketat_dod_soh_rendah():
    h = simulate(ResilienceInput(beban_harian_kwh=50, jumlah_paket=4, kapasitas_kwh=50, soh=0.65,
                                 kapasitas_panel_kwp=17, prioritas="umur_baterai_maksimum"), CFG)
    assert h["dod_efektif"] == pytest.approx(0.5)


def test_produksi_cukup_tidak_terbatas():
    h = simulate(ResilienceInput(beban_harian_kwh=10, jumlah_paket=1, kapasitas_kwh=50, soh=0.7,
                                 kapasitas_panel_kwp=17, skenario="normal"), CFG)
    normal = next(s for s in h["skenario"] if s["kunci"] == "normal")
    assert normal["lama_bertahan_hari"] == float("inf")


def test_data_minimal_keyakinan_lebih_rendah():
    lengkap = assess(AssessmentInput(kapasitas_awal_kwh=50, kapasitas_aktual_kwh=35, usia_tahun=6, jumlah_siklus=1200,
                                     hambatan_internal_mohm=45, jenis_kimia="NMC", kedalaman_pengosongan=0.8,
                                     frekuensi_pengisian_cepat=0.3, suhu_rata_c=30), CFG)
    minimal = assess(AssessmentInput(kapasitas_awal_kwh=50), CFG)
    assert minimal["keyakinan"] < lengkap["keyakinan"]
    assert "Kapasitas aktual" in minimal["nilai_bawaan"]
    su = lengkap["sisa_umur"]
    assert su["bawah"] <= su["tengah"] <= su["atas"]


def test_deterministik(rencana):
    again = plan(PlanInput(jumlah_rumah=50, konsumsi_per_rumah_kwh=1, porsi_malam=0.6, efisiensi=0.9, psh_jam=4, pr=0.75,
                           dod=0.8, hari_cadangan=1, paket=PaketInput(kapasitas_kwh=50, soh=0.7)), CFG)
    assert again == rencana


def test_penjelasan_lolos_cek_angka(rencana):
    out = explain(ExplainInput(jenis="perencanaan", hasil=rencana))
    assert out["cek_angka"] == "lolos", out


def test_cek_angka_menolak_angka_karangan(rencana):
    ok, gagal = verify_numbers("Desa ini butuh 999 kWh per hari.", rencana)
    assert not ok and "999" in gagal


def test_api_end_to_end():
    client = TestClient(app)
    res = client.post("/plan", json={"input": {"jumlah_rumah": 50, "konsumsi_per_rumah_kwh": 1, "porsi_malam": 0.6}})
    assert res.status_code == 200
    assert res.json()["ringkasan"]["paket_siklus_harian"] == 2
    res = client.post("/resilience", json={"input": {"beban_harian_kwh": 50, "jumlah_paket": 4, "kapasitas_kwh": 50,
                                                     "soh": 0.7, "kapasitas_panel_kwp": 0, "skenario": "normal"}})
    assert res.status_code == 200
    normal = next(s for s in res.json()["skenario"] if s["kunci"] == "normal")
    assert normal["lama_bertahan_hari"] == approx(2)
