// ============================================================
// SIPPM TYPES — Typescript Definitions for SIPPM Module
// (Sistem Informasi Penelitian dan Pengabdian Masyarakat)
// Standardized 1-to-1 matching with Laravel Backend Eloquent Models
// ============================================================

import type { PaginationMeta } from './api.types';

export type JenisKegiatan = 'penelitian' | 'pengabdian';
export type KategoriSkema = 'dasar' | 'terapan' | 'pengembangan';
export type StatusProposal = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'revision' 
  | 'approved' 
  | 'rejected' 
  | 'contracted'
  | 'completed'
  | 'disetujui_kaprodi'
  | 'disetujui_admin'
  | 'lolos';

export type PeranAnggota = 'ketua' | 'anggota_dosen' | 'anggota_mahasiswa' | 'mitra';
export type JenisTim = 'dosen' | 'tendik' | 'mahasiswa' | 'dosen_eksternal' | 'eksternal';
export type StatusReviewer = 'assigned' | 'in_review' | 'completed';
export type RekomendasiReviewer = 'terima' | 'revisi' | 'tolak';

export type StatusPencairan = 'pending' | 'verified' | 'disbursed' | 'rejected' | 'pengajuan';
export type JenisLaporan = 'kemajuan' | 'akhir';
export type StatusLaporan = 'draft' | 'submitted' | 'approved' | 'revision';

export type KategoriPublikasi = 'scopus' | 'wos' | 'sinta_1_2' | 'sinta_3_6' | 'international' | 'national_indexed';
export type KategoriHki = 'paten' | 'paten_sederhana' | 'hak_cipta' | 'merek' | 'desain_industri' | 'buku_ajar' | 'prototype';
export type StatusVerifikasiLuaran = 'pending' | 'verified' | 'rejected';

export interface RubrikIndikator {
  id: number;
  tipe_reviewer: 'kaprodi' | 'admin';
  nama_indikator: string;
  deskripsi?: string;
  bobot: number;
  skor_minimal_default: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRubrikPayload {
  tipe_reviewer: 'kaprodi' | 'admin';
  nama_indikator: string;
  deskripsi?: string;
  bobot: number;
  skor_minimal_default: number;
  is_active?: boolean;
}

// ------------------------------------------------------------
// Master Entities
// ------------------------------------------------------------

export interface PeriodeHibah {
  id: number;
  tahun_anggaran: string;
  nama_periode?: string;
  nama_gelombang?: string;
  tgl_buka?: string;
  tgl_tutup: string;
  tgl_tutup_review: string;
  total_anggaran: number;
  is_active: boolean;
  keterangan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SkemaKegiatan {
  id: number;
  nama_skema: string;
  kode_skema: string;
  jenis_kegiatan: JenisKegiatan;
  sumber_dana?: string;
  kategori_skema?: KategoriSkema;
  maksimal_dana: number;
  kuota_proposal?: number;
  persyaratan?: string;
  template_proposal_url?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  // Optional fallbacks
  nama?: string;
  kode?: string;
  tipe?: string;
  maksimal_anggaran?: number;
}

// ------------------------------------------------------------
// Proposal & Anggota
// ------------------------------------------------------------

export interface AnggotaKegiatan {
  id: number;
  proposal_id: number;
  jenis_tim: JenisTim;
  pegawai_id?: number;
  mahasiswa_id?: number;
  mata_kuliah_id?: number;
  nama_eksternal?: string;
  instansi_eksternal?: string;
  nidn_eksternal?: string;
  peran_dalam_tim?: string;
  tugas_kegiatan?: string;
  pegawai?: {
    id: number;
    nip: string;
    nama_lengkap: string;
  };
  created_at?: string;

  // Optional fallbacks
  nama?: string;
  tugas?: string;
  peran?: string;
}

export interface MataKuliahAktif {
  mata_kuliah_id: number;
  kode_mk: string;
  nama_mk: string;
  total_sks: number;
  nama_kelas?: string;
}

export interface ProposalKegiatan {
  id: number;
  periode_id: number;
  skema_id: number;
  ketua_pegawai_id: number;
  mitra_kerjasama_id?: number;
  mata_kuliah_id?: number;
  kode_proposal?: string;
  judul: string;
  abstrak: string;
  rumpun_ilmu: string;
  target_tkt?: number;
  anggaran_diajukan: number;
  anggaran_disetujui?: number;
  status: StatusProposal;
  file_proposal?: string;
  tgl_submission?: string;
  catatan_revisi?: string;

  // Convenient accessors/relations from Backend Eloquent
  periode?: PeriodeHibah;
  skema?: SkemaKegiatan;
  ketua?: {
    id: number;
    nip: string;
    nama_lengkap: string;
    program_studi?: string;
  };
  anggota?: AnggotaKegiatan[];
  reviewers?: ReviewerKegiatan[];
  kontrak?: KontrakKegiatan;
  created_at?: string;
  updated_at?: string;

