'use client';

import { useState, useEffect, useCallback, useRef, use, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import QRCode from 'qrcode';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Alert } from '@/components/ui/Alert';
import PertemuanQuizTab from '@/components/lms/PertemuanQuizTab';
import PertemuanDiskusi from '@/components/lms/PertemuanDiskusi';
import ExportLaporanModal from '@/components/lms/ExportLaporanModal';
import { LmsQrScanner } from '@/components/lms/LmsQrScanner';
import { lmsService } from '@/services/lms.service';
import { referensiService, MasterReferensiItem } from '@/services/referensi.service';
import {
  LmsPertemuanDetail,
  LmsMateriItem,
  LmsTugasItem,
  LmsPengumpulanTugas,
  LmsIzinAbsensiItem,
  PERTEMUAN_STATUS_OPTIONS,
  PERTEMUAN_STATUS_VALUES,
  PERTEMUAN_STATUS_LABEL,
} from '@/types/lms.types';
import { PaginationMeta } from '@/types/api.types';
import {
  Calendar,
  Clock,
  QrCode,
  Users,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Download,
  Award,
  Link as LinkIcon,
  AlertTriangle,
  Send,
  Save,
  X,
  Check,
  ArrowLeft,
  CheckCircle2,
  UploadCloud,
  FileCheck,
  RotateCw,
  Lock,
  ListChecks,
  ClipboardList,
  MessagesSquare,
  GraduationCap,
  Pencil,
  Undo2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

// ── ZOD SCHEMAS DI LUAR KOMPONEN ──
const materiSchema = z.object({
  judul: z.string().min(1, 'Judul materi wajib diisi'),
  tipe_konten_id: z.coerce.number().min(1, 'Tipe konten wajib dipilih'),
  deskripsi: z.string().optional().default(''),
  link_eksternal: z.string().optional().default(''),
});

type MateriFormValues = z.infer<typeof materiSchema>;

const tugasSchema = z.object({
  judul: z.string().min(1, 'Judul tugas wajib diisi'),
  deskripsi: z.string().optional().default(''),
  deadline_at: z.string().optional().default(''),
  maks_nilai: z.coerce.number().min(1, 'Nilai maksimal minimal 1').max(1000, 'Nilai maksimal 1000'),
  komponen_penilaian_id: z.union([z.coerce.number(), z.literal('')]).optional().default(''),
});

type TugasFormValues = z.infer<typeof tugasSchema>;

const nilaiSchema = z.object({
  nilai: z.coerce.number().min(0, 'Nilai minimal 0').max(100, 'Nilai maksimal 100'),
  feedback_dosen: z.string().optional().default(''),
});

type NilaiFormValues = z.infer<typeof nilaiSchema>;

const inputTokenSchema = z.object({
  token: z.string().length(6, 'Token absensi harus berupa 6 karakter').regex(/^[A-Za-z0-9]+$/, 'Format token tidak valid'),
});

type InputTokenFormValues = z.infer<typeof inputTokenSchema>;

const qrScanSchema = z.object({
  payload: z.string().min(1, 'Kode QR atau payload scanner wajib diisi'),
});

type QrScanFormValues = z.infer<typeof qrScanSchema>;

const kumpulTugasSchema = z.object({
  catatan_mahasiswa: z.string().optional().default(''),
});

type KumpulTugasFormValues = z.infer<typeof kumpulTugasSchema>;

const ajukanIzinSchema = z.object({
  tipe_izin_id: z.coerce.number().min(1, 'Tipe izin wajib dipilih'),
  alasan: z.string().min(5, 'Alasan permohonan minimal 5 karakter'),
});

type AjukanIzinFormValues = z.infer<typeof ajukanIzinSchema>;

const isianSchema = z.object({
  materi: z.string().min(1, 'Judul/materi pertemuan wajib diisi').max(255, 'Materi maksimal 255 karakter'),
  catatan_pertemuan: z.string().optional().default(''),
  tanggal: z.string().min(1, 'Tanggal pertemuan wajib diisi'),
  jam_mulai: z.string().optional().default(''),
  jam_selesai: z.string().optional().default(''),
  status_pertemuan: z.enum(PERTEMUAN_STATUS_VALUES).optional().nullable().default(null),
});

type IsianFormValues = z.infer<typeof isianSchema>;

interface PageProps {
  params: Promise<{
    kelasId: string;
    pertemuanId: string;
  }>;
}

export default function LmsPertemuanDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const kelasId = Number(resolvedParams.kelasId);
  const pertemuanId = Number(resolvedParams.pertemuanId);
  const router = useRouter();
  const { hasPermission, hasRole, isDosen: isAuthDosen, isSuperAdmin, isAdmin } = useAuth();
  // State Utama
  const [detail, setDetail] = useState<LmsPertemuanDetail | null>(null);
  const viewerContext = detail?.viewer_context;
  const fallbackCanTeach = isAuthDosen || hasRole('dosen_pengajar');
  const fallbackIsPengelola =
    !fallbackCanTeach &&
    (isSuperAdmin || isAdmin || hasRole('admin_siakad') || hasPermission('siakad.kelas.manage'));
  const canTeach = viewerContext ? viewerContext.can_teach : fallbackCanTeach;
  const isPengelolaReadOnly = viewerContext
    ? viewerContext.is_pengelola && !viewerContext.can_teach
    : fallbackIsPengelola;
  const isDosen = canTeach;
  const canManageKelas = canTeach;
  const canInputPresensi = canTeach;
  const canProsesIzin = canTeach;
  const isMahasiswa = viewerContext
    ? viewerContext.viewer_mode === 'mahasiswa'
    : !canTeach && !isPengelolaReadOnly;
  type TabKey =
    | 'isian'
    | 'presensi'
    | 'materi'
    | 'tugas'
    | 'kuis'
    | 'diskusi'
    | 'pembelajaran'
    | 'tugas_kuis'
    | 'kehadiran';
  const [activeTab, setActiveTab] = useState<TabKey>('isian');

  // Tab default & validasi per peran: dosen = isian, mahasiswa = pembelajaran.
  useEffect(() => {
    const dosenTabs: TabKey[] = ['isian', 'presensi', 'materi', 'tugas', 'kuis', 'diskusi'];
    const mhsTabs: TabKey[] = ['pembelajaran', 'tugas_kuis', 'diskusi', 'kehadiran'];
    if (isMahasiswa && !mhsTabs.includes(activeTab)) {
      setActiveTab('pembelajaran');
    } else if (!isMahasiswa && !dosenTabs.includes(activeTab)) {
      setActiveTab('isian');
    }
  }, [isMahasiswa, activeTab]);

  // Pagination Meta untuk DataTable Presensi & Submisi Tugas
  const [absensiMeta, setAbsensiMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0,
  });

  // Master Referensi State
  const [tipeKontenOptions, setTipeKontenOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [statusAbsensiOptions, setStatusAbsensiOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [statusPersetujuanMap, setStatusPersetujuanMap] = useState<Record<string, number>>({});
  const [tipeIzinOptions, setTipeIzinOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Token Absensi State
  const [tokenInfo, setTokenInfo] = useState<{
    token: string;
    expired_at: string;
    qr_payload?: string;
    rotate_interval_seconds?: number;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [rotateCountdown, setRotateCountdown] = useState<number>(30);
  const [showBukaSesiModal, setShowBukaSesiModal] = useState<boolean>(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const [tutupConfirm, setTutupConfirm] = useState<boolean>(false);
  const [presensiInputMode, setPresensiInputMode] = useState<'scanner' | 'token'>('scanner');
  const [qrScanInput, setQrScanInput] = useState<string>('');
  const [isScanningQr, setIsScanningQr] = useState<boolean>(false);

  // File Upload State untuk Materi
  const [materiFile, setMateriFile] = useState<File | null>(null);

  // Modal State Dosen
  const [showMateriModal, setShowMateriModal] = useState<boolean>(false);
  const [showTugasModal, setShowTugasModal] = useState<boolean>(false);
  const [selectedPengumpulan, setSelectedPengumpulan] = useState<LmsPengumpulanTugas | null>(null);

  // ID tugas yang sedang diekspor (null = modal export tertutup).
  const [exportTugasId, setExportTugasId] = useState<number | null>(null);
  const canExportNilai = hasPermission('siakad.nilai.manage');

  // Modal State Mahasiswa
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showKumpulModal, setShowKumpulModal] = useState<boolean>(false);
  const [selectedTugasForKumpul, setSelectedTugasForKumpul] = useState<LmsTugasItem | null>(null);
  const [berkasTugasFile, setBerkasTugasFile] = useState<File | null>(null);
  const [showIzinModal, setShowIzinModal] = useState<boolean>(false);
  const [suratIzinFile, setSuratIzinFile] = useState<File | null>(null);

  // Modal Konfirmasi Hapus
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'materi' | 'tugas' | null;
    id: number | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: '',
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Modal Konfirmasi Tarik Kembali Pengumpulan (mahasiswa)
  const [tarikKembaliConfirm, setTarikKembaliConfirm] = useState<{
    isOpen: boolean;
    tugasId: number | null;
    judul: string;
  }>({
    isOpen: false,
    tugasId: null,
    judul: '',
  });
  const [isMenarikKembali, setIsMenarikKembali] = useState<boolean>(false);

  // Presensi Manual Dosen Grid State
  const [attendanceChanges, setAttendanceChanges] = useState<Record<number, number>>({});
  const [isSavingBulkAbsensi, setIsSavingBulkAbsensi] = useState<boolean>(false);

  // React Hook Form Instances dengan Zod Resolver
  const materiFormHook = useForm<MateriFormValues>({
    resolver: zodResolver(materiSchema) as any,
    defaultValues: {
      judul: '',
      tipe_konten_id: undefined as any,
      deskripsi: '',
      link_eksternal: '',
    },
  });

  const tugasFormHook = useForm<TugasFormValues>({
    resolver: zodResolver(tugasSchema) as any,
    defaultValues: {
      judul: '',
      deskripsi: '',
      deadline_at: '',
      maks_nilai: 100,
      komponen_penilaian_id: '',
    },
  });

  const nilaiFormHook = useForm<NilaiFormValues>({
    resolver: zodResolver(nilaiSchema) as any,
    defaultValues: {
      nilai: 85,
      feedback_dosen: '',
    },
  });

  const tokenFormHook = useForm<InputTokenFormValues>({
    resolver: zodResolver(inputTokenSchema) as any,
    defaultValues: {
      token: '',
    },
  });

  const qrScanFormHook = useForm<QrScanFormValues>({
    resolver: zodResolver(qrScanSchema) as any,
    defaultValues: {
      payload: '',
    },
  });

  const kumpulFormHook = useForm<KumpulTugasFormValues>({
    resolver: zodResolver(kumpulTugasSchema) as any,
    defaultValues: {
      catatan_mahasiswa: '',
    },
  });

  const izinFormHook = useForm<AjukanIzinFormValues>({
    resolver: zodResolver(ajukanIzinSchema) as any,
    defaultValues: {
      tipe_izin_id: undefined as any,
      alasan: '',
    },
  });

  const isianFormHook = useForm<IsianFormValues>({
    resolver: zodResolver(isianSchema) as any,
    defaultValues: {
      materi: '',
      catatan_pertemuan: '',
      tanggal: '',
      jam_mulai: '',
      jam_selesai: '',
      status_pertemuan: null,
    },
  });
  const [isEditingIsian, setIsEditingIsian] = useState<boolean>(false);

  // Fetch Data Master Referensi
  const fetchMasterReferensi = useCallback(async () => {
    try {
      const res = await referensiService.getPaginated({ modul: 'siakad', per_page: 100 });
      if (res.data) {
        const kontenList = res.data
          .filter((r: MasterReferensiItem) => r.tipe === 'tipe_konten_lms')
          .map((r: MasterReferensiItem) => ({ value: r.id, label: r.nama }));
        setTipeKontenOptions(kontenList);

        const absensiList = res.data
          .filter((r: MasterReferensiItem) => r.tipe === 'status_absensi')
          .map((r: MasterReferensiItem) => ({ value: r.id, label: r.nama }));
        setStatusAbsensiOptions(absensiList);

        const izinList = res.data
          .filter((r: MasterReferensiItem) => r.tipe === 'tipe_izin_absensi')
          .map((r: MasterReferensiItem) => ({ value: r.id, label: r.nama }));
        setTipeIzinOptions(izinList);

        const persetujuanObj: Record<string, number> = {};
        res.data
          .filter((r: MasterReferensiItem) => r.tipe === 'status_persetujuan_izin')
          .forEach((r: MasterReferensiItem) => {
            persetujuanObj[(r.kode || r.nama).toLowerCase()] = r.id;
          });
        setStatusPersetujuanMap(persetujuanObj);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Detail Sesi Pertemuan
  const fetchDetail = useCallback(async () => {
    try {
      const res = await lmsService.getPertemuanDetail(pertemuanId);
      if (res.status === 'success' && res.data) {
        setDetail(res.data);
        setAbsensiMeta({
          current_page: 1,
          last_page: 1,
          per_page: res.data.absensi_list?.length || 50,
          total: res.data.absensi_list?.length || 0,
        });
        if (res.data.pertemuan.token_absensi && res.data.pertemuan.token_expired_at) {
          setTokenInfo({
            token: res.data.pertemuan.token_absensi,
            expired_at: res.data.pertemuan.token_expired_at,
            qr_payload: `RAG-PRESENSI:${pertemuanId}:${res.data.pertemuan.token_absensi}`,
            rotate_interval_seconds: 30,
          });
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat detail pertemuan LMS');
    }
  }, [pertemuanId]);

  useEffect(() => {
    fetchMasterReferensi();
    fetchDetail();
  }, [fetchMasterReferensi, fetchDetail]);

  // Render QR Code Data URL setiap kali token berubah
  useEffect(() => {
    if (!tokenInfo?.token) {
      setQrDataUrl(null);
      return;
    }
    const payload = tokenInfo.qr_payload || `RAG-PRESENSI:${pertemuanId}:${tokenInfo.token}`;
    QRCode.toDataURL(payload, { width: 180, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null));
  }, [tokenInfo?.token, tokenInfo?.qr_payload, pertemuanId]);

  // Auto-rotasi token tiap 30 detik selama sesi presensi terbuka pada layar Dosen Pengampu
  useEffect(() => {
    if (!canTeach || !tokenInfo?.token || detail?.presensi_ditutup) {
      return;
    }
    const intervalSec = tokenInfo.rotate_interval_seconds || 30;
    setRotateCountdown(intervalSec);

    const timer = setInterval(() => {
      setRotateCountdown((prev) => {
        if (prev <= 1) {
          lmsService
            .rotateTokenAbsensi(pertemuanId)
            .then((res) => {
              if (res.status === 'success' && res.data) {
                setTokenInfo({
                  token: res.data.token,
                  expired_at: res.data.expired_at,
                  qr_payload: res.data.qr_payload || `RAG-PRESENSI:${pertemuanId}:${res.data.token}`,
                  rotate_interval_seconds: res.data.rotate_interval_seconds || 30,
                });
              }
            })
            .catch(() => {
              // Abaikan kegagalan jaringan sementara pada background rotation
            });
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [canTeach, tokenInfo?.token, tokenInfo?.rotate_interval_seconds, detail?.presensi_ditutup, pertemuanId]);

  // Sinkronkan form Isian dari detail (dosen) — jangan timpa saat sedang mengedit.
  useEffect(() => {
    if (detail?.pertemuan && !isEditingIsian) {
      isianFormHook.reset({
        materi: detail.pertemuan.materi || '',
        catatan_pertemuan: detail.pertemuan.catatan_pertemuan || '',
        tanggal: detail.pertemuan.tanggal || '',
        jam_mulai: detail.pertemuan.jam_mulai || '',
        jam_selesai: detail.pertemuan.jam_selesai || '',
        status_pertemuan: detail.pertemuan.status_pertemuan || null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, isEditingIsian]);

  // Buka Sesi Presensi sekaligus Simpan Jurnal Mengajar Dosen (Rotasi QR 30 Detik)
  const onBukaSesiDenganJurnal = async (values: IsianFormValues) => {
    setIsGeneratingToken(true);
    try {
      const res = await lmsService.bukaSesiPresensi(pertemuanId, {
        materi: values.materi,
        catatan_pertemuan: values.catatan_pertemuan || null,
        tanggal: values.tanggal || undefined,
        jam_mulai: values.jam_mulai || null,
        jam_selesai: values.jam_selesai || null,
      });
      if (res.status === 'success' && res.data) {
        setTokenInfo({
          token: res.data.token,
          expired_at: res.data.expired_at,
          qr_payload: res.data.qr_payload,
          rotate_interval_seconds: res.data.rotate_interval_seconds || 30,
        });
        setShowBukaSesiModal(false);
        toast.success(`Jurnal disimpan & sesi presensi dibuka! Kode berputar otomatis tiap ${res.data.rotate_interval_seconds || 30} detik.`);
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuka sesi presensi dengan jurnal');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Generate Token Absensi Realtime
  const handleGenerateToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await lmsService.generateTokenAbsensi(pertemuanId);
      if (res.status === 'success' && res.data) {
        setTokenInfo({
          token: res.data.token,
          expired_at: res.data.expired_at,
          qr_payload: res.data.qr_payload || `RAG-PRESENSI:${pertemuanId}:${res.data.token}`,
          rotate_interval_seconds: res.data.rotate_interval_seconds || 30,
        });
        toast.success(`Token berhasil diaktifkan: ${res.data.token} (rotasi tiap 30 detik)`);
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal generate token absensi');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Putar ulang token umur pendek (anti titip-hadir, 30 detik)
  const handleRotateToken = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await lmsService.rotateTokenAbsensi(pertemuanId);
      if (res.status === 'success' && res.data) {
        setTokenInfo({
          token: res.data.token,
          expired_at: res.data.expired_at,
          qr_payload: res.data.qr_payload || `RAG-PRESENSI:${pertemuanId}:${res.data.token}`,
          rotate_interval_seconds: res.data.rotate_interval_seconds || 30,
        });
        toast.success(`Token baru: ${res.data.token} (berlaku ${res.data.ttl_detik} detik)`);
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memutar ulang token absensi');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Tutup sesi presensi
  const handleTutupPresensi = async () => {
    setIsGeneratingToken(true);
    try {
      const res = await lmsService.tutupPresensi(pertemuanId);
      if (res.status === 'success') {
        setTokenInfo(null);
        toast.success('Sesi presensi berhasil ditutup');
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menutup sesi presensi');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Simpan Bulk Presensi Mahasiswa oleh Dosen
  const handleSaveBulkAbsensi = async () => {
    const list = Object.entries(attendanceChanges).map(([mhsId, statusId]) => ({
      mahasiswa_id: Number(mhsId),
      status_id: statusId,
    }));

    if (list.length === 0) return;

    setIsSavingBulkAbsensi(true);
    try {
      const res = await lmsService.bulkInputAbsensi(pertemuanId, list);
      if (res.status === 'success') {
        toast.success('Presensi mahasiswa berhasil disimpan');
        setAttendanceChanges({});
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan absensi');
    } finally {
      setIsSavingBulkAbsensi(false);
    }
  };

  // Proses Persetujuan Izin Mahasiswa (Zero Hardcode via Referensi ID)
  const handleProsesIzin = async (izinId: number, targetStatusId: number) => {
    try {
      const res = await lmsService.prosesIzin(izinId, {
        status_id: targetStatusId,
        catatan_dosen: `Diproses oleh dosen pada ${new Date().toLocaleDateString('id-ID')}`,
      });
      if (res.status === 'success') {
        toast.success('Permohonan izin mahasiswa berhasil diproses');
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses permohonan izin');
    }
  };

  // Submit Isian Pertemuan oleh Dosen (inline edit via updatePertemuan)
  const onSaveIsian = async (values: IsianFormValues) => {
    if (!detail) return;

    try {
      const res = await lmsService.updatePertemuan(pertemuanId, {
        pertemuan_ke: detail.pertemuan.pertemuan_ke,
        tanggal: values.tanggal,
        materi: values.materi || null,
        catatan_pertemuan: values.catatan_pertemuan || null,
        jam_mulai: values.jam_mulai || null,
        jam_selesai: values.jam_selesai || null,
        status_pertemuan: values.status_pertemuan || null,
      });

      if (res.status === 'success') {
        toast.success('Isian pertemuan berhasil disimpan');
        setIsEditingIsian(false);
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan isian pertemuan');
    }
  };

  // Submit Materi Baru
  const onSaveMateri = async (values: MateriFormValues) => {
    const formData = new FormData();
    formData.append('judul', values.judul);
    formData.append('tipe_konten_id', String(values.tipe_konten_id));
    if (values.deskripsi) formData.append('deskripsi', values.deskripsi);
    if (values.link_eksternal) formData.append('link_eksternal', values.link_eksternal);
    if (materiFile) {
      formData.append('file', materiFile);
    }

    try {
      const res = await lmsService.createMateri(pertemuanId, formData);
      if (res.status === 'success') {
        toast.success('Materi pembelajaran berhasil ditambahkan');
        setShowMateriModal(false);
        materiFormHook.reset();
        setMateriFile(null);
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan materi');
    }
  };

  // Submit Tugas Baru
  const onSaveTugas = async (values: TugasFormValues) => {
    try {
      const payload: any = {
        judul: values.judul,
        deskripsi: values.deskripsi,
        maks_nilai: values.maks_nilai,
        can_submit_late: true,
        is_published: true,
      };

      if (values.deadline_at) payload.deadline_at = values.deadline_at;
      if (values.komponen_penilaian_id) payload.komponen_penilaian_id = Number(values.komponen_penilaian_id);

      const res = await lmsService.createTugas(pertemuanId, payload);
      if (res.status === 'success') {
        toast.success('Tugas perkuliahan berhasil dibuat');
        setShowTugasModal(false);
        tugasFormHook.reset();
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat tugas');
    }
  };

  // Submit Penilaian Tugas Mahasiswa (Sync ke OBE)
  const onSaveNilai = async (values: NilaiFormValues) => {
    if (!selectedPengumpulan) return;

    try {
      const res = await lmsService.beriNilaiTugas(selectedPengumpulan.id, {
        nilai: values.nilai,
        feedback_dosen: values.feedback_dosen,
      });

      if (res.status === 'success') {
        toast.success('Nilai tugas berhasil disimpan & disinkronkan ke OBE');
        setSelectedPengumpulan(null);
        nilaiFormHook.reset();
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan nilai');
    }
  };

  // Submit Token Absensi Realtime oleh Mahasiswa
  const onInputToken = async (values: InputTokenFormValues) => {
    try {
      const res = await lmsService.inputTokenAbsensi(pertemuanId, values.token);
      if (res.status === 'success') {
        toast.success('Kehadiran berhasil dicatat via token!');
        setShowTokenModal(false);
        tokenFormHook.reset();
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses token absensi');
    }
  };

  // Scan QR / Token Presensi (mendukung format RAG-PRESENSI:{pertemuanId}:{token} atau 6-digit token)
  const submitQrPayload = useCallback(
    async (rawPayload: string) => {
      const cleaned = rawPayload.trim();
      if (!cleaned) {
        toast.error('Masukkan atau scan kode QR presensi terlebih dahulu.');
        return;
      }
      setIsScanningQr(true);
      try {
        const res = await lmsService.scanPresensi({
          qr_payload: cleaned,
          pertemuan_id: pertemuanId,
          device_info: typeof navigator !== 'undefined' ? navigator.userAgent : 'web-scanner',
        });
        if (res.status === 'success') {
          toast.success(res.message || 'Presensi via QR Scanner berhasil dicatat!');
          setShowTokenModal(false);
          setQrScanInput('');
          fetchDetail();
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal memproses scan QR presensi');
      } finally {
        setIsScanningQr(false);
      }
    },
    [pertemuanId, fetchDetail]
  );

  // Submit Pengumpulan Tugas oleh Mahasiswa
  // Bila sudah ada pengumpulan sebelumnya → gunakan endpoint perbarui;
  // bila belum ada → gunakan endpoint kirim pengumpulan.
  const onKumpulTugas = async (values: KumpulTugasFormValues) => {
    if (!selectedTugasForKumpul) return;

    const formData = new FormData();
    if (values.catatan_mahasiswa) {
      formData.append('catatan_mahasiswa', values.catatan_mahasiswa);
    }
    if (berkasTugasFile) {
      formData.append('file', berkasTugasFile);
    }

    const sudahAda = Boolean(detail?.my_pengumpulan?.[selectedTugasForKumpul.id]);

    try {
      const res = sudahAda
        ? await lmsService.updatePengumpulanTugas(selectedTugasForKumpul.id, formData)
        : await lmsService.kumpulkanTugas(selectedTugasForKumpul.id, formData);

      if (res.status === 'success') {
        toast.success(
          sudahAda
            ? 'Pengumpulan tugas berhasil diperbarui'
            : 'Tugas perkuliahan berhasil dikumpulkan'
        );
        setShowKumpulModal(false);
        setSelectedTugasForKumpul(null);
        setBerkasTugasFile(null);
        kumpulFormHook.reset();
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengumpulkan tugas');
    }
  };

  // Tarik kembali / hapus pengumpulan tugas oleh mahasiswa
  const handleTarikKembali = async () => {
    if (!tarikKembaliConfirm.tugasId) return;

    setIsMenarikKembali(true);
    try {
      await lmsService.hapusPengumpulanTugas(tarikKembaliConfirm.tugasId);
      toast.success('Pengumpulan tugas berhasil ditarik kembali');
      setTarikKembaliConfirm({ isOpen: false, tugasId: null, judul: '' });
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menarik kembali pengumpulan tugas');
    } finally {
      setIsMenarikKembali(false);
    }
  };

  // Submit Permohonan Izin / Sakit oleh Mahasiswa
  const onAjukanIzin = async (values: AjukanIzinFormValues) => {
    const formData = new FormData();
    formData.append('tipe_izin_id', String(values.tipe_izin_id));
    formData.append('alasan', values.alasan);
    if (suratIzinFile) {
      formData.append('file_surat', suratIzinFile);
    }

    try {
      const res = await lmsService.ajukanIzin(pertemuanId, formData);
      if (res.status === 'success') {
        toast.success('Permohonan izin berhasil diajukan ke dosen');
        setShowIzinModal(false);
        setSuratIzinFile(null);
        izinFormHook.reset();
        fetchDetail();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengajukan izin');
    }
  };

  // Eksekusi Hapus Materi / Tugas
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;

    setIsDeleting(true);
    try {
      if (deleteConfirm.type === 'materi') {
        await lmsService.deleteMateri(deleteConfirm.id);
        toast.success('Materi berhasil dihapus');
      } else {
        await lmsService.deleteTugas(deleteConfirm.id);
        toast.success('Tugas berhasil dihapus');
      }
      setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
      fetchDetail();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  };

  // Sumber presensi murni tampilan dari data existing:
  // "Otomatis" bila catatan mengandung kata token/mandiri atau hadir saat token aktif.
  const isTokenActive = Boolean(detail?.token_aktif || detail?.pertemuan?.is_token_active || tokenInfo?.token);
  const isAbsensiOtomatis = (row: any) =>
    /token|mandiri/i.test(String(row?.catatan || '')) || (row?.status === 'hadir' && isTokenActive);
  const isBelumAbsen = (row: any) => !row?.status || row?.status === 'belum_absen';
  const presensiSummary = (() => {
    const list = detail?.absensi_list || [];
    let otomatis = 0;
    let manual = 0;
    let belum = 0;
    list.forEach((row: any) => {
      if (isBelumAbsen(row)) belum += 1;
      else if (isAbsensiOtomatis(row)) otomatis += 1;
      else manual += 1;
    });
    return { otomatis, manual, belum };
  })();

  // Kolom Presensi Pertemuan DataTable
  const absensiColumns: ColumnDef<any>[] = [
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
    {
      key: 'status',
      label: 'STATUS SAAT INI',
      render: (row) => (
        <Badge
          variant={
            row.status === 'hadir'
              ? 'green'
              : row.status === 'alfa'
              ? 'red'
              : 'gray'
          }
          style={
            row.status === 'sakit'
              ? { borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }
              : undefined
          }
        >
          {row.status ? String(row.status).toUpperCase() : 'BELUM ABSEN'}
        </Badge>
      ),
    },
    {
      key: 'sumber',
      label: 'SUMBER',
      render: (row) => (
        <Badge variant={isAbsensiOtomatis(row) ? 'green' : 'gray'}>
          {isAbsensiOtomatis(row) ? 'Otomatis' : 'Manual'}
        </Badge>
      ),
    },
    ...(canInputPresensi
      ? [
          {
            key: 'ubah_status',
            label: 'UBAH STATUS (MANUAL DOSEN)',
            render: (row: any) => (
              <div className="w-48">
                <Select
                  placeholder="Pilih status..."
                  options={statusAbsensiOptions}
                  value={attendanceChanges[row.mahasiswa_id]}
                  onChange={(val) => {
                    setAttendanceChanges((prev) => ({
                      ...prev,
                      [row.mahasiswa_id]: Number(val),
                    }));
                  }}
                />
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'catatan',
      label: 'CATATAN',
      render: (row) => (
        <span className="text-2xs text-slate-500">{row.catatan || '-'}</span>
      ),
    },
  ];

  // Helper untuk Submisi Tugas DataTable Columns
  const getSubmisiColumns = (tugas: LmsTugasItem): ColumnDef<LmsPengumpulanTugas>[] => [
    {
      key: 'mahasiswa',
      label: 'MAHASISWA',
      render: (p) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{p.mahasiswa?.nama_lengkap}</span>
          <span className="text-2xs text-slate-500 font-mono block">{p.mahasiswa?.nim}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (p) => (
        <Badge variant={p.is_late ? 'yellow' : 'green'}>
          {p.is_late ? 'Terlambat' : 'Tepat Waktu'}
        </Badge>
      ),
    },
    {
      key: 'berkas',
      label: 'BERKAS',
      render: (p) =>
        p.file_path ? (
          <a
            href={p.file_path}
            target="_blank"
            rel="noreferrer"
            className="text-slate-700 hover:text-slate-900 hover:underline inline-flex items-center gap-2 text-2xs font-medium"
          >
            <Download size={16} /> {p.nama_file_asli || 'Berkas Tugas'}
          </a>
        ) : (
          <span className="text-2xs text-slate-400">Teks / Catatan</span>
        ),
    },
    {
      key: 'nilai',
      label: 'NILAI OBE',
      align: 'center',
      render: (p) => (
        <span className="font-bold text-xs">
          {p.nilai !== null ? <span className="text-emerald-600">{p.nilai}</span> : <span className="text-slate-400">-</span>}
        </span>
      ),
    },
    ...(canTeach
      ? [
          {
            key: 'aksi',
            label: 'AKSI',
            align: 'right' as const,
            render: (p: LmsPengumpulanTugas) => (
              <DropdownMenu
                items={[
                  {
                    label: p.nilai !== null ? 'Koreksi Nilai' : 'Beri Nilai',
                    icon: <Award size={16} />,
                    onClick: () => {
                      setSelectedPengumpulan(p);
                      nilaiFormHook.setValue('nilai', p.nilai ?? 85);
                      nilaiFormHook.setValue('feedback_dosen', p.feedback_dosen || '');
                    },
                  },
                ]}
              />
            ),
          },
        ]
      : []),
  ];

  // Pemetaan komponen OBE -> tugas/kuis yang terhubung (via komponen_penilaian_id)
  const obeLinkMap = (() => {
    const map: Record<number, { tugas: string[]; kuis: string[] }> = {};
    (detail?.komponen_obe_list || []).forEach((k) => {
      map[k.id] = { tugas: [], kuis: [] };
    });
    (detail?.tugas_list || []).forEach((t) => {
      if (t.komponen_penilaian_id && map[t.komponen_penilaian_id]) {
        map[t.komponen_penilaian_id].tugas.push(t.judul);
      }
    });
    (detail?.quiz_list || []).forEach((q) => {
      if (q.komponen_penilaian_id && map[q.komponen_penilaian_id]) {
        map[q.komponen_penilaian_id].kuis.push(q.judul);
      }
    });
    return map;
  })();

  // Panel Capaian OBE (modul OBE-SIAKAD) — dipakai dosen (Isian) & mahasiswa (Pembelajaran)
  const renderObePanel = () => (
    <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
      <div>
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <Award size={16} style={{ color: 'var(--module-primary)' }} />
          Capaian OBE (modul OBE-SIAKAD)
        </h4>
        <p className="text-2xs text-slate-500">
          Komponen penilaian OBE sesi pertemuan ini beserta status keterhubungan tugas/kuis.
        </p>
      </div>

      {(detail?.komponen_obe_list || []).length === 0 ? (
        <p className="text-2xs text-slate-400">
          Belum ada komponen OBE yang terhubung ke sesi pertemuan ini.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(detail?.komponen_obe_list || []).map((k) => {
            const linked = obeLinkMap[k.id] || { tugas: [], kuis: [] };
            const isLinked = linked.tugas.length > 0 || linked.kuis.length > 0;
            return (
              <div key={k.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800 text-xs">{k.nama_komponen}</span>
                  <Badge variant={isLinked ? 'green' : 'gray'}>
                    {isLinked ? 'Terhubung' : 'Belum'}
                  </Badge>
                </div>
                <span className="text-2xs text-slate-500">Bobot: {k.bobot}%</span>
                {isLinked && (
                  <div className="flex flex-col gap-2">
                    {linked.tugas.map((nama) => (
                      <span key={`t-${nama}`} className="text-2xs text-slate-600 flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" /> {nama}
                      </span>
                    ))}
                    {linked.kuis.map((nama) => (
                      <span key={`q-${nama}`} className="text-2xs text-slate-600 flex items-center gap-2">
                        <ListChecks size={16} className="text-slate-400" /> {nama}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Konfigurasi tab per peran
  const dosenTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: 'isian', label: 'Isian', icon: <ClipboardList size={16} /> },
    { key: 'presensi', label: `Presensi Mahasiswa (${detail?.absensi_list?.length || 0})`, icon: <Users size={16} /> },
    { key: 'materi', label: `Materi Pembelajaran (${detail?.materi_list?.length || 0})`, icon: <BookOpen size={16} /> },
    { key: 'tugas', label: `Penugasan & Nilai OBE (${detail?.tugas_list?.length || 0})`, icon: <FileText size={16} /> },
    { key: 'kuis', label: `Kuis & Tryout Mini (${detail?.quiz_list?.length || 0})`, icon: <ListChecks size={16} /> },
    { key: 'diskusi', label: 'Diskusi', icon: <MessagesSquare size={16} /> },
  ];
  const mahasiswaTabs: Array<{ key: TabKey; label: string; icon: ReactNode }> = [
    { key: 'pembelajaran', label: 'Pembelajaran', icon: <GraduationCap size={16} /> },
    { key: 'tugas_kuis', label: `Tugas & Kuis (${(detail?.tugas_list?.length || 0) + (detail?.quiz_list?.length || 0)})`, icon: <FileText size={16} /> },
    { key: 'diskusi', label: 'Diskusi', icon: <MessagesSquare size={16} /> },
    { key: 'kehadiran', label: 'Kehadiran', icon: <CheckCircle2 size={16} /> },
  ];
  const visibleTabs = isMahasiswa ? mahasiswaTabs : dosenTabs;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title={`Pertemuan Ke-${detail?.pertemuan.pertemuan_ke || ''}: ${detail?.pertemuan.materi || 'Sesi Perkuliahan'}`}
        description={`Sesi perkuliahan tanggal ${detail?.pertemuan.tanggal || ''} • ${detail?.pertemuan.jam_mulai || ''} - ${detail?.pertemuan.jam_selesai || 'Selesai'}`}
        breadcrumbs={[
          { label: 'LMS', href: '/lms' },
          { label: 'Kelas', href: `/lms/${kelasId}` },
          { label: `P${detail?.pertemuan.pertemuan_ke}` },
        ]}
        action={
          <Button
            variant="outline"
            onClick={() => router.push(`/lms/${kelasId}`)}
            icon={<ArrowLeft size={16} />}
            style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
          >
            Kembali
          </Button>
        }
      />

      {isPengelolaReadOnly && (
        <Alert variant="info" icon={<FileCheck size={18} className="shrink-0 text-slate-600 mt-0.5" />}>
          <div>
            <strong>Mode Monitoring Pengelola (Read-Only):</strong> Anda melihat sesi pertemuan ini sebagai pengelola institusi/prodi. Pengelolaan materi, tugas, kuis, penilaian, dan presensi hanya dapat dilakukan oleh Dosen Pengampu kelas ini.
          </div>
        </Alert>
      )}

      {/* Top Banner: Realtime Token Absensi Widget (Slate Netral Theme) */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {!isMahasiswa && tokenInfo?.token && qrDataUrl ? (
            <div className="p-1.5 bg-white rounded-xl shrink-0 shadow-sm border border-emerald-400/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR Presensi Pertemuan"
                className="w-24 h-24 rounded-lg object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <QrCode size={24} className="text-slate-200" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="text-2xs text-slate-300 uppercase tracking-wider font-semibold">
              {isMahasiswa
                ? 'Presensi Mandiri Sesi Pertemuan (Scanner QR / Token 30 Detik)'
                : 'Presensi Realtime Mahasiswa (QR & Token Berputar Tiap 30 Detik)'}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isMahasiswa ? (
                detail?.my_absensi ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/30">
                      Kehadiran Tercatat: {String(detail.my_absensi.status).toUpperCase()}
                    </span>
                    {detail.my_absensi.waktu_absen && (
                      <span className="text-2xs text-slate-300">
                        (Pukul {new Date(detail.my_absensi.waktu_absen).toLocaleTimeString('id-ID')})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-300">
                    Scan QR di layar dosen (atau via Aplikasi Mobile) atau masukkan 6-digit token yang berubah tiap 30 detik.
                  </span>
                )
              ) : tokenInfo?.token ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-2xl font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/60 p-2 rounded-lg border border-emerald-500/30">
                      {tokenInfo.token}
                    </span>
                    <span className="text-2xs font-semibold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-400/30">
                      Rotasi kode otomatis dalam {rotateCountdown} detik
                    </span>
                  </div>
                  <span className="text-2xs text-slate-400 font-mono">
                    Payload Scanner: {tokenInfo.qr_payload || `RAG-PRESENSI:${pertemuanId}:${tokenInfo.token}`}
                  </span>
                </div>
              ) : detail?.presensi_ditutup ? (
                <span className="text-xs font-semibold text-slate-300 bg-slate-700/60 p-2 rounded-lg border border-slate-500/30">
                  Sesi presensi sudah ditutup.
                </span>
              ) : (
                <span className="text-xs text-slate-300">
                  Isi jurnal perkuliahan dan buka sesi presensi untuk menampilkan QR & token yang berputar tiap 30 detik.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isMahasiswa ? (
            !detail?.my_absensi && (
              <Button
                size="sm"
                icon={<QrCode size={16} />}
                onClick={() => setShowTokenModal(true)}
              >
                Scan QR / Input Presensi
              </Button>
            )
          ) : isPengelolaReadOnly ? (
            <span className="text-2xs font-semibold text-slate-400">
              Mode Monitoring Pengelola — aktivasi token oleh Dosen Pengampu.
            </span>
          ) : detail?.presensi_ditutup ? (
            <span className="text-2xs font-semibold text-slate-400">
              Sesi presensi ditutup — input manual tetap bisa via tabel di bawah.
            </span>
          ) : (
            <>
              <Button
                size="sm"
                loading={isGeneratingToken}
                disabled={isGeneratingToken}
                icon={<QrCode size={16} />}
                onClick={() => setShowBukaSesiModal(true)}
              >
                {tokenInfo?.token ? 'Perbarui Jurnal & Putar Sesi' : 'Isi Jurnal & Buka Sesi (30d)'}
              </Button>
              {tokenInfo?.token && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={isGeneratingToken}
                  disabled={isGeneratingToken}
                  icon={<RotateCw size={16} />}
                  onClick={handleRotateToken}
                  style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                >
                  Putar Kode (30d)
                </Button>
              )}
              <Button
                size="sm"
                variant="outline-danger"
                loading={isGeneratingToken}
                disabled={isGeneratingToken}
                icon={<Lock size={16} />}
                onClick={() => setTutupConfirm(true)}
              >
                Tutup Sesi
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tab Menu Underline Standard (berbasis peran) */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            variant="tab"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 p-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Tab Isian: kartu editable + capaian OBE (khusus dosen, default) */}
      {activeTab === 'isian' && !isMahasiswa && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList size={16} style={{ color: 'var(--module-primary)' }} />
                  Isian Pertemuan Ke-{detail?.pertemuan.pertemuan_ke || ''}
                </h4>
                <p className="text-2xs text-slate-500">
                  Kelola judul materi, catatan, jadwal, dan status penyelesaian sesi pertemuan.
                </p>
              </div>
              {canTeach && !isEditingIsian && (
                <Button size="sm" variant="outline" icon={<Pencil size={16} />} onClick={() => setIsEditingIsian(true)}>
                  Ubah Isian
                </Button>
              )}
            </div>

            {isEditingIsian ? (
              <form id="form-isian-pertemuan" onSubmit={isianFormHook.handleSubmit(onSaveIsian)} className="space-y-4">
                <Input
                  label="Judul / Materi Pertemuan"
                  placeholder="Contoh: Pengantar Cloud Architecture"
                  error={isianFormHook.formState.errors.materi?.message}
                  {...isianFormHook.register('materi')}
                />

                <Textarea
                  label="Catatan Pertemuan"
                  placeholder="Tuliskan catatan atau agenda sesi pertemuan..."
                  error={isianFormHook.formState.errors.catatan_pertemuan?.message}
                  {...isianFormHook.register('catatan_pertemuan')}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="date"
                    label="Tanggal Pertemuan"
                    error={isianFormHook.formState.errors.tanggal?.message}
                    {...isianFormHook.register('tanggal')}
                  />
                  <Input
                    type="time"
                    label="Jam Mulai"
                    error={isianFormHook.formState.errors.jam_mulai?.message}
                    {...isianFormHook.register('jam_mulai')}
                  />
                  <Input
                    type="time"
                    label="Jam Selesai"
                    error={isianFormHook.formState.errors.jam_selesai?.message}
                    {...isianFormHook.register('jam_selesai')}
                  />
                </div>

                <Controller
                  name="status_pertemuan"
                  control={isianFormHook.control}
                  render={({ field }) => (
                    <Select
                      label="Status Penyelesaian Pertemuan"
                      placeholder="Pilih status..."
                      options={PERTEMUAN_STATUS_OPTIONS}
                      value={field.value ?? ''}
                      onChange={(val) => field.onChange(val ? String(val) : null)}
                      error={isianFormHook.formState.errors.status_pertemuan?.message}
                    />
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" icon={<X size={16} />} onClick={() => setIsEditingIsian(false)}>
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    form="form-isian-pertemuan"
                    loading={isianFormHook.formState.isSubmitting}
                    disabled={isianFormHook.formState.isSubmitting}
                    icon={<Save size={16} />}
                  >
                    Simpan Isian
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-2">
                  <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Judul / Materi</span>
                  <span className="font-bold text-slate-900">{detail?.pertemuan.materi || '-'}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Status</span>
                  <span>
                    <Badge variant={detail?.pertemuan.status_pertemuan === 'selesai' ? 'green' : 'gray'}>
                      {detail?.pertemuan.status_pertemuan
                        ? PERTEMUAN_STATUS_LABEL[detail.pertemuan.status_pertemuan]
                        : 'BELUM DIISI'}
                    </Badge>
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Tanggal</span>
                  <span className="font-medium text-slate-800 flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" /> {detail?.pertemuan.tanggal || '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Jam Sesi</span>
                  <span className="font-medium text-slate-800 flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" /> {detail?.pertemuan.jam_mulai || '-'} - {detail?.pertemuan.jam_selesai || 'Selesai'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Catatan Pertemuan</span>
                  <span className="text-slate-600 text-2xs leading-relaxed">{detail?.pertemuan.catatan_pertemuan || '-'}</span>
                </div>
              </div>
            )}
          </div>

          {renderObePanel()}
        </div>
      )}

      {/* Tab 1: Presensi Mahasiswa & Verifikasi Izin (dosen) / Kehadiran (mahasiswa) */}
      {(activeTab === 'presensi' || activeTab === 'kehadiran') && (
        <div className="space-y-6">
          {isMahasiswa ? (
            /* Tampilan Presensi & Izin Khusus Mahasiswa */
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <CheckCircle2 size={24} className={detail?.my_absensi ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">
                      Status Kehadiran Anda
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          detail?.my_absensi?.status === 'hadir'
                            ? 'green'
                            : detail?.my_absensi?.status === 'alfa'
                            ? 'red'
                            : 'gray'
                        }
                        style={
                          detail?.my_absensi?.status === 'sakit'
                            ? { borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }
                            : undefined
                        }
                      >
                        {detail?.my_absensi?.status ? String(detail.my_absensi.status).toUpperCase() : 'BELUM PRESENSI'}
                      </Badge>
                      {detail?.my_absensi?.waktu_absen && (
                        <span className="text-2xs text-slate-500">
                          Dicatat pada {new Date(detail.my_absensi.waktu_absen).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!detail?.my_absensi && !detail?.my_izin && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<AlertTriangle size={16} />}
                      onClick={() => setShowIzinModal(true)}
                    >
                      Ajukan Izin / Sakit
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Permohonan Izin Mahasiswa */}
              {detail?.my_izin && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-600" />
                      Status Pengajuan Izin / Sakit Anda
                    </h4>
                    <Badge variant={detail.my_izin.status === 'disetujui' ? 'green' : detail.my_izin.status === 'ditolak' ? 'red' : 'yellow'}>
                      {detail.my_izin.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-4 bg-white rounded-lg border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          Tipe: {detail.my_izin.tipe_izin.toUpperCase()}
                        </span>
                        <span className="text-2xs text-slate-500">
                          (Diajukan untuk sesi pertemuan ini)
                        </span>
                      </div>
                      <p className="text-slate-600 text-2xs">
                        <strong>Alasan:</strong> {detail.my_izin.alasan}
                      </p>
                      {detail.my_izin.catatan_dosen && (
                        <p className="text-slate-700 text-2xs bg-slate-50 p-2 rounded border border-slate-200">
                          <strong>Catatan Dosen:</strong> {detail.my_izin.catatan_dosen}
                        </p>
                      )}
                    </div>

                    {detail.my_izin.surat_path && (
                      <DropdownMenu
                        items={[
                          {
                            label: 'Lihat Surat Keterangan',
                            icon: <Download size={16} />,
                            onClick: () => {
                              window.open(detail.my_izin?.surat_path || '#', '_blank');
                            },
                          },
                        ]}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tampilan Presensi & Izin Khusus Dosen */
            <>
              {/* Permohonan Izin / Sakit yang Masuk */}
              {detail?.izin_list && detail.izin_list.length > 0 && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-4">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    Permohonan Izin / Sakit Mahasiswa ({detail.izin_list.length})
                  </h4>

                  <div className="flex flex-col gap-2">
                    {detail.izin_list.map((iz: LmsIzinAbsensiItem) => (
                      <div
                        key={iz.id}
                        className="p-4 bg-white rounded-lg border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{iz.mahasiswa?.nama_lengkap}</span>
                            <span className="font-mono text-2xs text-slate-500">({iz.mahasiswa?.nim})</span>
                            <Badge
                              variant="gray"
                              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                            >
                              {iz.tipe_izin.toUpperCase()}
                            </Badge>
                            <Badge variant={iz.status === 'disetujui' ? 'green' : iz.status === 'ditolak' ? 'red' : 'gray'}>
                              {iz.status}
                            </Badge>
                          </div>
                          <p className="text-slate-600 text-2xs">Alasan: {iz.alasan}</p>
                        </div>

                        <DropdownMenu
                          items={[
                            ...(iz.surat_path
                              ? [
                                  {
                                    label: 'Lihat Surat Keterangan',
                                    icon: <Download size={16} />,
                                    onClick: () => {
                                      window.open(iz.surat_path || '#', '_blank');
                                    },
                                  },
                                ]
                              : []),
                            ...(canProsesIzin && iz.status === 'pending' && statusPersetujuanMap['disetujui'] && statusPersetujuanMap['ditolak']
                              ? [
                                  {
                                    label: 'Setujui Permohonan',
                                    icon: <Check size={16} />,
                                    onClick: () => handleProsesIzin(iz.id, statusPersetujuanMap['disetujui']),
                                  },
                                  {
                                    label: 'Tolak Permohonan',
                                    icon: <X size={16} />,
                                    variant: 'danger' as const,
                                    onClick: () => handleProsesIzin(iz.id, statusPersetujuanMap['ditolak']),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabel Presensi Mahasiswa Kelas via Mandatory DataTable */}
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Daftar Kehadiran Sesi Pertemuan</h4>
                    <p className="text-2xs text-slate-500">
                      Dosen dapat mengubah status presensi mahasiswa secara langsung lalu menekan Simpan Presensi.
                    </p>
                    <p className="text-2xs text-slate-500">
                      Otomatis: {presensiSummary.otomatis} • Manual: {presensiSummary.manual} • Belum absen: {presensiSummary.belum}
                    </p>
                  </div>

                  {Object.keys(attendanceChanges).length > 0 && (
                    <Button
                      size="sm"
                      loading={isSavingBulkAbsensi}
                      disabled={isSavingBulkAbsensi}
                      icon={<Send size={16} />}
                      onClick={handleSaveBulkAbsensi}
                    >
                      Simpan Perubahan Presensi ({Object.keys(attendanceChanges).length})
                    </Button>
                  )}
                </div>

                <DataTable
                  columns={absensiColumns}
                  data={detail?.absensi_list || []}
                  meta={absensiMeta}
                  onPageChange={(page) => {
                    setAbsensiMeta((prev) => ({ ...prev, current_page: page }));
                    fetchDetail();
                  }}
                  onLimitChange={(limit) => {
                    setAbsensiMeta((prev) => ({ ...prev, per_page: limit, current_page: 1 }));
                    fetchDetail();
                  }}
                  emptyMessage="Belum ada data mahasiswa terdaftar untuk sesi pertemuan ini."
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Materi Pembelajaran (dosen) / Pembelajaran (mahasiswa: status + OBE + materi) */}
      {(activeTab === 'materi' || activeTab === 'pembelajaran') && (
        <div className="space-y-4">
          {isMahasiswa && activeTab === 'pembelajaran' && (
            <>
              <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <CheckCircle2 size={24} className={detail?.my_absensi ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">
                      Status Kehadiran Anda
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          detail?.my_absensi?.status === 'hadir'
                            ? 'green'
                            : detail?.my_absensi?.status === 'alfa'
                            ? 'red'
                            : 'gray'
                        }
                      >
                        {detail?.my_absensi?.status ? String(detail.my_absensi.status).toUpperCase() : 'BELUM PRESENSI'}
                      </Badge>
                      {detail?.my_absensi?.waktu_absen && (
                        <span className="text-2xs text-slate-500">
                          Dicatat pada {new Date(detail.my_absensi.waktu_absen).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!detail?.my_absensi && (
                    <Button
                      size="sm"
                      icon={<QrCode size={16} />}
                      onClick={() => setShowTokenModal(true)}
                    >
                      Input Token
                    </Button>
                  )}
                  {!detail?.my_absensi && !detail?.my_izin && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<AlertTriangle size={16} />}
                      onClick={() => setShowIzinModal(true)}
                    >
                      Ajukan Izin
                    </Button>
                  )}
                </div>
              </div>

              {renderObePanel()}
            </>
          )}
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Materi & Bahan Perkuliahan</h4>
            {canTeach && (
              <Button
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setShowMateriModal(true)}
              >
                Tambah Materi
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detail?.materi_list?.map((m: LmsMateriItem) => (
              <div
                key={m.id}
                className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-2xs">
                        #{m.urutan}
                      </span>
                      <h5 className="font-bold text-slate-900 text-xs">{m.judul}</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="gray"
                        style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                      >
                        {m.tipe_konten}
                      </Badge>
                      {canTeach && (
                        <DropdownMenu
                          items={[
                            {
                              label: 'Hapus Materi',
                              icon: <Trash2 size={16} />,
                              variant: 'danger',
                              onClick: () => setDeleteConfirm({ isOpen: true, type: 'materi', id: m.id, name: m.judul }),
                            },
                          ]}
                        />
                      )}
                    </div>
                  </div>

                  {m.deskripsi && (
                    <p className="text-2xs text-slate-600 leading-relaxed">
                      {m.deskripsi}
                    </p>
                  )}

                  {m.link_eksternal && (
                    <div>
                      <a
                        href={m.link_eksternal}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-700 hover:text-slate-900 hover:underline inline-flex items-center gap-2 font-medium"
                      >
                        <LinkIcon size={16} /> Buka Tautan Eksternal
                      </a>
                    </div>
                  )}

                  {/* Berkas Lampiran */}
                  {m.files && m.files.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <hr className="border-t border-slate-100 my-4" />
                      <div className="text-2xs text-slate-400 font-semibold uppercase tracking-wider">
                        Berkas Unduhan ({m.files.length})
                      </div>
                      {m.files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-2xs"
                        >
                          <span className="font-medium text-slate-700 truncate max-w-xs">{f.nama_file}</span>
                          <DropdownMenu
                            items={[
                              {
                                label: 'Unduh Berkas',
                                icon: <Download size={16} />,
                                onClick: () => {
                                  window.open(f.file_path, '_blank');
                                },
                              },
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Penugasan & Sync Nilai OBE (dosen) / Tugas & Kuis (mahasiswa: tugas + kuis) */}
      {(activeTab === 'tugas' || activeTab === 'tugas_kuis') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Penugasan Mahasiswa & Nilai OBE</h4>
              <p className="text-2xs text-slate-500">
                {isMahasiswa
                  ? 'Kumpulkan tugas sesuai instruksi dan deadline untuk memperoleh penilaian terintegrasi OBE.'
                  : 'Nilai yang diinputkan dosen akan otomatis tersinkronisasi ke sistem OBE (siakad_nilai_komponen_mhs).'}
              </p>
            </div>
            {canTeach && (
              <Button
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => setShowTugasModal(true)}
              >
                Buat Tugas Baru
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {detail?.tugas_list?.map((t: LmsTugasItem) => {
              const mySubmisi = detail.my_pengumpulan?.[t.id];
              // Pengumpulan yang sudah dinilai dikunci backend — mahasiswa tidak
              // boleh memperbarui maupun menarik kemalinya.
              const sudahDinilai =
                mySubmisi?.nilai !== null && mySubmisi?.nilai !== undefined;

              return (
                <div key={t.id} className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-slate-900 text-xs">{t.judul}</h5>
                        {t.komponen_penilaian && (
                          <Badge variant="green">
                            OBE: {t.komponen_penilaian.nama_komponen} ({t.komponen_penilaian.bobot}%)
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xs text-slate-600">{t.deskripsi}</p>
                      <div className="flex items-center gap-4 text-2xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-2">
                          <Clock size={16} /> Deadline: {t.deadline_at ? new Date(t.deadline_at).toLocaleString('id-ID') : 'Tidak ditentukan'}
                        </span>
                        <span>Maks Nilai: {t.maks_nilai}</span>
                        {!isMahasiswa && <span>Terkumpul: {t.pengumpulan?.length || 0} Mahasiswa</span>}
                      </div>
                    </div>

                    {!isMahasiswa && (canExportNilai || canTeach) && (
                      <DropdownMenu
                        items={[
                          ...(canExportNilai
                            ? [
                                {
                                  label: 'Export Pengumpulan',
                                  icon: <Download size={16} />,
                                  onClick: () => setExportTugasId(t.id),
                                },
                              ]
                            : []),
                          ...(canTeach
                            ? [
                                {
                                  label: 'Hapus Tugas',
                                  icon: <Trash2 size={16} />,
                                  variant: 'danger' as const,
                                  onClick: () => setDeleteConfirm({ isOpen: true, type: 'tugas', id: t.id, name: t.judul }),
                                },
                              ]
                            : []),
                        ]}
                      />
                    )}
                  </div>

                  {isMahasiswa ? (
                    /* Sisi Mahasiswa: Status Pengumpulan Saya & Tombol Kumpul */
                    <div className="flex flex-col gap-2">
                      <hr className="border-t border-slate-100 my-4" />
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <h6 className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
                          Status Pengumpulan Tugas Anda
                        </h6>
                        <Button
                          size="sm"
                          icon={<UploadCloud size={16} />}
                          disabled={sudahDinilai}
                          onClick={() => {
                            setSelectedTugasForKumpul(t);
                            kumpulFormHook.setValue('catatan_mahasiswa', mySubmisi?.catatan_mahasiswa || '');
                            setShowKumpulModal(true);
                          }}
                        >
                          {mySubmisi ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}
                        </Button>
                        {sudahDinilai && (
                          <p className="text-2xs text-slate-500 w-full">
                            Pengumpulan sudah dinilai sehingga tidak dapat diubah atau ditarik kembali.
                          </p>
                        )}
                      </div>

                      {mySubmisi ? (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={mySubmisi.is_late ? 'yellow' : 'green'}>
                                {mySubmisi.is_late ? 'Terkumpul (Terlambat)' : 'Terkumpul Tepat Waktu'}
                              </Badge>
                              {mySubmisi.nilai !== null && mySubmisi.nilai !== undefined && (
                                <Badge variant="green">
                                  Nilai OBE: {mySubmisi.nilai} / {t.maks_nilai}
                                </Badge>
                              )}
                            </div>

                            {(mySubmisi.file_path || !sudahDinilai) && (
                              <DropdownMenu
                                items={[
                                  ...(mySubmisi.file_path
                                    ? [
                                        {
                                          label: 'Unduh Berkas Saya',
                                          icon: <Download size={16} />,
                                          onClick: () => {
                                            window.open(mySubmisi.file_path || '#', '_blank');
                                          },
                                        },
                                      ]
                                    : []),
                                  ...(!sudahDinilai
                                    ? [
                                        {
                                          label: 'Tarik Kembali Pengumpulan',
                                          icon: <Undo2 size={16} />,
                                          onClick: () =>
                                            setTarikKembaliConfirm({
                                              isOpen: true,
                                              tugasId: t.id,
                                              judul: t.judul,
                                            }),
                                        },
                                      ]
                                    : []),
                                ]}
                              />
                            )}
                          </div>

                          {mySubmisi.catatan_mahasiswa && (
                            <p className="text-2xs text-slate-600">
                              <strong>Catatan Pengumpulan:</strong> {mySubmisi.catatan_mahasiswa}
                            </p>
                          )}

                          {mySubmisi.feedback_dosen && (
                            <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-2xs text-emerald-900">
                              <strong>Feedback Dosen:</strong> {mySubmisi.feedback_dosen}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          Anda belum mengumpulkan tugas ini. Silakan klik tombol <strong>Kumpulkan Tugas</strong> di atas sebelum batas deadline.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Sisi Dosen: Submisi Seluruh Mahasiswa via Mandatory DataTable */
                    <div className="flex flex-col gap-2">
                      <hr className="border-t border-slate-100 my-4" />
                      <h6 className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
                        Pengumpulan Tugas Mahasiswa
                      </h6>

                      <DataTable
                        columns={getSubmisiColumns(t)}
                        data={t.pengumpulan || []}
                        meta={{
                          current_page: 1,
                          last_page: 1,
                          per_page: t.pengumpulan?.length || 50,
                          total: t.pengumpulan?.length || 0,
                        }}
                        onPageChange={() => {
                          fetchDetail();
                        }}
                        onLimitChange={() => {
                          fetchDetail();
                        }}
                        emptyMessage="Belum ada mahasiswa yang mengumpulkan tugas ini."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Kuis (dosen kelola, mahasiswa kerjakan) — dipakai juga pada tab Tugas & Kuis mahasiswa */}
      {(activeTab === 'kuis' || activeTab === 'tugas_kuis') && (
        <div className="space-y-4">
          <PertemuanQuizTab
            pertemuanId={pertemuanId}
            kelasId={kelasId}
            quizList={detail?.quiz_list || []}
            komponenObeList={detail?.komponen_obe_list || []}
            isMahasiswa={isMahasiswa}
            canTeach={canTeach}
            onRefresh={fetchDetail}
          />
        </div>
      )}

      {/* Tab Diskusi: scoped pertemuan ini — dosen & mahasiswa memakai komponen yang sama */}
      {activeTab === 'diskusi' && (
        <PertemuanDiskusi
          kelasId={kelasId}
          pertemuanId={pertemuanId}
          pertemuanKe={detail?.pertemuan.pertemuan_ke}
          canManage={canManageKelas}
        />
      )}

      {/* Modal Tambah Materi dengan Zod & react-hook-form */}
      <Modal
        open={showMateriModal}
        onClose={() => setShowMateriModal(false)}
        title="Tambah Materi Pembelajaran"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowMateriModal(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-tambah-materi"
              loading={materiFormHook.formState.isSubmitting}
              disabled={materiFormHook.formState.isSubmitting}
              icon={<Save size={16} />}
            >
              Simpan Materi
            </Button>
          </div>
        }
      >
        <form id="form-tambah-materi" onSubmit={materiFormHook.handleSubmit(onSaveMateri)} className="space-y-4">
          <Input
            label="Judul Materi"
            placeholder="Contoh: Modul 01 - Pengantar Cloud Architecture"
            error={materiFormHook.formState.errors.judul?.message}
            {...materiFormHook.register('judul')}
          />

          <Controller
            name="tipe_konten_id"
            control={materiFormHook.control}
            render={({ field }) => (
              <Select
                label="Tipe Konten Pembelajaran"
                options={tipeKontenOptions}
                value={field.value}
                onChange={(val) => field.onChange(Number(val))}
                error={materiFormHook.formState.errors.tipe_konten_id?.message}
              />
            )}
          />

          <Textarea
            label="Deskripsi / Catatan Materi"
            placeholder="Tuliskan petunjuk pembelajaran bagi mahasiswa..."
            error={materiFormHook.formState.errors.deskripsi?.message}
            {...materiFormHook.register('deskripsi')}
          />

          <Input
            label="Tautan Eksternal / Video Embed (Opsional)"
            placeholder="https://..."
            error={materiFormHook.formState.errors.link_eksternal?.message}
            {...materiFormHook.register('link_eksternal')}
          />

          <Input
            type="file"
            label="Berkas Dokumen / Slide / PDF (Opsional)"
            onChange={(e) => setMateriFile(e.target.files?.[0] || null)}
          />
        </form>
      </Modal>

      {/* Modal Buat Tugas dengan Zod & react-hook-form */}
      <Modal
        open={showTugasModal}
        onClose={() => setShowTugasModal(false)}
        title="Buat Tugas Perkuliahan Baru"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowTugasModal(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-buat-tugas"
              loading={tugasFormHook.formState.isSubmitting}
              disabled={tugasFormHook.formState.isSubmitting}
              icon={<Save size={16} />}
            >
              Terbitkan Tugas
            </Button>
          </div>
        }
      >
        <form id="form-buat-tugas" onSubmit={tugasFormHook.handleSubmit(onSaveTugas)} className="space-y-4">
          <Input
            label="Judul Penugasan"
            placeholder="Contoh: Tugas 1: Implementasi Relasi Database"
            error={tugasFormHook.formState.errors.judul?.message}
            {...tugasFormHook.register('judul')}
          />

          <Textarea
            label="Instruksi Tugas"
            placeholder="Jelaskan spesifikasi pengerjaan tugas..."
            error={tugasFormHook.formState.errors.deskripsi?.message}
            {...tugasFormHook.register('deskripsi')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Tenggat Waktu (Deadline)"
              error={tugasFormHook.formState.errors.deadline_at?.message}
              {...tugasFormHook.register('deadline_at')}
            />

            <Input
              type="number"
              label="Nilai Maksimal"
              error={tugasFormHook.formState.errors.maks_nilai?.message}
              {...tugasFormHook.register('maks_nilai')}
            />
          </div>

          <Controller
            name="komponen_penilaian_id"
            control={tugasFormHook.control}
            render={({ field }) => (
              <AsyncSelect
                label="Hubungkan ke Komponen Penilaian OBE (Auto-Sync)"
                placeholder="Cari komponen penilaian OBE..."
                value={field.value}
                onChange={(val) => field.onChange(val ? String(val) : '')}
                loadOptions={async (input) => {
                  try {
                    const res = await lmsService.getPertemuanDetail(pertemuanId);
                    const list = (res.data?.komponen_obe_list || []).map((k) => ({
                      value: String(k.id),
                      label: `${k.nama_komponen} (Bobot ${k.bobot}%)`,
                    }));
                    if (!input) return list;
                    return list.filter((item) =>
                      item.label.toLowerCase().includes(input.toLowerCase())
                    );
                  } catch {
                    return [];
                  }
                }}
                isClearable
                error={tugasFormHook.formState.errors.komponen_penilaian_id?.message}
              />
            )}
          />
        </form>
      </Modal>

      {/* Modal Beri Nilai Tugas (OBE Sync) dengan Zod & react-hook-form */}
      <Modal
        open={Boolean(selectedPengumpulan)}
        onClose={() => setSelectedPengumpulan(null)}
        title={`Penilaian Tugas: ${selectedPengumpulan?.mahasiswa?.nama_lengkap}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setSelectedPengumpulan(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-nilai-tugas"
              loading={nilaiFormHook.formState.isSubmitting}
              disabled={nilaiFormHook.formState.isSubmitting}
              icon={<Save size={16} />}
            >
              Simpan & Sync ke OBE
            </Button>
          </div>
        }
      >
        <form id="form-nilai-tugas" onSubmit={nilaiFormHook.handleSubmit(onSaveNilai)} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg text-xs flex flex-col gap-2">
            <div>
              <span className="text-slate-500">Mahasiswa:</span>{' '}
              <strong className="text-slate-900">{selectedPengumpulan?.mahasiswa?.nama_lengkap}</strong> (
              {selectedPengumpulan?.mahasiswa?.nim})
            </div>
            {selectedPengumpulan?.catatan_mahasiswa && (
              <div>
                <span className="text-slate-500">Catatan Mahasiswa:</span>{' '}
                <span className="text-slate-800">{selectedPengumpulan.catatan_mahasiswa}</span>
              </div>
            )}
          </div>

          <Input
            type="number"
            label="Nilai Tugas (0 - 100)"
            error={nilaiFormHook.formState.errors.nilai?.message}
            {...nilaiFormHook.register('nilai')}
          />

          <Textarea
            label="Feedback / Catatan Evaluasi Dosen"
            placeholder="Berikan saran konstruktif untuk mahasiswa..."
            error={nilaiFormHook.formState.errors.feedback_dosen?.message}
            {...nilaiFormHook.register('feedback_dosen')}
          />
        </form>
      </Modal>

      {/* Modal Isi Jurnal & Buka Sesi Presensi Dosen (Rotasi QR 30 Detik) */}
      <Modal
        open={showBukaSesiModal}
        onClose={() => setShowBukaSesiModal(false)}
        title={`Isi Jurnal Mengajar & Buka Sesi Presensi — Pertemuan Ke-${detail?.pertemuan.pertemuan_ke || ''}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowBukaSesiModal(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-buka-sesi-jurnal"
              loading={isGeneratingToken}
              disabled={isGeneratingToken}
              icon={<QrCode size={16} />}
            >
              Simpan Jurnal & Buka QR Presensi (30d)
            </Button>
          </div>
        }
      >
        <form
          id="form-buka-sesi-jurnal"
          onSubmit={isianFormHook.handleSubmit(onBukaSesiDenganJurnal)}
          className="space-y-4"
        >
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-2xs text-blue-800">
            Saat Anda menyimpan jurnal ini, sesi presensi mahasiswa otomatis dibuka dengan <strong>QR Code & Token 6-Digit yang berputar otomatis setiap 30 detik</strong> untuk mencegah kecurangan titip absen.
          </div>

          <Input
            label="Judul / Materi Pertemuan (Jurnal Perkuliahan)"
            required
            placeholder="Contoh: Arsitektur Microservices & API Gateway"
            error={isianFormHook.formState.errors.materi?.message}
            {...isianFormHook.register('materi')}
          />

          <Textarea
            label="Catatan Jurnal / Pokok Bahasan"
            placeholder="Tuliskan ringkasan pokok bahasan dan aktivitas belajar pada pertemuan ini..."
            error={isianFormHook.formState.errors.catatan_pertemuan?.message}
            {...isianFormHook.register('catatan_pertemuan')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Tanggal Pertemuan"
              error={isianFormHook.formState.errors.tanggal?.message}
              {...isianFormHook.register('tanggal')}
            />
            <Input
              type="time"
              label="Jam Mulai"
              error={isianFormHook.formState.errors.jam_mulai?.message}
              {...isianFormHook.register('jam_mulai')}
            />
            <Input
              type="time"
              label="Jam Selesai"
              error={isianFormHook.formState.errors.jam_selesai?.message}
              {...isianFormHook.register('jam_selesai')}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Scan QR / Input Token Absensi Mahasiswa */}
      <Modal
        open={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        title="Presensi Mandiri Mahasiswa (Scanner QR / Token 30 Detik)"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowTokenModal(false)}>
              Batal
            </Button>
            {presensiInputMode === 'scanner' ? (
              <Button
                type="button"
                loading={isScanningQr}
                disabled={isScanningQr || !qrScanInput.trim()}
                icon={<Check size={16} />}
                onClick={() => submitQrPayload(qrScanInput)}
              >
                Proses Hasil Scan QR
              </Button>
            ) : (
              <Button
                type="submit"
                form="form-input-token"
                loading={tokenFormHook.formState.isSubmitting}
                disabled={tokenFormHook.formState.isSubmitting}
                icon={<Check size={16} />}
              >
                Kirim Token
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <Button
              type="button"
              size="sm"
              variant={presensiInputMode === 'scanner' ? 'primary' : 'ghost'}
              onClick={() => setPresensiInputMode('scanner')}
            >
              Scan QR / Scanner
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presensiInputMode === 'token' ? 'primary' : 'ghost'}
              onClick={() => setPresensiInputMode('token')}
            >
              Input Token 6-Digit
            </Button>
          </div>

          {presensiInputMode === 'scanner' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Arahkan kamera ke QR Code di layar dosen atau tempel/scan kode QR (<code>RAG-PRESENSI:{pertemuanId}:XXXXXX</code>) yang berubah tiap 30 detik.
              </p>

              <LmsQrScanner
                buttonText="Buka Kamera QR Scanner"
                onScan={async (payload) => {
                  qrScanFormHook.setValue('payload', payload);
                  await submitQrPayload(payload);
                }}
              />

              <form
                id="form-scan-qr"
                onSubmit={qrScanFormHook.handleSubmit(async (vals) => {
                  await submitQrPayload(vals.payload);
                })}
                className="space-y-3 pt-1"
              >
                <Input
                  label="Kode QR / Payload Scanner"
                  placeholder={`Contoh: RAG-PRESENSI:${pertemuanId}:849201 atau 849201`}
                  error={qrScanFormHook.formState.errors.payload?.message}
                  {...qrScanFormHook.register('payload')}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  icon={<Send size={16} />}
                  loading={isScanningQr}
                  disabled={isScanningQr}
                >
                  Kirim Presensi
                </Button>
              </form>
            </div>
          ) : (
            <form id="form-input-token" onSubmit={tokenFormHook.handleSubmit(onInputToken)} className="space-y-4">
              <p className="text-xs text-slate-600">
                Masukkan 6-digit kode token presensi yang tampil di layar dosen (kode diperbarui tiap 30 detik).
              </p>

              <Input
                label="6-Digit Token Presensi"
                placeholder="Contoh: 849201"
                className="text-center font-mono text-base tracking-widest uppercase"
                maxLength={6}
                error={tokenFormHook.formState.errors.token?.message}
                {...tokenFormHook.register('token')}
              />
            </form>
          )}
        </div>
      </Modal>

      {/* Modal Kumpulkan / Perbarui Tugas Mahasiswa */}
      <Modal
        open={showKumpulModal}
        onClose={() => setShowKumpulModal(false)}
        title={`${selectedTugasForKumpul && detail?.my_pengumpulan?.[selectedTugasForKumpul.id] ? 'Perbarui Pengumpulan' : 'Kumpulkan Tugas'}: ${selectedTugasForKumpul?.judul || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowKumpulModal(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-kumpul-tugas"
              loading={kumpulFormHook.formState.isSubmitting}
              disabled={kumpulFormHook.formState.isSubmitting}
              icon={<UploadCloud size={16} />}
            >
              {selectedTugasForKumpul && detail?.my_pengumpulan?.[selectedTugasForKumpul.id]
                ? 'Simpan Perubahan'
                : 'Simpan & Kumpulkan'}
            </Button>
          </div>
        }
      >
        <form id="form-kumpul-tugas" onSubmit={kumpulFormHook.handleSubmit(onKumpulTugas)} className="space-y-4">
          <Textarea
            label="Catatan Pengumpulan / Komentar (Opsional)"
            placeholder="Tuliskan catatan atau link alternatif pengerjaan tugas..."
            error={kumpulFormHook.formState.errors.catatan_mahasiswa?.message}
            {...kumpulFormHook.register('catatan_mahasiswa')}
          />

          <Input
            type="file"
            label="Berkas Dokumen / Hasil Tugas (PDF, ZIP, DOCX, dll.)"
            onChange={(e) => setBerkasTugasFile(e.target.files?.[0] || null)}
          />
        </form>
      </Modal>

      {/* Modal Ajukan Izin / Sakit Mahasiswa */}
      <Modal
        open={showIzinModal}
        onClose={() => setShowIzinModal(false)}
        title="Formulir Permohonan Izin / Sakit"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" icon={<X size={16} />} onClick={() => setShowIzinModal(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              form="form-ajukan-izin"
              loading={izinFormHook.formState.isSubmitting}
              disabled={izinFormHook.formState.isSubmitting}
              icon={<Send size={16} />}
            >
              Kirim Permohonan
            </Button>
          </div>
        }
      >
        <form id="form-ajukan-izin" onSubmit={izinFormHook.handleSubmit(onAjukanIzin)} className="space-y-4">
          <Controller
            name="tipe_izin_id"
            control={izinFormHook.control}
            render={({ field }) => (
              <Select
                label="Jenis Permohonan Izin"
                options={tipeIzinOptions}
                value={field.value}
                onChange={(val) => field.onChange(Number(val))}
                error={izinFormHook.formState.errors.tipe_izin_id?.message}
              />
            )}
          />

          <Textarea
            label="Alasan Permohonan Izin / Sakit"
            placeholder="Jelaskan alasan ketidakhadiran Anda secara jelas..."
            error={izinFormHook.formState.errors.alasan?.message}
            {...izinFormHook.register('alasan')}
          />

          <Input
            type="file"
            label="Lampiran Surat Dokter / Keterangan (PDF / Gambar)"
            onChange={(e) => setSuratIzinFile(e.target.files?.[0] || null)}
          />
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title={`Hapus ${deleteConfirm.type === 'materi' ? 'Materi' : 'Tugas'}`}
        message={
          <span>
            Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.name}</strong>? Tindakan ini akan menghapus berkas lampiran terkait.
          </span>
        }
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      {/* Modal Konfirmasi Tarik Kembali Pengumpulan */}
      <ConfirmDialog
        isOpen={tarikKembaliConfirm.isOpen}
        onClose={() => setTarikKembaliConfirm({ isOpen: false, tugasId: null, judul: '' })}
        onConfirm={handleTarikKembali}
        isLoading={isMenarikKembali}
        title="Tarik Kembali Pengumpulan"
        message={
          <span>
            Apakah Anda yakin ingin menarik kembali pengumpulan tugas{' '}
            <strong>{tarikKembaliConfirm.judul}</strong>? Berkas yang sudah diunggah akan
            dihapus dan Anda perlu mengunggah ulang bila ingin mengumpulkan kembali.
          </span>
        }
        confirmText="Tarik Kembali"
        cancelText="Batal"
        variant="danger"
      />

      {/* Modal Konfirmasi Tutup Sesi Presensi */}
      <ConfirmDialog
        isOpen={tutupConfirm}
        onClose={() => setTutupConfirm(false)}
        onConfirm={async () => {
          setTutupConfirm(false);
          await handleTutupPresensi();
        }}
        isLoading={isGeneratingToken}
        title="Tutup Sesi Presensi"
        message={
          <span>
            Setelah ditutup, mahasiswa tidak bisa lagi input token untuk pertemuan ini. Input manual dosen tetap bisa dilakukan. Lanjutkan?
          </span>
        }
        confirmText="Tutup Sesi"
        cancelText="Batal"
        variant="danger"
      />

      {/* Modal Export Pengumpulan Tugas (dosen) */}
      <ExportLaporanModal
        open={exportTugasId !== null}
        onClose={() => setExportTugasId(null)}
        scope={{ tugasId: exportTugasId ?? undefined }}
        jenis={['pengumpulan']}
      />
    </div>
  );
}
