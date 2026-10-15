# SOLUNA

Platform web untuk pengelola desa dan petugas teknis: menilai baterai bekas kendaraan listrik, merencanakan sistem surya + baterai, mensimulasikan ketahanan energi desa saat cuaca buruk, memeriksa kompatibilitas, dan memantau siklus hidup baterai.

```
Next.js (React, TypeScript, Tailwind)  ──►  FastAPI (Python)  ──►  Mesin hitung deterministik
          │                                                         engine/soluna_engine
          └──── Prisma ──► PostgreSQL
```

- **Angka penting selalu dari mesin hitung Python** (`engine/`). UI tidak menghitung SoH, grade, paket, panel, ketahanan, atau biaya.
- **Model bahasa hanya menjelaskan** hasil. Setiap angka di penjelasan dicek otomatis terhadap JSON hasil; bila gagal, dipakai template.
- **Konfigurasi terpisah dan berversi** (tabel `Konfigurasi`). Setiap hasil menyimpan versi konfigurasi dan versi model.

## Menjalankan

Prasyarat: Node 22+, Python 3.11+, PostgreSQL.

```bash
npm install
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install -r engine/requirements.txt   # macOS/Linux: engine/.venv/bin/python

# .env
DATABASE_URL="postgresql://postgres:<sandi>@localhost:5432/soluna?schema=public"
SESSION_SECRET="<string acak panjang>"
ENGINE_URL="http://127.0.0.1:8000"
# opsional: SOLUNA_LLM_ENDPOINT (model bahasa penjelasan)
# model baterai terlatih (wajib untuk penilaian): NEXT_PUBLIC_API_URL, BATTERY_API_KEY

npm run db:migrate          # buat tabel
npm run engine              # terminal 1: mesin hitung FastAPI di :8000
npm run db:seed             # data demo (perlu mesin hitung berjalan)
npm run dev                 # terminal 2: aplikasi web di :3000
# atau keduanya sekaligus: npm run dev:all
```

Akun demo (ilustrasi): `admin` / `soluna123` (admin), `armada` / `soluna123` (pemasok). Halaman Daftar hanya membuat akun pemasok; akun admin dibuat lewat seed/basis data.

## Uji penerimaan

```bash
npm run test:engine
```

Menjalankan test case proposal (bagian 6.1, toleransi ±5%): kebutuhan malam ≈ 33 kWh, kapasitas terpakai 28 kWh, 2 paket siklus harian, ≈ 4 paket dengan cadangan, ≈ 17 kWp, ketahanan ≈ 2 hari (beban penuh) dan ≈ 4 hari (beban 50%), grade B. Hasil yang sama juga tampil langsung di halaman **Pengaturan → Uji penerimaan**.

## Peta modul

| Modul | Halaman | Mesin hitung |
| --- | --- | --- |
| Akun & peran (AKN) | `/masuk`, `/daftar`, `proxy.ts` | – |
| Pemasok (PSK, ADM) | `/pemasok`, `/profil`, `/baterai` | – |
| A. Penilaian baterai | `/penilaian/baru`, `/penilaian/[id]` (paspor) | `assessment.py` |
| B1. Perencana desa | `/perencana`, `/perencana/[id]` | `planner.py` |
| B2. Ketahanan desa | `/ketahanan` | `resilience.py` |
| C. Kompatibilitas | `/kompatibilitas` | `compatibility.py` |
| D. Siklus hidup | `/siklus-hidup` | `lifecycle.py` |
| Penjelasan (AI) | kartu "Penjelasan sederhana" | `explain.py` |
| Konfigurasi (SYS-1) | `/pengaturan` | `default_config.json` |

## Catatan batasan

- Rentang sisa umur memakai **model empiris sementara** (`sisa-umur-empiris-0.1`), bukan model ML terlatih. Pelatihan model berada di luar lingkup; antarmukanya dapat diganti model hasil pelatihan.
- Penilaian baterai memakai model terlatih pada `NEXT_PUBLIC_API_URL` (POST `/assess`, header `x-api-key` dari `BATTERY_API_KEY`). Bila layanan model tidak tersedia, penilaian gagal secara eksplisit; SOLUNA tidak memakai prediksi umur pengganti.
- Model bahasa hanya merangkai penjelasan bila `SOLUNA_LLM_ENDPOINT` dipasang (POST `{prompt}` → `{text}`); teksnya tetap melewati cek angka.
- Semua angka contoh, harga, dan data seed adalah **ilustrasi** dan perlu dikalibrasi dengan data desa sebenarnya.
- Hasil bersifat indikatif dan tidak menggantikan pemeriksaan teknis, sertifikasi, atau jaminan keselamatan.
