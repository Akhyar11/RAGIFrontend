// ============================================================
// SIMPEG TYPES — Types & Interfaces for Kepegawaian
// ============================================================

import type { User } from './auth.types';

export type TipeUnitKerja = 'rektorat' | 'fakultas' | 'prodi' | 'lp3m' | 'biro' | 'unit';
export type TipeJabatan = 'struktural' | 'fungsional' | 'teknis';
export type GolonganJafung = 'asisten_ahli' | 'lektor' | 'lektor_kepala' | 'guru_besar';
export type JenisPegawai = 'dosen' | 'tendik' | 'honorer';
export type StatusKepegawaian = 'pns' | 'non_pns' | 'kontrak' | 'tetap_yayasan';
export type StatusPegawai = 'aktif' | 'non_aktif' | 'pensiun' | 'meninggal';
export type JenjangPendidikan = 'sma' | 'd3' | 'd4' | 's1' | 's2' | 's3';

export interface UnitKerja {
  id: number;
  induk_id?: number | null;
  kode: string;
  nama: string;
  tipe: TipeUnitKerja;
  is_active: boolean;
  parent?: UnitKerja | null;
  children?: UnitKerja[];
  jabatan?: Jabatan[];
  pegawai?: Pegawai[];
  created_at?: string;
  updated_at?: string;
}

export interface Jabatan {
  id: number;
  unit_kerja_id?: number | null;
  nama: string;
  tipe: TipeJabatan;
  level_jabatan: number;
  is_active: boolean;
  unit_kerja?: UnitKerja | null;
  created_at?: string;
  updated_at?: string;
}

