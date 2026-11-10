import { ApiResponse, PaginationMeta } from './api.types';
import type { SelectOption } from '@/components/ui/Select';

/**
 * Status pertemuan LMS.
 *
 * Closed-set dari domain yang bersumber dari CHECK constraint kolom
 * `siakad_pertemuan.status_pertemuan` (backend: `Pertemuan::STATUSES`).
 * Tidak ada tabel master untuk nilai ini, jadi dideklarasikan sebagai
 * konstanta terpusat di sini — jangan menulis ulang di komponen lain.
 */
export type PertemuanStatus = 'belum' | 'berlangsung' | 'selesai';

export const PERTEMUAN_STATUS_OPTIONS: SelectOption[] = [
  { value: 'belum', label: 'Belum Berlangsung' },
  { value: 'berlangsung', label: 'Berlangsung' },
  { value: 'selesai', label: 'Selesai' },
];

/**
 * Tuple nilai status pertemuan untuk schema Zod (`z.enum`).
 *
 * Diturunkan dari `PERTEMUAN_STATUS_OPTIONS` supaya hanya ada satu sumber
 * kebenaran — jangan menulis ulang daftar nilainya di schema form.
 */
export const PERTEMUAN_STATUS_VALUES = PERTEMUAN_STATUS_OPTIONS.map(
  (option) => option.value
) as [PertemuanStatus, ...PertemuanStatus[]];

export const PERTEMUAN_STATUS_LABEL: Record<PertemuanStatus, string> = {
  belum: 'Belum Berlangsung',
  berlangsung: 'Berlangsung',
  selesai: 'Selesai',
};

/**
 * Kolom pengurutan daftar encounter/pertemuan agregat.
 *
 * Nilai-nilai ini adalah nama kolom nyata pada tabel `siakad_pertemuan`,
 * bukan entitas master, jadi memang berupa closed-set yang stabil.
 */
export type PertemuanSortBy = 'tanggal' | 'pertemuan_ke' | 'jam_mulai' | 'status_pertemuan' | 'created_at';

/** Whitelist kolom `sort_by` pada daftar pertemuan agregat (backend: `LmsController::listPertemuanSaya`). */
export const PERTEMUAN_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'tanggal', label: 'Tanggal' },
  { value: 'pertemuan_ke', label: 'Nomor Pertemuan' },
  { value: 'jam_mulai', label: 'Jam Mulai' },
  { value: 'status_pertemuan', label: 'Status' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

/** Whitelist kolom `sort_by` pada daftar kelas saya (backend: `LmsController::getMyKelas`). */
export const KELAS_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'nama_kelas', label: 'Nama Kelas' },
  { value: 'kode_kelas', label: 'Kode Kelas' },
  { value: 'program_studi', label: 'Program Studi' },
  { value: 'tahun_akademik', label: 'Tahun Akademik' },
  { value: 'kapasitas', label: 'Kapasitas Kelas' },
  { value: 'id', label: 'ID Kelas' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

/** Whitelist kolom `sort_by` pada daftar pengaturan kelas (backend: `LmsController::indexPengaturan`). */
/**
 * Status konfigurasi LMS pada rekap pengaturan.
 *
 * Closed-set dari domain yang bersumber dari filter backend
 * `LmsService::STATUS_PENGATURAN` (endpoint `GET /lms/pengaturan`). Nilai ini
 * memeriksa keberadaan baris `lms_kelas_setting`, bukan isi nilainya, sehingga
 * kelas yang belum pernah dikonfigurasi bisa disaring terpisah.
 */
export type PengaturanStatus = 'terkonfigurasi' | 'belum_terkonfigurasi';

export const PENGATURAN_STATUS_OPTIONS: SelectOption[] = [
  { value: 'terkonfigurasi', label: 'Sudah Dikonfigurasi' },
  { value: 'belum_terkonfigurasi', label: 'Belum Dikonfigurasi' },
];

export const PENGATURAN_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'kode_kelas', label: 'Kode Kelas' },
  { value: 'nama_kelas', label: 'Nama Kelas' },
  { value: 'kapasitas', label: 'Kapasitas' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

/** Whitelist kolom `sort_by` pada daftar tryout (backend: `QuizController::listTryoutSaya`). */
export const TRYOUT_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'id', label: 'ID Tryout' },
  { value: 'judul', label: 'Judul' },
  { value: 'durasi_menit', label: 'Durasi' },
  { value: 'dibuka_at', label: 'Waktu Dibuka' },
  { value: 'ditutup_at', label: 'Waktu Ditutup' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

/** Whitelist kolom `sort_by` pada daftar topik forum (backend: `ForumController::listTopikSaya`). */
export const FORUM_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'id', label: 'ID Topik' },
  { value: 'judul', label: 'Judul' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
  { value: 'is_pinned', label: 'Status Semat' },
];

