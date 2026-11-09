'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import KelasSelect from '@/components/lms/KelasSelect';
import PeriodeAkademikSelect, { useActivePeriodeAkademik } from '@/components/lms/PeriodeAkademikSelect';
import { toTahunAkademikId } from '@/lib/kelas';
import { lmsService } from '@/services/lms.service';
import { LmsForumTopik, FORUM_SORT_BY_OPTIONS } from '@/types/lms.types';
import { SORT_ORDER_OPTIONS } from '@/lib/constants';
import { PaginationMeta } from '@/types/api.types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Filter, RotateCcw, Check, ArrowRight, Users, Plus, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Formulir pembuatan topik forum. Topik selalu berlingkup kelas, jadi kelas
 * (dirujuk lewat `kelas.id`) adalah field wajib pertama — bukan pilihan statis.
 */
const topikSchema = z.object({
  kelas_id: z.string().min(1, 'Kelas wajib dipilih.'),
  judul: z.string().min(1, 'Judul topik wajib diisi.').max(255, 'Judul topik maksimal 255 karakter.'),
  is_pinned: z.boolean(),
});

type TopikFormValues = z.infer<typeof topikSchema>;

/** Jumlah post pada endpoint agregat memakai alias `posts_count`. */
function totalPost(row: LmsForumTopik): number {
  return row.posts_count ?? row.total_post ?? 0;
}

export default function LmsForumListPage() {
  const router = useRouter();

  const [rows, setRows] = useState<LmsForumTopik[]>([]);
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
  const [filterKelas, setFilterKelas] = useState<string>('');
  const [filterOrderBy, setFilterOrderBy] = useState<string>('id');
  const [filterOrderDir, setFilterOrderDir] = useState<string>('desc');

  const { hasPermission } = useAuth();
  // Hanya pengelola forum (dosen pengampu/kaprodi/admin) yang boleh membuat topik;
  // mahasiswa tetap dapat mengirim balasan pesan.
  const canManageForum = hasPermission('lms.forum.manage');
  const [isTambahOpen, setIsTambahOpen] = useState<boolean>(false);
  const { activePeriodeId, periodeReady } = useActivePeriodeAkademik();

  useEffect(() => {
    if (activePeriodeId && !filterTahunAkademik) {
      setFilterTahunAkademik(activePeriodeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriodeId]);

  const topikForm = useForm<TopikFormValues>({
    resolver: zodResolver(topikSchema),
    defaultValues: { kelas_id: '', judul: '', is_pinned: false },
  });

  const fetchData = useCallback(
    async (page = 1, perPage = 10) => {
      setIsLoading(true);
      try {
        const res = await lmsService.listTopikSaya({
          page,
          per_page: perPage,
          search: filterSearch || undefined,
          sort_by: filterOrderBy || 'id',
          sort_order: (filterOrderDir as 'asc' | 'desc') || 'desc',
          tahun_akademik_id: toTahunAkademikId(filterTahunAkademik),
          kelas_id: filterKelas ? Number(filterKelas) : undefined,
        });

        if (res.status === 'success' && res.data) {
          setRows(res.data);
          if (res.meta) setMeta(res.meta);
        } else {
          setRows([]);
        }
      } catch (err: any) {
        toast.error(err.message || 'Gagal memuat daftar topik forum');
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    },
    [filterSearch, filterOrderBy, filterOrderDir, filterTahunAkademik, filterKelas]
  );

  useEffect(() => {
    if (!periodeReady) return;
    fetchData(meta.current_page, meta.per_page);
  }, [fetchData, meta.current_page, meta.per_page, periodeReady]);

  const handleApplyFilter = () => {
    setShowFilter(false);
    fetchData(1, meta.per_page);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterTahunAkademik(activePeriodeId);
    setFilterKelas('');
    setFilterOrderBy('id');
    setFilterOrderDir('desc');
    setShowFilter(false);
  };

  const onAjukanTopik = async (values: TopikFormValues) => {
    try {
      await lmsService.createForumTopik(Number(values.kelas_id), {
        judul: values.judul,
        is_pinned: values.is_pinned,
      });
      toast.success('Topik diskusi berhasil dibuat.');
      setIsTambahOpen(false);
      topikForm.reset({ kelas_id: '', judul: '', is_pinned: false });
      fetchData(1, meta.per_page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal membuat topik diskusi');
    }
  };

  const columns: ColumnDef<LmsForumTopik>[] = [
    {
      key: 'topik',
      label: 'TOPIK DISKUSI',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{row.judul}</span>
          {row.is_pinned ? (
            <span className="text-2xs text-slate-500 block">Disematkan</span>
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
            {row.kelas?.nama_kelas || '-'}
          </span>
          <span className="text-2xs text-slate-500 font-mono block">
            {row.kelas?.kode_kelas || '-'}
            {row.kelas?.mata_kuliah?.nama ? ` • ${row.kelas.mata_kuliah.nama}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'post',
      label: 'JUMLAH POST',
      align: 'center',
      render: (row) => (
        <div className="inline-flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-md border border-slate-200">
          <Users size={16} className="text-slate-500" />
          <span>{totalPost(row)}</span>
        </div>
      ),
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
                label: 'Buka Diskusi Kelas',
                icon: <ArrowRight size={16} />,
                onClick: () => router.push(`/lms/${row.kelas_id}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Forum Diskusi"
        description="Topik diskusi perkuliahan dari seluruh kelas yang Anda ikuti atau ampu."
        breadcrumbs={[
          { label: 'LMS', href: '/lms' },
          { label: 'Forum Diskusi' },
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
            {canManageForum ? (
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
            <Users size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Total Topik Diskusi</div>
            <div className="text-lg font-bold text-slate-800">{meta.total}</div>
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
        emptyMessage="Belum ada topik diskusi pada kelas Anda."
      />

      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Forum Diskusi"
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
            placeholder="Cari judul topik, kelas, atau mata kuliah..."
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

          <div className="border-t border-slate-200 my-4" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={FORUM_SORT_BY_OPTIONS}
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
          topikForm.reset({ kelas_id: '', judul: '', is_pinned: false });
        }}
        title="Tambah Topik Diskusi"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsTambahOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={topikForm.handleSubmit(onAjukanTopik)}
              loading={topikForm.formState.isSubmitting}
              disabled={topikForm.formState.isSubmitting}
            >
              Simpan
            </Button>
          </div>
        }
      >
        <form onSubmit={topikForm.handleSubmit(onAjukanTopik)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Controller
              name="kelas_id"
              control={topikForm.control}
              render={({ field }) => (
                <KelasSelect
                  label="Kelas"
                  placeholder="Pilih kelas..."
                  required
                  value={field.value}
                  onChange={(val) => field.onChange(val ? String(val) : '')}
                  error={topikForm.formState.errors.kelas_id?.message}
                />
              )}
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Judul Topik"
              required
              placeholder="cth: Tanya Jawab UTS"
              error={topikForm.formState.errors.judul?.message}
              {...topikForm.register('judul')}
            />
          </div>

          <div className="md:col-span-2">
            <Checkbox
              label="Sematkan Topik"
              error={topikForm.formState.errors.is_pinned?.message}
              {...topikForm.register('is_pinned')}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}