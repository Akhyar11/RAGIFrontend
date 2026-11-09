export interface JenisBiaya {
  id: number;
  kode: string;
  nama: string;
  tipe: 'ukt' | 'spp' | 'sks' | 'praktikum' | 'wisuda' | 'spmb_adm' | 'lainnya';
  skema_tarif?: 'dinamis' | 'flat';
  nominal_standar?: number;
  deskripsi?: string;
  is_recurring: boolean;
  is_active: boolean;
}

export interface TarifUkt {
  id: number;
  program_studi_id?: number;
  jenis_biaya_id: number;
  tahun_akademik_id?: number;
  tahun_angkatan?: number;
  kelompok_ukt: number;
  nominal: number;
  is_active: boolean;
  jenis_biaya?: JenisBiaya;
}

export interface Beasiswa {
  id: number;
  kode: string;
  nama: string;
  sumber: 'internal' | 'eksternal' | 'pemerintah';
  tipe_potongan: 'persen' | 'nominal';
  nilai_potongan: number;
  deskripsi?: string;
  is_active: boolean;
}

export interface TagihanMahasiswa {
  id: number;
  mahasiswa_id: number;
  tahun_akademik_id?: number;
  nomor_tagihan: string;
  total_tagihan: number;
  total_potongan: number;
  total_denda: number;
  total_bayar: number;
  status: 'belum_bayar' | 'sebagian' | 'lunas' | 'dispensasi' | 'pending_approval' | 'batal';
  requires_approval: boolean;
  status_approval: 'pending' | 'approved' | 'rejected';
  disetujui_oleh?: number;
  tanggal_approval?: string;
  catatan_approval?: string;
  source_system: string;
  jatuh_tempo?: string;
  created_at: string;
  detail_tagihan?: DetailTagihan[];
  potongan_tagihan?: PotonganTagihan[];
  virtual_accounts?: VirtualAccount[];
}

export interface DetailTagihan {
  id: number;
  tagihan_id: number;
  jenis_biaya_id: number;
  nominal: number;
  potongan: number;
  nominal_bersih: number;
  keterangan?: string;
  jenis_biaya?: JenisBiaya;
}

export interface PotonganTagihan {
  id: number;
  tagihan_id: number;
  beasiswa_id?: number;
  tipe: string;
  nominal_potongan: number;
  keterangan?: string;
}

export interface DispensasiTagihan {
  id: number;
  tagihan_id: number;
  mahasiswa_id: number;
  tipe_dispensasi: 'penundaan_jatuh_tempo' | 'cicilan' | 'keringanan_khusus';
  jatuh_tempo_baru?: string;
  jumlah_cicilan: number;
  nominal_per_cicilan: number;
  alasan: string;
  dokumen_pendukung?: string;
  status: 'pending' | 'approved' | 'rejected';
  diajukan_oleh?: number;
  disetujui_oleh?: number;
  tanggal_persetujuan?: string;
  catatan_pimpinan?: string;
  created_at: string;
  tagihan?: TagihanMahasiswa;
}

export interface VirtualAccount {
  id: number;
  tagihan_id: number;
  va_number: string;
  bank_kode: string;
  bank_nama: string;
  nominal: number;
  expired_at?: string;
  status: 'aktif' | 'kadaluarsa' | 'dibayar';
}

export interface Pembayaran {
  id: number;
  tagihan_id: number;
  virtual_account_id?: number;
  kode_transaksi: string;
  jumlah_bayar: number;
  waktu_bayar?: string;
  channel_bayar: string;
  bank_pengirim?: string;
  status: 'success' | 'pending' | 'failed' | 'reversed';
  tagihan?: TagihanMahasiswa;
}

export interface UnitKas {
  id: number;
  unit_kerja_id?: number;
  nama_kas: string;
  saldo_awal: number;
  saldo_saat_ini: number;
  penanggung_jawab_id?: number;
  deskripsi?: string;
  status: boolean;
}

export interface AkunKeuangan {
  id: number;
  kode_akun: string;
  nama_akun: string;
  kelompok: 'aset' | 'liabilitas' | 'ekuitas' | 'pendapatan' | 'beban';
  saldo_normal: 'debet' | 'kredit';
  is_active: boolean;
}

