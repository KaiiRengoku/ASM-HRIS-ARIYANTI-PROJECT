// Kategori tipe cuti vs izin.
// Tidak ada kolom khusus di tabel `leave_types`, jadi kategori ditentukan dari
// kode tipe: tipe izin memakai prefiks "PERMIT_". Konstanta ini harus SAMA
// dengan `LeaveController::KODE_IZIN` di backend.
export const KODE_IZIN = ['PERMIT_ABSENT', 'PERMIT_LEAVE_OFFICE'];

/** true bila kode tipe cuti termasuk kategori Izin. */
export function isIzin(code: string | null | undefined): boolean {
    if (!code) return false;
    return KODE_IZIN.includes(code);
}
