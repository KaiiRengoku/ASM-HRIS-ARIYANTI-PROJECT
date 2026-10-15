<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    // Sajikan aplikasi React (hasil build Vite ada di public/build/index.html).
    return response()->file(public_path('build/index.html'));
});
