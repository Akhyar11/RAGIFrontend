'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Filter,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  BookOpen,
  Info,
  ArrowRight,
  Check,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select, type SelectOption } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { siakadService } from '@/services/siakad.service';
import { useAuth } from '@/hooks/useAuth';
import type { PaginationMeta } from '@/types/api.types';
import { isMahasiswaAktif, MAHASISWA_STATUS_OPTIONS, mahasiswaStatusLabel } from '@/types/siakad.types';
import toast from 'react-hot-toast';

const NIM_STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status NIM' },
  { value: 'unassigned', label: 'Belum Memiliki NIM' },
  { value: 'assigned', label: 'Sudah Memiliki NIM' },
];

const STATUS_AKADEMIK_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Status' },
  ...MAHASISWA_STATUS_OPTIONS,
];

const CURRENT_YEAR = new Date().getFullYear();
const ANGKATAN_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Angkatan' },
  ...Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i).map((yr) => ({
    value: String(yr),
    label: `Angkatan ${yr}`,
  })),
];

const SORT_BY_OPTIONS: SelectOption[] = [
  { value: 'nama_lengkap', label: 'Nama Mahasiswa' },
  { value: 'nim', label: 'Nomor Induk Mahasiswa (NIM)' },
  { value: 'angkatan', label: 'Tahun Angkatan' },
  { value: 'kelas', label: 'Kelas' },
  { value: 'created_at', label: 'Waktu Dibuat' },
];

const SORT_DIR_OPTIONS: SelectOption[] = [
  { value: 'asc', label: 'Menaik (A-Z / Lama)' },
  { value: 'desc', label: 'Menurun (Z-A / Baru)' },
];

