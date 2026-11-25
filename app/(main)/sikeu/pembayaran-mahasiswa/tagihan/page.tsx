'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  Loader2,
  Copy,
  Check,
  Printer,
  DollarSign,
  FileText,
  SlidersHorizontal,
  CreditCard,
  Trash2,
  ArrowRightLeft,
  Landmark,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sikeuService } from '@/services/sikeu.service';
import { formatRupiah } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface TagihanRecord {
  id: number;
  nomor_tagihan: string;
  mahasiswa_id?: number;
  calon_mahasiswa_id?: number;
  is_calon_mahasiswa: boolean;
  nim: string;
  nama_mahasiswa: string;
  prodi: string;
  total_tagihan: number;
  total_potongan: number;
  total_bayar: number;
  sisa: number;
  kelebihan_bayar?: number;
  status: string;
  jatuh_tempo?: string;
  va_number?: string;
  h2h_billing_id?: string;
  h2h_id_tagihan?: string;
  h2h_custid?: string;
  created_at?: string;
  rincian_komponen?: Array<{
    master_biaya_id: number;
    nama_biaya: string;
    nominal: number;
    terbayar?: number;
    sisa?: number;
  }>;
}

export default function ListTagihanMahasiswaPage() {
  const router = useRouter();

  // List Tagihan State
  const [tagihanList, setTagihanList] = useState<TagihanRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [meta, setMeta] = useState<any>({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [page, setPage] = useState(1);

  // Filter Drawer State
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJatuhTempoDari, setFilterJatuhTempoDari] = useState('');
  const [filterJatuhTempoSampai, setFilterJatuhTempoSampai] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: 'all',
    jatuh_tempo_dari: '',
    jatuh_tempo_sampai: ''
  });

  // Copy VA State
  const [copiedVaId, setCopiedVaId] = useState<number | null>(null);

  // Detail Modal State
  const [selectedDetail, setSelectedDetail] = useState<TagihanRecord | null>(null);

  // Alihkan Pembayaran / Koreksi Lebih Bayar Modal State
  const [alihkanModal, setAlihkanModal] = useState<{
    isOpen: boolean;
    sourceBill: TagihanRecord | null;
    targetBills: any[];
    loadingTargets: boolean;
    selectedTargetId: string;
    nominal: string;
    alasan: string;
    submitting: boolean;
  }>({
    isOpen: false,
    sourceBill: null,
    targetBills: [],
    loadingTargets: false,
    selectedTargetId: '',
    nominal: '',
    alasan: '',
    submitting: false,
  });

  // Selection & Delete State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch List Tagihan
  const fetchTagihan = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await sikeuService.getPembayaranMahasiswaTagihanList({
        page: page,
        per_page: 15,
        search: appliedFilters.search || undefined,
        status: appliedFilters.status !== 'all' ? appliedFilters.status : undefined,
        jatuh_tempo_dari: appliedFilters.jatuh_tempo_dari || undefined,
        jatuh_tempo_sampai: appliedFilters.jatuh_tempo_sampai || undefined,
      });

      setTagihanList(Array.isArray(res.data) ? res.data : []);
      if (res.meta) {
        setMeta(res.meta);
      }
      setSelectedIds([]);
    } catch {
      setTagihanList([]);
      toast.error('Gagal memuat daftar tagihan mahasiswa');
    } finally {
      setLoadingList(false);
    }
  }, [page, appliedFilters]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('search');
    if (q) {
      setFilterSearch(q);
      setAppliedFilters((prev) => ({ ...prev, search: q }));
    }
  }, []);

  useEffect(() => {
    fetchTagihan();
  }, [fetchTagihan]);

  const handleApplyFilter = () => {
    setAppliedFilters({
      search: filterSearch,
      status: filterStatus,
      jatuh_tempo_dari: filterJatuhTempoDari,
      jatuh_tempo_sampai: filterJatuhTempoSampai,
    });
    setPage(1);
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterStatus('all');
    setFilterJatuhTempoDari('');
    setFilterJatuhTempoSampai('');
    setAppliedFilters({
      search: '',
      status: 'all',
      jatuh_tempo_dari: '',
      jatuh_tempo_sampai: '',
    });
    setPage(1);
    setShowFilter(false);
  };

  const handleCopyVa = (va: string, id: number) => {
    navigator.clipboard.writeText(va);
    setCopiedVaId(id);
    toast.success('Nomor Virtual Account berhasil disalin');
    setTimeout(() => setCopiedVaId(null), 2000);
  };

  const handleTerbitkanH2h = async (row: any, force?: boolean) => {
    try {
      const res = await sikeuService.terbitkanH2h(row.id, force);
      toast.success(res?.message || `Billing H2H terbit (CUSTID ${res?.data?.custid}).`);
      fetchTagihan();
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menerbitkan billing H2H.');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === tagihanList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tagihanList.map((t) => t.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmSingleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await sikeuService.deletePembayaranMahasiswaTagihan(deletingId);
      toast.success(res.message || 'Tagihan berhasil dihapus');
      setDeletingId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingId));
      fetchTagihan();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus tagihan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await sikeuService.batchDeletePembayaranMahasiswaTagihan(selectedIds);
      toast.success(res.message || `${selectedIds.length} tagihan berhasil dihapus`);
      setShowBatchDeleteDialog(false);
      setSelectedIds([]);
      fetchTagihan();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menghapus tagihan terpilih');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAlihkan = async (row: TagihanRecord) => {
    const studentId = row.mahasiswa_id || row.calon_mahasiswa_id;
    if (!studentId) {
      toast.error('Data identitas mahasiswa tidak valid.');
      return;
    }

    setAlihkanModal({
      isOpen: true,
      sourceBill: row,
      targetBills: [],
      loadingTargets: true,
      selectedTargetId: '',
      nominal: row.kelebihan_bayar && row.kelebihan_bayar > 0 ? String(row.kelebihan_bayar) : '',
      alasan: row.kelebihan_bayar && row.kelebihan_bayar > 0 ? 'Pengalihan kelebihan bayar' : '',
      submitting: false,
    });

    try {
      const res = await sikeuService.getStudentUnpaidBills(studentId, row.is_calon_mahasiswa);
      const data = res?.data?.bills || (Array.isArray(res?.data) ? res.data : []);
      // Filter out current source bill and only keep bills with remaining balance
      const targets = data.filter((b: any) => b.id !== row.id && Number(b.sisa) > 0);
      setAlihkanModal((prev) => ({
        ...prev,
        targetBills: targets,
        loadingTargets: false,
      }));
    } catch {
      toast.error('Gagal mengambil daftar tagihan lain milik mahasiswa');
      setAlihkanModal((prev) => ({ ...prev, loadingTargets: false }));
    }
  };

  const handleSubmitAlihkan = async () => {
    if (!alihkanModal.sourceBill) return;
    if (!alihkanModal.selectedTargetId) {
      toast.error('Pilih tagihan tujuan yang ingin dialokasikan.');
      return;
    }
    const nominalNum = Number(alihkanModal.nominal);
    if (isNaN(nominalNum) || nominalNum <= 0) {
      toast.error('Nominal pengalihan harus lebih besar dari 0.');
      return;
    }
    if (nominalNum > alihkanModal.sourceBill.total_bayar) {
      toast.error(`Nominal melebihi total bayar sumber (${formatRupiah(alihkanModal.sourceBill.total_bayar)}).`);
      return;
    }
    if (!alihkanModal.alasan || alihkanModal.alasan.trim().length < 5) {
      toast.error('Alasan pengalihan wajib diisi minimal 5 karakter.');
      return;
    }

    try {
      setAlihkanModal((prev) => ({ ...prev, submitting: true }));
      const res = await sikeuService.alihkanPembayaranMahasiswa({
        source_tagihan_id: alihkanModal.sourceBill.id,
        target_tagihan_id: Number(alihkanModal.selectedTargetId),
        nominal: nominalNum,
        alasan: alihkanModal.alasan.trim(),
      });

      toast.success(res.message || 'Pembayaran berhasil dialihkan ke tagihan lain');
      setAlihkanModal({
        isOpen: false,
        sourceBill: null,
        targetBills: [],
        loadingTargets: false,
        selectedTargetId: '',
        nominal: '',
        alasan: '',
        submitting: false,
      });
      fetchTagihan();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengalihkan pembayaran');
      setAlihkanModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // KPI Summary
  const summary = useMemo(() => {
    const totalTagihan = tagihanList.reduce((sum, item) => sum + (Number(item.total_tagihan) || 0), 0);
    const totalBayar = tagihanList.reduce((sum, item) => sum + (Number(item.total_bayar) || 0), 0);
    const totalSisa = tagihanList.reduce((sum, item) => sum + (Number(item.sisa) || 0), 0);
    const countLunas = tagihanList.filter((item) => item.status === 'lunas').length;
    const countBelum = tagihanList.filter((item) => item.status === 'belum_bayar').length;

    return { totalTagihan, totalBayar, totalSisa, countLunas, countBelum };
  }, [tagihanList]);

  // Columns for DataTable
  const columns: ColumnDef<TagihanRecord>[] = [
    {
      key: 'select',
      label: '',
      align: 'center',
      headerRender: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            onChange={handleSelectAll}
            checked={tagihanList.length > 0 && selectedIds.length === tagihanList.length}
            className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer h-4 w-4"
            aria-label="Pilih semua tagihan"
          />
        </div>
      ),
      render: (row) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            onChange={() => handleToggleSelect(row.id)}
            className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer h-4 w-4"
            aria-label={`Pilih tagihan ${row.nomor_tagihan}`}
          />
        </div>
      ),
    },
    {
      key: 'nomor_tagihan',
      label: 'Invoice / Tanggal',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-mono text-xs font-bold text-slate-900 block">
            {row.nomor_tagihan}
          </span>
          <span className="text-2xs text-slate-500 block">
            {row.created_at || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'nama_mahasiswa',
      label: 'Mahasiswa / Calon Mhs',
      render: (row) => (
        <div className="space-y-1 max-w-[220px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-slate-800 line-clamp-1">
              {row.nama_mahasiswa}
            </span>
            {row.is_calon_mahasiswa ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                SPMB
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                SIAKAD
              </span>
            )}
          </div>
          <span className="font-mono text-2xs text-slate-500 block">
            {row.nim !== '-' ? row.nim : (row.calon_mahasiswa_id ? `Calon #${row.calon_mahasiswa_id}` : 'Belum Terhubung')} • {row.prodi}
          </span>
        </div>
      ),
    },
    {
      key: 'total_tagihan',
      label: 'Nominal & Sisa',
      render: (row) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-xs text-slate-900 block">
            {formatRupiah(row.total_tagihan)}
          </span>
          {row.sisa > 0 ? (
            <span className="text-2xs text-red-600 font-semibold block">
              Sisa: {formatRupiah(row.sisa)}
            </span>
          ) : (
            <span className="text-2xs text-emerald-600 font-semibold block">
              Lunas Penuh
            </span>
          )}
          {row.kelebihan_bayar && row.kelebihan_bayar > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded mt-0.5 w-fit">
              Lebih Bayar: {formatRupiah(row.kelebihan_bayar)}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status Tagihan',
      render: (row) => {
        if (row.status === 'lunas') {
          return (
            <Badge variant="green" className="text-[10px] font-bold flex items-center gap-1 w-fit">
              <CheckCircle2 size={12} /> LUNAS
            </Badge>
          );
        }
        if (row.status === 'sebagian') {
          return (
            <Badge variant="blue" className="text-[10px] font-bold flex items-center gap-1 w-fit">
              <Clock size={12} /> SEBAGIAN
            </Badge>
          );
        }
        return (
          <Badge variant="red" className="text-[10px] font-bold flex items-center gap-1 w-fit">
            <XCircle size={12} /> BELUM BAYAR
          </Badge>
        );
      },
    },
    {
      key: 'va_number',
      label: 'Metode / VA',
      render: (row) => {
        if (row.h2h_billing_id) {
          return (
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60 font-bold">
                <Landmark size={12} /> BSN H2H
              </span>
              <span className="font-mono text-2xs text-slate-500 block mt-0.5">Billing: {row.h2h_billing_id}</span>
              {(row.h2h_custid || row.h2h_id_tagihan) && (
                <span className="font-mono text-2xs text-slate-500 block">
                  CUSTID: {row.h2h_custid || row.h2h_billing_id} • Tagihan: {row.h2h_id_tagihan || '-'}
                </span>
              )}
            </div>
          );
        }
        if (row.va_number) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                {row.va_number}
              </span>
              <button
                type="button"
                onClick={() => handleCopyVa(row.va_number!, row.id)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Salin No VA"
              >
                {copiedVaId === row.id ? (
                  <Check size={13} className="text-emerald-600" />
                ) : (
                  <Copy size={13} />
                )}
              </button>
            </div>
          );
        }
        if (row.status === 'lunas') {
          return <span className="text-2xs text-slate-500 font-medium">Loket Kasir</span>;
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 font-medium">
            Xendit (Portal Mhs)
          </span>
        );
      },
    },
    {
      key: 'jatuh_tempo',
      label: 'Jatuh Tempo',
      render: (row) => (
        <span className="text-xs text-slate-600 font-mono">
          {row.jatuh_tempo || '-'}
        </span>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Lihat Rincian Biaya',
                icon: <FileText size={14} />,
                onClick: () => setSelectedDetail(row),
              },
              ...(row.status !== 'lunas' && Number(row.sisa) > 0
                ? [
                    {
                      label: 'Bayar di Loket Kasir',
                      icon: <CreditCard size={14} className="text-emerald-600" />,
                      onClick: () =>
                        router.push(
                          `/sikeu/pembayaran-mahasiswa/bayar?student_id=${row.mahasiswa_id || row.calon_mahasiswa_id}&is_calon=${row.is_calon_mahasiswa ? 1 : 0}&tagihan_id=${row.id}`
                        ),
                    },
                    ...(row.h2h_billing_id
                      ? [
                          {
                            label: 'Terbitkan Ulang VA BSN (H2H)',
                            icon: <Landmark size={14} className="text-teal-700" />,
                            onClick: () => handleTerbitkanH2h(row, true),
                          },
                        ]
                      : [
                          {
                            label: 'Terbitkan VA BSN (H2H)',
                            icon: <Landmark size={14} className="text-teal-700" />,
                            onClick: () => handleTerbitkanH2h(row),
                          },
                        ]),
                  ]
                : []),
              ...(Number(row.total_bayar) > 0 || (row.kelebihan_bayar && row.kelebihan_bayar > 0)
                ? [
                    {
                      label: 'Alihkan Pembayaran / Lebih Bayar',
                      icon: <ArrowRightLeft size={14} className="text-indigo-600" />,
                      onClick: () => handleOpenAlihkan(row),
                    },
                  ]
                : []),
              ...(row.va_number
                ? [
                    {
                      label: 'Salin No VA',
                      icon: <Copy size={14} />,
                      onClick: () => handleCopyVa(row.va_number!, row.id),
                    },
                  ]
                : []),
              {
                label: 'Hapus Tagihan',
                icon: <Trash2 size={14} className="text-rose-600" />,
                onClick: () => setDeletingId(row.id),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Tagihan Mahasiswa"
        description="Daftar seluruh invoice dan tagihan kuliah mahasiswa aktif serta calon mahasiswa (SPMB)."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              icon={<CreditCard size={16} />}
              onClick={() => router.push('/sikeu/pembayaran-mahasiswa/bayar')}
              className="font-bold min-h-[38px] text-xs"
            >
              Bayar di Loket Kasir
            </Button>
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              className="font-bold min-h-[38px] text-xs"
            >
              Filter
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => router.push('/sikeu/pembayaran-mahasiswa/tagihan/create')}
              className="font-bold min-h-[38px] text-xs px-3.5 shadow-sm"
            >
              Input Tagihan Baru
            </Button>
          </div>
        }
      />

      {/* KPI STATISTIK RINGKASAN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">Total Terbit</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
              {meta?.total || 0}
            </span>
            <span className="text-2xs text-slate-600 block mt-0.5 font-medium">Invoice Tagihan</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">Total Nominal</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
              {formatRupiah(summary.totalTagihan)}
            </span>
            <span className="text-2xs text-slate-600 block mt-0.5 font-medium">Nilai Tagihan Halaman Ini</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">Belum Bayar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-amber-700 font-mono">
              {summary.countBelum}
            </span>
            <span className="text-2xs text-amber-700 block mt-0.5 font-medium">Menunggu Pembayaran</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600">Lunas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700 font-mono">
              {summary.countLunas}
            </span>
            <span className="text-2xs text-emerald-700 block mt-0.5 font-medium">Tuntas Dibayar</span>
          </div>
        </div>
      </div>

      {/* SELECTION ACTIONS BANNER */}
      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-rose-50/80 border border-rose-200/80 rounded-2xl animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-rose-900">
              {selectedIds.length} tagihan dipilih dari daftar
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs bg-white text-slate-700 hover:bg-slate-50 min-h-[34px]"
            >
              Batal Pilih
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => setShowBatchDeleteDialog(true)}
              className="text-xs font-bold shadow-xs min-h-[34px]"
            >
              Hapus {selectedIds.length} Tagihan
            </Button>
          </div>
        </div>
      )}

      {/* DATA TABLE */}
      <DataTable
        data={tagihanList}
        isLoading={loadingList}
        columns={columns}
        meta={meta}
        onPageChange={(p) => setPage(p)}
        emptyMessage="Belum ada data tagihan mahasiswa yang diterbitkan."
      />

      {/* FILTER DRAWER */}
      <Drawer
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Data Tagihan"
        width="380px"
        footer={
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetFilter}
              className="font-bold text-slate-600 min-h-[40px] px-4 text-xs"
            >
              Reset Filter
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyFilter}
              className="font-bold min-h-[40px] px-5 text-xs shadow-md"
            >
              Terapkan Filter
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Cari Invoice, NIM, atau Nama"
            placeholder="Ketik kata kunci pencarian..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <Select
            label="Status Pembayaran"
            options={[
              { value: 'all', label: 'Semua Status Tagihan' },
              { value: 'belum_bayar', label: 'Belum Bayar' },
              { value: 'sebagian', label: 'Dibayar Sebagian' },
              { value: 'lunas', label: 'Lunas' },
            ]}
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as string)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Jatuh Tempo Dari"
              type="date"
              value={filterJatuhTempoDari}
              onChange={(e) => setFilterJatuhTempoDari(e.target.value)}
            />
            <Input
              label="Jatuh Tempo Sampai"
              type="date"
              value={filterJatuhTempoSampai}
              onChange={(e) => setFilterJatuhTempoSampai(e.target.value)}
            />
          </div>
        </div>
      </Drawer>

      {/* MODAL ALIKAN PEMBAYARAN / KOREKSI LEBIH BAYAR */}
      <Modal
        isOpen={alihkanModal.isOpen}
        onClose={() =>
          !alihkanModal.submitting &&
          setAlihkanModal((prev) => ({ ...prev, isOpen: false }))
        }
        title="Alihkan Pembayaran / Kelebihan Bayar"
        size="md"
      >
        {alihkanModal.sourceBill && (
          <div className="space-y-4">
            {/* Info Sumber Tagihan */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900">Tagihan Sumber</span>
                <span className="font-mono font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {alihkanModal.sourceBill.nomor_tagihan}
                </span>
              </div>
              <p className="text-slate-700 font-medium">
                Mahasiswa:{' '}
                <span className="font-bold text-slate-900">
                  {alihkanModal.sourceBill.nama_mahasiswa}
                </span>{' '}
                ({alihkanModal.sourceBill.nim})
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-indigo-200/60 font-mono">
                <div>
                  <span className="text-slate-500 block text-2xs">Total Bayar Saat Ini</span>
                  <span className="font-bold text-slate-800">
                    {formatRupiah(alihkanModal.sourceBill.total_bayar)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-2xs">Kelebihan Bayar</span>
                  <span
                    className={`font-bold ${
                      (alihkanModal.sourceBill.kelebihan_bayar || 0) > 0
                        ? 'text-purple-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {formatRupiah(alihkanModal.sourceBill.kelebihan_bayar || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Target Tagihan */}
            {alihkanModal.loadingTargets ? (
              <div className="p-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-primary-600" /> Memuat tagihan lain mahasiswa...
              </div>
            ) : alihkanModal.targetBills.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  Mahasiswa ini tidak memiliki tagihan aktif lain yang masih memiliki sisa pembayaran untuk menerima pengalihan dana.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Select
                  label="Pilih Tagihan Tujuan"
                  placeholder="-- Pilih Tagihan Tujuan --"
                  options={alihkanModal.targetBills.map((b) => ({
                    value: String(b.id),
                    label: `${b.nomor_tagihan} - ${b.jenis || b.periode_label || 'Tagihan'} (Sisa: ${formatRupiah(b.sisa)})`,
                  }))}
                  value={alihkanModal.selectedTargetId}
                  onChange={(val) => {
                    const targetId = val as string;
                    const target = alihkanModal.targetBills.find(
                      (b) => String(b.id) === targetId
                    );
                    let recNominal = alihkanModal.nominal;
                    if (!recNominal && target) {
                      recNominal = String(
                        Math.min(
                          target.sisa,
                          alihkanModal.sourceBill?.kelebihan_bayar &&
                            alihkanModal.sourceBill.kelebihan_bayar > 0
                            ? alihkanModal.sourceBill.kelebihan_bayar
                            : alihkanModal.sourceBill?.total_bayar || 0
                        )
                      );
                    }
                    setAlihkanModal((prev) => ({
                      ...prev,
                      selectedTargetId: targetId,
                      nominal: recNominal,
                    }));
                  }}
                />

                <Input
                  label="Nominal yang Dialihkan (Rp)"
                  type="number"
                  placeholder="Contoh: 500000"
                  value={alihkanModal.nominal}
                  onChange={(e) =>
                    setAlihkanModal((prev) => ({ ...prev, nominal: e.target.value }))
                  }
                />

                <Input
                  label="Alasan / Catatan Pengalihan"
                  placeholder="Contoh: Koreksi beasiswa baru / pengalihan lebih bayar"
                  value={alihkanModal.alasan}
                  onChange={(e) =>
                    setAlihkanModal((prev) => ({ ...prev, alasan: e.target.value }))
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() =>
                  setAlihkanModal((prev) => ({ ...prev, isOpen: false }))
                }
                disabled={alihkanModal.submitting}
                className="text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitAlihkan}
                disabled={
                  alihkanModal.submitting ||
                  alihkanModal.loadingTargets ||
                  alihkanModal.targetBills.length === 0 ||
                  !alihkanModal.selectedTargetId
                }
                className="text-xs font-bold shadow-sm"
              >
                {alihkanModal.submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" /> Memproses...
                  </>
                ) : (
                  'Proses Pengalihan'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL RINCIAN DETAIL BIAYA */}
      <Modal
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        title="Rincian Komponen Tagihan"
        size="md"
      >
        {selectedDetail && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 text-sm">{selectedDetail.nama_mahasiswa}</p>
              <p className="text-xs text-slate-500 font-mono">
                {selectedDetail.nim !== '-' ? `NIM: ${selectedDetail.nim}` : 'Calon Mahasiswa'} • {selectedDetail.prodi}
              </p>
              <p className="text-xs text-slate-500">
                Invoice:{' '}
                <span className="font-mono font-semibold text-slate-800">
                  {selectedDetail.nomor_tagihan}
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Daftar Komponen Biaya:</p>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                {selectedDetail.rincian_komponen && selectedDetail.rincian_komponen.length > 0 ? (
                  selectedDetail.rincian_komponen.map((r, i) => {
                    const terbayar = Number(r.terbayar || 0);
                    const sisaKomponen = r.sisa !== undefined ? Number(r.sisa) : Number(r.nominal) - terbayar;
                    return (
                      <div key={i} className="p-3 bg-white">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-800">{r.nama_biaya}</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(r.nominal)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-[11px]">
                          <span className="text-slate-500">
                            Terbayar: <span className="font-mono font-semibold text-emerald-700">{formatRupiah(terbayar)}</span>
                          </span>
                          <span className={sisaKomponen > 0 ? 'font-mono font-bold text-rose-700' : 'font-mono font-bold text-emerald-700'}>
                            Sisa: {formatRupiah(sisaKomponen)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 text-slate-400 italic text-center">
                    Rincian komponen biaya tidak tersedia
                  </div>
                )}
                <div className="p-3 flex justify-between items-center bg-slate-50 font-bold">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-primary-700 text-sm">{formatRupiah(selectedDetail.total_tagihan)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedDetail(null)}
                className="text-xs font-bold"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* KONFIRMASI HAPUS SATUAN */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Hapus Tagihan Mahasiswa"
        message="Apakah Anda yakin ingin menghapus tagihan mahasiswa ini? Tagihan yang belum dibayar beserta rinciannya akan dihapus secara permanen. Tagihan yang sudah lunas atau memiliki riwayat pembayaran tidak dapat dihapus."
        confirmText="Hapus Tagihan"
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* KONFIRMASI BATCH DELETE */}
      <ConfirmDialog
        isOpen={showBatchDeleteDialog}
        onClose={() => setShowBatchDeleteDialog(false)}
        onConfirm={handleConfirmBatchDelete}
        title={`Hapus ${selectedIds.length} Tagihan Sekaligus`}
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.length} tagihan mahasiswa yang dipilih secara permanen? Seluruh tagihan yang belum dibayar beserta nomor Virtual Account terkait akan dihapus. Tagihan yang sudah memiliki riwayat pembayaran tidak dapat dihapus.`}
        confirmText={`Ya, Hapus ${selectedIds.length} Tagihan`}
        cancelText="Batal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
