import { test, expect } from '@playwright/test';

const baseURL = process.env.NOTIFICATION_TEST_URL || 'http://127.0.0.1:3000';
test.setTimeout(90000);
test.use({ actionTimeout: 15000 });

async function setupInbox(page, { lmsUnavailable = false } = {}) {
  const calls = [];
  const corsHeaders = {
    'access-control-allow-origin': new URL(baseURL).origin,
    'access-control-allow-headers': 'Authorization, Content-Type, Accept, X-Environment, X-Tenant-Host',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
  const system = [{
    id: 1, module_id: 3, module: { id: 3, name: 'Penerimaan', code: 'spmb', primary_color: null },
    type: 'application_submitted', title: 'Pendaftaran berhasil dikirim', message: 'Menunggu verifikasi',
    url: null, priority: 'normal', is_read: false, read_at: null, created_at: '2026-11-10T06:00:00Z',
  }];
  const lms = [{
    id: 1, jenis: 'info', judul: 'Informasi LMS tetap tersedia', pesan: 'Aktivitas kelas', rute: null,
    prioritas: 'normal', is_read: false, read_at: null, created_at: '2026-11-10T07:00:00Z',
  }];
  await page.context().addCookies([{ name: 'sso_access_token', value: 'notification-test-session', url: baseURL }]);
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    calls.push({ path, method: request.method(), search: url.search });
    const json = (data, extra = {}) => route.fulfill({ headers: corsHeaders, json: { status: 'success', message: 'OK', data, ...extra } });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
    if (path.endsWith('/auth/me')) return json({ id: 7, username: 'calon', name: 'Calon', email: 'calon@example.test', roles: [], permissions: [], is_superadmin: false });
    const isLms = path.includes('/lms/notifikasi');
    const isSystem = path.includes('/notifications');
    if (!isLms && !isSystem) return json([]);
    if (isLms && lmsUnavailable) return route.fulfill({ status: 503, headers: corsHeaders, json: { status: 'error', message: 'LMS unavailable' } });
    const items = isLms ? lms : system;
    if (path.endsWith('/unread-count')) return json({ unread_count: items.filter((item) => !item.is_read).length });
    if (path.endsWith('/read-all')) {
      const updated = items.filter((item) => !item.is_read).length;
      items.forEach((item) => { item.is_read = true; });
      return json({ updated });
    }
    if (path.endsWith('/1/read')) {
      items[0].is_read = true;
      return json(items[0]);
    }
    const search = url.searchParams.get('search');
    const filtered = search ? items.filter((item) => (item.title || item.judul).includes(search)) : items;
    return json(filtered, { meta: { current_page: 1, per_page: 15, total: filtered.length, last_page: 1, from: filtered.length ? 1 : null, to: filtered.length || null } });
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { calls, system, lms, errors };
}

test('pengguna biasa dapat membuka inbox dan bell mempertahankan sumber dengan ID sama', async ({ page }) => {
  const state = await setupInbox(page);
  await page.goto(`${baseURL}/notifikasi`);
  await expect(page.getByRole('heading', { name: 'Notifikasi', exact: true })).toBeVisible({ timeout: 30000 });
  const bell = page.getByRole('button', { name: 'Notifikasi', exact: true });
  await expect(bell).toContainText('2');
  await bell.click();
  const panel = page.getByRole('menu');
  await expect(panel.getByText('Pendaftaran berhasil dikirim')).toBeVisible();
  await expect(panel.getByText('Informasi LMS tetap tersedia')).toBeVisible();
  await panel.getByText('Informasi LMS tetap tersedia').click();
  await expect(bell).toContainText('1');
  expect(state.calls.some((call) => call.path.endsWith('/lms/notifikasi/1/read'))).toBe(true);
  expect(state.system[0].is_read).toBe(false);
  await page.getByRole('button', { name: 'Tandai Semua Dibaca', exact: true }).click();
  await expect(page.getByText('0 belum dibaca', { exact: false })).toBeVisible();
  expect(state.calls.some((call) => call.path.endsWith('/notifications/read-all'))).toBe(true);
  expect(state.calls.some((call) => call.path.endsWith('/lms/notifikasi/read-all'))).toBe(true);
  expect(state.errors).toEqual([]);
});

test('sumber gagal tidak menghilangkan notifikasi dari sumber lain', async ({ page }) => {
  const state = await setupInbox(page, { lmsUnavailable: true });
  await page.goto(`${baseURL}/notifikasi`);
  await expect(page.getByRole('heading', { name: 'Notifikasi', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Notifikasi', exact: true }).click();
  const panel = page.getByRole('menu');
  await expect(panel.getByText('Pendaftaran berhasil dikirim')).toBeVisible();
  await expect(panel.getByRole('status')).toContainText('Sebagian notifikasi');
  await panel.getByRole('button', { name: 'Tandai semua dibaca' }).click();
  await expect(page.getByText('Sebagian notifikasi gagal ditandai dibaca. Silakan coba lagi.')).toBeVisible();
  expect(state.system[0].is_read).toBe(true);
  expect(state.errors).toEqual([]);
});

test('inbox terpadu menampilkan semua sumber tanpa tab dan filter pencarian berfungsi', async ({ page }) => {
  const state = await setupInbox(page);
  await page.goto(`${baseURL}/notifikasi?sumber=lms`);
  await expect(page.getByRole('heading', { name: 'Notifikasi', exact: true })).toBeVisible();
  const rows = page.getByRole('row');
  await expect(rows.filter({ hasText: 'Pendaftaran berhasil dikirim' })).toBeVisible();
  await expect(rows.filter({ hasText: 'Informasi LMS tetap tersedia' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Sumber notifikasi' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByLabel('Pencarian').fill('tidak-ada');
  await page.getByRole('button', { name: 'Terapkan', exact: true }).click();
  await expect(page.getByText('Belum ada notifikasi.')).toBeVisible();
  expect(state.calls.some((call) => call.search.includes('search=tidak-ada'))).toBe(true);
  expect(state.errors).toEqual([]);
});

test('status baca pada bell tersinkron ke halaman inbox LMS', async ({ page }) => {
  const state = await setupInbox(page);
  await page.goto(`${baseURL}/lms/notifikasi`);
  const row = page.getByRole('row').filter({ hasText: 'Informasi LMS tetap tersedia' });
  await expect(row.getByText('Belum Dibaca', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Notifikasi', exact: true }).click();
  await page.getByRole('menu').getByText('Informasi LMS tetap tersedia').click();
  await expect(row.getByText('Dibaca', { exact: true })).toBeVisible();
  expect(state.system[0].is_read).toBe(false);
  expect(state.errors).toEqual([]);
});