export default function MahasiswaPage() {
  const router = useRouter();
  const { user, hasRole, hasPermission, isSuperAdmin } = useAuth();
  const isAdminObe = isSuperAdmin || ((user as any)?.siakad_admin_prodis || (user as any)?.siakadAdminProdis || []).filter((p: any) => p.is_active !== false).length > 0;
  // Dosen murni: hanya bimbingan, read-only
  const isDosenOnly = hasRole('dosen') && !isSuperAdmin && !isAdminObe;
  const [mahasiswas, setMahasiswas] = useState<any[]>([]);
  const [prodis, setProdis] = useState<any[]>([]);
  const [dosens, setDosens] = useState<any[]>([]);
  const [masterKelases, setMasterKelases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination & Limit States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);

  // Filter Drawer States
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterProdi, setFilterProdi] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDosenPa, setFilterDosenPa] = useState('');
  const [filterNim, setFilterNim] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterSortBy, setFilterSortBy] = useState('nama_lengkap');
  const [filterSortDir, setFilterSortDir] = useState<'asc' | 'desc'>('asc');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    prodi: '',
    angkatan: '',
    status: '',
    dosenPa: '',
    nim: '',
    kelas: '',
    sortBy: 'nama_lengkap',
    sortDir: 'asc' as 'asc' | 'desc',
  });

  const isFiltered = useMemo(() => {
    return (
      appliedFilters.search !== '' ||
      appliedFilters.prodi !== '' ||
      appliedFilters.angkatan !== '' ||
      appliedFilters.status !== '' ||
      appliedFilters.dosenPa !== '' ||
      appliedFilters.nim !== '' ||
      appliedFilters.kelas !== '' ||
      appliedFilters.sortBy !== 'nama_lengkap' ||
      appliedFilters.sortDir !== 'asc'
    );
  }, [appliedFilters]);

  const loadProdiOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getProdi({ search: keyword || undefined, per_page: 50 });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.items || []);
      return [
        { value: '', label: 'Semua Program Studi' },
        ...list.map((p: any) => ({ value: String(p.id), label: p.nama })),
      ];
    } catch {
      return [];
    }
  }, []);

  const loadDosenOptions = useCallback(async (keyword: string) => {
    try {
      const res = await siakadService.getDosens({ search: keyword || undefined, per_page: 50 });
      const list = res.data || [];
      return [
        { value: '', label: 'Semua Dosen PA' },
        { value: 'unassigned', label: 'Belum Memiliki Dosen PA' },
        ...list.map((d: any) => ({ value: String(d.id), label: d.nama_lengkap })),
      ];
    } catch {
      return [];
    }
  }, []);

  const loadMasterKelasOptions = useCallback(
    async (keyword: string) => {
      try {
        const res = await siakadService.getMasterKelasList({
          search: keyword || undefined,
          program_studi_id: filterProdi ? Number(filterProdi) : undefined,
          tahun_angkatan: filterAngkatan ? Number(filterAngkatan) : undefined,
          is_active: true,
          per_page: 50,
        });
        return (res.data || []).map((mk: any) => ({
          value: mk.nama_kelas,
          label: `${mk.nama_kelas} (${mk.programStudi?.nama || 'Prodi'} - Angkatan ${mk.tahun_angkatan || '-'})`,
        }));
      } catch {
        return [];
      }
    },
    [filterProdi, filterAngkatan]
  );

  // Bulk Selection State (untuk Ubah Status Massal)
  const [selectedMhsIds, setSelectedMhsIds] = useState<number[]>([]);

  // Generate NIM States
  const [generatingNims, setGeneratingNims] = useState(false);

  // Individual NIM Assignment Modal
  const [isNimModalOpen, setIsNimModalOpen] = useState(false);
  const [targetMhsForNim, setTargetMhsForNim] = useState<any | null>(null);
  const [nimMethod, setNimMethod] = useState<'standard' | 'no_pendaftaran' | 'custom'>('standard');
  const [customNimInput, setCustomNimInput] = useState('');
  const [generatingIndividualNim, setGeneratingIndividualNim] = useState(false);

  // Batch Generate NIM Modal
  const [isBatchNimModalOpen, setIsBatchNimModalOpen] = useState(false);
  const [batchNimScheme, setBatchNimScheme] = useState<'standard' | 'no_pendaftaran'>('standard');

  // Export / Import NIM CSV States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Buku Induk States
  const [isBukuModalOpen, setIsBukuModalOpen] = useState(false);
  const [bukuProdi, setBukuProdi] = useState('');
  const [bukuAngkatan, setBukuAngkatan] = useState('');
  const [bukuStatus, setBukuStatus] = useState('');
  const [downloadingBuku, setDownloadingBuku] = useState(false);

  // Ubah kode status akademik PDDIKTI.
  const [statusTarget, setStatusTarget] = useState<any | null>(null);
  const [statusForm, setStatusForm] = useState({ status: 'A', alasan: '' });
  const [savingStatus, setSavingStatus] = useState(false);

  // Ubah status PDDIKTI massal.
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [bulkStatusForm, setBulkStatusForm] = useState({ status: 'N', alasan: '' });
  const [savingBulkStatus, setSavingBulkStatus] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMhs, setEditingMhs] = useState<any | null>(null);
  const [deletingMhs, setDeletingMhs] = useState<any | null>(null);
  const [form, setForm] = useState({
    nama_lengkap: '',
    nim: '',
    nik: '',
    program_studi_id: 1,
    angkatan: 2025,
    kelas: '',
    jenis_kelamin: 'L',
    status: 'A',
    dosen_wali_id: '',
    telepon: '',
    alamat: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchOptions = async () => {
    try {
      const [pRes, dRes, kRes] = await Promise.all([
        siakadService.getProdi(),
        siakadService.getDosens({ per_page: 200 }),
        siakadService.getMasterKelasList({ is_active: true, per_page: 500 }),
      ]);
      if (pRes.data) setProdis(pRes.data);
      if (dRes.data) setDosens(dRes.data);
      if (kRes.data) {
        const kList = Array.isArray(kRes.data) ? kRes.data : (kRes.data?.items || []);
        setMasterKelases(kList);
      }
    } catch (err) { }
  };

  const fetchMahasiswa = async () => {
    try {
      setLoading(true);
      const res = await siakadService.getMahasiswas({
        page,
        per_page: limit,
        search: appliedFilters.search || undefined,
        program_studi_id: appliedFilters.prodi || undefined,
        angkatan: appliedFilters.angkatan || undefined,
        status: appliedFilters.status || undefined,
        kelas: appliedFilters.kelas ? appliedFilters.kelas.toUpperCase() : undefined,
        dosen_wali_id: appliedFilters.dosenPa || undefined,
        nim_status: appliedFilters.nim || undefined,
        sort_by: appliedFilters.sortBy || undefined,
        sort_order: appliedFilters.sortDir || undefined,
        advisees_only: isDosenOnly ? true : undefined,
      });
      if (res.data) {
        const raw = res.data;
        const list = Array.isArray(raw) ? raw : (raw.items || []);
        setMahasiswas(list);
        if (res.meta) {
          setMeta(res.meta);
        } else if (Array.isArray(raw)) {
          setMeta({
            current_page: 1,
            per_page: raw.length,
            total: raw.length,
            last_page: 1,
            from: raw.length > 0 ? 1 : 0,
            to: raw.length,
          });
        }
      }
    } catch (err: any) {
      toast.error('Gagal memuat data mahasiswa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    fetchMahasiswa();
  }, [appliedFilters, isDosenOnly, page, limit]);

  const handleOpenNimModal = (mhs: any) => {
    setTargetMhsForNim(mhs);
    const noPendaftaran = mhs.spmb_konversi?.pendaftaran_calon_mhs?.no_pendaftaran;
    if (noPendaftaran) {
      setNimMethod('no_pendaftaran');
      setCustomNimInput(noPendaftaran);
    } else {
      setNimMethod('standard');
      setCustomNimInput('');
    }
    setIsNimModalOpen(true);
  };

  const handleSaveIndividualNim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMhsForNim) return;

    try {
      setGeneratingIndividualNim(true);
      const payload: any = {
        id: targetMhsForNim.id,
        nama_lengkap: targetMhsForNim.nama_lengkap,
        program_studi_id: targetMhsForNim.program_studi_id,
        angkatan: targetMhsForNim.angkatan,
        jenis_kelamin: targetMhsForNim.jenis_kelamin,
      };

      if (nimMethod === 'no_pendaftaran') {
        payload.use_no_pendaftaran = true;
      } else if (nimMethod === 'custom') {
        if (!customNimInput.trim()) {
          toast.error('Masukkan NIM manual terlebih dahulu');
          return;
        }
        payload.custom_nim = customNimInput.trim();
      }

      await siakadService.generateNim(payload);
      toast.success(`NIM berhasil ditetapkan untuk ${targetMhsForNim.nama_lengkap}`);
      setIsNimModalOpen(false);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menetapkan NIM');
    } finally {
      setGeneratingIndividualNim(false);
    }
  };

  const handleGenerateMissingNims = async () => {
    try {
      setGeneratingNims(true);
      const res = await siakadService.generateMissingNims({ scheme: batchNimScheme });
      toast.success(res.message || 'NIM berhasil di-generate bagi data yang belum ada');
      setIsBatchNimModalOpen(false);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal generate NIM');
    } finally {
      setGeneratingNims(false);
    }
  };

  const handleExportNim = async () => {
    try {
      setIsExporting(true);
      const blob = await siakadService.exportNimData({
        program_studi_id: appliedFilters.prodi || undefined,
        status: appliedFilters.status || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `data_nim_mahasiswa_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Data NIM berhasil diunduh');
    } catch (err: any) {
      toast.error('Gagal mengunduh data NIM');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadBukuInduk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDownloadingBuku(true);
      const blob = await siakadService.exportBukuInduk({
        program_studi_id: bukuProdi || undefined,
        angkatan: bukuAngkatan || undefined,
        status: bukuStatus || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `buku_induk_${bukuAngkatan || 'semua'}_${bukuStatus || 'semua'}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Buku induk berhasil diunduh');
      setIsBukuModalOpen(false);
    } catch (err: any) {
      toast.error('Gagal mengunduh buku induk');
    } finally {
      setDownloadingBuku(false);
    }
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;
    try {
      setSavingStatus(true);
      const res = await siakadService.updateMahasiswaStatus(statusTarget.id, statusForm);
      toast.success(res.message || 'Status akademik berhasil diperbarui');
      setStatusTarget(null);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveBulkStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMhsIds.length === 0) return;
    try {
      setSavingBulkStatus(true);
      const res = await siakadService.bulkUpdateMahasiswaStatus({
        ids: selectedMhsIds,
        status: bulkStatusForm.status,
        alasan: bulkStatusForm.alasan || undefined,
      });
      toast.success(res.message || 'Status massal berhasil diperbarui');
      setIsBulkStatusOpen(false);
      setSelectedMhsIds([]);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memperbarui status massal');
    } finally {
      setSavingBulkStatus(false);
    }
  };

  const handleImportNim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Pilih file CSV terlebih dahulu');
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await siakadService.importNimData(formData);
      toast.success(res.message || 'Import data NIM berhasil diperbarui');
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal mengimpor file CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedMhsIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMhsIds.length === mahasiswas.length) {
      setSelectedMhsIds([]);
    } else {
      setSelectedMhsIds(mahasiswas.map((m) => m.id));
    }
  };



  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingMhs(item);
      setForm({
        nama_lengkap: item.nama_lengkap,
        nim: item.nim || '',
        nik: item.nik || '',
        program_studi_id: item.program_studi_id,
        angkatan: item.angkatan || 2025,
        kelas: item.kelas ? String(item.kelas).toUpperCase() : '',
        jenis_kelamin: item.jenis_kelamin || 'L',
        status: item.status || 'A',
        dosen_wali_id: item.dosen_wali_id ? String(item.dosen_wali_id) : '',
        telepon: item.telepon || '',
        alamat: item.alamat || '',
      });
    } else {
      setEditingMhs(null);
      setForm({
        nama_lengkap: '',
        nim: '',
        nik: '',
        program_studi_id: prodis[0]?.id || 1,
        angkatan: 2025,
        kelas: '',
        jenis_kelamin: 'L',
        status: 'A',
        dosen_wali_id: '',
        telepon: '',
        alamat: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        nama_lengkap: form.nama_lengkap,
        program_studi_id: form.program_studi_id,
        angkatan: form.angkatan,
        jenis_kelamin: form.jenis_kelamin,
        nik: form.nik,
        telepon: form.telepon,
        alamat: form.alamat,
      };
      if (editingMhs) {
        payload.status = form.status;
        await siakadService.updateMahasiswa(editingMhs.id, payload);
        toast.success('Data mahasiswa berhasil diperbarui');
      } else {
        if (!form.nim) {
          await siakadService.generateNim(payload);
          toast.success('Mahasiswa & NIM baru berhasil di-generate');
        } else {
          payload.nim = form.nim;
          await siakadService.createMahasiswa(payload);
          toast.success('Mahasiswa berhasil ditambahkan');
        }
      }
      setIsModalOpen(false);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMhs) return;
    try {
      await siakadService.deleteMahasiswa(deletingMhs.id);
      toast.success('Mahasiswa berhasil dihapus');
      setDeletingMhs(null);
      fetchMahasiswa();
    } catch (err: any) {
      toast.error('Gagal menghapus mahasiswa');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'select',
      label: '',
      align: 'center',
      headerRender: () => (
        <Checkbox
          checked={mahasiswas.length > 0 && selectedMhsIds.length === mahasiswas.length}
          onChange={handleSelectAll}
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedMhsIds.includes(row.id)}
          onChange={() => handleToggleSelect(row.id)}
        />
      ),
    },
    {
      key: 'no',
      label: 'NO',
      align: 'center',
      render: (_row, idx) => (
        <span className="font-bold text-slate-400 text-xs">{(meta?.from ?? 1) + idx}</span>
      ),
    },
    {
      key: 'nim',
      label: 'NIM',
      render: (row) => (
        <div className="font-mono">
          {row.nim ? (
            <span className="font-bold text-slate-900 text-xs">{row.nim}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge variant="amber" className="text-2xs">Belum Ada NIM</Badge>
              <button
                type="button"
                onClick={() => handleOpenNimModal(row)}
                className="text-2xs font-bold text-primary-600 hover:text-primary-800 underline cursor-pointer"
              >
                + Buat NIM
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'nama_lengkap',
      label: 'NAMA MAHASISWA',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-xs">{row.nama_lengkap}</span>
          {row.konversi_id && (
            <Badge variant="purple" className="text-2xs">Transfer</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'program_studi',
      label: 'PROGRAM STUDI',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.program_studi?.nama || '-'}
        </span>
      ),
    },
    {
      key: 'angkatan',
      label: 'ANGKATAN',
      align: 'center',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {row.angkatan}
        </span>
      ),
    },
    {
      key: 'kelas',
      label: 'KELAS',
      align: 'center',
      render: (row) => (
        row.kelas ? (
          <span className="font-mono text-2xs font-bold uppercase text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 inline-block">
            {String(row.kelas).toUpperCase()}
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )
      ),
    },
    {
      key: 'dosen_pa',
      label: 'DOSEN PA (WALI)',
      render: (row) => (
        <div>
          {row.dosen_wali ? (
            <span className="font-bold text-primary-800 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-200 text-2xs inline-block">
              {row.dosen_wali.nama_lengkap}
            </span>
          ) : (
            <span className="text-2xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 font-bold inline-block">
              Belum Ada Dosen PA
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => (
        <Badge
          variant={isMahasiswaAktif(row.status) ? 'green' : row.status === 'C' ? 'amber' : 'gray'}
          className="capitalize text-2xs"
        >
          {mahasiswaStatusLabel(row.status)}
        </Badge>
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
                label: 'Edit Mahasiswa',
                icon: <Edit2 size={14} />,
                onClick: () => handleOpenModal(row),
              },
              {
                label: row.nim ? 'Ubah / Sesuaikan NIM' : 'Tetapkan NIM',
                icon: <Sparkles size={14} />,
                onClick: () => handleOpenNimModal(row),
              },
              {
                label: 'Ubah Status Akademik',
                icon: <RefreshCw size={14} />,
                onClick: () => {
                  setStatusTarget(row);
                  setStatusForm({ status: row.status || 'A', alasan: '' });
                },
              },
              {
                label: 'Hapus Mahasiswa',
                icon: <Trash2 size={14} />,
                variant: 'danger',
                onClick: () => setDeletingMhs(row),
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
        title="Civitas Mahasiswa"
        description="Data mahasiswa aktif, integrasi SPMB, penomoran NIM otomatis, dan plotting Dosen Pembimbing Akademik."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Mahasiswa' },
        ]}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {!isDosenOnly && (
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => router.push('/siakad/civitas/mahasiswa/create')}
              >
                Tambah Mahasiswa
              </Button>
            )}
          </div>
        }
      />

      {!isDosenOnly && (
        <>
          {/* Bilah Alat Massal — dikelompokkan agar header tidak berantakan */}
          <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">Kelola NIM Massal</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Button variant="outline" size="sm" className="text-2xs py-1 px-2.5 h-auto" icon={<Download size={13} />} onClick={handleExportNim} disabled={isExporting}>
                    {isExporting ? 'Mengunduh...' : 'Export CSV'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-2xs py-1 px-2.5 h-auto" icon={<Upload size={13} />} onClick={() => setIsImportModalOpen(true)}>
                    Import
                  </Button>
                  <Button variant="outline" size="sm" className="text-2xs py-1 px-2.5 h-auto" icon={<Sparkles size={13} />} onClick={() => setIsBatchNimModalOpen(true)}>
                    Generate
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:border-l md:border-slate-100 md:pl-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <BookOpen size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">Buku Induk</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-2xs py-1 px-2.5 h-auto"
                    icon={<Download size={13} />}
                    onClick={() => {
                      setBukuProdi(appliedFilters.prodi || '');
                      setBukuAngkatan('');
                      setBukuStatus('');
                      setIsBukuModalOpen(true);
                    }}
                  >
                    Unduh Rekap (CSV)
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 md:border-l md:border-slate-100 md:pl-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Users size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">Kelas & Dosen PA</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {isAdminObe ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-2xs py-1 px-2.5 h-auto text-primary-700"
                      onClick={() => router.push('/siakad/obe/pemetaan-mahasiswa-kelas')}
                      icon={<ArrowRight size={13} />}
                    >
                      Kelola di OBE
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-2xs py-1 px-2.5 h-auto text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      onClick={() => {
                        toast('Akun Anda belum di-ploting sebagai Admin OBE. Penugasan dapat dilakukan di Master Fakultas > Tab Admin Prodi.');
                        if (isSuperAdmin || hasPermission('siakad.master.manage')) {
                          router.push('/siakad/master/fakultas');
                        }
                      }}
                      icon={<Info size={13} />}
                    >
                      Dikelola di OBE
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isDosenOnly && (
        <p className="text-2xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          Menampilkan <strong>mahasiswa bimbingan Anda</strong> saja. Kelola catatan dan aktivitas di menu Bimbingan PA.
        </p>
      )}

      {/* Floating Action Bar jika ada mahasiswa yang dicentang */}
      {!isDosenOnly && selectedMhsIds.length > 0 && (
        <div className="card p-4 flex items-center justify-between border-primary-500 bg-primary-950 text-white shadow-xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-700 text-white font-black flex items-center justify-center text-xs">
              {selectedMhsIds.length}
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">
                {selectedMhsIds.length} Mahasiswa Terpilih
              </p>
              <p className="text-2xs text-primary-200">
                Siap ditetapkan Dosen Pembimbing Akademik (Dosen PA) secara bersamaan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="text-xs font-bold py-1.5 px-3 h-auto"
              onClick={() => setSelectedMhsIds([])}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              className="text-xs font-bold py-1.5 px-4 h-auto shadow-xs"
              onClick={() => {
                setBulkStatusForm({ status: 'N', alasan: '' });
                setIsBulkStatusOpen(true);
              }}
            >
              Ubah Status Massal →
            </Button>
          </div>
        </div>
      )}

      {/* Active Filter Bar */}
      {isFiltered && (
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Filter Aktif:</span>
            {appliedFilters.search && (
              <Badge variant="blue" className="text-2xs">
                Kata kunci: "{appliedFilters.search}"
              </Badge>
            )}
            {appliedFilters.prodi && (
              <Badge variant="blue" className="text-2xs">
                Prodi: {prodis.find((p) => String(p.id) === appliedFilters.prodi)?.nama || appliedFilters.prodi}
              </Badge>
            )}
            {appliedFilters.angkatan && (
              <Badge variant="blue" className="text-2xs">
                Angkatan: {appliedFilters.angkatan}
              </Badge>
            )}
            {appliedFilters.kelas && (
              <Badge variant="purple" className="text-2xs">
                Kelas: {appliedFilters.kelas}
              </Badge>
            )}
            {appliedFilters.status && (
              <Badge variant="green" className="text-2xs">
                Status: {appliedFilters.status}
              </Badge>
            )}
            {appliedFilters.nim && (
              <Badge variant="amber" className="text-2xs">
                NIM: {appliedFilters.nim === 'unassigned' ? 'Belum Ada NIM' : 'Sudah Ada NIM'}
              </Badge>
            )}
            {appliedFilters.dosenPa && (
              <Badge variant="blue" className="text-2xs">
                PA: {appliedFilters.dosenPa === 'unassigned' ? 'Belum Ada PA' : dosens.find((d) => String(d.id) === appliedFilters.dosenPa)?.nama_lengkap || appliedFilters.dosenPa}
              </Badge>
            )}
            <span className="text-slate-400">({meta?.total ?? mahasiswas.length} mahasiswa ditemukan)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterSearch('');
              setFilterProdi('');
              setFilterAngkatan('');
              setFilterNim('');
              setFilterDosenPa('');
              setFilterStatus('');
              setFilterKelas('');
              setFilterSortBy('nama_lengkap');
              setFilterSortDir('asc');
              setAppliedFilters({
                search: '',
                prodi: '',
                angkatan: '',
                nim: '',
                dosenPa: '',
                status: '',
                kelas: '',
                sortBy: 'nama_lengkap',
                sortDir: 'asc',
              });
              setPage(1);
            }}
            className="text-2xs text-rose-600 hover:text-rose-700 h-6 px-2 font-medium"
          >
            Hapus Filter
          </Button>
        </div>
      )}

      {/* Full-bleed DataTable Card */}
      <DataTable
        columns={isDosenOnly ? columns.filter((c) => c.key !== 'select' && c.key !== 'aksi') : columns}
        data={mahasiswas}
        isLoading={loading}
        meta={meta}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
        emptyMessage="Belum ada data mahasiswa yang terdaftar."
      />

      {/* Filter Drawer */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Mahasiswa"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setFilterSearch('');
                setFilterProdi('');
                setFilterAngkatan('');
                setFilterNim('');
                setFilterDosenPa('');
                setFilterStatus('');
                setFilterKelas('');
                setFilterSortBy('nama_lengkap');
                setFilterSortDir('asc');
                setAppliedFilters({
                  search: '',
                  prodi: '',
                  angkatan: '',
                  nim: '',
                  dosenPa: '',
                  status: '',
                  kelas: '',
                  sortBy: 'nama_lengkap',
                  sortDir: 'asc',
                });
                setPage(1);
                setShowFilter(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setAppliedFilters({
                  search: filterSearch,
                  prodi: filterProdi,
                  angkatan: filterAngkatan,
                  nim: filterNim,
                  dosenPa: filterDosenPa,
                  status: filterStatus,
                  kelas: filterKelas ? filterKelas.trim().toUpperCase() : '',
                  sortBy: filterSortBy,
                  sortDir: filterSortDir,
                });
                setPage(1);
                setShowFilter(false);
              }}
            >
              Terapkan Filter
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Pencarian Kata Kunci"
            placeholder="Ketik NIM, NIK, nama, atau kelas..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <AsyncSelect
            label="Kelas (Master Kelas OBE)"
            placeholder="Semua Kelas..."
            loadOptions={loadMasterKelasOptions}
            value={filterKelas ? { value: filterKelas, label: filterKelas } : null}
            onChange={(opt: any) => setFilterKelas(opt?.value || '')}
            isClearable
            defaultOptions={true}
          />

          <AsyncSelect
            label="Program Studi"
            placeholder="Semua Program Studi..."
            loadOptions={loadProdiOptions}
            value={filterProdi ? { value: filterProdi, label: prodis.find((p) => String(p.id) === filterProdi)?.nama || filterProdi } : null}
            onChange={(opt: any) => setFilterProdi(opt?.value || '')}
            isClearable
            defaultOptions={true}
          />

          <Select
            label="Tahun Angkatan"
            value={filterAngkatan}
            onChange={(val) => setFilterAngkatan(String(val || ''))}
            options={ANGKATAN_OPTIONS}
          />

          <Select
            label="Status Kepemilikan NIM"
            value={filterNim}
            onChange={(val) => setFilterNim(String(val || ''))}
            options={NIM_STATUS_OPTIONS}
          />

          <AsyncSelect
            label="Dosen Pembimbing Akademik (PA)"
            placeholder="Semua Dosen PA..."
            loadOptions={loadDosenOptions}
            value={
              filterDosenPa === 'unassigned'
                ? { value: 'unassigned', label: 'Belum Memiliki Dosen PA' }
                : filterDosenPa
                ? { value: filterDosenPa, label: dosens.find((d) => String(d.id) === filterDosenPa)?.nama_lengkap || filterDosenPa }
                : null
            }
            onChange={(opt: any) => setFilterDosenPa(opt?.value || '')}
            isClearable
            defaultOptions={true}
          />

          <Select
            label="Status Akademik"
            value={filterStatus}
            onChange={(val) => setFilterStatus(String(val || ''))}
            options={STATUS_AKADEMIK_OPTIONS}
          />

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <Select
              label="Urutkan"
              value={filterSortBy}
              onChange={(val) => setFilterSortBy(String(val || 'nama_lengkap'))}
              options={SORT_BY_OPTIONS}
            />
            <Select
              label="Arah"
              value={filterSortDir}
              onChange={(val) => setFilterSortDir((val as 'asc' | 'desc') || 'asc')}
              options={SORT_DIR_OPTIONS}
            />
          </div>
        </div>
      </Drawer>



      {/* Modal Form Mahasiswa */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMhs ? 'Edit Mahasiswa' : 'Tambah Mahasiswa / Generate NIM'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Mahasiswa'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Nama Lengkap Mahasiswa"
              required
              placeholder="Contoh: Ahmad Fauzi"
              value={form.nama_lengkap}
              onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
            />
          </div>

          <Input
            label="NIM (Kosongkan jika auto)"
            disabled={Boolean(editingMhs)}
            placeholder="Kosong = Auto generate"
            value={form.nim}
            onChange={(e) => setForm({ ...form, nim: e.target.value })}
          />

          <div>
            <label className="label">Program Studi *</label>
            <select
              disabled={Boolean(editingMhs)}
              value={form.program_studi_id}
              onChange={(e) => setForm({ ...form, program_studi_id: parseInt(e.target.value) })}
              className="select w-full"
            >
              {prodis.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          <Input
            label="Tahun Angkatan"
            type="number"
            required
            value={form.angkatan}
            onChange={(e) => {
              const next = parseInt(e.target.value) || 2025;
              setForm((prev) => ({ ...prev, angkatan: next }));
            }}
          />

          {/* Info Kelas & Dosen PA (Read-Only: Dikelola di OBE) */}
          <div className="md:col-span-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Penempatan Kelas & Dosen Pembimbing Akademik (PA)</span>
              {isAdminObe ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-2xs py-0.5 px-2 h-auto text-primary-600 font-semibold"
                  onClick={() => router.push('/siakad/obe/pemetaan-mahasiswa-kelas')}
                  icon={<ArrowRight size={12} />}
                >
                  Kelola di OBE
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-2xs py-0.5 px-2 h-auto text-slate-400 font-semibold hover:text-slate-600"
                  onClick={() => {
                    toast('Akun Anda belum di-ploting sebagai Admin OBE. Penugasan dapat dilakukan di Master Fakultas > Tab Admin Prodi.');
                    if (isSuperAdmin || hasPermission('siakad.master.manage')) {
                      router.push('/siakad/master/fakultas');
                    }
                  }}
                  icon={<Info size={12} />}
                >
                  Dikelola di OBE
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-2xs text-slate-500 block">Kelas Rombel:</span>
                {form.kelas ? (
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                    {form.kelas}
                  </span>
                ) : (
                  <span className="text-slate-400 italic mt-0.5 block">Belum dipetakan ke kelas</span>
                )}
              </div>
              <div>
                <span className="text-2xs text-slate-500 block">Dosen PA (Wali):</span>
                {editingMhs?.dosen_wali ? (
                  <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200 inline-block mt-0.5">
                    {editingMhs.dosen_wali.nama_lengkap}
                  </span>
                ) : (
                  <span className="text-slate-400 italic mt-0.5 block">Belum ada Dosen PA</span>
                )}
              </div>
            </div>
            <p className="text-2xs text-slate-400">
              * Rombel kelas dan penugasan Dosen PA dikelola terpusat di menu <strong>OBE &gt; Pemetaan Mahasiswa Kelas</strong>.
            </p>
          </div>

          <div>
            <label className="label">Jenis Kelamin *</label>
            <select
              value={form.jenis_kelamin}
              onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })}
              className="select w-full"
            >
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          {editingMhs && (
            <div className="md:col-span-2">
              <Select
                label="Status Akademik"
                value={form.status}
                onChange={(value) => setForm({ ...form, status: String(value || 'A') })}
                options={MAHASISWA_STATUS_OPTIONS}
              />
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={Boolean(deletingMhs)}
        onClose={() => setDeletingMhs(null)}
        title="Hapus Mahasiswa?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingMhs(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">
          Apakah Anda yakin ingin menghapus mahasiswa <strong>{deletingMhs?.nama_lengkap}</strong> ({deletingMhs?.nim || 'Belum ada NIM'})? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>

      {/* Modal Penetapan NIM Mahasiswa (Individual) */}
      <Modal
        open={isNimModalOpen}
        onClose={() => setIsNimModalOpen(false)}
        title="Penetapan & Penomoran NIM"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNimModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveIndividualNim}
              disabled={generatingIndividualNim}
            >
              {generatingIndividualNim ? 'Menyimpan...' : 'Simpan NIM'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
            <p className="font-bold text-slate-800">{targetMhsForNim?.nama_lengkap}</p>
            <p className="text-slate-500">
              Prodi: <span className="font-semibold text-slate-700">{targetMhsForNim?.program_studi?.nama || '-'}</span> | Angkatan: <span className="font-semibold text-slate-700">{targetMhsForNim?.angkatan}</span>
            </p>
            {targetMhsForNim?.spmb_konversi?.pendaftaran_calon_mhs?.no_pendaftaran && (
              <p className="text-primary-700 font-mono text-2xs">
                No. Pendaftaran SPMB: <strong>{targetMhsForNim.spmb_konversi.pendaftaran_calon_mhs.no_pendaftaran}</strong>
              </p>
            )}
            {targetMhsForNim?.nim && (
              <p className="text-amber-700 font-mono text-2xs">
                NIM Saat Ini: <strong>{targetMhsForNim.nim}</strong>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="label">Pilih Metode Penomoran NIM *</label>
            <div className="space-y-2">
              <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${nimMethod === 'standard' ? 'border-primary-500 bg-primary-50/50 text-primary-950 font-semibold' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="nimMethod"
                  value="standard"
                  checked={nimMethod === 'standard'}
                  onChange={() => setNimMethod('standard')}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-bold">Format Standar Kampus (Otomatis)</p>
                  <p className="text-2xs text-slate-500 font-normal mt-0.5">
                    Menggunakan format kombinasi: <code>{"{2 digit thn}{2 digit kode prodi}{4 digit nomor urut}"}</code>.
                  </p>
                </div>
              </label>

              {targetMhsForNim?.spmb_konversi?.pendaftaran_calon_mhs?.no_pendaftaran && (
                <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${nimMethod === 'no_pendaftaran' ? 'border-primary-500 bg-primary-50/50 text-primary-950 font-semibold' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                  <input
                    type="radio"
                    name="nimMethod"
                    value="no_pendaftaran"
                    checked={nimMethod === 'no_pendaftaran'}
                    onChange={() => {
                      setNimMethod('no_pendaftaran');
                      setCustomNimInput(targetMhsForNim.spmb_konversi.pendaftaran_calon_mhs.no_pendaftaran);
                    }}
                    className="mt-0.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-bold">Gunakan Nomor Pendaftaran SPMB</p>
                    <p className="text-2xs text-slate-500 font-normal mt-0.5">
                      Menjadikan nomor pendaftaran <code>{targetMhsForNim.spmb_konversi.pendaftaran_calon_mhs.no_pendaftaran}</code> langsung sebagai NIM resmi mahasiswa.
                    </p>
                  </div>
                </label>
              )}

              <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${nimMethod === 'custom' ? 'border-primary-500 bg-primary-50/50 text-primary-950 font-semibold' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="nimMethod"
                  value="custom"
                  checked={nimMethod === 'custom'}
                  onChange={() => setNimMethod('custom')}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="font-bold">Input Manual / Kombinasi Karakter Kampus</p>
                  <p className="text-2xs text-slate-500 font-normal mt-0.5">
                    Masukkan format NIM khusus kampus (bebas huruf, tanda hubung, atau angka unik).
                  </p>
                </div>
              </label>
            </div>
          </div>

          {nimMethod === 'custom' && (
            <div className="pt-2 animate-fade-in">
              <Input
                label="Nomor Induk Mahasiswa (NIM) Baru *"
                placeholder="Contoh: TI-2025-001 / 25.01.009"
                value={customNimInput}
                onChange={(e) => setCustomNimInput(e.target.value)}
                required
              />
              <p className="text-2xs text-slate-400 mt-1">
                Pastikan NIM belum pernah digunakan oleh mahasiswa lain.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Generate Missing NIMs (Batch) */}
      <Modal
        open={isBatchNimModalOpen}
        onClose={() => setIsBatchNimModalOpen(false)}
        title="Generate NIM Otomatis (Massal)"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsBatchNimModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateMissingNims}
              disabled={generatingNims}
            >
              {generatingNims ? 'Memproses...' : 'Proses Generate Sekarang'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Pilih skema penomoran untuk seluruh mahasiswa aktif yang <strong>belum memiliki NIM</strong>:
          </p>

          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${batchNimScheme === 'standard' ? 'border-primary-500 bg-primary-50/50 text-primary-950 font-semibold' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <input
                type="radio"
                name="batchNimScheme"
                value="standard"
                checked={batchNimScheme === 'standard'}
                onChange={() => setBatchNimScheme('standard')}
                className="mt-0.5 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-bold">Format Standar Kampus (Urut Otomatis)</p>
                <p className="text-2xs text-slate-500 font-normal mt-0.5">
                  Format: <code>{"{2 digit thn}{2 digit prodi}{4 digit nomor urut}"}</code>.
                </p>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${batchNimScheme === 'no_pendaftaran' ? 'border-primary-500 bg-primary-50/50 text-primary-950 font-semibold' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <input
                type="radio"
                name="batchNimScheme"
                value="no_pendaftaran"
                checked={batchNimScheme === 'no_pendaftaran'}
                onChange={() => setBatchNimScheme('no_pendaftaran')}
                className="mt-0.5 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-bold">Gunakan Nomor Pendaftaran SPMB (Jika Ada)</p>
                <p className="text-2xs text-slate-500 font-normal mt-0.5">
                  Mahasiswa yang berasal dari SPMB akan memakai No. Pendaftaran SPMB sebagai NIM. Mahasiswa lain akan memakai format standar.
                </p>
              </div>
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal Import NIM CSV */}
      <Modal
        open={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Data NIM dari File CSV"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleImportNim}
              disabled={isImporting || !importFile}
            >
              {isImporting ? 'Mengimpor...' : 'Mulai Import CSV'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleImportNim} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet size={15} className="text-primary-600" /> Petunjuk Import NIM Offline:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-2xs text-slate-600 pl-1">
              <li>Klik tombol <strong>Export NIM (CSV)</strong> untuk mengunduh daftar mahasiswa kampus saat ini.</li>
              <li>Buka file di Microsoft Excel atau Google Sheets.</li>
              <li>Isi kolom <code>NIM_BARU</code> dengan format penomoran kampus yang diinginkan (bebas huruf & angka).</li>
              <li>Simpan sebagai file <strong>CSV (Comma Delimited)</strong> lalu unggah kembali melalui form di bawah.</li>
            </ol>
          </div>

          <div>
            <label className="label">Pilih File CSV (*.csv) *</label>
            <input
              type="file"
              accept=".csv,text/csv"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImportFile(e.target.files[0]);
                }
              }}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer border border-slate-200 rounded-xl p-2 bg-white"
            />
            {importFile && (
              <p className="text-2xs text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                <Check size={12} /> File terpilih: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal Buku Induk */}
      <Modal
        open={isBukuModalOpen}
        onClose={() => setIsBukuModalOpen(false)}
        title="Unduh Buku Induk Mahasiswa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsBukuModalOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleDownloadBukuInduk} disabled={downloadingBuku} icon={<Download size={14} />}>
              {downloadingBuku ? 'Mengunduh...' : 'Unduh CSV'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleDownloadBukuInduk} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Program Studi"
            placeholder="Semua Prodi"
            options={prodis.map((p) => ({ value: p.id, label: p.nama }))}
            value={bukuProdi || ''}
            onChange={(v: any) => setBukuProdi(String(v || ''))}
            isClearable
          />
          <Input
            label="Angkatan"
            type="number"
            placeholder="cth. 2024 (kosongkan = semua)"
            value={bukuAngkatan}
            onChange={(e) => setBukuAngkatan(e.target.value)}
          />
          <div className="md:col-span-2">
            <label className="label">Status Akademik</label>
            <Select
              value={bukuStatus}
              onChange={(value) => setBukuStatus(String(value || ''))}
              options={STATUS_AKADEMIK_OPTIONS}
            />
          </div>
          <p className="md:col-span-2 text-2xs text-slate-500">
            Rekapan berisi NIM, biodata, prodi, angkatan, jalur masuk, dosen wali, status, dan IPK — cocok dibuka di Excel.
          </p>
        </form>
      </Modal>

      {/* Modal Ubah Status Akademik */}
      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title={`Ubah Status — ${statusTarget?.nama_lengkap || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusTarget(null)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveStatus} disabled={savingStatus}>
              {savingStatus ? 'Menyimpan...' : 'Simpan Status'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveStatus} className="space-y-4">
          <p className="text-xs text-slate-600">
            Status saat ini: <strong>{mahasiswaStatusLabel(statusTarget?.status)}</strong>
          </p>
          <div>
            <Select
              label="Status Baru *"
              value={statusForm.status}
              onChange={(value) => setStatusForm({ ...statusForm, status: String(value || 'A') })}
              options={MAHASISWA_STATUS_OPTIONS}
            />
          </div>
          <Input
            label="Alasan / Keterangan"
            placeholder="Keterangan perubahan status"
            value={statusForm.alasan}
            onChange={(e) => setStatusForm({ ...statusForm, alasan: e.target.value })}
            hint="Wajib diisi untuk perubahan status non-aktif. Tercatat di riwayat status akademik."
          />
        </form>
      </Modal>
      {/* Modal Ubah Status Massal */}
      <Modal
        open={isBulkStatusOpen}
        onClose={() => setIsBulkStatusOpen(false)}
        title={`Ubah Status Massal — ${selectedMhsIds.length} Mahasiswa`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsBulkStatusOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveBulkStatus} disabled={savingBulkStatus}>
              {savingBulkStatus ? 'Menyimpan...' : `Terapkan ke ${selectedMhsIds.length} Mahasiswa`}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveBulkStatus} className="space-y-4">
          <div>
            <Select
              label="Status Baru (massal) *"
              value={bulkStatusForm.status}
              onChange={(value) => setBulkStatusForm({ ...bulkStatusForm, status: String(value || 'N') })}
              options={MAHASISWA_STATUS_OPTIONS}
            />
          </div>
          <Input
            label="Alasan Bersama"
            placeholder="Keterangan perubahan status bersama"
            value={bulkStatusForm.alasan}
            onChange={(e) => setBulkStatusForm({ ...bulkStatusForm, alasan: e.target.value })}
            hint="Wajib untuk status selain Aktif. Dicatat di riwayat tiap mahasiswa."
          />
        </form>
      </Modal>
    </div>
  );
}
