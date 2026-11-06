'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Filter, MoreVertical, Calendar } from 'lucide-react';
import { spmbService } from '@/services/spmb.service';
import { GelombangPenerimaan, JalurMasuk } from '@/types/spmb.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PeriodeTanggalInput } from '@/components/spmb/PeriodeTanggalInput';
import { useRouter } from 'next/navigation';

function formatPeriodeTanggal(value?: string | null): string {
  const match = value?.match(/^(\d{2})-(\d{2})$/);
  if (match) return `${match[2]}/${match[1]}`;
  return value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) : '-';
}

export default function MasterGelombangPage() {
  const router = useRouter();
  const [data, setData] = useState<GelombangPenerimaan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [jalurList, setJalurList] = useState<JalurMasuk[]>([]);
  const [loading, setLoading] = useState(false);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filter drawer & form state (1:1 parity with 6 table information columns)
  const [showFilter, setShowFilter] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterJalur, setFilterJalur] = useState('');
  const [filterTanggalBuka, setFilterTanggalBuka] = useState('');
  const [filterTanggalTutup, setFilterTanggalTutup] = useState('');
  const [filterKuota, setFilterKuota] = useState('');
  const [filterBiaya, setFilterBiaya] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('id');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    jalur: '',
    tanggalBuka: '',
    tanggalTutup: '',
    kuota: '',
    biaya: '',
    status: '',
    orderBy: 'id',
    orderDir: 'desc' as 'asc' | 'desc',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await spmbService.getGelombang({
        page,
        per_page: perPage,
        nama: appliedFilters.name || undefined,
        jalur_masuk_id: appliedFilters.jalur || undefined,
        tanggal_buka: appliedFilters.tanggalBuka || undefined,
        tanggal_tutup: appliedFilters.tanggalTutup || undefined,
        kuota: appliedFilters.kuota || undefined,
        biaya: appliedFilters.biaya || undefined,
        status: appliedFilters.status || undefined,
        sort_by: appliedFilters.orderBy,
        sort_dir: appliedFilters.orderDir,
      });

      if (res.meta) {
        setData(res.data);
        setMeta(res.meta);
      } else {
        setData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal memuat data gelombang');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, appliedFilters]);

  const fetchJalur = async () => {
    try {
      const res = await spmbService.getJalurMasuk();
      setJalurList(res.data.filter((j: any) => j.is_active));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchJalur();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | null; label?: string }>({
    isOpen: false,
    id: null,
    label: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenDelete = (row: any) => {
    setDeleteModal({
      isOpen: true,
      id: row.id,
      label: row.nama,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    try {
      setDeleteLoading(true);
      await spmbService.deleteGelombang(deleteModal.id);
      toast.success(`Gelombang "${deleteModal.label || ''}" berhasil dihapus`);
      setDeleteModal({ isOpen: false, id: null, label: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus data');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetFilter = () => {
    setFilterName('');
    setFilterJalur('');
    setFilterTanggalBuka('');
    setFilterTanggalTutup('');
    setFilterKuota('');
    setFilterBiaya('');
    setFilterStatus('');
    setFilterOrderBy('id');
    setFilterOrderDir('desc');
    setAppliedFilters({
      name: '',
      jalur: '',
      tanggalBuka: '',
      tanggalTutup: '',
      kuota: '',
      biaya: '',
      status: '',
      orderBy: 'id',
      orderDir: 'desc',
    });
    setPage(1);
    setShowFilter(false);
  };

  const handleApplyFilter = () => {
    setAppliedFilters({
      name: filterName,
      jalur: filterJalur,
      tanggalBuka: filterTanggalBuka,
      tanggalTutup: filterTanggalTutup,
      kuota: filterKuota,
      biaya: filterBiaya,
      status: filterStatus,
      orderBy: filterOrderBy,
      orderDir: filterOrderDir,
    });
    setPage(1);
    setShowFilter(false);
  };

  const hasActiveFilter = Boolean(
    appliedFilters.name ||
    appliedFilters.jalur ||
    appliedFilters.tanggalBuka ||
    appliedFilters.tanggalTutup ||
    appliedFilters.kuota ||
    appliedFilters.biaya ||
    appliedFilters.status ||
    appliedFilters.orderBy !== 'id' ||
    appliedFilters.orderDir !== 'desc'
  );

  const columns: ColumnDef<GelombangPenerimaan>[] = [
    {
      key: 'nama',
      label: 'Nama Gelombang',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 text-xs">{row.nama}</span>
          <span className="text-2xs text-slate-500">ID #{row.id}</span>
        </div>
      ),
    },
    {
      key: 'jalur',
      label: 'Jalur Masuk',
      render: (row) => (
        <span className="font-medium text-slate-800 text-xs">
          {row.jalur_masuk?.nama || '-'}
        </span>
      ),
    },
    {
      key: 'tanggal',
      label: 'Periode Pendaftaran',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700">
          <Calendar size={13} className="text-slate-400 shrink-0" />
          <span>
            {formatPeriodeTanggal(row.tanggal_buka)}{' '}
            -{' '}
            {formatPeriodeTanggal(row.tanggal_tutup)}
          </span>
        </div>
      ),
    },
    {
      key: 'kuota_total',
      label: 'Kuota',
      render: (row) => {
        const terisi = row.kuota_terisi || 0;
        const totalKuota = row.kuota_total || 0;
        const sisa = Math.max(0, totalKuota - terisi);
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs">
              {terisi} / {totalKuota} Pendaftar
            </span>
            <span className="text-2xs text-slate-500">
              {sisa > 0 ? `Tersedia ${sisa} kuota` : 'Kuota Penuh'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'biaya_pendaftaran',
      label: 'Biaya Pendaftaran',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-900 text-xs">
            Rp {(Number(row.biaya_pendaftaran) || 0).toLocaleString('id-ID')}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => {
        const statusMap: Record<string, { variant: 'gray' | 'green' | 'amber' | 'blue'; label: string }> = {
          draft: { variant: 'gray', label: 'Draft' },
          aktif: { variant: 'green', label: 'Aktif' },
          ditutup: { variant: 'amber', label: 'Ditutup' },
          selesai: { variant: 'blue', label: 'Selesai' },
        };
        const config = row.status === 'aktif'
          ? row.pendaftaran_dibuka
            ? { variant: 'green' as const, label: 'Sedang Dibuka' }
            : { variant: 'amber' as const, label: 'Di luar periode' }
          : statusMap[row.status] || { variant: 'gray' as const, label: row.status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <DropdownMenu
          triggerIcon={<MoreVertical size={16} />}
          items={[
            {
              label: 'Edit',
              icon: <Edit size={14} />,
              onClick: () => router.push(`/spmb/master/gelombang/${row.id}/edit`),
            },
            {
              label: 'Hapus',
              icon: <Trash2 size={14} />,
              variant: 'danger',
              onClick: () => handleOpenDelete(row),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Master Gelombang"
        description="Kelola jadwal dan gelombang pendaftaran SPMB"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              onClick={() => setShowFilter(true)}
            >
              Filter {hasActiveFilter ? '•' : ''}
            </Button>
            <Button
              icon={<Plus size={16} />}
              onClick={() => router.push('/spmb/master/gelombang/create')}
            >
              Tambah Gelombang
            </Button>
          </div>
        }
      />

      <DataTable
        data={data}
        isLoading={loading}
        meta={meta}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setPerPage(l);
          setPage(1);
        }}
        columns={columns}
      />

      <Drawer
        position="right"
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Gelombang"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* 1. Nama Gelombang */}
          <Input
            label="Nama Gelombang"
            placeholder="Cari nama gelombang..."
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />

          {/* 2. Jalur Masuk */}
          <Select
            label="Jalur Masuk"
            value={filterJalur}
            onChange={(val) => setFilterJalur(val)}
            options={[
              { value: '', label: 'Semua Jalur' },
              ...jalurList.map((j) => ({ value: j.id.toString(), label: j.nama })),
            ]}
          />

          {/* 3. Periode Pendaftaran (Tanggal Buka & Tutup) */}
          <div className="grid grid-cols-1 gap-4">
            <PeriodeTanggalInput
              label="Periode Buka (Mulai)"
              value={filterTanggalBuka}
              onChange={setFilterTanggalBuka}
            />
            <PeriodeTanggalInput
              label="Periode Tutup (Sampai)"
              value={filterTanggalTutup}
              onChange={setFilterTanggalTutup}
            />
          </div>

          {/* 4. Kuota */}
          <Select
            label="Status Kuota"
            value={filterKuota}
            onChange={(val) => setFilterKuota(val)}
            options={[
              { value: '', label: 'Semua Status Kuota' },
              { value: 'tersedia', label: 'Masih Tersedia' },
              { value: 'penuh', label: 'Kuota Penuh' },
            ]}
          />

          {/* 5. Biaya Pendaftaran */}
          <Select
            label="Biaya Pendaftaran"
            value={filterBiaya}
            onChange={(val) => setFilterBiaya(val)}
            options={[
              { value: '', label: 'Semua Biaya' },
              { value: 'gratis', label: 'Gratis (Rp 0)' },
              { value: 'berbayar', label: 'Berbayar (> Rp 0)' },
            ]}
          />

          {/* 6. Status Gelombang */}
          <Select
            label="Status Gelombang"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'aktif', label: 'Aktif' },
              { value: 'ditutup', label: 'Ditutup' },
              { value: 'selesai', label: 'Selesai' },
            ]}
          />

          <hr className="border-slate-200" />

          {/* Comprehensive Sorting Grid 2 Kolom */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'id', label: 'ID Gelombang' },
                { value: 'nama', label: 'Nama Gelombang' },
                { value: 'jalur_masuk_id', label: 'Jalur Masuk' },
                { value: 'tanggal_buka', label: 'Tanggal Buka' },
                { value: 'tanggal_tutup', label: 'Tanggal Tutup' },
                { value: 'kuota_total', label: 'Kuota Total' },
                { value: 'biaya_pendaftaran', label: 'Biaya Pendaftaran' },
                { value: 'status', label: 'Status' },
              ]}
            />

            <Select
              label="Arah Urutan"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Z - A (Terbaru)' },
                { value: 'asc', label: 'A - Z (Terlama)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => !deleteLoading && setDeleteModal({ isOpen: false, id: null, label: '' })}
        onConfirm={handleConfirmDelete}
        isLoading={deleteLoading}
        title="Hapus Gelombang"
        message={
          <span>
            Apakah Anda yakin ingin menghapus gelombang <strong>&quot;{deleteModal.label}&quot;</strong>?
            Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmText="Ya, Hapus"
        cancelText="Batal"
      />
    </div>
  );
}
