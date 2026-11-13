'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Filter, Edit2, Trash2, GraduationCap, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FakultasForm, type FakultasFormValues } from '@/components/siakad/FakultasForm';
import { AdminProdiTab } from '@/components/siakad/AdminProdiTab';
import { PlottingAdminProdiMenuTab } from '@/components/siakad/PlottingAdminProdiMenuTab';
import { SIAKAD_OPTION_TYPES, useSiakadOptions } from '@/lib/siakad-options';
import { siakadService } from '@/services/siakad.service';
import toast from 'react-hot-toast';

const SORT_PRODI_BY_OPTIONS = [
  { value: 'nama', label: 'Nama Prodi' },
  { value: 'kode_prodi', label: 'Kode Prodi' },
  { value: 'kode_prodi_dikti', label: 'Kode DIKTI' },
  { value: 'jenjang', label: 'Jenjang' },
  { value: 'akreditasi', label: 'Akreditasi' },
];

const SORT_PRODI_DIR_OPTIONS = [
  { value: 'asc', label: 'A - Z (Naik)' },
  { value: 'desc', label: 'Z - A (Turun)' },
];

const PRODI_STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];

export default function FakultasPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'fakultas' | 'prodi' | 'admin_prodi' | 'plotting_menu'>('fakultas');
  const [fakultas, setFakultas] = useState<any[]>([]);
  const [prodis, setProdis] = useState<any[]>([]);
  const [prodiMeta, setProdiMeta] = useState<any>(undefined);
  const [prodiPage, setProdiPage] = useState(1);
  const [prodiLimit, setProdiLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showAdminProdiFilter, setShowAdminProdiFilter] = useState(false);
  const [showAdminProdiCreate, setShowAdminProdiCreate] = useState(false);

  // Filter Drawer State
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFakultasId, setFilterFakultasId] = useState('');
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterAkreditasi, setFilterAkreditasi] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSortBy, setFilterSortBy] = useState('nama');
  const [filterSortDir, setFilterSortDir] = useState<'asc' | 'desc'>('asc');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    fakultasId: '',
    jenjang: '',
    akreditasi: '',
    isActive: '',
    sortBy: 'nama',
    sortDir: 'asc' as 'asc' | 'desc',
  });

  // Modal Fakultas state
  const [isFakultasModalOpen, setIsFakultasModalOpen] = useState(false);
  const [editingFakultas, setEditingFakultas] = useState<any | null>(null);
  const [deletingFakultas, setDeletingFakultas] = useState<any | null>(null);
  const [deletingProdi, setDeletingProdi] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const jenjangOptions = useSiakadOptions(SIAKAD_OPTION_TYPES.JENJANG);
  const akreditasiOptions = useSiakadOptions(SIAKAD_OPTION_TYPES.AKREDITASI);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fRes, pRes] = await Promise.all([
        siakadService.getFakultas(),
        siakadService.getProdi({
          page: prodiPage,
          per_page: prodiLimit,
          search: appliedFilters.search || undefined,
          fakultas_id: appliedFilters.fakultasId || undefined,
          jenjang: appliedFilters.jenjang || undefined,
          akreditasi: appliedFilters.akreditasi || undefined,
          is_active: appliedFilters.isActive || undefined,
          include_inactive: true,
          sort_by: appliedFilters.sortBy,
          sort_order: appliedFilters.sortDir,
        }),
      ]);
      if (fRes.data) setFakultas(fRes.data);
      if (pRes.data) {
        setProdis(pRes.data);
        if (pRes.meta) {
          setProdiMeta(pRes.meta);
        } else {
          setProdiMeta({
            current_page: 1,
            per_page: pRes.data.length,
            total: pRes.data.length,
            last_page: 1,
            from: 1,
            to: pRes.data.length,
          });
        }
      }
    } catch (err: any) {
      toast.error('Gagal memuat data fakultas & program studi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [appliedFilters, prodiPage, prodiLimit]);

  // --- HANDLER FAKULTAS ---
  const handleOpenFakultasModal = (item?: any) => {
    setEditingFakultas(item || null);
    setIsFakultasModalOpen(true);
  };

  const handleSaveFakultas = async (values: FakultasFormValues) => {
    if (editingFakultas) {
      await siakadService.updateFakultas(editingFakultas.id, values);
      toast.success('Fakultas berhasil diperbarui');
    } else {
      await siakadService.createFakultas(values);
      toast.success('Fakultas baru berhasil ditambahkan');
    }
    setIsFakultasModalOpen(false);
    fetchData();
  };

  const handleDeleteFakultas = async () => {
    if (!deletingFakultas) return;
    try {
      setDeleting(true);
      await siakadService.deleteFakultas(deletingFakultas.id);
      toast.success('Fakultas berhasil dihapus');
      setDeletingFakultas(null);
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus fakultas');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteProdi = async () => {
    if (!deletingProdi) return;
    try {
      setDeleting(true);
      await siakadService.deleteProdi(deletingProdi.id);
      toast.success('Program studi berhasil dihapus');
      setDeletingProdi(null);
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus program studi');
    } finally {
      setDeleting(false);
    }
  };

  const prodiColumns: ColumnDef<any>[] = [
    {
      key: 'id',
      label: 'NO',
      align: 'center',
      render: (_row, index) => (
        <span className="font-bold text-slate-400 text-xs">
          {prodiMeta?.from ? prodiMeta.from + index : index + 1}
        </span>
      ),
    },
    {
      key: 'kode_prodi',
      label: 'KODE PRODI',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 text-xs">
          {row.kode_prodi}
        </span>
      ),
    },
    {
      key: 'kode_prodi_dikti',
      label: 'KODE DIKTI',
      render: (row) => (
        <span className="font-mono font-bold text-xs" style={{ color: 'var(--module-primary)' }}>
          {row.kode_prodi_dikti || '-'}
        </span>
      ),
    },
    {
      key: 'nama',
      label: 'NAMA PROGRAM STUDI',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{row.nama}</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-2xs text-slate-500">
              {row.fakultas?.nama || 'Fakultas belum dipetakan'}
            </span>
            <Badge variant={row.is_active ? 'green' : 'gray'}>
              {row.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'jenjang',
      label: 'JENJANG',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          {row.jenjang || '-'}
        </span>
      ),
    },
    {
      key: 'akreditasi',
      label: 'AKREDITASI',
      align: 'center',
      render: (row) => (
        row.akreditasi ? <Badge variant="blue">{row.akreditasi}</Badge> : <span className="text-2xs text-slate-400">-</span>
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
                label: 'Edit Program Studi',
                icon: <Edit2 size={14} />,
                onClick: () => router.push(`/siakad/master/fakultas/prodi/${row.id}/edit`),
              },
              {
                label: 'Hapus Program Studi',
                icon: <Trash2 size={14} />,
                variant: 'danger',
                onClick: () => setDeletingProdi(row),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fakultas & Program Studi"
        description="Struktur unit pengelola akademik, fakultas induk, dan program studi yang aktif."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Fakultas & Prodi' },
        ]}
        action={
          <div className="flex items-center gap-2">
            {activeTab === 'prodi' && (
              <>
                <Button
                  variant="outline"
                  icon={<Filter size={16} />}
                  onClick={() => setShowFilter(true)}
                >
                  Filter
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={() => router.push('/siakad/master/fakultas/prodi/create')}
                >
                  Tambah Program Studi
                </Button>
              </>
            )}

            {activeTab === 'fakultas' && (
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => handleOpenFakultasModal()}
              >
                Tambah Fakultas
              </Button>
            )}

            {activeTab === 'admin_prodi' && (
              <>
                <Button
                  variant="outline"
                  icon={<Filter size={16} />}
                  onClick={() => setShowAdminProdiFilter(true)}
                >
                  Filter
                </Button>
                <Button
                  variant="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setShowAdminProdiCreate(true)}
                >
                  Tambah Admin OBE
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('fakultas')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold border-b-2 transition -mb-px cursor-pointer ${
            activeTab === 'fakultas'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 size={16} />
          Struktur Fakultas ({fakultas.length})
        </button>

        <button
          onClick={() => setActiveTab('prodi')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold border-b-2 transition -mb-px cursor-pointer ${
            activeTab === 'prodi'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GraduationCap size={16} />
          Daftar Program Studi ({prodis.length})
        </button>

        <button
          onClick={() => setActiveTab('admin_prodi')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold border-b-2 transition -mb-px cursor-pointer ${
            activeTab === 'admin_prodi'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck size={16} />
          Admin OBE Homebase Prodi
        </button>

        <button
          onClick={() => setActiveTab('plotting_menu')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-extrabold border-b-2 transition -mb-px cursor-pointer ${
            activeTab === 'plotting_menu'
              ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck size={16} />
          Plotting Menu Admin OBE
        </button>
      </div>

      {/* Tab 3: Admin OBE Homebase Prodi */}
      {activeTab === 'admin_prodi' && (
        <AdminProdiTab
          prodis={prodis}
          showFilterExternal={showAdminProdiFilter}
          onCloseFilterExternal={() => setShowAdminProdiFilter(false)}
          showCreateModalExternal={showAdminProdiCreate}
          onCloseCreateModalExternal={() => setShowAdminProdiCreate(false)}
        />
      )}

      {/* Tab 4: Plotting Menu Admin OBE */}
      {activeTab === 'plotting_menu' && (
        <PlottingAdminProdiMenuTab prodis={prodis} />
      )}

      {/* Tab 1: Fakultas Cards Grid */}
      {activeTab === 'fakultas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fakultas.map((f) => (
            <div key={f.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
                    style={{ background: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}
                  >
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs font-bold px-2 py-0.5 rounded" style={{ color: 'var(--module-primary)', background: 'var(--module-primary-subtle)' }}>
                        {f.kode}
                      </span>
                      <Badge variant="green">Aktif</Badge>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-1">{f.nama}</h3>
                  </div>
                </div>

                <DropdownMenu
                  items={[
                    {
                      label: 'Edit Fakultas',
                      icon: <Edit2 size={14} />,
                      onClick: () => handleOpenFakultasModal(f),
                    },
                    {
                      label: 'Hapus Fakultas',
                      icon: <Trash2 size={14} />,
                      variant: 'danger',
                      onClick: () => setDeletingFakultas(f),
                    },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100">
                {(f.program_studis || []).map((prodi: any) => (
                  <div key={prodi.id} className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-xs">{prodi.kode_prodi}</span>
                      {prodi.akreditasi && <Badge variant="blue" className="text-[10px]">{prodi.akreditasi}</Badge>}
                    </div>
                    <p className="font-bold text-slate-900 text-xs">{prodi.nama}{prodi.jenjang ? ` (${prodi.jenjang})` : ''}</p>
                    <p className="text-2xs text-slate-400 font-mono">Kode DIKTI: {prodi.kode_prodi_dikti || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Program Studi Table */}
      {activeTab === 'prodi' && (
        <DataTable
          columns={prodiColumns}
          data={prodis}
          isLoading={loading}
          meta={prodiMeta}
          onPageChange={(p) => setProdiPage(p)}
          onLimitChange={(l) => {
            setProdiLimit(l);
            setProdiPage(1);
          }}
          emptyMessage="Belum ada program studi yang terdaftar."
        />
      )}

      {/* Filter Drawer for Prodi */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Program Studi"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setFilterSearch('');
                setFilterFakultasId('');
                setFilterJenjang('');
                setFilterAkreditasi('');
                setFilterStatus('');
                setFilterSortBy('nama');
                setFilterSortDir('asc');
                setAppliedFilters({
                  search: '',
                  fakultasId: '',
                  jenjang: '',
                  akreditasi: '',
                  isActive: '',
                  sortBy: 'nama',
                  sortDir: 'asc',
                });
                setProdiPage(1);
                setShowFilter(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAppliedFilters({
                  search: filterSearch,
                  fakultasId: filterFakultasId,
                  jenjang: filterJenjang,
                  akreditasi: filterAkreditasi,
                  isActive: filterStatus,
                  sortBy: filterSortBy,
                  sortDir: filterSortDir,
                });
                setProdiPage(1);
                setShowFilter(false);
              }}
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Kode atau Nama Prodi"
            placeholder="Ketik kata kunci..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <Select
            label="Fakultas Induk"
            placeholder="Semua Fakultas"
            options={fakultas.map((f) => ({ value: f.id, label: f.nama }))}
            value={filterFakultasId || ''}
            onChange={(val: any) => setFilterFakultasId(val ? String(val) : '')}
            isClearable
          />

          <Select
            label="Jenjang Pendidikan"
            placeholder="Semua Jenjang"
            options={jenjangOptions}
            value={filterJenjang || ''}
            onChange={(val: any) => setFilterJenjang(val ? String(val) : '')}
            isClearable
          />

          <Select
            label="Akreditasi"
            placeholder="Semua Akreditasi"
            options={akreditasiOptions}
            value={filterAkreditasi || ''}
            onChange={(val: any) => setFilterAkreditasi(val ? String(val) : '')}
            isClearable
          />

          <Select
            label="Status Program Studi"
            value={filterStatus}
            onChange={(val: any) => setFilterStatus(val ? String(val) : '')}
            options={PRODI_STATUS_OPTIONS}
          />

          <hr className="border-t border-slate-200 my-1" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterSortBy}
              onChange={(val: any) => setFilterSortBy(val ? String(val) : 'nama')}
              options={SORT_PRODI_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={filterSortDir}
              onChange={(val: any) => setFilterSortDir((val as 'asc' | 'desc') || 'asc')}
              options={SORT_PRODI_DIR_OPTIONS}
            />
          </div>
        </div>
      </Drawer>

      {/* Modal Fakultas (5 field) */}
      <Modal
        open={isFakultasModalOpen}
        onClose={() => setIsFakultasModalOpen(false)}
        title={editingFakultas ? 'Edit Fakultas' : 'Tambah Fakultas Baru'}
      >
        <FakultasForm
          key={editingFakultas?.id || 'new'}
          isEditing={Boolean(editingFakultas)}
          defaultValues={
            editingFakultas
              ? {
                  kode: editingFakultas.kode,
                  nama: editingFakultas.nama,
                  nama_singkat: editingFakultas.nama_singkat || '',
                  telepon: editingFakultas.telepon || '',
                  email: editingFakultas.email || '',
                }
              : undefined
          }
          onSubmit={handleSaveFakultas}
          onCancel={() => setIsFakultasModalOpen(false)}
          submitLabel={editingFakultas ? 'Simpan Perubahan' : 'Simpan Fakultas'}
        />
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingFakultas)}
        onClose={() => setDeletingFakultas(null)}
        onConfirm={handleDeleteFakultas}
        title="Hapus Fakultas?"
        message={
          <span>
            Apakah Anda yakin ingin menghapus fakultas <strong>{deletingFakultas?.nama}</strong>?
          </span>
        }
        isLoading={deleting}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingProdi)}
        onClose={() => setDeletingProdi(null)}
        onConfirm={handleDeleteProdi}
        title="Hapus Program Studi?"
        message={
          <span>
            Apakah Anda yakin ingin menghapus program studi <strong>{deletingProdi?.nama}</strong>?
          </span>
        }
        isLoading={deleting}
      />
    </div>
  );
}
