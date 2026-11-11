# ASM HRIS — Sistem Informasi Kepegawaian

Aplikasi kepegawaian (HRIS) untuk ASM Ariyanti. Terdiri dari dua bagian:

| Bagian | Teknologi | Folder |
| --- | --- | --- |
| **Backend** (API) | Laravel 12 (PHP 8.2+), MySQL, Redis, Reverb | `backend/` |
| **Frontend** (tampilan) | React 19 + TypeScript + Vite, TailwindCSS | `frontend/` |

Frontend memanggil backend lewat `/api` (di mode dev otomatis diteruskan ke `http://localhost:8000`).
Kamu **tidak perlu** mengatur alamat API secara manual — sudah diatur di `frontend/vite.config.ts`.

---

## 1. Software yang wajib di-install dulu

Pasang semua ini sebelum mulai. Kalau satu saja belum ada, langkah berikutnya akan gagal.

| Software | Versi | Catatan |
| --- | --- | --- |
| **PHP** | 8.2 atau lebih baru | Wajib ada ekstensi `pdo_mysql`, `mbstring`, `openssl`, `zip`, `fileinfo`, dan **`redis`** |
| **Composer** | 2.x | Manajer paket PHP — https://getcomposer.org |
| **Node.js + npm** | **20.19+** atau **22.12+** | https://nodejs.org. Vite 8 **tidak jalan** di Node 20.0–20.18 |
| **MySQL / MariaDB** | 8.x / 10.x | Bisa pakai bawaan Laragon |
| **Redis** | 5.x+ | Dipakai untuk antrean (queue) & cache. Bisa dari Laragon |
| **Git** | terbaru | Untuk mengambil kode — https://git-scm.com |

