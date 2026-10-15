<?php
// Bikin favicon PNG dari logo raster (sekali pakai).
//
// Logo berbentuk lingkaran dengan latar putih; yang perlu dibuang hanya putih di
// luar lingkaran (sudut kotak). Flood-fill dari tepi TIDAK dipakai: garis lingkaran
// luar bocor di satu titik, sehingga putih di dalam ikut terhapus dan teks hitam
// jadi tak terbaca di tab gelap. Gantinya: mask lingkaran -- putih di luar radius
// dibuat transparan, isi lingkaran (latar putih untuk teks hitam) dibiarkan utuh.
$src = $argv[1];
$outDir = $argv[2];
$im = imagecreatefrompng($src);
$w = imagesx($im); $h = imagesy($im);
imagealphablending($im, false);
imagesavealpha($im, true);

// Bounding box piksel non-putih = lingkaran lambang.
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0;
for ($y = 0; $y < $h; $y++) {
    for ($x = 0; $x < $w; $x++) {
        $c = imagecolorat($im, $x, $y);
        $r = ($c >> 16) & 0xFF; $g = ($c >> 8) & 0xFF; $b = $c & 0xFF;
        if ($r < 240 || $g < 240 || $b < 240) {
            if ($x < $minX) $minX = $x;
            if ($x > $maxX) $maxX = $x;
            if ($y < $minY) $minY = $y;
            if ($y > $maxY) $maxY = $y;
        }
    }
}
$cx = ($minX + $maxX) / 2;
$cy = ($minY + $maxY) / 2;
$R  = (max($maxX - $minX, $maxY - $minY) + 1) / 2;
printf("lingkaran: pusat (%.0f,%.0f) R=%.1f\n", $cx, $cy, $R);

$transparent = imagecolorallocatealpha($im, 0, 0, 0, 127);
$cut = 0;
for ($y = 0; $y < $h; $y++) {
    for ($x = 0; $x < $w; $x++) {
        $dx = $x - $cx; $dy = $y - $cy;
        $dist = sqrt($dx * $dx + $dy * $dy);
        // Hanya piksel terang di luar lingkaran yang dibuang; kalau ada bagian
        // lambang yang menonjol keluar, ia tetap dipertahankan.
        if ($dist <= $R) continue;
        $c = imagecolorat($im, $x, $y);
        $r = ($c >> 16) & 0xFF; $g = ($c >> 8) & 0xFF; $b = $c & 0xFF;
        if ($r > 200 && $g > 200 && $b > 200) { imagesetpixel($im, $x, $y, $transparent); $cut++; }
    }
}
printf("putih luar dihapus: %d piksel\n", $cut);

// $bg = true: latar putih (apple-touch-icon; iOS menaruh ikon transparan di atas hitam).
function makeIcon($im, $cx, $cy, $R, $out, $size, $padPct, $bg) {
    $inner = (int) round($size * (1 - 2 * $padPct));
    $dst = imagecreatetruecolor($size, $size);
    // Latar putih harus blended (kalau tidak, piksel transparan sumber menimpanya);
    // latar transparan justru butuh blending mati supaya alpha tersimpan apa adanya.
    imagealphablending($dst, $bg);
    imagesavealpha($dst, !$bg);
    imagefill($dst, 0, 0, $bg
        ? imagecolorallocate($dst, 255, 255, 255)
        : imagecolorallocatealpha($dst, 0, 0, 0, 127));
    imagecopyresampled(
        $dst, $im,
        intdiv($size - $inner, 2), intdiv($size - $inner, 2),
        (int) round($cx - $R), (int) round($cy - $R),
        $inner, $inner, (int) round(2 * $R), (int) round(2 * $R)
    );
    imagepng($dst, $out, 9);
    imagedestroy($dst);
    printf("wrote %s (%dx%d)\n", $out, $size, $size);
}

makeIcon($im, $cx, $cy, $R, "$outDir/favicon.png", 96, 0.02, false);
makeIcon($im, $cx, $cy, $R, "$outDir/apple-touch-icon.png", 180, 0.02, true);
imagedestroy($im);
