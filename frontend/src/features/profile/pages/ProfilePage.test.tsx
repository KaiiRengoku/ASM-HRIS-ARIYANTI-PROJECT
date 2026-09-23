import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ProfilePage.tsx'), 'utf-8');

test('menampilkan lima tab profil', () => {
  for (const tab of ['Data Pribadi', 'Pendidikan', 'Pangkat & Fungsional', 'Mata Kuliah', 'Penelitian & Pernyataan']) {
    assert.ok(src.includes(tab), `tab ${tab} hilang`);
  }
});

test('menyembunyikan tab Penelitian & Pernyataan untuk non-dosen via is_dosen saja', () => {
  assert.ok(src.includes('is_dosen'), 'flag is_dosen hilang');
  assert.ok(src.includes('isDosen'), 'penanda isDosen hilang');
  assert.ok(src.includes('Penelitian & Pernyataan'), 'tab penelitian hilang');
  assert.ok(!src.includes('jenis_pegawai'), 'referensi jenis_pegawai harus hilang');
});

test('membatasi tab Mata Kuliah hanya untuk Dosen/Pegawai', () => {
  assert.ok(src.includes('isPegawai'), 'penanda isPegawai hilang');
  assert.ok(src.includes('is_pegawai'), 'flag is_pegawai hilang');
  assert.ok(src.includes('{isPegawai && <TabsTrigger value="matkul">'), 'tab matkul tidak dikondisikan isPegawai');
  assert.ok(src.includes('enabled: isPegawai'), 'query matkul tidak dibatasi isPegawai');
});

test('menandai field identitas/resmi dengan Hanya HRD', () => {
  assert.ok(src.includes('Hanya HRD'), 'tanda Hanya HRD hilang');
});

test('mengonsumsi endpoint profil Tasks 3-6', () => {
  for (const ep of ['/profile/education', '/profile/functional', '/profile/teaching-assignments']) {
    assert.ok(src.includes(ep), `endpoint ${ep} hilang`);
  }
});