> **Cara termudah (rekomendasi):** install **Laragon** (https://laragon.org). Laragon sudah membundel PHP, MySQL, Node, Composer, dan Redis sekaligus. Setelah install, aktifkan **Redis** dari menu Laragon → Quick app.

### 1a. WAJIB: aktifkan 2 ekstensi PHP

Laragon datang dengan PHP yang **belum lengkap**. Tanpa 2 baris di bawah ini, `composer install` dan `php artisan serve` akan gagal. Ini penyebab kegagalan paling sering.

1. Di Laragon, klik **Menu → PHP → php.ini** (atau buka file `php.ini` di folder PHP Laragon, contoh: `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.ini`).
2. Cari dua baris di bawah ini, lalu **hapus tanda `;`** di depan:
   ```ini
   ;extension=zip     →  extension=zip
   ;extension=redis   →  extension=redis
   ```
   (`extension=zip` biasanya ada di baris ~833. `extension=redis` di baris ~832 sudah aktif di sebagian versi — cek saja, kalau ada `;` di depan, hapus.)
3. **Restart Laragon** supaya perubahan berlaku.

Sudah aktif sebelumnya (tidak perlu diubah): `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `curl`, `gd`, `intl`.

**Cek sudah benar atau belum** (pastikan `php` sudah ada di PATH — kalau `where php` kosong, tambahkan folder PHP Laragon ke Environment Variables → Path, lalu buka terminal baru):

```bash
php -r "echo extension_loaded('redis') ? 'redis OK' : 'redis MISSING', PHP_EOL, extension_loaded('zip') ? 'zip OK' : 'zip MISSING', PHP_EOL;"
node -v    # harus 20.19+ atau 22.12+
```

Kalau bunyi `MISSING`, ulangi langkah 1–3. Jangan lanjut ke langkah berikutnya sebelum dua-duanya `OK`.

---

## 2. Download / Clone project

Buka terminal (Command Prompt / PowerShell), lalu:

```bash
git clone https://github.com/KaiiRengoku/ASM-HRIS-ARIYANTI-PROJECT.git
cd ASM-HRIS-ARIYANTI-PROJECT
```

Yang **tidak** ikut ter-download (memang sengaja tidak disimpan di GitHub, demi keamanan):

- `.env` → kamu buat sendiri (langkah 3.2)
- `vendor/` → dibuat oleh `composer install` (langkah 3.3)
- `node_modules/` → dibuat oleh `npm install` (langkah 4)

Jadi wajar kalau folder-folder itu kosong/tidak ada setelah clone — akan terisi di langkah berikutnya.

---

## 3. Setup Backend

### 3.1 Masuk ke folder backend

```bash
cd backend
```

### 3.2 Buat file `.env`

Salin contoh konfigurasi, lalu buat kunci aplikasi:

```bash
# Windows (Command Prompt)
copy .env.example .env

# Windows (PowerShell) / Mac / Linux
cp .env.example .env
```

Lalu **sesuaikan bagian database** di dalam `.env` dengan MySQL milikmu:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=asm_hris      # nama database (bebas, buat baru dengan nama ini)
DB_USERNAME=root          # biasanya root
DB_PASSWORD=              # kosongkan kalau MySQL-mu tanpa password
```

Buat database kosong bernama `asm_hris` (lewat phpMyAdmin, HeidiSQL, atau perintah SQL):

```sql
CREATE DATABASE asm_hris CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3.3 Install dependensi PHP & generate kunci aplikasi

```bash
composer install
php artisan key:generate
```

`key:generate` penting — tanpa ini aplikasi akan error "No application encryption key has been specified".

### 3.4 Isi database (tabel + data awal)

```bash
php artisan migrate --seed
```

Perintah ini membuat semua tabel dan mengisi data awal (role, jenis cuti, akun HRD, dll).

**Ingin akun HRD dengan kata sandi yang kamu tentukan sendiri?** Tambahkan dulu baris ini ke `.env` sebelum menjalankan `migrate --seed`:

```env
SEEDER_HRD_PASSWORD=admin12345
```

Kalau tidak diisi, sistem membuat kata sandi acak dan **mencetaknya sekali di layar** setelah seeding — catat baik-baik:

```
Akun HRD dibuat. NIK: 123456789 | Kata sandi: xxxxxxxxxxxx
```

---

## 4. Setup Frontend

Buka terminal **baru** (biarkan terminal backend tetap terbuka), lalu:

```bash
cd frontend
npm install
```

Selesai. Frontend tidak butuh file `.env` tambahan.

---

## 4a. Kalau tidak punya Redis (opsional — boleh dilewati)

Redis dipakai cuma untuk antrean & cache. Kalau kamu **tidak punya Redis sama sekali**, atau tidak mau bother mengaktifkan server Redis + ekstensi `redis`, aplikasi tetap bisa jalan. Notifikasi real-time (Reverb) juga tetap jalan — Reverb tidak butuh Redis selama *scaling* dimatikan (default).

Di `.env` backend, ubah **3 baris**:

```env
QUEUE_CONNECTION=database     # ganti dari redis
CACHE_STORE=file             # ganti dari redis
REDIS_CLIENT=                # kosongkan (dari phpredis)
```

Lalu buat tabel antrean/cache:

```bash
php artisan migrate
```

> Kalau baris `redis` di bagian 5 (Cara A / Terminal 2 & 3) kamu jalankan, `queue:work` tetap aman. Yang perlu dilewati hanya jika `php artisan serve` protes soal Redis saat start.

---

## 5. Menjalankan aplikasi (mode dev)

Aplikasi butuh **4 proses berjalan bersamaan**: server API, WebSocket (Reverb), antrean (queue), dan Vite (frontend).

### Cara A — 4 terminal terpisah (paling aman, selalu berhasil)

Buka 4 terminal, jalankan masing-masing **satu perintah** berikut:

| Terminal | Perintah | Fungsi |
| --- | --- | --- |
| 1 | `cd backend && php artisan serve` | Server API di `http://localhost:8000` |
| 2 | `cd backend && php artisan reverb:start` | Notifikasi real-time (WebSocket) |
| 3 | `cd backend && php artisan queue:work` | Proses antrean latar belakang |
| 4 | `cd frontend && npm run dev` | Tampilan di `http://localhost:5173` |

Lalu buka browser ke **http://localhost:5173**.

> Terminal 2 (Reverb) dan 3 (queue) boleh dilewati untuk sekadar mencoba aplikasi — tapi notifikasi real-time dan beberapa proses latar tidak akan jalan.

### Cara B — satu perintah (shortcut)

Dari folder utama project:

```bash
npm install
npm run dev
```

> ⚠️ **Penting:** perintah `npm run dev` di `package.json` menulis **lokasi PHP secara hardcode** ke `C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe`. Kalau lokasi PHP di komputermu **berbeda**, perintah ini akan gagal dengan pesan *"system cannot find the path specified"*.
>
> Kalau itu terjadi: pakai **Cara A** saja, atau edit path tersebut di `package.json` sesuai lokasi PHP-mu (cek dengan `where php` di Command Prompt).

---

## 6. Akun awal & membuat akun baru

Setelah seeding, akun HRD otomatis dibuat:

- **NIK (username):** `123456789`
- **Kata sandi:** sesuai `SEEDER_HRD_PASSWORD` di `.env`, atau kata sandi acak yang tercetak saat seeding

Login memakai **NIK + kata sandi** (bukan email).

**Cara membuat akun pegawai lain:** login sebagai HRD → menu **Pegawai** → **Tambah Pegawai** → isi data + kata sandi + role. Akun login dibuat otomatis.

> **Catatan:** file `DAFTAR_AKUN_TESTING.md` (daftar akun uji) sengaja **tidak** disertakan di repo ini karena berisi kredensial. Kalau butuh, minta ke pemilik project.

---

## 7. Struktur folder singkat

```
ASM-HRIS-PROJECT/
├── backend/                  # Aplikasi Laravel (API)
│   ├── app/                  # Kode utama (Controller, Model, Service)
│   ├── database/
│   │   ├── migrations/       # Skema tabel
│   │   └── seeders/          # Data awal
│   ├── routes/api.php        # Daftar endpoint API
│   ├── public/               # Titik masuk web + hasil build frontend
│   └── .env                  # Konfigurasi (tidak di GitHub — kamu buat sendiri)
│
├── frontend/                 # Aplikasi React (tampilan)
│   ├── src/
│   │   ├── features/         # Halaman per-fitur (pegawai, cuti, dll)
│   │   ├── components/       # Komponen bersama (tombol, dialog, dll)
│   │   └── services/         # Pemanggil API
│   └── vite.config.ts        # Pengaturan dev server + proxy ke backend
│
├── package.json              # Perintah bantu (npm run dev, dll)
└── README.md                 # Dokumen ini
```

---

## 8. Menjalankan pengujian (opsional)

Backend sudah punya test otomatis:

```bash
cd backend
php artisan test
```

Test memakai database terpisah dan **tidak** mengubah data aplikasi utama.

---

## 9. Kalau ada masalah (troubleshooting)

| Gejala | Penyebab & solusi |
| --- | --- |
| `Your requirements could not be resolved` / `could not find package` saat `composer install` | `extension=zip` belum aktif di `php.ini` — lihat bagian **1a** |
| `Class "Redis" not found` atau `PhpRedis extension not installed` | `extension=redis` belum aktif di `php.ini` — lihat bagian **1a**. `php artisan serve` pun gagal total |
| `vite` / `npm run dev` langsung berhenti, atau `crypto.hash is not a function` | Versi Node terlalu lama. Butuh **20.19+ atau 22.12+** — cek `node -v`, upgrade dari https://nodejs.org |
| `No application encryption key has been specified` | Belum jalankan `php artisan key:generate` |
| `SQLSTATE[HY000] [1049] Unknown database` | Database `asm_hris` belum dibuat, atau `DB_DATABASE` salah di `.env` |
| `Connection refused` saat buka halaman | Backend (`php artisan serve`) belum jalan di terminal 1 |
| Halaman blank / data tidak muncul | Cek terminal backend — biasanya error PHP. Pastikan MySQL & Redis jalan |
| Notifikasi real-time tidak muncul | `php artisan reverb:start` belum jalan, atau Redis mati |
| `npm run dev` → *path not found* | Path PHP di `package.json` beda — lihat **Cara A** di bagian 5 |
| `Vite proxy error` / API 404 | Backend tidak jalan di port 8000, atau port itu dipakai aplikasi lain |
| Port 8000/8080/5173 sudah dipakai | Tutup aplikasi lain yang memakainya (mis. app lain di port 8000), atau ganti port di `vite.config.ts` + `.env` (`APP_URL`, `REVERB_PORT`) |
| **Tidak punya Redis / tidak mau ribet** | Lihat bagian **4a** di bawah — 30 detik, tanpa Redis |
| `Could not find driver` / `could not find driver` | `extension=pdo_mysql` belum aktif — cek `php -m` |

---

## 10. Checklist cepat (dari nol sampai jalan)

> Urutan ini sudah termasuk perangkap yang paling sering bikin orang berhenti di tengah jalan. Ikuti berurutan.

**A. Persiapan (sekali saja)**
- [ ] Laragon ter-install, **Redis aktif** (Menu → Quick app → Redis)
- [ ] **Aktifkan `extension=redis` dan `extension=zip` di `php.ini`, lalu restart Laragon** (bagian **1a**)
- [ ] Node.js versi **20.19+ atau 22.12+** (`node -v`)
- [ ] MySQL & Composer & Git ter-install

**B. Ambil kode**
- [ ] `git clone https://github.com/KaiiRengoku/ASM-HRIS-ARIYANTI-PROJECT.git` → `cd` ke foldernya

**C. Backend**
- [ ] `cd backend` → `composer install`
- [ ] `cp .env.example .env` (Windows CMD: `copy .env.example .env`)
- [ ] Atur `DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` di `.env` → buat database kosong `asm_hris`
- [ ] Tambahkan `SEEDER_HRD_PASSWORD=...` ke `.env` *(opsional, kalau tidak mau dapat password acak)*
- [ ] `php artisan key:generate`
- [ ] `php artisan migrate --seed` → **catat akun HRD yang tampil**

**D. Frontend**
- [ ] `cd ../frontend` → `npm install`

**E. Jalankan**
- [ ] Jalankan 4 proses (bagian 5, Cara A) → buka **http://localhost:5173**
- [ ] Login dengan NIK `123456789` + kata sandi HRD

Kalau macet di salah satu langkah, buka tabel [Bagian 9 — Troubleshooting](#9-kalau-ada-masalah-troubleshooting).

---

## 11. Ringkasan: 3 penyebab paling sering macet

Kalau pengajar atau temanmu belum pernah setup Laravel, hampir selalu macet di 3 titik ini:

1. **`composer install` error / `Class "Redis" not found`** → `extension=redis` atau `extension=zip` belum aktif. Buka bagian **1a**.
2. **`npm run dev` langsung crash** → versi Node terlalu lama. Butuh **20.19+**.
3. **Halaman terbuka tapi data kosong / `Connection refused`** → backend (`php artisan serve`) belum jalan di terminal lain.

---
