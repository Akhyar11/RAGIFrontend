'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Filter,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Calendar,
  RefreshCw,
  Eye,
  Check,
  UserX,
  Clock,
  Layers,
  SlidersHorizontal,
  Pencil,
  RotateCcw,
  History,
  CalendarDays,
  FileSpreadsheet,
  ScanFace,
  Copy,
  UserCheck,
  ShieldAlert,
  Users,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { exportToExcel } from '@/lib/excel';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { simpegService } from '@/services/simpeg.service';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatJamMasukWIB, formatJamPulangWIB, formatJamWIB, getApiErrorMessage } from '@/lib/utils';
import type { PaginationMeta } from '@/types/api.types';
import type {
  AttendanceHistoryItem,
  AttendanceRecapData,
  AttendanceRecapRow,
  CutoffReport,
  AnnualSpMonitoringRow,
  AnnualSpMonitoringMeta,
} from '@/types/simpeg.types';

// ── ZOD SCHEMAS ─────────────────────────────────────────────

const keteranganFormSchema = z.object({
  pegawai_id: z.number().int('Pegawai wajib dipilih').min(1, 'Pegawai wajib dipilih'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi').regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  status_kehadiran: z.enum(['izin', 'sakit', 'dinas', 'alfa'], { message: 'Keterangan wajib dipilih' }),
  catatan: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});
type KeteranganFormValues = z.infer<typeof keteranganFormSchema>;

const cutoffFormSchema = z.object({
  date: z.string().min(10, 'Tanggal cut-off wajib diisi'),
  unit_kerja_id: z.number().optional().nullable(),
});
type CutoffFormValues = z.infer<typeof cutoffFormSchema>;


const editLogFormSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional().nullable(),
  jam_masuk: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format jam HH:MM / HH:MM:SS').optional().nullable(),
  jam_keluar: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format jam HH:MM / HH:MM:SS').optional().nullable(),
  status: z.enum(['hadir', 'terlambat', 'menunggu_approval', 'ditolak', 'izin', 'sakit', 'dinas', 'alfa']).optional().nullable(),
  catatan: z.string().max(1000, 'Catatan maksimal 1000 karakter').optional().nullable(),
});
type EditLogFormValues = z.infer<typeof editLogFormSchema>;

const KETERANGAN_OPTIONS = [
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'dinas', label: 'Dinas Luar' },
  { value: 'alfa', label: 'Alpa (Tanpa Keterangan)' },
];

const EDIT_STATUS_OPTIONS = [
  { value: '', label: '-- Biarkan --' },
  { value: 'hadir', label: 'Hadir' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'menunggu_approval', label: 'Menunggu Approval' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'dinas', label: 'Dinas Luar' },
  { value: 'alfa', label: 'Alpa' },
];

const RIWAYAT_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'hadir', label: 'Hadir (Tepat Waktu)' },
  { value: 'terlambat', label: 'Terlambat' },
  { value: 'menunggu_approval', label: 'Menunggu Approval' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: 'izin', label: 'Izin' },
  { value: 'sakit', label: 'Sakit' },
  { value: 'dinas', label: 'Dinas Luar' },
  { value: 'alfa', label: 'Alpa' },
];

const spFilterFormSchema = z.object({
  search: z.string().optional(),
  unit_kerja_id: z.string().optional(),
  risk_level: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});
type SpFilterFormValues = z.infer<typeof spFilterFormSchema>;

const SP_RISK_OPTIONS = [
  { value: 'all', label: 'Semua Status Kedisiplinan' },
  { value: 'rawan', label: 'Rawan / Sering SP (≥ 2x SP)' },
  { value: 'perhatian', label: 'Perhatian (1x SP)' },
  { value: 'has_sp', label: 'Pernah Terbit SP (≥ 1x SP)' },
  { value: 'disiplin', label: 'Disiplin (0 SP)' },
];

const SP_SORT_OPTIONS = [
  { value: 'total_sp', label: 'Total Surat Peringatan (SP)' },
  { value: 'total_terlambat', label: 'Akumulasi Keterlambatan' },
  { value: 'nama_lengkap', label: 'Nama Pegawai' },
  { value: 'nip', label: 'NIP Pegawai' },
];

const SP_SORT_DIR_OPTIONS = [
  { value: 'desc', label: 'Menurun / Terbanyak (Z-A)' },
  { value: 'asc', label: 'Menaik / Tersedikit (A-Z)' },
];

const YEAR_OPTIONS = [
  { value: '2024', label: 'Tahun 2024' },
  { value: '2025', label: 'Tahun 2025' },
  { value: '2026', label: 'Tahun 2026' },
  { value: '2027', label: 'Tahun 2027' },
];

const SP_MONTH_COLUMNS = [
  { key: '01', label: 'Jan' },
  { key: '02', label: 'Feb' },
  { key: '03', label: 'Mar' },
  { key: '04', label: 'Apr' },
  { key: '05', label: 'Mei' },
  { key: '06', label: 'Jun' },
  { key: '07', label: 'Jul' },
  { key: '08', label: 'Agu' },
  { key: '09', label: 'Sep' },
  { key: '10', label: 'Okt' },
  { key: '11', label: 'Nov' },
  { key: '12', label: 'Des' },
];

// ── KONTRAK RIWAYAT BULANAN (BACKEND_FIX_CLOCKOUT_DAN_RIWAYAT §3.1) ──
// Nilai status bersifat closed-set domain presensi; dideklarasikan terpusat di sini.
const RIWAYAT_STATUS_META: Record<string, { label: string; variant: 'green' | 'amber' | 'red' | 'blue' | 'purple' }> = {
  hadir: { label: 'Tepat Waktu', variant: 'green' },
  terlambat: { label: 'Terlambat', variant: 'amber' },
  ditolak: { label: 'Ditolak', variant: 'red' },
  menunggu_approval: { label: 'Menunggu Approval', variant: 'purple' },
  izin: { label: 'Izin', variant: 'blue' },
  sakit: { label: 'Sakit', variant: 'blue' },
  dinas: { label: 'Dinas Luar', variant: 'blue' },
  alfa: { label: 'Alpa', variant: 'red' },
};

const buildMonthOptions = () =>
  Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, i, 1)),
  }));

const buildYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => {
    const y = currentYear - 2 + i;
    return { value: String(y), label: String(y) };
  });
};

const MONTH_OPTIONS = buildMonthOptions();

const toStartEndOfMonth = (month: number, year: number) => {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start_date: `${year}-${mm}-01`,
    end_date: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
};

