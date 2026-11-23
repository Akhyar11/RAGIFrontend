'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, Filter, Tag, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Badge } from '@/components/ui/Badge';
import { spmbService } from '@/services/spmb.service';
import { formatRupiah } from '@/lib/utils';
import type { JalurMasuk, MasterBiayaSpmb } from '@/types/spmb.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

export default function MasterBiayaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Data State
  const [data, setData] = useState<MasterBiayaSpmb[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });
  const [loading, setLoading] = useState(false);

  // References
  const [jalurList, setJalurList] = useState<JalurMasuk[]>([]);

  // Search and Filter Params from URL
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const searchQ = searchParams.get('search') || '';
  const nomorSkQ = searchParams.get('nomor_sk') || '';
  const orderByQ = searchParams.get('sort_by') || 'created_at';
  const orderDirQ = searchParams.get('sort_dir') || 'desc';
  const jalurQ = searchParams.get('jalur_masuk_id') || '';
  const statusQ = searchParams.get('is_active') || '';
  const jumlahQ = searchParams.get('jumlah_komponen') || '';
  const bebanPendaftaranQ = searchParams.get('beban_pendaftaran') || '';
  const bebanDaftarUlangQ = searchParams.get('beban_daftar_ulang') || '';
  const totalBiayaQ = searchParams.get('total_biaya') || '';

  // Local Filter Drawer State
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState(searchQ);
  const [filterNomorSk, setFilterNomorSk] = useState(nomorSkQ);
  const [filterJalurId, setFilterJalurId] = useState(jalurQ);
  const [filterStatus, setFilterStatus] = useState(statusQ);
  const [filterJumlahKomponen, setFilterJumlahKomponen] = useState(jumlahQ);
  const [filterBebanPendaftaran, setFilterBebanPendaftaran] = useState(bebanPendaftaranQ);
  const [filterBebanDaftarUlang, setFilterBebanDaftarUlang] = useState(bebanDaftarUlangQ);
  const [filterTotalBiaya, setFilterTotalBiaya] = useState(totalBiayaQ);
  const [filterOrderBy, setFilterOrderBy] = useState(orderByQ);
  const [filterOrderDir, setFilterOrderDir] = useState(orderDirQ);

  // Delete Confirm Dialog State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: MasterBiayaSpmb | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    item: null,
    isLoading: false,
  });

  // Load initial dropdown references
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const jalurRes = await spmbService.getJalurMasuk({ status: 'aktif', limit: 100 });
        setJalurList(Array.isArray(jalurRes?.data) ? jalurRes.data : []);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await spmbService.getMasterBiayaList({
        page,
        limit,
        search: searchQ,
        nomor_sk: nomorSkQ || undefined,
        jalur_masuk_id: jalurQ || undefined,
        is_active: statusQ || undefined,
        jumlah_komponen: jumlahQ || undefined,
        beban_pendaftaran: bebanPendaftaranQ || undefined,
        beban_daftar_ulang: bebanDaftarUlangQ || undefined,
        total_biaya: totalBiayaQ || undefined,
        sort_by: orderByQ,
        sort_dir: orderDirQ,
      });
      setData(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal memuat data master biaya');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQ, nomorSkQ, jalurQ, statusQ, jumlahQ, bebanPendaftaranQ, bebanDaftarUlangQ, totalBiayaQ, orderByQ, orderDirQ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Synchronize URL query parameters
  const updateURLParams = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.keys(newParams).forEach((key) => {
      if (newParams[key]) {
        params.set(key, String(newParams[key]));
      } else {
        params.delete(key);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  // Filter Drawer Actions
  const handleApplyFilter = () => {
    updateURLParams({
      page: 1,
      search: filterSearch,
      nomor_sk: filterNomorSk,
      jalur_masuk_id: filterJalurId,
      is_active: filterStatus,
      jumlah_komponen: filterJumlahKomponen,
      beban_pendaftaran: filterBebanPendaftaran,
      beban_daftar_ulang: filterBebanDaftarUlang,
      total_biaya: filterTotalBiaya,
      sort_by: filterOrderBy,
      sort_dir: filterOrderDir,
    });
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterNomorSk('');
    setFilterJalurId('');
    setFilterStatus('');
    setFilterJumlahKomponen('');
    setFilterBebanPendaftaran('');
    setFilterBebanDaftarUlang('');
    setFilterTotalBiaya('');
    setFilterOrderBy('created_at');
    setFilterOrderDir('desc');
    updateURLParams({
      page: 1,
      search: '',
      nomor_sk: '',
      jalur_masuk_id: '',
      is_active: '',
      jumlah_komponen: '',
      beban_pendaftaran: '',
      beban_daftar_ulang: '',
      total_biaya: '',
      sort_by: 'created_at',
      sort_dir: 'desc',
    });
    setShowFilter(false);
  };

  // Delete Action Handlers
  const handleOpenDelete = (item: MasterBiayaSpmb) => {
    setDeleteModal({ isOpen: true, item, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isLoading: true }));
      await spmbService.deleteMasterBiaya(deleteModal.item.id);
      toast.success('Konfigurasi biaya berhasil dihapus');
      setDeleteModal({ isOpen: false, item: null, isLoading: false });
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus biaya');
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Master Tarif Biaya"
        description="Kelola konfigurasi biaya pendaftaran dan perkuliahan per Program Studi dan Jalur Pendaftaran"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
            >
              Filter
            </Button>
            <Button
              variant="outline"
              icon={<Tag size={16} />}
              onClick={() => router.push('/spmb/master/komponen-biaya')}
            >
              Komponen Biaya
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => router.push('/spmb/master/biaya/create')}
            >
              Tambah Biaya
            </Button>
          </div>
        }
      />

      {/* Main DataTable Area */}
      <DataTable
        data={data}
        meta={meta}
        isLoading={loading}
        onPageChange={(newPage) => updateURLParams({ page: newPage })}
        onLimitChange={(newLimit) => updateURLParams({ page: 1, limit: newLimit })}
        columns={[
          {
            key: 'program_studi',
            label: 'Program Studi',
            sortable: false,
            render: (row) => (
              <div>
                <div className="font-semibold text-gray-900">
                  {row.program_studi?.jenjang} {row.program_studi?.nama}
                </div>
                {row.program_studi?.kode_prodi && (
                  <span className="font-mono text-xs" style={{ color: 'var(--module-primary)' }}>
                    {row.program_studi.kode_prodi}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'jalur_masuk',
            label: 'Jalur Pendaftaran',
            render: (row) => (
              <div>
                <div className="font-semibold text-xs text-gray-900">
                  {row.jalur_masuk?.nama || '-'}
                </div>
                {row.jalur_masuk?.kode && (
                  <span className="text-2xs text-slate-500">
                    {row.jalur_masuk?.kode}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'nomor_sk',
            label: 'Nomor SK',
            render: (row) => (
              <div>
                {row.nomor_sk ? (
                  <div className="space-y-0.5">
                    <span className="font-mono font-bold text-xs text-slate-800 block">
                      {row.nomor_sk}
                    </span>
                    {row.arsip_nomor_surat?.dokumen_url ? (
                      <a
                        href={row.arsip_nomor_surat.dokumen_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-2xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
                      >
                        <span>Dokumen SK</span>
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-2xs text-slate-400">Terdaftar di Arsip</span>
                    )}
                  </div>
                ) : (
                  <span className="text-2xs text-slate-400 italic">Tanpa SK</span>
                )}
              </div>
            ),
          },
          {
            key: 'items',
            label: 'Rincian Komponen',
            align: 'center',
            render: (row) => {
              const count = (row.items || []).filter((i) => Number(i.nominal) > 0).length;
              return (
                <Badge variant="secondary" className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200">
                  {count} Komponen
                </Badge>
              );
            },
          },
          {
            key: 'beban_pendaftaran',
            label: 'Beban Registrasi',
            align: 'right',
            render: (row) => {
              const beban = (row.items || []).filter((i) => i.dibebankan_saat_pendaftaran && Number(i.nominal) > 0);
              const total = beban.reduce((acc, i) => acc + Number(i.nominal || 0), 0);
              return (
                <div>
                  <div className="font-mono font-bold text-xs" style={{ color: 'var(--module-primary)' }}>
                    {formatRupiah(total)}
                  </div>
                  <div className="text-2xs text-slate-400">{beban.length} komponen</div>
                </div>
              );
            },
          },
          {
            key: 'beban_daftar_ulang',
            label: 'Beban Daftar Ulang',
            align: 'right',
            render: (row) => {
              const beban = (row.items || []).filter((i) => !i.dibebankan_saat_pendaftaran && Number(i.nominal) > 0);
              const total = beban.reduce((acc, i) => acc + Number(i.nominal || 0), 0);
              return (
                <div>
                  <div className="font-mono font-bold text-xs text-slate-700">
                    {formatRupiah(total)}
                  </div>
                  <div className="text-2xs text-slate-400">{beban.length} komponen</div>
                </div>
              );
            },
          },
          {
            key: 'total_biaya',
            label: 'Total Biaya',
            align: 'right',
            sortable: true,
            render: (row) => (
              <span className="font-mono font-bold text-xs" style={{ color: 'var(--module-primary)' }}>
                {formatRupiah(row.total_biaya)}
              </span>
            ),
          },
          {
            key: 'is_active',
            label: 'Status',
            align: 'center',
            render: (row) =>
              row.is_active ? (
                <Badge variant="success">Aktif</Badge>
              ) : (
                <Badge variant="danger">Nonaktif</Badge>
              ),
          },
          {
            key: 'actions',
            label: 'Aksi',
            align: 'right',
            render: (row) => (
              <DropdownMenu
                items={[
                  {
                    label: 'Edit Detail',
                    icon: <Edit size={16} />,
                    onClick: () => router.push(`/spmb/master/biaya/${row.id}/edit`),
                  },
                  {
                    label: 'Hapus',
                    icon: <Trash2 size={16} className="text-red-500" />,
                    onClick: () => handleOpenDelete(row),
                    variant: 'danger',
                  },
                ]}
              />
            ),
          },
        ]}
      />

      {/* Filter Drawer */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Biaya"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleResetFilter}>
              Reset
            </Button>
            <Button variant="primary" onClick={handleApplyFilter}>
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Pencarian Program Studi"
            placeholder="Kode atau nama prodi..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />

          <Input
            label="Nomor SK"
            placeholder="Cari nomor SK / surat..."
            value={filterNomorSk}
            onChange={(e) => setFilterNomorSk(e.target.value)}
          />

          <Select
            label="Jalur Pendaftaran"
            value={filterJalurId}
            onChange={(val) => setFilterJalurId(val)}
            options={[
              { value: '', label: 'Semua Jalur' },
              ...jalurList.map((jalur) => ({
                value: String(jalur.id),
                label: `${jalur.nama}${jalur.kode ? ` (${jalur.kode})` : ''}`,
              })),
            ]}
          />

          <Select
            label="Status"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'true', label: 'Aktif' },
              { value: 'false', label: 'Nonaktif' },
            ]}
          />

          <Input
            label="Rincian Komponen (jumlah)"
            placeholder="Contoh: 3"
            value={filterJumlahKomponen}
            onChange={(e) => setFilterJumlahKomponen(e.target.value)}
          />

          <Input
            label="Beban Registrasi (Rp)"
            placeholder="0"
            value={filterBebanPendaftaran}
            onChange={(e) => setFilterBebanPendaftaran(e.target.value)}
          />

          <Input
            label="Beban Daftar Ulang (Rp)"
            placeholder="0"
            value={filterBebanDaftarUlang}
            onChange={(e) => setFilterBebanDaftarUlang(e.target.value)}
          />

          <Input
            label="Total Biaya (Rp)"
            placeholder="0"
            value={filterTotalBiaya}
            onChange={(e) => setFilterTotalBiaya(e.target.value)}
          />

          <hr className="border-t border-slate-200 my-4" />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'created_at', label: 'Tanggal Dibuat' },
                { value: 'nomor_sk', label: 'Nomor SK' },
                { value: 'program_studi', label: 'Program Studi' },
                { value: 'jalur_masuk', label: 'Jalur Pendaftaran' },
                { value: 'items', label: 'Rincian Komponen' },
                { value: 'beban_pendaftaran', label: 'Beban Registrasi' },
                { value: 'beban_daftar_ulang', label: 'Beban Daftar Ulang' },
                { value: 'total_biaya', label: 'Total Biaya' },
                { value: 'is_active', label: 'Status' },
                { value: 'id', label: 'ID' },
              ]}
            />

            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={[
                { value: 'asc', label: 'A - Z (Naik)' },
                { value: 'desc', label: 'Z - A (Turun)' },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
        onConfirm={handleConfirmDelete}
        isLoading={deleteModal.isLoading}
        title="Hapus Tarif Biaya"
        message={
          <span>
            Apakah Anda yakin ingin menghapus konfigurasi tarif biaya untuk{' '}
            <strong>
              {deleteModal.item?.program_studi?.nama || 'Program Studi ini'}
            </strong>{' '}
            pada Tipe Jalur{' '}
            <strong>{deleteModal.item?.jalur_masuk?.nama || '-'}</strong>? Tindakan ini tidak dapat dibatalkan.
          </span>
        }
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
}
