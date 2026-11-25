'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { siakadService } from '@/services/siakad.service';
import { formatTahunAkademikLabel } from '@/lib/obe-settings';
import {
  KRS_MONITORING_MAHASISWA_STATUS_OPTIONS,
  KRS_MONITORING_PRODI_SORT_BY_OPTIONS,
  KRS_KEUANGAN_FILTER_OPTIONS,
  SORT_DIRECTION_OPTIONS,
} from '@/lib/constants/siakad.constant';
import type { PaginationMeta } from '@/types/api.types';

const STATUS_KRS: Record<string, { label: string; variant: 'gray' | 'amber' | 'green' | 'blue' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  diajukan: { label: 'Menunggu DPA', variant: 'amber' },
  disetujui: { label: 'Disetujui', variant: 'green' },
  dikunci: { label: 'Dikunci', variant: 'blue' },
};

function DaftarMahasiswaKrs() {
  const params = useParams<{ prodiId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const taId = search.get('ta');

  const [prodiNama, setProdiNama] = useState('');
  const [periodeNama, setPeriodeNama] = useState('');
  const [periodeBerjalan, setPeriodeBerjalan] = useState<boolean | null>(null);

  // Filter berlaku vs nilai sementara di drawer
  const [status, setStatus] = useState('belum');
  const [angkatan, setAngkatan] = useState('');
  const [keuangan, setKeuangan] = useState('');
  const [sksMin, setSksMin] = useState('');
  const [sksMax, setSksMax] = useState('');
  const [cari, setCari] = useState('');
  const [sortBy, setSortBy] = useState('nim');
  const [sortOrder, setSortOrder] = useState('asc');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dStatus, setDStatus] = useState('belum');
  const [dAngkatan, setDAngkatan] = useState('');
  const [dKeuangan, setDKeuangan] = useState('');
  const [dSksMin, setDSksMin] = useState('');
  const [dSksMax, setDSksMax] = useState('');
  const [dCari, setDCari] = useState('');
  const [dSortBy, setDSortBy] = useState('nim');
  const [dSortOrder, setDSortOrder] = useState('asc');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    siakadService
      .getProdiById(Number(params.prodiId))
      .then((res) => {
        const p = res?.data;
        if (p) setProdiNama(`${p.nama}${p.jenjang ? ` (${p.jenjang})` : ''}`);
      })
      .catch(() => {});
  }, [params.prodiId]);

  // Periode lampau tidak punya "belum mengisi": otomatis menampilkan semua.
  const statusEfektif = periodeBerjalan === false && status === 'belum' ? '' : status;

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await siakadService.getKrsMonitoringMahasiswa({
        tahun_akademik_id: taId || undefined,
        program_studi_id: params.prodiId,
        status_krs: statusEfektif || undefined,
        angkatan: angkatan || undefined,
        terkunci_keuangan: keuangan || undefined,
        sks_min: sksMin || undefined,
        sks_max: sksMax || undefined,
        search: cari || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        per_page: limit,
      });
      setRows(Array.isArray(res?.data?.items) ? res.data.items : []);
      setMeta((res as any)?.meta);
      setPeriodeNama(formatTahunAkademikLabel(res?.data?.tahun_akademik));
      setPeriodeBerjalan(Boolean(res?.data?.periode_berjalan));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat daftar mahasiswa');
    } finally {
      setIsLoading(false);
    }
  }, [taId, params.prodiId, statusEfektif, angkatan, keuangan, sksMin, sksMax, cari, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // "Belum mengisi" hanya bermakna pada periode berjalan.
  const statusOptions = useMemo(
    () =>
      periodeBerjalan === false
        ? KRS_MONITORING_MAHASISWA_STATUS_OPTIONS.filter((o) => o.value !== 'belum')
        : KRS_MONITORING_MAHASISWA_STATUS_OPTIONS,
    [periodeBerjalan]
  );

  const openDrawer = () => {
    setDStatus(statusEfektif);
    setDAngkatan(angkatan);
    setDKeuangan(keuangan);
    setDSksMin(sksMin);
    setDSksMax(sksMax);
    setDCari(cari);
    setDSortBy(sortBy);
    setDSortOrder(sortOrder);
    setDrawerOpen(true);
  };

  const applyFilter = () => {
    setStatus(dStatus);
    setAngkatan(dAngkatan.trim());
    setKeuangan(dKeuangan);
    setSksMin(dSksMin.trim());
    setSksMax(dSksMax.trim());
    setCari(dCari.trim());
    setSortBy(dSortBy);
    setSortOrder(dSortOrder);
    setPage(1);
    setDrawerOpen(false);
  };

  const resetFilter = () => {
    const defStatus = periodeBerjalan === false ? '' : 'belum';
    setDStatus(defStatus);
    setDAngkatan('');
    setDKeuangan('');
    setDSksMin('');
    setDSksMax('');
    setDCari('');
    setDSortBy('nim');
    setDSortOrder('asc');
    setStatus(defStatus);
    setAngkatan('');
    setKeuangan('');
    setSksMin('');
    setSksMax('');
    setCari('');
    setSortBy('nim');
    setSortOrder('asc');
    setPage(1);
    setDrawerOpen(false);
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'mahasiswa',
      label: 'MAHASISWA',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.nama_lengkap}</span>
          <span className="font-mono text-2xs text-slate-500">{row.nim}</span>
        </div>
      ),
    },
    {
      key: 'angkatan',
      label: 'ANGKATAN',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-800 block">{row.angkatan}</span>
          <span className="text-2xs text-slate-500">Semester {row.semester_ke}</span>
        </div>
      ),
    },
    {
      key: 'dosen_wali',
      label: 'DOSEN WALI',
      render: (row) => <span className="text-xs text-slate-700">{row.dosen_wali || '-'}</span>,
    },
    {
      key: 'status_krs',
      label: 'STATUS KRS',
      align: 'center',
      render: (row) => {
        if (!row.krs_status) {
          return <Badge variant="red" className="text-2xs font-semibold">Belum mengisi</Badge>;
        }
        const m = STATUS_KRS[row.krs_status] || { label: row.krs_status, variant: 'gray' as const };
        return <Badge variant={m.variant} className="text-2xs font-semibold">{m.label}</Badge>;
      },
    },
    {
      key: 'isi_krs',
      label: 'ISI KRS',
      align: 'center',
      render: (row) =>
        row.krs_id ? (
          <div>
            <span className="font-mono font-bold text-xs text-slate-900 block">{row.krs_sks} SKS</span>
            <span className="text-2xs text-slate-500">{row.krs_jumlah_mk} mata kuliah</span>
          </div>
        ) : (
          <span className="text-2xs text-slate-400">-</span>
        ),
    },
    {
      key: 'keuangan',
      label: 'KEUANGAN',
      align: 'center',
      render: (row) =>
        row.terkunci_keuangan ? (
          <Badge variant="amber" className="text-2xs font-semibold">Terkunci</Badge>
        ) : (
          <span className="text-2xs text-slate-400">-</span>
        ),
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => (
        <DropdownMenu
          items={[
            {
              label: 'Lihat Rincian',
              icon: <Eye size={14} />,
              onClick: () =>
                router.push(`/siakad/obe/krs/monitoring/mahasiswa/${row.id}${taId ? `?ta=${taId}` : ''}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Mahasiswa ${prodiNama || 'Program Studi'}`}
        description={`Status KRS tiap mahasiswa${periodeNama ? ` pada ${periodeNama}` : ''}. Buka Rincian untuk melihat mata kuliah yang sudah dan belum diambil.`}
        breadcrumbs={[
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Monitoring KRS', href: '/siakad/obe/krs/monitoring' },
          { label: 'Daftar Mahasiswa' },
        ]}
        backUrl="/siakad/obe/krs/monitoring"
        action={
          <Button
            variant="outline"
            size="sm"
            icon={<Filter size={16} />}
            onClick={openDrawer}
            className="text-xs font-bold border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
          >
            Filter
          </Button>
        }
      />

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
        emptyMessage="Tidak ada mahasiswa yang sesuai filter."
      />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filter Mahasiswa"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={resetFilter} className="text-xs">
              Reset
            </Button>
            <Button variant="primary" size="sm" onClick={applyFilter} className="text-xs font-bold">
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Mahasiswa / NIM / Dosen Wali"
            placeholder="Cari nama, NIM, atau dosen wali..."
            value={dCari}
            onChange={(e) => setDCari(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Angkatan"
              placeholder="Mis. 2023"
              value={dAngkatan}
              onChange={(e) => setDAngkatan(e.target.value)}
            />
            <Select
              label="Status KRS"
              options={statusOptions}
              value={dStatus}
              onChange={(v) => setDStatus(String(v ?? ''))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKS Minimal"
              type="number"
              min={0}
              placeholder="Mis. 18"
              value={dSksMin}
              onChange={(e) => setDSksMin(e.target.value)}
            />
            <Input
              label="SKS Maksimal"
              type="number"
              min={0}
              placeholder="Mis. 24"
              value={dSksMax}
              onChange={(e) => setDSksMax(e.target.value)}
            />
          </div>
          <Select
            label="Status Keuangan"
            options={KRS_KEUANGAN_FILTER_OPTIONS}
            value={dKeuangan}
            onChange={(v) => setDKeuangan(String(v ?? ''))}
          />

          <div className="border-t border-slate-200 my-2" aria-hidden="true" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              options={KRS_MONITORING_PRODI_SORT_BY_OPTIONS}
              value={dSortBy}
              onChange={(v) => setDSortBy(String(v || 'nim'))}
            />
            <Select
              label="Arah"
              options={SORT_DIRECTION_OPTIONS}
              value={dSortOrder}
              onChange={(v) => setDSortOrder(String(v || 'asc'))}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}

export default function DaftarMahasiswaKrsPage() {
  return (
    <Suspense fallback={null}>
      <DaftarMahasiswaKrs />
    </Suspense>
  );
}