/** Status publikasi quiz/tryout (backend kolom boolean `is_published`). */
export const PUBLISH_STATUS_OPTIONS: SelectOption[] = [
  { value: '0', label: 'Draft' },
  { value: '1', label: 'Published' },
];

/**
 * Opsi Ya/Tidak generik untuk field boolean yang diwakili Select `1`/`0`
 * (mis. acak_soal, acak_jawaban pada tryout).
 *
 * Closed-set domain (ya/tidak), bukan entitas master — dideklarasikan
 * terpusat di sini, jangan menulis ulang di komponen.
 */
export const YA_TIDAK_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Ya' },
  { value: '0', label: 'Tidak' },
];

/**
 * Whitelist kolom `sort_by` pada rekap absensi kelas
 * (backend: `LmsController::getRekapAbsensi`).
 */
export const ABSENSI_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'mata_kuliah', label: 'Mata Kuliah' },
  { value: 'kode_kelas', label: 'Kode Kelas' },
  { value: 'hari', label: 'Hari Kuliah' },
];

/**
 * Metode absensi LMS.
 *
 * Closed-set dari domain yang bersumber dari CHECK constraint kolom
 * `lms_kelas_setting.metode_absensi` (backend: `KelasLmsSetting::METODE_ABSENSI`).
 * Tidak ada tabel master untuk nilai ini, jadi dideklarasikan sebagai
 * konstanta terpusat di sini — jangan menulis ulang di komponen lain.
 */
export type MetodeAbsensi = 'manual_dosen' | 'token_mahasiswa' | 'keduanya';

export const METODE_ABSENSI_OPTIONS: SelectOption[] = [
  { value: 'manual_dosen', label: 'Absensi Manual oleh Dosen' },
  { value: 'token_mahasiswa', label: 'Token Absensi Mahasiswa' },
  { value: 'keduanya', label: 'Keduanya (Manual & Token)' },
];

/**
 * Tuple nilai metode absensi untuk schema Zod (`z.enum`).
 *
 * Diturunkan dari `METODE_ABSENSI_OPTIONS` supaya hanya ada satu sumber
 * kebenaran — jangan menulis ulang daftar nilainya di schema form.
 */
export const METODE_ABSENSI_VALUES = METODE_ABSENSI_OPTIONS.map(
  (option) => option.value
) as [MetodeAbsensi, ...MetodeAbsensi[]];

export const METODE_ABSENSI_LABEL: Record<MetodeAbsensi, string> = {
  manual_dosen: 'Absensi Manual oleh Dosen',
  token_mahasiswa: 'Token Absensi Mahasiswa',
  keduanya: 'Keduanya (Manual & Token)',
};

export interface LmsKelasSetting {
  id?: number;
  kelas_id: number;
  total_pertemuan: number;
  metode_absensi: MetodeAbsensi;
  batas_min_hadir_persen: number;
  can_submit_late: boolean;
  show_nilai_to_mahasiswa: boolean;
  storage_disk?: string | null;
  /** `true` bila kelas belum pernah dikonfigurasi (backend mengembalikan setting bawaan). */
  is_default?: boolean;
}

/**
 * Nilai bawaan untuk kelas yang belum pernah dikonfigurasi.
 *
 * Backend menyelaraskan nilai ini dengan default kolom di database
 * (`KelasLmsSetting::defaultSetting()`) dan mengirim `lms_setting: null`
 * pada endpoint agregat, jadi UI cukup memakai konstanta ini saat kosong.
 */
export const LMS_SETTING_DEFAULT: Omit<LmsKelasSetting, 'id' | 'kelas_id'> = {
  total_pertemuan: 16,
  metode_absensi: 'keduanya',
  batas_min_hadir_persen: 75,
  can_submit_late: true,
  show_nilai_to_mahasiswa: false,
  storage_disk: null,
};

export interface LmsKelasItem {
  id: number;
  program_studi_id: number;
  mata_kuliah_id: number;
  tahun_akademik_id: number;
  kode_kelas: string;
  nama_kelas: string;
  kapasitas: number;
  mata_kuliah?: {
    id: number;
    kode_mk: string;
    nama: string;
    sks_teori: number;
    sks_praktik: number;
    total_sks: number;
  };
  tahun_akademik?: {
    id: number;
    kode: string;
    nama: string;
    semester: string;
    is_aktif: boolean;
  };
  program_studi?: {
    id: number;
    kode_prodi: string;
    nama: string;
    jenjang: string;
  };
  dosen_pengampu?: Array<{
    id: number;
    peran: string;
    dosen?: {
      id: number;
      nidn: string;
      nama_lengkap: string;
    };
  }>;
  /** Hanya terisi pada endpoint agregat `/lms/pengaturan`. */
  lms_setting?: LmsKelasSetting | null;
  pertemuan_count?: number;
  mahasiswa_count?: number;
}

