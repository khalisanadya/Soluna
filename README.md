# Soluna — Dari Limbah Jadi Cerah

<br>
<div align="left">
  <img
    src="https://drive.google.com/uc?export=view&id=1wOXRjKbc67yuw6WCx_G5pjlNmEF9a0SI"
    alt="Soluna"
    width="100%"
  />
</div>
<br>

<div align="center">

**[Tonton Video Demo](https://youtu.be/HViFoydzQK0)** · **[Repositori Model Baterai](https://github.com/ladyfanning001/EV-predict)**

</div>

<br>

Soluna adalah platform web untuk pengelola listrik desa dan petugas teknis. Soluna menilai baterai bekas kendaraan listrik (EV), merencanakan sistem surya + baterai, mensimulasikan ketahanan energi desa saat cuaca buruk, memeriksa kompatibilitas, dan memantau siklus hidup baterai. Tujuannya agar desa terpencil dapat memakai **baterai bekas EV** sebagai penyimpan energi, bukan bergantung pada generator diesel. Warga desa tidak perlu mengoperasikan aplikasinya.

Sekitar 5.700 desa ditargetkan mendapat akses listrik pada 2026, kira-kira empat kali lipat dari ±1.400 desa yang terjangkau pada 2025, dan desa yang masih menunggu sering bergantung pada generator diesel yang mahal dan tidak andal. Di sisi lain, baterai EV yang dianggap pensiun pada sisa kapasitas 70–80% masih berguna sebagai penyimpan energi stasioner, tetapi belum ada jalur pemakaian ulang yang aman dan terdokumentasi. Pengelola desa tidak mudah mengetahui baterai bekas mana yang aman, berapa panel dan baterai yang dibutuhkan desanya, atau bagaimana menjaga sistem tetap berjalan setelah dipasang.

Alih-alih membiarkan pengelola menyusun sendiri penilaian, spreadsheet, dan catatan perawatan yang terpisah-pisah, Soluna menyatukan keputusan itu dalam satu alur: **nilai baterai, rencanakan sistem desa, periksa kompatibilitas dan keselamatan, lalu pantau dan rawat**. Kita tidak membutuhkan teknologi baterai baru. Yang dibutuhkan adalah penyatuan penilaian, perencanaan, dan perawatan, serta memajukannya **sebelum baterai dipasang**.

### Prinsip desain

- **Setiap angka penting selalu berasal dari mesin hitung Python** (`engine/`). Antarmuka tidak pernah menghitung SoH, grade, paket baterai, panel, ketahanan, atau biaya.
- **Model bahasa hanya menjelaskan hasil.** Setiap angka di penjelasan dicek otomatis terhadap JSON hasil; bila pengecekan gagal, dipakai template teks.
- **Konfigurasi terpisah dan berversi** (tabel `Konfigurasi`). Setiap hasil menyimpan versi konfigurasi dan versi model yang menghasilkannya.

## Latar Belakang Masalah

> **±5.700 desa** ditargetkan mendapat akses listrik pada 2026, dibanding **±1.400** yang tercapai pada 2025.
> **±15×** adalah biaya pembangkitan diesel dibanding PLTU.
> **70–80%** kapasitas biasanya masih tersisa pada baterai EV ketika dianggap pensiun.

Proyek ini menjawab tema **Sustainability** Hackathon JOINTS x INSPIRE 2026, dengan sub-tema: *desa terpencil yang belum terjangkau listrik dan masih bergantung pada generator diesel atau kayu bakar, sehingga biaya energi tinggi dan kualitas udara dalam ruangan buruk.*

Desa yang jauh dari jaringan PLN dilayani sistem surya + baterai komunal, yang tetap membutuhkan penyimpanan, perencanaan, dan perawatan jangka panjang. Sebelum itu, mereka bergantung pada generator diesel yang mahal dan tidak andal, dan pemadaman di wilayah 3T (terdepan, terluar, tertinggal) masih sering terjadi. Tiga kesenjangan menghalangi pemakaian ulang baterai bekas EV:

1. **Sulit dinilai.** Pengelola desa tidak mudah memastikan apakah baterai bekas layak dan aman dipakai.
2. **Sulit direncanakan.** Menyesuaikan panel dan baterai dengan kebutuhan desa, termasuk saat hujan berhari-hari, membutuhkan keahlian teknis yang tidak dimiliki desa.
3. **Sulit dipertahankan.** Belum ada mekanisme perawatan, penggantian, dan pembiayaan yang menjaga sistem tetap berfungsi setelah dipasang.

## Fitur Utama

### 1. Penilaian Baterai

Pemasok memasukkan data uji baterai bekas (kapasitas nominal, resistansi internal, jumlah siklus, usia, depth of discharge, rasio pengisian cepat, suhu, kimia baterai). Soluna menghasilkan:

- **State of Health (SoH)** berupa rentang prediksi (batas bawah / median / batas atas pada tingkat 80%), dari model baterai terlatih
- **Grade A–D** (ambang SoH 80%, 70%, dan 60%)
- **Skor keyakinan** (tinggi / sedang / rendah), berdasarkan lebar rentang dan kelengkapan input
- **Estimasi sisa umur** berupa rentang
- **Paspor baterai**, catatan kondisi dan riwayat baterai

### 2. Perencanaan dan Ketahanan Desa

Pengelola desa memasukkan data desa dan biaya diesel saat ini. Soluna menghitung:

- Jumlah **panel surya dan paket baterai** yang dibutuhkan
- **Perbandingan biaya dengan diesel**, termasuk **periode balik modal (break-even)** dan usulan **iuran komunitas**
- **Ketahanan saat cuaca buruk**: berapa lama desa tetap menyala saat mendung atau hujan berkepanjangan, dengan melepas beban dalam tiga tingkat: beban *kenyamanan* (TV, kipas) lebih dulu, lalu *penting* (pompa air, pengisian ponsel), dan beban *kritis* (penerangan dasar, pendingin obat, komunikasi) dipertahankan paling lama

Perencanaan mendukung tiga mode: biaya terendah, ketahanan maksimum, atau umur baterai maksimum.

### 3. Pemeriksaan Kompatibilitas dan Keselamatan

Sebelum pemasangan, Soluna mencocokkan tegangan baterai, battery management system (BMS), inverter, dan perangkat proteksi, lalu melaporkan satu dari tiga status beserta alasannya: **sesuai**, **perlu penyesuaian**, atau **tidak sesuai**.

### 4. Pemantauan dan Siklus Hidup

Setelah sistem berjalan, Soluna melacak kesehatan baterai dari pembacaan berkala, memberi peringatan dini, menjadwalkan perawatan dan penggantian sebelum baterai mencapai ambang akhir, dan mengarahkan baterai yang tidak lagi layak pakai ke daur ulang.

---

**Cakupan:** Cakupan awal meliputi penerangan, komunikasi, pendingin obat, dan pompa kecil. Menggantikan kayu bakar untuk memasak membutuhkan daya jauh lebih besar, sehingga direncanakan sebagai fase berikutnya dan **tidak** diklaim sudah terselesaikan. Soluna diposisikan untuk desa yang sesuai, bukan sebagai pengganti semua kebutuhan penyimpanan energi.

## Cara Angka Dihitung

AI memprediksi kesehatan baterai. **Semua yang menjadi dasar keputusan investasi atau keselamatan dihitung dengan rumus yang dapat diverifikasi** di mesin hitung Python.

| Perhitungan | Rumus |
| --- | --- |
| Kapasitas terpakai per paket (kWh) | `E_paket = C_nominal × SoH × DoD_maks` |
| Jumlah paket baterai | `N = ⌈(E_harian × H_cadangan) ÷ (E_paket × η)⌉` |
| Ketahanan (hari) | `T = (N × E_paket × η) ÷ (E_beban − E_PV)` |
| Kapasitas surya (kWp) | `P_PV = E_harian ÷ (H_matahari × PR)` |
| Balik modal (tahun) | `Modal sistem ÷ (biaya diesel tahunan − biaya operasi sistem tahunan)` |
| Estimasi sisa umur (tahun) | `(SoH saat ini − SoH ambang) ÷ penurunan SoH per tahun` |

Bila model bahasa tidak tersedia atau penjelasannya gagal cek angka, Soluna beralih ke template teks. Penilaian baterai **tidak** memiliki prediksi pengganti: bila layanan model terlatih tidak dapat dijangkau, penilaian gagal secara eksplisit dan tidak mengembalikan perkiraan buatan.

## Arsitektur Sistem

```text
Next.js (React, TypeScript, Tailwind)  ──►  FastAPI (Python)  ──►  Mesin hitung deterministik
          │                                                         engine/soluna_engine
          └──── Prisma ──► PostgreSQL
```

Model baterai terlatih berjalan sebagai layanan terpisah (repositori sendiri) dan dipanggil oleh aplikasi web melalui `POST /assess`, seperti dijelaskan di bawah.

- **Aplikasi web:** Next.js, React, TypeScript, dan Tailwind CSS, dengan autentikasi berbasis sesi untuk dua peran (admin dan pemasok), ditandatangani dengan `SESSION_SECRET`. Rute dilindungi per peran di `proxy.ts`. Halaman Daftar (`/daftar`) hanya membuat akun pemasok; akun admin dibuat lewat seed atau basis data.
- **Lapisan data:** PostgreSQL yang diakses lewat Prisma ORM. Semua konfigurasi berada di tabel `Konfigurasi` yang berversi.
- **Mesin hitung:** layanan Python / FastAPI terpisah (`engine/soluna_engine`), diakses di `ENGINE_URL` (bawaan `http://127.0.0.1:8000`, dijalankan dengan `npm run engine`). Mesin ini menghitung penilaian, perencanaan, ketahanan, kompatibilitas, siklus hidup, dan pengecekan penjelasan.
- **Model baterai:** model terlatih yang disajikan terpisah di `NEXT_PUBLIC_API_URL`. Aplikasi web memanggil `POST /assess` dengan header `x-api-key` dari `BATTERY_API_KEY`. Wajib ada untuk penilaian baterai.
- **Model bahasa (opsional):** endpoint di `SOLUNA_LLM_ENDPOINT` (`POST {prompt}` → `{text}`) yang mengubah hasil menjadi penjelasan bahasa sederhana. Teksnya selalu melewati cek angka.

## Model Penilaian Baterai (Repositori Terpisah)

Model machine learning **dikembangkan dan dilatih di repositori tersendiri** oleh AI/ML engineer kami, sehingga dapat diiterasi dan diberi versi terpisah dari aplikasi web. Pelatihan model berada di luar lingkup repositori ini.

**[soluna-model](https://github.com/ladyfanning001/EV-predict)**

| Item | Rincian |
| --- | --- |
| Data latih | Dataset publik *Electric Vehicle (EV) Battery Degradation & Charge* (Kaggle), sekitar 50.000 catatan dari 2.600 baterai NMC dan LFP |
| Fitur | 22 fitur input, termasuk jumlah siklus, usia, resistansi internal, depth of discharge, rasio pengisian cepat, suhu, dan kimia baterai |
| Algoritma | Gradient Boosting dengan quantile regression (scikit-learn) |
| Keluaran | SoH berupa nilai bawah / median / atas pada tingkat 80%, dikonversi menjadi grade A–D dan skor keyakinan tinggi / sedang / rendah |
| Integrasi | Aplikasi web memanggil `POST /assess` pada `NEXT_PUBLIC_API_URL` dengan header `x-api-key` dari `BATTERY_API_KEY` |
| Pelatihan | Offline, di repositori model |

> **Penting:** Model dilatih pada dataset publik baterai EV umum dan **belum divalidasi pada baterai bekas second-life yang sebenarnya**. Hasil disajikan sebagai perkiraan, bukan sertifikasi. Validasi pada baterai nyata menjadi bagian dari pilot.

## Contoh Simulasi

Untuk desa ilustratif dengan asumsi prototipe:

| Metrik | Hasil |
| --- | --- |
| Biaya energi desa per tahun | Rp438 juta → Rp216 juta (**≈51% lebih rendah**) |
| Balik modal dibanding diesel | **≈3,5 tahun** |
| Diesel yang dihindari | **≈19.500 liter / tahun** |

> Angka-angka ini berasal dari desa contoh simulasi dengan asumsi prototipe, **bukan data lapangan**. Angka akan diperbarui setelah pilot.

## Peta Modul

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

## ⚙️ Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Autentikasi | Berbasis sesi (`SESSION_SECRET`), 2 peran (admin, pemasok), proteksi rute di `proxy.ts` |
| Akses data | Prisma ORM |
| Basis data | PostgreSQL |
| Mesin hitung | Python 3.11+, FastAPI (`ENGINE_URL`, port 8000 secara bawaan) |
| Model baterai | scikit-learn (Gradient Boosting, quantile regression), dilatih offline pada dataset Kaggle, disajikan terpisah (`POST /assess`, `x-api-key`) |
| Penjelasan | Model bahasa lewat `SOLUNA_LLM_ENDPOINT` (`POST {prompt}` → `{text}`), fallback template, angka diverifikasi terhadap hasil |

## 📁 Struktur Repositori

> Hanya path yang sudah terkonfirmasi dari proyek yang dicantumkan; sisanya sengaja dihilangkan.

```text
soluna/
├── engine/                     # Mesin hitung Python (FastAPI)
│   ├── soluna_engine/
│   │   ├── assessment.py       # Penilaian baterai, grade, keyakinan
│   │   ├── planner.py          # Ukuran panel / baterai, biaya, balik modal
│   │   ├── resilience.py       # Pelepasan beban bertingkat dan ketahanan
│   │   ├── compatibility.py    # Cek tegangan, BMS, inverter, proteksi
│   │   ├── lifecycle.py        # Pemantauan, perawatan, penggantian
│   │   ├── explain.py          # Penjelasan dengan verifikasi angka
│   │   └── default_config.json # Konfigurasi bawaan yang berversi
│   └── requirements.txt
├── prisma/                     # Skema dan migrasi Prisma
├── proxy.ts                    # Proteksi rute berdasarkan peran
├── .env                        # Variabel lingkungan lokal (tidak di-commit)
├── package.json                # Skrip npm dan dependensi
└── README.md
```

## 🚀 Menjalankan Secara Lokal

### Prasyarat

1. **Node.js 22+**
2. **Python 3.11+**
3. **PostgreSQL**
4. **Model penilaian baterai** yang sedang berjalan dari https://github.com/ladyfanning001/EV-predict (wajib untuk penilaian)

### Kloning dan instalasi

```bash
git clone https://github.com/khalisanadya/Soluna
cd soluna
npm install
python -m venv engine/.venv
engine/.venv/Scripts/python -m pip install -r engine/requirements.txt   # macOS/Linux: engine/.venv/bin/python
```

### Variabel lingkungan (`.env`)

```bash
DATABASE_URL="postgresql://postgres:<sandi>@localhost:5432/soluna?schema=public"
SESSION_SECRET="<string acak panjang>"
ENGINE_URL="http://127.0.0.1:8000"

# Model baterai terlatih (wajib untuk penilaian)
NEXT_PUBLIC_API_URL="<URL layanan model baterai>"
BATTERY_API_KEY="<api key>"

# Opsional: model bahasa untuk penjelasan sederhana (POST {prompt} -> {text})
# SOLUNA_LLM_ENDPOINT="<endpoint model bahasa>"
```

### Menjalankan

```bash
npm run db:migrate          # buat tabel
npm run engine              # terminal 1: mesin hitung FastAPI di :8000
npm run db:seed             # data demo (mesin hitung harus berjalan)
npm run dev                 # terminal 2: aplikasi web di :3000
# atau keduanya sekaligus: npm run dev:all
```

Akun demo (ilustrasi): `admin` / `soluna123` (admin) dan `armada` / `soluna123` (pemasok). Halaman Daftar (`/daftar`) hanya membuat akun pemasok; akun admin dibuat lewat seed atau basis data.

### Uji penerimaan

```bash
npm run test:engine
```

Menjalankan test case proposal (bagian 6.1, toleransi ±5%): kebutuhan malam ≈ 33 kWh, kapasitas terpakai 28 kWh, 2 paket untuk siklus harian, ≈ 4 paket dengan cadangan, ≈ 17 kWp surya, ketahanan ≈ 2 hari (beban penuh) dan ≈ 4 hari (beban 50%), grade B. Hasil yang sama juga tampil langsung di aplikasi pada halaman **Pengaturan → Uji penerimaan**.

## 🗺️ Implementasi Roadmap

| Fase | Waktu | Fokus |
| --- | --- | --- |
| 1. Persiapan dan kemitraan | Bulan 0–2 | Mengamankan mitra pendanaan, pemasok baterai, dan teknisi lokal; memilih 5 desa pilot |
| 2. Penyempurnaan model | Bulan 2–4 | Menyempurnakan model dengan data desa dan uji baterai bekas nyata |
| 3. Pemasangan sistem | Bulan 4–7 | Uji fisik baterai dan pemasangan di 5 desa; melatih pengelola dan teknisi |
| 4. Operasi dan pemantauan | Bulan 7–12 | Memantau kesehatan baterai, ketahanan cuaca, dan diesel yang dihindari |
| 5. Evaluasi dan ekspansi | Bulan 12–18 | Melaporkan hasil ke mitra dan pembuat kebijakan; ekspansi ke 15–50 desa |

**Pasar:** TAM ≈ 10.068 lokasi tanpa listrik PLN (±1,28 juta rumah tangga) → SAM ≈ 5.555 desa sulit dijangkau yang berpotensi memakai pembangkit komunal → SOM = 50 desa sebagai target implementasi awal.

**Model bisnis:** Mitra pendanaan (CSR, hibah, LSM, pemerintah daerah) membiayai sistem. Soluna memperoleh pendapatan dari perencanaan, implementasi, dan langganan pemantauan, dengan dana perawatan dan penggantian baterai termasuk dalam paket pendanaan.

## ⚠️ Known Limitation

- **Rentang estimasi sisa umur** memakai **model empiris sementara** (`sisa-umur-empiris-0.1`), bukan model ML terlatih. Pelatihan model berada di luar lingkup repositori ini, dan antarmukanya dapat diganti dengan model hasil pelatihan kelak.
- Penilaian baterai bergantung pada model terlatih di `NEXT_PUBLIC_API_URL` (`POST /assess`, header `x-api-key` dari `BATTERY_API_KEY`). Bila layanan itu tidak tersedia, penilaian **gagal secara eksplisit**; Soluna tidak memakai prediksi umur pengganti.
- Model bahasa hanya merangkai penjelasan bila `SOLUNA_LLM_ENDPOINT` dipasang (`POST {prompt}` → `{text}`), dan teksnya tetap melewati cek angka.
- Model baterai dilatih pada **dataset publik** dan **belum divalidasi pada baterai second-life yang sebenarnya**. Hasil berupa perkiraan, bukan sertifikasi.
- Prototipe memakai **data desa simulasi**, dan pemantauan saat ini mengandalkan **input manual**.
- Semua angka contoh, harga, dan data seed adalah **ilustrasi** dan perlu dikalibrasi dengan data desa sebenarnya. Angka biaya dan penghematan berasal dari desa contoh simulasi, bukan data lapangan.
- Hasil bersifat indikatif dan tidak menggantikan pemeriksaan teknis, sertifikasi, atau jaminan keselamatan.
- Memasak bersih (menggantikan kayu bakar) **belum** tercakup dalam versi ini.

## 👥 Tim Kami

<table>
<tr>
<td align="center" width="25%">
<img src="https://drive.google.com/uc?export=view&id=1rPzNkUuXtFebZFcrLa7c-ZtZlSnxa0jX" width="144" height="180"/><br/>
<a href="https://github.com/narazla"><b>Nazla Azzahra Hermana</b></a><br/>
<i>Project Manager</i><br/>
<i>Universitas Diponegoro</i>
</td>
<td align="center" width="25%">
<img src="https://drive.google.com/uc?export=view&id=1kbe9CbYZBaLMgQ-PSwiz179-lZVjKZ9v" width="144" height="180"/><br/>
<a href="https://github.com/ladyfanning001"><b>Ladya Kalascha</b></a><br/>
<i>AI/ML Engineer</i><br/>
<i>Universitas Diponegoro</i>
</td>
<td align="center" width="25%">
<img src="https://drive.google.com/uc?export=view&id=1WkRD-lLSHNRS7txooJK5qHBnU4ADF_4k" width="144" height="180"/><br/>
<a href="https://github.com/khalisanadya"><b>Khalisa Nadya H.</b></a><br/>
<i>Full-Stack Developer</i><br/>
<i>Universitas Diponegoro</i>
</td>
<td align="center" width="25%">
<img src="https://drive.google.com/uc?export=view&id=1QTNzpX2021z3g962CTlRtFmv-6-PnRCl" width="144" height="180"/><br/>
<a href="https://github.com/Khoerunissa99"><b>Khoerunnisa Billah</b></a><br/>
<i>Full-Stack Developer</i><br/>
<i>Universitas Diponegoro</i>
</td>
</tr>
</table>

---

Dibuat untuk **Hackathon JOINTS x INSPIRE 2026**  
**Tim The Blondes & Orang Tua** 
