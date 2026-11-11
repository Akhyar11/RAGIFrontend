// ============================================================
// SIPPM SERVICE — API Integration Layer for SIPPM Module
// Standardized 1-to-1 matching with Laravel Backend API
// ============================================================

import apiClient from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api.types';
import type {
  PeriodeHibah,
  SkemaKegiatan,
  ProposalKegiatan,
  ReviewerKegiatan,
  KontrakKegiatan,
  PublikasiIlmiah,
  HkiDanBuku,
  ProposalFilterParams,
  CreateProposalPayload,
  UpdateProposalPayload,
  CreatePeriodePayload,
  CreateSkemaPayload,
  AssignReviewerPayload,
  SubmitPenilaianPayload,
  FinalizeDecisionPayload,
  CreateKontrakPayload,
  RequestPencairanPayload,
  SubmitLaporanPayload,
  CreatePublikasiPayload,
  CreateHkiPayload,
  RubrikIndikator,
  CreateRubrikPayload,
  PengumumanHibah,
  CreatePengumumanPayload,
  LogbookKegiatan,
  CreateLogbookPayload,
} from '@/types/sippm.types';


export const sippmService = {
  // ------------------------------------------------------------
  // Master Skema & Periode
  // ------------------------------------------------------------
  indexSkema: async (params?: Record<string, any>): Promise<ApiResponse<SkemaKegiatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<SkemaKegiatan[]>>('/sippm/skema', { params });
    return data;
  },

  storeSkema: async (payload: CreateSkemaPayload): Promise<ApiResponse<SkemaKegiatan>> => {
    const { data } = await apiClient.post<ApiResponse<SkemaKegiatan>>('/sippm/skema', payload);
    return data;
  },

  updateSkema: async (id: number, payload: Partial<CreateSkemaPayload>): Promise<ApiResponse<SkemaKegiatan>> => {
    const { data } = await apiClient.put<ApiResponse<SkemaKegiatan>>(`/sippm/skema/${id}`, payload);
    return data;
  },

  destroySkema: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/sippm/skema/${id}`);
    return data;
  },

  indexPeriode: async (params?: Record<string, any>): Promise<ApiResponse<PeriodeHibah[]>> => {
    const { data } = await apiClient.get<ApiResponse<PeriodeHibah[]>>('/sippm/periode', { params });
    return data;
  },

  storePeriode: async (payload: CreatePeriodePayload): Promise<ApiResponse<PeriodeHibah>> => {
    const { data } = await apiClient.post<ApiResponse<PeriodeHibah>>('/sippm/periode', payload);
    return data;
  },

  updatePeriode: async (id: number, payload: Partial<CreatePeriodePayload>): Promise<ApiResponse<PeriodeHibah>> => {
    const { data } = await apiClient.put<ApiResponse<PeriodeHibah>>(`/sippm/periode/${id}`, payload);
    return data;
  },

  destroyPeriode: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/sippm/periode/${id}`);
    return data;
  },

  // ------------------------------------------------------------
  // Proposal Kegiatan
  // ------------------------------------------------------------
  getProposals: async (params?: ProposalFilterParams): Promise<PaginatedResponse<ProposalKegiatan>> => {
    const { data } = await apiClient.get<PaginatedResponse<ProposalKegiatan>>('/sippm/proposal', { params });
    return data;
  },

  getProposalDetail: async (id: number): Promise<ApiResponse<ProposalKegiatan>> => {
    const { data } = await apiClient.get<ApiResponse<ProposalKegiatan>>(`/sippm/proposal/${id}`);
    return data;
  },

  createProposal: async (payload: CreateProposalPayload | any): Promise<ApiResponse<ProposalKegiatan>> => {
    // If payload contains file, use FormData, otherwise clean JSON
    if (payload.file_proposal && typeof payload.file_proposal !== 'string') {
      const formData = new FormData();
      formData.append('periode_id', payload.periode_id.toString());
      formData.append('skema_id', payload.skema_id.toString());
      formData.append('ketua_pegawai_id', payload.ketua_pegawai_id.toString());
      formData.append('judul', payload.judul);
      formData.append('abstrak', payload.abstrak);
      formData.append('rumpun_ilmu', payload.rumpun_ilmu);
      formData.append('anggaran_diajukan', payload.anggaran_diajukan.toString());

      if (payload.mitra_kerjasama_id) formData.append('mitra_kerjasama_id', payload.mitra_kerjasama_id.toString());
      if (payload.mata_kuliah_id) formData.append('mata_kuliah_id', payload.mata_kuliah_id.toString());
      if (payload.target_tkt) formData.append('target_tkt', payload.target_tkt.toString());
      if (payload.anggota && payload.anggota.length > 0) {
        formData.append('anggota', JSON.stringify(payload.anggota));
      }

      formData.append('file_proposal', payload.file_proposal);

      const { data } = await apiClient.post<ApiResponse<ProposalKegiatan>>('/sippm/proposal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }

    // Clean JSON Request
    const { data } = await apiClient.post<ApiResponse<ProposalKegiatan>>('/sippm/proposal', payload);
    return data;
  },

  updateProposal: async (id: number, payload: UpdateProposalPayload): Promise<ApiResponse<ProposalKegiatan>> => {
    const { data } = await apiClient.put<ApiResponse<ProposalKegiatan>>(`/sippm/proposal/${id}`, payload);
    return data;
  },

  submitProposal: async (id: number): Promise<ApiResponse<ProposalKegiatan>> => {
    const { data } = await apiClient.post<ApiResponse<ProposalKegiatan>>(`/sippm/proposal/${id}/submit`);
    return data;
  },

  assignReviewer: async (id: number, payload: AssignReviewerPayload): Promise<ApiResponse<ReviewerKegiatan[]>> => {
    const { data } = await apiClient.post<ApiResponse<ReviewerKegiatan[]>>(`/sippm/proposal/${id}/assign-reviewer`, payload);
    return data;
  },

  getLogbooks: async (proposalId: number): Promise<ApiResponse<LogbookKegiatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<LogbookKegiatan[]>>(`/sippm/proposal/${proposalId}/logbook`);
    return data;
  },

  storeLogbook: async (proposalId: number, payload: CreateLogbookPayload): Promise<ApiResponse<LogbookKegiatan>> => {
    if (payload.file_bukti instanceof File) {
      const formData = new FormData();
      formData.append('tanggal', payload.tanggal);
      formData.append('uraian_kegiatan', payload.uraian_kegiatan);
      formData.append('persentase_capaian', payload.persentase_capaian.toString());
      if (payload.anggaran_terpakai !== undefined) {
        formData.append('anggaran_terpakai', payload.anggaran_terpakai.toString());
      }
      formData.append('file_bukti', payload.file_bukti);
      const { data } = await apiClient.post<ApiResponse<LogbookKegiatan>>(`/sippm/proposal/${proposalId}/logbook`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    }
    const { data } = await apiClient.post<ApiResponse<LogbookKegiatan>>(`/sippm/proposal/${proposalId}/logbook`, payload);
    return data;
  },

  // ------------------------------------------------------------
  // Reviewer & Decision
  // ------------------------------------------------------------
  myAssignedProposals: async (): Promise<ApiResponse<ReviewerKegiatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<ReviewerKegiatan[]>>('/sippm/reviewer/assigned');
    return data;
  },

  submitPenilaian: async (reviewerKegiatanId: number, payload: SubmitPenilaianPayload): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/sippm/reviewer/${reviewerKegiatanId}/penilaian`, payload);
    return data;
  },

  finalizeDecision: async (proposalId: number, payload: FinalizeDecisionPayload): Promise<ApiResponse<ProposalKegiatan>> => {
    const { data } = await apiClient.post<ApiResponse<ProposalKegiatan>>(`/sippm/proposal/${proposalId}/finalize`, payload);
    return data;
  },

  // ------------------------------------------------------------
  // Kontrak, Pencairan, & Monev/Laporan
  // ------------------------------------------------------------
  indexKontrak: async (): Promise<ApiResponse<KontrakKegiatan[]>> => {
    const { data } = await apiClient.get<ApiResponse<KontrakKegiatan[]>>('/sippm/kontrak');
    return data;
  },

  storeKontrak: async (proposalId: number, payload: CreateKontrakPayload): Promise<ApiResponse<KontrakKegiatan>> => {
    const { data } = await apiClient.post<ApiResponse<KontrakKegiatan>>(`/sippm/proposal/${proposalId}/kontrak`, payload);
    return data;
  },

  requestPencairan: async (kontrakId: number, payload: RequestPencairanPayload): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    const terminVal = ((payload as any).termin_ke || (payload as any).termin || 1).toString();
    const nominalVal = ((payload as any).nominal_pencairan || payload.nominal || 0).toString();
    formData.append('termin', terminVal);
    formData.append('termin_ke', terminVal);
    formData.append('nominal', nominalVal);
    formData.append('nominal_pencairan', nominalVal);
    if (payload.catatan_keuangan) formData.append('catatan_keuangan', payload.catatan_keuangan);
    if (payload.file_lpj) formData.append('file_lpj', payload.file_lpj);

    const { data } = await apiClient.post<ApiResponse<any>>(`/sippm/kontrak/${kontrakId}/pencairan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadSpkTtdBasah: async (kontrakId: number, fileSpkTtd: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/sippm/kontrak/${kontrakId}/upload-spk-ttd`, {
      file_spk_ttd: fileSpkTtd,
    });
    return data;
  },

  approveSpk: async (kontrakId: number, catatan?: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/sippm/kontrak/${kontrakId}/approve-spk`, {
      catatan,
    });
    return data;
  },

  uploadResiSikeu: async (pencairanId: number, buktiTransfer: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/sippm/pencairan/${pencairanId}/upload-resi-sikeu`, {
      bukti_transfer: buktiTransfer,
    });
    return data;
  },

  submitLaporan: async (kontrakId: number, payload: SubmitLaporanPayload): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('jenis_laporan', payload.jenis_laporan);
    formData.append('persentase_capaian', payload.persentase_capaian.toString());
    formData.append('ringkasan_progress', payload.ringkasan_progress);
    if (payload.file_laporan) formData.append('file_laporan', payload.file_laporan);

    const { data } = await apiClient.post<ApiResponse<any>>(`/sippm/kontrak/${kontrakId}/laporan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // ------------------------------------------------------------
  // Luaran Riset (Publikasi & HKI)
  // ------------------------------------------------------------
  indexPublikasi: async (): Promise<ApiResponse<PublikasiIlmiah[]>> => {
    const { data } = await apiClient.get<ApiResponse<PublikasiIlmiah[]>>('/sippm/luaran/publikasi');
    return data;
  },

  storePublikasi: async (payload: CreatePublikasiPayload): Promise<ApiResponse<PublikasiIlmiah>> => {
    const { data } = await apiClient.post<ApiResponse<PublikasiIlmiah>>('/sippm/luaran/publikasi', payload);
    return data;
  },

  fetchExternalPublikasi: async (source: string, identifier: string): Promise<ApiResponse<any[]>> => {
    const { data } = await apiClient.post<ApiResponse<any[]>>('/sippm/luaran/fetch-external', {
      source,
      identifier,
    });
    return data;
  },

  importExternalPublikasi: async (payload: any): Promise<ApiResponse<PublikasiIlmiah>> => {
    const { data } = await apiClient.post<ApiResponse<PublikasiIlmiah>>('/sippm/luaran/import-external', payload);
    return data;
  },

  verifyPublikasi: async (id: number, status: 'verified' | 'rejected'): Promise<ApiResponse<PublikasiIlmiah>> => {
    const { data } = await apiClient.post<ApiResponse<PublikasiIlmiah>>(`/sippm/luaran/publikasi/${id}/verify`, { status });
    return data;
  },

  indexHki: async (): Promise<ApiResponse<HkiDanBuku[]>> => {
    const { data } = await apiClient.get<ApiResponse<HkiDanBuku[]>>('/sippm/luaran/hki');
    return data;
  },

  storeHki: async (payload: CreateHkiPayload): Promise<ApiResponse<HkiDanBuku>> => {
    const { data } = await apiClient.post<ApiResponse<HkiDanBuku>>('/sippm/luaran/hki', payload);
    return data;
  },

  verifyHki: async (id: number, status: 'verified' | 'rejected'): Promise<ApiResponse<HkiDanBuku>> => {
    const { data } = await apiClient.post<ApiResponse<HkiDanBuku>>(`/sippm/luaran/hki/${id}/verify`, { status });
    return data;
  },

  // ------------------------------------------------------------
  // Cross-Module Integration & Reference Endpoints
  // ------------------------------------------------------------
  getUpmMetrics: async (): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>('/sippm/integration/upm-iku-metrics');
    return data;
  },

  getDosenReference: async (): Promise<ApiResponse<any[]>> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/sippm/ref/dosen');
    return data;
  },

  getTendikReference: async (): Promise<ApiResponse<any[]>> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/sippm/ref/tendik');
    return data;
  },

  getActiveMataKuliahMahasiswa: async (mahasiswaId: number): Promise<ApiResponse<any[]>> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/sippm/ref/mahasiswa/${mahasiswaId}/mata-kuliah-aktif`);
    return data;
  },

  // ------------------------------------------------------------
  // Master Rubrik Indikator Penilaian
  // ------------------------------------------------------------
  indexRubrik: async (params?: Record<string, any>): Promise<PaginatedResponse<RubrikIndikator>> => {
    const { data } = await apiClient.get<PaginatedResponse<RubrikIndikator>>('/sippm/rubrik', { params });
    return data;
  },

  storeRubrik: async (payload: CreateRubrikPayload): Promise<ApiResponse<RubrikIndikator>> => {
    const { data } = await apiClient.post<ApiResponse<RubrikIndikator>>('/sippm/rubrik', payload);
    return data;
  },

  updateRubrik: async (id: number, payload: Partial<CreateRubrikPayload>): Promise<ApiResponse<RubrikIndikator>> => {
    const { data } = await apiClient.put<ApiResponse<RubrikIndikator>>(`/sippm/rubrik/${id}`, payload);
    return data;
  },

  // ------------------------------------------------------------
  // Master Standar IKU 5 Prodi
  // ------------------------------------------------------------
  indexIku5Standards: async (params?: { search?: string; tahun_akademik?: string; unit_kerja_id?: number }): Promise<PaginatedResponse<any>> => {
    const { data } = await apiClient.get<PaginatedResponse<any>>('/sippm/iku5-standards', { params });
    return data;
  },

  getIku5Standards: async (params?: any): Promise<PaginatedResponse<any>> => {
    const { data } = await apiClient.get<PaginatedResponse<any>>('/sippm/iku5-standards', { params });
    return data;
  },

  storeIku5Standard: async (payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/sippm/iku5-standards', payload);
    return data;
  },

  updateIku5Standard: async (id: number, payload: any): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.put<ApiResponse<any>>(`/sippm/iku5-standards/${id}`, payload);
    return data;
  },

  destroyRubrik: async (id: number): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(`/sippm/rubrik/${id}`);
    return data;
  },

  // ------------------------------------------------------------
  // Pengumuman Penerimaan Proposal Hibah
  // ------------------------------------------------------------
  getActivePengumuman: async (): Promise<ApiResponse<PengumumanHibah>> => {
    const { data } = await apiClient.get<ApiResponse<PengumumanHibah>>('/sippm/pengumuman/active');
    return data;
  },

  indexPengumuman: async (params?: Record<string, any>): Promise<ApiResponse<PaginatedResponse<PengumumanHibah>>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<PengumumanHibah>>>('/sippm/pengumuman', { params });
    return data;
  },

  storePengumuman: async (payload: CreatePengumumanPayload): Promise<ApiResponse<PengumumanHibah>> => {
    const { data } = await apiClient.post<ApiResponse<PengumumanHibah>>('/sippm/pengumuman', payload);
    return data;
  },

  createPengumuman: async (payload: CreatePengumumanPayload): Promise<ApiResponse<PengumumanHibah>> => {
    const { data } = await apiClient.post<ApiResponse<PengumumanHibah>>('/sippm/pengumuman', payload);
    return data;
  },

  uploadSignedPengumuman: async (id: number, file: File): Promise<ApiResponse<PengumumanHibah>> => {
    const formData = new FormData();
    formData.append('file_signed_pdf', file);

    const { data } = await apiClient.post<ApiResponse<PengumumanHibah>>(`/sippm/pengumuman/${id}/upload-signed`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadTemplatePengumuman: async (id: number, type: 'mitra_indo' | 'mitra_intl', file: File): Promise<ApiResponse<PengumumanHibah>> => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file_template', file);

    const { data } = await apiClient.post<ApiResponse<PengumumanHibah>>(`/sippm/pengumuman/${id}/upload-template`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  publishPengumuman: async (id: number): Promise<ApiResponse<PengumumanHibah>> => {
    const { data } = await apiClient.post<ApiResponse<PengumumanHibah>>(`/sippm/pengumuman/${id}/publish`);
    return data;
  },
};