export type LmsViewerMode = 'dosen' | 'mahasiswa' | 'pengelola';

export interface LmsViewerContext {
  viewer_mode: LmsViewerMode;
  is_pengampu: boolean;
  is_peserta_krs: boolean;
  is_pengelola: boolean;
  can_teach: boolean;
  can_configure_kelas: boolean;
  can_participate: boolean;
  can_export: boolean;
}

export interface LmsKelasOverview {
  kelas: LmsKelasItem;
  lms_setting: LmsKelasSetting;
  viewer_context?: LmsViewerContext;
  komponen_obe?: Array<{
    id: number;
    nama_komponen: string;
    bobot: number;
    urutan: number;
  }>;
  progress: {
    total_pertemuan_terencana: number;
    pertemuan_selesai: number;
    pertemuan_berjalan: number;
    persentase_selesai: number;
  };
  statistik: {
    total_materi: number;
    total_tugas: number;
    total_izin_pending: number;
    total_mahasiswa_krs: number;
  };
  pertemuan_list: LmsPertemuanItem[];
}

export interface LmsMateriFile {
  id: number;
  materi_id: number;
  nama_file: string;
  file_path: string;
  disk: string;
  mime_type?: string | null;
  ukuran_bytes?: number | null;
}

/**
 * Hasil permintaan URL unduh berkas LMS.
 *
 * Sesuai backend `LmsService::getDownloadUrl()`:
 * - `materi` → id = `lms_materi_file.id`
 * - `pengumpulan` → id = `lms_pengumpulan_tugas.id`
 */
export interface LmsDownloadUrl {
  nama_file: string;
  download_url: string;
  disk: string;
}

export interface LmsMateriItem {
  id: number;
  pertemuan_id: number;
  tipe_konten_id?: number | null;
  judul: string;
  deskripsi?: string | null;
  tipe_konten: 'teks' | 'file' | 'link_eksternal' | 'video_embed';
  link_eksternal?: string | null;
  urutan: number;
  is_published: boolean;
  files?: LmsMateriFile[];
  tipe_konten_ref?: {
    id: number;
    kode: string;
    nama: string;
  };
}

export interface LmsTugasItem {
  id: number;
  pertemuan_id: number;
  komponen_penilaian_id?: number | null;
  judul: string;
  deskripsi?: string | null;
  deadline_at?: string | null;
  maks_nilai: number;
  can_submit_late: boolean;
  is_published: boolean;
  komponen_penilaian?: {
    id: number;
    nama_komponen: string;
    bobot: number;
  };
  pengumpulan_count?: number;
  pengumpulan?: LmsPengumpulanTugas[];
}

export interface LmsPengumpulanTugas {
  id: number;
  tugas_id: number;
  mahasiswa_id: number;
  catatan_mahasiswa?: string | null;
  file_path?: string | null;
  nama_file_asli?: string | null;
  ukuran_bytes?: number | null;
  is_late: boolean;
  nilai?: number | null;
  feedback_dosen?: string | null;
  dinilai_at?: string | null;
  mahasiswa?: {
    id: number;
    nim: string;
    nama_lengkap: string;
  };
}

export interface LmsIzinAbsensiItem {
  id: number;
  pertemuan_id: number;
  mahasiswa_id: number;
  tipe_izin_id?: number | null;
  tipe_izin: 'sakit' | 'izin';
  alasan: string;
  surat_path?: string | null;
  status: 'pending' | 'disetujui' | 'ditolak';
  catatan_dosen?: string | null;
  diproses_at?: string | null;
  mahasiswa?: {
    id: number;
    nim: string;
    nama_lengkap: string;
  };
}

/**
 * Ringkasan kelas yang ikut di-eager-load pada endpoint agregat module-level
 * (`/lms/pertemuan`, `/lms/tryout`, `/lms/forum`).
 */
export interface LmsKelasRingkas {
  id: number;
  kode_kelas: string;
  nama_kelas: string;
  mata_kuliah?: {
    id: number;
    kode_mk: string;
    nama: string;
    total_sks?: number | null;
  } | null;
  tahun_akademik?: {
    id: number;
    nama: string;
  } | null;
}

/**
 * Payload ubah pertemuan. Field `pertemuan_ke`, `tanggal`, `materi`,
 * `catatan_pertemuan`, `jam_mulai`, `jam_selesai`, `status_pertemuan`.
 */
