<?php

namespace App\Http\Controllers;

use App\Models\LeaveRequest;
use App\Models\LeaveApproval;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\Notification;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Services\LeaveCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LeaveController extends Controller
{

    // Kategori izin ditentukan dari prefiks kode tipe cuti (tidak ada kolom
    // category di tabel leave_types). Dipakai untuk tab Cuti/Izin & guard Dosen.
    private const KODE_IZIN = ['PERMIT_ABSENT', 'PERMIT_LEAVE_OFFICE'];

    private function canViewAll(Request $request): bool
    {
        return $request->user()->roles()->whereIn('code', ['HRD', 'KABAG', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists();
    }

    // Apakah user ini atasan langsung (punya bawahan)?
    private function punyaBawahan(Request $request): bool
    {
        return (bool) $request->user()->employee?->subordinates()->exists();
    }

    private function bawahanIds(Request $request): array
    {
        return $request->user()->employee?->subordinates()->pluck('id')->all() ?? [];
    }

    private function canSeeLeave(Request $request, LeaveRequest $leave): bool
    {
        $user = $request->user();
        $roles = $user->roles()->pluck('code')->all();
        if (array_intersect($roles, ['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])) {
            return true;
        }
        if ($leave->employee_id === $user->employee_id) {
            return true;
        }
        // Atasan langsung boleh melihat pengajuan bawahannya.
        $leave->loadMissing('employee');
        if ($user->employee_id && (int) $leave->employee?->supervisor_id === (int) $user->employee_id) {
            return true;
        }
        if (in_array('KABAG', $roles, true)) {
            $unitId = $this->kabagUnitId($request);
            if (!$unitId) {
                return true;
            }
            $leave->loadMissing('employee');
            return (int) ($leave->employee->organizational_unit_id ?? 0) === $unitId;
        }
        return false;
    }

    private function ownEmployeeId(Request $request): ?int
    {
        return $request->user()->employee_id;
    }

    // ── Alur persetujuan berjenjang ───────────────────────────────────────
    // Alur BARU (berbasis atasan langsung, dikunci pengguna):
    //   [Pengaju] → [atasan langsung] → HRD
    // Semua jabatan mengikuti satu pola ini; yang membedakan hanya kolom
    // supervisor_id pada pegawai pengaju.
    // Alur LAMA (fallback, TIDAK dihapus) dipakai bila pengaju belum punya
    // atasan langsung:
    //   Dosen/Pegawai         → Kabag     → HRD
    //   PD_I / PD_II / PD_III → Direktur  → HRD
    //   Kabag                 → HRD        (langsung)
    //   Direktur              → HRD        (langsung, tidak menyetujui sendiri)
    // Ditolak di tahap mana pun = berhenti total. Hanya HRD yang memotong saldo.
    // Pengajuan tanpa penyetuju di sistem ini dibiarkan tertahan sampai HRD
    // membuat data historis (status 'Disetujui HRD') lewat pencatatan HRD biasa.
    private const TAHAP_KABAG = 'KABAG';
    private const TAHAP_DIREKTUR = 'DIREKTUR';
    private const TAHAP_HRD = 'HRD';
    private const TAHAP_SUPERVISOR = 'SUPERVISOR';

    // Tahap awal alur LAMA, berdasarkan role pengaju (dipakai sebagai fallback).
    private function tahapAwalUntukPengaju(?string $rolePengaju): ?string
    {
        return match ($rolePengaju) {
            'DOSEN', 'PEGAWAI' => self::TAHAP_KABAG,
            'PD_I', 'PD_II', 'PD_III' => self::TAHAP_DIREKTUR,
            default => null, // KABAG, DIREKTUR, HRD → tertahan
        };
    }

    // Tahap awal pengajuan: atasan langsung bila sudah dipetakan, selain itu
    // jatuh ke alur lama (phased migration).
    private function tahapAwal(LeaveRequest $leave): ?string
    {
        $leave->loadMissing('employee');
        if ($leave->employee?->supervisor_id) {
            return self::TAHAP_SUPERVISOR;
        }

        return $this->tahapAwalUntukPengaju($this->rolePengaju($leave));
    }

    // Tahap sesudah tahap tertentu. Kabag/Direktur berujung ke HRD.
    private function tahapSetelah(string $tahap): ?string
    {
        return $tahap === self::TAHAP_HRD ? null : self::TAHAP_HRD;
    }

    // Role pengaju untuk menentukan tahap awal. roles()->first() tidak
    // deterministik bila user memegang >1 role, jadi pakai urutan prioritas tetap.
    private const PRIORITAS_ROLE = ['PD_I', 'PD_II', 'PD_III', 'DIREKTUR', 'KABAG', 'HRD', 'DOSEN', 'PEGAWAI'];

    private function roleUtama($user): ?string
    {
        if (!$user) {
            return null;
        }
        $codes = $user->roles()->pluck('code')->all();
        foreach (self::PRIORITAS_ROLE as $code) {
            if (in_array($code, $codes, true)) {
                return $code;
            }
        }

        return null;
    }

    private function rolePengaju(LeaveRequest $leave): ?string
    {
        $leave->loadMissing('employee.user');

        return $this->roleUtama($leave->employee?->user);
    }

    // Status pengajuan untuk sebuah tahap, tanpa memandang siapa pengajunya.
    // Dipakai untuk memeriksa izin bertindak.
    private function tahapMenungguStatus(LeaveRequest $leave): ?string
    {
        return match ($leave->status) {
            // Atasan langsung bila ada; jika tidak, alur lama sesuai role pengaju.
            // Pengaju tanpa penyetuju (Kabag/Direktur/HRD tanpa atasan) tertahan
            // di meja HRD sampai HRD memprosesnya.
            'Pending' => $this->tahapAwal($leave) ?? self::TAHAP_HRD,
            'Disetujui Atasan Langsung' => self::TAHAP_HRD, // setelah atasan selalu ke HRD
            'Disetujui Kepala Bagian' => self::TAHAP_HRD, // setelah Kabag selalu ke HRD
            'Disetujui Direktur' => self::TAHAP_HRD,
            default => null,
        };
    }

    // Daftar tahap yang boleh ditangani user ini (dipakai level filter & tombol aksi).
    // Pengguna yang punya bawahan juga berperan sebagai atasan langsung.
    private function tahapUntukPelaku(Request $request): array
    {
        $role = $this->roleUtama($request->user());
        $tahap = match ($role) {
            'KABAG' => [self::TAHAP_KABAG],
            'DIREKTUR' => [self::TAHAP_DIREKTUR],
            'HRD' => [self::TAHAP_HRD],
            default => [],
        };
        if ($request->user()->employee?->subordinates()->exists()) {
            $tahap[] = self::TAHAP_SUPERVISOR;
        }

        return $tahap;
    }

    // Label status untuk sebuah tahap.
    private function labelStatusTahap(string $tahap, bool $disetujui): string
    {
        $kata = $disetujui ? 'Disetujui' : 'Ditolak';

        return match ($tahap) {
            self::TAHAP_SUPERVISOR => "{$kata} Atasan Langsung",
            self::TAHAP_KABAG => "{$kata} Kepala Bagian",
            self::TAHAP_DIREKTUR => "{$kata} Direktur",
            default => "{$kata} HRD",
        };
    }

    // Apakah tahap ini milik user tersebut (memperhatikan pengaju & urutan)?
    // Dipakai approve(), reject(), dan penyaringan antrean.
    private function bolehBertindakDiTahap(Request $request, LeaveRequest $leave, ?string $tahap): bool
    {
        if (!$tahap) {
            return false;
        }
        // Tidak boleh menyetujui/menolak pengajuan sendiri (termasuk HRD).
        if ((int) $leave->employee_id === (int) $request->user()->employee_id) {
            return false;
        }
        // Tahap yang diminta harus sama dengan tahap yang sedang menunggu.
        if ($this->tahapMenungguStatus($leave) !== $tahap) {
            return false;
        }
        if (!in_array($tahap, $this->tahapUntukPelaku($request), true)) {
            return false;
        }
        // Tahap atasan langsung: hanya atasan yang dipetakan pada pengaju.
        if ($tahap === self::TAHAP_SUPERVISOR) {
            $leave->loadMissing('employee');

            return $request->user()->employee_id !== null
                && (int) $leave->employee->supervisor_id === (int) $request->user()->employee_id;
        }

        return true;
    }

    private function notifyLeaveStatus(LeaveRequest $leave, $actor, string $statusText, string $message): void
    {
        $leave->loadMissing(['employee.user', 'leaveType']);
        // Tahap yang kini menunggu, supaya pengaju tahu siapa penanggung jawabnya.
        $tahapBerikut = $this->tahapMenungguStatus($leave);
        $userId = $leave->employee->user->id ?? \App\Models\User::where('employee_id', $leave->employee_id)->value('id');
        if ($userId) {
            $notification = Notification::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'user_id' => $userId,
                'type' => 'leave_status',
                'title' => 'Status Cuti Berubah',
                'message' => $message,
                'data' => ['leave_id' => $leave->id, 'status' => $statusText, 'tahap_berikut' => $tahapBerikut],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            \App\Events\NotificationSent::dispatch($notification);
        }
        try {
            $to = $leave->employee->email ?? $leave->employee->user->email ?? null;
            if ($to) {
                \Illuminate\Support\Facades\Mail::to($to)->send(new \App\Mail\LeaveStatusMail($leave, $statusText, $message, $tahapBerikut));
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Gagal kirim email notifikasi cuti: ' . $e->getMessage());
        }
    }

    // Kebutuhan §1.1: HRD mencatat & mengarsipkan hasil keputusan akhir sebagai arsip digital.
    private function archiveDecision(LeaveRequest $leave, string $statusText): void
    {
        try {
            $leave->loadMissing(['employee', 'leaveType', 'approvals.approver']);
            // Skema tingkat: 1 = penyetuju pertama (atasan langsung/Kabag/Direktur), 2 = HRD.
            $atasan = $leave->approvals->firstWhere('approval_level', 1);
            $hrd = $leave->approvals->firstWhere('approval_level', 2);
            $last = $leave->approvals->sortByDesc('acted_at')->first();
            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.leave-decision', [
                'leave' => $leave,
                'kabagName' => $atasan?->approver?->name ?? '-',
                'kabagDate' => $atasan?->acted_at?->format('d-m-Y') ?? '-',
                'hrdName' => $hrd?->approver?->name ?? $last?->approver?->name ?? '-',
                'hrdDate' => ($hrd?->acted_at ?? $last?->acted_at)?->format('d-m-Y') ?? '-',
            ]);
            $path = 'leave-decisions/' . $leave->id . '.pdf';
            \Illuminate\Support\Facades\Storage::disk('public')->put($path, $pdf->output());
            \App\Models\EmployeeDocument::create([
                'employee_id' => $leave->employee_id,
                'document_type' => 'SK Cuti',
                'file_name' => 'keputusan_cuti_' . $leave->id . '.pdf',
                'storage_disk' => 'public',
                'storage_path' => $path,
                'mime_type' => 'application/pdf',
                'file_size' => \Illuminate\Support\Facades\Storage::disk('public')->size($path),
                'uploaded_by' => $last?->approver_id,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Gagal arsip keputusan cuti: ' . $e->getMessage());
        }
    }

    private function removeDecisionArchive(LeaveRequest $leave): void
    {
        foreach (\App\Models\EmployeeDocument::where('employee_id', $leave->employee_id)->where('document_type', 'SK Cuti')->where('file_name', 'keputusan_cuti_' . $leave->id . '.pdf')->get() as $doc) {
            \Illuminate\Support\Facades\Storage::disk($doc->storage_disk)->delete($doc->storage_path);
            $doc->delete();
        }
    }

    public function index(Request $request)
    {
        $query = LeaveRequest::with(['employee', 'leaveType', 'approvals']);

        $isAtasan = $this->punyaBawahan($request);
        if (!$this->canViewAll($request)) {
            // Atasan langsung melihat pengajuan dirinya + bawahannya.
            $bawahanIds = $isAtasan ? $this->bawahanIds($request) : [];
            $query->whereIn('employee_id', array_merge([$this->ownEmployeeId($request)], $bawahanIds));
        } else {
            if ($unitId = $this->kabagUnitId($request)) {
                $query->whereHas('employee', fn ($q) => $q->where('organizational_unit_id', $unitId));
            }
            if ($request->employee_id) {
                $query->where('employee_id', $request->employee_id);
            }
        }

        // Antrean "menunggu persetujuan saya": status menunggu + tahap untuk peran ini.
        // Atasan/Kabag/Direktur → tahap sendiri; HRD → semua tahap yang berujung ke HRD.
        if ($request->has('level') && $request->level !== '' && $request->level !== 'all') {
            $tahapPelaku = $this->tahapUntukPelaku($request);
            $bisaHrd = in_array(self::TAHAP_HRD, $tahapPelaku, true);
            $statusMenunggu = [];
            if ($bisaHrd) {
                $statusMenunggu = ['Pending', 'Disetujui Atasan Langsung', 'Disetujui Kepala Bagian', 'Disetujui Direktur'];
            } elseif ($tahapPelaku) {
                $statusMenunggu = ['Pending'];
            }
            if ($tahapPelaku) {
                $query->whereIn('status', $statusMenunggu);
                // Selain HRD, saring tahap yang benar-benar menuju meja pelaku.
                // Kandidat diambil dari $query yang sudah dipersempit (scope unit/diri +
                // status menunggu) — bukan seluruh tabel leave_requests.
                // shortcut: tahap menunggu bergantung pada role pengaju (relasi user.roles),
                // jadi saring di memori atas kandidat kecil ini; pindahkan ke SQL bila
                // jumlah cuti Pending per unit sudah besar.
                if (!$bisaHrd) {
                    $ids = (clone $query)->get()
                        ->filter(fn ($l) => collect($tahapPelaku)->contains(fn ($t) => $this->bolehBertindakDiTahap($request, $l, $t)))
                        ->pluck('id');
                    $query->whereIn('id', $ids);
                }
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Tab Cuti/Izin: pisahkan berdasarkan kategori tipe cuti. Additive —
        // tanpa param 'category', perilaku lama tidak berubah.
        if ($request->category === 'izin') {
            $query->whereHas('leaveType', fn ($q) => $q->whereIn('code', self::KODE_IZIN));
        } elseif ($request->category === 'cuti') {
            $query->whereHas('leaveType', fn ($q) => $q->whereNotIn('code', self::KODE_IZIN));
        }

        // Halaman Cuti/Izin hanya menampilkan data yang sudah tuntas (disetujui
        // final HRD). Additive — tanpa param 'only', perilaku lama tidak berubah.
        if ($request->only === 'approved') {
            $query->where('status', 'Disetujui HRD');
        }

        if ($request->search) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('nama_lengkap', 'LIKE', "%{$request->search}%")
                  ->orWhere('nik', 'LIKE', "%{$request->search}%");
            });
        }

        $leaves = $query->latest()->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $leaves->items(),
            'meta' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $canEnterOthers = $request->user()->hasPermission('leave.update');
        if (!$canEnterOthers) {
            $request->merge(['employee_id' => $this->ownEmployeeId($request)]);
        }
        if (!$request->employee_id) {
            return response()->json(['success' => false, 'message' => 'Data pegawai tidak ditemukan untuk akun ini.'], 422);
        }
        $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string'],
            'attachment' => ['nullable', 'file', 'max:51200', 'mimes:pdf,jpg,jpeg,png'],
            'emergency_address' => ['nullable', 'string', 'max:255'],
            'emergency_contact' => ['nullable', 'string', 'max:50'],
            'is_emergency' => ['nullable', 'boolean'],
            'emergency_reason' => ['nullable', 'string'],
        ]);

        // Guard: Dosen tidak punya fitur Cuti — hanya boleh mengajukan Izin.
        // Ditegakkan di backend agar tidak bisa ditembus lewat API.
        if ($request->user()->hasRole('DOSEN')) {
            $tipeDiajukan = \App\Models\LeaveType::find($request->leave_type_id);
            if ($tipeDiajukan && !in_array($tipeDiajukan->code, self::KODE_IZIN, true)) {
                return response()->json(['success' => false, 'message' => 'Dosen hanya dapat mengajukan Izin, bukan Cuti.'], 403);
            }
        }

        $isEmergency = $request->boolean('is_emergency');
        $daysUntilStart = Carbon::today()->diffInDays(Carbon::parse($request->start_date), false);
        if ($daysUntilStart < 7 && !$isEmergency) {
            return response()->json(['success' => false, 'message' => 'Cuti tahunan wajib diajukan minimal 1 minggu sebelumnya kecuali dalam keadaan darurat.'], 400);
        }
        if ($daysUntilStart < 7 && $isEmergency && !$request->filled('emergency_reason')) {
            return response()->json(['success' => false, 'message' => 'Alasan keadaan darurat wajib diisi.'], 400);
        }

        $emp = \App\Models\Employee::find($request->employee_id ?? $request->user()->employee_id);
        $totalDays = \App\Services\WorkingDayService::count($request->start_date, $request->end_date, $emp?->organizational_unit_id);
        if ($totalDays < 1) return response()->json(['success' => false, 'message' => 'Total hari kerja 0. Rentang hanya berisi akhir pekan/libur.'], 400);

        // Tolak rentang yang tumpang tindih dengan pengajuan yang masih hidup
        // (belum ditolak/dibatalkan/dihapus) untuk pegawai yang sama.
        $tumpangTindih = LeaveRequest::where('employee_id', $request->employee_id)
            ->whereNotIn('status', ['Cancelled', 'Ditolak Atasan Langsung', 'Ditolak Kepala Bagian', 'Ditolak Direktur', 'Ditolak HRD'])
            ->where('start_date', '<=', $request->end_date)
            ->where('end_date', '>=', $request->start_date)
            ->exists();
        if ($tumpangTindih) {
            return response()->json(['success' => false, 'message' => 'Rentang tanggal tumpang tindih dengan pengajuan cuti/izin lain yang masih aktif.'], 400);
        }

        // Saldo cuti tidak lagi memblokir pengajuan. Perhitungan/pemotongan
        // diserahkan ke HRD secara manual (lihat leave-balances/adjust).

        $leave = LeaveRequest::create([
            'employee_id' => $request->employee_id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'total_days' => $totalDays,
            'reason' => $request->reason,
            'status' => 'Pending',
            'submitted_at' => now(),
            'source' => $canEnterOthers ? 'MANUAL' : 'ONLINE',
            'created_by' => $request->user()->id,
            'emergency_address' => $request->emergency_address,
            'emergency_contact' => $request->emergency_contact,
            'is_emergency' => $isEmergency,
            'emergency_reason' => $request->emergency_reason,
        ]);

        // Handle attachment if any
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $path = $file->store('leave-attachments/' . $leave->id, 'public');
            \App\Models\LeaveAttachment::create([
                'leave_request_id' => $leave->id,
                'attachment_type' => 'MEDICAL_CERTIFICATE',
                'file_name' => $file->getClientOriginalName(),
                'storage_disk' => 'public',
                'storage_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
                'verification_status' => 'PENDING',
            ]);
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'SUBMIT_LEAVE',
            'auditable_type' => LeaveRequest::class,
            'auditable_id' => $leave->id,
            'new_values' => ['employee_id' => $leave->employee_id, 'leave_type_id' => $leave->leave_type_id, 'start_date' => $leave->start_date, 'end_date' => $leave->end_date],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        $this->notifyApprovers($leave);

        return response()->json(['success' => true, 'data' => $leave]);
    }

    // Kirim notifikasi "menunggu persetujuan Anda" ke meja yang benar:
    // atasan langsung bila ada; jika tidak, alur lama (Kabag scope unit /
    // semua Direktur / semua HRD). Bila tahap awal null (pengaju tanpa
    // penyetuju), tidak ada notifikasi — pengajuan sengaja dibiarkan tertahan.
    private function notifyApprovers(LeaveRequest $leave): void
    {
        $tahap = $this->tahapMenungguStatus($leave);
        if (!$tahap) {
            return; // tertahan: tidak ada meja yang dituju
        }
        if ($tahap === self::TAHAP_SUPERVISOR) {
            $this->notifySupervisor($leave);
        } elseif ($tahap === self::TAHAP_HRD) {
            $this->notifyRole($leave, 'HRD');
        } else {
            $this->notifyRole($leave, $tahap, $tahap === self::TAHAP_KABAG);
        }
    }

    // Kabari atasan langsung pengaju (satu orang spesifik).
    private function notifySupervisor(LeaveRequest $leave): void
    {
        $leave->loadMissing('employee');
        $atasan = Employee::with('user')->find($leave->employee?->supervisor_id);
        $penerima = $atasan?->user;
        if (!$penerima || $penerima->id === ($leave->employee->user?->id)) {
            return;
        }
        $this->notifyUser($leave, $penerima, self::TAHAP_SUPERVISOR);
    }

    // Kabari semua user pemegang role tertentu. Untuk Kabag, hormati scope unit.
    private function notifyRole(LeaveRequest $leave, string $roleCode, bool $scopeUnit = false): void
    {
        $unitId = $leave->employee->organizational_unit_id ?? null;

        $users = \App\Models\User::whereHas('roles', fn ($q) => $q->where('code', $roleCode))
            ->with('employee')
            ->get()
            ->filter(function ($u) use ($unitId, $leave, $scopeUnit) {
                if ($u->employee_id === $leave->employee_id) {
                    return false; // jangan kabari dirinya sendiri
                }
                if (!$scopeUnit || !$unitId || !$u->employee?->organizational_unit_id) {
                    return true; // tanpa scope unit, atau unit belum terisi → semua
                }
                return (int) $u->employee->organizational_unit_id === (int) $unitId;
            });

        foreach ($users as $penerima) {
            $this->notifyUser($leave, $penerima, $roleCode);
        }
    }

    private function notifyUser(LeaveRequest $leave, \App\Models\User $penerima, string $tahap): void
    {
        $notification = Notification::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $penerima->id,
            'type' => 'leave_submitted',
            'title' => 'Pengajuan Cuti Baru',
            'message' => ($leave->employee->nama_lengkap ?? 'Pegawai') . ' mengajukan cuti dan menunggu persetujuan Anda.',
            'data' => ['leave_id' => $leave->id, 'tahap' => $tahap],
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        \App\Events\NotificationSent::dispatch($notification);
    }

    public function show(Request $request, LeaveRequest $leave)
    {
        if (!$this->canSeeLeave($request, $leave)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $leave->load(['employee', 'leaveType', 'approvals.approver', 'attachments']);
        $leave->setAttribute('tahap_menunggu', $this->tahapMenungguStatus($leave));
        return response()->json(['success' => true, 'data' => $leave]);
    }

    public function approve(Request $request, LeaveRequest $leave)
    {
        $user = $request->user();
        $tahapPelaku = $this->tahapUntukPelaku($request);

        if (!$tahapPelaku) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki kewenangan.'], 403);
        }

        if (!$this->canSeeLeave($request, $leave)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $tahapMenunggu = $this->tahapMenungguStatus($leave);
        if (!$tahapMenunggu) {
            return response()->json(['success' => false, 'message' => 'Pengajuan ini tidak sedang menunggu persetujuan.'], 400);
        }

        // HRD selalu boleh bertindak di tahap HRD; atasan/Kabag/Direktur hanya di
        // tahapnya sendiri, dan hanya untuk pengajuan yang memang menuju mejanya.
        if (!in_array($tahapMenunggu, $tahapPelaku, true) || !$this->bolehBertindakDiTahap($request, $leave, $tahapMenunggu)) {
            if ($tahapMenunggu === self::TAHAP_HRD) {
                return response()->json(['success' => false, 'message' => 'Pengajuan ini belum sampai ke meja HRD.'], 400);
            }
            return response()->json(['success' => false, 'message' => 'Pengajuan ini menunggu tahap lain.'], 400);
        }

        // Nomor tingkat persetujuan (untuk riwayat): 1 = penyetuju pertama
        // (atasan langsung/Kabag/Direktur), 2 = HRD.
        $level = $tahapMenunggu === self::TAHAP_HRD ? 2 : 1;

        if ($leave->approvals()->where('approval_level', $level)->exists()) {
            return response()->json(['success' => false, 'message' => 'Sudah disetujui pada tahap ini.'], 400);
        }

        try {
        DB::transaction(function () use ($leave, $user, $tahapMenunggu, $level, $request) {
            LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'approver_id' => $user->id,
                'approval_level' => $level,
                'status' => 'APPROVED',
                'reason' => null,
                'acted_at' => now(),
            ]);

            if ($tahapMenunggu === self::TAHAP_HRD) {
                // Finalisasi: potong saldo + arsip PDF "SK Cuti".
                // Cuti Sakit ber-surat dokter tidak memotong saldo.
                $leave->status = 'Disetujui HRD';
                $leave->finalized_at = now();

                $leaveType = $leave->leaveType;
                $isSickCertified = $leaveType->code === 'SICK'
                    && $leave->attachments()->where('verification_status', 'VERIFIED')->exists();
                if ($leaveType->is_leave_balance_deducted && !$isSickCertified) {
                    // Kebijakan: potong saldo pada tahun tanggal MULAI cuti (cuti lintas tahun tetap
                    // memotong satu baris saldo tahun start_date), bukan tahun persetujuan HRD.
                    $periodYear = $leave->start_date->year;
                    // lockForUpdate: kunci baris saldo selama transaksi agar dua approval
                    // bersamaan tidak saling menimpa (lost update).
                    $balance = LeaveBalance::where('employee_id', $leave->employee_id)
                        ->where('leave_type_id', $leave->leave_type_id)
                        ->where('period_year', $periodYear)
                        ->lockForUpdate()
                        ->first();
                    if (!$balance) {
                        // Jangan finalkan cuti tanpa memotong saldo. Batalkan transaksi.
                        throw new \RuntimeException("Saldo cuti tahun {$periodYear} belum dibuat. Buat saldo lebih dulu lewat menu Saldo Cuti.");
                    }

                    $balanceBefore = $balance->remaining_days;
                    $balance->used_days += $leave->total_days;
                    // Jangan biarkan saldo negatif walau pengajuan melebihi jatah.
                    $balance->remaining_days = max(0, $balance->entitled_days + $balance->adjustment_days - $balance->used_days);
                    $balance->save();

                    LeaveBalanceTransaction::create([
                        'leave_balance_id' => $balance->id,
                        'employee_id' => $leave->employee_id,
                        'leave_request_id' => $leave->id,
                        'transaction_type' => 'DEDUCT',
                        'amount' => -$leave->total_days,
                        'balance_before' => $balanceBefore,
                        'balance_after' => $balance->remaining_days,
                        'reason' => 'Cuti disetujui HRD',
                        'created_by' => $user->id,
                    ]);
                }
            } else {
                // Kabag / Direktur menyetujui → lanjut ke HRD.
                $leave->status = $this->labelStatusTahap($tahapMenunggu, true);
            }
            $leave->save();

            $statusText = $leave->status;
            $tahapBerikut = $this->tahapMenungguStatus($leave);
            if ($tahapMenunggu === self::TAHAP_HRD) {
                $this->archiveDecision($leave, $statusText);
            }
            $leaveTypeName = $leave->leaveType->name ?? 'Cuti';
            $msg = "Pengajuan cuti {$leaveTypeName} Anda telah disetujui oleh {$user->name}"
                . ($tahapBerikut === self::TAHAP_HRD ? ' (menunggu HRD)' : '');

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'APPROVE_LEAVE',
                'auditable_type' => 'App\\Models\\LeaveRequest',
                'auditable_id' => $leave->id,
                'old_values' => null,
                'new_values' => ['status' => $statusText, 'tahap' => $tahapMenunggu],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);

            $this->notifyLeaveStatus($leave, $user, $statusText, $msg);
            // Kabari meja berikutnya (HRD) bila masih perlu dilanjutkan.
            $this->notifyApprovers($leave);
        });
        } catch (\RuntimeException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }

        return response()->json(['success' => true, 'message' => 'Pengajuan berhasil disetujui.']);
    }

    public function reject(Request $request, LeaveRequest $leave)
    {
        $request->validate(['reason' => 'required|string']);

        $user = $request->user();
        $tahapPelaku = $this->tahapUntukPelaku($request);

        if (!$tahapPelaku) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki kewenangan.'], 403);
        }

        $tahapMenunggu = $this->tahapMenungguStatus($leave);
        if (!$tahapMenunggu) {
            return response()->json(['success' => false, 'message' => 'Pengajuan ini tidak sedang menunggu persetujuan.'], 400);
        }

        if (!in_array($tahapMenunggu, $tahapPelaku, true) || !$this->bolehBertindakDiTahap($request, $leave, $tahapMenunggu)) {
            if ($tahapMenunggu === self::TAHAP_HRD) {
                return response()->json(['success' => false, 'message' => 'Pengajuan ini belum sampai ke meja HRD.'], 400);
            }
            return response()->json(['success' => false, 'message' => 'Pengajuan ini menunggu tahap lain.'], 400);
        }

        // 1 = penyetuju pertama (atasan langsung/Kabag/Direktur), 2 = HRD.
        $level = $tahapMenunggu === self::TAHAP_HRD ? 2 : 1;

        // Prevent duplicate rejection
        if ($leave->approvals()->where('approval_level', $level)->exists()) {
            return response()->json(['success' => false, 'message' => 'Sudah diproses pada tahap ini.'], 400);
        }

        DB::transaction(function () use ($leave, $user, $tahapMenunggu, $level, $request) {
            LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'approver_id' => $user->id,
                'approval_level' => $level,
                'status' => 'REJECTED',
                'reason' => $request->reason,
                'acted_at' => now(),
            ]);

            // Ditolak di tahap mana pun = berhenti total. Bila yang menolak adalah
            // Kabag/Direktur, HRD tidak diberi tahu sama sekali.
            $statusText = $this->labelStatusTahap($tahapMenunggu, false);
            $leave->status = $statusText;
            $leave->save();

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'REJECT_LEAVE',
                'auditable_type' => 'App\\Models\\LeaveRequest',
                'auditable_id' => $leave->id,
                'old_values' => null,
                'new_values' => ['status' => $statusText, 'reason' => $request->reason, 'tahap' => $tahapMenunggu],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);

            $leaveTypeName = $leave->leaveType->name ?? 'Cuti';
            $msg = "Pengajuan cuti {$leaveTypeName} Anda ditolak oleh {$user->name}. Alasan: {$request->reason}";
            $this->notifyLeaveStatus($leave, $user, $statusText, $msg);
        });

        return response()->json(['success' => true, 'message' => 'Pengajuan ditolak.']);
    }

    public function cancel(Request $request, LeaveRequest $leave)
    {
        $canManage = $request->user()->hasPermission('leave.update');
        if (!$canManage && $leave->employee_id !== $this->ownEmployeeId($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $oldStatus = $leave->status;
        $wasFinal = $oldStatus === 'Disetujui HRD';
        if (!$canManage && $wasFinal) {
            return response()->json(['success' => false, 'message' => 'Cuti yang sudah disetujui HRD hanya dapat dibatalkan oleh pengelola (hak ubah cuti).'], 400);
        }
        if (!in_array($oldStatus, ['Pending', 'Disetujui Atasan Langsung', 'Disetujui Kepala Bagian', 'Disetujui Direktur', 'Disetujui HRD'])) {
            return response()->json(['success' => false, 'message' => 'Status tidak dapat dibatalkan.'], 400);
        }
        DB::transaction(function () use ($leave, $oldStatus, $wasFinal, $request) {
            $leave->status = 'Cancelled';
            $leave->cancelled_at = now();
            $leave->save();

            if ($wasFinal) {
                $this->removeDecisionArchive($leave);
                // Refund memakai baris saldo yang sama dengan saat pemotongan
                // (yang pada approve() dikunci ke tahun start_date cuti).
                $deduct = LeaveBalanceTransaction::where('leave_request_id', $leave->id)
                    ->where('transaction_type', 'DEDUCT')->first();
                if ($deduct) {
                    $balance = LeaveBalance::whereKey($deduct->leave_balance_id)->lockForUpdate()->first();
                    if ($balance) {
                        $before = $balance->remaining_days;
                        $balance->used_days = max(0, $balance->used_days - $leave->total_days);
                        $balance->remaining_days = $balance->entitled_days + $balance->adjustment_days - $balance->used_days;
                        $balance->save();
                        LeaveBalanceTransaction::create([
                            'leave_balance_id' => $balance->id,
                            'employee_id' => $leave->employee_id,
                            'leave_request_id' => $leave->id,
                            'transaction_type' => 'REVERSAL',
                            'amount' => $leave->total_days,
                            'balance_before' => $before,
                            'balance_after' => $balance->remaining_days,
                            'reason' => 'Pembatalan cuti oleh ' . ($request->user()->name ?? 'HRD'),
                            'created_by' => $request->user()->id,
                        ]);
                    }
                }
            }

            AuditLog::create([
                'user_id' => $request->user()->id,
                'action' => 'CANCEL_LEAVE',
                'auditable_type' => LeaveRequest::class,
                'auditable_id' => $leave->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'Cancelled'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);

            $this->notifyLeaveStatus($leave, $request->user(), 'Cancelled', 'Pengajuan cuti Anda dibatalkan.');
        });

        return response()->json(['success' => true, 'message' => 'Pengajuan dibatalkan.']);
    }

    // HRD can adjust balance manually (already in request)

    public function destroy(Request $request, LeaveRequest $leave)
    {
        $user = $request->user();

        $validated = $request->validate([
            'reason' => ['required', 'string'],
        ], [
            'reason.required' => 'Alasan penghapusan wajib diisi.',
            'reason.string' => 'Alasan penghapusan harus berupa teks.',
        ]);

        $wasFinal = $leave->status === 'Disetujui HRD';
        if (!in_array($leave->status, ['Pending', 'Disetujui Atasan Langsung', 'Disetujui Kepala Bagian', 'Disetujui Direktur', 'Disetujui HRD', 'Ditolak Atasan Langsung', 'Ditolak Kepala Bagian', 'Ditolak Direktur', 'Ditolak HRD', 'Cancelled'], true)) {
            return response()->json(['success' => false, 'message' => 'Status tidak dapat dihapus.'], 400);
        }
        $old = $leave->only(['employee_id', 'leave_type_id', 'start_date', 'end_date', 'total_days', 'status']);
        $leaveId = $leave->id;

        DB::transaction(function () use ($leave, $leaveId, $old, $wasFinal, $user, $request, $validated) {
            if ($wasFinal) {
                // Refund memakai baris saldo yang sama dengan saat pemotongan
                // (yang pada approve() dikunci ke tahun start_date cuti).
                $deduct = LeaveBalanceTransaction::where('leave_request_id', $leaveId)
                    ->where('transaction_type', 'DEDUCT')->first();
                if ($deduct) {
                    $balance = LeaveBalance::whereKey($deduct->leave_balance_id)->lockForUpdate()->first();
                    if ($balance) {
                        $before = $balance->remaining_days;
                        $balance->used_days = max(0, $balance->used_days - $leave->total_days);
                        $balance->remaining_days = $balance->entitled_days + $balance->adjustment_days - $balance->used_days;
                        $balance->save();

                        // Catat pembalikan sebagai baris ledger baru; baris DEDUCT lama
                        // tetap tersimpan agar mutasi saldo dapat ditelusuri.
                        LeaveBalanceTransaction::create([
                            'leave_balance_id' => $balance->id,
                            'employee_id' => $leave->employee_id,
                            'leave_request_id' => $leaveId,
                            'transaction_type' => 'REVERSAL',
                            'amount' => $leave->total_days,
                            'balance_before' => $before,
                            'balance_after' => $balance->remaining_days,
                            'reason' => 'Pengajuan cuti dihapus: ' . $validated['reason'],
                            'created_by' => $user->id,
                        ]);
                    }
                }
            }

            $this->removeDecisionArchive($leave);
            foreach ($leave->attachments as $attachment) {
                if (\Illuminate\Support\Facades\Storage::disk($attachment->storage_disk)->exists($attachment->storage_path)) {
                    \Illuminate\Support\Facades\Storage::disk($attachment->storage_disk)->delete($attachment->storage_path);
                }
            }

            $this->notifyLeaveStatus($leave, $user, 'Dihapus', 'Pengajuan cuti Anda dihapus oleh HRD. Alasan: ' . $validated['reason']);

            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'DELETE_LEAVE',
                'auditable_type' => LeaveRequest::class,
                'auditable_id' => $leaveId,
                'old_values' => $old,
                'new_values' => ['deleted' => true, 'reason' => $validated['reason']],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);

            $leave->delete();
        });

        return response()->json(['success' => true, 'message' => 'Histori cuti dihapus permanen.']);
    }

    public function downloadAttachment(Request $request, \App\Models\LeaveAttachment $attachment)
    {
        $leave = $attachment->leaveRequest;
        // Pakai aturan yang sama dengan show(): KABAG tetap dibatasi unitnya.
        if (!$leave || !$this->canSeeLeave($request, $leave)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        if (!\Illuminate\Support\Facades\Storage::disk($attachment->storage_disk)->exists($attachment->storage_path)) {
            return response()->json(['success' => false, 'message' => 'File tidak ditemukan.'], 404);
        }
        return \Illuminate\Support\Facades\Storage::disk($attachment->storage_disk)->download($attachment->storage_path, $attachment->file_name);
    }

    public function verifyAttachment(Request $request, \App\Models\LeaveAttachment $attachment)
    {
        $leave = $attachment->leaveRequest;
        // Hanya penyetuju yang berhak atas pengajuan ini (KABAG dibatasi unitnya).
        if (!$leave || !$this->canSeeLeave($request, $leave)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $validated = $request->validate([
            'status' => ['required', 'in:VERIFIED,REJECTED'],
            'note' => ['nullable', 'string'],
        ]);
        $attachment->update([
            'verification_status' => $validated['status'],
            'verification_note' => $validated['note'] ?? null,
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'VERIFY_ATTACHMENT',
            'auditable_type' => \App\Models\LeaveAttachment::class,
            'auditable_id' => $attachment->id,
            'new_values' => ['status' => $validated['status']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
        return response()->json(['success' => true, 'data' => $attachment]);
    }
}