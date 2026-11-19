'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Award,
  FileText,
  Filter,
  RotateCcw,
  Eye,
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
import type { PublikasiIlmiah, StatusVerifikasiLuaran } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

const publikasiSchema = z.object({
  judul_artikel: z.string().min(5, 'Judul artikel minimal 5 karakter'),
  nama_jurnal: z.string().min(3, 'Nama jurnal wajib diisi'),
  kategori_publikasi: z.enum(['scopus', 'wos', 'sinta_1_2', 'sinta_3_6', 'international', 'national_indexed'] as const),
  tahun: z.number().min(2000, 'Tahun tidak valid').max(2030, 'Tahun tidak valid'),
  doi_url: z.string().optional(),
});

type PublikasiFormValues = z.infer<typeof publikasiSchema>;

export default function PublikasiRegistryPage() {
  const router = useRouter();
  const [publikasiList, setPublikasiList] = useState<PublikasiIlmiah[]>([]);
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
  } = useForm<PublikasiFormValues>({
    resolver: zodResolver(publikasiSchema) as any,
    defaultValues: {
      judul_artikel: '',
      nama_jurnal: '',
      kategori_publikasi: 'scopus',
      tahun: 2026,
      doi_url: 'https://doi.org/10.1016/j.future.2026.01.001',
    },
  });

  const selectedKategori = watch('kategori_publikasi');

  const fetchPublikasi = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sippmService.indexPublikasi();
      const list = Array.isArray(res.data)
        ? res.data
        : (res?.data as any)?.items || (res?.data as any)?.data || [];

      setPublikasiList(list);

      setMeta({
        current_page: page,
        per_page: limit,
        total: list.length,
        last_page: Math.ceil(list.length / limit) || 1,
        from: list.length > 0 ? (page - 1) * limit + 1 : 0,
        to: Math.min(page * limit, list.length),
      });
    } catch (err) {
      console.error('Failed to fetch publikasi list', err);
      toast.error('Gagal memuat daftar publikasi ilmiah');
      setPublikasiList([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchPublikasi();
  }, [fetchPublikasi]);

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

  const onSubmit = async (data: PublikasiFormValues) => {
    try {
      setSubmitting(true);
      await sippmService.storePublikasi(data);
      toast.success('Publikasi ilmiah baru berhasil didaftarkan!');
      setIsModalOpen(false);
      reset();
      fetchPublikasi();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftarkan publikasi ilmiah';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
    try {
      await sippmService.verifyPublikasi(id, status);
      toast.success(`Publikasi berhasil ${status === 'verified' ? 'disetujui' : 'ditolak'}`);
      fetchPublikasi();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memverifikasi publikasi';
      toast.error(msg);
    }
  };

  const safeList = Array.isArray(publikasiList) ? publikasiList : [];
  const filteredList = safeList.filter(
    (item) =>
      (item.judul_artikel || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (item.nama_jurnal || item.nama_jurnal_prosiding || '').toLowerCase().includes(appliedSearch.toLowerCase())
  );

  // DataTable Column Definitions
  const columns: ColumnDef<PublikasiIlmiah>[] = [
    {
      key: 'judul_artikel',
      label: 'Judul Artikel & Nama Jurnal',
      render: (item: PublikasiIlmiah) => {
        const namaJurnal = item.nama_jurnal_prosiding || item.nama_jurnal || 'Jurnal / Prosiding Kampus';
        return (
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 text-xs line-clamp-1">{item.judul_artikel}</div>
            <div className="text-2xs text-purple-700 font-medium">{namaJurnal}</div>
          </div>
        );
      },
    },
    {
      key: 'kategori',
      label: 'Kategori Indeks',
      render: (item: PublikasiIlmiah) => {
        const indexingBadge = (item.indexing || item.jenis_publikasi || item.kategori_publikasi || 'scopus').replace(/_/g, ' ');
        return (
          <Badge variant="purple" className="font-mono uppercase text-2xs">
            {indexingBadge}
          </Badge>
        );
      },
    },
    {
      key: 'tahun',
      label: 'Tahun',
      render: (item: PublikasiIlmiah) => {
        const displayTahun =
          item.tahun ||
          (item.volume_issue_tahun
            ? item.volume_issue_tahun.match(/\((20\d\d)\)/)?.[1] || item.volume_issue_tahun
            : '2026');
        return <span className="font-bold text-slate-700 text-xs">{displayTahun}</span>;
      },
    },
    {
      key: 'doi_url',
      label: 'DOI / Link',
      render: (item: PublikasiIlmiah) => {
        const linkUrl = item.url_artikel || item.doi_url || (item.doi ? `https://doi.org/${item.doi}` : null);
        return linkUrl ? (
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-700 hover:underline inline-flex items-center gap-1 font-mono"
          >
            <ExternalLink size={12} /> Link DOI
          </a>
        ) : (
          <span className="text-xs text-slate-400 font-mono">-</span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status Verifikasi',
      render: (item: PublikasiIlmiah) => {
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
      render: (item: PublikasiIlmiah) => {
        const isPending = !item.is_verified_lppm && item.status_verifikasi !== 'rejected';
        return (
          <div className="flex justify-end">
            <DropdownMenu
              items={[
                ...(isPending
                  ? [
                      {
                        label: 'Setujui Verifikasi',
                        icon: <Check size={14} className="text-emerald-600" />,
                        onClick: () => handleVerify(item.id, 'verified'),
                      },
                      {
                        label: 'Tolak Verifikasi',
                        icon: <X size={14} className="text-rose-600" />,
                        onClick: () => handleVerify(item.id, 'rejected'),
                      },
                    ]
                  : []),
                ...(item.url_artikel || item.doi_url
                  ? [
                      {
                        label: 'Buka Link DOI Artikel',
                        icon: <ExternalLink size={14} />,
                        onClick: () => {
                          window.open(item.url_artikel || item.doi_url, '_blank');
                        },
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
        title="Registry & Portofolio Publikasi Ilmiah"
        description="Pendataan luaran artikel ilmiah terindeks Scopus, WoS, Sinta, serta verifikasi legal LPPM Kampus."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'Publikasi Ilmiah' },
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
              Registrasi Publikasi Baru
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
        title="Filter & Urutkan Publikasi Ilmiah"
      >
        <div className="space-y-4">
          <Input
            label="Cari Judul Artikel / Nama Jurnal"
            placeholder="Ketik judul artikel atau nama jurnal..."
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
                { value: 'id', label: 'ID Publikasi' },
                { value: 'judul_artikel', label: 'Judul Artikel' },
                { value: 'tahun', label: 'Tahun Terbit' },
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

      {/* FORM MODAL REGISTRASI PUBLIKASI (UI KIT & GRID 2 KOLOM) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrasi Publikasi Ilmiah Baru"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Judul Artikel Ilmiah"
            placeholder="Ketik judul artikel ilmiah..."
            error={errors.judul_artikel?.message}
            {...register('judul_artikel')}
          />

          {/* Grid 2 Kolom per crud-ui-standard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nama Jurnal / Proceedings"
              placeholder="Misal: IEEE Access / Jurnal Sains Kampus"
              error={errors.nama_jurnal?.message}
              {...register('nama_jurnal')}
            />

            <Select
              label="Kategori Pengindeks"
              value={selectedKategori}
              onChange={(val) => setValue('kategori_publikasi', val as any)}
              options={[
                { value: 'scopus', label: 'Scopus (Q1/Q2/Q3/Q4)' },
                { value: 'wos', label: 'Web of Science (WoS)' },
                { value: 'sinta_1_2', label: 'Sinta 1 - Sinta 2' },
                { value: 'sinta_3_6', label: 'Sinta 3 - Sinta 6' },
                { value: 'international', label: 'Internasional Bereputasi' },
                { value: 'national_indexed', label: 'Nasional Terakreditasi' },
              ]}
              error={errors.kategori_publikasi?.message}
            />

            <Input
              label="Tahun Terbit"
              type="number"
              placeholder="2026"
              error={errors.tahun?.message}
              {...register('tahun', { valueAsNumber: true })}
            />

            <Input
              label="Link DOI / URL Artikel"
              placeholder="https://doi.org/10.xxx"
              error={errors.doi_url?.message}
              {...register('doi_url')}
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
              Simpan Publikasi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
