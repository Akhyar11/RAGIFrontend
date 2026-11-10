import { ApiResponse, PaginationMeta } from '@/types/api.types';
import {
  TagihanMahasiswa,
  DispensasiTagihan,
  PemasukanKampus,
  AkunKeuangan,
  JurnalUmum,
  DetailJurnalUmum,
  SaldoAwalData,
  SaldoAwal,
  PajakAkunAlias,
  PajakPelaporanMode
} from '@/types/sikeu.types';

import apiClient from '@/lib/axios';

export interface PotonganMahasiswa {
  id: number;
  mahasiswa_id: number;
  nim: string;
  nama_mahasiswa: string;
  nama_potongan: string;
  tipe_potongan: 'nominal' | 'persen' | string;
  nilai_potongan: number;
  potongan_text?: string;
  master_biaya_id?: number | null;
  komponen_biaya?: string;
  semester?: number | null;
  tahun_akademik?: string | null;
  berlaku_mulai?: string | null;
  berlaku_sampai?: string | null;
  nomor_sk?: string | null;
  keterangan?: string | null;
  status: 'aktif' | 'nonaktif' | 'selesai' | string;
  diinput_oleh?: number | null;
  petugas_nama?: string;
  created_at?: string;
}

export interface MasterBiaya {
  id: number;
  kode: string;
  nama: string;
  tipe: string;
  kode_biaya?: string;
  nama_biaya?: string;
  skema_tarif?: string;
  nominal_standar?: number;
  deskripsi?: string;
  is_active?: boolean;
}

