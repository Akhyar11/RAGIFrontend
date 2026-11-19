'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TrendingUp,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  BookOpen,
  Award,
  Globe,
  Layers,
  FileCheck,
  Edit,
  Sliders,
  ShieldCheck,
  Save,
  Filter,
  RotateCcw,
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
import { simpegService } from '@/services/simpeg.service';
import { sippmService } from '@/services/sippm.service';
import type { UnitKerja } from '@/types/simpeg.types';
import type { Iku5StandardProdi } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

const ikuStandardSchema = z.object({
  prodi_id: z.string().min(1, 'Pilih program studi'),
  target_scopus: z.number().min(0, 'Minimal 0 artikel'),
  target_sinta: z.number().min(0, 'Minimal 0 artikel'),
  target_dikti: z.number().min(0, 'Minimal 0 hibah'),
  target_internal: z.number().min(0, 'Minimal 0 hibah'),
  target_hki: z.number().min(0, 'Minimal 0 HKI'),
  min_capaian_iku: z.number().min(50, 'Minimal target 50%').max(200, 'Maksimal target 200%'),
  tahun_akademik: z.string().min(4, 'Tahun akademik tidak valid'),
});

type IkuStandardFormValues = z.infer<typeof ikuStandardSchema>;

export default function Iku5StandardsPage() {
  const router = useRouter();
  const [prodiStandards, setProdiStandards] = useState<Iku5StandardProdi[]>([]);
  const [unitKerjaList, setUnitKerjaList] = useState<UnitKerja[]>([]);
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
  const [filterOrderBy, setFilterOrderBy] = useState('nama_prodi');
  const [filterOrderDir, setFilterOrderDir] = useState('asc');
  const [appliedOrderBy, setAppliedOrderBy] = useState('nama_prodi');
  const [appliedOrderDir, setAppliedOrderDir] = useState('asc');

  // Modal State
  const [selectedProdi, setSelectedProdi] = useState<Iku5StandardProdi | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IkuStandardFormValues>({
    resolver: zodResolver(ikuStandardSchema) as any,
    defaultValues: {
      prodi_id: '',
      target_scopus: 3,
      target_sinta: 5,
      target_dikti: 3,
      target_internal: 4,
      target_hki: 5,
      min_capaian_iku: 100,
      tahun_akademik: '2025/2026',
    },
  });

  const fetchBackendStandards = useCallback(async () => {
    try {
      setLoading(true);
      const unitRes = await simpegService.getUnitKerjaList();
      const rawUnits = Array.isArray(unitRes.data) ? unitRes.data : (unitRes.data as any)?.data || [];
      setUnitKerjaList(rawUnits);

      const ikuRes = await sippmService.indexIku5Standards({ tahun_akademik: '2025/2026' });
      const rawData = ikuRes.data;
      const backendItems: any[] = Array.isArray(rawData) ? rawData : (rawData as any)?.data || [];

      const prodiUnits = rawUnits.filter(
        (u: any) =>
          u.jenis === 'prodi' ||
          (u.nama || '').toLowerCase().includes('s1') ||
          (u.nama || '').toLowerCase().includes('d3')
      );
      const activeUnits = prodiUnits.length > 0 ? prodiUnits : rawUnits;

      const mergedList: Iku5StandardProdi[] = activeUnits.map((unit: any, idx: number) => {
        const prodiName = unit.nama || unit.name || `Prodi ${idx + 1}`;
        const code = unit.kode || prodiName.split(' ').map((w: string) => w[0]).join('').toUpperCase();

        const foundDb = backendItems.find((b: any) => b.unit_kerja_id === unit.id || b.unit_kerja?.kode === code);

        return {
          id: foundDb ? String(foundDb.id) : code,
          unit_kerja_id: unit.id,
          nama_prodi: prodiName,
          fakultas: unit.parent?.nama || 'Fakultas Ilmu Komputer',
          target_scopus: foundDb ? foundDb.target_publikasi_scopus : 5,
          target_sinta: foundDb ? foundDb.target_publikasi_sinta : 10,
          target_dikti: foundDb ? foundDb.target_hki_paten : 4,
          target_internal: foundDb ? foundDb.target_buku_isbn : 3,
          target_hki: foundDb ? foundDb.target_hki_paten : 4,
          min_capaian_iku: 100,
          tahun_akademik: foundDb?.tahun_akademik || '2025/2026',
        };
      });

      setProdiStandards(mergedList);

      setMeta({
        current_page: page,
        per_page: limit,
        total: mergedList.length,
        last_page: Math.ceil(mergedList.length / limit) || 1,
        from: mergedList.length > 0 ? (page - 1) * limit + 1 : 0,
        to: Math.min(page * limit, mergedList.length),
      });
    } catch (err) {
      console.error('Failed to load IKU 5 standards from backend', err);
      toast.error('Gagal memuat standar IKU 5 dari database backend');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchBackendStandards();
  }, [fetchBackendStandards]);

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
    setFilterOrderBy('nama_prodi');
    setFilterOrderDir('asc');
    setAppliedOrderBy('nama_prodi');
    setAppliedOrderDir('asc');
    setPage(1);
    setShowFilter(false);
  };

  const handleEditModal = (item: Iku5StandardProdi) => {
    setSelectedProdi(item);
    setValue('prodi_id', item.id);
    setValue('target_scopus', item.target_scopus);
    setValue('target_sinta', item.target_sinta);
    setValue('target_dikti', item.target_dikti);
    setValue('target_internal', item.target_internal);
    setValue('target_hki', item.target_hki);
    setValue('min_capaian_iku', item.min_capaian_iku);
    setValue('tahun_akademik', item.tahun_akademik);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: IkuStandardFormValues) => {
    if (!selectedProdi) return;
    try {
      setSubmitting(true);
      await sippmService.storeIku5Standard({
        unit_kerja_id: selectedProdi.unit_kerja_id,
        tahun_akademik: data.tahun_akademik,
        target_publikasi_scopus: data.target_scopus,
        target_publikasi_sinta: data.target_sinta,
        target_hki_paten: data.target_hki,
        target_buku_isbn: data.target_internal,
      });

      await fetchBackendStandards();
      toast.success(`Standar IKU 5 untuk "${selectedProdi.nama_prodi}" berhasil diperbarui!`);
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal memperbarui standar IKU 5 prodi';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProdi = prodiStandards.filter(
    (p) =>
      p.nama_prodi.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      p.fakultas.toLowerCase().includes(appliedSearch.toLowerCase())
  );

  // DataTable Column Definitions
  const columns: ColumnDef<Iku5StandardProdi>[] = [
    {
      key: 'nama_prodi',
      label: 'Program Studi (Backend DB)',
      render: (item: Iku5StandardProdi) => (
        <div className="space-y-0.5">
          <div className="font-extrabold text-slate-900 text-xs">{item.nama_prodi}</div>
          <div className="text-2xs text-slate-500 font-medium">{item.fakultas}</div>
        </div>
      ),
    },
    {
      key: 'target_scopus',
      label: 'Target Scopus',
      render: (item: Iku5StandardProdi) => (
        <Badge variant="purple" className="font-mono text-2xs inline-flex items-center gap-1">
          <Globe size={11} /> {item.target_scopus} Artikel
        </Badge>
      ),
    },
    {
      key: 'target_sinta',
      label: 'Target Sinta',
      render: (item: Iku5StandardProdi) => (
        <Badge variant="blue" className="font-mono text-2xs inline-flex items-center gap-1">
          <BookOpen size={11} /> {item.target_sinta} Artikel
        </Badge>
      ),
    },
    {
      key: 'target_dikti',
      label: 'Target Dikti',
      render: (item: Iku5StandardProdi) => (
        <Badge variant="green" className="font-mono text-2xs inline-flex items-center gap-1">
          <Award size={11} /> {item.target_dikti} Hibah
        </Badge>
      ),
    },
    {
      key: 'target_internal',
      label: 'Target Internal',
      render: (item: Iku5StandardProdi) => (
        <Badge variant="amber" className="font-mono text-2xs inline-flex items-center gap-1">
          <Layers size={11} /> {item.target_internal} Hibah
        </Badge>
      ),
    },
    {
      key: 'target_hki',
      label: 'Target HKI',
      render: (item: Iku5StandardProdi) => (
        <Badge variant="purple" className="font-mono text-2xs inline-flex items-center gap-1">
          <FileCheck size={11} /> {item.target_hki} HKI
        </Badge>
      ),
    },
    {
      key: 'min_capaian_iku',
      label: 'Min Capaian',
      render: (item: Iku5StandardProdi) => (
        <Badge variant="gray" className="font-mono text-2xs font-bold">
          {item.min_capaian_iku}%
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (item: Iku5StandardProdi) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Edit Standar IKU 5',
                icon: <Edit size={14} className="text-purple-700" />,
                onClick: () => handleEditModal(item),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header (Atomic Standard) */}
      <PageHeader
        title="Pengaturan Standar Capaian IKU 5 per Program Studi"
        description="Konfigurasi rasio target luaran Scopus, Sinta, Hibah Dikti/Internal, serta HKI untuk setiap Program Studi."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'Standar IKU 5' },
        ]}
        action={
          <Button
            variant="outline"
            icon={<Filter size={16} />}
            onClick={() => setShowFilter(true)}
            className="font-bold"
          >
            Filter
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-purple-600 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Prodi Terkonfigurasi</div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Building2 size={24} className="text-purple-600" />
            {prodiStandards.length} Program Studi
          </div>
          <div className="text-2xs text-slate-400 mt-1">Data master dari SIMPEG Backend</div>
        </div>

        <div className="card p-5 border-l-4 border-l-primary-600 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Rata-rata Target Scopus</div>
          <div className="text-2xl font-black text-primary-700 mt-1 flex items-center gap-2">
            <Globe size={24} className="text-primary-600" />
            {Math.round(prodiStandards.reduce((sum, p) => sum + p.target_scopus, 0) / (prodiStandards.length || 1))} Artikel / Prodi
          </div>
          <div className="text-2xs text-slate-400 mt-1">Standardisasi Jurnal Q1 - Q4</div>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-600 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Rata-rata Target Hibah</div>
          <div className="text-2xl font-black text-blue-700 mt-1 flex items-center gap-2">
            <Award size={24} className="text-blue-600" />
            {Math.round(prodiStandards.reduce((sum, p) => sum + p.target_dikti + p.target_internal, 0) / (prodiStandards.length || 1))} Proposal / Prodi
          </div>
          <div className="text-2xs text-slate-400 mt-1">Hibah DIKTI &amp; Riset Internal</div>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-600 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Tahun Akademik Aktif</div>
          <div className="text-2xl font-black text-amber-700 mt-1 flex items-center gap-2">
            <ShieldCheck size={24} className="text-amber-600" />
            TA 2025/2026
          </div>
          <div className="text-2xs text-slate-400 mt-1">Penjaminan Mutu UPM Kampus</div>
        </div>
      </div>

      {/* DataTable Component */}
      <DataTable
        columns={columns}
        data={filteredProdi}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* FILTER DRAWER SLIDE RIGHT-TO-LEFT */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Standar IKU 5"
      >
        <div className="space-y-4">
          <Input
            label="Cari Program Studi / Fakultas"
            placeholder="Ketik nama prodi atau fakultas..."
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
                { value: 'nama_prodi', label: 'Nama Prodi' },
                { value: 'fakultas', label: 'Fakultas' },
              ]}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={[
                { value: 'asc', label: 'A - Z' },
                { value: 'desc', label: 'Z - A' },
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

      {/* EDIT MODAL FORM (UI KIT & GRID 2 KOLOM) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Konfigurasi Target Standar IKU 5"
        size="lg"
      >
        {selectedProdi && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-xs text-purple-900 space-y-0.5">
              <div className="font-black text-sm">{selectedProdi.nama_prodi}</div>
              <div className="text-purple-700">{selectedProdi.fakultas}</div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Target Artikel Scopus"
                  type="number"
                  error={errors.target_scopus?.message}
                  {...register('target_scopus', { valueAsNumber: true })}
                />

                <Input
                  label="Target Artikel Sinta"
                  type="number"
                  error={errors.target_sinta?.message}
                  {...register('target_sinta', { valueAsNumber: true })}
                />

                <Input
                  label="Target Hibah DIKTI"
                  type="number"
                  error={errors.target_dikti?.message}
                  {...register('target_dikti', { valueAsNumber: true })}
                />

                <Input
                  label="Target Hibah Internal"
                  type="number"
                  error={errors.target_internal?.message}
                  {...register('target_internal', { valueAsNumber: true })}
                />

                <Input
                  label="Target HKI & Paten"
                  type="number"
                  error={errors.target_hki?.message}
                  {...register('target_hki', { valueAsNumber: true })}
                />

                <Input
                  label="Target Min Capaian (%)"
                  type="number"
                  error={errors.min_capaian_iku?.message}
                  {...register('min_capaian_iku', { valueAsNumber: true })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
                  Simpan Standar IKU 5
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
}
