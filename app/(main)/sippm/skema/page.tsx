'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Filter, Layers, ShieldAlert, Edit, Trash2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { sippmService } from '@/services/sippm.service';
import type { SkemaKegiatan } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import { useAuth } from '@/hooks/useAuth';

const skemaSchema = z.object({
  nama_skema: z.string().min(3, 'Nama skema minimal 3 karakter'),
  kode_skema: z.string().min(2, 'Kode skema minimal 2 karakter'),
  jenis_kegiatan: z.enum(['penelitian', 'pengabdian'] as const),
  kategori_skema: z.enum(['dasar', 'terapan', 'pengembangan'] as const),
  maksimal_dana: z.number().min(1000000, 'Dana minimal Rp 1.000.000'),
});

type SkemaFormValues = z.infer<typeof skemaSchema>;

export default function MasterSkemaPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('sippm.skema.read') || hasPermission('sippm.skema.manage');
  const canCreate = hasPermission('sippm.skema.create') || hasPermission('sippm.skema.manage');

  const [loading, setLoading] = useState(true);
  const [skemaList, setSkemaList] = useState<SkemaKegiatan[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();

  // Filter Drawer & Pagination state
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SkemaKegiatan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SkemaFormValues>({
    resolver: zodResolver(skemaSchema),
    defaultValues: {
      nama_skema: '',
      kode_skema: '',
      jenis_kegiatan: 'penelitian',
      kategori_skema: 'terapan',
      maksimal_dana: 25000000,
    },
  });

  const fetchSkema = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        search: search || undefined,
        jenis_kegiatan: filterJenis || undefined,
        kategori_skema: filterKategori || undefined,
        orderBy: filterOrderBy,
        orderDir: filterOrderDir,
      };

      const res: any = await sippmService.indexSkema(params);
      if (res?.data) {
        const dataItems = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];
        setSkemaList(dataItems);
        if (res.data.meta) setMeta(res.data.meta);
        else if (res.meta) setMeta(res.meta);
      } else if (Array.isArray(res)) {
        setSkemaList(res);
      } else {
        setSkemaList([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat skema kegiatan');
      setSkemaList([]);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, search, filterJenis, filterKategori, filterOrderBy, filterOrderDir]);

  useEffect(() => {
    fetchSkema();
  }, [fetchSkema]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    reset({
      nama_skema: '',
      kode_skema: '',
      jenis_kegiatan: 'penelitian',
      kategori_skema: 'terapan',
      maksimal_dana: 25000000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: SkemaKegiatan) => {
    setEditingItem(item);
    reset({
      nama_skema: item.nama || item.nama_skema || '',
      kode_skema: item.kode || item.kode_skema || '',
      jenis_kegiatan: (item.tipe || item.jenis_kegiatan || 'penelitian') as any,
      kategori_skema: (item.sumber_dana || item.kategori_skema || 'terapan') as any,
      maksimal_dana: Number(item.maksimal_anggaran || item.maksimal_dana || 25000000),
    });
    setIsModalOpen(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      await sippmService.destroySkema(deleteConfirmId);
      toast.success('Skema kegiatan berhasil dihapus');
      fetchSkema();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus skema kegiatan');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const onSubmit = async (data: SkemaFormValues) => {
    if (!canCreate) {
      toast.error('Akses Ditolak: Anda tidak memiliki permission mengelola skema.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await sippmService.updateSkema(editingItem.id, data);
        toast.success('Skema kegiatan berhasil diperbarui');
      } else {
        await sippmService.storeSkema(data);
        toast.success('Skema kegiatan baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      reset();
      fetchSkema();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan skema kegiatan');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const columns: ColumnDef<SkemaKegiatan>[] = [
    {
      key: 'kode_skema',
      label: 'Kode',
      render: (row) => (
        <span className="font-mono text-xs font-bold">{row.kode || row.kode_skema || 'SKM'}</span>
      ),
    },
    {
      key: 'nama_skema',
      label: 'Nama Skema',
      render: (row) => <span className="font-bold">{row.nama || row.nama_skema || '-'}</span>,
    },
    {
      key: 'jenis_kegiatan',
      label: 'Jenis Kegiatan',
      render: (row) => {
        const jenis = row.tipe || row.jenis_kegiatan || 'penelitian';
        return (
          <Badge variant={jenis === 'penelitian' ? 'blue' : 'success'}>
            {jenis.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'kategori_skema',
      label: 'Kategori',
      render: (row) => {
        const kat = row.sumber_dana || row.kategori_skema || 'internal';
        return <span className="capitalize font-medium opacity-80">{kat.replace(/_/g, ' ')}</span>;
      },
    },
    {
      key: 'maksimal_dana',
      label: 'Maksimal Dana',
      render: (row) => (
        <span className="font-bold">{formatRupiah(Number(row.maksimal_anggaran || row.maksimal_dana || 0))}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.is_active !== false ? 'success' : 'gray'}>
          {row.is_active !== false ? 'Aktif' : 'Non-Aktif'}
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row) => {
        const menuItems: DropdownMenuItem[] = [
          {
            label: 'Edit Skema',
            icon: <Edit size={14} />,
            onClick: () => handleOpenEditModal(row),
          },
          {
            label: 'Hapus Skema',
            icon: <Trash2 size={14} />,
            variant: 'danger',
            onClick: () => handleDelete(row.id),
          },
        ];

        return (
          <div className="flex justify-end">
            <DropdownMenu items={menuItems} />
          </div>
        );
      },
    },
  ];

  if (!canRead) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Master Skema Kegiatan"
          description="Kelola skema hibah penelitian & pengabdian masyarakat beserta pagu maksimal dana"
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk melihat Master Skema Kegiatan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Master Skema Kegiatan"
        description="Kelola skema hibah penelitian & pengabdian masyarakat beserta pagu maksimal dana"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {canCreate && (
              <Button icon={<Plus size={16} />} onClick={handleOpenCreateModal}>
                Tambah Skema Baru
              </Button>
            )}
          </div>
        }
      />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={skemaList}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage={
          <div className="py-8 text-center opacity-70">
            <Layers size={48} className="mx-auto mb-4 opacity-40" />
            <p>Belum ada skema kegiatan terdaftar.</p>
          </div>
        }
      />

      {/* Filter Drawer Slide Right-to-Left */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Skema Kegiatan"
      >
        <div className="space-y-4">
          <Input
            label="Pencarian Skema / Kode"
            placeholder="Cari skema atau kode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            label="Filter Jenis Kegiatan"
            value={filterJenis}
            onChange={(val) => {
              setFilterJenis(val);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Semua Jenis' },
              { value: 'penelitian', label: 'Penelitian' },
              { value: 'pengabdian', label: 'Pengabdian Masyarakat' },
            ]}
          />

          <Select
            label="Filter Kategori Skema"
            value={filterKategori}
            onChange={(val) => {
              setFilterKategori(val);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Semua Kategori' },
              { value: 'dasar', label: 'Dasar' },
              { value: 'terapan', label: 'Terapan' },
              { value: 'pengembangan', label: 'Pengembangan' },
            ]}
          />

          <hr className="my-2" />

          {/* Grid 2 Kolom Sorting */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'created_at', label: 'Tanggal Dibuat' },
                { value: 'kode_skema', label: 'Kode Skema' },
                { value: 'nama_skema', label: 'Nama Skema' },
                { value: 'maksimal_dana', label: 'Maksimal Dana' },
              ]}
            />

            <Select
              label="Arah Pengurutan"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val as 'asc' | 'desc')}
              options={[
                { value: 'desc', label: 'Mundur (DESC)' },
                { value: 'asc', label: 'Maju (ASC)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* Modal Form <= 5 inputs (Grid 2 Kolom per Admin CRUD Rule 8) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Skema Kegiatan' : 'Tambah Skema Kegiatan Baru'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              loading={submitting}
              disabled={submitting}
            >
              {editingItem ? 'Simpan Perubahan' : 'Simpan Skema'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Kode Skema"
              required
              placeholder="Misal: SKM-PD"
              error={errors.kode_skema?.message}
              {...register('kode_skema')}
            />

            <Input
              label="Maksimal Dana (Rp)"
              type="number"
              required
              placeholder="25000000"
              error={errors.maksimal_dana?.message}
              {...register('maksimal_dana', { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Nama Skema Kegiatan"
            required
            placeholder="Misal: Penelitian Dasar Dosen Pemula"
            error={errors.nama_skema?.message}
            {...register('nama_skema')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Jenis Kegiatan"
              required
              value={watch('jenis_kegiatan')}
              onChange={(val) => setValue('jenis_kegiatan', val as any)}
              options={[
                { value: 'penelitian', label: 'Penelitian' },
                { value: 'pengabdian', label: 'Pengabdian Masyarakat' },
              ]}
              error={errors.jenis_kegiatan?.message}
            />

            <Select
              label="Kategori Skema"
              required
              value={watch('kategori_skema')}
              onChange={(val) => setValue('kategori_skema', val as any)}
              options={[
                { value: 'dasar', label: 'Dasar' },
                { value: 'terapan', label: 'Terapan' },
                { value: 'pengembangan', label: 'Pengembangan' },
              ]}
              error={errors.kategori_skema?.message}
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={executeDelete}
        title="Konfirmasi Hapus Skema Kegiatan"
        message="Apakah Anda yakin ingin menghapus skema kegiatan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
