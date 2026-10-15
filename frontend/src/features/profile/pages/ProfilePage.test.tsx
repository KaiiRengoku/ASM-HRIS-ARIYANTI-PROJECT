import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'ProfilePage.tsx'), 'utf-8');

test('menampilkan enam tab profil (termasuk Mata Kuliah)', () => {
  for (const tab of ['Data Pribadi', 'Pendidikan', 'Sertifikasi & Pelatihan', 'Pangkat & Fungsional', 'Mata Kuliah', 'Penelitian & Pernyataan']) {
    assert.ok(src.includes(tab), `tab ${tab} hilang`);
  }
});

test('tab dosen ditentukan via role DOSEN (bukan hanya kolom is_dosen)', () => {
  assert.ok(src.includes('is_dosen'), 'flag is_dosen hilang');
  assert.ok(src.includes('isDosen'), 'penanda isDosen hilang');
  assert.ok(src.includes("=== 'DOSEN'"), 'penentuan dosen dari role DOSEN hilang');
  assert.ok(src.includes('Penelitian & Pernyataan'), 'tab penelitian hilang');
  assert.ok(!src.includes('jenis_pegawai'), 'referensi jenis_pegawai harus hilang');
});

test('tab Mata Kuliah ada dan hanya untuk Dosen', () => {
  assert.ok(src.includes('Mata Kuliah'), 'tab Mata Kuliah hilang');
  assert.ok(src.includes('value="matkul"'), 'TabsTrigger/TabsContent matkul hilang');
  assert.ok(src.includes('{isDosen && <TabsTrigger value="matkul">'), 'tab matkul tidak dikondisikan isDosen');
  assert.ok(src.includes('enabled: isDosen'), 'query matkul tidak dibatasi isDosen');
});

test('mengonsumsi endpoint profil Tasks 3-6', () => {
  for (const ep of ['/profile/education', '/profile/functional', '/profile/certifications']) {
    assert.ok(src.includes(ep), `endpoint ${ep} hilang`);
  }
});

test('mengonsumsi endpoint profil Tasks 3-6', () => {
  for (const ep of ['/profile/education', '/profile/functional', '/profile/certifications']) {
    assert.ok(src.includes(ep), `endpoint ${ep} hilang`);
  }
});
