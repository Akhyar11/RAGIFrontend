'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Edit, Eye, Filter, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { spmbService } from '@/services/spmb.service';
import type { PaginationMeta } from '@/types/api.types';
import type { SpmbKodeDiskon } from '@/types/spmb.types';
import { formatRupiah } from '@/lib/utils';

const tipeOptions = [
  { value: 'persen', label: 'Persentase' },
  { value: 'nominal', label: 'Nominal' },
];

export default function MasterKodeDiskonPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const searchQ = searchParams.get('search') || '';
  const tipeQ = searchParams.get('tipe_diskon') || '';
  const statusQ = searchParams.get('is_active') || '';
  const berlakuMulaiQ = searchParams.get('berlaku_mulai') || '';
  const berlakuSampaiQ = searchParams.get('berlaku_sampai') || '';
  const nilaiMinQ = searchParams.get('nilai_min') || '';
  const nilaiMaxQ = searchParams.get('nilai_max') || '';
  const maksimumPotonganMinQ = searchParams.get('maksimum_potongan_min') || '';
  const maksimumPotonganMaxQ = searchParams.get('maksimum_potongan_max') || '';
  const potonganStatusQ = searchParams.get('potongan_status') || '';
  const kuotaStatusQ = searchParams.get('kuota_status') || '';
  const sortByQ = searchParams.get('sort_by') || 'kode';
  const sortOrderQ = searchParams.get('sort_order') || 'asc';

  const [data, setData] = useState<SpmbKodeDiskon[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [loading, setLoading] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterSearch, setFilterSearch] = useState(searchQ);
  const [filterTipe, setFilterTipe] = useState(tipeQ);
  const [filterStatus, setFilterStatus] = useState(statusQ);
  const [filterBerlakuMulai, setFilterBerlakuMulai] = useState(berlakuMulaiQ);
  const [filterBerlakuSampai, setFilterBerlakuSampai] = useState(berlakuSampaiQ);
  const [filterNilaiMin, setFilterNilaiMin] = useState(nilaiMinQ);
  const [filterNilaiMax, setFilterNilaiMax] = useState(nilaiMaxQ);
  const [filterMaksimumPotonganMin, setFilterMaksimumPotonganMin] = useState(maksimumPotonganMinQ);
  const [filterMaksimumPotonganMax, setFilterMaksimumPotonganMax] = useState(maksimumPotonganMaxQ);
  const [filterPotonganStatus, setFilterPotonganStatus] = useState(potonganStatusQ);
  const [filterKuotaStatus, setFilterKuotaStatus] = useState(kuotaStatusQ);
  const [filterSortBy, setFilterSortBy] = useState(sortByQ);
  const [filterSortOrder, setFilterSortOrder] = useState(sortOrderQ);
  const [deleteItem, setDeleteItem] = useState<SpmbKodeDiskon | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const updateURLParams = (paramsToUpdate: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(paramsToUpdate).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) params.set(key, String(value));
      else params.delete(key);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await spmbService.getKodeDiskonList({
        page,
        per_page: perPage,
        search: searchQ || undefined,
        tipe_diskon: tipeQ || undefined,
        is_active: statusQ || undefined,
        berlaku_mulai: berlakuMulaiQ || undefined,
        berlaku_sampai: berlakuSampaiQ || undefined,
        nilai_min: nilaiMinQ || undefined,
        nilai_max: nilaiMaxQ || undefined,
        maksimum_potongan_min: maksimumPotonganMinQ || undefined,
        maksimum_potongan_max: maksimumPotonganMaxQ || undefined,
        potongan_status: potonganStatusQ || undefined,
        kuota_status: kuotaStatusQ || undefined,
        sort_by: sortByQ,
        sort_order: sortOrderQ,
      });
      setData(response.data || []);
      if (response.meta) setMeta(response.meta);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal memuat daftar kode diskon.');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, searchQ, tipeQ, statusQ, berlakuMulaiQ, berlakuSampaiQ, nilaiMinQ, nilaiMaxQ, maksimumPotonganMinQ, maksimumPotonganMaxQ, potonganStatusQ, kuotaStatusQ, sortByQ, sortOrderQ]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    setFilterSearch(searchQ);
    setFilterTipe(tipeQ);
    setFilterStatus(statusQ);
    setFilterBerlakuMulai(berlakuMulaiQ);
    setFilterBerlakuSampai(berlakuSampaiQ);
    setFilterNilaiMin(nilaiMinQ);
    setFilterNilaiMax(nilaiMaxQ);
    setFilterMaksimumPotonganMin(maksimumPotonganMinQ);
    setFilterMaksimumPotonganMax(maksimumPotonganMaxQ);
    setFilterPotonganStatus(potonganStatusQ);
    setFilterKuotaStatus(kuotaStatusQ);
    setFilterSortBy(sortByQ);
    setFilterSortOrder(sortOrderQ);
  }, [searchQ, tipeQ, statusQ, berlakuMulaiQ, berlakuSampaiQ, nilaiMinQ, nilaiMaxQ, maksimumPotonganMinQ, maksimumPotonganMaxQ, potonganStatusQ, kuotaStatusQ, sortByQ, sortOrderQ]);

  const handleApplyFilter = () => {
    updateURLParams({ page: 1, search: filterSearch.trim(), tipe_diskon: filterTipe, is_active: filterStatus, berlaku_mulai: filterBerlakuMulai, berlaku_sampai: filterBerlakuSampai, nilai_min: filterNilaiMin, nilai_max: filterNilaiMax, maksimum_potongan_min: filterMaksimumPotonganMin, maksimum_potongan_max: filterMaksimumPotonganMax, potongan_status: filterPotonganStatus, kuota_status: filterKuotaStatus, sort_by: filterSortBy, sort_order: filterSortOrder });
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setFilterSearch('');
    setFilterTipe('');
    setFilterStatus('');
    setFilterBerlakuMulai('');
    setFilterBerlakuSampai('');
    setFilterNilaiMin('');
    setFilterNilaiMax('');
    setFilterMaksimumPotonganMin('');
    setFilterMaksimumPotonganMax('');
    setFilterPotonganStatus('');
    setFilterKuotaStatus('');
    setFilterSortBy('kode');
    setFilterSortOrder('asc');
    updateURLParams({ page: 1, search: '', tipe_diskon: '', is_active: '', berlaku_mulai: '', berlaku_sampai: '', nilai_min: '', nilai_max: '', maksimum_potongan_min: '', maksimum_potongan_max: '', potongan_status: '', kuota_status: '', sort_by: 'kode', sort_order: 'asc' });
    setShowFilter(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleteLoading(true);
      await spmbService.deleteKodeDiskon(deleteItem.id);
      toast.success(`Kode diskon ${deleteItem.kode} berhasil dinonaktifkan.`);
      setDeleteItem(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Gagal menghapus kode diskon.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns: ColumnDef<SpmbKodeDiskon>[] = [
    {
      key: 'kode', label: 'Kode Diskon', sortable: true,
      render: (row) => <div><div className="font-mono text-xs font-bold text-slate-900">{row.kode}</div><div className="text-2xs text-slate-500">{row.nama}</div></div>,
    },
    {
      key: 'tipe_diskon', label: 'Nilai Diskon', sortable: true,
      render: (row) => <div className="text-xs font-semibold text-slate-800">{row.tipe_diskon === 'persen' ? `${Number(row.nilai)}%` : formatRupiah(Number(row.nilai))}<div className="text-2xs font-normal text-slate-500">{row.tipe_diskon === 'persen' ? 'Persentase' : 'Nominal'}</div></div>,
    },
    {
      key: 'maksimum_potongan', label: 'Batas Potongan',
      render: (row) => <span className="text-xs text-slate-700">{row.maksimum_potongan ? formatRupiah(Number(row.maksimum_potongan)) : 'Tanpa batas'}</span>,
    },
    {
      key: 'penggunaan_count', label: 'Klaim',
      render: (row) => {
        const claims = Number(row.penggunaan_count || 0);
        const limit = row.batas_penggunaan;
        const quotaFull = limit !== null && claims >= limit;
        return (
          <div className="text-xs text-slate-700">
            <span>{claims}{limit !== null ? ` / ${limit} klaim` : ' klaim'}</span>
            {quotaFull && <div className="text-2xs font-semibold text-rose-600">Kuota penuh</div>}
          </div>
        );
      },
    },
    {
      key: 'berlaku_sampai', label: 'Masa Berlaku', sortable: true,
      render: (row) => <div className="text-xs text-slate-700">{row.berlaku_mulai?.slice(0, 10) || 'Tanpa awal'}<div className="text-2xs text-slate-500">s.d. {row.berlaku_sampai?.slice(0, 10) || 'Tanpa akhir'}</div></div>,
    },
    {
      key: 'is_active', label: 'Status',
      render: (row) => row.is_active ? <Badge variant="green" className="text-2xs">Aktif</Badge> : <Badge variant="gray" className="text-2xs">Nonaktif</Badge>,
    },
    {
      key: 'actions', label: 'Aksi', align: 'right',
      render: (row) => <div className="flex justify-end"><DropdownMenu items={[
        { label: 'Detail', icon: <Eye size={16} />, onClick: () => router.push(`/spmb/master/kode-diskon/${row.id}`) },
        { label: 'Edit Data', icon: <Edit size={16} />, onClick: () => router.push(`/spmb/master/kode-diskon/${row.id}/edit`) },
        { label: 'Hapus', icon: <Trash2 size={16} />, variant: 'danger', onClick: () => setDeleteItem(row) },
      ]} /></div>,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Master Kode Diskon SPMB"
        description="Kelola kode diskon yang hanya mengurangi komponen biaya dengan beban pendaftaran."
        action={<div className="flex gap-2">
          <Button variant="outline" icon={<Filter size={16} />} onClick={() => setShowFilter(true)} style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}>Filter</Button>
          <Button icon={<Plus size={16} />} onClick={() => router.push('/spmb/master/kode-diskon/create')} style={{ backgroundColor: 'var(--module-primary)', borderColor: 'var(--module-primary)' }}>Tambah Kode</Button>
        </div>}
      />

      <DataTable
        data={data}
        meta={meta}
        isLoading={loading}
        columns={columns}
        onPageChange={(nextPage) => updateURLParams({ page: nextPage })}
        onLimitChange={(nextLimit) => updateURLParams({ page: 1, per_page: nextLimit })}
        emptyMessage="Belum ada kode diskon. Tambahkan kode baru untuk mulai mengelola potongan pendaftaran."
      />

      <Drawer open={showFilter} onClose={() => setShowFilter(false)} title="Filter Kode Diskon" footer={<div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={handleResetFilter}>Reset</Button><Button className="flex-1" onClick={handleApplyFilter}>Terapkan</Button></div>}>
        <div className="space-y-4">
          <Input label="Cari Kode atau Nama" value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} placeholder="Ketik kode atau nama diskon" />
          <Select label="Jenis Diskon" value={filterTipe} onChange={setFilterTipe} options={[{ value: '', label: 'Semua Jenis' }, ...tipeOptions]} />
          <Select label="Status" value={filterStatus} onChange={setFilterStatus} options={[{ value: '', label: 'Semua Status' }, { value: '1', label: 'Aktif' }, { value: '0', label: 'Nonaktif' }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" min="0" label="Nilai Diskon Min." value={filterNilaiMin} onChange={(event) => setFilterNilaiMin(event.target.value)} />
            <Input type="number" min="0" label="Nilai Diskon Maks." value={filterNilaiMax} onChange={(event) => setFilterNilaiMax(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="number" min="0" label="Batas Potongan Min." value={filterMaksimumPotonganMin} onChange={(event) => setFilterMaksimumPotonganMin(event.target.value)} />
            <Input type="number" min="0" label="Batas Potongan Maks." value={filterMaksimumPotonganMax} onChange={(event) => setFilterMaksimumPotonganMax(event.target.value)} />
          </div>
          <Select label="Batas Potongan" value={filterPotonganStatus} onChange={setFilterPotonganStatus} options={[{ value: '', label: 'Semua Batas Potongan' }, { value: 'berbatas', label: 'Ada batas nominal' }, { value: 'tanpa_batas', label: 'Tanpa batas nominal' }]} />
          <Select label="Status Kuota Klaim" value={filterKuotaStatus} onChange={setFilterKuotaStatus} options={[{ value: '', label: 'Semua Status Kuota' }, { value: 'tersedia', label: 'Kuota tersedia' }, { value: 'penuh', label: 'Kuota penuh' }, { value: 'tanpa_batas', label: 'Tanpa batas klaim' }]} />
          <Input type="date" label="Berlaku Mulai" value={filterBerlakuMulai} onChange={(event) => setFilterBerlakuMulai(event.target.value)} />
          <Input type="date" label="Berlaku Sampai" value={filterBerlakuSampai} onChange={(event) => setFilterBerlakuSampai(event.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Urutkan Berdasarkan" value={filterSortBy} onChange={setFilterSortBy} options={[{ value: 'kode', label: 'Kode' }, { value: 'nama', label: 'Nama' }, { value: 'nilai', label: 'Nilai' }, { value: 'berlaku_sampai', label: 'Masa berlaku' }, { value: 'created_at', label: 'Tanggal dibuat' }]} />
            <Select label="Arah Urutan" value={filterSortOrder} onChange={setFilterSortOrder} options={[{ value: 'asc', label: 'Menaik (A-Z)' }, { value: 'desc', label: 'Menurun (Z-A)' }]} />
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={Boolean(deleteItem)}
        onClose={() => !deleteLoading && setDeleteItem(null)}
        onConfirm={handleDelete}
        isLoading={deleteLoading}
        title="Nonaktifkan Kode Diskon"
        message={deleteItem ? `Kode ${deleteItem.kode} akan dihapus dari daftar aktif. Riwayat penggunaannya tetap tersimpan.` : undefined}
        confirmText="Ya, Hapus"
      />
    </div>
  );
}
