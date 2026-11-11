export interface MasterTipeJalurAlur {
  id?: number;
  nama_tahap: string;
  urutan?: number;
}

export interface MasterTipeJalur {
  id: number;
  kode: string;
  nama: string;
  alur?: MasterTipeJalurAlur[];
  created_at?: string;
  updated_at?: string;
}

export interface JalurMasuk {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  ada_wawancara: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GelombangPenerimaan {
  id: number;
  jalur_masuk_id: number;
  nama: string;
  /** Periode tahunan berulang dengan format MM-DD, tanpa tahun. */
  tanggal_buka: string;
  tanggal_tutup: string;
  tanggal_pengumuman: string | null;
  kuota_total: number;
  kuota_terisi: number;
  biaya_pendaftaran: string | number;
  potongan_biaya_daftar_ulang: string | number;
  status: 'draft' | 'aktif' | 'ditutup' | 'selesai';
  pendaftaran_dibuka?: boolean;
  created_at: string;
  updated_at: string;
  jalur_masuk?: JalurMasuk;
}

export interface ProgramStudi {
  id: number;
  kode: string;
  nama: string;
  jenjang?: string;
  fakultas?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TahunAkademik {
  id: number;
  kode: string;
  nama: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BerkasRequirement {
  id: number;
  jalur_masuk_id: number;
  jenis_dokumen?: string;
  label?: string;
  wajib?: boolean;
  kode?: string;
  nama_dokumen?: string;
  deskripsi?: string | null;
  is_wajib?: boolean;
  urutan?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  jalur_masuk?: JalurMasuk;
}

export interface BerkasRequirementPayload {
  jalur_masuk_id: number;
  label?: string;
  wajib?: boolean;
  is_active?: boolean;
  jenis_dokumen?: string;
  urutan?: number;
  kode?: string;
  nama_dokumen?: string;
  deskripsi?: string;
  is_wajib?: boolean;
}

export type PendaftaranStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'lulus_administrasi'
  | 'gagal_administrasi';

export interface PendaftaranBerkasItem {
  id: number;
  pendaftaran_id: number;
  jenis_dokumen: string;
  file_path: string;
  is_verified: boolean;
  catatan?: string | null;
  created_at?: string;
}

export interface PendaftaranAlur {
  id: number;
  pendaftaran_id: number;
  master_tipe_jalur_alur_id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  catatan?: string | null;
  master_alur?: MasterTipeJalurAlur;
  created_at?: string;
  updated_at?: string;
}

export interface Pendaftaran {
  id: number;
  gelombang_id: number;
  user_id: number;
  program_studi_id: number;
  program_studi_pilihan2_id?: number | null;
  no_pendaftaran: string;
  nama_lengkap: string;
  nik: string;
  tanggal_lahir: string;
  tempat_lahir: string;
  jenis_kelamin: 'L' | 'P';
  agama?: string;
  kewarganegaraan?: string;
  no_hp?: string;
  alamat?: string;
  provinsi?: string;
  kota_kabupaten?: string;
  kecamatan?: string;
  kode_pos?: string;
  asal_sekolah?: string;
  jurusan_sekolah?: string;
  nilai_rata_rapor?: number;
  tahun_lulus?: string;
  npsn_sekolah?: string;
  nama_ayah?: string;
  pekerjaan_ayah?: string;
  nama_ibu?: string;
  pekerjaan_ibu?: string;
  penghasilan_ortu?: string;
  nama_wali?: string;
  telepon_wali?: string;
  used_referral_code?: string | null;
  referrer_user_id?: number | null;
  referral_validated_at?: string | null;
  referrer?: PendaftaranReferrer | null;
  status: PendaftaranStatus;
  catatan_verifikasi?: string | null;
  created_at?: string;
  updated_at?: string;
  gelombang_penerimaan?: GelombangPenerimaan;
  program_studi?: ProgramStudi;
  dokumen_pendaftaran?: PendaftaranBerkasItem[];
  konversi?: KonversiRecord | null;
  progress_alur?: PendaftaranAlur[];
}

export interface StatusHistoryItem {
  id: number;
  pendaftaran_id: number;
  status: string;
  status_lama?: string | null;
  status_baru?: string | null;
  catatan?: string | null;
  created_at: string;
  user?: {
    id: number;
    name?: string;
    username?: string;
  } | null;
}

export interface KonversiRecord {
  id: number;
  pendaftaran_id: number;
  nim?: string | null;
  status?: string;
  processed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  pendaftaran?: Pendaftaran;
}

export interface DaftarUlangInfo {
  pendaftaran_id: number;
  no_pendaftaran?: string;
  nama_lengkap?: string;
  status_daftar_ulang?: 'belum' | 'menunggu_pembayaran' | 'lunas' | string;
  tagihan?: {
    id?: number;
    nomor_tagihan?: string;
    total_bayar?: number;
    status?: string;
  } | null;
  virtual_account?: {
    bank_code?: string;
    va_number?: string;
  } | null;
  konversi?: KonversiRecord | null;
}

export interface StatistikSpmb {
  per_status?: { status: string; total: number }[];
  lulus_per_prodi?: { program_studi_diterima_id: number; nama_prodi?: string; total_lulus: number }[];
  antrian_verifikasi?: number;
  sla_verifikasi?: { id: number; no_pendaftaran: string; nama_lengkap: string; hari_menunggu: number; created_at?: string }[];
  pendaftar_per_hari?: { tanggal: string; total: number }[];
  kuota_prodi?: { program_studi_id: number; nama_prodi?: string; kuota_total: number; kuota_terisi: number }[];
  per_jalur?: { jalur_masuk_id: number; nama_jalur?: string; total: number }[];
  per_gelombang?: { gelombang_id: number; nama_gelombang?: string; total: number }[];
  per_prodi?: { program_studi_id: number; nama_prodi?: string; total: number }[];
}

export type StatusKelulusan = 'lulus' | 'tidak_lulus' | 'cadangan' | 'pending';

export interface PesertaLulusAdm {
  id: number;
  pendaftaran_id?: number;
  no_pendaftaran: string;
  nama_lengkap: string;
  gelombang_id: number;
}

export interface RankingResponse {
  ranking?: any[];
  data?: any[];
}

export interface HasilSeleksi {
  id: number;
  pendaftaran_id: number;
  status: StatusKelulusan;
  nilai_total?: number;
  catatan?: string;
  created_at?: string;
}

export interface Pengumuman {
  id: number;
  gelombang_id?: number | null;
  judul: string;
  konten: string;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KomponenBiayaRoleReward {
  id?: number;
  role_id: number;
  nominal: number;
  role?: { id: number; slug: string; name: string } | null;
}

export interface MasterKomponenBiaya {
  payment_gateway_config_id?: number | null;
  payment_gateway?: import('./spmb-payment.types').SpmbPaymentGateway | null;
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  tipe_potongan: boolean;
  is_referral_reward?: boolean;
  is_default_master_biaya?: boolean;
  role_rewards?: KomponenBiayaRoleReward[];
  urutan: number;
  is_active: boolean;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterBiayaItem {
  id?: number;
  master_biaya_id?: number;
  komponen_biaya_id: number;
  nominal: number;
  dibebankan_saat_pendaftaran?: boolean;
  berlaku_diskon?: boolean;
  keterangan?: string | null;
  komponen_biaya?: MasterKomponenBiaya;
}

export interface BiayaBebanItem {
  komponen_biaya_id: number;
  kode: string;
  nama: string;
  kategori?: string | null;
  nominal: number;
}

export interface BiayaPendaftaranInfo {
  beban_pendaftaran: BiayaBebanItem[];
  total_pendaftaran: number;
  beban_daftar_ulang: BiayaBebanItem[];
  total_daftar_ulang: number;
}

export interface MasterBiayaSpmb {
  id: number;
  master_tipe_jalur_id: number | null;
  program_studi_id: number;
  nomor_sk?: string | null;
  total_biaya: number;
  is_active: boolean;
  keterangan?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: MasterBiayaItem[];
  program_studi?: {
    id: number;
    kode_prodi?: string;
    nama: string;
    jenjang?: string;
  };
  master_tipe_jalur?: {
    id: number;
    kode: string;
    nama: string;
  };
  arsip_nomor_surat?: {
    id?: number;
    nomor_surat?: string;
    perihal?: string;
    status?: string;
    dokumen_url?: string | null;
  } | null;
}

export interface SpmbPotonganCalon {
  id: number;
  pendaftaran_id: number;
  komponen_biaya_id: number;
  nama_komponen?: string | null;
  nama_potongan: string;
  tipe_potongan: 'nominal' | 'persen';
  nilai_potongan: number | string;
  tahap: 'pendaftaran' | 'daftar_ulang' | 'keduanya';
  nomor_sk?: string | null;
  keterangan?: string | null;
  berlaku_mulai?: string | null;
  berlaku_sampai?: string | null;
  status: 'draft' | 'aktif' | 'dibatalkan';
  dibuat_oleh?: number | null;
  disetujui_oleh?: number | null;
  created_at?: string;
  updated_at?: string;
  komponen_biaya?: { id: number; kode?: string; nama: string };
  pembuat?: { id: number; name?: string; username?: string };
  arsip_nomor_surat?: {
    id: number;
    nomor_surat: string;
    perihal?: string;
    tanggal_surat?: string;
    status?: string;
    file_path?: string | null;
    dokumen_url?: string | null;
    has_dokumen?: boolean;
  } | null;
}

// ============================================================
// REFERRAL — Kode Rujukan Mahasiswa Baru
// ============================================================

export type ReferralUsageStatus = 'claimed' | 'qualified' | 'rewarded' | 'cancelled';

export interface PendaftaranReferrer {
  id: number;
  username?: string;
  name?: string;
  referral_code?: string;
}

export interface ReferralValidationResult {
  referral_code: string;
  referrer_user_id: number;
  referrer_name: string;
  is_valid: boolean;
}

export interface ReferralSummary {
  referral_code: string | null;
  total: number;
  claimed: number;
  qualified: number;
  rewarded: number;
  cancelled: number;
}

export interface ReferralUsageItem {
  id: number;
  referral_code: string;
  status: ReferralUsageStatus;
  qualified_at?: string | null;
  rewarded_at?: string | null;
  payout_id?: number | null;
  reward_nominal?: number;
  referee_name?: string | null;
  no_pendaftaran?: string | null;
  nama_pendaftar?: string | null;
  status_pendaftaran?: string | null;
  status_pembayaran?: string | null;
  gelombang?: string | null;
  created_at?: string;
}

export interface ReferralWithdrawable {
  referral_code: string | null;
  count: number;
  reward_per_referral: number;
  total_nominal: number;
}

export interface MyReferralData {
  summary: ReferralSummary;
  withdrawable?: ReferralWithdrawable;
  usages?: ReferralUsageItem[];
}

export interface ReferralPayoutResult {
  id: number;
  nomor_bukti: string;
  status?: string;
  referral_count: number;
  total_nominal: number;
  generated_at: string;
}

export interface ReferralUsagesResponse {
  status: string;
  message: string;
  data: ReferralUsageItem[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
  filters: {
    search: string | null;
    status: string | null;
    start_date: string | null;
    end_date: string | null;
    sort_by: string;
    sort_order: string;
  };
}

export interface ReferralReportItem extends ReferralUsageItem {
  referrer?: PendaftaranReferrer & { email?: string };
  pendaftaran?: {
    id: number;
    no_pendaftaran?: string;
    nama_lengkap?: string;
    status?: string;
    status_pembayaran?: string;
    gelombang_penerimaan?: { id: number; nama: string } | null;
  } | null;
}

export interface TemplateSuratSpmb {
  id: number;
  kode: string;
  nama: string;
  jenis_surat: string;
  hasil?: string | null;
  module_id?: number | null;
  klasifikasi_surat_id?: number | null;
  unit_surat_id?: number | null;
  jalur_masuk_id?: number | null;
  gelombang_id?: number | null;
  is_active: boolean;
  kop_nama_institusi?: string | null;
  kop_nama_sub?: string | null;
  kop_alamat_kontak?: string | null;
  /** @deprecated Arsip owns SK numbering; retained for legacy API records only. */
  format_nomor_surat?: string | null;
  judul_surat?: string | null;
  teks_pembuka?: string | null;
  teks_pernyataan?: string | null;
  teks_keputusan?: string | null;
  label_keputusan?: string | null;
  teks_prodi?: string | null;
  teks_penutup?: string | null;
  petunjuk_daftar_ulang?: string | null;
  judul_petunjuk?: string | null;
  kota_penetapan?: string | null;
  nama_penandatangan?: string | null;
  jabatan_penandatangan?: string | null;
  nip_penandatangan?: string | null;
  catatan_kaki?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  jalur_masuk?: JalurMasuk | null;
  gelombang?: GelombangPenerimaan | null;
  module?: { id: number; name: string; code: string } | null;
  klasifikasi_surat?: { id: number; kode: string; nama: string } | null;
  unit_surat?: { id: number; kode: string; nama: string } | null;
}

export interface TemplateSuratSpmbPayload {
  kode: string;
  nama: string;
  jenis_surat: string;
  hasil?: string | null;
  module_id?: number | null;
  klasifikasi_surat_id?: number | null;
  unit_surat_id?: number | null;
  jalur_masuk_id?: number | null;
  gelombang_id?: number | null;
  is_active?: boolean;
  kop_nama_institusi?: string | null;
  kop_nama_sub?: string | null;
  kop_alamat_kontak?: string | null;
  /** @deprecated Arsip owns SK numbering; retained for backwards compatibility. */
  format_nomor_surat?: string | null;
  judul_surat?: string | null;
  teks_pembuka?: string | null;
  teks_pernyataan?: string | null;
  teks_keputusan?: string | null;
  label_keputusan?: string | null;
  teks_prodi?: string | null;
  teks_penutup?: string | null;
  petunjuk_daftar_ulang?: string | null;
  judul_petunjuk?: string | null;
  kota_penetapan?: string | null;
  nama_penandatangan?: string | null;
  jabatan_penandatangan?: string | null;
  nip_penandatangan?: string | null;
  catatan_kaki?: string | null;
}

export interface GetTemplateSuratParams {
  page?: number;
  limit?: number;
  per_page?: number;
  search?: string;
  jenis_surat?: string;
  jalur_masuk_id?: number | string;
  gelombang_id?: number | string;
  is_active?: boolean | string;
  sort_by?: string;
  sort_dir?: string;
  sort_order?: string;
}

export const JENIS_SURAT_OPTIONS = [
  { value: 'sk_lulus', label: 'SK Tanda Lulus Seleksi' },
  { value: 'surat_pemberitahuan', label: 'Surat Pemberitahuan' },
] as const;

export const FILTER_STATUS_TEMPLATE_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Tidak Aktif' },
] as const;

export const SORT_BY_TEMPLATE_OPTIONS = [
  { value: 'kode', label: 'Kode Template' },
  { value: 'nama', label: 'Nama Template' },
  { value: 'is_active', label: 'Status Aktif' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
] as const;

export const SORT_DIR_OPTIONS = [
  { value: 'asc', label: 'Menaik (Asc)' },
  { value: 'desc', label: 'Menurun (Desc)' },
] as const;

export type SpmbKodeDiskonTipe = 'persen' | 'nominal';

export interface SpmbKodeDiskon {
  id: number;
  kode: string;
  nama: string;
  tipe_diskon: SpmbKodeDiskonTipe;
  nilai: number | string;
  maksimum_potongan: number | string | null;
  batas_penggunaan: number | null;
  penggunaan_count?: number;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SpmbKodeDiskonPayload {
  kode: string;
  nama: string;
  tipe_diskon: SpmbKodeDiskonTipe;
  nilai: number;
  maksimum_potongan: number | null;
  batas_penggunaan: number | null;
  berlaku_mulai: string | null;
  berlaku_sampai: string | null;
  is_active: boolean;
}

export interface SpmbKodeDiskonPreview {
  kode: string;
  subtotal_komponen: number;
  nominal_diskon: number;
  total_setelah_diskon: number;
  tipe_diskon: SpmbKodeDiskonTipe;
  nilai: number;
  already_applied: boolean;
}

