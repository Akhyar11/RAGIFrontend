import apiClient from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  Gedung,
  GedungFormPayload,
  Ruangan,
  RuanganFormPayload,
  LaboranProdi,
  AssignLaboranProdiPayload,
  CheckKetersediaanPayload,
  CheckKetersediaanResponse,
  KategoriAset,
  KategoriAsetFormPayload,
  Aset,
  AsetFormPayload,
  PreviewNomorInventarisData,
  PenyusutanAsetResult,
  RiwayatPenyusutanAset,
  PeminjamanRuangan,
  ApplyPeminjamanRuanganPayload,
  ApprovePeminjamanRuanganPayload,
  ApproveLaboranPayload,
  PeminjamanAset,
  ApplyPeminjamanAsetPayload,
  ApprovePeminjamanAsetPayload,
  KembalikanAsetPayload,
  SuratPeminjamanAsetData,
  SuratPeminjamanRuanganData,
  MaintenanceLog,
  MaintenanceLogFormPayload,
  PengajuanPengadaan,
  PengajuanPengadaanFormPayload,
  UpdateStatusPengadaanPayload,
  SinapraFilterParams,
  LabBhp,
  LabBhpFormPayload,
  LabBhpTransaksi,
  LabBhpTransaksiPayload,
  BebasTanggungan,
  BebasTanggunganFormPayload,
  ApproveBebasTanggunganPayload,
  AlatKalibrasi,
  AlatKalibrasiFormPayload,
  StockOpname,
  StockOpnameFormPayload,
  StockOpnameItem,
  StockOpnameItemUpdatePayload,
  MutasiAset,
  MutasiAsetFormPayload,
  ApproveMutasiPayload,
  DisposalAset,
  DisposalAsetFormPayload,
  ApproveDisposalPayload,
  KalenderRuanganItem,
  KalenderRuanganFilterParams,
  KalenderRuanganMeta,
  MasterTipeRuangan,
  MasterSatuan,
  MasterVendor,
  MasterKategoriBhp,
  AsetLabelData,
  LabEarlyWarningsData,
  SinapraDashboardSummary,
  SinapraProdiRoleItem,
  SinapraAvailableRole,
  PlottingProdiRolePayload,
} from '@/types/sinapra.types';

export interface SinapraImportResult {
  status: string;
  message: string;
  created: number;
  updated: number;
  failed: number;
  total_processed: number;
  errors: Array<{ row: number; error: string }>;
}

