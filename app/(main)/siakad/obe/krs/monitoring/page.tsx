'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Filter,
  RotateCcw,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody } from '@/components/ui/Card';
import { Drawer } from '@/components/ui/Drawer';
import { Select, type SelectOption } from '@/components/ui/Select';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { siakadService } from '@/services/siakad.service';
import { useAuth } from '@/hooks/useAuth';
import { formatTahunAkademikLabel } from '@/lib/obe-settings';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

interface MonitoringProdiRow {
  prodi_id: number;
  kode_prodi: string;
  nama_prodi: string;
  jenjang: string;
  fakultas: string;
  mahasiswa_ber_krs: number;
  jumlah_krs: number;
  total_sks: number;
  rata_sks: number;
  jumlah_mk: number;
  draft: number;
  diajukan: number;
  disetujui: number;
  dikunci: number;
  terkunci_keuangan: number;
  // Hanya terisi pada periode berjalan (null untuk periode lampau).
  total_mahasiswa_aktif: number | null;
  belum_krs: number | null;
  persentase_krs: number | null;
  persentase_disetujui: number | null;
}

const STATUS_KRS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status Pengisian' },
  { value: 'lengkap', label: '100% Sudah Mengisi' },
  { value: 'ada_belum', label: 'Terdapat Belum Mengisi' },
];

const STATUS_KEUANGAN_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status Keuangan' },
  { value: 'ada_terkunci', label: 'Terdapat Terkunci Keuangan' },
  { value: 'lunas', label: 'Bebas Tunggakan Keuangan' },
];

const PROGRES_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Kategori Progres' },
  { value: 'tinggi', label: 'Tinggi (≥ 80%)' },
  { value: 'sedang', label: 'Sedang (50% - 79%)' },
  { value: 'rendah', label: 'Rendah (< 50%)' },
];

