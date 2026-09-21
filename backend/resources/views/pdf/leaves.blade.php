<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Data Cuti</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; font-size: 12px; }
        h1 { color: #1a1a1a; border-bottom: 2px solid #333; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
        th { background: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Data Cuti</h1>
    <table>
        <tr><th>Pegawai</th><th>Jenis</th><th>Mulai</th><th>Selesai</th><th>Total</th><th>Status</th></tr>
        @foreach($leaves as $l)
        <tr>
            <td>{{ $l->employee->nama_lengkap ?? '' }}</td>
            <td>{{ $l->leaveType->name ?? '' }}</td>
            <td>{{ $l->start_date }}</td>
            <td>{{ $l->end_date }}</td>
            <td>{{ $l->total_days }}</td>
            <td>{{ $l->status }}</td>
        </tr>
        @endforeach
    </table>
</body>
</html>
