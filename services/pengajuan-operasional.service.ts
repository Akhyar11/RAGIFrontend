import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

export interface PengajuanItemPayload {
  nama_barang: string;
  qty: number;
  satuan?: string;
  harga_satuan: number;
  keterangan?: string;
}

export interface PengajuanOperasional {
  id: number;
  nomor_pengajuan: string;
  judul_pengajuan: string;
  deskripsi: string;
  kategori_pengajuan: 'pengadaan_barang' | 'non_barang';
  fakultas_id: number;
  ruangan_id?: number | null;
  unit_kas_id: number;
  nominal_diajukan: number;
  nominal_disetujui: number;
  total_realisasi: number;
  sisa_nominal: number;
  status: string;
  catatan_penolakan?: string | null;
  kanal?: string | null;
  referensi_eksternal?: string | null;
  sumber_type?: string | null;
  sumber_id?: string | null;
  jenis_pengajuan?: 'operasional' | 'kegiatan' | 'reimbursement' | 'sarpras' | 'lainnya';
  parent_pengajuan_id?: number | null;
  parent?: PengajuanOperasional | null;
  reimbursements?: PengajuanOperasional[];
  nama_bank_penerima?: string | null;
  nomor_rekening_penerima?: string | null;
  nama_rekening_penerima?: string | null;
  fakultas?: { id: number; nama: string; kode: string };
  ruangan?: { id: number; nama: string; kode: string };
  unit_kas?: { id: number; nama_kas: string };
  items?: PengajuanItemPayload[] & { subtotal?: number }[];
  surat_tugas?: {
    id: number;
    nomor_surat?: string;
    nama_kegiatan: string;
    lokasi_tujuan: string;
    tanggal_berangkat: string;
    tanggal_kembali: string;
    estimasi_biaya?: number;
    nominal_disetujui?: number;
    biaya_realisasi?: number;
    sisa_nominal?: number;
    nama_bank?: string | null;
    nomor_rekening?: string | null;
    nama_rekening?: string | null;
    status_pencairan?: string;
    file_surat_tugas?: string;
    file_surat_tugas_url?: string;
    file_lpj?: string;
    file_lpj_url?: string;
    pegawai?: {
      id: number;
      nama_lengkap: string;
      nip?: string;
      nama_bank?: string | null;
      bank_nama?: string | null;
      nomor_rekening?: string | null;
      nama_rekening?: string | null;
      unit_kerja?: { id: number; nama: string };
    };
  };
  bukti_pencairan_path?: string;
  bukti_pencairan_url?: string;
  tanggal_pencairan?: string;
  history_approval?: any[];
  created_at?: string;
}

export const pengajuanOperasionalService = {
  list: async (params?: { search?: string; status?: string; status_in?: string; kategori?: string; jenis_pengajuan?: string; parent_pengajuan_id?: number | string; tab?: string; sumber?: string; dari?: string; sampai?: string; belum_cair?: boolean; butuh_reimburse?: boolean; belum_diajukan_reimburse?: boolean; page?: number; per_page?: number }) => {
    const { data } = await apiClient.get<ApiResponse<PengajuanOperasional[]>>('/v1/sikeu/pengajuan-operasional', { params });
    return data;
  },

  detail: async (id: number | string) => {
    const { data } = await apiClient.get<ApiResponse<PengajuanOperasional>>(`/v1/sikeu/pengajuan-operasional/${id}`);
    return data;
  },

  setujuiPanjarSimpeg: async (id: number | string, payload: { unit_kas_id: number; nominal_disetujui: number; catatan?: string }) => {
    const { data } = await apiClient.post<ApiResponse<PengajuanOperasional>>(
      `/v1/sikeu/pengajuan-operasional/${id}/setujui-panjar-simpeg`,
      payload
    );
    return data;
  },

  tutupLpjSimpeg: async (
    id: number | string,
    payload?: FormData | { catatan?: string; nominal_pelunasan?: number; file_bukti_pelunasan?: File }
  ) => {
    let reqData: any = payload || {};
    const headers: Record<string, string> = {};

    if (payload instanceof FormData) {
      reqData = payload;
      headers['Content-Type'] = 'multipart/form-data';
    }

    const { data } = await apiClient.post<ApiResponse<PengajuanOperasional>>(
      `/v1/sikeu/pengajuan-operasional/${id}/tutup-lpj-simpeg`,
      reqData,
      { headers }
    );
    return data;
  },

  create: async (form: FormData) => {
    const { data } = await apiClient.post<ApiResponse<PengajuanOperasional>>('/v1/sikeu/pengajuan-operasional', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  approve: async (
    id: number | string,
    aksi: 'approve' | 'reject',
    catatan?: string,
    extra?: { unit_kas_id?: number; nominal_disetujui?: number }
  ) => {
    const { data } = await apiClient.post<ApiResponse<PengajuanOperasional>>(
      `/v1/sikeu/pengajuan-operasional/${id}/approve`,
      { aksi, catatan, ...extra }
    );
    return data;
  },

  pencairan: async (id: number | string, form: FormData) => {
    const { data } = await apiClient.post<ApiResponse<PengajuanOperasional>>(
      `/v1/sikeu/pengajuan-operasional/${id}/pencairan`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  simpanLpj: async (id: number | string, form: FormData) => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      `/v1/sikeu/pengajuan-operasional/${id}/lpj`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  ajukanReimburse: async (id: number | string, form: FormData) => {
    const { data } = await apiClient.post<ApiResponse<PengajuanOperasional>>(
      `/v1/sikeu/pengajuan-operasional/${id}/reimburse`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  verifikasiLpj: async (lpjId: number | string, aksi: 'approve' | 'reject', catatan?: string) => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/v1/sikeu/lpj/${lpjId}/verifikasi`, { aksi, catatan });
    return data;
  },

  listFakultas: async () => {
    const { data } = await apiClient.get<ApiResponse<{ id: number; kode: string; nama: string }[]>>('/v1/sikeu/referensi/fakultas');
    return data;
  },

  listRuangan: async () => {
    const { data } = await apiClient.get<ApiResponse<{ id: number; kode: string; nama: string }[]>>('/v1/sikeu/referensi/ruangan');
    return data;
  },

  listUnitKas: async () => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/v1/sikeu/master/unit-kas');
    return data;
  },

  listKategori: async () => {
    const { data } = await apiClient.get<ApiResponse<{ id: string; nama: string }[]>>('/v1/sikeu/referensi/kategori-pengajuan');
    return data;
  },
};
