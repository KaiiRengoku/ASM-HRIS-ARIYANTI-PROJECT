<p>Yth. {{ $nama }},</p>
<p>Pengajuan cuti/izin Anda ({{ $jenis }}, {{ $periode }}) telah diperbarui:</p>
<p><strong>Status: {{ $status }}</strong></p>
<p>{{ $pesan }}</p>
@if (!empty($tahapBerikut))
<p>Menunggu persetujuan tahap: <strong>{{ ['SUPERVISOR' => 'Atasan Langsung', 'DIREKTUR' => 'Direktur', 'KABAG' => 'Kepala Bagian'][$tahapBerikut] ?? 'HRD' }}</strong></p>
@endif
<p>Silakan buka sistem HRIS untuk detail lebih lanjut.</p>