  // Legacy field fallbacks for backward compatibility
  dana_diusulkan?: number;
  dana_disetujui?: number;
  periode_hibah_id?: number;
  skema_kegiatan_id?: number;
  dosen_ketua_id?: number;
}

// ------------------------------------------------------------
// Reviewer & Penilaian
// ------------------------------------------------------------

export interface PenilaianProposal {
  id: number;
  reviewer_kegiatan_id: number;
  skor_rekam_jejak: number;
  skor_substansi: number;
  skor_rab: number;
  total_skor: number;
  catatan_reviewer?: string;
  rekomendasi: RekomendasiReviewer;
  tgl_penilaian: string;
  created_at?: string;
}

export interface ReviewerKegiatan {
  id: number;
  proposal_id: number;
  reviewer_pegawai_id: number;
  status: StatusReviewer;
  tgl_assigned: string;
  proposal?: ProposalKegiatan;
  reviewer?: {
    id: number;
    nip: string;
    nama_lengkap: string;
  };
  penilaian?: PenilaianProposal;
  created_at?: string;
}

// ------------------------------------------------------------
// Kontrak & Keuangan / Monev
// ------------------------------------------------------------

export interface PencairanDanaHibah {
  id: number;
  kontrak_id: number;
  termin_ke: number; // 1 (70%), 2 (30%)
  persen_pencairan: number;
  nominal: number;
  status: StatusPencairan;
  status_termin?: string;
  catatan_keuangan?: string;
  catatan_verifikasi?: string;
  bukti_transfer?: string;
  created_at?: string;
}

export interface KontrakKegiatan {
  id: number;
  proposal_id: number;
  nomor_kontrak: string;
  dana_disetujui: number;
  tgl_mulai: string;
  tgl_selesai: string;
  file_kontrak?: string;
  file_spk_ttd?: string;
  status_spk?: string;
  status: string;
  is_signed?: boolean;
  proposal?: ProposalKegiatan;
  pencairan_dana?: PencairanDanaHibah[];
  laporan?: LaporanKegiatan[];
  created_at?: string;

  // Legacy fallback
  nominal_dana?: number;
}

export interface LaporanKegiatan {
  id: number;
  kontrak_id: number;
  jenis_laporan: JenisLaporan;
  persentase_capaian: number;
  ringkasan_progress: string;
  file_laporan?: string;
  file_logbook?: string;
  file_penggunaan_anggaran?: string;
  status_verifikasi?: StatusLaporan;
  catatan_reviewer?: string;
  created_at?: string;
}

// ------------------------------------------------------------
// Luaran (Publikasi & HKI)
// ------------------------------------------------------------

export interface PublikasiIlmiah {
  id: number;
  proposal_id?: number;
  pegawai_id: number;
  judul_artikel: string;
  nama_jurnal?: string;
  kategori_publikasi?: KategoriPublikasi;
  issn_isbn?: string;
  volume?: string;
  nomor?: string;
  tahun?: number;
  doi?: string;
  url_artikel?: string;
  status_verifikasi?: StatusVerifikasiLuaran;
  is_verified_lppm?: boolean;
  created_at?: string;

  // Optional fallbacks & API Sync Metadata
  nama_jurnal_prosiding?: string;
  jenis_publikasi?: string;
  indexing?: string;
  volume_issue_tahun?: string;
  doi_url?: string;
  scopus_eid?: string;
  sinta_article_id?: string;
  citation_count?: number;
  publisher?: string;
  synced_at?: string;
}

export interface HkiDanBuku {
  id: number;
  proposal_id?: number;
  pegawai_id: number;
  judul_hki?: string;
  kategori_hki?: KategoriHki;
  nomor_pendaftaran?: string;
  nomor_sertifikat?: string;
  tahun?: number;
  status_verifikasi?: StatusVerifikasiLuaran;
  is_verified_lppm?: boolean;
  created_at?: string;

  // Optional fallbacks
  judul?: string;
  jenis_luaran?: string;
  nomor_pencatatan_isbn?: string;
  tgl_terbit_catat?: string;
  penerbit_lembaga?: string;
}

// ------------------------------------------------------------
// Params & Payloads (Standardized 1-to-1 with Backend)
// ------------------------------------------------------------

export interface ProposalFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  periode_id?: number;
  skema_id?: number;
  ketua_pegawai_id?: number;
  jenis_kegiatan?: JenisKegiatan;
  status?: StatusProposal;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';

