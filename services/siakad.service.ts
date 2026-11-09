import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { buildExportFile } from '@/lib/download';
import type {
  BankSoal,
  BankSoalBulkDeleteResult,
  BankSoalBulkMoveResult,
  BankSoalImportResult,
  BankSoalPayload,
} from '@/types/bank-soal.types';

/**
 * Payload terketik untuk fitur Bimbingan PA.
 * Nilai `mode`/`status`/`jenis`/`eskalasi_tujuan`/`konseling_ke` mengacu pada
 * `kode` master referensi (spmb_master_referensi, modul=siakad, tipe=pa_*)
 * sehingga tetap stabil dan tidak berupa label tampilan.
 */
export interface PaJadwalPayload {
  tanggal: string;
  jam_mulai: string;
  jam_selesai: string;
  mode: string;
  lokasi?: string | null;
  kuota: number;
  catatan?: string | null;
}

export interface PaPklPayload {
  mahasiswa_id: number;
  tahun_akademik_id?: number | null;
  jenis: string;
  instansi: string;
  lokasi?: string | null;
  pembimbing_lapangan?: string | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  status?: string | null;
  catatan?: string | null;
}

export interface PaInsidenPayload {
  jenis: string;
  tingkat?: string | null;
  deskripsi: string;
  tanggal_kejadian?: string | null;
  lokasi?: string | null;
  anonim?: boolean;
  mahasiswa_id?: number | null;
}