export default function MonitoringKrsPage() {
  const router = useRouter();
  const { user, isSuperAdmin, is_loading: isAuthLoading } = useAuth();

  const userAdminProdis = useMemo(() => {
    return (
      ((user as any)?.siakad_admin_prodis || (user as any)?.siakadAdminProdis || []).filter(
        (p: any) => p.is_active !== false
      )
    );
  }, [user]);

  const isAdminObe = isSuperAdmin || userAdminProdis.length > 0;

  const permittedProdiIds = useMemo(
    () => userAdminProdis.map((p: any) => Number(p.program_studi_id)),
    [userAdminProdis]
  );

  // Context & Applied Filter States
  const [selectedTaId, setSelectedTaId] = useState<number | null>(null);
  const [filterProdiId, setFilterProdiId] = useState<number | null>(null);
  const [filterStatusKrs, setFilterStatusKrs] = useState<string>('');
  const [filterStatusKeuangan, setFilterStatusKeuangan] = useState<string>('');
  const [filterProgresKrs, setFilterProgresKrs] = useState<string>('');

  // Drawer Staged Filter States
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [drawerTaId, setDrawerTaId] = useState<number | null>(null);
  const [drawerProdiId, setDrawerProdiId] = useState<number | null>(null);
  const [drawerStatusKrs, setDrawerStatusKrs] = useState<string>('');
  const [drawerStatusKeuangan, setDrawerStatusKeuangan] = useState<string>('');
  const [drawerProgresKrs, setDrawerProgresKrs] = useState<string>('');

  // Server-side Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);

  // Data & Summary States from Server
  const [summary, setSummary] = useState<any | null>(null);
  const [rows, setRows] = useState<MonitoringProdiRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load Initial Options (Tahun Akademik & Scoped Prodi)
  useEffect(() => {
    if (isAuthLoading || !user || !isAdminObe) return;

    const loadInitialContext = async () => {
      try {
        const res = await siakadService.getTahunAkademiks({ per_page: 50 });
        const list: any[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const activeTa = list.find((t) => t.is_active) || list[0];
        if (activeTa && selectedTaId === null) {
          setSelectedTaId(Number(activeTa.id));
          setDrawerTaId(Number(activeTa.id));
        }

        if (!isSuperAdmin && permittedProdiIds.length > 0 && filterProdiId === null) {
          setFilterProdiId(permittedProdiIds[0]);
          setDrawerProdiId(permittedProdiIds[0]);
        }
      } catch {
        toast.error('Gagal memuat tahun akademik');
      }
    };

    loadInitialContext();
  }, [isAuthLoading, user, isAdminObe, isSuperAdmin, permittedProdiIds, selectedTaId, filterProdiId]);

  // Load Monitoring Data from API with Full Server-side Filtering & Pagination
  const fetchMonitoringData = useCallback(async () => {
    if (!user || !isAdminObe) return;
    if (!isSuperAdmin && permittedProdiIds.length === 0) return;

    const targetProdiId = isSuperAdmin
      ? (filterProdiId || undefined)
      : (filterProdiId && permittedProdiIds.includes(filterProdiId)
          ? filterProdiId
          : permittedProdiIds[0]);

    try {
      setIsLoading(true);
      const res = await siakadService.getKrsMonitoring({
        tahun_akademik_id: selectedTaId || undefined,
        program_studi_id: targetProdiId,
        status_krs: filterStatusKrs || undefined,
        status_keuangan: filterStatusKeuangan || undefined,
        progres_krs: filterProgresKrs || undefined,
        page,
        limit,
      });

      if (res?.data) {
        const payload = res.data;
        const prodiList: MonitoringProdiRow[] = Array.isArray(payload.prodi) ? payload.prodi : [];
        setRows(prodiList);
        setSummary(payload.summary || null);
        setMeta(payload.meta || res.meta);
      }
    } catch {
      toast.error('Gagal memuat data monitoring KRS');
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    isAdminObe,
    isSuperAdmin,
    permittedProdiIds,
    filterProdiId,
    selectedTaId,
    filterStatusKrs,
    filterStatusKeuangan,
    filterProgresKrs,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // AsyncSelect Option Loaders
  const loadTahunAkademikOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getTahunAkademiks({
        search: keyword || undefined,
        per_page: 50,
      });
      const list: any[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
      return list.map((ta) => ({
        value: Number(ta.id),
        label: `${formatTahunAkademikLabel(ta)} ${ta.is_active ? '• (Aktif)' : ''}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadProdiOptions = useCallback(
    async (keyword: string) => {
      try {
        const res = await siakadService.getProdi({ search: keyword || undefined });
        const list: any[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const permitted = isSuperAdmin
          ? list
          : list.filter((p) =>
              userAdminProdis.some((uap: any) => Number(uap.program_studi_id) === Number(p.id))
            );
        return permitted.map((p) => ({
          value: Number(p.id),
          label: `${p.nama} (${p.jenjang || 'S1'})`,
        }));
      } catch {
        return [];
      }
    },
    [isSuperAdmin, userAdminProdis]
  );

  // Drawer handlers
  const handleApplyFilter = () => {
    setSelectedTaId(drawerTaId);
    setFilterProdiId(drawerProdiId);
    setFilterStatusKrs(drawerStatusKrs);
    setFilterStatusKeuangan(drawerStatusKeuangan);
    setFilterProgresKrs(drawerProgresKrs);
    setPage(1);
    setIsFilterDrawerOpen(false);
  };

  const handleResetFilter = () => {
    const defaultProdi = isSuperAdmin ? null : (permittedProdiIds[0] || null);
    setDrawerProdiId(defaultProdi);
    setDrawerStatusKrs('');
    setDrawerStatusKeuangan('');
    setDrawerProgresKrs('');
    setFilterProdiId(defaultProdi);
    setFilterStatusKrs('');
    setFilterStatusKeuangan('');
    setFilterProgresKrs('');
    setPage(1);
    setIsFilterDrawerOpen(false);
  };

  // Pembanding mahasiswa aktif hanya tersedia pada periode berjalan.
  const periodeBerjalan = Boolean(summary?.periode_berjalan);

  // Columns definition for DataTable
  const columns: ColumnDef<MonitoringProdiRow>[] = [
    {
      key: 'program_studi',
      label: 'PROGRAM STUDI',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">
            {row.nama_prodi} {row.jenjang ? `(${row.jenjang})` : ''}
          </span>
          <span className="text-2xs text-slate-400 block">
            {row.fakultas} • {row.kode_prodi || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'mahasiswa_ber_krs',
      label: 'MAHASISWA BER-KRS',
      align: 'center',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{row.mahasiswa_ber_krs}</span>
          <span className="text-2xs text-slate-400">{row.jumlah_krs} KRS</span>
        </div>
      ),
    },
    {
      key: 'rata_sks',
      label: 'RATA-RATA SKS',
      align: 'center',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{row.rata_sks}</span>
          <span className="text-2xs text-slate-400">{row.total_sks} SKS total</span>
        </div>
      ),
    },
    {
      key: 'jumlah_mk',
      label: 'MATA KULIAH DIBUKA',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-slate-800 text-xs">{row.jumlah_mk}</span>,
    },
    {
      key: 'status_krs',
      label: 'STATUS KRS',
      render: (row) => {
        type StatusItem = { label: string; value: number; variant: 'gray' | 'amber' | 'green' | 'blue' };
        const items: StatusItem[] = ([
          { label: 'Draft', value: row.draft, variant: 'gray' },
          { label: 'Diajukan', value: row.diajukan, variant: 'amber' },
          { label: 'Disetujui', value: row.disetujui, variant: 'green' },
          { label: 'Dikunci', value: row.dikunci, variant: 'blue' },
        ] as StatusItem[]).filter((i) => i.value > 0);
        if (items.length === 0) return <span className="text-2xs text-slate-400">Belum ada KRS</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {items.map((i) => (
              <Badge key={i.label} variant={i.variant} className="text-2xs font-semibold">
                {i.label} {i.value}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'cakupan',
      label: 'CAKUPAN MAHASISWA AKTIF',
      render: (row) => {
        if (row.total_mahasiswa_aktif === null || row.persentase_krs === null) {
          return <span className="text-2xs text-slate-400">Hanya periode berjalan</span>;
        }
        const pct = Math.min(100, row.persentase_krs);
        return (
          <div className="min-w-[10rem]">
            <div className="flex items-center justify-between text-2xs mb-1">
              <span className="font-mono font-bold text-slate-800">
                {row.total_mahasiswa_aktif - (row.belum_krs ?? 0)} / {row.total_mahasiswa_aktif}
              </span>
              <span className="font-mono text-slate-500">{row.persentase_krs}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--module-primary,var(--primary-600))]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-2xs text-rose-600 mt-1 block">{row.belum_krs} belum mengisi</span>
          </div>
        );
      },
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => (
        <DropdownMenu
          items={[
            {
              label: 'Lihat Mahasiswa',
              icon: <Eye size={14} />,
              onClick: () =>
                router.push(`/siakad/obe/krs/monitoring/prodi/${row.prodi_id}${selectedTaId ? `?ta=${selectedTaId}` : ''}`),
            },
          ]}
        />
      ),
    },
  ];

  // RBAC Loading Screen (Fail-Closed)
  if (isAuthLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Monitoring KRS Mahasiswa"
          description="Pemantauan progres dan rekapitulasi pengisian kartu rencana studi mahasiswa per program studi."
          breadcrumbs={[
            { label: 'SIAKAD', href: '/siakad' },
            { label: 'Kurikulum OBE', href: '/siakad/obe' },
            { label: 'KRS', href: '/siakad/obe/krs/paket' },
            { label: 'Monitoring KRS Mahasiswa' },
          ]}
        />
        <Card className="border border-slate-200">
          <CardBody className="py-6 text-center text-slate-400">
            <p className="text-xs">Memverifikasi hak akses pengguna...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // RBAC Access Denied Screen (Fail-Closed)
  if (!user || !isAdminObe) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Monitoring KRS Mahasiswa"
          description="Pemantauan progres dan rekapitulasi pengisian kartu rencana studi mahasiswa per program studi."
          breadcrumbs={[
            { label: 'SIAKAD', href: '/siakad' },
            { label: 'Kurikulum OBE', href: '/siakad/obe' },
            { label: 'KRS', href: '/siakad/obe/krs/paket' },
            { label: 'Monitoring KRS Mahasiswa' },
          ]}
        />
        <Card className="border border-slate-200">
          <CardBody className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldAlert size={24} />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                Akses Ditolak: Akun Belum Ditugaskan
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Halaman monitoring KRS OBE hanya dapat diakses oleh personel yang memiliki
                penugasan sebagai <strong>Admin OBE</strong> pada Program Studi.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/siakad')}>
                Kembali ke Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring KRS Mahasiswa"
        description="Pemantauan progres dan rekapitulasi pengisian kartu rencana studi mahasiswa per program studi."
        breadcrumbs={[
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Kurikulum OBE', href: '/siakad/obe' },
          { label: 'KRS', href: '/siakad/obe/krs/paket' },
          { label: 'Monitoring KRS Mahasiswa' },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            icon={<Filter size={16} />}
            onClick={() => setIsFilterDrawerOpen(true)}
            className="text-xs font-bold border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
          >
            Filter
          </Button>
        }
      />

      {/* Ringkasan: isi menyesuaikan periode berjalan atau lampau */}
      {summary && (
        <>
          {!periodeBerjalan && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              Periode lampau: angka dihitung dari seluruh KRS yang tercatat pada periode ini. Pembanding
              mahasiswa aktif dan jumlah belum mengisi hanya tersedia untuk periode berjalan.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {periodeBerjalan && (
              <Card className="border border-slate-200 shadow-2xs">
                <CardBody className="p-4">
                  <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                    Cakupan Pengisian
                  </span>
                  <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
                    {summary.persentase_krs ?? 0}%
                  </span>
                  <span className="text-2xs text-slate-400 mt-0.5 block">
                    {summary.total_mahasiswa_aktif - (summary.total_belum_krs ?? 0)} dari{' '}
                    {summary.total_mahasiswa_aktif} mahasiswa aktif
                  </span>
                </CardBody>
              </Card>
            )}
            <Card className="border border-slate-200 shadow-2xs">
              <CardBody className="p-4">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Mahasiswa Ber-KRS
                </span>
                <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
                  {summary.total_sudah_krs}
                </span>
                <span className="text-2xs text-slate-400 mt-0.5 block">{summary.total_krs} dokumen KRS</span>
              </CardBody>
            </Card>
            <Card className="border border-slate-200 shadow-2xs">
              <CardBody className="p-4">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Rata-rata SKS
                </span>
                <span className="text-lg font-black text-slate-900 font-mono mt-1 block">
                  {summary.rata_sks}
                </span>
                <span className="text-2xs text-slate-400 mt-0.5 block">{summary.total_sks} SKS total</span>
              </CardBody>
            </Card>
            <Card className="border border-slate-200 shadow-2xs">
              <CardBody className="p-4">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">
                  Status KRS
                </span>
                <span className="text-2xs text-slate-700 mt-1.5 block">
                  Disetujui <strong className="font-mono">{summary.total_disetujui}</strong> • Dikunci{' '}
                  <strong className="font-mono">{summary.total_dikunci}</strong>
                </span>
                <span className="text-2xs text-slate-400 mt-0.5 block">
                  Diajukan {summary.total_diajukan} • Draft {summary.total_draft}
                </span>
              </CardBody>
            </Card>
            {periodeBerjalan && (
              <Card className="border border-slate-200 shadow-2xs">
                <CardBody className="p-4">
                  <span className="text-2xs font-bold text-rose-700 uppercase tracking-wider block">
                    Belum Mengisi KRS
                  </span>
                  <span className="text-lg font-black text-rose-600 font-mono mt-1 block">
                    {summary.total_belum_krs}
                  </span>
                  <span className="text-2xs text-slate-400 mt-0.5 block">Mahasiswa aktif perlu dihubungi</span>
                </CardBody>
              </Card>
            )}
            <Card className="border border-slate-200 shadow-2xs">
              <CardBody className="p-4">
                <span className="text-2xs font-bold text-amber-700 uppercase tracking-wider block">
                  Terkunci Keuangan
                </span>
                <span className="text-lg font-black text-amber-600 font-mono mt-1 block">
                  {summary.total_terkunci_keuangan}
                </span>
                <span className="text-2xs text-slate-400 mt-0.5 block">Tunggakan SPP / SIKEU</span>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* Tabel Rekapitulasi Per Program Studi with Server-side Pagination Meta */}
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        emptyMessage="Tidak ada data monitoring program studi yang sesuai filter."
      />

      {/* Drawer Filter (1:1 Parity dengan Kolom Tabel) */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Monitoring KRS"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={handleResetFilter}
              className="text-xs"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyFilter}
              className="text-xs font-bold"
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <AsyncSelect
              label="Tahun Akademik"
              placeholder="Pilih Tahun Akademik..."
              loadOptions={loadTahunAkademikOptions}
              value={drawerTaId}
              onChange={(opt: any) => setDrawerTaId(opt?.value ? Number(opt.value) : null)}
              defaultOptions={true}
            />
          </div>

          <div>
            <AsyncSelect
              label="Program Studi"
              placeholder="Semua Program Studi..."
              loadOptions={loadProdiOptions}
              value={drawerProdiId}
              onChange={(opt: any) => setDrawerProdiId(opt?.value ? Number(opt.value) : null)}
              isClearable={isSuperAdmin}
              defaultOptions={true}
            />
          </div>

          {periodeBerjalan && (
          <>
          <div>
            <Select
              label="Status Pengisian KRS"
              options={STATUS_KRS_OPTIONS}
              value={drawerStatusKrs}
              onChange={(val) => setDrawerStatusKrs(String(val || ''))}
            />
          </div>

          <div>
            <Select
              label="Status Keuangan (SIKEU)"
              options={STATUS_KEUANGAN_OPTIONS}
              value={drawerStatusKeuangan}
              onChange={(val) => setDrawerStatusKeuangan(String(val || ''))}
            />
          </div>

          <div>
            <Select
              label="Kategori Progres KRS"
              options={PROGRES_OPTIONS}
              value={drawerProgresKrs}
              onChange={(val) => setDrawerProgresKrs(String(val || ''))}
            />
          </div>
          </>
          )}
        </div>
      </Drawer>
    </div>
  );
}
