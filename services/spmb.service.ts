import api from '@/lib/axios';
import type {
  ReferralValidationResult,
  MyReferralData,
  ReferralUsagesResponse,
  ReferralPayoutResult,
  TemplateSuratSpmb,
  TemplateSuratSpmbPayload,
  GetTemplateSuratParams,
  SpmbPotonganCalon,
  SpmbKodeDiskon,
  SpmbKodeDiskonPayload,
  SpmbKodeDiskonPreview,
} from '@/types/spmb.types';

export interface JalurMasuk {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string;
  tipe: 'reguler' | 'transfer' | 'beasiswa' | 'internasional' | 'rpla';
  ada_wawancara: boolean;
  is_active: boolean;
  created_at: string;
}

export interface GelombangPenerimaan {
  id: number;
  jalur_masuk_id: number;
  nama: string;
  /** Periode tahunan berulang dengan format MM-DD, tanpa tahun. */
  tanggal_buka: string;
  tanggal_tutup: string;
  tanggal_pengumuman: string | null;
  kuota_total: number;
  kuota_terisi: number;
  biaya_pendaftaran: number;
  potongan_biaya_daftar_ulang: number;
  status: 'draft' | 'aktif' | 'ditutup' | 'selesai';
  pendaftaran_dibuka?: boolean;
  jalur_masuk?: JalurMasuk;
}

export interface BerkasRequirement {
  id: number;
  jalur_masuk_id: number;
  jenis_dokumen: string;
  label: string;
  wajib: boolean;
  urutan: number;
  is_active: boolean;
  created_at?: string;
  jalur_masuk?: JalurMasuk;
}

export interface PendaftaranCalonMhs {
  id: number;
  gelombang_id: number;
  user_id: number;
  program_studi_id: number;
  program_studi_pilihan2_id?: number;
  master_tipe_jalur_id?: number | string;
  master_jalur_kelas_id?: number | string;
  info_daftar?: string;
  ket_info_daftar?: string;
  used_referral_code?: string | null;
  kode_diskon?: string | null;
  kode_diskon_usage?: {
    id: number;
    kode_diskon: string;
    subtotal_komponen: number | string;
    nominal_diskon: number | string;
    tagihan_id?: number | null;
    digunakan_at?: string;
  } | null;
  referrer_user_id?: number | null;
  referral_validated_at?: string | null;
  referrer?: {
    id: number;
    username?: string;
    name?: string;
    referral_code?: string;
  } | null;
  no_pendaftaran: string;
  nim?: string;
  nomor_sk?: string | null;
  sk_file_path?: string | null;
  sk_file_url?: string | null;
  sk_generated_at?: string | null;
  sk_arsip_request_id?: number | null;
  sk_arsip_request?: {
    id: number;
    kode_request: string;
    status: 'menunggu_verifikasi' | 'disetujui' | 'ditolak';
  } | null;
  nama_lengkap: string;
  nik: string;
  tanggal_lahir: string;
  tempat_lahir: string;
  jenis_kelamin: 'L' | 'P';
  agama?: string;
  status_sipil?: string;
  kewarganegaraan?: string;
  no_hp?: string;
  alamat?: string;
  provinsi?: string;
  kota_kabupaten?: string;
  kecamatan?: string;
  kode_pos?: string;
  asal_sekolah?: string;
  alamat_sekolah?: string;
  jurusan_sekolah?: string;
  nilai_rata_rapor?: number;
  tahun_lulus?: string;
  npsn_sekolah?: string;
  nama_ayah?: string;
  pekerjaan_ayah?: string;
  nama_ibu?: string;
  pekerjaan_ibu?: string;
  penghasilan_ortu?: string;
  nama_ortu?: string;
  alamat_ortu?: string;
  telp_ortu?: string;
  nama_wali?: string;
  telepon_wali?: string;
  status: 'draft' | 'submitted' | 'verified' | 'lulus_administrasi' | 'gagal_administrasi' | string;
  status_pembayaran?: 'belum_bayar' | 'sebagian' | 'lunas' | 'gratis' | string;
  sumber_pendaftaran?: 'online' | 'manual' | string;
  diinput_oleh?: number | null;
  admin_penginput?: { id: number; username: string; name?: string } | null;
  pihak_ketiga?: Array<{ id: number; nama: string; urutan: number }>;
  bukti_pembayaran_manual?: Array<{
    id: number;
    original_name: string;
    status: 'menunggu_verifikasi' | 'terverifikasi' | 'ditolak' | string;
    created_at?: string;
  }>;
  catatan_verifikasi?: string;
  created_at?: string;
  updated_at?: string;
  gelombang_penerimaan?: GelombangPenerimaan;
  program_studi?: {
    id: number;
    kode_prodi?: string;
    nama: string;
    jenjang?: string;
  };
  program_studi_pilihan2?: {
    id: number;
    kode_prodi?: string;
    nama: string;
    jenjang?: string;
  };
  user?: {
    id: number;
    username: string;
    email: string;
    phone?: string;
  };
  dokumen_pendaftaran?: PendaftaranBerkas[];
  progress_alur?: any[];
  daftar_ulang?: DaftarUlangSummary | null;
  hasil_seleksi?: any;
  hasilSeleksi?: any;
  konversi?: any;
}

