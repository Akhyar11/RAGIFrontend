import apiClient from '@/lib/axios';
import { buildExportFile } from '@/lib/download';
import { ApiResponse } from '@/types/api.types';
import {
  LmsKelasItem,
  LmsKelasOverview,
  LmsPertemuanDetail,
  LmsRekapAbsensi,
  LmsRekapMatrix,
  LmsKetercapaian,
  LmsQuizKolaborator,
  LmsMateriItem,
  LmsTugasItem,
  LmsKelasSetting,
  LmsIzinAbsensiItem,
  LmsPengumpulanTugas,
  LmsTokenGenerate,
  LmsTokenRotate,
  LmsBukaSesiPresensiResponse,
  LmsScanPresensiResult,
  LmsSesiPresensiAktifItem,
  LmsQuizItem,
  LmsQuizBatch,
  LmsQuizAttempt,
  LmsAttemptDetail,
  LmsQuizPreview,
  LmsTryoutPeserta,
  LmsMahasiswaRingkas,
  LmsForumTopik,
  LmsForumPost,
  LmsPertemuanItem,
  LmsPertemuanPayload,
  LmsDownloadUrl,
  LmsExportFile,
  LmsExportFormat,
  MetodeAbsensi,
  PengaturanStatus,
  LmsPresensiKelasItem,
  LmsPresensiRekapItem,
  LmsKeaktifanDosenItem,
  LmsNotifikasiItem,
  LmsNotifikasiUnreadCount,
  LmsDashboardOverview,
  LmsPengaturanModul,
  LmsPublicSettings,
} from '@/types/lms.types';

