import { api } from '@/services/api';

export const getHRDStats = async () => {
    const response = await api.get('/dashboard/hrd/stats');
    if (!response.data.success) throw new Error('Gagal memuat data dashboard');
    return response.data.data;
};