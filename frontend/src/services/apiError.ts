/**
 * Mengambil pesan kesalahan yang bisa dibaca pengguna dari error request Axios.
 * Urutan: pesan validasi Laravel (errors) -> message -> Error bawaan -> fallback.
 */
export const extractErrorMessage = (e: unknown, fallback = 'Terjadi kesalahan.'): string => {
    if (e && typeof e === 'object' && 'response' in e) {
        const response = e.response;
        if (response && typeof response === 'object' && 'data' in response) {
            const data = response.data;
            if (data && typeof data === 'object') {
                if ('errors' in data && data.errors && typeof data.errors === 'object') {
                    for (const value of Object.values(data.errors)) {
                        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
                        if (typeof value === 'string') return value;
                    }
                }
                if ('message' in data && typeof data.message === 'string' && data.message) return data.message;
            }
        }
    }
    if (e instanceof Error && e.message) return e.message;
    return fallback;
};
