import type { SelectOption } from '@/components/ui/Select';

export type TipeSoal = 'pilihan_ganda' | 'isian_singkat' | 'uraian';

export const TIPE_SOAL_OPTIONS: SelectOption[] = [
  { value: 'pilihan_ganda', label: 'Pilihan Ganda' },
  { value: 'isian_singkat', label: 'Isian Singkat' },
  { value: 'uraian', label: 'Uraian' },
];

export const TIPE_SOAL_VALUES = TIPE_SOAL_OPTIONS.map((o) => o.value) as [TipeSoal, ...TipeSoal[]];

export const TIPE_SOAL_LABEL: Record<TipeSoal, string> = {
  pilihan_ganda: 'Pilihan Ganda',
  isian_singkat: 'Isian Singkat',
  uraian: 'Uraian',
};

export type TingkatKesulitan = 'mudah' | 'sedang' | 'sukar';

export const TINGKAT_KESULITAN_OPTIONS: SelectOption[] = [
  { value: 'mudah', label: 'Mudah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'sukar', label: 'Sukar' },
];

export const TINGKAT_KESULITAN_VALUES = TINGKAT_KESULITAN_OPTIONS.map((o) => o.value) as [
  TingkatKesulitan,
  ...TingkatKesulitan[],
];

export const TINGKAT_KESULITAN_LABEL: Record<TingkatKesulitan, string> = {
  mudah: 'Mudah',
  sedang: 'Sedang',
  sukar: 'Sukar',
};

export const BANK_SOAL_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'id', label: 'ID Soal' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
  { value: 'bobot', label: 'Bobot' },
];

export interface BankSoalOpsi {
  id: number;
  bank_soal_id?: number;
  teks: string;
  gambar_path?: string | null;
  is_benar: boolean;
  urutan: number;
}

export interface BankSoalKategori {
  id: number;
  nama: string;
}

export interface BankSoal {
  id: number;
  rps_id?: number | null;
  rps_mingguan_id?: number | null;
  sub_cpmk_id?: number | null;
  kategori_id?: number | null;
  kategori?: BankSoalKategori | null;
  rps?: {
    id: number;
    mata_kuliah?: { kode_mk?: string; nama?: string } | null;
    tahun_ajaran?: string | null;
  } | null;
  tipe_soal: TipeSoal;
  tingkat_kesulitan?: TingkatKesulitan | null;
  bobot?: number | null;
  pertanyaan: string;
  gambar_path?: string | null;
  kunci_jawaban?: string | null;
  pembahasan?: string | null;
  opsi?: BankSoalOpsi[];
  dipakai_quiz?: boolean;
  quiz_count?: number;
}

export interface BankSoalListParams {
  search?: string;
  rps_id?: number;
  kategori_id?: number;
  tipe_soal?: string;
  tingkat_kesulitan?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface BankSoalPayload {
  id?: number;
  rps_id: number;
  rps_mingguan_id?: number | null;
  sub_cpmk_id?: number | null;
  kategori_id?: number | null;
  tipe_soal?: TipeSoal;
  tingkat_kesulitan?: TingkatKesulitan;
  bobot?: number;
  pertanyaan: string;
  gambar_path?: string | null;
  kunci_jawaban?: string | null;
  pembahasan?: string | null;
}

/** Hasil import bank soal dari XLSX/CSV (import parsial — baris invalid dilaporkan). */
export interface BankSoalImportResult {
  total_imported: number;
  total_rows: number;
  total_skipped: number;
  ids: number[];
  errors: string[];
}

/** Hasil hapus massal bank soal (soal yang dipakai quiz LMS dilewati). */
export interface BankSoalBulkDeleteResult {
  total_deleted: number;
  total_skipped: number;
  deleted_ids: number[];
  skipped: { id: number; pertanyaan?: string | null; reason: string }[];
}

/** Hasil pemindahan massal bank soal. */
export interface BankSoalBulkMoveResult {
  total_updated: number;
  ids: number[];
  updates: Record<string, number | null>;
}