export type LmsPertemuanPayload = {
  pertemuan_ke: number;
  tanggal: string;
  materi?: string | null;
  catatan_pertemuan?: string | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  status_pertemuan?: PertemuanStatus | null;
};

export interface LmsPertemuanItem {
  id: number;
  kelas_id: number;
  pertemuan_ke: number;
  tanggal: string;
  materi?: string | null;
  catatan_pertemuan?: string | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  status_pertemuan?: PertemuanStatus;
  token_absensi?: string | null;
  token_expired_at?: string | null;
  is_token_active?: boolean;
  materi_list_count?: number;
  tugas_list_count?: number;
  hadir_count?: number;
  /** Hanya terisi pada endpoint agregat `/lms/pertemuan`. */
  kelas?: LmsKelasRingkas | null;
}

export interface LmsTokenGenerate {
  pertemuan_id: number;
  kelas_id?: number;
  token: string;
  qr_payload?: string;
  rotate_interval_seconds?: number;
  ttl_menit: number;
  window_menit: number;
  expired_at: string;
  sisa_detik: number;
}

export interface LmsTokenRotate {
  pertemuan_id: number;
  kelas_id?: number;
  token: string;
  qr_payload?: string;
  rotate_interval_seconds?: number;
  ttl_detik: number;
  expired_at: string;
  sisa_detik: number;
}

export interface LmsBukaSesiPresensiResponse extends LmsTokenRotate {
  window_menit?: number;
  pertemuan?: LmsPertemuanItem;
}

export interface LmsScanPresensiResult {
  pertemuan_id: number;
  pertemuan_ke: number;
  tanggal: string;
  materi?: string | null;
  kelas_id: number;
  kode_kelas?: string | null;
  nama_kelas?: string | null;
  mata_kuliah?: string | null;
  status: string;
  waktu_absen: string;
}

export interface LmsSesiPresensiAktifItem {
  pertemuan_id: number;
  pertemuan_ke: number;
  tanggal: string;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  materi?: string | null;
  kelas_id: number;
  kode_kelas?: string | null;
  nama_kelas?: string | null;
  mata_kuliah?: string | null;
  ruangan?: string | null;
  sudah_absen: boolean;
  status_absensi?: string | null;
  waktu_absen?: string | null;
}

export interface LmsPertemuanDetail {
  pertemuan: LmsPertemuanItem;
  viewer_context?: LmsViewerContext;
  materi_list: LmsMateriItem[];
  tugas_list: LmsTugasItem[];
  quiz_list: LmsQuizItem[];
  absensi_list: Array<{
    id?: number;
    mahasiswa_id: number;
    nim: string;
    nama_lengkap: string;
    status: string | null;
    status_label?: string | null;
    catatan?: string | null;
    is_submitted?: boolean;
    waktu_absen?: string | null;
  }>;
  izin_list: LmsIzinAbsensiItem[];
  komponen_obe_list?: Array<{
    id: number;
    nama_komponen: string;
    bobot: number;
  }>;
  token_aktif?: boolean;
  token_sisa_detik?: number;
  presensi_ditutup?: boolean;
  presensi_closed_at?: string | null;
  my_absensi?: {
    id: number;
    status: string;
    catatan?: string | null;
    waktu_absen?: string | null;
  } | null;
  my_pengumpulan?: Record<number, LmsPengumpulanTugas>;
  my_izin?: LmsIzinAbsensiItem | null;
}

export interface LmsPertemuanAbsensiRoster {
  pertemuan_id: number;
  absensi_list: LmsPertemuanDetail['absensi_list'];
  total_peserta: number;
  total_sudah_absen: number;
  total_belum_absen: number;
  refreshed_at: string;
}

export interface LmsRekapAbsensi {
  kelas_id: number;
  total_pertemuan: number;
  batas_min_hadir_persen: number;
  rekapitulasi: Array<{
    mahasiswa_id: number;
    nim: string;
    nama_lengkap: string;
    total_hadir: number;
    total_sakit: number;
    total_izin: number;
    total_alfa: number;
    persentase_kehadiran: number;
    is_memenuhi_syarat: boolean;
    detail_pertemuan: Record<number, string>;
  }>;
}

export type LmsListKelasResponse = ApiResponse<LmsKelasItem[]>;
export type LmsOverviewResponse = ApiResponse<LmsKelasOverview>;
export type LmsPertemuanResponse = ApiResponse<LmsPertemuanDetail>;
export type LmsRekapAbsensiResponse = ApiResponse<LmsRekapAbsensi>;

// ── Quiz & Tryout (Fase B/C) ──

