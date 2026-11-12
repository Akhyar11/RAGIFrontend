'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  X, 
  Check, 
  Clock, 
  FileText, 
  ShieldCheck, 
  Search, 
  RotateCcw, 
  User, 
  GraduationCap, 
  Users, 
  FileCheck, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Save, 
  AlertCircle,
  Hash,
  CreditCard,
  Download,
  UserCheck,
  Plus,
} from 'lucide-react';
import { spmbService, PendaftaranCalonMhs, PendaftaranBerkas } from '@/services/spmb.service';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Drawer } from '@/components/ui/Drawer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';

import { SPMB_STATUS_CONFIG, SpmbStatusBadge, SpmbPaymentBadge } from '@/components/spmb/SpmbStatusBadge';


// ============================================================
// SKEMA VALIDASI KEPUTUSAN ADMINISTRASI
// ============================================================
const decisionSchema = z.object({
  is_lulus: z.enum(['true', 'false'], {
    message: 'Pilih keputusan administrasi terlebih dahulu.',
  }),
  catatan: z.string().max(500, 'Catatan maksimal 500 karakter').optional().or(z.literal('')),
});

type DecisionFormValues = z.infer<typeof decisionSchema>;

// ============================================================
// CLEAN KEY-VALUE METADATA ITEM (NO CLUTTERED BOXES)
// ============================================================
function MetadataItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col py-1.5">
      <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 mb-0.5">{label}</span>
      <span className="text-sm font-bold text-slate-800 break-words leading-snug">
        {value || <span className="text-slate-400 font-normal italic text-xs">-</span>}
      </span>
    </div>
  );
}

