'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { Modal } from '@/components/ui/Modal';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { lmsService } from '@/services/lms.service';
import { siakadService } from '@/services/siakad.service';
import KelasForumTab from '@/components/lms/KelasForumTab';
import KelasSelect from '@/components/lms/KelasSelect';
import ExportLaporanModal from '@/components/lms/ExportLaporanModal';
import { referensiService, MasterReferensiItem } from '@/services/referensi.service';
import {
  LmsKelasOverview,
  LmsPertemuanItem,
  LmsRekapMatrix,
  LmsKetercapaian,
  LmsQuizItem,
  LmsExportJenis,
} from '@/types/lms.types';
import {
  formatJadwal,
  getJendelaStatus,
  isJendelaTerbuka,
  jendelaTertutupPesan,
} from '@/components/lms/tryout/tryoutHelpers';
import { PaginationMeta } from '@/types/api.types';
import {
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  Settings,
  ChevronRight,
  TrendingUp,
  Award,
  ShieldCheck,
  QrCode,
  BookOpen,
  Save,
  ArrowLeft,
  MessagesSquare,
  ListChecks,
  Target,
  Upload,
  Play,
  X,
  Pencil,
  Plus,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

const settingSchema = z.object({
  total_pertemuan: z.coerce.number().min(1, 'Total pertemuan minimal 1 sesi').max(32, 'Maksimal 32 pertemuan'),
  batas_min_hadir_persen: z.coerce.number().min(0, 'Minimal 0%').max(100, 'Maksimal 100%'),
  metode_absensi: z.string().min(1, 'Metode absensi wajib dipilih'),
  can_submit_late: z.boolean(),
  show_nilai_to_mahasiswa: z.boolean(),
});

type SettingFormValues = z.infer<typeof settingSchema>;

const importSchema = z.object({
  sumber_kelas_id: z.string().min(1, 'Kelas sumber wajib dipilih'),
});

type ImportFormValues = z.infer<typeof importSchema>;

// Backend `storePertemuan`: pertemuan_ke 1–16, tanggal wajib,
// materi/jam opsional.
const tambahPertemuanSchema = z.object({
  pertemuan_ke: z.coerce.number().min(1, 'Nomor pertemuan minimal 1').max(16, 'Nomor pertemuan maksimal 16'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  materi: z.string().max(255, 'Judul materi maksimal 255 karakter').optional().default(''),
  jam_mulai: z.string().optional().default(''),
  jam_selesai: z.string().optional().default(''),
});

type TambahPertemuanFormValues = z.infer<typeof tambahPertemuanSchema>;

interface PageProps {
  params: Promise<{
    kelasId: string;
  }>;
}

type DosenTab = 'pertemuan' | 'rekap' | 'forum' | 'setting';
type MhsTab = 'pertemuan' | 'forum' | 'tryout' | 'ketercapaian';
type ActiveTab = DosenTab | MhsTab;

function matrixBadge(status?: string) {
  const s = (status || '-').toUpperCase();
  if (s === 'H' || s === 'HADIR') return <Badge variant="green">H</Badge>;
  if (s === 'S' || s === 'SAKIT') return <Badge variant="gray">S</Badge>;
  if (s === 'I' || s === 'IZIN') return <Badge variant="amber">I</Badge>;
  if (s === 'A' || s === 'ALFA') return <Badge variant="red">A</Badge>;
  return <Badge variant="gray">-</Badge>;
}

function jendelaBadge(dibuka?: string | null, ditutup?: string | null) {
  const s = getJendelaStatus(dibuka, ditutup);
  const variant = s.key === 'berlangsung' ? 'green' : s.key === 'belum' ? 'gray' : s.key === 'berakhir' ? 'red' : 'blue';
  return <Badge variant={variant}>{s.label}</Badge>;
}

export default function LmsKelasDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const kelasId = Number(resolvedParams.kelasId);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasRole, hasPermission, isDosen: isAuthDosen, isSuperAdmin, isAdmin } = useAuth();
  const [overview, setOverview] = useState<LmsKelasOverview | null>(null);
  const viewerContext = overview?.viewer_context;
  const fallbackCanTeach = isAuthDosen || hasRole('dosen_pengajar');
  const fallbackIsPengelola =
    !fallbackCanTeach &&
    (isSuperAdmin || isAdmin || hasRole('admin_siakad') || hasPermission('siakad.kelas.manage'));
  const canTeach = viewerContext ? viewerContext.can_teach : fallbackCanTeach;
  const canConfigureKelas = viewerContext
    ? viewerContext.can_configure_kelas
    : fallbackCanTeach || fallbackIsPengelola;
  const isPengelolaReadOnly = viewerContext
    ? viewerContext.is_pengelola && !viewerContext.can_teach
    : fallbackIsPengelola;
  const isDosen = canTeach || isPengelolaReadOnly;
  const isMahasiswa = viewerContext
    ? viewerContext.viewer_mode === 'mahasiswa'
    : !isDosen;

  const initialTab: ActiveTab = (searchParams.get('tab') as ActiveTab) || 'pertemuan';
  const [activeTab, setActiveTab] = useState<ActiveTab>(
    ['pertemuan', 'rekap', 'forum', 'setting', 'tryout', 'ketercapaian'].includes(initialTab)
      ? initialTab
      : 'pertemuan'
  );
  const [matrix, setMatrix] = useState<LmsRekapMatrix | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [ketercapaian, setKetercapaian] = useState<LmsKetercapaian | null>(null);
  const [ketercapaianLoading, setKetercapaianLoading] = useState(false);
  const [tryoutList, setTryoutList] = useState<LmsQuizItem[]>([]);
  const [tryoutLoading, setTryoutLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editJudul, setEditJudul] = useState<string>('');
  const [editMateri, setEditMateri] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showTambah, setShowTambah] = useState(false);
  const [metodeAbsensiOptions, setMetodeAbsensiOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [showExport, setShowExport] = useState(false);

  // Permission export laporan: absensi/izin → kelola kelas, nilai → kelola nilai.
  const canExportPresensi = hasPermission('siakad.kelas.manage');
  const canExportNilai = hasPermission('siakad.nilai.manage');

  const exportJenis: LmsExportJenis[] = [
    ...(canExportPresensi ? (['presensi', 'izin'] as LmsExportJenis[]) : []),
    ...(canExportNilai ? (['nilai'] as LmsExportJenis[]) : []),
  ];

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SettingFormValues>({
    resolver: zodResolver(settingSchema) as any,
    defaultValues: {
      total_pertemuan: 16,
      batas_min_hadir_persen: 75,
      metode_absensi: 'keduanya',
      can_submit_late: true,
      show_nilai_to_mahasiswa: true,
    },
  });

  const importForm = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { sumber_kelas_id: '' },
  });

  const tambahForm = useForm<TambahPertemuanFormValues>({
    resolver: zodResolver(tambahPertemuanSchema) as any,
    defaultValues: { pertemuan_ke: 1, tanggal: '', materi: '', jam_mulai: '', jam_selesai: '' },
  });

  const fetchMetodeOptions = useCallback(async () => {
    try {
      const res = await referensiService.getPaginated({ modul: 'siakad', per_page: 50 });
      if (res.data) {
        const filtered = res.data
          .filter((r: MasterReferensiItem) => r.tipe === 'metode_absensi_lms')
          .map((r: MasterReferensiItem) => ({ value: r.kode || String(r.id), label: r.nama }));
        if (filtered.length > 0) setMetodeAbsensiOptions(filtered);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await lmsService.getKelasOverview(kelasId);
      if (res.status === 'success' && res.data) {
        setOverview(res.data);
        if (res.data.lms_setting) {
          setValue('total_pertemuan', res.data.lms_setting.total_pertemuan || 16);
          setValue('batas_min_hadir_persen', res.data.lms_setting.batas_min_hadir_persen || 75);
          setValue('metode_absensi', res.data.lms_setting.metode_absensi || 'keduanya');
          setValue('can_submit_late', Boolean(res.data.lms_setting.can_submit_late));
          setValue('show_nilai_to_mahasiswa', Boolean(res.data.lms_setting.show_nilai_to_mahasiswa));
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat overview kelas');
    }
  }, [kelasId, setValue]);

  const fetchMatrix = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const res = await lmsService.rekapMatrix(kelasId);
      if (res.status === 'success' && res.data) {
        const raw = res.data as any;
        // Toleransi bentuk lama (rekapitulasi/detail_pertemuan) & baru (rows/kehadiran)
        const rows = raw.rows || raw.rekapitulasi || [];
        const plist = raw.pertemuan_list || [];
        setMatrix({ ...raw, rows, pertemuan_list: plist });
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat rekap matrix');
      setMatrix(null);
    } finally {
      setMatrixLoading(false);
    }
  }, [kelasId]);

  const fetchKetercapaian = useCallback(async () => {
    setKetercapaianLoading(true);
    try {
      const res = await lmsService.getKetercapaian(kelasId);
      if (res.status === 'success' && res.data) setKetercapaian(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat ketercapaian MK');
      setKetercapaian(null);
    } finally {
      setKetercapaianLoading(false);
    }
  }, [kelasId]);

  const fetchTryoutRingkas = useCallback(async () => {
    setTryoutLoading(true);
    try {
      const res = await lmsService.listTryout(kelasId);
      if (res.status === 'success') setTryoutList(res.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat tryout kelas');
    } finally {
      setTryoutLoading(false);
    }
  }, [kelasId]);

  useEffect(() => {
    fetchOverview();
    fetchMetodeOptions();
  }, [fetchOverview, fetchMetodeOptions]);

  useEffect(() => {
    if (activeTab === 'rekap' && isDosen) fetchMatrix();
    if (activeTab === 'ketercapaian' && isMahasiswa) fetchKetercapaian();
    if (activeTab === 'tryout' && isMahasiswa) fetchTryoutRingkas();
  }, [activeTab, fetchMatrix, fetchKetercapaian, fetchTryoutRingkas, isDosen, isMahasiswa]);

  const onSaveSetting = async (values: SettingFormValues) => {
    try {
      const res = await lmsService.updateKelasSetting(kelasId, values as any);
      if (res.status === 'success') {
        toast.success('Pengaturan kelas LMS berhasil disimpan');
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui pengaturan');
    }
  };

  const onImportMateri = async (values: ImportFormValues) => {
    try {
      const res = await lmsService.importMateri(kelasId, { sumber_kelas_id: Number(values.sumber_kelas_id) });
      if (res.status === 'success') {
        toast.success(`Berhasil import ${(res.data as any)?.imported_count ?? ''} materi`);
        setShowImport(false);
        importForm.reset();
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal import materi');
    }
  };

  const onTambahPertemuan = async (values: TambahPertemuanFormValues) => {
    try {
      const payload: Record<string, unknown> = {
        pertemuan_ke: values.pertemuan_ke,
        tanggal: values.tanggal,
      };
      if (values.materi) payload.materi = values.materi;
      if (values.jam_mulai) payload.jam_mulai = values.jam_mulai;
      if (values.jam_selesai) payload.jam_selesai = values.jam_selesai;
      const res = await siakadService.createPertemuan(kelasId, payload);
      if (res.status === 'success') {
        toast.success(`Pertemuan ke-${values.pertemuan_ke} berhasil ditambahkan`);
        setShowTambah(false);
        tambahForm.reset({ pertemuan_ke: 1, tanggal: '', materi: '', jam_mulai: '', jam_selesai: '' });
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Gagal menambah pertemuan');
    }
  };

  const openTambah = () => {
    const maxKe = Math.max(0, ...(overview?.pertemuan_list?.map((p) => p.pertemuan_ke) || [0]));
    tambahForm.reset({
      pertemuan_ke: Math.min(maxKe + 1, 16),
      tanggal: new Date().toISOString().slice(0, 10),
      materi: '',
      jam_mulai: '',
      jam_selesai: '',
    });
    setShowTambah(true);
  };

  const startEdit = (p: LmsPertemuanItem) => {
    setEditingId(p.id);
    setEditJudul(p.materi || '');
    setEditMateri(p.catatan_pertemuan || '');
  };

  const saveEdit = async (p: LmsPertemuanItem) => {
    setSavingEdit(true);
    try {
      await lmsService.updatePertemuan(p.id, {
        pertemuan_ke: p.pertemuan_ke,
        tanggal: p.tanggal,
        materi: editJudul || null,
        catatan_pertemuan: editMateri || null,
      });
      toast.success('Pertemuan diperbarui');
      setEditingId(null);
      fetchOverview();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan pertemuan');
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'selesai':
        return <Badge variant="green">Selesai</Badge>;
      case 'berlangsung':
        return (
          <Badge style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>
            Berlangsung
          </Badge>
        );
      default:
        return <Badge variant="gray">Belum Mulai</Badge>;
    }
  };

  const tabBtn = (key: ActiveTab, label: string, icon: React.ReactNode) => (
    <Button
      key={key}
      type="button"
      variant="tab"
      onClick={() => setActiveTab(key)}
      className={`flex items-center gap-2 p-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
        activeTab === key
          ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );

  const matrixPertemuan = matrix?.pertemuan_list || [];
  const matrixRows = matrix?.rows || (matrix as any)?.rekapitulasi || [];
  const matrixColumns: ColumnDef<any>[] = [
    {
      key: 'mahasiswa',
      label: 'MAHASISWA',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{row.nama_lengkap}</span>
          <span className="text-2xs text-slate-500 font-mono block">{row.nim}</span>
        </div>
      ),
    },
    ...matrixPertemuan.map((pl) => ({
      key: `p-${pl.pertemuan_ke}`,
      label: `P${pl.pertemuan_ke}`,
      align: 'center' as const,
      render: (row: any) => {
        const kh = row.kehadiran || row.detail_pertemuan || {};
        const val = kh[String(pl.pertemuan_ke)] ?? kh[pl.id] ?? '-';
        return matrixBadge(String(val));
      },
    })),
    {
      key: 'persen',
      label: '%',
      align: 'center' as const,
      render: (row: any) => (
        <span className="font-bold text-slate-800 text-xs">{row.persentase_kehadiran ?? row.persentase ?? 0}%</span>
      ),
    },
    {
      key: 'syarat',
      label: 'SYARAT',
      align: 'center' as const,
      render: (row: any) => (
        <Badge variant={row.is_memenuhi_syarat ? 'green' : 'red'}>
          {row.is_memenuhi_syarat ? 'Memenuhi' : 'Kurang'}
        </Badge>
      ),
    },
  ];
  const matrixMeta: PaginationMeta = {
    current_page: 1,
    last_page: 1,
    per_page: matrixRows.length || 50,
    total: matrixRows.length || 0,
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={overview?.kelas.nama_kelas || 'Detail Kelas LMS'}
        description={`${overview?.kelas.kode_kelas || ''} • ${overview?.kelas.mata_kuliah?.nama || ''} (${overview?.kelas.mata_kuliah?.total_sks || 0} SKS) • Prodi ${overview?.kelas.program_studi?.nama || ''}`}
        breadcrumbs={[
          { label: 'LMS', href: '/lms' },
          { label: overview?.kelas.nama_kelas || 'Detail Kelas' },
        ]}
        action={
          <div className="flex items-center gap-2">
            {canTeach && (
              <Button size="sm" variant="outline" icon={<Upload size={16} />} onClick={() => setShowImport(true)}>
                Import Materi
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/lms')}
              icon={<ArrowLeft size={16} />}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
            >
              Kembali
            </Button>
          </div>
        }
      />

      {isPengelolaReadOnly && (
        <Alert variant="info" icon={<ShieldCheck size={18} className="shrink-0 text-slate-600 mt-0.5" />}>
          <div>
            <strong>Mode Monitoring Pengelola:</strong> Anda melihat kelas ini sebagai pengelola institusi/prodi. Pengelolaan materi, tugas, nilai, dan presensi dilakukan oleh Dosen Pengampu kelas ini, sedangkan konfigurasi kebijakan kelas tersedia pada tab <strong>Pengaturan</strong>.
          </div>
        </Alert>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Progres Perkuliahan</span>
            <TrendingUp size={16} className="text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {overview?.progress.persentase_selesai || 0}%
          </div>
          <div className="text-2xs text-slate-400">
            {overview?.progress.pertemuan_selesai || 0} dari {overview?.progress.total_pertemuan_terencana || 16} pertemuan tuntas
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Konten Pembelajaran</span>
            <FileText size={16} className="text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {overview?.statistik.total_materi || 0} Materi
          </div>
          <div className="text-2xs text-slate-400">
            {overview?.statistik.total_tugas || 0} tugas terbit
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Mahasiswa Terdaftar</span>
            <Award size={16} className="text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {overview?.statistik.total_mahasiswa_krs || 0} Mahasiswa
          </div>
          <div className="text-2xs text-slate-400">Terdaftar resmi via KRS Aktif</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Permohonan Izin Pending</span>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {overview?.statistik.total_izin_pending || 0} Surat
          </div>
          <div className="text-2xs text-slate-400">Menunggu persetujuan dosen</div>
        </div>
      </div>

      {/* Info capaian OBE */}
      {overview?.komponen_obe && overview.komponen_obe.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Target size={16} style={{ color: 'var(--module-primary)' }} />
            <span>Capaian OBE Mata Kuliah</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {overview.komponen_obe.map((k) => (
              <Badge key={k.id} variant="gray">
                {k.nama_komponen} • {k.bobot}%
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tab Menu */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {tabBtn('pertemuan', 'Perkuliahan', <Calendar size={16} />)}
        {isDosen && tabBtn('rekap', 'Rekap Presensi', <ShieldCheck size={16} />)}
        {tabBtn('forum', 'Forum Diskusi', <MessagesSquare size={16} />)}
        {canConfigureKelas && tabBtn('setting', 'Pengaturan', <Settings size={16} />)}
        {isMahasiswa && tabBtn('tryout', 'Tryout', <ListChecks size={16} />)}
        {isMahasiswa && tabBtn('ketercapaian', 'Ketercapaian MK', <Target size={16} />)}
      </div>

      {/* Tab: Perkuliahan */}
      {activeTab === 'pertemuan' && (
        <div className="space-y-4">
          {canTeach && (
            <div className="flex justify-end">
              <Button size="sm" icon={<Plus size={16} />} onClick={openTambah}>
                Tambah Pertemuan
              </Button>
            </div>
          )}
          {overview?.pertemuan_list?.map((p: LmsPertemuanItem) => (
            <div
              key={p.id}
              className="p-4 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col gap-2"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center shrink-0 border border-slate-200">
                  P{p.pertemuan_ke}
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {canTeach && editingId === p.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Judul / Materi"
                        value={editJudul}
                        onChange={(e) => setEditJudul(e.target.value)}
                        placeholder="Judul pertemuan"
                      />
                      <Input
                        label="Catatan"
                        value={editMateri}
                        onChange={(e) => setEditMateri(e.target.value)}
                        placeholder="Catatan pertemuan"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900">
                          {p.materi || `Sesi Pertemuan Ke-${p.pertemuan_ke}`}
                        </h4>
                        {getStatusBadge(p.status_pertemuan)}
                        {p.is_token_active && (
                          <span className="inline-flex items-center gap-2 text-2xs font-semibold bg-emerald-50 text-emerald-700 p-2 rounded-full border border-emerald-200">
                            <QrCode size={16} /> Token Aktif: {p.token_absensi}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-2xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-2">
                          <Calendar size={16} /> {p.tanggal}
                        </span>
                        {p.jam_mulai && (
                          <span className="flex items-center gap-2">
                            <Clock size={16} /> {p.jam_mulai} - {p.jam_selesai || 'Selesai'}
                          </span>
                        )}
                        <span className="flex items-center gap-2 text-slate-700 font-medium">
                          <BookOpen size={16} /> {p.materi_list_count || 0} Materi
                        </span>
                        <span className="flex items-center gap-2 text-amber-700 font-medium">
                          <FileText size={16} /> {p.tugas_list_count || 0} Tugas
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end flex-wrap">
                {canTeach && editingId === p.id ? (
                  <>
                    <Button size="sm" variant="outline" icon={<X size={16} />} onClick={() => setEditingId(null)}>
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      icon={<Save size={16} />}
                      loading={savingEdit}
                      disabled={savingEdit}
                      onClick={() => saveEdit(p)}
                    >
                      Simpan
                    </Button>
                  </>
                ) : (
                  <>
                    {canTeach && (
                      <Button size="sm" variant="outline" icon={<Pencil size={16} />} onClick={() => startEdit(p)}>
                        Ubah
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      icon={<ChevronRight size={16} />}
                      onClick={() => router.push(`/lms/${kelasId}/pertemuan/${p.id}`)}
                    >
                      Buka Sesi
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Rekap Presensi (dosen, matrix) */}
      {activeTab === 'rekap' && isDosen && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Rekapitulasi Kehadiran Mahasiswa</h3>
              <p className="text-2xs text-slate-500">
                Batas minimal kehadiran: {matrix?.batas_min_hadir_persen || 75}% • H=Hadir S=Sakit
                I=Izin A=Alfa
              </p>
            </div>
            {exportJenis.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                icon={<Download size={16} />}
                onClick={() => setShowExport(true)}
              >
                Export Laporan
              </Button>
            )}
          </div>

          {matrixLoading ? (
            <p className="text-xs text-slate-500">Memuat rekap matrix...</p>
          ) : (
            <DataTable
              columns={matrixColumns}
              data={matrixRows}
              meta={matrixMeta}
              onPageChange={() => {}}
              emptyMessage="Belum ada data rekapitulasi kehadiran mahasiswa."
            />
          )}
        </div>
      )}

      {/* Tab: Pengaturan (dosen / pengelola) */}
      {activeTab === 'setting' && canConfigureKelas && (
        <form
          onSubmit={handleSubmit(onSaveSetting)}
          className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs max-w-2xl space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-800">Konfigurasi Pembelajaran Kelas LMS</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Total Sesi Pertemuan"
              error={errors.total_pertemuan?.message}
              {...register('total_pertemuan')}
            />
            <Input
              type="number"
              label="Batas Minimal Kehadiran (%)"
              error={errors.batas_min_hadir_persen?.message}
              {...register('batas_min_hadir_persen')}
            />
          </div>

          <Controller
            name="metode_absensi"
            control={control}
            render={({ field }) => (
              <Select
                label="Metode Presensi Diperbolehkan"
                placeholder={metodeAbsensiOptions.length === 0 ? 'Memuat opsi...' : 'Pilih metode presensi...'}
                options={metodeAbsensiOptions}
                value={field.value}
                onChange={field.onChange}
                error={errors.metode_absensi?.message}
              />
            )}
          />

          <hr className="border-t border-slate-100 my-4" />

          <div className="space-y-4">
            <Controller
              name="can_submit_late"
              control={control}
              render={({ field }) => (
                <ToggleSwitch
                  id="can_submit_late"
                  checked={field.value}
                  onChange={field.onChange}
                  label="Izinkan Pengumpulan Tugas Terlambat"
                  description="Mahasiswa tetap dapat mengunggah tugas setelah deadline dengan label terlambat"
                />
              )}
            />
            <Controller
              name="show_nilai_to_mahasiswa"
              control={control}
              render={({ field }) => (
                <ToggleSwitch
                  id="show_nilai_to_mahasiswa"
                  checked={field.value}
                  onChange={field.onChange}
                  label="Tampilkan Nilai Tugas ke Mahasiswa"
                  description="Mahasiswa dapat langsung melihat nilai dan catatan feedback dosen di LMS"
                />
              )}
            />
          </div>

          <hr className="border-t border-slate-100 my-4" />

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting} icon={<Save size={16} />}>
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Forum */}
      {activeTab === 'forum' && (
        <KelasForumTab
          kelasId={kelasId}
          isMahasiswa={isMahasiswa}
          canManage={!isMahasiswa}
          pertemuanList={overview?.pertemuan_list || []}
        />
      )}

      {/* Tab: Tryout (mahasiswa) — ringkas + link agregat */}
      {activeTab === 'tryout' && isMahasiswa && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link href={`/lms/tryout?kelas_id=${kelasId}`}>
              <Button size="sm" variant="outline" icon={<ListChecks size={16} />}>
                Semua Tryout Kelas Ini
              </Button>
            </Link>
          </div>
          {tryoutLoading ? (
            <p className="text-xs text-slate-500">Memuat tryout...</p>
          ) : tryoutList.length === 0 ? (
            <EmptyState title="Belum ada tryout" description="Belum ada paket latihan untuk kelas ini." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tryoutList.map((t) => {
                const terbuka = t.is_published && isJendelaTerbuka(t.dibuka_at, t.ditutup_at);
                return (
                <div key={t.id} className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-900">{t.judul}</h5>
                    {t.durasi_menit ? (
                      <Badge>{t.durasi_menit} mnt</Badge>
                    ) : (
                      <Badge variant="gray">Tanpa batas</Badge>
                    )}
                  </div>
                  {t.deskripsi && <p className="text-2xs text-slate-500 line-clamp-2">{t.deskripsi}</p>}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-2xs text-slate-500">
                      <span className="block">Buka: {formatJadwal(t.dibuka_at)}</span>
                      <span className="block">Tutup: {formatJadwal(t.ditutup_at)}</span>
                    </div>
                    {jendelaBadge(t.dibuka_at, t.ditutup_at)}
                  </div>
                  {!terbuka ? (
                    <p className="text-2xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      {!t.is_published ? 'Tryout belum dipublish oleh dosen.' : jendelaTertutupPesan(t.dibuka_at, t.ditutup_at)}
                    </p>
                  ) : null}
                  {terbuka ? (
                    <Link href={`/lms/${kelasId}/quiz/${t.id}`}>
                      <Button size="sm" icon={<Play size={16} />}>
                        Mulai
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" icon={<Play size={16} />} disabled>
                      Mulai
                    </Button>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Ketercapaian MK (mahasiswa) */}
      {activeTab === 'ketercapaian' && isMahasiswa && (
        <div className="space-y-4">
          {ketercapaianLoading ? (
            <p className="text-xs text-slate-500">Memuat ketercapaian...</p>
          ) : !ketercapaian ? (
            <EmptyState title="Belum ada data" description="Data ketercapaian MK belum tersedia." />
          ) : (
            <div className="p-4 bg-white rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800">Ketercapaian Mata Kuliah</h3>
                <Badge
                  style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                >
                  Nilai: {ketercapaian.nilai_akhir ?? '-'}
                </Badge>
              </div>
              <div>
                <div className="flex justify-between text-2xs text-slate-500">
                  <span>Progres</span>
                  <span>{ketercapaian.progress_persen ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ketercapaian.progress_persen ?? 0}%`,
                      backgroundColor: 'var(--module-primary)',
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                {(ketercapaian.komponen || []).map((k) => (
                  <div key={k.id} className="p-3 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-800">{k.nama_komponen}</span>
                      <span className="text-2xs text-slate-500">
                        Bobot {k.bobot}% • Nilai {k.nilai ?? '-'}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${k.persentase ?? 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(ketercapaian.komponen || []).length === 0 && (
                  <p className="text-2xs text-slate-400">Belum ada komponen OBE yang dinilai.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Import Materi */}
      <Modal
        open={showImport}
        onClose={() => setShowImport(false)}
        title="Import Materi Antar Kelas"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowImport(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-import-materi"
              loading={importForm.formState.isSubmitting}
              disabled={importForm.formState.isSubmitting}
              icon={<Upload size={16} />}
            >
              Import
            </Button>
          </div>
        }
      >
        <form
          id="form-import-materi"
          onSubmit={importForm.handleSubmit(onImportMateri)}
          className="grid grid-cols-1 gap-4"
        >
          <Controller
            name="sumber_kelas_id"
            control={importForm.control}
            render={({ field }) => (
              <KelasSelect
                label="Kelas Sumber"
                placeholder="Pilih kelas sumber materi..."
                required
                value={field.value}
                onChange={(val) => {
                  const v =
                    val && typeof val === 'object' && 'value' in (val as any)
                      ? String((val as any).value)
                      : val
                        ? String(val)
                        : '';
                  field.onChange(v);
                }}
                error={importForm.formState.errors.sumber_kelas_id?.message}
              />
            )}
          />
          <p className="text-2xs text-slate-500">
            Materi dari kelas sumber akan disalin ke kelas ini (periode tujuan: kelas saat ini).
          </p>
        </form>
      </Modal>

      {/* Modal Tambah Pertemuan Manual (dosen) */}
      <Modal
        open={showTambah}
        onClose={() => setShowTambah(false)}
        title="Tambah Pertemuan Manual"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowTambah(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-tambah-pertemuan"
              loading={tambahForm.formState.isSubmitting}
              disabled={tambahForm.formState.isSubmitting}
              icon={<Save size={16} />}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form
          id="form-tambah-pertemuan"
          onSubmit={tambahForm.handleSubmit(onTambahPertemuan)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Input
            type="number"
            label="Pertemuan Ke-"
            min={1}
            max={16}
            required
            error={tambahForm.formState.errors.pertemuan_ke?.message}
            {...tambahForm.register('pertemuan_ke')}
          />
          <Input
            type="date"
            label="Tanggal"
            required
            error={tambahForm.formState.errors.tanggal?.message}
            {...tambahForm.register('tanggal')}
          />
          <div className="md:col-span-2">
            <Input
              label="Judul / Materi"
              placeholder="cth: Pengantar OOP"
              error={tambahForm.formState.errors.materi?.message}
              {...tambahForm.register('materi')}
            />
          </div>
          <Input
            type="time"
            label="Jam Mulai (opsional)"
            error={tambahForm.formState.errors.jam_mulai?.message}
            {...tambahForm.register('jam_mulai')}
          />
          <Input
            type="time"
            label="Jam Selesai (opsional)"
            error={tambahForm.formState.errors.jam_selesai?.message}
            {...tambahForm.register('jam_selesai')}
          />
        </form>
      </Modal>

      {/* Modal Export Laporan (dosen) */}
      <ExportLaporanModal
        open={showExport}
        onClose={() => setShowExport(false)}
        scope={{ kelasId }}
        jenis={exportJenis}
      />
    </div>
  );
}