export interface JabatanFungsionalAkademik {
  id: number;
  nama: string;
  angka_kredit_min?: number | null;
  angka_kredit_max?: number | null;
  golongan: string;
  golongan_pangkat_id?: number | null;
  tunjangan_nominal?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterGolonganPangkat {
  id: number;
  kode: string;
  nama: string;
  pangkat?: string | null;
  ruang?: string | null;
  urutan: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Pegawai {
  id: number;
  user_id?: number | null;
  unit_kerja_id?: number | null;
  nip?: string | null;
  nidn?: string | null;
  nuptk?: string | null;
  nik?: string | null;
  gelar_depan?: string | null;
  gelar_belakang?: string | null;
  nama_gelar?: string | null;
  dosen?: {
    id: number;
    nidn?: string | null;
    nuptk?: string | null;
    gelar_depan?: string | null;
    gelar_belakang?: string | null;
    nama_gelar?: string | null;
    program_studi?: { id: number; nama: string; kode?: string; jenjang?: string; } | null;
  } | null;
  nama_lengkap: string;
  tanggal_lahir?: string | null;
  tempat_lahir?: string | null;
  jenis_kelamin: 'L' | 'P';
  agama?: string | null;
  jenis_pegawai?: string | null;
  roles?: { id: number; name: string; slug: string; description?: string }[];
  role_ids?: number[];
  status_kepegawaian: StatusKepegawaian;
  jabatan_terakhir?: string | null;
  sinta_id?: string | null;
  scopus_id?: string | null;
  google_scholar_id?: string | null;
  orcid_id?: string | null;
  tanggal_masuk?: string | null;
  tanggal_keluar?: string | null;
  status: StatusPegawai;
  alamat?: string | null;
  telepon?: string | null;
  nama_bank?: string | null;
  bank_nama?: string | null;
  nomor_rekening?: string | null;
  nama_rekening?: string | null;
  user?: User | null;
  unit_kerja?: UnitKerja | null;
  jabatan_fungsional_id?: number | null;
  jabatan_fungsional?: JabatanFungsionalAkademik | null;
  shift_template_id?: number | null;
  office_location_id?: number | null;
  shift_template?: { id: number; name: string; start_time?: string; end_time?: string } | null;
  terdampak_absensi?: boolean;
  office_location?: { id: number; name: string; radius_meters?: number } | null;
  is_face_enrolled?: boolean;
  face_enrolled_at?: string | null;
  consent_pdp_at?: string | null;
  riwayat_jabatan?: RiwayatJabatan[];
  riwayat_pendidikan?: RiwayatPendidikanPegawai[];
  created_at?: string;
  updated_at?: string;
}

export interface RiwayatJabatan {
  id: number;
  pegawai_id: number;
  jabatan_id?: number | null;
  jabatan_fungsional_id?: number | null;
  mulai_jabatan?: string | null;
  selesai_jabatan?: string | null;
  sk_nomor?: string | null;
  sk_tanggal?: string | null;
  file_sk?: string | null;
  is_active: boolean;
  jabatan?: Jabatan | null;
  jabatan_fungsional?: JabatanFungsionalAkademik | null;
  created_at?: string;
  updated_at?: string;
}

export interface RiwayatPendidikanPegawai {
  id: number;
  pegawai_id: number;
  jenjang: string;
  nama_institusi: string;
  program_studi?: string | null;
  bidang_ilmu?: string | null;
  gelar_akademik?: string | null;
  singkatan_gelar?: string | null;
  tahun_masuk?: number | null;
  tahun_lulus?: number | null;
  nomor_ijazah?: string | null;
  file_ijazah?: string | null;
  is_pendidikan_terakhir: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PegawaiFilterParams {
  search?: string;
  unit_kerja_id?: number;
  role_id?: number | string;
  jenis_pegawai?: string;
  status?: StatusPegawai;
  shift_template_id?: number;
  page?: number;
  per_page?: number;
  limit?: number;
}

// ============================================================
// ENTERPRISE SIMPEG TYPES
// ============================================================

export type JenisDokumenPegawai = 'ktp' | 'kk' | 'ijazah' | 'sk' | 'serdos' | 'sertifikat' | 'lainnya';
export type StatusVerifikasiDokumen = 'pending' | 'terverifikasi' | 'ditolak';

export interface DokumenPegawai {
  id: number;
  pegawai_id: number;
  nama_dokumen: string;
  jenis_dokumen: JenisDokumenPegawai;
  file_path: string;
  file_size?: string | null;
  status_verifikasi: StatusVerifikasiDokumen;
  catatan_verifikasi?: string | null;
  pegawai?: Pegawai | null;
  created_at?: string;
  updated_at?: string;
}

export type TipeDurasiCuti = 'ditetapkan' | 'fleksibel';

export interface MasterJenisCuti {
  id: number;
  nama: string;
  kode?: string | null;
  tipe_durasi: TipeDurasiCuti;
  durasi_hari: number;
  satuan: string;
  lampiran_wajib: boolean;
  keterangan?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type JenisCuti = 'tahunan' | 'sakit' | 'melahirkan' | 'alasan_penting' | 'besar' | string;
export type StatusApprovalCuti = 'pending' | 'approved' | 'rejected';

export interface PengajuanCuti {
  id: number;
  pegawai_id: number;
  master_jenis_cuti_id?: number | null;
  jenis_cuti?: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jumlah_hari: number;
  alasan: string;
  status_approval: StatusApprovalCuti;
  approved_by?: number | null;
  catatan_approval?: string | null;
  file_pendukung?: string | null;
  file_pendukung_url?: string | null;
  pegawai?: Pegawai | null;
  master_jenis_cuti?: MasterJenisCuti | null;
  approver?: User | null;
  created_at?: string;
  updated_at?: string;
}

export type StatusKehadiran = 'hadir' | 'izin' | 'sakit' | 'alfa' | 'dinas';

export interface PresensiPegawai {
  id: number;
  pegawai_id: number;
  tanggal: string;
  jam_masuk?: string | null;
  jam_keluar?: string | null;
  status_kehadiran: StatusKehadiran;
  lat_long?: string | null;
  foto_presensi?: string | null;
  catatan?: string | null;
  pegawai?: Pegawai | null;
  created_at?: string;
  updated_at?: string;
}

export type StatusPresensiPengajaran = 'terisi' | 'belum_diisi' | 'belum_terlaksana' | 'tanpa_peserta';

export interface PresensiPengajaranPertemuan {
  id: number;
  pertemuan_ke: number;
  tanggal: string;
  status_pertemuan: string;
  total_absensi: number;
  total_mahasiswa: number;
  status_presensi: StatusPresensiPengajaran;
}

export interface PresensiPengajaranKelas {
  kelas_id: number;
  kode_kelas: string;
  nama_kelas: string;
  mata_kuliah: string | null;
  total_mahasiswa: number;
  pertemuans: PresensiPengajaranPertemuan[];
}

export interface PresensiPengajaranRow {
  dosen_id: number;
  user_id: number | null;
  nama_dosen: string;
  nidn: string | null;
  kelas: PresensiPengajaranKelas[];
  total_pertemuan: number;
  pertemuan_terlaksana: number;
  presensi_terisi: number;
  presensi_belum_diisi: number;
  status_pemenuhan: 'lengkap' | 'perlu_dilengkapi';
}

export interface PresensiPengajaranCutoff {
  periode: string;
  cutoff_at: string | null;
  is_closed: boolean;
}

export interface PresensiPengajaranException {
  id: number;
  dosen_id: number;
  periode: string;
  valid_until: string;
  reason: string;
  granted_by: number | null;
  revoked_at: string | null;
  revoked_by: number | null;
  revocation_reason: string | null;
  is_active: boolean;
  dosen?: { id: number; nama_lengkap: string; nidn: string | null; user_id: number | null } | null;
  grantor?: { id: number; name: string } | null;
  revoker?: { id: number; name: string } | null;
}

export type StatusTransferGaji = 'draft' | 'submitted_to_sikeu' | 'paid' | 'cancelled';

export interface GajiPegawai {
  id: number;
  pegawai_id: number;
  periode_bulan_tahun: string;
  gaji_pokok: number;
  tunjangan_tetap?: number;
  total_biaya_transport?: number;
  jumlah_hari_hadir_tepat_waktu?: number;
  total_tunjangan: number;
  total_potongan: number;
  total_honor_sks?: number;
  total_sks_diampu?: number;
  total_tunjangan_fungsional?: number;
  total_pph21?: number;
  total_bpjs?: number;
  jurnal_id?: number | null;
  pengeluaran_kampus_id?: number | null;
  details?: GajiDetail[];
  gaji_bersih: number;
  status_transfer: StatusTransferGaji;
  tanggal_transfer?: string | null;
  submitted_at?: string | null;
  nomor_rekening?: string | null;
  bank_nama?: string | null;
  catatan?: string | null;
  pegawai?: Pegawai | null;
  created_at?: string;
  updated_at?: string;
}

export type StatusUsulanJafung = 'draft' | 'submitted' | 'diverifikasi' | 'disetujui' | 'ditolak';

export interface UsulanJafung {
  id: number;
  pegawai_id: number;
  jafung_asal_id?: number | null;
  jafung_tujuan_id: number;
  nomor_sk?: string | null;
  tanggal_mulai_berlaku?: string | null;
  tanggal_selesai_berlaku?: string | null;
  angka_kredit_usulan: number;
  status_usulan: StatusUsulanJafung;
  file_sk_hasil?: string | null;
  file_sk_hasil_url?: string | null;
  catatan_reviewer?: string | null;
  pegawai?: Pegawai | null;
  jafung_asal?: JabatanFungsionalAkademik | null;
  jafung_tujuan?: JabatanFungsionalAkademik | null;
  created_at?: string;
  updated_at?: string;
}

export type SemesterKinerja = 'ganjil' | 'genap' | 'tahunan';
export type PredikatKinerja = 'sangat_baik' | 'baik' | 'cukup' | 'kurang' | 'sangat_kurang';
export type StatusSkp = 'draft' | 'diajukan' | 'disetujui' | 'dinilai';

export interface MasterKategoriSkp {
  id: number;
  nama: string;
  kode: string;
  deskripsi?: string | null;
  urutan: number;
  is_active: boolean;
}

export interface SkpItem {
  id: number;
  penilaian_kinerja_id: number;
  kategori_skp_id: number;
  uraian_tugas: string;
  target_output: string;
  target_mutu: number;
  target_waktu: string;
  target_biaya?: number | null;
  realisasi_output?: string | null;
  realisasi_mutu?: number | null;
  realisasi_waktu?: string | null;
  realisasi_biaya?: number | null;
  nilai_capaian?: number | null;
  berkas_bukti?: string | null;
  keterangan?: string | null;
  kategori?: MasterKategoriSkp;
  created_at?: string;
  updated_at?: string;
}

export interface PenilaianKinerja {
  id: number;
  pegawai_id: number;
  tahun: number;
  semester: SemesterKinerja;
  status: StatusSkp;
  pejabat_penilai_id?: number | null;
  tanggal_pengajuan?: string | null;
  tanggal_persetujuan?: string | null;
  nilai_skp: number;
  nilai_bkd?: number | null;
  predikat: PredikatKinerja;
  catatan_evaluator?: string | null;
  evaluator_id?: number | null;
  evaluated_at?: string | null;
  pegawai?: Pegawai | null;
  pejabat_penilai?: Pegawai | null;
  evaluator?: User | null;
  items?: SkpItem[];
  created_at?: string;
  updated_at?: string;
}


// ── PAYROLL FLEKSIBEL & KOMPONEN GAJI ──
export type JenisKomponenGaji = 'pendapatan' | 'potongan';
export type TipeNilaiKomponen = 'tetap' | 'rumus_sks' | 'rumus_kehadiran' | 'rumus_pph21' | 'persentase';

export interface MasterKomponenGaji {
  id: number;
  kode: string;
  nama: string;
  jenis: JenisKomponenGaji;
  tipe_nilai: TipeNilaiKomponen;
  nilai_default: number;
  is_taxable: boolean;
  is_active: boolean;
  is_kolom_aktif?: boolean;
  urutan: number;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterSkalaGajiPokok {
  id: number;
  nama_skala: string;
  golongan?: string | null;
  masa_kerja_min_tahun: number;
  masa_kerja_max_tahun: number;
  nominal_gaji: number;
  keterangan?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MasterBracketPph21 {
  id: number;
  kategori: string;
  penghasilan_bruto_min: number;
  penghasilan_bruto_max?: number | null;
  tarif_persen: number;
  keterangan?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PegawaiKomponenGaji {
  id?: number;
  pegawai_id?: number;
  komponen_gaji_id: number;
  kode?: string;
  nama?: string;
  jenis?: JenisKomponenGaji;
  tipe_nilai?: TipeNilaiKomponen;
  nilai_default?: number;
  nominal_kustom?: number | null;
  is_active: boolean;
  catatan?: string | null;
}

export interface GajiDetail {
  id: number;
  gaji_pegawai_id: number;
  komponen_gaji_id?: number | null;
  nama_komponen: string;
  jenis: JenisKomponenGaji;
  nominal: number;
  keterangan?: string | null;
  komponen?: MasterKomponenGaji | null;
  created_at?: string;
}

// ── MESIN FINGERPRINT, SHIFT KAMPUS & OTOMASI PRESENSI ──
export interface FingerprintDevice {
  id: number;
  device_name: string;
  device_code: string;
  ip_address: string;
  port: number;
  location?: string | null;
  office_location_id?: number | null;
  office_location?: { id: number; name: string } | null;
  device_model?: string | null;
  is_active: boolean;
  last_sync_at?: string | null;
  last_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FingerprintSyncLogItem {
  pin?: string;
  nip?: string;
  pegawai_id?: number;
  timestamp: string;
  verify_mode?: number;
  in_out_mode?: number | string;
}

export interface FingerprintSyncPayload {
  device_id?: string;
  device_code?: string;
  device_ip?: string;
  logs: FingerprintSyncLogItem[];
}

export interface BulkAssignShiftPayload {
  shift_template_id: number;
  unit_kerja_id?: number;
  jenis_pegawai?: 'dosen' | 'tendik';
  pegawai_ids?: number[];
}

export interface CutoffReport {
  date: string;
  is_national_holiday: boolean;
  total_evaluated: number;
  total_marked_alfa: number;
  marked_alfa_employees: Array<{
    pegawai_id: number;
    nip: string;
    nama: string;
    unit_kerja?: string;
    shift?: string;
    scheduled_start?: string;
  }>;
}

// ── RIWAYAT & REKAP PRESENSI BULANAN (kontrak BACKEND_FIX_CLOCKOUT_DAN_RIWAYAT §3) ──

/** Satu baris riwayat presensi (`GET /api/simpeg/presensi?month&year`). */
export interface AttendanceHistoryItem {
  id: number;
  pegawai_id: number;
  tanggal: string;
  clock_in?: string | null;
  clock_out?: string | null;
  jam_masuk?: string | null;
  jam_keluar?: string | null;
  status: string;
  status_kehadiran?: string;
  late_minutes?: number;
  early_leave_minutes?: number;
  rejection_reason?: string | null;
  notes?: string | null;
  clock_in_distance_meters?: number | null;
  clock_in_face_score?: number | null;
  clock_out_face_score?: number | null;
  employee?: Pegawai | null;
  office_location?: { id: number; name: string } | null;
}

/** Satu baris rekap sebulan (`GET /api/simpeg/presensi/recap?start_date&end_date`). */
export interface AttendanceRecapRow {
  date: string;
  tanggal: string;
  day_name: string;
  scan_masuk: string;
  terlambat: string;
  scan_pulang: string;
  keterangan: string;
  status_badge: string;
}

export interface AttendanceRecapData {
  employee: {
    id: number;
    employee_code?: string;
    name?: string;
    department?: string | null;
    position?: string | null;
    shift_name?: string | null;
  };
  filter: { start_date: string; end_date: string };
  summary: {
    total_days: number;
    total_hadir: number;
    total_terlambat: number;
    total_alpa: number;
    total_libur: number;
    total_izin?: number;
    total_sakit?: number;
    total_dinas?: number;
    total_cuti?: number;
  };
  rows: AttendanceRecapRow[];
}

export interface AttendanceRecapParams {
  pegawai_id?: number;
  start_date?: string;
  end_date?: string;
  month?: number;
  year?: number;
}

// ── MASTER DATA KOMPETENSI, IZIN JAM KERJA & KATEGORI SK ──
export interface MasterJenisSertifikasi {
  id: number;
  nama: string;
  kode: string;
  deskripsi?: string | null;
  is_active: boolean;
  sertifikasi_dosen_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterJenisTes {
  id: number;
  nama: string;
  kode: string;
  kategori: 'bahasa' | 'potensi_akademik';
  skor_min: number;
  skor_max: number;
  deskripsi?: string | null;
  is_active: boolean;
  riwayat_tes_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterJenisPelatihan {
  id: number;
  nama: string;
  deskripsi?: string | null;
  is_active: boolean;
  riwayat_pelatihan_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterPeranPelatihan {
  id: number;
  nama: string;
  deskripsi?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MasterTingkatKegiatan {
  id: number;
  nama: string;
  deskripsi?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MasterJenisIzinJamKerja {
  id: number;
  nama: string;
  kode: string;
  tipe_potongan: 'tidak_potong' | 'potong_jam';
  deskripsi?: string | null;
  urutan: number;
  is_active: boolean;
  izin_jam_kerja_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterKategoriSk {
  id: number;
  nama: string;
  kode: string;
  deskripsi?: string | null;
  urutan: number;
  is_active: boolean;
  sk_pegawai_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TandaTanganPegawai {
  id: number;
  user_id: number;
  pegawai_id?: number | null;
  file_path: string;
  tipe: string;
  judul: string;
  qr_token?: string | null;
  is_active: boolean;
  file_url?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    username?: string;
  };
  pegawai?: {
    id: number;
    user_id: number;
    nip?: string;
    nidn?: string;
    nama_lengkap: string;
  };
}

export interface TandaTanganFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  user_id?: number;
  pegawai_id?: number;
  is_active?: boolean | string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SuratPeringatan {
  id: number;
  pegawai_id: number;
  gaji_pegawai_id?: number | null;
  presensi_periode_id?: number | null;
  nomor_sp: string;
  jenis_sp: string;
  judul: string;
  periode_bulan_tahun: string;
  total_terlambat: number;
  batas_maksimal: number;
  keterangan?: string | null;
  tanggal_terbit: string;
  status: 'aktif' | 'selesai' | 'diarsipkan' | string;
  created_at?: string;
  updated_at?: string;
  pegawai?: Pegawai;
  presensi_periode?: unknown;
  gaji_pegawai?: unknown;
}

export interface AnnualSpMonitoringMonth {
  month: number;
  month_code: string;
  month_name: string;
  periode: string;
  has_data: boolean;
  is_future: boolean;
  total_terlambat: number;
  batas_maksimal: number;
  has_sp: boolean;
  sp_id?: number | null;
  nomor_sp?: string | null;
  jenis_sp?: string | null;
  judul_sp?: string | null;
  status_sp?: string | null;
  status_color: 'danger' | 'warning' | 'success' | 'neutral';
}

export interface AnnualSpMonitoringRow {
  pegawai_id: number;
  nip: string;
  nama_lengkap: string;
  unit_kerja: string;
  months: Record<string, AnnualSpMonitoringMonth>;
  summary: {
    total_sp: number;
    total_terlambat: number;
    risk_level: 'disiplin' | 'perhatian' | 'rawan' | 'waspada';
    risk_label: string;
  };
}

export interface AnnualSpMonitoringMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  tahun: number;
  max_late_per_month: number;
  stats: {
    total_pegawai: number;
    pegawai_pernah_sp: number;
    total_sp_terbit: number;
  };
}

// -------------------------------------------------------------
// ANALYTICS DASHBOARD SIMPEG TYPES
// -------------------------------------------------------------

export interface MonthlyAttendanceItem {
  month_code: string;
  month_name: string;
  tepat_waktu: number;
  terlambat: number;
  izin_sakit_cuti: number;
  alfa: number;
  total_kehadiran: number;
}

export interface MonthlySpItem {
  month_code: string;
  month_name: string;
  sp_1: number;
  sp_2: number;
  sp_3: number;
  total_sp: number;
}

export interface UnitKerjaDisciplineItem {
  unit_kerja_id: number;
  unit_kerja_nama: string;
  total_presensi: number;
  total_tepat_waktu: number;
  total_terlambat: number;
  persentase_disiplin: number;
}

export interface PresensiAnalyticsData {
  tahun: number;
  summary: {
    total_kehadiran: number;
    total_tepat_waktu: number;
    total_terlambat: number;
    total_sp: number;
    tingkat_disiplin_persen: number;
  };
  monthly_attendance: MonthlyAttendanceItem[];
  monthly_sp: MonthlySpItem[];
  top_unit_kerja: {
    disiplin: UnitKerjaDisciplineItem[];
    rawan: UnitKerjaDisciplineItem[];
  };
}

export interface JadPyramidItem {
  level: string;
  label: string;
  order: number;
  count: number;
  percentage: number;
  color: string;
}

export interface SerdosRatioData {
  total_dosen: number;
  tersertifikasi: number;
  belum_tersertifikasi: number;
  persentase: number;
}

export interface AgeDistributionItem {
  group: string;
  label: string;
  sublabel: string;
  count: number;
  percentage: number;
  color: string;
  is_mpp: boolean;
}

export interface DemografiAnalyticsData {
  jad_pyramid: JadPyramidItem[];
  serdos_ratio: SerdosRatioData;
  age_distribution: AgeDistributionItem[];
  summary: {
    total_dosen: number;
    total_pegawai_terdata: number;
    persentase_dosen_ber_jad: number;
    total_mpp_pensiun: number;
  };
}
// ── ANALITIK PEGAWAI & JAD ──────────────────────────────────
export interface AnalitikPegawaiItem {
  id: number;
  nama_lengkap: string;
  nama_gelar?: string | null;
  nip?: string | null;
  nidn?: string | null;
  jenis_pegawai: string;
  status_kepegawaian?: string | null;
  status_aktif?: string | null;
  is_active: boolean;
  unit_kerja?: {
    id: number;
    nama: string;
    kode: string;
    tipe?: string;
  } | null;
  jabatan_fungsional?: {
    id: number;
    nama: string;
    angka_kredit?: number | null;
  } | null;
  jad_aktif?: {
    tmt?: string | null;
    sk_nomor?: string | null;
    sk_tanggal?: string | null;
    file_sk_url?: string | null;
  };
  is_serdos: boolean;
  nomor_serdos?: string | null;
}

export interface AnalitikRingkasanData {
  total_pegawai: number;
  total_dosen: number;
  total_tendik: number;
  kategori_jad: {
    tenaga_pengajar: number;
    asisten_ahli: number;
    lektor: number;
    lektor_kepala: number;
    guru_besar: number;
    belum_ada: number;
  };
  jad_detail: Array<{
    id: number;
    nama: string;
    angka_kredit: number;
    total: number;
  }>;
  unit_kerja_distribusi: Array<{
    id: number;
    nama: string;
    kode: string;
    tipe?: string;
    total: number;
  }>;
  serdos: {
    sudah_serdos: number;
    belum_serdos: number;
  };
  periode_tmt: {
    start?: string | null;
    end?: string | null;
  };
}

export interface AnalitikFilterParams {
  search?: string;
  tmt_start?: string;
  tmt_end?: string;
  jabatan_fungsional_id?: string | number;
  unit_kerja_id?: string | number;
  status_kepegawaian?: string;
  jenis_pegawai?: string;
  is_serdos?: string | boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  per_page?: number;
}
