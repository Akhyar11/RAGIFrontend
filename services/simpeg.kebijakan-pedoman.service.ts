import apiClient from '@/lib/axios';
import { arsipService } from '@/services/arsip.service';
import type { ApiResponse } from '@/types/api.types';
import type { CheckSkResult } from '@/types/arsip.types';
import type {
  KebijakanPedoman,
  MasterKategoriKebijakan,
  KebijakanPedomanFilterParams,
} from '@/types/simpeg.kebijakan-pedoman.types';

export const simpegKebijakanPedomanService = {
  /**
   * Mengambil master kategori kebijakan aktif
   */
  getMasters: async (): Promise<ApiResponse<MasterKategoriKebijakan[]>> => {
    const { data } = await apiClient.get<ApiResponse<MasterKategoriKebijakan[]>>(
      '/simpeg/kebijakan-pedoman/masters'
    );
    return data;
  },

  /**
   * Mengambil daftar repositori kebijakan dan pedoman
   */
  getList: async (
    params?: KebijakanPedomanFilterParams
  ): Promise<ApiResponse<KebijakanPedoman[]>> => {
    const { data } = await apiClient.get<ApiResponse<KebijakanPedoman[]>>(
      '/simpeg/kebijakan-pedoman',
      { params }
    );
    return data;
  },

  /**
   * Mengambil detail satu data kebijakan dan pedoman
   */
  getById: async (id: number): Promise<ApiResponse<KebijakanPedoman>> => {
    const { data } = await apiClient.get<ApiResponse<KebijakanPedoman>>(
      `/simpeg/kebijakan-pedoman/${id}`
    );
    return data;
  },

  /**
   * Menambahkan kebijakan dan pedoman baru beserta file scan
   */
  create: async (formData: FormData): Promise<ApiResponse<KebijakanPedoman>> => {
    const { data } = await apiClient.post<ApiResponse<KebijakanPedoman>>(
      '/simpeg/kebijakan-pedoman',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  /**
   * Memperbarui informasi atau mengganti file scan kebijakan
   */
  update: async (
    id: number,
    formData: FormData
  ): Promise<ApiResponse<KebijakanPedoman>> => {
    const { data } = await apiClient.post<ApiResponse<KebijakanPedoman>>(
      `/simpeg/kebijakan-pedoman/${id}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return data;
  },

  /**
   * Menghapus kebijakan dan pedoman (soft delete)
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const { data } = await apiClient.delete<ApiResponse<null>>(
      `/simpeg/kebijakan-pedoman/${id}`
    );
    return data;
  },

  /**
   * Memeriksa validitas nomor surat di modul Arsip & mengambil perihal otomatis
   */
  checkNomorArsip: async (
    nomorSurat: string
  ): Promise<ApiResponse<CheckSkResult>> => {
    return arsipService.checkNomorSk(nomorSurat);
  },
};