// ============================================================
// SECTION ACCORDION WRAPPER (CLEAN ENTERPRISE DESIGN)
// ============================================================
function DetailSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  badgeCount
}: { 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  badgeCount?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-2xs overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between border-b border-slate-200/60 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary-100/60 text-primary-700">
            <Icon size={16} />
          </div>
          <span className="font-bold text-slate-800 text-sm">{title}</span>
          {badgeCount !== undefined && (
            <span className="px-2 py-0.5 text-2xs font-extrabold rounded-full bg-slate-200 text-slate-700">
              {badgeCount}
            </span>
          )}
        </div>
        <div className="text-slate-400 p-1">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 animate-fade-in divide-y divide-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function DataPendaftarPage() {
  const { hasPermission } = useAuth();
  const canKonversiMahasiswa = hasPermission('spmb.manage');

  const [data, setData] = useState<PendaftaranCalonMhs[]>([]);
  const [loading, setLoading] = useState(false);

  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterReferralCode, setFilterReferralCode] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('created_at');
  const [filterOrderDir, setFilterOrderDir] = useState('desc');
  
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    status: '',
    referral_code: '',
    orderBy: 'created_at',
    orderDir: 'desc'
  });

  const [paginationMeta, setPaginationMeta] = useState<any>(null);

  const [isForbidden, setIsForbidden] = useState(false);

  // Modal Keputusan Administrasi (aksi cepat dari daftar)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<PendaftaranCalonMhs | null>(null);

  const {
    register: registerDecision,
    handleSubmit: handleDecisionSubmit,
    setValue: setDecisionValue,
    watch: watchDecision,
    reset: resetDecision,
    formState: { errors: decisionErrors, isSubmitting: isSavingDecision },
  } = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { is_lulus: '' as unknown as 'true' | 'false', catatan: '' },
  });

  const decisionIsLulus = watchDecision('is_lulus');

  const handleOpenDecision = (row: PendaftaranCalonMhs) => {
    setDecisionTarget(row);
    resetDecision({ is_lulus: '' as unknown as 'true' | 'false', catatan: '' });
    setShowDecisionModal(true);
  };

  const handleSaveDecision = async (values: DecisionFormValues) => {
    if (!decisionTarget) return;

    try {
      await spmbService.updateStatusPendaftaran(decisionTarget.id, {
        status: values.is_lulus === 'true' ? 'lulus_administrasi' : 'gagal_administrasi',
        catatan_verifikasi: values.catatan,
      });
      toast.success('Keputusan administrasi berhasil disimpan.');
      setShowDecisionModal(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Gagal menyimpan keputusan administrasi.');
    }
  };

  const handleDownloadSkRow = async (row: PendaftaranCalonMhs) => {
    try {
      await spmbService.downloadSkLulusPdf(row.id, row.no_pendaftaran);
      toast.success(`SK Tanda Lulus ${row.nama_lengkap} berhasil diunduh.`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error?.response?.data?.message || 'Gagal mengunduh SK Tanda Lulus.');
    }
  };

  // State & handler Konversi ke Mahasiswa
  const [konversiTarget, setKonversiTarget] = useState<PendaftaranCalonMhs | null>(null);
  const [showKonversiConfirm, setShowKonversiConfirm] = useState(false);
  const [isKonversiLoading, setIsKonversiLoading] = useState(false);

  const handleOpenKonversi = (row: PendaftaranCalonMhs) => {
    if (row.status === 'mahasiswa_baru') {
      toast.error(`Pendaftar ini sudah dikonversi menjadi mahasiswa${row.nim ? ` (NIM: ${row.nim})` : ''}.`);
      return;
    }
    if (row.status !== 'lulus_administrasi') {
      toast.error('Belum memenuhi syarat konversi. Hanya pendaftar berstatus "Lulus Administrasi" yang dapat dijadikan mahasiswa.');
      return;
    }
    setKonversiTarget(row);
    setShowKonversiConfirm(true);
  };

  const handleKonversiMahasiswa = async () => {
    if (!konversiTarget) return;
    setIsKonversiLoading(true);
    try {
      const res = await spmbService.konversiMahasiswa(konversiTarget.id);
      toast.success(`✅ ${konversiTarget.nama_lengkap} berhasil dikonversi. NIM: ${res.data.nim}`);
      setShowKonversiConfirm(false);
      setKonversiTarget(null);
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      const msg = error?.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(' ')
        : error?.response?.data?.message || 'Gagal mengonversi ke mahasiswa.';
      toast.error(msg);
    } finally {
      setIsKonversiLoading(false);
    }
  };



  // Fetch Pendaftaran list with server-side pagination
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setIsForbidden(false);
      const queryParams: any = {
        page,
        per_page: perPage,
        order_by: appliedFilters.orderBy,
        order_dir: appliedFilters.orderDir,
      };
      if (appliedFilters.search?.trim()) {
        queryParams.search = appliedFilters.search.trim();
      }
      if (appliedFilters.status?.trim()) {
        queryParams.status = appliedFilters.status.trim();
      }
      if (appliedFilters.referral_code?.trim()) {
        queryParams.referral_code = appliedFilters.referral_code.trim();
      }

      const res = await spmbService.getPendaftaran(queryParams);

      let listData: any[] = [];
      let rawMeta: any = null;

      if (Array.isArray(res)) {
        listData = res;
      } else if (Array.isArray(res?.data)) {
        listData = res.data;
        rawMeta = res;
      } else if (Array.isArray(res?.data?.data)) {
        listData = res.data.data;
        rawMeta = res.data;
      } else if (Array.isArray(res?.data?.data?.data)) {
        listData = res.data.data.data;
        rawMeta = res.data.data;
      }

      setData(listData);
      const calculatedTotal = rawMeta?.total ?? listData.length;
      setTotalItems(calculatedTotal);

      if (rawMeta) {
        setPaginationMeta({
          current_page: rawMeta.current_page || page,
          last_page: rawMeta.last_page || 1,
          per_page: rawMeta.per_page || perPage,
          total: calculatedTotal,
          from: rawMeta.from || (listData.length > 0 ? (page - 1) * perPage + 1 : 0),
          to: rawMeta.to || Math.min(page * perPage, calculatedTotal),
        });
      }
    } catch (error: any) {
      if (error?.response?.status === 403 || error?.response?.status === 404 || error?.status === 403) {
        setIsForbidden(true);
      } else {
        toast.error(error.message || 'Gagal memuat data pendaftar');
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage, appliedFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const router = useRouter();

  const handleOpenDetail = (row: PendaftaranCalonMhs) => {
    router.push(`/spmb/pendaftaran/${row.id}`);
  };

  if (isForbidden) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-2xs">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 mb-1">404</h1>
        <h2 className="text-lg font-bold text-slate-700 mb-2">Halaman Tidak Ditemukan</h2>
        <p className="text-slate-500 text-sm max-w-md mb-6">
          Halaman ini tidak tersedia atau Anda tidak memiliki hak akses yang dikonfigurasikan untuk role Anda.
        </p>
        <Button variant="primary" onClick={() => router.push('/spmb/dashboard')}>
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Page Header with Real Data Count */}
      <PageHeader
        title="Data Pendaftaran"
        description="Kelola dan verifikasi berkas pendaftaran calon mahasiswa baru."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 font-extrabold text-xs">
              <Award size={14} />
              {totalItems} Pendaftar
            </span>

            <Button 
              variant="outline"
              icon={<Filter size={16} />} 
              onClick={() => setShowFilter(true)}
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 font-bold shadow-2xs"
            >
              Filter
            </Button>

            {canKonversiMahasiswa && (
              <Button icon={<Plus size={16} />} onClick={() => router.push('/spmb/pendaftaran/manual/create')} style={{ backgroundColor: 'var(--module-primary)' }}>
                Input Manual
              </Button>
            )}
          </div>
        }
      />

      {/* RESPONSIVE DATA DISPLAY: DESKTOP TABLE vs MOBILE CARDS */}
      
      {/* 1. DESKTOP VIEW (Table) */}
      <div className="hidden md:block">
        <DataTable 
          data={data}
          isLoading={loading}
          meta={paginationMeta}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => setPerPage(l)}
          columns={[
            { 
              key: 'no_pendaftaran', 
              label: 'No. Pendaftaran', 
              render: (row) => (
                <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded border border-slate-200">
                  {row.no_pendaftaran}
                </span>
              )
            },
            { 
              key: 'nama_lengkap', 
              label: 'Nama Pendaftar', 
              render: (row) => (
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    {row.nama_lengkap}
                    {row.sumber_pendaftaran === 'manual' && <Badge variant="spmb" className="text-2xs">Manual</Badge>}
                  </span>
                  <span className="text-2xs text-slate-500">
                    {row.nomor_paspor ? `Paspor: ${row.nomor_paspor}` : `NIK: ${row.nik || '-'}`}
                  </span>
                </div>
              )
            },
            { 
              key: 'program_studi', 
              label: 'Program Studi Pilihan', 
              render: (row) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800 text-xs">
                    1. {row.program_studi?.nama || '-'}
                  </span>
                  {row.program_studi_pilihan2?.nama && (
                    <span className="text-2xs text-slate-500">
                      2. {row.program_studi_pilihan2.nama}
                    </span>
                  )}
                </div>
              )
            },
            { 
              key: 'used_referral_code', 
              label: 'Referral', 
              render: (row) => (
                row.used_referral_code ? (
                  <span className="font-mono text-2xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                    {row.used_referral_code}
                  </span>
                ) : (
                  <span className="text-2xs text-slate-400">-</span>
                )
              )
            },
            { 
              key: 'status', 
              label: 'Status Pendaftaran & Pembayaran', 
              render: (row) => (
                <div className="flex flex-col items-start gap-1">
                  <SpmbStatusBadge status={row.status} />
                  <SpmbPaymentBadge status={row.status_pembayaran} />
                </div>
              )
            },
            { 
              key: 'actions', 
              label: 'Aksi', 
              align: 'right', 
              render: (row) => {
                const isLulus = row.status === 'lulus_administrasi' || row.status === 'mahasiswa_baru';
                const canKonversi = canKonversiMahasiswa;
                return (
                  <DropdownMenu
                    items={[
                      {
                        label: 'Verifikasi & Detail',
                        icon: <Eye size={15} />,
                        onClick: () => handleOpenDetail(row)
                      },
                      {
                        label: 'Keputusan Administrasi',
                        icon: <CheckCircle2 size={16} />,
                        onClick: () => handleOpenDecision(row)
                      },
                      ...(isLulus ? [
                        {
                          label: 'Unduh SK Kelulusan',
                          icon: <Download size={15} />,
                          onClick: () => handleDownloadSkRow(row)
                        }
                      ] : []),
                      ...(canKonversi ? [
                        {
                          label: 'Konversi ke Mahasiswa',
                          icon: <UserCheck size={16} />,
                          onClick: () => handleOpenKonversi(row)
                        }
                      ] : [])
                    ]}
                  />
                );
              }
            }
          ]}
        />
      </div>

      {/* 2. MOBILE VIEW (Mobile-First Registration Cards) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-8 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} className="text-slate-400" />}
            title="Data Pendaftaran Tidak Ditemukan"
            description="Belum ada data pendaftar calon mahasiswa yang sesuai dengan pencarian atau filter saat ini."
            action={
              (appliedFilters.search || appliedFilters.status || appliedFilters.referral_code) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterSearch('');
                    setFilterStatus('');
                    setFilterReferralCode('');
                    setAppliedFilters({ search: '', status: '', referral_code: '', orderBy: 'created_at', orderDir: 'desc' });
                    setPage(1);
                  }}
                  className="mt-2"
                >
                  Reset Filter
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {data.map((row) => (
              <div 
                key={row.id} 
                onClick={() => handleOpenDetail(row)}
                className="card p-4 bg-white border border-slate-200 shadow-2xs rounded-xl hover:border-primary-300 transition-all cursor-pointer space-y-3 active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{row.nama_lengkap}</h3>
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {row.no_pendaftaran}
                    </span>
                  </div>
                  <SpmbStatusBadge status={row.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-2xs font-medium">{row.nomor_paspor ? 'Paspor' : 'NIK'}</span>
                    <span className="text-slate-700 font-semibold">{row.nomor_paspor || row.nik || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs font-medium">Prodi Pilihan</span>
                    <span className="text-slate-700 font-semibold truncate block">
                      {row.program_studi?.nama || '-'}
                    </span>
                  </div>
                  {row.used_referral_code && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-2xs font-medium">Kode Referral</span>
                      <span className="text-slate-700 font-semibold font-mono">{row.used_referral_code}</span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-primary-600 font-bold">
                  <span>Buka Verifikasi Detail</span>
                  <span>→</span>
                </div>
              </div>
            ))}

            {/* Mobile Pagination Controls */}
            {paginationMeta && (
              <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ← Sebelumnya
                </Button>
                <span>Halaman {page} dari {paginationMeta.last_page || 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= (paginationMeta.last_page || 1)}
                  onClick={() => setPage(page + 1)}
                >
                  Berikutnya →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FILTER DRAWER */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Data Pendaftar"
        width="400px"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterSearch('');
                setFilterStatus('');
                setFilterReferralCode('');
                setFilterOrderBy('created_at');
                setFilterOrderDir('desc');
                setAppliedFilters({ search: '', status: '', referral_code: '', orderBy: 'created_at', orderDir: 'desc' });
                setShowFilter(false);
                setPage(1);
              }}
              className="w-1/2"
            >
              Reset
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                setAppliedFilters({
                  search: filterSearch,
                  status: filterStatus,
                  referral_code: filterReferralCode,
                  orderBy: filterOrderBy,
                  orderDir: filterOrderDir
                });
                setShowFilter(false);
                setPage(1);
              }}
              className="w-1/2 font-bold"
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Input 
            label="Pencarian Global"
            placeholder="Ketik nama, NIK, paspor, atau No. Pendaftaran..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <Select 
            label="Status Pendaftaran"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={[
              { value: '', label: 'Semua Status Pendaftaran' },
              { value: 'draft', label: 'Draft' },
              { value: 'submitted', label: 'Submitted (Menunggu Verifikasi)' },
              { value: 'verified', label: 'Verified (Terverifikasi)' },
              { value: 'lulus_administrasi', label: 'Lulus Administrasi' },
              { value: 'gagal_administrasi', label: 'Gagal Administrasi' }
            ]}
          />

          <Input
            label="Kode Referral"
            placeholder="REF-A1B2C3"
            value={filterReferralCode}
            onChange={(e) => setFilterReferralCode(e.target.value.toUpperCase())}
          />
          
          <hr style={{ borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'created_at', label: 'Tanggal Daftar' },
                { value: 'nama_lengkap', label: 'Nama Pendaftar' },
                { value: 'no_pendaftaran', label: 'No Pendaftaran' },
                { value: 'used_referral_code', label: 'Kode Referral' },
                { value: 'status', label: 'Status' }
              ]}
            />

            <Select 
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={[
                { value: 'asc', label: 'A - Z (Ascending)' },
                { value: 'desc', label: 'Z - A (Descending)' }
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* Modal Keputusan Administrasi */}
      <Modal
        open={showDecisionModal}
        onClose={() => setShowDecisionModal(false)}
        title="Keputusan Administrasi Pendaftar"
        footer={
          <>
            <Button variant="secondary" icon={<X size={16} />} onClick={() => setShowDecisionModal(false)} disabled={isSavingDecision}>
              Batal
            </Button>
            <Button
              type="submit"
              form="decision-form"
              variant="primary"
              icon={<Check size={16} />}
              loading={isSavingDecision}
              disabled={isSavingDecision}
            >
              Simpan Keputusan
            </Button>
          </>
        }
      >
        {decisionTarget && (
          <form id="decision-form" onSubmit={handleDecisionSubmit(handleSaveDecision)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-2xs font-extrabold uppercase tracking-wider text-slate-400 mb-1">Pendaftar</p>
              <p className="font-bold text-slate-800 text-sm">
                {decisionTarget.nama_lengkap} ({decisionTarget.no_pendaftaran})
              </p>
            </div>

            <div className="col-span-1 md:col-span-2">
              <Select
                label="Keputusan Kelulusan Administrasi"
                required
                error={decisionErrors.is_lulus?.message}
                value={decisionIsLulus}
                onChange={(val) => setDecisionValue('is_lulus', val as 'true' | 'false', { shouldValidate: true })}
                options={[
                  { value: '', label: '-- Pilih Keputusan --' },
                  { value: 'true', label: 'Lulus Administrasi' },
                  { value: 'false', label: 'Gagal Administrasi' },
                ]}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <Textarea
                label="Catatan Verifikasi (Opsional)"
                rows={3}
                placeholder="Berikan catatan jika diperlukan..."
                error={decisionErrors.catatan?.message}
                {...registerDecision('catatan')}
              />
            </div>
          </form>
        )}
      </Modal>

      {/* ConfirmDialog: Konversi ke Mahasiswa */}
      <ConfirmDialog
        isOpen={showKonversiConfirm}
        onClose={() => {
          if (!isKonversiLoading) {
            setShowKonversiConfirm(false);
            setKonversiTarget(null);
          }
        }}
        onConfirm={handleKonversiMahasiswa}
        title="Konversi ke Mahasiswa?"
        message={
          <span>
            Tindakan ini akan langsung menerbitkan <strong>NIM</strong>, mengaktifkan{' '}
            <strong>akun mahasiswa</strong>, dan membuat <strong>email kampus</strong> untuk{' '}
            <strong>{konversiTarget?.nama_lengkap}</strong>.
            <br /><br />
            <span className="text-amber-600 font-semibold">
              ⚠️ Tindakan ini tidak dapat dibatalkan.
            </span>
          </span>
        }
        confirmText="Ya, Konversi Sekarang"
        cancelText="Batal"
        variant="warning"
        isLoading={isKonversiLoading}
      />
    </div>
  );
}