export interface LmsQuizItem {
  id: number;
  pertemuan_id?: number | null;
  kelas_id?: number | null;
  tipe: 'kuis' | 'tryout';
  komponen_penilaian_id?: number | null;
  judul: string;
  deskripsi?: string | null;
  durasi_menit?: number | null;
  max_attempt: number;
  /** Ambang kelulusan 0–100; `null` = tanpa ambang (status lulus tidak ditampilkan). */
  passing_score?: number | string | null;
  acak_soal: boolean;
  acak_jawaban: boolean;
  batch_size?: number | null;
  dibuka_at?: string | null;
  ditutup_at?: string | null;
  is_published: boolean;
  is_archived: boolean;
  kode_akses?: string | null;
  soal_count?: number;
  tryout_peserta_count?: number;
  kolaborator_dosen_ids?: number[];
  kolaborators?: LmsQuizKolaborator[];
  /** Hanya terisi pada endpoint agregat `/lms/tryout`. */
  kelas?: LmsKelasRingkas | null;
}

export interface LmsQuizSoalOpsi {
  id: number;
  teks: string;
  gambar_path?: string | null;
  urutan: number;
}

export interface LmsQuizBatchSoal {
  quiz_soal_id: number;
  urutan: number;
  poin: number;
  tipe_soal: 'pilihan_ganda' | 'isian_singkat' | 'uraian';
  pertanyaan: string;
  gambar_path?: string | null;
  opsi: LmsQuizSoalOpsi[];
}

export interface LmsQuizBatch {
  attempt_id: number;
  page: number;
  batch_size: number;
  total_soal: number;
  total_pages: number;
  data: LmsQuizBatchSoal[];
}

export interface LmsQuizAttempt {
  id: number;
  quiz_id: number;
  mahasiswa_id: number;
  attempt_ke: number;
  status: 'berlangsung' | 'selesai';
  dimulai_at: string;
  disubmit_at?: string | null;
  nilai_akhir?: number | null;
  /** Kelulusan attempt terhadap `passing_score`; `null`/undefined = ambang belum ditetapkan atau belum dinilai. */
  is_lulus?: boolean | null;
  butuh_penilaian_manual: boolean;
  feedback_dosen?: string | null;
  mahasiswa?: { id: number; nim: string; nama_lengkap: string };
}

export interface LmsTryoutPeserta {
  id: number;
  quiz_id: number;
  mahasiswa_id: number;
  mahasiswa?: {
    id: number;
    nim: string;
    nama_lengkap: string;
    kelas?: string | null;
    angkatan?: number | null;
    program_studi_id?: number | null;
    program_studi?: { id: number; kode_prodi: string; nama: string; jenjang?: string } | null;
  };
}

/** Hasil pencarian mahasiswa untuk pemilih peserta tryout (`GET /lms/mahasiswa/search`). */
export interface LmsMahasiswaRingkas {
  id: number;
  nim: string;
  nama_lengkap: string;
  program_studi_id?: number | null;
  angkatan?: number | null;
  kelas?: string | null;
  status?: string | null;
  program_studi?: { id: number; kode_prodi: string; nama: string; jenjang?: string } | null;
}

// ── Detail attempt & preview tryout (dosen kelola) ──

/**
 * Satu baris jawaban dalam detail attempt.
 *
 * Dibuat defensif (`any` untuk bentuk soal/kunci) karena endpoint
 * `GET /v1/lms/attempt/{id}/detail` masih paralel dengan backend —
 * field yang belum ada cukup diabaikan saat render.
 */
export interface LmsAttemptJawaban {
  id: number;
  quiz_soal_id: number;
  bank_opsi_id?: number | null;
  jawaban_teks?: string | null;
  is_benar?: boolean | null;
  poin_diperoleh?: number | null;
  feedback_dosen?: string | null;
  quiz_soal?: any;
}

export interface LmsAttemptDetail {
  attempt: LmsQuizAttempt;
  jawaban?: LmsAttemptJawaban[];
  questions?: any[];
  [key: string]: any;
}

/** Hasil `GET /v1/lms/quiz/{id}/preview` — tampilan read-only tanpa kunci. */
export interface LmsQuizPreview {
  quiz: LmsQuizItem;
  soal?: LmsQuizBatchSoal[];
  [key: string]: any;
}

// ── Forum (Fase C) ──

export interface LmsForumTopik {
  id: number;
  judul: string;
  /** Penanda topik default kelas ("Diskusi Umum"); null untuk topik buatan pengguna. */
  slug?: string | null;
  kelas_id?: number | null;
  pertemuan_id?: number | null;
  is_pinned: boolean;
  total_post: number;
  post_terakhir?: {
    nama_penulis: string;
    isi: string;
    created_at: string;
  } | null;
  /** Nama kolom dari `withCount('posts')` pada endpoint agregat. */
  posts_count?: number;
  /** Hanya terisi pada endpoint agregat `/lms/forum`. */
  kelas?: LmsKelasRingkas | null;
  created_at?: string;
  updated_at?: string;
}

