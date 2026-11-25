'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, Edit2, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { loadMataKuliahOptions } from '@/components/siakad/DistribusiMengajarForm';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SEMESTER_OPTIONS } from '@/components/siakad/DistribusiMengajarForm';
import { siakadService } from '@/services/siakad.service';
import { useObeFilterContext } from '@/lib/obe-settings';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const SORT_BY_OPTIONS = [
  { value: 'semester', label: 'Semester' },
  { value: 'id', label: 'ID' },
  { value: 'created_at', label: 'Tanggal Dibuat' },
];

const SORT_DIR_OPTIONS = [
  { value: 'asc', label: 'A - Z (Naik)' },
  { value: 'desc', label: 'Z - A (Turun)' },
];

export default function DistribusiMengajarPage() {
  const router = useRouter();
  const { user, hasPermission, isSuperAdmin } = useAuth();
  const isAdminObe = Boolean(
    isSuperAdmin ||
    (((user as any)?.siakad_admin_prodis || (user as any)?.siakadAdminProdis || []).filter((p: any) => p.is_active !== false).length > 0)
  );
  const canManageObeSettings = hasPermission('siakad.kurikulum.manage') || isAdminObe;

  const {
    settings: obeSettings,
    setTaLabels,
    setKurikulumLabels,
    loadTahunAkademikOptions,
    loadKurikulumOptions,
    recordLabelsFromItems,
    getActiveTaLabel,
    getActiveKurikulumLabel,
  } = useObeFilterContext();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterTahunAkademikId, setFilterTahunAkademikId] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterKurikulumId, setFilterKurikulumId] = useState('');
  const [filterMataKuliahId, setFilterMataKuliahId] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('semester');
  const [filterOrderDir, setFilterOrderDir] = useState('asc');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    tahunAkademikId: '',
    semester: '',
    kurikulumId: '',
    mataKuliahId: '',
    orderBy: 'semester',
    orderDir: 'asc',
  });

  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sinkronisasi otomatis konteks filter awal dari Pengaturan OBE
  useEffect(() => {
    if (obeSettings) {
      const taId = obeSettings.tahun_akademik_id ? String(obeSettings.tahun_akademik_id) : '';
      const kurId = obeSettings.kurikulum_id ? String(obeSettings.kurikulum_id) : '';

      setFilterTahunAkademikId(taId);
      if (kurId && !filterKurikulumId) {
        setFilterKurikulumId(kurId);
      }

      setAppliedFilters((prev) => ({
        ...prev,
        tahunAkademikId: prev.tahunAkademikId || taId,
        kurikulumId: prev.kurikulumId || kurId,
      }));
    }
  }, [obeSettings]);

  // Ekstrak label dari relasi data yang dimuat ke tabel
  useEffect(() => {
    recordLabelsFromItems(items);
  }, [items, recordLabelsFromItems]);

  const activeTaLabel = useMemo(
    () => getActiveTaLabel(appliedFilters.tahunAkademikId),
    [getActiveTaLabel, appliedFilters.tahunAkademikId]
  );

  const activeKurikulumLabel = useMemo(
    () => getActiveKurikulumLabel(appliedFilters.kurikulumId),
    [getActiveKurikulumLabel, appliedFilters.kurikulumId]
  );

  // Lazy fetch opsi jika label belum tersedia di dictionary
  useEffect(() => {
    if (appliedFilters.tahunAkademikId && !activeTaLabel) {
      loadTahunAkademikOptions('');
    }
  }, [appliedFilters.tahunAkademikId, activeTaLabel, loadTahunAkademikOptions]);

  useEffect(() => {
    if (appliedFilters.kurikulumId && !activeKurikulumLabel) {
      loadKurikulumOptions('');
    }
  }, [appliedFilters.kurikulumId, activeKurikulumLabel, loadKurikulumOptions]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await siakadService.getDistribusiMengajarList({
        search: appliedFilters.search || undefined,
        tahun_akademik_id: appliedFilters.tahunAkademikId || undefined,
        semester: appliedFilters.semester || undefined,
        kurikulum_id: appliedFilters.kurikulumId || undefined,
        mata_kuliah_id: appliedFilters.mataKuliahId || undefined,
        sort_by: appliedFilters.orderBy || undefined,
        sort_order: appliedFilters.orderDir || undefined,
        page,
        limit,
      });
      setItems(res.data || []);
      setMeta(res.meta);
    } catch {
      toast.error('Gagal memuat distribusi mengajar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, limit]);

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await siakadService.deleteDistribusiMengajar(deletingItem.id);
      toast.success('Distribusi mengajar berhasil dihapus');
      setDeletingItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menghapus distribusi mengajar');
    } finally {
      setDeleting(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedFilters({
      search: filterSearch,
      tahunAkademikId: filterTahunAkademikId,
      semester: filterSemester,
      kurikulumId: filterKurikulumId,
      mataKuliahId: filterMataKuliahId,
      orderBy: filterOrderBy,
      orderDir: filterOrderDir,
    });
    setPage(1);
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    const defaultTa = obeSettings?.tahun_akademik_id ? String(obeSettings.tahun_akademik_id) : '';
    const defaultKur = obeSettings?.kurikulum_id ? String(obeSettings.kurikulum_id) : '';

    setFilterSearch('');
    setFilterTahunAkademikId(defaultTa);
    setFilterSemester('');
    setFilterKurikulumId(defaultKur);
    setFilterMataKuliahId('');
    setFilterOrderBy('semester');
    setFilterOrderDir('asc');
    setAppliedFilters({
      search: '',
      tahunAkademikId: defaultTa,
      semester: '',
      kurikulumId: defaultKur,
      mataKuliahId: '',
      orderBy: 'semester',
      orderDir: 'asc',
    });
    setPage(1);
    setShowFilter(false);
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'id',
      label: 'NO',
      align: 'center',
      render: (_r, i) => (
        <span className="font-bold text-slate-400 text-xs">{meta?.from ? meta.from + i : i + 1}</span>
      ),
    },
    {
      key: 'mata_kuliah',
      label: 'MAKUL',
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{r.mata_kuliah?.kode_mk || '-'}</span>
          <span className="font-bold text-slate-800 text-xs block">{r.mata_kuliah?.nama || '-'}</span>
        </div>
      ),
    },
    {
      key: 'kurikulum',
      label: 'KURIKULUM',
      align: 'center',
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">{r.kurikulum?.tahun_berlaku || '-'}</span>
          <span className="text-2xs text-slate-500 block">{r.kurikulum?.kode || r.kurikulum?.nama || '-'}</span>
        </div>
      ),
    },
    {
      key: 'semester',
      label: 'SEMESTER',
      align: 'center',
      render: (r) => <span className="font-mono font-bold text-slate-900 text-xs">{r.semester}</span>,
    },
    {
      key: 'angkatan',
      label: 'TAHUN AKADEMIK',
      align: 'center',
      render: (r) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">
            {r.tahun_akademik?.nama || r.tahun_akademik?.tahun_mulai || '-'}
          </span>
          <span className="text-2xs text-slate-500 font-mono block">{r.tahun_akademik?.kode || ''}</span>
        </div>
      ),
    },
    {
      key: 'dosen_koordinator',
      label: 'DOSEN KOORDINATOR',
      render: (r) => (
        <div>
          <span className="font-bold text-xs block text-[var(--module-primary)]">
            {r.dosen_koordinator?.nama_lengkap || '-'}
          </span>
          {r.dosen_koordinator?.nidn && (
            <span className="text-2xs text-slate-500 font-mono block">
              NIDN: {r.dosen_koordinator.nidn}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'dosen_anggota',
      label: 'DOSEN ANGGOTA',
      render: (r) => {
        const anggotas: any[] = Array.isArray(r.dosen_anggotas) && r.dosen_anggotas.length > 0
          ? r.dosen_anggotas
          : (Array.isArray(r.dosen_anggota_details) ? r.dosen_anggota_details : []);
        if (anggotas.length === 0) {
          return <span className="text-2xs text-slate-400 italic">Tanpa anggota</span>;
        }
        return (
          <div className="flex flex-col gap-1.5 min-w-[260px]">
            {anggotas.map((a: any, idx: number) => {
              const itemSks =
                a.sks !== undefined && a.sks !== null
                  ? `${a.sks} SKS`
                  : r.mata_kuliah?.total_sks !== undefined && r.mata_kuliah?.total_sks !== null
                    ? `${r.mata_kuliah.total_sks} SKS`
                    : '-';
              const itemKelasList: string[] = Array.isArray(a.kelas_list) && a.kelas_list.length > 0
                ? a.kelas_list
                : Array.isArray(r.kelas_list) ? r.kelas_list : [];

              return (
                <div
                  key={a.id || a.dosen_id || idx}
                  className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800 text-xs">
                      {a.nama_lengkap || a.nama || a.dosen_nama || '-'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                      {itemSks}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {(a.nidn || a.dosen_nidn) ? (
                      <span className="font-mono text-2xs text-slate-400">
                        NIDN: {a.nidn || a.dosen_nidn}
                      </span>
                    ) : (
                      <span />
                    )}
                    {itemKelasList.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {itemKelasList.map((kName: string, kIdx: number) => (
                          <span
                            key={kIdx}
                            className="px-1.5 py-0.5 rounded text-2xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                          >
                            {kName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-2xs">-</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
    },
    {
      key: 'aksi',
      label: 'OPSI',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Edit Distribusi',
                icon: <Edit2 size={14} />,
                onClick: () => router.push(`/siakad/obe/distribusi-mk/${r.id}/edit`),
              },
              {
                label: 'Hapus Distribusi',
                icon: <Trash2 size={14} />,
                variant: 'danger',
                onClick: () => setDeletingItem(r),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        title="Distribusi Mata Kuliah"
        description="Distribusi penugasan dosen koordinator dan tim pengajar mata kuliah per semester."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Distribusi Mata Kuliah' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Filter size={16} />} onClick={() => setShowFilter(true)}>
              Filter
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => router.push('/siakad/obe/distribusi-mk/create')}
            >
              Tambah Distribusi Mengajar
            </Button>
          </div>
        }
      />

      {appliedFilters.tahunAkademikId && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Filter Aktif Pengaturan OBE:</span>
            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-medium">
              Tahun Akademik: {activeTaLabel || 'Memuat...'}
            </span>
            {appliedFilters.kurikulumId && (
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-medium">
                Kurikulum: {activeKurikulumLabel || 'Memuat...'}
              </span>
            )}
          </div>
          {canManageObeSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/siakad/obe/settings')}
              className="text-xs font-semibold text-[var(--module-primary)] hover:opacity-80 p-0 h-auto shrink-0"
            >
              Ubah Pengaturan →
            </Button>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        isLoading={loading}
        meta={meta}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        emptyMessage="Belum ada data distribusi mengajar mata kuliah."
      />

      <Drawer
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Distribusi Mengajar"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Pencarian"
            placeholder="Cari MK / kode / dosen..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          <AsyncSelect
            label="Tahun Akademik"
            placeholder="Semua Tahun Akademik..."
            loadOptions={loadTahunAkademikOptions}
            value={filterTahunAkademikId ? Number(filterTahunAkademikId) : null}
            onChange={(opt: any) => {
              const val = opt?.value ? String(opt.value) : '';
              setFilterTahunAkademikId(val);
              if (val && (opt?.cleanLabel || opt?.label)) {
                setTaLabels((prev) => ({ ...prev, [val]: opt.cleanLabel || opt.label }));
              }
            }}
            isClearable
          />
          <Select
            label="Semester"
            options={[{ value: '', label: 'Semua Semester' }, ...SEMESTER_OPTIONS]}
            value={filterSemester}
            onChange={(val) => setFilterSemester(val || '')}
          />
          <AsyncSelect
            label="Kurikulum"
            placeholder="Semua Kurikulum..."
            loadOptions={loadKurikulumOptions}
            value={filterKurikulumId ? Number(filterKurikulumId) : null}
            onChange={(opt: any) => {
              const val = opt?.value ? String(opt.value) : '';
              setFilterKurikulumId(val);
              setFilterMataKuliahId('');
              if (val && (opt?.cleanLabel || opt?.label)) {
                setKurikulumLabels((prev) => ({ ...prev, [val]: opt.cleanLabel || opt.label }));
              }
            }}
            isClearable
          />
          <AsyncSelect
            label="Mata Kuliah"
            placeholder={filterKurikulumId ? 'Cari kode / nama MK...' : 'Pilih kurikulum terlebih dahulu...'}
            loadOptions={(keyword: string) =>
              loadMataKuliahOptions(keyword, filterKurikulumId ? Number(filterKurikulumId) : null)
            }
            value={filterMataKuliahId ? Number(filterMataKuliahId) : null}
            onChange={(opt: any) => setFilterMataKuliahId(opt?.value ? String(opt.value) : '')}
            isDisabled={!filterKurikulumId}
            isClearable
          />

          <hr className="border-t border-slate-200 my-2" />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Urut Berdasarkan" options={SORT_BY_OPTIONS} value={filterOrderBy} onChange={(val) => setFilterOrderBy(val || 'semester')} />
            <Select label="Arah" options={SORT_DIR_OPTIONS} value={filterOrderDir} onChange={(val) => setFilterOrderDir(val || 'asc')} />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        title="Hapus Distribusi Mengajar?"
        message={`Apakah Anda yakin ingin menghapus distribusi mengajar untuk ${deletingItem?.mata_kuliah?.nama}?`}
        confirmText="Hapus"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
