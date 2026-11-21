import type { SelectOption } from '@/components/ui/Select';

export interface AdminProdiEligiblePersonnel {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  personnel_type: string;
  personnel_identifier: string;
  homebase: string | null;
}

export interface AdminProdiProgramOption {
  id: number;
  kode_prodi: string;
  nama: string;
}

export type MahasiswaStatusCode = 'A' | 'C' | 'G' | 'M' | 'N' | 'U';

export const MAHASISWA_STATUS_LABELS: Record<MahasiswaStatusCode, string> = {
  A: 'Aktif',
  C: 'Cuti',
  G: 'Sedang Double Degree',
  M: 'Kampus Merdeka',
  N: 'Non-Aktif',
  U: 'Menunggu Ujian',
};

export const MAHASISWA_STATUS_OPTIONS: SelectOption[] = Object.entries(MAHASISWA_STATUS_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export function mahasiswaStatusLabel(status?: string | null): string {
  const code = status?.trim().toUpperCase() as MahasiswaStatusCode | undefined;
  return code ? MAHASISWA_STATUS_LABELS[code] ?? status ?? '-' : '-';
}

export function isMahasiswaAktif(status?: string | null): boolean {
  return status?.trim().toUpperCase() === 'A';
}

export interface Mahasiswa {
    id: number;
    nim: string;
    nama_lengkap: string;
    program_studi_id: number;
    angkatan: number;
    status: MahasiswaStatusCode;
    // ... add more properties based on backend models
}

export interface MataKuliah {
    id: number;
    kode_mk: string;
    nama: string;
    sks_teori: number;
    sks_praktik: number;
    total_sks: number;
    semester_anjuran: number;
    tipe: 'wajib' | 'pilihan' | 'wajib_prodi';
}

export interface Kelas {
    id: number;
    kode_kelas: string;
    nama_kelas: string;
    mata_kuliah_id: number;
    mata_kuliah?: MataKuliah;
    kuota_krs: number;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
}

export interface Krs {
    id: number;
    mahasiswa_id: number;
    tahun_akademik_id: number;
    total_sks_diambil: number;
    status: 'draft' | 'diajukan' | 'disetujui' | 'dikunci' | 'dibatalkan';
    locked_by_keuangan: boolean;
}

/**
 * Whitelist kolom `sort_by` pada daftar master mata kuliah.
 *
 * Nama kolom nyata pada tabel `siakad_mata_kuliah` (backend whitelist
 * `MataKuliahController`), bukan entitas master, jadi closed-set yang stabil.
 */
export const MATAKULIAH_SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'nama', label: 'Nama Mata Kuliah' },
  { value: 'kode_mk', label: 'Kode MK' },
  { value: 'total_sks', label: 'Total SKS' },
  { value: 'semester_anjuran', label: 'Semester' },
  { value: 'tipe', label: 'Tipe MK' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

/**
 * Pindah program studi — pemilik mutasi SIAKAD.
 * SIKEU hanya menerima proyeksi via event MahasiswaPindahProdi.
 */
export type PindahProdiStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled';

export interface PindahProdi {
  id: number;
  mahasiswa_id: number;
  old_program_studi_id?: number | null;
  new_program_studi_id: number;
  tahun_akademik_id?: number | null;
  semester_efektif?: number | null;
  tanggal_efektif?: string | null;
  alasan: string;
  referensi_surat?: string | null;
  status: PindahProdiStatus;
  hasil_cek_keuangan?: 'layak' | 'ada_tunggakan' | null;
  catatan_keuangan?: string | null;
  created_at?: string;
}