export interface PajakAkunAlias {
  id: number;
  kode_akun: string;
  nama_akun: string;
  nama_akun_pajak: string | null;
}

export type PajakPelaporanMode = 'dev' | 'publik';

export interface PeriodeAkuntansi {
  id: number;
  nama_periode: string;
  tahun: number;
  bulan: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: 'terbuka' | 'ditutup';
  ditutup_oleh?: number;
  ditutup_pada?: string;
}

export interface PemasukanKampus {
  id: number;
  nomor_transaksi: string;
  sumber_pemasukan: 'hibah_sippm' | 'donatur' | 'kerjasama' | 'pendapatan_lainnya';
  unit_kas_id?: number;
  akun_pendapatan_id?: number;
  nominal: number;
  tanggal_terima: string;
  nama_donor_instansi: string;
  nomor_kontrak_ref?: string;
  file_bukti_transfer?: string;
  keterangan?: string;
  unit_kas?: UnitKas;
  akun_pendapatan?: AkunKeuangan;
}

export interface PengajuanPencairanKas {
  id: number;
  nomor_pengajuan: string;
  unit_kerja_id?: number;
  unit_kas_id: number;
  pemohon_id?: number;
  judul_pengajuan: string;
  deskripsi?: string;
  nominal_diajukan: number;
  nominal_disetujui: number;
  jenis_pengajuan: 'operasional' | 'kegiatan' | 'reimbursement' | 'sarpras' | 'lainnya';
  file_lampiran?: string;
  status: 'draft' | 'pending_pimpinan' | 'pending_keuangan' | 'disetujui' | 'ditolak' | 'dicairkan';
  unit_kas?: UnitKas;
}

export interface JurnalUmum {
  id: number;
  nomor_jurnal: string;
  tanggal_jurnal: string;
  periode_id?: number;
  jenis_sumber: 'pembayaran_mahasiswa' | 'pemasukan_hibah' | 'pencairan_kas' | 'pengeluaran_manual' | 'penyesuaian' | 'penutupan' | 'reimbursement';
  referensi_id?: number;
  keterangan?: string;
  status_posting: 'draft' | 'posted';
  total_debet: number;
  total_kredit: number;
  details?: DetailJurnalUmum[];
}

export interface DetailJurnalUmum {
  id: number;
  jurnal_id: number;
  akun_id: number;
  debet: number;
  kredit: number;
  keterangan?: string;
  akun?: AkunKeuangan;
  jurnal?: JurnalUmum;
}

export interface SaldoAwalDetail {
  id: number;
  saldo_awal_id: number;
  akun_id: number;
  debet: number;
  kredit: number;
  keterangan?: string | null;
  akun?: AkunKeuangan;
}

export interface SaldoAwal {
  id: number;
  tanggal: string;
  periode_id?: number | null;
  status: 'draft' | 'posted';
  keterangan?: string | null;
  total_debet: number;
  total_kredit: number;
  /** Positif = tambahan kredit ke ekuitas 301.03; negatif = tambahan debet. */
  nominal_penyeimbang: number;
  akun_penyeimbang_id?: number | null;
  jurnal_id?: number | null;
  created_by?: number | null;
  posted_by?: number | null;
  posted_at?: string | null;
  details?: SaldoAwalDetail[];
  akun_penyeimbang?: AkunKeuangan;
  jurnal?: JurnalUmum;
  periode?: PeriodeAkuntansi;
}

export interface SaldoAwalData {
  saldo_awal: SaldoAwal | null;
  akun_penyeimbang: AkunKeuangan;
  coa: AkunKeuangan[];
  validasi: ValidasiSaldoAwal;
  riwayat: (SaldoAwal & { details_count?: number })[];
}

export interface ValidasiSaldoAwal {
  tanggal_saldo_awal: string;
  jumlah_jurnal_sebelum: number;
  tanggal_jurnal_terawal?: string | null;
  siap_posting: boolean;
  pesan: string;
}

