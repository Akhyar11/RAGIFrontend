'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter, Trash2, CheckCircle2, Edit, ArrowRight, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu, type DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Checkbox } from '@/components/ui/Checkbox';
import { siakadService } from '@/services/siakad.service';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function KonversiTransferPage() {
  const router = useRouter();
  const { isSuperAdmin, hasRole, hasPermission } = useAuth();
  const isDosen = hasRole('dosen');
  const isStaff = isSuperAdmin
    || hasPermission('siakad.konversi.manage')
    || hasPermission('siakad.master.manage')
    || hasPermission('siakad.kurikulum.manage')
    || hasPermission('siakad.pa.manage');

  const [konversis, setKonversis] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [meta, setMeta] = useState<any>(null);

  // Filter Drawer States
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterMhs, setFilterMhs] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSortBy, setFilterSortBy] = useState<string>('created_at');
  const [filterSortOrder, setFilterSortOrder] = useState<string>('desc');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    mhsId: '',
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  const [deletingKonversi, setDeletingKonversi] = useState<any | null>(null);

  // Verifikasi per-MK (setujui sebagian / tolak)
  const [verifTarget, setVerifTarget] = useState<any | null>(null);
  const [verifDetails, setVerifDetails] = useState<{ id: number; status: string; catatan_penolakan: string }[]>([]);
  const [verifCatatan, setVerifCatatan] = useState('');
  const [savingVerif, setSavingVerif] = useState(false);

  // Pilih banyak usulan (verifikasi massal per mahasiswa)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [savingBulkVerif, setSavingBulkVerif] = useState(false);

  // Kurikulum prodi mhs terpilih (hitung kekurangan SKS)
  const [verifKurikulum, setVerifKurikulum] = useState<any | null>(null);

  const loadMahasiswaOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await siakadService.getMahasiswas({
        search: inputValue || undefined,
        per_page: 20,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      return list.map((m: any) => ({
        value: m.id,
        label: `${m.nim || 'Tanpa NIM'} - ${m.nama_lengkap} (${m.program_studi?.nama || 'Prodi'})`,
      }));
    } catch {
      return [];
    }
  }, []);

  const fetchKonversi = useCallback(async () => {
    try {
      setLoading(true);
      const res = await siakadService.getKonversis({
        page,
        per_page: limit,
        search: appliedFilters.search || undefined,
        mahasiswa_id: appliedFilters.mhsId || undefined,
        status: appliedFilters.status !== 'all' ? appliedFilters.status : undefined,
        sort_by: appliedFilters.sortBy,
        sort_order: appliedFilters.sortOrder,
      });
      if (res.data) setKonversis(res.data);
      if (res.meta) setMeta(res.meta);
    } catch {
      toast.error('Gagal memuat data konversi transfer');
    } finally {
      setLoading(false);
    }
  }, [page, limit, appliedFilters]);

  useEffect(() => {
    fetchKonversi();
  }, [fetchKonversi]);

  const openVerifikasi = async (row: any) => {
    setVerifTarget(row);
    setVerifDetails(
      (row.details || []).map((d: any) => ({
        id: d.id,
        status: d.status || 'diakui',
        catatan_penolakan: d.catatan_penolakan || '',
      }))
    );
    setVerifCatatan(row.catatan || '');
    setVerifKurikulum(null);
    try {
      const prodiId = row.mahasiswa?.program_studi_id;
      if (prodiId) {
        const res = await siakadService.getKurikulums({ program_studi_id: prodiId });
        const list = Array.isArray(res.data) ? res.data : [];
        setVerifKurikulum(list[0] || null);
      }
    } catch {}
  };

  const verifSks = (() => {
    const details = verifTarget?.details || [];
    const diakui = details.filter((d: any) => {
      const st = verifDetails.find((v) => v.id === d.id);
      return (st?.status || d.status || 'diakui') === 'diakui';
    });
    const sksDiakui = diakui.reduce((a: number, d: any) => a + Number(d.mata_kuliah_diakui?.total_sks || d.sks_asal || 0), 0);
    const wajib = Number(verifKurikulum?.total_sks_lulus || 0);
    return { diakui: diakui.length, ditolak: details.length - diakui.length, sksDiakui, wajib, kurang: wajib > 0 ? Math.max(0, wajib - sksDiakui) : 0 };
  })();

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    const eligible = isStaff
      ? konversis.filter((item: any) => item.status === 'menunggu_kaprodi').map((item: any) => item.id)
      : [];
    setSelectedIds((prev) => (eligible.length > 0 && prev.length === eligible.length ? [] : eligible));
  };

  const handleBulkVerifikasi = async (status: 'disetujui' | 'ditolak') => {
    if (!isStaff || selectedIds.length === 0) return;
    try {
      setSavingBulkVerif(true);
      const res = await siakadService.bulkUpdateKonversiStatus({ ids: selectedIds, status });
      toast.success(res.message || `Verifikasi massal ${status} berhasil`);
      setSelectedIds([]);
      fetchKonversi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal verifikasi massal');
    } finally {
      setSavingBulkVerif(false);
    }
  };

  const handleVerifikasi = async (status: 'menunggu_pa' | 'menunggu_kaprodi' | 'disetujui' | 'ditolak') => {
    if (!verifTarget) return;
    try {
      setSavingVerif(true);
      const res = await siakadService.updateKonversiStatus(verifTarget.id, {
        status,
        catatan: verifCatatan || undefined,
        details: verifDetails,
      });
      toast.success(res.message || `Konversi diproses ke tahap ${status}`);
      setVerifTarget(null);
      fetchKonversi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal memproses verifikasi');
    } finally {
      setSavingVerif(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingKonversi) return;
    try {
      await siakadService.deleteKonversi(deletingKonversi.id);
      toast.success('Konversi transfer berhasil dihapus');
      setDeletingKonversi(null);
      fetchKonversi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menghapus konversi transfer');
    }
  };

  const selectedIdsReadyForFinalDecision = selectedIds.length > 0
    && selectedIds.every((id) => konversis.some((item: any) => item.id === id && item.status === 'menunggu_kaprodi'));
  const verificationTargetStatus = verifTarget?.status === 'diajukan'
    ? 'menunggu_pa'
    : verifTarget?.status === 'menunggu_pa'
      ? 'menunggu_kaprodi'
      : verifTarget?.status === 'menunggu_kaprodi'
        ? 'disetujui'
        : null;

  const columns: ColumnDef<any>[] = [
    {
      key: 'select',
      label: (
        <div className="flex items-center justify-center">
          <Checkbox
            label=""
            checked={
              konversis.some((item: any) => item.status === 'menunggu_kaprodi')
              && selectedIds.length === konversis.filter((item: any) => item.status === 'menunggu_kaprodi').length
            }
            onChange={handleSelectAll}
          />
        </div>
      ),
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center">
          <Checkbox
            label=""
            checked={selectedIds.includes(row.id)}
            disabled={!isStaff || row.status !== 'menunggu_kaprodi'}
            onChange={() => handleToggleSelect(row.id)}
          />
        </div>
      ),
    },
    {
      key: 'no_transaksi',
      label: 'NO TRANSAKSI',
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900 text-xs block">
            {row.no_transaksi}
          </span>
          {row.nomor_sk && (
            <div className="flex items-center gap-1 mt-1">
              <span className="font-mono text-3xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1" title={row.nomor_sk}>
                SK: {row.nomor_sk}
              </span>
              {row.arsip_nomor_surat?.has_dokumen && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Dokumen fisik SK terverifikasi di modul Arsip" />
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'mahasiswa',
      label: 'MAHASISWA TRANSFER',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-sm block">
            {row.mahasiswa?.nama_lengkap}
          </span>
          <span className="font-mono text-2xs text-slate-400">
            NIM: {row.mahasiswa?.nim || '-'} • {row.mahasiswa?.program_studi?.nama || 'Prodi'}
          </span>
        </div>
      ),
    },
    {
      key: 'kampus_asal',
      label: 'KAMPUS & PRODI ASAL',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">
            {row.kampus_asal}
          </span>
          <span className="text-2xs text-slate-500">
            Prodi: {row.prodi_asal}
          </span>
        </div>
      ),
    },
    {
      key: 'penyetaraan',
      label: 'PENYETARAAN MK DIAKUI',
      render: (row) => (
        <div className="space-y-1 py-1">
          {row.details?.map((d: any) => (
            <div key={d.id} className="text-2xs flex items-center gap-1.5 font-medium">
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                {d.kode_mk_asal} ({d.nilai_huruf_asal})
              </span>
              <ArrowRight size={11} className="text-slate-400 shrink-0" />
              <span className="font-bold text-primary-700">
                {d.mata_kuliah_diakui?.nama} ({d.mata_kuliah_diakui?.total_sks} SKS)
              </span>
              {(d.status || 'diakui') === 'ditolak' && (
                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold" title={d.catatan_penolakan || 'Ditolak'}>
                  Ditolak
                </span>
              )}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => (
        <Badge
          variant={row.status === 'disetujui' ? 'green' : ['diajukan', 'menunggu_pa', 'menunggu_kaprodi'].includes(row.status) ? 'amber' : row.status === 'ditolak' ? 'rose' : 'gray'}
          className="inline-flex items-center gap-1 capitalize"
        >
          <CheckCircle2 size={12} /> {String(row.status || '').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => {
        const canEdit = isStaff && ['draft', 'diajukan'].includes(row.status);
        const canVerify = (isStaff && ['diajukan', 'menunggu_kaprodi'].includes(row.status))
          || (isDosen && row.status === 'menunggu_pa');
        const canDelete = isStaff && ['draft', 'diajukan'].includes(row.status);
        const items: DropdownMenuItem[] = [
          ...(canEdit ? [{
            label: 'Edit Usulan MK',
            icon: <Edit size={14} />,
            onClick: () => router.push(`/siakad/civitas/konversi/${row.id}/edit`),
          }] : []),
          ...(canVerify ? [{
            label: row.status === 'diajukan'
              ? 'Tinjau Pemetaan & Kirim ke PA'
              : row.status === 'menunggu_pa'
                ? 'Verifikasi sebagai Dosen PA'
                : 'Keputusan Akhir Kaprodi',
            icon: <CheckCircle2 size={14} />,
            onClick: () => openVerifikasi(row),
          }] : []),
          ...(canDelete ? [{
            label: 'Hapus Riwayat Konversi',
            icon: <Trash2 size={14} />,
            variant: 'danger' as const,
            onClick: () => setDeletingKonversi(row),
          }] : []),
        ];
        return (
          <div className="flex justify-end">
            <DropdownMenu items={items} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Konversi Nilai Mahasiswa Transfer"
        description="Penyetaraan dan mapping mata kuliah mahasiswa pindahan dari perguruan tinggi sebelumnya."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Konversi Transfer' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
            {isStaff && (
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => router.push('/siakad/civitas/konversi/create')}
              >
                Input Konversi Transfer
              </Button>
            )}
          </div>
        }
      />

      {/* Full-bleed DataTable Card with server-side pagination */}
      <DataTable
        columns={columns}
        data={konversis}
        isLoading={loading}
        emptyMessage="Belum ada riwayat konversi transfer mahasiswa."
        meta={meta}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* Bilah verifikasi massal per mahasiswa */}
      {selectedIdsReadyForFinalDecision && isStaff && (
        <div className="card p-4 flex items-center justify-between border-primary-500 bg-primary-950 text-white shadow-xl animate-fade-in">
          <p className="text-xs font-extrabold text-white">
            {selectedIds.length} Usulan Terpilih
            <span className="block text-2xs font-normal text-primary-200">Keputusan per mahasiswa (seluruh MK-nya ikut).</span>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="text-xs font-bold py-1.5 px-3 h-auto" onClick={() => setSelectedIds([])}>
              Batal
            </Button>
            <Button variant="danger" className="text-xs font-bold py-1.5 px-3 h-auto" onClick={() => handleBulkVerifikasi('ditolak')} disabled={savingBulkVerif}>
              Tolak Massal
            </Button>
            <Button
              variant="primary"
              className="text-xs font-bold py-1.5 px-4 h-auto bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs border-none"
              onClick={() => handleBulkVerifikasi('disetujui')}
              disabled={savingBulkVerif}
              icon={<ArrowRight size={14} />}
            >
              Setujui Massal
            </Button>
          </div>
        </div>
      )}

      {/* Filter Drawer */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Konversi Transfer"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setFilterSearch('');
                setFilterMhs(null);
                setFilterStatus('all');
                setFilterSortBy('created_at');
                setFilterSortOrder('desc');
                setAppliedFilters({
                  search: '',
                  mhsId: '',
                  status: 'all',
                  sortBy: 'created_at',
                  sortOrder: 'desc',
                });
                setPage(1);
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
                  mhsId: filterMhs?.value ? String(filterMhs.value) : '',
                  status: filterStatus,
                  sortBy: filterSortBy,
                  sortOrder: filterSortOrder,
                });
                setPage(1);
                setShowFilter(false);
              }}
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Input
            label="Pencarian Bebas"
            placeholder="No Transaksi, Kampus, atau Mahasiswa..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <AsyncSelect
            label="Mahasiswa Transfer"
            placeholder="Ketik nama atau NIM mahasiswa..."
            loadOptions={loadMahasiswaOptions}
            value={filterMhs}
            onChange={(val: any) => setFilterMhs(val)}
            isClearable
            defaultOptions={true}
          />

          <Select
            label="Status Konversi"
            value={filterStatus}
            onChange={(val: any) => setFilterStatus(val || 'all')}
            options={[
              { value: 'all', label: 'Semua Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'diajukan', label: 'Diajukan' },
              { value: 'menunggu_pa', label: 'Menunggu Dosen PA' },
              { value: 'menunggu_kaprodi', label: 'Menunggu Kaprodi' },
              { value: 'disetujui', label: 'Disetujui' },
              { value: 'ditolak', label: 'Ditolak' },
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Urutkan Berdasarkan"
              value={filterSortBy}
              onChange={(val: any) => setFilterSortBy(val || 'created_at')}
              options={[
                { value: 'created_at', label: 'Waktu Input' },
                { value: 'no_transaksi', label: 'No Transaksi' },
                { value: 'status', label: 'Status' },
                { value: 'kampus_asal', label: 'Kampus Asal' },
                { value: 'nomor_sk', label: 'Nomor SK' },
              ]}
            />
            <Select
              label="Arah Urutan"
              value={filterSortOrder}
              onChange={(val: any) => setFilterSortOrder(val || 'desc')}
              options={[
                { value: 'desc', label: 'Menurun (Z-A / Baru)' },
                { value: 'asc', label: 'Menaik (A-Z / Lama)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* Delete Modal */}
      <Modal
        open={Boolean(deletingKonversi)}
        onClose={() => setDeletingKonversi(null)}
        title="Hapus Riwayat Konversi?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingKonversi(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-slate-500 text-sm">
          Apakah Anda yakin ingin menghapus data konversi transfer untuk <strong>{deletingKonversi?.mahasiswa?.nama_lengkap}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
      </Modal>

      {/* Modal Verifikasi per MK */}
      <Modal
        open={!!verifTarget}
        onClose={() => setVerifTarget(null)}
        title={`Verifikasi Konversi — ${verifTarget?.mahasiswa?.nama_lengkap || ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setVerifTarget(null)}>
              Batal
            </Button>
            <Button variant="danger" onClick={() => handleVerifikasi('ditolak')} disabled={savingVerif}>
              {verifTarget?.status === 'menunggu_pa' ? 'Tolak oleh PA' : 'Tolak Usulan'}
            </Button>
            <Button
              variant="primary"
              onClick={() => verificationTargetStatus && handleVerifikasi(verificationTargetStatus)}
              disabled={savingVerif || !verificationTargetStatus}
            >
              {savingVerif
                ? 'Menyimpan...'
                : verificationTargetStatus === 'menunggu_pa'
                  ? 'Teruskan ke Dosen PA'
                  : verificationTargetStatus === 'menunggu_kaprodi'
                    ? 'Setujui PA & Teruskan'
                    : 'Setujui Final'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-2xs text-slate-400 block uppercase font-bold">Mahasiswa</span>
              <strong className="text-slate-900">{verifTarget?.mahasiswa?.nama_lengkap}</strong>
              <span className="font-mono text-2xs text-slate-500 block">{verifTarget?.mahasiswa?.nim} • {verifTarget?.mahasiswa?.program_studi?.nama || ''}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block uppercase font-bold">Kampus Asal</span>
              <strong className="text-slate-900 block text-xs">{verifTarget?.kampus_asal}</strong>
              <span className="text-2xs text-slate-500">{verifTarget?.prodi_asal}</span>
            </div>
            <div>
              <span className="text-2xs text-slate-400 block uppercase font-bold">Dasar SK Arsip</span>
              {verifTarget?.nomor_sk ? (
                <div>
                  <span className="font-mono text-xs font-semibold text-slate-900 block truncate" title={verifTarget.nomor_sk}>
                    {verifTarget.nomor_sk}
                  </span>
                  {verifTarget.arsip_nomor_surat?.dokumen_url ? (
                    <a
                      href={verifTarget.arsip_nomor_surat.dokumen_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-3xs text-emerald-700 hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      <span>Lihat Berkas</span>
                      <ExternalLink size={10} />
                    </a>
                  ) : verifTarget.arsip_nomor_surat?.has_dokumen ? (
                    <span className="text-3xs text-emerald-600 font-medium">✓ Berkas Ada</span>
                  ) : (
                    <span className="text-3xs text-slate-400">Tanpa berkas fisik</span>
                  )}
                </div>
              ) : (
                <span className="text-2xs text-slate-400 italic">Belum diisi</span>
              )}
            </div>
            <div>
              <span className="text-2xs text-slate-400 block uppercase font-bold">Status Usulan</span>
              <Badge variant={verifTarget?.status === 'disetujui' ? 'green' : verifTarget?.status === 'diajukan' ? 'amber' : verifTarget?.status === 'ditolak' ? 'rose' : 'gray'} className="capitalize">{verifTarget?.status}</Badge>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Bandingkan MK asal (kiri) dengan MK lokal yang diakui (kanan). Tandai tiap baris <strong>Diakui</strong>/<strong>Ditolak</strong>.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-2xs py-1 px-2.5 h-auto font-bold"
              onClick={() => setVerifDetails((prev) => prev.map((v) => ({ ...v, status: 'diakui', catatan_penolakan: '' })))}
            >
              Tandai Semua Diakui
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-2xs py-1 px-2.5 h-auto font-bold"
              onClick={() => setVerifDetails((prev) => prev.map((v) => ({ ...v, status: 'ditolak' })))}
            >
              Tandai Semua Ditolak
            </Button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-2xs uppercase text-slate-500">
                  <th className="py-2 px-3">MK Asal (kiri)</th>
                  <th className="py-2 px-3 text-center w-10"></th>
                  <th className="py-2 px-3">MK Lokal Diakui (kanan)</th>
                  <th className="py-2 px-3 text-center">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(verifTarget?.details || []).map((d: any) => {
                  const st = verifDetails.find((v) => v.id === d.id);
                  const cur = st?.status || 'diakui';
                  return (
                    <Fragment key={d.id}>
                      <tr className={cur === 'ditolak' ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{d.kode_mk_asal} — {d.nama_mk_asal}</strong>
                          <span className="text-2xs text-slate-500">{d.sks_asal} SKS • Nilai {d.nilai_huruf_asal}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <ArrowRight size={14} className="text-slate-300 mx-auto" />
                        </td>
                        <td className="py-2.5 px-3">
                          <strong className="text-primary-700 block">{d.mata_kuliah_diakui?.kode_mk} — {d.mata_kuliah_diakui?.nama}</strong>
                          <span className="text-2xs text-slate-500">{d.mata_kuliah_diakui?.total_sks} SKS lokal</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant={cur === 'diakui' ? 'primary' : 'outline'}
                              className="text-2xs py-1 px-2 h-auto font-bold"
                              onClick={() => setVerifDetails((prev) => prev.map((v) => (v.id === d.id ? { ...v, status: 'diakui', catatan_penolakan: '' } : v)))}
                            >
                              Diakui
                            </Button>
                            <Button
                              type="button"
                              variant={cur === 'ditolak' ? 'danger' : 'outline'}
                              className="text-2xs py-1 px-2 h-auto font-bold"
                              onClick={() => setVerifDetails((prev) => prev.map((v) => (v.id === d.id ? { ...v, status: 'ditolak' } : v)))}
                            >
                              Tolak
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {cur === 'ditolak' && (
                        <tr className="bg-rose-50/50">
                          <td colSpan={4} className="py-1.5 px-3">
                            <Input
                              placeholder="Alasan penolakan MK ini..."
                              value={st?.catatan_penolakan || ''}
                              onChange={(e) => setVerifDetails((prev) => prev.map((v) => (v.id === d.id ? { ...v, catatan_penolakan: e.target.value } : v)))}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
              <span className="text-2xs text-emerald-700 block uppercase font-bold">Diakui</span>
              <strong className="font-mono text-sm text-emerald-800">{verifSks.diakui} MK • {verifSks.sksDiakui} SKS</strong>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
              <span className="text-2xs text-rose-700 block uppercase font-bold">Ditolak</span>
              <strong className="font-mono text-sm text-rose-800">{verifSks.ditolak} MK</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center sm:col-span-2">
              <span className="text-2xs text-slate-500 block uppercase font-bold">Estimasi kekurangan SKS lulus</span>
              <strong className="font-mono text-sm text-slate-900">
                {verifKurikulum ? `${verifSks.kurang} SKS (wajib ${verifSks.wajib})` : 'Kurikulum prodi belum ada'}
              </strong>
            </div>
          </div>
          <Input
            label="Catatan Verifikasi (umum)"
            placeholder="cth. Sesuai SK Rektor No. ..."
            value={verifCatatan}
            onChange={(e) => setVerifCatatan(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
