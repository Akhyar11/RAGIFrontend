'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Boxes,
  CalendarCheck,
  Wrench,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  TrendingUp,
  Coins,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Hero } from '@/components/ui/Hero';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { sinapraService } from '@/services/sinapra.service';
import type { SinapraDashboardSummary } from '@/types/sinapra.types';
import type { PaginationMeta } from '@/types/api.types';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SinapraDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<SinapraDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab Analytics
  const [activeTab, setActiveTab] = useState<'kondisi' | 'peminjaman' | 'distribusi' | 'early_warning'>('kondisi');

  // Pagination states
  const [prodiPage, setProdiPage] = useState(1);
  const [prodiLimit, setProdiLimit] = useState(10);
  const [ruanganPage, setRuanganPage] = useState(1);
  const [ruanganLimit, setRuanganLimit] = useState(10);
  const [asetPage, setAsetPage] = useState(1);
  const [asetLimit, setAsetLimit] = useState(10);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await sinapraService.getDashboardSummary();
      if (res?.data) {
        setData(res.data);
      }
    } catch {
      toast.error('Gagal memuat ringkasan dashboard SINAPRA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metrics = data?.metrics;
  const breakdown = data?.breakdown_aset;
  const earlyWarnings = data?.early_warnings;
  const recent = data?.recent_activities;

  const totalAsetCount = metrics?.total_aset || 1;
  const totalWarningCount = (earlyWarnings?.bhp_kritis_count || 0) + (earlyWarnings?.kalibrasi_urgent_count || 0);

  // Kolom Tabel Peminjaman Ruangan Terkini
  const peminjamanRuanganColumns: ColumnDef<any>[] = [
    {
      key: 'ruangan',
      label: 'RUANGAN & GEDUNG',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">
            {row.ruangan?.nama || 'Ruangan'}
          </span>
          <span className="text-2xs text-slate-500 font-mono">
            {row.ruangan?.kode || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'peminjam',
      label: 'PEMINJAM & KEPERLUAN',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {row.user?.name || 'Civitas Kampus'}
          </span>
          <span className="text-2xs text-slate-500 line-clamp-1">
            {row.keperluan || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'jadwal',
      label: 'WAKTU & JADWAL',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800 text-xs block">
            {row.tanggal ? formatDate(row.tanggal) : '-'}
          </span>
          <span className="text-2xs text-slate-500 font-mono">
            {row.jam_mulai?.slice(0, 5)} - {row.jam_selesai?.slice(0, 5)} WIB
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        const isApproved = ['disetujui', 'aktif', 'selesai'].includes(row.status);
        const isPending = row.status === 'diajukan';
        return (
          <Badge variant={isApproved ? 'success' : isPending ? 'warning' : 'danger'} className="text-2xs uppercase">
            {row.status}
          </Badge>
        );
      },
    },
  ];

  // Kolom Tabel Peminjaman Aset Terkini
  const peminjamanAsetColumns: ColumnDef<any>[] = [
    {
      key: 'aset',
      label: 'BARANG / ASET',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">
            {row.aset?.nama || 'Aset'}
          </span>
          <span className="text-2xs text-slate-500 font-mono">
            {row.aset?.kode_aset || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'peminjam',
      label: 'PEMINJAM & KEPERLUAN',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {row.user?.name || 'Civitas Kampus'}
          </span>
          <span className="text-2xs text-slate-500 line-clamp-1">
            {row.keperluan || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'jadwal',
      label: 'RENTANG PINJAM',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800 text-xs block">
            {row.tanggal_pinjam ? formatDate(row.tanggal_pinjam) : '-'}
          </span>
          <span className="text-2xs text-slate-500">
            s/d {row.tanggal_kembali_rencana ? formatDate(row.tanggal_kembali_rencana) : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        const isApproved = ['disetujui', 'dipinjam', 'kembali'].includes(row.status);
        const isPending = row.status === 'diajukan';
        return (
          <Badge variant={isApproved ? 'success' : isPending ? 'warning' : 'danger'} className="text-2xs uppercase">
            {row.status}
          </Badge>
        );
      },
    },
  ];

  // Data dan Kolom Distribusi Fasilitas & Aset per Program Studi
  const distribusiData = [
    ...(data?.distribusi_prodi?.prodi_list || []),
    ...(data?.distribusi_prodi?.fasilitas_umum
      ? [
          {
            id: 'fasilitas-umum',
            kode_prodi: 'UMUM',
            nama: data.distribusi_prodi.fasilitas_umum.nama,
            jenjang: 'Fasilitas Terpusat',
            total_aset: data.distribusi_prodi.fasilitas_umum.total_aset,
            total_ruangan: data.distribusi_prodi.fasilitas_umum.total_ruangan,
            total_nilai_aset: data.distribusi_prodi.fasilitas_umum.total_nilai_aset,
          },
        ]
      : []),
  ];

  const prodiColumns: ColumnDef<any>[] = [
    {
      key: 'nama',
      label: 'PROGRAM STUDI / UNIT KAMPUS',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">
            {row.nama}
          </span>
          <span className="text-2xs text-slate-500 font-mono">
            {row.kode_prodi} {row.jenjang ? `• ${row.jenjang}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'total_ruangan',
      label: 'RUANGAN TERKAIT',
      render: (row) => (
        <span className="font-medium text-slate-800 text-xs">
          {row.total_ruangan} Ruangan
        </span>
      ),
    },
    {
      key: 'total_aset',
      label: 'JUMLAH INVENTARIS',
      render: (row) => (
        <span className="font-bold text-slate-800 text-xs">
          {row.total_aset} Unit
        </span>
      ),
    },
    {
      key: 'total_nilai_aset',
      label: 'ESTIMASI NILAI ASET',
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold text-xs" style={{ color: 'var(--module-primary)' }}>
          {formatCurrency(row.total_nilai_aset)}
        </span>
      ),
    },
    {
      key: 'action',
      label: 'NAVIGASI',
      align: 'center',
      render: (row) => (
        <Link
          href={row.id > 0 ? `/sinapra/aset?program_studi_id=${row.id}` : '/sinapra/aset'}
          className="text-2xs font-semibold hover:underline flex items-center justify-center gap-2"
          style={{ color: 'var(--module-primary)' }}
        >
          Lihat Aset <ArrowRight size={12} />
        </Link>
      ),
    },
  ];

  // Pagination: Distribusi Fasilitas Prodi
  const totalProdi = distribusiData.length;
  const lastProdiPage = Math.max(1, Math.ceil(totalProdi / prodiLimit));
  const currentProdiPage = Math.min(Math.max(1, prodiPage), lastProdiPage);
  const pagedDistribusiData = distribusiData.slice(
    (currentProdiPage - 1) * prodiLimit,
    currentProdiPage * prodiLimit
  );
  const prodiMeta: PaginationMeta = {
    current_page: currentProdiPage,
    last_page: lastProdiPage,
    per_page: prodiLimit,
    total: totalProdi,
    from: totalProdi === 0 ? 0 : (currentProdiPage - 1) * prodiLimit + 1,
    to: Math.min(currentProdiPage * prodiLimit, totalProdi),
  };

  // Pagination: Peminjaman Ruangan Terkini
  const peminjamanRuanganList = recent?.peminjaman_ruangan || [];
  const totalRuangan = peminjamanRuanganList.length;
  const lastRuanganPage = Math.max(1, Math.ceil(totalRuangan / ruanganLimit));
  const currentRuanganPage = Math.min(Math.max(1, ruanganPage), lastRuanganPage);
  const pagedPeminjamanRuangan = peminjamanRuanganList.slice(
    (currentRuanganPage - 1) * ruanganLimit,
    currentRuanganPage * ruanganLimit
  );
  const ruanganMeta: PaginationMeta = {
    current_page: currentRuanganPage,
    last_page: lastRuanganPage,
    per_page: ruanganLimit,
    total: totalRuangan,
    from: totalRuangan === 0 ? 0 : (currentRuanganPage - 1) * ruanganLimit + 1,
    to: Math.min(currentRuanganPage * ruanganLimit, totalRuangan),
  };

  // Pagination: Peminjaman Aset Terkini
  const peminjamanAsetList = recent?.peminjaman_aset || [];
  const totalAset = peminjamanAsetList.length;
  const lastAsetPage = Math.max(1, Math.ceil(totalAset / asetLimit));
  const currentAsetPage = Math.min(Math.max(1, asetPage), lastAsetPage);
  const pagedPeminjamanAset = peminjamanAsetList.slice(
    (currentAsetPage - 1) * asetLimit,
    currentAsetPage * asetLimit
  );
  const asetMeta: PaginationMeta = {
    current_page: currentAsetPage,
    last_page: lastAsetPage,
    per_page: asetLimit,
    total: totalAset,
    from: totalAset === 0 ? 0 : (currentAsetPage - 1) * asetLimit + 1,
    to: Math.min(currentAsetPage * asetLimit, totalAset),
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Dashboard Sarana & Prasarana (SINAPRA)"
        description="Pusat kelola inventaris aset, fasilitas kampus, peminjaman ruangan, dan pemeliharaan sarana"
      />

      {/* 2. HERO BANNER */}
      <Hero
        badge="PANEL UTAMA SINAPRA KAMPUS"
        title="Sistem Informasi Sarana & Prasarana Kampus"
        description="Kelola inventaris aset fisik, pemetaan fasilitas ruangan kampus, layanan peminjaman sarana prasarana, serta pemeliharaan berkala terhubung langsung dengan SSO Central Authorization."
      />

      {/* 3. KPI STAT CARDS (4 KOLOM TERSTANDARISASI) */}
      <div className="kpi-grid">
        <StatCard
          label="Total Inventaris Aset"
          value={loading ? '...' : metrics?.total_aset || 0}
          icon={<Boxes size={22} />}
          iconVariant="indigo"
          footer={
            <span className="flex items-center gap-1">
              <TrendingUp size={14} /> {metrics?.total_aset_ada_pic || 0} Terdata PIC
            </span>
          }
        />
        <StatCard
          label="Fasilitas Ruangan"
          value={loading ? '...' : `${metrics?.total_ruangan || 0} Ruangan`}
          icon={<Building2 size={22} />}
          iconVariant="green"
          footer={`${metrics?.total_gedung || 0} Gedung • ${metrics?.ruangan_tersedia || 0} Tersedia`}
        />
        <StatCard
          label="Peminjaman Aktif"
          value={
            loading
              ? '...'
              : `${(metrics?.peminjaman_ruangan_aktif || 0) + (metrics?.peminjaman_aset_aktif || 0)} Aktif`
          }
          icon={<CalendarCheck size={22} />}
          iconVariant="amber"
          footer={`${metrics?.peminjaman_pending || 0} Menunggu Approval`}
        />
        <StatCard
          label="Perbaikan & Pemeliharaan"
          value={loading ? '...' : `${metrics?.maintenance_aktif || 0} Proses`}
          icon={<Wrench size={22} />}
          iconVariant="cyan"
          footer={`${earlyWarnings?.bhp_kritis_count || 0} BHP Kritis • ${earlyWarnings?.kalibrasi_urgent_count || 0} Kalibrasi`}
        />
      </div>

      {/* 4. SEGMENTASI TAB ANALITIK & AKTIVITAS (4 TAB TERFOKUS) */}
      <div className="space-y-4">
        {/* Tab Switcher Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('kondisi')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'kondisi'
                  ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Boxes size={16} />
              Kondisi &amp; Status Aset
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('peminjaman')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'peminjaman'
                  ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <CalendarCheck size={16} />
              Aktivitas Peminjaman
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('distribusi')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'distribusi'
                  ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <GraduationCap size={16} />
              Distribusi Fasilitas Prodi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('early_warning')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'early_warning'
                  ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <ShieldAlert size={16} />
              Early Warning Lab
              {totalWarningCount > 0 && (
                <Badge variant="danger" className="ml-1 text-2xs px-1.5 py-0.5">
                  {totalWarningCount}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: KONDISI & STATUS ASET + VALUASI FINANSIAL */}
        {activeTab === 'kondisi' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Ketersediaan Aset */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Status Ketersediaan Inventaris
                    </h3>
                    <p className="text-2xs text-slate-400">
                      Rincian status operasional unit aset kampus
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-2xs font-mono">
                    {metrics?.total_aset || 0} Total Unit
                  </Badge>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Tersedia &amp; Siap Pakai</span>
                      <strong className="text-slate-800">{breakdown?.status.tersedia || 0} unit</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          background: 'var(--module-primary)',
                          width: `${Math.round(((breakdown?.status.tersedia || 0) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Sedang Dipinjam</span>
                      <strong className="text-slate-800">{breakdown?.status.dipinjam || 0} unit</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--module-primary) 70%, transparent)',
                          width: `${Math.round(((breakdown?.status.dipinjam || 0) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Dalam Pemeliharaan (Maintenance)</span>
                      <strong className="text-slate-800">{breakdown?.status.maintenance || 0} unit</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--module-primary) 45%, transparent)',
                          width: `${Math.round(((breakdown?.status.maintenance || 0) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Rusak / Usulan Disposal</span>
                      <strong className="text-slate-800">
                        {(breakdown?.status.rusak || 0) + (breakdown?.status.dihapus || 0)} unit
                      </strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--module-primary) 25%, transparent)',
                          width: `${Math.round((((breakdown?.status.rusak || 0) + (breakdown?.status.dihapus || 0)) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kelayakan & Kondisi Fisik */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Kelayakan &amp; Kondisi Fisik
                    </h3>
                    <p className="text-2xs text-slate-400">
                      Audit kondisi aktual perlengkapan inventaris kampus
                    </p>
                  </div>
                  <Link href="/sinapra/aset">
                    <Button variant="outline" size="sm" className="text-2xs">
                      Semua Aset
                    </Button>
                  </Link>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Kondisi Baik (Prima)</span>
                      <strong className="text-slate-800">{breakdown?.kondisi.baik || 0} unit</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          background: 'var(--module-primary)',
                          width: `${Math.round(((breakdown?.kondisi.baik || 0) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Rusak Ringan (Bisa Digunakan)</span>
                      <strong className="text-slate-800">{breakdown?.kondisi.rusak_ringan || 0} unit</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--module-primary) 50%, transparent)',
                          width: `${Math.round(((breakdown?.kondisi.rusak_ringan || 0) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Rusak Berat (Butuh Penggantian)</span>
                      <strong className="text-slate-800">{breakdown?.kondisi.rusak_berat || 0} unit</strong>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--module-primary) 25%, transparent)',
                          width: `${Math.round(((breakdown?.kondisi.rusak_berat || 0) / totalAsetCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Valuasi Akuntansi SIKEU */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins size={16} style={{ color: 'var(--module-primary)' }} />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Valuasi &amp; Nilai Buku Aset (Integrasi SIKEU)
                  </h3>
                </div>
                <span className="text-2xs text-slate-400">
                  Sinkronisasi Otomatis Buku Besar Akuntansi
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">
                    Total Harga Perolehan
                  </span>
                  <div className="text-lg font-bold font-mono text-slate-800">
                    {loading ? '...' : formatCurrency(metrics?.total_harga_perolehan || 0)}
                  </div>
                  <span className="text-2xs text-slate-400 block">
                    Nilai kapitalisasi awal aset
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">
                    Akumulasi Penyusutan
                  </span>
                  <div className="text-lg font-bold font-mono text-rose-600">
                    {loading ? '...' : formatCurrency(metrics?.total_akumulasi_penyusutan || 0)}
                  </div>
                  <span className="text-2xs text-slate-400 block">
                    Metode garis lurus amortisasi
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">
                    Nilai Buku Bersih (Net Book Value)
                  </span>
                  <div className="text-lg font-bold font-mono" style={{ color: 'var(--module-primary)' }}>
                    {loading ? '...' : formatCurrency(metrics?.total_nilai_buku || 0)}
                  </div>
                  <span className="text-2xs text-slate-400 block">
                    Total aset aktif dalam neraca
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AKTIVITAS PEMINJAMAN TERKINI */}
        {activeTab === 'peminjaman' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peminjaman Ruangan Terkini */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Peminjaman Ruangan Terkini
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Log jadwal &amp; permohonan penggunaan ruangan kampus
                  </p>
                </div>
                <Link href="/sinapra/peminjaman">
                  <Button variant="outline" size="sm" className="text-2xs">
                    Lihat Semua
                  </Button>
                </Link>
              </div>
              <DataTable
                columns={peminjamanRuanganColumns}
                data={pagedPeminjamanRuangan}
                meta={ruanganMeta}
                onPageChange={(p) => setRuanganPage(p)}
                onLimitChange={(l) => {
                  setRuanganLimit(l);
                  setRuanganPage(1);
                }}
                emptyMessage="Belum ada aktivitas peminjaman ruangan tercatat."
              />
            </div>

            {/* Peminjaman Aset Terkini */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Peminjaman Aset &amp; Barang Terkini
                  </h3>
                  <p className="text-2xs text-slate-400">
                    Log peminjaman alat laboratorium &amp; inventaris portabel
                  </p>
                </div>
                <Link href="/sinapra/peminjaman">
                  <Button variant="outline" size="sm" className="text-2xs">
                    Lihat Semua
                  </Button>
                </Link>
              </div>
              <DataTable
                columns={peminjamanAsetColumns}
                data={pagedPeminjamanAset}
                meta={asetMeta}
                onPageChange={(p) => setAsetPage(p)}
                onLimitChange={(l) => {
                  setAsetLimit(l);
                  setAsetPage(1);
                }}
                emptyMessage="Belum ada aktivitas peminjaman aset tercatat."
              />
            </div>
          </div>
        )}

        {/* TAB 3: DISTRIBUSI FASILITAS PRODI */}
        {activeTab === 'distribusi' && (
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <GraduationCap size={16} style={{ color: 'var(--module-primary)' }} />
                  Distribusi Fasilitas &amp; Aset per Program Studi
                </h3>
                <p className="text-2xs text-slate-400">
                  Pemetaan inventaris, ruangan khusus prodi, dan fasilitas umum kampus terintegrasi SIAKAD
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/sinapra/aset">
                  <Button variant="outline" size="sm" className="text-2xs">
                    Semua Inventaris
                  </Button>
                </Link>
                <Link href="/sinapra/gedung-ruangan">
                  <Button variant="outline" size="sm" className="text-2xs">
                    Semua Ruangan
                  </Button>
                </Link>
              </div>
            </div>

            <DataTable
              columns={prodiColumns}
              data={pagedDistribusiData}
              meta={prodiMeta}
              onPageChange={(p) => setProdiPage(p)}
              onLimitChange={(l) => {
                setProdiLimit(l);
                setProdiPage(1);
              }}
              keyExtractor={(row) => row.id ?? row.kode_prodi}
              emptyMessage="Belum ada data distribusi fasilitas program studi."
            />
          </div>
        )}

        {/* TAB 4: EARLY WARNING LAB */}
        {activeTab === 'early_warning' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* BHP Lab Kritis */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      BHP Lab Stok Kritis
                    </h3>
                    <p className="text-2xs text-slate-400">
                      Bahan habis pakai di bawah batas minimum
                    </p>
                  </div>
                </div>
                <Badge variant={earlyWarnings?.bhp_kritis_count ? 'danger' : 'success'} className="text-2xs">
                  {earlyWarnings?.bhp_kritis_count || 0} Kritis
                </Badge>
              </div>

              {earlyWarnings?.bhp_kritis_list && earlyWarnings.bhp_kritis_list.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
                  {earlyWarnings.bhp_kritis_list.map((item) => (
                    <div key={item.id} className="p-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-slate-800 block text-xs">{item.nama_bhp}</span>
                          <span className="text-2xs text-slate-400 block">{item.ruangan?.nama || 'Laboratorium'}</span>
                        </div>
                        <span className="text-2xs font-bold text-rose-700 font-mono bg-rose-50 px-2 py-0.5 rounded">
                          Sisa: {item.stok_saat_ini} {item.satuan} (Min: {item.stok_minimum})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                  <CheckCircle2 size={24} className="text-emerald-500 opacity-80" />
                  <span>Seluruh stok BHP laboratorium aman di atas batas minimum.</span>
                </div>
              )}
            </div>

            {/* Kalibrasi Urgent */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-rose-500" />
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Kalibrasi Instrumen Mendekati Tempo
                    </h3>
                    <p className="text-2xs text-slate-400">
                      Alat laboratorium membutuhkan sertifikasi ulang
                    </p>
                  </div>
                </div>
                <Badge variant={earlyWarnings?.kalibrasi_urgent_count ? 'warning' : 'success'} className="text-2xs">
                  {earlyWarnings?.kalibrasi_urgent_count || 0} Alat
                </Badge>
              </div>

              {earlyWarnings?.kalibrasi_urgent_list && earlyWarnings.kalibrasi_urgent_list.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden bg-white">
                  {earlyWarnings.kalibrasi_urgent_list.map((item) => (
                    <div key={item.id} className="p-3 text-xs hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-slate-800 block text-xs">
                            {item.aset?.nama || 'Alat Laboratorium'}
                          </span>
                          <span className="text-2xs text-slate-400 font-mono">
                            {item.nomor_sertifikat || 'Tanpa No. Sertifikat'}
                          </span>
                        </div>
                        <span className="text-2xs font-bold text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded">
                          {item.tanggal_kadaluarsa ? formatDate(item.tanggal_kadaluarsa) : 'Lewat Tempo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                  <CheckCircle2 size={24} className="text-emerald-500 opacity-80" />
                  <span>Tidak ada instrumen presisi yang memerlukan kalibrasi segera.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. QUICK NAVIGATION CARDS (ALA SIMPEG) */}
      <div className="quick-nav-grid">
        <Link href="/sinapra/aset" className="card quick-nav-card no-underline">
          <div className="flex items-center justify-between mb-4">
            <div
              className="module-card-icon-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--module-primary) 12%, transparent)',
                color: 'var(--module-primary)',
              }}
            >
              <Boxes size={22} />
            </div>
            <ArrowRight size={20} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold mb-1">
            Manajemen Data Aset
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Katalog inventaris, label barcode QR, nomor aset, kondisi fisik, dan nilai buku akuntansi SIKEU.
          </p>
        </Link>

        <Link href="/sinapra/gedung-ruangan" className="card quick-nav-card no-underline">
          <div className="flex items-center justify-between mb-4">
            <div
              className="module-card-icon-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--module-primary) 12%, transparent)',
                color: 'var(--module-primary)',
              }}
            >
              <Building2 size={22} />
            </div>
            <ArrowRight size={20} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold mb-1">
            Gedung &amp; Ruangan
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Struktur gedung kampus, ruang kelas kuliah, laboratorium, kapasitas kursi, dan fasilitas ruangan.
          </p>
        </Link>

        <Link href="/sinapra/peminjaman" className="card quick-nav-card no-underline">
          <div className="flex items-center justify-between mb-4">
            <div
              className="module-card-icon-lg"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--module-primary) 12%, transparent)',
                color: 'var(--module-primary)',
              }}
            >
              <CalendarCheck size={22} />
            </div>
            <ArrowRight size={20} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold mb-1">
            Layanan Peminjaman
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Permohonan dan persetujuan peminjaman ruangan kuliah, aula, dan perlengkapan sarana prasarana kampus.
          </p>
        </Link>
      </div>
    </div>
  );
}
