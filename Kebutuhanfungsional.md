# 1. KEBUTUHAN FUNGSIONAL BERDASARKAN AKTOR

## 1.1. Aktor: HRD (Human Resource Development)
HRD merupakan pengelola utama sistem yang bertanggung jawab atas seluruh administrasi kepegawaian. Kebutuhan fungsional HRD meliputi:
* Login melalui satu halaman terpadu menggunakan akun terdaftar
* HRD bisa membuat akun semua pegawai dengan memasukkan ( nama lengkap, NIK, Jabatan, password), serta memilih role (Direktur, Pembantu Direktur I, Pembantu Direktur II, Pembantu Direktur III, Kepala Bagian, HRD, atau Pegawai)
* CRUD(Create, Read, Update, Delete) data pribadinya sendiri (seperti alamat tempat tinggal atau nomor telepon dan dokumen-dokumen yang diunggah) tanpa harus melalui HRD, sehingga data tetap akurat dan terkini. 
* Mengunggah dan mengelola arsip dokumen pegawai yang meliputi KTP, ijazah, sertifikat, surat tugas, KK, NPWP, dan SK pengangkatan, dengan batas ukuran maksimal 10 MB per file dan format yang didukung adalah PDF, JPG, dan PNG.
* Melakukan pencarian dan penyaringan data pegawai berdasarkan nama, NIK, NIP, atau NIDN.
* Menerima dan memverifikasi kelengkapan form pengajuan cuti dari pegawai, serta mencatat dan mengarsipkan hasil keputusan akhir (setelah disetujui oleh Kepala Bagian/Atasan) sebagai arsip digital.
* Mengelola hak akses (role) dan akun setiap pengguna sesuai dengan jabatan dan kewenangannya di instansi.
* Mengelola seluruh data cuti pegawai di dalam sistem, yang mencakup: menambahkan data cuti secara manual (untuk kasus darurat/offline), mengedit data cuti yang salah, melakukan penyesuaian sisa jatah cuti jika ada perubahan kebijakan atau arahan khusus dari pimpinan, membatalkan cuti, serta memastikan seluruh riwayat cuti pegawai terdokumentasi dengan baik sebagai arsip digital
* Mengelola kalender kerja, yang mencakup menambahkan, mengedit, dan menonaktifkan hari libur nasional/cuti bersama, serta mengkonfigurasi jam kerja khusus untuk divisi tertentu (jika ada perbedaan jam masuk)
* Mencetak dan mengunduh data pribadi (biodata) sendiri ke dalam format PDF dan word untuk keperluan pribadi atau administrasi.
* HRD memiliki hak untuk menyetujui atau menolak pengajuan cuti/izin dari Kepala Bagian. Jika disetujui, status berubah menjadi "Disetujui HRD”. Jika ditolak, pegawai mendapat notifikasi penolakan.

## 1.2. Aktor: Pegawai dan Dosen (Termasuk Dosen Luar Biasa, Ketua LPPM, dan Ketua SPMI)
Pegawai dan dosen merupakan pengguna akhir yang memanfaatkan sistem untuk keperluan administrasi pribadi. Kebutuhan fungsional pegawai meliputi:
* Login melalui satu halaman terpadu menggunakan akun terdaftar.
* Melihat dan mengunggah dokumen arsip pribadi seperti foto, ijazah, atau sertifikat pelatihan ke dalam sistem, dengan batas ukuran maksimal 10 MB per file dan format yang didukung adalah PDF, JPG, dan PNG.
* CRUD(Create, Read, Update, Delete) profil (seperti alamat tempat tinggal atau nomor telepon dan dokumen-dokumen yang diunggah) tanpa harus melalui HRD, sehingga data tetap akurat dan terkini. 
* Mengajukan berbagai jenis cuti dan izin secara online, mencakup cuti tahunan, cuti sakit, cuti melahirkan, cuti berkabung, cuti nikah, serta izin tidak masuk atau izin keluar kantor.
* Melihat sisa jatah cuti tahunan miliknya sendiri secara real-time melalui dashboard pribadi, sehingga dapat merencanakan pengambilan cuti dengan lebih baik.
* Menerima notifikasi secara real-time melalui browser notification dan email terkait status pengajuan cuti dan izin yang diajukan (misalnya: pengajuan disetujui, ditolak, atau membutuhkan perbaikan), sehingga pegawai selalu mendapatkan informasi terbaru tanpa harus terus-menerus membuka sistem.
* Mengganti kata sandi (password) sendiri secara mandiri setelah login pertama atau jika lupa, tanpa harus melapor ke HRD.
* Mencetak dan mengunduh data pribadi (biodata) sendiri ke dalam format PDF dan word untuk keperluan pribadi atau administrasi.

