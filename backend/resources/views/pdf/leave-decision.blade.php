<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Keputusan Cuti</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        h2 { text-align: center; margin-bottom: 2px; }
        .sub { text-align: center; margin-top: 0; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        td { padding: 6px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        td.k { width: 220px; font-weight: bold; }
        .sign { margin-top: 48px; width: 100%; }
        .sign td { border: none; text-align: center; width: 50%; }
    </style>
</head>
<body>
    <h2>ASM ARIYANTI</h2>
    <p class="sub">ARSIP DIGITAL KEPUTUSAN PENGAJUAN CUTI/IZIN</p>
    <p>Nomor Arsip: LEAVE-{{ $leave->id }}</p>

    <table>
        <tr><td class="k">Nama Pegawai</td><td>{{ $leave->employee?->nama_lengkap ?? '-' }}</td></tr>
        <tr><td class="k">NIK</td><td>{{ $leave->employee?->nik ?? '-' }}</td></tr>
        <tr><td class="k">Jenis Pengajuan</td><td>{{ $leave->leaveType?->name ?? 'Cuti' }}</td></tr>
        <tr><td class="k">Tanggal Mulai</td><td>{{ $leave->start_date?->format('d-m-Y') }}</td></tr>
        <tr><td class="k">Tanggal Selesai</td><td>{{ $leave->end_date?->format('d-m-Y') }}</td></tr>
        <tr><td class="k">Lama</td><td>{{ $leave->total_days }} hari kerja</td></tr>
        <tr><td class="k">Alasan</td><td>{{ $leave->reason ?? '-' }}</td></tr>
        <tr><td class="k">Status Akhir</td><td>{{ $leave->status }}</td></tr>
        <tr><td class="k">Disetujui oleh Kepala Bagian</td><td>{{ $kabagName }} ({{ $kabagDate }})</td></tr>
        <tr><td class="k">Difinalisasi oleh HRD</td><td>{{ $hrdName }} ({{ $hrdDate }})</td></tr>
    </table>

    <p style="margin-top: 24px;">Dokumen ini adalah arsip digital hasil persetujuan pengajuan cuti/izin dan tercatat otomatis oleh sistem ASM HRIS pada saat finalisasi HRD.</p>

    <table class="sign">
        <tr>
            <td>Kepala Bagian</td>
            <td>HRD</td>
        </tr>
        <tr>
            <td style="padding-top: 64px;">({{ $kabagName }})</td>
            <td style="padding-top: 64px;">({{ $hrdName }})</td>
        </tr>
    </table>
</body>
</html>
