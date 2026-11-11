'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Filter, ClipboardList, ShieldAlert, Edit, Trash2, Award, UserCheck, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { sippmService } from '@/services/sippm.service';
import type { RubrikIndikator } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import { useAuth } from '@/hooks/useAuth';

const rubrikSchema = z.object({
  tipe_reviewer: z.enum(['kaprodi', 'admin'] as const),
  nama_indikator: z.string().min(3, 'Nama indikator minimal 3 karakter'),
  deskripsi: z.string().optional().nullable(),
  bobot: z.number().min(1, 'Bobot minimal 1%').max(100, 'Bobot maksimal 100%'),
  skor_minimal_default: z.number().min(0, 'Nilai minimal 0').max(100, 'Nilai maksimal 100'),
  is_active: z.boolean(),
});

type RubrikFormValues = z.infer<typeof rubrikSchema>;

export default function MasterRubrikPage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('sippm.rubrik.read') || hasPermission('sippm.rubrik.manage');
  const canCreate = hasPermission('sippm.rubrik.create') || hasPermission('sippm.rubrik.manage');

  const [loading, setLoading] = useState(true);
  const [rubrikList, setRubrikList] = useState<RubrikIndikator[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();

  // Filter Drawer & Pagination state
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RubrikIndikator | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RubrikFormValues>({
    resolver: zodResolver(rubrikSchema) as any,
    defaultValues: {
      tipe_reviewer: 'kaprodi',
      nama_indikator: '',
      deskripsi: '',
      bobot: 25.0,
      skor_minimal_default: 80.0,
      is_active: true,
    },
  });

  const fetchRubriks = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        search: search || undefined,
        tipe_reviewer: filterTipe || undefined,
        status: filterStatus || undefined,
        orderBy: filterOrderBy,
        orderDir: filterOrderDir,
      };

      const res: any = await sippmService.indexRubrik(params);
      if (res?.data) {
        const dataItems = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];
        setRubrikList(dataItems);
        if (res.data.meta) setMeta(res.data.meta);
        else if (res.meta) setMeta(res.meta);
      } else if (Array.isArray(res)) {
        setRubrikList(res);
      } else {
        setRubrikList([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat rubrik indikator');
      setRubrikList([]);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, search, filterTipe, filterStatus, filterOrderBy, filterOrderDir]);

  useEffect(() => {
    fetchRubriks();
  }, [fetchRubriks]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    reset({
      tipe_reviewer: 'kaprodi',
      nama_indikator: '',
      deskripsi: '',
      bobot: 25.0,
      skor_minimal_default: 80.0,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: RubrikIndikator) => {
    setEditingItem(item);
    reset({
      tipe_reviewer: item.tipe_reviewer,
      nama_indikator: item.nama_indikator,
      deskripsi: item.deskripsi || '',
      bobot: Number(item.bobot),
      skor_minimal_default: Number(item.skor_minimal_default),
      is_active: item.is_active,
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
      await sippmService.destroyRubrik(deleteConfirmId);
      toast.success('Indikator penilaian berhasil dihapus');
      fetchRubriks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus indikator');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const onSubmit = async (data: RubrikFormValues) => {
    if (!canCreate) {
      toast.error('Akses Ditolak: Anda tidak memiliki permission mengelola rubrik.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await sippmService.updateRubrik(editingItem.id, data as any);
        toast.success('Rubrik indikator berhasil diperbarui!');
      } else {
        await sippmService.storeRubrik(data as any);
        toast.success('Rubrik indikator baru berhasil ditambahkan!');
      }
      setIsModalOpen(false);
      reset();
      fetchRubriks();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan rubrik');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<RubrikIndikator>[] = [
    {
      key: 'tipe_reviewer',
      label: 'Tahap & Tipe Reviewer',
      render: (row) =>
        row.tipe_reviewer === 'kaprodi' ? (
          <Badge variant="blue">
            <UserCheck size={12} className="inline mr-1" /> Tahap 1: Kaprodi
          </Badge>
        ) : (
          <Badge variant="success">
            <ShieldCheck size={12} className="inline mr-1" /> Tahap 2: Admin SIPPM
          </Badge>
        ),
    },
    {
      key: 'nama_indikator',
      label: 'Nama Indikator Penilaian',
      render: (row) => (
        <div>
          <div className="font-bold">{row.nama_indikator}</div>
          {row.deskripsi && (
            <div className="text-xs opacity-70 mt-0.5 line-clamp-2">{row.deskripsi}</div>
          )}
        </div>
      ),
    },
    {
      key: 'bobot',
      label: 'Bobot (%)',
      align: 'center',
      render: (row) => (
        <span className="font-extrabold px-2.5 py-1 rounded-lg border bg-slate-50 border-slate-200">
          {Number(row.bobot)}%
        </span>
      ),
    },
    {
      key: 'skor_minimal_default',
      label: 'Batas Nilai Lulus',
      align: 'center',
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 text-xs">
          <Award size={14} /> &gt; {Number(row.skor_minimal_default)} Poin
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      align: 'center',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'gray'}>
          {row.is_active ? 'Aktif' : 'Nonaktif'}
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
            label: 'Edit Indikator',
            icon: <Edit size={14} />,
            onClick: () => handleOpenEditModal(row),
          },
          {
            label: 'Hapus Indikator',
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
          title="Master Rubrik Indikator Penilaian Proposal"
          description="Kelola indikator penilaian keilmuan untuk Reviewer 1 (Kaprodi) dan kelayakan administrasi untuk Reviewer 2 (Admin SIPPM)"
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk melihat Master Rubrik Penilaian.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Master Rubrik Indikator Penilaian Proposal"
        description="Kelola indikator penilaian keilmuan untuk Reviewer 1 (Kaprodi) dan kelayakan administrasi untuk Reviewer 2 (Admin SIPPM)"
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
                Tambah Indikator Penilaian
              </Button>
            )}
          </div>
        }
      />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={rubrikList}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage={
          <div className="py-8 text-center opacity-70">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-40" />
            <p>Belum ada rubrik indikator penilaian terdaftar.</p>
          </div>
        }
      />

      {/* Filter Drawer Slide Right-to-Left */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Indikator Penilaian"
      >
        <div className="space-y-4">
          <Input
            label="Pencarian Indikator Penilaian"
            placeholder="Cari indikator..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <Select
            label="Filter Tipe Reviewer"
            value={filterTipe}
            onChange={(val) => {
              setFilterTipe(val);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Semua Reviewer' },
              { value: 'kaprodi', label: 'Tahap 1: Reviewer Kaprodi (Keilmuan)' },
              { value: 'admin', label: 'Tahap 2: Reviewer Admin SIPPM (Administrasi)' },
            ]}
          />

          <Select
            label="Filter Status"
            value={filterStatus}
            onChange={(val) => {
              setFilterStatus(val);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Nonaktif' },
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
                { value: 'nama_indikator', label: 'Nama Indikator' },
                { value: 'bobot', label: 'Bobot (%)' },
                { value: 'skor_minimal_default', label: 'Batas Nilai Lulus' },
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
        title={editingItem ? 'Edit Indikator Penilaian' : 'Tambah Indikator Penilaian Baru'}
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
              {editingItem ? 'Simpan Pembaruan' : 'Tambah Indikator'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Tahap & Tipe Reviewer"
            required
            value={watch('tipe_reviewer')}
            onChange={(val) => setValue('tipe_reviewer', val as any)}
            options={[
              { value: 'kaprodi', label: 'Tahap 1: Reviewer Kaprodi (Keilmuan & Linieritas)' },
              { value: 'admin', label: 'Tahap 2: Reviewer Admin SIPPM (Administrasi & Kelayakan)' },
            ]}
            error={errors.tipe_reviewer?.message}
          />

          <Input
            label="Nama Indikator Penilaian"
            required
            placeholder="Contoh: Linieritas Topik Riset dengan Roadmap Prodi"
            error={errors.nama_indikator?.message}
            {...register('nama_indikator')}
          />

          <Textarea
            label="Deskripsi / Petunjuk Penilaian"
            rows={3}
            placeholder="Penjelasan kriteria yang harus diperiksa reviewer..."
            error={errors.deskripsi?.message}
            {...register('deskripsi')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Bobot Indikator (%)"
              type="number"
              step="0.1"
              required
              placeholder="25"
              error={errors.bobot?.message}
              {...register('bobot', { valueAsNumber: true })}
            />

            <Input
              label="Batas Nilai Lolos (Min. Score)"
              type="number"
              required
              placeholder="80"
              error={errors.skor_minimal_default?.message}
              {...register('skor_minimal_default', { valueAsNumber: true })}
            />
          </div>

          <Checkbox
            label="Aktifkan Indikator Penilaian Ini"
            checked={watch('is_active')}
            onChange={(e) => setValue('is_active', e.target.checked)}
          />
        </form>
      </Modal>

      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={executeDelete}
        title="Konfirmasi Hapus Indikator Rubrik"
        message="Apakah Anda yakin ingin menghapus indikator penilaian ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