export interface RiwayatPembayaranDaftarUlang {
  id: number;
  kode_transaksi?: string;
  jumlah_bayar: number;
  channel_bayar?: string;
  status?: string;
  paid_at?: string;
}

export interface VirtualAccountDaftarUlang {
  va_number?: string;
  bank_kode?: string;
  bank_nama?: string;
  nominal: number;
  status?: string;
  expired_at?: string;
}

export interface TagihanDaftarUlang {
  id: number;
  nomor_tagihan?: string;
  status?: string;
  due_date?: string;
  total_tagihan: number;
  total_potongan: number;
  total_denda: number;
  total_bersih: number;
  sudah_dibayar: number;
  sisa_kurang: number;
  persen_terbayar: number;
  virtual_account?: VirtualAccountDaftarUlang | null;
  riwayat_pembayaran: RiwayatPembayaranDaftarUlang[];
}

export interface DaftarUlangSummary {
  has_tagihan: boolean;
  status_daftar_ulang?: string | null;
  tagihan?: TagihanDaftarUlang | null;
}

export interface PendaftaranBerkas {
  id: number;
  pendaftaran_id: number;
  jenis_berkas?: string;
  jenis_dokumen?: string;
  file_path: string;
  is_verified: boolean;
  catatan?: string;
}

export const spmbService = {
  getProgramStudi: async (params?: { page?: number; limit?: number; search?: string; sort_by?: string; sort_dir?: string }) => {
    const response = await api.get('/spmb/prodi', { params });
    return response.data;
  },
  getKodeDiskonList: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    kode?: string;
    nama?: string;
    tipe_diskon?: string;
    nilai_min?: number | string;
    nilai_max?: number | string;
    maksimum_potongan_min?: number | string;
    maksimum_potongan_max?: number | string;
    potongan_status?: string;
    kuota_status?: string;
    berlaku_mulai?: string;
    berlaku_sampai?: string;
    is_active?: string;
    sort_by?: string;
    sort_order?: string;
  }) => {
    const response = await api.get('/spmb/master/kode-diskon', { params });
    return response.data;
  },
  getKodeDiskon: async (id: number) => {
    const response = await api.get(`/spmb/master/kode-diskon/${id}`);
    return response.data as { status: string; data: SpmbKodeDiskon };
  },
  createKodeDiskon: async (payload: SpmbKodeDiskonPayload) => {
    const response = await api.post('/spmb/master/kode-diskon', payload);
    return response.data;
  },
  updateKodeDiskon: async (id: number, payload: SpmbKodeDiskonPayload) => {
    const response = await api.put(`/spmb/master/kode-diskon/${id}`, payload);
    return response.data;
  },
  deleteKodeDiskon: async (id: number) => {
    const response = await api.delete(`/spmb/master/kode-diskon/${id}`);
    return response.data;
  },
  validateKodeDiskon: async (payload: {
    kode: string;
    master_tipe_jalur_id: number;
    program_studi_id: number;
    gelombang_id: number;
  }) => {
    const response = await api.post('/spmb/kode-diskon/validate', payload);
    return response.data as { status: string; message: string; data: SpmbKodeDiskonPreview };
  },
  getLaporanStatistik: async () => {
    const response = await api.get('/spmb/laporan/statistik');
    return response.data;
  },
  exportLaporanSpmb: async () => {
    const response = await api.get('/spmb/laporan/export', { responseType: 'blob' });
    return response.data;
  },

  getJalurMasuk: async (params?: { page?: number; limit?: number; name?: string; status?: string; sort_by?: string; sort_dir?: string }) => {
    const response = await api.get('/spmb/jalur', { params });
    return response.data;
  },

  getJalurMasukById: async (id: number) => {
    const response = await api.get(`/spmb/jalur/${id}`);
    return response.data;
  },

  createJalurMasuk: async (data: Partial<JalurMasuk>) => {
    const response = await api.post('/spmb/jalur', data);
    return response.data;
  },

  updateJalurMasuk: async (id: number, data: Partial<JalurMasuk>) => {
    const response = await api.put(`/spmb/jalur/${id}`, data);
    return response.data;
  },

  deleteJalurMasuk: async (id: number) => {
    const response = await api.delete(`/spmb/jalur/${id}`);
    return response.data;
  },
  
  getGelombang: async (params?: {
    page?: number;
    per_page?: number;
    nama?: string;
    jalur_masuk_id?: string;
    tanggal_buka?: string;
    tanggal_tutup?: string;
    kuota?: string;
    biaya?: string;
    status?: string;
    sort_by?: string;
    sort_dir?: string;
  }) => {
    const response = await api.get('/spmb/gelombang', {
      params: { ...params, per_page: params?.per_page ?? 100 },
    });
    return response.data;
  },

  getGelombangById: async (id: number) => {
    const response = await api.get(`/spmb/gelombang/${id}`);
    return response.data;
  },

  createGelombang: async (data: Partial<GelombangPenerimaan>) => {
    const response = await api.post('/spmb/gelombang', data);
    return response.data;
  },

  updateGelombang: async (id: number, data: Partial<GelombangPenerimaan>) => {
    const response = await api.put(`/spmb/gelombang/${id}`, data);
    return response.data;
  },

  deleteGelombang: async (id: number) => {
    const response = await api.delete(`/spmb/gelombang/${id}`);
    return response.data;
  },

  // Pendaftaran (Calon Mhs)
  getMyPendaftaran: async () => {
    const response = await api.get('/spmb/pendaftaran/me');
    return response.data;
  },

  resetPendaftaran: async () => {
    const response = await api.post('/spmb/pendaftaran/reset');
    return response.data;
  },

  reissueVa: async () => {
    const response = await api.post('/spmb/pendaftaran/reissue-va');
    return response.data;
  },

  submitBiodata: async (data: Partial<PendaftaranCalonMhs>) => {
    const response = await api.post('/spmb/pendaftaran/biodata', data);
    return response.data;
  },

  finalizePendaftaran: async () => {
    const response = await api.post('/spmb/pendaftaran/finalize');
    return response.data;
  },

  downloadSkLulus: async (id: number | string) => {
    const response = await api.get(`/spmb/pendaftaran/${id}/sk-lulus`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadSkLulusPdf: async (id: number | string, noPendaftaran?: string) => {
    const response = await api.get(`/spmb/pendaftaran/${id}/sk-lulus`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = noPendaftaran ? `SK-Tanda-Lulus-${noPendaftaran}.pdf` : `SK-Tanda-Lulus-${id}.pdf`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  terbitkanSk: async (
    id: number | string
  ): Promise<{
    status: string;
    message: string;
    data: {
      status: 'menunggu_verifikasi' | 'diterbitkan';
      arsip_request_id: number;
      nomor_sk: string | null;
      sk_file_path: string | null;
      sk_file_url: string | null;
    };
  }> => {
    const response = await api.post(`/spmb/pendaftaran/${id}/terbitkan-sk`);
    return response.data;
  },

  // Kuota Prodi
  getKuotaProdi: async (params?: {
    page?: number;
    per_page?: number;
    tahun_akademik_id?: string | number;
    program_studi_id?: string | number;
    status_kuota?: string;
    min_kuota?: number;
    sort_by?: string;
    sort_dir?: string;
  }) => {
    const response = await api.get('/spmb/kuota-prodi', { params });
    return response.data;
  },
  storeKuotaProdi: async (data: { tahun_akademik_id: number; program_studi_id: number; kuota_total: number }) => {
    const response = await api.post('/spmb/kuota-prodi', data);
    return response.data;
  },
  updateKuotaProdi: async (id: number, data: { kuota_total: number }) => {
    const response = await api.put(`/spmb/kuota-prodi/${id}`, data);
    return response.data;
  },
  deleteKuotaProdi: async (id: number) => {
    const response = await api.delete(`/spmb/kuota-prodi/${id}`);
    return response.data;
  },

  // Daftar Ulang Actions
  generateTagihanDaftarUlang: async (id: number) => {
    const response = await api.post(`/spmb/daftar-ulang/${id}/generate-tagihan`);
    return response.data;
  },
  konfirmasiDaftarUlang: async (id: number) => {
    const response = await api.post(`/spmb/daftar-ulang/${id}/konfirmasi`);
    return response.data;
  },

  uploadBerkas: async (data: FormData) => {
    const response = await api.post('/spmb/pendaftaran/berkas', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Admin Pendaftaran
  getPendaftaran: async (params?: { search?: string; status?: string; order_by?: string; order_dir?: string; page?: number; per_page?: number }) => {
    const response = await api.get('/spmb/pendaftaran', { params });
    return response.data;
  },

  getPendaftaranDetail: async (id: number) => {
    const response = await api.get(`/spmb/pendaftaran/${id}`);
    return response.data;
  },

  getPendaftaranManualReferrers: async (search?: string) => {
    const response = await api.get('/spmb/pendaftaran/manual/referrers', { params: { search } });
    return response.data as { status: string; data: Array<{ id: number; name: string; username: string; email: string; referral_code: string }> };
  },

  getPendaftaranManualThirdParties: async (search?: string) => {
    const response = await api.get('/spmb/pendaftaran/manual/third-parties', { params: { search } });
    return response.data as { status: string; data: Array<{ id: number; name: string; username: string; email: string }> };
  },

  createPendaftaranManualThirdParty: async (data: { name: string; email: string; phone: string }) => {
    const response = await api.post('/spmb/pendaftaran/manual/third-parties', data);
    return response.data as { status: string; data: { id: number; name: string; username: string; email: string } };
  },

  createPendaftaranManual: async (data: FormData) => {
    const response = await api.post('/spmb/pendaftaran/manual', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  downloadBuktiTransferManual: async (pendaftaranId: number, proofId: number) => {
    const response = await api.get(`/spmb/pendaftaran/${pendaftaranId}/bukti-transfer/${proofId}`, { responseType: 'blob' });
    return response.data as Blob;
  },

  verifyBerkasPendaftaran: async (id: number, data: { is_verified: boolean; catatan?: string }) => {
    const response = await api.post(`/spmb/pendaftaran/berkas/${id}/verify`, data);
    return response.data;
  },

  updateStatusPendaftaran: async (id: number, data: { status: string; catatan_verifikasi?: string }) => {
    const response = await api.post(`/spmb/pendaftaran/${id}/status`, data);
    return response.data;
  },

  getSikeuTarifList: async (moduleId?: number) => {
    try {
      const url = moduleId ? `/v1/sikeu/master/master-biaya?module_id=${moduleId}` : '/v1/sikeu/master/master-biaya?module=spmb';
      const response = await api.get(url);
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data;
      }
      const allBiaya = await api.get('/v1/sikeu/master/master-biaya');
      if (allBiaya.data && Array.isArray(allBiaya.data.data) && allBiaya.data.data.length > 0) {
        return allBiaya.data;
      }
      const fallback = await api.get('/v1/sikeu/master/tarif-spmb');
      return fallback.data;
    } catch {
      return { status: 'success', data: [] };
    }
  },

  getTahunAkademikList: async () => {
    try {
      const response = await api.get('/spmb/tahun-akademik');
      return response.data;
    } catch {
      return { status: 'success', data: [] };
    }
  },


  getMasterTipeJalur: async (params?: { page?: number; limit?: number; search?: string; sort_by?: string; sort_dir?: string }) => {
    const response = await api.get('/spmb/master-tipe-jalur', { params });
    return response.data;
  },
  createMasterTipeJalur: async (data: { kode: string; nama: string; alur?: { nama_tahap: string; urutan?: number }[] }) => {
    const response = await api.post('/spmb/master-tipe-jalur', data);
    return response.data;
  },
  updateMasterTipeJalur: async (id: number, data: { kode: string; nama: string; alur?: { nama_tahap: string; urutan?: number }[] }) => {
    const response = await api.put(`/spmb/master-tipe-jalur/${id}`, data);
    return response.data;
  },
  deleteMasterTipeJalur: async (id: number) => {
    const response = await api.delete(`/spmb/master-tipe-jalur/${id}`);
    return response.data;
  },
  getReferensi: async (tipe: string) => {
    try {
      const response = await api.get(`/spmb/referensi/${tipe}`);
      return response.data;
    } catch {
      const fallback = await api.get(`/v1/sikeu/master/referensi/${tipe}`);
      return fallback.data;
    }
  },

  // Berkas Requirement
  getBerkasRequirements: async (params?: { search?: string; jalur_masuk_id?: number | string; is_active?: boolean | string; page?: number; limit?: number; sort_by?: string; sort_dir?: string }) => {
    const response = await api.get('/spmb/master/berkas-requirement', { params });
    return response.data;
  },

  getBerkasRequirementById: async (id: number) => {
    const response = await api.get(`/spmb/master/berkas-requirement/${id}`);
    return response.data;
  },

  createBerkasRequirement: async (data: Partial<BerkasRequirement>) => {
    const response = await api.post('/spmb/master/berkas-requirement', data);
    return response.data;
  },

  updateBerkasRequirement: async (id: number, data: Partial<BerkasRequirement>) => {
    const response = await api.put(`/spmb/master/berkas-requirement/${id}`, data);
    return response.data;
  },

  deleteBerkasRequirement: async (id: number) => {
    const response = await api.delete(`/spmb/master/berkas-requirement/${id}`);
    return response.data;
  },

  // ====================================================
  // MASTER KOMPONEN BIAYA (DINAMIS)
  // ====================================================
  getKomponenBiayaList: async (params?: {
    search?: string;
    is_active?: boolean | string;
    kategori?: string;
    per_page?: number;
    limit?: number;
    page?: number;
    sort_by?: string;
    sort_order?: string;
    tipe_potongan?: boolean | string;
  }) => {
    const formattedParams = {
      ...params,
      per_page: params?.per_page || params?.limit || 10,
    };
    const response = await api.get('/spmb/master/komponen-biaya', { params: formattedParams });
    return response.data;
  },

  getKomponenBiayaById: async (id: number) => {
    const response = await api.get(`/spmb/master/komponen-biaya/${id}`);
    return response.data;
  },

  createKomponenBiaya: async (data: {
    kode?: string;
    nama: string;
    kategori?: string;
    tipe_potongan?: boolean;
    is_referral_reward?: boolean;
    is_default_master_biaya?: boolean;
    role_rewards?: { role_id: number; nominal: number }[];
    urutan?: number;
    position_type?: string;
    reference_id?: number;
    is_active?: boolean;
    keterangan?: string;
  }) => {
    const response = await api.post('/spmb/master/komponen-biaya', data);
    return response.data;
  },

  updateKomponenBiaya: async (
    id: number,
    data: {
      kode?: string;
      nama: string;
      kategori?: string;
      tipe_potongan?: boolean;
      is_referral_reward?: boolean;
      is_default_master_biaya?: boolean;
      role_rewards?: { role_id: number; nominal: number }[];
      urutan?: number;
      position_type?: string;
      reference_id?: number;
      is_active?: boolean;
      keterangan?: string;
    }
  ) => {
    const response = await api.put(`/spmb/master/komponen-biaya/${id}`, data);
    return response.data;
  },

  getKomponenBiayaRoleOptions: async (params?: {
    search?: string;
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<{
    status: string;
    message: string;
    data: { id: number; slug: string; name: string }[];
  }> => {
    const response = await api.get('/spmb/master/komponen-biaya-role-options', { params });
    return response.data;
  },

  deleteKomponenBiaya: async (id: number) => {
    const response = await api.delete(`/spmb/master/komponen-biaya/${id}`);
    return response.data;
  },

  // ====================================================
  // MASTER BIAYA SPMB (HEADER & DETAIL MATRIX)
  // ====================================================
  getMasterBiayaList: async (params?: {
    master_tipe_jalur_id?: number | string;
    program_studi_id?: number | string;
    nomor_sk?: string;
    search?: string;
    is_active?: boolean | string;
    jumlah_komponen?: number | string;
    beban_pendaftaran?: number | string;
    beban_daftar_ulang?: number | string;
    total_biaya?: number | string;
    page?: number;
    per_page?: number;
    limit?: number;
    sort_by?: string;
    sort_dir?: string;
  }) => {
    const formattedParams = {
      ...params,
      per_page: params?.per_page || params?.limit || 15,
    };
    const response = await api.get('/spmb/master/biaya', { params: formattedParams });
    return response.data;
  },

  getMasterBiayaById: async (id: number) => {
    const response = await api.get(`/spmb/master/biaya/${id}`);
    return response.data;
  },

  createMasterBiaya: async (data: {
    master_tipe_jalur_id: number;
    program_studi_id: number;
    nomor_sk?: string;
    is_active?: boolean;
    keterangan?: string;
    items: { komponen_biaya_id: number; nominal: number; dibebankan_saat_pendaftaran?: boolean; berlaku_diskon?: boolean; keterangan?: string }[];
  }) => {
    const response = await api.post('/spmb/master/biaya', data);
    return response.data;
  },

  updateMasterBiaya: async (
    id: number,
    data: {
      master_tipe_jalur_id?: number;
      program_studi_id?: number;
      nomor_sk?: string;
      is_active?: boolean;
      keterangan?: string;
      items?: { komponen_biaya_id: number; nominal: number; dibebankan_saat_pendaftaran?: boolean; berlaku_diskon?: boolean; keterangan?: string }[];
    }
  ) => {
    const response = await api.put(`/spmb/master/biaya/${id}`, data);
    return response.data;
  },

  deleteMasterBiaya: async (id: number) => {
    const response = await api.delete(`/spmb/master/biaya/${id}`);
    return response.data;
  },

  getBiayaPendaftaran: async (params: { master_tipe_jalur_id: number; program_studi_id: number }) => {
    const response = await api.get('/spmb/biaya-pendaftaran', { params });
    return response.data;
  },

  // ====================================================
  // POTONGAN BIAYA KUSTOM PER CALON MAHASISWA (SPMB)
  // ====================================================
  getPotonganCalon: async (
    pendaftaranId: number,
    params?: { search?: string; status?: string; tahap?: string; page?: number; per_page?: number; sort_by?: string; sort_order?: string }
  ): Promise<{ status: string; message: string; data: SpmbPotonganCalon[]; meta?: any }> => {
    const response = await api.get(`/spmb/pendaftaran/${pendaftaranId}/potongan`, {
      params: { per_page: params?.per_page || 100, ...params },
    });
    return response.data;
  },

  createPotonganCalon: async (
    pendaftaranId: number,
    data: {
      komponen_biaya_id: number;
      nama_potongan: string;
      tipe_potongan: 'nominal' | 'persen';
      nilai_potongan: number;
      tahap: 'pendaftaran' | 'daftar_ulang' | 'keduanya';
      nomor_sk?: string;
      keterangan?: string;
      berlaku_mulai?: string | null;
      berlaku_sampai?: string | null;
      status?: 'draft' | 'aktif' | 'dibatalkan';
    }
  ) => {
    const response = await api.post(`/spmb/pendaftaran/${pendaftaranId}/potongan`, data);
    return response.data;
  },

  updatePotonganCalon: async (
    id: number,
    data: Partial<{
      komponen_biaya_id: number;
      nama_potongan: string;
      tipe_potongan: 'nominal' | 'persen';
      nilai_potongan: number;
      tahap: 'pendaftaran' | 'daftar_ulang' | 'keduanya';
      nomor_sk?: string | null;
      keterangan?: string | null;
      berlaku_mulai?: string | null;
      berlaku_sampai?: string | null;
      status?: 'draft' | 'aktif' | 'dibatalkan';
    }>
  ) => {
    const response = await api.put(`/spmb/potongan-calon/${id}`, data);
    return response.data;
  },

  deletePotonganCalon: async (id: number) => {
    const response = await api.delete(`/spmb/potongan-calon/${id}`);
    return response.data;
  },

  // ====================================================
  // HASIL SELEKSI (PENETAPAN KELULUSAN) — ADMIN SPMB
  // ====================================================
  tetapkanHasilSeleksi: async (
    pendaftaranId: number,
    data: {
      status: 'lulus' | 'tidak_lulus' | 'cadangan';
      program_studi_diterima_id?: number;
      nilai_total?: number;
      peringkat?: number;
      catatan?: string;
    }
  ) => {
    const response = await api.post(`/spmb/pendaftaran/${pendaftaranId}/tetapkan-kelulusan`, data);
    return response.data;
  },

  // ====================================================
  // REFERRAL — Kode Rujukan Mahasiswa Baru
  // ====================================================
  validateReferral: async (code: string): Promise<{ status: string; message: string; data: ReferralValidationResult }> => {
    const response = await api.get('/spmb/referral/validate', { params: { code } });
    return response.data;
  },

  getMyReferral: async (): Promise<{ status: string; message: string; data: MyReferralData }> => {
    const response = await api.get('/spmb/referral/saya');
    return response.data;
  },

  getReferralReport: async (params?: {
    search?: string;
    referrer?: string;
    pendaftar?: string;
    status?: string;
    referral_code?: string;
    gelombang_id?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
  }) => {
    const response = await api.get('/spmb/laporan/referral', { params });
    return response.data;
  },

  getReferralSummary: async (): Promise<{
    status: string;
    message: string;
    data: { claimed: number; qualified: number; rewarded: number; cancelled: number };
  }> => {
    const response = await api.get('/spmb/laporan/referral-summary');
    return response.data;
  },

  getMyReferralUsages: async (params?: {
    search?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
  }): Promise<ReferralUsagesResponse> => {
    const response = await api.get('/spmb/referral/saya/usages', { params });
    return response.data;
  },

  createReferralPayout: async (data: {
    keterangan?: string;
    nama_bank: string;
    nomor_rekening: string;
    nama_pemilik_rekening: string;
  }): Promise<{
    status: string;
    message: string;
    data: ReferralPayoutResult;
  }> => {
    const response = await api.post('/spmb/referral/payout', data ?? {});
    return response.data;
  },

  downloadReferralPayout: async (id: number): Promise<Blob> => {
    const response = await api.get(`/spmb/referral/payout/${id}/download`, { responseType: 'blob' });
    return response.data as Blob;
  },

  getTemplateSurat: async (params?: GetTemplateSuratParams) => {
    const response = await api.get('/spmb/template-surat', { params });
    return response.data;
  },

  getTemplateSuratArsipOptions: async (): Promise<{
    modules: { id: number; name: string; code: string }[];
    klasifikasi: { id: number; kode: string; nama: string }[];
    unit: { id: number; kode: string; nama: string }[];
    kop_surat: {
      id: number;
      nama: string;
      file_url?: string | null;
      nama_institusi?: string | null;
      alamat_institusi?: string | null;
      kontak_institusi?: string | null;
      website_institusi?: string | null;
    } | null;
  }> => {
    const response = await api.get('/spmb/template-surat-arsip-opsi');
    return response.data.data;
  },

  getTemplateSuratDetail: async (id: number | string): Promise<{ status: string; message: string; data: TemplateSuratSpmb }> => {
    const response = await api.get(`/spmb/template-surat/${id}`);
    return response.data;
  },

  createTemplateSurat: async (payload: TemplateSuratSpmbPayload): Promise<{ status: string; message: string; data: TemplateSuratSpmb }> => {
    const response = await api.post('/spmb/template-surat', payload);
    return response.data;
  },

  updateTemplateSurat: async (id: number | string, payload: Partial<TemplateSuratSpmbPayload>): Promise<{ status: string; message: string; data: TemplateSuratSpmb }> => {
    const response = await api.put(`/spmb/template-surat/${id}`, payload);
    return response.data;
  },

  deleteTemplateSurat: async (id: number | string): Promise<{ status: string; message: string }> => {
    const response = await api.delete(`/spmb/template-surat/${id}`);
    return response.data;
  },

  previewTemplateSuratPdf: async (id: number | string): Promise<Blob> => {
    const response = await api.get(`/spmb/template-surat/${id}/preview`, { responseType: 'blob' });
    return response.data as Blob;
  },

  /**
   * Konversi manual calon mahasiswa → mahasiswa resmi oleh Admin SPMB.
   * Langsung menerbitkan NIM, assign role mahasiswa, dan buat email kampus.
   * Hanya dapat dipanggil untuk pendaftaran berstatus `lulus_administrasi`.
   */
  konversiMahasiswa: async (
    id: number,
    options?: { force?: boolean }
  ): Promise<{
    status: string;
    message: string;
    data: { pendaftaran: PendaftaranCalonMhs; nim: string; mahasiswa_id: number };
  }> => {
    const response = await api.post(`/spmb/pendaftaran/${id}/konversi-mahasiswa`, options || {});
    return response.data;
  },
};

