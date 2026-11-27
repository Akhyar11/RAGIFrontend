import type { SelectOption } from '@/components/ui/Select';

export const STATUS_SIPIL_OPTIONS: SelectOption[] = [
  { value: 'belum_menikah', label: 'Belum Menikah' },
  { value: 'menikah', label: 'Menikah' },
];

export const AGAMA_OPTIONS: SelectOption[] = [
  { value: 'islam', label: 'Islam' },
  { value: 'kristen', label: 'Kristen' },
  { value: 'katolik', label: 'Katolik' },
  { value: 'hindu', label: 'Hindu' },
  { value: 'buddha', label: 'Buddha' },
  { value: 'konghucu', label: 'Konghucu' },
  { value: 'kepercayaan', label: 'Kepercayaan terhadap Tuhan Yang Maha Esa' },
];

export const PENGHASILAN_OPTIONS: SelectOption[] = [
  { value: 'di_bawah_1_juta', label: 'Kurang dari Rp 1.000.000' },
  { value: '1_sampai_2_juta', label: 'Rp 1.000.000 - Rp 2.000.000' },
  { value: '2_sampai_5_juta', label: 'Rp 2.000.000 - Rp 5.000.000' },
  { value: '5_sampai_10_juta', label: 'Rp 5.000.000 - Rp 10.000.000' },
  { value: 'di_atas_10_juta', label: 'Lebih dari Rp 10.000.000' },
];

export const PEKERJAAN_OPTIONS: SelectOption[] = [
  { value: 'pns_tni_polri', label: 'PNS / TNI / Polri' },
  { value: 'pegawai_swasta', label: 'Pegawai Swasta' },
  { value: 'wiraswasta', label: 'Wiraswasta' },
  { value: 'petani_nelayan', label: 'Petani / Nelayan' },
  { value: 'buruh', label: 'Buruh' },
  { value: 'ibu_rumah_tangga', label: 'Ibu Rumah Tangga' },
  { value: 'tidak_bekerja', label: 'Tidak Bekerja' },
];

export const ASAL_LULUSAN_OPTIONS: SelectOption[] = [
  { value: 'sekolah', label: 'Sekolah (SMA / SMK / MA / Sederajat)' },
  { value: 'pt', label: 'Perguruan Tinggi (Transfer / Alih Jenjang)' },
];

/** Kode referensi kewarganegaraan (nilai tetap domain, selaras dengan master referensi `kewarganegaraan`). */
export const NATIONALITY_CODE = { WNI: 'WNI', WNA: 'WNA' } as const;

/** Status pendaftaran yang diperlakukan khusus di UI (selaras dengan PendaftaranCalonMhs backend). */
export const SPMB_STATUS = { MAHASISWA_BARU: 'mahasiswa_baru' } as const;

/** Sumber informasi pendaftaran; dipakai bersama oleh form registrasi, input manual, dan edit pendaftaran. */
export const INFO_DAFTAR_OPTIONS: SelectOption[] = [
  { value: 'brosur', label: 'Brosur / Spanduk' },
  { value: 'media_sosial', label: 'Media Sosial' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Website Kampus' },
  { value: 'presentasi', label: 'Presentasi di Sekolah' },
  { value: 'rekomendasi', label: 'Rekomendasi' },
  { value: 'kerabat', label: 'Kerabat / Keluarga' },
  { value: 'sekolah', label: 'Sekolah / Guru' },
  { value: 'lainnya', label: 'Lainnya' },
];

/**
 * Mencocokkan nilai tersimpan (termasuk data lama seperti "INSTAGRAM") dengan pilihan baku.
 * Nilai yang tidak dikenal dikembalikan apa adanya agar tetap tampil dan tidak hilang saat disimpan.
 */
export function normalizeInfoDaftar(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  const match = INFO_DAFTAR_OPTIONS.find((option) => option.value === key || option.label.toLowerCase() === key);
  return match ? String(match.value) : raw;
}

/** Pilihan baku, ditambah nilai tersimpan yang tidak dikenal (data lama) bila ada. */
export function infoDaftarOptionsFor(current: unknown): SelectOption[] {
  const value = normalizeInfoDaftar(current);
  if (!value || INFO_DAFTAR_OPTIONS.some((option) => option.value === value)) return INFO_DAFTAR_OPTIONS;
  return [...INFO_DAFTAR_OPTIONS, { value, label: value }];
}
