import { test, expect } from '@playwright/test';

const baseURL = process.env.NOTIFICATION_TEST_URL || 'http://localhost:3000';
const mappingKey = 'spmb_admin_notification_user_ids';
test.setTimeout(90000);

async function mockSettings(page, { rejectSave = false, optionsUnavailable = false, inactiveSelection = false } = {}) {
  const stored = { id: 501, name: 'Admin Tersimpan', username: 'tersimpan', email: 'persisted@example.test', is_active: !inactiveSelection };
  const added = { id: 812, name: 'Nadia Penerimaan', username: 'nadia', email: 'nadia@example.test', is_active: true };
  const firstPage = { id: 110, name: 'Operator Lain', username: 'operator', email: 'operator@example.test', is_active: true };
  const state = { ids: [stored.id], saves: [], searches: [], errors: [] };
  await page.context().addCookies([{ name: 'sso_access_token', value: 'spmb-admin-mapping-test', url: baseURL }]);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const json = (data, extra = {}) => route.fulfill({ json: { status: 'success', message: 'OK', data, ...extra } });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (path.endsWith('/auth/me')) return json({ id: 7, username: 'pengelola', name: 'Pengelola IAM', email: 'iam@example.test', roles: [], permissions: [], is_superadmin: true });
    if (path.endsWith('/system-settings/spmb-admin-options')) {
      if (optionsUnavailable) return route.fulfill({ status: 503, json: { status: 'error', message: 'Pilihan akun sedang tidak tersedia.' } });
      const search = url.searchParams.get('search') || '';
      state.searches.push(search);
      const users = search ? [stored, added, firstPage].filter((user) => user.is_active && `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())) : [firstPage];
      return json(users, { meta: { current_page: 1, per_page: 15, total: users.length, last_page: 1 } });
    }
    if (path.endsWith('/system-settings')) {
      if (request.method() === 'POST') {
        const payload = request.postDataJSON();
        state.saves.push(payload);
        if (rejectSave) return route.fulfill({ status: 422, json: {
          status: 'error', message: 'Semua akun penerima admin SPMB harus tersedia dan aktif.',
          errors: { 'settings.0.value': ['Semua akun penerima admin SPMB harus tersedia dan aktif.'] },
        } });
        state.ids = JSON.parse(payload.settings[0].value);
        return json(null);
      }
      return json({
        [mappingKey]: { id: 41, key: mappingKey, value: JSON.stringify(state.ids),
          users: [stored, added].filter((user) => state.ids.includes(user.id)) },
      });
    }
    if (path.endsWith('/unread-count')) return json({ unread_count: 0 });
    return json([]);
  });
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.goto(`${baseURL}/admin/settings`);
  const section = page.getByRole('region', { name: 'Admin SPMB', exact: true });
  await expect(section).toBeVisible();
  if (!optionsUnavailable) await expect(section.getByText(/Admin Tersimpan \(persisted@example.test\)/)).toBeVisible();
  return { state, section, stored, added };
}

async function selectNadia(page, section) {
  const input = section.getByRole('combobox');
  await input.fill('Nadia');
  await page.getByRole('option', { name: 'Nadia Penerimaan (nadia@example.test)', exact: true }).click();
}

test('mapping tersimpan menampilkan nama di luar halaman opsi pertama dan menyimpan pilihan hasil pencarian', async ({ page }) => {
  const { state, section, stored, added } = await mockSettings(page);
  await selectNadia(page, section);
  await section.getByRole('button', { name: 'Simpan Mapping Admin SPMB' }).click();
  await expect(section.getByText('Perubahan berhasil disimpan')).toBeVisible();
  expect(state.searches).toContain('Nadia');
  expect(state.saves).toEqual([{ settings: [{ key: mappingKey, value: JSON.stringify([stored.id, added.id]) }] }]);
  expect(state.errors).toEqual([]);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Admin SPMB', exact: true }).getByText('Nadia Penerimaan (nadia@example.test)', { exact: true })).toBeVisible();
});

test('membatalkan perubahan mengembalikan mapping tanpa mengirim request simpan', async ({ page }) => {
  const { state, section } = await mockSettings(page);
  await selectNadia(page, section);
  await section.getByRole('button', { name: 'Batalkan', exact: true }).click();
  await expect(section.getByText('Nadia Penerimaan (nadia@example.test)', { exact: true })).not.toBeVisible();
  await expect(section.getByRole('button', { name: 'Simpan Mapping Admin SPMB' })).toBeDisabled();
  expect(state.saves).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('mapping dapat dikosongkan termasuk ketika akun tersimpan telah nonaktif', async ({ page }) => {
  const { state, section } = await mockSettings(page, { inactiveSelection: true });
  await expect(section.getByText(/Admin Tersimpan.*nonaktif/)).toBeVisible();
  await section.getByRole('combobox').focus();
  await section.getByRole('combobox').press('Backspace');
  await section.getByRole('button', { name: 'Simpan Mapping Admin SPMB' }).click();
  await expect(section.getByText('Perubahan berhasil disimpan')).toBeVisible();
  expect(state.saves).toEqual([{ settings: [{ key: mappingKey, value: '[]' }] }]);
  expect(state.ids).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('penolakan validasi backend ditampilkan tanpa menghapus pilihan pengguna', async ({ page }) => {
  const { state, section, stored } = await mockSettings(page, { rejectSave: true });
  await selectNadia(page, section);
  await section.getByRole('button', { name: 'Simpan Mapping Admin SPMB' }).click();
  await expect(section.getByText('Semua akun penerima admin SPMB harus tersedia dan aktif.', { exact: true })).toBeVisible();
  await expect(section.getByText('Nadia Penerimaan (nadia@example.test)', { exact: true })).toBeVisible();
  expect(state.ids).toEqual([stored.id]);
  expect(state.errors).toEqual([]);
});

test('kegagalan memuat opsi tidak dianggap mapping kosong yang dapat disimpan', async ({ page }) => {
  const { state, section } = await mockSettings(page, { optionsUnavailable: true });
  await expect(section.getByRole('alert')).toContainText('Pilihan akun sedang tidak tersedia.');
  await expect(section.getByRole('button', { name: 'Simpan Mapping Admin SPMB' })).toBeDisabled();
  expect(state.saves).toEqual([]);
  expect(state.errors).toEqual([]);
});
