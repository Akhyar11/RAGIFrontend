// ============================================================
// CONSTANTS — Konstanta global untuk SSO Campus
// ============================================================

import type { SelectOption } from '@/components/ui/Select';

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SSO Campus';
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

// ============================================================
// TOKEN
// ============================================================
export const TOKEN_KEY = 'sso_access_token';
export const REFRESH_TOKEN_KEY = 'sso_refresh_token';
export const USER_KEY = 'sso_user';

// ============================================================
// ROUTES — Daftar route aplikasi
// ============================================================
export const ROUTES = {
  // Auth
  LOGIN: '/login',
  LOGIN_SSO: '/login/sso',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  MFA: '/mfa',

  // Main
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  PROFILE_SESSIONS: '/profile/sessions',
  PROFILE_MFA: '/profile/mfa',

  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_PERMISSIONS: '/admin/permissions',
  ADMIN_ROLE_PERMISSIONS: '/admin/role-permissions',
  ADMIN_USER_ROLES: '/admin/user-roles',
  ADMIN_SESSIONS: '/admin/sessions',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',

  // SIMPEG Modul
  SIMPEG_DASHBOARD: '/simpeg',
  SIMPEG_UNIT_KERJA: '/simpeg/unit-kerja',
  SIMPEG_JABATAN: '/simpeg/jabatan',
  SIMPEG_PEGAWAI: '/simpeg/pegawai',

  // SIKEU Modul
  SIKEU_DASHBOARD: '/sikeu',
  SIKEU_TAGIHAN: '/sikeu/pembayaran-mahasiswa/tagihan',
  SIKEU_PEMBAYARAN: '/sikeu/pembayaran-mahasiswa/bayar',
  SIKEU_DISPENSASI: '/sikeu/dispensasi',
  SIKEU_APPROVAL: '/sikeu/approval',
  SIKEU_PEMASUKAN: '/sikeu/pemasukan',
  SIKEU_PENGELUARAN: '/sikeu/pengeluaran',
  SIKEU_UNIT_KAS: '/sikeu/unit-kas',
  SIKEU_PENCAIRAN: '/sikeu/pencairan',
  SIKEU_COA: '/sikeu/akuntansi/coa',
  SIKEU_JURNAL: '/sikeu/akuntansi/jurnal',
  SIKEU_BUKU_BESAR: '/sikeu/akuntansi/buku-besar',
  SIKEU_LAPORAN: '/sikeu/akuntansi/laporan',
  SIKEU_PAJAK: '/sikeu/pajak',
  SIKEU_MASTER: '/sikeu/master',
} as const;

// ============================================================
// USER TYPE LABELS — Sesuai ERD: users.user_type enum
// ============================================================
export const USER_TYPE_LABELS: Record<string, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  tendik: 'Tenaga Kependidikan',
  admin: 'Administrator',
  calon_mhs: 'Calon Mahasiswa',
};

export const USER_TYPE_COLORS: Record<string, string> = {
  mahasiswa: 'badge-blue',
  dosen: 'badge-green',
  tendik: 'badge-yellow',
  admin: 'badge-red',
  calon_mhs: 'badge-gray',
};

// ============================================================
// PERMISSION ACTIONS — Sesuai ERD: permissions.action enum
// ============================================================
export const PERMISSION_ACTIONS = ['create', 'read', 'update', 'delete', 'approve'] as const;

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
  create: 'Buat',
  read: 'Lihat',
  update: 'Ubah',
  delete: 'Hapus',
  approve: 'Setujui',
};

// ============================================================
// MODULES — Modul-modul yang terdaftar di sistem kampus
// Sesuai 10 domain ERD Ekosistem Kampus
// (konstanta prefix rute; sumber kebenaran data tetap Master Modul via API)
// ============================================================
export const SYSTEM_MODULES = [
  { value: 'iam', label: 'IAM & Auth Center' },
  { value: 'spmb', label: 'SPMB' },
  { value: 'siakad', label: 'SIAKAD' },
  { value: 'lms', label: 'LMS' },
  { value: 'obe', label: 'OBE' },
  { value: 'simpi', label: 'SIMPI' },
  { value: 'simanta', label: 'SIMANTA' },
  { value: 'simpreskul', label: 'SIMPRESKUL' },
  { value: 'sikeu', label: 'SIKEU' },
  { value: 'simpeg', label: 'SIMPEG' },
  { value: 'sinapra', label: 'SINAPRA' },
  { value: 'arsip', label: 'ARSIP' },
  { value: 'kerjasama', label: 'Kerjasama' },
  { value: 'upm', label: 'UPM' },
] as const;

/**
 * Kode modul portal (SSO/IAM) — fallback terpusat bila daftar Master Modul
 * belum termuat. Bukan pengganti data Master Modul.
 */
export const DEFAULT_MODULE_CODE = 'sso';

/** Nilai header `x-tenant-module` saat request tidak berada di subdomain modul. */
export const TENANT_DEFAULT = 'default';

