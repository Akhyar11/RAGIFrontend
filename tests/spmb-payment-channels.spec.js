import { test, expect } from '@playwright/test';

const baseURL = process.env.SPMB_PAYMENT_TEST_URL || 'http://spmb.localhost:3000';
const gateways = [
  { id: 501, gateway_name: 'midtrans', environment: 'sandbox', is_active: true },
  { id: 612, gateway_name: 'xendit', environment: 'sandbox', is_active: true },
  { id: 734, gateway_name: 'bsn_h2h', environment: 'production', is_active: true },
];

async function setup(page, { admin = false, failCheckout = false, failOptions = false, emptyOptions = false } = {}) {
  const state = { errors: [], saves: [], searches: [], checkouts: [], pages: [], deleted: false };
  let component = { id: 88, kode: 'ADM', nama: 'Biaya Pendaftaran', kategori: 'Pendaftaran', tipe_potongan: false,
    is_active: true, is_referral_reward: false, is_default_master_biaya: true, role_rewards: [], urutan: 1,
    payment_gateway_config_id: gateways[0].id, payment_gateway: gateways[0] };
  const bills = gateways.map((gateway, index) => ({ id: 91 + index, nomor_tagihan: `INV-SPMB-${91 + index}`,
    status: 'belum_bayar', tipe_referensi: 'spmb_pendaftaran', payment_gateway_config_id: gateway.id,
    gateway_name: gateway.gateway_name, environment: gateway.environment, total_tagihan: 100000,
    total_potongan: 10000, total_denda: 0, total_bayar: 0, sisa_tagihan: 90000, jatuh_tempo: '2026-12-01',
    details: [{ id: 101 + index, keterangan: `Komponen ${index + 1}`, nominal: 100000 }], virtual_account: null }));
  await page.context().addCookies([{ name: 'sso_access_token', value: 'spmb-payment-test', url: baseURL }]);
  page.on('pageerror', (error) => state.errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const ok = (data, extra = {}) => route.fulfill({ json: { status: 'success', message: 'Berhasil.', data, ...extra } });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 });
    if (path.endsWith('/auth/me')) return ok({ id: 8, username: 'calon', name: 'Calon Mahasiswa', roles: [], permissions: [], is_superadmin: admin });
    if (path.endsWith('/unread-count')) return ok({ unread_count: 0 });
    if (path.endsWith('/spmb/master/payment-gateway-options')) {
      if (failOptions) return route.fulfill({ status: 503, json: { status: 'error', message: 'Kanal pembayaran tidak dapat dimuat.' } });
      const search = url.searchParams.get('search') || '';
      state.searches.push(search);
      const results = emptyOptions ? [] : gateways.filter((gateway) => search ? gateway.gateway_name.includes(search.toLowerCase()) : gateway.id !== gateways[0].id);
      return ok(results, { meta: { current_page: 1, last_page: 1, total: results.length, per_page: 25 } });
    }
    if (path.endsWith('/spmb/master/komponen-biaya/88')) {
      if (req.method() === 'DELETE') {
        state.deleted = true;
        return ok(null);
      }
      if (req.method() === 'PUT') {
        const body = req.postDataJSON();
        state.saves.push(body);
        component = { ...component, ...body, payment_gateway: gateways.find((gateway) => gateway.id === body.payment_gateway_config_id) || null };
      }
      return ok(component);
    }
    if (path.endsWith('/spmb/master/komponen-biaya')) {
      if (req.method() === 'POST') {
        const body = req.postDataJSON();
        state.saves.push(body);
        component = { ...component, ...body, payment_gateway: gateways.find((gateway) => gateway.id === body.payment_gateway_config_id) || null };
        return route.fulfill({ status: 201, json: { status: 'success', message: 'Komponen berhasil ditambahkan.', data: component } });
      }
      return ok(state.deleted ? [] : [component], { meta: { current_page: 1, last_page: 1, per_page: 15, total: state.deleted ? 0 : 1 } });
    }
    if (path.endsWith('/spmb/pembayaran')) {
      const pageNumber = Number(url.searchParams.get('page') || 1);
      state.pages.push(pageNumber);
      return ok(pageNumber === 1 ? bills : [{ ...bills[0], id: 99, nomor_tagihan: 'INV-SPMB-99', status: 'lunas', total_bayar: 90000, sisa_tagihan: 0 }],
        { meta: { current_page: pageNumber, last_page: 2, per_page: 15, total: 4 } });
    }
    const match = path.match(/\/spmb\/pembayaran\/(\d+)\/checkout$/);
    if (match) {
      const id = Number(match[1]);
      state.checkouts.push({ id, body: req.postData() });
      if (failCheckout) return route.fulfill({ status: 502, json: { status: 'error', message: 'Layanan pembayaran tidak dapat dihubungi.' } });
      const bill = bills.find((item) => item.id === id);
      if (bill.gateway_name === 'bsn_h2h') return ok({ method: 'h2h', gateway_name: 'bsn_h2h', amount: 90000,
        bank_name: 'BTN Syariah', custid: 'REG-2026-123', va_fee: 1500, total_bridge: 91500 });
      return ok({ method: 'redirect', gateway_name: bill.gateway_name, amount: 90000,
        redirect_url: bill.gateway_name === 'midtrans' ? 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test' : 'https://checkout.xendit.co/web/test' });
    }
    return ok([]);
  });
  return state;
}