export const sikeuService = {
  // External Bill Generation
  createExternalBill: async (payload: any) => {
    const { data } = await apiClient.post<ApiResponse<{ tagihan: TagihanMahasiswa; virtual_account?: any }>>('/v1/sikeu/tagihan/external', payload);
    return data;
  },

  // Piutang Mahasiswa & Rekapitulasi Tunggakan
  getPiutangMahasiswa: async (params?: {
    search?: string;
    angkatan?: string | number;
    tahun_akademik_id?: string | number;
    program_studi_id?: string | number;
    cutoff_date?: string;
    status?: string;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          cleanParams[key] = String(val);
        }
      });
    }
    const query = new URLSearchParams(cleanParams).toString();
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/piutang?${query}`);
    return data;
  },

  downloadPiutangExcel: async (params?: any) => {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          cleanParams[key] = String(val);
        }
      });
    }
    const query = new URLSearchParams(cleanParams).toString();
    const res = await apiClient.get<Blob>(`/v1/sikeu/piutang/export-excel?${query}`, {
      responseType: 'blob',
    });
    const blob = res.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Piutang_Mahasiswa_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Dispensasi Tagihan
  getDispensasiList: async (params?: { status?: string; mahasiswa_id?: number; search?: string; program_studi_id?: number | string; angkatan?: number | string; page?: number; per_page?: number }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.mahasiswa_id) query.append('mahasiswa_id', params.mahasiswa_id.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.program_studi_id) query.append('program_studi_id', String(params.program_studi_id));
    if (params?.angkatan) query.append('angkatan', String(params.angkatan));
    if (params?.page) query.append('page', String(params.page));
    if (params?.per_page) query.append('per_page', String(params.per_page));
    const qStr = query.toString();
    const { data } = await apiClient.get<ApiResponse<DispensasiTagihan[]>>(`/v1/sikeu/dispensasi${qStr ? `?${qStr}` : ''}`);
    return data;
  },

  submitDispensasi: async (payload: {
    tagihan_id: number;
    tipe_dispensasi: string;
    jatuh_tempo_baru?: string;
    jumlah_cicilan?: number;
    nominal_per_cicilan?: number;
    allow_krs?: boolean;
    alasan: string;
    dokumen_pendukung?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<DispensasiTagihan>>('/v1/sikeu/dispensasi', payload);
    return data;
  },

  deleteDispensasi: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/v1/sikeu/dispensasi/${id}`);
    return data;
  },

  validateDispensasiPublic: async (signatureHash: string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/dispensasi/validasi/${encodeURIComponent(signatureHash)}`);
    return data;
  },

  // Approval Pimpinan
  getPendingApprovals: async () => {
    const { data } = await apiClient.get<ApiResponse<{ tagihan_pending: TagihanMahasiswa[]; dispensasi_pending: DispensasiTagihan[] }>>('/v1/sikeu/approvals');
    return data;
  },

  approveTagihan: async (id: number, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<TagihanMahasiswa>>(`/v1/sikeu/approvals/tagihan/${id}/approve`, { catatan });
    return data;
  },

  rejectTagihan: async (id: number, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<TagihanMahasiswa>>(`/v1/sikeu/approvals/tagihan/${id}/reject`, { catatan });
    return data;
  },

  approveDispensasi: async (id: number, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<DispensasiTagihan>>(`/v1/sikeu/approvals/dispensasi/${id}/approve`, { catatan });
    return data;
  },

  rejectDispensasi: async (id: number, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<DispensasiTagihan>>(`/v1/sikeu/approvals/dispensasi/${id}/reject`, { catatan });
    return data;
  },

  // Pemasukan Kampus
  getPemasukanList: async (params?: { sumber?: string; page?: number; per_page?: number }) => {
    const query = new URLSearchParams();
    if (params?.sumber) query.append('sumber', params.sumber);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<PemasukanKampus[]>>(`/v1/sikeu/pemasukan${queryString}`);
    return data;
  },

  storeExternalIncome: async (payload: {
    sumber_pemasukan: string;
    unit_kas_id?: number;
    nominal: number;
    tanggal_terima: string;
    nama_donor_instansi: string;
    nomor_kontrak_ref?: string;
    keterangan?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<PemasukanKampus>>('/v1/sikeu/pemasukan/external', payload);
    return data;
  },

  // Akuntansi & COA
  getCoaList: async (kelompok?: string) => {
    const query = kelompok ? `?kelompok=${kelompok}` : '';
    const { data } = await apiClient.get<ApiResponse<AkunKeuangan[]>>(`/v1/sikeu/akuntansi/coa${query}`);
    return data;
  },

  storeCoa: async (payload: {
    kode_akun: string;
    nama_akun: string;
    kelompok: string;
    saldo_normal: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<AkunKeuangan>>('/v1/sikeu/akuntansi/coa', payload);
    return data;
  },

  getJurnalList: async (params?: {
    jenis_sumber?: string;
    status_posting?: string;
    search?: string;
    dari?: string;
    sampai?: string;
    page?: number;
    per_page?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.jenis_sumber) query.append('jenis_sumber', params.jenis_sumber);
    if (params?.status_posting) query.append('status_posting', params.status_posting);
    if (params?.search) query.append('search', params.search);
    if (params?.dari) query.append('dari', params.dari);
    if (params?.sampai) query.append('sampai', params.sampai);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<JurnalUmum[]>>(`/v1/sikeu/akuntansi/jurnal${queryString}`);
    return data;
  },

  storeJurnal: async (payload: {
    tanggal_jurnal: string;
    jenis_sumber: string;
    keterangan: string;
    details: { akun_id: number; debet: number; kredit: number; keterangan?: string }[];
  }) => {
    const { data } = await apiClient.post<ApiResponse<JurnalUmum>>('/v1/sikeu/akuntansi/jurnal', payload);
    return data;
  },

  getJurnalDetail: async (id: number | string) => {
    const { data } = await apiClient.get<ApiResponse<JurnalUmum>>(`/v1/sikeu/akuntansi/jurnal/${id}`);
    return data;
  },

  updateJurnal: async (
    id: number | string,
    payload: {
      tanggal_jurnal?: string;
      jenis_sumber?: string;
      keterangan?: string;
      details?: { akun_id: number; debet: number; kredit: number; keterangan?: string }[];
    }
  ) => {
    const { data } = await apiClient.put<ApiResponse<JurnalUmum>>(`/v1/sikeu/akuntansi/jurnal/${id}`, payload);
    return data;
  },

  deleteJurnal: async (id: number | string) => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/v1/sikeu/akuntansi/jurnal/${id}`);
    return data;
  },

  getPengaturanJurnal: async () => {
    const { data } = await apiClient.get<ApiResponse<Record<string, { default: string; nilai: string }>>>('/v1/sikeu/pengaturan-jurnal');
    return data;
  },

  updatePengaturanJurnal: async (prefix: Record<string, string>) => {
    const { data } = await apiClient.put<ApiResponse<any>>('/v1/sikeu/pengaturan-jurnal', { prefix });
    return data;
  },

  getBukuBesar: async (akun_id?: number, page?: number, per_page?: number) => {
    const query = new URLSearchParams();
    if (akun_id) query.append('akun_id', akun_id.toString());
    if (page) query.append('page', page.toString());
    if (per_page) query.append('per_page', per_page.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/akuntansi/buku-besar${queryString}`);
    return data;
  },

  getLaporanKeuangan: async (params?: { dari?: string; sampai?: string }) => {
    const query = new URLSearchParams();
    if (params?.dari) query.append('dari', params.dari);
    if (params?.sampai) query.append('sampai', params.sampai);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/akuntansi/laporan${queryString}`);
    return data;
  },

  // Saldo Awal Akuntansi (opening balance)
  getSaldoAwal: async () => {
    const { data } = await apiClient.get<ApiResponse<SaldoAwalData>>('/v1/sikeu/akuntansi/saldo-awal');
    return data;
  },

  saveSaldoAwal: async (payload: {
    tanggal: string;
    keterangan?: string;
    details: { akun_id: number; debet: number; kredit: number; keterangan?: string }[];
  }) => {
    const { data } = await apiClient.put<ApiResponse<SaldoAwal>>('/v1/sikeu/akuntansi/saldo-awal', payload);
    return data;
  },

  postSaldoAwal: async () => {
    const { data } = await apiClient.post<ApiResponse<SaldoAwal>>('/v1/sikeu/akuntansi/saldo-awal');
    return data;
  },

  cancelSaldoAwal: async () => {
    const { data } = await apiClient.delete<ApiResponse<null>>('/v1/sikeu/akuntansi/saldo-awal');
    return data;
  },

  // Periode Akuntansi (Tutup Buku)
  getPeriodeList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/periode');
    return data;
  },

  createPeriode: async (payload: { nama_periode: string; tanggal_mulai: string; tanggal_selesai: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/periode', payload);
    return data;
  },

  tutupPeriode: async (id: number | string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/periode/${id}/tutup`);
    return data;
  },

  // Master Tarif Gaji Pegawai
  getMasterGajiList: async (params?: { search?: string; jenis_pegawai?: string; page?: number; per_page?: number; sort_by?: string; sort_order?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.jenis_pegawai && params.jenis_pegawai !== 'all') query.append('jenis_pegawai', params.jenis_pegawai);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    if (params?.sort_order) query.append('sort_order', params.sort_order);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/master/gaji-pegawai${queryString}`);
    return data;
  },

  saveMasterGaji: async (payload: {
    pegawai_id: number;
    gaji_pokok: number;
    tunjangan_tetap: number;
    potongan_tetap: number;
    tarif_transport_harian: number;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/gaji-pegawai', payload);
    return data;
  },

  // Master Tarif UKT per Angkatan & Jalur Kelas
  getTarifList: async (params?: { tahun_angkatan?: number; jalur_kelas?: string; program_studi_id?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/master/tarif-ukt?${query}`);
    return data;
  },

  storeTarif: async (payload: { jenis_biaya_id: number; tahun_angkatan: number; jalur_kelas?: string; kelompok_ukt: number; nama_kelompok?: string; program_studi_id?: number; nominal: number }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/tarif-ukt', payload);
    return data;
  },

  updateTarif: async (id: number, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/tarif-ukt/${id}`, payload);
    return data;
  },

  deleteTarif: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/tarif-ukt/${id}`);
    return data;
  },

  // Master Jalur Kelas
  getJalurKelasList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/jalur-kelas');
    return data;
  },

  storeJalurKelas: async (payload: { nama_jalur: string; deskripsi?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/jalur-kelas', payload);
    return data;
  },

  updateJalurKelas: async (id: number, payload: { nama_jalur?: string; deskripsi?: string; is_active?: boolean }) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/jalur-kelas/${id}`, payload);
    return data;
  },

  deleteJalurKelas: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/jalur-kelas/${id}`);
    return data;
  },

  // Master Jenis Biaya Pendidikan
  getJenisBiayaList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/master-biaya');
    return data;
  },

  getMasterBiayaList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/master-biaya');
    return data;
  },

  storeJenisBiaya: async (payload: { kode: string; nama: string; tipe: string; nominal_standar?: number; deskripsi?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/master-biaya', payload);
    return data;
  },

  updateJenisBiaya: async (id: number, payload: { nama?: string; tipe?: string; nominal_standar?: number; deskripsi?: string; is_active?: boolean }) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/master-biaya/${id}`, payload);
    return data;
  },

  deleteJenisBiaya: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/master-biaya/${id}`);
    return data;
  },

  // Master & Mapping Beasiswa Mahasiswa
  getBeasiswaList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/beasiswa');
    return data;
  },

  storeBeasiswa: async (payload: { kode: string; nama: string; sumber: string; tipe_potongan: string; nilai_potongan: number; jenis_biaya_ids?: number[]; berlaku_angkatan_mulai?: number; berlaku_angkatan_sampai?: number; deskripsi?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/beasiswa', payload);
    return data;
  },

  updateBeasiswa: async (id: number, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/beasiswa/${id}`, payload);
    return data;
  },

  deleteBeasiswa: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/beasiswa/${id}`);
    return data;
  },

  getMahasiswaBeasiswaList: async (params?: { page?: number; per_page?: number; q?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.q) query.append('q', params.q);
    const { data } = await apiClient.get<ApiResponse<any[]> & { meta?: PaginationMeta }>(`/v1/sikeu/master/mahasiswa-beasiswa?${query.toString()}`);
    return data;
  },

  assignMahasiswaBeasiswa: async (payload: { mahasiswa_id: number; nim?: string; nama_mahasiswa?: string; beasiswa_id: number; berlaku_mulai?: string; berlaku_sampai?: string; status?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/mahasiswa-beasiswa', payload);
    return data;
  },

  updateMahasiswaBeasiswa: async (id: number, payload: { beasiswa_id?: number; berlaku_mulai?: string; berlaku_sampai?: string; status?: string }) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/mahasiswa-beasiswa/${id}`, payload);
    return data;
  },

  deleteMahasiswaBeasiswa: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/mahasiswa-beasiswa/${id}`);
    return data;
  },

  // Master Setting Potongan Khusus Mahasiswa (Di Luar Beasiswa)
  getPotonganMahasiswaList: async (params?: { page?: number; per_page?: number; search?: string; q?: string; status?: string; mahasiswa_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.search || params?.q) query.append('search', (params.search || params.q)!);
    if (params?.status) query.append('status', params.status);
    if (params?.mahasiswa_id) query.append('mahasiswa_id', params.mahasiswa_id.toString());
    const { data } = await apiClient.get<ApiResponse<PotonganMahasiswa[]> & { meta?: PaginationMeta }>(`/v1/sikeu/master/potongan-mahasiswa?${query.toString()}`);
    return data;
  },

  createPotonganMahasiswa: async (payload: {
    mahasiswa_id: number;
    nim?: string;
    nama_mahasiswa?: string;
    nama_potongan: string;
    tipe_potongan: 'nominal' | 'persen';
    nilai_potongan: number;
    master_biaya_id?: number | null;
    semester?: number | null;
    tahun_akademik?: string | null;
    berlaku_mulai?: string | null;
    berlaku_sampai?: string | null;
    nomor_sk?: string | null;
    keterangan?: string | null;
    status?: string;
    tagihan_id?: number | null;
    sync_unpaid_bills?: boolean;
  }) => {
    const { data } = await apiClient.post<ApiResponse<PotonganMahasiswa>>('/v1/sikeu/master/potongan-mahasiswa', payload);
    return data;
  },

  updatePotonganMahasiswa: async (id: number, payload: Partial<PotonganMahasiswa>) => {
    const { data } = await apiClient.put<ApiResponse<PotonganMahasiswa>>(`/v1/sikeu/master/potongan-mahasiswa/${id}`, payload);
    return data;
  },

  deletePotonganMahasiswa: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/potongan-mahasiswa/${id}`);
    return data;
  },

  // Penetapan Tipe Tagihan & Jalur Kelas Mahasiswa (SPMB / SIAKAD / Change Status)
  getStudentBillingTypes: async (params?: {
    page?: number;
    per_page?: number;
    q?: string;
    search?: string;
    angkatan?: number | string;
    program_studi_id?: number | string;
    jalur_kelas?: string;
    kelompok_ukt?: number | string;
    sort_by?: string;
    sort_dir?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val.toString());
        }
      });
    }
    const { data } = await apiClient.get<ApiResponse<any[]> & { meta?: PaginationMeta }>(`/v1/sikeu/master/student-billing-types?${query.toString()}`);
    return data;
  },

  assignStudentBillingType: async (payload: { mahasiswa_id: number; nim?: string; nama_mahasiswa?: string; tahun_angkatan: number; jalur_kelas: string; kelompok_ukt: number; beasiswa_id?: number; catatan_perubahan?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/assign-student-billing-type', payload);
    return data;
  },

  updateStudentBillingType: async (id: number, payload: { jalur_kelas?: string; kelompok_ukt?: number; beasiswa_id?: number; catatan_perubahan: string }) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/update-student-billing-type/${id}`, payload);
    return data;
  },

  syncStudentsFromSiakad: async (payload?: { tahun_angkatan?: number }) => {
    const { data } = await apiClient.post<ApiResponse<{ synced_count: number; target_angkatan?: string }>>('/v1/sikeu/master/sync-students', payload || {});
    return data;
  },

  // Pencarian Mahasiswa untuk Tagihan & Dispensasi (batasi via prodi/angkatan dulu ala legacy)
  searchMahasiswa: async (q: string, filters?: { program_studi_id?: number | string; angkatan?: number | string }) => {
    const query = new URLSearchParams({ q });
    if (filters?.program_studi_id) query.append('program_studi_id', String(filters.program_studi_id));
    if (filters?.angkatan) query.append('angkatan', String(filters.angkatan));
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/mahasiswa-search?${query.toString()}`);
    return data;
  },

  // Portal Tagihan & Invoice Mahasiswa Mandiri
  getMyBills: async (mahasiswaId?: number) => {
    const params = new URLSearchParams({ include_lunas: '1' });
    if (mahasiswaId) params.append('mahasiswa_id', mahasiswaId.toString());
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/mahasiswa/tagihan?${params.toString()}`);
    return data;
  },

  getMyPaymentHistory: async (mahasiswaId?: number) => {
    const q = mahasiswaId ? `?mahasiswa_id=${mahasiswaId}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/mahasiswa/riwayat-pembayaran${q}`);
    return data;
  },

  getPaymentChannels: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/mahasiswa/payment-channels');
    return data;
  },

  // Rekening kampus tujuan transfer manual (aman untuk mahasiswa, tanpa saldo)
  getRekeningTujuan: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/mahasiswa/rekening-tujuan');
    return data;
  },

  getInvoice: async (id: number, bankKode?: string) => {
    const q = bankKode ? `?bank_kode=${encodeURIComponent(bankKode)}` : '';
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/mahasiswa/invoice/${id}${q}`);
    return data;
  },

  generateBatchInvoice: async (tagihanIds: number[], bankKode?: string) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/mahasiswa/invoice-batch', { tagihan_ids: tagihanIds, bank_kode: bankKode || 'BSN' });
    return data;
  },

  payStudentBills: async (payload: { tagihan_ids: number[]; channel_bayar?: string; bank_kode?: string; catatan?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/mahasiswa/pay-bills', payload);
    return data;
  },

  // Cetak Bukti Dispensasi
  getCetakBuktiDispensasi: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/dispensasi/${id}/cetak-bukti`);
    return data;
  },

  // Riwayat Pembayaran Mahasiswa (with filters)
  getPembayaranList: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    channel?: string;
    tgl_mulai?: string;
    tgl_selesai?: string;
    sort_by?: string;
    sort_order?: string;
    sort_dir?: string;
  }) => {
    // Filter out empty / undefined params
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams[k] = String(v);
        }
      });
    }
    const query = new URLSearchParams(cleanParams).toString();
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pembayaran${query ? `?${query}` : ''}`);
    return data;
  },

  // H2H BTN Syariah (bridge Go): terbitkan billing VA + sinkron terbayar
  terbitkanH2h: async (tagihanId: number | string, force?: boolean) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/tagihan/${tagihanId}/terbitkan-h2h`, { force: !!force });
    return data;
  },

  syncH2h: async (limit?: number) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/h2h/sync', { limit: limit ?? 100 });
    return data;
  },

  getH2hStatus: async () => {
    const { data } = await apiClient.get<ApiResponse<any>>('/v1/sikeu/h2h/status');
    return data;
  },

  // Validasi Pembayaran Publik Real-Time via QR Code
  validatePembayaranPublic: async (kodeTransaksi: string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pembayaran/validasi/${encodeURIComponent(kodeTransaksi)}`);
    return data;
  },

  // Upload bukti transfer manual (mahasiswa) — multipart
  uploadBuktiManual: async (form: FormData) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran/manual-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // Inisiasi transfer manual: kunci nominal + kode unik per tagihan
  manualInit: async (payload: { unit_kas_id: number; items: { tagihan_id: number; jumlah_bayar?: number }[] }) => {
    const { data } = await apiClient.post<ApiResponse<any[]>>('/v1/sikeu/pembayaran/manual-init', payload);
    return data;
  },

  // Verifikasi bukti transfer manual (keuangan)
  approveManual: async (id: number | string, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/pembayaran/${id}/approve-manual`, { catatan });
    return data;
  },

  rejectManual: async (id: number | string, catatan: string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/pembayaran/${id}/reject-manual`, { catatan });
    return data;
  },

  // Payment Gateway Config
  getPaymentGateways: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/payment-gateway');
    return data;
  },

  getActivePaymentGateway: async () => {
    const { data } = await apiClient.get<ApiResponse<any>>('/v1/sikeu/payment-gateway/active');
    return data;
  },

  getPaymentGatewayBalance: async (gatewayName: string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/payment-gateway/${gatewayName}/balance`);
    return data;
  },

  updatePaymentGateway: async (gatewayName: string, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/payment-gateway/${gatewayName}`, payload);
    return data;
  },

  trialMidtransPayment: async (payload: { tagihan_id?: number; nominal?: number; payment_type?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/payment-gateway/midtrans/trial', payload);
    return data;
  },

  // Master Unit Kas
  getUnitKasList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/unit-kas');
    return data;
  },

  storeUnitKas: async (payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/unit-kas', payload);
    return data;
  },

  updateUnitKas: async (id: number, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/unit-kas/${id}`, payload);
    return data;
  },

  deleteUnitKas: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/unit-kas/${id}`);
    return data;
  },

  // Pengajuan Pencairan Kas
  getPengajuanKasList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/pengajuan-kas');
    return data;
  },

  storePengajuanKas: async (payload: any) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pengajuan-kas', payload);
    return data;
  },

  approvePengajuanKas: async (id: number) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/pengajuan-kas/${id}/approve`);
    return data;
  },

  // Dashboard Executive Summary & Live Xendit
  getDashboardSummary: async (params?: { start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/dashboard-summary${qs}`);
    return data;
  },

  // Pengeluaran Kampus
  getPengeluaranList: async (params?: { search?: string; kategori?: string; jenis_pajak?: string; status?: string; page?: number; per_page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.kategori) query.append('kategori', params.kategori);
    if (params?.jenis_pajak) query.append('jenis_pajak', params.jenis_pajak);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pengeluaran?${query.toString()}`);
    return data;
  },

  storePengeluaran: async (payload: {
    kategori: string;
    akun_beban_id?: number;
    nominal: number;
    tanggal_transaksi: string;
    nama_vendor: string;
    npwp_vendor?: string;
    jenis_pajak: string;
    unit_kas_id?: number;
    keterangan?: string;
    file_bukti_bayar?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pengeluaran', payload);
    return data;
  },

  // Pencairan Reward Referral SPMB (invoice masuk dari SPMB)
  getReferralInvoiceList: async (params?: { search?: string; status?: string; page?: number; per_page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/referral-pencairan?${query.toString()}`);
    return data;
  },

  getReferralInvoiceById: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/referral-pencairan/${id}`);
    return data;
  },

  approveReferralInvoice: async (id: number, payload: { aksi: 'approve' | 'reject'; catatan?: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/referral-pencairan/${id}/approve`, payload);
    return data;
  },

  cairkanReferralInvoice: async (id: number, payload: {
    unit_kas_id: number;
    nominal_cair: number;
    akun_beban_id?: number;
    tanggal_bayar?: string;
    nomor_referensi_transfer?: string;
    catatan?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/referral-pencairan/${id}/cairkan`, payload);
    return data;
  },

  // Pajak Kampus & Setor NTPN
  getPajakList: async (params?: { search?: string; jenis?: string; status?: string; page?: number; per_page?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.jenis) query.append('jenis', params.jenis);
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pajak?${query.toString()}`);
    return data;
  },

  setorPajak: async (id: number, payload: { ntpn: string; tanggal_setor?: string; unit_kas_id: number }) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/pajak/${id}/setor`, payload);
    return data;
  },

  getPajakAkunAliases: async (params?: {
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<PajakAkunAlias[]> & { meta?: PaginationMeta; mode?: PajakPelaporanMode }> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<PajakAkunAlias[]> & {
      meta?: PaginationMeta;
      mode?: PajakPelaporanMode;
    }>(`/v1/sikeu/pajak/pelaporan-akun${queryString}`);
    return data;
  },

  updatePajakAkunAlias: async (akunId: number, nama_akun_pajak: string) => {
    const { data } = await apiClient.put<ApiResponse<PajakAkunAlias>>(
      `/v1/sikeu/pajak/pelaporan-akun/${akunId}`,
      { nama_akun_pajak }
    );
    return data;
  },

  updatePajakPelaporanMode: async (mode: PajakPelaporanMode) => {
    const { data } = await apiClient.put<ApiResponse<{ mode: PajakPelaporanMode }>>(
      '/v1/sikeu/pajak/pelaporan-akun/mode',
      { mode }
    );
    return data;
  },

  // Setting Tarif per Angkatan/Prodi/Semester
  getSettingTarifList: async (params?: {
    tahun_angkatan?: number;
    program_studi_id?: number;
    semester?: number;
    jalur_kelas?: string;
    is_active?: boolean;
    include_global?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, String(val));
        }
      });
    }
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/master/setting-tarif?${query.toString()}`);
    return data;
  },

  storeSettingTarif: async (payload: {
    master_biaya_id: number;
    tahun_angkatan: number;
    program_studi_id?: number;
    semester?: number;
    jalur_kelas: string;
    nominal: number;
    is_active?: boolean;
    keterangan?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/master/setting-tarif', payload);
    return data;
  },

  updateSettingTarif: async (id: number, payload: any) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/master/setting-tarif/${id}`, payload);
    return data;
  },

  deleteSettingTarif: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/master/setting-tarif/${id}`);
    return data;
  },

  // Program Studi Reference for SIKEU
  getProgramStudiList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/program-studi');
    return data;
  },

  // Pembayaran Kasir (Offline / Loket Kampus)
  processKasirPayment: async (payload: {
    tagihan_id?: number;
    tagihan_ids?: number[];
    jumlah_bayar: number;
    channel_bayar: 'LOKET_TUNAI' | 'LOKET_TRANSFER';
    potongan?: number;
    alasan_potongan?: string;
    catatan?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran/kasir', payload);
    return data;
  },

  koreksiPembayaran: async (id: number, payload: { alasan_koreksi: string }) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/pembayaran/${id}/koreksi`, payload);
    return data;
  },

  // Daftar Tagihan Mahasiswa (Real Tagihan Index & Detail)
  getTagihanList: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    tahun_angkatan?: number;
    program_studi_id?: number;
    order_by?: string;
    order_direction?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.per_page) query.append('per_page', params.per_page.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.tahun_angkatan) query.append('tahun_angkatan', params.tahun_angkatan.toString());
    if (params?.program_studi_id) query.append('program_studi_id', params.program_studi_id.toString());
    if (params?.order_by) query.append('order_by', params.order_by);
    if (params?.order_direction) query.append('order_direction', params.order_direction);
    const { data } = await apiClient.get<ApiResponse<any[]> & { meta?: PaginationMeta }>(`/v1/sikeu/tagihan?${query.toString()}`);
    return data;
  },

  getTagihanDetail: async (id: number | string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/tagihan/${id}`);
    return data;
  },

  // Ad-hoc Potongan Tambahan pada Tagihan Terbit
  addPotonganTagihan: async (tagihanId: number | string, payload: {
    nama_potongan: string;
    tipe?: string;
    tipe_potongan?: 'nominal' | 'persen';
    nilai_potongan: number;
    keterangan?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/tagihan/${tagihanId}/potongan`, payload);
    return data;
  },

  deletePotonganTagihan: async (potonganId: number | string) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/tagihan/potongan/${potonganId}`);
    return data;
  },

  // Tagihan Belum Lunas Mahasiswa untuk Kasir / Loket (Support Siakad Mahasiswa & SPMB Calon Mahasiswa)
  getStudentUnpaidBills: async (studentId: number | string, isCalon?: boolean, includeLunas?: boolean) => {
    const params = new URLSearchParams();
    if (isCalon) params.append('type', 'calon');
    if (includeLunas) params.append('include_lunas', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const url = `/v1/sikeu/mahasiswa/${studentId}/unpaid-bills${queryString}`;
    const { data } = await apiClient.get<ApiResponse<any>>(url);
    return data;
  },

  // Master Data Helper (Dynamic Entity Reference - Zero Hardcode)
  getAngkatanList: async () => {
    const { data } = await apiClient.get<ApiResponse<number[]>>('/v1/sikeu/master/angkatan-list');
    return data;
  },

  getActiveTahunAkademik: async () => {
    const { data } = await apiClient.get<ApiResponse<any>>('/v1/sikeu/master/tahun-akademik/aktif');
    return data;
  },

  getTahunAkademikList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/tahun-akademik');
    return data;
  },

  // Preview Target Mahasiswa Tagihan Masal
  previewMassTarget: async (params: {
    tahun_angkatan: number;
    jalur_kelas: string;
    program_studi_id?: number;
    kelas?: string;
  }) => {
    const query = new URLSearchParams({
      tahun_angkatan: String(params.tahun_angkatan),
      jalur_kelas: params.jalur_kelas,
      ...(params.program_studi_id ? { program_studi_id: String(params.program_studi_id) } : {}),
      ...(params.kelas ? { kelas: params.kelas } : {}),
    }).toString();
    const { data } = await apiClient.get<ApiResponse<{ total_mahasiswa: number; sample_mahasiswa: any[] }>>(`/v1/sikeu/tagihan/preview-mass-target?${query}`);
    return data;
  },

  // Generate Tagihan Semester Masal
  generateMassTagihan: async (payload: {
    tahun_angkatan: number;
    jalur_kelas: string;
    semester?: number;
    program_studi_id?: number;
    kelas?: string;
    master_biaya_ids?: number[];
    jatuh_tempo: string;
    semester_label?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/tagihan/generate-mass', payload);
    return data;
  },

  // Pengaturan On/Off Skema Golongan UKT
  getUktSetting: async () => {
    const { data } = await apiClient.get<ApiResponse<{ enabled: boolean; description?: string }>>('/v1/sikeu/settings/golongan-ukt');
    return data;
  },

  updateUktSetting: async (enabled: boolean) => {
    const { data } = await apiClient.post<ApiResponse<{ enabled: boolean }>>('/v1/sikeu/settings/golongan-ukt', { enabled });
    return data;
  },

  // Pembayaran Langsung di Kasir Loket (Direct Billing & Payment)
  processDirectCashierPayment: async (payload: {
    mahasiswa_id?: number | null;
    calon_mahasiswa_id?: number | null;
    tipe_referensi?: string;
    items: { master_biaya_id?: number; master_biaya_kode?: string; nominal: number; keterangan?: string }[];
    jumlah_bayar: number;
    potongan?: number;
    alasan_potongan?: string;
    channel_bayar: 'LOKET_TUNAI' | 'LOKET_TRANSFER';
    catatan?: string;
    tahun_akademik_id?: number;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran/direct-cashier', payload);
    return data;
  },

  // ========================================================
  // PEMBAYARAN MAHASISWA - PENGATURAN TARIF KOMPONEN BIAYA
  // ========================================================
  getPembayaranMahasiswaTarifList: async (params?: {
    page?: number;
    per_page?: number;
    master_biaya_id?: number | string;
    tahun_angkatan?: number | string;
    program_studi_id?: number | string;
    semester?: number | string;
    is_active?: boolean | string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    if (params?.master_biaya_id) q.append('master_biaya_id', String(params.master_biaya_id));
    if (params?.tahun_angkatan) q.append('tahun_angkatan', String(params.tahun_angkatan));
    if (params?.program_studi_id) q.append('program_studi_id', String(params.program_studi_id));
    if (params?.semester !== undefined && params?.semester !== '' && params?.semester !== null) q.append('semester', String(params.semester));
    if (params?.is_active !== undefined && params?.is_active !== '') q.append('is_active', String(params.is_active));
    if (params?.search) q.append('search', params.search);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);

    const queryString = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/pembayaran-mahasiswa/tarif${queryString}`);
    return data;
  },

  getPembayaranMahasiswaTarifDetail: async (id: number | string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/tarif/${id}`);
    return data;
  },

  createPembayaranMahasiswaTarif: async (payload: {
    master_biaya_id: number;
    tahun_angkatan: number;
    program_studi_id?: number | null;
    semester?: number | null;
    nominal: number;
    keterangan?: string | null;
    is_active?: boolean;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran-mahasiswa/tarif', payload);
    return data;
  },

  updatePembayaranMahasiswaTarif: async (
    id: number | string,
    payload: {
      master_biaya_id?: number;
      tahun_angkatan?: number;
      program_studi_id?: number | null;
      semester?: number | null;
      nominal?: number;
      keterangan?: string | null;
      is_active?: boolean;
    }
  ) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/tarif/${id}`, payload);
    return data;
  },

  deletePembayaranMahasiswaTarif: async (id: number | string) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/tarif/${id}`);
    return data;
  },

  getPembayaranMahasiswaKatalogBiaya: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/pembayaran-mahasiswa/katalog-biaya');
    return data;
  },

  getPembayaranMahasiswaProdiList: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/pembayaran-mahasiswa/prodi-list');
    return data;
  },

  getPembayaranMahasiswaSummary: async () => {
    const { data } = await apiClient.get<ApiResponse<{
      total_tarif: number;
      total_aktif: number;
      total_komponen_dikonfigurasi: number;
      total_katalog_biaya: number;
    }>>('/v1/sikeu/pembayaran-mahasiswa/summary');
    return data;
  },

  getPembayaranMahasiswaTarifMahasiswa: async (params?: {
    mahasiswa_id?: number | string;
    calon_mahasiswa_id?: number | string;
    tipe_referensi?: string;
    tahun_angkatan?: number;
    program_studi_id?: number;
    semester?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.mahasiswa_id) q.append('mahasiswa_id', String(params.mahasiswa_id));
    if (params?.calon_mahasiswa_id) q.append('calon_mahasiswa_id', String(params.calon_mahasiswa_id));
    if (params?.tipe_referensi) q.append('tipe_referensi', params.tipe_referensi);
    if (params?.tahun_angkatan) q.append('tahun_angkatan', String(params.tahun_angkatan));
    if (params?.program_studi_id) q.append('program_studi_id', String(params.program_studi_id));
    if (params?.semester) q.append('semester', String(params.semester));

    const queryString = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/tarif-mahasiswa${queryString}`);
    return data;
  },

  getPembayaranMahasiswaTagihanList: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    jatuh_tempo_dari?: string;
    jatuh_tempo_sampai?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.jatuh_tempo_dari) q.append('jatuh_tempo_dari', params.jatuh_tempo_dari);
    if (params?.jatuh_tempo_sampai) q.append('jatuh_tempo_sampai', params.jatuh_tempo_sampai);

    const queryString = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/pembayaran-mahasiswa/tagihan${queryString}`);
    return data;
  },

  createPembayaranMahasiswaTagihan: async (payload: {
    mahasiswa_id?: number | null;
    calon_mahasiswa_id?: number | null;
    tipe_referensi?: string;
    semester?: number;
    jatuh_tempo: string;
    catatan?: string;
    items: Array<{
      master_biaya_id: number;
      nominal: number;
      keterangan?: string;
    }>;
    mode_pembayaran: 'terbitkan_tagihan' | 'bayar_loket_tunai' | 'bayar_loket_transfer';
    jumlah_bayar?: number;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran-mahasiswa/tagihan', payload);
    return data;
  },

  previewPembayaranMahasiswaMassTagihan: async (params: {
    tahun_angkatan: number;
    program_studi_id?: number | null;
    semester?: number | null;
    master_biaya_ids?: number[];
    kelas?: string | null;
  }) => {
    const q = new URLSearchParams();
    q.append('tahun_angkatan', String(params.tahun_angkatan));
    if (params.program_studi_id) q.append('program_studi_id', String(params.program_studi_id));
    if (params.semester) q.append('semester', String(params.semester));
    if (params.kelas) q.append('kelas', params.kelas);
    if (params.master_biaya_ids && params.master_biaya_ids.length > 0) {
      params.master_biaya_ids.forEach((id) => q.append('master_biaya_ids[]', String(id)));
    }
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/mass-tagihan/preview?${q.toString()}`);
    return data;
  },

  createPembayaranMahasiswaMassTagihan: async (payload: {
    tahun_angkatan: number;
    program_studi_id?: number | null;
    semester: number;
    jatuh_tempo: string;
    catatan?: string;
    kelas?: string | null;
    items: Array<{
      master_biaya_id: number;
      nominal?: number;
      keterangan?: string;
    }>;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran-mahasiswa/mass-tagihan', payload);
    return data;
  },

  // Potongan Mahasiswa (SIAKAD & SPMB)
  getPembayaranMahasiswaPotonganList: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: string;
    tipe_referensi?: string;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.tipe_referensi) q.append('tipe_referensi', params.tipe_referensi);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);

    const queryString = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]> & { summary?: any }>(`/v1/sikeu/pembayaran-mahasiswa/potongan${queryString}`);
    return data;
  },

  getPembayaranMahasiswaPotonganDetail: async (id: number | string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/potongan/${id}`);
    return data;
  },

  createPembayaranMahasiswaPotongan: async (payload: {
    mahasiswa_id?: number | null;
    calon_mahasiswa_id?: number | null;
    is_calon_mahasiswa?: boolean;
    tipe_referensi?: string;
    nama_potongan: string;
    nomor_sk?: string | null;
    keterangan?: string | null;
    status?: string;
    target_bills: Array<{
      tagihan_id: number;
      nominal_potongan: number;
      mode_potongan?: 'seluruhnya' | 'nominal';
    }>;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran-mahasiswa/potongan', payload);
    return data;
  },

  deletePembayaranMahasiswaPotongan: async (id: number | string) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/potongan/${id}`);
    return data;
  },

  deletePembayaranMahasiswaTagihan: async (id: number | string) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/pembayaran-mahasiswa/tagihan/${id}`);
    return data;
  },

  batchDeletePembayaranMahasiswaTagihan: async (tagihan_ids: number[]) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran-mahasiswa/tagihan/batch-delete', { tagihan_ids });
    return data;
  },

  alihkanPembayaranMahasiswa: async (payload: {
    source_tagihan_id: number;
    target_tagihan_id: number;
    nominal: number;
    alasan: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/pembayaran-mahasiswa/alihkan-pembayaran', payload);
    return data;
  },

  // Koreksi Alokasi Pembayaran (redistribusi alokasi + kekurangan otomatis)
  getKoreksiAlokasiList: async (params?: {
    search?: string;
    status?: string;
    mahasiswa_id?: number;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'all') q.append('status', params.status);
    if (params?.mahasiswa_id) q.append('mahasiswa_id', String(params.mahasiswa_id));
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/koreksi-alokasi${qs}`);
    return data;
  },

  getKoreksiAlokasiKonsolidasi: async (params: { mahasiswa_id?: number; calon_mahasiswa_id?: number }) => {
    const q = new URLSearchParams();
    if (params.mahasiswa_id) q.append('mahasiswa_id', String(params.mahasiswa_id));
    if (params.calon_mahasiswa_id) q.append('calon_mahasiswa_id', String(params.calon_mahasiswa_id));
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/koreksi-alokasi/konsolidasi?${q.toString()}`);
    return data;
  },

  simulateKoreksiAlokasi: async (payload: { details: Array<{ from_tagihan_id: number; to_tagihan_id: number; nominal_dialihkan: number; keterangan?: string }> }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/koreksi-alokasi/simulate', payload);
    return data;
  },

  createKoreksiAlokasiDraft: async (payload: {
    alasan: string;
    referensi?: string;
    tahun_akademik_id?: number;
    semester?: number;
    buat_tagihan_kekurangan?: boolean;
    details: Array<{ from_tagihan_id: number; to_tagihan_id: number; nominal_dialihkan: number; keterangan?: string }>;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/koreksi-alokasi/draft', payload);
    return data;
  },

  getKoreksiAlokasiDetail: async (id: number | string) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/koreksi-alokasi/${id}`);
    return data;
  },

  approveKoreksiAlokasi: async (id: number | string, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/koreksi-alokasi/${id}/approve`, { catatan });
    return data;
  },

  rejectKoreksiAlokasi: async (id: number | string, catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/koreksi-alokasi/${id}/reject`, { catatan });
    return data;
  },

  applyKoreksiAlokasi: async (id: number | string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/koreksi-alokasi/${id}/apply`);
    return data;
  },

  cancelKoreksiAlokasi: async (id: number | string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/koreksi-alokasi/${id}/cancel`);
    return data;
  },

  // Perubahan Prodi / Jenis Pendaftaran
  getPerubahanProdiList: async (params?: { search?: string; status?: string; mahasiswa_id?: number; page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'all') q.append('status', params.status);
    if (params?.mahasiswa_id) q.append('mahasiswa_id', String(params.mahasiswa_id));
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/perubahan-prodi${qs}`);
    return data;
  },

  getPerubahanProdiDampak: async (mahasiswa_id: number) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/perubahan-prodi/dampak?mahasiswa_id=${mahasiswa_id}`);
    return data;
  },

  createPerubahanProdi: async (payload: {
    mahasiswa_id: number;
    new_program_studi_id: number;
    tahun_akademik_id?: number;
    semester_efektif?: number;
    tanggal_efektif?: string;
    jenis_pendaftaran_baru?: string;
    alasan: string;
    referensi_surat?: string;
  }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/perubahan-prodi', payload);
    return data;
  },

  // UMK — Uang Muka Kerja (parity legacy transaksi_umk)
  getUmkList: async (params?: { search?: string; status?: string; unit_kas_id?: number | string; tanggal_awal?: string; tanggal_akhir?: string; sort_by?: string; sort_order?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status && params.status !== 'all') q.append('status', params.status);
    if (params?.unit_kas_id) q.append('unit_kas_id', String(params.unit_kas_id));
    if (params?.tanggal_awal) q.append('tanggal_awal', params.tanggal_awal);
    if (params?.tanggal_akhir) q.append('tanggal_akhir', params.tanggal_akhir);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/umk${qs}`);
    return data;
  },

  createUmk: async (payload: { unit_kas_id?: number | null; nama_penerima: string; tanggal: string; tanggal_selesai?: string | null; keterangan?: string; total: number }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/umk', payload);
    return data;
  },

  getUmkDetail: async (id: number) => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/umk/${id}`);
    return data;
  },

  updateUmk: async (id: number, payload: { unit_kas_id?: number | null; nama_penerima?: string; tanggal?: string; tanggal_selesai?: string | null; keterangan?: string; total?: number }) => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/v1/sikeu/umk/${id}`, payload);
    return data;
  },

  updateUmkStatus: async (id: number, payload: { status: 'aktif' | 'selesai'; tanggal_selesai?: string | null }) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/umk/${id}/status`, payload);
    return data;
  },

  deleteUmk: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/umk/${id}`);
    return data;
  },

  // Tutup Kas per Unit (parity legacy tutup_bukus divisi)
  getTutupKasList: async (params?: { unit_kas_id?: number | string; tanggal?: string; search?: string; sort_by?: string; sort_order?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.unit_kas_id) q.append('unit_kas_id', String(params.unit_kas_id));
    if (params?.tanggal) q.append('tanggal', params.tanggal);
    if (params?.search) q.append('search', params.search);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/tutup-kas${qs}`);
    return data;
  },

  createTutupKas: async (payload: { unit_kas_id: number; tanggal: string; saldo_awal?: number; saldo_masuk?: number; saldo_keluar?: number; saldo_akhir?: number }) => {
    const { data } = await apiClient.post<ApiResponse<any>>('/v1/sikeu/tutup-kas', payload);
    return data;
  },

  deleteTutupKas: async (id: number) => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/v1/sikeu/tutup-kas/${id}`);
    return data;
  },

  // Laporan Bendahara (parity legacy menuLaporan, basis kas)
  getLaporanSaldoHarian: async (params: { tanggal: string; unit_kas_id?: number | string; metode?: string }) => {
    const q = new URLSearchParams({ tanggal: params.tanggal });
    if (params?.unit_kas_id) q.append('unit_kas_id', String(params.unit_kas_id));
    if (params?.metode) q.append('metode', params.metode);
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/laporan-bendahara/saldo-harian?${q.toString()}`);
    return data;
  },

  getLaporanHarian: async (params: { tanggal: string; unit_kas_id?: number | string; metode?: string; search?: string; sort_by?: string; sort_order?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams({ tanggal: params.tanggal });
    if (params?.unit_kas_id) q.append('unit_kas_id', String(params.unit_kas_id));
    if (params?.metode) q.append('metode', params.metode);
    if (params?.search) q.append('search', params.search);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/laporan-bendahara/harian?${q.toString()}`);
    return data;
  },

  getLaporanBulanan: async (params: { tanggal: string; unit_kas_id?: number | string; metode?: string; search?: string; sort_by?: string; sort_order?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams({ tanggal: params.tanggal });
    if (params?.unit_kas_id) q.append('unit_kas_id', String(params.unit_kas_id));
    if (params?.metode) q.append('metode', params.metode);
    if (params?.search) q.append('search', params.search);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const { data } = await apiClient.get<ApiResponse<any>>(`/v1/sikeu/laporan-bendahara/bulanan?${q.toString()}`);
    return data;
  },

  getLaporanPeriodik: async (params: { awal: string; akhir: string; code?: string; only_mhs?: boolean; search?: string; sort_by?: string; sort_order?: string; page?: number; per_page?: number }) => {
    const q = new URLSearchParams({ awal: params.awal, akhir: params.akhir });
    if (params?.code) q.append('code', params.code);
    if (params?.only_mhs) q.append('only_mhs', '1');
    if (params?.search) q.append('search', params.search);
    if (params?.sort_by) q.append('sort_by', params.sort_by);
    if (params?.sort_order) q.append('sort_order', params.sort_order);
    if (params?.page) q.append('page', String(params.page));
    if (params?.per_page) q.append('per_page', String(params.per_page));
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/laporan-bendahara/periodik?${q.toString()}`);
    return data;
  },

  getLaporanPerAkun: async (params: { awal: string; akhir: string; code?: string }) => {
    const q = new URLSearchParams({ awal: params.awal, akhir: params.akhir });
    if (params?.code) q.append('code', params.code);
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/v1/sikeu/laporan-bendahara/perakun?${q.toString()}`);
    return data;
  },

  downloadLaporanBendaharaExcel: async (params: { jenis: string; tanggal?: string; awal?: string; akhir?: string; unit_kas_id?: number | string; metode?: string; code?: string }) => {
    const q = new URLSearchParams({ jenis: params.jenis });
    if (params?.tanggal) q.append('tanggal', params.tanggal);
    if (params?.awal) q.append('awal', params.awal);
    if (params?.akhir) q.append('akhir', params.akhir);
    if (params?.unit_kas_id) q.append('unit_kas_id', String(params.unit_kas_id));
    if (params?.metode) q.append('metode', params.metode);
    if (params?.code) q.append('code', params.code);
    const res = await apiClient.get<Blob>(`/v1/sikeu/laporan-bendahara/export-excel?${q.toString()}`, {
      responseType: 'blob',
    });
    const blob = res.data;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Bendahara_${params.jenis}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