## 1.3. Aktor: Direktur
Direktur bertindak sebagai pimpinan tertinggi yang membutuhkan sistem untuk memantau kinerja dan kedisiplinan pegawai secara menyeluruh. Kebutuhan fungsional Direktur meliputi:
* Login melalui satu halaman terpadu menggunakan akun terdaftar.
* Melihat seluruh data pegawai yang telah tersimpan di sistem, mencakup data pribadi (NIK, nama, alamat, nomor telepon, email, jabatan, tanggal masuk kerja, NPWP, nomor BPJS, nomor rekening, riwayat pendidikan, dan riwayat jabatan) serta dokumen arsip (KTP, ijazah, sertifikat, surat tugas, KK, NPWP, dan SK pengangkatan), sehingga Direktur dapat memperoleh gambaran lengkap mengenai seluruh sumber daya manusia di lingkungan ASM Ariyanti.
* Melihat dan mengunggah dokumen arsip pribadi seperti foto, ijazah, atau sertifikat pelatihan ke dalam sistem, dengan batas ukuran maksimal 10 MB per file dan format yang didukung adalah PDF, JPG, dan PNG.
* Melihat rekap cuti dan izin tahunan seluruh pegawai, mencakup sisa jatah cuti masing-masing pegawai, riwayat pengajuan cuti, dan status persetujuannya.
* Melihat notifikasi secara real-time melalui browser notification dan email terkait status pengajuan cuti dan izin yang diajukan (misalnya: pengajuan disetujui, ditolak, atau membutuhkan perbaikan), sehingga pegawai selalu mendapatkan informasi terbaru tanpa harus terus-menerus membuka sistem.
* CRUD(Create, Read, Update, Delete) profil (seperti alamat tempat tinggal atau nomor telepon dan dokumen-dokumen yang diunggah) tanpa harus melalui HRD, sehingga data tetap akurat dan terkini.
* Mengajukan berbagai jenis cuti dan izin secara online, mencakup cuti tahunan, cuti sakit, cuti melahirkan, cuti berkabung, cuti nikah, serta izin tidak masuk atau izin keluar kantor.
* Melihat sisa jatah cuti tahunan miliknya sendiri secara real-time melalui dashboard pribadi, sehingga dapat merencanakan pengambilan cuti dengan lebih baik.
* Mengganti kata sandi (password) sendiri secara mandiri setelah login pertama atau jika lupa, tanpa harus melapor ke HRD.
* Mencetak dan mengunduh data pribadi (biodata) sendiri ke dalam format PDF dan word untuk keperluan pribadi atau administrasi.

## 1.4. Aktor: Pembantu Direktur I, II, dan III
* Login menggunakan akun yang diberikan HRD.
* Melihat dan mengunggah dokumen pribadi seperti foto, ijazah, atau sertifikat pelatihan ke dalam sistem, dengan batas ukuran maksimal 10 MB per file dan format yang didukung adalah PDF, JPG, dan PNG.
* CRUD(Create, Read, Update, Delete) profil (seperti alamat tempat tinggal atau nomor telepon dan dokumen-dokumen yang diunggah).
* Mengajukan berbagai jenis cuti dan izin secara online, mencakup cuti tahunan, cuti sakit, cuti melahirkan, cuti berkabung, cuti nikah, serta izin tidak masuk atau izin keluar kantor.
* Melihat sisa jatah cuti tahunan miliknya sendiri secara real-time melalui dashboard pribadi, sehingga dapat merencanakan pengambilan cuti dengan lebih baik.
* Melihat notifikasi secara real-time melalui browser notification dan email terkait status pengajuan cuti dan izin yang diajukan (misalnya: pengajuan disetujui, ditolak, atau membutuhkan perbaikan), sehingga pegawai selalu mendapatkan informasi terbaru tanpa harus terus-menerus membuka sistem.
* Mengganti kata sandi (password) sendiri secara mandiri setelah login pertama atau jika lupa, tanpa harus melapor ke HRD.
* Melihat seluruh data pegawai 
* Melihat rekap cuti dan izin pegawai di lingkungan akademik untuk merencanakan penggantian dosen pengajar jika ada dosen yang cuti.
* Mencetak dan mengunduh data pribadi (biodata) sendiri ke dalam format PDF dan word untuk keperluan pribadi atau administrasi.

## 1.5. Aktor: Kepala Bagian
* Login menggunakan akun yang diberikan HRD. 
* Melihat dan mengunggah dokumen arsip pribadi seperti foto, ijazah, atau sertifikat pelatihan ke dalam sistem, dengan batas ukuran maksimal 10 MB per file dan format yang didukung adalah PDF, JPG, dan PNG.
* CRUD(Create, Read, Update, Delete) profil (seperti alamat tempat tinggal atau nomor telepon dan dokumen-dokumen yang diunggah) tanpa harus melalui HRD, sehingga data tetap akurat dan terkini.
* Mengajukan berbagai jenis cuti dan izin secara online, mencakup cuti tahunan, cuti sakit, cuti melahirkan, cuti berkabung, cuti nikah, serta izin tidak masuk atau izin keluar kantor.
* Melihat sisa jatah cuti tahunan miliknya sendiri secara real-time melalui dashboard pribadi, sehingga dapat merencanakan pengambilan cuti dengan lebih baik.
* Melihat notifikasi secara real-time melalui browser notification dan email terkait status pengajuan cuti dan izin yang diajukan (misalnya: pengajuan disetujui, ditolak, atau membutuhkan perbaikan), sehingga pegawai selalu mendapatkan informasi terbaru tanpa harus terus-menerus membuka sistem.
* Mengganti kata sandi (password) sendiri secara mandiri setelah login pertama atau jika lupa, tanpa harus melapor ke HRD.
* Melihat rekap cuti dan izin pegawai di lingkungan akademik untuk merencanakan penggantian dosen pengajar jika ada dosen yang cuti.
* Kepala Bagian memiliki hak untuk menyetujui atau menolak pengajuan cuti/izin dari bawahannya. Jika disetujui, status berubah menjadi "Disetujui Kepala Bagian" dan diteruskan ke HRD. Jika ditolak, pegawai mendapat notifikasi penolakan.
* Kepala Bagian dapat memberikan alasan penolakan cuti.
* Kepala Bagian mendapat notifikasi saat ada pengajuan cuti baru dari bawahannya.
* Mencetak dan mengunduh profil sendiri ke dalam format PDF dan word untuk keperluan pribadi atau administrasi.

