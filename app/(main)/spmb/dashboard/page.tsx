'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ArrowRight,
  GraduationCap,
  UploadCloud,
  FileCheck,
  Award,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  LayoutGrid,
  Info,
  CreditCard,
  Users,
  Activity,
  CheckCircle,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUiStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { spmbService, PendaftaranCalonMhs, GelombangPenerimaan } from '@/services/spmb.service';
import { moduleService } from '@/services/module.service';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';

const formatPeriodeTanggal = (value?: string | null) => {
  const match = value?.match(/^(\d{2})-(\d{2})$/);
  return match ? `${match[2]}/${match[1]}` : value ? formatDate(value) : '-';
};

export default function SPMBDashboardPage() {
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const [pendaftaran, setPendaftaran] = useState<PendaftaranCalonMhs | null>(null);
  const [gelombangList, setGelombangList] = useState<GelombangPenerimaan[]>([]);
  const [prodiList, setProdiList] = useState<any[]>([]);
  const [adminPendaftarList, setAdminPendaftarList] = useState<PendaftaranCalonMhs[]>([]);
  const [berkasRequirements, setBerkasRequirements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingSk, setDownloadingSk] = useState(false);
  const { module_color: moduleColor, fetchModuleColor } = useUiStore();

  const handleDownloadSk = async () => {
    if (!pendaftaran?.id) return;
    try {
      setDownloadingSk(true);
      await spmbService.downloadSkLulusPdf(pendaftaran.id, pendaftaran.no_pendaftaran);
      toast.success('SK Tanda Lulus berhasil diunduh.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Gagal mengunduh SK Tanda Lulus.');
    } finally {
      setDownloadingSk(false);
    }
  };

  const userRoleSlugs = (user?.roles || []).map((r: any) =>
    (typeof r === 'string' ? r : r.slug || r.name || '').toLowerCase()
  );

  const isPanitiaAdmin =
    isSuperAdmin ||
    isAdmin ||
    userRoleSlugs.some((slug) =>
      ['admin', 'superadmin', 'super-admin', 'admin_spmb', 'panitia_spmb', 'operator_spmb', 'admin_iam'].includes(slug)
    );

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pendaftaranRes, gelombangRes, prodiRes, adminPendaftarRes, berkasRes] = await Promise.all([
        spmbService.getMyPendaftaran().catch(() => null),
        spmbService.getGelombang().catch(() => null),
        spmbService.getProgramStudi().catch(() => null),
        isPanitiaAdmin ? spmbService.getPendaftaran({ per_page: 20 }).catch(() => null) : Promise.resolve(null),
        spmbService.getBerkasRequirements({ limit: 100 }).catch(() => null),
      ]);

      const currentModuleCode = window.location.pathname.split('/')[1] || '';
      await fetchModuleColor(currentModuleCode);

      if (pendaftaranRes?.data?.pendaftaran) {
        setPendaftaran(pendaftaranRes.data.pendaftaran);
      } else if (pendaftaranRes?.data && !pendaftaranRes.data.pendaftaran && pendaftaranRes.data.id) {
        setPendaftaran(pendaftaranRes.data);
      }

      if (gelombangRes?.data) {
        const list = Array.isArray(gelombangRes.data)
          ? gelombangRes.data
          : gelombangRes.data.data || [];
        setGelombangList(list);
      }

      if (prodiRes?.data) {
        const pList = Array.isArray(prodiRes.data)
          ? prodiRes.data
          : prodiRes.data.data || [];
        setProdiList(pList);
      }

      if (adminPendaftarRes?.data) {
        const pList = Array.isArray(adminPendaftarRes.data)
          ? adminPendaftarRes.data
          : adminPendaftarRes.data.data || [];
        setAdminPendaftarList(pList);
      }

      if (berkasRes?.data) {
        const bList = Array.isArray(berkasRes.data)
          ? berkasRes.data
          : berkasRes.data.data || [];
        setBerkasRequirements(bList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const displayUser = user || {
    username: 'Calon Mahasiswa',
    email: 'calon@kampus.ac.id',
  };

  // ── Determine Status & Progress State ─────────────────────────────
  const status = pendaftaran?.status || 'none';

  let statusConfig = {
    badgeText: 'Belum Mendaftar',
    badgeClass: 'badge-gray',
    title: 'Pendaftaran Belum Dimulai',
    desc: 'Anda belum memiliki pendaftaran aktif. Silakan pilih gelombang pendaftaran yang tersedia untuk mulai mendaftar.',
    progressPct: 0,
    completedSteps: 0,
    ctaText: 'Mulai Pendaftaran Sekarang',
    ctaLink: '/spmb/registrasi',
    variant: 'neutral',
  };

  if (status === 'draft') {
    statusConfig = {
      badgeText: 'Draft / Belum Lengkap',
      badgeClass: 'badge-yellow',
      title: 'Pendaftaran Belum Di-Finalisasi',
      desc: 'Biodata Anda telah tersimpan sebagai draft. Silakan lengkapi berkas dan lakukan finalisasi pendaftaran.',
      progressPct: 40,
      completedSteps: 2,
      ctaText: 'Lengkapi & Finalisasi Pendaftaran',
      ctaLink: '/spmb/registrasi',
      variant: 'warning',
    };
  } else if (status === 'submitted') {
    statusConfig = {
      badgeText: 'Menunggu Verifikasi',
      badgeClass: 'badge-cyan',
      title: 'Berkas Sedang Diverifikasi Panitia',
      desc: 'Pendaftaran Anda telah dikirim dan sedang diperiksa oleh panitia SPMB. Harap periksa status secara berkala.',
      progressPct: 66,
      completedSteps: 3,
      ctaText: 'Lihat Detail Pendaftaran',
      ctaLink: '/spmb/pendaftaran',
      variant: 'info',
    };
  } else if (status === 'verified' || status === 'lulus_administrasi') {
    statusConfig = {
      badgeText: 'Lulus Administrasi',
      badgeClass: 'badge-green',
      title: 'Selamat! Berkas Terverifikasi',
      desc: 'Persyaratan administrasi Anda telah memenuhi syarat. Pengumuman hasil seleksi akan diinformasikan lebih lanjut.',
      progressPct: 67,
      completedSteps: 4,
      ctaText: 'Cek Pengumuman',
      ctaLink: '/spmb/dashboard',
      variant: 'success',
    };

  } else if (status === 'gagal_administrasi') {
    statusConfig = {
      badgeText: 'Berkas Perlu Perbaikan',
      badgeClass: 'badge-red',
      title: 'Verifikasi Berkas Memerlukan Perbaikan',
      desc: 'Beberapa dokumen pendaftaran Anda tidak sesuai dengan ketentuan. Silakan unggah ulang dokumen yang diminta.',
      progressPct: 50,
      completedSteps: 2,
      ctaText: 'Perbaiki Berkas Pendaftaran',
      ctaLink: '/spmb/registrasi',
      variant: 'danger',
    };
  }

  // Active wave info
  const activeGelombang = pendaftaran?.gelombang_penerimaan || gelombangList.find(g => g.pendaftaran_dibuka) || gelombangList[0];

  // Document uploaded count
  const uploadedDocs = pendaftaran?.dokumen_pendaftaran || [];
  const verifiedDocsCount = uploadedDocs.filter(d => d.is_verified).length;

  const isPembayaranLunas = pendaftaran?.status_pembayaran === 'lunas' || pendaftaran?.status_pembayaran === 'gratis';
  const isBiodataFilled = !!pendaftaran?.nama_lengkap;
  const isDokumenUploaded = uploadedDocs.length > 0;
  const isSubmitted = status === 'submitted' || status === 'verified' || status === 'lulus_administrasi' || status === 'diterima';
  const isVerifiedAdmin = status === 'verified' || status === 'lulus_administrasi' || status === 'diterima';
  const isPengumumanDone = status === 'lulus_administrasi' || status === 'diterima' || status === 'tidak_lulus' || status === 'ditolak';

  // Workflow steps definition (Tahap Utama Calon Mahasiswa)
  const steps = [
    { label: 'Biodata', key: 'biodata', done: isBiodataFilled },
    { label: 'Pembayaran', key: 'pembayaran', done: isPembayaranLunas },
    { label: 'Unggah Berkas', key: 'berkas', done: isDokumenUploaded || isSubmitted },
    { label: 'Finalisasi & Verifikasi', key: 'finalize', done: isVerifiedAdmin },
    { label: 'Pengumuman', key: 'pengumuman', done: isPengumumanDone },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const currentStepIdx = steps.findIndex(s => !s.done);
  const activeStepIdx = currentStepIdx === -1 ? 5 : currentStepIdx;

  if (status === 'draft') {
    if (!isPembayaranLunas) {
      statusConfig = {
        badgeText: 'Belum Bayar Formulir',
        badgeClass: 'badge-yellow',
        title: 'Silakan Lakukan Pembayaran Biaya Pendaftaran',
        desc: 'Biodata Anda telah tersimpan. Silakan lakukan pembayaran biaya pendaftaran via Virtual Account agar dapat mengunggah berkas & memfinalisasi pendaftaran.',
        progressPct: 20,
        completedSteps: completedCount,
        ctaText: 'Bayar Biaya Pendaftaran / Lihat VA',
        ctaLink: '/spmb/registrasi',
        variant: 'warning',
      };
    } else {
      statusConfig = {
        badgeText: 'Pembayaran Lunas (Draft)',
        badgeClass: 'badge-cyan',
        title: 'Pembayaran Lunas — Unggah Berkas & Finalisasi',
        desc: 'Pembayaran biaya pendaftaran Anda telah dikonfirmasi lunas. Silakan unggah dokumen persyaratan dan selesaikan finalisasi pendaftaran.',
        progressPct: 40,
        completedSteps: completedCount,
        ctaText: 'Unggah Berkas & Finalisasi',
        ctaLink: '/spmb/registrasi',
        variant: 'info',
      };
    }
  }

  const mixLight = (base: string, pct: number) => `color-mix(in srgb, ${base} ${pct}%, white)`;
  const mixDark = (base: string, pct: number) => `color-mix(in srgb, ${base} ${pct}%, black)`;

  const dynamicStyles = moduleColor
    ? ({
        '--primary-50': mixLight(moduleColor, 10),
        '--primary-100': mixLight(moduleColor, 20),
        '--primary-200': mixLight(moduleColor, 40),
        '--primary-300': mixLight(moduleColor, 60),
        '--primary-400': mixLight(moduleColor, 80),
        '--primary-500': moduleColor,
        '--primary-600': mixDark(moduleColor, 80),
        '--primary-700': mixDark(moduleColor, 60),
        '--primary-800': mixDark(moduleColor, 40),
        '--primary-900': mixDark(moduleColor, 20),
        
        '--color-primary-50': mixLight(moduleColor, 10),
        '--color-primary-100': mixLight(moduleColor, 20),
        '--color-primary-200': mixLight(moduleColor, 40),
        '--color-primary-300': mixLight(moduleColor, 60),
        '--color-primary-400': mixLight(moduleColor, 80),
        '--color-primary-500': moduleColor,
        '--color-primary-600': mixDark(moduleColor, 80),
        '--color-primary-700': mixDark(moduleColor, 60),
        '--color-primary-800': mixDark(moduleColor, 40),
        '--color-primary-900': mixDark(moduleColor, 20),
      } as React.CSSProperties)
    : {};

  if (isPanitiaAdmin) {
    return (
      <div className="spmb-app-page animate-fade-in" style={dynamicStyles}>
        <SPMBAdminDashboardView
          adminPendaftarList={adminPendaftarList}
          gelombangList={gelombangList}
          prodiList={prodiList}
          isLoading={isLoading}
        />
      </div>
    );
  }

  return (
    <div className="spmb-app-page animate-fade-in" style={dynamicStyles}>
      {/* ── Page Header ────────────────────────────────────────────── */}
      <PageHeader
        title="Portal Pendaftaran SPMB"
        description="Pantau status pendaftaran, progress kelengkapan berkas, dan tahapan penerimaan Anda"
      />

      {/* ── Welcome & Status Hero Card ─────────────────────────────── */}
      <div className={`spmb-hero-card spmb-hero-${statusConfig.variant}`}>
        <div className="spmb-hero-blob spmb-hero-blob-1" aria-hidden />
        <div className="spmb-hero-blob spmb-hero-blob-2" aria-hidden />

        <div className="spmb-hero-content">
          <div className="spmb-hero-main">
            <div className="spmb-hero-badge-row">
              <span className={`badge ${statusConfig.badgeClass} spmb-status-pill`}>
                <span className="spmb-pill-dot" />
                {statusConfig.badgeText}
              </span>
              {pendaftaran?.no_pendaftaran && (
                <span className="spmb-nopend-badge">
                  No. Reg: {pendaftaran.no_pendaftaran}
                </span>
              )}
            </div>

            <h2 className="spmb-hero-title">
              Halo, {pendaftaran?.nama_lengkap || displayUser.username}! 👋
            </h2>
            <p className="spmb-hero-desc">{statusConfig.desc}</p>

            {/* Progress Bar inside Hero */}
            <div className="spmb-hero-progress-box">
              <div className="spmb-hero-progress-header">
                <span>Progress Pendaftaran</span>
                <span className="font-bold">{statusConfig.progressPct}%</span>
              </div>
              <div className="spmb-hero-progress-track">
                <div
                  className="spmb-hero-progress-bar"
                  style={{ width: `${statusConfig.progressPct}%` }}
                />
              </div>
            </div>

            {/* Hero CTA Button */}
            <div className="spmb-hero-cta-wrap">
              <Link href={statusConfig.ctaLink} className="spmb-hero-btn-primary">
                <span>{statusConfig.ctaText}</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── SK Tanda Lulus Announcement Card (Saat Lulus) ── */}
      {(status === 'lulus_administrasi' || status === 'mahasiswa_baru' || (pendaftaran as any)?.hasil_seleksi?.status === 'lulus') && (
        <div 
          className="card p-5 sm:p-6 border-2 rounded-2xl shadow-xs space-y-4"
          style={{ borderColor: 'var(--module-primary)', backgroundColor: 'var(--module-primary-subtle, #f0fdf4)' }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div 
                className="p-3 text-white rounded-xl shadow-xs shrink-0 mt-0.5"
                style={{ backgroundColor: 'var(--module-primary)' }}
              >
                <Award size={24} />
              </div>
              <div>
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black mb-1.5"
                  style={{ backgroundColor: 'var(--module-primary-subtle, #e0f2fe)', color: 'var(--module-primary)' }}
                >
                  <CheckCircle size={13} />
                  PENGUMUMAN RESMI KELULUSAN
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  Selamat! Anda Dinyatakan LULUS Seleksi SPMB
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Anda resmi diterima pada Program Studi{' '}
                  <strong style={{ color: 'var(--module-primary)' }}>
                    {(pendaftaran as any)?.hasil_seleksi?.program_studi_diterima?.nama ||
                      (pendaftaran as any)?.program_studi?.nama ||
                      (pendaftaran as any)?.program_studi?.nama_prodi ||
                      prodiList.find((p) => String(p.id) === String(pendaftaran?.program_studi_id))?.nama ||
                      'Program Studi Terpilih'}
                  </strong>
                  . Anda dapat langsung mengunduh SK Tanda Lulus resmi secara mandiri di bawah ini.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Button
                variant="primary"
                onClick={handleDownloadSk}
                isLoading={downloadingSk}
                icon={<Download size={16} />}
                style={{ backgroundColor: 'var(--module-primary)' }}
                className="font-black text-white shadow-xs"
              >
                {downloadingSk ? 'Mengunduh SK...' : 'Unduh SK Tanda Lulus (PDF)'}
              </Button>
              <Link href="/spmb/daftar-ulang">
                <Button
                  variant="secondary"
                  icon={<ArrowRight size={15} />}
                  className="font-bold"
                >
                  Lanjut Daftar Ulang
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Personal Applicant KPI Summary Cards ─────────────────────── */}
      <div className="spmb-kpi-grid">
        <div className="spmb-kpi-card card">
          <div className="spmb-kpi-top">
            <span className="spmb-kpi-label">Status Pendaftaran</span>
            <div className="spmb-kpi-icon stat-icon-blue">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="spmb-kpi-value">{statusConfig.badgeText}</div>
          <div className="spmb-kpi-sub">
            {pendaftaran ? `ID Pendaftaran: #${pendaftaran.id}` : 'Belum membuat draf'}
          </div>
        </div>

        <div className="spmb-kpi-card card">
          <div className="spmb-kpi-top">
            <span className="spmb-kpi-label">Kelengkapan Berkas</span>
            <div className="spmb-kpi-icon stat-icon-green">
              <FileCheck size={18} />
            </div>
          </div>
          <div className="spmb-kpi-value">
            {uploadedDocs.length} Dokumen
          </div>
          <div className="spmb-kpi-sub">
            {verifiedDocsCount} dokumen terverifikasi
          </div>
        </div>

        <div className="spmb-kpi-card card">
          <div className="spmb-kpi-top">
            <span className="spmb-kpi-label">Gelombang Penerimaan</span>
            <div className="spmb-kpi-icon stat-icon-amber">
              <Calendar size={18} />
            </div>
          </div>
          <div className="spmb-kpi-value">
            {activeGelombang?.nama || 'Gelombang 1'}
          </div>
          <div className="spmb-kpi-sub">
            {activeGelombang?.pendaftaran_dibuka ? 'Sedang Dibuka' : 'Status: Off'}
          </div>
        </div>

        <div className="spmb-kpi-card card">
          <div className="spmb-kpi-top">
            <span className="spmb-kpi-label">Program Studi Pilihan</span>
            <div className="spmb-kpi-icon stat-icon-indigo">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="spmb-kpi-value text-sm sm:text-base font-bold text-slate-900 truncate" title={
            (pendaftaran as any)?.program_studi?.nama ||
            (pendaftaran as any)?.program_studi?.nama_prodi ||
            prodiList.find((p) => String(p.id) === String(pendaftaran?.program_studi_id))?.nama ||
            ''
          }>
            {
              (pendaftaran as any)?.program_studi?.nama ||
              (pendaftaran as any)?.program_studi?.nama_prodi ||
              prodiList.find((p) => String(p.id) === String(pendaftaran?.program_studi_id))?.nama ||
              (pendaftaran?.program_studi_id ? `Prodi #${pendaftaran.program_studi_id}` : 'Belum Dipilih')
            }
          </div>
          <div className="spmb-kpi-sub">Pilihan Utama</div>
        </div>
      </div>

      {/* ── Stepper / Progress Flow Section ───────────────────────────── */}
      <div className="card spmb-stepper-card">
        <div className="card-header border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Alur &amp; Tahapan Pendaftaran</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {completedCount} dari 6 Tahap Selesai
          </span>
        </div>

        <div className="card-body">
          <div className="spmb-stepper-track">
            {steps.map((step, idx) => {
              const isCurrent = idx === activeStepIdx;
              return (
                <div
                  key={step.key}
                  className={`spmb-stepper-item ${
                    step.done ? 'is-done' : isCurrent ? 'is-current' : 'is-pending'
                  }`}
                >
                  <div className="spmb-stepper-circle">
                    {step.done ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>
                  <span className="spmb-stepper-label">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Grid (Content & Sidebar) ────────────────────────────── */}
      <div className="spmb-main-grid">

        {/* ── Left / Main Content ────────────────────────────────────── */}
        <div className="spmb-main-col">

          {/* Action / Next Steps Detailed Banner */}
          <div className="card p-5 border-l-4 border-l-primary-600 bg-white">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl flex-shrink-0 mt-0.5">
                <Info size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-base mb-1">
                  Langkah Selanjutnya untuk Anda
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {status === 'none' && 'Segera buat akun pendaftaran dan isi data diri awal Anda untuk mendapatkan Nomor Registrasi Pendaftaran.'}
                  {status === 'draft' && 'Lengkapi form biodata diri, data orang tua/wali, serta pastikan Anda telah mengunggah dokumen persyaratan.'}
                  {status === 'submitted' && 'Tim administrasi sedang memeriksa kelengkapan berkas Anda. Pantau halaman ini secara berkala.'}
                  {status === 'gagal_administrasi' && 'Periksa catatan perbaikan berkas di bawah, perbaiki dokumen yang ditolak, lalu simpan ulang.'}
                </p>
                <Link href={statusConfig.ctaLink} className="inline-flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700">
                  <span>{statusConfig.ctaText}</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border border-slate-200">
            <div className="border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-none">
                    Alur & Progres Pendaftaran
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Lacak tahapan SPMB Anda</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-x-auto">
              {pendaftaran?.progress_alur && pendaftaran.progress_alur.length > 0 ? (
                <div className="spmb-stepper-card p-0 shadow-none border-0 bg-transparent">
                  <div className="spmb-stepper-track bg-slate-200 top-4"></div>
                  <div className="flex justify-between relative z-10 w-full min-w-[420px]">
                    {pendaftaran.progress_alur.map((alur: any, idx: number) => {
                      const isComplete = alur.status === 'completed';
                      const isCurrent = alur.status === 'in_progress';
                      const isPending = alur.status === 'pending';
                      const isFailed = alur.status === 'failed';
                      return (
                        <div key={alur.id} className={`spmb-stepper-item flex-1 text-center flex flex-col items-center min-w-[72px] ${isComplete ? 'is-done' : isCurrent ? 'is-current' : isPending ? 'is-pending' : ''}`}>
                          <div className={`spmb-stepper-circle z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 mb-2 bg-white ${isComplete ? 'border-emerald-500 text-emerald-500' : isCurrent ? 'border-indigo-500 text-indigo-500 ring-4 ring-indigo-50' : isFailed ? 'border-red-500 text-red-500' : 'border-slate-200 text-slate-300'}`}>
                            {isComplete ? <CheckCircle size={14} /> : isFailed ? <AlertCircle size={14} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                          </div>
                          <span className={`text-xs font-semibold px-2 ${isComplete ? 'text-emerald-700' : isCurrent ? 'text-indigo-700' : isFailed ? 'text-red-600' : 'text-slate-400'}`}>
                            {alur.master_alur?.nama_tahap ?? `Tahap ${idx + 1}`}
                          </span>
                          {isCurrent && <span className="text-[10px] text-indigo-500 mt-1">Sedang Berjalan</span>}
                          {isFailed && <span className="text-[10px] text-red-500 mt-1">Gagal</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm italic">
                  Belum ada alur progres tahapan. Silakan selesaikan pembayaran awal terlebih dahulu.
                </div>
              )}
            </div>
          </div>

          {/* Document Status Section */}
          <div className="card overflow-hidden">
            <div className="card-header border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary-600 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">Berkas Pendaftaran Saya</h3>
              </div>
              <Link href="/spmb/registrasi" className="text-xs font-semibold text-primary-600 hover:underline shrink-0">
                Kelola Berkas →
              </Link>
            </div>

            <div className="card-body p-0">
              <div className="divide-y divide-slate-100">
                {(() => {
                  // Ambil syarat berkas dari API master berkas-requirement
                  const masterList = berkasRequirements
                    .filter((b: any) => b.is_active !== false)
                    .sort((a: any, b: any) => (a.urutan || 0) - (b.urutan || 0))
                    .map((b: any) => ({
                      key: b.jenis_dokumen,
                      label: b.label,
                      required: b.wajib,
                    }));

                  if (masterList.length === 0) {
                    return (
                      <div className="p-6 text-center text-slate-400 text-sm">
                        Belum ada syarat berkas yang diatur. Silakan atur di menu Master Berkas.
                      </div>
                    );
                  }

                  return masterList.map((masterItem) => {
                    const uploaded = uploadedDocs.find(
                      (d) => (d.jenis_berkas || d.jenis_dokumen) === masterItem.key
                    );
                    const isUploaded = Boolean(uploaded);

                    return (
                      <div
                        key={masterItem.key}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 ${
                              uploaded?.is_verified
                                ? 'bg-emerald-50 text-emerald-600'
                                : isUploaded
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              {masterItem.label}
                              {masterItem.required && (
                                <span className="text-red-500 font-bold ml-1">*</span>
                              )}
                            </p>
                            {uploaded?.catatan ? (
                              <p className="text-2xs text-rose-500 mt-0.5">
                                Catatan: {uploaded.catatan}
                              </p>
                            ) : (
                              <p className="text-2xs text-slate-400 font-medium">
                                {isUploaded ? 'Dokumen tersimpan' : 'Belum diunggah'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {isUploaded ? (
                            uploaded?.is_verified ? (
                              <span className="badge badge-green text-xs">✓ Terverifikasi</span>
                            ) : (
                              <span className="badge badge-yellow text-xs">Dalam Pemeriksaan</span>
                            )
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="badge badge-gray text-xs text-slate-400">Belum Diunggah</span>
                              <Link
                                href="/spmb/registrasi"
                                className="text-2xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md border border-primary-200"
                              >
                                Unggah
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right / Sidebar Column ─────────────────────────────────── */}
        <div className="spmb-side-col">

          {/* Gelombang & Important Dates Card */}
          <div className="card overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-sky-400" />
                <span className="font-bold text-sm">Informasi Gelombang</span>
              </div>
              <span className="badge badge-cyan text-xs">
                {activeGelombang?.pendaftaran_dibuka ? 'Sedang Dibuka' : 'Tutup'}
              </span>
            </div>

            <div className="card-body space-y-4 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Nama Gelombang
                </span>
                <p className="font-bold text-slate-900 text-base">
                  {activeGelombang?.nama || 'Gelombang 1 Reguler'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block">Tanggal Buka</span>
                  <span className="font-semibold text-slate-700 text-xs">
                    {activeGelombang?.tanggal_buka ? formatPeriodeTanggal(activeGelombang.tanggal_buka) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Tanggal Tutup</span>
                  <span className="font-semibold text-slate-700 text-xs">
                    {activeGelombang?.tanggal_tutup ? formatPeriodeTanggal(activeGelombang.tanggal_tutup) : '-'}
                  </span>
                </div>
              </div>

              {(activeGelombang?.tanggal_pengumuman) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  {activeGelombang.tanggal_pengumuman && (
                    <div>
                      <span className="text-xs text-slate-400 block">Pengumuman</span>
                      <span className="font-semibold text-slate-700 text-xs">
                        {formatDate(activeGelombang.tanggal_pengumuman)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="card p-4">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Menu Cepat Pendaftar</h4>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/spmb/registrasi" className="p-3 bg-slate-50 hover:bg-primary-50 hover:border-primary-200 border border-slate-100 rounded-xl flex flex-col items-center text-center transition-all group">
                <FileText size={20} className="text-slate-600 group-hover:text-primary-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Form Biodata</span>
              </Link>

              <Link href="/spmb/registrasi" className="p-3 bg-slate-50 hover:bg-primary-50 hover:border-primary-200 border border-slate-100 rounded-xl flex flex-col items-center text-center transition-all group">
                <UploadCloud size={20} className="text-slate-600 group-hover:text-primary-600 mb-1.5" />
                <span className="text-xs font-semibold text-slate-800">Upload Berkas</span>
              </Link>
            </div>
          </div>

          {/* Integrated Portal Quick Jump */}
          <div className="card p-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">SSO Campus</span>
              <span className="text-xs text-slate-300">Kembali ke Dashboard SSO</span>
            </div>
            <Link href="/dashboard" className="btn btn-sm btn-outline text-white border-slate-700 hover:bg-slate-800">
              <ExternalLink size={14} />
              Portal SSO
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}

function SPMBAdminDashboardView({
  adminPendaftarList = [],
  gelombangList = [],
  prodiList = [],
  isLoading = false,
}: {
  adminPendaftarList: PendaftaranCalonMhs[];
  gelombangList: GelombangPenerimaan[];
  prodiList: any[];
  isLoading: boolean;
}) {
  const totalCount = adminPendaftarList.length;
  const lunasCount = adminPendaftarList.filter((p) => p.status_pembayaran === 'lunas').length;
  const verifiedCount = adminPendaftarList.filter(
    (p) => p.status === 'verified' || p.status === 'lulus_administrasi'
  ).length;
  const activeGelombang = gelombangList.find((g) => g.pendaftaran_dibuka) || gelombangList[0];
  const columns: ColumnDef<PendaftaranCalonMhs>[] = [
    {
      key: 'nama_lengkap',
      label: 'CALON MAHASISWA',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 font-bold flex items-center justify-center text-xs shrink-0">
            {p.nama_lengkap ? p.nama_lengkap.slice(0, 2).toUpperCase() : 'CM'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{p.nama_lengkap || 'Calon Mahasiswa'}</p>
            <p className="text-2xs font-mono text-slate-500">#{p.no_pendaftaran || p.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'program_studi',
      label: 'PROGRAM STUDI',
      render: (p) => {
        const prodiNama =
          p.program_studi?.nama ||
          prodiList.find((pr) => String(pr.id) === String(p.program_studi_id))?.nama ||
          'Belum Dipilih';
        return <span className="font-medium text-slate-800 text-xs line-clamp-1">{prodiNama}</span>;
      },
    },
    {
      key: 'status_pembayaran',
      label: 'STATUS BAYAR',
      render: (p) =>
        p.status_pembayaran === 'lunas' ? (
          <span className="badge badge-green text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Lunas
          </span>
        ) : (
          <span className="badge badge-yellow text-xs font-bold inline-flex items-center gap-1">
            <Clock size={12} /> Belum Bayar
          </span>
        ),
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (p) => (
        <Link
          href={`/spmb/pendaftaran/${p.id}`}
          className="btn btn-ghost btn-xs text-primary-600 hover:bg-primary-50 font-bold min-h-[36px] px-3 inline-flex items-center gap-1"
        >
          <span>Detail</span>
          <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* ── 1. Page Header Enterprise ─────────────────────────────── */}
      <PageHeader
        title="Dashboard Eksekutif SPMB"
        description="Portal pusat pemantauan pendaftaran mahasiswa baru, verifikasi formulir, dan penetapan hasil seleksi"
      />

      {/* ── 2. Executive Hero Banner (Dynamic Primary) ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 text-white p-6 sm:p-8 md:p-10 border border-primary-600 shadow-xl">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-primary-500/20 rounded-full blur-2xl pointer-events-none -z-0" />

        <div className="relative z-10 space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/30 text-white text-xs font-bold tracking-wide backdrop-blur-md">
            <ShieldCheck size={15} className="shrink-0 text-primary-200" />
            <span className="!text-white">Panel Administrasi &amp; Panitia SPMB Kampus</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold !text-white tracking-tight leading-tight drop-shadow-sm">
              Penerimaan Mahasiswa Baru
            </h1>
            <p className="text-primary-100 text-xs sm:text-sm md:text-base leading-relaxed font-medium max-w-3xl">
              Pantau arus calon pendaftar, status kelulusan berkas administrasi, konfirmasi pembayaran formulir, dan jalannya tahap selanjutnya secara terintegrasi.
            </p>
          </div>

          {/* Action Links (High Contrast White & Opaque Glass Buttons) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
            <Link
              href="/spmb/pendaftaran"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-primary-700 hover:bg-primary-50 active:bg-primary-100 font-extrabold text-sm shadow-lg hover:shadow-xl transition-all min-h-[44px]"
            >
              <Users size={18} className="text-primary-700" />
              <span className="text-primary-700 font-extrabold">Kelola Data Pendaftar ({totalCount})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. KPI Statistics Grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI Card 1 */}
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Calon Pendaftar</span>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isLoading ? <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md" /> : `${totalCount} Mhs`}
          </div>
          <p className="text-2xs sm:text-xs text-slate-500 font-medium mt-1">
            Terdaftar di sistem SPMB kampus
          </p>
        </div>

        {/* KPI Card 2 */}
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Formulir Lunas</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isLoading ? <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md" /> : `${lunasCount} Lunas`}
          </div>
          <p className="text-2xs sm:text-xs text-slate-500 font-medium mt-1">
            {totalCount - lunasCount} calon mhs belum bayar
          </p>
        </div>

        {/* KPI Card 3 */}
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Lulus Berkas</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FileCheck size={20} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isLoading ? <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-md" /> : `${verifiedCount} Verifikasi`}
          </div>
          <p className="text-2xs sm:text-xs text-slate-500 font-medium mt-1">
            Berkas administrasi disetujui
          </p>
        </div>

        {/* KPI Card 4 */}
        <div className="card p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gelombang Aktif</span>
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 truncate" title={activeGelombang?.nama || 'Gelombang 1'}>
            {isLoading ? <div className="h-7 w-28 bg-slate-100 animate-pulse rounded-md" /> : activeGelombang?.nama || 'Gelombang 1'}
          </div>
          <p className="text-2xs sm:text-xs text-slate-500 font-medium mt-1">
            Status: {activeGelombang?.pendaftaran_dibuka ? 'Sedang Dibuka' : 'Off / Belum Dibuka'}
          </p>
        </div>
      </div>

      {/* ── 4. Main Section: Table Pendaftar Terbaru + Sidebar Shortcuts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left 2-Columns: Data Table / Mobile Card List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="card-header border-b border-slate-100 p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Pendaftar SPMB Terbaru</h3>
                  <p className="text-2xs text-slate-500">Calon mahasiswa baru yang mendaftar di sistem</p>
                </div>
              </div>

              <Link
                href="/spmb/pendaftaran"
                className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg border border-primary-200 transition-colors inline-flex items-center gap-1.5"
              >
                <span>Lihat Semua ({totalCount})</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Desktop View using official Atomic Component <DataTable> */}
            <div className="hidden sm:block border-t border-slate-100">
              <DataTable
                columns={columns}
                data={adminPendaftarList.slice(0, 6)}
                isLoading={isLoading}
                emptyMessage={
                  <div className="py-8 text-center text-slate-500 space-y-2">
                    <Users size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold text-sm">Belum Ada Data Pendaftar</p>
                    <p className="text-xs text-slate-400">Data pendaftaran calon mahasiswa baru akan muncul di sini.</p>
                  </div>
                }
              />
            </div>

            {/* Mobile View (sm:hidden) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <RefreshCw size={24} className="animate-spin mx-auto text-primary-500" />
                  <p className="text-sm font-medium">Memuat data pendaftar...</p>
                </div>
              ) : adminPendaftarList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <Users size={32} className="mx-auto text-slate-300" />
                  <p className="font-bold text-sm">Belum Ada Data Pendaftar</p>
                </div>
              ) : (
                adminPendaftarList.slice(0, 6).map((p) => {
                  const prodiNama =
                    p.program_studi?.nama ||
                    prodiList.find((pr) => String(pr.id) === String(p.program_studi_id))?.nama ||
                    'Belum Dipilih';

                  return (
                    <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 font-bold flex items-center justify-center text-xs shrink-0">
                            {p.nama_lengkap ? p.nama_lengkap.slice(0, 2).toUpperCase() : 'CM'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{p.nama_lengkap || 'Calon Mahasiswa'}</p>
                            <p className="text-2xs font-mono text-slate-500">No: #{p.no_pendaftaran || p.id}</p>
                          </div>
                        </div>

                        {p.status_pembayaran === 'lunas' ? (
                          <span className="badge badge-green text-xs font-bold shrink-0">Lunas</span>
                        ) : (
                          <span className="badge badge-yellow text-xs font-bold shrink-0">Belum Bayar</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600">
                        <span className="truncate font-medium text-slate-700">{prodiNama}</span>
                        <Link
                          href={`/spmb/pendaftaran/${p.id}`}
                          className="btn btn-outline btn-xs font-bold text-primary-600 min-h-[40px] px-3 shrink-0 ml-2 inline-flex items-center gap-1"
                        >
                          <span>Buka Detail</span>
                          <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Shortcuts & Quick Admin Actions */}
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="card-header border-b border-slate-100 p-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <LayoutGrid size={18} className="text-primary-600" />
                <span>Pintasan Modul SPMB</span>
              </h3>
            </div>

            <div className="card-body p-3 space-y-2">
              <Link
                href="/spmb/master/gelombang"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors border border-slate-100 min-h-[48px] group"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-xs group-hover:text-primary-600 transition-colors">
                    Jalur &amp; Gelombang
                  </h4>
                  <p className="text-2xs text-slate-500">Atur periode &amp; tarif pendaftaran</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
              </Link>

              <Link
                href="/spmb/master/kuota"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors border border-slate-100 min-h-[48px] group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-800 text-xs group-hover:text-primary-600 transition-colors">
                    Kuota Program Studi
                  </h4>
                  <p className="text-2xs text-slate-500">Batas daya tampung penerimaan</p>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
              </Link>
            </div>
          </div>

          {/* Quick SSO Campus Jump Card */}
          <div className="card p-4 sm:p-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-2xs font-extrabold text-sky-400 uppercase tracking-widest block">
                SSO Campus Platform
              </span>
              <span className="text-xs font-semibold text-slate-200 block mt-0.5">
                Kembali ke Dashboard Utama SSO
              </span>
            </div>
            <Link
              href="/dashboard"
              className="btn btn-sm btn-outline text-white border-white/20 hover:bg-white/10 shrink-0 font-bold min-h-[40px]"
            >
              <ExternalLink size={14} />
              Portal SSO
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
