<?php

namespace App\Mail;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LeaveStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public LeaveRequest $leave,
        public string $statusText,
        public string $statusMessage,
    ) {}

    public function build()
    {
        $this->leave->loadMissing(['employee', 'leaveType']);
        return $this->subject('Status Pengajuan Cuti: ' . $this->statusText)
            ->view('emails.leave-status')
            ->with([
                'nama' => $this->leave->employee->nama_lengkap ?? 'Pegawai',
                'jenis' => $this->leave->leaveType->name ?? 'Cuti',
                'periode' => $this->leave->start_date . ' s.d ' . $this->leave->end_date,
                'status' => $this->statusText,
                'pesan' => $this->statusMessage,
            ]);
    }
}
