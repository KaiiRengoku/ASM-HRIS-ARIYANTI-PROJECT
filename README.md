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
| **PHP** | 8.2 atau lebih baru | Wajib ada ekstensi `pdo_mysql`, `mbstring`, `openssl`, `zip`, `fileinfo` |
| **Composer** | 2.x | Manajer paket PHP — https://getcomposer.org |
| **Node.js + npm** | Node 20 atau lebih baru | https://nodejs.org (pilih versi LTS) |
| **MySQL / MariaDB** | 8.x / 10.x | Bisa pakai bawaan Laragon |
| **Redis** | 5.x+ | Dipakai untuk antrean (queue) & cache. Bisa dari Laragon |
| **Git** | terbaru | Untuk mengambil kode — https://git-scm.com |

> **Cara termudah (rekomendasi):** install **Laragon** (https://laragon.org). Laragon sudah membundel PHP, MySQL, Node, Composer, dan Redis sekaligus. Setelah install, aktifkan **Redis** dari menu Laragon → Quick app.

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
| `No application encryption key has been specified` | Belum jalankan `php artisan key:generate` |
| `SQLSTATE[HY000] [1049] Unknown database` | Database `asm_hris` belum dibuat, atau `DB_DATABASE` salah di `.env` |
| `Connection refused` saat buka halaman | Backend (`php artisan serve`) belum jalan di terminal 1 |
| Halaman blank / data tidak muncul | Cek terminal backend — biasanya error PHP. Pastikan MySQL & Redis jalan |
| Notifikasi real-time tidak muncul | `php artisan reverb:start` belum jalan, atau Redis mati |
| `npm run dev` → *path not found* | Path PHP di `package.json` beda — lihat **Cara A** di bagian 5 |
| `Vite proxy error` / API 404 | Backend tidak jalan di port 8000, atau port itu dipakai aplikasi lain |
| **Tidak punya Redis?** | Ganti di `.env`: `QUEUE_CONNECTION=database` dan `CACHE_STORE=file`, lalu jalankan `php artisan migrate` |

---

## 10. Checklist cepat (dari nol sampai jalan)

- [ ] PHP 8.2+, Composer, Node 20+, MySQL, Redis, Git sudah ter-install
- [ ] `git clone` project, lalu `cd` ke foldernya
- [ ] `cd backend` → `composer install`
- [ ] `cp .env.example .env` → atur `DB_*` → buat database `asm_hris`
- [ ] `php artisan key:generate`
- [ ] `php artisan migrate --seed` → catat akun HRD
- [ ] `cd ../frontend` → `npm install`
- [ ] Jalankan 4 proses (bagian 5) → buka http://localhost:5173
- [ ] Login dengan NIK `123456789` + kata sandi HRD