export interface LmsForumPost {
  id: number;
  topik_id: number;
  parent_id?: number | null;
  user_id?: number | null;
  nama_penulis: string;
  isi: string;
  created_at: string;
  updated_at?: string;
  /** Atribut terhitung dari backend: pesan pernah diedit (`updated_at > created_at`). */
  is_edited?: boolean;
  balasan?: LmsForumPost[];
}

// ── Rekap matrix mahasiswa x pertemuan (dosen) ──

/** Satu sel kehadiran pada matriks rekap (H/S/I/A/belum). */
export type RekapMatrixStatus = 'H' | 'S' | 'I' | 'A' | '-';

export interface LmsRekapMatrixPertemuan {
  id: number;
  pertemuan_ke: number;
  tanggal?: string | null;
}

export interface LmsRekapMatrixRow {
  mahasiswa_id: number;
  nim: string;
  nama_lengkap: string;
  /** Kunci: pertemuan_ke atau pertemuan id (string), nilai: H/S/I/A. */
  kehadiran: Record<string, string>;
  persentase_kehadiran: number;
  is_memenuhi_syarat: boolean;
}

export interface LmsRekapMatrix {
  kelas_id: number;
  total_pertemuan: number;
  batas_min_hadir_persen: number;
  pertemuan_list: LmsRekapMatrixPertemuan[];
  rows: LmsRekapMatrixRow[];
  /** Kompatibilitas: backend lama memakai `rekapitulasi`. */
  rekapitulasi?: LmsRekapMatrixRow[];
}

// ── Ketercapaian MK / OBE (mahasiswa) ──

export interface LmsKetercapaianKomponen {
  id: number;
  nama_komponen: string;
  bobot: number;
  nilai?: number | null;
  persentase?: number | null;
}

export interface LmsKetercapaian {
  kelas_id: number;
  komponen: LmsKetercapaianKomponen[];
  nilai_akhir?: number | null;
  progress_persen?: number | null;
}

// ── Kolaborator tryout (dosen) ──

/** Peran kolaborator tryout (closed-set domain, tanpa tabel master). */
export type TryoutPeran = 'pengawas' | 'pemantau' | 'penginput_soal';

export const TRYOUT_PERAN_OPTIONS: SelectOption[] = [
  { value: 'pengawas', label: 'Pengawas' },
  { value: 'pemantau', label: 'Pemantau' },
  { value: 'penginput_soal', label: 'Penginput Soal' },
];

export const TRYOUT_PERAN_VALUES = TRYOUT_PERAN_OPTIONS.map(
  (option) => option.value
) as [TryoutPeran, ...TryoutPeran[]];

export const TRYOUT_PERAN_LABEL: Record<TryoutPeran, string> = {
  pengawas: 'Pengawas',
  pemantau: 'Pemantau',
  penginput_soal: 'Penginput Soal',
};

export interface LmsQuizKolaborator {
  id: number;
  quiz_id: number;
  dosen_id: number;
  peran: TryoutPeran;
  dosen?: {
    id: number;
    nidn?: string | null;
    nama_lengkap: string;
  } | null;
}

// ── Export Laporan LMS ──

/**
 * Format berkas export laporan LMS.
 *
 * Closed-set dari domain (bukan entitas master), dideklarasikan sebagai
 * konstanta terpusat agar sinkron dengan `LmsExportService::FORMATS`
 * di backend. Jangan menulis ulang daftar ini di komponen lain.
 */
export type LmsExportFormat = 'csv' | 'xlsx';

export const LMS_EXPORT_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
];

export const LMS_EXPORT_FORMAT_VALUES = LMS_EXPORT_FORMAT_OPTIONS.map(
  (option) => option.value
) as [LmsExportFormat, ...LmsExportFormat[]];

export const LMS_EXPORT_FORMAT_LABEL: Record<LmsExportFormat, string> = {
  csv: 'CSV',
  xlsx: 'Excel (XLSX)',
};

/**
 * Hasil unduh laporan: blob berkas + nama berkas final dari header
 * `Content-Disposition` backend.
 */
export interface LmsExportFile {
  blob: Blob;
  filename: string;
}

/**
 * Jenis laporan export LMS.
 *
 * Setiap jenis memetakan ke satu endpoint backend (bukan entitas master),
 * sehingga tetap berupa closed-set yang stabil dan dideklarasikan sebagai
 * konstanta terpusat.
 */
export type LmsExportJenis = 'presensi' | 'izin' | 'nilai' | 'pengumpulan' | 'quiz' | 'tryout';

