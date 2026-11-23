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