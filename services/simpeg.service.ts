import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type {
  UnitKerja,
  Jabatan,
  JabatanFungsionalAkademik,
  MasterGolonganPangkat,
  Pegawai,
  RiwayatJabatan,
  RiwayatPendidikanPegawai,
  PegawaiFilterParams,
  DokumenPegawai,
  MasterJenisCuti,
  PengajuanCuti,
  PresensiPegawai,
  AttendanceRecapData,
  GajiPegawai,
  MasterKomponenGaji,
  UsulanJafung,
  PenilaianKinerja,
  MasterKategoriSkp,
  FingerprintDevice,
  FingerprintSyncPayload,
  BulkAssignShiftPayload,
  CutoffReport,
  MasterJenisSertifikasi,
  MasterJenisTes,
  MasterJenisPelatihan,
  MasterPeranPelatihan,
  MasterTingkatKegiatan,
  MasterJenisIzinJamKerja,
  MasterKategoriSk,
  TandaTanganPegawai,
  TandaTanganFilterParams,
  SuratPeringatan,
  AnnualSpMonitoringRow,
  AnnualSpMonitoringMeta,
  PresensiAnalyticsData,
  DemografiAnalyticsData,
  PresensiPengajaranRow,
  PresensiPengajaranCutoff,
  PresensiPengajaranException,
} from '@/types/simpeg.types';

