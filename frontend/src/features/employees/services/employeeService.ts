import { api } from '@/services/api';

export interface EmployeeAccount {
  id: number;
  role?: string | null;
  role_name?: string | null;
}

export interface Employee {
  id: number;
  organizational_unit_id: number | null;
  position_id: number | null;
  organizational_unit: string | null;
  position: string | null;
  has_account?: boolean;
  account?: EmployeeAccount | null;
  nik: string;
  nama_lengkap: string;
  gelar_depan: string | null;
  gelar_belakang: string | null;
  tempat_lahir: string | null;
  agama: string | null;
  status_pernikahan: string | null;
  alamat_ktp: string | null;
  alamat_domisili: string | null;
  email: string;
  alamat: string | null;
  nomor_hp: string | null;
  nomor_ktp: string | null;
  nomor_kk: string | null;
  bpjs_kesehatan: string | null;
  bpjs_ketenagakerjaan: string | null;
  npwp: string | null;
  nip: string | null;
  nidn: string | null;
  jenis_kelamin: 'L' | 'P' | null;
  tanggal_lahir: string | null;
  tanggal_masuk_kerja: string | null;
  status_kepegawaian: string | null;
  nomor_rekening: string | null;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListResponse {
  data: Employee[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const getEmployees = async (params: { page?: number; search?: string; per_page?: number }): Promise<EmployeeListResponse> => {
  const response = await api.get('/employees', { params });
  return response.data;
};

export const getEmployee = async (id: number): Promise<Employee> => {
  const response = await api.get(`/employees/${id}`);
  return response.data.data;
};

export const createEmployee = async (data: Partial<Employee>): Promise<Employee> => {
  const response = await api.post('/employees', data);
  return response.data.data;
};

export const updateEmployee = async (id: number, data: Partial<Employee>): Promise<Employee> => {
  const response = await api.put(`/employees/${id}`, data);
  return response.data.data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await api.delete(`/employees/${id}`);
};