export const LMS_EXPORT_JENIS_LABEL: Record<LmsExportJenis, string> = {
  presensi: 'Rekap Absensi',
  izin: 'Rekap Pengajuan Izin',
  nilai: 'Rekap Nilai (Tugas & Quiz)',
  pengumpulan: 'Status Pengumpulan Tugas',
  quiz: 'Hasil Pengerjaan Quiz',
  tryout: 'Hasil Pengerjaan Tryout',
};

// ── Monitoring Presensi Lokal LMS / SIAKAD RAG ──

/**
 * Status kehadiran mahasiswa pada satu pertemuan.
 *
 * Sejalan dengan CHECK constraint `siakad_absensi_mahasiswa.status`.
 */
export type LmsPresensiAbsenStatus = 'hadir' | 'sakit' | 'izin' | 'alfa';

export const LMS_PRESENSI_ABSEN_STATUS_OPTIONS: SelectOption[] = [
  { value: 'hadir', label: 'Hadir' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'izin', label: 'Izin' },
  { value: 'alfa', label: 'Alfa' },
];

export const LMS_PRESENSI_ABSEN_STATUS_LABEL: Record<LmsPresensiAbsenStatus, string> = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alfa: 'Alfa',
};

/** Ringkasan presensi lokal sebuah kelas. */
export interface LmsPresensiKelasItem {
  id: number;
  kode_kelas: string;
  nama_kelas: string;
  mata_kuliah?: { id: number; nama: string } | null;
  program_studi?: { id: number; nama: string; kode_prodi?: string } | null;
  tahun_akademik?: { id: number; kode: string; nama: string } | null;
  jumlah_sesi: number;
  jumlah_rekap: number;
  jumlah_hadir: number;
}

/** Baris rekap kehadiran (satu baris per mahasiswa per pertemuan). */
export interface LmsPresensiRekapItem {
  id: number;
  status: LmsPresensiAbsenStatus;
  catatan: string | null;
  pertemuan_id: number;
  pertemuan_ke: number;
  tanggal: string;
  materi: string | null;
  kelas_id: number;
  kode_kelas: string;
  nama_kelas: string;
  nama_mk: string | null;
  nim: string;
  nama_lengkap: string;
}

/** Pilihan kolom pengurutan daftar kelas. */
export const LMS_PRESENSI_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'kode_kelas', label: 'Kode Kelas' },
  { value: 'nama_kelas', label: 'Nama Kelas' },
  { value: 'jumlah_sesi', label: 'Jumlah Sesi' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

/* ══════════════════════════════════════════════════════════════
 * Notifikasi In-App LMS (LMS-04 / Fase 3A)
 * ══════════════════════════════════════════════════════════════ */

/**
 * Jenis notifikasi LMS.
 *
 * Closed-set dari domain backend (`App\Models\Lms\LmsNotifikasi::JENIS`).
 * Tidak ada tabel master untuk nilai ini, jadi dideklarasikan sebagai
 * konstanta terpusat di sini.
 */
export type LmsNotifikasiJenis =
  | 'deadline_tugas'
  | 'deadline_quiz'
  | 'tugas_baru'
  | 'quiz_baru'
  | 'forum'
  | 'info';

export const LMS_NOTIFIKASI_JENIS_OPTIONS: SelectOption[] = [
  { value: 'deadline_tugas', label: 'Deadline Tugas' },
  { value: 'deadline_quiz', label: 'Deadline Kuis' },
  { value: 'tugas_baru', label: 'Tugas Baru' },
  { value: 'quiz_baru', label: 'Kuis Baru' },
  { value: 'forum', label: 'Forum Diskusi' },
  { value: 'info', label: 'Informasi' },
];

/**
 * Prioritas notifikasi (closed-set domain backend).
 */
export type LmsNotifikasiPrioritas = 'rendah' | 'normal' | 'tinggi';

export const LMS_NOTIFIKASI_PRIORITAS_OPTIONS: SelectOption[] = [
  { value: 'rendah', label: 'Rendah' },
  { value: 'normal', label: 'Normal' },
  { value: 'tinggi', label: 'Tinggi' },
];

/** Label jenis notifikasi untuk badge. */
export const LMS_NOTIFIKASI_JENIS_LABEL: Record<LmsNotifikasiJenis, string> = {
  deadline_tugas: 'Deadline Tugas',
  deadline_quiz: 'Deadline Kuis',
  tugas_baru: 'Tugas Baru',
  quiz_baru: 'Kuis Baru',
  forum: 'Forum Diskusi',
  info: 'Informasi',
};

/** Satu notifikasi milik pengguna yang sedang login. */
export interface LmsNotifikasiItem {
  id: number;
  user_id: number;
  jenis: LmsNotifikasiJenis;
  judul: string;
  pesan: string | null;
  /** Rute frontend tujuan (mis. `/lms/tugas/9`). */
  rute: string | null;
  kelas_id: number | null;
  entitas_type: string | null;
  entitas_id: number | null;
  prioritas: LmsNotifikasiPrioritas;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at?: string;
  kelas?: { id: number; kode_kelas: string; nama_kelas: string } | null;
}

/** Hasil endpoint jumlah notifikasi belum dibaca. */
export interface LmsNotifikasiUnreadCount {
  unread_count: number;
}

/** Pilihan kolom pengurutan daftar notifikasi. */
export const LMS_NOTIFIKASI_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'created_at', label: 'Waktu Diterima' },
  { value: 'read_at', label: 'Waktu Dibaca' },
  { value: 'prioritas', label: 'Prioritas' },
  { value: 'jenis', label: 'Jenis' },
];