export const simpegService = {
  // ── UNIT KERJA ──────────────────────────────────────────────
  getUnitKerjaList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/unit-kerja', { params });
    return data;
  },

  getUnitKerjaTree: async (): Promise<ApiResponse<UnitKerja[]>> => {
    const { data } = await apiClient.get<ApiResponse<UnitKerja[]>>('/simpeg/unit-kerja', {
      params: { tree: 1 },
    });
    return data;
  },

  getUnitKerjaDetail: async (id: number): Promise<ApiResponse<UnitKerja>> => {
    const { data } = await apiClient.get<ApiResponse<UnitKerja>>(`/simpeg/unit-kerja/${id}`);
    return data;
  },

  createUnitKerja: async (payload: Partial<UnitKerja>): Promise<ApiResponse<UnitKerja>> => {
    const { data } = await apiClient.post<ApiResponse<UnitKerja>>('/simpeg/unit-kerja', payload);
    return data;
  },

  updateUnitKerja: async (id: number, payload: Partial<UnitKerja>): Promise<ApiResponse<UnitKerja>> => {
    const { data } = await apiClient.put<ApiResponse<UnitKerja>>(`/simpeg/unit-kerja/${id}`, payload);
    return data;
  },

  deleteUnitKerja: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/simpeg/unit-kerja/${id}`);
    return data;
  },

  // ── JABATAN ──────────────────────────────────────────────────
  getJabatanList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/jabatan', {
      params: typeof params === 'number' ? { unit_kerja_id: params } : params,
    });
    return data;
  },

  createJabatan: async (payload: Partial<Jabatan>): Promise<ApiResponse<Jabatan>> => {
    const { data } = await apiClient.post<ApiResponse<Jabatan>>('/simpeg/jabatan', payload);
    return data;
  },

  updateJabatan: async (id: number, payload: Partial<Jabatan>): Promise<ApiResponse<Jabatan>> => {
    const { data } = await apiClient.put<ApiResponse<Jabatan>>(`/simpeg/jabatan/${id}`, payload);
    return data;
  },

  deleteJabatan: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/simpeg/jabatan/${id}`);
    return data;
  },

  // ── JABATAN FUNGSIONAL ──────────────────────────────────────
  getJabatanFungsionalList: async (params?: {
    page?: number;
    limit?: number;
    per_page?: number;
    search?: string;
    golongan?: string;
    sort_by?: string;
    sort_dir?: string;
  }): Promise<ApiResponse<JabatanFungsionalAkademik[]>> => {
    const { data } = await apiClient.get<ApiResponse<JabatanFungsionalAkademik[]>>('/simpeg/jabatan-fungsional', { params });
    return data;
  },

  createJabatanFungsional: async (payload: Partial<JabatanFungsionalAkademik>): Promise<ApiResponse<JabatanFungsionalAkademik>> => {
    const { data } = await apiClient.post<ApiResponse<JabatanFungsionalAkademik>>('/simpeg/jabatan-fungsional', payload);
    return data;
  },

  getGolonganPangkatOptions: async (): Promise<ApiResponse<{ id: number; value: string; label: string; pangkat?: string; ruang?: string }[]>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/jabatan-fungsional/master/golongan');
    return data;
  },

  // ── MASTER GOLONGAN PANGKAT ──────────────────────────────────
  getMasterGolonganPangkatList: async (params?: {
    page?: number;
    per_page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean | string;
    ruang?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ApiResponse<MasterGolonganPangkat[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterGolonganPangkat[]>>('/simpeg/master-golongan-pangkat', { params });
    return data;
  },

  getMasterGolonganPangkatById: async (id: number): Promise<ApiResponse<MasterGolonganPangkat>> => {
    const { data } = await apiClient.get<ApiResponse<MasterGolonganPangkat>>(`/simpeg/master-golongan-pangkat/${id}`);
    return data;
  },

  createMasterGolonganPangkat: async (payload: Partial<MasterGolonganPangkat>): Promise<ApiResponse<MasterGolonganPangkat>> => {
    const { data } = await apiClient.post<ApiResponse<MasterGolonganPangkat>>('/simpeg/master-golongan-pangkat', payload);
    return data;
  },

  updateMasterGolonganPangkat: async (id: number, payload: Partial<MasterGolonganPangkat>): Promise<ApiResponse<MasterGolonganPangkat>> => {
    const { data } = await apiClient.put<ApiResponse<MasterGolonganPangkat>>(`/simpeg/master-golongan-pangkat/${id}`, payload);
    return data;
  },

  deleteMasterGolonganPangkat: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/simpeg/master-golongan-pangkat/${id}`);
    return data;
  },

  // ── PEGAWAI ──────────────────────────────────────────────────
  getPegawaiMe: async (): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.get<ApiResponse<Pegawai>>('/simpeg/pegawai/me');
    return data;
  },

  getMyPegawai: async (): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.get<ApiResponse<Pegawai>>('/simpeg/pegawai/me');
    return data;
  },

  getPegawaiList: async (params?: PegawaiFilterParams): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get('/simpeg/pegawai', { params });
    return data;
  },

  getAvailableRoles: async (): Promise<ApiResponse<{ id: number; name: string; slug: string; description?: string }[]>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/pegawai/roles');
    return data;
  },

  getDashboardStats: async (): Promise<ApiResponse<{
    total_pegawai: number;
    total_dosen: number;
    total_tendik: number;
    total_unit_kerja: number;
    recent_pegawai: Pegawai[];
  }>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/dashboard-stats');
    return data;
  },

  getPresensiAnalytics: async (tahun?: number): Promise<ApiResponse<PresensiAnalyticsData>> => {
    const { data } = await apiClient.get<ApiResponse<PresensiAnalyticsData>>('/simpeg/analytics/presensi', {
      params: tahun ? { tahun } : undefined,
    });
    return data;
  },

  getDemografiAnalytics: async (): Promise<ApiResponse<DemografiAnalyticsData>> => {
    const { data } = await apiClient.get<ApiResponse<DemografiAnalyticsData>>('/simpeg/analytics/demografi');
    return data;
  },

  getPegawaiDetail: async (id: number): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.get<ApiResponse<Pegawai>>(`/simpeg/pegawai/${id}`);
    return data;
  },

  createPegawai: async (payload: Partial<Pegawai>): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.post<ApiResponse<Pegawai>>('/simpeg/pegawai', payload);
    return data;
  },

  updatePegawai: async (id: number, payload: Partial<Pegawai>): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.put<ApiResponse<Pegawai>>(`/simpeg/pegawai/${id}`, payload);
    return data;
  },

  deletePegawai: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/simpeg/pegawai/${id}`);
    return data;
  },

  resetFaceBiometric: async (id: number): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.post<ApiResponse<Pegawai>>(`/simpeg/pegawai/${id}/reset-face`);
    return data;
  },

  getClearanceStatus: async (id: number): Promise<ApiResponse<{
    is_cleared: boolean;
    aset_dipegang_count: number;
    peminjaman_aktif_count: number;
    aset_dipegang: Array<{
      id: number;
      kode_aset: string;
      nama_aset?: string;
      nama?: string;
      nomor_seri?: string;
      status: string;
      kondisi: string;
    }>;
    peminjaman_aktif: Array<any>;
  }>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/simpeg/pegawai/${id}/clearance`);
    return data;
  },

  downloadPegawaiTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/simpeg/pegawai/template', {
      responseType: 'blob',
    });
    return response.data;
  },

  importPegawai: async (formData: FormData): Promise<ApiResponse<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
    data: any[];
  }>> => {
    const { data } = await apiClient.post('/simpeg/pegawai/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  // ── RIWAYAT ──────────────────────────────────────────────────
  getRiwayatJabatan: async (pegawaiId: number): Promise<ApiResponse<RiwayatJabatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<RiwayatJabatan[]>>(`/simpeg/pegawai/${pegawaiId}/riwayat-jabatan`);
    return data;
  },

  createRiwayatJabatan: async (pegawaiId: number, payload: Partial<RiwayatJabatan>): Promise<ApiResponse<RiwayatJabatan>> => {
    const { data } = await apiClient.post<ApiResponse<RiwayatJabatan>>(`/simpeg/pegawai/${pegawaiId}/riwayat-jabatan`, payload);
    return data;
  },

  getRiwayatPendidikan: async (pegawaiId: number): Promise<ApiResponse<RiwayatPendidikanPegawai[]>> => {
    const { data } = await apiClient.get<ApiResponse<RiwayatPendidikanPegawai[]>>(`/simpeg/pegawai/${pegawaiId}/riwayat-pendidikan`);
    return data;
  },

  createRiwayatPendidikan: async (pegawaiId: number, payload: Partial<RiwayatPendidikanPegawai>): Promise<ApiResponse<RiwayatPendidikanPegawai>> => {
    const { data } = await apiClient.post<ApiResponse<RiwayatPendidikanPegawai>>(`/simpeg/pegawai/${pegawaiId}/riwayat-pendidikan`, payload);
    return data;
  },

  // ── ENTERPRISE FEATURES ─────────────────────────────────────
  // Dokumen E-File
  getDokumenList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/dokumen', {
      params: typeof params === 'number' ? { pegawai_id: params } : params,
    });
    return data;
  },

  createDokumen: async (payload: FormData | Partial<DokumenPegawai>): Promise<ApiResponse<DokumenPegawai>> => {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post<ApiResponse<DokumenPegawai>>('/simpeg/dokumen', payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return data;
  },

  getSecureDokumenView: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/simpeg/dokumen/${id}/secure-view`);
    return data;
  },

  downloadDokumenFile: async (id: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/simpeg/dokumen/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  deleteDokumen: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/simpeg/dokumen/${id}`);
    return data;
  },

  // Master Jenis Izin & Cuti
  getMasterJenisCutiList: async (params?: any): Promise<ApiResponse<MasterJenisCuti[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterJenisCuti[]>>('/simpeg/master-jenis-cuti', { params });
    return data;
  },

  getMasterJenisCutiDetail: async (id: number): Promise<ApiResponse<MasterJenisCuti>> => {
    const { data } = await apiClient.get<ApiResponse<MasterJenisCuti>>(`/simpeg/master-jenis-cuti/${id}`);
    return data;
  },

  createMasterJenisCuti: async (payload: Partial<MasterJenisCuti>): Promise<ApiResponse<MasterJenisCuti>> => {
    const { data } = await apiClient.post<ApiResponse<MasterJenisCuti>>('/simpeg/master-jenis-cuti', payload);
    return data;
  },

  updateMasterJenisCuti: async (id: number, payload: Partial<MasterJenisCuti>): Promise<ApiResponse<MasterJenisCuti>> => {
    const { data } = await apiClient.put<ApiResponse<MasterJenisCuti>>(`/simpeg/master-jenis-cuti/${id}`, payload);
    return data;
  },

  deleteMasterJenisCuti: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/simpeg/master-jenis-cuti/${id}`);
    return data;
  },

  // Cuti Online
  getCutiList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/cuti', {
      params: typeof params === 'number' ? { pegawai_id: params } : params,
    });
    return data;
  },

  createCuti: async (payload: FormData | Partial<PengajuanCuti>): Promise<ApiResponse<PengajuanCuti>> => {
    const isFormData = payload instanceof FormData;
    const { data } = await apiClient.post<ApiResponse<PengajuanCuti>>('/simpeg/cuti', payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return data;
  },

  updateStatusCuti: async (id: number, status: string, catatan?: string): Promise<ApiResponse<PengajuanCuti>> => {
    const { data } = await apiClient.patch<ApiResponse<PengajuanCuti>>(`/simpeg/cuti/${id}/status`, {
      status_approval: status,
      catatan_approval: catatan,
    });
    return data;
  },

  // Presensi
  getPresensiList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/presensi', {
      params: typeof params === 'number' ? { pegawai_id: params } : params,
    });
    return data;
  },

  createPresensi: async (payload: Partial<PresensiPegawai>): Promise<ApiResponse<PresensiPegawai>> => {
    const { data } = await apiClient.post<ApiResponse<PresensiPegawai>>('/simpeg/presensi', payload);
    return data;
  },

  uploadPresensiRekap: async (payload: FormData): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/upload-rekap', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000, // 10 minutes timeout for processing large SQL dumps
    });
    return data;
  },

  syncPresensiBundle: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/bundle/sync');
    return data;
  },

  getPresensiDetail: async (id: number | string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/simpeg/presensi/${id}`);
    return data;
  },

  getPresensiBundleDetail: async (id: number | string, params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/simpeg/presensi/${id}`, {
      params: { ...params, bundle: 1, type: 'bundle' },
    });
    return data;
  },

  deletePresensiBundle: async (id: number | string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/presensi/${id}`);
    return data;
  },

  deletePresensiLog: async (id: number | string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/presensi/log/${id}`);
    return data;
  },

  updatePresensiLog: async (
    id: number | string,
    payload: {
      tanggal?: string;
      jam_masuk?: string | null;
      jam_keluar?: string | null;
      reset_clock_in?: boolean;
      reset_clock_out?: boolean;
      status?: string;
      status_kehadiran?: string;
      catatan?: string;
      notes?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.patch<ApiResponse<any>>(`/simpeg/presensi/log/${id}`, payload);
    return data;
  },

  koreksiPresensiBundle: async (payload: {
    presensi_periode_id: number;
    pegawai_id: number;
    tanggal: string;
    status_kehadiran: 'hadir' | 'izin' | 'sakit' | 'dinas' | 'alfa';
    jam_masuk?: string | null;
    jam_keluar?: string | null;
    alasan_koreksi: string;
  }): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/koreksi', payload);
    return data;
  },

  processBundlePayroll: async (id: number | string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/simpeg/presensi/${id}/payroll`);
    return data;
  },

  approvePresensi: async (id: number | string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/simpeg/presensi/${id}/approve`);
    return data;
  },

  getPresensiRecap: async (params?: {
    pegawai_id?: number;
    start_date?: string;
    end_date?: string;
    month?: number;
    year?: number;
  }): Promise<ApiResponse<AttendanceRecapData>> => {
    const { data } = await apiClient.get<ApiResponse<AttendanceRecapData>>('/simpeg/presensi/recap', { params });
    return data;
  },

  getPresensiPengajaran: async (params: {
    periode: string;
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: 'nama_lengkap' | 'nidn';
    sort_order?: 'asc' | 'desc';
  }): Promise<ApiResponse<PresensiPengajaranRow[]>> => {
    const { data } = await apiClient.get<ApiResponse<PresensiPengajaranRow[]>>(
      '/simpeg/presensi/pengajaran',
      { params }
    );
    return data;
  },

  getPresensiPengajaranCutoff: async (periode: string): Promise<ApiResponse<PresensiPengajaranCutoff>> => {
    const { data } = await apiClient.get<ApiResponse<PresensiPengajaranCutoff>>(
      '/simpeg/presensi/pengajaran/cutoff',
      { params: { periode } }
    );
    return data;
  },

  updatePresensiPengajaranCutoff: async (payload: {
    periode: string;
    cutoff_at: string;
  }): Promise<ApiResponse<PresensiPengajaranCutoff>> => {
    const { data } = await apiClient.put<ApiResponse<PresensiPengajaranCutoff>>(
      '/simpeg/presensi/pengajaran/cutoff',
      payload
    );
    return data;
  },

  getPresensiPengajaranExceptions: async (params: {
    periode: string;
    page?: number;
    per_page?: number;
    search?: string;
  }): Promise<ApiResponse<PresensiPengajaranException[]>> => {
    const { data } = await apiClient.get<ApiResponse<PresensiPengajaranException[]>>(
      '/simpeg/presensi/pengajaran/exceptions',
      { params }
    );
    return data;
  },

  grantPresensiPengajaranException: async (payload: {
    dosen_id: number;
    periode: string;
    valid_until: string;
    reason: string;
  }): Promise<ApiResponse<PresensiPengajaranException>> => {
    const { data } = await apiClient.post<ApiResponse<PresensiPengajaranException>>(
      '/simpeg/presensi/pengajaran/exceptions',
      payload
    );
    return data;
  },

  revokePresensiPengajaranException: async (id: number, reason: string): Promise<ApiResponse<PresensiPengajaranException>> => {
    const { data } = await apiClient.patch<ApiResponse<PresensiPengajaranException>>(
      `/simpeg/presensi/pengajaran/exceptions/${id}/revoke`,
      { reason }
    );
    return data;
  },

  setKeteranganPresensi: async (payload: {
    pegawai_id: number;
    tanggal: string;
    status_kehadiran: 'izin' | 'sakit' | 'dinas' | 'alfa';
    catatan?: string;
  }): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/keterangan', payload);
    return data;
  },

  getPresensiSettings: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/presensi/settings');
    return data;
  },

  updatePresensiSettings: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>('/simpeg/presensi/settings', payload);
    return data;
  },

  getOfficeLocations: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/presensi/office-locations');
    return data;
  },

  createOfficeLocation: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/office-locations', payload);
    return data;
  },

  updateOfficeLocation: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/presensi/office-locations/${id}`, payload);
    return data;
  },

  deleteOfficeLocation: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/presensi/office-locations/${id}`);
    return data;
  },

  getShiftTemplates: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/presensi/shift-templates');
    return data;
  },

  updateShiftTemplate: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/presensi/shift-templates/${id}`, payload);
    return data;
  },

  createShiftTemplate: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/shift-templates', payload);
    return data;
  },

  deleteShiftTemplate: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/presensi/shift-templates/${id}`);
    return data;
  },

  getNationalHolidays: async (year?: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/presensi/national-holidays', {
      params: year ? { year } : undefined,
    });
    return data;
  },

  createNationalHoliday: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/national-holidays', payload);
    return data;
  },

  updateNationalHoliday: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/presensi/national-holidays/${id}`, payload);
    return data;
  },

  deleteNationalHoliday: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/presensi/national-holidays/${id}`);
    return data;
  },

  syncNationalHolidays: async (year?: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/national-holidays/sync', year ? { year } : {});
    return data;
  },

  // ── PERANGKAT FINGERPRINT & OTOMASI PRESENSI ────────────────
  getFingerprintDevices: async (): Promise<ApiResponse<FingerprintDevice[]>> => {
    const { data } = await apiClient.get<ApiResponse<FingerprintDevice[]>>('/simpeg/presensi/fingerprint-devices');
    return data;
  },

  createFingerprintDevice: async (payload: Partial<FingerprintDevice>): Promise<ApiResponse<FingerprintDevice>> => {
    const { data } = await apiClient.post<ApiResponse<FingerprintDevice>>('/simpeg/presensi/fingerprint-devices', payload);
    return data;
  },

  updateFingerprintDevice: async (id: number, payload: Partial<FingerprintDevice>): Promise<ApiResponse<FingerprintDevice>> => {
    const { data } = await apiClient.put<ApiResponse<FingerprintDevice>>(`/simpeg/presensi/fingerprint-devices/${id}`, payload);
    return data;
  },

  deleteFingerprintDevice: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/presensi/fingerprint-devices/${id}`);
    return data;
  },

  testFingerprintDevice: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/simpeg/presensi/fingerprint-devices/${id}/test-connection`);
    return data;
  },

  syncFingerprintLogs: async (payload: FingerprintSyncPayload): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/presensi/fingerprint/sync', payload);
    return data;
  },

  runDailyCutoff: async (params?: { date?: string; unit_kerja_id?: number }): Promise<ApiResponse<CutoffReport>> => {
    const { data } = await apiClient.post<ApiResponse<CutoffReport>>('/simpeg/presensi/daily-cutoff', params || {});
    return data;
  },

  assignShiftBulk: async (payload: BulkAssignShiftPayload): Promise<ApiResponse<{ shift_template_id: number; shift_name: string; total_assigned: number }>> => {
    const { data } = await apiClient.post<ApiResponse<{ shift_template_id: number; shift_name: string; total_assigned: number }>>('/simpeg/presensi/shift-assign-bulk', payload);
    return data;
  },

  getPegawaiOfficeLocations: async (pegawaiId: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/simpeg/presensi/pegawai/${pegawaiId}/office-locations`);
    return data;
  },

  updatePegawaiOfficeLocations: async (pegawaiId: number, officeLocationIds: number[]): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/presensi/pegawai/${pegawaiId}/office-locations`, {
      office_location_ids: officeLocationIds,
    });
    return data;
  },

  assignOfficesBulk: async (payload: {
    office_location_ids: number[];
    unit_kerja_id?: number | null;
    jenis_pegawai?: string | null;
    pegawai_ids?: number[];
    mode?: 'attach' | 'sync';
  }): Promise<ApiResponse<{ office_location_ids: number[]; total_assigned: number; mode: string }>> => {
    const { data } = await apiClient.post<ApiResponse<{ office_location_ids: number[]; total_assigned: number; mode: string }>>('/simpeg/presensi/office-assign-bulk', payload);
    return data;
  },

  // Payroll / Gaji Fleksibel
  getPayrollList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/payroll', {
      params: typeof params === 'number' ? { pegawai_id: params } : params,
    });
    return data;
  },

  getPayrollDetail: async (id: number): Promise<ApiResponse<GajiPegawai>> => {
    const { data } = await apiClient.get<ApiResponse<GajiPegawai>>(`/simpeg/payroll/${id}`);
    return data;
  },

  createPayroll: async (payload: Partial<GajiPegawai>): Promise<ApiResponse<GajiPegawai>> => {
    const { data } = await apiClient.post<ApiResponse<GajiPegawai>>('/simpeg/payroll', payload);
    return data;
  },

  generatePayroll: async (payload: { periode: string; pegawai_id?: number } | string): Promise<ApiResponse<any>> => {
    const body = typeof payload === 'string' ? { periode: payload } : payload;
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/payroll/generate', body);
    return data;
  },

  submitPayrollToSikeu: async (periode: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/payroll/submit-to-sikeu', { periode });
    return data;
  },

  resetPayroll: async (params?: { periode?: string }): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/payroll/reset', params || {});
    return data;
  },

  processPayrollPayment: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/simpeg/payroll/${id}/process-payment`);
    return data;
  },

  // Master Komponen Gaji
  getKomponenGajiList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/payroll/komponen', { params });
    return data;
  },

  createKomponenGaji: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/payroll/komponen', payload);
    return data;
  },

  updateKomponenGaji: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/payroll/komponen/${id}`, payload);
    return data;
  },

  deleteKomponenGaji: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/payroll/komponen/${id}`);
    return data;
  },

  // Master Skala Gaji Pokok (Masa Kerja)
  getSkalaGajiList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/payroll/skala-gaji', { params });
    return data;
  },

  createSkalaGaji: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/payroll/skala-gaji', payload);
    return data;
  },

  updateSkalaGaji: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/payroll/skala-gaji/${id}`, payload);
    return data;
  },

  deleteSkalaGaji: async (id: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.delete<ApiResponse<any>>(`/simpeg/payroll/skala-gaji/${id}`);
    return data;
  },

  // Tunjangan Jabatan Fungsional Akademik (Dosen)
  getJafungTunjanganList: async (params?: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/payroll/jafung-tunjangan', { params });
    return data;
  },

  updateJafungTunjangan: async (id: number, tunjangan_nominal: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/payroll/jafung-tunjangan/${id}`, { tunjangan_nominal });
    return data;
  },

  // Master Bracket Tarif PPh 21 (TER)
  getBracketPph21List: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/payroll/bracket-pph21');
    return data;
  },

  updateBracketPph21: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/simpeg/payroll/bracket-pph21/${id}`, payload);
    return data;
  },

  // Komponen Gaji Spesifik Pegawai & Matriks
  getPegawaiMatriksGaji: async (params?: Record<string, any>): Promise<ApiResponse<{
    pegawai: any[];
    active_columns: MasterKomponenGaji[];
  }>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/payroll/pegawai-matriks', { params });
    return data;
  },

  toggleKomponenKolom: async (id: number): Promise<ApiResponse<MasterKomponenGaji>> => {
    const { data } = await apiClient.patch<ApiResponse<MasterKomponenGaji>>(`/simpeg/payroll/komponen/${id}/toggle-kolom`);
    return data;
  },

  updatePegawaiTerdampakAbsensi: async (pegawaiId: number, terdampak_absensi: boolean): Promise<ApiResponse<Pegawai>> => {
    const { data } = await apiClient.patch<ApiResponse<Pegawai>>(`/simpeg/payroll/pegawai/${pegawaiId}/terdampak-absensi`, {
      terdampak_absensi,
    });
    return data;
  },

  bulkUpdatePegawaiTerdampakAbsensi: async (pegawai_ids: number[], terdampak_absensi: boolean): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/payroll/pegawai/batch-terdampak-absensi', {
      pegawai_ids,
      terdampak_absensi,
    });
    return data;
  },

  getPegawaiKomponenList: async (pegawaiId: number): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/simpeg/payroll/pegawai/${pegawaiId}/komponen`);
    return data;
  },

  savePegawaiKomponenList: async (pegawaiId: number, komponen: any[]): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/simpeg/payroll/pegawai/${pegawaiId}/komponen`, { komponen });
    return data;
  },

  // Usulan Jafung
  getUsulanJafungList: async (params?: number | Record<string, any>): Promise<ApiResponse<UsulanJafung[]>> => {
    const { data } = await apiClient.get<ApiResponse<UsulanJafung[]>>('/simpeg/usulan-jafung', {
      params: typeof params === 'number' ? { pegawai_id: params } : params,
    });
    return data;
  },

  createUsulanJafung: async (payload: FormData | Partial<UsulanJafung>): Promise<ApiResponse<UsulanJafung>> => {
    const headers = payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined;
    const { data } = await apiClient.post<ApiResponse<UsulanJafung>>('/simpeg/usulan-jafung', payload, { headers });
    return data;
  },

  deleteUsulanJafung: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/usulan-jafung/${id}`);
    return data;
  },

  // Master Kategori SKP CRUD
  getMasterKategoriSkpList: async (params?: any): Promise<ApiResponse<MasterKategoriSkp[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterKategoriSkp[]>>('/simpeg/master/kategori-skp', { params });
    return data;
  },

  createMasterKategoriSkp: async (payload: Partial<MasterKategoriSkp>): Promise<ApiResponse<MasterKategoriSkp>> => {
    const { data } = await apiClient.post<ApiResponse<MasterKategoriSkp>>('/simpeg/master/kategori-skp', payload);
    return data;
  },

  updateMasterKategoriSkp: async (id: number, payload: Partial<MasterKategoriSkp>): Promise<ApiResponse<MasterKategoriSkp>> => {
    const { data } = await apiClient.put<ApiResponse<MasterKategoriSkp>>(`/simpeg/master/kategori-skp/${id}`, payload);
    return data;
  },

  deleteMasterKategoriSkp: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/kategori-skp/${id}`);
    return data;
  },

  // Penilaian Kinerja & SKP Butir-per-Butir
  getKinerjaMasters: async (): Promise<ApiResponse<{ kategori_skp: any[]; pejabat_penilai: any[] }>> => {
    const { data } = await apiClient.get<ApiResponse<{ kategori_skp: any[]; pejabat_penilai: any[] }>>('/simpeg/penilaian-kinerja/masters');
    return data;
  },

  getKinerjaList: async (params?: number | Record<string, any>): Promise<ApiResponse<PenilaianKinerja[]>> => {
    const { data } = await apiClient.get<ApiResponse<PenilaianKinerja[]>>('/simpeg/penilaian-kinerja', {
      params: typeof params === 'number' ? { pegawai_id: params } : params,
    });
    return data;
  },

  getKinerjaDetail: async (id: number): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.get<ApiResponse<PenilaianKinerja>>(`/simpeg/penilaian-kinerja/${id}`);
    return data;
  },

  createKinerja: async (payload: any): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.post<ApiResponse<PenilaianKinerja>>('/simpeg/penilaian-kinerja', payload);
    return data;
  },

  updateKinerja: async (id: number, payload: any): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.put<ApiResponse<PenilaianKinerja>>(`/simpeg/penilaian-kinerja/${id}`, payload);
    return data;
  },

  deleteKinerja: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/penilaian-kinerja/${id}`);
    return data;
  },

  submitTargetKinerja: async (id: number): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.post<ApiResponse<PenilaianKinerja>>(`/simpeg/penilaian-kinerja/${id}/submit-target`);
    return data;
  },

  approveTargetKinerja: async (id: number): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.post<ApiResponse<PenilaianKinerja>>(`/simpeg/penilaian-kinerja/${id}/approve-target`);
    return data;
  },

  submitRealisasiKinerja: async (id: number, formData: FormData): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.post<ApiResponse<PenilaianKinerja>>(`/simpeg/penilaian-kinerja/${id}/submit-realisasi`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  evaluateKinerja: async (id: number, payload: any): Promise<ApiResponse<PenilaianKinerja>> => {
    const { data } = await apiClient.post<ApiResponse<PenilaianKinerja>>(`/simpeg/penilaian-kinerja/${id}/evaluate`, payload);
    return data;
  },

  // PDDikti Feeder Engine
  getPddiktiStatus: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/pddikti/status');
    return data;
  },

  triggerPddiktiSync: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/pddikti/sync-all');
    return data;
  },

  // ── MASTER KOMPETENSI: JENIS SERTIFIKASI ───────────────────
  getMasterJenisSertifikasiList: async (params?: any): Promise<ApiResponse<MasterJenisSertifikasi[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterJenisSertifikasi[]>>('/simpeg/master/jenis-sertifikasi', { params });
    return data;
  },
  createMasterJenisSertifikasi: async (payload: Partial<MasterJenisSertifikasi>): Promise<ApiResponse<MasterJenisSertifikasi>> => {
    const { data } = await apiClient.post<ApiResponse<MasterJenisSertifikasi>>('/simpeg/master/jenis-sertifikasi', payload);
    return data;
  },
  updateMasterJenisSertifikasi: async (id: number, payload: Partial<MasterJenisSertifikasi>): Promise<ApiResponse<MasterJenisSertifikasi>> => {
    const { data } = await apiClient.put<ApiResponse<MasterJenisSertifikasi>>(`/simpeg/master/jenis-sertifikasi/${id}`, payload);
    return data;
  },
  deleteMasterJenisSertifikasi: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/jenis-sertifikasi/${id}`);
    return data;
  },

  // ── MASTER KOMPETENSI: JENIS TES RESMI ─────────────────────
  getMasterJenisTesList: async (params?: any): Promise<ApiResponse<MasterJenisTes[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterJenisTes[]>>('/simpeg/master/jenis-tes', { params });
    return data;
  },
  createMasterJenisTes: async (payload: Partial<MasterJenisTes>): Promise<ApiResponse<MasterJenisTes>> => {
    const { data } = await apiClient.post<ApiResponse<MasterJenisTes>>('/simpeg/master/jenis-tes', payload);
    return data;
  },
  updateMasterJenisTes: async (id: number, payload: Partial<MasterJenisTes>): Promise<ApiResponse<MasterJenisTes>> => {
    const { data } = await apiClient.put<ApiResponse<MasterJenisTes>>(`/simpeg/master/jenis-tes/${id}`, payload);
    return data;
  },
  deleteMasterJenisTes: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/jenis-tes/${id}`);
    return data;
  },

  // ── MASTER KOMPETENSI: JENIS PELATIHAN & DIKLAT ────────────
  getMasterJenisPelatihanList: async (params?: any): Promise<ApiResponse<MasterJenisPelatihan[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterJenisPelatihan[]>>('/simpeg/master/jenis-pelatihan', { params });
    return data;
  },
  createMasterJenisPelatihan: async (payload: Partial<MasterJenisPelatihan>): Promise<ApiResponse<MasterJenisPelatihan>> => {
    const { data } = await apiClient.post<ApiResponse<MasterJenisPelatihan>>('/simpeg/master/jenis-pelatihan', payload);
    return data;
  },
  updateMasterJenisPelatihan: async (id: number, payload: Partial<MasterJenisPelatihan>): Promise<ApiResponse<MasterJenisPelatihan>> => {
    const { data } = await apiClient.put<ApiResponse<MasterJenisPelatihan>>(`/simpeg/master/jenis-pelatihan/${id}`, payload);
    return data;
  },
  deleteMasterJenisPelatihan: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/jenis-pelatihan/${id}`);
    return data;
  },

  // ── MASTER KOMPETENSI: PERAN PELATIHAN ─────────────────────
  getMasterPeranPelatihanList: async (params?: any): Promise<ApiResponse<MasterPeranPelatihan[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterPeranPelatihan[]>>('/simpeg/master/peran-pelatihan', { params });
    return data;
  },
  createMasterPeranPelatihan: async (payload: Partial<MasterPeranPelatihan>): Promise<ApiResponse<MasterPeranPelatihan>> => {
    const { data } = await apiClient.post<ApiResponse<MasterPeranPelatihan>>('/simpeg/master/peran-pelatihan', payload);
    return data;
  },
  updateMasterPeranPelatihan: async (id: number, payload: Partial<MasterPeranPelatihan>): Promise<ApiResponse<MasterPeranPelatihan>> => {
    const { data } = await apiClient.put<ApiResponse<MasterPeranPelatihan>>(`/simpeg/master/peran-pelatihan/${id}`, payload);
    return data;
  },
  deleteMasterPeranPelatihan: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/peran-pelatihan/${id}`);
    return data;
  },

  // ── MASTER KOMPETENSI: TINGKAT KEGIATAN ────────────────────
  getMasterTingkatKegiatanList: async (params?: any): Promise<ApiResponse<MasterTingkatKegiatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterTingkatKegiatan[]>>('/simpeg/master/tingkat-kegiatan', { params });
    return data;
  },
  createMasterTingkatKegiatan: async (payload: Partial<MasterTingkatKegiatan>): Promise<ApiResponse<MasterTingkatKegiatan>> => {
    const { data } = await apiClient.post<ApiResponse<MasterTingkatKegiatan>>('/simpeg/master/tingkat-kegiatan', payload);
    return data;
  },
  updateMasterTingkatKegiatan: async (id: number, payload: Partial<MasterTingkatKegiatan>): Promise<ApiResponse<MasterTingkatKegiatan>> => {
    const { data } = await apiClient.put<ApiResponse<MasterTingkatKegiatan>>(`/simpeg/master/tingkat-kegiatan/${id}`, payload);
    return data;
  },
  deleteMasterTingkatKegiatan: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/tingkat-kegiatan/${id}`);
    return data;
  },

  // ── MASTER IZIN JAM KERJA ──────────────────────────────────
  getMasterJenisIzinJamKerjaList: async (params?: any): Promise<ApiResponse<MasterJenisIzinJamKerja[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterJenisIzinJamKerja[]>>('/simpeg/master/jenis-izin-jam-kerja', { params });
    return data;
  },
  createMasterJenisIzinJamKerja: async (payload: Partial<MasterJenisIzinJamKerja>): Promise<ApiResponse<MasterJenisIzinJamKerja>> => {
    const { data } = await apiClient.post<ApiResponse<MasterJenisIzinJamKerja>>('/simpeg/master/jenis-izin-jam-kerja', payload);
    return data;
  },
  updateMasterJenisIzinJamKerja: async (id: number, payload: Partial<MasterJenisIzinJamKerja>): Promise<ApiResponse<MasterJenisIzinJamKerja>> => {
    const { data } = await apiClient.put<ApiResponse<MasterJenisIzinJamKerja>>(`/simpeg/master/jenis-izin-jam-kerja/${id}`, payload);
    return data;
  },
  deleteMasterJenisIzinJamKerja: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/jenis-izin-jam-kerja/${id}`);
    return data;
  },

  // ── MASTER KATEGORI SK ─────────────────────────────────────
  getMasterKategoriSkList: async (params?: any): Promise<ApiResponse<MasterKategoriSk[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterKategoriSk[]>>('/simpeg/master/kategori-sk', { params });
    return data;
  },
  createMasterKategoriSk: async (payload: Partial<MasterKategoriSk>): Promise<ApiResponse<MasterKategoriSk>> => {
    const { data } = await apiClient.post<ApiResponse<MasterKategoriSk>>('/simpeg/master/kategori-sk', payload);
    return data;
  },
  updateMasterKategoriSk: async (id: number, payload: Partial<MasterKategoriSk>): Promise<ApiResponse<MasterKategoriSk>> => {
    const { data } = await apiClient.put<ApiResponse<MasterKategoriSk>>(`/simpeg/master/kategori-sk/${id}`, payload);
    return data;
  },
  deleteMasterKategoriSk: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/master/kategori-sk/${id}`);
    return data;
  },

  // ── MASTER TANDA TANGAN DIGITAL ────────────────────────────
  getTandaTanganList: async (params?: TandaTanganFilterParams): Promise<ApiResponse<TandaTanganPegawai[]>> => {
    const { data } = await apiClient.get<ApiResponse<TandaTanganPegawai[]>>('/simpeg/tanda-tangan', { params });
    return data;
  },

  getTandaTanganDetail: async (id: number): Promise<ApiResponse<TandaTanganPegawai>> => {
    const { data } = await apiClient.get<ApiResponse<TandaTanganPegawai>>(`/simpeg/tanda-tangan/${id}`);
    return data;
  },

  storeTandaTangan: async (formData: FormData): Promise<ApiResponse<TandaTanganPegawai>> => {
    const { data } = await apiClient.post<ApiResponse<TandaTanganPegawai>>('/simpeg/tanda-tangan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  updateTandaTangan: async (id: number, formData: FormData): Promise<ApiResponse<TandaTanganPegawai>> => {
    const { data } = await apiClient.post<ApiResponse<TandaTanganPegawai>>(`/simpeg/tanda-tangan/${id}?_method=PUT`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  toggleActiveTandaTangan: async (id: number): Promise<ApiResponse<TandaTanganPegawai>> => {
    const { data } = await apiClient.patch<ApiResponse<TandaTanganPegawai>>(`/simpeg/tanda-tangan/${id}/toggle-active`);
    return data;
  },

  deleteTandaTangan: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/simpeg/tanda-tangan/${id}`);
    return data;
  },

  getActiveTandaTanganByUser: async (userId: number): Promise<ApiResponse<TandaTanganPegawai>> => {
    const { data } = await apiClient.get<ApiResponse<TandaTanganPegawai>>(`/simpeg/tanda-tangan/user/${userId}`);
    return data;
  },

  // ── NOMOR SURAT RESMI PEGAWAI ──────────────────────────────
  getMyNomorSuratList: async (params?: Record<string, any>): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/nomor-surat/my-letters', { params });
    return data;
  },

  submitRequestNomorSurat: async (payload: {
    mode?: 'satuan' | 'bulk';
    perihal: string;
    tujuan?: string;
    tanggal_surat: string;
    kode_unit?: string;
    kode_klasifikasi?: string;
    jumlah_nomor?: number;
    catatan_pemohon?: string;
    lampiran?: File | null;
  }): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    if (payload.mode) formData.append('mode', payload.mode);
    formData.append('perihal', payload.perihal);
    if (payload.tujuan) formData.append('tujuan', payload.tujuan);
    formData.append('tanggal_surat', payload.tanggal_surat);
    if (payload.kode_unit) formData.append('kode_unit', payload.kode_unit);
    if (payload.kode_klasifikasi) formData.append('kode_klasifikasi', payload.kode_klasifikasi);
    if (payload.jumlah_nomor) formData.append('jumlah_nomor', String(payload.jumlah_nomor));
    if (payload.catatan_pemohon) formData.append('catatan_pemohon', payload.catatan_pemohon);
    if (payload.lampiran instanceof File) formData.append('lampiran', payload.lampiran);

    const { data } = await apiClient.post<ApiResponse<any>>('/simpeg/nomor-surat/request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadScanNomorSurat: async (id: number, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file_surat', file);
    const { data } = await apiClient.post<ApiResponse<any>>(`/simpeg/nomor-surat/${id}/upload-scan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  downloadScanNomorSurat: async (id: number): Promise<{ url?: string; blob?: Blob }> => {
    try {
      const { data } = await apiClient.get<ApiResponse<{ download_url?: string }>>(`/simpeg/nomor-surat/${id}/download-scan`);
      if (data?.data?.download_url) {
        return { url: data.data.download_url };
      }
    } catch (e: any) {
      const response = await apiClient.get(`/simpeg/nomor-surat/${id}/download-scan`, {
        responseType: 'blob',
      });
      return { blob: response.data };
    }
    const response = await apiClient.get(`/simpeg/nomor-surat/${id}/download-scan`, {
      responseType: 'blob',
    });
    return { blob: response.data };
  },

  // Surat Peringatan (SP) Keterlambatan
  getMySuratPeringatan: async (): Promise<ApiResponse<SuratPeringatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<SuratPeringatan[]>>('/simpeg/surat-peringatan/my');
    return data;
  },

  getSuratPeringatanList: async (params?: Record<string, unknown>): Promise<ApiResponse<SuratPeringatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<SuratPeringatan[]>>('/simpeg/surat-peringatan', { params });
    return data;
  },

  getSuratPeringatanDetail: async (id: number): Promise<ApiResponse<SuratPeringatan>> => {
    const { data } = await apiClient.get<ApiResponse<SuratPeringatan>>(`/simpeg/surat-peringatan/${id}`);
    return data;
  },

  getAnnualSpMonitoring: async (params?: Record<string, unknown>): Promise<ApiResponse<AnnualSpMonitoringRow[]> & { meta?: AnnualSpMonitoringMeta }> => {
    const { data } = await apiClient.get<ApiResponse<AnnualSpMonitoringRow[]> & { meta?: AnnualSpMonitoringMeta }>('/simpeg/surat-peringatan/monitoring-tahunan', { params });
    return data;
  },

  // ── ANALITIK PEGAWAI & JAD ──────────────────────────────────
  getAnalitikRingkasan: async (params?: Record<string, unknown>): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/simpeg/analitik/ringkasan', { params });
    return data;
  },

  getAnalitikPegawai: async (params?: Record<string, unknown>): Promise<ApiResponse<any[]>> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/simpeg/analitik/pegawai', { params });
    return data;
  },

  exportAnalitikExcel: async (params?: Record<string, unknown>): Promise<Blob> => {
    const response = await apiClient.get('/simpeg/analitik/export-excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
