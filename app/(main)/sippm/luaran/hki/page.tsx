'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileCheck,
  Filter,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { sippmService } from '@/services/sippm.service';
import type { HkiDanBuku, StatusVerifikasiLuaran } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

const hkiSchema = z.object({
  judul_hki: z.string().min(5, 'Judul HKI minimal 5 karakter'),
  kategori_hki: z.enum(['paten', 'paten_sederhana', 'hak_cipta', 'merek', 'desain_industri', 'buku_ajar', 'prototype'] as const),
  nomor_pendaftaran: z.string().optional(),
  nomor_sertifikat: z.string().optional(),
  tahun: z.number().min(2000, 'Tahun tidak valid').max(2030, 'Tahun tidak valid'),
});

type HkiFormValues = z.infer<typeof hkiSchema>;

export default function HkiRegistryPage() {
  const router = useRouter();
  const [hkiList, setHkiList] = useState<HkiDanBuku[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination Meta State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });

  // Filter & Search State
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('id');
  const [filterOrderDir, setFilterOrderDir] = useState('desc');
  const [appliedOrderBy, setAppliedOrderBy] = useState('id');
  const [appliedOrderDir, setAppliedOrderDir] = useState('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HkiFormValues>({
    resolver: zodResolver(hkiSchema) as any,
    defaultValues: {
      judul_hki: '',
      kategori_hki: 'hak_cipta',
      nomor_pendaftaran: 'EC00202612345',
      nomor_sertifikat: '000789123',
      tahun: 2026,
    },
  });

  const selectedKategori = watch('kategori_hki');

  const fetchHki = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sippmService.indexHki();
      const list = Array.isArray(res.data)
        ? res.data
        : (res?.data as any)?.items || (res?.data as any)?.data || [];

      setHkiList(list);

      setMeta({
        current_page: page,
        per_page: limit,
        total: list.length,
        last_page: Math.ceil(list.length / limit) || 1,
        from: list.length > 0 ? (page - 1) * limit + 1 : 0,
        to: Math.min(page * limit, list.length),
      });
    } catch (err) {
      console.error('Failed to fetch HKI list', err);
      toast.error('Gagal memuat data HKI & Paten');
      setHkiList([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchHki();
  }, [fetchHki]);

  // Apply Filter Handler
  const handleApplyFilter = () => {
    setAppliedSearch(search);
    setAppliedOrderBy(filterOrderBy);
    setAppliedOrderDir(filterOrderDir);
    setPage(1);
    setShowFilter(false);
  };

  // Reset Filter Handler
  const handleResetFilter = () => {
    setSearch('');
    setAppliedSearch('');
    setFilterOrderBy('id');
    setFilterOrderDir('desc');
    setAppliedOrderBy('id');
    setAppliedOrderDir('desc');
    setPage(1);
    setShowFilter(false);
  };

  const onSubmit = async (data: HkiFormValues) => {
    try {
      setSubmitting(true);
      await sippmService.storeHki(data);
      toast.success('HKI / Paten baru berhasil didaftarkan!');
      setIsModalOpen(false);
      reset();
      fetchHki();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftarkan HKI / Paten';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
    try {
      await sippmService.verifyHki(id, status);
      toast.success(`HKI / Paten berhasil ${status === 'verified' ? 'disetujui' : 'ditolak'}`);
      fetchHki();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memverifikasi HKI / Paten';
      toast.error(msg);
    }
  };

  const safeList = Array.isArray(hkiList) ? hkiList : [];
  const filteredList = safeList.filter(
    (item) =>
      (item.judul_hki || (item as any).judul || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (item.kategori_hki || item.jenis_luaran || '').toLowerCase().includes(appliedSearch.toLowerCase())
  );

  // DataTable Column Definitions
  const columns: ColumnDef<HkiDanBuku>[] = [
    {
      key: 'judul_hki',
      label: 'Judul HKI / Karya',
      render: (item: HkiDanBuku) => {
        const judulHki = item.judul_hki || (item as any).judul || 'HKI / Karya Terdaftar';
        return (
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 text-xs line-clamp-1">{judulHki}</div>
            {item.penerbit_lembaga && (
              <div className="text-2xs text-purple-700 font-medium">{item.penerbit_lembaga}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'kategori',
      label: 'Kategori HKI',
      render: (item: HkiDanBuku) => {
        const kategoriHki = (item.jenis_luaran || item.kategori_hki || 'hak_cipta').replace(/_/g, ' ');
        return (
          <Badge variant="purple" className="font-mono uppercase text-2xs">
            {kategoriHki}
          </Badge>
        );
      },
    },
    {
      key: 'no_sertifikat',
      label: 'No Pendaftaran / Sertifikat',
      render: (item: HkiDanBuku) => {
        const noSertifikat = item.nomor_pencatatan_isbn || item.nomor_sertifikat || item.nomor_pendaftaran || '-';
        return <span className="font-mono text-xs font-bold text-slate-700">{noSertifikat}</span>;
      },
    },
    {
      key: 'tahun',
      label: 'Tahun',
      render: (item: HkiDanBuku) => {
        const displayTahun =
          item.tahun || (item.tgl_terbit_catat ? new Date(item.tgl_terbit_catat).getFullYear() : '2026');
        return <span className="font-bold text-slate-700 text-xs">{displayTahun}</span>;
      },
    },
    {
      key: 'status',
      label: 'Status Verifikasi',
      render: (item: HkiDanBuku) => {
        const isVerified = item.is_verified_lppm || item.status_verifikasi === 'verified';
        const isRejected = item.status_verifikasi === 'rejected';

        if (isVerified) {
          return (
            <Badge variant="green" className="font-bold text-2xs inline-flex items-center gap-1">
              <CheckCircle2 size={12} /> Terverifikasi LPPM
            </Badge>
          );
        }
        if (isRejected) {
          return (
            <Badge variant="rose" className="font-bold text-2xs inline-flex items-center gap-1">
              <XCircle size={12} /> Ditolak
            </Badge>
          );
        }
        return (
          <Badge variant="amber" className="font-bold text-2xs">
            Menunggu Verifikasi
          </Badge>
        );
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (item: HkiDanBuku) => {
        const isPending = !item.is_verified_lppm && item.status_verifikasi !== 'rejected';
        return (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                ...(isPending
                  ? [
                      {
                        label: 'Setujui Verifikasi HKI',
                        icon: <Check size={14} className="text-emerald-600" />,
                        onClick: () => handleVerify(item.id, 'verified'),
                      },
                      {
                        label: 'Tolak Verifikasi HKI',
                        icon: <X size={14} className="text-rose-600" />,
                        onClick: () => handleVerify(item.id, 'rejected'),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header (Atomic Standard) */}
      <PageHeader
        title="Registry HKI, Paten & Intellectual Property"
        description="Pendataan Kekayaan Intelektual, Hak Cipta, Paten, Merek, Desain Industri & Buku Ajar Dosen."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'HKI & Paten' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              className="font-bold"
            >
              Filter
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsModalOpen(true)}
              className="font-bold"
            >
              Registrasi HKI Baru
            </Button>
          </div>
        }
      />

      {/* DataTable Component */}
      <DataTable
        columns={columns}
        data={filteredList}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* FILTER DRAWER SLIDE RIGHT-TO-LEFT */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan HKI & Paten"
      >
        <div className="space-y-4">
          <Input
            label="Cari Judul HKI / Paten / Kategori"
            placeholder="Ketik judul HKI atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <hr style={{ borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'id', label: 'ID HKI' },
                { value: 'judul_hki', label: 'Judul HKI' },
                { value: 'tahun', label: 'Tahun Registrasi' },
              ]}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={[
                { value: 'desc', label: 'Z - A (Terbaru)' },
                { value: 'asc', label: 'A - Z (Terlama)' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              icon={<RotateCcw size={14} />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              icon={<Filter size={14} />}
              onClick={handleApplyFilter}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Drawer>

      {/* FORM MODAL REGISTRASI HKI (UI KIT & GRID 2 KOLOM) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrasi HKI & Paten Baru"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Judul HKI / Ciptaan / Paten"
            placeholder="Ketik judul HKI atau karya..."
            error={errors.judul_hki?.message}
            {...register('judul_hki')}
          />

          {/* Grid 2 Kolom per crud-ui-standard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Kategori Kekayaan Intelektual"
              value={selectedKategori}
              onChange={(val) => setValue('kategori_hki', val as any)}
              options={[
                { value: 'hak_cipta', label: 'Hak Cipta Program/Karya' },
                { value: 'paten', label: 'Paten Terdaftar' },
                { value: 'paten_sederhana', label: 'Paten Sederhana' },
                { value: 'merek', label: 'Merek Dagang' },
                { value: 'desain_industri', label: 'Desain Industri' },
                { value: 'buku_ajar', label: 'Buku Ajar / Monograf' },
                { value: 'prototype', label: 'Prototype Industri' },
              ]}
              error={errors.kategori_hki?.message}
            />

            <Input
              label="Tahun Registrasi"
              type="number"
              placeholder="2026"
              error={errors.tahun?.message}
              {...register('tahun', { valueAsNumber: true })}
            />

            <Input
              label="Nomor Pendaftaran Permohonan"
              placeholder="EC002026xxxx"
              error={errors.nomor_pendaftaran?.message}
              {...register('nomor_pendaftaran')}
            />

            <Input
              label="Nomor Sertifikat HKI / Paten"
              placeholder="000789xxx"
              error={errors.nomor_sertifikat?.message}
              {...register('nomor_sertifikat')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              className="font-bold"
            >
              Simpan HKI &amp; Paten
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
