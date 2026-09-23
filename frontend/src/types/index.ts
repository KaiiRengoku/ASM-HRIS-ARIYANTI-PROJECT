export interface Employee {
  id: number;
  organizational_unit_id: number;
  position_id: number;
  nik: string;
  nama_lengkap: string;
  email: string;
  alamat?: string;
  nomor_hp?: string;
  nomor_ktp?: string;
  nomor_kk?: string;
  bpjs_kesehatan?: string;
  bpjs_ketenagakerjaan?: string;
  npwp?: string;
  nip?: string;
  nidn?: string;
  jenis_kelamin?: "L" | "P";
  tanggal_lahir?: string;
  tanggal_masuk_kerja: string;
  status_kepegawaian?: string;
  nomor_rekening?: string;
  foto_path?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  status: "Draft" | "Pending" | "Approved" | "Rejected" | "Revision" | "Cancelled" | "Completed";
  submitted_at?: string;
  finalized_at?: string;
  cancelled_at?: string;
  source: "ONLINE" | "MANUAL";
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  is_leave_balance_deducted: boolean;
  requires_attachment: boolean;
  requires_medical_certificate: boolean;
  is_active: boolean;
  description?: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  period_year: number;
  entitled_days: number;
  adjustment_days: number;
  used_days: number;
  remaining_days: number;
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  code: string;
  description?: string;
}