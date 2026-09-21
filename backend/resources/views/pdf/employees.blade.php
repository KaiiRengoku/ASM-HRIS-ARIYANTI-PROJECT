<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Data Pegawai</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; font-size: 12px; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Data Pegawai</h1>
    <table>
        <tr><th>NIK</th><th>Nama</th><th>Email</th><th>Jabatan</th><th>Unit</th><th>Status</th><th>Telepon</th><th>Tanggal Masuk</th></tr>
        @foreach($employees as $emp)
        <tr>
            <td>{{ $emp->nik }}</td>
            <td>{{ $emp->nama_lengkap }}</td>
            <td>{{ $emp->email }}</td>
            <td>{{ $emp->position?->name ?? '' }}</td>
            <td>{{ $emp->organizationalUnit?->name ?? '' }}</td>
            <td>{{ $emp->status_kepegawaian ?? '' }}</td>
            <td>{{ $emp->nomor_hp ?? '' }}</td>
            <td>{{ $emp->tanggal_masuk_kerja ?? '' }}</td>
        </tr>
        @endforeach
    </table>
</body>
</html>
