'use client';

import { formatRupiah, formatDate } from '@/lib/utils';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download, Filter, Search, RefreshCw, AlertCircle, CheckCircle2, XCircle, Clock, ShieldAlert, FileSpreadsheet, UserX, FileText, Eye, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { sikeuService } from '@/services/sikeu.service';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DropdownMenu } from '@/components/ui/DropdownMenu';

interface PiutangItem {
  id: number;
  nomor_tagihan: string;
  mahasiswa_id: number;
  nim: string;
  nama_mahasiswa: string;
  angkatan: number;
  program_studi: string;
  tahun_akademik_id: number | null;
  tahun_akademik: string;
  total_tagihan: number;
  total_potongan: number;
  total_denda: number;
  total_bayar: number;
  sisa_piutang: number;
  status: string;
  jatuh_tempo: string | null;
  created_at: string | null;
  has_dispensasi: boolean;
  umur_piutang_hari?: number | null;
  bucket_umur?: string | null;
}



export default function PiutangMahasiswaPage() {
  const router = useRouter();
  const [data, setData] = useState<PiutangItem[]>([]);
  const [viewMode, setViewMode] = useState<'tagihan' | 'mahasiswa'>('tagihan');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [prodiList, setProdiList] = useState<{ value: string; label: string }[]>([]);

  // Summary Metrics
  const [summary, setSummary] = useState({
    total_tagihan: 0,
    total_potongan: 0,
    total_denda: 0,
    total_bayar: 0,
    total_piutang: 0,
    total_mahasiswa_tunggakan: 0,
    total_record_dispensasi: 0,
    aging: {
      belum_jatuh_tempo: 0,
      umur_1_30: 0,
      umur_31_60: 0,
      umur_61_90: 0,
      umur_lebih_90: 0,
    },
  });

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 15,
    total: 0,
    last_page: 1,
  });

  // Filter Drawer State
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('all');
  const [filterProdi, setFilterProdi] = useState('all');
  const [filterCutoffDate, setFilterCutoffDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('piutang');
  const [filterTahunAkademik, setFilterTahunAkademik] = useState('all');
  const [filterSortBy, setFilterSortBy] = useState('sisa_piutang');
  const [filterSortOrder, setFilterSortOrder] = useState('desc');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    angkatan: 'all',
    prodi: 'all',
    cutoff_date: '',
    status: 'piutang',
    tahun_akademik_id: 'all',
    sort_by: 'sisa_piutang',
    sort_order: 'desc',
  });

  const [angkatanList, setAngkatanList] = useState<{ value: string; label: string }[]>([]);
  const [tahunAkademikList, setTahunAkademikList] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [resProdi, resAngkatan, resTa] = await Promise.all([
          sikeuService.getProgramStudiList(),
          sikeuService.getAngkatanList().catch(() => ({ data: [] })),
          sikeuService.getTahunAkademikList().catch(() => ({ data: [] })),
        ]);
        if (Array.isArray(resProdi.data)) {
          setProdiList(
            resProdi.data.map((p: any) => ({
              value: String(p.id),
              label: p.jenjang ? `${p.jenjang} - ${p.nama || p.nama_prodi}` : (p.nama || p.nama_prodi),
            }))
          );
        }
        if (Array.isArray(resAngkatan.data)) {
          setAngkatanList(
            resAngkatan.data.map((a: number) => ({
              value: String(a),
              label: `Angkatan ${a}`,
            }))
          );
        }
        if (Array.isArray(resTa.data)) {
          setTahunAkademikList(
            resTa.data.map((t: any) => ({
              value: String(t.id),
              label: t.nama || t.tahun_akademik || `TA ${t.id}`,
            }))
          );
        }
      } catch {
        // Fallback
      }
    };
    loadMasters();
  }, []);

  const fetchPiutang = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await sikeuService.getPiutangMahasiswa({
        page,
        per_page: pagination.per_page,
        search: appliedFilters.search,
        angkatan: appliedFilters.angkatan === 'all' ? undefined : appliedFilters.angkatan,
        program_studi_id: appliedFilters.prodi === 'all' ? undefined : appliedFilters.prodi,
        cutoff_date: appliedFilters.cutoff_date || undefined,
        status: appliedFilters.status === 'all' ? undefined : appliedFilters.status,
        tahun_akademik_id: appliedFilters.tahun_akademik_id === 'all' ? undefined : appliedFilters.tahun_akademik_id,
        sort_by: appliedFilters.sort_by,
        sort_order: appliedFilters.sort_order,
        group_by: viewMode,
      });

      if (res && res.data) {
        setData(res.data);
        if (res.meta) {
          setPagination({
            current_page: res.meta.current_page || 1,
            per_page: res.meta.per_page || 15,
            total: res.meta.total || 0,
            last_page: res.meta.last_page || 1,
          });
        }
        if ((res as any).summary) {
          setSummary((res as any).summary);
        }
      }
    } catch {
      toast.error('Gagal memuat data piutang mahasiswa');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, pagination.per_page, viewMode]);

  useEffect(() => {
    fetchPiutang(1);
  }, [appliedFilters, viewMode, fetchPiutang]);

  const handleApplyFilter = () => {
    setAppliedFilters({
      search: filterSearch,
      angkatan: filterAngkatan,
      prodi: filterProdi,
      cutoff_date: filterCutoffDate,
      status: filterStatus,
      tahun_akademik_id: filterTahunAkademik,
      sort_by: filterSortBy,
      sort_order: filterSortOrder,
    });
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterAngkatan('all');
    setFilterProdi('all');
    setFilterCutoffDate('');
    setFilterStatus('piutang');
    setFilterTahunAkademik('all');
    setFilterSortBy('sisa_piutang');
    setFilterSortOrder('desc');
    setAppliedFilters({
      search: '',
      angkatan: 'all',
      prodi: 'all',
      cutoff_date: '',
      status: 'piutang',
      tahun_akademik_id: 'all',
      sort_by: 'sisa_piutang',
      sort_order: 'desc',
    });
    setShowFilter(false);
  };

  const handleDownloadExcel = async () => {
    try {
      setDownloading(true);
      await sikeuService.downloadPiutangExcel({
        search: appliedFilters.search,
        angkatan: appliedFilters.angkatan === 'all' ? undefined : appliedFilters.angkatan,
        program_studi_id: appliedFilters.prodi === 'all' ? undefined : appliedFilters.prodi,
        cutoff_date: appliedFilters.cutoff_date || undefined,
        status: appliedFilters.status === 'all' ? undefined : appliedFilters.status,
        tahun_akademik_id: appliedFilters.tahun_akademik_id === 'all' ? undefined : appliedFilters.tahun_akademik_id,
      });
      toast.success('Laporan Piutang Excel berhasil diunduh');
    } catch {
      toast.error('Gagal mengunduh file Excel piutang');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status: string, hasDispensasi: boolean) => {
    if (hasDispensasi || status === 'dispensasi') {
      return (
        <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold inline-flex items-center gap-1">
          <Clock size={12} /> Dispensasi
        </span>
      );
    }
    switch (status) {
      case 'lunas':
        return (
          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1">
            <CheckCircle2 size={12} /> Lunas
          </span>
        );
      case 'sebagian':
        return (
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1">
            <Clock size={12} /> Bayar Sebagian
          </span>
        );
      case 'belum_bayar':
      default:
        return (
          <span className="badge bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold inline-flex items-center gap-1">
            <AlertCircle size={12} /> Belum Bayar
          </span>
        );
    }
  };

  const columns: ColumnDef<PiutangItem>[] = [
    {
      key: 'nomor_tagihan',
      label: viewMode === 'mahasiswa' ? 'TAGIHAN TERKAIT' : 'NOMOR TAGIHAN',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">
            {row.nomor_tagihan}
          </span>
          {viewMode === 'mahasiswa' && Array.isArray((row as any).nomor_tagihan_list) ? (
            <div className="mt-1 flex flex-wrap gap-1 max-w-xs">
              {(row as any).nomor_tagihan_list.slice(0, 3).map((no: string) => (
                <span key={no} className="font-mono text-2xs text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                  {no}
                </span>
              ))}
              {(row as any).nomor_tagihan_list.length > 3 && (
                <span className="text-2xs text-slate-500 font-semibold">
                  +{(row as any).nomor_tagihan_list.length - 3} lainnya
                </span>
              )}
            </div>
          ) : (
            <span className="text-2xs block text-slate-400 font-semibold mt-1">Periode: {row.tahun_akademik || '-'}</span>
          )}
        </div>
      ),
    },
    {
      key: 'nama_mahasiswa',
      label: 'MAHASISWA',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <span>{row.nama_mahasiswa}</span>
            {(row as any).is_calon_mahasiswa && (
              <span className="badge badge-amber text-[10px] font-bold py-0 px-1">Calon Mhs</span>
            )}
          </p>
          <p className="font-mono text-xs text-slate-500">
            {row.nim && row.nim !== '-' ? `NIM: ${row.nim}` : ((row as any).no_pendaftaran ? `Reg: ${(row as any).no_pendaftaran}` : '-')}
          </p>
        </div>
      ),
    },
    {
      key: 'angkatan',
      label: 'ANGKATAN & PRODI',
      render: (row) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">{row.program_studi}</p>
          <p className="text-2xs text-slate-500">Angkatan {row.angkatan}</p>
        </div>
      ),
    },
    {
      key: 'total_tagihan',
      label: 'TOTAL TAGIHAN',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 tabular-nums text-sm">
            {formatRupiah(row.total_tagihan)}
          </span>
          {row.total_potongan > 0 && (
            <span className="text-2xs text-emerald-600 block mt-0.5 font-medium">
              Potongan: -{formatRupiah(row.total_potongan)}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'total_bayar',
      label: 'TERBAYAR',
      render: (row) => (
        <span className="font-bold text-emerald-700 tabular-nums text-sm">
          {formatRupiah(row.total_bayar)}
        </span>
      ),
    },
    {
      key: 'sisa_piutang',
      label: 'SISA PIUTANG',
      render: (row) => (
        <div>
          <span className={`font-bold tabular-nums text-sm ${row.sisa_piutang > 0 ? 'text-rose-700' : 'text-slate-600'}`}>
            {formatRupiah(row.sisa_piutang)}
          </span>
          {row.jatuh_tempo && (
            <span className="text-2xs text-slate-400 block mt-0.5">
              Jatuh Tempo: {formatDate(row.jatuh_tempo)}
            </span>
          )}
          {row.sisa_piutang > 0 && (row.umur_piutang_hari ?? 0) > 0 && (
            <span className="text-2xs font-bold text-rose-600 block mt-0.5">
              Telat {row.umur_piutang_hari} hari
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      render: (row) => {
        if (row.status === 'lunas') {
          return (
            <span className="badge badge-green text-xs font-bold inline-flex items-center gap-1">
              <CheckCircle2 size={12} /> Lunas
            </span>
          );
        }
        if (row.status === 'sebagian') {
          return (
            <span className="badge badge-yellow text-xs font-bold inline-flex items-center gap-1">
              <Clock size={12} /> Bayar Sebagian
            </span>
          );
        }
        if (row.has_dispensasi || row.status === 'dispensasi') {
          return (
            <span className="badge badge-orange text-xs font-bold inline-flex items-center gap-1">
              <AlertCircle size={12} /> Dispensasi
            </span>
          );
        }
        return (
          <span className="badge badge-red text-xs font-bold inline-flex items-center gap-1">
            <XCircle size={12} /> Belum Bayar
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'AKSI',
      align: 'right',
      render: (row) => {
        const searchKey = row.nim && row.nim !== '-'
          ? row.nim
          : ((row as any).no_pendaftaran || row.nama_mahasiswa || row.nomor_tagihan);
        return (
          <div className="flex items-center justify-end">
            <DropdownMenu
              items={
                viewMode === 'mahasiswa'
                  ? [
                      {
                        label: 'Lihat Rincian Tagihan',
                        icon: <Eye size={14} />,
                        onClick: () => {
                          setFilterSearch(searchKey);
                          setAppliedFilters((prev) => ({ ...prev, search: searchKey }));
                          setViewMode('tagihan');
                        },
                      },
                      {
                        label: 'Buka di Daftar Tagihan',
                        icon: <FileText size={14} />,
                        onClick: () => router.push(`/sikeu/pembayaran-mahasiswa/tagihan?search=${encodeURIComponent(searchKey)}`),
                      },
                    ]
                  : [
                      {
                        label: 'Detail Tagihan',
                        icon: <Eye size={14} />,
                        onClick: () => router.push(`/sikeu/pembayaran-mahasiswa/tagihan?search=${encodeURIComponent(row.nomor_tagihan || searchKey)}`),
                      },
                    ]
              }
            />
          </div>
        );
      },
    },
  ];

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.search) count++;
    if (appliedFilters.angkatan !== 'all') count++;
    if (appliedFilters.status !== 'piutang') count++;
    if (appliedFilters.tahun_akademik_id !== 'all') count++;
    return count;
  }, [appliedFilters]);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <PageHeader
        title="Laporan & Rekapitulasi Piutang Mahasiswa"
        description="Pantau daftar tunggakan dan sisa pembayaran tagihan mahasiswa berdasarkan periode dan angkatan."
        action={
          <div className="flex items-center gap-2.5 flex-wrap print:hidden">
            <Button
              variant="outline"
              icon={<Printer size={16} />}
              onClick={() => window.print()}
              className="font-bold text-xs"
            >
              Cetak
            </Button>
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              className="font-bold min-h-[40px]"
            >
              Filter
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-2xs bg-primary-600 text-white rounded-full font-extrabold">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
            <Button
              variant="primary"
              icon={<FileSpreadsheet size={16} />}
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="font-bold min-h-[40px] px-4 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {downloading ? 'Mengunduh...' : 'Download Excel'}
            </Button>
          </div>
        }
      />



      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>TOTAL PIUTANG AKTIF</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={15} />
            </div>
          </div>
          <p className="text-xl font-black text-rose-700 tabular-nums">
            {formatRupiah(summary.total_piutang || 0)}
          </p>
          <p className="text-2xs text-slate-400">Total sisa tagihan belum terlunasi</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>TOTAL TAGIHAN TERBIT</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText size={15} />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 tabular-nums">
            {formatRupiah(summary.total_tagihan || 0)}
          </p>
          <p className="text-2xs text-slate-400">Kotor sebelum potongan & beasiswa</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>TOTAL TERBAYAR</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-xl font-black text-emerald-700 tabular-nums">
            {formatRupiah(summary.total_bayar || 0)}
          </p>
          <p className="text-2xs text-slate-400">Kas masuk loket & gateway</p>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>MAHASISWA TERTUNGGAK</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserX size={15} />
            </div>
          </div>
          <p className="text-xl font-black text-amber-800 tabular-nums">
            {summary.total_mahasiswa_tunggakan || 0} Mahasiswa
          </p>
          <p className="text-2xs text-slate-400">Memiliki tunggakan aktif</p>
        </div>
      </div>

      {/* Umur Piutang (Aging) */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-3">
        <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Umur Piutang per Jatuh Tempo</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Belum Jatuh Tempo', value: summary.aging.belum_jatuh_tempo, tone: 'text-slate-700' },
            { label: 'Telat 1–30 hari', value: summary.aging.umur_1_30, tone: 'text-amber-700' },
            { label: 'Telat 31–60 hari', value: summary.aging.umur_31_60, tone: 'text-amber-800' },
            { label: 'Telat 61–90 hari', value: summary.aging.umur_61_90, tone: 'text-orange-700' },
            { label: 'Telat > 90 hari', value: summary.aging.umur_lebih_90, tone: 'text-rose-700' },
          ].map((b) => (
            <div key={b.label} className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <p className="text-2xs font-bold text-slate-500">{b.label}</p>
              <p className={`text-sm font-black tabular-nums ${b.tone}`}>{formatRupiah(b.value || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Cutoff Date Active Banner */}
      {appliedFilters.cutoff_date && (
        <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-medium shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <span>
              Menampilkan Posisi Piutang per Tanggal Cutoff: <strong>{appliedFilters.cutoff_date}</strong>. Transaksi pembayaran setelah tanggal ini diabaikan dalam kalkulasi saldo sisa.
            </span>
          </div>
          <button
            onClick={() => {
              setFilterCutoffDate('');
              setAppliedFilters((prev) => ({ ...prev, cutoff_date: '' }));
            }}
            className="text-xs text-amber-900 font-bold underline hover:text-amber-950 shrink-0 ml-4"
          >
            Hapus Cutoff
          </button>
        </div>
      )}

      {/* Filter Badges Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-2xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <span className="font-bold text-slate-500">Filter Aktif:</span>
          {appliedFilters.search && (
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700">
              Pencarian: &quot;{appliedFilters.search}&quot;
            </span>
          )}
          {appliedFilters.prodi !== 'all' && (
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700">
              Prodi: {prodiList.find((p) => p.value === appliedFilters.prodi)?.label || appliedFilters.prodi}
            </span>
          )}
          {appliedFilters.cutoff_date && (
            <span className="px-2 py-1 bg-amber-100 border border-amber-300 rounded-md font-bold text-amber-900">
              Cutoff: {appliedFilters.cutoff_date}
            </span>
          )}
          {appliedFilters.angkatan !== 'all' && (
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700">
              Angkatan: {appliedFilters.angkatan}
            </span>
          )}
          {appliedFilters.status !== 'piutang' && (
            <span className="px-2 py-1 bg-white border border-slate-200 rounded-md font-semibold text-slate-700">
              Status: {appliedFilters.status}
            </span>
          )}
          <button
            onClick={handleResetFilter}
            className="text-xs text-rose-600 font-bold hover:underline ml-auto"
          >
            Reset Filter
          </button>
        </div>
      )}

      {/* View Mode Switcher */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('tagihan')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              viewMode === 'tagihan'
                ? 'bg-white text-[var(--module-primary,#2563eb)] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Detail per Tagihan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mahasiswa')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              viewMode === 'mahasiswa'
                ? 'bg-white text-[var(--module-primary,#2563eb)] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Rekap per Mahasiswa
          </button>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        data={data}
        isLoading={loading}
        columns={columns}
        meta={pagination}
        onPageChange={(p) => fetchPiutang(p)}
        emptyMessage="Tidak ada data piutang mahasiswa yang ditemukan."
      />

      {/* Filter Drawer Slide-Out */}
      <Drawer open={showFilter} onClose={() => setShowFilter(false)} title="Filter Piutang Mahasiswa">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cari NIM / Nama Mahasiswa</label>
            <Input
              placeholder="Masukkan NIM atau Nama..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Program Studi</label>
            <Select
              value={filterProdi}
              onChange={(val: any) => setFilterProdi(typeof val === 'object' && val?.target ? val.target.value : (val || 'all'))}
              options={[
                { value: 'all', label: 'Semua Program Studi' },
                ...prodiList,
              ]}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Cutoff Tanggal (Posisi Piutang)</label>
              <button
                type="button"
                onClick={() => setFilterCutoffDate(new Date().toISOString().split('T')[0])}
                className="text-2xs text-primary-600 font-bold hover:underline"
              >
                Set Hari Ini
              </button>
            </div>
            <Input
              type="date"
              value={filterCutoffDate}
              onChange={(e) => setFilterCutoffDate(e.target.value)}
            />
            <p className="text-2xs text-slate-400 mt-1">Hitung saldo piutang dan tagihan hanya sampai tanggal batas ini.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Filter Tahun Angkatan</label>
            <Select
              value={filterAngkatan}
              onChange={(val: any) => setFilterAngkatan(typeof val === 'object' && val?.target ? val.target.value : (val || 'all'))}
              options={[
                { value: 'all', label: 'Semua Angkatan' },
                ...angkatanList,
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Akademik</label>
            <Select
              value={filterTahunAkademik}
              onChange={(val: any) => setFilterTahunAkademik(typeof val === 'object' && val?.target ? val.target.value : (val || 'all'))}
              options={[
                { value: 'all', label: 'Semua Tahun Akademik' },
                ...tahunAkademikList,
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Status Pembayaran</label>
            <Select
              value={filterStatus}
              onChange={(val: any) => setFilterStatus(typeof val === 'object' && val?.target ? val.target.value : (val || 'piutang'))}
              options={[
                { value: 'piutang', label: 'Semua Piutang (Belum Lunas)' },
                { value: 'belum_bayar', label: 'Belum Bayar' },
                { value: 'sebagian', label: 'Bayar Sebagian' },
                { value: 'dispensasi', label: 'Dispensasi' },
                { value: 'lunas', label: 'Lunas' },
                { value: 'all', label: 'Semua Status (Termasuk Lunas)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Urutkan Berdasarkan</label>
              <Select
                value={filterSortBy}
                onChange={(val: any) => setFilterSortBy(typeof val === 'object' && val?.target ? val.target.value : (val || 'sisa_piutang'))}
                options={[
                  { value: 'sisa_piutang', label: 'Sisa Piutang' },
                  { value: 'nama_mahasiswa', label: 'Nama Mahasiswa' },
                  { value: 'nim', label: 'NIM' },
                  { value: 'jatuh_tempo', label: 'Jatuh Tempo' },
                  { value: 'nomor_tagihan', label: 'Nomor Tagihan' },
                  { value: 'total_tagihan', label: 'Total Tagihan' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Arah Urutan</label>
              <Select
                value={filterSortOrder}
                onChange={(val: any) => setFilterSortOrder(typeof val === 'object' && val?.target ? val.target.value : (val || 'desc'))}
                options={[
                  { value: 'asc', label: 'Menaik (A-Z / Kecil-Besar)' },
                  { value: 'desc', label: 'Menurun (Z-A / Besar-Kecil)' },
                ]}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <Button variant="outline" className="flex-1 font-bold" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" className="flex-1 font-bold" onClick={handleApplyFilter}>
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