export interface PengeluaranKampus {
  id: number;
  nomor_transaksi: string;
  kategori: string;
  akun_beban_id?: number;
  akun_kas_id?: number;
  nominal: number;
  keterangan?: string;
  tanggal_transaksi: string;
  nama_vendor?: string;
  npwp_vendor?: string;
  jenis_pajak: 'tanpa_pajak' | 'pph_21' | 'pph_23' | 'ppn_11';
  tarif_pajak_persen: number;
  nominal_pajak: number;
  net_dibayarkan: number;
  status_pembayaran: 'lunas' | 'pending' | 'batal';
  file_bukti_bayar?: string;
  akun_beban?: AkunKeuangan;
  akun_kas?: AkunKeuangan;
}

export interface LaporanBuktiPelaksanaan {
  id: number;
  sumber_tipe: 'pengajuan_pencairan' | 'pengeluaran_kampus';
  sumber_id: number;
  nomor_bukti: string;
  tanggal_pelaksanaan: string;
  total_realisasi: number;
  file_nota_kuitansi?: string;
  rincian_keterangan?: string;
  status_verifikasi: 'pending' | 'disetujui' | 'ditolak';
  catatan_verifikasi?: string;
}

// ============================================================
// KAS KECIL (Petty Cash) — SIKEU
// Petugas Kas Kecil per fakultas: transaksi keluar, saldo,
// pengajuan kas langsung (top-up) yang disetujui Admin Keuangan.
// ============================================================

export interface FakultasRingkas {
  id: number;
  kode?: string;
  nama: string;
}

export interface PetugasRingkas {
  id: number;
  username?: string;
  email?: string;
  pegawai?: { nama_lengkap?: string };
}

export interface KasKecilAkun {
  id: number;
  kode_akun: string;
  nama_akun: string;
  kelompok?: string;
}

export interface KasKecilUnit {
  id: number;
  fakultas_id?: number;
  akun_keuangan_id?: number;
  nama_kas: string;
  tipe_kas?: string;
  kanal?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  penanggung_jawab?: string | PetugasRingkas | null;
  penanggung_jawab_id?: number;
  saldo_awal: number | string;
  saldo_saat_ini: number | string;
  deskripsi?: string;
  status: boolean | number;
  is_kabag_kas?: boolean;
  created_at?: string;
  fakultas?: FakultasRingkas;
  akunKeuangan?: KasKecilAkun;
  akun_keuangan?: KasKecilAkun;
  kasKecilTransaksis?: KasKecilTransaksi[];
  kasKecilPengajuans?: KasKecilPengajuan[];
}

export interface ReferensiKasKecil {
  id: number;
  tipe: string;
  kode: string;
  nama: string;
  urutan: number;
  is_active?: boolean;
}

export interface KasKecilTransaksi {
  id: number;
  unit_kas_id: number;
  transaksi_kas_unit_id?: number;
  nomor_transaksi: string;
  referensi_kategori_id?: number | null;
  uraian: string;
  penerima?: string | null;
  nominal: number | string;
  tanggal_transaksi: string;
  file_bukti_path?: string | null;
  keterangan?: string | null;
  created_by?: number;
  created_at?: string;
  kategori?: ReferensiKasKecil;
  dibuatOleh?: PetugasRingkas;
  unitKas?: KasKecilUnit;
}

export type KasKecilPengajuanStatus = 'pending_keuangan' | 'disetujui' | 'ditolak';

export interface KasKecilPengajuan {
  id: number;
  unit_kas_id: number;
  transaksi_kas_unit_id?: number;
  nomor_pengajuan: string;
  judul_pengajuan: string;
  keperluan?: string | null;
  nominal_diajukan: number | string;
  nominal_disetujui: number | string;
  status: KasKecilPengajuanStatus;
  catatan_penolakan?: string | null;
  pemohon_id?: number;
  approved_by?: number | null;
  approved_at?: string | null;
  created_by?: number;
  created_at?: string;
  pemohon?: PetugasRingkas;
  approver?: PetugasRingkas;
  unitKas?: KasKecilUnit;
}

export type ReferralPayoutStatus = 'pending_keuangan' | 'pending_direktur' | 'disetujui' | 'dicairkan' | 'ditolak';

export interface ReferralInvoiceReferrer {
  id: number;
  name?: string;
  username?: string;
  email?: string;
}