---

# 2. KEBUTUHAN NON-FUNGSIONAL BERDASARKAN AKTOR

## 2.1. Untuk Semua Pengguna 
* Kemudahan Akses: Sistem harus dapat diakses dari mana saja melalui jaringan internet publik (online), sehingga pengguna tidak terbatas hanya di lingkungan kantor.
* Kinerja Responsif: Setiap halaman antarmuka harus memiliki waktu muat maksimal 3 detik untuk 95% dari total akses, sehingga pengguna tidak merasa lambat saat mengoperasikan sistem.
* Ketersediaan Sistem: Sistem harus memiliki tingkat ketersediaan (uptime) minimal 99% selama jam operasional kantor (08.00–17.00 WIB) untuk memastikan kelancaran administrasi kepegawaian tidak terganggu.
* Keamanan Akun: Seluruh kata sandi (password) pengguna harus disimpan dalam bentuk hash terenkripsi di dalam database, dan sistem harus menerapkan mekanisme session timeout yang secara otomatis mengakhiri sesi login jika pengguna tidak aktif selama 60 menit.
* Audit Trail: Semua aksi penting dalam sistem seperti login, penghapusan data, dan persetujuan cuti harus tercatat dalam log aktivitas yang berisi informasi siapa yang melakukan, aksi apa yang dilakukan, kapan waktu kejadian, dan data apa yang terpengaruh.
* Notifikasi: Setiap perubahan status pengajuan cuti atau izin harus dikirimkan notifikasi secara real-time melalui browser notification dan email, agar pegawai selalu mendapatkan informasi terbaru tanpa harus terus-menerus membuka sistem.
* Kompatibilitas Perangkat: Antarmuka sistem harus responsif (mobile-friendly) sehingga dapat diakses melalui perangkat smartphone atau tablet dengan ukuran layar yang berbeda, serta kompatibel dengan browser Google Chrome, Mozilla Firefox, dan Microsoft Edge versi terbaru.
* Validasi Data: Sistem harus memvalidasi format input data sesuai aturan instansi, yaitu NIK (16 digit numerik), NIP (9 digit numerik), NIDN (10 digit numerik), dan format email yang valid, untuk menjaga integritas data.

## 2.2. Khusus untuk HRD dan Pimpinan (Direktur & Pembantu Direktur II)
* Memastikan data masa kerja pegawai tercatat dengan akurat di sistem, serta memonitor dan memverifikasi hasil perhitungan sisa jatah cuti tahunan yang dihitung secara otomatis oleh sistem.
* Kapasitas Pengguna: Sistem harus mampu menangani akses bersamaan oleh minimal 50 pengguna secara simultan tanpa mengalami penurunan kecepatan atau kegagalan sistem.
* Keakuratan Laporan: Laporan yang dihasilkan (rekap data pegawai, bulanan, dan sisa cuti) harus akurat dan real-time, sehingga dapat menjadi dasar pengambilan keputusan yang valid.
* Kemampuan Ekspor: Laporan harus dapat diekspor dalam format PDF dan Excel untuk keperluan arsip dan distribusi ke pihak terkait.

## 2.3. Khusus untuk Pengembang dan Pemeliharaan Sistem
* Struktur Kode: Kode sumber (source code) sistem harus ditulis dengan mengikuti standar penulisan kode yang baik, terstruktur, menggunakan komentar yang jelas, dan dilengkapi dengan dokumentasi teknis agar memudahkan pemeliharaan atau pengembangan lanjutan oleh pengembang lain di masa depan.
* Teknologi Pengembangan: Sistem akan dibangun menggunakan arsitektur berbasis web dengan spesifikasi teknologi Frontend (HTML5, CSS3, JavaScript) dan Backend (PHP) dengan Database MySQL sebagai sistem manajemen basis data.
* Backup Data: Sistem harus memiliki jadwal pencadangan (backup) data otomatis yang dilakukan setiap hari pada pukul 23.00 WIB, dan data backup harus disimpan di lokasi penyimpanan yang terpisah dari server utama untuk mencegah kehilangan data akibat kegagalan sistem.