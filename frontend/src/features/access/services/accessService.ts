import { api } from '@/services/api';

export interface PermissionRow {
  id: number;
  code: string;
  name: string;
  description?: string;
}

export interface RoleAccessRow {
  id: number;
  code: string;
  name: string;
  permission_ids: number[];
}

export interface AccessPayload {
  roles: RoleAccessRow[];
  permissions: PermissionRow[];
}

export const getAccess = async (): Promise<AccessPayload> => {
  const res = await api.get('/role-permissions');
  return res.data.data;
};

export const saveAccess = async (roles: { id: number; permissions: number[] }[]) => {
  const res = await api.put('/role-permissions', { roles });
  return res.data.data;
};

export const permissionGroups: { label: string; prefix: string }[] = [
  { label: 'Pegawai', prefix: 'employee.' },
  { label: 'Dokumen', prefix: 'document.' },
  { label: 'Cuti & Izin', prefix: 'leave.' },
  { label: 'Kalender', prefix: 'calendar.' },
  { label: 'Laporan', prefix: 'report.' },
  { label: 'Audit', prefix: 'audit.' },
  { label: 'Kelola Akses', prefix: 'auth.' },
];