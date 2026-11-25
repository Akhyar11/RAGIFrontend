'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { siakadService } from '@/services/siakad.service';
import { formatTahunAkademikLabel } from '@/lib/obe-settings';
import {
  KRS_STATUS_OPTIONS,
  KRS_LIST_SORT_BY_OPTIONS,
  SORT_DIRECTION_OPTIONS,
} from '@/lib/constants/siakad.constant';
import type { PaginationMeta } from '@/types/api.types';

export const KRS_STATUS_BADGE: Record<string, { label: string; variant: 'green' | 'amber' | 'blue' | 'red' | 'gray' }> = {
  draft: { label: 'Draft', variant: 'gray' },
  diajukan: { label: 'Menunggu DPA', variant: 'amber' },
  disetujui: { label: 'Disetujui', variant: 'green' },
  dikunci: { label: 'Dikunci', variant: 'blue' },
  ditolak: { label: 'Ditolak', variant: 'red' },
};

interface Option {
  value: number;
  label: string;
}

export function KrsAdminList() {
  const router = useRouter();

  // Filter yang sedang berlaku
  const [taId, setTaId] = useState<number | null>(null);
  const [prodiId, setProdiId] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [sksMin, setSksMin] = useState('');
  const [sksMax, setSksMax] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Nilai sementara di dalam drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dTa, setDTa] = useState<Option | null>(null);
  const [dProdi, setDProdi] = useState<Option | null>(null);
  const [dStatus, setDStatus] = useState('');
  const [dAngkatan, setDAngkatan] = useState('');
  const [dSksMin, setDSksMin] = useState('');
  const [dSksMax, setDSksMax] = useState('');
  const [dSearch, setDSearch] = useState('');
  const [dSortBy, setDSortBy] = useState('created_at');
  const [dSortOrder, setDSortOrder] = useState('desc');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await siakadService.getKrs({
        page,
        per_page: limit,
        tahun_akademik_id: taId || undefined,
        program_studi_id: prodiId || undefined,
        status: status || undefined,
        angkatan: angkatan || undefined,
        sks_min: sksMin || undefined,
        sks_max: sksMax || undefined,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setMeta(res?.meta as PaginationMeta | undefined);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat daftar KRS');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, taId, prodiId, status, angkatan, sksMin, sksMax, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const loadTahunAkademikOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getTahunAkademiks({ search: keyword || undefined, per_page: 50 });
      const list: any[] = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
      return list.map((ta) => ({
        value: Number(ta.id),
        label: `${formatTahunAkademikLabel(ta)}${ta.is_active ? ' • (Aktif)' : ''}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadProdiOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getProdi({ search: keyword || undefined });
      const list: any[] = Array.isArray(res?.data) ? res.data : res?.data?.items || [];
      return list.map((p) => ({ value: Number(p.id), label: `${p.nama}${p.jenjang ? ` (${p.jenjang})` : ''}` }));
    } catch {
      return [];
    }
  }, []);

  const openDrawer = () => {
    setDSearch(search);
    setDStatus(status);
    setDAngkatan(angkatan);
    setDSksMin(sksMin);
    setDSksMax(sksMax);
    setDSortBy(sortBy);
    setDSortOrder(sortOrder);
    setDrawerOpen(true);
  };

  const applyFilter = () => {
    setTaId(dTa?.value ?? null);
    setProdiId(dProdi?.value ?? null);
    setStatus(dStatus);
    setAngkatan(dAngkatan.trim());
    setSksMin(dSksMin.trim());
    setSksMax(dSksMax.trim());
    setSearch(dSearch.trim());
    setSortBy(dSortBy);
    setSortOrder(dSortOrder);
    setPage(1);
    setDrawerOpen(false);
  };

  const resetFilter = () => {
    setDTa(null);
    setDProdi(null);
    setDStatus('');
    setDAngkatan('');
    setDSksMin('');
    setDSksMax('');
    setDSearch('');
    setDSortBy('created_at');
    setDSortOrder('desc');
    setTaId(null);
    setProdiId(null);
    setStatus('');
    setAngkatan('');
    setSksMin('');
    setSksMax('');
    setSearch('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
    setDrawerOpen(false);
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'no',
      label: 'NO',
      align: 'center',
      render: (_row, index) => (
        <span className="font-bold text-slate-400 text-xs">{meta?.from ? meta.from + index : index + 1}</span>
      ),
    },
    {
      key: 'mahasiswa',
      label: 'MAHASISWA',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.mahasiswa?.nama_lengkap || '-'}</span>
          <span className="font-mono text-2xs text-slate-500">{row.mahasiswa?.nim || '-'}</span>
        </div>
      ),
    },
    {
      key: 'prodi',
      label: 'PROGRAM STUDI',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-800 block">{row.mahasiswa?.program_studi?.nama || '-'}</span>
          <span className="text-2xs text-slate-500">Angkatan {row.mahasiswa?.angkatan || '-'}</span>
        </div>
      ),
    },
    {
      key: 'periode',
      label: 'PERIODE',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-800 block">{formatTahunAkademikLabel(row.tahun_akademik) || '-'}</span>
          <span className="font-mono text-2xs text-slate-500">{row.tahun_akademik?.kode || ''}</span>
        </div>
      ),
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-xs block">{row.total_sks_diambil ?? 0}</span>
          <span className="text-2xs text-slate-500">{(row.krs_details || []).length} MK</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => {
        const meta = KRS_STATUS_BADGE[row.status] || { label: row.status || '-', variant: 'gray' as const };
        return (
          <Badge variant={meta.variant} className="text-2xs font-semibold">
            {meta.label}
          </Badge>
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
              label: 'Lihat Detail',
              icon: <Eye size={14} />,
              onClick: () => router.push(`/siakad/krs/${row.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kartu Rencana Studi (KRS)"
        description="Daftar KRS seluruh mahasiswa per periode akademik, termasuk data historis hasil sinkronisasi PDDIKTI."
        breadcrumbs={[
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'KRS' },
        ]}
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
        emptyMessage="Belum ada KRS yang sesuai filter."
      />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filter KRS"
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
            value={dSearch}
            onChange={(e) => setDSearch(e.target.value)}
          />
          <AsyncSelect
            label="Tahun Akademik"
            placeholder="Semua periode..."
            loadOptions={loadTahunAkademikOptions}
            value={dTa}
            onChange={(opt: any) => setDTa(opt?.value ? { value: Number(opt.value), label: opt.label } : null)}
            isClearable
            defaultOptions
          />
          <AsyncSelect
            label="Program Studi"
            placeholder="Semua program studi..."
            loadOptions={loadProdiOptions}
            value={dProdi}
            onChange={(opt: any) => setDProdi(opt?.value ? { value: Number(opt.value), label: opt.label } : null)}
            isClearable
            defaultOptions
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Angkatan"
              placeholder="Mis. 2023"
              value={dAngkatan}
              onChange={(e) => setDAngkatan(e.target.value)}
            />
            <Select
              label="Status"
              options={KRS_STATUS_OPTIONS}
              value={dStatus}
              onChange={(v) => setDStatus(String(v || ''))}
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

          <div className="border-t border-slate-200 my-2" aria-hidden="true" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              options={KRS_LIST_SORT_BY_OPTIONS}
              value={dSortBy}
              onChange={(v) => setDSortBy(String(v || 'created_at'))}
            />
            <Select
              label="Arah"
              options={SORT_DIRECTION_OPTIONS}
              value={dSortOrder}
              onChange={(v) => setDSortOrder(String(v || 'desc'))}
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