export interface ReferralInvoiceUsage {
  id: number;
  referral_code: string;
  status: string;
  qualified_at?: string | null;
  pendaftaran?: {
    id: number;
    no_pendaftaran: string;
    nama_lengkap: string;
    status?: string;
    gelombang_penerimaan?: { id: number; nama: string } | null;
  } | null;
}

export interface ReferralInvoice {
  id: number;
  referrer_user_id: number;
  referral_count: number;
  total_nominal: number | string;
  nomor_bukti: string;
  generated_at?: string | null;
  keterangan?: string | null;
  status: ReferralPayoutStatus;
  verified_by?: number | null;
  verified_at?: string | null;
  approved_keuangan_by?: number | null;
  approved_keuangan_at?: string | null;
  approved_direktur_by?: number | null;
  approved_direktur_at?: string | null;
  paid_by?: number | null;
  paid_at?: string | null;
  sikeu_reference?: string | null;
  nomor_referensi_transfer?: string | null;
  bukti_transfer_path?: string | null;
  catatan_penolakan?: string | null;
  nama_bank?: string | null;
  nomor_rekening?: string | null;
  nama_pemilik_rekening?: string | null;
  created_at?: string;
  referrer?: ReferralInvoiceReferrer | null;
  approver_keuangan?: { id: number; name?: string; username?: string } | null;
  approver_direktur?: { id: number; name?: string; username?: string } | null;
  usages?: ReferralInvoiceUsage[];
  usages_count?: number;
}

// ============================================================
// KOREKSI ALOKASI PEMBAYARAN — SIKEU
// Redistribusi alokasi antar tagihan milik mahasiswa yang sama.
// Kekurangan target otomatis diusulkan sebagai tagihan koreksi.
// ============================================================

export type KoreksiAlokasiStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled';

/** Closed-set status workflow koreksi (konstanta terpusat, DRY). */
export const KOREKSI_ALOKASI_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending', label: 'Menunggu Persetujuan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'applied', label: 'Diterapkan' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export interface KoreksiAlokasiRincian {
  id: number;
  master_biaya_id: number;
  nama_biaya: string;
  nominal_bersih: number;
  terbayar: number;
  sisa: number;
}

export interface KoreksiAlokasiTagihan {
  id: number;
  nomor_tagihan: string;
  tahun_akademik_id?: number | null;
  semester?: number | null;
  total_tagihan: number;
  total_potongan: number;
  total_denda: number;
  total_bayar: number;
  total_bersih: number;
  sisa: number;
  status: string;
  jatuh_tempo?: string | null;
  tersedia_dialihkan: number;
  rincian: KoreksiAlokasiRincian[];
}

export interface KoreksiAlokasiKonsolidasi {
  tagihan: KoreksiAlokasiTagihan[];
  ringkasan: {
    total_tagihan_bersih: number;
    total_terbayar: number;
    total_sisa: number;
    jumlah_tagihan: number;
  };
}

export interface KoreksiAlokasiDetailInput {
  from_tagihan_id: number;
  to_tagihan_id: number;
  nominal_dialihkan: number;
  from_detail_tagihan_id?: number | null;
  to_detail_tagihan_id?: number | null;
  keterangan?: string | null;
}

export interface KoreksiAlokasiDampakTarget {
  to_tagihan_id: number;
  nomor_tagihan: string;
  total_bersih: number;
  terbayar_sebelum: number;
  sisa_sebelum: number;
  dialihkan_masuk: number;
  sisa_setelah: number;
  akan_lunas: boolean;
}

export interface KoreksiAlokasiSimulasi {
  total_dialihkan: number;
  dampak_target: KoreksiAlokasiDampakTarget[];
  ada_kekurangan: boolean;
  total_kekurangan: number;
  usulan_tagihan_kekurangan?: string | null;
}