export const lmsService = {
  // 1. Kelas LMS
  getMyKelas: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    tahun_akademik_id?: number;
    program_studi_id?: number;
    min_kapasitas?: number;
  }): Promise<ApiResponse<LmsKelasItem[]>> => {
    const response = await apiClient.get('/v1/lms/kelas/my', { params });
    return response.data;
  },

  getKelasOverview: async (kelasId: number): Promise<ApiResponse<LmsKelasOverview>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/overview`);
    return response.data;
  },

  getRekapAbsensi: async (kelasId: number): Promise<ApiResponse<LmsRekapAbsensi>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/rekap-absensi`);
    return response.data;
  },

  /**
   * Matriks checklist mahasiswa x pertemuan (P1..Pn berisi H/S/I/A).
   * Endpoint baru: GET /kelas/{id}/rekap-matrix.
   */
  rekapMatrix: async (kelasId: number): Promise<ApiResponse<LmsRekapMatrix>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/rekap-matrix`);
    return response.data;
  },

  /**
   * Import materi dari kelas sumber ke kelas tujuan.
   * Endpoint baru: POST /kelas/{id}/import-materi.
   */
  importMateri: async (
    kelasId: number,
    payload: { sumber_kelas_id: number }
  ): Promise<ApiResponse<{ imported_count: number }>> => {
    const response = await apiClient.post(`/v1/lms/kelas/${kelasId}/import-materi`, payload);
    return response.data;
  },

  /**
   * Ketercapaian MK / OBE per mahasiswa.
   * Endpoint baru: GET /kelas/{id}/ketercapaian.
   */
  getKetercapaian: async (kelasId: number): Promise<ApiResponse<LmsKetercapaian>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/ketercapaian`);
    return response.data;
  },

  updateKelasSetting: async (kelasId: number, payload: Partial<LmsKelasSetting>): Promise<ApiResponse<LmsKelasSetting>> => {
    const response = await apiClient.put(`/v1/lms/kelas/${kelasId}/setting`, payload);
    return response.data;
  },

  // 2. Pertemuan
  getPertemuanDetail: async (pertemuanId: number): Promise<ApiResponse<LmsPertemuanDetail>> => {
    const response = await apiClient.get(`/v1/lms/pertemuan/${pertemuanId}`);
    return response.data;
  },

  /**
   * Daftar pertemuan dari seluruh kelas yang diakses user (endpoint agregat
   * module-level untuk halaman `/lms/pertemuan`).
   */
  listPertemuanSaya: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    tahun_akademik_id?: number;
    status_pertemuan?: string;
    kelas_id?: number;
  }): Promise<ApiResponse<LmsPertemuanItem[]>> => {
    const response = await apiClient.get('/v1/lms/pertemuan', { params });
    return response.data;
  },

  updatePertemuan: async (
    pertemuanId: number,
    payload: LmsPertemuanPayload
  ): Promise<ApiResponse<LmsPertemuanItem>> => {
    const response = await apiClient.put(`/v1/lms/pertemuan/${pertemuanId}`, payload);
    return response.data;
  },

  destroyPertemuan: async (pertemuanId: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/v1/lms/pertemuan/${pertemuanId}`);
    return response.data;
  },

  /**
   * Rekap pengaturan LMS per kelas (endpoint agregat module-level untuk
   * halaman `/lms/pengaturan`).
   */
  indexPengaturan: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    tahun_akademik_id?: number;
    metode_absensi?: MetodeAbsensi;
    status_konfigurasi?: PengaturanStatus;
  }): Promise<ApiResponse<LmsKelasItem[]>> => {
    const response = await apiClient.get('/v1/lms/pengaturan', { params });
    return response.data;
  },

  /**
   * Pengaturan LMS satu kelas (read-only). Bila kelas belum pernah
   * dikonfigurasi, backend mengembalikan setting bawaan.
   */
  getKelasSetting: async (kelasId: number): Promise<ApiResponse<LmsKelasSetting>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/setting`);
    return response.data;
  },

  // 3. Materi Pembelajaran
  createMateri: async (pertemuanId: number, formData: FormData): Promise<ApiResponse<LmsMateriItem>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/materi`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateMateri: async (materiId: number, payload: Partial<LmsMateriItem>): Promise<ApiResponse<LmsMateriItem>> => {
    const response = await apiClient.put(`/v1/lms/materi/${materiId}`, payload);
    return response.data;
  },

  deleteMateri: async (materiId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/materi/${materiId}`);
    return response.data;
  },

  uploadMateriFile: async (materiId: number, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/v1/lms/materi/${materiId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteMateriFile: async (fileId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/materi-file/${fileId}`);
    return response.data;
  },

  // 4. Tugas Perkuliahan & Sinkronisasi Nilai OBE
  createTugas: async (pertemuanId: number, payload: Partial<LmsTugasItem>): Promise<ApiResponse<LmsTugasItem>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/tugas`, payload);
    return response.data;
  },

  updateTugas: async (tugasId: number, payload: Partial<LmsTugasItem>): Promise<ApiResponse<LmsTugasItem>> => {
    const response = await apiClient.put(`/v1/lms/tugas/${tugasId}`, payload);
    return response.data;
  },

  deleteTugas: async (tugasId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/tugas/${tugasId}`);
    return response.data;
  },

  beriNilaiTugas: async (
    pengumpulanId: number,
    payload: { nilai: number; feedback_dosen?: string }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.put(`/v1/lms/pengumpulan/${pengumpulanId}/nilai`, payload);
    return response.data;
  },

  // 5. Presensi & Token Realtime
  generateTokenAbsensi: async (
    pertemuanId: number,
    windowMenit?: number
  ): Promise<ApiResponse<LmsTokenGenerate>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/token`, {
      window_menit: windowMenit,
    });
    return response.data;
  },

  rotateTokenAbsensi: async (pertemuanId: number): Promise<ApiResponse<LmsTokenRotate>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/token/rotate`);
    return response.data;
  },

  bukaSesiPresensi: async (
    pertemuanId: number,
    payload: {
      materi: string;
      catatan_pertemuan?: string | null;
      tanggal?: string | null;
      jam_mulai?: string | null;
      jam_selesai?: string | null;
      window_menit?: number;
    }
  ): Promise<ApiResponse<LmsBukaSesiPresensiResponse>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/buka-sesi`, payload);
    return response.data;
  },

  scanPresensi: async (payload: {
    qr_payload?: string;
    pertemuan_id?: number;
    token?: string;
    device_info?: string;
  }): Promise<ApiResponse<LmsScanPresensiResult>> => {
    const response = await apiClient.post('/v1/lms/presensi/scan', payload);
    return response.data;
  },

  getSesiPresensiAktif: async (params?: {
    tahun_akademik_id?: number;
  }): Promise<ApiResponse<LmsSesiPresensiAktifItem[]>> => {
    const response = await apiClient.get('/v1/lms/presensi/sesi-aktif', { params });
    return response.data;
  },

  tutupPresensi: async (pertemuanId: number): Promise<ApiResponse<{ id: number }>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/tutup-presensi`);
    return response.data;
  },

  bulkInputAbsensi: async (
    pertemuanId: number,
    absensi: Array<{ mahasiswa_id: number; status_id: number; catatan?: string }>
  ): Promise<ApiResponse<{ pertemuan_id: number; total_saved: number }>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/bulk-absensi`, { absensi });
    return response.data;
  },

  prosesIzin: async (
    izinId: number,
    payload: { status_id: number; catatan_dosen?: string }
  ): Promise<ApiResponse<LmsIzinAbsensiItem>> => {
    const response = await apiClient.patch(`/v1/lms/izin/${izinId}/proses`, payload);
    return response.data;
  },

  // 6. Mahasiswa Actions
  getMyAllTugas: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<ApiResponse<LmsTugasItem[]>> => {
    const response = await apiClient.get('/v1/lms/tugas/my', { params });
    return response.data;
  },

  inputTokenAbsensi: async (
    pertemuanId: number,
    token: string
  ): Promise<ApiResponse<{ pertemuan_id: number; is_present: boolean }>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/input-token`, { token });
    return response.data;
  },

  kumpulkanTugas: async (
    tugasId: number,
    formData: FormData
  ): Promise<ApiResponse<LmsPengumpulanTugas>> => {
    const response = await apiClient.post(`/v1/lms/tugas/${tugasId}/kumpul`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Perbarui pengumpulan tugas (berkas &/atau catatan).
   * Hanya bisa dilakukan bila pengumpulan belum dinilai.
   */
  updatePengumpulanTugas: async (
    tugasId: number,
    formData: FormData
  ): Promise<ApiResponse<LmsPengumpulanTugas>> => {
    const response = await apiClient.put(`/v1/lms/tugas/${tugasId}/kumpulan`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Tarik kembali / hapus pengumpulan tugas milik sendiri.
   */
  hapusPengumpulanTugas: async (tugasId: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/v1/lms/tugas/${tugasId}/kumpulan`);
    return response.data;
  },

  ajukanIzin: async (
    pertemuanId: number,
    formData: FormData
  ): Promise<ApiResponse<LmsIzinAbsensiItem>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/izin`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // 7. Download / Berkas Aman
  // Tipe & bentuk response mengikuti backend `LmsService::getDownloadUrl()`:
  // - type `materi` → id `lms_materi_file.id`
  // - type `pengumpulan` → id `lms_pengumpulan_tugas.id`
  getDownloadUrl: async (type: 'materi' | 'pengumpulan', id: number): Promise<ApiResponse<LmsDownloadUrl>> => {
    const response = await apiClient.get(`/v1/lms/download/${type}/${id}`);
    return response.data;
  },

  // 8. Quiz per Pertemuan (dosen kelola)
  createQuiz: async (pertemuanId: number, payload: Partial<LmsQuizItem>): Promise<ApiResponse<LmsQuizItem>> => {
    const response = await apiClient.post(`/v1/lms/pertemuan/${pertemuanId}/quiz`, payload);
    return response.data;
  },

  updateQuiz: async (quizId: number, payload: Partial<LmsQuizItem>): Promise<ApiResponse<LmsQuizItem>> => {
    const response = await apiClient.put(`/v1/lms/quiz/${quizId}`, payload);
    return response.data;
  },

  deleteQuiz: async (quizId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/quiz/${quizId}`);
    return response.data;
  },

  getQuizManage: async (quizId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}/manage`);
    return response.data;
  },

  attachQuizSoal: async (
    quizId: number,
    payload: { bank_soal_id: number; urutan?: number; poin?: number }
  ): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/soal`, payload);
    return response.data;
  },

  detachQuizSoal: async (quizSoalId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/quiz-soal/${quizSoalId}`);
    return response.data;
  },

  listQuizAttempts: async (quizId: number, params?: { page?: number; per_page?: number }): Promise<ApiResponse<LmsQuizAttempt[]>> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}/attempts`, { params });
    return response.data;
  },

  beriNilaiManual: async (attemptJawabanId: number, poin: number, feedback?: string): Promise<ApiResponse<any>> => {
    const payload: { poin: number; feedback_dosen?: string } = { poin };
    if (feedback !== undefined && feedback !== null && String(feedback).trim() !== '') {
      payload.feedback_dosen = String(feedback).trim();
    }
    const response = await apiClient.put(`/v1/lms/attempt-jawaban/${attemptJawabanId}/nilai`, payload);
    return response.data;
  },

  // 9. Tryout level Kelas
  listTryout: async (kelasId: number): Promise<ApiResponse<LmsQuizItem[]>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/tryout`);
    return response.data;
  },

  /**
   * Daftar tryout dari seluruh kelas yang diakses user (endpoint agregat
   * module-level untuk halaman `/lms/tryout`).
   */
  listTryoutSaya: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    tahun_akademik_id?: number;
    kelas_id?: number;
    standalone?: boolean;
  }): Promise<ApiResponse<LmsQuizItem[]>> => {
    const response = await apiClient.get('/v1/lms/tryout', { params });
    return response.data;
  },

  createTryout: async (
    kelasId: number | null | undefined,
    payload: Partial<LmsQuizItem> & { kolaborator_dosen_ids?: number[] }
  ): Promise<ApiResponse<LmsQuizItem>> => {
    if (kelasId && kelasId > 0) {
      const response = await apiClient.post(`/v1/lms/kelas/${kelasId}/tryout`, payload);
      return response.data;
    }
    const response = await apiClient.post('/v1/lms/tryout', {
      ...payload,
      kelas_id: null,
    });
    return response.data;
  },

  addTryoutPeserta: async (quizId: number, mahasiswaId: number): Promise<ApiResponse<LmsTryoutPeserta>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/peserta`, { mahasiswa_id: mahasiswaId });
    return response.data;
  },

  addTryoutPesertaByKelas: async (
    quizId: number,
    payload: {
      kelas?: string;
      program_studi_id?: number;
      angkatan?: number;
      kelas_perkuliahan_id?: number;
    }
  ): Promise<ApiResponse<{ added?: number; added_count?: number; skipped?: number; skipped_count?: number }>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/peserta-kelas`, payload);
    return response.data;
  },

  removeTryoutPeserta: async (pesertaId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/tryout-peserta/${pesertaId}`);
    return response.data;
  },

  /** Salin peserta eksplisit dari tryout lain pada kelas yang sama (idempoten). */
  copyTryoutPeserta: async (
    quizId: number,
    sourceQuizId: number
  ): Promise<ApiResponse<{ added: number; skipped: number; source_quiz_id: number }>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/peserta-copy`, {
      source_quiz_id: sourceQuizId,
    });
    return response.data;
  },

  /** Lepas beberapa soal sekaligus dari satu quiz/tryout (ditolak bila attempt sudah ada). */
  bulkDeleteQuizSoal: async (
    quizId: number,
    quizSoalIds: number[]
  ): Promise<ApiResponse<{ deleted: number; ids: number[] }>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/soal/bulk-delete`, {
      quiz_soal_ids: quizSoalIds,
    });
    return response.data;
  },

  /** Cari mahasiswa berdasarkan NIM/nama untuk pemilih peserta tryout. */
  searchMahasiswa: async (q: string, limit = 20): Promise<ApiResponse<LmsMahasiswaRingkas[]>> => {
    const response = await apiClient.get('/v1/lms/mahasiswa/search', { params: { q, limit } });
    return response.data;
  },

  // 10. Pengerjaan Quiz/Tryout (mahasiswa)
  getQuizMahasiswa: async (quizId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}`);
    return response.data;
  },

  startAttempt: async (quizId: number, kodeAkses?: string): Promise<ApiResponse<LmsQuizAttempt>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/start`, { kode_akses: kodeAkses });
    return response.data;
  },

  getQuizBatch: async (quizId: number, page: number): Promise<ApiResponse<LmsQuizBatch>> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}/soal`, { params: { page } });
    return response.data;
  },

  autosaveAttempt: async (
    attemptId: number,
    answers: Array<{ quiz_soal_id: number; bank_opsi_id?: number | null; jawaban_teks?: string | null }>
  ): Promise<ApiResponse<{ auto_submitted: boolean; attempt_id: number }>> => {
    const response = await apiClient.post(`/v1/lms/attempt/${attemptId}/autosave`, { answers });
    return response.data;
  },

  submitAttempt: async (attemptId: number): Promise<ApiResponse<LmsQuizAttempt>> => {
    const response = await apiClient.post(`/v1/lms/attempt/${attemptId}/submit`);
    return response.data;
  },

  /**
   * Defensif: endpoint paralel backend (`POST /v1/lms/attempt/{id}/reset`).
   * Mereset pengerjaan agar mahasiswa dapat mengulang dari awal.
   */
  resetAttempt: async (attemptId: number): Promise<ApiResponse<LmsQuizAttempt>> => {
    const response = await apiClient.post(`/v1/lms/attempt/${attemptId}/reset`);
    return response.data;
  },

  /**
   * Defensif: endpoint paralel backend (`GET /v1/lms/attempt/{id}/detail`).
   * Detail soal + jawaban mahasiswa + kunci untuk grading dosen.
   */
  getAttemptDetail: async (attemptId: number): Promise<ApiResponse<LmsAttemptDetail>> => {
    const response = await apiClient.get(`/v1/lms/attempt/${attemptId}/detail`);
    return response.data;
  },

  /**
   * Defensif: endpoint paralel backend (`GET /v1/lms/quiz/{id}/preview`).
   * Simulasi tampilan mahasiswa (tanpa kunci jawaban), read-only.
   */
  previewQuiz: async (quizId: number): Promise<ApiResponse<LmsQuizPreview>> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}/preview`);
    return response.data;
  },

  // 11. Forum diskusi kelas
  listForumTopik: async (kelasId: number, params?: { per_page?: number; pertemuan_id?: number }): Promise<ApiResponse<{ kelas: unknown; topik: LmsForumTopik[] }>> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/forum`, { params });
    return response.data;
  },

  /**
   * Daftar topik forum dari seluruh kelas yang diakses user (endpoint agregat
   * module-level untuk halaman `/lms/forum`).
   *
   * Berbeda dengan `listForumTopik`, endpoint ini read-only — tidak membuat
   * topik "Diskusi Umum" otomatis.
   */
  listTopikSaya: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    tahun_akademik_id?: number;
    kelas_id?: number;
  }): Promise<ApiResponse<LmsForumTopik[]>> => {
    const response = await apiClient.get('/v1/lms/forum', { params });
    return response.data;
  },

  createForumTopik: async (kelasId: number, payload: { judul: string; pertemuan_id?: number | null; is_pinned?: boolean }): Promise<ApiResponse<LmsForumTopik>> => {
    const response = await apiClient.post(`/v1/lms/kelas/${kelasId}/forum`, payload);
    return response.data;
  },

  /**
   * Pastikan topik default "Diskusi Umum" tersedia pada kelas (idempoten).
   *
   * Endpoint baca (`listForumTopik`) tidak lagi membuat topik secara otomatis
   * supaya GET tidak menulis data. Frontend memanggil ini saat daftar topik
   * kosong agar mahasiswa tetap bisa berdiskusi.
   */
  ensureForumTopikUmum: async (kelasId: number): Promise<ApiResponse<LmsForumTopik>> => {
    const response = await apiClient.post(`/v1/lms/kelas/${kelasId}/forum/umum`);
    return response.data;
  },

  deleteForumTopik: async (topikId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/forum/${topikId}`);
    return response.data;
  },

  /**
   * Ubah judul dan/atau status sematan topik (pengelola kelas).
   */
  updateForumTopik: async (
    topikId: number,
    payload: { judul: string; is_pinned?: boolean }
  ): Promise<ApiResponse<LmsForumTopik>> => {
    const response = await apiClient.put(`/v1/lms/forum/${topikId}`, payload);
    return response.data;
  },

  listForumPost: async (topikId: number, params?: { page?: number; per_page?: number }): Promise<ApiResponse<LmsForumPost[]>> => {
    const response = await apiClient.get(`/v1/lms/forum/${topikId}/post`, { params });
    return response.data;
  },

  createForumPost: async (topikId: number, payload: { isi: string; parent_id?: number | null }): Promise<ApiResponse<LmsForumPost>> => {
    const response = await apiClient.post(`/v1/lms/forum/${topikId}/post`, payload);
    return response.data;
  },

  deleteForumPost: async (postId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/forum-post/${postId}`);
    return response.data;
  },

  /**
   * Edit isi pesan (penulis sendiri atau pengelola kelas).
   */
  updateForumPost: async (postId: number, payload: { isi: string }): Promise<ApiResponse<LmsForumPost>> => {
    const response = await apiClient.put(`/v1/lms/forum-post/${postId}`, payload);
    return response.data;
  },

  // 12. Kolaborator tryout (dosen kelola tim per tryout)
  listKolaborator: async (quizId: number): Promise<ApiResponse<LmsQuizKolaborator[]>> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}/kolaborator`);
    return response.data;
  },

  addKolaborator: async (
    quizId: number,
    payload: { dosen_id: number; peran: string }
  ): Promise<ApiResponse<LmsQuizKolaborator>> => {
    const response = await apiClient.post(`/v1/lms/quiz/${quizId}/kolaborator`, payload);
    return response.data;
  },

  removeKolaborator: async (kolaboratorId: number): Promise<ApiResponse<{ id: number; is_deleted: boolean }>> => {
    const response = await apiClient.delete(`/v1/lms/quiz-kolaborator/${kolaboratorId}`);
    return response.data;
  },

  // 13. Export laporan (CSV / XLSX)
  // Endpoint ini membalas berkas (bukan JSON) — dipakai `responseType: 'blob'`
  // dan nama berkas diambil dari header `Content-Disposition`.
  exportRekapNilai: async (kelasId: number, format: LmsExportFormat = 'csv'): Promise<LmsExportFile> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/export/nilai`, {
      params: { format },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Rekap_Nilai_Kelas');
  },

  exportRekapPresensi: async (kelasId: number, format: LmsExportFormat = 'csv'): Promise<LmsExportFile> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/export/presensi`, {
      params: { format },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Rekap_Absensi_Kelas');
  },

  exportRekapIzin: async (kelasId: number, format: LmsExportFormat = 'csv'): Promise<LmsExportFile> => {
    const response = await apiClient.get(`/v1/lms/kelas/${kelasId}/export/absensi-izin`, {
      params: { format },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Rekap_Izin_Absensi');
  },

  exportPengumpulanTugas: async (tugasId: number, format: LmsExportFormat = 'csv'): Promise<LmsExportFile> => {
    const response = await apiClient.get(`/v1/lms/tugas/${tugasId}/export/pengumpulan`, {
      params: { format },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Rekap_Pengumpulan_Tugas');
  },

  exportHasilQuiz: async (quizId: number, format: LmsExportFormat = 'csv'): Promise<LmsExportFile> => {
    const response = await apiClient.get(`/v1/lms/quiz/${quizId}/export/hasil`, {
      params: { format },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Hasil_Quiz');
  },

  exportHasilTryout: async (quizId: number, format: LmsExportFormat = 'csv'): Promise<LmsExportFile> => {
    const response = await apiClient.get(`/v1/lms/tryout/${quizId}/export/hasil`, {
      params: { format },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Hasil_Tryout');
  },

  // Monitoring presensi lokal RAG/SIAKAD.
  indexKelasPresensi: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    tahun_akademik_id?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<ApiResponse<LmsPresensiKelasItem[]>> => {
    const response = await apiClient.get<ApiResponse<LmsPresensiKelasItem[]>>(
      '/v1/lms/admin/presensi/kelas',
      { params }
    );
    return response.data;
  },

  indexRekapPresensi: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    kelas_id?: number;
    pertemuan_ke?: number;
    status?: string;
    tahun_akademik_id?: number;
  }): Promise<ApiResponse<LmsPresensiRekapItem[]>> => {
    const response = await apiClient.get<ApiResponse<LmsPresensiRekapItem[]>>(
      '/v1/lms/admin/presensi/rekap',
      { params }
    );
    return response.data;
  },

  exportRekapPresensiAdmin: async (params?: {
    format?: LmsExportFormat;
    search?: string;
    kelas_id?: number;
    pertemuan_ke?: number;
    status?: string;
    tahun_akademik_id?: number;
  }): Promise<LmsExportFile> => {
    const response = await apiClient.get('/v1/lms/admin/presensi/export', {
      params: { format: params?.format ?? 'csv', ...params },
      responseType: 'blob',
    });
    return buildExportFile(response.data, response.headers['content-disposition'], 'Rekap_Presensi_LMS');
  },

  /**
   * Monitoring keaktifan dosen mengajar & presensi perkuliahan (Super Admin & Admin).
   */
  getKeaktifanDosen: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    prodi_id?: number | string;
    dosen_id?: number | string;
    status?: string;
    tahun_akademik_id?: number;
  }): Promise<ApiResponse<LmsKeaktifanDosenItem[]>> => {
    const response = await apiClient.get<ApiResponse<LmsKeaktifanDosenItem[]>>(
      '/v1/lms/admin/presensi/keaktifan-dosen',
      { params }
    );
    return response.data;
  },

  /**
   * Export laporan keaktifan dosen mengajar (CSV/XLSX).
   */
  exportKeaktifanDosen: async (params?: {
    format?: LmsExportFormat;
    search?: string;
    prodi_id?: number | string;
    dosen_id?: number | string;
    status?: string;
    tahun_akademik_id?: number;
  }): Promise<LmsExportFile> => {
    const response = await apiClient.get('/v1/lms/admin/presensi/keaktifan-dosen/export', {
      params: { format: params?.format ?? 'xlsx', ...params },
      responseType: 'blob',
    });
    return buildExportFile(
      response.data,
      response.headers['content-disposition'],
      'Laporan_Keaktifan_Mengajar_Dosen'
    );
  },

  // 15. Notifikasi In-App LMS
  /**
   * Daftar notifikasi milik pengguna yang sedang login.
   */
  getNotifikasi: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    jenis?: string;
    is_read?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<ApiResponse<LmsNotifikasiItem[]>> => {
    const response = await apiClient.get<ApiResponse<LmsNotifikasiItem[]>>(
      '/v1/lms/notifikasi',
      { params }
    );
    return response.data;
  },

  /**
   * Jumlah notifikasi yang belum dibaca (untuk lonceng notifikasi).
   */
  getNotifikasiUnreadCount: async (): Promise<ApiResponse<LmsNotifikasiUnreadCount>> => {
    const response = await apiClient.get<ApiResponse<LmsNotifikasiUnreadCount>>(
      '/v1/lms/notifikasi/unread-count'
    );
    return response.data;
  },

  /**
   * Tandai satu notifikasi sebagai sudah dibaca.
   */
  markNotifikasiRead: async (notifikasiId: number): Promise<ApiResponse<LmsNotifikasiItem>> => {
    const response = await apiClient.post<ApiResponse<LmsNotifikasiItem>>(
      `/v1/lms/notifikasi/${notifikasiId}/read`
    );
    return response.data;
  },

  /**
   * Tandai seluruh notifikasi sebagai sudah dibaca.
   */
  markAllNotifikasiRead: async (): Promise<ApiResponse<{ updated: number }>> => {
    const response = await apiClient.post<ApiResponse<{ updated: number }>>(
      '/v1/lms/notifikasi/read-all'
    );
    return response.data;
  },

  // 16. Dashboard & Pengaturan Modul LMS
  /** Ringkasan dashboard split role + tren 7 hari (cache 5 menit di backend). */
  getDashboardOverview: async (params?: {
    tahun_akademik_id?: number;
  }): Promise<ApiResponse<LmsDashboardOverview>> => {
    const response = await apiClient.get<ApiResponse<LmsDashboardOverview>>(
      '/v1/lms/dashboard/overview',
      { params }
    );
    return response.data;
  },

  /** Pengaturan global modul LMS (`lms.pengaturan.read`). */
  getPengaturanModul: async (): Promise<ApiResponse<LmsPengaturanModul>> => {
    const response = await apiClient.get<ApiResponse<LmsPengaturanModul>>(
      '/v1/lms/pengaturan/modul'
    );
    return response.data;
  },

  /** Simpan pengaturan global modul LMS (`lms.pengaturan.manage`). */
  updatePengaturanModul: async (
    payload: Record<string, boolean | number | string>
  ): Promise<ApiResponse<Record<string, boolean | number | string>>> => {
    const response = await apiClient.put<ApiResponse<Record<string, boolean | number | string>>>(
      '/v1/lms/pengaturan/modul',
      payload
    );
    return response.data;
  },

  /** Pengaturan publik non-sensitif (tanpa autentikasi, cache 24 jam). */
  getPublicSettings: async (): Promise<ApiResponse<LmsPublicSettings>> => {
    const response = await apiClient.get<ApiResponse<LmsPublicSettings>>(
      '/v1/lms/public/settings'
    );
    return response.data;
  },
};
