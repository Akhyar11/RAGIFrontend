'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import KelasSelect from '@/components/lms/KelasSelect';
import PeriodeAkademikSelect from '@/components/lms/PeriodeAkademikSelect';
import { toTahunAkademikId } from '@/lib/kelas';
import { lmsService } from '@/services/lms.service';
import { siakadService } from '@/services/siakad.service';
import {
  LmsPertemuanItem,
  PERTEMUAN_STATUS_OPTIONS,
  PERTEMUAN_STATUS_LABEL,
  PERTEMUAN_SORT_BY_OPTIONS,
  PertemuanStatus,
} from '@/types/lms.types';
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import { PaginationMeta } from '@/types/api.types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import {
  Filter,
  RotateCcw,
  Check,
  Eye,
  Pencil,
  Trash2,
  CalendarDays,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatTanggal(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatJam(value?: string | null): string {
  if (!value) return '-';
  // Backend menyimpan "HH:MM" atau "HH:MM:SS".
  return value.slice(0, 5);
}

/**
 * Formulir pembuatan pertemuan pada satu kelas.
 *
 * Pertemuan selalu berlingkup kelas, jadi kelas (dirujuk lewat `kelas.id`)
 * wajib dipilih lebih dulu; nomor pertemuan dibatasi 1–32 mengikuti batas
 * `total_pertemuan` maksimum pada pengaturan LMS.
 */
const pertemuanSchema = z.object({
  kelas_id: z.string().min(1, 'Kelas wajib dipilih.'),
  pertemuan_ke: z
    .number({ message: 'Nomor pertemuan harus berupa angka.' })
    .int('Nomor pertemuan harus bilangan bulat.')
    .min(1, 'Nomor pertemuan minimal 1.')
    .max(32, 'Nomor pertemuan maksimal 32.'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi.'),
  jam_mulai: z.string().min(1, 'Jam mulai wajib diisi.'),
  jam_selesai: z.string().min(1, 'Jam selesai wajib diisi.'),
}).refine((values) => values.jam_selesai > values.jam_mulai, {
  message: 'Jam selesai harus setelah jam mulai.',
  path: ['jam_selesai'],
});

type PertemuanFormValues = z.infer<typeof pertemuanSchema>;

export default function LmsPertemuanListPage() {
  const router = useRouter();

  const [rows, setRows] = useState<LmsPertemuanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  const [showFilter, setShowFilter] = useState<boolean>(false);
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterTahunAkademik, setFilterTahunAkademik] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('');
  const [filterOrderBy, setFilterOrderBy] = useState<string>('tanggal');
  const [filterOrderDir, setFilterOrderDir] = useState<string>('desc');

  const { hasRole, isDosen } = useAuth();
  // Pertemuan hanya dibuat/diubah/dihapus oleh Dosen Pengampu; pengelola memonitor secara read-only.
  const canManagePertemuan = isDosen || hasRole('dosen_pengajar');
  const [isTambahOpen, setIsTambahOpen] = useState<boolean>(false);
  const pertemuanForm = useForm<PertemuanFormValues>({
    resolver: zodResolver(pertemuanSchema),
    defaultValues: {
      kelas_id: '',
      pertemuan_ke: 1,
      tanggal: '',
      jam_mulai: '',
      jam_selesai: '',
    },
  });

  const [targetHapus, setTargetHapus] = useState<LmsPertemuanItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchData = useCallback(
    async (page = 1, perPage = 10) => {
      setIsLoading(true);
      try {
        const res = await lmsService.listPertemuanSaya({
          page,
          per_page: perPage,
          search: filterSearch || undefined,
          sort_by: filterOrderBy || 'tanggal',
          sort_order: (filterOrderDir as 'asc' | 'desc') || 'desc',
          tahun_akademik_id: toTahunAkademikId(filterTahunAkademik),
          status_pertemuan: filterStatus || undefined,
          kelas_id: filterKelas ? Number(filterKelas) : undefined,
        });

        if (res.status === 'success' && res.data) {
          setRows(res.data);
          if (res.meta) setMeta(res.meta);
        } else {
          setRows([]);
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat daftar pertemuan');
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    },
    [filterSearch, filterOrderBy, filterOrderDir, filterTahunAkademik, filterStatus, filterKelas]
  );

  useEffect(() => {
    fetchData(meta.current_page, meta.per_page);
  }, [fetchData, meta.current_page, meta.per_page]);

  const handleApplyFilter = () => {
    setShowFilter(false);
    fetchData(1, meta.per_page);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterTahunAkademik('');
    setFilterStatus('');
    setFilterKelas('');
    setFilterOrderBy('tanggal');
    setFilterOrderDir('desc');
    setShowFilter(false);
  };

  const handleDelete = async () => {
    if (!targetHapus) return;
    setIsDeleting(true);
    try {
      await lmsService.destroyPertemuan(targetHapus.id);
      toast.success(`Pertemuan ke-${targetHapus.pertemuan_ke} berhasil dihapus.`);
      setTargetHapus(null);
      fetchData(meta.current_page, meta.per_page);
    } catch (err: any) {
      // Backend memblokir hapus (422) bila sudah ada absensi/materi/tugas/quiz.
      const pesan = err?.response?.data?.message || err?.message || 'Gagal menghapus pertemuan';
      toast.error(pesan);
    } finally {
      setIsDeleting(false);
    }
  };

  const onSimpanPertemuan = async (values: PertemuanFormValues) => {
    try {
      await siakadService.createPertemuan(Number(values.kelas_id), {
        pertemuan_ke: values.pertemuan_ke,
        tanggal: values.tanggal,
        jam_mulai: values.jam_mulai,
        jam_selesai: values.jam_selesai,
      });
      toast.success('Pertemuan berhasil dibuat.');
      setIsTambahOpen(false);
      pertemuanForm.reset({
        kelas_id: '',
        pertemuan_ke: 1,
        tanggal: '',
        jam_mulai: '',
        jam_selesai: '',
      });
      fetchData(1, meta.per_page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal membuat pertemuan');
    }
  };

  const columns: ColumnDef<LmsPertemuanItem>[] = [
    {
      key: 'pertemuan',
      label: 'PERTEMUAN',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">
            Ke-{row.pertemuan_ke} • {formatTanggal(row.tanggal)}
          </span>
          <span className="text-2xs text-slate-500 block">
            {formatJam(row.jam_mulai)} – {formatJam(row.jam_selesai)}
          </span>
        </div>
      ),
    },
    {
      key: 'materi',
      label: 'MATERI',
      render: (row) => (
        <div>
          <span className="text-xs text-slate-800 block">{row.materi || '-'}</span>
          {row.catatan_pertemuan ? (
            <span className="text-2xs text-slate-500 block line-clamp-1">
              {row.catatan_pertemuan}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'kelas',
      label: 'KELAS',
      render: (row) => (
        <div>
          <span className="text-xs font-medium text-slate-800 block">
            {row.kelas?.nama_kelas || `-`}
          </span>
          <span className="text-2xs text-slate-500 font-mono block">
            {row.kelas?.kode_kelas || '-'}
            {row.kelas?.mata_kuliah?.nama ? ` • ${row.kelas.mata_kuliah.nama}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        const status = row.status_pertemuan;
        return (
          <Badge variant={status === 'selesai' ? 'green' : status === 'berlangsung' ? 'blue' : 'gray'}>
            {status ? PERTEMUAN_STATUS_LABEL[status as PertemuanStatus] : 'Belum Berlangsung'}
          </Badge>
        );
      },
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Buka Pertemuan',
                icon: <Eye size={16} />,
                onClick: () => router.push(`/lms/${row.kelas_id}/pertemuan/${row.id}`),
              },
              ...(canManagePertemuan
                ? [
                    {
                      label: 'Ubah Pertemuan',
                      icon: <Pencil size={16} />,
                      onClick: () => router.push(`/lms/pertemuan/${row.id}/edit`),
                    },
                    {
                      label: 'Hapus Pertemuan',
                      icon: <Trash2 size={16} />,
                      variant: 'danger' as const,
                      onClick: () => setTargetHapus(row),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Manajemen Pertemuan"
        description="Daftar seluruh pertemuan perkuliahan dari semua kelas yang Anda miliki."
        breadcrumbs={[
          { label: 'LMS', href: '/lms' },
          { label: 'Pertemuan' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {canManagePertemuan ? (
              <Button variant="primary" icon={<Plus size={16} />} onClick={() => setIsTambahOpen(true)}>
                Tambah Data
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Pertemuan</div>
            <div className="text-xs font-bold text-slate-800">{meta.total}</div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        meta={meta}
        onPageChange={(p) => fetchData(p, meta.per_page)}
        onLimitChange={(lim) => fetchData(1, lim)}
        emptyMessage="Belum ada pertemuan pada kelas yang Anda miliki."
      />

      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Pertemuan"
        footer={
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" icon={<RotateCcw size={16} />} onClick={handleResetFilter}>
              Reset
            </Button>
            <Button icon={<Check size={16} />} onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Pencarian"
            placeholder="Cari materi, catatan, kelas, atau mata kuliah..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <PeriodeAkademikSelect
            label="Tahun Akademik"
            placeholder="Semua periode..."
            value={filterTahunAkademik}
            onChange={(val) => setFilterTahunAkademik(val)}
          />

          <KelasSelect value={filterKelas} onChange={(val) => setFilterKelas(val ? String(val) : '')} />

          <Select
            label="Status Pertemuan"
            placeholder="Semua Status"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={PERTEMUAN_STATUS_OPTIONS}
          />

          <div className="border-t border-slate-200 my-4" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={PERTEMUAN_SORT_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={SORT_ORDER_OPTIONS}
            />
          </div>
        </div>
      </Drawer>

      <Modal
        open={isTambahOpen}
        onClose={() => {
          setIsTambahOpen(false);
          pertemuanForm.reset({ kelas_id: '', pertemuan_ke: 1, tanggal: '', jam_mulai: '', jam_selesai: '' });
        }}
        title="Tambah Pertemuan"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsTambahOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={pertemuanForm.handleSubmit(onSimpanPertemuan)}
              loading={pertemuanForm.formState.isSubmitting}
              disabled={pertemuanForm.formState.isSubmitting}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form
          onSubmit={pertemuanForm.handleSubmit(onSimpanPertemuan)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="md:col-span-2">
            <Controller
              name="kelas_id"
              control={pertemuanForm.control}
              render={({ field }) => (
                <KelasSelect
                  label="Kelas"
                  placeholder="Pilih kelas..."
                  required
                  value={field.value}
                  onChange={(val) => field.onChange(val ? String(val) : '')}
                  error={pertemuanForm.formState.errors.kelas_id?.message}
                />
              )}
            />
          </div>

          <Input
            type="number"
            label="Nomor Pertemuan"
            required
            min={1}
            max={32}
            error={pertemuanForm.formState.errors.pertemuan_ke?.message}
            {...pertemuanForm.register('pertemuan_ke', { valueAsNumber: true })}
          />

          <Input
            type="date"
            label="Tanggal"
            required
            error={pertemuanForm.formState.errors.tanggal?.message}
            {...pertemuanForm.register('tanggal')}
          />

          <Input
            type="time"
            label="Jam Mulai"
            required
            error={pertemuanForm.formState.errors.jam_mulai?.message}
            {...pertemuanForm.register('jam_mulai')}
          />

          <Input
            type="time"
            label="Jam Selesai"
            required
            error={pertemuanForm.formState.errors.jam_selesai?.message}
            {...pertemuanForm.register('jam_selesai')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!targetHapus}
        onClose={() => setTargetHapus(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Hapus Pertemuan"
        message={
          targetHapus
            ? `Hapus pertemuan ke-${targetHapus.pertemuan_ke} pada kelas ${
                targetHapus.kelas?.nama_kelas || ''
              }? Pertemuan yang sudah memiliki materi, tugas, quiz, atau rekap absensi tidak dapat dihapus.`
            : ''
        }
        confirmText="Hapus"
        variant="danger"
      />
    </div>
  );
}