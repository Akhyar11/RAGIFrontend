// ============================================================
// SINAPRA TYPES — Sarana, Prasarana, & Aset Management
// ============================================================

import type { PaginationParams } from './api.types';

// ------------------------------------------------------------
// 1. Gedung & Ruangan Types
// ------------------------------------------------------------
export interface Gedung {
  id: number;
  kode: string;
  nama: string;
  jumlah_lantai: number;
  alamat?: string;
  tahun_bangun?: number;
  luas_m2?: number;
  status: 'aktif' | 'renovasi' | 'nonaktif';
  ruangan_count?: number;
  ruangan?: Ruangan[];
  created_at?: string;
  updated_at?: string;
}

export interface GedungFormPayload {
  kode: string;
  nama: string;
  jumlah_lantai: number;
  alamat?: string;
  tahun_bangun?: number;
  luas_m2?: number;
  status?: 'aktif' | 'renovasi' | 'nonaktif';
}

export interface MasterTipeRuangan {
  id: number;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  is_active: boolean;
  urutan: number;
  created_at?: string;
  updated_at?: string;
  ruangan_count?: number;
}

export interface MasterSatuan {
  id: number;
  kode: string;
  nama: string;
  keterangan?: string | null;
  is_active: boolean;
  urutan: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterVendor {
  id: number;
  kode: string;
  nama: string;
  jenis_rekanan: string;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  pic_nama?: string | null;
  pic_kontak?: string | null;
  nomor_npwp?: string | null;
  is_active: boolean;
  urutan: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterVendorFormPayload {
  kode: string;
  nama: string;
  jenis_rekanan?: string;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  pic_nama?: string | null;
  pic_kontak?: string | null;
  nomor_npwp?: string | null;
  is_active?: boolean;
  urutan?: number;
}

export interface MasterKategoriBhp {
  id: number;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  is_active: boolean;
  urutan: number;
  created_at?: string;
  updated_at?: string;
  bhp_count?: number;
}

export interface MasterKategoriBhpFormPayload {
  kode: string;
  nama: string;
  deskripsi?: string | null;
  is_active?: boolean;
  urutan?: number;
}

export interface Ruangan {
  id: number;
  gedung_id: number;
  tipe_ruangan_id?: number | null;
  program_studi_id?: number | null;
  kode: string;
  nama: string;
  lantai: number;
  tipe?: 'kelas' | 'laboratorium' | 'kantor' | 'aula' | 'gudang' | 'lainnya';
  kapasitas: number;
  luas_m2?: number;
  ada_ac: boolean;
  ada_proyektor: boolean;
  ada_wifi: boolean;
  jumlah_ac?: number;
  jumlah_proyektor?: number;
  jumlah_wifi?: number;
  keterangan?: string;
  status: 'aktif' | 'maintenance' | 'nonaktif';
  gedung?: Gedung;
  tipe_ruangan?: MasterTipeRuangan | null;
  program_studi?: {
    id: number;
    nama: string;
    kode_prodi: string;
    jenjang?: string;
  } | null;
  laboran?: { id: number; name: string; username?: string; email: string; pivot?: { ruangan_id: number; user_id: number; is_primary: boolean } }[];
  created_at?: string;
  updated_at?: string;
}

export interface LaboranRuangan {
  id: number;
  ruangan_id: number;
  user_id: number;
  is_primary: boolean;
  user?: { id: number; name: string; email: string; username?: string };
  ruangan?: Ruangan;
  created_at?: string;
  updated_at?: string;
}

export interface LaboranProdi {
  id: number;
  user_id: number;
  program_studi_id: number;
  is_primary: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    username?: string;
    pegawai?: { id: number; nama_lengkap: string; nip?: string };
  };
  program_studi?: {
    id: number;
    nama: string;
    kode_prodi: string;
    jenjang?: string;
    fakultas?: { id: number; nama: string };
  };
  created_at?: string;
  updated_at?: string;
}

export interface AssignLaboranPayload {
  user_id: number;
  is_primary?: boolean;
}

export interface AssignLaboranProdiPayload {
  user_id: number;
  program_studi_id: number;
  is_primary?: boolean;
}

export interface RuanganFormPayload {
  gedung_id: number;
  tipe_ruangan_id?: number | null;
  program_studi_id?: number | null;
  kode: string;
  nama: string;
  lantai: number;
  tipe?: 'kelas' | 'laboratorium' | 'kantor' | 'aula' | 'gudang' | 'lainnya';
  kapasitas: number;
  luas_m2?: number;
  ada_ac?: boolean;
  ada_proyektor?: boolean;
  ada_wifi?: boolean;
  jumlah_ac?: number;
  jumlah_proyektor?: number;
  jumlah_wifi?: number;
  keterangan?: string;
  status?: 'aktif' | 'maintenance' | 'nonaktif';
}

export interface CheckKetersediaanPayload {
  ruangan_id: number;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
}

export interface CheckKetersediaanResponse {
  is_available: boolean;
  bentrok_peminjaman?: any;
}

// ------------------------------------------------------------
// 2. Kategori Aset & Inventaris Aset Types
// ------------------------------------------------------------
export interface KategoriAset {
  id: number;
  parent_id?: number;
  kode: string;
  nama: string;
  deskripsi?: string;
  masa_manfaat_tahun?: number;
  tarif_penyusutan_persen?: number;
  children?: KategoriAset[];
  parent?: KategoriAset;
  created_at?: string;
  updated_at?: string;
}

export interface KategoriAsetFormPayload {
  parent_id?: number | null;
  kode: string;
  nama: string;
  deskripsi?: string;
  masa_manfaat_tahun?: number;
  tarif_penyusutan_persen?: number;
}

export interface Aset {
  id: number;
  kategori_id: number;
  ruangan_id?: number;
  program_studi_id?: number | null;
  kode_aset: string;
  nama: string;
  merk?: string;
  nomor_seri?: string;
  spesifikasi?: string;
  tanggal_perolehan?: string;
  harga_perolehan: number;
  nilai_buku: number;
  kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat';
  status: 'tersedia' | 'dipinjam' | 'maintenance' | 'disetujui_diapkir';
  is_borrowable?: boolean;
  is_lab_asset?: boolean;
  keterangan?: string;
  penanggung_jawab_pegawai_id?: number | null;
  penanggung_jawab?: {
    id: number;
    nama_lengkap: string;
    nip?: string;
    unit_kerja?: { nama: string };
  } | null;
  program_studi?: {
    id: number;
    nama: string;
    kode_prodi: string;
    jenjang?: string;
  } | null;
  kategori?: KategoriAset;
  ruangan?: Ruangan;
  riwayat_penyusutan?: RiwayatPenyusutanAset[];
  created_at?: string;
  updated_at?: string;
}

export interface RiwayatPenyusutanAset {
  id: number;
  aset_id: number;
  periode_tahun?: number;
  tahun?: number;
  nilai_perolehan?: number;
  persentase_penyusutan?: number;
  beban_penyusutan?: number;
  nominal_penyusutan?: number;
  nilai_buku_setelah?: number;
  nilai_buku_sesudah?: number;
  tanggal_posting?: string;
  jurnal_umum_id?: number | null;
  sikeu_jurnal_id?: number | null;
  diposting_oleh?: number | null;
  posted_by?: number | null;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
  poster?: {
    id: number;
    name: string;
    username?: string;
  };
  jurnal_umum?: {
    id: number;
    nomor_jurnal: string;
    tanggal_jurnal: string;
    total_debet: number;
    total_kredit: number;
    status_posting: string;
  };
  jurnal?: {
    id: number;
    nomor_jurnal: string;
    tanggal_jurnal: string;
    total_debet: number;
    total_kredit: number;
    status_posting: string;
  };
}

export interface PreviewNomorInventarisData {
  nomor_urut_mulai: number;
  nomor_urut_selesai: number;
  jumlah: number;
  kode_ruangan: string;
  kode_kategori: string;
  default_institusi: string;
  tahun: number;
  preview_nomor: string;
  preview_rentang: string;
  formula: string;
}

export interface AsetFormPayload {
  mode?: 'satuan' | 'bulk';
  jumlah_barang?: number;
  nomor_urut?: number;
  kategori_id: number;
  ruangan_id?: number | null;
  program_studi_id?: number | null;
  penanggung_jawab_pegawai_id?: number | null;
  kode_aset?: string;
  nama: string;
  merk?: string;
  nomor_seri?: string;
  spesifikasi?: string;
  tanggal_perolehan?: string;
  harga_perolehan: number;
  kondisi?: 'baik' | 'rusak_ringan' | 'rusak_berat';
  status?: 'tersedia' | 'dipinjam' | 'maintenance' | 'disetujui_diapkir';
  is_borrowable?: boolean;
  is_lab_asset?: boolean;
  keterangan?: string;
}

export interface AsetLabelData {
  id: number;
  kode_aset: string;
  nama: string;
  merk?: string | null;
  model?: string | null;
  serial_number?: string | null;
  kategori?: string | null;
  ruangan_id?: number | null;
  lokasi_ruangan?: string | null;
  lokasi_gedung?: string | null;
  tanggal_perolehan?: string | null;
  kondisi?: string;
  status?: string;
  qr_content?: string;
  qr_code_svg?: string;
  instansi?: string;
}

export interface PenyusutanAsetResult {
  aset_id: number;
  kode_aset: string;
  nama: string;
  harga_perolehan: number;
  nilai_buku_saat_ini: number;
}

// ------------------------------------------------------------
// 3. Peminjaman Ruangan & Aset Types
// ------------------------------------------------------------
export interface PeminjamanRuangan {
  id: number;
  ruangan_id: number;
  user_id: number;
  disetujui_oleh?: number;
  keperluan: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  status: 'pending' | 'pending_laboran' | 'pending_admin_sinapra' | 'disetujui' | 'ditolak' | 'ditolak_laboran' | 'ditolak_admin_sinapra' | 'batal' | 'selesai';
  laboran_approved_by?: number;
  laboran_approved_at?: string;
  catatan_laboran?: string;
  admin_approved_at?: string;
  catatan_penolakan?: string;
  catatan_approver?: string;
  ruangan?: Ruangan;
  user?: { id: number; name: string; email: string };
  approver?: { id: number; name: string; email: string };
  laboran_approver?: { id: number; name: string; email: string };
  created_at?: string;
  updated_at?: string;
}

export interface ApplyPeminjamanRuanganPayload {
  ruangan_id: number;
  keperluan: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
}

export interface ApproveLaboranPayload {
  is_approved: boolean;
  catatan_laboran?: string;
}

export interface ApprovePeminjamanRuanganPayload {
  is_approved: boolean;
  catatan_penolakan?: string;
  catatan_approver?: string;
}

export interface PeminjamanAset {
  id: number;
  kode_peminjaman?: string;
  nomor_surat?: string | null;
  surat_generated_at?: string | null;
  aset_id: number;
  user_id: number;
  disetujui_oleh?: number;
  keperluan: string;
  tanggal_pinjam: string;
  tanggal_kembali_rencana: string;
  tanggal_kembali_aktual?: string | null;
  tanggal_kembali_realisasi?: string | null;
  status: 'pending' | 'pending_laboran' | 'pending_admin_sinapra' | 'disetujui' | 'dipinjam' | 'ditolak' | 'ditolak_laboran' | 'ditolak_admin_sinapra' | 'kembali' | 'terlambat';
  kondisi_pinjam: 'baik' | 'rusak_ringan';
  kondisi_kembali?: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang' | null;
  catatan_pengembalian?: string | null;
  laboran_approved_by?: number;
  laboran_approved_at?: string;
  catatan_laboran?: string;
  catatan_penolakan?: string;
  admin_approved_at?: string;
  catatan_approver?: string;
  aset?: Aset;
  user?: {
    id: number;
    name: string;
    email: string;
    pegawai?: { nip?: string | null; nidn?: string | null; nuptk?: string | null; nama_lengkap: string };
    mahasiswa?: { nim: string; nama_lengkap: string };
  };
  nomor_identitas?: string;
  kontak_peminjam?: string;
  approver?: { id: number; name: string; email: string };
  laboran_approver?: { id: number; name: string; email: string };
  batch_items?: PeminjamanAset[];
  created_at?: string;
  updated_at?: string;
}

export interface ApplyPeminjamanAsetPayload {
  aset_id?: number;
  aset_ids?: number[];
  keperluan: string;
  tanggal_pinjam: string;
  tanggal_kembali_rencana: string;
  nomor_identitas?: string;
  kontak_peminjam?: string;
}

export interface ApprovePeminjamanAsetPayload {
  is_approved: boolean;
  catatan_penolakan?: string;
  catatan_approver?: string;
}

export interface KembalikanAsetItemPayload {
  peminjaman_id: number;
  kondisi_kembali: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang';
  catatan?: string;
}

export interface KembalikanAsetPayload {
  kondisi_kembali?: 'baik' | 'rusak_ringan' | 'rusak_berat' | 'hilang';
  tanggal_kembali_aktual?: string;
  catatan?: string;
  catatan_pengembalian?: string;
  kembalikan_semua_dalam_batch?: boolean;
  items?: KembalikanAsetItemPayload[];
}

export interface SuratPeminjamanAsetBarang {
  nomor: number;
  peminjaman_id: number;
  aset_id: number;
  kode_aset: string;
  nama_barang: string;
  merk: string;
  nomor_seri: string;
  lokasi_ruangan: string;
  gedung: string;
  kondisi_pinjam: string;
  status: string;
}

export interface SuratPeminjamanAsetData {
  peminjaman_id: number;
  kode_peminjaman?: string;
  nomor_surat: string;
  surat_generated_at: string;
  tanggal_pinjam: string;
  tanggal_kembali_rencana: string;
  keperluan: string;
  status: string;
  peminjam: {
    user_id: number;
    nama: string;
    nomor_identitas: string;
    unit_kerja: string;
    kontak?: string;
    email?: string;
    tanda_tangan_url?: string | null;
    qr_token?: string | null;
  };
  laboran?: {
    user_id: number;
    nama: string;
    nip?: string;
    nidn?: string | null;
    verified_at?: string;
    tanda_tangan_url?: string | null;
    qr_token?: string | null;
  } | null;
  approver?: {
    user_id: number;
    nama: string;
    nip?: string;
    nidn?: string | null;
    approved_at?: string;
    tanda_tangan_url?: string | null;
    qr_token?: string | null;
  } | null;
  daftar_barang: SuratPeminjamanAsetBarang[];
  verifikasi_token?: string;
}

export interface SuratPeminjamanRuanganData {
  peminjaman_id: number;
  kode_peminjaman?: string;
  nomor_surat: string;
  surat_generated_at: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  keperluan: string;
  status: string;
  ruangan: {
    id?: number;
    nama?: string;
    kode?: string;
    lantai?: number;
    kapasitas?: number;
    gedung?: string;
    tipe_ruangan?: string;
    ada_ac?: boolean;
    ada_proyektor?: boolean;
    ada_wifi?: boolean;
  };
  peminjam: {
    user_id: number;
    nama: string;
    nomor_identitas: string;
    unit_kerja: string;
    kontak?: string;
    email?: string;
    tanda_tangan_url?: string | null;
    qr_token?: string | null;
  };
  laboran?: {
    user_id: number;
    nama: string;
    nip?: string;
    nidn?: string | null;
    verified_at?: string;
    tanda_tangan_url?: string | null;
    qr_token?: string | null;
  } | null;
  approver?: {
    user_id: number;
    nama: string;
    nip?: string;
    nidn?: string | null;
    approved_at?: string;
    tanda_tangan_url?: string | null;
    qr_token?: string | null;
  } | null;
  verifikasi_token?: string;
}

// ------------------------------------------------------------
// 4. Maintenance / Perawatan Types
// ------------------------------------------------------------
export interface MaintenanceLog {
  id: number;
  aset_id?: number;
  ruangan_id?: number;
  dilaporkan_oleh: number;
  ditangani_oleh?: number;
  judul: string;
  deskripsi_kerusakan: string;
  prioritas: 'rendah' | 'sedang' | 'tinggi' | 'darurat';
  status: 'dilaporkan' | 'proses' | 'selesai' | 'batal';
  biaya?: number;
  hasil_perbaikan?: string;
  tanggal_selesai?: string;
  aset?: Aset;
  ruangan?: Ruangan;
  pelapor?: { id: number; name: string; email: string };
  teknisi?: { id: number; name: string; email: string };
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceLogFormPayload {
  aset_id?: number | null;
  ruangan_id?: number | null;
  judul: string;
  deskripsi_kerusakan: string;
  prioritas?: 'rendah' | 'sedang' | 'tinggi' | 'darurat';
  status?: 'dilaporkan' | 'proses' | 'selesai' | 'batal';
  biaya?: number;
  hasil_perbaikan?: string;
}

// ------------------------------------------------------------
// 5. Pengajuan Pengadaan Types
// ------------------------------------------------------------
export interface DetailPengadaan {
  id: number;
  pengajuan_id: number;
  kategori_aset_id?: number;
  nama_barang: string;
  spesifikasi?: string;
  jumlah: number;
  satuan: string;
  harga_satuan_estimasi: number;
  subtotal_estimasi: number;
  kategori?: KategoriAset;
  created_at?: string;
  updated_at?: string;
}

export interface PengajuanPengadaan {
  id: number;
  unit_kerja_id?: number;
  diajukan_oleh: number;
  judul: string;
  alasan_kebutuhan: string;
  tanggal_pengajuan: string;
  estimasi_anggaran: number;
  status: 'draft' | 'diajukan' | 'disetujui' | 'ditolak' | 'proses_beli' | 'proses_pengadaan' | 'selesai';
  disetujui_oleh?: number;
  sikeu_pencairan_id?: number | null;
  pencairan_kas?: {
    id: number;
    nomor_pengajuan: string;
    status: string;
    nominal_diajukan: number;
  } | null;
  details?: DetailPengadaan[];
  unit_kerja?: { id: number; nama: string; kode: string };
  pengaju?: { id: number; name: string; email: string };
  approver?: { id: number; name: string; email: string };
  created_at?: string;
  updated_at?: string;
}

export interface DetailPengadaanItemPayload {
  kategori_aset_id?: number | null;
  nama_barang: string;
  spesifikasi?: string;
  jumlah: number;
  satuan: string;
  harga_satuan_estimasi: number;
}

export interface PengajuanPengadaanFormPayload {
  unit_kerja_id?: number | null;
  judul: string;
  alasan_kebutuhan: string;
  details: DetailPengadaanItemPayload[];
}

export interface UpdateStatusPengadaanPayload {
  status: 'disetujui' | 'ditolak' | 'proses_beli' | 'selesai';
  catatan?: string;
}

// ------------------------------------------------------------
// 6. Query Parameters
// ------------------------------------------------------------
export interface SinapraFilterParams extends PaginationParams {
  limit?: number;
  status?: string;
  tipe?: string;
  tipe_ruangan_id?: number;
  gedung_id?: number;
  kategori_id?: number;
  program_studi_id?: number;
  kondisi?: string;
  prioritas?: string;
  unit_kerja_id?: number;
  tanggal?: string;
  is_borrowable?: boolean;
  is_lab_asset?: boolean;
  penanggung_jawab_pegawai_id?: number;
  ruangan_id?: number;
  kategori_bhp_id?: number;
  satuan_id?: number;
  vendor_id?: number;
  jenis_rekanan?: string;
  is_active?: string | boolean;
  kategori?: string;
  status_kelayakan?: string;
  mendekati_kadaluarsa?: boolean;
  lokasi_penyimpanan?: string;
  satuan?: string;
  status_stok?: string;
  catatan?: string;
  tanggal_pengajuan?: string;
  aset_id?: number;
  institusi_kalibrasi?: string;
  nomor_sertifikat?: string;
  tanggal_kalibrasi?: string;
  tanggal_kadaluarsa?: string;
  ruangan_asal_id?: number;
  ruangan_tujuan_id?: number;
  metode_disposal?: string;
  tanggal_mulai?: string;
  tanggal_disposal?: string;
}

// ------------------------------------------------------------
// 7. FASE 4: Manajemen Khusus Laboratorium Types
// ------------------------------------------------------------
export interface LabBhp {
  id: number;
  ruangan_id: number;
  kategori_bhp_id?: number | null;
  satuan_id?: number | null;
  kode_bhp: string;
  nama_bhp: string;
  kategori?: string;
  stok_saat_ini: number;
  stok_minimum: number;
  satuan?: string;
  spesifikasi?: string;
  lokasi_penyimpanan?: string;
  ruangan?: Ruangan;
  kategori_bhp?: MasterKategoriBhp | null;
  satuan_data?: MasterSatuan | null;
  transaksi?: LabBhpTransaksi[];
  created_at?: string;
  updated_at?: string;
}

export interface LabBhpFormPayload {
  ruangan_id: number;
  kategori_bhp_id?: number | null;
  satuan_id?: number | null;
  kode_bhp: string;
  nama_bhp: string;
  kategori?: string;
  stok_saat_ini?: number;
  stok_minimum?: number;
  satuan?: string;
  spesifikasi?: string;
  lokasi_penyimpanan?: string;
}

export interface LabBhpTransaksi {
  id: number;
  bhp_id: number;
  user_id: number;
  jenis_transaksi: 'masuk' | 'keluar';
  jumlah: number;
  tanggal: string;
  keterangan?: string;
  user?: { id: number; name: string; username?: string };
  created_at?: string;
  updated_at?: string;
}

export interface LabBhpTransaksiPayload {
  jenis_transaksi: 'masuk' | 'keluar';
  jumlah: number;
  tanggal?: string;
  keterangan?: string;
}

export interface BebasTanggungan {
  id: number;
  user_id: number;
  nomor_surat?: string;
  tanggal_pengajuan: string;
  tanggal_disetujui?: string;
  disetujui_oleh?: number;
  status: 'diajukan' | 'disetujui' | 'ditolak';
  catatan?: string;
  mahasiswa?: { id: number; name: string; username?: string; email: string };
  approver?: { id: number; name: string; username?: string };
  created_at?: string;
  updated_at?: string;
}

export interface BebasTanggunganFormPayload {
  catatan?: string;
}

export interface ApproveBebasTanggunganPayload {
  is_approved: boolean;
  catatan?: string;
}

export interface AlatKalibrasi {
  id: number;
  aset_id: number;
  vendor_id?: number | null;
  institusi_kalibrasi: string;
  nomor_sertifikat?: string;
  tanggal_kalibrasi: string;
  tanggal_kadaluarsa: string;
  status_kelayakan: 'laik' | 'tidak_laik' | 'butuh_perbaikan';
  catatan?: string;
  aset?: Aset;
  vendor?: MasterVendor | null;
  created_at?: string;
  updated_at?: string;
}

export interface AlatKalibrasiFormPayload {
  aset_id: number;
  vendor_id?: number | null;
  institusi_kalibrasi?: string;
  nomor_sertifikat?: string;
  tanggal_kalibrasi: string;
  tanggal_kadaluarsa: string;
  status_kelayakan?: 'laik' | 'tidak_laik' | 'butuh_perbaikan';
  catatan?: string;
}

export interface LabEarlyWarningsSummary {
  total_bhp_critical: number;
  total_kalibrasi_critical: number;
  total_pending_peminjaman: number;
  total_warnings: number;
}

export interface KalibrasiCriticalItem {
  id: number;
  aset_id: number;
  kode_aset: string;
  nama_aset: string;
  ruangan_nama: string;
  gedung_nama: string;
  institusi_kalibrasi?: string;
  nomor_sertifikat?: string;
  tanggal_kadaluarsa: string | null;
  status_kelayakan: string;
  is_expired: boolean;
  days_remaining: number;
}

export interface PendingPeminjamanItem {
  id: number;
  ruangan_id: number;
  ruangan_nama: string;
  gedung_nama: string;
  peminjam_nama: string;
  keperluan: string;
  tanggal: string | null;
  jam_mulai: string;
  jam_selesai: string;
  status: string;
}

export interface LabEarlyWarningsData {
  summary: LabEarlyWarningsSummary;
  bhp_critical: LabBhp[];
  kalibrasi_critical: KalibrasiCriticalItem[];
  pending_peminjaman: PendingPeminjamanItem[];
}

// ------------------------------------------------------------
// 6. FASE 5: Stock Opname, Mutasi Aset, & Disposal Pemutihan
// ------------------------------------------------------------
export interface StockOpnameItem {
  id: number;
  stock_opname_id: number;
  aset_id: number;
  status_keberadaan: 'sesuai' | 'tidak_ditemukan' | 'rusak' | 'tertukar';
  kondisi_fisik: 'baik' | 'rusak_ringan' | 'rusak_berat';
  catatan?: string;
  aset?: Aset;
  created_at?: string;
  updated_at?: string;
}

export interface StockOpname {
  id: number;
  ruangan_id: number;
  kode_opname: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  petugas_user_id: number;
  status: 'berlangsung' | 'selesai';
  catatan?: string;
  ruangan?: Ruangan;
  petugas?: { id: number; name: string; username?: string; email?: string };
  items?: StockOpnameItem[];
  created_at?: string;
  updated_at?: string;
}

export interface StockOpnameFormPayload {
  ruangan_id: number;
  tanggal_mulai?: string;
  catatan?: string;
}

export interface StockOpnameItemUpdatePayload {
  status_keberadaan?: 'sesuai' | 'tidak_ditemukan' | 'rusak' | 'tertukar';
  kondisi_fisik?: 'baik' | 'rusak_ringan' | 'rusak_berat';
  catatan?: string;
}

export interface MutasiAset {
  id: number;
  aset_id: number;
  ruangan_asal_id: number;
  ruangan_tujuan_id: number;
  pemohon_id: number;
  disetujui_oleh?: number;
  tanggal_pengajuan: string;
  tanggal_disetujui?: string;
  status: 'diajukan' | 'disetujui' | 'ditolak';
  alasan: string;
  catatan?: string;
  aset?: Aset;
  ruanganAsal?: Ruangan;
  ruanganTujuan?: Ruangan;
  pemohon?: { id: number; name: string; username?: string; email?: string };
  approver?: { id: number; name: string; username?: string; email?: string };
  created_at?: string;
  updated_at?: string;
}

export interface MutasiAsetFormPayload {
  aset_id: number;
  ruangan_tujuan_id: number;
  alasan: string;
  catatan?: string;
}

export interface ApproveMutasiPayload {
  is_approved: boolean;
  catatan?: string;
}

export interface DisposalAset {
  id: number;
  aset_id: number;
  nomor_bap?: string;
  tanggal_disposal: string;
  metode_disposal: 'rusak_total' | 'kadaluwarsa' | 'hilang' | 'hibah' | 'lelang' | 'lainnya';
  nilai_residu: number;
  alasan: string;
  diajukan_oleh: number;
  disetujui_oleh?: number;
  status: 'diajukan' | 'disetujui' | 'ditolak';
  catatan?: string;
  aset?: Aset;
  pemohon?: { id: number; name: string; username?: string; email?: string };
  approver?: { id: number; name: string; username?: string; email?: string };
  created_at?: string;
  updated_at?: string;
}

export interface DisposalAsetFormPayload {
  aset_id: number;
  nomor_bap?: string;
  tanggal_disposal?: string;
  metode_disposal: 'rusak_total' | 'kadaluwarsa' | 'hilang' | 'hibah' | 'lelang' | 'lainnya';
  nilai_residu?: number;
  alasan: string;
  catatan?: string;
}

export interface ApproveDisposalPayload {
  is_approved: boolean;
  catatan?: string;
}

// ------------------------------------------------------------
// 6. Kalender Terpadu Ketersediaan Ruangan Types (FASE 6)
// ------------------------------------------------------------
export interface KalenderRuanganItem {
  id: string;
  raw_id: number;
  source: 'sinapra' | 'siakad';
  ruangan_id: number;
  ruangan_nama: string;
  gedung_nama: string;
  title: string;
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  penanggung_jawab: string;
  tipe: string;
  status: string;
  badge_label: string;
  catatan?: string | null;
}

export interface KalenderRuanganFilterParams {
  start_date?: string;
  end_date?: string;
  ruangan_id?: number | string;
  gedung_id?: number | string;
  source?: 'semua' | 'sinapra' | 'siakad';
}

export interface KalenderRuanganMeta {
  start_date: string;
  end_date: string;
  total_events: number;
}

// ------------------------------------------------------------
// 7. Dashboard Eksekutif SINAPRA Types
// ------------------------------------------------------------
export interface SinapraDashboardMetrics {
  total_gedung: number;
  total_ruangan: number;
  ruangan_tersedia: number;
  total_kapasitas_ruangan: number;
  total_aset: number;
  total_harga_perolehan: number;
  total_nilai_buku: number;
  total_akumulasi_penyusutan: number;
  total_aset_ada_pic: number;
  peminjaman_ruangan_aktif: number;
  peminjaman_aset_aktif: number;
  peminjaman_pending: number;
  maintenance_aktif: number;
  pengadaan_pending: number;
  pengadaan_disetujui: number;
}

export interface SinapraDashboardBreakdown {
  status: {
    tersedia: number;
    dipinjam: number;
    maintenance: number;
    rusak: number;
    dihapus: number;
  };
  kondisi: {
    baik: number;
    rusak_ringan: number;
    rusak_berat: number;
  };
}

export interface SinapraDashboardEarlyWarnings {
  bhp_kritis_count: number;
  bhp_kritis_list: {
    id: number;
    ruangan_id: number;
    kode_bhp: string;
    nama_bhp: string;
    stok_saat_ini: number;
    stok_minimum: number;
    satuan?: string;
    ruangan?: { id: number; nama: string; kode: string };
  }[];
  kalibrasi_urgent_count: number;
  kalibrasi_urgent_list: {
    id: number;
    aset_id: number;
    nomor_sertifikat?: string;
    tanggal_kadaluarsa?: string;
    status_kelayakan?: string;
    aset?: { id: number; nama: string; kode_aset: string };
  }[];
}

export interface SinapraDashboardRecentActivities {
  peminjaman_ruangan: {
    id: number;
    ruangan_id: number;
    user_id: number;
    keperluan: string;
    tanggal: string;
    jam_mulai: string;
    jam_selesai: string;
    status: string;
    ruangan?: { id: number; nama: string; kode: string };
    user?: { id: number; name: string };
  }[];
  peminjaman_aset: {
    id: number;
    aset_id: number;
    user_id: number;
    keperluan: string;
    tanggal_pinjam: string;
    tanggal_kembali_rencana: string;
    status: string;
    aset?: { id: number; nama: string; kode_aset: string };
    user?: { id: number; name: string };
  }[];
  aset_terbaru: {
    id: number;
    kode_aset: string;
    nama: string;
    penanggung_jawab_pegawai_id?: number | null;
    harga_perolehan: number;
    nilai_buku: number;
    kondisi: string;
    status: string;
    penanggung_jawab?: { id: number; nama_lengkap: string; nip?: string } | null;
  }[];
}

export interface SinapraDistribusiProdiItem {
  id: number;
  kode_prodi: string;
  nama: string;
  jenjang?: string;
  total_aset: number;
  total_ruangan: number;
  total_nilai_aset: number;
}

export interface SinapraDistribusiProdi {
  prodi_list: SinapraDistribusiProdiItem[];
  fasilitas_umum: {
    nama: string;
    total_aset: number;
    total_ruangan: number;
    total_nilai_aset: number;
  };
}

export interface SinapraDashboardSummary {
  metrics: SinapraDashboardMetrics;
  breakdown_aset: SinapraDashboardBreakdown;
  distribusi_prodi?: SinapraDistribusiProdi;
  early_warnings: SinapraDashboardEarlyWarnings;
  recent_activities: SinapraDashboardRecentActivities;
}

// ------------------------------------------------------------
// 8. MASTER: Plotting Program Studi ke Role Laboran (SIAKAD)
// ------------------------------------------------------------
export interface SinapraProdiRoleItem {
  id: number;
  kode_prodi: string;
  nama: string;
  jenjang?: string;
  fakultas_id?: number | null;
  fakultas?: { id: number; kode: string; nama: string } | null;
  sinapra_roles?: {
    id: number;
    name: string;
    slug: string;
    description?: string;
    pivot?: {
      program_studi_id: number;
      role_id: number;
      keterangan?: string | null;
    };
  }[];
  created_at?: string;
  updated_at?: string;
}

export interface SinapraAvailableRole {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface PlottingProdiRolePayload {
  role_id?: number | null;
  role_ids?: number[];
  keterangan?: string;
}