export interface KoreksiAlokasi {
  id: number;
  mahasiswa_id?: number | null;
  calon_mahasiswa_id?: number | null;
  tipe_referensi: string;
  nomor_koreksi: string;
  tahun_akademik_id?: number | null;
  semester?: number | null;
  alasan: string;
  referensi?: string | null;
  status: KoreksiAlokasiStatus;
  requested_by?: number | null;
  approved_by?: number | null;
  approved_at?: string | null;
  rejected_by?: number | null;
  rejected_at?: string | null;
  applied_at?: string | null;
  catatan_approval?: string | null;
  total_nominal_dialihkan: number;
  buat_tagihan_kekurangan: boolean;
  created_at?: string;
  details?: Array<{
    id: number;
    from_tagihan_id: number;
    to_tagihan_id: number;
    nominal_dialihkan: number;
    keterangan?: string | null;
    from_tagihan?: { id: number; nomor_tagihan: string };
    to_tagihan?: { id: number; nomor_tagihan: string };
  }>;
}

// ============================================================
// PERUBAHAN PRODI / JENIS PENDAFTARAN — SIKEU
// ============================================================

export type PerubahanProdiStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled';

export interface PerubahanProdi {
  id: number;
  mahasiswa_id: number;
  old_program_studi_id?: number | null;
  new_program_studi_id: number;
  tahun_akademik_id?: number | null;
  semester_efektif?: number | null;
  tanggal_efektif?: string | null;
  jenis_pendaftaran_lama?: string | null;
  jenis_pendaftaran_baru?: string | null;
  alasan: string;
  referensi_surat?: string | null;
  dokumen_path?: string | null;
  status: PerubahanProdiStatus;
  catatan_approval?: string | null;
  created_at?: string;
}

// ============================================================
// UMK & TUTUP KAS & LAPORAN BENDAHARA — SIKEU (parity legacy)
// ============================================================

export type UmkStatus = 'aktif' | 'selesai';

export const UMK_STATUS_OPTIONS: Array<{ value: UmkStatus; label: string }> = [
  { value: 'aktif', label: 'Aktif / Diberikan' },
  { value: 'selesai', label: 'Selesai / Dipertanggungjawabkan' },
];

export const UMK_FILTER_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  ...UMK_STATUS_OPTIONS,
];

export const UMK_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'tanggal', label: 'Tanggal' },
  { value: 'total', label: 'Total' },
  { value: 'nama_penerima', label: 'Nama Penerima' },
  { value: 'created_at', label: 'Dibuat' },
];

export const SORT_DIRECTION_OPTIONS: Array<{ value: 'asc' | 'desc'; label: string }> = [
  { value: 'asc', label: 'Menaik' },
  { value: 'desc', label: 'Menurun' },
];

export const LAPORAN_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'tanggal', label: 'Tanggal' },
  { value: 'jumlah', label: 'Jumlah' },
];

export const TUTUP_KAS_SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'tanggal', label: 'Tanggal' },
  { value: 'saldo_akhir', label: 'Saldo Akhir' },
  { value: 'created_at', label: 'Dibuat' },
];

export const METODE_KAS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'OFFLINE', label: 'Tunai (Offline)' },
  { value: 'NON_TUNAI', label: 'Non Tunai' },
  { value: 'SEMUA', label: 'Semua Metode' },
];

export interface UangMukaKerja {
  id: number;
  unit_kas_id?: number | null;
  nama_penerima: string;
  tanggal: string;
  tanggal_selesai?: string | null;
  keterangan?: string | null;
  total: number;
  status: UmkStatus;
  unit_kas?: UnitKas;
  created_at?: string;
}

export interface TutupKasUnit {
  id: number;
  unit_kas_id: number;
  tanggal: string;
  saldo_awal: number;
  saldo_masuk: number;
  saldo_keluar: number;
  saldo_akhir: number;
  is_locked: boolean;
  unit_kas?: UnitKas;
  created_at?: string;
}

export interface LaporanBendaharaSaldo {
  saldo_masuk: number;
  saldo_keluar: number;
  saldo_bersih: number;
  rincian: {
    pembayaran_mahasiswa: number;
    kas_masuk_lain: number;
    kas_keluar: number;
  };
}

export interface LaporanBendaharaBaris {
  id: string;
  tanggal?: string | null;
  kode_transaksi?: string | null;
  nomor_tagihan?: string | null;
  mahasiswa_nim?: string | null;
  mahasiswa_nama?: string | null;
  mahasiswa_prodi?: string | null;
  uraian?: string | null;
  kode_akun?: string | null;
  jumlah: number;
  jenis_transaksi: 'masuk' | 'keluar';
  channel?: string | null;
}
