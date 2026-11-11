<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Data Pegawai</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; font-size: 11px; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 4px; }
        .meta { font-size: 10px; color: #666; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 5px 6px; text-align: left; vertical-align: middle; }
        th { background: #f2f2f2; }
        .foto { width: 50px; }
        .foto img { width: 48px; height: 60px; object-fit: cover; display: block; }
        .foto .no-foto { width: 48px; height: 60px; background: #e5e5e5; display: flex; align-items: center; justify-content: center; color: #999; font-size: 9px; }
        .nonaktif td { opacity: 0.55; }
    </style>
</head>
<body>
    <h1>Data Pegawai</h1>
    <div class="meta">Dicetak pada {{ now()->format('d/m/Y H:i') }} &mdash; {{ $employees->count() }} pegawai</div>
    <table>
        <tr>
            <th class="foto">Foto</th>
            <th>Nomor Induk Kepegawaian</th>
            <th>Nama</th>
            <th>Posisi</th>
            <th>Unit</th>
            <th>Status</th>
            <th>Telepon</th>
            <th>Tanggal Masuk</th>
            <th>Lama Kerja</th>
        </tr>
        @foreach($employees as $emp)
        <tr class="{{ $emp->status_kepegawaian === 'nonaktif' ? 'nonaktif' : '' }}">
            <td class="foto">
                @php
                    $foto = $photos[$emp->id] ?? null;
                    $fotoUrl = $foto ? \App\Http\Controllers\ReportController::fotoToBase64($foto['storage_disk'], $foto['storage_path']) : null;
                @endphp
                @if($fotoUrl)
                    <img src="{{ $fotoUrl }}" alt="Foto" />
                @else
                    <div class="no-foto">Tanpa Foto</div>
                @endif
            </td>
            <td>{{ $emp->nik }}</td>
            <td>{{ $emp->nama_lengkap }}</td>
            <td>{{ $emp->position?->name ?? '' }}</td>
            <td>{{ $emp->jabatan_utama ?? '' }}</td>
            <td>{{ $emp->organizationalUnit?->name ?? '' }}</td>
            <td>{{ $emp->status_kepegawaian ?? '' }}</td>
            <td>{{ $emp->nomor_hp ?? '' }}</td>
            <td>{{ $emp->tanggal_masuk_kerja?->format('Y-m-d') ?? '' }}</td>
            <td>@if($emp->tanggal_masuk_kerja) @php($tahun = now()->diffInYears($emp->tanggal_masuk_kerja, true)) {{ $tahun >= 1 ? (int) floor($tahun) . ' tahun' : '< 1 tahun' }} @else - @endif</td>
        </tr>
        @endforeach
    </table>
</body>
</html>
