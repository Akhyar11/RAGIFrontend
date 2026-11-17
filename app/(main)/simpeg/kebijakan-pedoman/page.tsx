'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { simpegKebijakanPedomanService } from '@/services/simpeg.kebijakan-pedoman.service';
import { useAuth } from '@/hooks/useAuth';
import type {
  KebijakanPedoman,
  MasterKategoriKebijakan,
} from '@/types/simpeg.kebijakan-pedoman.types';
import type { PaginationMeta } from '@/types/api.types';

export default function KebijakanPedomanListPage() {
  const router = useRouter();
  const { isAdmin, hasPermission } = useAuth();
  const canCreate =
    isAdmin ||
    hasPermission('simpeg.kebijakan_pedoman.create') ||
    hasPermission('simpeg.kebijakan_pedoman.manage');
  const canUpdate =
    isAdmin ||
    hasPermission('simpeg.kebijakan_pedoman.update') ||
    hasPermission('simpeg.kebijakan_pedoman.manage');
  const canDelete =
    isAdmin ||
    hasPermission('simpeg.kebijakan_pedoman.delete') ||
    hasPermission('simpeg.kebijakan_pedoman.manage');

  const [items, setItems] = useState<KebijakanPedoman[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [masters, setMasters] = useState<MasterKategoriKebijakan[]>([]);

  // Filter Drawer State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tahunFilter, setTahunFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Delete Confirm Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KebijakanPedoman | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load masters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const res = await simpegKebijakanPedomanService.getMasters();
        if (res.status === 'success' && res.data) {
          setMasters(res.data);
        }
      } catch (err: any) {
        console.error('Gagal memuat master kategori kebijakan', err);
      }
    };
    loadMasters();
  }, []);

  // Fetch data list
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        per_page: 15,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (search) params.search = search;
      if (kategoriFilter) params.kategori_kebijakan_id = kategoriFilter;
      if (statusFilter !== '') params.is_active = statusFilter;
      if (tahunFilter) params.tahun = tahunFilter;

      const res = await simpegKebijakanPedomanService.getList(params);
      if (res.status === 'success' && res.data) {
        setItems(res.data);
        setMeta((res as any).meta || null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat daftar kebijakan');
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, sortOrder, search, kategoriFilter, statusFilter, tahunFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilter = () => {
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setSearch('');
    setKategoriFilter('');
    setStatusFilter('');
    setTahunFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
    setIsFilterOpen(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await simpegKebijakanPedomanService.delete(itemToDelete.id);
      toast.success('Kebijakan dan pedoman berhasil dihapus');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus kebijakan');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<KebijakanPedoman>[] = [
    {
      key: 'nomor_surat',
      label: 'NOMOR & TGL PENETAPAN',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-xs text-slate-800">
            {row.nomor_surat}
          </span>
          <span className="flex items-center gap-1 text-2xs text-slate-500">
            <Calendar size={11} className="text-slate-400" />
            {row.tanggal_penetapan}
          </span>
        </div>
      ),
    },
    {
      key: 'judul',
      label: 'JUDUL KEBIJAKAN',
      render: (row) => (
        <div className="flex flex-col gap-0.5 max-w-sm">
          <span className="font-medium text-xs text-slate-900 line-clamp-1">
            {row.judul}
          </span>
          <span className="text-2xs text-slate-500 line-clamp-1">
            {row.deskripsi || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'kategori',
      label: 'KATEGORI',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {row.kategori?.nama || '-'}
        </span>
      ),
    },
    {
      key: 'pejabat_penetap',
      label: 'PEJABAT PENETAP',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.pejabat_penetap}
        </span>
      ),
    },
    {
      key: 'masa_berlaku',
      label: 'MASA BERLAKU',
      render: (row) => (
        <div className="flex flex-col gap-0.5 text-xs text-slate-700">
          <span>Mulai: {row.tanggal_berlaku}</span>
          <span className="text-2xs text-slate-500">
            {row.tanggal_berakhir
              ? `Sampai: ${row.tanggal_berakhir}`
              : 'Tanpa batas akhir'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => (
        <Badge
          variant={row.is_active ? 'success' : 'gray'}
          className="text-2xs px-2 py-0.5"
        >
          {row.is_active ? 'Aktif' : 'Tidak Aktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'AKSI',
      align: 'right',
      render: (row) => {
        const menuItems: DropdownMenuItem[] = [
          {
            label: 'Lihat Detail',
            icon: <Eye size={14} />,
            onClick: () => {
              router.push(`/simpeg/kebijakan-pedoman/${row.id}`);
            },
          },
        ];

        if (row.file_dokumen_url) {
          menuItems.push({
            label: 'Unduh Dokumen PDF',
            icon: <Download size={14} />,
            onClick: () => {
              window.open(row.file_dokumen_url as string, '_blank');
            },
          });
        }

        if (canUpdate) {
          menuItems.push({
            label: 'Ubah Data',
            icon: <Pencil size={14} />,
            onClick: () => {
              router.push(`/simpeg/kebijakan-pedoman/${row.id}/edit`);
            },
          });
        }

        if (canDelete) {
          menuItems.push({
            label: 'Hapus Kebijakan',
            icon: <Trash2 size={14} className="text-red-500" />,
            variant: 'danger',
            onClick: () => {
              setItemToDelete(row);
              setDeleteDialogOpen(true);
            },
          });
        }

        return <DropdownMenu items={menuItems} />;
      },
    },
  ];

  return (
    <div className="w-full flex-col gap-4 space-y-4">
      <PageHeader
        title="Kebijakan & Pedoman"
        description="Repositori kebijakan, pedoman, standar operasional prosedur (SOP), dan regulasi kepegawaian institusi terintegrasi dengan modul Arsip"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen(true)}
              className="border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
            >
              <Filter size={16} />
              Filter
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                onClick={() => router.push('/simpeg/kebijakan-pedoman/create')}
                className="bg-[var(--module-primary)] text-white hover:opacity-90"
              >
                <Plus size={16} />
                Tambah Kebijakan
              </Button>
            )}
          </div>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          meta={meta || undefined}
          onPageChange={(p) => setPage(p)}
          emptyMessage="Belum ada kebijakan dan pedoman yang terdaftar"
        />
      </div>

      {/* Filter Drawer */}
      <Drawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Kebijakan & Pedoman"
      >
        <div className="space-y-4 p-4 text-xs">
          <Input
            label="Pencarian"
            placeholder="Cari nomor surat, judul, pejabat, keterangan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            label="Kategori Kebijakan"
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            options={[
              { value: '', label: 'Semua Kategori' },
              ...masters.map((m) => ({
                value: m.id.toString(),
                label: `${m.kode} - ${m.nama}`,
              })),
            ]}
          />

          <Select
            label="Status Keberlakuan"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Tidak Aktif' },
            ]}
          />

          <Input
            label="Tahun Penetapan"
            type="number"
            placeholder="Contoh: 2026"
            value={tahunFilter}
            onChange={(e) => setTahunFilter(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Urutkan Berdasarkan"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'created_at', label: 'Waktu Input' },
                { value: 'tanggal_penetapan', label: 'Tgl Penetapan' },
                { value: 'tanggal_berlaku', label: 'Tgl Berlaku' },
                { value: 'judul', label: 'Judul' },
                { value: 'nomor_surat', label: 'Nomor Surat' },
              ]}
            />
            <Select
              label="Arah Urutan"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Menurun (Z-A / Baru)' },
                { value: 'asc', label: 'Menaik (A-Z / Lama)' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleResetFilter}
            >
              Reset Filter
            </Button>
            <Button
              variant="primary"
              className="flex-1 bg-[var(--module-primary)] text-white hover:opacity-90"
              onClick={handleApplyFilter}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Kebijakan & Pedoman"
        message={`Apakah Anda yakin ingin menghapus kebijakan "${itemToDelete?.judul}" (${itemToDelete?.nomor_surat})? Dokumen ini akan dinonaktifkan.`}
        confirmText="Hapus Kebijakan"
        cancelText="Batal"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
