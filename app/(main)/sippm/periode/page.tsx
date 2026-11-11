'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Filter, Calendar, Clock, ShieldAlert, Edit, Trash2, FileText } from 'lucide-react';
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
import type { PeriodeHibah } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import { useAuth } from '@/hooks/useAuth';

const periodeSchema = z.object({
  tahun_anggaran: z.string().min(4, 'Tahun anggaran wajib diisi'),
  nama_periode: z.string().min(3, 'Nama periode minimal 3 karakter'),
  tgl_buka: z.string().min(1, 'Tanggal buka wajib diisi'),
  tgl_tutup: z.string().min(1, 'Tanggal tutup wajib diisi'),
  total_anggaran: z.number().min(10000000, 'Total anggaran minimal Rp 10.000.000'),
});

type PeriodeFormValues = z.infer<typeof periodeSchema>;

export default function MasterPeriodePage() {
  const { hasPermission } = useAuth();
  const canRead = hasPermission('sippm.periode.read') || hasPermission('sippm.periode.manage');
  const canCreate = hasPermission('sippm.periode.create') || hasPermission('sippm.periode.manage');

  const [loading, setLoading] = useState(true);
  const [periodeList, setPeriodeList] = useState<PeriodeHibah[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();

  // Filter Drawer & Pagination state
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PeriodeHibah | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PeriodeFormValues>({
    resolver: zodResolver(periodeSchema),
    defaultValues: {
      tahun_anggaran: '2026/2027',
      nama_periode: 'Periode Hibah Internal 2026',
      tgl_buka: '2026-08-01',
      tgl_tutup: '2026-09-30',
      total_anggaran: 500000000,
    },
  });

  const fetchPeriode = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit,
        search: search || undefined,
        status: filterStatus || undefined,
        orderBy: filterOrderBy,
        orderDir: filterOrderDir,
      };

      const res: any = await sippmService.indexPeriode(params);
      if (res?.data) {
        const dataItems = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || [];
        setPeriodeList(dataItems);
        if (res.data.meta) setMeta(res.data.meta);
        else if (res.meta) setMeta(res.meta);
      } else if (Array.isArray(res)) {
        setPeriodeList(res);
      } else {
        setPeriodeList([]);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat periode hibah');
      setPeriodeList([]);
    } finally {
      setLoading(false);
    }
  }, [canRead, page, limit, search, filterStatus, filterOrderBy, filterOrderDir]);

  useEffect(() => {
    fetchPeriode();
  }, [fetchPeriode]);

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    reset({
      tahun_anggaran: '2026/2027',
      nama_periode: 'Periode Hibah Internal 2026',
      tgl_buka: '2026-08-01',
      tgl_tutup: '2026-09-30',
      total_anggaran: 500000000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PeriodeHibah) => {
    setEditingItem(item);
    reset({
      tahun_anggaran: item.tahun_anggaran,
      nama_periode: item.nama_periode,
      tgl_buka: item.tgl_buka,
      tgl_tutup: item.tgl_tutup,
      total_anggaran: item.total_anggaran,
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
      await sippmService.destroyPeriode(deleteConfirmId);
      toast.success('Periode hibah berhasil dihapus');
      fetchPeriode();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus periode hibah');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const onSubmit = async (data: PeriodeFormValues) => {
    if (!canCreate) {
      toast.error('Akses Ditolak: Anda tidak memiliki permission mengelola periode.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await sippmService.updatePeriode(editingItem.id, {
          ...data,
          tgl_tutup_review: data.tgl_tutup,
        });
        toast.success('Periode hibah berhasil diperbarui');
      } else {
        await sippmService.storePeriode({
          ...data,
          tgl_tutup_review: data.tgl_tutup,
        });
        toast.success('Periode hibah baru berhasil ditambahkan');
      }
      setIsModalOpen(false);
      reset();
      fetchPeriode();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan periode hibah');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const columns: ColumnDef<PeriodeHibah>[] = [
    {
      key: 'tahun_anggaran',
      label: 'Tahun Anggaran',
      render: (row) => <span className="font-mono text-xs font-bold">{row.tahun_anggaran}</span>,
    },
    {
      key: 'nama_periode',
      label: 'Nama Periode',
      render: (row) => <span className="font-bold">{row.nama_periode}</span>,
    },
    {
      key: 'tgl_buka',
      label: 'Jadwal Pendaftaran',
      render: (row) => (
        <div className="flex items-center gap-1 text-xs">
          <Clock size={14} className="opacity-60" />
          <span>{row.tgl_buka} s.d {row.tgl_tutup}</span>
        </div>
      ),
    },
    {
      key: 'total_anggaran',
      label: 'Total Anggaran',
      render: (row) => <span className="font-bold">{formatRupiah(row.total_anggaran)}</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'gray'}>
          {row.is_active ? 'Aktif' : 'Tutup'}
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
            label: 'Edit Periode',
            icon: <Edit size={14} />,
            onClick: () => handleOpenEditModal(row),
          },
          {
            label: 'Hapus Periode',
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
          title="Master Periode Hibah"
          description="Pengaturan jadwal pendaftaran hibah riset & alokasi pagu anggaran tahunan"
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk melihat Master Periode Hibah.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Master Periode Hibah"
        description="Pengaturan jadwal pendaftaran hibah riset & alokasi pagu anggaran tahunan"
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
                Buat Periode Baru
              </Button>
            )}
          </div>
        }
      />

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={periodeList}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage={
          <div className="py-8 text-center opacity-70">
            <Calendar size={48} className="mx-auto mb-4 opacity-40" />
            <p>Belum ada periode hibah terdaftar.</p>
          </div>
        }
      />

      {/* Filter Drawer Slide Right-to-Left */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Periode Hibah"
      >
        <div className="space-y-4">
          <Input
            label="Pencarian Nama / Tahun"
            placeholder="Cari periode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
              { value: 'closed', label: 'Tutup' },
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
                { value: 'tahun_anggaran', label: 'Tahun Anggaran' },
                { value: 'total_anggaran', label: 'Total Anggaran' },
                { value: 'nama_periode', label: 'Nama Periode' },
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

      {/* Modal Form <= 5 inputs (Grid 2 Kolom) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Periode Hibah' : 'Buat Periode Hibah Baru'}
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
              {editingItem ? 'Simpan Perubahan' : 'Simpan Periode'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tahun Anggaran"
              required
              placeholder="2026/2027"
              error={errors.tahun_anggaran?.message}
              {...register('tahun_anggaran')}
            />

            <Input
              label="Total Pagu Anggaran (Rp)"
              type="number"
              required
              placeholder="500000000"
              error={errors.total_anggaran?.message}
              {...register('total_anggaran', { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Nama Periode Hibah"
            required
            placeholder="Misal: Hibah Internal Periode II 2026"
            error={errors.nama_periode?.message}
            {...register('nama_periode')}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tanggal Buka Pendaftaran"
              type="date"
              required
              error={errors.tgl_buka?.message}
              {...register('tgl_buka')}
            />

            <Input
              label="Tanggal Tutup Pendaftaran"
              type="date"
              required
              error={errors.tgl_tutup?.message}
              {...register('tgl_tutup')}
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog for Delete */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={executeDelete}
        title="Konfirmasi Hapus Periode"
        message="Apakah Anda yakin ingin menghapus data periode hibah ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
