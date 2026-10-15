<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// DINONAKTIFKAN sesuai keputusan stakeholder (Dokumen Projek/Kesimpulansistemcuti.md §2):
// saldo cuti sepenuhnya diisi manual oleh HRD, sistem tidak lagi mengakru otomatis.
// Kode perintah leave:accrue tetap ada agar bisa diaktifkan kembali bila kebijakan berubah.
// Schedule::command('leave:accrue')->yearly()->timezone('Asia/Jakarta');