export const sinapraService = {
  // ── DASHBOARD EKSEKUTIF SARPRAS ─────────────────────────────
  getDashboardSummary: async (): Promise<ApiResponse<SinapraDashboardSummary>> => {
    const { data } = await apiClient.get<ApiResponse<SinapraDashboardSummary>>('/sinapra/dashboard-summary');
    return data;
  },

  // ── FASE 4: EARLY WARNING SYSTEM LABORATORIUM ──────────────
  getLabEarlyWarnings: async (): Promise<ApiResponse<LabEarlyWarningsData>> => {
    const { data } = await apiClient.get<ApiResponse<LabEarlyWarningsData>>('/sinapra/laboratorium/early-warnings');
    return data;
  },

  // ── GEDUNG ──────────────────────────────────────────────────
  getGedungList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<Gedung>> => {
    const { data } = await apiClient.get<PaginatedResponse<Gedung>>('/sinapra/gedung', { params });
    return data;
  },

  createGedung: async (payload: GedungFormPayload): Promise<ApiResponse<Gedung>> => {
    const { data } = await apiClient.post<ApiResponse<Gedung>>('/sinapra/gedung', payload);
    return data;
  },

  getGedungDetail: async (id: number): Promise<ApiResponse<Gedung>> => {
    const { data } = await apiClient.get<ApiResponse<Gedung>>(`/sinapra/gedung/${id}`);
    return data;
  },

  updateGedung: async (id: number, payload: Partial<GedungFormPayload>): Promise<ApiResponse<Gedung>> => {
    const { data } = await apiClient.put<ApiResponse<Gedung>>(`/sinapra/gedung/${id}`, payload);
    return data;
  },

  deleteGedung: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/gedung/${id}`);
    return data;
  },

  // ── RUANGAN ─────────────────────────────────────────────────
  getRuanganList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<Ruangan>> => {
    const { data } = await apiClient.get<PaginatedResponse<Ruangan>>('/sinapra/ruangan', { params });
    return data;
  },

  createRuangan: async (payload: RuanganFormPayload): Promise<ApiResponse<Ruangan>> => {
    const { data } = await apiClient.post<ApiResponse<Ruangan>>('/sinapra/ruangan', payload);
    return data;
  },

  getRuanganDetail: async (id: number): Promise<ApiResponse<Ruangan>> => {
    const { data } = await apiClient.get<ApiResponse<Ruangan>>(`/sinapra/ruangan/${id}`);
    return data;
  },

  updateRuangan: async (id: number, payload: Partial<RuanganFormPayload>): Promise<ApiResponse<Ruangan>> => {
    const { data } = await apiClient.put<ApiResponse<Ruangan>>(`/sinapra/ruangan/${id}`, payload);
    return data;
  },

  deleteRuangan: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/ruangan/${id}`);
    return data;
  },

  checkKetersediaanRuangan: async (payload: CheckKetersediaanPayload): Promise<ApiResponse<CheckKetersediaanResponse>> => {
    const { data } = await apiClient.post<ApiResponse<CheckKetersediaanResponse>>('/sinapra/ruangan/check-ketersediaan', payload);
    return data;
  },

  getLaboranByRuangan: async (ruanganId: number): Promise<ApiResponse<any[]>> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/sinapra/ruangan/${ruanganId}/laboran`);
    return data;
  },

  assignLaboran: async (ruanganId: number, payload: { user_id: number; is_primary?: boolean }): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/sinapra/ruangan/${ruanganId}/laboran`, payload);
    return data;
  },

  unassignLaboran: async (ruanganId: number, userId: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/ruangan/${ruanganId}/laboran/${userId}`);
    return data;
  },

  // ── LABORAN PROGRAM STUDI ─────────────────────────────────────
  getLaboranProdiList: async (params?: any): Promise<PaginatedResponse<LaboranProdi>> => {
    const { data } = await apiClient.get<PaginatedResponse<LaboranProdi>>('/sinapra/laboran-prodi', { params });
    return data;
  },

  assignLaboranProdi: async (payload: AssignLaboranProdiPayload): Promise<ApiResponse<LaboranProdi>> => {
    const { data } = await apiClient.post<ApiResponse<LaboranProdi>>('/sinapra/laboran-prodi', payload);
    return data;
  },

  unassignLaboranProdi: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/laboran-prodi/${id}`);
    return data;
  },

  // ── KATEGORI ASET ───────────────────────────────────────────
  getKategoriList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<KategoriAset>> => {
    const { data } = await apiClient.get<PaginatedResponse<KategoriAset>>('/sinapra/kategori-aset', { params });
    return data;
  },

  createKategori: async (payload: KategoriAsetFormPayload): Promise<ApiResponse<KategoriAset>> => {
    const { data } = await apiClient.post<ApiResponse<KategoriAset>>('/sinapra/kategori-aset', payload);
    return data;
  },

  getKategoriDetail: async (id: number): Promise<ApiResponse<KategoriAset>> => {
    const { data } = await apiClient.get<ApiResponse<KategoriAset>>(`/sinapra/kategori-aset/${id}`);
    return data;
  },

  updateKategori: async (id: number, payload: Partial<KategoriAsetFormPayload>): Promise<ApiResponse<KategoriAset>> => {
    const { data } = await apiClient.put<ApiResponse<KategoriAset>>(`/sinapra/kategori-aset/${id}`, payload);
    return data;
  },

  deleteKategori: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/kategori-aset/${id}`);
    return data;
  },

  // ── ASET INVENTARIS ─────────────────────────────────────────
  getAsetList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<Aset>> => {
    const { data } = await apiClient.get<PaginatedResponse<Aset>>('/sinapra/aset', { params });
    return data;
  },

  createAset: async (payload: AsetFormPayload): Promise<ApiResponse<Aset | Aset[]>> => {
    const { data } = await apiClient.post<ApiResponse<Aset | Aset[]>>('/sinapra/aset', payload);
    return data;
  },

  getPreviewNomorAset: async (params?: {
    ruangan_id?: number;
    kategori_id?: number;
    tahun?: number;
    nomor_urut?: number;
    jumlah?: number;
  }): Promise<ApiResponse<PreviewNomorInventarisData>> => {
    const { data } = await apiClient.get<ApiResponse<PreviewNomorInventarisData>>('/sinapra/aset/preview-nomor', { params });
    return data;
  },

  getAsetDetail: async (id: number): Promise<ApiResponse<Aset>> => {
    const { data } = await apiClient.get<ApiResponse<Aset>>(`/sinapra/aset/${id}`);
    return data;
  },

  updateAset: async (id: number, payload: Partial<AsetFormPayload>): Promise<ApiResponse<Aset>> => {
    const { data } = await apiClient.put<ApiResponse<Aset>>(`/sinapra/aset/${id}`, payload);
    return data;
  },

  deleteAset: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/aset/${id}`);
    return data;
  },

  hitungPenyusutanAset: async (id: number): Promise<ApiResponse<PenyusutanAsetResult>> => {
    const { data } = await apiClient.get<ApiResponse<PenyusutanAsetResult>>(`/sinapra/aset/${id}/hitung-penyusutan`);
    return data;
  },

  postJurnalPenyusutan: async (id: number, payload?: { tahun?: number; catatan?: string }): Promise<ApiResponse<RiwayatPenyusutanAset>> => {
    const { data } = await apiClient.post<ApiResponse<RiwayatPenyusutanAset>>(`/sinapra/aset/${id}/post-jurnal-penyusutan`, payload);
    return data;
  },

  getRiwayatPenyusutan: async (id: number): Promise<ApiResponse<RiwayatPenyusutanAset[]>> => {
    const { data } = await apiClient.get<ApiResponse<RiwayatPenyusutanAset[]>>(`/sinapra/aset/${id}/riwayat-penyusutan`);
    return data;
  },

  // ── PEMINJAMAN RUANGAN ──────────────────────────────────────
  getPeminjamanRuanganList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<PeminjamanRuangan>> => {
    const { data } = await apiClient.get<PaginatedResponse<PeminjamanRuangan>>('/sinapra/peminjaman-ruangan', { params });
    return data;
  },

  applyPeminjamanRuangan: async (payload: ApplyPeminjamanRuanganPayload): Promise<ApiResponse<PeminjamanRuangan>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanRuangan>>('/sinapra/peminjaman-ruangan', payload);
    return data;
  },

  getPeminjamanRuanganDetail: async (id: number): Promise<ApiResponse<PeminjamanRuangan>> => {
    const { data } = await apiClient.get<ApiResponse<PeminjamanRuangan>>(`/sinapra/peminjaman-ruangan/${id}`);
    return data;
  },

  approveLaboranRuangan: async (id: number, payload: ApproveLaboranPayload): Promise<ApiResponse<PeminjamanRuangan>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanRuangan>>(`/sinapra/peminjaman-ruangan/${id}/approve-laboran`, payload);
    return data;
  },

  approvePeminjamanRuangan: async (id: number, payload: ApprovePeminjamanRuanganPayload): Promise<ApiResponse<PeminjamanRuangan>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanRuangan>>(`/sinapra/peminjaman-ruangan/${id}/approve`, payload);
    return data;
  },

  getSuratPeminjamanRuangan: async (id: number): Promise<ApiResponse<SuratPeminjamanRuanganData>> => {
    const { data } = await apiClient.get<ApiResponse<SuratPeminjamanRuanganData>>(`/sinapra/peminjaman-ruangan/${id}/surat`);
    return data;
  },

  // ── PEMINJAMAN ASET ─────────────────────────────────────────
  getPeminjamanAsetList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<PeminjamanAset>> => {
    const { data } = await apiClient.get<PaginatedResponse<PeminjamanAset>>('/sinapra/peminjaman-aset', { params });
    return data;
  },

  applyPeminjamanAset: async (payload: ApplyPeminjamanAsetPayload): Promise<ApiResponse<PeminjamanAset>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanAset>>('/sinapra/peminjaman-aset', payload);
    return data;
  },

  getPeminjamanAsetDetail: async (id: number): Promise<ApiResponse<PeminjamanAset>> => {
    const { data } = await apiClient.get<ApiResponse<PeminjamanAset>>(`/sinapra/peminjaman-aset/${id}`);
    return data;
  },

  approveLaboranAset: async (id: number, payload: ApproveLaboranPayload): Promise<ApiResponse<PeminjamanAset>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanAset>>(`/sinapra/peminjaman-aset/${id}/approve-laboran`, payload);
    return data;
  },

  approvePeminjamanAset: async (id: number, payload: ApprovePeminjamanAsetPayload): Promise<ApiResponse<PeminjamanAset>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanAset>>(`/sinapra/peminjaman-aset/${id}/approve`, payload);
    return data;
  },

  getSuratPeminjamanAset: async (id: number): Promise<ApiResponse<SuratPeminjamanAsetData>> => {
    const { data } = await apiClient.get<ApiResponse<SuratPeminjamanAsetData>>(`/sinapra/peminjaman-aset/${id}/surat`);
    return data;
  },

  kembalikanPeminjamanAset: async (id: number, payload: KembalikanAsetPayload): Promise<ApiResponse<PeminjamanAset>> => {
    const { data } = await apiClient.post<ApiResponse<PeminjamanAset>>(`/sinapra/peminjaman-aset/${id}/kembalikan`, payload);
    return data;
  },

  // ── MAINTENANCE / PERAWATAN ──────────────────────────────────
  getMaintenanceList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<MaintenanceLog>> => {
    const { data } = await apiClient.get<PaginatedResponse<MaintenanceLog>>('/sinapra/maintenance', { params });
    return data;
  },

  createMaintenance: async (payload: MaintenanceLogFormPayload): Promise<ApiResponse<MaintenanceLog>> => {
    const { data } = await apiClient.post<ApiResponse<MaintenanceLog>>('/sinapra/maintenance', payload);
    return data;
  },

  getMaintenanceDetail: async (id: number): Promise<ApiResponse<MaintenanceLog>> => {
    const { data } = await apiClient.get<ApiResponse<MaintenanceLog>>(`/sinapra/maintenance/${id}`);
    return data;
  },

  updateMaintenance: async (id: number, payload: Partial<MaintenanceLogFormPayload>): Promise<ApiResponse<MaintenanceLog>> => {
    const { data } = await apiClient.put<ApiResponse<MaintenanceLog>>(`/sinapra/maintenance/${id}`, payload);
    return data;
  },

  deleteMaintenance: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/maintenance/${id}`);
    return data;
  },

  // ── PENGAJUAN PENGADAAN ─────────────────────────────────────
  getPengadaanList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<PengajuanPengadaan>> => {
    const { data } = await apiClient.get<PaginatedResponse<PengajuanPengadaan>>('/sinapra/pengadaan', { params });
    return data;
  },

  createPengadaan: async (payload: PengajuanPengadaanFormPayload): Promise<ApiResponse<PengajuanPengadaan>> => {
    const { data } = await apiClient.post<ApiResponse<PengajuanPengadaan>>('/sinapra/pengadaan', payload);
    return data;
  },

  getPengadaanDetail: async (id: number): Promise<ApiResponse<PengajuanPengadaan>> => {
    const { data } = await apiClient.get<ApiResponse<PengajuanPengadaan>>(`/sinapra/pengadaan/${id}`);
    return data;
  },

  updateStatusPengadaan: async (id: number, payload: UpdateStatusPengadaanPayload): Promise<ApiResponse<PengajuanPengadaan>> => {
    const { data } = await apiClient.patch<ApiResponse<PengajuanPengadaan>>(`/sinapra/pengadaan/${id}/status`, payload);
    return data;
  },

  deletePengadaan: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/pengadaan/${id}`);
    return data;
  },

  // ── FASE 4: BAHAN HABIS PAKAI (BHP LAB) ─────────────────────
  getLabBhpList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<LabBhp>> => {
    const { data } = await apiClient.get<PaginatedResponse<LabBhp>>('/sinapra/lab-bhp', { params });
    return data;
  },

  createLabBhp: async (payload: LabBhpFormPayload): Promise<ApiResponse<LabBhp>> => {
    const { data } = await apiClient.post<ApiResponse<LabBhp>>('/sinapra/lab-bhp', payload);
    return data;
  },

  getLabBhpDetail: async (id: number): Promise<ApiResponse<LabBhp>> => {
    const { data } = await apiClient.get<ApiResponse<LabBhp>>(`/sinapra/lab-bhp/${id}`);
    return data;
  },

  updateLabBhp: async (id: number, payload: Partial<LabBhpFormPayload>): Promise<ApiResponse<LabBhp>> => {
    const { data } = await apiClient.put<ApiResponse<LabBhp>>(`/sinapra/lab-bhp/${id}`, payload);
    return data;
  },

  deleteLabBhp: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/lab-bhp/${id}`);
    return data;
  },

  transaksiLabBhp: async (id: number, payload: LabBhpTransaksiPayload): Promise<ApiResponse<{ transaksi: LabBhpTransaksi; stok_terkini: number }>> => {
    const { data } = await apiClient.post<ApiResponse<{ transaksi: LabBhpTransaksi; stok_terkini: number }>>(`/sinapra/lab-bhp/${id}/transaksi`, payload);
    return data;
  },

  // ── FASE 4: SURAT BEBAS TANGGUNGAN LAB ───────────────────────
  getBebasTanggunganList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<BebasTanggungan>> => {
    const { data } = await apiClient.get<PaginatedResponse<BebasTanggungan>>('/sinapra/bebas-tanggungan', { params });
    return data;
  },

  applyBebasTanggungan: async (payload: BebasTanggunganFormPayload): Promise<ApiResponse<BebasTanggungan>> => {
    const { data } = await apiClient.post<ApiResponse<BebasTanggungan>>('/sinapra/bebas-tanggungan', payload);
    return data;
  },

  getBebasTanggunganDetail: async (id: number): Promise<ApiResponse<BebasTanggungan>> => {
    const { data } = await apiClient.get<ApiResponse<BebasTanggungan>>(`/sinapra/bebas-tanggungan/${id}`);
    return data;
  },

  approveBebasTanggungan: async (id: number, payload: ApproveBebasTanggunganPayload): Promise<ApiResponse<BebasTanggungan>> => {
    const { data } = await apiClient.post<ApiResponse<BebasTanggungan>>(`/sinapra/bebas-tanggungan/${id}/approve`, payload);
    return data;
  },

  // ── FASE 4: KALIBRASI ALAT PRESISI ──────────────────────────
  getAlatKalibrasiList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<AlatKalibrasi>> => {
    const { data } = await apiClient.get<PaginatedResponse<AlatKalibrasi>>('/sinapra/alat-kalibrasi', { params });
    return data;
  },

  createAlatKalibrasi: async (payload: AlatKalibrasiFormPayload): Promise<ApiResponse<AlatKalibrasi>> => {
    const { data } = await apiClient.post<ApiResponse<AlatKalibrasi>>('/sinapra/alat-kalibrasi', payload);
    return data;
  },

  getAlatKalibrasiDetail: async (id: number): Promise<ApiResponse<AlatKalibrasi>> => {
    const { data } = await apiClient.get<ApiResponse<AlatKalibrasi>>(`/sinapra/alat-kalibrasi/${id}`);
    return data;
  },

  updateAlatKalibrasi: async (id: number, payload: Partial<AlatKalibrasiFormPayload>): Promise<ApiResponse<AlatKalibrasi>> => {
    const { data } = await apiClient.put<ApiResponse<AlatKalibrasi>>(`/sinapra/alat-kalibrasi/${id}`, payload);
    return data;
  },

  deleteAlatKalibrasi: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/alat-kalibrasi/${id}`);
    return data;
  },

  // ── FASE 5: STOCK OPNAME FISIK ──────────────────────────────
  getStockOpnameList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<StockOpname>> => {
    const { data } = await apiClient.get<PaginatedResponse<StockOpname>>('/sinapra/stock-opname', { params });
    return data;
  },

  getStockOpnameDetail: async (id: number): Promise<ApiResponse<StockOpname>> => {
    const { data } = await apiClient.get<ApiResponse<StockOpname>>(`/sinapra/stock-opname/${id}`);
    return data;
  },

  createStockOpname: async (payload: StockOpnameFormPayload): Promise<ApiResponse<StockOpname>> => {
    const { data } = await apiClient.post<ApiResponse<StockOpname>>('/sinapra/stock-opname', payload);
    return data;
  },

  updateStockOpnameItem: async (id: number, itemId: number, payload: StockOpnameItemUpdatePayload): Promise<ApiResponse<StockOpnameItem>> => {
    const { data } = await apiClient.put<ApiResponse<StockOpnameItem>>(`/sinapra/stock-opname/${id}/items/${itemId}`, payload);
    return data;
  },

  finishStockOpname: async (id: number, payload?: { catatan?: string }): Promise<ApiResponse<StockOpname>> => {
    const { data } = await apiClient.post<ApiResponse<StockOpname>>(`/sinapra/stock-opname/${id}/finish`, payload || {});
    return data;
  },

  // ── FASE 5: MUTASI ASET ANTAR-RUANGAN ───────────────────────
  getMutasiList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<MutasiAset>> => {
    const { data } = await apiClient.get<PaginatedResponse<MutasiAset>>('/sinapra/mutasi-aset', { params });
    return data;
  },

  createMutasi: async (payload: MutasiAsetFormPayload): Promise<ApiResponse<MutasiAset>> => {
    const { data } = await apiClient.post<ApiResponse<MutasiAset>>('/sinapra/mutasi-aset', payload);
    return data;
  },

  approveMutasi: async (id: number, payload: ApproveMutasiPayload): Promise<ApiResponse<MutasiAset>> => {
    const { data } = await apiClient.post<ApiResponse<MutasiAset>>(`/sinapra/mutasi-aset/${id}/approve`, payload);
    return data;
  },

  // ── FASE 5: PENGHAPUSAN / DISPOSAL ASET ─────────────────────
  getDisposalList: async (params?: SinapraFilterParams): Promise<PaginatedResponse<DisposalAset>> => {
    const { data } = await apiClient.get<PaginatedResponse<DisposalAset>>('/sinapra/disposal-aset', { params });
    return data;
  },

  createDisposal: async (payload: DisposalAsetFormPayload): Promise<ApiResponse<DisposalAset>> => {
    const { data } = await apiClient.post<ApiResponse<DisposalAset>>('/sinapra/disposal-aset', payload);
    return data;
  },

  approveDisposal: async (id: number, payload: ApproveDisposalPayload): Promise<ApiResponse<DisposalAset>> => {
    const { data } = await apiClient.post<ApiResponse<DisposalAset>>(`/sinapra/disposal-aset/${id}/approve`, payload);
    return data;
  },

  // ── FASE 6: KALENDER TERPADU RUANGAN (SINAPRA + SIAKAD) ─────
  getKalenderRuangan: async (params?: KalenderRuanganFilterParams): Promise<{ success: boolean; message: string; data: KalenderRuanganItem[]; meta: KalenderRuanganMeta }> => {
    const { data } = await apiClient.get<{ success: boolean; message: string; data: KalenderRuanganItem[]; meta: KalenderRuanganMeta }>('/sinapra/kalender-ruangan', { params });
    return data;
  },

  // ── MASTER TIPE RUANGAN ──────────────────────────────────────
  getMasterTipeRuanganList: async (params?: any): Promise<PaginatedResponse<MasterTipeRuangan>> => {
    const { data } = await apiClient.get<PaginatedResponse<MasterTipeRuangan>>('/sinapra/master/tipe-ruangan', { params });
    return data;
  },

  createMasterTipeRuangan: async (payload: Partial<MasterTipeRuangan>): Promise<ApiResponse<MasterTipeRuangan>> => {
    const { data } = await apiClient.post<ApiResponse<MasterTipeRuangan>>('/sinapra/master/tipe-ruangan', payload);
    return data;
  },

  updateMasterTipeRuangan: async (id: number, payload: Partial<MasterTipeRuangan>): Promise<ApiResponse<MasterTipeRuangan>> => {
    const { data } = await apiClient.put<ApiResponse<MasterTipeRuangan>>(`/sinapra/master/tipe-ruangan/${id}`, payload);
    return data;
  },

  deleteMasterTipeRuangan: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/master/tipe-ruangan/${id}`);
    return data;
  },

  // ── MASTER SATUAN BARANG ─────────────────────────────────────
  getMasterSatuanList: async (params?: any): Promise<PaginatedResponse<MasterSatuan>> => {
    const { data } = await apiClient.get<PaginatedResponse<MasterSatuan>>('/sinapra/master/satuan', { params });
    return data;
  },

  createMasterSatuan: async (payload: Partial<MasterSatuan>): Promise<ApiResponse<MasterSatuan>> => {
    const { data } = await apiClient.post<ApiResponse<MasterSatuan>>('/sinapra/master/satuan', payload);
    return data;
  },

  updateMasterSatuan: async (id: number, payload: Partial<MasterSatuan>): Promise<ApiResponse<MasterSatuan>> => {
    const { data } = await apiClient.put<ApiResponse<MasterSatuan>>(`/sinapra/master/satuan/${id}`, payload);
    return data;
  },

  deleteMasterSatuan: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/master/satuan/${id}`);
    return data;
  },

  // ── MASTER VENDOR / REKANAN ──────────────────────────────────
  getMasterVendorList: async (params?: any): Promise<PaginatedResponse<MasterVendor>> => {
    const { data } = await apiClient.get<PaginatedResponse<MasterVendor>>('/sinapra/master/vendor', { params });
    return data;
  },

  getMasterVendorDetail: async (id: number): Promise<ApiResponse<MasterVendor>> => {
    const { data } = await apiClient.get<ApiResponse<MasterVendor>>(`/sinapra/master/vendor/${id}`);
    return data;
  },

  createMasterVendor: async (payload: Partial<MasterVendor>): Promise<ApiResponse<MasterVendor>> => {
    const { data } = await apiClient.post<ApiResponse<MasterVendor>>('/sinapra/master/vendor', payload);
    return data;
  },

  updateMasterVendor: async (id: number, payload: Partial<MasterVendor>): Promise<ApiResponse<MasterVendor>> => {
    const { data } = await apiClient.put<ApiResponse<MasterVendor>>(`/sinapra/master/vendor/${id}`, payload);
    return data;
  },

  deleteMasterVendor: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/master/vendor/${id}`);
    return data;
  },

  // ── MASTER KATEGORI BHP ──────────────────────────────────────
  getMasterKategoriBhpList: async (params?: any): Promise<PaginatedResponse<MasterKategoriBhp>> => {
    const { data } = await apiClient.get<PaginatedResponse<MasterKategoriBhp>>('/sinapra/master/kategori-bhp', { params });
    return data;
  },

  getMasterKategoriBhpDetail: async (id: number): Promise<ApiResponse<MasterKategoriBhp>> => {
    const { data } = await apiClient.get<ApiResponse<MasterKategoriBhp>>(`/sinapra/master/kategori-bhp/${id}`);
    return data;
  },

  createMasterKategoriBhp: async (payload: Partial<MasterKategoriBhp>): Promise<ApiResponse<MasterKategoriBhp>> => {
    const { data } = await apiClient.post<ApiResponse<MasterKategoriBhp>>('/sinapra/master/kategori-bhp', payload);
    return data;
  },

  updateMasterKategoriBhp: async (id: number, payload: Partial<MasterKategoriBhp>): Promise<ApiResponse<MasterKategoriBhp>> => {
    const { data } = await apiClient.put<ApiResponse<MasterKategoriBhp>>(`/sinapra/master/kategori-bhp/${id}`, payload);
    return data;
  },

  deleteMasterKategoriBhp: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/sinapra/master/kategori-bhp/${id}`);
    return data;
  },

  // ── CETAK LABEL BARCODE & QR CODE ASET ────────────────────────
  getAsetLabel: async (id: number): Promise<ApiResponse<AsetLabelData>> => {
    const { data } = await apiClient.get<ApiResponse<AsetLabelData>>(`/sinapra/aset/${id}/label`);
    return data;
  },

  getBatchAsetLabels: async (asetIds: number[]): Promise<ApiResponse<AsetLabelData[]>> => {
    const { data } = await apiClient.post<ApiResponse<AsetLabelData[]>>('/sinapra/aset/labels/batch', {
      aset_ids: asetIds,
    });
    return data;
  },

  // ── MASTER: PLOTTING ROLE PROGRAM STUDI (SIAKAD) ──────────
  getProdiRolesList: async (params?: any): Promise<PaginatedResponse<SinapraProdiRoleItem>> => {
    const { data } = await apiClient.get<PaginatedResponse<SinapraProdiRoleItem>>('/sinapra/master/prodi-roles', { params });
    return data;
  },

  getAvailableRolesOptions: async (): Promise<ApiResponse<SinapraAvailableRole[]>> => {
    const { data } = await apiClient.get<ApiResponse<SinapraAvailableRole[]>>('/sinapra/master/prodi-roles/roles-options');
    return data;
  },

  updateProdiRoles: async (prodiId: number, payload: PlottingProdiRolePayload): Promise<ApiResponse<SinapraProdiRoleItem>> => {
    const { data } = await apiClient.post<ApiResponse<SinapraProdiRoleItem>>(`/sinapra/master/prodi-roles/${prodiId}`, payload);
    return data;
  },

  // ── IMPORT EXCEL & UNDUH TEMPLATE ────────────────────────────
  importExcel: async (entity: string, file: File): Promise<ApiResponse<SinapraImportResult>> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ApiResponse<SinapraImportResult>>(`/sinapra/import/${entity}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  downloadTemplate: async (entity: string): Promise<Blob> => {
    const response = await apiClient.get(`/sinapra/import/template/${entity}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