// ============================================================
// PAGINATION
// ============================================================
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ============================================================
// SORTING
// Arah pengurutan generik untuk seluruh DataTable/Drawer filter.
// Dipakai lewat `<Select options={SORT_ORDER_OPTIONS} />` supaya teks
// "naik/turun" konsisten dan tidak ditulis ulang di tiap halaman.
// ============================================================
export type SortOrder = 'asc' | 'desc';

export const SORT_ORDER_OPTIONS: SelectOption[] = [
  { value: 'asc', label: 'Naik / Terlama' },
  { value: 'desc', label: 'Turun / Terbaru' },
];

// ============================================================
// SIMPEG DOMAIN CONSTANTS
// ============================================================
export const JENIS_PEGAWAI_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Jenis' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'tendik', label: 'Tenaga Kependidikan (Tendik)' },
  { value: 'magang', label: 'Anak Magang / PKL' },
  { value: 'honorer', label: 'Honorer' },
];

export const JENIS_KOMPONEN_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Jenis' },
  { value: 'pendapatan', label: 'Pendapatan' },
  { value: 'potongan', label: 'Potongan' },
];

export const JENIS_KOMPONEN_FORM_OPTIONS: SelectOption[] = [
  { value: 'pendapatan', label: 'Pendapatan (Tunjangan / Insentif)' },
  { value: 'potongan', label: 'Potongan (Keterlambatan / Iuran)' },
];

export const TIPE_NILAI_KOMPONEN_OPTIONS: SelectOption[] = [
  { value: 'tetap', label: 'Nominal Tetap Bulanan' },
  { value: 'rumus_kehadiran', label: 'Tarif Harian Presensi' },
  { value: 'rumus_sks', label: 'Tarif per SKS Mengajar Dosen' },
  { value: 'rumus_pph21', label: 'Rumus Pajak Penghasilan (PPh 21)' },
  { value: 'persentase', label: 'Persentase Gaji Pokok' },
];

export const TIPE_NILAI_FILTER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Tipe Nilai' },
  { value: 'tetap', label: 'Nominal Tetap Bulanan' },
  { value: 'rumus_kehadiran', label: 'Tarif Harian Presensi' },
  { value: 'rumus_sks', label: 'Tarif per SKS Mengajar Dosen' },
  { value: 'rumus_pph21', label: 'Rumus Pajak Penghasilan (PPh 21)' },
  { value: 'persentase', label: 'Persentase Gaji Pokok' },
];

export const STATUS_VISIBILITAS_KOLOM_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status Visibilitas' },
  { value: 'true', label: 'Aktif di Kolom' },
  { value: 'false', label: 'Disembunyikan' },
];

export const SORT_BY_PEGAWAI_OPTIONS: SelectOption[] = [
  { value: 'nama_lengkap', label: 'Nama Lengkap' },
  { value: 'nip', label: 'NIP' },
  { value: 'id', label: 'ID Pegawai' },
];

export const SORT_BY_KOMPONEN_OPTIONS: SelectOption[] = [
  { value: 'urutan', label: 'Nomor Urutan' },
  { value: 'nama', label: 'Nama Komponen' },
  { value: 'kode', label: 'Kode Komponen' },
];

export const STATUS_ABSENSI_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status' },
  { value: 'true', label: 'Terdampak Presensi' },
  { value: 'false', label: 'Bebas Absensi' },
];

export const SERDOS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status Serdos' },
  { value: 'true', label: 'Sudah Tersertifikasi (Serdos)' },
  { value: 'false', label: 'Belum Tersertifikasi' },
];

export const SORT_BY_ANALITIK_OPTIONS: SelectOption[] = [
  { value: 'created_at', label: 'Tanggal Input' },
  { value: 'nama', label: 'Nama Pegawai' },
  { value: 'nip', label: 'NIP' },
];

// ============================================================
// HARI — Nilai tetap domain kalender (tabel master tidak ada)
// ============================================================
export type HariKey = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu';

export const HARI_OPTIONS: SelectOption[] = [
  { value: 'senin', label: 'Senin' },
  { value: 'selasa', label: 'Selasa' },
  { value: 'rabu', label: 'Rabu' },
  { value: 'kamis', label: 'Kamis' },
  { value: 'jumat', label: 'Jumat' },
  { value: 'sabtu', label: 'Sabtu' },
];

// ============================================================
// PUBLIC ROUTES — Route yang tidak memerlukan autentikasi
// ============================================================
export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.LOGIN_SSO,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
  ROUTES.MFA,
];

// ============================================================
// ADMIN ROUTES — Route yang hanya dapat diakses role admin
// ============================================================
export const ADMIN_ROUTES = [
  ROUTES.ADMIN_USERS,
  ROUTES.ADMIN_ROLES,
  ROUTES.ADMIN_PERMISSIONS,
  ROUTES.ADMIN_ROLE_PERMISSIONS,
  ROUTES.ADMIN_USER_ROLES,
  ROUTES.ADMIN_SESSIONS,
  ROUTES.ADMIN_AUDIT_LOGS,
];