  // Optional fallbacks
  periode_hibah_id?: number;
  skema_kegiatan_id?: number;
}

export interface CreateProposalPayload {
  periode_id: number;
  skema_id: number;
  ketua_pegawai_id: number;
  mitra_kerjasama_id?: number;
  mata_kuliah_id?: number;
  judul: string;
  abstrak: string;
  rumpun_ilmu: string;
  target_tkt?: number;
  anggaran_diajukan: number;
  file_proposal?: string;
  anggota?: Array<{
    jenis_tim: JenisTim;
    pegawai_id?: number;
    mahasiswa_id?: number;
    mata_kuliah_id?: number;
    nama_eksternal?: string;
    instansi_eksternal?: string;
    nidn_eksternal?: string;
    peran_dalam_tim?: string;
    tugas_kegiatan?: string;
  }>;
}

export interface UpdateProposalPayload extends Partial<CreateProposalPayload> {}

export interface CreatePeriodePayload {
  tahun_anggaran: string;
  nama_periode: string;
  tgl_buka: string;
  tgl_tutup: string;
  tgl_tutup_review: string;
  total_anggaran: number;
  is_active?: boolean;
  keterangan?: string;
}

export interface CreateSkemaPayload {
  nama_skema: string;
  kode_skema: string;
  jenis_kegiatan: JenisKegiatan;
  kategori_skema: KategoriSkema;
  maksimal_dana: number;
  kuota_proposal?: number;
  persyaratan?: string;
  is_active?: boolean;
}

export interface AssignReviewerPayload {
  reviewer_pegawai_ids?: number[];
  reviewer_ids?: number[];
}

export interface SubmitPenilaianPayload {
  skor_rekam_jejak: number;
  skor_substansi: number;
  skor_rab: number;
  catatan_reviewer: string;
  rekomendasi: RekomendasiReviewer;
}

export interface FinalizeDecisionPayload {
  status: 'approved' | 'rejected' | 'revision';
  dana_disetujui?: number;
  catatan_revisi?: string;
}

export interface CreateKontrakPayload {
  nomor_kontrak: string;
  dana_disetujui: number;
  tgl_mulai: string;
  tgl_selesai: string;
  file_kontrak?: string;
}

export interface RequestPencairanPayload {
  termin_ke?: number;
  termin?: number;
  persen_pencairan?: number;
  nominal: number;
  catatan_keuangan?: string;
  file_lpj?: File;
}

export interface SubmitLaporanPayload {
  jenis_laporan: JenisLaporan;
  persentase_capaian: number;
  ringkasan_progress: string;
  file_laporan?: File;
}

export interface CreatePublikasiPayload {
  proposal_id?: number;
  judul_artikel: string;
  nama_jurnal: string;
  kategori_publikasi: KategoriPublikasi;
  issn_isbn?: string;
  volume?: string;
  nomor?: string;
  tahun: number;
  doi?: string;
}

export interface CreateHkiPayload {
  proposal_id?: number;
  judul_hki: string;
  kategori_hki: KategoriHki;
  nomor_pendaftaran?: string;
  nomor_sertifikat?: string;
  tahun: number;
}

export interface Iku5StandardProdi {
  id: string;
  unit_kerja_id?: number;
  nama_prodi: string;
  fakultas: string;
  target_scopus: number;
  target_sinta: number;
  target_dikti: number;
  target_internal: number;
  target_hki: number;
  min_capaian_iku: number;
  tahun_akademik: string;
}

export type StatusPengumuman = 'draft' | 'pending_scan' | 'published';

export interface JadwalItem {
  waktu?: string;
  kegiatan: string;
  tgl_mulai?: string;
  tgl_selesai?: string;
}

export interface PengumumanHibah {
  id: number;
  periode_id?: number;
  nomor_surat: string;
  tgl_surat: string;
  hal_surat: string;
  tahun_anggaran: string;
  tujuan_yth?: string;
  kualifikasi_dosen?: string;
  kategori_pendanaan: string;
  tgl_buka_proposal: string;
  tgl_tutup_proposal: string;
  nama_ketua_uppm: string;
  nik_ketua_uppm?: string;
  nama_direktur: string;
  nik_direktur?: string;
  file_draft_pdf_path?: string;
  file_signed_pdf_path?: string;
  file_template_mitra_indo_path?: string;
  file_template_mitra_intl_path?: string;
  status: StatusPengumuman;
  lampiran_jadwal?: JadwalItem[];
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePengumumanPayload {
  nomor_surat: string;
  tgl_surat: string;
  hal_surat?: string;
  tahun_anggaran: string;
  tgl_buka_proposal: string;
  tgl_tutup_proposal: string;
  nama_ketua_uppm: string;
  nama_direktur: string;
  kualifikasi_dosen?: string;
  kategori_pendanaan?: string;
  lampiran_jadwal?: JadwalItem[];
  lampiran_alokasi_waktu?: JadwalItem[];
}

export interface LogbookKegiatan {
  id: number;
  proposal_kegiatan_id: number;
  tanggal: string;
  uraian_kegiatan: string;
  persentase_capaian: number;
  anggaran_terpakai: number;
  file_bukti_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLogbookPayload {
  tanggal: string;
  uraian_kegiatan: string;
  persentase_capaian: number;
  anggaran_terpakai?: number;
  file_bukti?: File | string;
}