test('akun calon tanpa menu admin dapat melihat tiap tagihan dan checkout mengikuti kanal backend', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`${baseURL}/spmb/pembayaran?tahap=pendaftaran`);
  await expect(page.getByRole('heading', { name: 'Pembayaran SPMB', exact: true })).toBeVisible();
  const mid = page.getByRole('region', { name: 'Tagihan INV-SPMB-91', exact: true });
  const xen = page.getByRole('region', { name: 'Tagihan INV-SPMB-92', exact: true });
  const h2h = page.getByRole('region', { name: 'Tagihan INV-SPMB-93', exact: true });
  await mid.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(mid.getByRole('link', { name: 'Lanjutkan ke MIDTRANS' })).toHaveAttribute('href', 'https://app.sandbox.midtrans.com/snap/v2/vtweb/test');
  await xen.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(xen.getByRole('link', { name: 'Lanjutkan ke XENDIT' })).toHaveAttribute('href', 'https://checkout.xendit.co/web/test');
  await h2h.getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(h2h.getByRole('status')).toContainText('REG-2026-123');
  await expect(h2h.getByRole('status')).toContainText('91.500');
  await expect(page.getByText('Belum Lunas', { exact: true })).toHaveCount(3);
  expect(state.checkouts.map((request) => request.id)).toEqual([91, 92, 93]);
  expect(state.checkouts.every((request) => !request.body)).toBe(true);
  expect(state.errors).toEqual([]);
});

test('kegagalan provider ditampilkan tanpa VA buatan atau status sukses', async ({ page }) => {
  const state = await setup(page, { failCheckout: true });
  await page.goto(`${baseURL}/spmb/pembayaran?tahap=pendaftaran`);
  await page.getByRole('region', { name: 'Tagihan INV-SPMB-91', exact: true }).getByRole('button', { name: 'Bayar Sekarang' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Layanan pembayaran tidak dapat dihubungi.' })).toBeVisible();
  await expect(page.getByText('Belum Lunas', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Pembayaran telah dikonfirmasi.', { exact: true })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('pagination meminta halaman server dan tagihan lunas tidak memiliki aksi bayar', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`${baseURL}/spmb/pembayaran?tahap=daftar_ulang`);
  await page.getByRole('button', { name: 'Berikutnya', exact: true }).click();
  const paid = page.getByRole('region', { name: 'Tagihan INV-SPMB-99', exact: true });
  await expect(paid).toBeVisible();
  await expect(paid.getByRole('button', { name: 'Bayar Sekarang' })).toHaveCount(0);
  expect(state.pages).toContain(2);
  expect(state.errors).toEqual([]);
});

test('mapping komponen memuat label tersimpan di luar opsi pertama lalu menyimpan ID hasil pencarian', async ({ page }) => {
  const state = await setup(page, { admin: true });
  const editURL = `${baseURL}/spmb/master/komponen-biaya/88/edit`;
  await page.goto(editURL);
  await expect(page.getByText('MIDTRANS (sandbox)', { exact: true })).toBeVisible();
  await page.locator('#spmb-payment-gateway').fill('xendit');
  await page.getByRole('option', { name: 'XENDIT (sandbox)', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.saves[0].payment_gateway_config_id).toBe(gateways[1].id);
  expect(state.searches).toContain('xendit');
  await page.goto(editURL);
  await expect(page.getByText('XENDIT (sandbox)', { exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('form tambah komponen menyimpan pilihan kanal, tampil di list, dan dapat dihapus melalui konfirmasi', async ({ page }) => {
  const state = await setup(page, { admin: true });
  await page.goto(`${baseURL}/spmb/master/komponen-biaya/create`);
  await page.getByPlaceholder('Contoh: Dana Pengembangan Institusi (DPI)').fill('Biaya Pendaftaran Baru');
  await page.locator('#spmb-payment-gateway').fill('midtrans');
  await page.getByRole('option', { name: 'MIDTRANS (sandbox)', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.saves[0].payment_gateway_config_id).toBe(gateways[0].id);
  const row = page.getByRole('row').filter({ hasText: 'Biaya Pendaftaran Baru' });
  await expect(row).toBeVisible();
  await row.getByTitle('Opsi Aksi').click();
  await page.getByRole('menuitem', { name: 'Hapus', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, Hapus', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect(state.deleted).toBe(true);
  expect(state.errors).toEqual([]);
});

test('error opsi kanal terlihat dan tidak menghapus mapping tersimpan', async ({ page }) => {
  const state = await setup(page, { admin: true, failOptions: true });
  await page.goto(`${baseURL}/spmb/master/komponen-biaya/88/edit`);
  await expect(page.getByText('Kanal pembayaran tidak dapat dimuat.', { exact: true })).toBeVisible();
  await expect(page.getByText('MIDTRANS (sandbox)', { exact: true })).toBeVisible();
  expect(state.saves).toEqual([]);
  expect(state.errors).toEqual([]);
});

test('opsi kosong tetap mempertahankan label kanal tersimpan', async ({ page }) => {
  const state = await setup(page, { admin: true, emptyOptions: true });
  await page.goto(`${baseURL}/spmb/master/komponen-biaya/88/edit`);
  await expect(page.getByText('MIDTRANS (sandbox)', { exact: true })).toBeVisible();
  await page.locator('#spmb-payment-gateway').fill('tidak-ada');
  await expect(page.getByRole('option')).toHaveCount(0);
  expect(state.saves).toEqual([]);
  expect(state.errors).toEqual([]);
});