export const siakadService = {
  // Dashboard & Metrics
  getDashboardSummary: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/dashboard/summary');
    return response.data;
  },

  // Tahun Akademik
  getTahunAkademiks: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/tahun-akademik', { params });
    return response.data;
  },

  storeTahunAkademik: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/tahun-akademik', payload);
    return response.data;
  },

  updateTahunAkademik: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/tahun-akademik/${id}`, payload);
    return response.data;
  },

  setActiveTahunAkademik: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/akademik/tahun-akademik/${id}/set-active`);
    return response.data;
  },

  // Skala Nilai Mutu
  getSkalaNilais: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/skala-nilai', { params });
    return response.data;
  },

  createSkalaNilai: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/skala-nilai', payload);
    return response.data;
  },

  updateSkalaNilai: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/skala-nilai/${id}`, payload);
    return response.data;
  },

  deleteSkalaNilai: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/skala-nilai/${id}`);
    return response.data;
  },

  // Prasyarat Mata Kuliah
  getPrasyaratMks: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/prasyarat-mk', { params });
    return response.data;
  },

  createPrasyaratMk: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/prasyarat-mk', payload);
    return response.data;
  },

  deletePrasyaratMk: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/prasyarat-mk/${id}`);
    return response.data;
  },

  // Referensi Opsi Master Akademik (pengganti literal: jenjang, akreditasi, tipe MK, dsb.)
  getReferensiOptions: async (tipe: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/referensi-options', { params: { tipe } });
    return response.data;
  },

  // Mahasiswa
  getMahasiswas: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/mahasiswa', { params });
    return response.data;
  },

  getMahasiswaDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/mahasiswa/${id}`);
    return response.data;
  },

  createMahasiswa: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa', payload);
    return response.data;
  },

  updateMahasiswa: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/mahasiswa/${id}`, payload);
    return response.data;
  },

  deleteMahasiswa: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/mahasiswa/${id}`);
    return response.data;
  },

  generateNim: async (payload: {
    program_studi_id: number;
    angkatan: number;
    nama_lengkap: string;
    jenis_kelamin: string;
    id?: number;
    custom_nim?: string;
    use_no_pendaftaran?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/generate-nim', payload);
    return response.data;
  },

  generateMissingNims: async (params?: { scheme?: 'standard' | 'no_pendaftaran' }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/generate-missing-nims', params);
    return response.data;
  },

  exportNimData: async (params?: any): Promise<Blob> => {
    const response = await apiClient.get('/v1/siakad/mahasiswa/export-nim', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  exportBukuInduk: async (params?: { program_studi_id?: number | string; angkatan?: number | string; status?: string }): Promise<Blob> => {
    const response = await apiClient.get('/v1/siakad/mahasiswa/export-buku-induk', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  updateMahasiswaStatus: async (id: number, payload: { status: string; alasan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/mahasiswa/${id}/status`, payload);
    return response.data;
  },

  bulkUpdateMahasiswaStatus: async (payload: { ids: number[]; status: string; alasan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/bulk-status', payload);
    return response.data;
  },

  // Bimbingan PA
  getMyPa: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/my-pa');
    return response.data;
  },

  getPaRekap: async (params?: { dosen_id?: number; program_studi_id?: number; dari_tanggal?: string; sampai_tanggal?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/rekap', { params });
    return response.data;
  },

  // ===== Bimbingan PA — payload terketik (Fase 1 & 2) =====
  getPaAdvisees: async (params?: { dosen_id?: number; search?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/advisees', { params });
    return response.data;
  },

  // Monitoring Bimbingan PA (Fase 1): kehadiran, prestasi, risiko, alerts
  getPaKehadiran: async (params?: { dosen_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/kehadiran', { params });
    return response.data;
  },

  getPaPrestasi: async (params?: { dosen_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/prestasi', { params });
    return response.data;
  },

  getPaRisiko: async (params?: { dosen_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/risiko', { params });
    return response.data;
  },

  getPaAlerts: async (params?: { dosen_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/alerts', { params });
    return response.data;
  },

  // Fase 2 — Jadwal & Konsultasi PA
  getPaJadwal: async (params?: { dosen_id?: number; dari?: string; sampai?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/jadwal', { params });
    return response.data;
  },

  createPaJadwal: async (payload: PaJadwalPayload): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/bimbingan/jadwal', payload);
    return response.data;
  },

  updatePaJadwal: async (id: number, payload: Partial<PaJadwalPayload> & { status?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/bimbingan/jadwal/${id}`, payload);
    return response.data;
  },

  deletePaJadwal: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/bimbingan/jadwal/${id}`);
    return response.data;
  },

  getPaBooking: async (params?: { dosen_id?: number; status?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/booking', { params });
    return response.data;
  },

  prosesPaBooking: async (id: number, payload: { status: string; catatan_dosen?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/bimbingan/booking/${id}/proses`, payload);
    return response.data;
  },

  getMyPaJadwal: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/my-jadwal');
    return response.data;
  },

  ajukanPaBooking: async (jadwalId: number, payload: { topik?: string; catatan_mahasiswa?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/bimbingan/jadwal/${jadwalId}/ajukan`, payload);
    return response.data;
  },

  // Fase 2 — Status PKL/PL/Magang
  getPaPkl: async (params?: { dosen_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/pkl', { params });
    return response.data;
  },

  createPaPkl: async (payload: PaPklPayload): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/bimbingan/pkl', payload);
    return response.data;
  },

  updatePaPkl: async (id: number, payload: Partial<PaPklPayload> & { status?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/bimbingan/pkl/${id}`, payload);
    return response.data;
  },

  deletePaPkl: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/bimbingan/pkl/${id}`);
    return response.data;
  },

  // Fase 2 — Insiden (kekerasan/pelecehan) + konseling + eskalasi
  getPaInsiden: async (params?: { status?: string; jenis?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/insiden', { params });
    return response.data;
  },

  createPaInsiden: async (payload: PaInsidenPayload): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/bimbingan/insiden', payload);
    return response.data;
  },

  eskalasiPaInsiden: async (id: number, payload: { eskalasi_tujuan: string; catatan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/bimbingan/insiden/${id}/eskalasi`, payload);
    return response.data;
  },

  rujukPaKonseling: async (id: number, payload: { konseling_ke: string; catatan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/bimbingan/insiden/${id}/konseling`, payload);
    return response.data;
  },

  updatePaInsiden: async (id: number, payload: Partial<PaInsidenPayload> & { status?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/bimbingan/insiden/${id}`, payload);
    return response.data;
  },

  // Fase 2 — Laporan monitoring bulanan
  getPaLaporanBulanan: async (params: { bulan: string; dosen_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/laporan-bulanan', { params });
    return response.data;
  },

  getPaCatatan: async (params?: { dosen_id?: number; mahasiswa_id?: number; hanya_khusus?: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/catatan', { params });
    return response.data;
  },

  createPaCatatan: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/bimbingan/catatan', payload);
    return response.data;
  },

  updatePaCatatan: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/bimbingan/catatan/${id}`, payload);
    return response.data;
  },

  deletePaCatatan: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/bimbingan/catatan/${id}`);
    return response.data;
  },

  getPaLaporan: async (params?: { dosen_id?: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/laporan', { params });
    return response.data;
  },

  savePaLaporan: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/bimbingan/laporan', payload);
    return response.data;
  },

  // Aktivitas Bimbingan PA per Kelas (Model SIMPA Indonusa)
  getPaAktivitas: async (params?: { dosen_id?: number; tahun_akademik_id?: number; kelas?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/aktivitas', { params });
    return response.data;
  },

  getPaKomposisiKelas: async (params?: { dosen_id?: number; kelas?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/bimbingan/aktivitas/komposisi', { params });
    return response.data;
  },

  savePaAktivitas: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/bimbingan/aktivitas', payload);
    return response.data;
  },

  deletePaAktivitas: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/bimbingan/aktivitas/${id}`);
    return response.data;
  },

  importNimData: async (formData: FormData): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/import-nim', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  syncMahasiswaFromSpmb: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/sync-from-spmb');
    return response.data;
  },

  // Profil & Biodata Mahasiswa (Self-Service & Neo Feeder)
  getMahasiswaProfil: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/mahasiswa/profil', { params });
    return response.data;
  },

  updateMahasiswaProfil: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put('/v1/siakad/mahasiswa/profil', payload);
    return response.data;
  },

  syncMahasiswaProfilToFeeder: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/profil/sync-feeder', params);
    return response.data;
  },

  // Konversi Transfer
  getKonversis: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/mahasiswa/konversi', { params });
    return response.data;
  },

  createKonversi: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/konversi', payload);
    return response.data;
  },

  getKonversiDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/mahasiswa/konversi/${id}`);
    return response.data;
  },

  updateKonversi: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/mahasiswa/konversi/${id}`, payload);
    return response.data;
  },

  deleteKonversi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/mahasiswa/konversi/${id}`);
    return response.data;
  },

  updateKonversiStatus: async (id: number, payload: { status: string; catatan?: string; details?: { id: number; status: string; catatan_penolakan?: string }[] }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/mahasiswa/konversi/${id}/status`, payload);
    return response.data;
  },

  bulkUpdateKonversiStatus: async (payload: { ids: number[]; status: string; catatan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/konversi/bulk-status', payload);
    return response.data;
  },

  bulkAssignPa: async (payload: { mahasiswa_ids: number[]; dosen_wali_id: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/bulk-assign-pa', payload);
    return response.data;
  },

  autoDistributePa: async (payload: { dosen_ids: number[]; program_studi_id?: number; angkatan?: number; kelas?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/auto-distribute-pa', payload);
    return response.data;
  },

  assignPaKelas: async (payload: { kelas: string; program_studi_id?: number; dosen_wali_id: number; hanya_belum_punya_pa?: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/mahasiswa/assign-pa-kelas', payload);
    return response.data;
  },

  // Fakultas & Program Studi CRUD
  getFakultas: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/fakultas', { params });
    return response.data;
  },

  createFakultas: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/fakultas', payload);
    return response.data;
  },

  updateFakultas: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/fakultas/${id}`, payload);
    return response.data;
  },

  deleteFakultas: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/fakultas/${id}`);
    return response.data;
  },

  getProdi: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/prodi', { params });
    return response.data;
  },

  createProdi: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/prodi', payload);
    return response.data;
  },

  updateProdi: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/prodi/${id}`, payload);
    return response.data;
  },

  deleteProdi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/prodi/${id}`);
    return response.data;
  },

  // Admin OBE / Tim Kurikulum Prodi
  getAdminProdi: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/admin-prodi', { params });
    return response.data;
  },

  createAdminProdi: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/admin-prodi', payload);
    return response.data;
  },

  updateAdminProdi: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/admin-prodi/${id}`, payload);
    return response.data;
  },

  deleteAdminProdi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/admin-prodi/${id}`);
    return response.data;
  },

  impersonateAdminProdi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/akademik/admin-prodi/${id}/impersonate`);
    return response.data;
  },

  getAdminObeEligibleRoles: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/admin-obe-roles');
    return response.data;
  },

  getAdminObeRoleMenus: async (roleId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/akademik/admin-obe-role-menus/${roleId}`);
    return response.data;
  },

  assignAdminObeRoleMenus: async (roleId: number, menuIds: number[]): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/akademik/admin-obe-role-menus/${roleId}`, { menu_ids: menuIds });
    return response.data;
  },

  // Kurikulum
  getKurikulums: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/kurikulum', { params });
    return response.data;
  },

  createKurikulum: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/kurikulum', payload);
    return response.data;
  },

  updateKurikulum: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/kurikulum/${id}`, payload);
    return response.data;
  },

  deleteKurikulum: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/kurikulum/${id}`);
    return response.data;
  },

  // Mata Kuliah
  getMataKuliahs: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/matakuliah', { params });
    return response.data;
  },

  createMataKuliah: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/matakuliah', payload);
    return response.data;
  },

  updateMataKuliah: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/matakuliah/${id}`, payload);
    return response.data;
  },

  deleteMataKuliah: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/matakuliah/${id}`);
    return response.data;
  },

  // Dosen
  getDosens: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/akademik/dosen', { params });
    return response.data;
  },

  createDosen: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/akademik/dosen', payload);
    return response.data;
  },

  updateDosen: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/akademik/dosen/${id}`, payload);
    return response.data;
  },

  deleteDosen: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/akademik/dosen/${id}`);
    return response.data;
  },

  // Perkuliahan & Kelas
  getRefRuangan: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/ref/ruangan', { params });
    return response.data;
  },

  getKelas: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/kelas', { params });
    return response.data;
  },

  createKelas: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/kelas', payload);
    return response.data;
  },

  getKelasDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/perkuliahan/kelas/${id}`);
    return response.data;
  },

  updateKelas: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/perkuliahan/kelas/${id}`, payload);
    return response.data;
  },

  deleteKelas: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/perkuliahan/kelas/${id}`);
    return response.data;
  },

  // KRS API
  getKrs: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs', { params });
    return response.data;
  },

  getKrsMonitoring: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs/monitoring', { params });
    return response.data;
  },

  getActiveKrs: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs/active', { params });
    return response.data;
  },

  getAvailableClasses: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs/available-classes', { params });
    return response.data;
  },

  addClassToKrs: async (payload: { kelas_id: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/add-class', payload);
    return response.data;
  },

  dropClassFromKrs: async (detailId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/perkuliahan/krs/drop-class/${detailId}`);
    return response.data;
  },

  submitKrs: async (payload?: { tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/submit', payload);
    return response.data;
  },

  reopenKrs: async (payload?: { tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/reopen', payload);
    return response.data;
  },

  approveKrs: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/perkuliahan/krs/${id}/approve`);
    return response.data;
  },

  bulkApproveKrs: async (krsIds: number[]): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/bulk-approve', { krs_ids: krsIds });
    return response.data;
  },

  // Paket MK per Rombel & Hak Akses KRS
  getPaketMk: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/paket-mk', { params });
    return response.data;
  },

  getPaketMkList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/paket-mk', { params });
    return response.data;
  },

  getMataKuliahByRombelHistory: async (params: { master_kelas_id: number; tahun_akademik_id?: number | null }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/paket-mk/riwayat-rombel', { params });
    return response.data;
  },

  createPaketMk: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/paket-mk', payload);
    return response.data;
  },

  bulkSyncPaketMk: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/paket-mk/bulk-sync', payload);
    return response.data;
  },

  updatePaketMk: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/perkuliahan/paket-mk/${id}`, payload);
    return response.data;
  },

  deletePaketMk: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/perkuliahan/paket-mk/${id}`);
    return response.data;
  },

  getPaketSaya: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs/paket-saya', { params });
    return response.data;
  },

  ambilPaketKrs: async (payload?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/ambil-paket', payload);
    return response.data;
  },

  getHakaksesKrs: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs/hakakses', { params });
    return response.data;
  },

  getHakaksesList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/krs/hakakses', { params });
    return response.data;
  },

  setHakaksesKrs: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/hakakses', payload);
    return response.data;
  },

  setHakaksesRombel: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/krs/hakakses-rombel', payload);
    return response.data;
  },

  // Nilai & Transkrip
  getNilai: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/nilai', { params });
    return response.data;
  },

  updateNilai: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/perkuliahan/nilai/${id}`, payload);
    return response.data;
  },

  getTranskrip: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/transkrip', { params });
    return response.data;
  },

  // OBE (Outcome-Based Education)
  getCpls: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/cpl', { params });
    return response.data;
  },

  deleteCpl: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/cpl/${id}`);
    return response.data;
  },

  getCpl: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/cpl', { params });
    return response.data;
  },

  storeCpl: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/cpl', payload);
    return response.data;
  },

  updateCpl: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/cpl/${id}`, payload);
    return response.data;
  },

  getCpmk: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/cpmk', { params });
    return response.data;
  },

  storeCpmk: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/cpmk', payload);
    return response.data;
  },

  getSubCpmk: async (params?: { cpmk_id?: number; mata_kuliah_id?: number; search?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/sub-cpmk', { params });
    return response.data;
  },

  storeSubCpmk: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/sub-cpmk', payload);
    return response.data;
  },

  deleteSubCpmk: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/sub-cpmk/${id}`);
    return response.data;
  },

  getKelasKomponenObe: async (kelasId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/obe/kelas/${kelasId}/komponen`);
    return response.data;
  },

  storeKelasKomponenObe: async (kelasId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/kelas/${kelasId}/komponen`, payload);
    return response.data;
  },

  deleteKelasKomponenObe: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/komponen/${id}`);
    return response.data;
  },

  syncKelasKomponenFromObe: async (kelasId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/kelas/${kelasId}/sync-komponen-obe`);
    return response.data;
  },

  getKelasNilaiObe: async (kelasId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/obe/kelas/${kelasId}/nilai`);
    return response.data;
  },

  saveKelasNilaiObe: async (kelasId: number, payload: { krs_detail_id: number; scores: Record<number, number>; is_final?: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/kelas/${kelasId}/nilai`, payload);
    return response.data;
  },

  getObeDashboard: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/dashboard', { params });
    return response.data;
  },

  getObeSettings: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/settings');
    return response.data;
  },

  updateObeSettings: async (payload: {
    tahun_akademik_id: number;
    semester: string;
    kurikulum_id: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/settings', payload);
    return response.data;
  },

  getAturanSks: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/aturan-sks', { params: { all: true, ...params } });
    return response.data;
  },

  saveAturanSks: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/aturan-sks', payload);
    return response.data;
  },

  updateAturanSks: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/aturan-sks/${id}`, payload);
    return response.data;
  },

  deleteAturanSks: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/aturan-sks/${id}`);
    return response.data;
  },

  getRps: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/rps', { params });
    return response.data;
  },

  showRps: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/obe/rps/${id}`);
    return response.data;
  },

  storeRps: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/rps', payload);
    return response.data;
  },

  deleteRps: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/rps/${id}`);
    return response.data;
  },

  listRpsSesi: async (rpsId: number, params?: { page?: number; per_page?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/obe/rps/${rpsId}/sesi`, { params });
    return response.data;
  },

  storeRpsSesi: async (rpsId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/rps/${rpsId}/sesi`, payload);
    return response.data;
  },

  deleteRpsSesi: async (sesiId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/rps-sesi/${sesiId}`);
    return response.data;
  },

  toggleDosenBisaEditRps: async (id: number, dosen_bisa_edit: boolean): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/obe/rps/${id}/toggle-dosen-edit`, { dosen_bisa_edit });
    return response.data;
  },

  duplicateRps: async (id: number, payload: { tahun_ajaran: string; semester?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/rps/${id}/duplicate`, payload);
    return response.data;
  },

  getSoalList: async (params?: {
    search?: string;
    rps_id?: number;
    rps_mingguan_id?: number;
    kategori_id?: number;
    tipe_soal?: string;
    tingkat_kesulitan?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/soal', { params });
    return response.data;
  },

  getSoalDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/obe/soal/${id}`);
    return response.data;
  },

  saveSoal: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/soal', payload);
    return response.data;
  },

  updateSoal: async (id: number, payload: BankSoalPayload): Promise<ApiResponse<BankSoal>> => {
    const response = await apiClient.put(`/v1/siakad/obe/soal/${id}`, payload);
    return response.data;
  },

  deleteSoal: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/soal/${id}`);
    return response.data;
  },

  /** Import bank soal dari file XLSX/CSV. */
  importSoal: async (payload: {
    file: File;
    rps_id: number;
    rps_mingguan_id?: number | null;
    sub_cpmk_id?: number | null;
    kategori_id?: number | null;
    tingkat_kesulitan?: string | null;
  }): Promise<ApiResponse<BankSoalImportResult>> => {
    const form = new FormData();
    form.append('file', payload.file);
    form.append('rps_id', String(payload.rps_id));
    if (payload.rps_mingguan_id) form.append('rps_mingguan_id', String(payload.rps_mingguan_id));
    if (payload.sub_cpmk_id) form.append('sub_cpmk_id', String(payload.sub_cpmk_id));
    if (payload.kategori_id) form.append('kategori_id', String(payload.kategori_id));
    if (payload.tingkat_kesulitan) form.append('tingkat_kesulitan', payload.tingkat_kesulitan);

    const response = await apiClient.post('/v1/siakad/obe/soal/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Unduh template import bank soal (XLSX). */
  downloadTemplateSoal: async (): Promise<{ blob: Blob; filename: string }> => {
    const response = await apiClient.get('/v1/siakad/obe/soal/import/template', { responseType: 'blob' });
    return buildExportFile(
      response.data,
      response.headers?.['content-disposition'],
      'template-import-bank-soal.xlsx'
    );
  },

  /** Hapus banyak bank soal sekaligus. */
  bulkDeleteSoal: async (ids: number[]): Promise<ApiResponse<BankSoalBulkDeleteResult>> => {
    const response = await apiClient.post('/v1/siakad/obe/soal/bulk-delete', { ids });
    return response.data;
  },

  /** Pindahkan banyak bank soal (kategori / RPS mingguan / Sub-CPMK). */
  bulkMoveSoal: async (
    ids: number[],
    payload: { kategori_id?: number | null; rps_mingguan_id?: number | null; sub_cpmk_id?: number | null }
  ): Promise<ApiResponse<BankSoalBulkMoveResult>> => {
    const response = await apiClient.post('/v1/siakad/obe/soal/bulk-move', { ids, ...payload });
    return response.data;
  },

  getSoalKategori: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/soal-kategori', { params });
    return response.data;
  },

  saveKategori: async (payload: { nama: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/soal-kategori', payload);
    return response.data;
  },

  deleteKategori: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/soal-kategori/${id}`);
    return response.data;
  },

  saveOpsi: async (
    soalId: number,
    payload: { teks: string; gambar_path?: string | null; is_benar: boolean; urutan?: number }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/soal/${soalId}/opsi`, payload);
    return response.data;
  },

  deleteOpsi: async (soalId: number, opsiId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/soal/${soalId}/opsi/${opsiId}`);
    return response.data;
  },

  downloadRekapXlsx: async (kelasId: number): Promise<Blob> => {
    const response = await apiClient.get(`/v1/siakad/obe/kelas/${kelasId}/rekap-xlsx`, { responseType: 'blob' });
    return response.data;
  },

  submitRps: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/rps/${id}/submit`);
    return response.data;
  },

  approveRps: async (id: number, payload: { status: 'disetujui' | 'revisi'; catatan_revisi?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/obe/rps/${id}/approve`, payload);
    return response.data;
  },

  getMahasiswaPortofolioObe: async (mahasiswaId?: number | string): Promise<ApiResponse<any>> => {
    const url = mahasiswaId ? `/v1/siakad/obe/mahasiswa/${mahasiswaId}/portofolio` : '/v1/siakad/obe/mahasiswa/portofolio';
    const response = await apiClient.get(url);
    return response.data;
  },

  // Profil Lulusan & Bahan Kajian (OBE)
  getProfilLulusans: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/profil-lulusan', { params });
    return response.data;
  },

  storeProfilLulusan: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/profil-lulusan', payload);
    return response.data;
  },

  deleteProfilLulusan: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/profil-lulusan/${id}`);
    return response.data;
  },

  mapProfilLulusanCpl: async (payload: { profil_lulusan_id: number; cpl_ids: number[] }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/profil-lulusan/cpl', payload);
    return response.data;
  },

  getBahanKajians: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/bahan-kajian', { params });
    return response.data;
  },

  storeBahanKajian: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/bahan-kajian', payload);
    return response.data;
  },

  updateBahanKajian: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/bahan-kajian/${id}`, payload);
    return response.data;
  },

  deleteBahanKajian: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/bahan-kajian/${id}`);
    return response.data;
  },

  getMatrixCplBahanKajian: async (params?: { program_studi_id?: number; kurikulum_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/bahan-kajian/matrix/cpl', { params });
    return response.data;
  },

  syncCplBahanKajian: async (payload: { cpl_id: number; bahan_kajian_ids: number[] }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/cpl/bahan-kajian', payload);
    return response.data;
  },

  getMatrixBahanKajianMataKuliah: async (params?: { program_studi_id?: number; kurikulum_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/bahan-kajian/matrix/mata-kuliah', { params });
    return response.data;
  },

  syncBahanKajianMataKuliah: async (payload: { bahan_kajian_id: number; mata_kuliah_ids: number[] }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/bahan-kajian/mata-kuliah', payload);
    return response.data;
  },

  getMatrixCplMataKuliah: async (params?: { program_studi_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/matrix/cpl-mata-kuliah', { params });
    return response.data;
  },

  toggleMatrixCplMataKuliah: async (payload: {
    cpl_id: number;
    mata_kuliah_id: number;
    is_checked: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/cpl/mata-kuliah', payload);
    return response.data;
  },

  getMatrixCplBahanKajianMataKuliah: async (params?: { program_studi_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/matrix/cpl-bahan-kajian-mata-kuliah', { params });
    return response.data;
  },

  // Rumusan CPMK Program Studi (CPMK-PS)
  getCpmkProdis: async (params?: {
    search?: string;
    kurikulum_id?: number;
    cpl_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/cpmk-prodi', { params });
    return response.data;
  },

  createCpmkProdi: async (payload: {
    kurikulum_id: number;
    cpl_id: number;
    kode_cpmk: string;
    deskripsi: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/cpmk-prodi', payload);
    return response.data;
  },

  updateCpmkProdi: async (
    id: number,
    payload: {
      kurikulum_id: number;
      cpl_id: number;
      kode_cpmk: string;
      deskripsi: string;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/cpmk-prodi/${id}`, payload);
    return response.data;
  },

  deleteCpmkProdi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/cpmk-prodi/${id}`);
    return response.data;
  },

  // Pemetaan CPL-CPMK-MK (Distribusi Rumusan CPMK Prodi ke Mata Kuliah)
  getPemetaanCplCpmkMk: async (params?: {
    search?: string;
    kurikulum_id?: number;
    cpl_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/pemetaan-cpl-cpmk-mk', { params });
    return response.data;
  },

  syncCpmkProdiMataKuliah: async (payload: {
    cpmk_prodi_id: number;
    mata_kuliah_ids: number[];
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/pemetaan-cpl-cpmk-mk/sync', payload);
    return response.data;
  },

  // Referensi RPS (Jenis Pembelajaran, Bentuk, Metode, Kriteria, Komponen)
  getRpsReferensi: async (params?: {
    tipe?: 'jenis_pembelajaran' | 'bentuk' | 'metode' | 'kriteria' | 'komponen';
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    page?: number;
    per_page?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/rps-referensi', { params });
    return response.data;
  },

  createRpsReferensi: async (payload: {
    tipe: 'jenis_pembelajaran' | 'bentuk' | 'metode' | 'kriteria' | 'komponen';
    kode?: string;
    nama: string;
    deskripsi?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/rps-referensi', payload);
    return response.data;
  },

  updateRpsReferensi: async (
    id: number,
    payload: {
      kode?: string;
      nama: string;
      deskripsi?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/rps-referensi/${id}`, payload);
    return response.data;
  },

  deleteRpsReferensi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/rps-referensi/${id}`);
    return response.data;
  },

  mapMataKuliahBahanKajian: async (payload: { mata_kuliah_id: number; bahan_kajian_ids: number[] }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/matakuliah/bahan-kajian', payload);
    return response.data;
  },

  // Matriks CPL ↔ MK kini dilayani oleh getMatrixCplMataKuliah / toggleMatrixCplMataKuliah
  // (menu "Mata Kuliah & SKS", dengan aturan kelayakan jalur CPL -> BK -> MK).

  // Audit Pemetaan OBE per Mata Kuliah
  getAuditPemetaan: async (params?: { program_studi_id?: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/audit-pemetaan', { params });
    return response.data;
  },

  getGrafikCpl: async (params?: { program_studi_id?: number; angkatan?: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/grafik-cpl', { params });
    return response.data;
  },

  getGrafikCpmk: async (params?: { program_studi_id?: number; mata_kuliah_id?: number; angkatan?: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/grafik-cpmk', { params });
    return response.data;
  },

  // Kepatuhan / Ketertiban Dosen Input Nilai (Integrasi SIMPEG)
  getDosenKepatuhanNilai: async (params?: { tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/dosen-kepatuhan-nilai', { params });
    return response.data;
  },

  // Mode Penilaian
  updateModePenilaian: async (taId: number, modeOrPayload: 'full_obe' | 'semi_obe' | 'konvensional' | { mode_penilaian: string }): Promise<ApiResponse<any>> => {
    const payload = typeof modeOrPayload === 'string' ? { mode_penilaian: modeOrPayload } : modeOrPayload;
    const response = await apiClient.patch(`/v1/siakad/akademik/tahun-akademik/${taId}/mode-penilaian`, payload);
    return response.data;
  },

  // Absensi Mahasiswa
  getPertemuans: async (kelasId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/perkuliahan/kelas/${kelasId}/pertemuan`);
    return response.data;
  },

  createPertemuan: async (kelasId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/perkuliahan/kelas/${kelasId}/pertemuan`, payload);
    return response.data;
  },

  getAbsensiList: async (pertemuanId: number, params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/perkuliahan/pertemuan/${pertemuanId}/absensi`, { params });
    return response.data;
  },

  saveAbsensi: async (pertemuanId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/perkuliahan/pertemuan/${pertemuanId}/absensi`, payload);
    return response.data;
  },

  saveBulkNilaiObe: async (kelasId: number, payload: { is_final: boolean; grades: any[] }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/obe/kelas/${kelasId}/bulk-nilai`, payload);
    return response.data;
  },

  // --- MASTER OBE HOMEBASE PRODI EXTENSIONS ---
  // Master Kelas & Pemetaan Mahasiswa (OBE)
  getMasterKelasList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/master-kelas', { params });
    return response.data;
  },
  createMasterKelas: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/master-kelas', payload);
    return response.data;
  },
  updateMasterKelas: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/master-kelas/${id}`, payload);
    return response.data;
  },
  deleteMasterKelas: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/master-kelas/${id}`);
    return response.data;
  },
  getMahasiswaForPemetaanKelas: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/master-kelas/mahasiswa-pemetaan', { params });
    return response.data;
  },
  assignMahasiswaToMasterKelas: async (payload: { master_kelas_id: number; mahasiswa_ids: number[]; sync_dosen_pa?: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/master-kelas/assign-mahasiswa', payload);
    return response.data;
  },

  // 1. Rumpun Mata Kuliah
  getRumpunMataKuliah: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/rumpun-mk', { params });
    return response.data;
  },
  createRumpunMataKuliah: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/rumpun-mk', payload);
    return response.data;
  },
  updateRumpunMataKuliah: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/rumpun-mk/${id}`, payload);
    return response.data;
  },
  deleteRumpunMataKuliah: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/rumpun-mk/${id}`);
    return response.data;
  },

  // 2. Jenis CPL
  getJenisCpl: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/jenis-cpl', { params });
    return response.data;
  },
  createJenisCpl: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/jenis-cpl', payload);
    return response.data;
  },
  updateJenisCpl: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/jenis-cpl/${id}`, payload);
    return response.data;
  },
  deleteJenisCpl: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/jenis-cpl/${id}`);
    return response.data;
  },

  // 3. Profesi / Prospek Karir
  getProfesiKarirList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/profesi-karir', { params });
    return response.data;
  },
  createProfesiKarir: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/profesi-karir', payload);
    return response.data;
  },
  updateProfesiKarir: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/profesi-karir/${id}`, payload);
    return response.data;
  },
  deleteProfesiKarir: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/profesi-karir/${id}`);
    return response.data;
  },

  // 4. Rubrik Penilaian OBE
  getObeRubrikList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/rubrik', { params });
    return response.data;
  },
  getObeRubrikDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/obe/rubrik/${id}`);
    return response.data;
  },
  createObeRubrik: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/rubrik', payload);
    return response.data;
  },
  updateObeRubrik: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/rubrik/${id}`, payload);
    return response.data;
  },
  deleteObeRubrik: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/rubrik/${id}`);
    return response.data;
  },

  // 4. Distribusi Mata Kuliah / Tambah Mengajar
  getDistribusiMengajarList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/distribusi-mengajar', { params });
    return response.data;
  },
  createDistribusiMengajar: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/obe/distribusi-mengajar', payload);
    return response.data;
  },
  updateDistribusiMengajar: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/obe/distribusi-mengajar/${id}`, payload);
    return response.data;
  },
  deleteDistribusiMengajar: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/obe/distribusi-mengajar/${id}`);
    return response.data;
  },
  getDistribusiMataKuliah: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/obe/distribusi-matakuliah', { params });
    return response.data;
  },

  // Penerima Beasiswa Mahasiswa (BAAK)
  getMahasiswaBeasiswaList: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    q?: string;
    status?: string;
    beasiswa_id?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/civitas/beasiswa', { params });
    return response.data;
  },

  getMahasiswaBeasiswaDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/civitas/beasiswa/${id}`);
    return response.data;
  },

  createMahasiswaBeasiswa: async (payload: {
    mahasiswa_id: number;
    beasiswa_id: number;
    berlaku_mulai?: string;
    berlaku_sampai?: string;
    status?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/civitas/beasiswa', payload);
    return response.data;
  },

  updateMahasiswaBeasiswa: async (
    id: number,
    payload: {
      beasiswa_id?: number;
      berlaku_mulai?: string;
      berlaku_sampai?: string;
      status?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/civitas/beasiswa/${id}`, payload);
    return response.data;
  },

  deleteMahasiswaBeasiswa: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/civitas/beasiswa/${id}`);
    return response.data;
  },

  getBeasiswaOptions: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/civitas/beasiswa/options');
    return response.data;
  },

  // Pindah Program Studi (pemilik mutasi: SIAKAD; SIKEU mendengar via event)
  getPindahProdiList: async (params?: {
    search?: string;
    status?: string;
    mahasiswa_id?: number;
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/pindah-prodi', { params });
    return response.data;
  },

  getPindahProdiDampak: async (mahasiswa_id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/pindah-prodi/dampak', { params: { mahasiswa_id } });
    return response.data;
  },

  createPindahProdi: async (payload: {
    mahasiswa_id: number;
    new_program_studi_id: number;
    tahun_akademik_id?: number;
    semester_efektif?: number;
    tanggal_efektif?: string;
    jenis_pendaftaran_baru?: string;
    alasan: string;
    referensi_surat?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/pindah-prodi', payload);
    return response.data;
  },

  getPindahProdiDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/pindah-prodi/${id}`);
    return response.data;
  },

  cekKeuanganPindahProdi: async (id: number, payload: { hasil: 'layak' | 'ada_tunggakan'; catatan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/pindah-prodi/${id}/cek-keuangan`, payload);
    return response.data;
  },

  approvePindahProdi: async (id: number, catatan?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/pindah-prodi/${id}/approve`, { catatan });
    return response.data;
  },

  rejectPindahProdi: async (id: number, catatan?: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/pindah-prodi/${id}/reject`, { catatan });
    return response.data;
  },

  applyPindahProdi: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/pindah-prodi/${id}/apply`);
    return response.data;
  },

  // Status Akademik: Cuti
  getCutiList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/status/cuti', { params });
    return response.data;
  },

  createCuti: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/status/cuti', payload);
    return response.data;
  },

  prosesCuti: async (id: number, payload: { status: 'disetujui' | 'ditolak'; alasan?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/status/cuti/${id}/proses`, payload);
    return response.data;
  },

  getStatusLog: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/status/log', { params });
    return response.data;
  },

  // Kelulusan / Yudisium
  getKelulusanList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/kelulusan', { params });
    return response.data;
  },

  getKelulusanSensing: async (): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/kelulusan/sensing');
    return response.data;
  },

  cekSyaratKelulusan: async (mahasiswaId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/kelulusan/cek-syarat/${mahasiswaId}`);
    return response.data;
  },

  createKelulusan: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/kelulusan', payload);
    return response.data;
  },

  // KHS (daftar + pengesahan BAAK)
  getKhsList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/khs', { params });
    return response.data;
  },

  lockKhs: async (id: number, is_locked: boolean): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/perkuliahan/khs/${id}/lock`, { is_locked });
    return response.data;
  },

  // Kartu Ujian UTS/UAS (syarat lunas SIKEU + QR validasi publik)
  getKartuUjian: async (params: { tipe_ujian: 'UTS' | 'UAS'; mahasiswa_id?: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/kartu-ujian', { params });
    return response.data;
  },

  getKartuUjianMonitoring: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/kartu-ujian/monitoring', { params });
    return response.data;
  },

  nonaktifkanKartuUjian: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/perkuliahan/kartu-ujian/${id}/nonaktifkan`);
    return response.data;
  },

  validasiKartuUjianPublic: async (token: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/kartu-ujian/validasi/${encodeURIComponent(token)}`);
    return response.data;
  },

  // Pengesahan KHS massal
  bulkLockKhs: async (payload: { tahun_akademik_id: number; program_studi_id?: number; is_locked: boolean }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/khs/bulk-lock', payload);
    return response.data;
  },

  // Dokumen resmi KHS/Transkrip + QR validasi publik
  terbitkanDokumen: async (payload: { jenis: 'KHS' | 'TRANSKRIP'; mahasiswa_id?: number; tahun_akademik_id?: number }): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/perkuliahan/dokumen/terbitkan', payload);
    return response.data;
  },

  getDokumenMonitoring: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/perkuliahan/dokumen', { params });
    return response.data;
  },

  validasiDokumenPublic: async (token: string): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/dokumen/validasi/${encodeURIComponent(token)}`);
    return response.data;
  },

  // ==========================================
  // Pipeline Modul PKL (Praktek Kerja Lapangan)
  // ==========================================
  getPklList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/pkl', { params });
    return response.data;
  },

  getPklDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/pkl/${id}`);
    return response.data;
  },

  submitPkl: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/pkl', payload);
    return response.data;
  },

  updatePkl: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/pkl/${id}`, payload);
    return response.data;
  },

  deletePkl: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/v1/siakad/pkl/${id}`);
    return response.data;
  },

  getPklLogbook: async (pklId: number, params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/pkl/${pklId}/bimbingan`, { params });
    return response.data;
  },

  createPklLogbook: async (pklId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/pkl/${pklId}/bimbingan`, payload);
    return response.data;
  },

  verifyPklLogbook: async (pklId: number, logbookId: number, payload: { status_verifikasi: 'disetujui' | 'revisi'; catatan_dosen?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/pkl/${pklId}/bimbingan/${logbookId}/verifikasi`, payload);
    return response.data;
  },

  getPklPenilaian: async (pklId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/pkl/${pklId}/nilai`);
    return response.data;
  },

  savePklPenilaian: async (pklId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/pkl/${pklId}/nilai`, payload);
    return response.data;
  },

  // ==========================================
  // Pipeline Modul Tugas Akhir / Skripsi
  // ==========================================
  getTugasAkhirList: async (params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get('/v1/siakad/ta', { params });
    return response.data;
  },

  getTugasAkhirDetail: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/ta/${id}`);
    return response.data;
  },

  submitTugasAkhir: async (payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post('/v1/siakad/ta', payload);
    return response.data;
  },

  updateTugasAkhir: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/siakad/ta/${id}`, payload);
    return response.data;
  },

  approveProposalTa: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/ta/${id}/approve-proposal`, payload);
    return response.data;
  },

  getTaBimbingan: async (taId: number, params?: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/ta/${taId}/bimbingan`, { params });
    return response.data;
  },

  createTaBimbingan: async (taId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/ta/${taId}/bimbingan`, payload);
    return response.data;
  },

  verifyTaBimbingan: async (taId: number, bimbinganId: number, payload: { status_validasi: 'acc' | 'revisi'; arahan_revisi?: string }): Promise<ApiResponse<any>> => {
    const response = await apiClient.patch(`/v1/siakad/ta/${taId}/bimbingan/${bimbinganId}/verifikasi`, payload);
    return response.data;
  },

  getTaSidangList: async (taId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/siakad/ta/${taId}/sidang`);
    return response.data;
  },

  scheduleTaSidang: async (taId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/ta/${taId}/sidang`, payload);
    return response.data;
  },

  submitTaSidangNilai: async (sidangId: number, payload: any): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/siakad/ta/sidang/${sidangId}/nilai`, payload);
    return response.data;
  },

};