export default function PresensiPage() {
  const router = useRouter();
  const { user, hasPermission, isAdmin } = useAuth();
  const canManage = isAdmin || hasPermission('simpeg.presensi.manage');
  const canDelete = isAdmin || hasPermission('simpeg.presensi.delete') || hasPermission('simpeg.presensi.manage');

  // Active View Tab: 'realtime' | 'bundle' | 'sp_monitoring'
  const [activeTab, setActiveTab] = useState<'realtime' | 'bundle' | 'sp_monitoring' | 'riwayat'>('realtime');

  // Modal Konfirmasi Hapus/Reset UI
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
    confirmText: string;
  }>({
    isOpen: false,
    title: 'Konfirmasi Hapus',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
    confirmText: 'Hapus',
  });

  // ── TAB 1: LOG PRESENSI REALTIME STATE ──────────────────────
  const [loadingLog, setLoadingLog] = useState(true);
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tanggalFilter, setTanggalFilter] = useState('');
  const [sortBy, setSortBy] = useState('tanggal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Detail / Approval Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // ── EDIT / RESET LOG STATE ────────────────────────────────
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [resettingFaceId, setResettingFaceId] = useState<number | null>(null);

  // ── TAB 3: RIWAYAT & REKAP BULAN BERJALAN (§3.1–§3.2) ─────
  const nowDate = new Date();
  const [riwayatMonth, setRiwayatMonth] = useState(String(nowDate.getMonth() + 1));
  const [riwayatYear, setRiwayatYear] = useState(String(nowDate.getFullYear()));
  const [riwayatStatus, setRiwayatStatus] = useState('');
  const [riwayatPage, setRiwayatPage] = useState(1);
  const [riwayatLimit, setRiwayatLimit] = useState(15);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [riwayatList, setRiwayatList] = useState<AttendanceHistoryItem[]>([]);
  const [riwayatMeta, setRiwayatMeta] = useState<PaginationMeta | undefined>();
  const [showRiwayatDrawer, setShowRiwayatDrawer] = useState(false);
  const [recapPegawaiId, setRecapPegawaiId] = useState<number | null>(null);
  const [recapPegawaiOption, setRecapPegawaiOption] = useState<{ value: number; label: string } | null>(null);
  const [loadingRecap, setLoadingRecap] = useState(false);
  const [recapData, setRecapData] = useState<AttendanceRecapData | null>(null);

  // ── TAB 2: BUNDLE REKAP STATE ───────────────────────────────
  const [bundleList, setBundleList] = useState<any[]>([]);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [bundleMeta, setBundleMeta] = useState<PaginationMeta | undefined>();
  const [bundleSearch, setBundleSearch] = useState('');
  const [bundlePage, setBundlePage] = useState(1);
  const [bundleLimit, setBundleLimit] = useState(10);
  // ── CUT-OFF OTOMASI STATE ───────────────────────────────────
  const [showCutoffModal, setShowCutoffModal] = useState(false);
  const [runningCutoff, setRunningCutoff] = useState(false);
  const [cutoffReport, setCutoffReport] = useState<CutoffReport | null>(null);
  const [unitKerjaOptions, setUnitKerjaOptions] = useState<{ value: number; label: string }[]>([]);

  // ── KETERANGAN KETIDAKHADIRAN STATE ─────────────────────────
  const [showKeteranganModal, setShowKeteranganModal] = useState(false);
  const [savingKeterangan, setSavingKeterangan] = useState(false);

  // ── TAB 3: MONITORING SP TAHUNAN (12 BULAN) STATE ───────────
  const currentYear = new Date().getFullYear();
  const [spSelectedYear, setSpSelectedYear] = useState<number>(currentYear);
  const [spLoading, setSpLoading] = useState(false);
  const [spMonitoringData, setSpMonitoringData] = useState<AnnualSpMonitoringRow[]>([]);
  const [spMeta, setSpMeta] = useState<AnnualSpMonitoringMeta | undefined>();
  const [spSearch, setSpSearch] = useState('');
  const [spRiskLevel, setSpRiskLevel] = useState('all');
  const [spUnitKerjaId, setSpUnitKerjaId] = useState<number | undefined>();
  const [spSortBy, setSpSortBy] = useState('total_sp');
  const [spSortDir, setSpSortDir] = useState<'asc' | 'desc'>('desc');
  const [spPage, setSpPage] = useState(1);
  const [spLimit, setSpLimit] = useState(15);
  const [showSpFilterDrawer, setShowSpFilterDrawer] = useState(false);

  const [spUnitKerjaLabel, setSpUnitKerjaLabel] = useState('');

  const formSpFilter = useForm<SpFilterFormValues>({
    resolver: zodResolver(spFilterFormSchema),
    defaultValues: {
      search: '',
      unit_kerja_id: '',
      risk_level: 'all',
      sort_by: 'total_sp',
      sort_order: 'desc',
    },
  });

  // ── FORMS (ALL ZOD RESOLVER) ───────────────────────────────
  const formKeterangan = useForm<KeteranganFormValues>({
    resolver: zodResolver(keteranganFormSchema),
    defaultValues: { pegawai_id: 0, tanggal: '', status_kehadiran: 'izin', catatan: '' },
  });

  const formCutoff = useForm<CutoffFormValues>({
    resolver: zodResolver(cutoffFormSchema),
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
      unit_kerja_id: 0,
    },
  });

  const formEdit = useForm<EditLogFormValues>({
    resolver: zodResolver(editLogFormSchema),
    defaultValues: { tanggal: '', jam_masuk: '', jam_keluar: '', status: null, catatan: '' },
  });

  // ── FETCH HANDLERS ─────────────────────────────────────────

  const fetchLogPresensi = useCallback(async () => {
    setLoadingLog(true);
    try {
      const res = await simpegService.getPresensiList({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        tanggal: tanggalFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        per_page: limit,
      });

      if (res.status === 'success' && res.data) {
        setPresensiList(res.data);
        if (res.meta) {
          setMeta(res.meta);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar log presensi.');
    } finally {
      setLoadingLog(false);
    }
  }, [search, statusFilter, tanggalFilter, sortBy, sortDir, page, limit]);

  const fetchBundleList = useCallback(async () => {
    setLoadingBundle(true);
    try {
      const res: any = await simpegService.getPresensiList({
        type: 'bundle',
        search: bundleSearch.trim() || undefined,
        page: bundlePage,
        per_page: bundleLimit,
      });
      if (res.status === 'success' && res.data) {
        setBundleList(res.data);
        if (res.meta) setBundleMeta(res.meta);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar bundle presensi.');
    } finally {
      setLoadingBundle(false);
    }
  }, [bundleSearch, bundlePage, bundleLimit]);

  // ── FETCH: RIWAYAT BULAN BERJALAN (§3.1: ?month&year) ─────────
  const fetchRiwayat = useCallback(async () => {
    setLoadingRiwayat(true);
    try {
      const res = await simpegService.getPresensiList({
        month: Number(riwayatMonth),
        year: Number(riwayatYear),
        status: riwayatStatus || undefined,
        sort_by: 'tanggal',
        sort_dir: 'desc',
        page: riwayatPage,
        per_page: riwayatLimit,
      });
      if (res.status === 'success' && res.data) {
        setRiwayatList(res.data as AttendanceHistoryItem[]);
        if (res.meta) setRiwayatMeta(res.meta);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Gagal memuat riwayat presensi bulanan.'));
    } finally {
      setLoadingRiwayat(false);
    }
  }, [riwayatMonth, riwayatYear, riwayatStatus, riwayatPage, riwayatLimit]);

  // ── FETCH: REKAP SEBULAN (§3.2: ?start_date&end_date) ─────────
  const fetchRecap = useCallback(async () => {
    setLoadingRecap(true);
    try {
      const { start_date, end_date } = toStartEndOfMonth(Number(riwayatMonth), Number(riwayatYear));
      const res = await simpegService.getPresensiRecap({
        pegawai_id: recapPegawaiId ?? undefined,
        start_date,
        end_date,
      });
      if (res.status === 'success' && res.data) {
        setRecapData(res.data as AttendanceRecapData);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Gagal memuat rekap presensi sebulan.'));
      setRecapData(null);
    } finally {
      setLoadingRecap(false);
    }
  }, [riwayatMonth, riwayatYear, recapPegawaiId]);

  // ── FETCH: MONITORING SP TAHUNAN (12 BULAN) ──────────────────
  const fetchSpMonitoring = useCallback(async () => {
    setSpLoading(true);
    try {
      const res = await simpegService.getAnnualSpMonitoring({
        tahun: spSelectedYear,
        search: spSearch.trim() || undefined,
        unit_kerja_id: spUnitKerjaId,
        risk_level: spRiskLevel !== 'all' ? spRiskLevel : undefined,
        sort_by: spSortBy,
        sort_order: spSortDir,
        page: spPage,
        per_page: spLimit,
      });

      if (res.status === 'success' && res.data) {
        setSpMonitoringData(res.data);
        if (res.meta) {
          setSpMeta(res.meta);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat matriks monitoring SP tahunan.');
    } finally {
      setSpLoading(false);
    }
  }, [spSelectedYear, spSearch, spUnitKerjaId, spRiskLevel, spSortBy, spSortDir, spPage, spLimit]);

  const handleOpenSpDetail = (spId: number) => {
    router.push(`/simpeg/presensi/sp/${spId}`);
  };

  const handleOpenSpFilterDrawer = () => {
    setShowSpFilterDrawer(true);
  };

  useEffect(() => {
    if (activeTab === 'realtime') {
      fetchLogPresensi();
    } else if (activeTab === 'bundle') {
      fetchBundleList();
    } else if (activeTab === 'sp_monitoring') {
      fetchSpMonitoring();
    } else {
      fetchRiwayat();
      fetchRecap();
    }
  }, [activeTab, fetchLogPresensi, fetchBundleList, fetchSpMonitoring, fetchRiwayat, fetchRecap]);

  // ── ACTION HANDLERS: LOG REALTIME ──────────────────────────

  const handleApprovePresensi = async (id: number) => {
    setApprovingId(id);
    try {
      const res = await simpegService.approvePresensi(id);
      if (res.status === 'success') {
        toast.success('Presensi berhasil disetujui secara manual');
        fetchLogPresensi();
        if (selectedLog && selectedLog.id === id) {
          setShowDetailModal(false);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui presensi');
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenEditModal = (log: any) => {
    setEditingLog(log);
    formEdit.reset({
      tanggal: log.tanggal ? String(log.tanggal).substring(0, 10) : '',
      jam_masuk: log.clock_in ? formatJamWIB(log.clock_in) : (log.jam_masuk ? String(log.jam_masuk).substring(0, 5) : ''),
      jam_keluar: log.clock_out ? formatJamWIB(log.clock_out) : (log.jam_keluar ? String(log.jam_keluar).substring(0, 5) : ''),
      status: (log.status || log.status_kehadiran || null) as any,
      catatan: log.notes || log.catatan || '',
    });
    setShowEditModal(true);
  };

  const onSubmitEdit = async (values: EditLogFormValues) => {
    if (!editingLog) return;
    setSavingEdit(true);
    try {
      const res = await simpegService.updatePresensiLog(editingLog.id, {
        tanggal: values.tanggal || undefined,
        jam_masuk: values.jam_masuk || undefined,
        jam_keluar: values.jam_keluar || undefined,
        status: values.status || undefined,
        catatan: values.catatan || undefined,
      });
      toast.success(res.message || 'Log presensi berhasil diperbarui');
      setShowEditModal(false);
      setShowDetailModal(false);
      fetchLogPresensi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui log presensi');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAskResetClock = (log: any, field: 'in' | 'out') => {
    const namaPegawai = log.employee?.nama_lengkap || `Pegawai #${log.pegawai_id}`;
    const isMasuk = field === 'in';
    setDeleteConfirm({
      isOpen: true,
      title: isMasuk ? 'Reset Scan Masuk' : 'Reset Scan Pulang',
      message: `Reset ${isMasuk ? 'scan masuk' : 'scan pulang'} untuk ${namaPegawai} pada tanggal ${log.tanggal ? String(log.tanggal).substring(0, 10) : '-'}? Scan ${isMasuk ? 'pulang' : 'masuk'} yang tersisa tetap aman.`,
      isLoading: false,
      confirmText: 'Reset',
      onConfirm: async () => {
        try {
          setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
          await simpegService.updatePresensiLog(log.id, isMasuk ? { reset_clock_in: true } : { reset_clock_out: true });
          toast.success(isMasuk ? 'Scan masuk berhasil direset.' : 'Scan pulang berhasil direset.');
          setDeleteConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setShowDetailModal(false);
          setShowEditModal(false);
          fetchLogPresensi();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Gagal mereset log presensi.');
          setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleAskResetFace = (log: any) => {
    const pegawaiId = log.pegawai_id || log.employee?.id;
    const namaPegawai = log.employee?.nama_lengkap || `Pegawai #${pegawaiId || '-'}`;
    if (!pegawaiId) {
      toast.error('ID pegawai tidak ditemukan pada log ini.');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      title: 'Reset Wajah Terdaftar',
      message: `Hapus data wajah terdaftar milik ${namaPegawai}? Pegawai harus mendaftarkan ulang wajahnya via aplikasi presensi mobile. Gunakan bila verifikasi wajah sering gagal.`,
      isLoading: false,
      confirmText: 'Reset Wajah',
      onConfirm: async () => {
        try {
          setResettingFaceId(pegawaiId);
          setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
          const res = await simpegService.resetFaceBiometric(pegawaiId);
          toast.success(res.message || 'Data wajah berhasil direset. Pegawai dapat mendaftar ulang.');
          setDeleteConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchLogPresensi();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Gagal mereset data wajah.');
          setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
        } finally {
          setResettingFaceId(null);
        }
      },
    });
  };

  const loadPegawaiOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await simpegService.getPegawaiList({
        search: inputValue.trim() || undefined,
        per_page: 25,
      });
      const responseData = (res as any).data ?? res;
      const items: any[] = Array.isArray(responseData)
        ? responseData
        : responseData?.items || responseData?.data || [];
      return items.map((p: any) => ({
        value: p.id,
        label: `${p.nama_lengkap} — ${p.nip || '-'}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleOpenKeteranganModal = () => {
    formKeterangan.reset({ pegawai_id: 0, tanggal: '', status_kehadiran: 'izin', catatan: '' });
    setShowKeteranganModal(true);
  };

  const onSubmitKeterangan = async (values: KeteranganFormValues) => {
    setSavingKeterangan(true);
    try {
      const res = await simpegService.setKeteranganPresensi({
        pegawai_id: values.pegawai_id,
        tanggal: values.tanggal,
        status_kehadiran: values.status_kehadiran,
        catatan: values.catatan || undefined,
      });
      toast.success(res.message || 'Keterangan ketidakhadiran berhasil disimpan');
      setShowKeteranganModal(false);
      setPage(1);
      fetchLogPresensi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan keterangan ketidakhadiran');
    } finally {
      setSavingKeterangan(false);
    }
  };

  const handleOpenCutoffModal = async () => {
    setCutoffReport(null);
    formCutoff.reset({
      date: new Date().toISOString().substring(0, 10),
      unit_kerja_id: 0,
    });
    setShowCutoffModal(true);

    if (unitKerjaOptions.length === 0) {
      try {
        const res = await simpegService.getUnitKerjaList();
        const responseData = (res as any).data ?? res;
        const items = Array.isArray(responseData) ? responseData : (responseData?.items || responseData?.data || []);
        setUnitKerjaOptions(items.map((u: any) => ({ value: u.id, label: `${u.nama} (${u.tipe || 'Unit'})` })));
      } catch {
        // ignore
      }
    }
  };

  const onSubmitCutoff = async (values: CutoffFormValues) => {
    setRunningCutoff(true);
    try {
      const res = await simpegService.runDailyCutoff({
        date: values.date,
        unit_kerja_id: values.unit_kerja_id ? Number(values.unit_kerja_id) : undefined,
      });
      if (res.status === 'success' && res.data) {
        setCutoffReport(res.data);
        toast.success(res.message || 'Cut-off presensi selesai diproses');
        fetchLogPresensi();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengeksekusi cut-off harian');
    } finally {
      setRunningCutoff(false);
    }
  };

  // ── ACTION HANDLERS: BUNDLE REKAP ──────────────────────────

  const handleDeleteBundle = (bundle: any) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Rekap Periode Presensi',
      message: `Apakah Anda yakin ingin menghapus bundle "${bundle.nama_periode}" beserta seluruh log presensi di dalamnya?`,
      isLoading: false,
      confirmText: 'Hapus',
      onConfirm: async () => {
        try {
          setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
          await simpegService.deletePresensiBundle(bundle.id);
          toast.success('Bundle presensi berhasil dihapus.');
          setDeleteConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          fetchBundleList();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Gagal menghapus bundle presensi.');
          setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleDeleteLog = (log: any) => {
    const namaPegawai = log.employee?.nama_lengkap || `Pegawai #${log.pegawai_id}`;
    const tanggalFormatted = log.tanggal
      ? new Date(log.tanggal).toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '-';

    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Log Presensi',
      message: `Apakah Anda yakin ingin menghapus catatan presensi untuk ${namaPegawai} pada tanggal ${tanggalFormatted}? Tindakan ini tidak dapat dibatalkan.`,
      isLoading: false,
      confirmText: 'Hapus',
      onConfirm: async () => {
        try {
          setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
          await simpegService.deletePresensiLog(log.id);
          toast.success('Log presensi berhasil dihapus.');
          setDeleteConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          setShowDetailModal(false);
          fetchLogPresensi();
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Gagal menghapus log presensi.');
          setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };



  // ── TABLE COLUMNS: REALTIME LOG ────────────────────────────

  const logColumns: ColumnDef<any>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal & Waktu',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800 text-xs">
            {new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Masuk: {formatJamMasukWIB(row)} | Pulang: {formatJamPulangWIB(row)}
          </div>
        </div>
      ),
    },
    {
      key: 'employee',
      label: 'Pegawai',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 text-xs">{row.employee?.nama_lengkap || `Pegawai #${row.pegawai_id}`}</div>
          <div className="text-xs text-slate-500 font-mono">NIP: {row.employee?.nip || '-'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Kehadiran',
      render: (row) => {
        const st = (row.status || row.status_kehadiran || '').toLowerCase();
        let badgeVariant: 'green' | 'amber' | 'red' | 'blue' | 'purple' = 'green';
        if (st === 'terlambat') badgeVariant = 'amber';
        else if (st === 'ditolak' || st === 'alfa') badgeVariant = 'red';
        else if (st === 'izin' || st === 'sakit' || st === 'dinas') badgeVariant = 'blue';
        else if (st === 'menunggu_approval') badgeVariant = 'purple';

        const statusLabels: Record<string, string> = {
          hadir: 'Hadir Tepat Waktu',
          dinas: 'Dinas Luar',
          menunggu_approval: 'Menunggu Approval',
          alfa: 'Alpa',
        };

        return (
          <div className="space-y-1">
            <Badge variant={badgeVariant} className="capitalize font-bold text-xs">
              {statusLabels[st] || st}
            </Badge>
            {row.late_minutes > 0 && (
              <div className="text-2xs text-rose-600 font-semibold">
                Terlambat {row.late_minutes} mnt
              </div>
            )}
            {row.early_leave_minutes > 0 && (
              <div className="text-2xs text-amber-600 font-semibold">
                Pulang Cepat {row.early_leave_minutes} mnt
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'source',
      label: 'Sumber Presensi',
      render: (row) => {
        const src = (row.source || 'mobile_gps').toLowerCase();
        let label = 'GPS Mobile';
        let variant: 'blue' | 'green' | 'red' | 'amber' | 'gray' = 'blue';
        if (src === 'fingerprint') {
          label = 'Fingerprint';
          variant = 'green';
        } else if (src === 'system_cutoff') {
          label = 'Auto-Alfa';
          variant = 'red';
        } else if (src === 'manual_admin') {
          label = 'Manual HR';
          variant = 'amber';
        } else if (src === 'import_sql') {
          label = 'Import';
          variant = 'gray';
        }

        return (
          <div className="space-y-0.5">
            <Badge variant={variant} className="text-xs font-semibold">
              {label}
            </Badge>
            {row.device_id && (
              <div className="text-xs text-slate-500 font-mono truncate max-w-[120px]">
                {row.device_id}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'audit',
      label: 'Audit Geofence & AI',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <MapPin size={12} className={row.clock_in_distance_meters > 150 ? 'text-amber-500' : 'text-emerald-600'} />
            <span>Jarak: {row.clock_in_distance_meters !== null && row.clock_in_distance_meters !== undefined ? `${Number(row.clock_in_distance_meters).toFixed(0)} m` : '-'}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-[var(--module-primary)]" />
            <span>Skor Wajah: {row.clock_in_face_score !== null && row.clock_in_face_score !== undefined ? `${(Number(row.clock_in_face_score) * 100).toFixed(0)}%` : '-'}</span>
          </div>
          {row.clock_in_is_mock_location ? (
            <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold text-2xs">
              <AlertTriangle size={11} /> Terdeteksi Mock GPS
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row) => {
        // Scan wajah sukses langsung hadir/terlambat tanpa approval.
        // Approval hanya untuk menunggu_approval (scan hari libur) & ditolak (gagal berulang).
        const statusVal = (row.status || row.status_kehadiran || '').toLowerCase();
        const canApprove =
          canManage && (statusVal === 'ditolak' || statusVal === 'menunggu_approval');
        const items: DropdownMenuItem[] = [
          {
            label: 'Lihat Rincian',
            icon: <Eye size={14} />,
            onClick: () => {
              setSelectedLog(row);
              setShowDetailModal(true);
            },
          },
        ];
        if (canApprove) {
          items.push({
            label: approvingId === row.id ? 'Menyetujui...' : 'Setujui Manual',
            icon: <Check size={14} />,
            disabled: approvingId === row.id,
            onClick: () => handleApprovePresensi(row.id),
          });
        }
        if (canManage) {
          items.push({
            label: 'Edit / Koreksi Jam',
            icon: <Pencil size={14} />,
            onClick: () => handleOpenEditModal(row),
          });
          if (row.clock_in || row.jam_masuk) {
            items.push({
              label: 'Reset Scan Masuk',
              icon: <RotateCcw size={14} />,
              onClick: () => handleAskResetClock(row, 'in'),
            });
          }
          if (row.clock_out || row.jam_keluar) {
            items.push({
              label: 'Reset Scan Pulang',
              icon: <RotateCcw size={14} />,
              onClick: () => handleAskResetClock(row, 'out'),
            });
          }
          items.push({
            label: 'Reset Wajah Terdaftar',
            icon: <ScanFace size={14} />,
            disabled: resettingFaceId === (row.pegawai_id || row.employee?.id),
            onClick: () => handleAskResetFace(row),
          });
        }
        if (canDelete) {
          items.push({
            label: 'Hapus Log Presensi',
            icon: <Trash2 size={14} />,
            variant: 'danger',
            onClick: () => handleDeleteLog(row),
          });
        }
        return <DropdownMenu items={items} />;
      },
    },
  ];

  // ── TABLE COLUMNS: BUNDLE REKAP ────────────────────────────

  const bundleColumns: ColumnDef<any>[] = [
    {
      key: 'nama_periode',
      label: 'Nama Periode Rekap',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{row.nama_periode}</div>
          {row.catatan && <div className="text-xs text-slate-500 mt-0.5">{row.catatan}</div>}
        </div>
      ),
    },
    {
      key: 'rentang_tanggal',
      label: 'Rentang Periode',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Calendar size={13} className="text-[var(--module-primary)] shrink-0" />
          <span>{formatDate(row.tanggal_awal)} s/d {formatDate(row.tanggal_akhir)}</span>
        </div>
      ),
    },
    {
      key: 'total_record',
      label: 'Total Log',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {Number(row.total_record || 0).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      key: 'total_pegawai',
      label: 'Pegawai',
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.total_pegawai !== undefined ? `${row.total_pegawai} Orang` : '-'}
        </span>
      ),
    },
    {
      key: 'status_pembayaran',
      label: 'Status Penggajian',
      render: (row) => {
        const st = (row.status_pembayaran || 'belum_diproses').toLowerCase();
        let badgeVariant: 'secondary' | 'info' | 'warning' | 'success' = 'secondary';
        let label = 'Belum Diproses';

        if (st === 'paid') {
          badgeVariant = 'success';
          label = 'Sudah Terbayarkan (Paid)';
        } else if (st === 'submitted_to_sikeu') {
          badgeVariant = 'warning';
          label = 'Antrean SIKEU';
        } else if (st === 'draft' || row.is_locked) {
          badgeVariant = 'info';
          label = 'Draft di Payroll';
        }

        return (
          <Badge variant={badgeVariant} className="text-2xs font-bold">
            {label}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Dibuat Pada',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
        </span>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row) => {
        const items: DropdownMenuItem[] = [
          {
            label: 'Buka Rincian Log',
            icon: <Eye size={14} />,
            onClick: () => router.push(`/simpeg/presensi/${row.id}`),
          },
        ];
        if (canManage) {
          items.push({
            label: 'Hapus Bundle',
            icon: <Trash2 size={14} />,
            variant: 'danger',
            onClick: () => handleDeleteBundle(row),
          });
        }
        return <DropdownMenu items={items} />;
      },
    },
  ];

  // ── TABLE COLUMNS: RIWAYAT BULANAN (§3.1) ────────────────────

  const riwayatColumns: ColumnDef<AttendanceHistoryItem>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal & Waktu',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800 text-xs">
            {new Date(row.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Masuk: {formatJamMasukWIB(row)} | Pulang: {formatJamPulangWIB(row)}
          </div>
        </div>
      ),
    },
    {
      key: 'employee',
      label: 'Pegawai',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 text-xs">{row.employee?.nama_lengkap || `Pegawai #${row.pegawai_id}`}</div>
          <div className="text-xs text-slate-500 font-mono">NIP: {row.employee?.nip || '-'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const st = String(row.status || row.status_kehadiran || '').toLowerCase();
        const meta = RIWAYAT_STATUS_META[st];
        return (
          <div className="space-y-1">
            <Badge variant={meta?.variant || 'green'} className="capitalize font-bold text-xs">
              {meta?.label || st}
            </Badge>
            {Number(row.late_minutes) > 0 && (
              <div className="text-2xs text-rose-600 font-semibold">
                Terlambat {row.late_minutes} mnt
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'audit',
      label: 'Jarak & Skor AI',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <MapPin size={12} className={Number(row.clock_in_distance_meters) > 150 ? 'text-amber-500' : 'text-emerald-600'} />
            <span>Jarak: {row.clock_in_distance_meters !== null && row.clock_in_distance_meters !== undefined ? `${Number(row.clock_in_distance_meters).toFixed(0)} m` : '-'}</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-[var(--module-primary)]" />
            <span>Skor AI: {row.clock_in_face_score !== null && row.clock_in_face_score !== undefined ? `${(Number(row.clock_in_face_score) * 100).toFixed(0)}%` : '-'}</span>
          </div>
          {row.rejection_reason && (
            <div className="text-2xs text-rose-600 font-medium">Catatan: {row.rejection_reason}</div>
          )}
        </div>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <DropdownMenu
          items={[
            {
              label: 'Lihat Rincian',
              icon: <Eye size={14} />,
              onClick: () => {
                setSelectedLog(row);
                setShowDetailModal(true);
              },
            },
          ]}
        />
      ),
    },
  ];

  // ── TABLE COLUMNS: REKAP SEBULAN (§3.2) ──────────────────────

  const recapColumns: ColumnDef<AttendanceRecapRow>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 text-xs">{row.tanggal}</div>
          <div className="text-xs text-slate-500">{row.day_name}</div>
        </div>
      ),
    },
    {
      key: 'scan_masuk',
      label: 'Scan Masuk',
      render: (row) => (
        <span className={`font-mono font-bold text-xs ${row.scan_masuk === '-' ? 'text-slate-400' : 'text-emerald-700'}`}>
          {row.scan_masuk}
        </span>
      ),
    },
    {
      key: 'terlambat',
      label: 'Terlambat',
      render: (row) => (
        <span className={`font-mono font-bold text-xs ${row.terlambat && row.terlambat !== '-' ? 'text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
          {row.terlambat}
        </span>
      ),
    },
    {
      key: 'scan_pulang',
      label: 'Scan Pulang',
      render: (row) => (
        <span className={`font-mono font-bold text-xs ${row.scan_pulang === '-' ? 'text-slate-400' : 'text-slate-800'}`}>
          {row.scan_pulang}
        </span>
      ),
    },
    {
      key: 'keterangan',
      label: 'Keterangan',
      render: (row) => {
        const badge = String(row.status_badge || '').toLowerCase();
        const meta = RIWAYAT_STATUS_META[badge];
        const isNeutral = row.keterangan === '-' || !row.keterangan;
        return (
          <div className="space-y-1">
            {!isNeutral && <div className="text-xs text-slate-600">{row.keterangan}</div>}
            <Badge variant={meta?.variant || 'gray'} className="capitalize text-xs">
              {meta?.label || row.status_badge || '-'}
            </Badge>
          </div>
        );
      },
    },
  ];

  // ── TABLE COLUMNS: MONITORING SP TAHUNAN (12 BULAN) ───────────

  const spMonitoringColumns = useMemo<ColumnDef<AnnualSpMonitoringRow>[]>(() => {
    const cols: ColumnDef<AnnualSpMonitoringRow>[] = [
      {
        key: 'pegawai',
        label: 'Pegawai',
        render: (row) => (
          <div className="space-y-0.5 min-w-[170px] max-w-[220px]">
            <div className="font-semibold text-slate-900 text-xs truncate" title={row.nama_lengkap}>
              {row.nama_lengkap}
            </div>
            <div className="text-2xs text-slate-500 font-mono flex items-center gap-1.5 truncate">
              <span>{row.nip || '-'}</span>
              <span>•</span>
              <span className="truncate">{row.unit_kerja}</span>
            </div>
          </div>
        ),
      },
    ];

    SP_MONTH_COLUMNS.forEach((mObj) => {
      cols.push({
        key: `month_${mObj.key}`,
        label: mObj.label,
        align: 'center',
        headerRender: () => (
          <div className="text-center py-0.5">
            <span className="text-xs font-bold uppercase">{mObj.label}</span>
          </div>
        ),
        render: (row) => {
          const m = row.months?.[mObj.key];
          if (!m) return <span className="text-2xs text-slate-300">-</span>;

          const isSp = Boolean(m.has_sp);
          const tooltipLines = [
            `${mObj.label} ${spSelectedYear}`,
            `• Keterlambatan: ${m.total_terlambat} kali (Batas Maksimal: ${m.batas_maksimal} kali)`,
          ];
          if (isSp) {
            tooltipLines.push(`• ⚠️ SURAT PERINGATAN TERBIT (${m.nomor_sp || 'SP'})`);
            tooltipLines.push(`• Status SP: ${m.status_sp || 'Aktif'}`);
            tooltipLines.push(`(Klik sel untuk melihat dokumen resmi SP)`);
          } else if (m.status_color === 'warning') {
            tooltipLines.push(`• Terlambat dalam toleransi (Belum terbit SP)`);
          } else if (m.status_color === 'success') {
            tooltipLines.push(`• Hadir tepat waktu / Disiplin`);
          } else {
            tooltipLines.push(m.is_future ? `• Bulan mendatang` : `• Belum ada log presensi`);
          }

          let colorClass = 'bg-slate-100 text-slate-400 border border-slate-200';
          if (m.status_color === 'danger') {
            colorClass = 'bg-rose-500 text-white ring-1 ring-rose-600/40 shadow-xs';
          } else if (m.status_color === 'warning') {
            colorClass = 'bg-amber-400 text-amber-950 ring-1 ring-amber-500/40 shadow-xs';
          } else if (m.status_color === 'success') {
            colorClass = 'bg-emerald-500 text-white ring-1 ring-emerald-600/40 shadow-xs';
          }

          return (
            <div
              onClick={() => {
                if (m.sp_id) {
                  handleOpenSpDetail(m.sp_id);
                }
              }}
              className={`inline-flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded transition-all select-none ${
                m.sp_id ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
              }`}
              title={tooltipLines.join('\n')}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center font-bold text-2xs transition-all ${colorClass}`}
              >
                {isSp ? (
                  <span className="font-extrabold text-2xs">SP</span>
                ) : m.total_terlambat > 0 ? (
                  <span className="text-2xs">{m.total_terlambat}</span>
                ) : m.status_color === 'success' ? (
                  <span className="text-2xs">✓</span>
                ) : (
                  <span className="text-2xs text-slate-300">-</span>
                )}
              </div>
              <span className={`text-2xs font-mono leading-none ${isSp ? 'text-rose-600 font-bold' : (m.total_terlambat > 0 ? 'text-amber-700 font-medium' : 'text-slate-400')}`}>
                {m.total_terlambat > 0 ? `${m.total_terlambat}x` : '-'}
              </span>
            </div>
          );
        },
      });
    });

    cols.push(
      {
        key: 'total_sp',
        label: 'Total SP',
        align: 'center',
        render: (row) => (
          <div className="flex flex-col items-center justify-center min-w-[65px]">
            {row.summary.total_sp > 0 ? (
              <Badge
                variant={row.summary.total_sp >= 2 ? 'red' : 'amber'}
                className="font-bold text-xs px-2 py-0.5 font-mono"
              >
                {row.summary.total_sp} SP
              </Badge>
            ) : (
              <span className="text-2xs text-slate-400 font-medium">0 SP</span>
            )}
          </div>
        ),
      },
      {
        key: 'total_terlambat',
        label: 'Akumulasi Terlambat',
        align: 'center',
        render: (row) => (
          <div className="flex flex-col items-center justify-center min-w-[75px]">
            <span
              className={`text-xs font-mono font-bold ${
                row.summary.total_terlambat > 0 ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              {row.summary.total_terlambat} Kali
            </span>
          </div>
        ),
      },
      {
        key: 'risk_level',
        label: 'Status Kedisiplinan',
        align: 'center',
        render: (row) => (
          <div className="min-w-[95px] text-center">
            {row.summary.risk_level === 'rawan' && (
              <Badge variant="red" className="text-2xs font-bold whitespace-nowrap">
                Sering SP (Rawan)
              </Badge>
            )}
            {row.summary.risk_level === 'perhatian' && (
              <Badge variant="amber" className="text-2xs font-bold whitespace-nowrap">
                Perhatian (1x SP)
              </Badge>
            )}
            {row.summary.risk_level === 'waspada' && (
              <Badge variant="purple" className="text-2xs font-semibold whitespace-nowrap">
                Ada Terlambat
              </Badge>
            )}
            {row.summary.risk_level === 'disiplin' && (
              <Badge variant="green" className="text-2xs font-semibold whitespace-nowrap">
                Disiplin (0 SP)
              </Badge>
            )}
          </div>
        ),
      },
      {
        key: 'aksi',
        label: 'Aksi',
        align: 'right',
        render: (row) => {
          const items: DropdownMenuItem[] = [
            {
              label: 'Salin NIP Pegawai',
              icon: <Copy size={14} />,
              onClick: () => {
                if (row.nip && row.nip !== '-') {
                  navigator.clipboard.writeText(row.nip);
                  toast.success(`NIP ${row.nip} berhasil disalin ke clipboard`);
                } else {
                  toast.error('NIP pegawai tidak tersedia');
                }
              },
            },
            {
              label: 'Filter Pegawai Ini',
              icon: <UserCheck size={14} />,
              onClick: () => {
                formSpFilter.setValue('search', row.nama_lengkap);
                setSpSearch(row.nama_lengkap);
                setSpPage(1);
              },
            },
          ];

          const monthWithSp = Object.values(row.months || {}).find((m) => m.has_sp && m.sp_id);
          if (monthWithSp && monthWithSp.sp_id) {
            items.push({
              label: `Lihat Dokumen Resmi SP (${monthWithSp.month_name})`,
              icon: <FileText size={14} />,
              onClick: () => handleOpenSpDetail(monthWithSp.sp_id!),
            });
          }

          return <DropdownMenu items={items} />;
        },
      }
    );

    return cols;
  }, [spSelectedYear, formSpFilter]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Presensi & Absensi Pegawai"
        description="Monitoring log kehadiran biometrik realtime, pengelolaan rekap presensi bulanan, verifikasi persetujuan, dan otomasi cut-off presensi"
        action={
          <div className="flex gap-2">
            {canManage && (
              <Button
                variant="outline"
                icon={<SlidersHorizontal size={16} />}
                onClick={() => router.push('/simpeg/master/presensi')}
              >
                Pengaturan Presensi
              </Button>
            )}
            {hasPermission('simpeg.presensi.pengajaran.read') && (
              <Button
                variant="outline"
                icon={<UserCheck size={16} />}
                onClick={() => router.push('/simpeg/presensi/pengajaran')}
              >
                Monitoring Pengajaran
              </Button>
            )}
            {activeTab === 'realtime' && canManage && (
              <Button variant="outline" icon={<Clock size={16} />} onClick={handleOpenCutoffModal}>
                Jalankan Cut-off Harian
              </Button>
            )}
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => {
                if (activeTab === 'sp_monitoring') {
                  handleOpenSpFilterDrawer();
                } else if (activeTab === 'riwayat') {
                  setShowRiwayatDrawer(true);
                } else {
                  setShowFilterDrawer(true);
                }
              }}
            >
              Filter
            </Button>
          </div>
        }
      />

      {/* Modern Navigation Tabs (Mengikuti Format Master Jabatan & Jenjang Fungsional) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('realtime')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'realtime'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Clock size={16} /> Log Realtime Biometrik
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('bundle')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'bundle'
                ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Layers size={16} /> Rekap Bundle Periode
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveTab('sp_monitoring')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sp_monitoring'
                ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle size={16} /> Monitoring SP Tahunan (12 Bulan)
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'riwayat'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarDays size={16} /> Riwayat Bulanan
        </button>
      </div>

      {/* ── TAB 1: LOG REALTIME BIOMETRIK ── */}
      {activeTab === 'realtime' && (
        <div className="space-y-4">
          <DataTable
            columns={logColumns}
            data={presensiList}
            isLoading={loadingLog}
            meta={meta}
            onPageChange={(newPage) => setPage(newPage)}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            emptyMessage={
              <div className="py-8 text-center text-slate-400">
                <Clock size={48} className="mx-auto mb-4 opacity-40" />
                <p>Tidak ada data presensi yang ditemukan.</p>
              </div>
            }
          />
        </div>
      )}

      {/* ── TAB 2: REKAP BUNDLE PERIODE ── */}
      {activeTab === 'bundle' && (
        <div className="space-y-4">
          {/* Banner Info Siklus Periode Kampus 26 - 25 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-[var(--module-primary)] shrink-0" />
              <span>
                <strong>Siklus Presensi Kampus:</strong> Dihitung dari tanggal <strong>26 bulan sebelumnya s/d 25 bulan berjalan</strong> (contoh: 26 Januari s/d 25 Februari adalah Bundle Februari). Log presensi realtime otomatis dikelompokkan ke dalam bundle periode terkait.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Badge variant="info">Siklus 26 - 25</Badge>
            </div>
          </div>

          <DataTable
            columns={bundleColumns}
            data={bundleList}
            isLoading={loadingBundle}
            meta={bundleMeta}
            onPageChange={(newPage) => setBundlePage(newPage)}
            onLimitChange={(newLimit) => {
              setBundleLimit(newLimit);
              setBundlePage(1);
            }}
            emptyMessage={
              <div className="py-8 text-center text-slate-400">
                <Layers size={48} className="mx-auto mb-4 opacity-40" />
                <p>Belum ada bundle rekap presensi yang tersedia.</p>
              </div>
            }
          />
        </div>
      )}

      {/* ── TAB 3: MONITORING SP TAHUNAN (12 BULAN) ── */}
      {activeTab === 'sp_monitoring' && (
        <div className="space-y-4">
          {/* Header Card: Selector Tahun & 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Tahun Monitoring</span>
                <Calendar size={18} className="text-[var(--module-primary)]" />
              </div>
              <div className="w-full">
                <Select
                  value={String(spSelectedYear)}
                  onChange={(val) => {
                    const y = Number(val);
                    setSpSelectedYear(y);
                    setSpPage(1);
                  }}
                  options={YEAR_OPTIONS}
                />
              </div>
              <div className="text-2xs text-slate-500">
                Batas Toleransi: <strong className="text-slate-700">{spMeta?.max_late_per_month ?? 5}x terlambat/bulan</strong>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Pegawai</span>
                <Users size={18} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {Number(spMeta?.stats?.total_pegawai || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-slate-500">Seluruh dosen & tenaga kependidikan aktif</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Pegawai Terbit SP</span>
                <ShieldAlert size={18} className="text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {Number(spMeta?.stats?.pegawai_pernah_sp || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-slate-500">Pernah melampaui batas toleransi keterlambatan</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total SP Terbit</span>
                <AlertTriangle size={18} className="text-rose-600" />
              </div>
              <div className="text-2xl font-bold text-rose-600">
                {Number(spMeta?.stats?.total_sp_terbit || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-2xs text-slate-500">Akumulasi surat peringatan sepanjang {spSelectedYear}</div>
            </div>
          </div>

          {/* Legend Presensi Bar (Format Mirip Rincian Bundel) */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[var(--module-primary)] shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  Matriks Kedisiplinan 12 Bulan (Januari – Desember {spSelectedYear})
                </span>
              </div>
              <span className="text-2xs text-slate-500 italic">
                *Klik pada sel berlabel SP untuk membuka dokumen resmi Surat Peringatan.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-2xs bg-rose-500 text-white ring-1 ring-rose-600/40 shadow-xs">
                  SP
                </div>
                <span>Terbit SP (&gt; {spMeta?.max_late_per_month ?? 5}x Terlambat)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-2xs bg-amber-400 text-amber-950 ring-1 ring-amber-500/40 shadow-xs">
                  !
                </div>
                <span>Terlambat Dalam Toleransi (1–{spMeta?.max_late_per_month ?? 5}x)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-2xs bg-emerald-500 text-white ring-1 ring-emerald-600/40 shadow-xs">
                  ✓
                </div>
                <span>Disiplin (0 Keterlambatan)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-2xs bg-slate-100 text-slate-400 border border-slate-200">
                  -
                </div>
                <span>Tidak Ada Log / Bulan Mendatang</span>
              </div>
            </div>
          </div>

          {/* Matriks DataTable */}
          <DataTable
            columns={spMonitoringColumns}
            data={spMonitoringData}
            isLoading={spLoading}
            meta={spMeta}
            onPageChange={(newPage) => setSpPage(newPage)}
            onLimitChange={(newLimit) => {
              setSpLimit(newLimit);
              setSpPage(1);
            }}
            emptyMessage={
              <div className="py-8 text-center text-slate-400">
                <AlertTriangle size={48} className="mx-auto mb-4 opacity-40 text-amber-500" />
                <p>Tidak ada data monitoring surat peringatan untuk filter yang dipilih.</p>
              </div>
            }
          />
        </div>
      )}

      {/* ── TAB: RIWAYAT & REKAP BULANAN (§3.1–§3.2) ── */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays size={14} className="text-[var(--module-primary)]" />
            <span>
              Periode: <strong className="text-slate-700">{MONTH_OPTIONS.find((m) => m.value === riwayatMonth)?.label} {riwayatYear}</strong>
              {recapData?.employee?.name ? <> — Rekap: <strong className="text-slate-700">{recapData.employee.name}</strong></> : null}
            </span>
          </div>

          {/* Ringkasan rekap sebulan */}
          {recapData && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-xs font-medium text-slate-400">Hadir Tepat Waktu</div>
                <div className="text-xl font-bold text-emerald-700">{recapData.summary.total_hadir}</div>
                <div className="text-xs text-slate-400">dari {recapData.summary.total_days} hari</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-xs font-medium text-slate-400">Terlambat</div>
                <div className="text-xl font-bold text-amber-600">{recapData.summary.total_terlambat}</div>
                <div className="text-xs text-slate-400">keterlambatan tercatat</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-xs font-medium text-slate-400">Alpa</div>
                <div className="text-xl font-bold text-rose-600">{recapData.summary.total_alpa}</div>
                <div className="text-xs text-slate-400">tanpa keterangan</div>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-xs font-medium text-slate-400">Libur / Izin / Sakit / Dinas</div>
                <div className="text-xl font-bold text-slate-700">
                  {(recapData.summary.total_libur || 0) + (recapData.summary.total_izin || 0) + (recapData.summary.total_sakit || 0) + (recapData.summary.total_dinas || 0)}
                </div>
                <div className="text-xs text-slate-400">Libur {recapData.summary.total_libur} hari</div>
              </div>
            </div>
          )}

          {/* Tabel rekap sebulan: tanggal | scan masuk | terlambat | scan pulang | keterangan */}
          <DataTable
            columns={recapColumns}
            data={recapData?.rows || []}
            isLoading={loadingRecap}
            emptyMessage={
              <div className="py-8 text-center text-slate-400">
                <CalendarDays size={48} className="mx-auto mb-4 opacity-40" />
                <p>{canManage && !recapPegawaiId ? 'Pilih pegawai melalui Filter untuk melihat rekap sebulan.' : 'Belum ada data rekap pada periode ini.'}</p>
              </div>
            }
          />

          {/* Tabel riwayat per-baris */}
          <DataTable
            columns={riwayatColumns}
            data={riwayatList}
            isLoading={loadingRiwayat}
            meta={riwayatMeta}
            onPageChange={(newPage) => setRiwayatPage(newPage)}
            onLimitChange={(newLimit) => {
              setRiwayatLimit(newLimit);
              setRiwayatPage(1);
            }}
            emptyMessage={
              <div className="py-8 text-center text-slate-400">
                <History size={48} className="mx-auto mb-4 opacity-40" />
                <p>Tidak ada riwayat presensi pada bulan berjalan.</p>
              </div>
            }
          />
        </div>
      )}

      {/* ── DRAWER FILTER LOG PRESENSI ── */}
      <Drawer
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        title="Filter Data Presensi"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setTanggalFilter('');
                setSortBy('tanggal');
                setSortDir('desc');
                setPage(1);
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                setPage(1);
                setShowFilterDrawer(false);
                fetchLogPresensi();
              }}
            >
              Terapkan Filter
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Cari Nama / NIP Pegawai"
            placeholder="Ketik nama atau NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Input
            label="Tanggal Tertentu"
            type="date"
            value={tanggalFilter}
            onChange={(e) => setTanggalFilter(e.target.value)}
          />

          <Select
            label="Status Kehadiran"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={RIWAYAT_STATUS_FILTER_OPTIONS}
          />

          <hr className="border-t border-slate-200 my-2" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { value: 'tanggal', label: 'Tanggal' },
                { value: 'clock_in', label: 'Jam Masuk' },
                { value: 'clock_out', label: 'Jam Pulang' },
                { value: 'status_kehadiran', label: 'Status' },
                { value: 'id', label: 'ID' },
              ]}
            />
            <Select
              label="Arah"
              value={sortDir}
              onChange={(val) => setSortDir(val as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Z - A (Turun)' },
                { value: 'asc', label: 'A - Z (Naik)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* ── DRAWER FILTER RIWAYAT & REKAP BULANAN ── */}
      <Drawer
        open={showRiwayatDrawer}
        onClose={() => setShowRiwayatDrawer(false)}
        title="Filter Riwayat Bulanan"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date();
                setRiwayatMonth(String(d.getMonth() + 1));
                setRiwayatYear(String(d.getFullYear()));
                setRiwayatStatus('');
                setRecapPegawaiId(null);
                setRecapPegawaiOption(null);
                setRiwayatPage(1);
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                setRiwayatPage(1);
                setShowRiwayatDrawer(false);
                fetchRiwayat();
                fetchRecap();
              }}
            >
              Terapkan Filter
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Bulan"
              value={riwayatMonth}
              onChange={(val) => setRiwayatMonth(val)}
              options={MONTH_OPTIONS}
            />
            <Select
              label="Tahun"
              value={riwayatYear}
              onChange={(val) => setRiwayatYear(val)}
              options={buildYearOptions()}
            />
          </div>

          <Select
            label="Status Kehadiran"
            value={riwayatStatus}
            onChange={(val) => setRiwayatStatus(val)}
            options={RIWAYAT_STATUS_FILTER_OPTIONS}
          />

          {canManage && (
            <AsyncSelect
              label="Rekap Pegawai Tertentu"
              placeholder="Ketik nama atau NIP pegawai..."
              loadOptions={loadPegawaiOptions}
              value={recapPegawaiOption}
              onChange={(opt: { value: number; label: string } | null) => {
                setRecapPegawaiOption(opt || null);
                setRecapPegawaiId(opt ? opt.value : null);
              }}
              isClearable
            />
          )}
          <p className="text-xs text-slate-500">
            {canManage
              ? 'Rekap sebulan dihitung per pegawai. Pilih pegawai untuk melihat tabel tanggal | scan masuk | terlambat | scan pulang | keterangan.'
              : 'Rekap sebulan dihitung otomatis untuk akun Anda.'}
          </p>
        </div>
      </Drawer>

      {/* ── DRAWER FILTER MONITORING SP TAHUNAN ── */}
      <Drawer
        open={showSpFilterDrawer}
        onClose={() => setShowSpFilterDrawer(false)}
        title="Filter Monitoring SP Tahunan"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                formSpFilter.reset({
                  search: '',
                  unit_kerja_id: '',
                  risk_level: 'all',
                  sort_by: 'total_sp',
                  sort_order: 'desc',
                });
                setSpSearch('');
                setSpUnitKerjaId(undefined);
                setSpRiskLevel('all');
                setSpSortBy('total_sp');
                setSpSortDir('desc');
                setSpPage(1);
              }}
            >
              Reset
            </Button>
            <Button
              onClick={formSpFilter.handleSubmit((values) => {
                setSpSearch(values.search || '');
                setSpUnitKerjaId(values.unit_kerja_id ? Number(values.unit_kerja_id) : undefined);
                setSpRiskLevel(values.risk_level || 'all');
                setSpSortBy(values.sort_by || 'total_sp');
                setSpSortDir(values.sort_order || 'desc');
                setSpPage(1);
                setShowSpFilterDrawer(false);
              })}
            >
              Terapkan Filter
            </Button>
          </div>
        }
      >
        <form className="space-y-4">
          <Controller
            control={formSpFilter.control}
            name="search"
            render={({ field }) => (
              <Input
                label="Cari Nama / NIP Pegawai"
                placeholder="Ketik nama atau NIP..."
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={formSpFilter.control}
            name="unit_kerja_id"
            render={({ field }) => (
              <AsyncSelect
                label="Unit Kerja / Divisi"
                placeholder="Pilih atau cari unit kerja..."
                loadOptions={async (query: string) => {
                  try {
                    const res = await simpegService.getUnitKerjaList({ search: query.trim() || undefined });
                    const responseData = (res as any).data ?? res;
                    const items = Array.isArray(responseData) ? responseData : (responseData?.items || responseData?.data || []);
                    return items.map((u: any) => ({ value: String(u.id), label: `${u.nama} (${u.tipe || 'Unit'})` }));
                  } catch {
                    return [];
                  }
                }}
                value={
                  field.value
                    ? {
                        value: field.value,
                        label: spUnitKerjaLabel || 'Unit Kerja Terpilih',
                      }
                    : null
                }
                onChange={(opt: { value: string; label: string } | null) => {
                  field.onChange(opt ? opt.value : '');
                  setSpUnitKerjaLabel(opt ? opt.label : '');
                }}
                isClearable
              />
            )}
          />

          <Controller
            control={formSpFilter.control}
            name="risk_level"
            render={({ field }) => (
              <Select
                label="Status Kedisiplinan"
                value={field.value || 'all'}
                onChange={field.onChange}
                options={SP_RISK_OPTIONS}
              />
            )}
          />

          <hr className="border-t border-slate-200 my-2" />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              control={formSpFilter.control}
              name="sort_by"
              render={({ field }) => (
                <Select
                  label="Urutkan Berdasarkan"
                  value={field.value || 'total_sp'}
                  onChange={field.onChange}
                  options={SP_SORT_OPTIONS}
                />
              )}
            />
            <Controller
              control={formSpFilter.control}
              name="sort_order"
              render={({ field }) => (
                <Select
                  label="Arah Urutan"
                  value={field.value || 'desc'}
                  onChange={field.onChange}
                  options={SP_SORT_DIR_OPTIONS}
                />
              )}
            />
          </div>
        </form>
      </Drawer>

      {/* ── MODAL: DETAIL LOG PRESENSI ── */}
      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Detail Log Presensi Pegawai"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Tutup
            </Button>
            {canManage && selectedLog && ['ditolak', 'menunggu_approval'].includes(String(selectedLog.status || selectedLog.status_kehadiran || '').toLowerCase()) && (
              <Button
                loading={approvingId === selectedLog.id}
                disabled={approvingId === selectedLog.id}
                onClick={() => handleApprovePresensi(selectedLog.id)}
              >
                Setujui Manual
              </Button>
            )}
            {canManage && selectedLog && (
              <Button variant="outline" onClick={() => handleOpenEditModal(selectedLog)}>
                Edit Jam
              </Button>
            )}
            {canManage && selectedLog && (
              <Button
                variant="outline"
                icon={<ScanFace size={16} />}
                loading={resettingFaceId === (selectedLog.pegawai_id || selectedLog.employee?.id)}
                disabled={resettingFaceId === (selectedLog.pegawai_id || selectedLog.employee?.id)}
                onClick={() => handleAskResetFace(selectedLog)}
              >
                Reset Wajah
              </Button>
            )}
            {canDelete && selectedLog && (
              <Button
                variant="danger"
                onClick={() => handleDeleteLog(selectedLog)}
              >
                Hapus Log
              </Button>
            )}
          </>
        }
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pegawai:</span>
                <span className="font-bold text-slate-900">{selectedLog.employee?.nama_lengkap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NIP:</span>
                <span className="font-mono text-slate-800">{selectedLog.employee?.nip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal:</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedLog.tanggal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">Scan Masuk (In) — WIB</div>
                <div className="text-slate-600">Jam: {selectedLog.clock_in ? formatJamWIB(selectedLog.clock_in, true) : (selectedLog.jam_masuk || '-')}</div>
                <div className="text-slate-600">Jarak: {selectedLog.clock_in_distance_meters || 0} meter</div>
                <div className="text-slate-600">Skor Wajah: {selectedLog.clock_in_face_score ? `${(Number(selectedLog.clock_in_face_score) * 100).toFixed(1)}%` : '-'}</div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-slate-800">Scan Pulang (Out) — WIB</div>
                <div className="text-slate-600">Jam: {selectedLog.clock_out ? formatJamWIB(selectedLog.clock_out, true) : (selectedLog.jam_keluar || '-')}</div>
                <div className="text-slate-600">Jarak: {selectedLog.clock_out_distance_meters || 0} meter</div>
                <div className="text-slate-600">Skor Wajah: {selectedLog.clock_out_face_score ? `${(Number(selectedLog.clock_out_face_score) * 100).toFixed(1)}%` : '-'}</div>
              </div>
            </div>

            {selectedLog.rejection_reason && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 space-y-1">
                <span className="font-bold">Alasan Penolakan Sistem:</span>
                <p>{selectedLog.rejection_reason}</p>
              </div>
            )}

            {selectedLog.notes && (
              <div className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold">Catatan:</span>
                <p>{selectedLog.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── MODAL: TANDAI TIDAK HADIR (KETERANGAN) ── */}
      <Modal
        open={showKeteranganModal}
        onClose={() => setShowKeteranganModal(false)}
        title="Tandai Tidak Hadir"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowKeteranganModal(false)} disabled={savingKeterangan}>
              Batal
            </Button>
            <Button type="submit" loading={savingKeterangan} disabled={savingKeterangan} form="keterangan-form">
              Simpan Keterangan
            </Button>
          </>
        }
      >
        <form id="keterangan-form" onSubmit={formKeterangan.handleSubmit(onSubmitKeterangan)} noValidate className="space-y-4">
          <p className="text-xs text-slate-500">
            Untuk pegawai yang terjadwal masuk tetapi tidak memiliki log presensi. Data hasil scan tidak dapat ditimpa lewat form ini.
          </p>
          <Controller
            control={formKeterangan.control}
            name="pegawai_id"
            render={({ field }) => (
              <AsyncSelect
                label="Pilih Pegawai *"
                placeholder="Ketik nama atau NIP pegawai..."
                loadOptions={loadPegawaiOptions}
                value={field.value ? { value: field.value, label: `Pegawai ID: ${field.value}` } : null}
                onChange={(opt: any) => field.onChange(opt ? opt.value : 0)}
                error={formKeterangan.formState.errors.pegawai_id?.message}
                isClearable
              />
            )}
          />
          <Controller
            control={formKeterangan.control}
            name="tanggal"
            render={({ field }) => (
              <Input
                label="Tanggal *"
                type="date"
                required
                error={formKeterangan.formState.errors.tanggal?.message}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={formKeterangan.control}
            name="status_kehadiran"
            render={({ field }) => (
              <Select
                label="Keterangan *"
                required
                value={field.value}
                onChange={field.onChange}
                options={KETERANGAN_OPTIONS}
                error={formKeterangan.formState.errors.status_kehadiran?.message}
              />
            )}
          />
          <Controller
            control={formKeterangan.control}
            name="catatan"
            render={({ field }) => (
              <Input
                label="Catatan (opsional)"
                placeholder="Alasan izin / nomor surat dinas..."
                error={formKeterangan.formState.errors.catatan?.message}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
        </form>
      </Modal>

      {/* ── MODAL: JALANKAN CUT-OFF HARIAN ── */}
      <Modal
        open={showCutoffModal}
        onClose={() => setShowCutoffModal(false)}
        title="Otomasi Presensi: Cut-off Harian (Auto-Alfa)"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCutoffModal(false)} disabled={runningCutoff}>
              Tutup
            </Button>
            <Button type="submit" loading={runningCutoff} disabled={runningCutoff} variant="danger" form="cutoff-form">
              Eksekusi Cut-off Harian
            </Button>
          </>
        }
      >
        <form id="cutoff-form" onSubmit={formCutoff.handleSubmit(onSubmitCutoff)} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={16} />
            <p className="text-xs">
              Sistem akan memindai seluruh pegawai aktif yang terjadwal masuk pada tanggal yang dipilih. Pegawai yang tidak melakukan presensi scan dan tidak memiliki keterangan resmi otomatis diberi status <strong>Alfa</strong>.
            </p>
          </div>

          <Input
            label="Pilih Tanggal Cut-off *"
            type="date"
            required
            error={formCutoff.formState.errors.date?.message}
            {...formCutoff.register('date')}
          />

          <Controller
            control={formCutoff.control}
            name="unit_kerja_id"
            render={({ field }) => (
              <Select
                label="Batasi ke Unit Kerja Tertentu (Opsional)"
                value={field.value ? String(field.value) : ''}
                onChange={(val) => field.onChange(val ? Number(val) : 0)}
                options={[
                  { value: '', label: '-- Seluruh Unit Kerja --' },
                  ...unitKerjaOptions.map((u) => ({ value: String(u.value), label: u.label })),
                ]}
              />
            )}
          />

          {cutoffReport && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-xs text-slate-800">Laporan Hasil Cut-off:</span>
                <Badge variant={cutoffReport.total_marked_alfa > 0 ? 'red' : 'green'}>
                  {cutoffReport.total_marked_alfa} Pegawai Alfa
                </Badge>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div>Tanggal Evaluasi: <strong>{cutoffReport.date}</strong></div>
                <div>Total Pegawai Terjadwal Dievaluasi: <strong>{cutoffReport.total_evaluated}</strong></div>
                <div>Status Hari Libur: <strong>{cutoffReport.is_national_holiday ? 'Hari Libur Nasional' : 'Hari Kerja Efektif'}</strong></div>
              </div>

              {cutoffReport.marked_alfa_employees?.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Daftar Pegawai Ditandai Alfa:</span>
                  {cutoffReport.marked_alfa_employees.map((emp, i) => (
                    <div key={i} className="text-xs p-1.5 bg-white border border-slate-100 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-900">{emp.nama}</div>
                        <div className="text-xs text-slate-400 font-mono">{emp.nip}</div>
                      </div>
                      <Badge variant="red" className="text-xs">Alfa</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>



      {/* ── MODAL: EDIT / RESET LOG PRESENSI ── */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Koreksi Log Presensi${editingLog?.employee?.nama_lengkap ? ` — ${editingLog.employee.nama_lengkap}` : ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={savingEdit}>
              Batal
            </Button>
            <Button type="submit" loading={savingEdit} disabled={savingEdit} form="edit-log-form">
              Simpan Koreksi
            </Button>
          </>
        }
      >
        <form id="edit-log-form" onSubmit={formEdit.handleSubmit(onSubmitEdit)} noValidate className="space-y-4">
          <p className="text-xs text-slate-500">
            Jam diisi dalam WIB (misal 07:41). Kosongkan jam bila ingin membiarkan nilai lama. Untuk salah tekan scan pulang, gunakan tombol reset di bawah tanpa menghapus scan masuk.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Controller
              control={formEdit.control}
              name="tanggal"
              render={({ field }) => (
                <Input
                  label="Tanggal Dinas"
                  type="date"
                  error={formEdit.formState.errors.tanggal?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={formEdit.control}
              name="status"
              render={({ field }) => (
                <Select
                  label="Status Kehadiran"
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={EDIT_STATUS_OPTIONS}
                  error={formEdit.formState.errors.status?.message}
                />
              )}
            />
            <Controller
              control={formEdit.control}
              name="jam_masuk"
              render={({ field }) => (
                <Input
                  label="Jam Masuk (WIB)"
                  type="time"
                  error={formEdit.formState.errors.jam_masuk?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
            <Controller
              control={formEdit.control}
              name="jam_keluar"
              render={({ field }) => (
                <Input
                  label="Jam Pulang (WIB)"
                  type="time"
                  error={formEdit.formState.errors.jam_keluar?.message}
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <Controller
            control={formEdit.control}
            name="catatan"
            render={({ field }) => (
              <Input
                label="Catatan koreksi (opsional)"
                placeholder="Alasan koreksi HR..."
                error={formEdit.formState.errors.catatan?.message}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
          {editingLog && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                icon={<RotateCcw size={14} />}
                onClick={() => editingLog && handleAskResetClock(editingLog, 'in')}
              >
                Reset Scan Masuk Saja
              </Button>
              <Button
                type="button"
                variant="outline"
                icon={<RotateCcw size={14} />}
                onClick={() => editingLog && handleAskResetClock(editingLog, 'out')}
              >
                Reset Scan Pulang Saja
              </Button>
            </div>
          )}
        </form>
      </Modal>

      {/* ── CONFIRM DIALOG ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirm.onConfirm}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmText={deleteConfirm.confirmText}
        cancelText="Batal"
        variant="danger"
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  );
}
