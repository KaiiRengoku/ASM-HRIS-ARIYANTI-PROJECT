export interface Position {
  id: number;
  code?: string;
  name: string;
}

export interface PositionGroup {
  label: string;
  items: Position[];
}

export const POSITION_GROUP_LABELS = {
  PIMPINAN: 'Pimpinan',
  KABAG: 'Kepala Bagian & Kaprodi',
  KASUBAG: 'Kasubag',
  PELAKSANA: 'Pelaksana & Staf',
  DOSEN: 'Dosen',
  LAINNYA: 'Lainnya',
} as const;

/** Kelompok jabatan beserta kode anggotanya, sudah urut sesuai struktur organisasi. */
export const POSITION_CODE_GROUPS: { label: string; codes: readonly string[] }[] = [
  {
    label: POSITION_GROUP_LABELS.PIMPINAN,
    codes: ['DIREKTUR_ASM', 'KETUA_SPMI', 'KETUA_LPPM', 'PD_I', 'PD_II', 'PD_III', 'DIREKTUR', 'HRD'],
  },
  {
    label: POSITION_GROUP_LABELS.KABAG,
    codes: [
      'KABAG_UPT',
      'KABAG_ADMIN_AKADEMIK',
      'KABAG_KEUANGAN',
      'KABAG_UMUM_KEPEGAWAIAN',
      'KABAG_KEMAHASISWAAN_ALUMNI',
      'KABAG_MARKETING',
      'KAPRODI_MANAJEMEN_ADMINISTRASI',
      'KAPRODI_SEKRETARI',
      'KABAG',
    ],
  },
  {
    label: POSITION_GROUP_LABELS.KASUBAG,
    codes: [
      'KASUBAG_UPT',
      'KASUBAG_LAB_KOMPUTER',
      'KASUBAG_LAB_MENGETIK',
      'KASUBAG_LAB_BAHASA',
      'KASUBAG_LAB_PERKANTORAN',
      'KASUBAG_LAB_PERHOTELAN',
      'KASUBAG_UPT_PERPUSTAKAAN',
      'KASUBAG_ADMIN_AKADEMIK',
      'KASUBAG_KEUANGAN',
      'KASUBAG_KEMAHASISWAAN_ALUMNI',
      'KASUBAG_MARKETING',
      'PLT_KASUBAG_KEPEGAWAIAN',
    ],
  },
  {
    label: POSITION_GROUP_LABELS.PELAKSANA,
    codes: [
      'PELAKSANA_ADMIN_AKADEMIK',
      'PELAKSANA_LABORAN',
      'PELAKSANA_UPT_PERPUSTAKAAN',
      'PELAKSANA_KEUANGAN_CS',
      'PELAKSANA_PERLENGKAPAN',
      'PELAKSANA_KEMAHASISWAAN',
      'PEGAWAI',
    ],
  },
  {
    label: POSITION_GROUP_LABELS.DOSEN,
    codes: ['DOSEN'],
  },
];

/**
 * Jabatan lama yang menjadi "kembaran" jabatan baru (mis. "Direktur" sudah
 * diwakili "Direktur ASM Ariyanti", "Kepala Bagian" diwakili Kabag/Kaprodi
 * spesifik). Hanya disembunyikan dari daftar pilihan; data di DB tidak diubah.
 */
export const HIDDEN_CODES: readonly string[] = ['DIREKTUR', 'KABAG'];


/**
 * Mengelompokkan jabatan berdasarkan `code` (bukan heuristik nama).
 * Urutan item mengikuti urutan code di POSITION_CODE_GROUPS; code tak dikenal
 * atau tanpa code masuk grup "Lainnya" agar tidak ada item yang hilang.
 */
export function groupPositions(positions: Position[] | undefined): PositionGroup[] {
  if (!positions?.length) return [];

  const visible = positions.filter((p) => !p.code || !HIDDEN_CODES.includes(p.code));

  const knownCodes: Record<string, true> = {};
  for (const group of POSITION_CODE_GROUPS) {
    for (const code of group.codes) knownCodes[code] = true;
  }

  const groups: PositionGroup[] = [];
  for (const group of POSITION_CODE_GROUPS) {
    const items = visible.filter((p) => p.code && group.codes.includes(p.code));
    if (items.length) groups.push({ label: group.label, items });
  }

  const leftover = visible.filter((p) => !p.code || !knownCodes[p.code]);
  if (leftover.length) {
    groups.push({ label: POSITION_GROUP_LABELS.LAINNYA, items: leftover });
  }

  return groups;
}
