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
    private function canViewAll(Request $request): bool
    {
        return $request->user()->roles()->whereIn('code', ['HRD', 'KABAG', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists();
    }

    private function ownEmployeeId(Request $request): ?int
    {
        return $request->user()->employee_id;
    }

    private function notifyLeaveStatus(LeaveRequest $leave, $actor, string $statusText, string $message): void
    {
        $leave->loadMissing(['employee.user', 'leaveType']);
        $userId = $leave->employee->user->id ?? \App\Models\User::where('employee_id', $leave->employee_id)->value('id');
        if ($userId) {
            $notification = Notification::create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'user_id' => $userId,
                'type' => 'leave_status',
                'title' => 'Status Cuti Berubah',
                'message' => $message,
                'data' => ['leave_id' => $leave->id, 'status' => $statusText],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            \App\Events\NotificationSent::dispatch($notification);
        }
        try {
            $to = $leave->employee->email ?? $leave->employee->user->email ?? null;
            if ($to) {
                \Illuminate\Support\Facades\Mail::to($to)->send(new \App\Mail\LeaveStatusMail($leave, $statusText, $message));
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Gagal kirim email notifikasi cuti: ' . $e->getMessage());
        }
    }

    public function index(Request $request)
    {
        $query = LeaveRequest::with(['employee', 'leaveType', 'approvals']);

        if (!$this->canViewAll($request)) {
            $query->where('employee_id', $this->ownEmployeeId($request));
        } elseif ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->level == 1) {
            $query->where('status', 'Pending');
        } elseif ($request->level == 2) {
            $query->where('status', 'Disetujui Kepala Bagian');
        }

        if ($request->status) {
            $query->where('status', $request->status);
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
        $isHrd = $request->user()->roles()->where('code', 'HRD')->exists();
        if (!$isHrd) {
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
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png'],
            'emergency_address' => ['nullable', 'string', 'max:255'],
            'emergency_contact' => ['nullable', 'string', 'max:50'],
            'is_emergency' => ['nullable', 'boolean'],
            'emergency_reason' => ['nullable', 'string'],
        ]);

        $isEmergency = $request->boolean('is_emergency');
        $daysUntilStart = Carbon::today()->diffInDays(Carbon::parse($request->start_date), false);
        if ($daysUntilStart < 7 && !$isEmergency) {
            return response()->json(['success' => false, 'message' => 'Cuti tahunan wajib diajukan minimal 1 minggu sebelumnya kecuali dalam keadaan darurat.'], 400);
        }
        if ($daysUntilStart < 7 && $isEmergency && !$request->filled('emergency_reason')) {
            return response()->json(['success' => false, 'message' => 'Alasan keadaan darurat wajib diisi.'], 400);
        }

        // Calculate total days (simplified: count days between start and end inclusive)
        $start = new \DateTime($request->start_date);
        $end = new \DateTime($request->end_date);
        $interval = $start->diff($end);
        $totalDays = $interval->days + 1; // inclusive

        // Check if leave type deducts balance and if enough balance
        $leaveType = \App\Models\LeaveType::find($request->leave_type_id);
        $isSick = $leaveType->code === 'SICK';
        $hasCertificate = $request->hasFile('attachment');
        $deducts = $leaveType->is_leave_balance_deducted && (!$isSick || !$hasCertificate);
        if ($deducts) {
            $balance = LeaveBalance::where('employee_id', $request->employee_id)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('period_year', date('Y'))
                ->first();
            if (!$balance || $balance->remaining_days < $totalDays) {
                return response()->json(['success' => false, 'message' => 'Saldo cuti tidak mencukupi.'], 400);
            }
        }

        $leave = LeaveRequest::create([
            'employee_id' => $request->employee_id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'total_days' => $totalDays,
            'reason' => $request->reason,
            'status' => 'Pending',
            'submitted_at' => now(),
            'source' => ($request->user()->roles->first()->code ?? null) === 'HRD' ? 'MANUAL' : 'ONLINE',
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

        return response()->json(['success' => true, 'data' => $leave]);
    }

    public function show(Request $request, LeaveRequest $leave)
    {
        if (!$this->canViewAll($request) && $leave->employee_id !== $this->ownEmployeeId($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        return response()->json(['success' => true, 'data' => $leave->load(['employee', 'leaveType', 'approvals', 'attachments'])]);
    }

    public function approve(Request $request, LeaveRequest $leave)
    {
        // Only Kabag can approve at level 1
        $user = $request->user();
        $role = $user->roles->first()->code ?? null;
        $level = $role === 'KABAG' ? 1 : ($role === 'HRD' ? 2 : null);

        if (!$level) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki kewenangan.'], 403);
        }

        // Check if already approved at this level
        if ($leave->approvals()->where('approval_level', $level)->exists()) {
            return response()->json(['success' => false, 'message' => 'Sudah disetujui pada level ini.'], 400);
        }

        if ($level === 1 && $leave->status !== 'Pending') {
            return response()->json(['success' => false, 'message' => 'Hanya pengajuan Pending yang dapat disetujui Kepala Bagian.'], 400);
        }
        if ($level === 2 && $leave->status !== 'Disetujui Kepala Bagian') {
            return response()->json(['success' => false, 'message' => 'Hanya pengajuan yang sudah Disetujui Kepala Bagian yang dapat difinalisasi HRD.'], 400);
        }

        // If Kabag approves, status becomes 'Disetujui Kepala Bagian' and requires HRD
        // If HRD approves, finalize
        DB::transaction(function () use ($leave, $user, $level, $request) {
            $approval = LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'approver_id' => $user->id,
                'approval_level' => $level,
                'status' => 'APPROVED',
                'reason' => null,
                'acted_at' => now(),
            ]);

            if ($level === 1) {
                $leave->status = 'Disetujui Kepala Bagian';
            } else if ($level === 2) {
                // Finalize: update leave balance
                $leave->status = 'Disetujui HRD';
                $leave->finalized_at = now();

                // Deduct balance if leave type deducts; sick leave with medical certificate does not deduct
                $leaveType = $leave->leaveType;
                $isSickCertified = $leaveType->code === 'SICK' && $leave->attachments()->exists();
                if ($leaveType->is_leave_balance_deducted && !$isSickCertified) {
                    $balance = LeaveBalance::where('employee_id', $leave->employee_id)
                        ->where('leave_type_id', $leave->leave_type_id)
                        ->where('period_year', date('Y'))
                        ->first();
                    if ($balance) {
                        $balanceBefore = $balance->remaining_days;
                        $balance->used_days += $leave->total_days;
                        $balance->remaining_days = $balance->entitled_days + $balance->adjustment_days - $balance->used_days;
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
                }
            }
            $leave->save();

            $statusText = $level === 1 ? 'Disetujui Kepala Bagian' : 'Disetujui HRD';
            $leaveTypeName = $leave->leaveType->name ?? 'Cuti';
            $msg = "Pengajuan cuti {$leaveTypeName} Anda telah disetujui oleh {$user->name}" . ($level === 1 ? ' (menunggu HRD)' : '');

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'APPROVE_LEAVE',
                'auditable_type' => 'App\\Models\\LeaveRequest',
                'auditable_id' => $leave->id,
                'old_values' => null,
                'new_values' => ['status' => $statusText],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
            ]);

            $this->notifyLeaveStatus($leave, $user, $statusText, $msg);
        });

        return response()->json(['success' => true, 'message' => 'Pengajuan berhasil disetujui.']);
    }

    public function reject(Request $request, LeaveRequest $leave)
    {
        $request->validate(['reason' => 'required|string']);

        $user = $request->user();
        $role = $user->roles->first()->code ?? null;
        $level = $role === 'KABAG' ? 1 : ($role === 'HRD' ? 2 : null);

        if (!$level) {
            return response()->json(['success' => false, 'message' => 'Anda tidak memiliki kewenangan.'], 403);
        }

        // Prevent duplicate rejection
        if ($leave->approvals()->where('approval_level', $level)->exists()) {
            return response()->json(['success' => false, 'message' => 'Sudah diproses pada level ini.'], 400);
        }
        if (!in_array($leave->status, ['Pending', 'Disetujui Kepala Bagian'])) {
            return response()->json(['success' => false, 'message' => 'Cuti dengan status ini tidak dapat ditolak.'], 400);
        }
        if ($level === 1 && $leave->status !== 'Pending') {
            return response()->json(['success' => false, 'message' => 'Hanya pengajuan Pending yang dapat ditolak Kepala Bagian.'], 400);
        }

        DB::transaction(function () use ($leave, $user, $level, $request) {
            LeaveApproval::create([
                'leave_request_id' => $leave->id,
                'approver_id' => $user->id,
                'approval_level' => $level,
                'status' => 'REJECTED',
                'reason' => $request->reason,
                'acted_at' => now(),
            ]);

            $statusText = $level === 1 ? 'Ditolak Kepala Bagian' : 'Ditolak HRD';
            $leave->status = $statusText;
            $leave->save();

            // Audit log
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'REJECT_LEAVE',
                'auditable_type' => 'App\\Models\\LeaveRequest',
                'auditable_id' => $leave->id,
                'old_values' => null,
                'new_values' => ['status' => $statusText, 'reason' => $request->reason],
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
        $isHrd = $request->user()->roles()->where('code', 'HRD')->exists();
        if (!$isHrd && $leave->employee_id !== $this->ownEmployeeId($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $oldStatus = $leave->status;
        $wasFinal = $oldStatus === 'Disetujui HRD';
        if (!$isHrd && $wasFinal) {
            return response()->json(['success' => false, 'message' => 'Cuti yang sudah disetujui HRD hanya dapat dibatalkan oleh HRD.'], 400);
        }
        if (!in_array($oldStatus, ['Pending', 'Disetujui Kepala Bagian', 'Disetujui HRD'])) {
            return response()->json(['success' => false, 'message' => 'Status tidak dapat dibatalkan.'], 400);
        }
        DB::transaction(function () use ($leave, $oldStatus, $wasFinal, $request) {
            $leave->status = 'Cancelled';
            $leave->cancelled_at = now();
            $leave->save();

            if ($wasFinal) {
                $deduct = LeaveBalanceTransaction::where('leave_request_id', $leave->id)
                    ->where('transaction_type', 'DEDUCT')->first();
                if ($deduct) {
                    $balance = LeaveBalance::find($deduct->leave_balance_id);
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

    public function update(Request $request, LeaveRequest $leave)
    {
        // Only HRD can edit
        $user = $request->user();
        $role = $user->roles->first()->code ?? null;
        if ($role !== 'HRD') {
            return response()->json(['success' => false, 'message' => 'Hanya HRD yang dapat mengedit cuti.'], 403);
        }

        // Only allowed if status is Pending or Disetujui Kepala Bagian (not finalized)
        if (!in_array($leave->status, ['Pending', 'Disetujui Kepala Bagian'])) {
            return response()->json(['success' => false, 'message' => 'Cuti dengan status ini tidak dapat diedit.'], 400);
        }

        $validated = $request->validate([
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'start_date' => ['required', 'date', 'before_or_equal:end_date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string'],
        ]);

        // Recalculate total days
        $start = new \DateTime($validated['start_date']);
        $end = new \DateTime($validated['end_date']);
        $interval = $start->diff($end);
        $totalDays = $interval->days + 1;

        $old = $leave->only(['leave_type_id', 'start_date', 'end_date', 'total_days']);
        $leave->update([
            'leave_type_id' => $validated['leave_type_id'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'total_days' => $totalDays,
            'reason' => $validated['reason'],
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'UPDATE_LEAVE',
            'auditable_type' => LeaveRequest::class,
            'auditable_id' => $leave->id,
            'old_values' => $old,
            'new_values' => $leave->only(['leave_type_id', 'start_date', 'end_date', 'total_days']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'data' => $leave, 'message' => 'Cuti berhasil diperbarui.']);
    }

    // HRD can adjust balance manually (already in request)

    public function downloadAttachment(Request $request, \App\Models\LeaveAttachment $attachment)
    {
        $leave = $attachment->leaveRequest;
        if (!$this->canViewAll($request) && (!$leave || $leave->employee_id !== $this->ownEmployeeId($request))) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        if (!\Illuminate\Support\Facades\Storage::disk($attachment->storage_disk)->exists($attachment->storage_path)) {
            return response()->json(['success' => false, 'message' => 'File tidak ditemukan.'], 404);
        }
        return \Illuminate\Support\Facades\Storage::disk($attachment->storage_disk)->download($attachment->storage_path, $attachment->file_name);
    }

    public function verifyAttachment(Request $request, \App\Models\LeaveAttachment $attachment)
    {
        $role = $request->user()->roles->first()->code ?? null;
        if ($role !== 'HRD') {
            return response()->json(['success' => false, 'message' => 'Hanya HRD yang dapat memverifikasi.'], 403);
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