'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Filter,
  Edit2,
  Trash2,
  Eye,
  ShieldAlert,
  RotateCcw,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  Info,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { PegawaiDetailView } from '@/components/simpeg/PegawaiDetailView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { simpegService } from '@/services/simpeg.service';
import type { Pegawai, UnitKerja, JenisPegawai, StatusPegawai } from '@/types/simpeg.types';
import {
  STATUS_PEGAWAI_OPTIONS,
  PEGAWAI_SORT_BY_OPTIONS,
  PEGAWAI_SORT_DIR_OPTIONS,
} from '@/types/simpeg.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

export default function PegawaiPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  
  // RBAC permissions murni (Zero Hardcode policy)
  const canManage = hasPermission('simpeg.pegawai.manage');
  const canRead = hasPermission('simpeg.pegawai.read') || canManage;
  const canCreate = hasPermission('simpeg.pegawai.create') || canManage;
  const canUpdate = hasPermission('simpeg.pegawai.update') || canManage;
  const canDelete = hasPermission('simpeg.pegawai.delete') || canManage;

  const [loading, setLoading] = useState(true);
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>([]);
  const [unitList, setUnitList] = useState<UnitKerja[]>([]);
  const [shiftList, setShiftList] = useState<any[]>([]);
  const [roleList, setRoleList] = useState<{ id: number; name: string; slug: string }[]>([]);

  // Server-side Pagination & Meta State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);

  // Filter & Sorting Drawer State
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedJenis, setSelectedJenis] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('nama_lengkap');
  const [filterOrderDir, setFilterOrderDir] = useState<'asc' | 'desc'>('asc');

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isLoading: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isLoading: false,
    onConfirm: async () => {},
  });
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const blob = await simpegService.downloadPegawaiTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_import_pegawai.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template impor Excel (.xlsx) berhasil diunduh!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengunduh template impor');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Pilih berkas template terlebih dahulu.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await simpegService.importPegawai(formData);
      if (res.data) {
        setImportResult(res.data);
        if (res.data.success > 0) {
          toast.success(`Berhasil mengimpor ${res.data.success} data pegawai!`);
          loadPegawai();
        }
        if (res.data.failed > 0) {
          toast.error(`Terdapat ${res.data.failed} data yang gagal diimpor.`);
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memproses berkas impor.');
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    if (importing) return;
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
  };

  const loadPegawai = useCallback(async () => {
    if (!canRead || !canManage) return;
    setLoading(true);
    try {
      const [resPegawai, resUnit, resShift, resRoles] = await Promise.all([
        simpegService.getPegawaiList({
          search: search || undefined,
          unit_kerja_id: selectedUnit ? Number(selectedUnit) : undefined,
          jenis_pegawai: selectedJenis ? (selectedJenis as JenisPegawai) : undefined,
          shift_template_id: selectedShift ? Number(selectedShift) : undefined,
          role_id: selectedRoleId ? Number(selectedRoleId) : undefined,
          status: selectedStatus ? (selectedStatus as StatusPegawai) : undefined,
          page,
          per_page: limit,
        }),
        simpegService.getUnitKerjaList(),
        simpegService.getShiftTemplates().catch(() => ({ status: 'error' as const, data: [] })),
        simpegService.getAvailableRoles(),
      ]);

      const responseData = resPegawai.data || resPegawai;
      const items: Pegawai[] = Array.isArray(responseData)
        ? responseData
        : responseData?.items || responseData?.data || [];

      const paginationMeta: PaginationMeta = responseData?.meta || {
        current_page: page,
        last_page: Math.ceil((responseData?.total || items.length) / limit) || 1,
        per_page: limit,
        total: responseData?.total || items.length,
        from: items.length > 0 ? (page - 1) * limit + 1 : 0,
        to: (page - 1) * limit + items.length,
      };

      setPegawaiList(items);
      setMeta(paginationMeta);
      setUnitList(resUnit.data || []);
      setShiftList((resShift as any)?.data || []);
      if (resRoles?.data) {
        setRoleList(resRoles.data);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memuat data Pegawai');
    } finally {
      setLoading(false);
    }
  }, [canRead, canManage, page, limit, selectedUnit, selectedJenis, selectedShift, selectedRoleId, selectedStatus, search]);

  useEffect(() => {
    loadPegawai();
  }, [loadPegawai]);

  const handleApplyFilter = () => {
    setPage(1);
    loadPegawai();
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setSearch('');
    setSelectedUnit('');
    setSelectedJenis('');
    setSelectedShift('');
    setSelectedRoleId('');
    setSelectedStatus('');
    setFilterOrderBy('nama_lengkap');
    setFilterOrderDir('asc');
    setPage(1);
    loadPegawai();
    setShowFilter(false);
  };

  const handleOpenCreateModal = () => {
    if (!canCreate) {
      toast.error('Anda tidak memiliki permission untuk menambah Pegawai.');
      return;
    }
    router.push('/simpeg/pegawai/create');
  };

  const handleOpenEditModal = (peg: Pegawai) => {
    router.push(`/simpeg/pegawai/${peg.id}/edit`);
  };

  const handleDelete = (id: number, nama: string) => {
    if (!canDelete) {
      toast.error('Akses Ditolak: Anda tidak memiliki permission menghapus Pegawai.');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Data Pegawai',
      message: `Apakah Anda yakin ingin menghapus pegawai "${nama}"? Tindakan ini tidak dapat dibatalkan.`,
      isLoading: false,
      onConfirm: async () => {
        try {
          setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));
          await simpegService.deletePegawai(id);
          toast.success('Pegawai berhasil dihapus!');
          setDeleteConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          loadPegawai();
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Gagal menghapus pegawai');
          setDeleteConfirm((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  // DataTable Columns definition for Admin View (with Mandatory 3-Dots Action Dropdown)
  const columns: ColumnDef<Pegawai>[] = [
    {
      key: 'nip',
      label: 'NIDN / NUPTK / NIP',
      render: (peg) => {
        const nidn = peg.nidn || peg.dosen?.nidn;
        const nuptk = peg.nuptk || peg.dosen?.nuptk;
        const nip = peg.nip;

        let displayValue = '-';
        let label = '';

        if (nidn) {
          displayValue = nidn;
          label = 'NIDN';
        } else if (nuptk) {
          displayValue = nuptk;
          label = 'NUPTK';
        } else if (nip) {
          displayValue = nip;
          label = 'NIP';
        } else if (peg.nik) {
          displayValue = peg.nik;
          label = 'NIK';
        } else {
          displayValue = `ID-${peg.id}`;
        }

        return (
          <div>
            <span className="font-mono font-bold text-primary-600 block">
              {displayValue}
            </span>
            {label && (
              <span className="text-2xs text-slate-400 font-mono block">{label}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'nama_lengkap',
      label: 'Nama Lengkap & Gelar',
      render: (peg) => (
        <div>
          <div className="font-bold text-slate-800">{peg.nama_gelar || peg.nama_lengkap}</div>
          <div className="text-xs text-slate-400">
            {peg.jenis_kelamin ? (peg.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan') : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'jenis_pegawai',
      label: 'Jenis Pegawai / Role',
      render: (peg) => (
        <div className="flex flex-col gap-1 items-start">
          {peg.roles && peg.roles.length > 0 ? (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
              {peg.roles.map((r) => (
                <Badge key={r.id} variant="purple" className="text-2xs font-semibold">
                  {r.name}
                </Badge>
              ))}
            </div>
          ) : peg.jenis_pegawai ? (
            <Badge variant="blue" className="text-2xs">
              {peg.jenis_pegawai}
            </Badge>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
          {peg.status_kepegawaian ? (
            <span className="text-xs text-slate-500 capitalize">
              {peg.status_kepegawaian.replace('_', ' ')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'unit_kerja',
      label: 'Unit Kerja / Homebase',
      render: (peg) => (
        <div>
          <span className="text-xs font-medium text-slate-800 block">
            {peg.dosen?.program_studi?.nama || peg.unit_kerja?.nama || '-'}
          </span>
          {peg.dosen?.program_studi && peg.unit_kerja && (
            <span className="text-2xs text-slate-400 block">{peg.unit_kerja.nama}</span>
          )}
        </div>
      ),
    },
    {
      key: 'shift_template',
      label: 'Shift Kerja',
      render: (peg) =>
        peg.shift_template?.name ? (
          <Badge variant="cyan">{peg.shift_template.name}</Badge>
        ) : (
          <span className="text-xs text-slate-400">Belum diatur</span>
        ),
    },
    {
      key: 'telepon',
      label: 'Kontak',
      render: (peg) => <span className="text-sm text-slate-600">{peg.telepon || '-'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (peg) => (
        <Badge variant={peg.status === 'aktif' ? 'green' : 'gray'}>
          {peg.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Aksi',
      align: 'right',
      render: (peg) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Lihat Detail Profil',
                icon: <Eye size={14} className="text-primary-600" />,
                onClick: () => router.push(`/simpeg/pegawai/${peg.id}`),
              },
              ...(canUpdate
                ? [
                    {
                      label: 'Edit Data Pegawai',
                      icon: <Edit2 size={14} className="text-blue-600" />,
                      onClick: () => handleOpenEditModal(peg),
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      label: 'Hapus Pegawai',
                      icon: <Trash2 size={14} className="text-rose-600" />,
                      onClick: () => handleDelete(peg.id, peg.nama_lengkap),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];

  if (!canRead) {
    return (
      <div className="animate-fade-in flex flex-col gap-6">
        <PageHeader
          title="Data Pegawai (Dosen &amp; Tendik)"
          description="Direktori Profil, NIP, NIDN, Jabatan, dan Status Kepegawaian Kampus"
        />
        <div className="card p-12 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-bold mb-2 text-red-700">
            Akses Ditolak / Dibatasi
          </h2>
          <p className="text-slate-400 max-w-[500px] mx-auto">
            Peran Anda tidak memiliki permission untuk melihat Data Pegawai SIMPEG.
          </p>
        </div>
      </div>
    );
  }

  // Jika pengguna tidak memiliki izin kelola direktori pegawai, tampilkan profil mandiri
  if (!canManage) {
    return <PegawaiDetailView isSelfView />;
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <PageHeader
        title="Data Pegawai (Dosen &amp; Tendik)"
        description="Direktori Profil, NIP, NIDN, Jabatan, dan Status Kepegawaian Kampus"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              style={{
                borderColor: 'var(--module-primary)',
                color: 'var(--module-primary)',
              }}
            >
              Filter
            </Button>

            {canCreate && (
              <Button icon={<Plus size={16} />} onClick={handleOpenCreateModal}>
                Tambah Pegawai
              </Button>
            )}
          </div>
        }
      />

      {/* DataTable Component with Server-Side Pagination */}
      <DataTable
        columns={columns}
        data={pegawaiList}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        emptyMessage={
          <div className="p-8 text-center text-slate-400">
            <Users size={48} className="mx-auto mb-4 opacity-40" />
            <p>Tidak ada data pegawai ditemukan.</p>
          </div>
        }
      />

      {/* Drawer Slide Kanan-ke-Kiri untuk Filter & Sorting */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Pengurutan Data Pegawai"
        footer={
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              icon={<RotateCcw size={16} />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Button onClick={handleApplyFilter}>
              Terapkan Filter
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Pencarian"
            placeholder="Cari NIP, NIK, atau Nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Select
            label="Jenis Pegawai / Peran SSO"
            value={selectedRoleId}
            onChange={(val) => setSelectedRoleId(val)}
            options={[
              { value: '', label: '-- Semua Jenis Pegawai / Role --' },
              ...roleList.map((r) => ({
                value: r.id.toString(),
                label: r.name,
              })),
            ]}
          />

          <Select
            label="Unit Kerja"
            value={selectedUnit}
            onChange={(val) => setSelectedUnit(val)}
            options={[
              { value: '', label: '-- Semua Unit Kerja --' },
              ...unitList.map((u) => ({
                value: u.id.toString(),
                label: `[${u.kode}] ${u.nama}`,
              })),
            ]}
          />

          <Select
            label="Shift Kerja"
            value={selectedShift}
            onChange={(val) => setSelectedShift(val)}
            options={[
              { value: '', label: '-- Semua Shift --' },
              ...shiftList.map((s: any) => ({
                value: s.id.toString(),
                label: s.name,
              })),
            ]}
          />

          <Select
            label="Status Kepegawaian"
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val)}
            options={STATUS_PEGAWAI_OPTIONS}
          />

          <hr className="border-t border-slate-200 my-2" />

          {/* Grid 2 Kolom Sorting Wajib */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={PEGAWAI_SORT_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val as 'asc' | 'desc')}
              options={PEGAWAI_SORT_DIR_OPTIONS}
            />
          </div>

          {canCreate && (
            <div className="pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                className="w-full"
                icon={<Upload size={16} />}
                onClick={() => {
                  setShowFilter(false);
                  setImportFile(null);
                  setImportResult(null);
                  setShowImportModal(true);
                }}
              >
                Import Pegawai (Excel/CSV)
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      {/* Modal Import Pegawai */}
      <Modal
        open={showImportModal}
        onClose={handleCloseImportModal}
        title="Import Data Pegawai (CSV / Excel)"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="outline"
              onClick={handleCloseImportModal}
              disabled={importing}
            >
              {importResult ? 'Selesai / Tutup' : 'Batal'}
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={!importFile || importing}
              icon={<Upload size={16} />}
            >
              Mulai Import Data
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Card Info SSO */}
          <div className="p-4 rounded-xl bg-primary-50 border border-primary-200 text-primary-900 flex items-start gap-3">
            <Info size={22} className="text-primary-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-primary-900">Pembuatan Akun SSO Otomatis</p>
              <p className="text-primary-700 mt-1">
                Seluruh pegawai yang berhasil di-impor akan secara otomatis dibuatkan akun SSO (<code className="font-mono bg-primary-100 px-1 py-0.5 rounded text-xs">core_users</code>) dengan default password: <strong className="font-mono bg-primary-100 px-1.5 py-0.5 rounded text-primary-800">indonusa</strong> dan role sesuai jenis pegawai (<span className="font-medium">dosen</span> / <span className="font-medium">tendik</span>).
              </p>
            </div>
          </div>

          {/* Langkah 1: Download Template */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">Unduh Template Berkas (.xlsx)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format Excel resmi dengan dropdown otomatis dari data master sistem (Unit Kerja, JAD Dosen, Shift Kerja Presensi, Lokasi Presensi, dll).
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              loading={downloadingTemplate}
              disabled={downloadingTemplate}
              onClick={handleDownloadTemplate}
              className="shrink-0 bg-white"
            >
              Unduh Template
            </Button>
          </div>

          {/* Langkah 2: Upload File Area */}
          <div className="flex flex-col gap-2">
            <Input
              type="file"
              label="Pilih Berkas yang Akan Di-impor (.csv, .xlsx, .xls)"
              accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              disabled={importing}
              required
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportFile(file);
                  setImportResult(null);
                }
              }}
              hint="Format berkas: .csv atau .xlsx (maksimal 10MB)"
            />
            {importFile && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                <FileText size={16} className="text-primary-600 shrink-0" />
                <span className="font-semibold text-slate-800">{importFile.name}</span>
                <span className="text-slate-400">({(importFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Ringkasan Hasil Impor */}
          {importResult && (
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 animate-fade-in">
              <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Hasil Proses Impor
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="block text-xs text-slate-500">Total Baris</span>
                  <span className="text-lg font-bold text-slate-800">{importResult.total}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="block text-xs text-emerald-600">Berhasil</span>
                  <span className="text-lg font-bold text-emerald-700">{importResult.success}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                  <span className="block text-xs text-rose-600">Gagal</span>
                  <span className="text-lg font-bold text-rose-700">{importResult.failed}</span>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 mb-1.5">
                    <AlertCircle size={14} />
                    Catatan Error / Peringatan:
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-lg bg-rose-50 border border-rose-100 p-2.5 text-xs text-rose-800 space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deleteConfirm.onConfirm}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
        isLoading={deleteConfirm.isLoading}
      />
    </div>
  );
}