/**
 * Opsi filter status baca notifikasi (closed-set boolean, bukan entitas master).
 */
export const LMS_NOTIFIKASI_READ_OPTIONS: SelectOption[] = [
  { value: 'false', label: 'Belum Dibaca' },
  { value: 'true', label: 'Sudah Dibaca' },
];

/** Ringkasan dashboard LMS (`GET /lms/dashboard/overview`). */
export interface LmsDashboardClass {
  id: number;
  kode_kelas: string;
  nama_kelas: string;
  hari: string | null;
  jam_mulai: string | null;
  jam_selesai: string | null;
  mata_kuliah: { id: number; kode: string; nama: string } | null;
}

export interface LmsDashboardOverview {
  role: 'mahasiswa' | 'dosen' | 'pengelola';
  jadwal: {
    hari_ini: string;
    tanggal: string;
    kelas: {
      hari_ini: LmsDashboardClass[];
      semua: LmsDashboardClass[];
    };
  };
  ringkasan: {
    kelas: number;
    tugas_aktif: number;
    tryout_aktif: number;
    forum_topik: number;
    notifikasi_belum_dibaca: number;
  };
  tambahan: Record<string, number>;
  tren: Array<{ tanggal: string; pengumpulan: number; attempt: number }>;
  preview: {
    tugas: Array<{
      id: number;
      judul: string;
      deadline_at: string | null;
      pertemuan_id: number;
      kelas_id: number;
      kode_kelas: string;
      nama_kelas: string;
      mata_kuliah: { id: number; kode: string; nama: string } | null;
      belum_dinilai: number | null;
    }>;
    kuis: Array<{
      id: number;
      judul: string;
      tipe: 'kuis' | 'tryout';
      dibuka_at: string | null;
      deadline_at: string | null;
      pertemuan_id: number | null;
      kelas_id: number;
      kode_kelas: string;
      nama_kelas: string;
      mata_kuliah: { id: number; kode: string; nama: string } | null;
    }>;
    materi: Array<{
      id: number;
      judul: string;
      updated_at: string | null;
      pertemuan_id: number;
      kelas_id: number;
      kode_kelas: string;
      nama_kelas: string;
      mata_kuliah: { id: number; kode: string; nama: string } | null;
    }>;
  };
}

/** Tipe nilai pengaturan modul LMS (mengikuti definisi backend). */
export type LmsSettingType = 'boolean' | 'integer' | 'string';

/** Definisi satu field pengaturan modul LMS. */
export interface LmsPengaturanDefinition {
  key: string;
  label: string;
  group: string;
  type: LmsSettingType;
  min?: number;
  max?: number;
  default: boolean | number | string;
  public?: boolean;
  description?: string;
}

/** Payload `GET /lms/pengaturan/modul`. */
export interface LmsPengaturanModul {
  values: Record<string, boolean | number | string>;
  definitions: LmsPengaturanDefinition[];
}

/** Pengaturan publik (`GET /lms/public/settings`). */
export type LmsPublicSettings = Record<string, boolean | number | string>;

/** Item monitoring keaktifan mengajar dosen (Super Admin / Admin). */
export interface LmsKeaktifanDosenItem {
  kelas_id: number;
  kode_kelas: string;
  nama_kelas: string;
  prodi: { id: number; nama: string; kode?: string } | null;
  mata_kuliah: { id: number; nama: string; kode?: string } | null;
  dosen_pengampu: Array<{
    id: number;
    nama: string;
    nidn?: string;
    is_koordinator?: boolean;
  }>;
  total_pertemuan: number;
  pertemuan_terisi: number;
  pertemuan_selesai: number;
  persentase_keaktifan: number;
  status_keaktifan: 'Sangat Aktif' | 'Cukup Aktif' | 'Perlu Perhatian' | 'Belum Ada Presensi' | string;
}
