export interface MasterKategoriKebijakan {
  id: number;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  urutan: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface NomorSuratArsipRef {
  id: number;
  nomor_surat: string;
  perihal: string;
  kode_unit: string;
  kode_klasifikasi: string;
  tanggal_surat: string;
  status: string;
  file_surat_path?: string | null;
}

export interface KebijakanPedoman {
  id: number;
  nomor_surat_arsip_id?: number | null;
  kategori_kebijakan_id: number;
  nomor_surat: string;
  judul: string;
  deskripsi?: string | null;
  pejabat_penetap: string;
  tanggal_penetapan: string;
  tanggal_berlaku: string;
  tanggal_berakhir?: string | null;
  file_dokumen_path: string;
  file_dokumen_url?: string | null;
  is_active: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  kategori?: MasterKategoriKebijakan;
  nomor_surat_arsip?: NomorSuratArsipRef | null;
  pembuat?: {
    id: number;
    name: string;
    email: string;
    username: string;
  } | null;
  pengubah?: {
    id: number;
    name: string;
    email: string;
    username: string;
  } | null;
}

export interface KebijakanPedomanFilterParams {
  page?: number;
  per_page?: number;
  search?: string;
  kategori_kebijakan_id?: number | string;
  tahun?: number | string;
  is_active?: boolean | string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateKebijakanPedomanPayload {
  nomor_surat_arsip_id?: number | null;
  kategori_kebijakan_id: number;
  nomor_surat: string;
  judul: string;
  deskripsi?: string | null;
  pejabat_penetap: string;
  tanggal_penetapan: string;
  tanggal_berlaku: string;
  tanggal_berakhir?: string | null;
  is_active?: boolean;
  file_dokumen: File;
}

export interface UpdateKebijakanPedomanPayload {
  nomor_surat_arsip_id?: number | null;
  kategori_kebijakan_id?: number;
  nomor_surat?: string;
  judul?: string;
  deskripsi?: string | null;
  pejabat_penetap?: string;
  tanggal_penetapan?: string;
  tanggal_berlaku?: string;
  tanggal_berakhir?: string | null;
  is_active?: boolean;
  file_dokumen?: File | null;
}
