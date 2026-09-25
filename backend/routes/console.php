<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Kebutuhan §2.2: akrual jatah cuti tahunan otomatis setiap 1 Januari.
Schedule::command('leave:accrue')->yearly()->timezone('Asia/Jakarta');
