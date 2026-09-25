<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Biodata Pegawai</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; font-size: 13px; }
        h1 { color: #D30000; border-bottom: 2px solid #D30000; padding-bottom: 10px; }
        h2 { font-size: 14px; margin-top: 24px; border-bottom: 1px solid #333; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
        th { background: #f2f2f2; }
        .row { margin: 4px 0; }
        .label { font-weight: bold; display: inline-block; width: 180px; }
        .ttd { margin-top: 32px; text-align: right; }
        .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <h1>Biodata Pegawai</h1>

    <h2>A. DATA PRIBADI</h2>
    <div>
        <div class="row"><span class="label">Nama Lengkap</span> {{ trim(($employee->gelar_depan ? $employee->gelar_depan.' ' : '').$employee->nama_lengkap.($employee->gelar_belakang ? ', '.$employee->gelar_belakang : '')) }}</div>
        <div class="row"><span class="label">NIK</span> {{ $employee->nik }}</div>
        <div class="row"><span class="label">Tempat, Tanggal Lahir</span> {{ $employee->tempat_lahir ?? '-' }}, {{ $employee->tanggal_lahir ?? '-' }}</div>
        <div class="row"><span class="label">Jenis Kelamin</span> {{ $employee->jenis_kelamin === 'L' ? 'Laki-laki' : ($employee->jenis_kelamin === 'P' ? 'Perempuan' : '-') }}</div>
        <div class="row"><span class="label">Agama</span> {{ $employee->agama ?? '-' }}</div>
        <div class="row"><span class="label">Status Pernikahan</span> {{ $employee->status_pernikahan ?? '-' }}</div>
        <div class="row"><span class="label">Alamat KTP</span> {{ $employee->alamat_ktp ?? $employee->alamat ?? '-' }}</div>
        <div class="row"><span class="label">Alamat Domisili</span> {{ $employee->alamat_domisili ?? '-' }}</div>
        <div class="row"><span class="label">Email</span> {{ $employee->email }}</div>
        <div class="row"><span class="label">Nomor HP</span> {{ $employee->nomor_hp ?? '-' }}</div>
    </div>

    <h2>B. DATA PENDIDIKAN (FORMAL)</h2>
    @php($byJenjang = $employee->educations->keyBy('jenjang'))
    <table>
        <tr><th>Jenjang</th><th>Perguruan Tinggi</th><th>Jurusan</th><th>Masuk</th><th>Lulus</th></tr>
        @foreach(['S1', 'S2', 'S3'] as $jenjang)
        <tr>
            <td>{{ $jenjang }}</td>
            <td>{{ $byJenjang->get($jenjang)?->nama_pt ?? '-' }}</td>
            <td>{{ $byJenjang->get($jenjang)?->jurusan ?? '-' }}</td>
            <td>{{ $byJenjang->get($jenjang)?->tahun_masuk ?? '-' }}</td>
            <td>{{ $byJenjang->get($jenjang)?->tahun_lulus ?? '-' }}</td>
        </tr>
        @endforeach
    </table>
    <div class="row"><span class="label">Sertifikasi</span> {{ $employee->functional?->sertifikasi ?? '-' }}</div>

    <h2>C. DATA KEPEGAWAIAN DAN JABATAN FUNGSIONAL</h2>
    <div>
        <div class="row"><span class="label">NIP</span> {{ $employee->nip ?? '-' }}</div>
        <div class="row"><span class="label">NIDN</span> {{ $employee->nidn ?? '-' }}</div>
        <div class="row"><span class="label">Status Kepegawaian</span> {{ $employee->functional?->status_kepegawaian_detail ?? $employee->status_kepegawaian ?? '-' }}</div>
        <div class="row"><span class="label">Jabatan Fungsional</span> {{ $employee->functional?->jabatan_fungsional ?? '-' }}</div>
        <div class="row"><span class="label">Pangkat / Golongan</span> {{ $employee->functional?->pangkat ?? '-' }} / {{ $employee->functional?->golongan_ruang ?? '-' }}</div>
        <div class="row"><span class="label">TMT Pangkat</span> {{ $employee->functional?->tmt_pangkat ?? '-' }}</div>
        <div class="row"><span class="label">Bidang Keahlian</span> {{ $employee->functional?->bidang_keahlian ?? '-' }}</div>
        <div class="row"><span class="label">Unit Kerja</span> {{ $employee->functional?->unit_kerja ?? $employee->organizationalUnit?->name ?? '-' }}</div>
        <div class="row"><span class="label">Jabatan</span> {{ $employee->position?->name ?? '-' }}</div>
        <div class="row"><span class="label">Tanggal Masuk</span> {{ $employee->tanggal_masuk_kerja ?? '-' }}</div>
    </div>

    <h2>C.1 RIWAYAT JABATAN</h2>
    @forelse($employee->positionHistories as $rh)
        <div class="row">{{ $rh->start_date?->format('Y') ?? '-' }}{{ $rh->end_date ? ' - ' . $rh->end_date->format('Y') : ' - sekarang' }} : {{ $rh->jabatan }}{{ $rh->unit_kerja ? ' (' . $rh->unit_kerja . ')' : '' }}{{ $rh->no_sk ? ' — SK: ' . $rh->no_sk : '' }}</div>
    @empty
        <div class="row">-</div>
    @endforelse

    @if(($isPegawai ?? $isDosen ?? false))
    <h2>D. DATA MENGAJAR</h2>
    <table>
        <tr><th>Kode</th><th>Mata Kuliah</th><th>SKS</th><th>Semester</th><th>Program Studi</th><th>Kelas</th></tr>
        @forelse($employee->teachingAssignments as $ajar)
        <tr>
            <td>{{ $ajar->kode_matkul ?? '-' }}</td>
            <td>{{ $ajar->nama_matkul ?? '-' }}</td>
            <td>{{ $ajar->sks ?? '-' }}</td>
            <td>{{ $ajar->semester ?? '-' }}</td>
            <td>{{ $ajar->program_studi ?? '-' }}</td>
            <td>{{ $ajar->kelas ?? '-' }}</td>
        </tr>
        @empty
        <tr><td colspan="6">-</td></tr>
        @endforelse
    </table>
    @endif

    @if($isDosen)
    <h2>E. RIWAYAT PENELITIAN &amp; PENGABDIAN</h2>
    <p>{{ $employee->functional?->riwayat_penelitian_pengabdian ?? '-' }}</p>

    <h2>F. PERNYATAAN</h2>
    <p>Data ini saya buat dengan sebenarnya.</p>
    <div class="ttd">
        <p>{{ $employee->alamat_domisili ?? $employee->tempat_lahir ?? '-' }}, {{ now()->format('d-m-Y') }}</p>
        <br><br><br>
        <p><strong>{{ $employee->nama_lengkap }}</strong></p>
        <p>(NIP/NIDN. {{ $employee->nip ?? $employee->nidn ?? '-' }})</p>
    </div>
    @endif

    <div class="footer">Dicetak dari ASM HRIS pada {{ now()->format('d-m-Y H:i') }}</div>
</body>
</html>
